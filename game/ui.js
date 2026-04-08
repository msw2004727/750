import { S, camera, canvas, draw, world } from './state.js';
import { setBlocks, removeBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { clearDrawTools, updateBrushIndicator } from './tools.js';
import { hitTest } from './hitTest.js';

// ── Tool checkboxes (mutually exclusive draw tools) ──
document.getElementById('chkBrush').addEventListener('change', (e) => { clearDrawTools('chkBrush'); S.brushMode = e.target.checked; canvas.style.cursor = S.brushMode?'crosshair':'grab'; });
document.getElementById('chkEraser').addEventListener('change', (e) => { clearDrawTools('chkEraser'); S.eraserMode = e.target.checked; canvas.style.cursor = S.eraserMode?'crosshair':'grab'; });
document.getElementById('chkFill').addEventListener('change', (e) => { clearDrawTools('chkFill'); S.fillMode = e.target.checked; canvas.style.cursor = S.fillMode?'crosshair':'grab'; });
document.getElementById('chkRect').addEventListener('change', (e) => { clearDrawTools('chkRect'); S.rectMode = e.target.checked; canvas.style.cursor = S.rectMode?'crosshair':'grab'; });
document.getElementById('chkLine').addEventListener('change', (e) => { clearDrawTools('chkLine'); S.lineMode = e.target.checked; canvas.style.cursor = S.lineMode?'crosshair':'grab'; });
document.getElementById('chkMinimap').addEventListener('change', (e) => { S.showMinimap = e.target.checked; draw(); });
document.getElementById('chkSelect').addEventListener('change', (e) => { S.selectMode = e.target.checked; });
document.getElementById('chkLocate').addEventListener('change', (e) => { S.locateMode = e.target.checked; });
document.getElementById('chkCopy').addEventListener('change', (e) => { S.copyMode = e.target.checked; });
document.getElementById('chkHover').addEventListener('change', (e) => { S.showHover = e.target.checked; S.hoverBlock = null; draw(); });
document.getElementById('chkGrid').addEventListener('change', (e) => { S.showGrid = e.target.checked; draw(); });
document.getElementById('chkVGrid').addEventListener('change', (e) => { S.showVGrid = e.target.checked; draw(); });
document.getElementById('chkCoord').addEventListener('change', (e) => { S.showCoords = e.target.checked; draw(); });
document.getElementById('chkLayerInfo').addEventListener('change', (e) => { S.showLayerInfo = e.target.checked; draw(); });
document.getElementById('chkAutoSelect').addEventListener('change', (e) => { S.autoSelectMode = e.target.checked; });
document.getElementById('chkBlockInfo').addEventListener('change', (e) => { S.showBlockInfo = e.target.checked; draw(); });

// ── Height + Layer controls ──
export function updateHeightUI(){
  const el = document.getElementById('heightNum');
  if(el) el.textContent = S.currentHeight;
}
export function updateLayerUI(){
  const el = document.getElementById('layerNum');
  if(el) el.textContent = S.currentLayer;
}
document.getElementById('heightUp').addEventListener('click', () => {
  if(S.currentHeight < 5){ S.currentHeight++; updateHeightUI(); draw(); }
});
document.getElementById('heightDown').addEventListener('click', () => {
  if(S.currentHeight > -5){ S.currentHeight--; updateHeightUI(); draw(); }
});
document.getElementById('layerUp').addEventListener('click', () => {
  if(S.currentLayer < 5){ S.currentLayer++; updateLayerUI(); draw(); }
});
document.getElementById('layerDown').addEventListener('click', () => {
  if(S.currentLayer > 0){ S.currentLayer--; updateLayerUI(); draw(); }
});

// ── Fog of war controls ──
document.getElementById('fogRadius').addEventListener('change', (e) => {
  world.fogRadius = parseInt(e.target.value) || 0;
  draw();
});
document.getElementById('fogCenterGx').addEventListener('change', (e) => {
  world.fogCenter.gx = parseInt(e.target.value) || 0;
  draw();
});
document.getElementById('fogCenterGy').addEventListener('change', (e) => {
  world.fogCenter.gy = parseInt(e.target.value) || 0;
  draw();
});

// ── Home button ──
document.getElementById('homeBtn').addEventListener('click', () => {
  camera.x = 0; camera.y = 0; camera.zoom = 1; draw();
});

// ── Clear all (with confirmation modal) ──
document.getElementById('clearBtn').addEventListener('click', () => {
  const overlay = document.getElementById('cloudOverlay');
  document.getElementById('cloudTitle').textContent = '確認清除';
  document.getElementById('cloudBody').innerHTML =
    '<div style="color:#f66;font-size:14px;margin:12px 0;">確定要刪除所有方塊？</div>' +
    '<div style="color:#888;font-size:12px;margin-bottom:12px;">此操作可用 Ctrl+Z 復原</div>' +
    '<button class="cloud-action" id="_clearCancel">取消</button>' +
    '<button class="cloud-action" id="_clearConfirm" style="color:#f66;border-color:#633;">確認清除</button>';
  overlay.style.display = 'flex';
  document.getElementById('_clearCancel').addEventListener('click', () => { overlay.style.display = 'none'; });
  document.getElementById('_clearConfirm').addEventListener('click', () => {
    overlay.style.display = 'none';
    saveSnapshot();
    setBlocks([]); draw();
  });
});

// ── Clear characters only ──
document.getElementById('clearCharsBtn').addEventListener('click', () => {
  const overlay = document.getElementById('cloudOverlay');
  document.getElementById('cloudTitle').textContent = '確認清除角色';
  document.getElementById('cloudBody').innerHTML =
    '<div style="color:#f66;font-size:14px;margin:12px 0;">確定要刪除所有角色？</div>' +
    '<div style="color:#888;font-size:12px;margin-bottom:12px;">素材方塊不受影響，此操作可用 Ctrl+Z 復原</div>' +
    '<button class="cloud-action" id="_clearChCancel">取消</button>' +
    '<button class="cloud-action" id="_clearChConfirm" style="color:#f66;border-color:#633;">確認清除</button>';
  overlay.style.display = 'flex';
  document.getElementById('_clearChCancel').addEventListener('click', () => { overlay.style.display = 'none'; });
  document.getElementById('_clearChConfirm').addEventListener('click', () => {
    overlay.style.display = 'none';
    saveSnapshot();
    const chars = world.blocks.filter(b => b.type === 'character');
    for(const c of chars) removeBlock(c);
    draw();
  });
});

// ── Fold panels ──
document.querySelectorAll('.fold-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.dataset.target);
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'flex';
    btn.classList.toggle('open', !isOpen);
    btn.textContent = btn.textContent.replace(isOpen ? '\u25B2' : '\u25BC', isOpen ? '\u25BC' : '\u25B2');
  });
});

// ── Help panel ──
const helpHTML = `
<h3>基本操作</h3>
<kbd>左鍵</kbd> 拖曳方塊 — 移動（被四面包圍無法移動）<br>
<kbd>Ctrl</kbd>+<kbd>拖曳</kbd> — 複製並拖曳副本<br>
拖曳中 <kbd>滾輪</kbd> — 微調素材高度（1/5 格）<br>
<kbd>雙擊</kbd> — 刪除方塊<br>
空白處拖曳 — 平移視角<br>
<kbd>滾輪</kbd> — 縮放

<h3>鍵盤快捷鍵</h3>
<kbd>B</kbd> 筆刷 | <kbd>E</kbd> 橡皮擦 | <kbd>G</kbd> 填充 | <kbd>R</kbd> 矩形 | <kbd>L</kbd> 線段<br>
<kbd>I</kbd> 吸管（點擊方塊設為筆刷）<br>
<kbd>[</kbd> <kbd>]</kbd> 高度 -1 / +1<br>
<kbd>Escape</kbd> 取消所有工具和選取<br>
<kbd>Delete</kbd> 刪除選取的方塊<br>
<kbd>Ctrl+Z</kbd> 返回 | <kbd>Ctrl+Y</kbd> 復原<br>
<kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd> 複製 / 貼上選取組<br>
<kbd>Ctrl+S</kbd> 儲存到瀏覽器

<h3>右鍵選單</h3>
右鍵點擊方塊可選擇：<br>
<kbd>複製</kbd> 複製到相鄰空位 | <kbd>放入暫存</kbd> 存到暫存區<br>
<kbd>組合放入暫存</kbd>（需先選取多個）| <kbd>更改層級</kbd> | <kbd>刪除</kbd>

<h3>工具箱（互斥，同時只能開一個）</h3>
<kbd>筆刷</kbd> — 先點素材選為筆刷，再在畫布上點擊/拖曳連續放置<br>
<kbd>橡皮擦</kbd> — 點擊/拖曳連續刪除當前高度+圖層的方塊<br>
<kbd>填充</kbd> — 游標移動顯示半透明預覽，點擊確認填充（上限 500 格）<br>
<kbd>矩形</kbd> — 按住拖曳畫出矩形範圍，放開後填充整個矩形<br>
<kbd>線段</kbd> — 按住拖曳畫出直線路徑，放開後沿線填充

<h3>快捷類</h3>
<kbd>選取</kbd> — 取代 Shift 鍵，點擊方塊高亮相連群組，拖曳空白處框選<br>
<kbd>定位</kbd> — 點擊畫布上的方塊，自動跳到素材面板對應位置<br>
<kbd>複製</kbd> — 取代 Ctrl 鍵，拖曳方塊產生副本<br>
<kbd>自動選取</kbd> — 點擊任意方塊，自動切換到該方塊的高度+圖層

<h3>顯示類</h3>
<kbd>懸停</kbd> — 滑鼠移到方塊上時反白高亮<br>
<kbd>格線</kbd> — 顯示各高度的水平等距格線，當前高度加亮<br>
<kbd>立體</kbd> — 顯示垂直高度線和刻度標籤<br>
<kbd>格線</kbd>+<kbd>立體</kbd> 同時勾選 → 當前高度顯示 3D 立體方格效果<br>
<kbd>座標</kbd> — 在每個方塊上顯示 gx,gy 座標<br>
<kbd>小地圖</kbd> — 右下角等距縮覽圖，可點擊/拖曳平移視角<br>
<kbd>圖層標示</kbd> — 在每個方塊上顯示 H(高度) L(圖層) 標籤，顏色依圖層區分

<h3>隱藏高度</h3>
<kbd>下拉選單</kbd> — 選擇要操作的高度層<br>
<kbd>隱藏/顯示</kbd> — 切換選中高度層的可見性<br>
<kbd>全部顯示</kbd> — 一鍵恢復所有隱藏的高度層和圖層

<h3>選取與整組操作</h3>
<kbd>Shift</kbd>+<kbd>點擊</kbd> — 高亮相鄰方塊群組（flood fill 連通）<br>
<kbd>Shift</kbd>+<kbd>拖曳</kbd> — 框選矩形區域內的方塊<br>
拖曳高亮方塊 — 整組移動<br>
<kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd> — 複製/貼上選取組<br>
點擊空白 — 取消高亮

<h3>暫存區（左上 3 格）</h3>
從素材面板或畫布拖曳到暫存區存放<br>
相同素材自動堆疊（顯示 x2, x3...）<br>
點擊暫存格 — 放到畫面中央（堆疊時數量 -1）<br>
拖曳暫存格 — 放到指定位置<br>
<kbd>✕</kbd> 清除該格 | 手機雙擊 — 清除該格

<h3>高度與圖層</h3>
<kbd>高度 ▲▼</kbd> — 切換垂直高度（-5 ~ +5）<br>
<kbd>圖層 ▲▼</kbd> — 切換重疊圖層（0 ~ 5）<br>
只能操作當前高度 + 圖層的方塊

<h3>素材面板</h3>
五組來源：Scrabling / Jumpstart / 3232iso / Strategy / Medieval（6 色盤）<br>
類別下拉選「全部」可一次顯示該來源所有素材<br>
<kbd>搜尋</kbd> — 輸入關鍵字篩選全部素材（檔名或編號）<br>
點擊素材 — 放到畫面中央 | 拖曳素材 — 放到畫布或暫存區

<h3>範本</h3>
高亮 2+ 方塊 → <kbd>儲存</kbd> → 命名<br>
選範本 → <kbd>放置</kbd> → 一鍵放入 | <kbd>刪除</kbd> → 移除範本

<h3>檔案操作</h3>
<kbd>儲存</kbd> — 覆蓋存到瀏覽器（開啟時自動載入，每次編輯自動存檔）<br>
<kbd>另存</kbd> — 下載新 JSON 檔案<br>
<kbd>載入</kbd> — 從 JSON 檔案讀取<br>
<kbd>☁ 上傳</kbd> — 存到雲端，取得分享代碼<br>
<kbd>☁ 下載</kbd> — 貼上代碼，載入別人分享的地圖<br>
<kbd>匯出圖</kbd> — 下載 PNG 截圖<br>
<kbd>原點</kbd> — 回到 (0,0) | <kbd>清除全部</kbd> — 刪除所有方塊（可 Ctrl+Z 復原）

<h3>手機操作</h3>
單指拖曳方塊 — 移動 | 單指空白處 — 平移<br>
雙指捏合 — 縮放 | 雙擊 — 刪除方塊<br>
長按素材 — 拖曳到畫布或暫存區<br>
拖曳方塊到暫存區範圍 — 存入暫存

<h3>素材庫操作</h3>
<kbd>Ctrl</kbd>+<kbd>左鍵</kbd> — 逐個切換選取素材<br>
<kbd>Shift</kbd>+<kbd>左鍵拖曳</kbd> — 掃過的素材全部選入<br>
右鍵素材 → <kbd>修改高度</kbd>（blockH：16/32/48/96）<br>
右鍵素材 → <kbd>修改屬性</kbd>（五行：金/木/水/火/土/無）<br>
<kbd>匯出偏移</kbd> — 匯出所有偏移、屬性、高度修改

<hr style="border-color:#333;margin:16px 0;">

<h3 style="color:#FFD700;">角色手冊</h3>

<h3>陣營系統</h3>
四個陣營，放置角色時選擇：<br>
<span style="color:#4A9FDD;">正義（藍）</span> — 攻擊反派和邪惡，不打善良<br>
<span style="color:#E85050;">反派（紅）</span> — 攻擊正義和邪惡，不打善良<br>
<span style="color:#9B59B6;">邪惡（紫）</span> — 攻擊所有人（包括善良）<br>
<span style="color:#5CBF5C;">善良（綠）</span> — 永不攻擊，被攻擊時逃跑<br>
角色腳底的彩色圓環 = 陣營顏色

<h3>角色職業</h3>
<b>村民</b>（HP:30 ATK:3 DEF:1 SPD:3）<br>
— 弱小，適合做平民/NPC。無攻擊動畫時以 idle 替代<br>
<b>步兵</b>（HP:80 ATK:10 DEF:8 SPD:2 近戰）<br>
— 高血高防，近身肉搏。劍士、戟兵、槍兵、盾兵、王子、國王<br>
<b>射手</b>（HP:50 ATK:12 DEF:3 SPD:2 射程:4）<br>
— 遠程物理攻擊，發射箭矢（250ms 飛行），防禦低<br>
<b>法師</b>（HP:45 ATK:15 DEF:2 SPD:1 射程:3 MP:100）<br>
— 遠程魔法攻擊，發射法球（400ms 飛行），穿透 50% 防禦<br>
— 每次攻擊消耗 15 MP，MP 歸零時逃跑，回到 30 MP 重新參戰<br>
<b>騎兵</b>（HP:70 ATK:12 DEF:5 SPD:4 近戰）<br>
— 高速近戰，騎士和馬兵

<h3>戰鬥機制</h3>
自動戰鬥：偵測到敵對角色 → 自動接近 → 攻擊<br>
<kbd>近戰</kbd> — 鄰格直接扣血，傷害 = ATK - DEF（最少 1）<br>
<kbd>遠程</kbd> — 發射箭矢/法球，到達目標後扣血<br>
<kbd>魔法</kbd> — 法球穿透 50% 防禦，消耗 MP，-MP 顯示藍字<br>
死亡 → 播放倒地動畫 → 消失

<h3>飄字顏色</h3>
<span style="color:#ff3333;">-12 物理傷害（紅）</span><br>
<span style="color:#cc44ff;">-15 魔法傷害（紫）</span><br>
<span style="color:#33ff66;">+4 治療回血（綠）</span><br>
<span style="color:#4488ff;">-15 MP 消耗（藍）</span><br>
<span style="color:#44ddff;">+8 MP 恢復（青）</span>

<h3>逃跑與休息</h3>
<kbd>逃跑觸發</kbd> — 善良陣營永遠逃、HP &lt; 20%、法師 MP &lt; 15<br>
逃跑速度 1.5 倍，往威脅反方向移動<br>
<kbd>休息</kbd> — 脫離戰鬥 5 秒後開始回復<br>
HP 回復 5%/秒 | MP 回復 8/秒

<h3>角色 AI</h3>
自主探索：優先前往沒去過的格子<br>
群聚行為：同職業角色互相吸引<br>
子格移動：每格 4×4 站位，移動速度 200ms/步<br>
朝向：面朝移動方向，左右翻轉有轉身動畫

<hr style="border-color:#333;margin:16px 0;">

<h3 style="color:#FFD700;">地圖手冊</h3>

<h3>五行屬性</h3>
每個素材有五行屬性：<span style="color:#FFD700;">金</span> <span style="color:#66BB6A;">木</span> <span style="color:#42A5F5;">水</span> <span style="color:#EF5350;">火</span> <span style="color:#FFA726;">土</span> 或 無<br>
天然素材有屬性，人造物為「無」<br>
屬性篩選：工具列「全屬性」下拉選單<br>
修改屬性：素材庫右鍵 → 修改屬性

<h3>方格高度（blockH）</h3>
每個素材有邏輯高度，影響角色站立位置和碰撞：<br>
<kbd>16</kbd> — 矮（四分之一格），角色站低一點<br>
<kbd>32</kbd> — 標準（半格），大部分地面素材<br>
<kbd>48</kbd> — 高（一格），角色站高一點<br>
<kbd>96</kbd> — 牆壁（高物件），阻擋角色通行<br>
素材庫左上角顯示 blockH 數值，右鍵 → 修改高度可更改<br>
<b>注意</b>：blockH 不影響素材圖片外觀，只影響遊戲邏輯

<h3>高度差與角色</h3>
角色自動適應腳下方塊的 blockH：<br>
— 從 blockH:32 走到 blockH:48 → 角色跳上<br>
— 從 blockH:48 走到 blockH:32 → 角色跳下<br>
— blockH:96 以上 → 阻擋角色，無法通行

<h3>偏移微調</h3>
<kbd>左鍵拖曳</kbd>+<kbd>滾輪</kbd> — 上下偏移（yOffset）<br>
<kbd>右鍵按住</kbd>+<kbd>滾輪</kbd> — gx 軸偏移（↗↙）<br>
<kbd>右鍵按住</kbd>+<kbd>Shift</kbd>+<kbd>滾輪</kbd> — gy 軸偏移（↘↖）<br>
步進 ±0.25，範圍 -5~+5<br>
右鍵方塊 → <kbd>設為預設偏移</kbd> → 記住該素材的偏移值

<h3>迷霧系統</h3>
收折面板「迷霧」→ 設定半徑和中心座標<br>
圓形迷霧：中心清晰 → 邊緣漸層黑霧 → 外部全黑<br>
迷霧外方塊不渲染（節省效能）<br>
迷霧數據隨地圖存檔保留
`;

document.getElementById('helpBody').innerHTML = helpHTML;

function _openHelp(){
  document.getElementById('helpOverlay').style.display = 'flex';
}
function _closeHelp(){
  document.getElementById('helpOverlay').style.display = 'none';
}
document.getElementById('hintToggle').addEventListener('click', _openHelp);
document.getElementById('helpClose').addEventListener('click', _closeHelp);
document.getElementById('helpOverlay').addEventListener('click', (e) => {
  if(e.target === e.currentTarget) _closeHelp();
});

// ── Toast notification ──
let _toastTimer = null;
export function showToast(msg, duration){
  let el = document.getElementById('_toast');
  if(!el){
    el = document.createElement('div');
    el.id = '_toast';
    el.style.cssText = 'position:fixed;bottom:48px;left:50%;transform:translateX(-50%);background:rgba(25,25,45,0.92);color:#eee;padding:8px 18px;border-radius:8px;font-size:12px;z-index:999;pointer-events:none;transition:opacity 0.3s;border:1px solid #555;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, duration || 2000);
}

// ── Keyboard shortcuts ──
function _inputFocused(){
  const tag = document.activeElement && document.activeElement.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function _toggleTool(chkId, stateKey){
  const chk = document.getElementById(chkId);
  clearDrawTools(chkId);
  S[stateKey] = !S[stateKey];
  chk.checked = S[stateKey];
  canvas.style.cursor = S[stateKey] ? 'crosshair' : 'grab';
}

document.addEventListener('keydown', (e) => {
  if(_inputFocused()) return;
  if(e.ctrlKey || e.altKey || e.metaKey) return;
  switch(e.key.toLowerCase()){
    case 'b': _toggleTool('chkBrush','brushMode'); break;
    case 'e': _toggleTool('chkEraser','eraserMode'); break;
    case 'g': _toggleTool('chkFill','fillMode'); break;
    case 'r': _toggleTool('chkRect','rectMode'); break;
    case 'l': _toggleTool('chkLine','lineMode'); break;
    case 'i': {
      // Eyedropper: pick tile under last mouse position as brush
      const r = canvas.getBoundingClientRect();
      const mx = S.lastMouseClientX - r.left, my = S.lastMouseClientY - r.top;
      const hit = hitTest(mx, my);
      if(hit){
        S.brushTile = {color:hit.color, srcH:hit.srcH};
        updateBrushIndicator();
        showToast('吸管：' + hit.color, 1500);
      }
      break;
    }
    case '[':
      if(S.currentHeight > -5){ S.currentHeight--; document.getElementById('heightNum').textContent = S.currentHeight; draw(); }
      break;
    case ']':
      if(S.currentHeight < 5){ S.currentHeight++; document.getElementById('heightNum').textContent = S.currentHeight; draw(); }
      break;
    case 'w': camera.y += 60; draw(); break;
    case 'a': camera.x += 60; draw(); break;
    case 's': camera.y -= 60; draw(); break;
    case 'd': camera.x -= 60; draw(); break;
    case 'escape':
      clearDrawTools();
      S.selectedBlocks = new Set();
      S.selectMode = false; document.getElementById('chkSelect').checked = false;
      S.copyMode = false; document.getElementById('chkCopy').checked = false;
      S.locateMode = false; document.getElementById('chkLocate').checked = false;
      S.autoSelectMode = false; document.getElementById('chkAutoSelect').checked = false;
      draw();
      break;
  }
});
