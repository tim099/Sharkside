// ───────────────────────── 方舷放置：賞金任務 ─────────────────────────
// 同時三張（10_data.js QUESTS × QUEST_TIER 小／中／大）；聽戰鬥的事件算進度，做完自動領獎（格 ＋ 中、大另給隨機增益幾場），換一張新的（三張不重複）。
// 獎勵照「一場大約賺多少」乘 ⇒ 跟著進度變大，什麼時候做完都划算。
(function (I) {
  'use strict';
  function def(id) { return I.QUESTS.filter(function (q) { return q.id === id; })[0]; }
  I.questDef = def;
  /** 一場大約賺多少：最近的收入速度 × 60 秒，至少照最遠海域一格的價值估（剛開檔、轉生後收入速度還是 0）。 */
  I.questRef = function () { return Math.max((I.S.rate || 0) * 60, I.blockVal(I.S.maxZone) * 2500); };
  function rollTier() {
    var L = I.QUEST_TIER, x = Math.random() * L.reduce(function (a, t) { return a + t.w; }, 0);
    for (var i = 0; i < L.length; i++) if ((x -= L[i].w) < 0) return i;
    return 0;
  }
  function make(skip) {
    var q = I.pick(I.QUESTS.filter(function (d) { return skip.indexOf(d.id) < 0; })), t = rollTier();
    return { id: q.id, tier: t, need: q.n[t], got: 0 };
  }
  /** 補滿三張（開機、做完一張）；看不懂的（改版拿掉的種類）丟掉。 */
  I.questFill = function () {
    var S = I.S;
    S.quests = (S.quests || []).filter(function (q) { return def(q.id); });
    while (S.quests.length < 3) S.quests.push(make(S.quests.map(function (q) { return q.id; })));
  };
  function done(q) {
    var S = I.S, T = I.QUEST_TIER[q.tier], g = I.gain(I.questRef() * T.k, 'quest'), bf = null;
    if (T.buff) { bf = I.pick(I.BUFF); I.buffAdd(bf.id, { n: T.buff }); }
    S.st.quests++;
    S.quests.splice(S.quests.indexOf(q), 1, make(S.quests.map(function (x) { return x.id; })));   // 新的那張跟手上的（含剛做完這張）都不同
    I.emit('questDone', q, g, bf);
  }
  /** 進度：一般的 ＋n；max 的（連咬）⇒ 這一次的值，取最高。 */
  function add(id, n) {
    var S = I.S, hit = false;
    (S.quests || []).slice().forEach(function (q) {
      if (q.id !== id) return;
      hit = true; q.got = def(id).max ? Math.max(q.got, n) : q.got + n;
      if (q.got >= q.need) done(q);
    });
    if (hit) I.emit('quest');
  }
  I.questAdd = add;
  I.on('kill', function (sh, how) { add(how === 'cap' ? 'cap' : 'sink', 1); if (sh && sh.bsi && sh.bsi.gold) add('gold', 1); });
  I.on('boom', function () { add('boom', 1); });
  I.on('bite', function (o) { add('bite', 1); if (o.combo) add('combo', o.combo); });
  I.on('lootTake', function () { add('loot', 1); });
  I.on('perk', function () { add('zone', 1); });                       // 強化三選一 ＝ 第一次打下一個海域
})(window.BSI = window.BSI || {});
