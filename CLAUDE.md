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
│  tools, palette, staging, combos, saveLoad  │
│  history (undo/redo), ui                    │
├─────────────────────────────────────────────┤
│  Engine Layer                               │
│  World (entities + spatialHash)             │
│  Camera (coords.js)                         │
│  Renderer (renderer.js)                     │
│  Input (input.js + touch.js)                │
├─────────────────────────────────────────────┤
│  Data Layer                                 │
│  state.js (S 物件), constants.js            │
│  tileData.js (素材定義)                      │
└─────────────────────────────────────────────┘
```

## 模組化規則

### 狀態管理
- 所有共享可變狀態集中在 `state.js` 的 `S` 物件
- 模組透過 `import { S } from './state.js'` 存取
- 讀取：`S.blocks`, `S.camX`, `S.zoom`
- 寫入：`S.brushMode = false`, `S.dragBlock = null`
- `canvas` 和 `ctx` 從 state.js 直接 export（不變的常數）

### draw() 循環依賴解法
- `state.js` export `let draw` + `_setDraw(fn)`
- `renderer.js` 定義實際 draw()，呼叫 `_setDraw(draw)` 註冊
- 其他模組 `import { draw } from './state.js'` 呼叫
- 打包時 build.js 自動移除此間接層

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

### 拆分判斷標準
- 單一職責：一個模組只做一件事
- 超過 300 行考慮拆分
- 有獨立的初始化邏輯（addEventListener）適合獨立
- 純資料/純計算優先抽出（最容易拆、最不容易出錯）

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

## 未來規劃 — 架構基礎設施（4 步）

### Step 1: GameLoop + dirty flag
- 新增 `game/gameLoop.js`
- 取代目前到處呼叫 draw() 的模式
- 任何狀態改變只標記 `dirty = true`，每幀統一繪製一次
- 提供 `update(dt)` 鉤子供未來遊戲系統使用
- 改動範圍：renderer.js（draw 不再被直接呼叫）、所有呼叫 draw() 的模組

### Step 2: EventBus
- 新增 `game/eventBus.js`（~30 行 pub/sub）
- API：`bus.on(event, handler)`, `bus.emit(event, data)`
- 用途：模組間解耦通訊（放置方塊 → 觸發重算、UI 更新等）
- 不急著全面替換，先建好基礎，逐步遷移

### Step 3: Entity 擴展
- 方塊資料從 `{gx, gy, gz, layer, color, srcH}` 擴展為 Entity
- 新增 `type` 欄位（現有方塊 type = 'tile'）
- 新增 `state` 物件（供遊戲邏輯使用：等級、血量、產量等）
- renderer 和 spatialHash 不受影響（只看位置和外觀欄位）
- 為未來的建築、角色、裝飾等不同實體類型做準備

### Step 4: S 物件拆分
- `S` 拆成有邊界的子物件：
  - `world`：blocks/entities、spatialHash
  - `camera`：camX, camY, zoom, W, H
  - `editor`：工具模式、選取、暫存區、歷史
- 各模組只 import 需要的子物件，建立明確的讀寫邊界
- 為「遊戲模式 vs 編輯模式」切換做準備
