// ───────────────────────── 方舷放置：漂流寶物 ─────────────────────────
// 敵艦被我方打中（核心的 rptHit）⇒ 有機率在中彈的地方漂出一件：木桶、寶箱（格，照那艘的身價）、瓶中信（隨機一種增益幾秒）。
// 點一下撿起來；放著 BAL.lootLife 秒就自動撿，只拿一半。換海域、換海圖之前還漂著的全部自動撿。
// 畫在畫面上（跟船上的名牌一樣照投影跟著海面那一點走），⛔ 不進核心的模擬：亂數用 Math.random、不碰戰局。
(function (I) {
  'use strict';
  var C = I.core, B = I.BAL;
  if (!C) return;
  var LY = null, L = [], lastDrop = 0;
  var KIND = {
    barrel: { name: '木桶', ico: '🛢️', svg: '<svg viewBox="0 0 48 48"><g transform="rotate(-12 24 24)"><rect x="7" y="13" width="34" height="22" rx="10" fill="#a0612c" stroke="#4a2a12" stroke-width="2"/><path d="M14 13.5v21M34 13.5v21" stroke="#3b2210" stroke-width="3"/><path d="M9 19h30M9 29h30" stroke="#7a4420" stroke-width="1.2" opacity=".7"/><ellipse cx="41" cy="24" rx="3" ry="9" fill="#c98a4b" stroke="#4a2a12" stroke-width="1.5"/></g></svg>' },
    chest: { name: '寶箱', ico: '🧰', svg: '<svg viewBox="0 0 48 48"><path d="M8 22Q24 4 40 22Z" fill="#b8702e" stroke="#4a2a12" stroke-width="2" stroke-linejoin="round"/><rect x="8" y="22" width="32" height="17" rx="2" fill="#8f5222" stroke="#4a2a12" stroke-width="2"/><path d="M14 17V39M34 17V39" stroke="#f2c14e" stroke-width="2.4"/><rect x="8" y="20.5" width="32" height="4" fill="#f2c14e" stroke="#8a5a10" stroke-width="1"/><rect x="21" y="23" width="6" height="8" rx="1.5" fill="#ffe08a" stroke="#8a5a10" stroke-width="1.2"/><circle cx="24" cy="27" r="1.2" fill="#5a3a08"/></svg>' },
    bottle: { name: '瓶中信', ico: '🍾', svg: '<svg viewBox="0 0 48 48"><g transform="rotate(-38 24 24)"><rect x="20.5" y="4" width="7" height="6" rx="1.5" fill="#b07a44" stroke="#5a3a1a" stroke-width="1.2"/><path d="M19.5 10h9v5q8 4 8 12v12q0 4-4 4h-17q-4 0-4-4v-12q0-8 8-12z" fill="rgba(110,220,170,.5)" stroke="#e4fff3" stroke-width="1.6"/><rect x="17" y="24" width="14" height="14" rx="2" fill="#f6e7c1" stroke="#c9a96e" stroke-width="1"/><path d="M19.5 28h9M19.5 31.5h9M19.5 35h6" stroke="#a88a55" stroke-width="1.1"/><path d="M14 26q1-6 5-9" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/></g></svg>' }
  };

  I.lootInit = function (root) { LY = I.h('div', 'bsi-loot'); root.insertBefore(LY, root.firstChild); };   // 墊在面板底下：漂到面板後面的點不到

  C.on('rptHit', function (b, sh) {
    if (!LY || I.BT.phase !== 'fight' || !b || !b.p || !sh || sh.team !== 'red' || !sh.bsi || !sh.bsi.pool) return;
    var own = C.ships()[b.owner], now = I.now();
    if (!own || own.team !== 'blue' || now - lastDrop < B.lootGap * 1000 || L.length >= B.lootMax) return;
    if (Math.random() >= B.lootP * I.bmul('loot')) return;
    lastDrop = now; drop(sh, b.p.slice());
  });
  function roll() { var x = Math.random(); return x < 0.12 ? 'chest' : x < 0.4 ? 'bottle' : 'barrel'; }
  /** 中彈那一點往船外推 3 公尺、往外漂（越漂越慢）。 */
  function drop(sh, p) {
    var c = C.center(sh) || p, dx = p[0] - c[0], dz = p[2] - c[2], dl = Math.hypot(dx, dz) || 1, k = roll();
    dx /= dl; dz /= dl;
    var e = I.h('div', 'bsi-lt ' + k, '<i class="glow"></i><div class="bob">' + KIND[k].svg + '</div>');
    var it = { k: k, x: p[0] + dx * 3, z: p[2] + dz * 3, vx: dx * 2.4 + (Math.random() - 0.5), vz: dz * 2.4 + (Math.random() - 0.5), t0: I.now(), pool: sh.bsi.pool, e: e };
    e.title = KIND[k].name + '：點一下撿起來';
    e.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); take(it, true); });
    LY.appendChild(e); L.push(it);
    I.emit('lootDrop', it);
  }
  /** 撿：click ⇒ 全拿；自動撿 ⇒ BAL.lootAuto 倍（瓶中信 ⇒ 秒數打折）。 */
  function take(it, click) {
    if (it.done) return;
    it.done = true; L.splice(L.indexOf(it), 1);
    var S = I.S, k = click ? 1 : B.lootAuto, p = C.project(it.x, 0.5, it.z), txt, g = 0;
    if (it.k === 'bottle') {
      var d = I.pick(I.BUFF), sec = Math.round(B.bottleSec * k);
      I.buffAdd(d.id, { sec: sec });
      txt = '🍾 ' + d.ico + ' ' + d.name + ' ' + sec + ' 秒';
      I.toast('🍾 瓶中信：<b>' + d.ico + ' ' + I.esc(d.name) + '</b> —— ' + I.esc(d.desc) + '（' + sec + ' 秒）' + (click ? '' : ' <span class="dim">自動撿：只有一半</span>'), 'loot', 4500);
    } else {
      g = I.gain(it.pool * (it.k === 'chest' ? B.chestK : B.barrelK) * k * I.valueMul() * I.incomeMul(), 'loot');
      if (I.BT.phase === 'fight' || I.BT.phase === 'hold') I.BT.income += g;
      txt = KIND[it.k].ico + ' +' + I.fmt(g);
      if (it.k === 'chest') S.st.chest++;
    }
    S.st.loot++;
    it.e.classList.add(click ? 'got' : 'auto');
    setTimeout(function () { it.e.remove(); }, 800);
    if (p) I.floatAt(p.x, p.y - 14, txt + (click ? '' : ' <small>（自動撿）</small>'), 'loot ' + it.k + (click ? '' : ' auto'));
    I.emit('lootTake', it, click, g);
  }

  /** 每一格（主迴圈）：漂、跟著鏡頭投影、快到時間閃、時間到自動撿。速度照模擬速度（跟船一起快轉）。 */
  I.lootFrame = function (dt) {
    if (!L.length) return;
    var now = I.now(), sp = dt * (I.S.speed || 1), W = innerWidth, H = innerHeight, dmp = Math.exp(-sp * 0.5);
    L.slice().forEach(function (it) {
      var age = (now - it.t0) / 1000;
      if (age > B.lootLife) { take(it, false); return; }
      it.vx *= dmp; it.vz *= dmp; it.x += it.vx * sp; it.z += it.vz * sp;
      var p = C.project(it.x, 0.5, it.z), e = it.e;
      if (!p || p.x < -40 || p.y < -40 || p.x > W + 40 || p.y > H + 40) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) scale(' + I.clamp(2600 / p.d, 0.55, 1.6).toFixed(2) + ')';
      e.classList.toggle('soon', B.lootLife - age < 4);
    });
  };
  /** 還漂著的全部自動撿（換海域；換海圖重新載入前 —— 這一支排在主程式的存檔前面）。 */
  I.lootFlush = function () { L.slice().forEach(function (it) { take(it, false); }); };
  I.on('zoneLoad', I.lootFlush);
  I.on('reload', I.lootFlush);
})(window.BSI = window.BSI || {});
