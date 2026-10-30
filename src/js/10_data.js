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
    //   ⇒ 鑑價師每級漲 1.5、賞金獵人 ×1.15 每級漲 1.6，所有升級再乘 e^(upgRamp × L(L−1)/2)。粗模（最便宜的先買）：0.5 h 海域 25、1 h 40、4 h 60、16 h 撞牆在 70 附近
    upgRamp: 0.002,
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
    strike0: 0.6, strikeMin: 0.25,   // 敵艦死傷到這個比例就降旗（骷髏旗升級往下壓）
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
    // 軍火箱（35_loot.js 的漂流寶物多一種；一般的 armsP、黃金寶船 armsGold 的機率）：點一下撿才有（自動撿 ⇒ 沉下去了）⇒ 接下來那把武器的 dur 秒點敵艦換成它（I.WEAPONS）
    armsP: 0.16, armsGold: 0.2,
    wreckY: -12               // 沉沒了還在往下沉的船：水面下這麼深（公尺）以內還看得到、咬得到
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
    { id: 'gun', tab: 'atk', ico: '🎯', name: '砲術訓練', c0: 250, g: 1.25, max: 0, eff: 1.1, desc: '火力 ×1.1：砲彈更兇、洞更大、敵艦的船殼更脆' },
    { id: 'reload', tab: 'atk', ico: '⏱️', name: '裝填演練', c0: 600, g: 1.45, max: 24, eff: 0.95, desc: '裝填時間 ×0.95' },
    { id: 'powder', tab: 'atk', ico: '💥', name: '火藥專家', c0: 5000, g: 1.6, max: 15, eff: 0.88, desc: '敵艦的火藥桶更不耐打（更容易殉爆）、殉爆賞金 +20%' },
    { id: 'hull', tab: 'def', ico: '🛡️', name: '船殼加固', c0: 250, g: 1.25, max: 0, eff: 1.1, desc: '船堅 ×1.1：敵彈打不穿、洞更小、砲手少受傷' },
    { id: 'pump', tab: 'def', ico: '🪣', name: '抽水機', c0: 800, g: 1.45, max: 20, eff: 1.15, desc: '抽水 ×1.15、進水 ×0.96' },
    { id: 'sail', tab: 'def', ico: '⛵', name: '帆裝調校', c0: 2000, g: 1.65, max: 10, eff: 1.05, desc: '航速、靈活 ×1.05' },
    { id: 'value', tab: 'eco', ico: '🪙', name: '鑑價師', c0: 300, g: 1.5, max: 0, eff: 1.1, desc: '每一格的價值 ×1.1' },
    { id: 'bounty', tab: 'eco', ico: '🏴‍☠️', name: '賞金獵人', c0: 1000, g: 1.6, max: 0, eff: 1.15, desc: '擊沉、俘獲、殉爆的賞金 ×1.15' },
    { id: 'fear', tab: 'eco', ico: '☠️', name: '骷髏旗', c0: 3000, g: 1.55, max: 20, eff: 0.94, desc: '敵艦死傷到更低的比例就降旗（俘獲賞金 ×1.5）' },
    { id: 'teeth', tab: 'eco', ico: '🦷', name: '鯊魚利齒', c0: 200, g: 1.45, max: 15, eff: 1.25, desc: '點敵艦哪裡就咬哪裡：咬得更大、咬下來的格 ×1.25' }
  ];
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
    { id: 'frenzy', key: '2', ico: '🌊', name: '鯊魚狂潮', cd: 120, dur: 20, zone: 7, desc: '20 秒內所有收入 ×3' },
    { id: 'mega', key: '3', ico: '🦈', name: '巨齒鯊', cd: 90, zone: 14, desc: '每艘敵艦都被狠狠咬一大口' },
    { id: 'repair', key: '4', ico: '🔧', name: '緊急搶修', cd: 120, dur: 25, zone: 24, desc: '25 秒內全艦抽水 ×4、不再進水' }
  ];

  /** 特殊武器（Tim 2026-10-30：「加入一些特殊攻擊武器(撿道具獲得) 可以替換咬吧(持續短時間 可能十秒) 例如噴火 或是砲擊(憑空生出砲彈 且威力可以很大) 傷害可以根據咬的等級」）：
   *  漂流寶物的軍火箱撿到 ⇒ dur 秒內點敵艦（空白鍵：鎖定的那艘）不咬，換成這把；兩下之間至少 gap 秒。威力照鯊魚利齒的等級（L）：
   *  fire 鯊魚噴火：從點的那一點靠鏡頭那一側的水面噴出 n0 ＋ ⌊L ÷ 5⌋ 團希臘火（核心 C.shot kind 'fire'：潑開燒人、點著木頭延燒、燒穿）；燒人的傷害 dmg0 ×（1 ＋ dmgL × L）
   *  cannon 天降砲擊：從那一點的斜上方憑空落下一顆爆裂彈（kind 'shell'）；彈重 m0 ×（1 ＋ mL × L）kg（炸開的半徑 ∝ ∛彈重，上限 300 kg），傷害同上 */
  I.WEAPONS = [
    { id: 'fire', ico: '🔥', name: '鯊魚噴火', dur: 10, gap: 0.3, n0: 2, dmg0: 2, dmgL: 0.2, desc: '從海裡噴出希臘火：點到哪裡燒到哪裡，木頭會延燒、燒穿' },
    { id: 'cannon', ico: '💣', name: '天降砲擊', dur: 10, gap: 0.45, m0: 30, mL: 0.3, dmg0: 3, dmgL: 0.2, desc: '天上憑空落下一顆大爆裂彈：點到哪裡炸到哪裡' }
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
    { id: 'epic', name: '史詩', w: 10, lv: 7, n: 8, loot: 8 }
  ];
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
    { id: 'shark', w: 10, ico: '🦈', name: '鯊群出沒', desc: '咬一口 ×2、漂流寶物 ×1.5', k: { bite: 2, loot: 1.5 } },
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
    { id: 'quest10', ico: '📜', name: '懸賞榜常客', desc: '完成 10 個賞金任務', t: function (S) { return S.st.quests >= 10; } }
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
    '藍鯊號是本鯊魚的船，打過第 15 海域就送妳。'
  ];
})(window.BSI = window.BSI || {});
