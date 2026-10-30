"""Mechanical image_gen icon exports for multi-directory batches; no artwork drawing.
python art/export_icon_set.py tech|abil
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib,json,re,shutil,sys
ROOT=Path(__file__).resolve().parents[1]
GALLERY=Path('D:/Unity/Valhalla/ArtGallery')
BATCH=sys.argv[1]
HERE=ROOT/'art/evidence'/BATCH
TASK={'tech':1120,'abil':1121}[BATCH]
EXPECTED={'tech':{'tech':['trident','coral','current','dream','chest','yard','tide','instinct','mate']},
          'abil':{'abil':['volley','frenzy','mega','repair'],'wpn':['fire','cannon']}}[BATCH]
N=Image.Resampling.NEAREST
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,p):
    p.parent.mkdir(parents=True,exist_ok=True)
    im.save(p)
records=json.loads((HERE/'inputs.json').read_text(encoding='utf-8'))
records.sort(key=lambda r:(list(EXPECTED).index(r['cat']),EXPECTED[r['cat']].index(r['id'])))
data=(ROOT/'src/js/10_data.js').read_text(encoding='utf-8')
for cat,ids in EXPECTED.items():
    table={'tech':'TECH','abil':'ABIL','wpn':'WEAPONS'}[cat]
    section=data.split('I.'+table+' = [',1)[1].split('\n  ];',1)[0]
    assert sorted(re.findall(r"\bid: '([^']+)'",section))==sorted(ids)
    assert sorted(r['id'] for r in records if r['cat']==cat)==sorted(ids)
exports=[]
for rec in records:
    cat,key=rec['cat'],rec['id']
    src=HERE/'source'/f'{cat}-{key}.png'
    src.parent.mkdir(parents=True,exist_ok=True)
    original=Path(rec['path'])
    if not original.is_absolute(): original=ROOT/original
    if original.resolve()!=src.resolve(): shutil.copyfile(original,src)
    rec.setdefault('generated_path',rec['path'])
    rec['path']=str(src.relative_to(ROOT))
    raw=GALLERY/'RawImages'/f'sirius_sharkside_{BATCH}_{cat}_{key}_generated.png'
    shutil.copyfile(src,raw)
    im=Image.open(src).convert('RGBA')
    white=Image.new('RGBA',im.size,'white');white.alpha_composite(im)
    save(white.convert('RGB'),GALLERY/'RawImages'/f'sirius_sharkside_{BATCH}_{cat}_{key}_master.png')
    im.putalpha(im.getchannel('A').point(lambda a:255 if a>=128 else 0))
    im=im.crop(im.getchannel('A').getbbox());im.thumbnail((104,104),N)
    out=Image.new('RGBA',(128,128));out.alpha_composite(im,((128-im.width)//2,(128-im.height)//2))
    dst=ROOT/'img'/cat/(key+'.png');save(out,dst)
    x0,y0,x1,y1=out.getchannel('A').getbbox()
    assert max(x1-x0,y1-y0)==104 and min(x0,y0,128-x1,128-y1)>=12
    assert all(v==0 for v in out.getchannel('A').histogram()[1:255])
    exports.append({**rec,'path':str(src.relative_to(ROOT)),'source_sha256':sha(src),
        'output':str(dst.relative_to(ROOT)),'output_sha256':sha(dst),'size':[128,128],
        'bbox':[x0,y0,x1,y1],'alpha':[0,255],
        'references':[{'path':p,'sha256':sha(Path(p))} for p in rec['refs']]})
for cat,ids in EXPECTED.items():
    assert sorted(p.stem for p in (ROOT/'img'/cat).glob('*.png'))==sorted(ids)

cols=3;cw=360;ch=340;rows=(len(records)+cols-1)//cols
board=Image.new('RGB',(cols*cw,100+rows*ch),'#061220');d=ImageDraw.Draw(board)
font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',22)
small=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',17)
d.text((20,15),f'Sharkside｜TASK-{TASK}｜{BATCH}・Sirius',font=font,fill='#e8f4ff')
d.text((20,52),'128px原寸／實際顯示尺寸／最小尺寸放大 ×3（深底／淺底）',font=small,fill='#8fb0c8')
for j,rec in enumerate(records):
    cat,key=rec['cat'],rec['id'];x=(j%cols)*cw;y=100+(j//cols)*ch
    im=Image.open(ROOT/'img'/cat/(key+'.png')).convert('RGBA')
    board.paste(im,(x+106,y),im)
    sizes={'tech':[32,40],'abil':[44,56],'wpn':[20,40]}[cat]
    d.text((x+12,y+140),cat+'/'+key,font=font,fill='#ffd166')
    for k,size in enumerate(sizes):
        tiny=im.resize((size,size),N);board.paste(tiny,(x+205+k*65,y+135),tiny)
    tiny=im.resize((sizes[0],sizes[0]),N).resize((sizes[0]*3,sizes[0]*3),N)
    board.paste(tiny,(x+15,y+205),tiny)
    d.rectangle((x+190,y+205,x+190+tiny.width-1,y+205+tiny.height-1),fill='#f4f0e7')
    board.paste(tiny,(x+190,y+205),tiny)
save(board,HERE/'overview.png');save(board,GALLERY/'RawImages'/f'sirius_sharkside_{BATCH}.png')
manifest={'task':TASK,'author':'Sirius (Codex)','tool':'built-in image_gen',
 'style_approval':'Tim 2026-10-30 approved TASK-1117 overview',
 'processing':'Nearest-neighbour resizing and alpha threshold128 only; preserve exact generated source and a separate white composite master.',
 'expected':EXPECTED,'assets':exports,
 'pending':['gura integration desktop/375px','missing-image fallback after integration']}
(HERE/'inputs.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'generation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'prompts.json').write_text(json.dumps({r['cat']+'/'+r['id']:r['prompt'] for r in records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'task':TASK,'count':len(records),'data_ids_match':True,'size':[128,128],'alpha':[0,255],'extent':104,'margin':12}))
