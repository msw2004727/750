// ── Character Library: browse & preview all character sprites ──
import { S, draw } from './state.js';
import { addBlock, removeBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { showToast } from './ui.js';
import { CHARS, CHAR_LAYER, IMG_BASE, ACTION_LABEL, getClassStats, getCharAt } from './charData.js';

// ── State ──
let _style = 'outline';
let _curChar = CHARS[0];
let _curAction = 'idle';
let _frameIdx = 0;
let _timer = null;
let _speed = 200; // ms per frame
let _frameImages = [];  // preloaded Image objects

// ── Build frame path ──
function _framePath(ch, style, action, idx){
  return IMG_BASE +
    encodeURIComponent(ch.cls) + '/' +
    ch.name + '/' + style + '/' + action + '/' + idx + '.png';
}

// ── Preload frames for current selection ──
function _loadFrames(){
  const count = _curChar.actions[_curAction] || 0;
  _frameImages = [];
  for(let i = 0; i < count; i++){
    const img = new Image();
    img.src = _framePath(_curChar, _style, _curAction, i);
    _frameImages.push(img);
  }
  _frameIdx = 0;
  _drawPreview();
}

// ── Draw current frame on preview canvas ──
function _drawPreview(){
  const cv = document.getElementById('charPreviewCanvas');
  if(!cv) return;
  const cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.clearRect(0, 0, cv.width, cv.height);

  // Checkerboard background
  const sz = 16;
  for(let y = 0; y < cv.height; y += sz){
    for(let x = 0; x < cv.width; x += sz){
      cx.fillStyle = ((x/sz + y/sz) % 2 === 0) ? '#2a2a3a' : '#22222e';
      cx.fillRect(x, y, sz, sz);
    }
  }

  if(_frameImages.length === 0) return;
  const img = _frameImages[_frameIdx % _frameImages.length];
  if(!img.complete || !img.naturalWidth) {
    // Wait for load
    img.onload = () => _drawPreview();
    return;
  }
  // Draw centered, scaled 4x (32→128)
  const scale = 4;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (cv.width - dw) / 2;
  const dy = (cv.height - dh) / 2;
  cx.drawImage(img, dx, dy, dw, dh);

  // Frame counter
  cx.font = '11px monospace';
  cx.fillStyle = 'rgba(255,255,255,0.5)';
  cx.textAlign = 'right';
  cx.fillText((_frameIdx % _frameImages.length + 1) + '/' + _frameImages.length, cv.width - 4, cv.height - 4);
}

// ── Animation loop ──
function _startAnim(){
  _stopAnim();
  if(_frameImages.length <= 1) return;
  _timer = setInterval(() => {
    _frameIdx = (_frameIdx + 1) % _frameImages.length;
    _drawPreview();
  }, _speed);
}

function _stopAnim(){
  if(_timer){ clearInterval(_timer); _timer = null; }
}

// ── Populate dropdowns ──
function _getClasses(){
  const set = new Set();
  for(const c of CHARS) set.add(c.clsLabel);
  return [...set];
}

function _filteredChars(){
  const clsSel = document.getElementById('charClsSelect').value;
  const typeSel = document.getElementById('charTypeSelect').value;
  return CHARS.filter(c => {
    if(clsSel && c.clsLabel !== clsSel) return false;
    if(typeSel && c.type !== typeSel) return false;
    return true;
  });
}

function _refreshCharSelect(){
  const sel = document.getElementById('charNameSelect');
  const filtered = _filteredChars();
  sel.innerHTML = '';
  for(const c of filtered){
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.label + ' ' + c.name;
    sel.appendChild(opt);
  }
  if(filtered.length > 0){
    _curChar = filtered[0];
    _refreshActionSelect();
    _updateStatsInfo();
  }
}

function _refreshActionSelect(){
  const sel = document.getElementById('charActionSelect');
  sel.innerHTML = '';
  const actions = Object.keys(_curChar.actions);
  for(const a of actions){
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = (ACTION_LABEL[a] || a) + ' (' + _curChar.actions[a] + ')';
    sel.appendChild(opt);
  }
  _curAction = actions[0] || 'idle';
  _loadFrames();
  _startAnim();
}

// ── Open / Close ──
function _open(){
  document.getElementById('charLibOverlay').style.display = 'flex';
  _refreshCharSelect();
}

function _close(){
  _stopAnim();
  document.getElementById('charLibOverlay').style.display = 'none';
}

// ── Init ──
// Style select
document.getElementById('charStyleSelect').addEventListener('change', (e) => {
  _style = e.target.value;
  _loadFrames();
  _startAnim();
});

// Class filter
document.getElementById('charClsSelect').addEventListener('change', () => {
  _refreshCharSelect();
});

// Type filter
document.getElementById('charTypeSelect').addEventListener('change', () => {
  _refreshCharSelect();
});

function _updateStatsInfo(){
  const el = document.getElementById('charStatsInfo');
  if(!el || !_curChar) return;
  const s = getClassStats(_curChar.clsLabel);
  el.textContent = 'HP:'+s.hp+' ATK:'+s.atk+' DEF:'+s.def+' SPD:'+s.spd+' R:'+s.range;
}

// Character select
document.getElementById('charNameSelect').addEventListener('change', (e) => {
  const found = CHARS.find(c => c.name === e.target.value);
  if(found){
    _curChar = found;
    _refreshActionSelect();
    _updateStatsInfo();
  }
});

// Action select
document.getElementById('charActionSelect').addEventListener('change', (e) => {
  _curAction = e.target.value;
  _loadFrames();
  _startAnim();
});

// Speed slider
document.getElementById('charSpeed').addEventListener('input', (e) => {
  _speed = 500 - parseInt(e.target.value) + 50;
  if(_timer) _startAnim();
});

// Open/Close
document.getElementById('charLibBtn').addEventListener('click', _open);
document.getElementById('charLibClose').addEventListener('click', _close);
document.getElementById('charLibOverlay').addEventListener('click', (e) => {
  if(e.target === e.currentTarget) _close();
});

// ── Placement API ──
let _placeTarget = null; // {gx, gy, gz} set by context menu

export function openForPlacement(gx, gy, gz){
  _placeTarget = {gx, gy, gz};
  document.getElementById('charPlaceRow').style.display = '';
  _open();
}

function _closePlacement(){
  _placeTarget = null;
  document.getElementById('charPlaceRow').style.display = 'none';
  _close();
}

document.getElementById('charPlaceBtn').addEventListener('click', () => {
  if(!_placeTarget || !_curChar) return;
  const {gx, gy, gz} = _placeTarget;
  const faction = document.getElementById('charFactionSelect').value;
  const stats = getClassStats(_curChar.clsLabel);
  saveSnapshot();
  const existing = getCharAt(gx, gy, gz);
  if(existing) removeBlock(existing);
  addBlock({
    gx, gy, gz, layer: CHAR_LAYER,
    type: 'character',
    color: _curChar.name,
    srcH: 32, srcW: 32,
    state: {
      cls: _curChar.cls,
      clsLabel: _curChar.clsLabel,
      charType: _curChar.type,
      faction: faction,
      curHp: stats.hp,
      curMp: stats.maxMp,
      aiState: 'idle',
      outOfCombatTicks: 0,
      attackCooldown: 0,
      action: 'idle',
      style: _style,
      facing: 'right',
      speed: stats.spd,
      path: [],
      actions: _curChar.actions,
      subX: 0.25, subY: 0.25,
      visited: {},
      _stuckCount: 0,
    }
  });
  draw();
  showToast('已放置 ' + _curChar.label);
  _closePlacement();
});

export { openForPlacement };
