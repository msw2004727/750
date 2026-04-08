// ── Tile property right-click menus (Editor layer) ──

import { TILES } from './tileData.js';
import { showToast } from './ui.js';

let _propMenuEl = null;
let _onDone = null;

function _hideMenu(){
  if(_propMenuEl){ _propMenuEl.remove(); _propMenuEl = null; }
}

export function showPropertyMenu(cx, cy, keys, onDone){
  _onDone = onDone;
  _hideMenu();
  if(!Array.isArray(keys)) keys = [keys];
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = cx + 'px';
  menu.style.top = cy + 'px';
  // Title
  const title = document.createElement('div');
  title.style.cssText = 'padding:4px 14px;font-size:10px;color:#888;';
  if(keys.length === 1){
    const td = TILES[keys[0]];
    title.textContent = keys[0] + ' H:' + (td && td.srcH || 32) + ' ' + (td && td.elem || '無');
  } else {
    title.textContent = '批次修改 ' + keys.length + ' 個素材';
  }
  menu.appendChild(title);
  // Option 1: Height
  const hItem = document.createElement('div');
  hItem.className = 'ctx-item';
  hItem.textContent = '修改高度';
  hItem.addEventListener('click', (e) => {
    e.stopPropagation();
    _hideMenu();
    _showHeightPicker(cx, cy, keys);
  });
  menu.appendChild(hItem);
  // Option 2: Element
  const eItem = document.createElement('div');
  eItem.className = 'ctx-item';
  eItem.textContent = '修改屬性';
  eItem.addEventListener('click', (e) => {
    e.stopPropagation();
    _hideMenu();
    _showElemPicker(cx, cy, keys);
  });
  menu.appendChild(eItem);
  // Option 3: CropB
  const cItem = document.createElement('div');
  cItem.className = 'ctx-item';
  cItem.textContent = '修改裁切';
  cItem.addEventListener('click', (e2) => {
    e2.stopPropagation();
    _hideMenu();
    _showCropBPicker(cx, cy, keys);
  });
  menu.appendChild(cItem);
  document.body.appendChild(menu);
  _propMenuEl = menu;
  setTimeout(() => document.addEventListener('click', _hideMenu, {once:true}), 10);
}

// ── Height picker ──
function _showHeightPicker(cx, cy, keys){
  _hideMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = cx + 'px';
  menu.style.top = cy + 'px';
  const title = document.createElement('div');
  title.style.cssText = 'padding:4px 14px;font-size:10px;color:#888;';
  title.textContent = '選擇高度（srcH）';
  menu.appendChild(title);
  for(const h of [16, 32, 48, 96]){
    const item = document.createElement('div');
    item.className = 'ctx-item';
    item.textContent = h + 'px';
    item.addEventListener('click', () => {
      for(const k of keys){
        const td = TILES[k];
        if(td){ td.blockH = h; td._srcHOverride = true; }
      }
      _hideMenu();
      if(_onDone) _onDone();
      showToast(keys.length + ' 個素材高度 → ' + h);
    });
    menu.appendChild(item);
  }
  document.body.appendChild(menu);
  _propMenuEl = menu;
  setTimeout(() => document.addEventListener('click', _hideMenu, {once:true}), 10);
}

// ── CropB picker (bottom crop) ──
function _showCropBPicker(cx, cy, keys){
  _hideMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = cx + 'px';
  menu.style.top = cy + 'px';
  const title = document.createElement('div');
  title.style.cssText = 'padding:4px 14px;font-size:10px;color:#888;';
  title.textContent = '底部裁切（cropB）';
  menu.appendChild(title);
  for(const v of [0, 2, 4, 6, 8, 10, 12, 14, 16]){
    const item = document.createElement('div');
    item.className = 'ctx-item';
    item.textContent = v + 'px' + (v === 0 ? '（不裁）' : '');
    item.addEventListener('click', () => {
      for(const k of keys){
        const td = TILES[k];
        if(td){ td.cropB = v; td._cropBOverride = true; }
      }
      _hideMenu();
      if(_onDone) _onDone();
      showToast(keys.length + ' 個素材底部裁切 → ' + v + 'px');
    });
    menu.appendChild(item);
  }
  document.body.appendChild(menu);
  _propMenuEl = menu;
  setTimeout(() => document.addEventListener('click', _hideMenu, {once:true}), 10);
}

// ── Element picker ──
function _showElemPicker(cx, cy, keys){
  _hideMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = cx + 'px';
  menu.style.top = cy + 'px';
  const title = document.createElement('div');
  title.style.cssText = 'padding:4px 14px;font-size:10px;color:#888;';
  title.textContent = '選擇屬性';
  menu.appendChild(title);
  for(const el of ['金','木','水','火','土','無']){
    const item = document.createElement('div');
    item.className = 'ctx-item';
    item.textContent = el;
    item.addEventListener('click', () => {
      for(const k of keys){
        const td = TILES[k];
        if(td){ td.elem = el; td._elemOverride = true; }
      }
      _hideMenu();
      if(_onDone) _onDone();
      showToast(keys.length + ' 個素材 → ' + el);
    });
    menu.appendChild(item);
  }
  document.body.appendChild(menu);
  _propMenuEl = menu;
  setTimeout(() => document.addEventListener('click', _hideMenu, {once:true}), 10);
}
