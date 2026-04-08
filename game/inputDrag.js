// ── Drag mechanics extracted from input.js ──
// Handles: drag overlay, block movement (single/copy/group), staging drop on end

import { TILES, SOURCES } from './tileData.js';
import { S, camera, canvas, draw } from './state.js';
import { toScreen, toGrid, snap } from './coords.js';
import { hasBlockAt } from './blocks.js';
import { removeBlock, shRemove, shAdd } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { stagingHighlight, findStagingSlotAt, addToStaging } from './staging.js';

// ── Canvas drag overlay (for mobile staging proximity) ──
export function createDragOverlay(key){
  if(S.canvasDragOverlay) S.canvasDragOverlay.remove();
  const td = TILES[key];
  if(!td) return;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.6;width:48px;height:48px;';
  const img = document.createElement('img');
  const src2 = SOURCES.find(s => s.prefix === key.charAt(0));
  img.src = (src2 ? src2.base : '') + td.file;
  img.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
  el.appendChild(img);
  document.body.appendChild(el);
  S.canvasDragOverlay = el;
}

export function updateDragOverlay(){
  if(S.canvasDragOverlay){
    S.canvasDragOverlay.style.left = (S.lastMouseClientX - 24) + 'px';
    S.canvasDragOverlay.style.top = (S.lastMouseClientY - 24) + 'px';
  }
}

export function removeDragOverlay(){
  if(S.canvasDragOverlay){ S.canvasDragOverlay.remove(); S.canvasDragOverlay = null; }
}

// ── Start drag: initialise common drag state on a hit block ──
export function startDrag(hit, pos, mode){
  S.dragBlock = hit;
  document.getElementById('stagingArea').style.pointerEvents = 'none';
  const sp = toScreen(hit.gx, hit.gy, hit.gz);
  S.dragOffX = pos.x - sp.x;
  S.dragOffY = pos.y - sp.y;
  S.lastValidGx = hit.gx;
  S.lastValidGy = hit.gy;
  hit._dragGx = hit.gx;
  hit._dragGy = hit.gy;
  canvas.style.cursor = mode === 'copy' ? 'copy' : 'grabbing';
}

// ── Update drag: move block(s) based on new mouse position ──
export function updateDrag(pos){
  const sx = pos.x - S.dragOffX;
  const sy = pos.y - S.dragOffY;
  const g = toGrid(sx, sy);
  const tgx = snap(g.gx), tgy = snap(g.gy);
  S.dragBlock._dragGx = g.gx;
  S.dragBlock._dragGy = g.gy;

  if(S.dragBlock._copyMode){
    if(!hasBlockAt(tgx, tgy, S.dragBlock.gz, S.dragBlock, S.dragBlock.layer)){
      shRemove(S.dragBlock);
      S.dragBlock.gx = tgx;
      S.dragBlock.gy = tgy;
      shAdd(S.dragBlock);
      S.lastValidGx = tgx;
      S.lastValidGy = tgy;
    }
  } else if(S.groupOffsets){
    const ddx = tgx - S.lastValidGx, ddy = tgy - S.lastValidGy;
    if(ddx !== 0 || ddy !== 0){
      let canMove = true;
      for(const go of S.groupOffsets){
        const nx = go.block.gx + ddx, ny = go.block.gy + ddy;
        if(hasBlockAt(nx, ny, S.dragBlock.gz, null, S.dragBlock.layer)){
          let inGroup = false;
          for(const go2 of S.groupOffsets){
            if(go2.block.gx === nx && go2.block.gy === ny){ inGroup = true; break; }
          }
          if(!inGroup){ canMove = false; break; }
        }
      }
      if(canMove){
        for(const go of S.groupOffsets) shRemove(go.block);
        for(const go of S.groupOffsets){
          go.block.gx += ddx;
          go.block.gy += ddy;
        }
        for(const go of S.groupOffsets) shAdd(go.block);
        S.lastValidGx = tgx;
        S.lastValidGy = tgy;
      }
    }
  } else {
    const k = tgx + ',' + tgy;
    // reachableSet === null means free movement (editor mode, no restriction)
    if(!S.reachableSet || S.reachableSet.has(k)){
      shRemove(S.dragBlock);
      S.dragBlock.gx = tgx;
      S.dragBlock.gy = tgy;
      shAdd(S.dragBlock);
      S.lastValidGx = tgx;
      S.lastValidGy = tgy;
    }
  }
  draw();
}

// ── End drag: finalise position, handle staging drop on mobile ──
export function endDrag(){
  removeDragOverlay();
  document.getElementById('stagingArea').style.pointerEvents = 'auto';
  stagingHighlight(false);

  // Mobile: check if dropped onto staging area
  if('ontouchstart' in window){
    const slot = findStagingSlotAt(S.lastMouseClientX, S.lastMouseClientY);
    if(slot >= 0){
      saveSnapshot();
      if(S.groupOffsets && S.groupOffsets.length > 1){
        const minGx = Math.min(...S.groupOffsets.map(g=>g.block.gx));
        const minGy = Math.min(...S.groupOffsets.map(g=>g.block.gy));
        const combo = S.groupOffsets.map(g => ({
          dx:g.block.gx-minGx, dy:g.block.gy-minGy, color:g.block.color, srcH:g.block.srcH, yOffset:g.block.yOffset||0
        }));
        addToStaging(null, 0, combo);
        for(const g of S.groupOffsets) removeBlock(g.block);
        S.selectedBlocks = new Set();
      } else {
        addToStaging(S.dragBlock.color, S.dragBlock.srcH);
        removeBlock(S.dragBlock);
      }
      _cleanupDrag();
      S.reachableSet = null;
      S.panDrag = false;
      draw();
      return true; // signals staging drop handled
    }
  }

  if(!S.groupOffsets){
    S.dragBlock.gx = S.lastValidGx;
    S.dragBlock.gy = S.lastValidGy;
  }
  _cleanupDrag();
  return false;
}

function _cleanupDrag(){
  delete S.dragBlock._dragGx;
  delete S.dragBlock._dragGy;
  delete S.dragBlock._copyMode;
  S.dragBlock = null;
  S.groupOffsets = null;
}
