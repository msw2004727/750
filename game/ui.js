import { S, camera, canvas, draw } from './state.js';
import { setBlocks } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { clearDrawTools } from './tools.js';

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
<h3>工具箱（互斥，收折面板）</h3>
<kbd>筆刷</kbd> — 點素材選為筆刷，畫布上點擊/拖曳連續放置<br>
<kbd>橡皮擦</kbd> — 點擊/拖曳連續刪除<br>
<kbd>填充</kbd> — 游標移動顯示半透明預覽，點擊確認填充（上限 500 格）<br>
<kbd>矩形</kbd> — 按住拖曳顯示預覽範圍，放開填充<br>
<kbd>線段</kbd> — 按住拖曳顯示預覽路線，放開填充

<h3>基本操作</h3>
<kbd>左鍵</kbd> 拖曳方塊 — 移動（被四面包圍無法移動）<br>
<kbd>Ctrl</kbd>+<kbd>拖曳</kbd> — 複製並拖曳副本<br>
拖曳中 <kbd>滾輪</kbd> — 微調素材高度（1/5 格）<br>
<kbd>雙擊</kbd> / <kbd>右鍵</kbd> — 刪除方塊<br>
空白處拖曳 — 平移視角<br>
<kbd>滾輪</kbd> / 雙指捏合 — 縮放

<h3>高度與圖層</h3>
<kbd>高度 ▲▼</kbd> — 垂直高度（-5 ~ +5）<br>
<kbd>圖層 ▲▼</kbd> — 重疊圖層（0 ~ 5）<br>
<kbd>隱藏高度</kbd> — 隱藏/顯示指定高度層<br>
只能操作當前高度 + 圖層的方塊

<h3>選取與整組操作</h3>
<kbd>Shift</kbd>+<kbd>點擊</kbd> — 高亮相鄰方塊群組<br>
<kbd>Shift</kbd>+<kbd>拖曳</kbd> — 框選區域<br>
拖曳高亮方塊 — 整組移動<br>
點擊空白 — 取消高亮

<h3>範本</h3>
高亮 2+ 方塊 → <kbd>儲存</kbd> → 命名<br>
選範本 → <kbd>放置</kbd> → 一鍵放入

<h3>顯示工具</h3>
<h3>顯示類（收折面板）</h3>
<kbd>懸停</kbd> 反白 | <kbd>格線</kbd> 水平 | <kbd>立體</kbd> 垂直 | <kbd>座標</kbd> 座標 | <kbd>小地圖</kbd> 右下縮覽

<h3>檔案操作</h3>
<kbd>Ctrl+Z</kbd> 返回 | <kbd>Ctrl+Y</kbd> 復原 | <kbd>Ctrl+C</kbd> 複製選取 | <kbd>Ctrl+V</kbd> 貼上<br>
<kbd>儲存</kbd> JSON | <kbd>載入</kbd> JSON | <kbd>匯出圖</kbd> PNG<br>
<kbd>原點</kbd> 回到 (0,0) | <kbd>清除全部</kbd><br>
<kbd>搜尋</kbd> — 輸入關鍵字篩選全部素材（檔名或編號）

<h3>快捷類（收折面板）</h3>
<kbd>選取</kbd> 取代 Shift（選取/框選）| <kbd>定位</kbd> 點方塊跳到素材面板 | <kbd>複製</kbd> 取代 Ctrl（複製拖曳）<br>
雙指捏合縮放 | 暫存區快速放置
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
