import { S, camera, world, canvas, draw } from './state.js';
import { drawNow } from './gameLoop.js';
import { TILES, SOURCES } from './tileData.js';
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
  return JSON.stringify({blocks:world.blocks, camX:camera.x, camY:camera.y, zoom:camera.zoom, currentHeight:S.currentHeight, currentLayer:S.currentLayer, fogRadius:world.fogRadius, fogCenter:world.fogCenter});
}

function _doSave(label){
  localStorage.setItem('blockBuilder_save', _buildSaveData());
  _showCanvasSaveHint(label || '已儲存');
}

// ── Canvas center save hint (fade out) ──
let _saveHintEl = null;
let _saveHintTimer = null;
function _showCanvasSaveHint(text){
  if(!_saveHintEl){
    _saveHintEl = document.createElement('div');
    _saveHintEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(20,20,40,0.85);color:#6f6;font-size:14px;font-weight:bold;' +
      'padding:8px 20px;border-radius:8px;pointer-events:none;z-index:30;' +
      'transition:opacity 0.8s;border:1px solid #4a4a6a;';
    document.getElementById('canvasWrap').appendChild(_saveHintEl);
  }
  _saveHintEl.textContent = text;
  _saveHintEl.style.opacity = '1';
  clearTimeout(_saveHintTimer);
  _saveHintTimer = setTimeout(() => { _saveHintEl.style.opacity = '0'; }, 1500);
}

// Save: overwrite localStorage (no file download)
document.getElementById('saveBtn').addEventListener('click', () => {
  _doSave('手動儲存');
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
        loadFromData(data);
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

// ── Export offsets + element overrides as offsets.json ──
document.getElementById('exportOffsets').addEventListener('click', () => {
  // Collect yOffset changes
  const offsets = {};
  for(const b of world.blocks){
    if(b.yOffset && b.yOffset !== 0) offsets[b.color] = b.yOffset;
  }
  for(const [key, td] of Object.entries(TILES)){
    if(td.defaultYOff && !offsets[key]) offsets[key] = td.defaultYOff;
  }
  // Collect element overrides
  const elements = {};
  for(const [key, td] of Object.entries(TILES)){
    if(td._elemOverride) elements[key] = td.elem;
  }
  // Collect srcH overrides
  const heights = {};
  for(const [key, td] of Object.entries(TILES)){
    if(td._srcHOverride) heights[key] = td.blockH;
  }
  // Collect cropB overrides
  const cropBs = {};
  for(const [key, td] of Object.entries(TILES)){
    if(td._cropBOverride) cropBs[key] = td.cropB;
  }
  const nOff = Object.keys(offsets).length;
  const nElem = Object.keys(elements).length;
  const nH = Object.keys(heights).length;
  const nCB = Object.keys(cropBs).length;
  if(nOff === 0 && nElem === 0 && nH === 0 && nCB === 0){ showToast('沒有任何修改'); return; }
  const data = { offsets, elements, heights, cropBs };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'offsets.json';
  a.click();
  URL.revokeObjectURL(a.href);
  const n = nOff + nElem;
  _openCloudModal('匯出偏移完成',
    '<div style="text-align:left;font-size:12px;color:#bbb;line-height:2;">' +
    '<div style="color:#6f6;font-size:13px;margin-bottom:8px;">已下載 offsets.json（' + nOff + ' 偏移 + ' + nElem + ' 屬性 + ' + nH + ' 高度 + ' + nCB + ' 裁切）</div>' +
    '<div style="color:#FFD700;margin-bottom:4px;">接下來請依序操作：</div>' +
    '<div><span style="color:#6bf;">步驟 1.</span> 把下載的 <b>offsets.json</b> 放到專案資料夾（750/）</div>' +
    '<div><span style="color:#6bf;">步驟 2.</span> 開啟終端機，進入專案資料夾</div>' +
    '<div><span style="color:#6bf;">步驟 3.</span> 執行以下任一指令：</div>' +
    '<div style="background:#1a1a2e;border:1px solid #444;border-radius:6px;padding:8px 12px;margin:8px 0;font-family:monospace;">' +
    '<div style="color:#888;font-size:10px;">▸ 一鍵部署（build + commit + push）：</div>' +
    '<div style="color:#fff;margin:4px 0;">npm run deploy</div>' +
    '<div style="color:#888;font-size:10px;margin-top:8px;">▸ 或分步執行：</div>' +
    '<div style="color:#ccc;">node build.cjs</div>' +
    '<div style="color:#ccc;">git add -A</div>' +
    '<div style="color:#ccc;">git commit -m "update offsets"</div>' +
    '<div style="color:#ccc;">git push</div>' +
    '</div>' +
    '<div style="color:#888;font-size:11px;margin-top:6px;">build 會自動讀取 offsets.json 並寫入程式碼，<br>部署後所有人放素材都會自動套用你調好的偏移。</div>' +
    '</div>');
});

// ── Cloud Save / Load (jsonblob.com) ──
const CLOUD_API = 'https://jsonblob.com/api/jsonBlob';

function _openCloudModal(title, bodyHTML){
  document.getElementById('cloudTitle').textContent = title;
  document.getElementById('cloudBody').innerHTML = bodyHTML;
  document.getElementById('cloudOverlay').style.display = 'flex';
}
function _closeCloudModal(){
  document.getElementById('cloudOverlay').style.display = 'none';
}
document.getElementById('cloudClose').addEventListener('click', _closeCloudModal);
document.getElementById('cloudOverlay').addEventListener('click', (e) => {
  if(e.target === e.currentTarget) _closeCloudModal();
});

function _updateFogUI(){
  const sel = document.getElementById('fogRadius');
  if(sel) sel.value = world.fogRadius;
  const gxIn = document.getElementById('fogCenterGx');
  const gyIn = document.getElementById('fogCenterGy');
  if(gxIn) gxIn.value = world.fogCenter.gx;
  if(gyIn) gyIn.value = world.fogCenter.gy;
}

export function loadFromData(data){
  if(data.blocks) setBlocks(data.blocks);
  if(data.camX !== undefined) camera.x = data.camX;
  if(data.camY !== undefined) camera.y = data.camY;
  if(data.zoom !== undefined) camera.zoom = data.zoom;
  if(data.currentHeight !== undefined){ S.currentHeight = data.currentHeight; updateHeightUI(); }
  if(data.currentLayer !== undefined){ S.currentLayer = data.currentLayer; updateLayerUI(); }
  world.fogRadius = data.fogRadius || 0;
  world.fogCenter = data.fogCenter || { gx: 0, gy: 0 };
  _updateFogUI();
  draw();
}

document.getElementById('cloudSaveBtn').addEventListener('click', async () => {
  if(world.blocks.length === 0){ showToast('沒有方塊可上傳'); return; }
  _openCloudModal('雲端上傳',
    '<div class="cloud-status">上傳中...</div>');
  try {
    const res = await fetch(CLOUD_API, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: _buildSaveData()
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const blobId = res.headers.get('X-jsonblob') || res.headers.get('x-jsonblob') || '';
    // Fallback: extract ID from Location header
    const loc = res.headers.get('Location') || '';
    const id = blobId || loc.split('/').pop() || '';
    if(!id) throw new Error('無法取得存檔 ID');
    // Save the ID locally for convenience
    localStorage.setItem('blockBuilder_cloudId', id);
    _openCloudModal('上傳成功',
      '<div style="font-size:12px;color:#aaa;margin-bottom:6px;">你的存檔代碼：</div>' +
      '<div class="cloud-id" id="_cloudIdDisplay"></div>' +
      '<button class="cloud-action primary" id="_cloudCopy">複製代碼</button>' +
      '<div class="cloud-status">把代碼分享給朋友，對方用「☁ 下載」貼上即可載入</div>');
    document.getElementById('_cloudIdDisplay').textContent = id;
    document.getElementById('_cloudCopy').addEventListener('click', () => {
      navigator.clipboard.writeText(id).then(() => {
        showToast('已複製到剪貼簿');
      }).catch(() => {
        // Fallback: select text
        const el = document.querySelector('.cloud-id');
        if(el){ const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
        showToast('請手動複製上方代碼');
      });
    });
  } catch(err){
    _openCloudModal('上傳失敗',
      '<div style="color:#f66;margin:12px 0;" id="_cloudErr"></div>' +
      '<div class="cloud-status">請檢查網路連線後重試</div>');
    document.getElementById('_cloudErr').textContent = err.message;
  }
});

document.getElementById('cloudLoadBtn').addEventListener('click', () => {
  const lastId = localStorage.getItem('blockBuilder_cloudId') || '';
  _openCloudModal('雲端下載',
    '<div style="font-size:12px;color:#aaa;margin-bottom:4px;">輸入存檔代碼：</div>' +
    '<input class="cloud-input" id="_cloudIdInput" placeholder="貼上代碼...">' +
    '<div><button class="cloud-action primary" id="_cloudLoadGo">載入</button></div>' +
    '<div class="cloud-status">向朋友索取代碼，或貼上你之前上傳的代碼</div>');
  const inp = document.getElementById('_cloudIdInput');
  inp.value = lastId;
  inp.focus();
  inp.select();
  const goBtn = document.getElementById('_cloudLoadGo');
  async function _doCloudLoad(){
    const id = inp.value.trim();
    if(!id){ showToast('請輸入存檔代碼'); return; }
    goBtn.textContent = '載入中...';
    goBtn.style.pointerEvents = 'none';
    try {
      const res = await fetch(CLOUD_API + '/' + id);
      if(!res.ok) throw new Error(res.status === 404 ? '找不到此存檔代碼' : 'HTTP ' + res.status);
      const data = await res.json();
      if(!data.blocks) throw new Error('無效的存檔格式');
      loadFromData(data);
      localStorage.setItem('blockBuilder_cloudId', id);
      _closeCloudModal();
      showToast('雲端載入成功');
    } catch(err){
      goBtn.textContent = '載入';
      goBtn.style.pointerEvents = '';
      showToast('載入失敗：' + err.message, 4000);
    }
  }
  goBtn.addEventListener('click', _doCloudLoad);
  inp.addEventListener('keydown', (e) => { if(e.key === 'Enter') _doCloudLoad(); });
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

// ── Auto-save: debounce 5s after edit + 10 min interval ──
let _autoSaveTimer = null;

export function scheduleAutoSave(){
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    _doSave('自動儲存');
  }, 5000);
}

// 10-minute interval auto-save
const _autoInterval = setInterval(() => {
  if(world.blocks.length > 0){
    _doSave('自動儲存');
  }
}, 10 * 60 * 1000);
if(typeof _autoInterval === 'object' && _autoInterval.unref) _autoInterval.unref();

window.addEventListener('beforeunload', () => {
  localStorage.setItem('blockBuilder_save', _buildSaveData());
});

// ── Ctrl+S intercept ──
document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === 's'){
    e.preventDefault();
    _doSave('手動儲存');
  }
});
