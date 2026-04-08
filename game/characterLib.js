// ── Character Library: browse & preview all character sprites ──
import { S, draw } from './state.js';
import { addBlock, removeBlock } from './spatialHash.js';
import { shKey, shGet } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { showToast } from './ui.js';

const IMG_BASE = '%E7%B4%A0%E6%9D%90/%E4%BA%BA%E7%89%A9/%E5%88%87%E5%89%B2/';
export const CHAR_LAYER = 10; // dedicated character layer

// Action English → Chinese label
const ACTION_LABEL = {
  idle:'待機', walk:'走路', idle_back:'待機(背面)', walk_back:'走路(背面)',
  interact:'互動', attack:'攻擊', attack_back:'攻擊(背面)',
  hurt:'受傷', death:'死亡', block:'防禦', reload:'裝填',
  cast_1:'施法1', cast_2:'施法2', cast_3:'施法3', cast_4:'施法4',
  work_1:'工作1', work_2:'工作2', run:'奔跑',
};

// Character database
const CHARS = [
  {name:'NobleMan',     label:'貴族男',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'NobleWoman',   label:'貴族女',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'OldMan',       label:'老人',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:3}},
  {name:'OldWoman',     label:'老婦',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'VillagerMan',  label:'村民男',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'VillagerWoman',label:'村民女',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'Princess',     label:'公主',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:5}},
  {name:'Queen',        label:'皇后',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:5}},
  {name:'Worker',       label:'工人',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,work_1:4,work_2:5,hurt:3,death:4}},
  {name:'Peasant',      label:'農夫',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,hurt:3,death:4}},

  {name:'SwordMan',     label:'劍士',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,hurt:3,death:4}},
  {name:'HalberdMan',   label:'戟兵',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,hurt:3,death:5}},
  {name:'SpearMan',     label:'槍兵',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:7,hurt:3,death:5}},
  {name:'ShieldMan',    label:'盾兵',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,block:6,hurt:3,death:4}},
  {name:'PrinceMan',    label:'王子',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:5,attack:6,hurt:3,death:6}},
  {name:'KingMan',      label:'國王',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:5,walk_back:6,idle_back:5,attack:10,hurt:3,death:6}},

  {name:'ArcherMan',    label:'弓箭手',   cls:'3_射手', clsLabel:'射手', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:11,attack_back:6,hurt:3,death:4}},
  {name:'CrossBowMan',  label:'弩手',     cls:'3_射手', clsLabel:'射手', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:10,reload:4,hurt:3,death:4}},

  {name:'Mage',         label:'法師',     cls:'4_法師', clsLabel:'法師', type:'魔法', actions:{idle:4,walk:6,idle_back:3,cast_1:11,cast_2:9,cast_3:9,hurt:2,death:9}},
  {name:'ArchMage',     label:'大法師',   cls:'4_法師', clsLabel:'法師', type:'魔法', actions:{idle:4,walk:6,idle_back:3,cast_1:11,cast_2:9,cast_3:9,cast_4:10,hurt:2,death:9}},

  {name:'CavalierMan',  label:'騎士',     cls:'5_騎兵', clsLabel:'騎兵', type:'物理', actions:{idle:8,walk:6,run:6,idle_back:3,attack:7,hurt:2,death:6}},
  {name:'HorseMan',     label:'馬兵',     cls:'5_騎兵', clsLabel:'騎兵', type:'物理', actions:{idle:8,walk:6,run:6,idle_back:3,attack:7,hurt:2,death:6}},
];

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

// Character select
document.getElementById('charNameSelect').addEventListener('change', (e) => {
  const found = CHARS.find(c => c.name === e.target.value);
  if(found){
    _curChar = found;
    _refreshActionSelect();
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
  saveSnapshot();
  // Remove existing character at this position
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
      action: 'idle',
      style: _style,
      facing: 'right',
      speed: 1,
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

// ── Query helpers ──
export function getCharAt(gx, gy, gz){
  const set = shGet(shKey(gx, gy, gz, CHAR_LAYER));
  if(!set) return null;
  for(const b of set){
    if(b.type === 'character') return b;
  }
  return null;
}

export function canMoveTo(charBlock, nx, ny){
  const gz = charBlock.gz;
  // Check ground: need a tile at (nx, ny, gz, layer 0-5)
  let hasGround = false;
  for(let l = 0; l <= 5; l++){
    const s = shGet(shKey(nx, ny, gz, l));
    if(s && s.size > 0){
      // Check if any ground tile is a tall wall (srcH > 32)
      for(const b of s){
        if(b.type === 'tile' && b.srcH > 32) return false; // wall blocks
      }
      hasGround = true;
    }
  }
  if(!hasGround) return false;
  // Check head space: nothing at gz+1 blocking
  for(let l = 0; l <= 5; l++){
    const s = shGet(shKey(nx, ny, gz + 1, l));
    if(s && s.size > 0) return false;
  }
  // Check no other character there
  if(getCharAt(nx, ny, gz)) return false;
  return true;
}

// Export CHARS for external use
export { CHARS, ACTION_LABEL, IMG_BASE };
