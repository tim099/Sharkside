"""Package the approved character and image_gen facial edits; mechanical export only.
The approved cutout alpha is retained as the shared silhouette, removing generated
background haze without painting character pixels or replacing facial RGB data.
"""
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFont
import hashlib,json,shutil,re
ROOT=Path(__file__).resolve().parents[1]
HERE=ROOT/'art/evidence/mascot'
GALLERY=Path('D:/Unity/Valhalla/ArtGallery')
N=Image.Resampling.NEAREST
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,p):
    p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
def archive(rec,key):
    src=HERE/'source'/(key+'.png');src.parent.mkdir(parents=True,exist_ok=True)
    original=Path(rec['path']);original=original if original.is_absolute() else ROOT/original
    if original.resolve()!=src.resolve():shutil.copyfile(original,src)
    rec.setdefault('generated_path',rec['path']);rec['path']=str(src.relative_to(ROOT))
    raw=GALLERY/'RawImages'/f'sirius_sharkside_mascot_{key}_source.png';shutil.copyfile(src,raw)
    return src
def reference_hashes(rec):
    return [{'path':p,'sha256':sha(Path(p) if Path(p).exists() else HERE/'source/approved.png')} for p in rec.get('refs',[])]
data=json.loads((HERE/'inputs.json').read_text(encoding='utf-8'))
concepts=[]
for rec in data['concepts']:
    src=archive(rec,rec['id']);im=Image.open(src).convert('RGBA')
    white=Image.new('RGBA',im.size,'white');white.alpha_composite(im)
    master=GALLERY/'RawImages'/f'sirius_sharkside_mascot_{rec["id"]}_master.png';save(white.convert('RGB'),master)
    concepts.append({**rec,'source_sha256':sha(src),'white_master_sha256':sha(master),'references':reference_hashes(rec)})
approved=HERE/'source/approved.png'
base=Image.open(approved).convert('RGBA')
assert base.size==(1024,1536)
records=[{**data['approved'],'path':str(approved),'id':'normal'}]+data['expressions']
out=[]
for rec in records:
    key=rec['id'];src=archive(rec,key);im=Image.open(src).convert('RGBA')
    if im.size!=(1024,1536):im=im.resize((1024,1536),N)
    dst=ROOT/'img/mascot'/(key+'.png');dst.parent.mkdir(parents=True,exist_ok=True)
    if key=='normal':
        # The user-provided approved PNG is the actual normal deliverable, unchanged.
        shutil.copyfile(approved,dst);im=base.copy()
    else:
        im.putalpha(ImageChops.darker(im.getchannel('A'),base.getchannel('A')))
        save(im,dst)
        leak=ImageChops.multiply(im.getchannel('A'),base.getchannel('A').point(lambda a:255 if a==0 else 0))
        assert leak.getbbox() is None
    white=Image.new('RGBA',im.size,'white');white.alpha_composite(im)
    master=GALLERY/'RawImages'/f'sirius_sharkside_mascot_{key}_master.png';save(white.convert('RGB'),master)
    out.append({**rec,'source_sha256':sha(src),'output':str(dst.relative_to(ROOT)),'output_sha256':sha(dst),
                'white_master_sha256':sha(master),'size':im.size,'alpha_extrema':im.getchannel('A').getextrema(),'references':reference_hashes(rec)})
assert sha(ROOT/'img/mascot/normal.png')==sha(approved)
assert sorted(p.stem for p in (ROOT/'img/mascot').glob('*.png'))==['angry','flustered','normal','smug']
font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',23)
small=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',17)
board=Image.new('RGB',(1120,920),'#061220');d=ImageDraw.Draw(board)
d.text((20,16),'Sharkside｜TASK-1129｜日系可愛鯊魚船長・Sirius',font=font,fill='#e8f4ff')
d.text((20,50),'Tim選定紫髮羅盤款｜名字由gura決定｜全身、表情與淺底透明邊界',font=small,fill='#8fb0c8')
for j,(key,label) in enumerate([('normal','正常'),('smug','得意'),('angry','生氣'),('flustered','害羞')]):
    x=j*280;im=Image.open(ROOT/'img/mascot'/(key+'.png')).convert('RGBA')
    thumb=im.resize((256,384),N);board.paste(thumb,(x+12,80),thumb)
    d.text((x+20,477),key+'／'+label,font=font,fill='#ffd166')
    face=im.crop((280,90,790,410)).resize((255,160),N)
    d.rectangle((x+12,515,x+266,674),fill='#f4f0e7');board.paste(face,(x+12,515),face)
    light=im.resize((128,192),N);d.rectangle((x+76,700,x+203,891),fill='#f4f0e7');board.paste(light,(x+76,700),light)
save(board,HERE/'overview.png');save(board,GALLERY/'RawImages/sirius_sharkside_mascot.png')
concept_board=Image.new('RGB',(960,600),'#061220');cd=ImageDraw.Draw(concept_board)
cd.text((16,12),'TASK-1129 三個日系可愛鯊魚概念｜Tim已選B款',font=font,fill='#e8f4ff')
for j,rec in enumerate(data['concepts']):
    im=Image.open(ROOT/rec['path']).convert('RGBA');im.thumbnail((304,510),N)
    concept_board.paste(im,(j*320+(320-im.width)//2,55),im)
    cd.text((j*320+20,567),chr(65+j)+('（已選）' if j==1 else '（未選）'),font=font,fill='#ffd166')
save(concept_board,HERE/'concepts.png');save(concept_board,GALLERY/'RawImages/sirius_sharkside_mascot_concepts.png')
manifest={'task':1129,'author':'Sirius (Codex)','tool':'built-in image_gen',
 'style_request':data['style_request'],'selected':'concept-b-v2','name':data['name'],
 'naming_authority':'Tim explicitly delegated naming to gura in this chat',
 'approved_upload_sha256':sha(approved),'concepts':concepts,'assets':out,
 'processing':'normal copied byte-for-byte from approved upload. Expression RGB is image_gen output; alpha is intersection with the approved cutout alpha. No facial drawing or body RGB compositing in the script.',
 'pending':['gura chooses name','gura desktop/375px integration','missing-mascot fallback']}
(HERE/'generation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'inputs.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'prompts.json').write_text(json.dumps({'concepts':{r['id']:r['prompt'] for r in data['concepts']},'expressions':{r['id']:r['prompt'] for r in records}},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert not any(re.search(r'gawr|gura|hololive|vtuber',r['prompt'],re.I) for r in data['concepts']+records)
project=['art/export_mascot.py','art/evidence/mascot/source/approved.png']
gallery=['Portraits/sirius_sharkside_mascot.md','RawImages/sirius_sharkside_mascot.png','RawImages/sirius_sharkside_mascot_concepts.png']
for key in [r['id'] for r in data['concepts']]+['normal','smug','angry','flustered']:
    project.append('art/evidence/mascot/source/'+key+'.png')
    gallery.extend(['RawImages/sirius_sharkside_mascot_'+key+'_source.png','RawImages/sirius_sharkside_mascot_'+key+'_master.png'])
project += ['img/mascot/'+key+'.png' for key in ('normal','smug','angry','flustered')]
project += ['art/evidence/mascot/'+name for name in ('inputs.json','generation.json','prompts.json','overview.png','concepts.png','files.json')]
(HERE/'files.json').write_text(json.dumps({'project':project,'gallery':gallery},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'count':4,'size':[1024,1536],'normal_unchanged':True,'outside_approved_silhouette_alpha':0}))
