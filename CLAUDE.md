# 方塊 - 等距方塊建造器

## 專案概述
基於瀏覽器的等距 (isometric) 方塊建造器，純 HTML/Canvas/JavaScript，未來將發展為放置型遊戲。

## 檔案結構
```
750/
├── index.html              # 主頁面（載入 game.js）
├── style.css               # 樣式
├── game.js                 # 打包輸出（由 build.js 產生，勿手動編輯）
├── build.js                # 打包腳本：node build.js
├── CLAUDE.md
├── game/                   # 源碼模組（開發時編輯這裡）
│   ├── main.js             # 入口：預設方塊 + 初始化
│   ├── constants.js        # 網格常數 (TILE, TW, TH, CUBE_H)
│   ├── state.js            # 集中狀態 S 物件 + draw 註冊
│   ├── tileData.js         # 素材定義 + 圖片預載
│   ├── spatialHash.js      # 空間雜湊 + 方塊 CRUD
│   ├── coords.js           # 座標轉換 (toScreen/toGrid/snap)
│   ├── blocks.js           # 碰撞、flood fill、連通選取
│   ├── tools.js            # 工具輔助 (矩形/線段/填充計算)
│   ├── history.js          # undo/redo + Ctrl+Z/Y/C/V
│   ├── renderer.js         # 所有繪製 + 動畫 + draw()
│   ├── staging.js          # 暫存區 + 拖曳系統
│   ├── input.js            # 滑鼠/鍵盤輸入 + 右鍵選單
│   ├── touch.js            # 手機觸控 + 雙指縮放
│   ├── palette.js          # 素材面板 + 搜尋
│   ├── saveLoad.js         # 儲存/載入/匯出 + 高度控制
│   ├── combos.js           # 自訂組合
│   └── ui.js               # 工具開關 + 面板 + 說明
├── 素材/
│   ├── isometric tileset/        # A 組（115 張 32x32）
│   │   └── separated images/
│   ├── isometric_jumpstart_v230311/  # B 組（132 張，32x32 + 32x48）
│   │   ├── separated/
│   │   └── tile_log.txt
│   ├── 3232iso/                  # C 組（143 張 32x32，具名檔案）
│   └── Isometric Strategy/      # D 組（94 張 64x100，含動畫）
└── 臨時/
```

## 開發工作流
1. 編輯 `game/*.js` 模組
2. 執行 `node build.js` 打包成 `game.js`
3. 直接開 `index.html`（支援 file://）
4. 或用 HTTP server 開發模式：改 index.html 為 `<script type="module" src="game/main.js">`

## 架構層次
```
┌─────────────────────────────────────────────┐
│  Editor Layer（可開關）                       │
│  input, touch, tools, palette, staging      │
│  combos, saveLoad, history, ui              │
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
6. 執行 `node build.js` 驗證

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
   - 禁止在模組內用 `let` 自建全域狀態（除非是純粹的模組內部私有變數）
4. **會不會造成循環依賴？**
   - 畫依賴圖：A → B → C → A？用 callback 註冊模式解開
5. **build.js 有沒有更新？**
   - 新增模組必須加入 ORDER 陣列，否則打包遺漏

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
- 四來源分頁（Scrabling / Jumpstart / 3232iso / Strategy），每來源有子分類
- 素材按鈕顯示編號、關鍵字搜尋
- 高度 ▲▼ + 圖層 ▲▼ 切換
- 座標顯示、格線、立體格線、小地圖
- 筆刷、橡皮擦、填充、矩形、線段工具（互斥）
- Flood fill 拖曳限制（被圍牆困住只能在內部移動）
- Shift 選取 / 框選 / 整組拖曳
- Ctrl 複製拖曳、Ctrl+C/V 複製貼上
- 儲存/載入場景（JSON）、匯出 PNG
- 自訂組合（存選取 → 命名 → 一鍵重複放置）
- 組合存在 localStorage，持久保留
- 暫存區（9 格），拖曳放入/取出
- 空白處拖曳平移視角、滾輪縮放
- 雙擊/右鍵刪除方塊、右鍵選單
- 手機觸控、雙指縮放、長按拖曳
- 動畫素材支援（spritesheet）
- 隱藏/顯示指定高度層

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
