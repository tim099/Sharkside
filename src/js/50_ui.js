// ───────────────────────── 方舷放置：介面（上方資源列、海域卡、技能列、結算商店、彈窗） ─────────────────────────
// 全部自己畫：核心的主選單、HUD 都藏起來（idle.css）。元素一律 bsi- 開頭，不跟核心的 id 撞。
// 打仗時畫面上只有資源列、海域卡、技能列；升級、艦隊、任務…都在每一場打完的結算商店裡（Tim 2026-10-30：「遊戲中不用有常駐選單 因為手機上空間不夠」）。
(function (I) {
  'use strict';
  var C = I.core, $ = I.$, h = I.h, ROOT, qty = 1, tab = 'upg', dirty = { panel: true }, rateLog = [], lastTxt = {}, frzWas = false, FRZ = I.ABIL.filter(function (a) { return a.id === 'frenzy'; })[0];

  function txt(id, s) { if (lastTxt[id] === s) return; lastTxt[id] = s; var e = $(id); if (e) e.textContent = s; }
  function html(id, s) { if (lastTxt[id] === s) return; lastTxt[id] = s; var e = $(id); if (e) e.innerHTML = s; }
  I.dirty = function (k) { dirty[k || 'panel'] = true; };

  I.uiInit = function () {
    ROOT = h('div'); ROOT.id = 'bsi';
    ROOT.innerHTML =
      '<div class="bsi-top">' +
        '<div class="brand"><span class="fin">🦈</span><div><b>方舷放置</b><small>Sharkside · 鯊魚艦隊的無盡海</small></div></div>' +
        '<div class="cur">' +
          '<div class="res blk" title="格：打下來的每一格船殼"><span class="ico">🧱</span><b id="bsi-blk">0</b><span class="u">格</span><span class="rate" id="bsi-rate"></span></div>' +
          '<div class="res shd" id="bsi-shdBox" title="三叉戟碎片：深海科技的貨幣；累計的每一顆讓收入 +10%"><span class="ico">🔱</span><b id="bsi-shd">0</b></div>' +
          '<div class="mul" id="bsi-mul" title="收入倍率（成就 × 碎片 × 增益 × 祝福）"></div>' +
        '</div>' +
        '<div class="btns"><button id="bsi-spd" title="模擬速度"></button><button id="bsi-cam" title="鏡頭（C 換；鎖定敵艦時 Tab 換下一艘）"></button><button id="bsi-mute" title="聲音"></button><button id="bsi-set" title="設定">⚙️</button></div>' +
      '</div>' +
      '<div class="bsi-zone" id="bsi-zone">' +
        '<div class="zh"><span class="rico" id="bsi-rico"></span><div><div class="rname" id="bsi-rname"></div><div class="zn" id="bsi-zn"></div></div></div>' +
        '<div class="zmod" id="bsi-zmod"></div>' +
        '<div class="dots" id="bsi-dots"></div>' +
        '<div class="zstat" id="bsi-zstat"></div>' +
        '<div class="ratio" id="bsi-ratio"></div>' +
        '<div class="farm" id="bsi-farm"></div>' +
        '<div class="buffs" id="bsi-buffs"></div>' +
      '</div>' +
      '<div class="bsi-shop" id="bsi-shop">' +
        '<div class="sh-head" id="bsi-sh-head"></div>' +
        '<div class="tabs" id="bsi-tabs"></div>' +
        '<div class="body" id="bsi-body"></div>' +
        '<div class="sh-foot">' +
          '<div class="sh-zone"><button id="bsi-zprev" title="上一個海域">◀</button><div class="sh-next" id="bsi-sh-next"></div><button id="bsi-znext" title="下一個海域">▶</button><button id="bsi-zauto"></button></div>' +
          '<button class="big" id="bsi-sail"></button>' +
          '<div class="sh-cd"><div class="pk-bar"><i id="bsi-sh-bar"></i></div><span id="bsi-sh-left"></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="bsi-abil" id="bsi-abil"></div>' +
      '<div class="bsi-wpn" id="bsi-wpn"><span class="ico" id="bsi-wpn-ico"></span><div class="mid"><b id="bsi-wpn-nm"></b><div class="bar"><i id="bsi-wpn-bar"></i></div></div><span class="s" id="bsi-wpn-s"></span></div>' +
      '<div class="bsi-wpn bsi-frz" id="bsi-frz"><span class="ico">🌊</span><div class="mid"><b id="bsi-frz-nm"></b><div class="bar"><i id="bsi-frz-bar"></i></div></div><span class="s" id="bsi-frz-s"></span></div>' +
      '<div class="bsi-banner" id="bsi-banner"></div>' +
      '<div class="bsi-perk" id="bsi-perk"><div class="pk-h" id="bsi-pk-h"></div><div class="pk-cards" id="bsi-pk-cards"></div><div class="pk-foot"><div class="pk-bar"><i id="bsi-pk-bar"></i></div><span id="bsi-pk-left"></span></div></div>' +
      '<div class="bsi-modal-bg" id="bsi-mbg"><div class="bsi-modal" id="bsi-modal"></div></div>';
    document.body.appendChild(ROOT);
    I.fxInit(ROOT); I.lootInit(ROOT);
    tabsBuild(); abilBuild();
    $('bsi-spd').onclick = function () { var L = I.SPEEDS.filter(function (x) { return x <= I.speedMax(); }), i = (L.indexOf(I.S.speed) + 1) % L.length; I.S.speed = L[i]; C.speed(I.S.speed); topBtns(); };
    $('bsi-cam').onclick = function () { var L = ['foe', 'auto', 'flag', 'free']; I.S.cam = L[(L.indexOf(I.S.cam) + 1) % L.length]; if (I.S.cam !== 'free') I.camStart(); topBtns(); };
    $('bsi-mute').onclick = function () { I.S.mute = !I.S.mute; C.sound({ mute: I.S.mute }); topBtns(); };
    $('bsi-set').onclick = settings;
    // 結算商店底下：下一場打哪個海域（出航才開打）
    $('bsi-zprev').onclick = function () { var S = I.S; if (S.zone > 1) { S.auto = false; S.zone--; S.farm = 0; shopFoot(); } };
    $('bsi-znext').onclick = function () { var S = I.S; if (S.zone < S.maxZone) { S.zone++; S.farm = 0; shopFoot(); } };
    $('bsi-zauto').onclick = function () { var S = I.S; S.auto = !S.auto; if (S.auto && !S.farm) S.zone = S.maxZone; shopFoot(); };
    $('bsi-sail').onclick = shopSail;
    $('bsi-shop').addEventListener('pointerdown', function (e) { if (shopUntil && e.target.id !== 'bsi-sail') { shopUntil = 0; shopFoot(); } });   // 碰了商店 ⇒ 不自動出航，等按出航
    $('bsi-mbg').addEventListener('pointerdown', function (e) { if (e.target === this && !this.dataset.lock) modalClose(); });
    topBtns();
    ['buy', 'bp', 'fleet', 'prestige', 'ach'].forEach(function (k) { I.on(k, function () { I.dirty(); }); });
    I.on('zoneStart', function () { zoneCard(); I.dirty(); I.camStart(); });
    I.on('zoneLoad', function (Z) { zoneCard(); banner('<span class="rico">' + Z.R.ico + '</span> 海域 ' + Z.n + (Z.boss ? ' <b class="boss">👑 守將</b>' : '') + '<small>' + I.esc(Z.R.name) + ' —— ' + I.esc(Z.R.say) + '</small>' + (Z.mod && Z.mod.id !== 'calm' ? '<small class="bmod">海況 ' + Z.mod.ico + ' ' + I.esc(Z.mod.name) + '：' + I.esc(Z.mod.desc) + '</small>' : ''), 'zone'); });
    I.on('questDone', function (q, g, bf) {
      var d = I.questDef(q.id), T = I.QUEST_TIER[q.tier];
      I.toast('📜 賞金任務完成：<b>' + d.ico + ' ' + I.esc(d.name) + ' ' + q.need + ' ' + d.unit + '</b> —— <span class="g">+' + I.fmt(g) + '</span>' + (bf ? ' ＋ ' + bf.ico + ' ' + I.esc(bf.name) + ' ' + T.buff + ' 場' : ''), 'quest', 6000);
      I.sfx('perk'); I.dirty();
    });
    I.on('quest', function () { if (tab === 'quest') I.dirty(); });
    I.on('result', function (k, Z, g) {
      banner(k === 'win' ? '勝利！<small>海域 ' + Z.n + ' · 這一場 +' + I.fmt(g) + ' 格</small>' : (k === 'timeout' ? '僵持不下，撤退' : '艦隊撤退……') + '<small>' + (I.S.farm ? '先退一個海域練練，再回來挑戰' : '升級一下再來') + '</small>', k);
      zoneCard();
    });
    I.on('gain', function (a) { rateLog.push([I.now(), a]); });
    I.on('abil', function (a) { I.toast(a.ico + ' <b>' + a.name + '</b>！', 'abil', 2500); });
    I.on('perk', function () { clearTimeout(pkT); pkT = setTimeout(perkShow, 1100); });   // 先讓「勝利！」的橫幅亮一下
    I.on('perkTake', function (c, i, auto) {
      perkHide(); var t = perkTxt(c);
      I.toast('🎴 強化：<b>' + t.ico + ' ' + I.esc(t.name) + '</b>' + (auto ? ' <span class="dim">（自動選的）</span>' : ''), 'perk', 4500);
      if (!auto) I.sfx('perk');
      I.dirty();
    });
  };

  // ── 強化三選一（打下新的海域；20_econ.js perkRoll）──
  var pkShown = null, pkT = 0;
  function perkTxt(c) {
    if (c.t === 'upg') { var u = I.upgDef(c.id); return { ico: I.img('upg/' + u.id, u.ico), name: u.name + ' +' + c.n + ' 級', desc: '免費升級（Lv ' + I.lv(c.id) + ' → ' + (I.lv(c.id) + c.n) + '）<br>' + I.esc(u.desc) }; }
    if (c.t === 'buff') { var b = I.buffDef(c.id); return { ico: b.ico, name: b.name, desc: I.esc(b.desc) + '<br>接下來 ' + c.n + ' 場' }; }
    if (c.t === 'loot') return { ico: '💰', name: '沉船寶藏', desc: '立刻 <b class="g">+' + I.fmt(c.amt) + '</b> 格' };
    if (c.t === 'cd') return { ico: '⚡', name: '鯊魚直覺', desc: '所有技能的冷卻立刻歸零' };
    var d = I.BLESS.filter(function (x) { return x.id === c.id; })[0];
    return { ico: d.ico, name: d.name, desc: I.esc(d.desc) + '<br>到轉生為止、可以疊（現在 ' + I.mulTxt(I.blessMul(c.id)) + '）' };
  }
  function perkShow() {
    var P = I.S.perk; if (!P) { perkHide(); return; }
    if (pkShown === P) return;
    pkShown = P;
    var best = I.perkBest(P), box = $('bsi-pk-cards');
    $('bsi-pk-h').innerHTML = (I.zone(P.zone).boss ? '👑 守將倒下了！' : '⚓ 海域 ' + P.zone + ' 拿下了！') + '<small>挑一個強化帶走</small>';
    box.innerHTML = '';
    P.cards.forEach(function (c, i) {
      var t = perkTxt(c), R = I.RARITY[c.r], b = h('button', 'pk-card ' + R.id + (i === best ? ' best' : ''),
        '<span class="rar">' + R.name + '</span><span class="ico">' + t.ico + '</span><b>' + I.esc(t.name) + '</b><small>' + t.desc + '</small><span class="key">' + (i + 1) + '</span>');
      b.style.animationDelay = (i * 0.09).toFixed(2) + 's';
      b.onclick = function () { I.perkTake(i); };
      box.appendChild(b);
    });
    $('bsi-perk').className = 'bsi-perk on';
  }
  function perkHide() { pkShown = null; $('bsi-perk').className = 'bsi-perk'; }
  I.perkOpen = function () { return !!pkShown; };
  I.perkShow = perkShow;

  // ── 上方 ──
  function topBtns() {
    txt('bsi-spd', '⏩ ×' + I.S.speed);
    txt('bsi-cam', { foe: '🎯 鎖定', auto: '🎥 自動', flag: '🎥 旗艦', free: '🎥 自由' }[I.S.cam] || '🎥');
    txt('bsi-mute', I.S.mute ? '🔇' : '🔊');
  }
  I.topBtns = topBtns;
  /** 上方的「+N/秒」：最近 RATE_SEC 秒實際入帳的格 ÷ RATE_SEC（Tim 2026-10-30：15 秒 ⇒「改成5秒試看看」：反應更快、跳得更兇）。 */
  var RATE_SEC = 5;
  function rate() {
    var now = I.now(), s = 0; while (rateLog.length && now - rateLog[0][0] > RATE_SEC * 1000) rateLog.shift();
    rateLog.forEach(function (r) { s += r[1]; });
    return s / RATE_SEC;
  }

  // ── 海域卡 ──
  function zoneCard() {
    var S = I.S, Z = I.BT.Z && I.BT.Z.n === S.zone ? I.BT.Z : I.zone(S.zone), k = (Z.n - 1) % 10, d = '';
    txt('bsi-rico', Z.R.ico); txt('bsi-rname', Z.R.name + (Z.wx === 'storm' ? ' ⛈' : Z.wx === 'maelstrom' ? ' 🌀' : ''));
    html('bsi-zn', '海域 <b>' + Z.n + '</b>' + (Z.boss ? ' <span class="boss">👑 守將</span>' : '') + '<span class="best">最遠 ' + (S.maxZone) + '</span>');
    for (var i = 0; i < 10; i++) { var n = Z.n - k + i; d += '<i class="' + (n < S.maxZone ? 'done' : '') + (n === Z.n ? ' cur' : '') + (i === 9 ? ' boss' : '') + '"></i>'; }
    html('bsi-dots', d);
    txt('bsi-farm', S.farm ? '打輸了，先退一步練練：再贏 ' + Math.max(0, I.BAL.retryAfter + 1 - S.farm) + ' 場回去挑戰' : '');
    var md = Z.mod;                                                   // 海況（10_data.js SEAMOD）
    html('bsi-zmod', md ? md.ico + ' <b>' + I.esc(md.name) + '</b><span>' + I.esc(md.desc) + '</span>' : Z.boss ? '👑 <b>守將海域</b><span>強度 ×' + I.BAL.bossLv + '、身價 ×' + I.BAL.bossK + '</span>' : '');
  }
  I.zoneCard = zoneCard;
  function zoneLive() {
    var BT = I.BT, Z = BT.Z; if (!Z) return;
    var st = C.state(), ships = C.ships(), up = ships.filter(function (s) { return s.team === 'red' && !C.isOut(s); }).length;
    var s = BT.phase === 'loading' ? '⏳ 船隊集結中…' : BT.phase === 'fight' ? '敵艦 ' + up + ' 艘' + (BT.wave.length ? '（候補 ' + BT.wave.length + ' 艘）' : '') + ' · ' + clock(st.t) + ' / ' + clock(Z.timeout) : BT.phase === 'hold' ? (BT.result === 'win' ? '✔ 拿下了' : '✘ 撤退') : '';
    txt('bsi-zstat', s);
    var a = BT.phase === 'loading' ? I.atk() / Z.lv : BT.atkR, d2 = BT.phase === 'loading' ? I.def() / Z.lv : BT.defR;
    html('bsi-ratio', '<span class="' + rc(a) + '" title="我方火力 ÷ 這個海域的強度：越高敵艦越脆、我方砲彈越兇">🎯 火力比 ' + a.toFixed(2) + '</span><span class="' + rc(d2) + '" title="我方船堅 ÷ 這個海域的強度：越高越打不穿">🛡️ 船堅比 ' + d2.toFixed(2) + '</span>');
  }
  /** 海域卡底下：現在有效的增益（場數／秒數）、這一輪的祝福。 */
  function buffChips() {
    var now = I.now(), L = I.buffsNow().map(function (b) {
      var d = I.buffDef(b.id);
      return '<span class="bf' + (b.until ? ' t' : '') + '" title="' + I.esc(d.name + '：' + d.desc) + '">' + d.ico + '<i>' + (b.until ? Math.ceil((b.until - now) / 1000) + 's' : b.left + ' 場') + '</i></span>';
    });
    I.BLESS.forEach(function (d) { var n = I.S.bless[d.id]; if (n) L.push('<span class="bf bl" title="' + I.esc(d.name + '：' + d.desc + '（到轉生為止）') + '">' + d.ico + '<i>×' + n + '</i></span>'); });
    html('bsi-buffs', L.join(''));
  }
  function rc(x) { return x >= 1.2 ? 'good' : x >= 0.8 ? 'ok' : 'bad'; }
  function clock(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }

  // ── 結果橫幅 ──
  var banT = 0;
  function banner(s, cls) {
    var b = $('bsi-banner'); b.innerHTML = s; b.className = 'bsi-banner on ' + (cls || '');
    clearTimeout(banT); banT = setTimeout(function () { b.className = 'bsi-banner'; }, 3200);
  }
  I.banner = banner;

  // ── 結算商店：每一場打完，勝負橫幅亮 BAL.shopDelay 秒、強化三選一選完 ⇒ 跳出來；按出航（或 BAL.shopAuto 秒沒碰）⇒ 下一場（30_battle.js 等 BT.shop === 'done'）──
  var shopUntil = 0;                                                   // 自動出航的時刻（0 ＝ 不自動：設定關了、或碰過商店）
  function shopOpen() {
    var BT = I.BT; BT.shop = 'open';
    shopUntil = I.S.shopAuto ? I.now() + I.BAL.shopAuto * 1000 : 0;
    shopHead(); shopFoot(); dirty.panel = true;
    $('bsi-shop').className = 'bsi-shop on';
  }
  function shopSail() {
    if (I.BT.shop !== 'open') return;
    I.BT.shop = 'done'; shopUntil = 0; $('bsi-shop').className = 'bsi-shop';
  }
  I.shopOpen = function () { return I.BT.shop === 'open'; };
  I.shopSail = shopSail;
  function shopHead() {
    var BT = I.BT, Z = BT.Z, k = { sink: 0, cap: 0 }, win = BT.result === 'win';
    BT.kills.forEach(function (x) { k[x.how]++; });
    html('bsi-sh-head', '<b class="' + (win ? 'win' : 'lose') + '">' + (win ? (Z.boss ? '👑 守將倒下了！' : '⚓ 海域 ' + Z.n + ' 拿下了！') : BT.result === 'timeout' ? '⌛ 僵持不下，撤退' : '🏳️ 艦隊撤退……') + '</b>' +
      '<span>這一場 <b class="g">+' + I.fmt(BT.income) + '</b> 格' + (k.sink ? ' · 擊沉 ' + k.sink : '') + (k.cap ? ' · 俘獲 ' + k.cap : '') + '</span>');
  }
  /** 底下那一列：下一場的海域與強度比（買了升級就跟著變）、自動推進、出航。 */
  function shopFoot() {
    var S = I.S, Z = I.zone(S.zone), a = I.atk() / Z.lv, d = I.def() / Z.lv;
    html('bsi-sh-next', '下一場 <b>海域 ' + Z.n + '</b>' + (Z.boss ? ' 👑' : '') + '<small><span class="' + rc(a) + '">🎯 火力比 ' + a.toFixed(2) + '</span><span class="' + rc(d) + '">🛡️ 船堅比 ' + d.toFixed(2) + '</span></small>');
    txt('bsi-zauto', S.auto ? '⏵ 自動推進' : '⏸ 原地練功'); $('bsi-zauto').classList.toggle('on', S.auto);
    $('bsi-zprev').disabled = S.zone <= 1; $('bsi-znext').disabled = S.zone >= S.maxZone;
    txt('bsi-sail', '⚓ 出航' + (I.BT.Z && S.zone === I.BT.Z.n ? '（同一個海域再打一次）' : ''));
  }
  function shopLive() {
    shopFoot();
    var left = shopUntil ? Math.max(0, shopUntil - I.now()) / 1000 : 0;
    if (shopUntil && left <= 0) { shopSail(); return; }
    $('bsi-sh-bar').style.width = (shopUntil ? left / I.BAL.shopAuto * 100 : 0).toFixed(1) + '%';
    txt('bsi-sh-left', shopUntil ? Math.ceil(left) + ' 秒後自動出航（碰一下就停）' : '看好了就按出航');
  }

  // ── 商店的分頁 ──
  var TABS = [{ id: 'upg', ico: '🎯', name: '升級' }, { id: 'fleet', ico: '⚓', name: '艦隊' }, { id: 'quest', ico: '📜', name: '任務' }, { id: 'deep', ico: '🔱', name: '深海' }, { id: 'ach', ico: '🏆', name: '成就' }, { id: 'stat', ico: '📊', name: '紀錄' }];
  function tabsBuild() {
    var T = $('bsi-tabs');
    TABS.forEach(function (t) {
      var b = h('button', '', '<span>' + t.ico + '</span>' + t.name); b.dataset.t = t.id;
      b.onclick = function () { tab = t.id; I.dirty(); };
      T.appendChild(b);
    });
  }
  function panel() {
    [].forEach.call($('bsi-tabs').children, function (b) { b.classList.toggle('on', b.dataset.t === tab); });
    var B = $('bsi-body'), top = B.scrollTop;
    B.innerHTML = '';
    ({ fleet: pFleet, upg: pUpg, quest: pQuest, deep: pDeep, ach: pAch, stat: pStat })[tab](B);
    B.scrollTop = top;
  }
  function sec(B, title, sub) { var e = h('div', 'sec', '<h3>' + title + (sub ? '<small>' + sub + '</small>' : '') + '</h3>'); B.appendChild(e); return e; }
  function costBtn(cost, ok, label, fn, cls) {
    var b = h('button', 'cost ' + (cls || ''), (label ? '<span class="l">' + label + '</span>' : '') + '🧱 ' + I.fmt(cost));
    b.dataset.cost = cost; b.disabled = !ok; b.onclick = function (e) { e.stopPropagation(); fn(); };
    return b;
  }
  function shipLine(id) {
    var c = I.cardOf(id) || {};
    return '<b>' + I.esc(I.nameOf(id)) + '</b><span class="by">' + I.esc(I.AUTHORS[id] || '') + '</span><span class="spec">' + I.fmt(c.tons || 0) + ' 噸 · ' + (c.guns || 0) + ' 門砲 · ' + (c.crew || 0) + ' 人</span>';
  }
  function pFleet(B) {
    var S = I.S, s1 = sec(B, '我的艦隊', S.fleet.length + ' / ' + S.slots + ' 個位置 · 一次上場一艘，出局了換下一艘');
    S.fleet.forEach(function (id, i) {
      var r = h('div', 'row slot' + (i === 0 ? ' flag' : ''), '<span class="ico">' + (i === 0 ? '🚩' : '⛵') + '</span><div class="mid">' + shipLine(id) + '</div>');
      var sel = h('select'); Object.keys(S.own).sort(function (a, b) { return I.tons(a) - I.tons(b); }).forEach(function (o) { var op = h('option', '', I.esc(I.nameOf(o))); op.value = o; op.selected = o === id; sel.appendChild(op); });
      sel.onchange = function () { I.setSlot(i, sel.value); };
      r.appendChild(sel); s1.appendChild(r);
    });
    var sp = I.slotPrice();
    if (isFinite(sp)) { var r2 = h('div', 'row add', '<span class="ico">➕</span><div class="mid"><b>再一個位置</b><span class="spec">艦隊多一艘候補（放手上最大的那一型）</span></div>'); r2.appendChild(costBtn(sp, S.blocks >= sp, '', function () { I.buySlot(); })); s1.appendChild(r2); }
    var s2 = sec(B, '艦隊方針', '我方砲長照這個挑瞄哪裡'), ch = h('div', 'chips');
    I.DOCTRINE.forEach(function (d) {
      var lock = S.bestZone < d.zone, b = h('button', 'chip' + (S.doctrine === d.id ? ' on' : '') + (lock ? ' lock' : ''), d.ico + ' ' + d.name);
      b.title = lock ? '第 ' + d.zone + ' 海域解鎖' : d.tip; b.disabled = lock;
      b.onclick = function () { S.doctrine = d.id; I.BT.phase === 'fight' && C.ships().forEach(function (sh) { if (sh.team === 'blue') sh.cap = d.id; }); I.dirty(); };
      ch.appendChild(b);
    });
    s2.appendChild(ch);
    var cur = I.DOCTRINE.filter(function (d) { return d.id === S.doctrine; })[0]; s2.appendChild(h('div', 'note', cur ? cur.tip : ''));
    var s3 = sec(B, '船塢', '擊敗過的那一型就拿得到藍圖');
    // 還沒到手的排上面（Tim 2026-10-30：「艦隊編成頁面 可以把未解鎖的排序在最上面」）：有藍圖能造的 → 還沒拿到藍圖的（照第幾海域遇到）→ 已經會造的；其他照造價（shipList 本來的順序；sort 是穩定的）
    var rank = function (id) { return S.own[id] ? 2 : S.bp[id] ? 0 : 1; };
    I.shipList().sort(function (a, b) { return rank(a) - rank(b) || (rank(a) === 1 ? I.firstZone(a) - I.firstZone(b) : 0); }).forEach(function (id) {
      var own = S.own[id], bp = S.bp[id], fz = I.firstZone(id), p = I.shipPrice(id);
      var r = h('div', 'row ship' + (own ? ' own' : bp ? '' : ' lock'), '<span class="ico">' + (own ? '✅' : bp ? '📜' : '🔒') + '</span><div class="mid">' + (bp || own ? shipLine(id) : '<b>？？？</b><span class="spec">第 ' + fz + ' 海域' + (I.GIFTS[id] ? '的禮物' : '會遇到') + ' · 擊敗它拿藍圖</span>') + '</div>');
      if (bp && !own) r.appendChild(costBtn(p, S.blocks >= p, '造船', function () { I.buyShip(id); }));
      if (own) r.appendChild(h('span', 'tag', S.fleet.indexOf(id) >= 0 ? '出航中' : '在港'));
      s3.appendChild(r);
    });
  }
  var UPG_TXT = {
    gun: function () { return '火力 ' + I.mulTxt(Math.pow(I.upgDef('gun').eff, I.lv('gun'))); },
    reload: function () { return '裝填 ' + I.reloadT().toFixed(2) + ' 秒'; },
    powder: function () { return '火藥桶 ' + I.pct(I.powderK()) + '、殉爆賞金 ' + I.mulTxt(I.boomMul()); },
    hull: function () { return '船堅 ' + I.mulTxt(Math.pow(I.upgDef('hull').eff, I.lv('hull'))); },
    pump: function () { return '抽水 ' + I.mulTxt(I.pumpK()) + '、進水 ' + I.mulTxt(I.floodK()); },
    sail: function () { return '航速 ' + I.mulTxt(I.sailK()); },
    value: function () { return '一格 ' + I.mulTxt(I.valueMul()); },
    bounty: function () { return '賞金 ' + I.mulTxt(I.bountyMul()); },
    fear: function () { return '死傷 ' + I.pct(I.strikeAt()) + ' 就降旗'; },
    teeth: function () { return '咬 ' + I.biteR() + ' 格寬、' + I.mulTxt(I.biteMul()) + '、蓄滿 ' + I.biteChargeT().toFixed(2) + ' 秒'; }
  };
  function pUpg(B) {
    var q = h('div', 'qty');
    [[1, '×1'], [10, '×10'], [Infinity, '最大']].forEach(function (x) { var b = h('button', qty === x[0] ? 'on' : '', x[1]); b.onclick = function () { qty = x[0]; I.dirty(); }; q.appendChild(b); });
    B.appendChild(q);
    I.UPG_TABS.forEach(function (t) {
      var s = sec(B, t.name);
      I.UPG.filter(function (u) { return u.tab === t.id; }).forEach(function (u) {
        var L = I.lv(u.id), maxed = I.upgMaxed(u), n = qty === Infinity ? Math.max(1, I.upgAfford(u)) : qty, cost = I.upgCostN(u, n);
        var r = h('div', 'row upg', '<span class="ico">' + I.img('upg/' + u.id, u.ico) + '</span><div class="mid"><b>' + u.name + '</b><span class="lv">Lv ' + L + (u.max ? ' / ' + u.max : '') + '</span><span class="spec">' + u.desc + '</span><span class="now">' + UPG_TXT[u.id]() + '</span></div>');
        if (maxed) r.appendChild(h('span', 'tag', '滿了'));
        else { var b = costBtn(cost, I.S.blocks >= cost, qty === 1 ? '' : '×' + n, function () { I.buyUpg(u.id, n); }); b.dataset.upg = u.id; b.dataset.n = n; r.appendChild(b); }
        s.appendChild(r);
      });
    });
  }
  function pQuest(B) {
    var S = I.S, ref = I.questRef(), s = sec(B, '賞金任務', '同時三張 · 做完自動領 · 已完成 ' + S.st.quests + ' 張');
    S.quests.forEach(function (q) {
      var d = I.questDef(q.id), T = I.QUEST_TIER[q.tier], got = Math.min(q.got, q.need);
      s.appendChild(h('div', 'row quest t' + q.tier, '<span class="ico">' + d.ico + '</span><div class="mid"><b>' + I.esc(d.name) + ' ' + q.need + ' ' + d.unit + '</b><span class="lv">' + T.name + '</span>' +
        '<div class="qbar"><i style="width:' + (got / q.need * 100).toFixed(1) + '%"></i></div>' +
        '<span class="spec">' + (d.max ? '最高 ' : '') + got + ' / ' + q.need + '　獎勵 🧱 ' + I.fmt(ref * T.k) + (T.buff ? ' ＋ 隨機增益 ' + T.buff + ' 場' : '') + '</span></div>'));
    });
    sec(B, '怎麼算').appendChild(h('div', 'note', '獎勵照「一場大約賺多少」乘：小 ×2、中 ×4（再給隨機增益 3 場）、大 ×8（增益 5 場）。做完馬上換一張新的。'));
  }
  function pDeep(B) {
    var S = I.S, g = I.shardsFor(S.maxZone), s = sec(B, '潛回亞特蘭提斯', '轉生');
    var p = h('div', 'pres');
    p.innerHTML = '<p>這一輪最遠到過 <b>海域 ' + S.maxZone + '</b>。現在潛回去可以帶走 <b class="shd">🔱 ' + g + '</b> 顆三叉戟碎片。</p>' +
      '<p class="dim">累計的每一顆碎片讓收入 +10%：現在 ' + I.mulTxt(I.shardMul()) + (g ? ' → 轉生後 ' + I.mulTxt(1 + 0.1 * (S.shardsAll + g)) : '') + '。<br>會重來：格、升級、海域、造好的船與艦隊位置（藍圖留著）。從海域 ' + I.startZone() + ' 出發。</p>';
    var b = h('button', 'big', g ? '🐚 潛回亞特蘭提斯（+🔱 ' + g + '）' : '🔒 到達第 ' + I.BAL.shardZone + ' 海域才能潛回去');
    b.disabled = !g; b.onclick = prestigeAsk; p.appendChild(b); s.appendChild(p);
    var s2 = sec(B, '深海科技', '🔱 ' + S.shards + ' 顆可以用 · 轉生也留著');
    I.TECH.forEach(function (t) {
      var L = I.tlv(t.id), maxed = t.max > 0 && L >= t.max, c = I.techCost(t);
      var r = h('div', 'row tech', '<span class="ico">' + t.ico + '</span><div class="mid"><b>' + t.name + '</b><span class="lv">Lv ' + L + (t.max ? ' / ' + t.max : '') + '</span><span class="spec">' + t.desc + '</span></div>');
      if (maxed) r.appendChild(h('span', 'tag', '滿了'));
      else { var b2 = h('button', 'cost shd', '🔱 ' + c); b2.disabled = S.shards < c; b2.onclick = function () { I.buyTech(t.id); if (t.id === 'tide') topBtns(); }; r.appendChild(b2); }
      s2.appendChild(r);
    });
  }
  function pAch(B) {
    var n = Object.keys(I.S.ach).length, s = sec(B, '成就', n + ' / ' + I.ACH.length + ' · 收入 ' + I.mulTxt(I.achMul())), g = h('div', 'achs');
    I.ACH.forEach(function (a) { var on = !!I.S.ach[a.id]; g.appendChild(h('div', 'ach' + (on ? ' on' : ''), '<span class="ico">' + (on ? a.ico : '❔') + '</span><b>' + I.esc(a.name) + '</b><small>' + I.esc(a.desc) + '</small>')); });
    s.appendChild(g);
  }
  function pStat(B) {
    var S = I.S, st = S.st, s = sec(B, '航海日誌');
    [['🧱 這一輪打下來', I.fmt(S.blocksRun) + ' 格'], ['🧱 全部打下來', I.fmt(S.blocksAll) + ' 格'], ['🗺️ 有史以來最遠', '海域 ' + S.bestZone], ['⚔️ 開戰', st.battles + ' 場（贏 ' + st.wins + '、撤退 ' + st.losses + '）'],
      ['⚓ 擊沉', st.sunk + ' 艘'], ['🏳️ 俘獲', st.cap + ' 艘'], ['💥 殉爆', st.boom + ' 次'], ['🦷 咬', st.bites + ' 口'], ['🛢️ 漂流寶物', st.loot + ' 件（寶箱 ' + st.chest + '）'], ['🎴 強化', st.perks + ' 次'], ['💰 黃金寶船', st.gold + ' 艘'], ['🔥 最長連咬', st.comboMax + ' 口'], ['📜 賞金任務', st.quests + ' 張'], ['🐚 潛回亞特蘭提斯', st.pres + ' 次'],
      ['⏱️ 航行時間', I.fmtTime(st.playSec)], ['💤 離線效率', I.pct(I.offlineEff())], ['📈 平均收入', I.fmt(S.rate) + ' 格/秒']].forEach(function (x) {
      s.appendChild(h('div', 'kv', '<span>' + x[0] + '</span><b>' + x[1] + '</b>'));
    });
  }
  // 只更新按鈕買不買得起（每 0.2 秒；整個面板只有事件來了才重畫）
  function panelLive() {
    [].forEach.call(ROOT.querySelectorAll('.bsi-shop button.cost'), function (b) {
      if (b.dataset.upg && qty === Infinity) return;               // 「最大」的量會變 ⇒ 交給重畫
      if (b.classList.contains('shd')) return;
      b.disabled = I.S.blocks < +b.dataset.cost;
    });
  }

  // ── 技能列 ──
  function abilBuild() {
    var A = $('bsi-abil');
    A.innerHTML = '<div class="chg" id="bsi-chg" title="蓄力：上一口之後自己蓄，滿了才是全力（狂點只有兩成）"><b>🦷</b><div class="bar"><i id="bsi-chg-bar"></i></div><span id="bsi-chg-t"></span></div>' +
      '<div class="hint" id="bsi-hint">🦈 點敵艦哪裡就咬哪裡 · 漂流寶物點一下撿</div>';
    I.ABIL.forEach(function (a) {
      var b = h('button', 'ab', '<span class="ico">' + a.ico + '</span><span class="nm">' + a.name + '</span><span class="key">' + a.key + '</span><i class="cd"></i>');
      b.id = 'bsi-ab-' + a.id; b.title = a.desc + '（冷卻 ' + a.cd + ' 秒）';
      b.onclick = function () { I.useAbil(a.id); };
      A.appendChild(b);
    });
  }
  function abilLive() {
    var now = I.now();
    I.ABIL.forEach(function (a) {
      var b = $('bsi-ab-' + a.id); if (!b) return;
      var lock = I.S.bestZone < a.zone, left = I.abilLeft(a), cd = a.cd * I.cdMul();
      b.style.display = lock ? 'none' : '';
      b.classList.toggle('wait', left > 0);
      b.classList.toggle('act', a.id === 'frenzy' && now < I.BT.frenzyUntil || a.id === 'repair' && now < I.BT.repairUntil);
      b.style.setProperty('--cd', left > 0 ? (left / cd).toFixed(3) : 0);
    });
  }

  // ── 彈窗 ──
  function modal(inner, lock) {
    var M = $('bsi-modal'), bg = $('bsi-mbg'); M.className = 'bsi-modal'; delete M.dataset.view; M.innerHTML = ''; if (typeof inner === 'string') M.innerHTML = inner; else M.appendChild(inner);
    bg.className = 'bsi-modal-bg on'; if (lock) bg.dataset.lock = '1'; else delete bg.dataset.lock;
    return M;
  }
  function modalClose() { $('bsi-mbg').className = 'bsi-modal-bg'; }
  I.modal = modal; I.modalClose = modalClose;
  function prestigeAsk() {
    var g = I.shardsFor(I.S.maxZone), M = modal('<h2>🐚 潛回亞特蘭提斯</h2><p>艦隊要回家了。帶走 <b class="shd">🔱 ' + g + '</b> 顆三叉戟碎片，收入永遠 ' + I.mulTxt(1 + 0.1 * (I.S.shardsAll + g)) + '。</p><p class="dim">格、升級、海域、造好的船會重來；藍圖、成就、深海科技、碎片留著。</p>');
    var r = h('div', 'mbtns'), no = h('button', '', '再打一下'), yes = h('button', 'big', '潛回去');
    no.onclick = modalClose; yes.onclick = function () { modalClose(); shopSail(); I.prestige(); I.save(); I.toast('🐚 回到亞特蘭提斯了。碎片 +' + g + '，重新出航！', 'ach', 6000); I.goZone(I.S.zone); };
    r.appendChild(no); r.appendChild(yes); M.appendChild(r);
  }
  /** 設定的一排：label ＋ 一排選項（[值, 字, 滑過去的說明]）；點了 ⇒ fn(值)、again() 重畫那一頁。回那一排的選項框（要多塞按鈕的用）。 */
  function chipRow(g, label, opts, cur, fn, again) {
    var r = h('div', 'srow', '<span>' + label + '</span>'), c = h('div', 'chips');
    opts.forEach(function (o) { var b = h('button', 'chip' + (o[0] === cur ? ' on' : ''), o[1]); if (o[2]) b.title = o[2]; b.onclick = function () { fn(o[0]); again(); }; c.appendChild(b); });
    r.appendChild(c); g.appendChild(r);
    return c;
  }
  function textRow(g, label, s) { g.appendChild(h('div', 'srow', '<span>' + label + '</span><div class="dim small">' + s + '</div>')); }

  // ── 物理模擬（核心 09_phx.js；四檔在 10_data.js PHX_LV）──
  /** 照存檔套到核心：四檔之一 ⇒ 那一組；自訂 ⇒ 細節面板調出來的那一組。 */
  I.phxApply = function () { var S = I.S; return C.phx(S.phx === 'custom' && S.phxC ? S.phxC : I.PHX_LV[S.phx] || I.PHX_LV.mid); };
  /** 核心現在的值（只留 PHX_ITEMS 那幾項）。 */
  function phxNow() { var f = C.phxInfo(), o = {}; f.items.forEach(function (it) { o[it.k] = f.v[it.k]; }); return o; }
  /** 一整組跟哪一檔一樣（都不一樣 ⇒ custom）。 */
  function phxMatch(v) {
    for (var l in I.PHX_LV) { var p = I.PHX_LV[l], ok = true; for (var k in p) if (v[k] !== p[k]) ok = false; if (ok) return l; }
    return 'custom';
  }
  function phxPick(v) { var S = I.S; S.phx = v; S.phxC = null; I.phxApply(); I.save(); }
  var PHX_ROW = [['low', '低'], ['mid', '中'], ['high', '高'], ['full', '全開']];
  function phxRow(g, again) {
    var S = I.S, c = chipRow(g, '物理模擬', PHX_ROW.concat(S.phx === 'custom' ? [['custom', '自訂', '細節面板調出來的那一組']] : []), S.phx, function (v) { if (v !== 'custom') phxPick(v); }, again);
    var b = h('button', 'chip', '細節…'); b.title = '一項一項調（帆與繩、碎木、進水、模擬步長…）'; b.onclick = phxPanel; c.appendChild(b);
  }
  /** 物理細節（照 Blockside 主選單的「物理設定…」）：一項一項調、馬上套用；下面印出整組，Tim 調好了複製貼回來 ⇒ 改成那一檔的預設（10_data.js PHX_LV）。 */
  function phxPanel() {
    var S = I.S, f = C.phxInfo(), M = modal('<h2>⚙️ 物理細節</h2><p class="dim small">點了馬上套用；<b>模擬步長、進水</b>開戰時才定 ⇒ 下一場生效（這一場 ' + f.hz + ' Hz）。滑過選項看完整說明。</p>'), g = h('div', 'set');
    M.dataset.view = 'phx';
    phxRow(g, phxPanel);
    f.items.forEach(function (it) {
      chipRow(g, it.name + (it.k === 'step' || it.k === 'flood' ? ' <small class="dim">下一場</small>' : ''), it.opt.map(function (o, i) { return [i, o.replace(/（.*$/, ''), o]; }), f.v[it.k], function (v) {
        var o = phxNow(); o[it.k] = v; C.phx(o);
        S.phx = phxMatch(o); S.phxC = S.phx === 'custom' ? o : null; I.save();
      }, phxPanel);
    });
    M.appendChild(g);
    var cur = phxNow(), line = (S.phx === 'custom' ? '自訂' : I.PHX_NAME[S.phx] + '（' + S.phx + '）') + '：' + JSON.stringify(cur).replace(/"/g, '').replace(/,/g, ', ').replace(/:/g, ': ');
    var out = h('div', 'srow col', '<span>這一組</span><textarea id="bsi-phxio" readonly spellcheck="false"></textarea>'), r2 = h('div', 'mbtns');
    var cp = h('button', '', '複製'), back = h('button', '', '← 設定'), ok = h('button', 'big', '好');
    cp.onclick = function () {
      var t = $('bsi-phxio'); t.select();
      var done = function () { cp.textContent = '複製好了'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) { /* 選起來了，自己按複製 */ } });
      else { try { document.execCommand('copy'); done(); } catch (e) { /* 選起來了，自己按複製 */ } }
    };
    back.onclick = settings; ok.onclick = modalClose;
    [cp, back, ok].forEach(function (b) { r2.appendChild(b); });
    M.appendChild(out); M.appendChild(r2);
    $('bsi-phxio').value = line;
  }
  I.phxPanel = phxPanel;

  // ── 全螢幕（照 Blockside 71_input.js：iPhone 的 Safari 不給網頁全螢幕 ⇒ 從主畫面的圖示開；Tim 2026-10-30「可以參考Blockside 支援iphone的全螢幕」）──
  var FS_APP = navigator.standalone === true || !!(window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
  function fsOn() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function fsCan() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
  function fsSet(on) {
    var d = document, e = d.documentElement;
    if (!fsCan() || on === fsOn()) return;
    try { var r = on ? (e.requestFullscreen || e.webkitRequestFullscreen).call(e, { navigationUI: 'hide' }) : (d.exitFullscreen || d.webkitExitFullscreen).call(d); if (r && r.catch) r.catch(function () { /* 被拒 ⇒ 照實際狀態 */ }); } catch (err) { /* 同上 */ }
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { var M = $('bsi-modal'); if (M && M.dataset.view === 'set' && $('bsi-mbg').classList.contains('on')) settings(); }); });   // 進出（含 Esc）⇒ 設定那一排跟著亮
  function fsRow(g) {
    if (FS_APP) textRow(g, '全螢幕', '從主畫面的圖示開的：本來就是全螢幕');
    else if (fsCan()) chipRow(g, '全螢幕', [[true, '開'], [false, '關']], fsOn(), fsSet, function () { /* 換好了 fullscreenchange 會重畫 */ });
    else textRow(g, '全螢幕', /iPhone|iPod/.test(navigator.userAgent) ? 'iPhone 的 Safari 不給網頁全螢幕 ⇒ 點「分享」→「加入主畫面」，從主畫面的圖示開就沒有網址列' : '這裡不給全螢幕');
  }

  function settings() {
    var S = I.S, M = modal('<h2>⚙️ 設定</h2>'), g = h('div', 'set');
    M.dataset.view = 'set';
    function row(label, opts, cur, fn) { chipRow(g, label, opts, cur, fn, settings); }
    row('畫質', [['low', '低'], ['mid', '中'], ['high', '高'], ['ultra', '全開']], S.gfx, function (v) { S.gfx = v; C.gfx(v); });
    phxRow(g, settings);
    fsRow(g);
    row('聲音', [[false, '開'], [true, '靜音']], S.mute, function (v) { S.mute = v; C.sound({ mute: v }); topBtns(); });
    row('背景音樂', [[0, '關'], [0.2, '小'], [0.35, '中'], [0.6, '大']], S.bgm, function (v) { S.bgm = v; C.sound({ bgm: v }); });
    row('鏡頭', [['foe', '鎖定敵艦'], ['auto', '自動運鏡'], ['flag', '看旗艦'], ['free', '自己轉']], S.cam, function (v) { S.cam = v; I.camStart(); topBtns(); });
    row('強化三選一', [[false, '我來選（' + I.BAL.perkAuto + ' 秒後自動）'], [true, '跳出來就自動選']], S.perkAuto, function (v) { S.perkAuto = v; });
    row('結算商店', [[true, I.BAL.shopAuto + ' 秒後自動出航'], [false, '等我按出航']], S.shopAuto, function (v) { S.shopAuto = v; });
    if (I.tlv('mate')) row('自動航海士', [[true, '開'], [false, '關']], S.mate, function (v) { S.mate = v; });
    M.appendChild(g);
    var io = h('div', 'srow col', '<span>存檔</span><textarea id="bsi-io" spellcheck="false" placeholder="匯出的存檔會出現在這裡；貼上別人的存檔再按「匯入」"></textarea>'), r2 = h('div', 'mbtns');
    var ex = h('button', '', '匯出'), im = h('button', '', '匯入'), wipe = h('button', 'danger', '全部重來'), ok = h('button', 'big', '好');
    ex.onclick = function () { I.save(); $('bsi-io').value = btoa(unescape(encodeURIComponent(JSON.stringify(I.S)))); $('bsi-io').select(); };
    im.onclick = function () { try { var o = JSON.parse(decodeURIComponent(escape(atob($('bsi-io').value.trim())))); if (!o || o.v !== 1) throw 0; I.store.set(I.SAVE_KEY, o); location.reload(); } catch (e) { $('bsi-io').value = '看不懂這份存檔 QQ'; } };
    wipe.onclick = function () { if (wipe.dataset.sure) { I.wipe(); location.reload(); } else { wipe.dataset.sure = 1; wipe.textContent = '真的？再按一次'; } };
    ok.onclick = modalClose;
    [ex, im, wipe, ok].forEach(function (b) { r2.appendChild(b); });
    M.appendChild(io); M.appendChild(r2);
    M.appendChild(h('p', 'dim small', 'Blockside 的海戰核心（ame、basecamp、summit… 與每一艘船的作者）× 本鯊魚的放置外殼。存在這個瀏覽器裡。'));
  }
  I.settings = settings;

  // ── 每一格 ──
  var t5 = 0, t1 = 0;
  I.uiFrame = function (dt) {
    if (tab === 'upg' && qty === Infinity && (t1 += dt) > 1) { t1 = 0; dirty.panel = true; }   // 「最大」買得起幾級一直在變
    var S = I.S;
    txt('bsi-blk', I.fmt(S.blocks));
    var r = rate(); txt('bsi-rate', r > 0 ? '+' + I.fmt(r) + '/秒' : '');
    $('bsi-shdBox').style.display = S.shardsAll > 0 ? '' : 'none'; txt('bsi-shd', I.fmt(S.shards));
    var m = I.incomeMul(); txt('bsi-mul', m > 1.001 ? I.mulTxt(m) : ''); $('bsi-mul').classList.toggle('hot', I.bmul('income') > 1);
    if (pkShown) {                                                    // 強化三選一的倒數
      var left = Math.max(0, pkShown.at + I.BAL.perkAuto * 1000 - I.now()) / 1000;
      $('bsi-pk-bar').style.width = (left / I.BAL.perkAuto * 100).toFixed(1) + '%'; txt('bsi-pk-left', Math.ceil(left) + ' 秒後自動選 ★ 那張');
    }
    var W = I.weaponOn(), we = $('bsi-wpn');                             // 拿著特殊武器：哪一把、還剩幾秒（每一格畫那一條才順）
    we.classList.toggle('on', !!W);
    if (W) { var wl = I.weaponLeft(); txt('bsi-wpn-ico', W.ico); txt('bsi-wpn-nm', W.name + '：點敵艦'); txt('bsi-wpn-s', wl.toFixed(1) + 's'); $('bsi-wpn-bar').style.width = (wl / W.dur * 100).toFixed(1) + '%'; }
    var BT = I.BT, fz = I.frenzyOn(), fe = $('bsi-frz');                  // 鯊魚狂潮：還剩幾秒、這一波全力咬了幾口；結束那一下喊一聲（40_fx.js frenzyEnd）
    if (fe.classList.contains('on') !== fz) fe.classList.toggle('on', fz);
    if (fz) { var fl = (BT.frenzyUntil - I.now()) / 1000; txt('bsi-frz-nm', '鯊魚狂潮・蓄力全滿　全力咬了 ' + (BT.frenzyBites || 0) + ' 口'); txt('bsi-frz-s', fl.toFixed(1) + 's'); $('bsi-frz-bar').style.width = (fl / FRZ.dur * 100).toFixed(1) + '%'; }
    if (frzWas && !fz) I.emit('frenzyEnd', BT.frenzyBites || 0, BT.frenzyGot || 0);
    frzWas = fz;
    var ce = $('bsi-chg');                                                // 咬的蓄力（30_battle.js bitePow）：打仗、沒拿特殊武器的時候才有
    if (ce) {
      var con = (BT.phase === 'fight' || BT.phase === 'hold') && !W, pw = con ? I.bitePow() : 0, full = pw >= I.BAL.biteFull;
      if (ce.classList.contains('on') !== con) ce.classList.toggle('on', con);
      if (con) { $('bsi-chg-bar').style.width = (pw * 100).toFixed(1) + '%'; txt('bsi-chg-t', fz ? '狂潮全滿' : full ? '全力' : Math.round(pw * 100) + '%'); ce.classList.toggle('full', full); ce.classList.toggle('frz', fz); }
    }
    if (BT.phase === 'hold' && BT.shop === 'none' && !S.perk && !pkShown && I.now() >= BT.resultAt + I.BAL.shopDelay * 1000) shopOpen();
    if ((t5 += dt) > 0.2) {
      t5 = 0; zoneLive(); buffChips(); abilLive();
      if (BT.shop === 'open') { shopLive(); if (dirty.panel) { dirty.panel = false; panel(); } else panelLive(); }   // 商店關著不畫（打開時整個重畫）
    }
  };
})(window.BSI = window.BSI || {});
