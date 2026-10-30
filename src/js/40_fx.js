// ───────────────────────── 方舷放置：飄字、船上的標記、訊息列、咬一口的演出、游標、音效、自動運鏡 ─────────────────────────
(function (I) {
  'use strict';
  var C = I.core;
  if (!C) return;
  var FL, MK, TS, FX, CB, marks = new Map(), HTML = document.documentElement;

  I.fxInit = function (root) {
    FL = I.h('div', 'bsi-float'); MK = I.h('div', 'bsi-marks'); TS = I.h('div', 'bsi-toasts'); FX = I.h('div', 'bsi-fx'); CB = I.h('div', 'bsi-combo');
    root.appendChild(MK); root.appendChild(FL); root.appendChild(TS); root.appendChild(FX); root.appendChild(CB);
  };

  // ── 飄字 ──
  function shipPt(sh, up) {
    var c = C.center(sh); if (!c) return null;
    return C.project(c[0], c[1] + (up || 6), c[2]);
  }
  I.floatAt = function (x, y, html, cls) {
    if (!FL || FL.childElementCount > 46) return;
    var e = I.h('div', 'bsi-fl ' + (cls || ''), html);
    e.style.left = (x + (Math.random() - 0.5) * 50).toFixed(0) + 'px'; e.style.top = (y + (Math.random() - 0.5) * 16).toFixed(0) + 'px';
    e.addEventListener('animationend', function () { e.remove(); });
    FL.appendChild(e);
  };
  I.floatShip = function (sh, html, cls, up) { var p = shipPt(sh, up); if (p) I.floatAt(p.x, p.y, html, cls); };

  // ── 訊息列（左下）──
  I.toast = function (html, cls, ms) {
    if (!TS) return;
    var e = I.h('div', 'bsi-toast ' + (cls || ''), html);
    TS.appendChild(e);
    while (TS.childElementCount > 5) TS.firstChild.remove();
    setTimeout(function () { e.classList.add('out'); setTimeout(function () { e.remove(); }, 500); }, ms || 4200);
  };

  // ── 音效（外殼自己合成：核心的音效表沒有這幾種；跟著靜音）──
  var AX = null, NZ = null;
  function ax() {
    if (I.S.mute) return null;
    try {
      if (!AX) {
        AX = new (window.AudioContext || window.webkitAudioContext)();
        var n = AX.sampleRate, b = AX.createBuffer(1, n, n), d = b.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        NZ = b;
      }
      if (AX.state === 'suspended') AX.resume();
      return AX;
    } catch (e) { return null; }
  }
  /** 一個聲部：聲源 →（濾波）→ 包絡 → 輸出；放完就拆（⛔ 留著連著 ⇒ 每個節點每一格都還在算，手機會卡）。 */
  function voice(A, src, t, dur, peak, filt) {
    var g = A.createGain(), f = null;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filt) { f = A.createBiquadFilter(); f.type = filt[0]; f.frequency.value = filt[1]; f.Q.value = filt[2] || 1; src.connect(f); f.connect(g); } else src.connect(g);
    g.connect(A.destination);
    src.onended = function () { try { src.disconnect(); if (f) f.disconnect(); g.disconnect(); } catch (e) { /* 拆過了 */ } };
    src.start(t); src.stop(t + dur + 0.02);
  }
  function noise(A, t, dur, peak, filt) { var s = A.createBufferSource(); s.buffer = NZ; s.loop = true; voice(A, s, t, dur, peak, filt); }
  function tone(A, t, f0, f1, dur, peak, type) {
    var o = A.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    voice(A, o, t, dur, peak);
  }
  I.sfx = function (k) {
    var A = ax(); if (!A) return;
    var t = A.currentTime + 0.01;
    if (k === 'chomp') { noise(A, t, 0.06, 0.22, ['bandpass', 2600, 1.4]); tone(A, t + 0.05, 180, 46, 0.18, 0.5); noise(A, t + 0.055, 0.14, 0.4, ['bandpass', 850, 0.9]); noise(A, t + 0.07, 0.05, 0.2, ['highpass', 3800]); }
    else if (k === 'mega') { tone(A, t, 95, 30, 0.75, 0.6); noise(A, t, 0.6, 0.3, ['lowpass', 500]); noise(A, t + 0.5, 0.25, 0.45, ['bandpass', 1000, 0.8]); tone(A, t + 0.5, 150, 40, 0.3, 0.5); }
    else if (k === 'coin') { tone(A, t, 1318, 1318, 0.09, 0.14, 'triangle'); tone(A, t + 0.07, 1760, 1760, 0.16, 0.14, 'triangle'); }
    else if (k === 'chest') [1046, 1318, 1568, 2093].forEach(function (f, i) { tone(A, t + i * 0.06, f, f, 0.2, 0.13, 'triangle'); });
    else if (k === 'bottle') { tone(A, t, 880, 1760, 0.14, 0.12); tone(A, t + 0.1, 1320, 2640, 0.18, 0.1); }
    else if (k === 'perk') [660, 880, 1320].forEach(function (f, i) { tone(A, t + i * 0.08, f, f, 0.24, 0.13, 'triangle'); });
    else if (k === 'arms') { noise(A, t, 0.05, 0.3, ['bandpass', 3200, 2]); tone(A, t + 0.02, 520, 520, 0.12, 0.12, 'square'); [392, 523, 784].forEach(function (f, i) { tone(A, t + 0.1 + i * 0.07, f, f * 1.01, 0.2, 0.12, 'sawtooth'); }); }   // 軍火箱：鐵扣一響＋往上三聲
    else if (k === 'flame') { noise(A, t, 0.45, 0.32, ['bandpass', 700, 0.7]); noise(A, t, 0.3, 0.16, ['highpass', 2500]); }   // 噴火：呼 ——
    else if (k === 'whistle') tone(A, t, 1900, 520, 0.55, 0.07);           // 砲彈落下的哨音（爆炸聲是核心的）
  };

  // ── 咬一口的演出（畫面上的；船上的牙印、碎木、水花是核心挖的）：上下兩排牙衝過來咬合、閃一下、衝擊圈、字、畫面震 ──
  function jawSvg() {
    var n = 9, t = '';
    function X(u) { return 2 + 116 * u; }
    function Y(u) { return 44 - 80 * u + 80 * u * u; }                 // 牙齦內緣（二次曲線）
    for (var i = 0; i < n; i++) {
      var u0 = 0.06 + i * 0.88 / n, u1 = u0 + 0.88 / n, um = (u0 + u1) / 2, len = 13 + 11 * Math.sin(Math.PI * um);
      t += 'M' + X(u0).toFixed(1) + ' ' + Y(u0).toFixed(1) + 'L' + X(um).toFixed(1) + ' ' + (Y(um) + len).toFixed(1) + 'L' + X(u1).toFixed(1) + ' ' + Y(u1).toFixed(1) + 'Z';
    }
    return '<svg viewBox="0 0 120 64" preserveAspectRatio="none"><path d="M2 34Q60 -8 118 34L118 44Q60 4 2 44Z" fill="#7d1730" stroke="#2a0510" stroke-width="2.5"/>' +
      '<path d="' + t + '" fill="#fffdf2" stroke="#7d8a96" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  }
  var JAW = null, WORDS = ['CHOMP!', 'CRUNCH!', '咬！', 'NOM!'];
  /** anc：{ sh, off（咬的那一點 − 船心，世界座標）, dx, dy（點的那一點 − 那一點的投影）} ⇒ 演出跟著船走（鏡頭換過去看那艘的時候不會留在畫面原地）。 */
  /** cls：'' ／ 'big'（巨齒鯊）／ 'crit'（暴擊）；word：牙上面那個字（沒給 ⇒ 隨便挑一個）。
   *  牙咬合之後很快拉開、淡掉（0.45 秒；Tim：「特效可以消失得更快一些 這樣方便看清楚破壞的格子」），字在上面多留一下。 */
  I.chomp = function (x, y, cls, anc, word) {
    if (!FX) return;
    JAW = JAW || jawSvg();
    var e = I.h('div', 'bsi-chomp' + (cls ? ' ' + cls : ''), '<i class="fl"></i><i class="rg"></i><div class="jaw up">' + JAW + '</div><div class="jaw lo">' + JAW + '</div><b class="wd">' + I.esc(word || I.pick(WORDS)) + '</b>');
    e.style.left = x.toFixed(0) + 'px'; e.style.top = y.toFixed(0) + 'px'; e.bsiA = anc || null;
    FX.appendChild(e);
    while (FX.childElementCount > 12) FX.firstChild.remove();
    setTimeout(function () { e.remove(); }, 850);
  };
  /** 連咬的計數（右邊）：第幾口、倍率；斷了就收（fxFrame 照剩幾秒畫那一條）。 */
  function comboShow(o) {
    if (!CB) return;
    CB.innerHTML = '<b>' + o.combo + '</b><small>連咬 ' + I.mulTxt(o.cm / (o.crit ? 2 : 1)) + (o.crit ? '・暴擊 ×2' : '') + '</small><i></i>';
    CB.className = 'bsi-combo on' + (o.crit ? ' crit' : ''); void CB.offsetWidth; CB.classList.add('pop');
  }
  var shT = 0;
  function shake(big) {
    var cv = I.$('cv'); if (!cv) return;
    cv.classList.remove('bsi-shake', 'bsi-shake2'); void cv.offsetWidth; cv.classList.add(big ? 'bsi-shake2' : 'bsi-shake');
    clearTimeout(shT); shT = setTimeout(function () { cv.classList.remove('bsi-shake', 'bsi-shake2'); }, big ? 700 : 480);
  }
  var chompT = 0;
  I.on('bite', function (o) {
    var x = o.cx, y = o.cy, c = C.center(o.sh), p = o.w && C.project(o.w[0], o.w[1], o.w[2]), anc = null;
    if (x === undefined && p) { x = p.x; y = p.y; }
    if (c && p && x !== undefined) anc = { sh: o.sh, off: [o.w[0] - c[0], o.w[1] - c[1], o.w[2] - c[2]], dx: x - p.x, dy: y - p.y };
    if (!o.big && (I.S.cam === 'foe' || I.S.cam === 'auto')) { lockOn(o.sh); camHold = I.now() + 8000; }   // 咬到哪艘，鏡頭就看哪艘（巨齒鯊一口氣咬全部 ⇒ 不跟，免得一直跳）
    if (x !== undefined) {
      var cls = o.big ? 'big' : o.crit ? 'crit' : '';
      I.chomp(x, y, cls, anc, o.big ? 'MEGA CHOMP!' : o.crit ? 'CRITICAL!' : o.combo >= 2 ? 'COMBO ×' + o.combo : null);
      I.floatAt(x, y - (o.big ? 80 : 54), '🦈 ' + (o.g > 0 ? '+' + I.fmt(o.g) : o.n + ' 格'), 'bite' + (cls ? ' ' + cls : ''));
    }
    if (o.combo >= 2) comboShow(o);
    shake(o.big || o.crit);
    if (!o.big) setTimeout(function () { I.sfx('chomp'); }, 110);      // 跟咬合那一下（動畫 34%，0.15 秒）對齊
    HTML.classList.add('bsi-chomp'); clearTimeout(chompT); chompT = setTimeout(function () { HTML.classList.remove('bsi-chomp'); }, 170);
  });
  // 巨齒鯊：一條大鯊魚從畫面游過去（30_battle.js 接著一艘一艘咬）
  var SHARK = '<svg viewBox="0 0 400 170"><defs><linearGradient id="bsiSk" x1="0" y1="0" x2="0" y2="1"><stop offset=".46" stop-color="#2d4f6b"/><stop offset=".64" stop-color="#d9e6ee"/></linearGradient></defs>' +
    '<path d="M396 94C372 72 322 60 262 58L232 12L214 60C160 64 112 74 80 84L26 30L48 92L32 146L84 104C130 114 190 120 236 120L212 154L264 118C322 116 370 108 396 94Z" fill="url(#bsiSk)" stroke="#0c1a26" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M396 94L340 102L382 108Z" fill="#5a0d1c"/><path d="M350 102l4 5l4-5l4 5l4-5l4 5l4-5l4 4" stroke="#fff" stroke-width="2" fill="none"/>' +
    '<circle cx="350" cy="80" r="4.5" fill="#05080c"/><circle cx="351.5" cy="78.5" r="1.4" fill="#fff"/><path d="M300 76q-4 12 0 22M310 75q-4 12 0 22M320 75q-4 12 0 22" stroke="#173247" stroke-width="2.4" fill="none"/></svg>';
  // 特殊武器（30_battle.js weaponGet／weaponFire）：撿到喊一聲；打出去 ⇒ 聲音、點的那一點冒個字、鏡頭鎖過去（同咬）
  I.on('weapon', function (W) {
    I.toast(W.ico + ' 撿到 <b>' + I.esc(W.name) + '</b>！' + W.dur + ' 秒內點敵艦不咬，換成' + I.esc(W.name) + ' —— ' + I.esc(W.desc), 'gold', 5000);
    I.banner(W.ico + ' ' + I.esc(W.name) + '<small>' + W.dur + ' 秒內點敵艦！威力照鯊魚利齒</small>', 'zone');
    I.sfx('arms');
  });
  I.on('weaponFire', function (W, sh, to, cx, cy) {
    if (I.S.cam === 'foe' || I.S.cam === 'auto') { lockOn(sh); camHold = I.now() + 8000; }
    I.sfx(W.id === 'fire' ? 'flame' : 'whistle');
    if (cx !== undefined) I.floatAt(cx, cy - 30, W.id === 'fire' ? '🔥' : '💣', 'bite');
  });
  // 黃金寶船（30_battle.js reinforce）：喊一聲、鎖定敵艦的鏡頭換過去
  I.on('gold', function (sh) {
    I.toast('💰 <b>黃金寶船 ' + I.esc(sh.name) + '</b> 出現了！身價 ×' + I.BAL.goldK + '、幾乎不還手，打中會掉更多寶物 —— 快咬！', 'gold', 7000);
    I.floatShip(sh, '💰 黃金寶船！', 'kill', 16);
    I.sfx('chest');
    if (I.S.cam === 'foe') lockOn(sh);
  });
  I.on('mega', function () {
    if (!FX) return;
    var e = I.h('div', 'bsi-mega', '<i class="dark"></i><div class="shark">' + SHARK + '</div><b class="wd">🦈 巨齒鯊！</b>');
    FX.appendChild(e); setTimeout(function () { e.remove(); }, 2000);
    shake(true); I.sfx('mega');
  });

  // ── 游標：滑到敵艦的船身上 ⇒ 張開的鯊魚嘴；咬下去那一下 ⇒ 合起來（照核心的 pick，跟點下去咬的是同一艘）──
  function curSvg(shut) {
    var up = shut ? 18 : 14, lo = shut ? 14 : 18, m = 'M2.5 10.5C8 3 24 3 29.5 10.5V21.5C24 29 8 29 2.5 21.5Z';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="' + m + '" fill="#000" stroke="#000" stroke-width="3.4"/><path d="' + m + '" fill="#6d1024" stroke="#fff" stroke-width="1.6"/>' +
      '<path d="M4.5 10.5L7.5 ' + up + 'L10.5 9.5L13.5 ' + up + 'L16 9L18.5 ' + up + 'L21.5 9.5L24.5 ' + up + 'L27.5 10.5Z" fill="#fff"/>' +
      '<path d="M4.5 21.5L7.5 ' + lo + 'L10.5 22.5L13.5 ' + lo + 'L16 23L18.5 ' + lo + 'L21.5 22.5L24.5 ' + lo + 'L27.5 21.5Z" fill="#fff"/></svg>';
  }
  /** 拿著特殊武器：準星（紅圈、十字、中間一點）。 */
  var AIM = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#000" stroke-width="4"/><circle cx="16" cy="16" r="10" fill="none" stroke="#ff5a3c" stroke-width="2"/>' +
    '<path d="M16 1v9M16 22v9M1 16h9M22 16h9" stroke="#000" stroke-width="4"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="2" fill="#ffd166" stroke="#000"/></svg>';
  (function () {
    function cur(shut) { return 'url("data:image/svg+xml,' + encodeURIComponent(curSvg(shut)) + '") 16 16, crosshair'; }
    var st = document.createElement('style');
    st.textContent = 'html.bsi-on.bsi-bite #cv,html.bsi-on #bsi .bsi-mark.foe{cursor:' + cur(false) + '}html.bsi-on.bsi-chomp #cv,html.bsi-on.bsi-chomp #bsi .bsi-mark.foe{cursor:' + cur(true) + '}' +
      'html.bsi-on.bsi-wpn.bsi-bite #cv,html.bsi-on.bsi-wpn #bsi .bsi-mark.foe{cursor:url("data:image/svg+xml,' + encodeURIComponent(AIM) + '") 16 16, crosshair}';
    document.head.appendChild(st);
  })();
  var mx = -1, my = -1, curOn = false, curT = 0, curAcc = 0;
  function curCheck() {
    var on = false;
    if (mx >= 0 && (I.BT.phase === 'fight' || I.BT.phase === 'hold')) on = I.biteable(C.pick(mx, my));   // 水面下、打贏之後還在沉的也算（30_battle.js biteable）
    if (on !== curOn) { curOn = on; HTML.classList.toggle('bsi-bite', on); }
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (e.target && e.target.id === 'cv') { mx = e.clientX; my = e.clientY; } else mx = -1;
    var t = performance.now(); if (t - curT > 45) { curT = t; curCheck(); }
  }, { passive: true });

  // ── 戰鬥的事件 ⇒ 飄字、訊息 ──
  I.on('float', function (sh, g) { I.floatShip(sh, '+' + I.fmt(g), g > I.BT.income * 0.08 ? 'big' : ''); });
  I.on('kill', function (sh, how, g) {
    var gd = sh.bsi && sh.bsi.gold ? '💰 黃金寶船 ' : '';
    I.floatShip(sh, gd + (how === 'cap' ? '🏳️ 俘獲 ' : '⚓ 擊沉 ') + '+' + I.fmt(g), 'kill ' + how, 14);
    I.toast((how === 'cap' ? '🏳️ <b>' + gd + I.esc(sh.name) + '</b> 降旗了 —— 俘獲賞金' : '⚓ <b>' + gd + I.esc(sh.name) + '</b> 沉了 —— 賞金') + ' <span class="g">+' + I.fmt(g) + '</span>', how + (gd ? ' gold' : ''));
    I.camEvent(sh, 7000);
  });
  I.on('boom', function (sh, g) { I.floatShip(sh, '💥 殉爆！+' + I.fmt(g), 'boom', 18); I.toast('💥 <b>' + I.esc(sh.name) + '</b> 彈藥庫殉爆！額外賞金 <span class="g">+' + I.fmt(g) + '</span>', 'boom'); I.camEvent(sh, 9000); });
  I.on('reserve', function (sh, left) { var me = sh.team === 'blue'; I.toast((me ? '⚓ 我方換上：<b>' : '🚩 援軍進場：<b>') + I.esc(sh.name) + '</b>' + (left ? '（候補還有 ' + left + ' 艘）' : '（候補用完）'), me ? 'note blue' : 'wave', 3500); });
  I.on('bp', function (id, gift) { I.toast(gift ? '🎁 亞特蘭提斯的禮物：<b>' + I.esc(I.nameOf(id)) + '</b> 的藍圖！（船塢）' : '📜 拿到藍圖：<b>' + I.esc(I.nameOf(id)) + '</b>（' + I.esc(I.AUTHORS[id] || '') + ' 造）—— 船塢可以造了', 'bp', 6000); });
  I.on('ach', function (a) { I.toast('🏆 成就：<b>' + a.ico + ' ' + I.esc(a.name) + '</b>（收入 ×1.03）', 'ach', 6000); });
  I.on('lootTake', function (it, click) { if (click) I.sfx(it.k === 'chest' ? 'chest' : it.k === 'bottle' ? 'bottle' : 'coin'); });
  /** 核心的廣播帶了 HTML（<b style="color:…">起火！</b>）⇒ 只留 b／i／strong／em／span 與它們的字色，其他標記拿掉、字照樣跳脫。
   *  ⛔ 直接 esc ⇒ 標記整串印出來（Tim 2026-10-30 截圖）；⛔ 直接塞 innerHTML ⇒ 核心哪天帶了別的標記也照單全收。DOMParser 解析不跑程式、不載圖。 */
  function richText(html) {
    var out = '';
    (function walk(n) {
      [].forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) { out += I.esc(c.nodeValue); return; }
        if (c.nodeType !== 1) return;
        var t = c.tagName.toLowerCase(), keep = /^(b|i|strong|em|span)$/.test(t), col = keep && c.style ? c.style.color : '';
        if (keep) out += '<' + t + (col && /^[#a-z0-9(),.\s%]+$/i.test(col) ? ' style="color:' + col + '"' : '') + '>';
        walk(c);
        if (keep) out += '</' + t + '>';
      });
    })(new DOMParser().parseFromString('<body>' + html, 'text/html').body);
    return out;
  }
  I.richText = richText;
  I.on('note', function (sh, text) {
    if (!/桅|起火|殉爆|斷|援軍|全員倒下/.test(String(text).replace(/<[^>]*>/g, ''))) return;   // 只挑看得到的大事（照純文字判）
    I.toast((sh.team === 'blue' ? '🔵 ' : '🔴 ') + I.esc(sh.name) + '：' + richText(text), 'note ' + sh.team, 3500);
  });

  // ── 船上的標記（敵艦：名字、身價、浮力條，點了咬一口；我方：小名牌）──
  function mark(sh) {
    var m = marks.get(sh);
    if (m) return m;
    var red = sh.team === 'red', gold = sh.bsi && sh.bsi.gold, e = I.h('div', 'bsi-mark ' + (red ? 'foe' : 'mine') + (sh.bsi && sh.bsi.boss ? ' boss' : '') + (gold ? ' gold' : ''));
    e.innerHTML = '<div class="nm">' + (sh.bsi && sh.bsi.boss ? '👑 ' : '') + (gold ? '💰 ' : '') + I.esc(sh.name) + '</div>' + (red && sh.bsi && sh.bsi.pool ? '<div class="val">💰 ' + I.fmt(sh.bsi.pool * I.valueMul() * I.incomeMul()) + '</div>' : '') +
      '<div class="bar"><i></i></div>' + (red ? '<div class="sub"></div>' : '');
    if (red) e.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); I.biteShip(sh, ev.clientX, ev.clientY); });   // 名牌在船上面 ⇒ 往船的中心找船身咬
    MK.appendChild(e);
    m = { e: e, bar: e.querySelector('.bar i'), sub: e.querySelector('.sub'), last: '' };
    marks.set(sh, m);
    return m;
  }
  I.marksClear = function () { marks.forEach(function (m) { m.e.remove(); }); marks.clear(); };
  I.on('zoneLoad', function () { I.marksClear(); });

  var camT = 0, camHold = 0, userT = 0, camSeq = 0;
  I.fxFrame = function (dt) {
    if ((curAcc += dt) > 0.15) { curAcc = 0; curCheck(); HTML.classList.toggle('bsi-wpn', !!I.weaponOn()); }   // 游標不動、船在動；拿著特殊武器 ⇒ 準星
    if (CB && CB.classList.contains('on')) {                              // 連咬：剩幾秒會斷（那一條）；斷了收起來
      var cl = I.comboLeft(), cbar = CB.querySelector('i');
      if (cl <= 0) CB.className = 'bsi-combo'; else if (cbar) cbar.style.setProperty('--left', (cl / I.BAL.comboGap * 100).toFixed(0) + '%');
    }
    if (FX) [].forEach.call(FX.children, function (e) {                   // 咬一口的演出跟著被咬的那艘
      var a = e.bsiA, c = a && C.center(a.sh), p = c && C.project(c[0] + a.off[0], c[1] + a.off[1], c[2] + a.off[2]);
      if (p) { e.style.left = (p.x + a.dx).toFixed(0) + 'px'; e.style.top = (p.y + a.dy).toFixed(0) + 'px'; }
    });
    var ph = I.BT.phase;
    if (ph !== 'fight' && ph !== 'hold') { if (marks.size) I.marksClear(); return; }
    var live = new Set();
    C.ships().forEach(function (sh) {
      if (sh.sunk) return;
      var st = C.stat(sh), p = shipPt(sh, sh.team === 'red' ? 13 : 10); if (!st || !p || p.x < -50 || p.y < -50 || p.x > innerWidth + 50 || p.y > innerHeight + 50) return;
      var m = mark(sh); live.add(sh);
      m.e.style.transform = 'translate(' + p.x.toFixed(0) + 'px,' + p.y.toFixed(0) + 'px)';
      var f = st.float, out = C.isOut(sh);
      m.bar.style.width = (f * 100).toFixed(1) + '%';
      m.bar.className = f > 0.6 ? '' : f > 0.3 ? 'mid' : 'low';
      m.e.classList.toggle('out', out);
      m.e.classList.toggle('lock', sh === lock && I.S.cam === 'foe');
      if (m.sub) {
        var t = out ? (sh.struck && !sh.sinkingFinal ? '🏳️ 降旗' : '⚓ 沉沒中') : '👥 ' + Math.round(st.crew * 100) + '%　💣 ' + Math.round(st.guns * 100) + '%';
        if (t !== m.last) { m.sub.textContent = t; m.last = t; }
      }
    });
    marks.forEach(function (m, sh) { if (!live.has(sh)) { m.e.remove(); marks.delete(sh); } });
    camFrame(dt);
  };

  // ── 鏡頭（設定：foe 鎖定敵艦（預設）／auto 自動運鏡／flag 跟著旗艦／free 自己轉）──
  function alive(team) { return C.ships().filter(function (s) { return s.team === team && !C.isOut(s) && !s.sunk; }); }
  var lock = null, lockOut = 0;
  /** 鎖定那一艘：鏡頭換過去看它（核心的「看這艘」：跟著它、繞著它轉，滑過去不是切）；遠近照現在的（核心 camSee 會設回 75）。 */
  function lockOn(sh) {
    if (!sh || sh.sunk || sh === lock) return;
    var d = C.cam.get().dist; lock = sh; lockOut = 0;
    C.cam.see(sh); C.cam.set({ dist: I.clamp(d, 45, 150) });
  }
  /** 下一艘要鎖的：還在打的敵艦裡離 from（沒給 ⇒ 我方旗艦）最近的那艘。 */
  function nextFoe(from) {
    var L = alive('red'), me = alive('blue')[0], c0 = from && C.center(from) || me && C.center(me), best = L[0] || null, bd = Infinity;
    if (c0) L.forEach(function (s) { var c = C.center(s), d = c ? Math.hypot(c[0] - c0[0], c[2] - c0[2]) : Infinity; if (d < bd) { bd = d; best = s; } });
    return best;
  }
  /** Tab：鎖定下一艘敵艦（不在鎖定敵艦 ⇒ 換成鎖定敵艦）。 */
  I.camNext = function () {
    if (I.S.cam !== 'foe') { I.S.cam = 'foe'; I.topBtns(); }
    var L = alive('red'); if (!L.length) return;
    var n = L[(L.indexOf(lock) + 1) % L.length]; lock = null; lockOn(n);
  };
  I.camUser = function () { userT = I.now(); };                       // 使用者自己拖了鏡頭 ⇒ 自動運鏡讓 25 秒
  I.camEvent = function (sh, ms) {                                    // 大事（擊沉、殉爆）⇒ 切過去看
    if (I.S.cam !== 'auto' || I.now() - userT < 25000 || !sh || sh.sunk) return;
    C.cam.see(sh); C.cam.set({ dist: 70 + Math.random() * 30, pitch: 0.16 + Math.random() * 0.12 }); camHold = I.now() + ms;
  };
  I.camStart = function () {
    camT = I.now() + 6000; camHold = 0; camSeq = 0; lock = null; lockOut = 0;
    if (I.S.cam === 'free') return;
    if (I.S.cam === 'foe') { lockOn(nextFoe(null)); C.cam.set({ dist: 75, pitch: 0.18 }); return; }
    var me = alive('blue')[0]; if (me) { C.cam.see(me); C.cam.set({ dist: 85, pitch: 0.2 }); }
  };
  function camFrame(dt) {
    var mode = I.S.cam, now = I.now();
    if (mode === 'foe') {                                              // 鎖定的那艘降旗、沉沒中 ⇒ 再看 3.5 秒，換離它最近的下一艘；還沒鎖 ⇒ 鎖
      var ok = lock && !lock.sunk && C.ships().indexOf(lock) >= 0;
      if (ok && C.isOut(lock)) { lockOut = lockOut || now; ok = now - lockOut < 3500; }
      if (!ok) { var n = nextFoe(lock); if (n) { lock = null; lockOn(n); } }
      if (I.BT.phase === 'fight' && now - userT > 25000) C.cam.orbit(dt * 5, 0);   // 沒在摸鏡頭 ⇒ 慢慢繞
      return;
    }
    if (mode !== 'auto' || now - userT < 25000) return;
    if (I.BT.phase === 'fight') C.cam.orbit(dt * 7, 0);               // 慢慢繞
    if (now < camHold || now < camT) return;
    camT = now + 9000 + Math.random() * 5000; camSeq++;
    var foes = alive('red'), mine = alive('blue'), shot = camSeq % 3;
    if (shot === 1 && foes.length) { C.cam.see(I.pick(foes)); C.cam.set({ dist: 65 + Math.random() * 40, pitch: 0.1 + Math.random() * 0.2 }); }
    else if (shot === 2 && mine.length) { C.cam.see(I.pick(mine)); C.cam.set({ dist: 90 + Math.random() * 50, pitch: 0.28 + Math.random() * 0.2 }); }
    else if (mine.length) { C.cam.see(mine[0]); C.cam.set({ dist: 150 + Math.random() * 80, pitch: 0.42 + Math.random() * 0.2 }); }
  }
})(window.BSI = window.BSI || {});
