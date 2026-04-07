import { S, camera, draw } from './state.js';
import { TILES, SOURCES } from './tileData.js';
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
        document.getElementById('catSelect').value = ci;
        S.selectedCat = ci;
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

// ── Palette population ──
export function populatePalette(){
  const container = document.getElementById('tilePalette');
  container.innerHTML = '';
  const catSel = document.getElementById('catSelect');
  const catLabel = catSel.options[catSel.selectedIndex]?.dataset?.label || '';

  const items = [];
  const srcList = S.selectedSrc === -1 ? SOURCES : [SOURCES[S.selectedSrc]];
  const showAll = catLabel === '__all__';
  for(const src of srcList){
    for(const cat of src.cats){
      if(!showAll && cat.label !== catLabel) continue;
      for(const i of cat.tiles){
        const key = src.prefix + String(i).padStart(3,'0');
        items.push({key, src, i});
      }
    }
  }

  for(const {key, src, i} of items){
    const btn = document.createElement('button');
    btn.className = 'tb';
    btn.title = key + ' [' + src.label + ']';
    const img = document.createElement('img');
    img.src = src.base + src.fileOf(i);
    img.draggable = false;
    btn.appendChild(img);
    const num = document.createElement('span');
    num.className = 'tb-num';
    num.textContent = src.prefix + i;
    btn.appendChild(num);
    const srcH2 = (TILES[key] && TILES[key].srcH) || 32;
    let dragStarted = false;
    btn.addEventListener('mousedown', (e) => {
      if(e.button !== 0) return;
      dragStarted = false;
      const sx = e.clientX, sy = e.clientY;
      const onMove2 = (e2) => {
        if(!dragStarted && (Math.abs(e2.clientX-sx)>4 || Math.abs(e2.clientY-sy)>4)){
          dragStarted = true;
          startTileDrag(key, srcH2, e);
        }
      };
      const onUp2 = () => {
        document.removeEventListener('mousemove', onMove2);
        document.removeEventListener('mouseup', onUp2);
        if(!dragStarted){
          if(S.brushMode){ S.brushTile = {color:key, srcH:srcH2}; updateBrushIndicator(); return; }
          placeOnCanvas(key, srcH2);
        }
      };
      document.addEventListener('mousemove', onMove2);
      document.addEventListener('mouseup', onUp2);
    });
    btn.addEventListener('click', (e) => { e.preventDefault(); });
    setupMobileTileDrag(btn, key);
    container.appendChild(btn);
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
  SOURCES.forEach((src, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = src.label;
    srcSel.appendChild(opt);
  });
  srcSel.value = -1;

  srcSel.addEventListener('change', () => {
    S.selectedSrc = parseInt(srcSel.value);
    buildCatOptions();
    populatePalette();
  });

  const catSel = document.getElementById('catSelect');
  catSel.addEventListener('change', () => {
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
        const srcH3 = (TILES[key] && TILES[key].srcH) || 32;
        let dragStarted3 = false;
        btn.addEventListener('mousedown', (e2) => {
          if(e2.button !== 0) return;
          dragStarted3 = false;
          const sx3 = e2.clientX, sy3 = e2.clientY;
          const onM3 = (e3) => {
            if(!dragStarted3 && (Math.abs(e3.clientX-sx3)>4 || Math.abs(e3.clientY-sy3)>4)){
              dragStarted3 = true;
              startTileDrag(key, srcH3, e2);
            }
          };
          const onU3 = () => {
            document.removeEventListener('mousemove', onM3);
            document.removeEventListener('mouseup', onU3);
            if(!dragStarted3){
              if(S.brushMode){ S.brushTile = {color:key, srcH:srcH3}; updateBrushIndicator(); return; }
              placeOnCanvas(key, srcH3);
            }
          };
          document.addEventListener('mousemove', onM3);
          document.addEventListener('mouseup', onU3);
        });
        setupMobileTileDrag(btn, key);
        container.appendChild(btn);
      }
    }
  }
});
