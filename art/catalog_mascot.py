"""Catalog the user-approved original portrait and its actual prompts."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
here=root/'art/evidence/mascot'
gallery=Path('D:/Unity/Valhalla/ArtGallery')
prompts=json.loads((here/'prompts.json').read_text(encoding='utf-8'))
text='''---
title: "Sharkside：紫髮的鯊魚船長"
description: "TASK-1129；Tim選定的原創看板娘與四種表情，命名由gura決定。"
author: "Sirius (Codex)"
note: "Tim核准紫髮羅盤款並提供透明原圖；常態立繪原檔保留。"
---

# Sharkside：紫髮的鯊魚船長

她用羅盤迎接出航的人。紫髮、青綠眼與小鰭耳保留可愛的臉部輪廓，酒紅三角帽、銅橘翻領與深青外套則把她放回帆船世界。鯊魚特徵落在細小尖牙與頸側鰓紋，配色由帽子一路延伸到裙襬。

Tim先要求日系可愛、帶鯊魚特色，再選定三稿中的B款並上傳透明定稿，說「用這張吧 辛苦了」。命名回答為「交給Gura取名」，因此名字由persona gura決定。normal直接使用Tim上傳的原圖，SHA-256逐位相同；得意、生氣、害羞由該圖生成表情版本，匯出時以核准輪廓限制透明邊界。

原創檢視比對了[官方角色頁](https://hololive.hololivepro.com/en/talents/gawr-gura/)的完整立繪：此款沒有鯊魚連帽、白髮藍挑染、三叉戟或藍白連帽衣。該官方圖片僅用於事後辨識特徵比對，未下載，也未作生成參考。實際提示詞掃描與比對紀錄存於 `art/evidence/mascot/design-check.json`。

四張交付1024×1536透明PNG；全身、臉部與淺底邊界已逐張檢視。遊戲375px版面及缺圖回退仍交gura整合驗收。原稿、實際提示詞、參考與輸出SHA-256存於Sharkside `art/evidence/mascot/`。藝廊索引通過build／check；瀏覽器藝廊預覽未驗證。

![三款概念，B款已選](../RawImages/sirius_sharkside_mascot_concepts.png)

## 實際生成提示詞

'''
text+='```json\n'+json.dumps(prompts,ensure_ascii=False,indent=2)+'\n```\n\n'
text+='![紫髮鯊魚船長四表情](../RawImages/sirius_sharkside_mascot.png)\n'
(gallery/'Portraits/sirius_sharkside_mascot.md').write_text(text,encoding='utf-8')
manifest=json.loads((here/'files.json').read_text(encoding='utf-8'))
for item in ('art/catalog_mascot.py','art/evidence/mascot/design-check.json'):
 if item not in manifest['project']:manifest['project'].append(item)
(here/'files.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('mascot exhibit ready')
