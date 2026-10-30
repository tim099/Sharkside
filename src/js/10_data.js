// ───────────────────────── 方舷放置：數值與內容表 ─────────────────────────
// 調手感只改這一支：BAL 是所有公式的常數；海域、船、升級、深海科技、技能、成就都是表。
(function (I) {
  'use strict';
  I.SAVE_KEY = 'bsidle.v1';

  I.BAL = {
    // 曲線（2026-10-30 量的：第 2 海域一場約 50 秒、打下 3,500 格）：要跟上海域，砲術每個海域要 ln1.16/ln1.10 ≈ 1.56 級 ⇒ 價錢每個海域 ×1.25^1.56 ≈ 1.42；
    //   收入每個海域 ×1.17（再加鑑價師，大約 ×1.28）⇒ 差 1.1 倍／海域慢慢累積，第一輪大約在第 60 海域撞牆 ⇒ 轉生
    // 一艘敵艦的身價 ＝ 一格的價值 × poolK × 噸位^poolExp（第 1 海域的燕子號 85 噸 ≈ 3,600）：
    //   打下來的格照飽和曲線領 hitShare ×（1 − e^(−打掉的格 ÷ 那艘的 5%)）、出局領 outShare（降旗 × captureK）、殉爆再加 boomShare
    //   ⇒ 一艘船的錢有上限：火力強只會打得快，不會讓一艘船更值錢（⛔ 2026-10-30 第一版照格算：火力 ⇒ 洞大 ⇒ 格多 ⇒ 錢多 ⇒ 火力，第 21 海域一場 7 秒 3,000 萬格）
    // 收入的升級（2026-10-30 第二版；Tim：「升級價格目前有點太低了(可以拉高後面的升級價格)」，存到 12.4 億格、每秒才 +33）：
    //   ⛔ 第一版鑑價師 ×1.1 每級只漲 1.3、賞金獵人 ×1.2 每級只漲 1.32 ⇒ 跟著砲術一起買，收入每個海域漲得比砲術、船殼的價錢快 ⇒ 錢滾成天文數字
    //   ⇒ 鑑價師每級漲 1.5、賞金獵人 ×1.15 每級漲 1.6，所有升級再乘 e^(upgRamp × L(L−1)/2)
    // 後段再加價（第三版；Tim：「後面的升級可以更貴一些(目前很容易就賺到破億)」）：upgRamp 0.002 ⇒ 0.006。第 10 級 ×1.2、20 級 ×2.1、40 級 ×22、60 級 ×1,200（跟 0.002 比）
    //   粗模（最便宜的先買；沒算強化三選一、科技、寶藏，實際會快一點）：一場破億 35 分 ⇒ 1 h；0.5 h 海域 20、1 h 26（可以轉生了）、4 h 34、16 h 40
    //   ⛔ 0.002：1 h 海域 40、一場 15 億，16 h 才在 70 撞牆 ⇒ 第一次轉生要等太久
    upgRamp: 0.006,
    vGrow: 1.17,              // 一格的價值：每過一個海域 ×
    poolK: 130, poolExp: 0.75,
    hitShare: 0.6, outShare: 0.4, boomShare: 0.3, hitRef: 0.05,
    captureK: 1.5,            // 降旗（俘獲）的出局賞金倍率
    bossK: 5,                 // 海域守將的身價倍率
    lvGrow: 1.16,             // 敵艦的強度：每過一個海域 ×
    early0: 0.45,             // 新手海：第 1 海域的強度再 ×0.45，到第 11 海域升回 ×1（第一版第 1 海域一場 116 秒，太慢）
    bossLv: 2.0,              // 守將海域的強度再 ×
    atkExp: 0.55,             // 火力比 ⇒ 敵艦船殼硬度（−）與我方砲彈傷害（＋）的次方
    defExp: 0.55,             // 船堅比 ⇒ 我方船殼硬度（＋）與敵方砲彈傷害（−）的次方
    hardMin: 0.25, hardMax: 4, dmgMin: 0.3, dmgMax: 4,
    myHole: 1.4, holeExp: 0.3, holeMin: 0.6, holeMax: 1.8,    // 砲彈打到船殼的洞（半徑倍率）：我方的底 × 火力比^holeExp；敵方 ＝ 船堅比^−holeExp（上限顧效能：洞的體積 ∝ 半徑³）
    eHard: 0.15,              // 放置模式的底：敵艦硬度、進水、抽水（不然兩艘小船對轟五分鐘還分不出勝負）
    eFlood: 6, ePump: 0.4,
    eReload0: 7, eReloadMin: 3.6, eReloadPer: 0.012,
    myReload0: 5.5, myFlood: 0.7, myPump: 1.3,
    strike0: 1.0, strikeMin: 0.5,    // 敵艦死傷到這個比例就降旗（骷髏旗升級往下壓：10 級 × 0.933 ⇒ 剛好 0.5）；Tim 2026-10-30：「初始可以是100%死傷才降旗」
    //   ⛔ 以前最低壓到兩成五（骷髏旗 20 級 × 0.94，第 3 級就碰底）⇒ Tim 2026-10-30：「骷髏旗上限可以到50%就好 太快投降不好玩(因為追求的樂趣是Voxel破壞)」—— 增益、海況也壓不過五成
    dist: 70,                 // 開局兩邊船頭相距（m）
    timeout0: 150, timeoutPer: 45,   // 一場打多久還沒分出勝負就撤退（模擬秒）：底＋每艘敵艦
    hold: 4.5,                // 分出勝負之後再看幾秒（沉船）才換下一場
    // 結算商店（50_ui.js；Tim 2026-10-30：「因為希望手機上能玩 介面希望簡單一點 改為直接在每一小關節算顯示商店頁面」「升級全部放到商店頁面(遊戲中不用有常駐選單 因為手機上空間不夠)」）：
    //   勝負橫幅亮 shopDelay 秒後跳出來（強化三選一先選完）；shopAuto 秒沒動就自動出航（碰了商店 ⇒ 停住，等按出航；設定可以改成一律等）
    shopDelay: 1.6, shopAuto: 12,
    retryAfter: 3,            // 打輸退一個海域，贏幾場再回去挑戰
    offlineBase: 0.25, offlineCap: 12 * 3600,
    shardZone: 25,            // 第一次能潛回亞特蘭提斯（轉生）的海域
    slotPrice: [0, 15000, 6e5, 4e7, 5e9],    // 艦隊第 n 個位置的價錢
    shipK: 3000, shipTonExp: 0.7, shipGrow: 1.3, // 造船：shipK × (噸位/50)^shipTonExp × shipGrow^(第一次出現的海域−1)
    // 同時在場最多幾艘（Tim 2026-10-30：「場上可以限制最多三台(我方一台)」，手機也跑得動）；其他的是候補：場上空出名額就一艘一艘補上（30_battle.js reinforce）
    fieldFoes: 2, fieldMine: 1,
    reinfGap: 1.5,            // 兩艘進場之間至少隔幾秒（實際時間；一艘分段做幾格 ⇒ 不疊在一起做）
    biteK: 0.02,              // 咬一口的獎勵 ≈ 那艘身價的 2%（× √(咬掉的格 ÷ 100) × 利齒；一艘最多領身價的三成）
    // 漂流寶物（35_loot.js）：敵艦被我方打中 ⇒ 每發 lootP 的機率在中彈的地方漂出一件；兩件之間至少 lootGap 秒（實際時間）、同時最多 lootMax 件，
    //   lootLife 秒沒撿就自動撿、只拿 lootAuto 倍。木桶、寶箱 ＝ 那艘身價的 barrelK、chestK；瓶中信 ＝ 隨機一種增益 bottleSec 秒
    lootP: 0.045, lootGap: 2.4, lootMax: 4, lootLife: 16, lootAuto: 0.5,
    barrelK: 0.05, chestK: 0.2, bottleSec: 30,
    perkAuto: 15,             // 強化三選一：幾秒沒選就自動選（設定可以改成一跳出來就自動選）
    // 黃金寶船（30_battle.js reinforce，跟候補排同一條）：不是守將的海域，每場 goldP 的機率在開打後幾秒冒出來（沉船海域 ×2）；身價 × goldK、火力很弱，打中掉寶 × goldLoot
    goldP: 0.14, goldK: 5, goldLoot: 4,
    // 連咬（30_battle.js bite）：上一口之後 comboGap 秒內再咬 ⇒ 連咬 +1，獎勵 ×（1 ＋ comboStep ×（連咬 − 1））最多 comboMax；每 comboCrit 口暴擊一次（咬得大 1.6 倍、獎勵 ×2）
    comboGap: 1.6, comboStep: 0.15, comboMax: 3, comboCrit: 10,
    // 咬的蓄力（30_battle.js bitePow；Tim 2026-10-30：「咬擊 可以加上蓄力條(自動續力 不用按住) 目前連點感覺有點太強 如果讓蓄力滿威力等於目前 空續力(高速連點) 威力只有目前20%」）：
    //   上一口之後自己慢慢蓄，威力 ＝ biteMin ＋（1 − biteMin）×（過了幾秒 ÷ biteCharge）^biteCurve；咬掉的格 ∝ 威力（半徑 × √威力：船殼薄 ⇒ 格 ∝ 半徑²）、獎勵 ∝ 威力
    //   ≥ biteFull 算蓄滿（給一點手感：大約 0.95 秒）：只有蓄滿的那一口算連咬、暴擊（⛔ 每口都算 ⇒ 狂點連咬一下就疊滿、暴擊多四倍）
    //   ⛔ 線性蓄力（biteCurve 1）⇒ 永遠是狂點划算（一口最短 0.25 秒 ⇒ 一秒四口 × 兩成就有 0.8 口全力，再加上蓄的那一點）；平方 ＋ 一秒蓄滿 ⇒ 狂點跟一秒一口全力差不多
    //   鯊魚狂潮的那幾秒蓄力一直是滿的（ABIL frenzy）⇒ 一秒四口全力 ＝ 以前狂點的威力
    biteCharge: 1.0, biteMin: 0.2, biteCurve: 2, biteFull: 0.92,
    // 水線下的咬傷（Tim 2026-10-30：「水線下的咬傷威力要下降(不然沉太快了 應該在50%以下(可能30%?))」；30_battle.js bite）：
    //   咬的那一點在海面下 ⇒ 威力 × biteUnder（半徑 × √）；照深度漸變：中心在海面下半個咬痕半徑以上才扣滿，貼著水線只扣一點；已經在沉的不扣（咬沉船撿格照舊）
    biteUnder: 0.3,
    // 鯊魚寶寶（升級 pups；30_battle.js pupTick）：每一級多一隻，自己找還在打的敵艦咬 —— 對著鏡頭那一舷、水線上 pupDz 格（⛔ 水線下 ⇒ 沉太快）、半徑 pupR 格（利齒每 5 級 +1）；
    //   每隻大約 pupGap 秒（模擬秒）咬一口，整群最快 pupMin 秒一口（模擬秒；6 隻 0.67 秒、鯊群出沒 12 隻碰到 0.4）、實際時間最快 0.3 秒一口（開 ×4 也不會一秒十幾口：碎木、粒子顧效能）
    //   獎勵 ＝ 同樣格數的一口 × pupK，一艘最多領身價的 pupCap（跟玩家咬的那三成分開算）；不算連咬、蓄力，也不算賞金任務的「咬」
    pupGap: 4, pupMin: 0.4, pupR: 3, pupDz: [1, 4], pupK: 0.4, pupCap: 0.1,
    pupLunge: 0.5,                                                      // 瞄好之後幾模擬秒才咬（40_fx.js 那片鰭先衝過去；30_battle.js pupTick）
    biteMdl: 60,                  // 咬掉一個模型（舵輪、砲、門…；核心 bite 的 mdl）算幾格：獎勵、訊息照「格」算 ⇒ 只咬到舵輪也有一口的份（一般一口約 100 格）
    kegNear: 0.35,                // 火藥桶（30_battle.js kegThrow）：沒點到船身、離敵艦船心的投影在一般判定（foeAt）的這個倍數以內 ⇒ 當成點偏了、丟那艘；更遠 ⇒ 點的是海 ⇒ 水雷
    // 鯊魚利齒前 teethGrow 級：咬得更大（半徑 +1）、獎勵 ×1.25、特殊武器的噴火多團；再上去每一級蓄滿的時間 ×teethFast（30 級 ⇒ 0.95^15 ≈ 0.46 秒）
    teethGrow: 15, teethFast: 0.95,
    // 軍火箱（35_loot.js 的漂流寶物多一種；一般的 armsP、黃金寶船 armsGold 的機率）：點一下撿才有（自動撿 ⇒ 沉下去了）⇒ 接下來那把武器的 dur 秒點敵艦換成它（I.WEAPONS）
    armsP: 0.16, armsGold: 0.2,
    wreckY: -12,              // 沉沒了還在往下沉的船：水面下這麼深（公尺）以內還看得到、咬得到
    // 打不沉的破船（30_battle.js battleTick；Tim 2026-10-30：越嶺號「幾乎打不沉的情況(幾乎都在水線下)」「其他吃水太淺的船可能也有類似問題」）：
    //   核心開始沉的線不低於 4.2 m ⇒ 吃水淺的船灌滿水了木頭還浮著、泡在水面停住，砲彈打不到水下 ⇒ 卡到時間到（降旗改成 100% 起之後更常見：剩一個人就不降）
    //   ⇒ 砲全啞、頂層甲板泡進水裡 wreckDeck 公尺以上（沒有甲板資料 ⇒ 浮力條 < wreckFloat）連續 wreckSec 秒（模擬秒）⇒ 叫它開始沉（核心 scuttle）
    wreckDeck: 0.3, wreckFloat: 0.7, wreckSec: 6,
    dbgQuiet: 8                  // 除錯紀錄（50_ui.js dbgTick）：對得到目標卻幾秒沒開火算一段（核心 83_testlog.js TLOG_QUIET，字跟著它）
  };

  /** 海域（一區 10 個，第 10 個是守將）。pool：照順序越後面越常出現；wx：天氣；map／site：海圖（Blockside maps/<map>，Blocksail tools/export_chunks.cjs 匯出）與開戰點 ——
   *  海圖是核心開機時讀的（?map=），換到別張 ⇒ 存檔、重新載入這一頁。沒寫 ⇒ 開闊的海。 */
  I.REGIONS = [
    { name: '加勒比淺灘', ico: '🏝️', wx: 'clear', map: 'tortuga', site: 0, pool: ['swallow', 'flyingfish', 'labelle'], boss: 'sanroman', say: '托爾圖加海峽，暖暖的淺灘，小船先熱身。' },
    { name: '古代航道', ico: '🏛️', wx: 'clear', map: 'salamis', site: 0, pool: ['punt', 'fusta', 'dromon'], boss: 'reale', say: '薩拉米斯海峽：槳帆船與希臘火，穿越時空的對手。' },
    { name: '西班牙大陸', ico: '🏰', wx: 'clear', pool: ['falcon', 'sanroman', 'tradewind', 'zeehaen'], boss: 'cosecha', say: '運寶船隊的航線，大帆船坐鎮。' },
    { name: '北海風暴', ico: '⛈️', wx: 'storm', pool: ['zeehaen', 'oxford', 'phoenix'], boss: 'stormkaap', say: '浪大、風強，砲口晃得厲害。' },
    { name: '幽靈海域', ico: '👻', wx: 'storm', pool: ['phoenix', 'tidegrave', 'cosecha'], boss: 'nightlamp', say: '黑帆與提燈，聽說有船從海底浮上來。' },
    { name: '風帆巨艦', ico: '⚓', wx: 'clear', pool: ['tidegrave', 'constitution', 'concepcion'], boss: 'ember', say: '兩層、三層砲甲板的大傢伙。' },
    { name: '鐵甲時代', ico: '⚙️', wx: 'clear', map: 'hampton', site: 0, pool: ['monitor', 'sentinel', 'virginia', 'susquehanna'], boss: 'gloire', say: '漢普頓錨地：莫尼特號與維吉尼亞號在這裡打成平手。木殼的砲彈會彈開。' },
    { name: '遠東艦隊', ico: '🐉', wx: 'clear', pool: ['susquehanna', 'matsushima', 'napoleon'], boss: 'dingyuan', say: '巨砲時代的鋼鐵巨獸。' },
    { name: '大漩渦', ico: '🌀', wx: 'maelstrom', map: 'lofoten', site: 0, pool: ['concepcion', 'ember', 'napoleon'], boss: 'tridente', say: '羅弗敦的漩渦海峽，海在旋轉。傳說三叉戟號守在漩渦中心。' }
  ];
  I.ABYSS = { name: '深淵', ico: '🕳️', say: '再往下就沒有海圖了。' };

  /** 我方能造的船：先擊敗過那一型（拿到藍圖）才能造；pinas（藍鯊號）是亞特蘭提斯的禮物（打過第 15 海域）。 */
  I.GIFTS = { flyingfish: 0, pinas: 15 };

  /** 升級（花格）。tab：atk 攻擊／def 防禦／eco 經濟；eff：每一級的倍率；max 0 ＝ 沒上限。 */
  I.UPG = [
    // 鯊魚利齒（Tim 2026-10-30：「鯊魚利齒應該放到攻擊分類 且放在最上面」「成長價格可以更高一點(現在太容易升滿了) 然後可以加更高的升級等級(後面等級可以加速蓄力)」）：
    //   上限 15 ⇒ 30；前 BAL.teethGrow 級咬得更大、獎勵 ×eff，再上去只加快蓄力（20_econ.js biteChargeT）
    //   價錢（Tim 同一天又說：「價格成長曲線可以再更陡一些(總體漲價 且最後幾階段要很貴)」）：起價 200 ⇒ 500、每級 1.45 ⇒ 1.75 ⇒ 1.85，再加自己的後段加價 ramp 0.02（其他升級照 BAL.upgRamp 0.006）
    //   ⇒ 10 級 58 萬、15 級 4,200 萬、20 級 49 億、25 級 9,600 億、最後一級 94 兆（第一版 1.75／0.006：7.1 萬、170 萬、4,500 萬、14 億、260 億）
    { id: 'teeth', tab: 'atk', ico: '🦷', name: '鯊魚利齒', c0: 500, g: 1.85, ramp: 0.02, max: 30, eff: 1.25, desc: '點敵艦哪裡就咬哪裡：咬得更大、咬下來的格 ×1.25；第 16 級起改成蓄力更快' },
    // 鯊魚寶寶（2026-10-30 gura：放著不點也有咬的那一份）：zone ＝ 到過這個海域才抽得到（20_econ.js upgLocked）
    //   draw（Tim 2026-10-30「做成只能隨機抽到的升級(介面內不能點 之後也打算加更多這種需要靠抽的升級)」）：面板裡不能買、自動航海士不買，只有強化三選一抽得到（20_econ.js perkCard 的 draw 卡）；c0、g 只剩讀數用
    { id: 'pups', tab: 'atk', ico: '🐟', name: '鯊魚寶寶', zone: 5, draw: true, c0: 4000, g: 2.4, ramp: 0.03, max: 6, eff: 1, desc: '每一級多一隻小鯊魚：在敵艦旁邊游、自己去咬（水線上、小口；鯊群出沒的海域 ×2）' },
    { id: 'gun', tab: 'atk', ico: '🎯', name: '砲術訓練', c0: 250, g: 1.25, max: 0, eff: 1.1, desc: '火力 ×1.1：砲彈更兇、洞更大、敵艦的船殼更脆' },
    { id: 'reload', tab: 'atk', ico: '⏱️', name: '裝填演練', c0: 600, g: 1.45, max: 24, eff: 0.95, desc: '裝填時間 ×0.95' },
    { id: 'powder', tab: 'atk', ico: '💥', name: '火藥專家', c0: 5000, g: 1.6, max: 15, eff: 0.88, desc: '敵艦的火藥桶更不耐打（更容易殉爆）、殉爆賞金 +20%' },
    { id: 'hull', tab: 'def', ico: '🛡️', name: '船殼加固', c0: 250, g: 1.25, max: 0, eff: 1.1, desc: '船堅 ×1.1：敵彈打不穿、洞更小、砲手少受傷' },
    { id: 'pump', tab: 'def', ico: '🪣', name: '抽水機', c0: 800, g: 1.45, max: 20, eff: 1.15, desc: '抽水 ×1.15、進水 ×0.96' },
    { id: 'sail', tab: 'def', ico: '⛵', name: '帆裝調校', c0: 2000, g: 1.65, max: 10, eff: 1.05, desc: '航速、靈活 ×1.05' },
    { id: 'value', tab: 'eco', ico: '🪙', name: '鑑價師', c0: 300, g: 1.5, max: 0, eff: 1.1, desc: '每一格的價值 ×1.1' },
    { id: 'bounty', tab: 'eco', ico: '🏴‍☠️', name: '賞金獵人', c0: 1000, g: 1.6, max: 0, eff: 1.15, desc: '擊沉、俘獲、殉爆的賞金 ×1.15' },
    { id: 'fear', tab: 'eco', ico: '☠️', name: '骷髏旗', c0: 3000, g: 1.55, max: 10, eff: 0.933, desc: '敵艦死傷到更低的比例就降旗（沒有骷髏旗要全員倒下才降；最低到五成；俘獲賞金 ×1.5）' }
  ];
  /** 物理模擬四檔（設定的「物理模擬」；C.phx 整組送過去）：值 ＝ 核心 09_phx.js PHX_ITEMS 那一項的第幾檔。照 Blockside 的四檔抄，模擬步長往下壓
   *  （Tim 2026-10-30：「物理模擬等級也可以開成可調整(目前會卡頓了)」「預設模擬步長也可以試著能調低點(以順暢遊戲優先)」）：step 0 ＝ 60 Hz、1 ＝ 30、2 ＝ 20、3 ＝ 15。
   *  模擬步長、進水下一場生效。細節面板（50_ui.js phxPanel）一項一項調、印得出整組 ⇒ Tim 調好貼回來就改這裡。 */
  I.PHX_LV = {
    low: { rig: 0, rigfar: 2, debris: 0, fx: 0, water: 0, flood: 0, sinkflood: 0, blastnb: 0, sailhit: 0, shiphit: 0, shipfric: 2, shipdmg: 0, step: 3 },
    mid: { rig: 1, rigfar: 2, debris: 1, fx: 1, water: 1, flood: 1, sinkflood: 0, blastnb: 1, sailhit: 0, shiphit: 3, shipfric: 2, shipdmg: 1, step: 2 },
    high: { rig: 2, rigfar: 1, debris: 2, fx: 2, water: 2, flood: 2, sinkflood: 1, blastnb: 1, sailhit: 0, shiphit: 3, shipfric: 2, shipdmg: 1, step: 1 },
    full: { rig: 3, rigfar: 1, debris: 3, fx: 3, water: 3, flood: 3, sinkflood: 1, blastnb: 1, sailhit: 0, shiphit: 3, shipfric: 2, shipdmg: 1, step: 0 }
  };
  I.PHX_NAME = { low: '低', mid: '中', high: '高', full: '全開', custom: '自訂' };
  I.UPG_TABS = [{ id: 'atk', name: '攻擊' }, { id: 'def', name: '防禦' }, { id: 'eco', name: '經濟' }];

  /** 深海科技（花三叉戟碎片；轉生也留著）。 */
  I.TECH = [
    { id: 'trident', ico: '🔱', name: '三叉戟之力', c0: 1, g: 2, max: 0, desc: '火力 ×1.5' },
    { id: 'coral', ico: '🪸', name: '珊瑚裝甲', c0: 1, g: 2, max: 0, desc: '船堅 ×1.5' },
    { id: 'current', ico: '🌊', name: '洋流起點', c0: 3, g: 2.2, max: 8, desc: '每一級：轉生後從海域 +5 出發（不超過最遠到過的一半）' },
    { id: 'dream', ico: '💤', name: '夢中航行', c0: 2, g: 1.8, max: 5, desc: '離線收益 +15%（基礎 25%）' },
    { id: 'chest', ico: '💰', name: '沉船寶藏', c0: 2, g: 2.5, max: 10, desc: '轉生後帶著 1,000 × 10^級 格出發' },
    { id: 'yard', ico: '⚓', name: '老船塢', c0: 5, g: 1, max: 1, desc: '轉生不會忘記已經會造的船與艦隊位置' },
    { id: 'tide', ico: '⏩', name: '洋流加速', c0: 4, g: 3, max: 2, desc: '解鎖 ×3（再一級 ×4）模擬速度' },
    { id: 'instinct', ico: '🦈', name: '鯊魚直覺', c0: 3, g: 2, max: 5, desc: '技能冷卻 ×0.85' },
    { id: 'mate', ico: '🧭', name: '自動航海士', c0: 6, g: 1, max: 1, desc: '自動買升級（可在設定裡關掉）' }
  ];

  /** 技能（主動）。zone：到過這個海域才解鎖。 */
  I.ABIL = [
    { id: 'volley', key: '1', ico: '🔥', name: '全艦齊射', cd: 40, zone: 3, desc: '全艦的砲立刻裝填完畢' },
    { id: 'frenzy', key: '2', ico: '🌊', name: '鯊魚狂潮', cd: 120, dur: 20, zone: 7, desc: '20 秒內蓄力條一直是滿的：每一口都是全力，可以連續咬' },
    { id: 'mega', key: '3', ico: '🦈', name: '巨齒鯊', cd: 90, zone: 14, desc: '每艘敵艦都被狠狠咬一大口' },
    { id: 'repair', key: '4', ico: '🔧', name: '緊急搶修', cd: 120, dur: 25, zone: 24, desc: '25 秒內全艦抽水 ×4、不再進水' }
  ];

  /** 特殊武器（Tim 2026-10-30：「加入一些特殊攻擊武器(撿道具獲得) 可以替換咬吧(持續短時間 可能十秒) 例如噴火 或是砲擊(憑空生出砲彈 且威力可以很大) 傷害可以根據咬的等級」）：
   *  漂流寶物的軍火箱撿到 ⇒ dur 秒內點敵艦（空白鍵：鎖定的那艘）不咬，換成這把；兩下之間至少 gap 秒。威力照鯊魚利齒的等級（L）：
   *  fire 鯊魚噴火：從點的那一點靠鏡頭那一側的水面噴出 n0 ＋ ⌊L ÷ 5⌋ 團希臘火（核心 C.shot kind 'fire'：潑開燒人、點著木頭延燒、燒穿）；燒人的傷害 dmg0 ×（1 ＋ dmgL × L）
   *  cannon 天降砲擊：從那一點的斜上方憑空落下一顆爆裂彈（kind 'shell'）；彈重 m0 ×（1 ＋ mL × L）kg（炸開的半徑 ∝ ∛彈重，上限 300 kg），傷害同上 */
  // gap：兩發最短隔幾秒（Tim 2026-10-30：「射擊間格可以更短(不用等上一發命中)」⇒ 0.3／0.45 ⇒ 0.12／0.18）
  I.WEAPONS = [
    { id: 'fire', ico: '🔥', name: '鯊魚噴火', dur: 10, gap: 0.12, n0: 2, dmg0: 2, dmgL: 0.2, desc: '從海裡噴出希臘火：點到哪裡燒到哪裡，木頭會延燒、燒穿' },
    { id: 'cannon', ico: '💣', name: '天降砲擊', dur: 10, gap: 0.18, m0: 30, mL: 0.3, dmg0: 3, dmgL: 0.2, desc: '憑空一顆大爆裂彈從你這邊打過去：點到哪裡炸到哪裡' },
    // 火藥桶（Tim 2026-10-30：「丟火藥桶(就是船上的彈藥) 碰撞到船會爆炸 可以點在海水上會變水雷(船碰到爆炸 可能炸到自己的船 然後發射速度可以慢一些)」；30_battle.js kegThrow）：
    //   R0 ＋ 每級利齒 RL ⇒ 爆炸半徑（格；核心 blast）；fly 飛幾秒（模擬秒）；水雷：最多 mines 顆（再丟 ⇒ 最舊那顆沉掉）、落水 arm 秒之後才會炸、life 秒沒人碰就沉掉
    { id: 'keg', ico: '🧨', name: '火藥桶', dur: 12, gap: 0.9, R0: 16, RL: 0.02, fly: 0.7, mines: 6, arm: 0.5, life: 90, how: '點敵艦丟過去、點海面放水雷',
      desc: '一桶火藥：碰到船就炸開；丟在海上變水雷 —— 誰的船碰到就炸誰（自己的也算）' },
    // 鏈彈（2026-10-30 gura；30_battle.js chainFire）：從鏡頭打出去（同天降砲擊），點在帆、桅杆、繩子上 ⇒ 照視線上離那艘船心最近的那一點（核心 C.ray）；
    //   一次 n0 ＋ ⌊利齒 ÷ 8⌋ 發、上下錯開 1.6 m；彈重 m0 ×（1 ＋ mL × L）kg、傷害同上（核心 kind 'chain'：斷繩、撕帆、扣帆桁的血、掃到的人）
    { id: 'chain', ico: '⛓️', name: '鏈彈', dur: 10, gap: 0.3, n0: 1, m0: 12, mL: 0.25, dmg0: 3, dmgL: 0.2, how: '點敵艦的帆、桅杆',
      desc: '兩顆鐵球綁一條鐵鍊、轉著飛過去：帆、繩、帆桁一掃就斷 —— 船跑不動，甲板上的人也會被掃到' },
    // 高壓水柱（Tim 2026-10-30「高壓水柱(按住持續噴射) 可以平整切割出一條線斬斷船體」；30_battle.js jetTick、核心 cut）：按住敵艦就一直噴、拖著走就切
    //   打到的那一點每模擬秒最多跟著手指走 spd0 ×（1 ＋ spdL × 利齒）公尺（⛔ 一下跳到手指那裡 ⇒ 切口不平、一格算太多）；縫一半寬 w0 格、穿到後面 pen 公尺；
    //   噴口在那一點往鏡頭那一側 noz 公尺的海面（鯊魚從水裡噴）；點一下（名牌、空白鍵）⇒ 噴 tap 秒
    { id: 'jet', ico: '💦', name: '高壓水柱', dur: 10, hold: true, spd0: 10, spdL: 0.05, w0: 1.2, pen: 20, noz: 22, tap: 0.35, how: '按住敵艦、拖著切',
      desc: '從海裡噴出一道細細的水柱：按住一直噴，拖過去切出一條平整的縫 —— 切穿龍骨，整艘船斷成兩截' }
  ];

  /** 艦隊方針（＝ 核心的砲長，51_captain.js CAPTAINS）：我方每艘照它挑瞄準。 */
  I.DOCTRINE = [
    { id: 'sink', zone: 1, ico: '🌊', name: '擊沉派', tip: '專打水線：沉得快、打下來的格多' },
    { id: 'steady', zone: 1, ico: '⚖️', name: '穩健派', tip: '照局勢平均分配' },
    { id: 'mast', zone: 5, ico: '🪓', name: '拆桅派', tip: '先拆桅，讓對方跑不動' },
    { id: 'kill', zone: 8, ico: '⚔️', name: '殺傷派', tip: '打砲甲板與人：配骷髏旗多俘獲' },
    { id: 'gamble', zone: 12, ico: '🎲', name: '賭徒', tip: '彈藥庫一靠近水面就全押上去：配火藥專家多殉爆' }
  ];

  /** 增益（強化三選一的「接下來幾場」、瓶中信的「幾秒」；20_econ.js bmul）：k ＝ 作用在哪、m ＝ 倍率（同時有兩個同一種 ⇒ 乘起來）。 */
  I.BUFF = [
    { id: 'fury', ico: '🔥', name: '砲手狂熱', k: 'dmg', m: 1.5, desc: '每發傷害 ×1.5、洞大一點' },
    { id: 'oak', ico: '🛡️', name: '鐵木船殼', k: 'hard', m: 1.5, desc: '我方船殼硬度 ×1.5、敵彈傷害 ×0.67' },
    { id: 'quick', ico: '⏱️', name: '快手砲班', k: 'reload', m: 0.7, desc: '裝填時間 ×0.7' },
    { id: 'gold', ico: '💰', name: '黃金潮', k: 'income', m: 1.6, desc: '所有收入 ×1.6' },
    { id: 'skull', ico: '☠️', name: '黑旗恐懼', k: 'fear', m: 0.75, desc: '敵艦死傷少四分之一就降旗' },
    { id: 'wind', ico: '⛵', name: '順風滿帆', k: 'speed', m: 1.3, desc: '航速、靈活 ×1.3' },
    { id: 'blood', ico: '🩸', name: '血腥味', k: 'bite', m: 3, desc: '咬一口的格 ×3、咬得更大' },
    { id: 'compass', ico: '🧭', name: '尋寶羅盤', k: 'loot', m: 2.5, desc: '漂流寶物的機率 ×2.5' }
  ];

  /** 強化三選一（打下新的海域時跳出來；守將海域至少稀有）：稀有度的權重、免費升級幾級、增益接下來幾場、沉船寶藏幾場份的收入。 */
  I.RARITY = [
    { id: 'common', name: '普通', w: 62, lv: 2, n: 3, loot: 2 },
    { id: 'rare', name: '稀有', w: 28, lv: 4, n: 5, loot: 4 },
    { id: 'epic', name: '史詩', w: 10, lv: 7, n: 8, loot: 8, dlv: 2 }
  ];
  /** 抽到的升級（UPG 的 draw）：三選一每一張是「抽升級卡」的權重（其他：免費升級 40、增益 34、寶藏 16、冷卻 10；史詩多祝福 40）；一張給 dlv 級（沒寫 ＝ 1）。
   *  18 ⇒ 一張大約 15%、一次三張至少一張大約 40%（同一次不重複）⇒ 第 5～25 海域一輪大約抽到 8 次。 */
  I.DRAW_W = 18;
  /** 祝福（只有史詩卡）：這一輪一直有效、可以疊，轉生才清掉。 */
  I.BLESS = [
    { id: 'atk', ico: '🔱', name: '海神的祝福', desc: '火力 ×1.15' },
    { id: 'def', ico: '🪸', name: '珊瑚之心', desc: '船堅 ×1.15' },
    { id: 'inc', ico: '🐚', name: '人魚之歌', desc: '收入 ×1.15' }
  ];

  /** 海況（20_econ.js zone：每個海域一種，照海域號碼與轉生次數定 ⇒ 這一輪同一個海域都一樣；守將海域沒有）：
   *  k ＝ 跟增益一起乘的倍率（bmul）、foe ＝ 多幾艘敵艦（照這個海域原本的敵艦再抄）、bounty ＝ 擊沉俘獲賞金、boom ＝ 殉爆賞金、
   *  powder ＝ 敵艦火藥桶的耐打、foeDmg ＝ 敵彈傷害、gold ＝ 黃金寶船的機率。 */
  I.SEAMOD = [
    { id: 'calm', w: 30, ico: '🌤️', name: '風平浪靜', desc: '沒什麼特別的' },
    { id: 'wind', w: 10, ico: '💨', name: '順風', desc: '我方航速、靈活 ×1.3', k: { speed: 1.3 } },
    { id: 'shark', w: 10, ico: '🦈', name: '鯊群出沒', desc: '咬一口 ×2、漂流寶物 ×1.5、鯊魚寶寶 ×2', k: { bite: 2, loot: 1.5 }, pups: 2 },
    { id: 'wreck', w: 9, ico: '⚱️', name: '沉船海域', desc: '漂流寶物 ×2.5、黃金寶船的機率 ×2', k: { loot: 2.5 }, gold: 2 },
    { id: 'pirate', w: 10, ico: '☠️', name: '海盜窩', desc: '敵艦多一艘、擊沉俘獲賞金 ×1.6', foe: 1, bounty: 1.6 },
    { id: 'powder', w: 8, ico: '🌋', name: '火藥運輸線', desc: '敵艦的火藥桶更脆、殉爆賞金 ×2', powder: 0.6, boom: 2 },
    { id: 'fog', w: 10, ico: '🌫️', name: '濃霧', desc: '雙方傷害 ×0.85、收入 ×1.3', k: { dmg: 0.85, income: 1.3 }, foeDmg: 0.85 },
    { id: 'tide', w: 10, ico: '✨', name: '黃金潮汐', desc: '收入 ×1.25', k: { income: 1.25 } },
    { id: 'morale', w: 3, ico: '😰', name: '士氣低落', desc: '敵艦死傷少兩成就降旗、俘獲賞金 ×1.3', k: { fear: 0.8 }, bounty: 1.3 }
  ];

  /** 賞金任務（45_quest.js：同時三張，做完自動領、換一張新的）：n ＝ 小／中／大要做幾次；max ＝ 算最高的一次（連咬）。 */
  I.QUESTS = [
    { id: 'sink', ico: '⚓', name: '擊沉', unit: '艘', n: [4, 8, 16] },
    { id: 'cap', ico: '🏳️', name: '俘獲（讓敵艦降旗）', unit: '艘', n: [2, 4, 8] },
    { id: 'bite', ico: '🦷', name: '咬', unit: '口', n: [25, 60, 120] },
    { id: 'loot', ico: '🛢️', name: '撿漂流寶物', unit: '件', n: [5, 12, 25] },
    { id: 'boom', ico: '💥', name: '讓敵艦殉爆', unit: '次', n: [1, 2, 4] },
    { id: 'zone', ico: '🗺️', name: '打下新的海域', unit: '個', n: [3, 5, 8] },
    { id: 'gold', ico: '💰', name: '拿下黃金寶船', unit: '艘', n: [1, 1, 2] },
    { id: 'combo', ico: '🔥', name: '連咬', unit: '口', n: [8, 15, 25], max: true }
  ];
  /** 任務的大小：權重、獎勵幾場份的收入（45_quest.js questRef）、另外給隨機增益幾場。 */
  I.QUEST_TIER = [{ name: '小', w: 55, k: 2, buff: 0 }, { name: '中', w: 33, k: 4, buff: 3 }, { name: '大', w: 12, k: 8, buff: 5 }];

  I.SPEEDS = [1, 2, 3, 4];

  /** 成就：每一個收入 ×1.03（乘起來）。 */
  I.ACH = [
    { id: 'sink1', ico: '⚓', name: '第一滴血', desc: '擊沉第一艘', t: function (S) { return S.st.sunk >= 1; } },
    { id: 'sink25', ico: '⚓', name: '沉船專家', desc: '擊沉 25 艘', t: function (S) { return S.st.sunk >= 25; } },
    { id: 'sink250', ico: '⚓', name: '海底墓園', desc: '擊沉 250 艘', t: function (S) { return S.st.sunk >= 250; } },
    { id: 'sink2500', ico: '⚓', name: '七海的惡夢', desc: '擊沉 2,500 艘', t: function (S) { return S.st.sunk >= 2500; } },
    { id: 'cap1', ico: '🏳️', name: '請降', desc: '第一次俘獲（敵艦降旗）', t: function (S) { return S.st.cap >= 1; } },
    { id: 'cap50', ico: '🏳️', name: '戰利品之王', desc: '俘獲 50 艘', t: function (S) { return S.st.cap >= 50; } },
    { id: 'boom1', ico: '💥', name: '轟！', desc: '第一次讓敵艦殉爆', t: function (S) { return S.st.boom >= 1; } },
    { id: 'boom25', ico: '💥', name: '煙火大會', desc: '殉爆 25 次', t: function (S) { return S.st.boom >= 25; } },
    { id: 'bite100', ico: '🦷', name: '磨牙', desc: '咬 100 口', t: function (S) { return S.st.bites >= 100; } },
    { id: 'bite2000', ico: '🦷', name: '大白鯊', desc: '咬 2,000 口', t: function (S) { return S.st.bites >= 2000; } },
    { id: 'blk1e6', ico: '🧱', name: '百萬格', desc: '累計打下 100萬 格', t: function (S) { return S.blocksAll >= 1e6; } },
    { id: 'blk1e9', ico: '🧱', name: '十億格', desc: '累計打下 10億 格', t: function (S) { return S.blocksAll >= 1e9; } },
    { id: 'blk1e12', ico: '🧱', name: '一兆格', desc: '累計打下 1兆 格', t: function (S) { return S.blocksAll >= 1e12; } },
    { id: 'blk1e18', ico: '🧱', name: '百京格', desc: '累計打下 100京 格', t: function (S) { return S.blocksAll >= 1e18; } },
    { id: 'z10', ico: '🗺️', name: '淺灘畢業', desc: '打過第 10 海域', t: function (S) { return S.bestZone > 10; } },
    { id: 'z25', ico: '🗺️', name: '遠洋', desc: '到達第 25 海域', t: function (S) { return S.bestZone >= 25; } },
    { id: 'z50', ico: '🗺️', name: '半張海圖', desc: '到達第 50 海域', t: function (S) { return S.bestZone >= 50; } },
    { id: 'z90', ico: '🌀', name: '漩渦中心', desc: '到達第 90 海域', t: function (S) { return S.bestZone >= 90; } },
    { id: 'z120', ico: '🕳️', name: '深淵', desc: '到達第 120 海域', t: function (S) { return S.bestZone >= 120; } },
    { id: 'fleet3', ico: '🚢', name: '小艦隊', desc: '艦隊有 3 個位置', t: function (S) { return S.slots >= 3; } },
    { id: 'fleet5', ico: '🚢', name: '大艦隊', desc: '艦隊有 5 個位置', t: function (S) { return S.slots >= 5; } },
    { id: 'pinas', ico: '🦈', name: '藍鯊歸隊', desc: '造出藍鯊號', t: function (S) { return !!S.own.pinas; } },
    { id: 'trident', ico: '🔱', name: '三叉戟', desc: '造出三叉戟號', t: function (S) { return !!S.own.tridente; } },
    { id: 'pres1', ico: '🐚', name: '回家', desc: '第一次潛回亞特蘭提斯', t: function (S) { return S.st.pres >= 1; } },
    { id: 'pres5', ico: '🐚', name: '輪迴的鯊魚', desc: '潛回亞特蘭提斯 5 次', t: function (S) { return S.st.pres >= 5; } },
    { id: 'clean', ico: '✨', name: '毫髮無傷', desc: '打贏一場、我方被打掉不到 50 格', t: function (S) { return !!S.st.clean; } },
    { id: 'blitz', ico: '⚡', name: '閃電戰', desc: '開戰 30 秒內打贏', t: function (S) { return !!S.st.blitz; } },
    { id: 'underdog', ico: '🐟', name: '以小博大', desc: '火力比不到 0.6 還打贏', t: function (S) { return !!S.st.under; } },
    { id: 'loot50', ico: '🛢️', name: '撿破爛', desc: '撿 50 件漂流寶物', t: function (S) { return S.st.loot >= 50; } },
    { id: 'chest10', ico: '🧰', name: '金銀島', desc: '撈起 10 個寶箱', t: function (S) { return S.st.chest >= 10; } },
    { id: 'perk30', ico: '🎴', name: '挑三揀四', desc: '選過 30 次強化', t: function (S) { return S.st.perks >= 30; } },
    { id: 'gold1', ico: '💰', name: '寶船獵人', desc: '拿下第一艘黃金寶船', t: function (S) { return S.st.gold >= 1; } },
    { id: 'gold10', ico: '👑', name: '劫寶船隊', desc: '拿下 10 艘黃金寶船', t: function (S) { return S.st.gold >= 10; } },
    { id: 'combo20', ico: '🔥', name: '狂咬', desc: '連咬 20 口', t: function (S) { return S.st.comboMax >= 20; } },
    { id: 'quest10', ico: '📜', name: '懸賞榜常客', desc: '完成 10 個賞金任務', t: function (S) { return S.st.quests >= 10; } },
    { id: 'pup500', ico: '🐟', name: '育幼有成', desc: '鯊魚寶寶咬了 500 口', t: function (S) { return S.st.pups >= 500; } }
  ];

  /** 載入時的一句話（本鯊魚說的）。 */
  I.TIPS = [
    'a~ 鯊魚艦隊集結中…',
    '每打掉一格，就是一格 🧱 —— 所以打得越碎越好。',
    '降旗的船賞金 ×1.5，骷髏旗掛高一點準沒錯。',
    '殉爆有額外賞金……才、才不是鼓勵妳去炸人家的彈藥庫呢。',
    '點敵艦哪裡就咬哪裡 —— 咬在水線上，會進水喔。',
    '敵艦中彈會漂出木桶、寶箱、瓶中信，點一下撿起來；放著不管只撿得到一半。',
    '打下新的海域可以挑一個強化：免費升級、增益、沉船寶藏……史詩卡還有祝福。',
    '鏡頭鎖定一艘敵艦；咬哪艘就換看哪艘，Tab 換下一艘。',
    '每個海域有自己的海況：濃霧、海盜窩、鯊群出沒……看海域卡。',
    '黃金寶船出現了就快咬！身價是平常的五倍，又打不太還手。',
    '一口接一口咬（1.6 秒內）會連咬，每第 10 口暴擊。',
    '賞金任務做完自動領 —— 面板的「任務」分頁看進度。',
    '打不過就退一個海域練一下，本鯊魚會自己回去挑戰的。',
    '轉生（潛回亞特蘭提斯）會重來，可是碎片的加成永遠留著。',
    '藍鯊號是本鯊魚的船，打過第 15 海域就送妳。',
    '第 5 海域起可以養鯊魚寶寶：牠們會自己去咬敵艦，放著不點也有咬的那一份。',
    '軍火箱裡的鏈彈專拆帆和繩子 —— 點在帆上就對了，船跑不動就只能挨打。'
  ];
  /** 提示配看板娘的哪個表情（I.TIPS 的第幾句；沒寫 ⇒ normal）⛔ 改了 TIPS 的順序要跟著改。 */
  I.TIP_MOOD = { 2: 'smug', 3: 'flustered', 9: 'smug', 12: 'smug', 14: 'smug' };
})(window.BSI = window.BSI || {});
