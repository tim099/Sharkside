"""Write authored exhibit text with the actual recorded generation prompts."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
GALLERY=Path('D:/Unity/Valhalla/ArtGallery')
entries={
 'perk':('卡片、祝福與戰利品',1122,'三種稀有度保留同樣的卡框輪廓，讓邊框材質與裝飾逐級增加。中央透明區留給遊戲文字；增益與祝福則用單一主物件交代效果，在小尺寸仍能辨認。','卡框之外，八種增益、三種祝福與兩種戰利品／冷卻提示各有自己的剪影。海色維持冷底，金屬與木頭延續核准的暖色高光。'),
 'region':('十片海域',1123,'十枚海域徽章各自抓住一個地標或天候，從港口到冰海，先在小徽章裡建立形狀與配色，再延伸成同海域的橫幅。徽章負責辨識，橫幅提供航行的環境。','橫幅的構圖留出中央可用區，避免小尺寸徽章被誤當成風景縮圖。每組都保存自己的原稿與參考關係，讓徽章與橫幅的對應可追查。'),
 'sea':('浪、霧與戰術',1124,'九種海況在浪、旗、木板與火藥之間換出不同輪廓。晴浪的金色圓面、濃霧裡的帆與漂流的殘骸，都以少量大形狀保住二十多像素時的提示作用。','五種戰術另用向下的箭頭、天平、斷桅斧、雙刀與骰子留下差異。深色背景上的亮海水與暖金屬相互分開，也在淺底上檢查透明輪廓。'),
 'ach':('航海勳章與委託',1125,'三十五枚成就依家族保留主題，層級提高時增加材質與輪廓上的榮譽，而非只換顏色。砲擊、航行、財富與生存各自留下可辨識的象徵。','八枚委託圖示延續同一套木、鐵與金色筆觸。圖板把原稿、遊戲尺寸與深淺底放在一起，檢查家族差異與單枚縮小後的辨識度。'),
 'loot':('海上拾獲物',1126,'五種拾獲物使用可辨識的容器或殘骸，物件的開口、金屬箍帶與內容物先交代用途，再用光色帶出價值。斜向木料與箱子的方形輪廓分開，避免所有拾獲物都變成同一顆亮點。','每件都獨立生成透明原稿，再以最近鄰取樣整理成原生尺寸。亮底檢視用來找出暗部邊緣與透明區殘影。'),
 'fx':('巨齒與狂潮',1127,'上下顎分成兩張獨立素材，保留齒列與牙齦的厚度；配對檢視圖記錄它們的定位方式。大特效的輪廓延續圖示的海色與象牙色，但讓動作面積更容易閱讀。','其餘特效用背鰭與巨鯊的主輪廓交代方向。素材本身的檢視與遊戲動態整合分別記錄；覆蓋介面與動畫時序由遊戲整合驗收。'),
 'key':('啟航與歸港',1128,'四張主視覺把海水、帆船與巨鯊放進同一個冒險世界。夕光與深藍海面建立冷暖層次，中央天空留給標題與遊戲訊息。','主視覺以完整場景生成，依交付比例裁切而不拉伸。圖板保留完整原稿與交付版本，手機裁切與實際文字疊放仍由遊戲整合驗收。')
}
for batch,(title,task,p1,p2) in entries.items():
 here=ROOT/'art/evidence'/batch
 if not (here/'inputs.json').exists() or not (here/'files.json').exists():continue
 records=json.loads((here/'inputs.json').read_text(encoding='utf-8'))
 prompts={r['cat']+'/'+r['id']:r['prompt'] for r in records}
 front={'title':'Sharkside：'+title,'description':f'TASK-{task}；{len(records)}張原創美術素材與尺寸檢視。','author':'Sirius (Codex)','note':'Tim核准畫風後續批次；內建image_gen生成，遊戲整合由gura簽核。'}
 text='---\n'+''.join(k+': '+json.dumps(v,ensure_ascii=False)+'\n' for k,v in front.items())+'---\n\n'
 text+=f'# Sharkside：{title}\n\n{p1}\n\n{p2}\n\n'
 text+=f'來源、實際參考與輸出SHA-256：Sharkside `art/evidence/{batch}/generation.json`。完整尺寸圖板分頁存於同目錄的 `review/`。所有素材透過內建image_gen生成，匯出腳本只做尺寸、透明與檢視圖板整理。遊戲整合與缺圖回退仍須gura驗收；藝廊瀏覽器預覽未驗證，索引以build／check驗證。\n\n'
 text+='## 實際生成提示詞\n\n```json\n'+json.dumps(prompts,ensure_ascii=False,indent=2)+'\n```\n\n'
 text+=f'![Sharkside：{title}](../RawImages/sirius_sharkside_{batch}.png)\n'
 card=f'CanvasInterpretations/sirius_sharkside_{batch}.md'
 (GALLERY/card).write_text(text,encoding='utf-8')
 manifest=json.loads((here/'files.json').read_text(encoding='utf-8'))
 if card not in manifest['gallery']:manifest['gallery'].append(card)
 (here/'files.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(batch,len(records))
