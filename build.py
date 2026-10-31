"""Sharkside（方舷放置）的建置：拿 Blockside 建好的成品（海戰核心）套 src/ 的外殼寫成 index.html，船檔、用到的海圖、圖示照抄一份
⇒ 這個資料夾整個就是網站（GitHub Pages：Deploy from a branch，main／根目錄）。

  python -I build.py --core <Blockside 的工作副本>           建：src/js/05_img.js、index.html、ships/、maps/
  python -I build.py --core <Blockside 的工作副本> --check   只比、不寫：跟那一份核心、src/ 對不上 ⇒ exit 1

· 核心要有外殼 API（Blockside 的 src/js/91_shellapi.js；說明在它的 src/CORE_API.md §7）。
· 套頁本身是 Blockside 的 admin.py shell：src/shell.json 沒寫 core ⇒ 套跑它的那一份的 index.html。
· 船檔照抄整個 ships/（入口記著船檔清單與雜湊，兩邊要是同一次建置的）；海圖只抄 src/js/10_data.js 的海域表寫到的（核心從頁面旁邊讀 maps/<名字>/）。
· 正式美術在 img/（ART.md）：先把 img/ 底下有哪些 png（git 追蹤的：還沒提交的不算）寫成 src/js/05_img.js（BSI.IMG ＝ { '<類>/<id>': 內容雜湊前 8 碼 }），遊戲照它決定用圖還是 emoji
  ⇒ 還沒畫的不去要（不破圖、不 404）；換了圖 ⇒ 網址的 ?v= 跟著變（GitHub Pages 不吃舊快取）。圖示（App、主畫面）也在 img/app/，⛔ 不再抄核心的 icons/。
· 大張的 png（≥ WEBP_MIN：場景插圖、立繪、字標）另外轉一份 WebP（img/<類>/<id>.webp，q WEBP_Q；Tim 2026-10-30「套用前可以先看一下實際容量」：
  遊戲用的 150 張 22.8 MB，最大的 20 張轉完 19.6 ⇒ 3.5 MB）⇒ 05_img.js 多一份 BSI.IMGW（有 WebP 的那幾張），遊戲先拿 WebP、讀不到回 png、再回 emoji。
  img/webp.json 記每一份是照哪一版 png 轉的 ⇒ png 沒換就不重轉（編碼器換版本不一定逐位元組相同）；需要 Pillow，沒有 ⇒ 那幾張先用 png。⛔ 不要手改 .webp。
· 船型縮圖 img/ship/<id>.png（TASK-1130；船塢、艦隊那一列）不用畫：從核心拍（外殼 API thumb，Blockside 05_hull.js thumbImg：同一個角度、光線、透明底）。
  img/ship.json 記每一張是照哪一份船檔（ships/ship-<id>.js 的雜湊）、哪一版畫法（核心的 THUMB_V）拍的 ⇒ 核心換了船型、改了畫法、多了一型 ⇒ 建置寫 ⚠、--check 不過；
  --thumbs 用無頭 Chrome 開建好的 index.html?thumbs=<id,…>（src/js/56_thumbs.js）把舊了、缺的那幾張重拍（--thumbs all ⇒ 全部重拍）。拍完照樣先提交、再建一次才會換上。

  python -I build.py --core <Blockside 的工作副本> --thumbs [all]   建＋重拍舊了的縮圖
"""
import argparse
import filecmp
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
MANAGED = ('ships', 'maps')                                          # 這兩個資料夾整個照核心那一份（多的刪掉）
IMG_JS = os.path.join(SRC, 'js', '05_img.js')
WEBP_JSON = os.path.join(HERE, 'img', 'webp.json')
WEBP_MIN, WEBP_Q = 150 * 1024, 90                                    # 這麼大（位元組）以上的 png 轉一份 WebP；品質（放大兩倍跟 png 看不出差，2026-10-30 比過臉、字標、橫幅、標題）
WEBP_PNG_ONLY = re.compile(r'^app/(icon-|apple-touch-icon|favicon-)')   # App 圖示：主畫面、manifest 照用 png
SHIP_IMG = os.path.join(HERE, 'img', 'ship')
SHIP_JSON = os.path.join(HERE, 'img', 'ship.json')
THUMB_BATCH = 6                                                      # 一次無頭 Chrome 拍幾艘（每艘都要整個解碼、載好；一次全拍吃記憶體）
CHROMES = [r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
           os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe'), r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']


def img_files():
    """img/ 底下 git 追蹤的檔（相對於 img/）：⛔ 不照資料夾掃 ⇒ 別人還沒提交的圖會跑進這一次的成品（GitHub 上沒有那張 ⇒ 404）。不是 git 的工作副本 ⇒ 照資料夾。"""
    p = subprocess.run(['git', '-C', HERE, 'ls-files', '-z', '--', 'img'], capture_output=True)
    if p.returncode != 0:
        d = os.path.join(HERE, 'img')
        return sorted(files_under(d)) if os.path.isdir(d) else []
    return sorted(f[4:] for f in p.stdout.decode('utf-8').split('\0') if f.startswith('img/') and os.path.isfile(os.path.join(HERE, f)))


def sha8(p):
    return hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]


def png_list():
    """img/ 底下的 png（git 追蹤的）：{ '<類>/<id>': (路徑, 內容雜湊前 8 碼, 位元組) }。"""
    d, P = os.path.join(HERE, 'img'), {}
    for r in img_files():
        if r.endswith('.png'):
            p = os.path.join(d, r)
            P[r[:-4]] = (p, sha8(p), os.path.getsize(p))
    return P


def webp_sync(P, check):
    """大張的 png 轉一份 WebP（img/<key>.webp）、img/webp.json 記來源（src ＝ png 的雜湊）：png 沒換、WebP 在 ⇒ 不重轉。
    回 (W ＝ { key: WebP 內容雜湊前 8 碼 }, 對不上的說明)；check ⇒ 只比、不寫。"""
    try:
        side = json.load(open(WEBP_JSON, encoding='utf-8')) if os.path.isfile(WEBP_JSON) else {}
    except ValueError:
        print('⚠ img/webp.json 讀不懂 ⇒ 當作沒有，全部重轉')
        side = {}
    new, W, bad, Image = {}, {}, [], None
    for k in sorted(k for k, v in P.items() if v[2] >= WEBP_MIN and not WEBP_PNG_ONLY.match(k)):
        png, h, _ = P[k]
        out, e = os.path.join(HERE, 'img', k + '.webp'), side.get(k)
        if not (e and e.get('src') == h and e.get('q') == WEBP_Q and os.path.isfile(out)):
            if check:
                bad.append(k + '（png 換了或還沒轉）')
                continue
            if Image is None:
                try:
                    from PIL import Image
                except ImportError:
                    print('⚠ 沒有 Pillow ⇒ %s 先用 png（pip install pillow 之後再建一次）' % k)
                    continue
            im = Image.open(png)
            im.load()
            if im.mode not in ('RGB', 'RGBA'):
                im = im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB')
            im.save(out, 'WEBP', quality=WEBP_Q, method=6, alpha_quality=100)
            e = {'src': h, 'q': WEBP_Q}
        new[k] = e
        W[k] = sha8(out)
    d = os.path.join(HERE, 'img')                                    # 多的 WebP（png 換小了、拿掉了）⇒ 刪
    for r in sorted(files_under(d)) if os.path.isdir(d) else []:
        if r.endswith('.webp') and r[:-5] not in new:
            if check:
                bad.append(r + '（多的）')
            else:
                os.remove(os.path.join(d, r))
    t = json.dumps(new, ensure_ascii=False, sort_keys=True, indent=1) + '\n'
    old = open(WEBP_JSON, encoding='utf-8', newline='').read() if os.path.isfile(WEBP_JSON) else None
    if old != t and (new or old is not None):
        if check:
            bad.append('img/webp.json')
        else:
            open(WEBP_JSON, 'w', encoding='utf-8', newline='\n').write(t)
    if W:
        p = subprocess.run(['git', '-C', HERE, 'ls-files', '--', 'img'], capture_output=True)
        if p.returncode == 0:
            tracked = set(p.stdout.decode('utf-8').split('\n'))
            miss = [k + '.webp' for k in sorted(W) if 'img/' + k + '.webp' not in tracked] + ([] if 'img/webp.json' in tracked else ['webp.json'])
            if miss and check:
                bad.append('還沒提交：' + '、'.join(miss[:6]) + ('…' if len(miss) > 6 else ''))
            elif miss:
                print('⚠ 還沒提交的 WebP（推之前一起提交：git add img/webp.json img/**/*.webp）：%s' % '、'.join(miss[:6]) + ('…' if len(miss) > 6 else ''))
    return W, bad


def img_js(P, W):
    """05_img.js 的全文（照路徑排序 ⇒ 同一批圖每次寫出來一樣）：IMG ＝ 每張 png，IMGW ＝ 有 WebP 的那幾張。"""
    M = {k: v[1] for k, v in P.items()}
    return ('// 自動產生（build.py img_js）⛔ 不要手改：img/ 底下有哪些圖（ART.md）⇒ 00_base.js I.img 照它決定用圖還是 emoji；值 ＝ 內容雜湊前 8 碼（網址的 ?v=）；IMGW ＝ 另外轉了 WebP 的那幾張（大張的）\n'
            'window.BSI = window.BSI || {}; window.BSI.IMG = ' + json.dumps(M, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + ';\n'
            'window.BSI.IMGW = ' + json.dumps(W, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + ';\n')


def maps_used():
    """src/js/10_data.js 海域表寫到的海圖（map: '<名字>'）。"""
    t = open(os.path.join(SRC, 'js', '10_data.js'), encoding='utf-8').read()
    return sorted(set(re.findall(r"\bmap:\s*'([A-Za-z0-9_-]+)'", t)))


def files_under(d):
    """d 底下每個檔（相對於 d，斜線分隔）。"""
    out = set()
    for root, _, fs in os.walk(d):
        for f in fs:
            out.add(os.path.relpath(os.path.join(root, f), d).replace(os.sep, '/'))
    return out


def want(core):
    """這個網站該有的抄來的檔：{ 相對路徑: 核心那邊的檔 }。"""
    W = {}
    for root, _, fs in os.walk(os.path.join(core, 'ships')):
        for f in fs:
            p = os.path.join(root, f)
            W[os.path.relpath(p, core).replace(os.sep, '/')] = p
    for m in maps_used():
        d = os.path.join(core, 'maps', m)
        if not os.path.isdir(d):
            sys.exit('✗ 核心沒有海圖 maps/%s（src/js/10_data.js 的海域表寫到它）' % m)
        for root, _, fs in os.walk(d):
            for f in fs:
                p = os.path.join(root, f)
                W[os.path.relpath(p, core).replace(os.sep, '/')] = p
    return W


def thumb_want(core):
    """縮圖該照什麼拍：(畫法版本, { 船型 id: 船檔的雜湊前 8 碼 })；核心沒有 thumbImg ⇒ 版本 None。
    船型 id ⇒ 船檔照核心的 src/config/game.json（ships[].el ⇒ ships/<el>.js；憲法號是 ship.js、fort_carib 是 ship-fort-carib.js）；船檔不在（沒建）⇒ 不列，跟核心的 HULL_LIST 一樣。"""
    m = re.search(r'\bvar THUMB_V = (\d+)', open(os.path.join(core, 'src', 'js', '05_hull.js'), encoding='utf-8').read())
    S = {}
    for s in json.load(open(os.path.join(core, 'src', 'config', 'game.json'), encoding='utf-8')).get('ships', []):
        p = os.path.join(core, 'ships', s.get('el', '') + '.js')
        if os.path.isfile(p):
            S[s['id']] = sha8(p)
    return (int(m.group(1)) if m else None), S


def thumb_stale(v, S):
    """舊了、缺的縮圖：{ id: 原因 }，多的（核心沒有那一型）：[檔名]。"""
    try:
        side = json.load(open(SHIP_JSON, encoding='utf-8')) if os.path.isfile(SHIP_JSON) else {}
    except ValueError:
        side = {}
    bad = {}
    for k, h in S.items():
        e = side.get(k) or {}
        if not os.path.isfile(os.path.join(SHIP_IMG, k + '.png')):
            bad[k] = '沒有縮圖'
        elif e.get('src') != h:
            bad[k] = '船檔換了'
        elif e.get('v') != v:
            bad[k] = '畫法換了'
    extra = sorted(f for f in (os.listdir(SHIP_IMG) if os.path.isdir(SHIP_IMG) else []) if f.endswith('.png') and f[:-4] not in S)
    return bad, extra


def thumb_shoot(ids, v, S):
    """無頭 Chrome 開建好的 index.html?thumbs=<id,…>（src/js/56_thumbs.js）一批一批拍、存 img/ship/<id>.png、改 img/ship.json；回拍不到的 { id: 原因 }。"""
    import base64, html as _html, tempfile
    chrome = next((c for c in CHROMES if os.path.exists(c)), None)
    if not chrome:
        return {k: '找不到 Chrome' for k in ids}
    side = json.load(open(SHIP_JSON, encoding='utf-8')) if os.path.isfile(SHIP_JSON) else {}
    os.makedirs(SHIP_IMG, exist_ok=True)
    fail = {}
    for i in range(0, len(ids), THUMB_BATCH):
        B = ids[i:i + THUMB_BATCH]
        prof = tempfile.mkdtemp(prefix='sharkthumb_')
        try:
            url = 'file:///' + os.path.join(HERE, 'index.html').replace('\\', '/') + '?thumbs=' + ','.join(B)
            r = subprocess.run([chrome, '--headless=new', '--no-first-run', '--user-data-dir=' + prof, '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
                                '--virtual-time-budget=600000', '--dump-dom', url], capture_output=True, timeout=1200)
            ms = re.findall(r'<pre id="bsi-thumbs">({.*?)</pre>', r.stdout.decode('utf-8', 'replace'), re.S)
            D = json.loads(_html.unescape(ms[-1])) if ms else {'err': '無頭 Chrome 沒跑完'}   # 最後一個 ＝ 頁面寫出來的那個（第一個可能是內嵌程式裡的字串）
        except Exception as e:
            D = {'err': str(e)}
        finally:
            shutil.rmtree(prof, ignore_errors=True)
        if D.get('v') != v and not D.get('err'):
            D = {'err': '頁面的畫法版本 %s ≠ 核心原始碼的 %s（index.html 不是照這份核心建的）' % (D.get('v'), v)}
        for k in B:
            u = (D.get('ships') or {}).get(k)
            if not isinstance(u, str) or not u.startswith('data:image/png;base64,'):
                fail[k] = (u or {}).get('err') if isinstance(u, dict) else D.get('err', '沒拍到')
                continue
            open(os.path.join(SHIP_IMG, k + '.png'), 'wb').write(base64.b64decode(u.split(',', 1)[1]))
            side[k] = {'src': S[k], 'v': v}
            print('  📷 %s' % k)
    side = {k: e for k, e in side.items() if k in S}
    open(SHIP_JSON, 'w', encoding='utf-8', newline='\n').write(json.dumps(side, ensure_ascii=False, sort_keys=True, indent=1) + '\n')
    return fail


def sync(W, check):
    """照 W 補、蓋、刪；回 (改了的, 多的)。check ⇒ 只回、不動。"""
    have = set()
    for top in MANAGED:
        d = os.path.join(HERE, top)
        if os.path.isdir(d):
            have |= {top + '/' + r for r in files_under(d)}
    diff = []
    for r in sorted(W):
        d = os.path.join(HERE, r)
        if os.path.isfile(d) and filecmp.cmp(W[r], d, shallow=False):
            continue
        diff.append(r)
        if not check:
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copyfile(W[r], d)
    extra = sorted(have - set(W))
    if not check:
        for r in extra:
            os.remove(os.path.join(HERE, r))
    return diff, extra


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--core', required=True, help='Blockside 的工作副本（有建好的 index.html、ships/、maps/ 與 src/admin.py）')
    ap.add_argument('--check', action='store_true', help='只比、不寫')
    ap.add_argument('--thumbs', nargs='?', const='stale', choices=['stale', 'all'], help='建完重拍船型縮圖：舊了、缺的（預設）或 all 全部')
    o = ap.parse_args()
    core = os.path.abspath(o.core)
    admin = os.path.join(core, 'src', 'admin.py')
    if not os.path.isfile(admin):
        sys.exit('✗ %s 不是 Blockside 的工作副本（沒有 src/admin.py）' % core)
    if not os.path.isfile(os.path.join(core, 'src', 'js', '91_shellapi.js')):
        sys.exit('✗ %s 的核心沒有外殼 API（src/js/91_shellapi.js）' % core)
    bad = False
    # ⓪ 大張的 png 轉 WebP、圖的清單（套頁之前：它是外殼的一支 js）
    P = png_list()
    W, wbad = webp_sync(P, o.check)
    if wbad:
        bad = True
        print('✗ WebP 跟 img/ 對不上：%s ⇒ python -I build.py --core …（不帶 --check）' % '、'.join(wbad[:8]))
    else:
        mb = lambda n: n / 1048576
        big = sum(P[k][2] for k in W)
        print('✓ WebP %d 張（png %.1f MB ⇒ %.1f MB）' % (len(W), mb(big), mb(sum(os.path.getsize(os.path.join(HERE, 'img', k + '.webp')) for k in W))))
    t = img_js(P, W)
    old = open(IMG_JS, encoding='utf-8', newline='').read() if os.path.isfile(IMG_JS) else None
    n = len(P)
    if old == t:
        print('✓ src/js/05_img.js 是最新的（img/ %d 張）' % n)
    elif o.check:
        bad = True
        print('✗ src/js/05_img.js 跟 img/ 對不上 ⇒ python -I build.py --core …（不帶 --check）')
    else:
        open(IMG_JS, 'w', encoding='utf-8', newline='\n').write(t)
        print('✓ 寫了 src/js/05_img.js（img/ %d 張）' % n)
    # ① 套頁（Blockside 的 admin.py shell；它自己比得出舊了沒）
    p = subprocess.run([sys.executable, '-I', admin, 'shell', os.path.join(SRC, 'shell.json')] + (['--check'] if o.check else []),
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    print((p.stdout + p.stderr).strip())
    bad |= p.returncode != 0
    # ② 船檔、海圖、圖示
    W = want(core)
    diff, extra = sync(W, o.check)
    nm = maps_used()
    if o.check:
        if diff or extra:
            bad = True
            print('✗ 抄來的檔跟核心對不上：%s' % '、'.join(diff[:8] + [x + '（多的）' for x in extra[:8]]) + ('…' if len(diff) + len(extra) > 16 else ''))
        else:
            print('✓ ships/、maps/（%s）跟核心一樣（%d 個檔）' % ('、'.join(nm), len(W)))
    else:
        print('✓ ships/、maps/（%s）：%d 個檔，這次換了 %d 個、刪了 %d 個' % ('、'.join(nm), len(W), len(diff), len(extra)))
    # ③ 船型縮圖（img/ship/<id>.png）：照核心的船檔與畫法版本比 img/ship.json
    tv, TS = thumb_want(core)
    if tv is None:
        print('⚠ 核心沒有船型縮圖的畫法（05_hull.js THUMB_V）⇒ 縮圖不比')
    else:
        tbad, textra = thumb_stale(tv, TS)
        if o.thumbs and not o.check:
            ids = sorted(TS) if o.thumbs == 'all' else sorted(tbad)
            print('📷 拍船型縮圖 %d 艘（畫法 v%d）…' % (len(ids), tv))
            fail = thumb_shoot(ids, tv, TS) if ids else {}
            for k in textra:
                os.remove(os.path.join(SHIP_IMG, k))
            for k, why in sorted(fail.items()):
                print('✗ 縮圖 %s 沒拍到：%s' % (k, why))
            bad |= bool(fail)
            tbad, textra = thumb_stale(tv, TS)
            if ids and not fail:
                print('✓ 拍好了 ⇒ 先提交 img/ship/、img/ship.json，再建一次（05_img.js 只列 git 追蹤的圖）')
        msg = ['%s（%s）' % (k, w) for k, w in sorted(tbad.items())] + [x + '（多的）' for x in textra]
        if not msg:
            print('✓ 船型縮圖 %d 張跟核心的船檔、畫法 v%d 一樣' % (len(TS), tv))
        elif o.check:
            bad = True
            print('✗ 船型縮圖舊了：%s ⇒ python -I build.py --core … --thumbs' % '、'.join(msg[:8]) + ('…' if len(msg) > 8 else ''))
        else:
            print('⚠ 船型縮圖舊了：%s ⇒ 帶 --thumbs 重拍' % '、'.join(msg[:8]) + ('…' if len(msg) > 8 else ''))
    if not os.path.isfile(os.path.join(HERE, '.nojekyll')):
        print('⚠ 少了 .nojekyll（GitHub Pages 會先跑 Jekyll）')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
