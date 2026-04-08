import { S, camera, canvas, draw } from './state.js';
import { setBlocks } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { clearDrawTools, updateBrushIndicator } from './tools.js';

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

// ── Home button ──
document.getElementById('homeBtn').addEventListener('click', () => {
  camera.x = 0; camera.y = 0; camera.zoom = 1; draw();
});

// ── Clear all ──
document.getElementById('clearBtn').addEventListener('click', () => {
  saveSnapshot();
  setBlocks([]); draw();
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

<h3>右鍵選單</h3>
右鍵點擊方塊可選擇：<br>
<kbd>複製</kbd> 複製到相鄰空位 | <kbd>放入暫存</kbd> 存到暫存區<br>
<kbd>組合放入暫存</kbd>（需先選取多個）| <kbd>刪除</kbd>

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

<h3>暫存區（左側 9 格）</h3>
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
五組來源：Scrabling / Jumpstart / 3232iso / Strategy / Medieval<br>
類別下拉選「全部」可一次顯示該來源所有素材<br>
<kbd>搜尋</kbd> — 輸入關鍵字篩選全部素材（檔名或編號）<br>
點擊素材 — 放到畫面中央 | 拖曳素材 — 放到畫布或暫存區

<h3>範本</h3>
高亮 2+ 方塊 → <kbd>儲存</kbd> → 命名<br>
選範本 → <kbd>放置</kbd> → 一鍵放入 | <kbd>刪除</kbd> → 移除範本

<h3>檔案操作</h3>
<kbd>Ctrl+Z</kbd> 返回 | <kbd>Ctrl+Y</kbd> 復原<br>
<kbd>儲存</kbd> — 覆蓋存到瀏覽器（開啟時自動載入）<br>
<kbd>另存</kbd> — 下載新 JSON 檔案<br>
<kbd>載入</kbd> — 從 JSON 檔案讀取 | <kbd>匯出圖</kbd> — 下載 PNG 截圖<br>
<kbd>原點</kbd> — 回到 (0,0) | <kbd>清除全部</kbd> — 刪除所有方塊

<h3>手機操作</h3>
單指拖曳方塊 — 移動 | 單指空白處 — 平移<br>
雙指捏合 — 縮放 | 雙擊 — 刪除方塊<br>
長按素材 — 拖曳到畫布或暫存區<br>
拖曳方塊到暫存區範圍 — 存入暫存
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

function _toggleTool(chkId, stateKey, except){
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
