"""Mechanical export only: generated pixels remain the source of all artwork.
Run with Python + Pillow. No drawing, segmentation or generative edits here.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
GALLERY = Path('D:/Unity/Valhalla/ArtGallery')
NAVY = '#061220'
NEAREST = Image.Resampling.NEAREST

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)

def fit(im, size):
    im = im.copy()
    im.thumbnail(size, NEAREST)
    return im

sources = {}
outputs = []
for key in ('app', 'logo', 'gun', 'hull', 'teeth'):
    p = HERE / 'source' / (key + '.png')
    im = Image.open(p).convert('RGBA')
    sources[key] = {'path': str(p.relative_to(ROOT)), 'sha256': sha(p), 'size': im.size}
    # Preserve original output byte-for-byte; white master is a separate composite.
    raw = GALLERY / 'RawImages' / f'sirius_sharkside_style_{key}_generated.png'
    raw.write_bytes(p.read_bytes())
    white = Image.new('RGBA', im.size, 'white')
    white.alpha_composite(im)
    save(white.convert('RGB'), GALLERY / 'RawImages' / f'sirius_sharkside_style_{key}_master.png')

app = Image.open(HERE / 'source/app.png').convert('RGBA').resize((1024, 1024), NEAREST)
save(app, HERE / 'app-master-1024.png')
for name, size in [('apple-touch-icon', 180), ('icon-192', 192), ('icon-512', 512), ('favicon-32', 32)]:
    p = ROOT / 'img/app' / (name + '.png')
    save(app.resize((size, size), NEAREST).convert('RGB'), p)
    outputs.append(p)
# Inscribe the entire source square in the required 80%-diameter safe circle.
# 280*sqrt(2)/512 = .7734 < .8, even its corners are protected.
mask = Image.new('RGBA', (512, 512), NAVY)
mask.alpha_composite(app.resize((280, 280), NEAREST), (116, 116))
p = ROOT / 'img/app/icon-maskable-512.png'
save(mask.convert('RGB'), p)
outputs.append(p)

logo = Image.open(HERE / 'source/logo.png').convert('RGBA')
logo = fit(logo.crop(logo.getchannel('A').getbbox()), (1160, 320))
out = Image.new('RGBA', (1200, 360))
out.alpha_composite(logo, ((1200-logo.width)//2, (360-logo.height)//2))
p = ROOT / 'img/app/logo.png'
save(out, p)
outputs.append(p)

for key in ('gun', 'hull', 'teeth'):
    im = Image.open(HERE / 'source' / (key + '.png')).convert('RGBA')
    # Alpha comes from image_gen, never infer it from white/light material colours.
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    im = fit(im.crop(im.getchannel('A').getbbox()), (104, 104))
    out = Image.new('RGBA', (128, 128))
    out.alpha_composite(im, ((128-im.width)//2, (128-im.height)//2))
    p = ROOT / 'img/upg' / (key + '.png')
    save(out, p)
    outputs.append(p)

font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 25)
small = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 19)
board = Image.new('RGB', (1100, 1000), NAVY)
d = ImageDraw.Draw(board)
d.text((36, 18), 'Sharkside｜TASK-1117 畫風樣張・Sirius', font=font, fill='#e8f4ff')
logo = Image.open(ROOT / 'img/app/logo.png').convert('RGBA')
board.paste(logo.resize((600, 180), NEAREST), (270, 55), logo.resize((600, 180), NEAREST))
for x, name, label in [(40, 'icon-512', 'App'), (290, 'icon-maskable-512', 'Maskable／安全區'), (560, 'favicon-32', 'Favicon 32px ×6')]:
    im = Image.open(ROOT / 'img/app' / (name + '.png')).convert('RGBA')
    size = 200 if name != 'favicon-32' else 192
    board.paste(im.resize((size, size), NEAREST), (x, 250))
    d.text((x, 458), label, font=small, fill='#8fb0c8')
logo_small = Image.open(ROOT / 'img/app/logo.png').convert('RGBA').resize((300, 90), NEAREST)
board.paste(logo_small, (780, 300), logo_small)
d.text((780, 405), '字標 300px 實際大小', font=small, fill='#8fb0c8')
d.text((36, 505), '128px 原寸｜下一列：32px 原寸＋放大 ×4（深底／淺底）', font=small, fill='#8fb0c8')
for i, (key, label) in enumerate([('gun', '砲術訓練 gun'), ('hull', '船殼加固 hull'), ('teeth', '鯊魚利齒 teeth')]):
    x = 60 + i * 355
    im = Image.open(ROOT / 'img/upg' / (key + '.png')).convert('RGBA')
    board.paste(im, (x+80, 550), im)
    d.text((x+45, 685), label, font=small, fill='#e8f4ff')
    tiny = im.resize((32, 32), NEAREST)
    board.paste(tiny, (x+124, 722), tiny)
    zoom = tiny.resize((128, 128), NEAREST)
    board.paste(zoom, (x, 780), zoom)
    d.rectangle((x+155, 780, x+282, 907), fill='#f4f0e7')
    board.paste(zoom, (x+155, 780), zoom)
d.text((36, 950), '素材提案｜尚待 Tim 定畫風；遊戲整合與 iPhone 驗收由 gura 簽核', font=small, fill='#ffd166')
save(board, HERE / 'overview.png')
save(board, GALLERY / 'RawImages/sirius_sharkside_style.png')

metrics = []
for p in outputs:
    im = Image.open(p).convert('RGBA')
    alphas = sorted(set(im.getchannel('A').getdata()))
    metrics.append({'path': str(p.relative_to(ROOT)), 'sha256': sha(p), 'size': im.size,
                    'alpha_values': alphas, 'bbox': im.getchannel('A').getbbox()})
    if p.parent.name == 'upg':
        assert im.size == (128, 128) and alphas == [0, 255]
        x0,y0,x1,y1 = im.getchannel('A').getbbox()
        assert max(x1-x0, y1-y0) == 104 and min(x0,y0,128-x1,128-y1) >= 12
refs = [GALLERY / 'RawImages' / f'sirius_blocksail_goods_batch3_{n}_master.png' for n in ('tools','ironware')]
manifest = {'task': 1117, 'author': 'Sirius (Codex)', 'tool': 'built-in image_gen',
    'prompts': json.loads((HERE/'prompts.json').read_text(encoding='utf-8')),
    'references': [{'path': str(p), 'sha256': sha(p)} for p in refs],
    'reference_roles': {'app':['tools','ironware'], 'gun':['tools','ironware'], 'hull':['tools','ironware'], 'teeth':['tools','ironware'], 'logo':['tools']},
    'sources': sources, 'outputs': metrics,
    'processing': 'Mechanical nearest-neighbour resizing and alpha threshold 128 only. Generated transparent sources preserved. White masters are separate composites; app source is opaque.',
    'maskable_safe_square': [116,116,396,396], 'maskable_max_corner_radius': (140**2*2)**.5,
    'maskable_safe_radius': 204.8,
    'pending': ['Tim style approval', 'gura integration and iPhone home-screen check', 'fallback check after integration']}
(HERE/'generation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'assets': len(outputs), 'icon_alpha': '0/255', 'max_icon_side': 104, 'maskable_corner_radius': manifest['maskable_max_corner_radius'], 'safe_radius':204.8}, ensure_ascii=False))
