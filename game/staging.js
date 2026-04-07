import { S, camera, canvas, draw } from './state.js';
import { TILES, SOURCES, tileImages } from './tileData.js';
import { toGrid, snap } from './coords.js';
import { hasBlockAt } from './blocks.js';
import { addBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { updateBrushIndicator } from './tools.js';

// ── Staging highlight + slot detection ──
export function stagingHighlight(on){
  document.getElementById('stagingArea').classList.toggle('drag-active', on);
  document.querySelectorAll('.staging-cell').forEach(c => c.classList.toggle('drag-over', on));
}

export function findStagingSlotAt(clientX, clientY){
  const cells = document.querySelectorAll('.staging-cell');
  for(let i = 0; i < cells.length; i++){
    const r = cells[i].getBoundingClientRect();
    if(clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return i;
  }
  const sr = document.getElementById('stagingArea').getBoundingClientRect();
  if(clientX >= sr.left && clientX <= sr.right && clientY >= sr.top && clientY <= sr.bottom){
    const slot = S.staging.indexOf(null);
    return slot >= 0 ? slot : 8;
  }
  return -1;
}

export function addToStaging(color, srcH, combo){
  let slot = S.staging.indexOf(null);
  if(slot === -1) slot = 8;
  if(combo){
    S.staging[slot] = {combo};
  } else {
    S.staging[slot] = {color, srcH};
  }
  renderStagingCell(slot);
}

export function renderStagingCell(idx){
  const cells = document.querySelectorAll('.staging-cell');
  const cell = cells[idx];
  if(!cell) return;
  const oldImg = cell.querySelector('img');
  if(oldImg) oldImg.remove();
  const oldCanvas = cell.querySelector('canvas');
  if(oldCanvas) oldCanvas.remove();
  const oldLabel = cell.querySelector('.staging-label');
  if(oldLabel) oldLabel.remove();
  if(S.staging[idx]){
    if(S.staging[idx].combo){
      const combo = S.staging[idx].combo;
      const thumbCanvas = document.createElement('canvas');
      const sz = 40;
      thumbCanvas.width = sz; thumbCanvas.height = sz;
      const tctx = thumbCanvas.getContext('2d');
      tctx.imageSmoothingEnabled = false;
      let cx1=Infinity,cx2=-Infinity,cy1=Infinity,cy2=-Infinity;
      for(const t of combo){ cx1=Math.min(cx1,t.dx);cx2=Math.max(cx2,t.dx);cy1=Math.min(cy1,t.dy);cy2=Math.max(cy2,t.dy); }
      const range = Math.max(cx2-cx1+1, cy2-cy1+1, 1);
      const tileSize = Math.floor(sz / (range + 0.5));
      const ox = sz/2, oy = sz*0.3;
      for(const t of combo){
        const ti = tileImages[t.color];
        if(!ti) continue;
        const rx = (t.dx - (cx1+cx2)/2) * tileSize * 0.5;
        const ry = (t.dy - (cy1+cy2)/2) * tileSize * 0.5;
        const px = ox + (rx - ry);
        const py = oy + (rx + ry) * 0.5;
        tctx.drawImage(ti, px - tileSize/2, py - tileSize/2, tileSize, tileSize);
      }
      thumbCanvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      cell.insertBefore(thumbCanvas, cell.firstChild);
      const lbl = document.createElement('span');
      lbl.className = 'staging-label';
      lbl.textContent = combo.length + '組';
      cell.appendChild(lbl);
    } else {
      const td = TILES[S.staging[idx].color];
      if(td){
        const img = document.createElement('img');
        const src2 = SOURCES.find(s => s.prefix === S.staging[idx].color.charAt(0));
        img.src = (src2 ? src2.base : '') + td.file;
        cell.insertBefore(img, cell.firstChild);
      }
    }
  }
}

// ── Tile drag system (palette/staging -> canvas/staging) ──
export function startTileDrag(key, srcH, e){
  const td = TILES[key];
  if(!td) return;
  S.tileDrag = {key, srcH, fromStaging: false};
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.7;width:42px;height:42px;';
  const img2 = document.createElement('img');
  const src2 = SOURCES.find(s => s.prefix === key.charAt(0));
  img2.src = (src2 ? src2.base : '') + td.file;
  img2.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
  el.appendChild(img2);
  document.body.appendChild(el);
  S.tileDrag.el = el;
  const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0;
  el.style.left = (cx - 21) + 'px';
  el.style.top = (cy - 21) + 'px';
}

// Global tile drag tracking (mouse)
document.addEventListener('mousemove', (e) => {
  if(!S.tileDrag) return;
  S.tileDrag.el.style.left = (e.clientX - 21) + 'px';
  S.tileDrag.el.style.top = (e.clientY - 21) + 'px';
  stagingHighlight(findStagingSlotAt(e.clientX, e.clientY) >= 0);
});

document.addEventListener('mouseup', (e) => {
  if(!S.tileDrag) return;
  stagingHighlight(false);
  const slot = findStagingSlotAt(e.clientX, e.clientY);
  if(slot >= 0){
    addToStaging(S.tileDrag.key, S.tileDrag.srcH);
  } else {
    const r = canvas.getBoundingClientRect();
    if(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom){
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const g = toGrid(mx, my);
      const gx = snap(g.gx), gy = snap(g.gy);
      if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
        saveSnapshot();
        addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.tileDrag.key, srcH:S.tileDrag.srcH, yOffset:0});
        draw();
      }
    }
  }
  S.tileDrag.el.remove();
  S.tileDrag = null;
});

// ── Init staging grid ──
export function initStagingGrid(){
  const grid = document.getElementById('stagingGrid');
  for(let i = 0; i < 9; i++){
    const cell = document.createElement('div');
    cell.className = 'staging-cell';
    cell.dataset.idx = i;
    const del = document.createElement('span');
    del.className = 'staging-del';
    del.textContent = '\u2715';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      S.staging[i] = null;
      renderStagingCell(i);
    });
    cell.appendChild(del);

    function placeStagingItem(si, gx, gy){
      if(!S.staging[si]) return;
      saveSnapshot();
      if(S.staging[si].combo){
        for(const t of S.staging[si].combo){
          const nx = gx+t.dx, ny = gy+t.dy;
          if(!hasBlockAt(nx, ny, S.currentHeight, null, S.currentLayer)){
            addBlock({gx:nx, gy:ny, gz:S.currentHeight, layer:S.currentLayer, color:t.color, srcH:t.srcH, yOffset:t.yOffset||0});
          }
        }
      } else {
        if(hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)) return;
        addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.staging[si].color, srcH:S.staging[si].srcH, yOffset:0});
      }
      draw();
    }

    let sDragStarted = false;
    cell.addEventListener('mousedown', (e) => {
      if(!S.staging[i] || e.button !== 0) return;
      sDragStarted = false;
      const sx = e.clientX, sy = e.clientY;
      const onM = (e2) => {
        if(!sDragStarted && (Math.abs(e2.clientX-sx)>4 || Math.abs(e2.clientY-sy)>4)){
          sDragStarted = true;
          if(!S.staging[i].combo){
            startTileDrag(S.staging[i].color, S.staging[i].srcH, e);
            S.tileDrag.fromStaging = i;
          }
        }
      };
      const onU = () => {
        document.removeEventListener('mousemove', onM);
        document.removeEventListener('mouseup', onU);
        if(!sDragStarted){
          if(S.brushMode && S.staging[i] && !S.staging[i].combo){
            S.brushTile = {color:S.staging[i].color, srcH:S.staging[i].srcH};
            updateBrushIndicator();
            return;
          }
          const center = toGrid(camera.W/2, camera.H/2);
          placeStagingItem(i, snap(center.gx), snap(center.gy));
        }
      };
      document.addEventListener('mousemove', onM);
      document.addEventListener('mouseup', onU);
    });
    grid.appendChild(cell);
  }
}

initStagingGrid();
