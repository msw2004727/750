import { S, camera, draw } from './state.js';
import { TILES, SOURCES, MEDIEVAL_VARIANTS, MEDIEVAL_FIRST_IDX } from './tileData.js';
import { startTileDrag } from './staging.js';
import { updateBrushIndicator } from './tools.js';
import { setupMobileTileDrag } from './touch.js';
import { setJumpToTile } from './input.js';
import { toGrid, snap } from './coords.js';
import { hasBlockAt } from './blocks.js';
import { addBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';

// ── Place tile on canvas (spiral search for free cell) ──
function placeOnCanvas(color, srcH){
  const center = toGrid(camera.W / 2, camera.H / 2);
  const cx = snap(center.gx), cy = snap(center.gy);
  const gz = S.currentHeight, layer = S.currentLayer;
  // Spiral outward: check center first, then ring 1, ring 2, ...
  let gx = cx, gy = cy;
  if(!hasBlockAt(gx, gy, gz, null, layer)){
    saveSnapshot();
    addBlock({gx, gy, gz, layer, color, srcH, yOffset:0});
    draw();
    return;
  }
  // dx,dy direction sequence: right, down, left, up
  const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
  let steps = 1, di = 0, walked = 0;
  gx = cx; gy = cy;
  for(let i = 0; i < 10000; i++){
    gx += dirs[di][0];
    gy += dirs[di][1];
    if(!hasBlockAt(gx, gy, gz, null, layer)){
      saveSnapshot();
      addBlock({gx, gy, gz, layer, color, srcH, yOffset:0});
      draw();
      return;
    }
    walked++;
    if(walked === steps){
      walked = 0;
      di = (di + 1) % 4;
      if(di % 2 === 0) steps++;
    }
  }
}

// ── Tile locate (jump palette to tile) ──
export function jumpToTile(tileKey){
  const prefix = tileKey.charAt(0);
  const idx = parseInt(tileKey.slice(1));
  for(let si = 0; si < SOURCES.length; si++){
    const src = SOURCES[si];
    if(src.prefix !== prefix) continue;
    for(let ci = 0; ci < src.cats.length; ci++){
      if(src.cats[ci].tiles.includes(idx)){
        document.getElementById('srcSelect').value = si;
        S.selectedSrc = si;
        buildCatOptions();
        // catSelect value offset: +1 because '全部' is at index 0
        document.getElementById('catSelect').value = ci + 1;
        S.selectedCat = ci + 1;
        populatePalette();
        const btns = document.querySelectorAll('#tilePalette .tb');
        for(const btn of btns){
          if(btn.title && btn.title.startsWith(tileKey)){
            btn.style.outline = '2px solid #FFD700';
            btn.scrollIntoView({behavior:'smooth', block:'nearest'});
            setTimeout(() => { btn.style.outline = ''; }, 2000);
            break;
          }
        }
        return;
      }
    }
  }
}
setJumpToTile(jumpToTile);

// ── Shared tile button creator ──
function _createTileButton(container, key, src, i){
  const btn = document.createElement('button');
  btn.className = 'tb';
  btn.title = key + ' [' + src.label + '] ' + src.fileOf(i);
  const img = document.createElement('img');
  img.src = src.base + src.fileOf(i);
  img.draggable = false;
  btn.appendChild(img);
  const num = document.createElement('span');
  num.className = 'tb-num';
  num.textContent = src.prefix + i;
  btn.appendChild(num);
  const srcH = (TILES[key] && TILES[key].srcH) || 32;
  let dragStarted = false;
  btn.addEventListener('mousedown', (e) => {
    if(e.button !== 0) return;
    dragStarted = false;
    const sx = e.clientX, sy = e.clientY;
    const onMove2 = (e2) => {
      if(!dragStarted && (Math.abs(e2.clientX-sx)>4 || Math.abs(e2.clientY-sy)>4)){
        dragStarted = true;
        startTileDrag(key, srcH, e);
      }
    };
    const onUp2 = () => {
      document.removeEventListener('mousemove', onMove2);
      document.removeEventListener('mouseup', onUp2);
      if(!dragStarted){
        if(S.brushMode){ S.brushTile = {color:key, srcH}; updateBrushIndicator(); return; }
        placeOnCanvas(key, srcH);
      }
    };
    document.addEventListener('mousemove', onMove2);
    document.addEventListener('mouseup', onUp2);
  });
  btn.addEventListener('click', (e) => { e.preventDefault(); });
  setupMobileTileDrag(btn, key);
  container.appendChild(btn);
}

// ── Palette population ──
export function populatePalette(){
  const container = document.getElementById('tilePalette');
  container.innerHTML = '';
  const catSel = document.getElementById('catSelect');
  const catLabel = catSel.options[catSel.selectedIndex]?.dataset?.label || '';

  const elemFilter = document.getElementById('elemSelect').value;
  const items = [];
  const srcList = S.selectedSrc === -1 ? SOURCES : [SOURCES[S.selectedSrc]];
  const showAll = catLabel === '__all__';
  for(const src of srcList){
    for(const cat of src.cats){
      if(!showAll && cat.label !== catLabel) continue;
      if(elemFilter && (cat.elem || '無') !== elemFilter) continue;
      for(const i of cat.tiles){
        const key = src.prefix + String(i).padStart(3,'0');
        items.push({key, src, i});
      }
    }
  }

  for(const {key, src, i} of items){
    _createTileButton(container, key, src, i);
  }
}

// ── Category dropdown ──
export function buildCatOptions(){
  const catSel = document.getElementById('catSelect');
  catSel.innerHTML = '';
  const labelSet = new Map();
  const srcList = S.selectedSrc === -1 ? SOURCES : [SOURCES[S.selectedSrc]];
  for(const src of srcList){
    for(const cat of src.cats){
      if(!labelSet.has(cat.label)) labelSet.set(cat.label, 0);
      labelSet.set(cat.label, labelSet.get(cat.label) + 1);
    }
  }
  // "全部" option at the top
  const allOpt = document.createElement('option');
  allOpt.value = 0;
  allOpt.textContent = '全部';
  allOpt.dataset.label = '__all__';
  catSel.appendChild(allOpt);

  let idx = 1;
  let defaultIdx = 0;
  for(const [label, count] of labelSet){
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = label + (S.selectedSrc === -1 && count > 1 ? ' ('+count+')' : '');
    opt.dataset.label = label;
    if(label === '草皮') defaultIdx = idx;
    catSel.appendChild(opt);
    idx++;
  }
  catSel.value = defaultIdx;
}

// ── Init selectors ──
function initSelectors(){
  const srcSel = document.getElementById('srcSelect');
  const allOpt = document.createElement('option');
  allOpt.value = -1; allOpt.textContent = '全部來源';
  srcSel.appendChild(allOpt);
  // Show non-grouped sources + one entry per group
  const shown = new Set();
  SOURCES.forEach((src, i) => {
    if(src.group){
      if(shown.has(src.group)) return;
      shown.add(src.group);
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = src.group;
      srcSel.appendChild(opt);
    } else {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = src.label;
      srcSel.appendChild(opt);
    }
  });
  srcSel.value = -1;

  // Medieval variant selector
  const varSel = document.createElement('select');
  varSel.id = 'variantSelect';
  varSel.style.cssText = 'display:none;font-size:11px;background:#2a2a3e;color:#ccc;border:1px solid #444;border-radius:4px;padding:2px 4px;';
  MEDIEVAL_VARIANTS.forEach((v, vi) => {
    const opt = document.createElement('option');
    opt.value = MEDIEVAL_FIRST_IDX + vi;
    opt.textContent = v.label;
    varSel.appendChild(opt);
  });
  srcSel.parentElement.insertBefore(varSel, srcSel.nextSibling);

  function _isMedieval(){
    return S.selectedSrc >= MEDIEVAL_FIRST_IDX && S.selectedSrc < MEDIEVAL_FIRST_IDX + MEDIEVAL_VARIANTS.length;
  }

  function _updateVariantVisibility(){
    varSel.style.display = _isMedieval() ? '' : 'none';
  }

  varSel.addEventListener('change', () => {
    S.selectedSrc = parseInt(varSel.value);
    buildCatOptions();
    populatePalette();
  });

  srcSel.addEventListener('change', () => {
    S.selectedSrc = parseInt(srcSel.value);
    if(_isMedieval()) varSel.value = S.selectedSrc;
    _updateVariantVisibility();
    buildCatOptions();
    populatePalette();
  });

  const catSel = document.getElementById('catSelect');
  catSel.addEventListener('change', () => {
    populatePalette();
  });

  document.getElementById('elemSelect').addEventListener('change', () => {
    populatePalette();
  });

  buildCatOptions();
  populatePalette();
}
initSelectors();

// ── Tile search ──
document.getElementById('tileSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if(!q){ populatePalette(); return; }
  const container = document.getElementById('tilePalette');
  container.innerHTML = '';
  for(const src of SOURCES){
    for(let i = 0; i < src.count; i++){
      const file = src.fileOf(i).toLowerCase();
      const key = src.prefix + String(i).padStart(3,'0');
      if(file.includes(q) || key.includes(q)){
        _createTileButton(container, key, src, i);
      }
    }
  }
});
