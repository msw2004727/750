# 方塊 - 等距方塊建造器

## 專案概述
基於瀏覽器的等距 (isometric) 方塊建造器，純 HTML/Canvas/JavaScript，未來將發展為放置型遊戲。

## 檔案結構
```
750/
├── index.html              # 主頁面（載入 game.js）
├── style.css               # 樣式
├── game.js                 # 打包輸出（由 build.cjs 產生，勿手動編輯）
├── build.cjs               # 打包腳本：node build.cjs（CommonJS）
├── package.json            # type:module + npm test 腳本
├── CLAUDE.md
├── game/                   # 源碼模組（開發時編輯這裡，25 個模組）
│   ├── main.js             # 入口：預設方塊 + 初始化
│   ├── constants.js        # 網格常數 (TILE, TW, TH, CUBE_H)
│   ├── state.js            # 集中狀態 S 物件 + draw 註冊
│   ├── tileData.js         # 素材定義 + 圖片預載
│   ├── spatialHash.js      # 空間雜湊 + 方塊 CRUD + animBlockCount
│   ├── coords.js           # 座標轉換 (toScreen/toGrid/snap)
│   ├── blocks.js           # 碰撞、flood fill、連通選取（用 spatial hash）
│   ├── geometry.js         # 純幾何計算（矩形/線段/flood fill）
│   ├── tools.js            # 工具輔助（委派 geometry + 狀態讀取）
│   ├── gridOverlay.js      # 格線 + 立體格線繪製
│   ├── minimap.js          # 右下角小地圖
│   ├── history.js          # undo/redo + Ctrl+Z/Y/C/V + 觸發自動存檔
│   ├── renderer.js         # 所有繪製 + 動畫 + draw()
│   ├── hitTest.js          # 等距方塊點擊偵測
│   ├── contextMenu.js      # 右鍵選單 + 屬性面板
│   ├── staging.js          # 暫存區 + 拖曳系統
│   ├── inputDrag.js        # 方塊拖曳機制（start/update/end + overlay）
│   ├── input.js            # 滑鼠/鍵盤事件分派（狀態機）
│   ├── touch.js            # 手機觸控 + 雙指縮放
│   ├── palette.js          # 素材面板 + 搜尋（共用 _createTileButton）
│   ├── saveLoad.js         # 儲存/載入/匯出 + 自動存檔 + Ctrl+S
│   ├── combos.js           # 自訂組合
│   └── ui.js               # 工具開關 + 面板 + 說明 + toast + 快捷鍵
├── test/                   # 自動化測試（86 個案例）
│   ├── helpers/
│   │   ├── dom-stub.js     # 輕量 DOM/Canvas/localStorage 模擬
│   │   └── state-factory.js # resetState() 測試隔離
│   ├── geometry.test.js    # 矩形/線段/flood fill
│   ├── constants.test.js   # 常數一致性
│   ├── eventBus.test.js    # 事件匯流排
│   ├── coords.test.js      # 座標轉換往返
│   ├── spatialHash.test.js # CRUD + 高方塊雙槽
│   ├── blocks.test.js      # hasBlockAt/reachable/selectConnected
│   ├── history.test.js     # undo/redo 狀態機
│   ├── hitTest.test.js     # 點擊偵測
│   ├── tools.test.js       # 工具委派
│   ├── renderer.test.js    # visibleRange
│   ├── minimap.test.js     # minimapToGrid
│   └── gameLoop.test.js    # drawNow
├── 素材/
│   ├── isometric tileset/        # A 組（115 張 32x32）
│   ├── isometric_jumpstart_v230311/  # B 組（132 張，32x32 + 32x48）
│   ├── 3232iso/                  # C 組（143 張 32x32，具名檔案）
│   ├── Isometric Strategy/      # D 組（94 張 64x100，含動畫）
│   └── medieval/                 # E 組（6 色盤變體，96x96）
└── 臨時/
```

## 開發工作流
1. 編輯 `game/*.js` 模組
2. 執行 `node build.cjs` 打包成 `game.js`
3. 執行 `npm test` 驗證（86 個自動化測試）
4. 直接開 `index.html`（支援 file://）
5. 或用 HTTP server 開發模式：改 index.html 為 `<script type="module" src="game/main.js">`

### 測試
- 框架：Node.js 內建 `node:test`（零依賴）
- 執行：`npm test`（等同 `node --test --test-concurrency=1 test/**/*.test.js`）
- 必須循序執行（`--test-concurrency=1`），因模組共享 S/world/camera 單例
- 新增模組時應同步新增對應測試

## 架構層次
```
┌─────────────────────────────────────────────┐
│  Editor Layer（可開關）                       │
│  input, inputDrag, touch, tools, palette    │
│  staging, combos, saveLoad, history, ui     │
│  contextMenu, hitTest                       │
├─────────────────────────────────────────────┤
│  Engine Layer                               │
│  World (entities + spatialHash)             │
│  Camera (coords.js)                         │
│  Renderer (renderer.js)                     │
│  Geometry (geometry.js)                     │
├─────────────────────────────────────────────┤
│  Data Layer                                 │
│  state.js (S 物件), constants.js            │
│  tileData.js (素材定義)                      │
└─────────────────────────────────────────────┘
```

## 模組化規則

### 狀態管理
- **camera**：視角狀態 → `import { camera } from './state.js'`
  - 讀取：`camera.x`, `camera.y`, `camera.zoom`, `camera.W`, `camera.H`
- **world**：世界資料 → `import { world } from './state.js'`
  - 讀取：`world.blocks`
- **S**：編輯器狀態 → `import { S } from './state.js'`
  - 讀取/寫入：`S.brushMode`, `S.dragBlock`, `S.selectedBlocks` 等
- **canvas / ctx**：從 state.js 直接 export（不變的常數）

### draw() 機制（GameLoop 驅動）
- `state.js` export `function draw()` → 只設 `S._dirty = true`
- `gameLoop.js` 的 rAF 迴圈檢查 dirty，呼叫 `_realDraw()` 繪製
- `renderer.js` 透過 `setRealDraw(_drawActual)` 註冊實際繪製函式
- 需要立即繪製時用 `drawNow()`（如匯出圖片）

### 跨模組函式引用
- 若 A 模組需要 B 模組的函式但會造成循環 import
  → 用 callback 註冊模式（如 input.js 的 `setJumpToTile`）
- 打包時 build.js 自動移除此間接層

### 新增模組的步驟
1. 在 `game/` 建立新 `.js` 檔
2. 從需要的模組 import（S, draw, 工具函式等）
3. export 公開 API
4. 在 `game/main.js` 加 `import './newModule.js'`
5. 在 `build.js` 的 ORDER 陣列加入檔名（依賴順序）
6. 執行 `node build.cjs` 驗證

### 檔案變更前必讀（強制規則）
**每次建立或修改任何 game/ 下的 .js 檔案之前，必須先思考以下問題：**

1. **這段程式碼屬於哪一層？** （Data / Engine / Editor）
   - 放錯層 = 未來拆不開。Engine 層的東西絕對不能 import Editor 層。
2. **該放在現有模組還是新建模組？**
   - 判斷標準見下方「拆分規則」
   - 如果現有模組已經做太多事（超過 300 行或多於 2 個職責），先拆再寫
3. **新增的狀態放哪裡？**
   - 引擎狀態 → `world` 或 `camera`
   - 編輯器狀態 → `S`
   - 遊戲狀態 → `game`
   - 禁止在模組內用 `let` 自建全域狀態（除非是純粹的模組內部私有變數）
4. **會不會造成循環依賴？**
   - 畫依賴圖：A → B → C → A？用 callback 註冊模式解開
5. **build.cjs 有沒有更新？**
   - 新增模組必須加入 ORDER 陣列，否則打包遺漏
6. **跨平台相容性有沒有確認？**
   - 每次 UI / CSS / 互動設計都**必須**同時考慮：
     - 瀏覽器：**LINE 內建瀏覽器**、**Safari**（iOS）、**Chrome**（Android / PC）
     - 裝置：**PC**（滑鼠 + 鍵盤）、**手機**（觸控 + 小螢幕）
   - 不能使用僅限特定瀏覽器的 API（如 File System Access API）而沒有 fallback
   - 觸控操作不能依賴 hover 狀態（手機沒有 hover）
   - 按鈕/面板在手機上不能獨佔過多垂直空間
   - CSS 不使用 `-webkit-` 以外的 vendor prefix（LINE/Safari 需要）

### 拆分規則

#### 必須拆分的情況
- 檔案超過 **300 行**
- 一個檔案做 **2 件以上不相關的事**（例如同時處理輸入和繪製）
- 同一段邏輯被 **3 個以上模組** 重複使用 → 抽成共用模組
- 新增一整塊**獨立功能**（例如背包系統、對話系統）→ 新建模組

#### 不該拆分的情況
- 拆完後兩邊高度耦合、互相大量 import → 強行拆反而更亂
- 程式碼不到 50 行且只被一個地方使用 → 留在原處
- 只是「看起來長」但邏輯連貫（例如一個完整的 draw 流程）→ 不拆

#### 拆分優先級（風險由低到高）
1. **純資料** → 風險最低（如 tileData.js）
2. **純計算/工具函式** → 無副作用，安全（如 tools.js, blocks.js）
3. **獨立 UI 區塊** → 有 DOM 操作但範圍明確（如 staging.js, palette.js）
4. **事件處理** → 最複雜，拆時確保狀態流向清晰（如 input.js）

#### 命名慣例
- 檔名用 **camelCase**：`gameLoop.js`, `spatialHash.js`
- 函式/變數用 **camelCase**：`addBlock`, `toScreen`
- 常數用 **UPPER_SNAKE**：`TILE`, `CUBE_H`
- 私有函式（不 export）加底線前綴：`_drawActual`, `_realDraw`
- 子物件用語義名詞：`camera`, `world`, `bus`

#### 層級依賴規則（只能往下依賴，不能往上）
```
Editor → Engine → Data     ✓ 正確方向
Engine → Editor             ✗ 禁止
Data → Engine               ✗ 禁止
同層互相依賴                 △ 盡量避免，必要時用 eventBus 解耦
```

## 技術參數
- TILE = 40, 等距角度 = 30°
- CUBE_H = TILE * 0.8（一格高度）
- 貼圖對齊方塊底部，透明空間在上方
- 像素風格：imageSmoothingEnabled = false
- 圖片路徑含中文（素材），URL 編碼為 %E7%B4%A0%E6%9D%90

## 座標系統
- **高度** (gz)：-5 到 +5，方塊垂直堆疊位置
- **圖層** (layer)：0 到 5，同高度同位置的重疊深度
- 碰撞只在**同高度 + 同圖層**內檢查
- 操作（拖曳、刪除）只作用於當前高度 + 當前圖層的物件
- hitTest 只偵測當前高度 + 圖層，避免誤選

## 素材尺寸規則
- 32x32：一格，佔 1 層高度
- 32x48：一格半，佔 2 層高度（當前層 + 上方層，srcH > 32 判定）
- 64x100：Strategy 組，drawCube 以寬度為基準等比縮放
- drawCube 保持原始寬高比

## 功能清單
- 五來源分頁（Scrabling / Jumpstart / 3232iso / Strategy / Medieval 6 色盤變體）
- 素材按鈕顯示編號、關鍵字搜尋
- 高度 ▲▼ + 圖層 ▲▼ 切換
- 座標顯示、格線、立體格線、小地圖、圖層標示
- 筆刷、橡皮擦、填充、矩形、線段工具（互斥）
- 鍵盤快捷鍵：B(筆刷) E(橡皮擦) G(填充) R(矩形) L(線段) I(吸管) [ ](高度) Esc(取消)
- 吸管工具（I 鍵）：點擊已放置方塊設為當前筆刷
- Flood fill 拖曳限制（被圍牆困住只能在內部移動）
- Shift 選取 / 框選 / 整組拖曳
- Ctrl 複製拖曳、Ctrl+C/V 複製貼上
- Ctrl+S 儲存、自動存檔（5 秒 debounce + 30 秒硬上限 + beforeunload）
- 儲存/載入場景（JSON）、匯出 PNG
- 自訂組合（存選取 → 命名 → 一鍵重複放置）
- 組合存在 localStorage，持久保留
- 暫存區（9 格），拖曳放入/取出
- 空白處拖曳平移視角、滾輪縮放
- 雙擊/右鍵刪除方塊、右鍵選單（含屬性面板）
- 手機觸控、雙指縮放、長按拖曳
- 動畫素材支援（spritesheet）
- 隱藏/顯示指定高度層
- Toast 提示系統（非阻塞，取代 alert）

## 切割規則（jumpstart 素材）
- 基礎格子：32x32（16x10 grid）
- 碎片判定：像素數 < 40 且內容集中在底部，下方格子 > 200px → 合併為 32x48
- 合併方式：上方格子底部 16px + 下方格子完整 32px
- 強制合併：grid (0,13)+(1,13)、(0,14)+(1,14)、(0,15)+(1,15)
- 強制不合併：grid (3,8)、(3,10)（獨立小裝飾）

## 已完成的架構基礎設施

### GameLoop + dirty flag（gameLoop.js）
- `draw()` 只設 `S._dirty = true`，gameLoop 每幀檢查並統一繪製一次
- `drawNow()` 供匯出圖片等需要立即繪製的場景
- `setRealDraw(fn)` 讓 renderer 註冊實際繪製函式
- 動畫偵測：`S.animBlockCount` 計數器（由 addBlock/removeBlock/setBlocks 維護），取代每幀全掃
- 動畫（shakeBlock、spritesheet）統一由 gameLoop 驅動

### EventBus（eventBus.js）
- `bus.on(event, handler)` / `bus.off(event, handler)` / `bus.emit(event, data)`
- 已就位，待逐步遷移模組間直接呼叫為事件驅動

### Entity 擴展
- `addBlock()` 和 `setBlocks()` 自動補全 `type:'tile'` + `state:{}`
- 舊存檔載入時自動加上預設值，向後相容
- 未來新實體類型直接帶不同 type（如 'building', 'character'）

### State 拆分
- `camera`：`{x, y, zoom, W, H}` — 從 state.js 獨立 export
- `world`：`{blocks}` — 從 state.js 獨立 export
- `S`：保留編輯器狀態（工具模式、選取、暫存區、歷史等）
- 各模組按需 import：`import { S, camera, world } from './state.js'`

### 自動存檔（saveLoad.js）
- 每次編輯操作（saveSnapshot）觸發 debounce 存檔（5 秒後）
- 硬上限 30 秒強制存檔
- `window.beforeunload` 關閉前存檔
- `Ctrl+S` 攔截瀏覽器存檔，執行遊戲存檔 + 「已存」視覺提示

### 快捷鍵系統（ui.js）
- 輸入框 focus 時自動跳過，不吃鍵盤輸入
- 工具切換：B/E/G/R/L，toggle 行為（再按一次關閉）
- 吸管：I（讀取滑鼠下方方塊為筆刷）
- 高度：[ ]（-1 / +1）
- Escape：取消所有工具和選取
- `showToast(msg, duration)` 取代所有 alert()

### inputDrag.js（從 input.js 拆出）
- `startDrag(hit, pos, mode)` — 初始化拖曳狀態
- `updateDrag(pos)` — 單方塊/複製/群組三種模式的位移邏輯
- `endDrag()` — 結束拖曳，處理手機暫存區放置，回傳 boolean
- overlay 函式：`createDragOverlay`/`updateDragOverlay`/`removeDragOverlay`

### 渲染排序公式
- `(gx+gy)*1000 + gz*10 + layer`（renderer.js 和 hitTestAll 統一使用）

### 已知的模組循環（安全）
- `ui.js → history.js → saveLoad.js → ui.js`（全部是函式呼叫，非頂層取值，執行期安全）

## 遊戲設計（Game Design）

> **強制規則**：所有與遊戲內容/機制/平衡相關的設計變更，每次都必須經過**至少三位遊戲領域專家**共同研討，達成一致認可後才可實作。

### 五行資源系統

五種基礎資源：**金（Metal）、木（Wood）、水（Water）、火（Fire）、土（Earth）**

#### 相生循環（鄰接加成 +50%）
```
木 → 火 → 土 → 金 → 水 → 木
（木生火、火生土、土生金、金生水、水生木）
```
建築旁邊放置相生母元素建築 → 產量 +50%

#### 相剋循環（鄰接懲罰 -30%，v2）
```
金剋木、木剋土、土剋水、水剋火、火剋金
```

#### 資源參數
| 資源 | 基礎產率/tick | 稀有度 | 起始數量 |
|------|-------------|--------|---------|
| 木 | 2 | 常見 | 30 |
| 火 | 1.5 | 中等 | 20 |
| 土 | 1.5 | 中等 | 20 |
| 金 | 1 | 稀有 | 10 |
| 水 | 1.5 | 中等 | 15 |

### 地形系統

每個方塊關聯一個地形類型，地形決定移動成本和可建造性。

| 地形 | moveCost | buildable | 元素親和 | yield |
|------|----------|-----------|---------|-------|
| grass | 1 | 是 | 木 | 1 |
| dirt | 1 | 是 | 土 | 1 |
| stone | 2 | 是 | 土 | 2 |
| water | 3 | 否 | 水 | 2 |
| lava | 0(不可) | 否 | 火 | 3 |
| sand | 2 | 是 | 土 | 1 |
| snow | 2 | 是 | 水 | 1 |
| forest | 2 | 否 | 木 | 2 |

- **地形親和**：建築蓋在對應元素地形上 → +25%（與鄰接疊加）
- moveCost 0 = 不可通行

### 建築系統（v1）

建造成本遵循**相生循環**（花母元素建造子元素建築）。

| 建築 | 元素 | 成本 | 效果 |
|------|------|------|------|
| 林場 Grove | 木 | 10水 | 採集木，2/tick |
| 熔爐 Furnace | 火 | 10木 | 採集火，1.5/tick |
| 窯坊 Kiln | 土 | 10火 | 採集土，1.5/tick |
| 礦坑 Mine | 金 | 15土 | 採集金，1/tick |
| 井泉 Well | 水 | 10金 | 採集水，1.5/tick |
| 瞭望塔 Watchtower | — | 10木+5土 | 擴展迷霧半徑 |
| 道路 Road | — | 2土 | moveCost 覆寫為 0.5 |
| 圍牆 Wall | — | 3土 | 不可通行屏障 |

### 移動/時間系統
- v1 無玩家角色 token，移動為抽象操作
- 點擊目標格 → 計算路徑 moveCost 總和 → 等待時間
- 等待期間採集建築持續產出（idle 核心）
- Tick 間隔：2 秒

### 核心遊戲循環
```
起始 3x3 可見 + 起始資源
  → 蓋採集站 → 產出資源（idle）
  → 蓋瞭望塔 → 擴展迷霧 → 發現新資源
  → 蓋道路 → 減少移動時間
  → 相生鏈布局 → 鄰接加成 → 產量倍增
  → 循環放大
```

### 資料模型
```js
// 地形定義（terrainData.js）
TERRAIN = { grass: { moveCost:1, buildable:true, resource:'木', yield:1 }, ... }

// 方塊 state 擴展
state: { terrain:'grass', building:null, resourceLeft:10 }

// 全域遊戲狀態（state.js game 物件）
game.resources = { 木:30, 火:20, 土:20, 水:15, 金:10 }
```
