"""Export image_gen sources into native-size PNGs and reproducible review boards.
Only mechanical alpha/size conversion; never generates or redraws artwork.
Usage: python art/export_icons.py ui|upg
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, shutil, sys, re

ROOT = Path(__file__).resolve().parents[1]
GALLERY = Path('D:/Unity/Valhalla/ArtGallery')
BATCH = sys.argv[1]
EXPECTED = {'ui': ['blocks','shards','mul','speed','cam','sound','mute','settings','sail'],
            'upg': ['gun','reload','powder','hull','pump','sail','value','bounty','fear','teeth']}[BATCH]
TASK = {'ui':1118,'upg':1119}[BATCH]
HERE = ROOT/'art/evidence'/BATCH
HERE.mkdir(parents=True,exist_ok=True)
N = Image.Resampling.NEAREST
NAVY = '#061220'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,p):
    p.parent.mkdir(parents=True,exist_ok=True)
    im.save(p)
def meta(p):
    im=Image.open(p).convert('RGBA')
    return {'path':str(p), 'sha256':digest(p), 'size':im.size}

records=json.loads((HERE/'inputs.json').read_text(encoding='utf-8'))
out=[]
for key in EXPECTED:
    if BATCH=='upg' and key in ('gun','hull','teeth'):
        p=ROOT/'img/upg'/(key+'.png')
        out.append({'id':key,'reused_from':'TASK-1117','output':meta(p),
                    'evidence':'art/evidence/style/generation.json'})
        continue
    rec=next(x for x in records if x['id']==key)
    source=HERE/'source'/(key+'.png')
    source.parent.mkdir(parents=True,exist_ok=True)
    if Path(rec['path']).resolve()!=source.resolve(): shutil.copyfile(rec['path'],source)
    im=Image.open(source).convert('RGBA')
    raw=GALLERY/'RawImages'/f'sirius_sharkside_{BATCH}_{key}_generated.png'
    shutil.copyfile(source,raw)
    white=Image.new('RGBA',im.size,'white')
    white.alpha_composite(im)
    save(white.convert('RGB'),GALLERY/'RawImages'/f'sirius_sharkside_{BATCH}_{key}_master.png')
    im.putalpha(im.getchannel('A').point(lambda a: 255 if a>=128 else 0))
    im=im.crop(im.getchannel('A').getbbox())
    im.thumbnail((104,104),N)
    game=Image.new('RGBA',(128,128))
    game.alpha_composite(im,((128-im.width)//2,(128-im.height)//2))
    p=ROOT/'img'/BATCH/(key+'.png')
    save(game,p)
    rec={**rec,'path':str(source.relative_to(ROOT)), 'source':meta(source),'output':meta(p),
         'references':[{'path':r,'sha256':digest(Path(r))} for r in rec['refs']]}
    out.append(rec)

font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',22)
small=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',16)
cols=3 if BATCH=='ui' else 5
rows=(len(EXPECTED)+cols-1)//cols
cw,ch=300,330
board=Image.new('RGB',(cols*cw,rows*ch+100),NAVY)
d=ImageDraw.Draw(board)
d.text((20,15),f'Sharkside｜TASK-{TASK}｜{BATCH}・Sirius',font=font,fill='#e8f4ff')
tiny_sizes=[18,24] if BATCH=='ui' else [32,40]
d.text((20,50),'128px 原寸／'+'、'.join(map(str,tiny_sizes))+'px 原寸／最小尺寸放大 ×4',font=small,fill='#8fb0c8')
checks=[]
for j,key in enumerate(EXPECTED):
    x,y=(j%cols)*cw,(j//cols)*ch+95
    im=Image.open(ROOT/'img'/BATCH/(key+'.png')).convert('RGBA')
    assert im.size==(128,128)
    hist=im.getchannel('A').histogram()
    assert all(n==0 for n in hist[1:255])
    box=im.getchannel('A').getbbox()
    x0,y0,x1,y1=box
    assert max(x1-x0,y1-y0)==104 and min(x0,y0,128-x1,128-y1)>=12
    board.paste(im,(x+86,y),im)
    d.text((x+20,y+132),key,font=font,fill='#ffd166')
    for k,size in enumerate(tiny_sizes):
        thumb=im.resize((size,size),N)
        px=x+130+k*65
        board.paste(thumb,(px,y+136),thumb)
    thumb=im.resize((tiny_sizes[0],tiny_sizes[0]),N)
    zoom=thumb.resize((tiny_sizes[0]*4,tiny_sizes[0]*4),N)
    zy=y+190
    board.paste(zoom,(x+10,zy),zoom)
    d.rectangle((x+155,zy,x+155+zoom.width-1,zy+zoom.height-1),fill='#f4f0e7')
    board.paste(zoom,(x+155,zy),zoom)
    checks.append({'id':key,'size':[128,128],'alpha_values':[0,255],'bbox':box,
                   'native_preview_sizes':tiny_sizes,'sha256':digest(ROOT/'img'/BATCH/(key+'.png'))})
save(board,HERE/'overview.png')
save(board,GALLERY/'RawImages'/f'sirius_sharkside_{BATCH}.png')
actual=sorted(p.stem for p in (ROOT/'img'/BATCH).glob('*.png'))
assert actual==sorted(EXPECTED),(actual,EXPECTED)
if BATCH=='upg':
    data=(ROOT/'src/js/10_data.js').read_text(encoding='utf-8')
    table=data.split('I.UPG = [',1)[1].split('\n  ];',1)[0]
    ids=re.findall(r"\bid: '([^']+)'",table)
    assert sorted(ids)==actual,('UPG data ids differ',ids,actual)
manifest={'task':TASK,'author':'Sirius (Codex)','tool':'built-in image_gen',
          'approved_style':'Tim 2026-10-30: 這版畫風可以，繼續做1116後面的美術任務 GO',
          'processing':'Nearest-neighbour resize, alpha threshold 128; exact generated sources retained. White masters are separate composites.',
          'assets':out,'checks':checks,'expected_ids':EXPECTED,
          'pending':['gura game integration at desktop and 375px','missing-image fallback after integration']}
(HERE/'generation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
prompts={r['id']:r['prompt'] for r in records}
(HERE/'prompts.json').write_text(json.dumps(prompts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'batch':BATCH,'count':len(actual),'ids_match':True,'alpha':'0/255','max_extent':104,'min_margin':12}))
