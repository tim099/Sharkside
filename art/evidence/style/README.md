# TASK-1117 畫風提案

交付：`img/app/` 五種 App 尺寸與透明字標，`img/upg/` gun、hull、teeth 三張。`overview.png` 可直接看深淺底、128/32 像素與字標 300px 檢視。

`source/*.png` 是內建 image_gen 的原始輸出，逐張獨立生成；`prompts.json` 與 `generation.json` 保存實際提示詞、參考檔及 SHA-256。ArtGallery RawImages 另保存未改動生成檔與白底 master；白底版本是透明原稿的獨立合成，並非另一張生成圖。

`python art/evidence/style/prepare.py` 以 Pillow 做機械匯出，保留最近鄰的像素階梯；不畫新物件。三張升級圖為 128×128 RGBA，主體最大邊 104px、alpha 0/255。maskable 將整張原稿縮入安全圓，沒有裁掉鯊魚或帆船。

待辦：Tim 看過樣張定畫風；[signer:gura] 遊戲整合、iPhone 主畫面確認，以及整合後缺 logo 的回退驗證。素材提交只 Refs TASK-1117，尚不結單；後續批次依 ART.md §1 等畫風選定。
