"""Mechanical packaging for ART.md batches. No artwork is drawn by this script.
Usage: python art/export_remaining.py perk|region|sea|ach|loot|fx|key
"""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import hashlib,json,math,re,shutil,sys
ROOT=Path(__file__).resolve().parents[1]
GALLERY=Path('D:/Unity/Valhalla/ArtGallery')
BATCH=sys.argv[1];HERE=ROOT/'art/evidence'/BATCH
PLAN=json.loads((ROOT/'art/evidence/remaining-plan.json').read_text(encoding='utf-8'))
expected=[r for r in PLAN if r['batch']==BATCH]
records=json.loads((HERE/'inputs.json').read_text(encoding='utf-8'))
order={(r['cat'],r['id']):i for i,r in enumerate(expected)}
assert len(records)==len(expected)
assert set((r['cat'],r['id']) for r in records)==set(order)
records.sort(key=lambda r:order[r['cat'],r['id']])
TASK=records[0]['task'];N=Image.Resampling.NEAREST;NAVY='#061220'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,p):
    p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
def fit(im,size):return ImageOps.contain(im,size,N)
gallery_files=[];project_files=[];exports=[]
for rec in records:
    cat,key=rec['cat'],rec['id'];src=Path(rec['path'])
    if not src.is_absolute():src=ROOT/src
    assert src.exists(),src
    project_files += [str(src.relative_to(ROOT)),f'art/evidence/{BATCH}/records/{cat}-{key}.json']
    original=Image.open(src).convert('RGBA')
    prefix=f'RawImages/sirius_sharkside_{BATCH}_{cat}_{key}'
    raw=GALLERY/(prefix+'_source.png');shutil.copyfile(src,raw);gallery_files.append(str(raw.relative_to(GALLERY)))
    master=GALLERY/(prefix+'_master.png')
    if rec['transparent']:
        white=Image.new('RGBA',original.size,'white');white.alpha_composite(original);save(white.convert('RGB'),master)
    else:shutil.copyfile(src,master)
    gallery_files.append(str(master.relative_to(GALLERY)))
    size=tuple(rec['size']);kind=rec['kind']
    if kind in ('scene','banner'):
        opaque=Image.new('RGBA',original.size,NAVY);opaque.alpha_composite(original)
        game=ImageOps.fit(opaque.convert('RGB'),size,N,centering=(.5,.5))
    else:
        im=original.copy();im.putalpha(im.getchannel('A').point(lambda a:255 if a>=128 else 0))
        assert im.getchannel('A').getbbox(),(cat,key,'empty alpha')
        im=im.crop(im.getchannel('A').getbbox())
        maxsize=(104,104) if kind=='icon' else (size[0]-8,size[1]-8)
        im=fit(im,maxsize);game=Image.new('RGBA',size)
        game.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
        assert all(v==0 for v in game.getchannel('A').histogram()[1:255])
        if kind=='icon':
            x0,y0,x1,y1=game.getchannel('A').getbbox()
            assert 0<max(x1-x0,y1-y0)<=104 and min(x0,y0,size[0]-x1,size[1]-y1)>=12,(cat,key,(x0,y0,x1,y1))
        if kind=='frame':assert game.getpixel((size[0]//2,size[1]//2))[3]==0,(key,'frame center not transparent')
    dst=ROOT/'img'/cat/(key+'.png');save(game,dst);project_files.append(str(dst.relative_to(ROOT)))
    exports.append({**rec,'path':str(src.relative_to(ROOT)),'source_sha256':sha(src),
        'white_master_sha256':sha(master),'output':str(dst.relative_to(ROOT)),
        'output_sha256':sha(dst),'actual_size':game.size,
        'alpha_extrema':game.convert('RGBA').getchannel('A').getextrema(),
        'references':[{'path':p,'sha256':sha(Path(p))} for p in rec['refs']]})
for cat in set(r['cat'] for r in expected):
    assert sorted(p.stem for p in (ROOT/'img'/cat).glob('*.png'))==sorted(r['id'] for r in expected if r['cat']==cat)
# Check the tables whose ids are explicitly stored in 10_data.js, through a separate read.
data=(ROOT/'src/js/10_data.js').read_text(encoding='utf-8')
for cat,table in [('buff','BUFF'),('bless','BLESS'),('doctrine','DOCTRINE'),('ach','ACH')]:
    ids=[r['id'] for r in expected if r['cat']==cat]
    if ids:
        section=data.split('I.'+table+' = [',1)[1].split('\n  ];',1)[0]
        assert sorted(re.findall(r"\bid: '([^']+)'",section))==sorted(ids)
font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',22)
small=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',16)
cols=2 if BATCH in ('region','key') else 3;cw=520 if cols==2 else 360;ch=440
def board_for(rows,label):
    board=Image.new('RGB',(cols*cw,80+math.ceil(len(rows)/cols)*ch),NAVY);d=ImageDraw.Draw(board)
    d.text((16,12),f'Sharkside｜TASK-{TASK}｜{BATCH}｜{label}',font=font,fill='#e8f4ff')
    d.text((16,45),'原寸或等比預覽／顯示尺寸／深底・淺底對照（最近鄰）',font=small,fill='#8fb0c8')
    for j,r in enumerate(rows):
        x=(j%cols)*cw;y=80+(j//cols)*ch;im=Image.open(ROOT/r['output']).convert('RGBA')
        thumb=fit(im,(cw-32,264));board.paste(thumb,(x+(cw-thumb.width)//2,y),thumb)
        d.text((x+12,y+272),r['cat']+'/'+r['id'],font=font,fill='#ffd166')
        if r['kind']=='icon':
            sizes=r['preview'];native=min(sizes)
            for k,s in enumerate(sizes):
                tiny=im.resize((s,s),N);board.paste(tiny,(x+250+k*60,y+272),tiny)
            zoom=im.resize((native,native),N).resize((native*3,native*3),N)
            board.paste(zoom,(x+12,y+310),zoom)
            d.rectangle((x+185,y+310,x+184+zoom.width,y+309+zoom.height),fill='#f4f0e7')
            board.paste(zoom,(x+185,y+310),zoom)
        elif r['transparent']:
            tiny=fit(im,(150,116));d.rectangle((x+185,y+310,x+334,y+425),fill='#f4f0e7');board.paste(tiny,(x+185,y+310),tiny)
        else:
            mobile=ImageOps.fit(im,(min(375,cw-30),116),N,centering=(.5,.5))
            board.paste(mobile,(x+12,y+310),mobile)
    return board
full=board_for(exports,'全組');save(full,HERE/'overview.png');save(full,GALLERY/f'RawImages/sirius_sharkside_{BATCH}.png')
project_files.append(f'art/evidence/{BATCH}/overview.png');gallery_files.append(f'RawImages/sirius_sharkside_{BATCH}.png')
for i in range(0,len(exports),6):
    page=i//6+1;im=board_for(exports[i:i+6],f'檢視{page}')
    local=HERE/'review'/f'page-{page:02}.png';save(im,local);project_files.append(str(local.relative_to(ROOT)))
    gp=f'RawImages/sirius_sharkside_{BATCH}_review_{page:02}.png';save(im,GALLERY/gp);gallery_files.append(gp)
if BATCH=='fx':
    top=Image.open(ROOT/'img/fx/jaw-top.png').convert('RGBA');bottom=Image.open(ROOT/'img/fx/jaw-bottom.png').convert('RGBA')
    proof=Image.new('RGBA',(512,240),NAVY);proof.alpha_composite(top,(0,0));proof.alpha_composite(bottom,(0,48))
    save(proof,HERE/'jaw-closed.png');save(proof,GALLERY/'RawImages/sirius_sharkside_fx_jaw_closed.png')
    project_files.append('art/evidence/fx/jaw-closed.png');gallery_files.append('RawImages/sirius_sharkside_fx_jaw_closed.png')
    (HERE/'jaw-alignment.json').write_text(json.dumps({'native_width':512,'top':[0,0],'bottom':[0,48],'canvas':[512,240],'note':'Selected closer positioning after comparing offsets64/48/32/16. Small central tooth gaps remain; final full-screen closure criterion is pending gura animation review, not signed by art.'},indent=2)+'\n',encoding='utf-8')
    project_files.append('art/evidence/fx/jaw-alignment.json')
manifest={'task':TASK,'author':'Sirius (Codex)','tool':'built-in image_gen','assets':exports,
 'processing':'Icons binary alpha and nearest-neighbour contain; transparent frame/effect contain with4px margin; opaque scenes center-cropped without distortion. All creative artwork comes from image_gen.',
 'pending':['gura desktop/375px integration','missing-image fallback after integration']}
(HERE/'generation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'prompts.json').write_text(json.dumps({r['cat']+'/'+r['id']:r['prompt'] for r in records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
project_files += [f'art/evidence/{BATCH}/inputs.json',f'art/evidence/{BATCH}/generation.json',f'art/evidence/{BATCH}/prompts.json',f'art/evidence/{BATCH}/files.json']
(HERE/'files.json').write_text(json.dumps({'project':project_files,'gallery':gallery_files},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'batch':BATCH,'task':TASK,'assets':len(exports),'project_files':len(project_files),'gallery_files':len(gallery_files),'review_pages':math.ceil(len(exports)/6)}))
