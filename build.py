"""Sharkside（方舷放置）的建置：拿 Blockside 建好的成品（海戰核心）套 src/ 的外殼寫成 index.html，船檔、用到的海圖、圖示照抄一份
⇒ 這個資料夾整個就是網站（GitHub Pages：Deploy from a branch，main／根目錄）。

  python -I build.py --core <Blockside 的工作副本>           建：index.html、ships/、maps/、icons/
  python -I build.py --core <Blockside 的工作副本> --check   只比、不寫：跟那一份核心、src/ 對不上 ⇒ exit 1

· 核心要有外殼 API（Blockside 的 src/js/91_shellapi.js；說明在它的 src/CORE_API.md §7）。
· 套頁本身是 Blockside 的 admin.py shell：src/shell.json 沒寫 core ⇒ 套跑它的那一份的 index.html。
· 船檔照抄整個 ships/（入口記著船檔清單與雜湊，兩邊要是同一次建置的）；海圖只抄 src/js/10_data.js 的海域表寫到的（核心從頁面旁邊讀 maps/<名字>/）。
"""
import argparse
import filecmp
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
MANAGED = ('ships', 'maps', 'icons')                                 # 這三個資料夾整個照核心那一份（多的刪掉）
ICONS = ('apple-touch-icon.png',)


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
    for f in ICONS:
        W['icons/' + f] = os.path.join(core, 'icons', f)
    return W


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
    o = ap.parse_args()
    core = os.path.abspath(o.core)
    admin = os.path.join(core, 'src', 'admin.py')
    if not os.path.isfile(admin):
        sys.exit('✗ %s 不是 Blockside 的工作副本（沒有 src/admin.py）' % core)
    if not os.path.isfile(os.path.join(core, 'src', 'js', '91_shellapi.js')):
        sys.exit('✗ %s 的核心沒有外殼 API（src/js/91_shellapi.js）' % core)
    bad = False
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
            print('✓ ships/、maps/（%s）、icons/ 跟核心一樣（%d 個檔）' % ('、'.join(nm), len(W)))
    else:
        print('✓ ships/、maps/（%s）、icons/：%d 個檔，這次換了 %d 個、刪了 %d 個' % ('、'.join(nm), len(W), len(diff), len(extra)))
    if not os.path.isfile(os.path.join(HERE, '.nojekyll')):
        print('⚠ 少了 .nojekyll（GitHub Pages 會先跑 Jekyll）')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
