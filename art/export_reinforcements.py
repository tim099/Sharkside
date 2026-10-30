"""Mechanical packaging of image_gen originals for TASK-1132/1133; no artwork drawing."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,hashlib,shutil,re
ROOT=Path(__file__).resolve().parents[1]
G=Path('D:/Unity/Valhalla/ArtGallery')
N=Image.Resampling.NEAREST
NAVY='#061220';LIGHT='#f4f0e7'
FONT=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',23)
SMALL=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',17)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,p):p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def label(board,xy,s):ImageDraw.Draw(board).text(xy,s,font=SMALL,fill='#e8f4ff')
def put(board,im,xy,size,bg=None):
 im=im.resize((size,size),N)
 if bg:ImageDraw.Draw(board).rectangle((*xy,xy[0]+size-1,xy[1]+size-1),fill=bg)
 board.paste(im,xy,im)
records=[]
for batch in ('wpn','pups-chain'):
 here=ROOT/'art/evidence'/batch
 rows=json.loads((here/'inputs.json').read_text(encoding='utf-8'))
 expected={'wpn':{('wpn','keg')},'pups-chain':{('upg','pups'),('wpn','chain'),('ach','pup500')}}[batch]
 assert {(r['cat'],r['id']) for r in rows}==expected
 project=[f'art/evidence/{batch}/inputs.json'];gallery=[];exports=[]
 data=(ROOT/'src/js/10_data.js').read_text(encoding='utf-8')
 for r in rows:
  cat,key=r['cat'],r['id']
  table={'wpn':'WEAPONS','upg':'UPG','ach':'ACH'}[cat]
  section=data.split('I.'+table+' = [',1)[1].split('\n  ];',1)[0]
  assert re.search(r"\bid: '"+re.escape(key)+"'",section),(cat,key)
  original=Path(r['generated_path']);src=here/'source'/f'{cat}-{key}.png'
  src.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(original,src)
  prefix=f'RawImages/sirius_sharkside_{batch.replace("-","_")}_{cat}_{key}'
  shutil.copyfile(src,G/(prefix+'_source.png'));gallery.append(prefix+'_source.png')
  im=Image.open(src).convert('RGBA');white=Image.new('RGBA',im.size,'white');white.alpha_composite(im)
  save(white.convert('RGB'),G/(prefix+'_master.png'));gallery.append(prefix+'_master.png')
  im.putalpha(im.getchannel('A').point(lambda a:255 if a>=128 else 0))
  im=im.crop(im.getchannel('A').getbbox());im=ImageOps.contain(im,(104,104),N)
  out=Image.new('RGBA',(128,128));out.alpha_composite(im,((128-im.width)//2,(128-im.height)//2))
  dst=ROOT/'img'/cat/(key+'.png');assert not dst.exists() or Image.open(dst).convert('RGBA').tobytes()==out.tobytes(),'never replace a pre-existing final icon'
  save(out,dst);box=out.getchannel('A').getbbox()
  assert 0<max(box[2]-box[0],box[3]-box[1])<=104
  assert min(box[0],box[1],128-box[2],128-box[3])>=12
  assert all(v==0 for v in out.getchannel('A').histogram()[1:255])
  refs=[{'path':p,'sha256':sha(Path(p))} for p in r['refs']]
  pup_archive=ROOT/'art/evidence/pups-chain/source/upg-pups.png'
  for ref in refs:
   if pup_archive.exists() and ref['sha256']==sha(pup_archive):
    ref['archive']='art/evidence/pups-chain/source/upg-pups.png'
  exports.append({**r,'source':src.relative_to(ROOT).as_posix(),'source_sha256':sha(src),'output':dst.relative_to(ROOT).as_posix(),'output_sha256':sha(dst),'size':[128,128],'bbox':box,'alpha':[0,255],'references':refs})
  project += [src.relative_to(ROOT).as_posix(),dst.relative_to(ROOT).as_posix()]
 if batch=='wpn':
  board=Image.new('RGB',(1040,1070),NAVY)
  label(board,(18,15),'TASK-1132｜火藥桶：原寸、16～64px、旋轉與漂流桶對照')
  im=Image.open(ROOT/'img/wpn/keg.png').convert('RGBA')
  put(board,im,(20,65),256);put(board,im,(300,65),128,LIGHT)
  label(board,(300,210),'128px／淺底');label(board,(20,315),'256px／×2放大')
  for j,size in enumerate((16,20,32,40,52,64)):
   x=490+j*85;put(board,im,(x,70),size);put(board,im,(x,155),size,LIGHT);label(board,(x,235),str(size)+'px')
  label(board,(18,340),'45度間隔：64px與16px，另放大16px觀察（最近鄰；旋轉不裁切）')
  for j,angle in enumerate(range(0,360,45)):
   x=20+(j%4)*255;y=390+(j//4)*210
   rot=ImageOps.contain(im.rotate(angle,N,expand=True),(128,128),N)
   pad=Image.new('RGBA',(128,128));pad.alpha_composite(rot,((128-rot.width)//2,(128-rot.height)//2))
   put(board,pad,(x,y),64);put(board,pad,(x+90,y),16)
   tiny=pad.resize((16,16),N).resize((64,64),N);board.paste(tiny,(x+90,y+35),tiny)
   put(board,pad,(x+170,y+35),64,LIGHT);label(board,(x,y+130),str(angle)+'°')
  label(board,(18,850),'對照：新火藥桶（直立、引信、紅帶）／既有漂流桶（橫躺）')
  barrel=Image.open(ROOT/'img/loot/barrel.png').convert('RGBA')
  for j,ref in enumerate((im,barrel)):
   for k,size in enumerate((16,32,64)):
    put(board,ref,(30+j*500+k*100,905),size);put(board,ref,(30+j*500+k*100,990),size,LIGHT)
 else:
  board=Image.new('RGB',(1200,1120),NAVY)
  label(board,(18,15),'TASK-1133｜幼鯊、鏈彈與育幼徽章：原寸、顯示尺寸、深淺底與舊圖對照')
  comparisons={'pups':['upg/teeth'],'chain':['wpn/cannon','loot/arms'],'pup500':['ach/bite100','ach/pinas']}
  sizes={'pups':[14,20,32,40],'chain':[20,32,40],'pup500':[40]}
  for j,r in enumerate(exports):
   y=65+j*345;im=Image.open(ROOT/r['output']).convert('RGBA')
   put(board,im,(20,y),256);label(board,(20,y+265),r['cat']+'/'+r['id']+'／×2')
   put(board,im,(620,y),128);label(board,(620,y+130),'128px原寸')
   for k,s in enumerate(sizes[r['id']]):
    x=310+k*80;put(board,im,(x,y),s);put(board,im,(x,y+70),s,LIGHT);label(board,(x,y+130),str(s)+'px')
   native=min(sizes[r['id']]);zoom=im.resize((native,native),N).resize((native*4,native*4),N)
   board.paste(zoom,(310,y+165),zoom)
   ImageDraw.Draw(board).rectangle((500,y+165,500+zoom.width-1,y+165+zoom.height-1),fill=LIGHT);board.paste(zoom,(500,y+165),zoom)
   label(board,(760,y),'既有素材對照：')
   for k,key in enumerate(comparisons[r['id']]):
    ref=Image.open(ROOT/'img'/(key+'.png')).convert('RGBA');x=760+k*210
    put(board,ref,(x,y+40),128);put(board,ref,(x,y+190),40,LIGHT);label(board,(x,y+250),key)
 overview=here/'overview.png';save(board,overview);project.append(overview.relative_to(ROOT).as_posix())
 gp=f'RawImages/sirius_sharkside_{batch.replace("-","_")}.png';save(board,G/gp);gallery.append(gp)
 compare_paths=['loot/barrel'] if batch=='wpn' else ['upg/teeth','wpn/cannon','loot/arms','ach/bite100','ach/pinas']
 manifest={'task':rows[0]['task'],'author':'Sirius (Codex)','tool':'built-in image_gen','tool_parameters':{'transparent_background':True},'processing':'Generated artwork only. Binary alpha threshold128; nearest-neighbour contain within104px; mechanical layout/rotation for inspection only. No programmatic artwork drawing.','assets':exports,'comparison_references':[{'path':'img/'+key+'.png','sha256':sha(ROOT/'img'/(key+'.png'))} for key in compare_paths],'pending':['gura integration desktop/375px','gura missing-image fallback']}
 write(here/'generation.json',manifest);write(here/'prompts.json',{r['cat']+'/'+r['id']:r['prompt'] for r in rows})
 title='引信與鐵箍' if batch=='wpn' else '育幼與斷帆'
 paras=('直立的火藥桶把引信放在輪廓最高處，寬鐵箍與紅色識別帶讓它在木桶之間先露出危險的用途。桶身保留木材原色，讓海上水雷的紅燈與偏紅效果留給遊戲疊加。','同一張圖會在半空翻滾，也會縮成海上的水雷。圖板保留16到64px與八個45度角度，再與橫躺的漂流木桶對照；引信方向改變時，桶與鐵箍仍保留完整形狀。') if batch=='wpn' else ('幼鯊用完整的身體、三角背鰭與分叉尾巴交代種類，大眼和小尖牙留下幼年的表情。育幼徽章沿用同一隻小鯊魚，把牠放回銅環、青色底與小金星之中，和既有的單顆牙齒勳章分開。','鏈彈只留下兩顆鐵球和粗鏈節，沒有爆裂彈的火尾與金帶。幼鯊最小14px、鏈彈20px、徽章40px的深淺底檢視放在同一張圖板，並排比較現有牙齒、爆裂彈、軍火箱與成就。')
 fm={'title':'Sharkside：'+title,'description':f'TASK-{rows[0]["task"]} 原創像素美術與顯示尺寸檢視。','author':'Sirius (Codex)','note':'沿用Tim核准畫風；內建image_gen生成。遊戲整合與回退由gura驗收。'}
 text='---\n'+''.join(k+': '+json.dumps(v,ensure_ascii=False)+'\n' for k,v in fm.items())+'---\n\n# 🖼️ Sharkside：'+title+'\n\n'+'\n\n'.join(paras)+'\n\n'
 text+=f'交付128×128 RGBA，主體最大邊約104px、留邊至少12px、alpha只用0／255。完整來源、實際參考與SHA-256在Sharkside `art/evidence/{batch}/generation.json`。素材檢視與遊戲驗收分別留證，尚未代簽整合。\n\n## 實際提示詞\n\n```json\n'+json.dumps({r['cat']+'/'+r['id']:r['prompt'] for r in rows},ensure_ascii=False,indent=2)+'\n```\n\n'+f'![Sharkside：{title}](../{gp})\n'
 card=f'CanvasInterpretations/sirius_sharkside_{batch.replace("-","_")}.md';(G/card).write_text(text,encoding='utf-8');gallery.append(card)
 project += [f'art/evidence/{batch}/{name}' for name in ('generation.json','prompts.json','files.json')]
 write(here/'files.json',{'project':project,'gallery':gallery})
 records.extend(exports)
 print(json.dumps({'batch':batch,'count':len(exports),'size':[128,128],'alpha':[0,255],'data_ids_match':True}))
