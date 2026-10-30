// ───────────────────────── 方舷放置：一場一場打（跟核心講話的都在這裡） ─────────────────────────
// 一個海域 ＝ 一場：我方艦隊對那個海域的敵艦（同時在場我方 BAL.fieldMine 艘、敵方 BAL.fieldFoes 艘，其他的是候補：一艘出局就補一艘）。
// 強度：火力比 atkR ＝ 我方火力 ÷ 海域強度、船堅比 defR ＝ 我方船堅 ÷ 海域強度 —— 數字可以一直變大，可是換成模擬裡的東西（硬度、每發傷害）都夾在範圍內，
//   ⇒ 戰局永遠是正常的物理，只是跟得上的時候打得快、跟不上的時候打不穿。
// 收入：每一格敵艦被打掉（核心的 sh.lost）就換成格；擊沉、俘獲、殉爆另外有賞金。
(function (I) {
  'use strict';
  var C = I.core, B = I.BAL;
  var BT = I.BT = { phase: 'idle', Z: null, startWall: 0, holdUntil: 0, result: null, income: 0, wave: [], blueQ: [], build: { blue: 0, red: 0 }, spawnAt: 0, goldQ: false, frenzyUntil: 0, repairUntil: 0,
    myDmg: 1, foeDmg: 1, myHard: 1, eHard: 1, myHole: 1, foeHole: 1, atkR: 1, defR: 1, myLost0: 0, kills: [], seq: 0 };

  if (!C) return;

  // 開火那一刻改那一顆：傷害（砲、帆、人）與打到船殼的洞多大（核心 21_gunnery.js：洞的半徑 ＝ 3.4～4.6 ×（big ? 1.25 : hole）× 硬度^−¼；big 只在那裡用）
  //   增益（20_econ.js bmul）：砲手狂熱 ⇒ 我方這一顆更兇；鐵木船殼 ⇒ 敵方這一顆打我方更輕。洞的上限顧效能（體積 ∝ 半徑³）
  C.on('rptShot', function (sh, g, b) {
    if (BT.phase !== 'fight' || !b) return;
    var mine = sh.team === 'blue', bd = I.bmul('dmg'), bh = I.bmul('hard'), md = BT.Z && BT.Z.mod;
    if (b.dmg > 0) b.dmg *= mine ? BT.myDmg * bd : BT.foeDmg / bh * (md && md.foeDmg || 1);   // 海況（濃霧）：敵彈也打折
    b.hole = Math.min(B.holeMax * 1.25, (b.big ? 1.25 : b.hole || 1) * (mine ? BT.myHole * Math.pow(bd, 0.3) : BT.foeHole * Math.pow(bh, -0.3))); b.big = false;
  });
  // 殉爆（核心 73_slowmo 的慢動作同一個事件）
  C.on('blast', function (sh) { if ((BT.phase === 'fight' || BT.phase === 'hold') && sh && sh.team === 'red' && sh.bsi) onBoom(sh); });
  // 廣播（重要的才收；UI 的訊息列）
  C.on('note', function (sh, text, imp) { if (imp && BT.phase !== 'idle' && sh) I.emit('note', sh, text); });

  function mapNow() { var q = new URLSearchParams(location.search); return { map: q.get('map') || '', site: +(q.get('site') || 0) }; }
  I.mapNow = mapNow;
  I.preload = function (ids) {
    var L = ids.filter(function (id, i) { return ids.indexOf(id) === i && !C.loaded(id); });
    return L.reduce(function (p, id) { return p.then(function () { I.emit('loading', id); return C.loadHull(id); }); }, Promise.resolve());
  };

  /** 開打第 N 個海域。海圖不是現在這一張 ⇒ 交給主程式重新載入。 */
  I.startZone = function (N) {
    var S = I.S, Z = I.zone(N), M = mapNow(), seq = ++BT.seq;
    if (Z.map !== M.map || (Z.map && Z.site !== M.site)) { BT.phase = 'reload'; I.emit('reload', Z); return; }
    BT.phase = 'loading'; BT.Z = Z; BT.result = null; BT.income = 0; BT.kills = []; BT.bossSeen = false;
    var mine = S.fleet.filter(function (id) { return S.own[id] && I.cardOf(id); }).slice(0, S.slots);
    if (!mine.length) mine = ['flyingfish'];
    I.emit('zoneLoad', Z);
    return I.preload(mine.concat(Z.foes)).then(function () {
      if (seq !== BT.seq) return;                                   // 中途又換了海域
      BT.atkR = I.atk() / Z.lv; BT.defR = I.def() / Z.lv;
      BT.myDmg = I.clamp(Math.pow(BT.atkR, B.atkExp), B.dmgMin, B.dmgMax); BT.eHard = I.clamp(Math.pow(BT.atkR, -B.atkExp), B.hardMin, B.hardMax);
      BT.myHard = I.clamp(Math.pow(BT.defR, B.defExp), B.hardMin, B.hardMax); BT.foeDmg = I.clamp(Math.pow(BT.defR, -B.defExp), B.dmgMin, B.dmgMax);
      BT.myHole = I.clamp(B.myHole * Math.pow(BT.atkR, B.holeExp), B.holeMin, B.holeMax); BT.foeHole = I.clamp(Math.pow(BT.defR, -B.holeExp), B.holeMin, B.holeMax);
      var first = Z.foes.slice(0, B.fieldFoes); BT.wave = Z.foes.slice(B.fieldFoes); BT.blueQ = mine.slice(B.fieldMine); BT.build = { blue: 0, red: 0 }; BT.spawnAt = 0; BT.goldQ = false;   // wave、blueQ ＝ 候補（reinforce 一艘一艘補上）
      var spec = mine.slice(0, B.fieldMine).map(function (h) { return { team: 'blue', hull: h }; }).concat(first.map(function (h) { return { team: 'red', hull: h }; }));
      // judge: false ⇒ 核心不判勝負（這裡自己判）：⛔ 照判 ⇒ 場上的敵艦都出局、候補還在做的那一刻核心就收場，候補加不進來
      return C.start(spec, { dist: B.dist, field: spec.length, weather: Z.wx, mode: 'eve', staged: true, judge: false }).then(function () {
        if (seq !== BT.seq) return;
        C.ships().forEach(apply);
        C.speed(I.S.speed);
        BT.myLost0 = 0; BT.phase = 'fight'; BT.startWall = I.now();
        I.S.st.battles++;
        I.emit('zoneStart', Z);
        if (!Z.boss && Math.random() < B.goldP * (Z.mod && Z.mod.gold || 1)) setTimeout(function () { if (seq === BT.seq && BT.phase === 'fight') BT.goldQ = true; }, 5000 + Math.random() * 10000);   // 排進候補那一條（reinforce）
      });
    }).catch(function (e) { console.error(e); BT.phase = 'error'; I.emit('error', e); });
  };

  /** 開局（或中途進場）那一艘的設定：放置模式的底 × 強度比 × 升級。 */
  function apply(sh) {
    if (sh.bsi) return;
    var Z = BT.Z, N = Z.n;
    sh.bsi = { lostMax: sh.lost || 0, out: false, id: sh.T.id, boss: Z.boss && sh.T.id === Z.R.boss && !BT.bossSeen, acc: 0, accT: 0, cfg0: null };
    if (sh.bsi.boss) BT.bossSeen = true;
    if (sh.team === 'blue') {
      sh.reloadT = I.reloadT();
      sh.cfg.hard *= BT.myHard; sh.cfg.flood *= B.myFlood * I.floodK(); sh.cfg.pump *= B.myPump * I.pumpK();
      sh.cfg.speed *= I.sailK(); sh.cfg.agile *= I.sailK();
      sh.cap = I.S.doctrine;
    } else {
      sh.reloadT = Math.max(B.eReloadMin, B.eReload0 / (1 + B.eReloadPer * (N - 1)));
      sh.cfg.hard *= B.eHard * BT.eHard; sh.cfg.flood *= B.eFlood; sh.cfg.pump *= B.ePump;
      sh.bsi.pool = I.pool(sh.T.id, N, sh.bsi.boss); sh.bsi.D = Math.max(400, B.hitRef * (sh.grid.count || 8000)); sh.bsi.hitPaid = 0; sh.bsi.biteGot = 0;
      powderSoft(sh);
    }
    sh.bsi.cfg0 = { flood: sh.cfg.flood, pump: sh.cfg.pump, hard: sh.cfg.hard, speed: sh.cfg.speed, agile: sh.cfg.agile };   // 增益每一格照這份重乘（battleTick）
  }
  function powderSoft(sh) {
    var k = I.powderK() * (BT.Z && BT.Z.mod && BT.Z.mod.powder || 1); if (k >= 1) return;   // 海況（火藥運輸線）再乘
    (sh.models || []).forEach(function (m) { if (m.kind === 'powder' && !m.bsiSoft) { m.bsiSoft = true; m.hp = Math.max(1, Math.round(m.hp * k)); m.hpMax = Math.max(1, Math.round((m.hpMax || m.hp) * k)); } });
  }

  // ── 每一格畫面（主程式叫）：收入、降旗、出局、下一波、勝負 ──
  I.battleTick = function () {
    if (BT.phase !== 'fight' && BT.phase !== 'hold') return;
    var Z = BT.Z, ships = C.ships(), st = C.state(), now = I.now(), vm = I.valueMul() * I.incomeMul();
    var strike = I.strikeAt(), redUp = 0, blueUp = 0, myLost = 0, repairing = now < BT.repairUntil;
    var rT = I.reloadT() * I.bmul('reload'), hk = I.bmul('hard'), sk = I.bmul('speed');   // 增益（核心每次開火讀 reloadT、每一步讀 cfg）
    if (I.S.perk && now >= I.S.perk.at + B.perkAuto * 1000) I.perkTake(I.perkBest(I.S.perk), true);   // 強化三選一放著不選 ⇒ 自動選
    ships.forEach(function (sh) {
      if (!sh.bsi) apply(sh);
      if (sh.team === 'blue') {
        myLost += sh.lost || 0;
        if (!C.isOut(sh)) blueUp++;
        var c0 = sh.bsi.cfg0; sh.reloadT = rT; sh.cfg.hard = c0.hard * hk; sh.cfg.speed = c0.speed * sk; sh.cfg.agile = c0.agile * sk;
        if (repairing) { sh.cfg.pump = sh.bsi.cfg0.pump * 4; sh.cfg.flood = 0; } else if (sh.bsi.rep) { sh.cfg.pump = sh.bsi.cfg0.pump; sh.cfg.flood = sh.bsi.cfg0.flood; }
        sh.bsi.rep = repairing;
        return;
      }
      if (sh.team !== 'red') return;
      if ((sh.lost || 0) > sh.bsi.lostMax) {                         // 打下來的格 ⇒ 身價的 hitShare 照飽和曲線領（木匠補回去的不倒扣）
        sh.bsi.lostMax = sh.lost;
        var f = B.hitShare * (1 - Math.exp(-sh.bsi.lostMax / sh.bsi.D)), dp = f - sh.bsi.hitPaid;
        if (dp > 0) { sh.bsi.hitPaid = f; var g = I.gain(sh.bsi.pool * dp * vm, 'hit'); BT.income += g; sh.bsi.acc += g; }
      }
      if (sh.bsi.acc > 0 && now - sh.bsi.accT > 380) { I.emit('float', sh, sh.bsi.acc, 'hit'); sh.bsi.acc = 0; sh.bsi.accT = now; }
      if (BT.phase === 'fight' && !sh.struck && !sh.sunk && !sh.sinkingFinal && sh.crew0 > 0 && 1 - sh.able / sh.crew0 >= strike) {
        C.strike(sh, '降旗（死傷 ' + Math.round((1 - sh.able / sh.crew0) * 100) + '%）—— 骷髏旗嚇壞他們了');
      }
      if (!sh.bsi.out && C.isOut(sh)) onOut(sh);
      if (!C.isOut(sh)) redUp++;
      if (now - (sh.bsi.pwT || 0) > 2000) { sh.bsi.pwT = now; powderSoft(sh); }   // 火藥桶有的是開打之後才擺（彈藥庫的站）
    });
    if (BT.phase === 'hold') { if (now >= BT.holdUntil && !I.S.perk && BT.shop === 'done') next(); return; }   // 強化三選一還沒選 ⇒ 等（選了、或倒數完自動選）；結算商店還開著 ⇒ 等（按出航、或倒數完）
    BT.myLost = myLost;
    if (!blueUp && !BT.blueQ.length && !BT.build.blue) return finish('lose');
    if (!redUp && !BT.wave.length && !BT.goldQ && !BT.build.red) return finish('win');
    reinforce(ships, redUp, blueUp, now);
    if (st.t > Z.timeout) return finish('timeout');
  };

  function onOut(sh) {
    sh.bsi.out = true;
    var how = sh.struck && !sh.sinkingFinal && !sh.sunk ? 'cap' : 'sink', S = I.S, id = sh.T.id;
    var g = I.gain(sh.bsi.pool * B.outShare * (how === 'cap' ? B.captureK : 1) * I.bountyMul() * I.incomeMul() * (BT.Z.mod && BT.Z.mod.bounty || 1), how);
    BT.income += g; BT.kills.push({ id: id, how: how, g: g });
    if (how === 'cap') S.st.cap++; else S.st.sunk++;
    if (sh.bsi.gold) S.st.gold++;
    if (!S.bp[id] && I.firstZone(id) < 99) { S.bp[id] = 1; I.emit('bp', id); }
    I.emit('kill', sh, how, g);
  }
  function onBoom(sh) {
    if (sh.bsi.boomed) return; sh.bsi.boomed = true;
    var g = I.gain(sh.bsi.pool * B.boomShare * I.boomMul() * I.bountyMul() * I.incomeMul() * (BT.Z.mod && BT.Z.mod.boom || 1), 'boom');
    BT.income += g; I.S.st.boom++;
    I.emit('boom', sh, g);
  }
  function mid(L) { var x = 0, z = 0; L.forEach(function (o) { x += o.px; z += o.pz; }); return L.length ? [x / L.length, z / L.length] : [0, 0]; }
  // ── 候補（照核心 52_fleet.js 的 reinforce／spawnReserve；Tim 2026-10-30：「目前有出現卡頓現象 是否可以參考原本的候補機制 讓船一艘一艘上場」、「場上可以限制最多三台(我方一台)」）──
  //   場上還在打的（加上正在做的）我方少於 BAL.fieldMine ⇒ 我方候補（BT.blueQ）先補；敵方少於 BAL.fieldFoes ⇒ 黃金寶船先、再來候補（BT.wave）。兩艘之間至少隔 BAL.reinfGap 秒 ⇒ 一次只做一艘。
  //   船分段做（核心 C.addStaged：開船那十幾段一格做 4 ms、做完才放上場；BT.build 記正在做的）。
  //   ⛔ 以前一整波（最多 3 艘）等場上全出局才同一格 C.add：一艘 15～30 ms、那一型第一次開 70～95 ms（船型的快取）⇒ 一次卡 0.1～0.3 秒；一艘一艘 C.add 還是每艘頓一下 40～70 ms。
  function reinforce(ships, redUp, blueUp, now) {
    if (now < BT.spawnAt) return;
    var team = null, hull = null, gold = false;
    if (blueUp + BT.build.blue < B.fieldMine && BT.blueQ.length) { team = 'blue'; hull = BT.blueQ.shift(); }
    else if (redUp + BT.build.red < B.fieldFoes) {
      if (BT.goldQ) { gold = true; BT.goldQ = false; hull = goldHull(); } else if (BT.wave.length) hull = BT.wave.shift();
      if (hull) team = 'red';
    }
    if (!team) return;
    BT.spawnAt = now + B.reinfGap * 1000; BT.build[team]++;
    var P = reservePos(ships, team), seq = BT.seq;
    C.addStaged({ team: team, hull: hull, x: P[0], z: P[1] }).then(function (sh) {
      if (seq !== BT.seq) return;                                     // 做的時候換了海域（核心重開 ⇒ 丟掉；計數跟著那一場清了）
      BT.build[team]--;
      if (!sh) return;
      apply(sh);
      if (gold) {                                                     // 黃金寶船：身價 × goldK、幾乎不還手（裝填 45 秒）、船殼軟一點；這一場多給一艘的時間
        sh.bsi.gold = true; sh.bsi.pool *= B.goldK; sh.reloadT = 45; sh.cfg.hard *= 0.6; BT.Z.timeout += B.timeoutPer;
        I.emit('gold', sh);
      } else I.emit('reserve', sh, team === 'red' ? BT.wave.length : BT.blueQ.length);
    });
  }
  /** 黃金寶船用這個海域最大的那一型（開打前就載好了）。 */
  function goldHull() { return BT.Z.foes.slice().sort(function (a, b) { return I.tons(b) - I.tons(a); })[0]; }
  /** 進場的位置（照核心 spawnReserve）：team 那一方還在打的船的中心往「離對方中心」的方向再退 120 m（至少離對方中心 260 m），
   *  左右每 80 m 錯開到離每一艘還浮著的船 70 m 以上；有海圖 ⇒ 不超出開戰點的開闊水域（420 m）。船頭照 C.addStaged 的預設（對著對方還在打的船）。 */
  function reservePos(ships, team) {
    var afloat = ships.filter(function (o) { return !o.sunk; }), P = null;
    function m(L) { return L.length ? mid(L) : null; }
    var E = m(afloat.filter(function (o) { return o.team !== team && !C.isOut(o); })) || [0, 0];
    var O = m(afloat.filter(function (o) { return o.team === team && !C.isOut(o); })) || m(afloat.filter(function (o) { return o.team === team; }));
    var dx = O ? O[0] - E[0] : 0, dz = O ? O[1] - E[1] : 0, dl = Math.hypot(dx, dz);
    if (dl < 1) { var a = Math.random() * 6.283; dx = Math.cos(a); dz = Math.sin(a); dl = 1; }
    dx /= dl; dz /= dl;
    var R = Math.max((O ? Math.hypot(O[0] - E[0], O[1] - E[1]) : 0) + 120, 260);
    [0, 1, -1, 2, -2, 3, -3, 4, -4].some(function (q) {
      var p = [E[0] + dx * R + dz * q * 80, E[1] + dz * R - dx * q * 80], r = Math.hypot(p[0], p[1]);
      if (BT.Z.map && r > 420) { p[0] *= 420 / r; p[1] *= 420 / r; }
      if (afloat.every(function (o) { return Math.hypot(o.px - p[0], o.pz - p[1]) > 70; })) { P = p; return true; }
      return false;
    });
    return P || [E[0] + dx * (R + 150), E[1] + dz * (R + 150)];
  }

  function finish(kind) {
    var S = I.S, Z = BT.Z, N = Z.n, st = C.state(), first = kind === 'win' && N >= S.maxZone;   // first：第一次打下這個海域（這一輪）⇒ 強化三選一
    BT.phase = 'hold'; BT.result = kind; BT.holdUntil = I.now() + B.hold * 1000; BT.resultAt = I.now(); BT.shop = 'none';   // 結算商店（50_ui.js）：none ⇒ 該開了、open ⇒ 開著、done ⇒ 出航
    var wallSec = Math.max(5, (I.now() - BT.startWall) / 1000 + B.hold), r = BT.income / wallSec;   // 這一場每秒賺多少（離線收益照它）
    S.rate = S.rate ? 0.75 * S.rate + 0.25 * r : r;
    if (kind === 'win') {
      S.st.wins++;
      if (st.t < 30) S.st.blitz = 1;
      if (BT.myLost < 50) S.st.clean = 1;
      if (BT.atkR < 0.6) S.st.under = 1;
      S.maxZone = Math.max(S.maxZone, N + 1); S.bestZone = Math.max(S.bestZone, S.maxZone);
      if (N >= I.GIFTS.pinas && !S.bp.pinas) { S.bp.pinas = 1; I.emit('bp', 'pinas', true); }
      if (S.farm > 0) { S.farm++; if (S.farm > B.retryAfter && S.auto) { S.zone = Math.min(S.maxZone, N + 1); S.farm = 0; } }
      else if (S.auto) S.zone = Math.min(S.maxZone, N + 1);
    } else {
      S.st.losses++;
      if (S.auto && N > 1) { S.zone = N - 1; S.farm = 1; }
    }
    I.buffBattle();
    I.emit('result', kind, Z, BT.income);
    if (first) {
      I.perkRoll(N, Z.boss, Math.max(BT.income, (S.rate || 0) * 45));
      if (S.perkAuto) I.perkTake(I.perkBest(S.perk), true);
    }
  }
  function next() { BT.phase = 'idle'; I.startZone(I.S.zone); }
  /** 換海域（手動：上一個、下一個、重打）。 */
  I.goZone = function (N) { var S = I.S; S.zone = I.clamp(N, 1, S.maxZone); S.farm = 0; I.startZone(S.zone); };

  // ── 咬一口（點敵艦哪裡就咬哪裡；巨齒鯊）──
  var biteAt = 0, combo = 0, comboT = 0;
  /** 連咬：現在連到第幾口（斷了 ⇒ 0）、還剩幾秒會斷。 */
  I.comboLeft = function () { return Math.max(0, comboT + B.comboGap * 1000 - I.now()) / 1000; };
  I.comboNow = function () { return I.comboLeft() > 0 ? combo : 0; };
  /** o：{ at, dir }（核心 pick 的 p、d ⇒ 咬在那一點；cx、cy ＝ 點的那一點，演出放那裡）、{ big }（巨齒鯊：對著鏡頭那一舷的水線上一大口）；
   *  都沒有 ⇒ 對著鏡頭那一舷、水線上一點點的地方。回咬掉幾格。 */
  I.bite = function (sh, o) {
    o = o || {};
    if (!sh || !sh.bsi || sh.team !== 'red' || (BT.phase !== 'fight' && BT.phase !== 'hold')) return 0;   // 打贏之後（hold）還在沉的照樣咬得到
    if (sh.sunk && !o.at) return 0;                                    // 沉沒了還在往下沉的：點得到才咬（tapBite 照深度判）
    var now = I.now(), nc = o.big ? combo : now - comboT < B.comboGap * 1000 ? combo + 1 : 1, crit = !o.big && nc % B.comboCrit === 0;
    if (!o.big) { if (now - biteAt < 250) return 0; biteAt = now; }
    var r = o.big ? 10 + I.lv('teeth') : Math.round(I.biteR() * (crit ? 1.6 : 1));
    var res = o.at ? C.bite(sh, o.at, r, o.dir) : C.bite(sh, { fx: 0.2 + Math.random() * 0.6, side: 0, dz: o.big ? 0 : 1 }, r);
    if (!res) return 0;
    if (!o.big) { combo = nc; comboT = now; if (combo > I.S.st.comboMax) I.S.st.comboMax = combo; }
    I.S.st.bites++;
    // 咬下來的格照常算進打下來的格（輪詢那一份）；另外一份咬的獎勵：一口 ≈ 身價的 biteK（咬得越大 ∝ √格數）× 利齒，一艘最多領身價的三成
    //   ⛔ 照「格數 ÷ 那艘的 5%」算（打下來的格那條曲線）⇒ 一口 100 格只有身價的 0.16%，點了跟沒點一樣（2026-10-30 量的：第 1 海域一口 +8.7）
    //   連咬：× 1 ＋ comboStep ×（連咬 − 1）（最多 comboMax），暴擊再 ×2
    var cm = o.big ? 1 : Math.min(B.comboMax, 1 + B.comboStep * (combo - 1)) * (crit ? 2 : 1);
    var b = sh.bsi, bonus = Math.min(b.pool * 0.3 - b.biteGot, b.pool * B.biteK * Math.sqrt(res.n / 100) * I.biteMul() * cm), g = 0;
    if (bonus > 0) { b.biteGot += bonus; g = I.gain(bonus * I.valueMul() * I.incomeMul(), 'bite'); BT.income += g; }
    I.emit('bite', { sh: sh, n: res.n, g: g, w: res.w, big: !!o.big, cx: o.cx, cy: o.cy, combo: o.big ? 0 : combo, crit: crit, cm: cm });
    return res.n;
  };
  /** 畫面那一點沒點到那艘的船身（點到名牌、手機點偏了）⇒ 從那一點往它的中心走，第一個點得到它的地方。 */
  I.hullAt = function (sh, cx, cy) {
    var c = C.center(sh), p = c && C.project(c[0], c[1], c[2]);
    for (var i = 0; i <= 6; i++) {
      var k = i / 6, h = C.pick(p ? cx + (p.x - cx) * k : cx, p ? cy + (p.y - cy) * k : cy);
      if (h && h.sh === sh) return h;
      if (!p) break;
    }
    return null;
  };
  /** 咬那一艘（名牌、空白鍵）：畫面那一點（沒給 ⇒ 它的中心）往中心找船身。 */
  I.biteShip = function (sh, cx, cy) {
    if (cx === undefined) { var c = C.center(sh), p = c && C.project(c[0], c[1], c[2]); if (!p) return I.bite(sh); cx = p.x; cy = p.y; }
    var h = I.hullAt(sh, cx, cy);
    return I.bite(sh, h ? { at: h.p, dir: h.d } : {});
  };
  /** 核心 pick 打到的那一點咬得咬不到：敵艦；沉沒了還在往下沉的 ⇒ 水面下 BAL.wreckY 以內（再深就看不到了）。水面本身不擋。 */
  I.biteable = function (h) { return !!(h && h.sh.team === 'red' && h.sh.bsi && (!h.sh.sunk || h.w[1] > B.wreckY)); };
  /** 點一下畫面（外殼的 tap 掛鉤）：點到敵艦 ⇒ 咬那一點；點偏了 ⇒ 最近那艘往中心找。 */
  I.tapBite = function (cx, cy) {
    var h = C.pick(cx, cy);
    if (I.biteable(h)) return I.bite(h.sh, { at: h.p, dir: h.d, cx: cx, cy: cy });
    var sh = I.foeAt(cx, cy);
    return sh ? I.biteShip(sh, cx, cy) : 0;
  };
  /** 畫面上那一點離哪艘敵艦最近（照船的中心投影；遠的船門檻小一點）。 */
  I.foeAt = function (cx, cy) {
    var best = null, bd = Infinity;
    C.ships().forEach(function (sh) {
      if (sh.team !== 'red' || sh.sunk) return;
      var c = C.center(sh); if (!c) return;
      var p = C.project(c[0], c[1], c[2]); if (!p) return;
      var d = Math.hypot(p.x - cx, p.y - cy), lim = I.clamp(9000 / p.d, 50, 260);
      if (d < lim && d < bd) { bd = d; best = sh; }
    });
    return best;
  };

  // ── 技能 ──
  I.abilReady = function (a) { return I.S.bestZone >= a.zone && I.now() >= (I.S.cd && I.S.cd[a.id] || 0); };
  I.abilLeft = function (a) { return Math.max(0, ((I.S.cd && I.S.cd[a.id]) || 0) - I.now()) / 1000; };
  I.useAbil = function (id) {
    var a = I.ABIL.filter(function (x) { return x.id === id; })[0]; if (!a || !I.abilReady(a) || BT.phase !== 'fight') return false;
    var ships = C.ships();
    if (id === 'volley') ships.forEach(function (sh) { if (sh.team === 'blue' && !C.isOut(sh)) sh.guns.forEach(function (g) { if (g.alive && g.reload > 0.05) g.reload = 0.05; }); });
    if (id === 'frenzy') BT.frenzyUntil = I.now() + a.dur * 1000;
    if (id === 'mega') {                                              // 巨齒鯊：先游過畫面（40_fx.js），再一艘一艘咬下去
      var L = ships.filter(function (sh) { return sh.team === 'red' && !C.isOut(sh); });
      L.forEach(function (sh, i) { setTimeout(function () { I.bite(sh, { big: true }); }, 520 + i * 170); });
      I.emit('mega', L.length);
    }
    if (id === 'repair') BT.repairUntil = I.now() + a.dur * 1000;
    I.S.cd = I.S.cd || {}; I.S.cd[id] = I.now() + a.cd * 1000 * I.cdMul();
    I.emit('abil', a);
    return true;
  };
})(window.BSI = window.BSI || {});
