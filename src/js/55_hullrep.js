// ───────────────────────── 方舷放置：船體報告（Tim 2026-10-30「可以加工具輸出船體情況報告(包含剖面 等)」）─────────────────────────
// 照船型原本的格子（sh.T.base）跟現在的（sh.grid）一格一格比，每艘畫四種圖：
//   側視（x × z，沿船寬加起來）、俯視（x × y，沿高度加起來）：那一柱少了幾成 ⇒ 木色往紅色走（整柱切穿 ＝ 全紅）；多出來的（補丁）⇒ 綠；
//   龍骨帶（z ≤ 12 ＝ 核心 22_pieces.js 的錨，每個 x 剩幾成；一格都不剩 ＝ 斷了）；
//   橫剖面（y × z）：少了最多的那一截、斷口（核心 sh.breakX）、船長 ¼、½、¾ —— 還在 ＝ 木色、打掉 ＝ 紅、多出來 ＝ 綠。
//   線：藍虛線 ＝ 設計水線（T.zw）、青 ＝ 現在的水線（照核心 51_captain.js wlZ）、黃 ＝ 斷口、白 ＝ 剖面在哪一截。
// 讀數：原本幾格、少了幾格（%）、少最多的那一截、吃水、龍骨斷了沒、降旗、沉沒。
// 用：⚙️ 設定 → 🧪 除錯紀錄 →「船體報告」（存成一個 HTML，圖內嵌）；主控台 BSI.hullReport() ⇒ [{ name, stats, img: { side, plan, keel, secs: [{ x, why, img }] } }]（圖是 data URL）。
// 只讀：不碰戰局、不抽亂數。格子照 16³ 的塊讀（VoxelKit Grid.tab；船的格子是船型的複本，沒改過的塊跟船型共用同一份 ⇒ 直接跳過不比）。
(function (I) {
  'use strict';
  var C = I.core;
  if (!C) return;
  var KEEL_Z = 12, S = 0.1, WOOD = [176, 138, 90], RED = [255, 59, 59], GREEN = [80, 220, 120];
  function mix(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
  /** 整艘掃一次：側視、俯視、龍骨、每個 x 的格數（原本／現在）。 */
  function scan(sh) {
    var B = sh.T.base, G = sh.grid, sx = B.sx, sy = B.sy, sz = B.sz, nx = B.nx, ny = B.ny;
    var R = { sx: sx, sy: sy, sz: sz, sideB: new Uint16Array(sx * sz), sideC: new Uint16Array(sx * sz), planB: new Uint16Array(sx * sy), planC: new Uint16Array(sx * sy),
      keelB: new Uint16Array(sx), keelC: new Uint16Array(sx), colB: new Uint32Array(sx), colC: new Uint32Array(sx), nB: 0, nC: 0,
      x0: sx, x1: 0, y0: sy, y1: 0, z0: sz, z1: 0 };                    // 原本的格子的範圍（圖只畫這一塊；格子的框比船大很多）
    for (var ci = 0; ci < B.tab.length; ci++) {
      var bt = B.tab[ci], gt = G.tab[ci]; if (!bt && !gt) continue;
      var cx = ci % nx, cy = Math.floor(ci / nx) % ny, cz = Math.floor(ci / (nx * ny));
      for (var li = 0; li < 4096; li++) {
        var b = bt ? bt[li] : 0, c = gt ? gt[li] : 0; if (!b && !c) continue;
        var x = cx * 16 + (li & 15), y = cy * 16 + ((li >> 4) & 15), z = cz * 16 + (li >> 8); if (x >= sx || y >= sy || z >= sz) continue;
        if (b) { R.nB++; R.sideB[z * sx + x]++; R.planB[y * sx + x]++; R.colB[x]++; if (z <= KEEL_Z) R.keelB[x]++; if (x < R.x0) R.x0 = x; if (x > R.x1) R.x1 = x; if (y < R.y0) R.y0 = y; if (y > R.y1) R.y1 = y; if (z < R.z0) R.z0 = z; if (z > R.z1) R.z1 = z; }
        if (c) { R.nC++; R.sideC[z * sx + x]++; R.planC[y * sx + x]++; R.colC[x]++; if (z <= KEEL_Z) R.keelC[x]++; }
      }
    }
    return R;
  }
  /** 一張圖：w × h 格、每格 k 像素；cell(i, j) ⇒ [r, g, b] 或 null（空）；j 從下往上（z 朝上）。 */
  function paint(w, h, k, cell, deco) {
    var cv = document.createElement('canvas'); cv.width = w * k; cv.height = h * k;
    var g = cv.getContext('2d'), im = g.createImageData(w * k, h * k), d = im.data;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var c = cell(i, j); if (!c) continue;
      for (var py = 0; py < k; py++) for (var px = 0; px < k; px++) { var o = (((h - 1 - j) * k + py) * w * k + i * k + px) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
    }
    g.fillStyle = '#0b1622'; g.fillRect(0, 0, cv.width, cv.height); var t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; t.getContext('2d').putImageData(im, 0, 0); g.drawImage(t, 0, 0);
    if (deco) deco(g, k, h);
    return cv.toDataURL('image/png');
  }
  function hline(g, k, h, z, col, dash) { g.save(); g.strokeStyle = col; g.lineWidth = 1; if (dash) g.setLineDash([6, 4]); var y = (h - z) * k + 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(g.canvas.width, y); g.stroke(); g.restore(); }
  function vline(g, k, x, col) { g.save(); g.strokeStyle = col; g.lineWidth = 1; var X = x * k + 0.5; g.beginPath(); g.moveTo(X, 0); g.lineTo(X, g.canvas.height); g.stroke(); g.restore(); }
  /** 一柱少了幾成 ⇒ 顏色（開根號：只打掉一舷的洞也看得出來）。 */
  function lossCol(b, c) { if (!b && !c) return null; if (c > b) return GREEN; return mix(WOOD, RED, Math.sqrt((b - c) / b)); }
  /** 現在的水線（格；核心 51_captain.js wlZ ＝ T.zw ＋（sink − lift − bob）÷ 格大小）。 */
  function wlNow(sh) { return sh.T.zw + ((sh.sink || 0) - (sh.lift || 0) - (sh.bob || 0)) / S; }
  /** 一艘：讀數＋四種圖。 */
  function one(sh) {
    var T = sh.T, R = scan(sh), sx = R.sx, sy = R.sy, sz = R.sz, wl = wlNow(sh), bx = sh.keel ? sh.breakX : null;
    if (!R.nB) { R.x0 = R.y0 = R.z0 = 0; R.x1 = sx - 1; R.y1 = sy - 1; R.z1 = sz - 1; }
    var X0 = Math.max(0, R.x0 - 4), X1 = Math.min(sx - 1, R.x1 + 4), Y0 = Math.max(0, R.y0 - 4), Y1 = Math.min(sy - 1, R.y1 + 4), Z0 = Math.max(0, R.z0 - 4), Z1 = Math.min(sz - 1, R.z1 + 4);
    var ww = X1 - X0 + 1, k = I.clamp(Math.floor(1100 / ww), 1, 4);
    var worst = -1, wl0 = 0;
    for (var x = 0; x < sx; x++) { var lx = R.colB[x] - R.colC[x]; if (lx > wl0) { wl0 = lx; worst = x; } }
    var keelMin = null;
    for (x = 0; x < sx; x++) if (R.keelB[x]) { var f = R.keelC[x] / R.keelB[x]; if (!keelMin || f < keelMin.f) keelMin = { x: x, f: f }; }
    function marks(g, kk, h, withWl) {
      if (withWl) { hline(g, kk, h, T.zw - Z0, '#4f8fff', true); hline(g, kk, h, wl - Z0, '#4fd1ff', false); }
      if (bx !== null && bx !== undefined) vline(g, kk, bx - X0, '#ffd166');
      secs.forEach(function (s) { vline(g, kk, s.x - X0, 'rgba(255,255,255,.55)'); });
    }
    var secs = [];
    function addSec(x, why) { x = Math.round(x); if (x < 0 || x >= sx || secs.some(function (s) { return Math.abs(s.x - x) < 3; })) return; secs.push({ x: x, why: why }); }
    if (worst >= 0) addSec(worst, '少最多的那一截');
    if (bx !== null && bx !== undefined) addSec(bx, '斷口');
    [0.25, 0.5, 0.75].forEach(function (u) { addSec(T.hx0 + (T.hx1 - T.hx0) * u, '船長 ' + Math.round(u * 100) + '%'); });
    var img = {
      side: paint(ww, Z1 - Z0 + 1, k, function (i, j) { var o = (j + Z0) * sx + i + X0; return lossCol(R.sideB[o], R.sideC[o]); }, function (g, kk, h) { marks(g, kk, h, true); }),
      plan: paint(ww, Y1 - Y0 + 1, k, function (i, j) { var o = (j + Y0) * sx + i + X0; return lossCol(R.planB[o], R.planC[o]); }, function (g, kk, h) { marks(g, kk, h, false); }),
      keel: paint(ww, 6, k, function (i) { var b = R.keelB[i + X0], c = R.keelC[i + X0]; return b ? (c ? mix(RED, WOOD, c / b) : [255, 255, 255]) : (c ? GREEN : null); }, function (g, kk, h) { marks(g, kk, h, false); }),
      secs: []
    };
    // 橫剖面：寬照整艘的範圍；高到那一截船身的頂（那一層原本至少 10 格寬 ⇒ 桅杆不算，⛔ 不然整張都是天空）＋ 6 格，至少高過現在的水線 10 格
    var hy = Y1 - Y0 + 1, k2 = I.clamp(Math.floor(240 / hy), 1, 4), B = T.base, G = sh.grid;
    secs.forEach(function (s) {
      var top = Z0;
      for (var z = Z0; z <= Z1; z++) if (R.sideB[z * sx + s.x] >= 10) top = z;
      var zt = Math.min(Z1, Math.max(top + 6, Math.ceil(wl) + 10)), nb = 0, nc = 0;
      var src = paint(hy, zt - Z0 + 1, k2, function (i, j) { var b = B.get(s.x, i + Y0, j + Z0), c = G.get(s.x, i + Y0, j + Z0); if (b) nb++; if (c) nc++; return b ? (c ? WOOD : RED) : (c ? GREEN : null); },
        function (g, kk, h) { hline(g, kk, h, T.zw - Z0, '#4f8fff', true); hline(g, kk, h, wl - Z0, '#4fd1ff', false); });
      img.secs.push({ x: s.x, why: s.why, img: src, base: nb, now: nc });
    });
    var stats = {
      name: sh.name || T.name, hull: T.id, team: sh.team, cells: R.nB, now: R.nC, lost: R.nB - R.nC, lostPct: R.nB ? +((R.nB - R.nC) / R.nB * 100).toFixed(2) : 0, coreLost: sh.lost || 0,
      worst: worst >= 0 ? { x: worst, m: +(worst * S).toFixed(1), cells: wl0, pct: +(wl0 / R.colB[worst] * 100).toFixed(1) } : null,
      draft: { design: +(T.zw * S).toFixed(2), now: +(wl * S).toFixed(2) },
      keel: sh.keel ? { broke: true, x: sh.breakX, m: +(sh.breakX * S).toFixed(1), anchor: sh.keel.slice() } : { broke: false, weakest: keelMin ? { x: keelMin.x, m: +(keelMin.x * S).toFixed(1), left: +(keelMin.f * 100).toFixed(1) } : null },
      out: C.isOut(sh), sunk: !!sh.sunk, length: +((T.hx1 - T.hx0) * S).toFixed(1)
    };
    return { name: stats.name, stats: stats, img: img };
  }
  /** 這一場還在的每一艘（敵艦在前）。 */
  I.hullReport = function () {
    return C.ships().filter(function (sh) { return sh.grid && sh.T && sh.T.base; })
      .sort(function (a, b) { return (a.team === 'red' ? 0 : 1) - (b.team === 'red' ? 0 : 1); }).map(one);
  };
  /** 存成一個 HTML（圖內嵌）。 */
  I.hullSave = function () {
    var L = I.hullReport(), Z = I.BT.Z, d = new Date(), p2 = function (v) { return (v < 10 ? '0' : '') + v; }, e = I.esc;
    var stamp = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
    var css = 'body{background:#04101c;color:#d6e8f5;font:14px/1.5 system-ui,"Microsoft JhengHei",sans-serif;margin:16px}h1{font-size:20px}h2{margin:28px 0 6px;font-size:17px;color:#ffd166}' +
      'table{border-collapse:collapse;margin:6px 0}td{border:1px solid #23415a;padding:3px 8px}img{display:block;max-width:100%;image-rendering:pixelated;border:1px solid #23415a;margin:4px 0}' +
      '.secs{display:flex;flex-wrap:wrap;gap:12px}.secs figure{margin:0}.dim{color:#8fb0c8;font-size:12px}';
    var h = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>方舷放置 船體報告 ' + stamp + '</title><style>' + css + '</style>' +
      '<h1>🛠️ 船體報告　海域 ' + (Z ? Z.n : I.S.zone) + '　' + d.toLocaleString() + '</h1>' +
      '<p class="dim">木色 ＝ 還在、紅 ＝ 打掉（側視、俯視：那一柱少了幾成，整柱切穿 ＝ 全紅）、綠 ＝ 多出來的（補丁）。藍虛線 ＝ 設計水線、青 ＝ 現在的水線、黃 ＝ 斷口、白 ＝ 剖面的位置。船頭在右。</p>';
    L.forEach(function (r) {
      var s = r.stats, kl = s.keel.broke ? '斷了：x ' + s.keel.x + '（離船尾 ' + s.keel.m + ' m），錨留 ' + s.keel.anchor.join('～') : s.keel.weakest ? '連著；最細那一截 x ' + s.keel.weakest.x + '（' + s.keel.weakest.m + ' m）剩 ' + s.keel.weakest.left + '%' : '—';
      h += '<h2>' + (s.team === 'red' ? '🏴‍☠️ ' : '🦈 ') + e(s.name) + ' <span class="dim">' + e(s.hull) + '・' + s.length + ' m</span></h2><table>' +
        '<tr><td>格子</td><td>原本 ' + s.cells + '、現在 ' + s.now + '、少了 <b>' + s.lost + '</b>（' + s.lostPct + '%）；核心記的打掉 ' + s.coreLost + '</td></tr>' +
        '<tr><td>少最多的那一截</td><td>' + (s.worst ? 'x ' + s.worst.x + '（' + s.worst.m + ' m）少了 ' + s.worst.cells + ' 格（' + s.worst.pct + '%）' : '—') + '</td></tr>' +
        '<tr><td>吃水</td><td>設計 ' + s.draft.design + ' m、現在 ' + s.draft.now + ' m</td></tr><tr><td>龍骨</td><td>' + kl + '</td></tr>' +
        '<tr><td>狀態</td><td>' + (s.sunk ? '沉了' : s.out ? '出局（降旗或在沉）' : '還在打') + '</td></tr></table>' +
        '<div class="dim">側視（x × 高）</div><img src="' + r.img.side + '"><div class="dim">俯視（x × 寬）</div><img src="' + r.img.plan + '"><div class="dim">龍骨帶（z ≤ ' + KEEL_Z + '，白 ＝ 一格都不剩）</div><img src="' + r.img.keel + '">' +
        '<div class="dim">橫剖面（寬 × 高，從船尾往船頭看）</div><div class="secs">' + r.img.secs.map(function (c) { return '<figure><img src="' + c.img + '"><figcaption class="dim">' + e(c.why) + '　x ' + c.x + '（' + (c.x * S).toFixed(1) + ' m）　' + c.now + ' / ' + c.base + ' 格</figcaption></figure>'; }).join('') + '</div>';
    });
    if (!L.length) h += '<p>這一場沒有船。</p>';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([h], { type: 'text/html' }));
    a.download = 'sharkside-hull-z' + (Z ? Z.n : I.S.zone) + '-' + stamp + '.html';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return L.length;
  };
})(window.BSI = window.BSI || {});
