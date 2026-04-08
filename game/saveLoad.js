import { S, camera, world, canvas, draw } from './state.js';
import { drawNow } from './gameLoop.js';
import { setBlocks } from './spatialHash.js';
import { toScreen } from './coords.js';
import { showToast } from './ui.js';

export function updateHeightUI(){
  const el = document.getElementById('heightNum');
  if(el) el.textContent = S.currentHeight;
}
export function updateLayerUI(){
  const el = document.getElementById('layerNum');
  if(el) el.textContent = S.currentLayer;
}

// ── Height + Layer controls ──
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

// ── Save / Save As / Load ──
function _buildSaveData(){
  return JSON.stringify({blocks:world.blocks, camX:camera.x, camY:camera.y, zoom:camera.zoom, currentHeight:S.currentHeight, currentLayer:S.currentLayer});
}

function _doSave(){
  localStorage.setItem('blockBuilder_save', _buildSaveData());
}

function _showSaveIndicator(){
  const btn = document.getElementById('saveBtn');
  const orig = btn.textContent;
  btn.textContent = '已存';
  btn.style.color = '#6f6';
  setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
}

// Save: overwrite localStorage (no file download)
document.getElementById('saveBtn').addEventListener('click', () => {
  _doSave();
  _showSaveIndicator();
});

// Save As: download as new JSON file
document.getElementById('saveAsBtn').addEventListener('click', () => {
  const blob = new Blob([_buildSaveData()], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'block_save_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
});

document.getElementById('loadBtn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.addEventListener('change', () => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if(data.blocks) setBlocks(data.blocks);
        if(data.camX !== undefined) camera.x = data.camX;
        if(data.camY !== undefined) camera.y = data.camY;
        if(data.zoom !== undefined) camera.zoom = data.zoom;
        if(data.currentHeight !== undefined){ S.currentHeight = data.currentHeight; updateHeightUI(); }
        if(data.currentLayer !== undefined){ S.currentLayer = data.currentLayer; updateLayerUI(); }
        draw();
      } catch(err){ showToast('載入失敗：' + err.message, 4000); }
    };
    reader.readAsText(input.files[0]);
  });
  input.click();
});

// ── Export image ──
document.getElementById('exportImg').addEventListener('click', () => {
  if(world.blocks.length === 0){ showToast('沒有方塊可匯出'); return; }
  const oldCamX = camera.x, oldCamY = camera.y, oldZoom = camera.zoom;
  const oldHH = new Set(S.hiddenHeights), oldHL = new Set(S.hiddenLayers);
  const oldGrid = S.showGrid, oldVGrid = S.showVGrid, oldCoord = S.showCoords;
  S.hiddenHeights = new Set(); S.hiddenLayers = new Set();
  S.showGrid = false; S.showVGrid = false; S.showCoords = false;
  let minGx=Infinity, maxGx=-Infinity, minGy=Infinity, maxGy=-Infinity, minGz=Infinity, maxGz=-Infinity;
  for(const b of world.blocks){
    minGx=Math.min(minGx,b.gx); maxGx=Math.max(maxGx,b.gx);
    minGy=Math.min(minGy,b.gy); maxGy=Math.max(maxGy,b.gy);
    minGz=Math.min(minGz,b.gz); maxGz=Math.max(maxGz,b.gz);
  }
  camera.zoom = 1; camera.x = 0; camera.y = 0;
  const cx = (minGx+maxGx)/2, cy = (minGy+maxGy)/2, cz = (minGz+maxGz)/2;
  const cp = toScreen(cx, cy, cz);
  camera.x = camera.W/2 - cp.x;
  camera.y = camera.H/2 - cp.y;
  drawNow();
  try {
    const link = document.createElement('a');
    link.download = 'map_' + new Date().toISOString().slice(0,10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch(err) {
    showToast('本地開啟無法匯出圖片，請用 GitHub Pages 或本地伺服器開啟', 4000);
  }
  camera.x = oldCamX; camera.y = oldCamY; camera.zoom = oldZoom;
  S.hiddenHeights = oldHH; S.hiddenLayers = oldHL;
  S.showGrid = oldGrid; S.showVGrid = oldVGrid; S.showCoords = oldCoord;
  draw();
});

// ── Height visibility ──
(function(){
  const sel = document.getElementById('hideHeight');
  for(let h = -5; h <= 5; h++){
    const opt = document.createElement('option');
    opt.value = h; opt.textContent = '高度 ' + h;
    sel.appendChild(opt);
  }
})();
document.getElementById('hideHeightBtn').addEventListener('click', () => {
  const v = parseInt(document.getElementById('hideHeight').value);
  if(isNaN(v)) return;
  if(S.hiddenHeights.has(v)) S.hiddenHeights.delete(v);
  else S.hiddenHeights.add(v);
  document.getElementById('hideHeightBtn').textContent = S.hiddenHeights.has(v) ? '顯示' : '隱藏';
  draw();
});
document.getElementById('hideHeight').addEventListener('change', () => {
  const v = parseInt(document.getElementById('hideHeight').value);
  document.getElementById('hideHeightBtn').textContent = S.hiddenHeights.has(v) ? '顯示' : '隱藏';
});
document.getElementById('showAllBtn').addEventListener('click', () => {
  S.hiddenHeights.clear(); S.hiddenLayers.clear(); draw();
});

// ── Auto-save: debounce 5s after edit, hard cap 30s ──
let _autoSaveTimer = null;
let _lastAutoSave = Date.now();

export function scheduleAutoSave(){
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    _doSave();
    _lastAutoSave = Date.now();
  }, 5000);
  // Hard cap: if 30s since last save, save now
  if(Date.now() - _lastAutoSave >= 30000){
    clearTimeout(_autoSaveTimer);
    _doSave();
    _lastAutoSave = Date.now();
  }
}

window.addEventListener('beforeunload', () => {
  _doSave();
});

// ── Ctrl+S intercept ──
document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === 's'){
    e.preventDefault();
    _doSave();
    _showSaveIndicator();
  }
});
