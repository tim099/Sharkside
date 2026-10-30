# 方舷放置 Sharkside —— 美術規格

> 遊戲裡現在的圖示全是 emoji、漂流寶物與鯊魚演出是手寫 SVG、App 圖示借 Blockside 的。這份是換成正式美術的規格；任務單在美術傘單底下一批一張（`senate cmd tasks`，專案 Blockside、標題開頭「方舷放置 美術」）。
> 檔案都在這個 repo（`D:/GameDev/Sharkside`），⛔ 不在任務單「專案路徑」那一行（那是 Blockside 核心）。

## 1. 畫風

**精緻像素風**（Tim 2026-10-30：「圖標可以用精緻像素風格」）—— 圖示、寶物、徽章、場景插圖、立繪都是同一個畫風。

- **圖示類**照 Blocksail 貨物圖示的新版畫風（`ArtGallery/RawImages/sirius_blocksail_goods_batch3_*_master.png` 九張；挑 1～3 張材質相近的**原稿**傳給生圖當風格參考，只借畫風、光源、材質表現，不抄剪影）：飽滿的固有色、左上高光、離散的像素色階、清楚的階梯輪廓、克制的深色外框。
- **色調**對齊介面（`src/idle.css` 的 `#bsi` 變數）：深海藍底 `#061220`、海藍 `#4fd1ff`／`#2b8bd6`、金 `#ffd166`、珊瑚紅 `#ff6b6b`、碎片紫 `#b58cff`、綠 `#5be3a1`。主角是**鯊魚與帆船**：鯊魚的牙、鰭、藍灰皮膚是這個遊戲的辨識度。
- ⛔ 圖上不放任何文字、數字（介面另外渲染）。標題字標是唯一例外。
- 光源一律左上；外緣深色輪廓，深底（介面）與淺底都要凸顯得出來。
- 第一批（App 圖示＋字標＋三張升級樣張）先給 Tim 看過一次再開後面的批次。

## 2. 每一類的規格

遊戲讀 `img/<類>/<id>.png`，**檔名 ＝ 遊戲資料表裡的 id**（`src/js/10_data.js`），一字不差。⛔ 不放進 `icons/`：那個資料夾是 `build.py` 從核心照抄的，多的會被刪掉。

| 類 | 路徑 | 畫布 | 顯示大小 | id（數量） |
|---|---|---|---|---|
| App 圖示 | `img/app/` | 見 §3 | 主畫面、分頁 | `apple-touch-icon`（180）、`icon-192`、`icon-512`、`icon-maskable-512`、`favicon-32`（5） |
| 標題字標 | `img/app/logo.png` | 1200×360 透明 | 標題寬約 300 px | 「方舷放置」＋「Sharkside」（1） |
| 介面 | `img/ui/` | 128×128 透明 | 18～24 px | `blocks`（格）、`shards`（三叉戟碎片）、`mul`（收入倍率）、`speed`、`cam`、`sound`、`mute`、`settings`、`sail`（出航）（9） |
| 升級 | `img/upg/` | 128×128 透明 | 32～40 px | `gun`、`reload`、`powder`、`hull`、`pump`、`sail`、`value`、`bounty`、`fear`、`teeth`（10） |
| 深海科技 | `img/tech/` | 128×128 透明 | 32～40 px | `trident`、`coral`、`current`、`dream`、`chest`、`yard`、`tide`、`instinct`、`mate`（9） |
| 技能 | `img/abil/` | 128×128 透明 | 技能鈕 44～56 px | `volley`、`frenzy`、`mega`、`repair`（4） |
| 特殊武器 | `img/wpn/` | 128×128 透明 | 鈕、軍火箱角標 20～40 px | `fire`（鯊魚噴火）、`cannon`（天降砲擊）（2） |
| 強化卡框 | `img/perk/frame-<稀有度>.png` | 256×352 透明 | 卡片約 200 px 寬 | `common`、`rare`、`epic`（3） |
| 增益 | `img/buff/` | 128×128 透明 | 卡面 48 px、列 20 px | `fury`、`oak`、`quick`、`gold`、`skull`、`wind`、`blood`、`compass`（8） |
| 祝福 | `img/bless/` | 128×128 透明 | 卡面 48 px | `atk`、`def`、`inc`（3） |
| 強化卡種 | `img/perk/` | 128×128 透明 | 卡面 48 px | `loot`（沉船寶藏）、`cd`（冷卻歸零）（2；免費升級用那一項升級的圖） |
| 海區徽章 | `img/region/` | 128×128 透明 | 海域卡 28 px | `region-1`…`region-9`（照 `REGIONS` 順序）、`abyss`（10） |
| 海區橫幅 | `img/region/banner-<同上>.png` | 960×300 不透明 | 海域卡底圖、進新海區的過場 | 同上（10） |
| 海況 | `img/sea/` | 128×128 透明 | 海域卡 20 px | `calm`、`wind`、`shark`、`wreck`、`pirate`、`powder`、`fog`、`tide`、`morale`（9） |
| 艦隊方針 | `img/doctrine/` | 128×128 透明 | 鈕 20 px | `sink`、`steady`、`mast`、`kill`、`gamble`（5） |
| 成就徽章 | `img/ach/` | 128×128 透明 | 成就頁 40 px | `ACH` 的 35 個 id（`sink1`…`quest10`） |
| 懸賞任務 | `img/quest/` | 128×128 透明 | 任務列 24 px | `sink`、`cap`、`bite`、`loot`、`boom`、`zone`、`gold`、`combo`（8） |
| 漂流寶物 | `img/loot/` | 128×128 透明 | 海面上 36～48 px | `barrel`、`chest`、`arms`、`bottle`、`goldmark`（黃金寶船名牌上的記號）（5） |
| 鯊魚演出 | `img/fx/` | 見各單 | 全畫面演出 | `jaw-top`、`jaw-bottom`（咬一口的上下顎，512×192）、`mega`（巨齒鯊撲上來，1024×640）、`fin`（狂潮時繞船的鯊鰭，128×128）（4） |
| 主視覺 | `img/key/` | 見各單 | 全畫面 | `title-land`（1920×1080）、`title-port`（1080×1920）、`atlantis`（潛回亞特蘭提斯，1280×720）、`welcome`（離線收益，960×540）（4） |
| 看板娘 | `img/mascot/` | 1024×1536 透明 | 提示、商店、說明 | **原創角色**（§5）：`normal`、`smug`（得意）、`angry`、`flustered`（害羞）（4） |

- **圖示**：主體最大邊約 104 px、四邊留 8～16 px；alpha 只用 0／255（像素風不要半透明毛邊）。**縮到顯示大小**（表上那一欄，至少 32 px）在深底、淺底都認得出來。
- **場景插圖**（橫幅、主視覺）：像素風場景，不透明；手機直放會裁切 ⇒ 主體放在中間 60%。
- **一組圖示要一眼分得出彼此**：同一頁會並排的（例：10 個升級）剪影、主色不要撞。

## 3. App 圖示

- 一張 1024×1024 原稿縮出：`apple-touch-icon` 180、`icon-192`、`icon-512`、`favicon-32`（縮小時重新整理像素，不要直接糊縮）。
- `icon-maskable-512`：主體在中間 80% 的圓裡（Android 會裁成圓、方、水滴）、背景鋪滿不透明的深海藍。
- 接上之後 `src/shell.json` 的 `icon` 與 `manifest.webmanifest` 的 `icons` 改指 `img/app/`（接圖的人做）。

## 4. 原稿、證據、藝廊

- 生圖：純白背景的原稿另存 ArtGallery `RawImages/<作者>_sharkside_<批>_<id>_master.png`；遊戲用的是另外去背、整理過的那一份。
- 每一批在 `art/evidence/<批>/` 留：實際提示詞、選的參考圖路徑與 SHA-256、每張原稿與遊戲版的 SHA-256（`generation.json`）。
- 總覽圖板（原寸一列＋顯示大小一列，深底）與解說卡照 `ArtGallery/WORKFLOW.md` 上架；單上留言貼路徑。

## 5. 版權：只畫原創

Tim 2026-10-30：「直接用Gura形象會有版權問題 可能要微調」—— 遊戲裡講話的「本鯊魚」是遊戲自己的角色，⛔ 不是任何既有角色（包括 hololive 的 Gawr Gura、persona gura 的頭像 `avatar_gura.png`）。

- ⛔ 不拿既有角色、頭像、同人圖當生圖參考；提示詞不寫任何既有角色名、VTuber 名、作品名。
- ⛔ 避開 Gawr Gura 的辨識特徵：鯊魚造型連帽外套（帽沿一排牙、帽頂鰭）、白髮夾藍挑染、藍白配色、三叉戟、鯊魚尾巴從衣服後面露出來的那個組合。
- 看板娘先出 **2～3 個概念**（剪影＋配色）給 Tim 挑，挑定才畫四個表情。方向例：戴三角帽的鯊魚艦長（不是人形也可以）、穿航海外套的人魚系船長 —— 辨識度靠**船長**（帽、外套、望遠鏡、航海圖），不靠鯊魚帽。
- 名字由 Tim 定；遊戲裡在那之前只用「本鯊魚」自稱，⛔ 不叫 Gura。
- 其他類（圖示、寶物、場景）一樣：鯊魚、帆船、寶藏都畫自己的造型，不仿任何遊戲、動畫的既有設計。

## 6. 接進遊戲（gura）

- 讀不到圖（還沒畫、檔名打錯、載入失敗）⇒ 那一格退回原本的 emoji／SVG，⛔ 不出現破圖。
- 每一批接上之後在手機 375 寬與電腦各看一次，單上勾掉「接進遊戲」那一格。
