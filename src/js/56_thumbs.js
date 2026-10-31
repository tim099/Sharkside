// ───────────────────────── 船型縮圖的拍攝頁（TASK-1130）：網址帶 ?thumbs=<id,id…｜all> ⇒ 不開遊戲（90_main.js 看 I.thumbMode 就收手），
// 照核心的 thumb（Blockside 05_hull.js thumbImg：同一個角度、同一盞光、透明底）一艘一艘畫，整包寫進 id 是 bsi-thumbs 的 pre（⛔ 這裡別寫出那個標籤：build.py 照它找）：{ v: 畫法版本, ships: { id: PNG 的 data URL｜{ err } } }
// ⇒ build.py --thumbs 用無頭 Chrome（--dump-dom）讀回來存成 img/ship/<id>.png。只讀：不讀不寫存檔、不開戰。
(function (I) {
  'use strict';
  var m = /[?&]thumbs=([^&#]*)/.exec(location.search), C = I.core;
  I.thumbMode = !!m;
  if (!m || !C) return;
  function done(out) { var pre = document.createElement('pre'); pre.id = 'bsi-thumbs'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre); }
  (function run() {
    if (!C.ready()) { setTimeout(run, 200); return; }
    if (!C.thumb) { done({ err: '核心沒有 thumb（外殼 API 太舊）' }); return; }
    var q = decodeURIComponent(m[1]), ids = q === 'all' ? C.hulls().map(function (h) { return h.id; }) : q.split(','), out = { v: C.thumbV, ships: {} };
    (function next(i) {
      if (i >= ids.length) { done(out); return; }
      C.thumb(ids[i]).then(function (u) { out.ships[ids[i]] = u || { err: '畫出來是空的' }; }, function (e) { out.ships[ids[i]] = { err: String(e && e.message || e) }; })
        .then(function () { next(i + 1); });
    })(0);
  })();
})(window.BSI = window.BSI || {});
