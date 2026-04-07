import { TILES, SOURCES } from './tileData.js';
import { S, camera, world, canvas, draw } from './state.js';
import { toScreen, toGrid, snap } from './coords.js';
import { hasBlockAt, computeReachable, selectConnected } from './blocks.js';
import { addBlock, removeBlock, shRemove, shAdd } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { triggerShake } from './renderer.js';
import { stagingHighlight, findStagingSlotAt, addToStaging } from './staging.js';
import { getRectLineCells, computeFillPreview } from './tools.js';
import { mousePos, hitTest } from './hitTest.js';
import { onCtx } from './contextMenu.js';
import { minimapBounds } from './minimap.js';

// ── Canvas drag overlay (private) ──
function _createDragOverlay(key){
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
function _updateDragOverlay(){
  if(S.canvasDragOverlay){
    S.canvasDragOverlay.style.left = (S.lastMouseClientX - 24) + 'px';
    S.canvasDragOverlay.style.top = (S.lastMouseClientY - 24) + 'px';
  }
}
function _removeDragOverlay(){
  if(S.canvasDragOverlay){ S.canvasDragOverlay.remove(); S.canvasDragOverlay = null; }
}

// jumpToTile callback registration (set by palette.js)
let _jumpToTile = null;
export function setJumpToTile(fn){ _jumpToTile = fn; }

// ── onDown ──
export function onDown(e){
  e.preventDefault();
  const pos = mousePos(e);

  // Minimap click-to-jump
  if(S.showMinimap && minimapBounds){
    const mm = minimapBounds;
    if(pos.x >= mm.mmX && pos.x <= mm.mmX+mm.mmW && pos.y >= mm.mmY && pos.y <= mm.mmY+mm.mmH){
      const tgx = mm.midX + (pos.x - mm.ox) / mm.sc;
      const tgy = mm.midY + (pos.y - mm.oy) / mm.sc;
      const cp = toScreen(tgx, tgy, S.currentHeight);
      camera.x += camera.W/2 - cp.x;
      camera.y += camera.H/2 - cp.y;
      draw();
      return;
    }
  }

  const hit = hitTest(pos.x, pos.y);

  if(S.locateMode && hit){
    if(_jumpToTile) _jumpToTile(hit.color);
    S.locateMode = false; document.getElementById('chkLocate').checked = false;
    return;
  }

  if(S.brushMode && !S.brushTile && !e.shiftKey && !e.ctrlKey){
    alert('請先點擊素材面板或暫存區選擇筆刷素材');
    return;
  }
  if(S.brushMode && S.brushTile && !e.shiftKey && !e.ctrlKey){
    const g = toGrid(pos.x, pos.y);
    const gx = snap(g.gx), gy = snap(g.gy);
    if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
      saveSnapshot();
      addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
      draw();
    }
    S.brushPainting = true;
    return;
  }

  if(S.eraserMode && hit && !e.shiftKey){
    if(hit.gz === S.currentHeight && hit.layer === S.currentLayer){
      saveSnapshot();
      removeBlock(hit);
      draw();
    }
    S.brushPainting = true;
    return;
  }

  if(S.fillMode && !e.shiftKey){
    if(!S.brushTile){ alert('請先選擇筆刷素材再使用填充'); return; }
    if(S.fillPreview.length > 0){
      saveSnapshot();
      for(const [fx,fy] of S.fillPreview){
        addBlock({gx:fx, gy:fy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
      }
      S.fillPreview = [];
      draw();
    }
    return;
  }

  if((S.rectMode || S.lineMode) && !e.shiftKey){
    if(!S.brushTile){ alert('請先選擇筆刷素材'); return; }
    const g = toGrid(pos.x, pos.y);
    S.rectStart = {gx: snap(g.gx), gy: snap(g.gy)};
    S.brushPainting = true;
    draw();
    return;
  }

  if((e.ctrlKey || S.copyMode) && hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    saveSnapshot();
    const clone = {gx:hit.gx, gy:hit.gy, gz:hit.gz, layer:hit.layer, color:hit.color, srcH:hit.srcH};
    addBlock(clone);
    S.reachableSet = null;
    S.dragBlock = hit;
    S.dragBlock._copyMode = true;
    if(!('ontouchstart' in window)) _createDragOverlay(hit.color);
    document.getElementById('stagingArea').style.pointerEvents = 'none';
    S.groupOffsets = null;
    const sp = toScreen(hit.gx, hit.gy, hit.gz);
    S.dragOffX = pos.x - sp.x;
    S.dragOffY = pos.y - sp.y;
    S.lastValidGx = hit.gx;
    S.lastValidGy = hit.gy;
    hit._dragGx = hit.gx;
    hit._dragGy = hit.gy;
    canvas.style.cursor = 'copy';
    draw();
    return;
  }

  if(e.shiftKey || S.selectMode){
    if(hit){
      if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
      selectConnected(hit);
      draw();
    } else {
      S.boxSelect = {sx:pos.x, sy:pos.y, ex:pos.x, ey:pos.y};
    }
    return;
  }

  if(S.selectedBlocks.size > 0 && !e.shiftKey){
    if(hit && S.selectedBlocks.has(hit)){
      saveSnapshot();
      S.dragBlock = hit;
      if(!('ontouchstart' in window)) _createDragOverlay(hit.color);
      document.getElementById('stagingArea').style.pointerEvents = 'none';
      S.groupOffsets = [];
      for(const b of S.selectedBlocks){
        S.groupOffsets.push({block:b, dx:b.gx - hit.gx, dy:b.gy - hit.gy, origGx:b.gx, origGy:b.gy});
      }
      const sp = toScreen(hit.gx, hit.gy, hit.gz);
      S.dragOffX = pos.x - sp.x;
      S.dragOffY = pos.y - sp.y;
      S.lastValidGx = hit.gx;
      S.lastValidGy = hit.gy;
      hit._dragGx = hit.gx;
      hit._dragGy = hit.gy;
      canvas.style.cursor = 'grabbing';
      draw();
      return;
    }
    S.selectedBlocks = new Set();
    S.groupOffsets = null;
    draw();
    if(!hit){
      S.panDrag = true;
      S.panStartX = pos.x; S.panStartY = pos.y;
      S.panCamStartX = camera.x; S.panCamStartY = camera.y;
      canvas.style.cursor = 'grabbing';
    }
    return;
  }

  if(hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    S.reachableSet = computeReachable(hit.gx, hit.gy, hit.gz, hit);
    if(S.reachableSet.size <= 1){ triggerShake(hit); S.reachableSet = null; return; }
    saveSnapshot();
    S.dragBlock = hit;
    S.groupOffsets = null;
    if(!('ontouchstart' in window)) _createDragOverlay(hit.color);
    document.getElementById('stagingArea').style.pointerEvents = 'none';
    const sp = toScreen(hit.gx, hit.gy, hit.gz);
    S.dragOffX = pos.x - sp.x;
    S.dragOffY = pos.y - sp.y;
    S.lastValidGx = hit.gx;
    S.lastValidGy = hit.gy;
    hit._dragGx = hit.gx;
    hit._dragGy = hit.gy;
    canvas.style.cursor = 'grabbing';
    draw();
  } else {
    S.panDrag = true;
    S.panStartX = pos.x; S.panStartY = pos.y;
    S.panCamStartX = camera.x; S.panCamStartY = camera.y;
    canvas.style.cursor = 'grabbing';
  }
}

// ── onMove ──
export function onMove(e){
  if(S.dragBlock){
    if('ontouchstart' in window){
      const nearStaging = findStagingSlotAt(S.lastMouseClientX, S.lastMouseClientY) >= 0;
      stagingHighlight(nearStaging);
      if(nearStaging && !S.canvasDragOverlay) _createDragOverlay(S.dragBlock.color);
      if(!nearStaging && S.canvasDragOverlay) _removeDragOverlay();
    }
    _updateDragOverlay();
  }
  if(S.brushPainting){
    e.preventDefault();
    const pos = mousePos(e);
    const g = toGrid(pos.x, pos.y);
    const gx = snap(g.gx), gy = snap(g.gy);
    S.brushCursorGx = gx; S.brushCursorGy = gy;
    if(S.brushMode && S.brushTile){
      if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
        addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
      }
    } else if(S.eraserMode){
      const hit2 = hitTest(pos.x, pos.y);
      if(hit2 && hit2.gz === S.currentHeight && hit2.layer === S.currentLayer){
        removeBlock(hit2);
      }
    }
    draw();
    return;
  }
  if(S.dragBlock){
    e.preventDefault();
    const pos = mousePos(e);
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
      if(S.reachableSet && S.reachableSet.has(k)){
        shRemove(S.dragBlock);
        S.dragBlock.gx = tgx;
        S.dragBlock.gy = tgy;
        shAdd(S.dragBlock);
        S.lastValidGx = tgx;
        S.lastValidGy = tgy;
      }
    }
    draw();
  } else if(S.boxSelect){
    e.preventDefault();
    const pos = mousePos(e);
    S.boxSelect.ex = pos.x;
    S.boxSelect.ey = pos.y;
    draw();
  } else if(S.panDrag){
    e.preventDefault();
    const pos = mousePos(e);
    camera.x = S.panCamStartX + (pos.x - S.panStartX);
    camera.y = S.panCamStartY + (pos.y - S.panStartY);
    draw();
  } else if(S.showHover || S.brushMode || S.eraserMode || S.fillMode || S.rectMode || S.lineMode){
    const pos = mousePos(e);
    let needDraw = false;
    const g = toGrid(pos.x, pos.y);
    const newGx = snap(g.gx), newGy = snap(g.gy);
    if(newGx !== S.brushCursorGx || newGy !== S.brushCursorGy){
      S.brushCursorGx = newGx; S.brushCursorGy = newGy;
      needDraw = true;
      if(S.fillMode && S.brushTile){
        S.fillPreview = computeFillPreview(newGx, newGy);
      }
    }
    if(S.showHover){
      const prev = S.hoverBlock;
      S.hoverBlock = hitTest(pos.x, pos.y);
      if(S.hoverBlock !== prev) needDraw = true;
    }
    if(needDraw) draw();
  }
}

// ── onUp ──
export function onUp(){
  if(S.brushPainting){
    S.brushPainting = false;
    if((S.rectMode || S.lineMode) && S.rectStart && S.brushTile){
      const gx = S.brushCursorGx, gy = S.brushCursorGy;
      saveSnapshot();
      const cells = getRectLineCells(S.rectStart.gx, S.rectStart.gy, gx, gy);
      for(const [cx,cy] of cells){
        if(!hasBlockAt(cx, cy, S.currentHeight, null, S.currentLayer)){
          addBlock({gx:cx, gy:cy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
        }
      }
      S.rectStart = null;
      draw();
    }
    return;
  }
  if(S.boxSelect){
    const x1 = Math.min(S.boxSelect.sx, S.boxSelect.ex);
    const y1 = Math.min(S.boxSelect.sy, S.boxSelect.ey);
    const x2 = Math.max(S.boxSelect.sx, S.boxSelect.ex);
    const y2 = Math.max(S.boxSelect.sy, S.boxSelect.ey);
    S.selectedBlocks = new Set();
    for(const b of world.blocks){
      if(b.gz !== S.currentHeight || b.layer !== S.currentLayer) continue;
      const p = toScreen(b.gx, b.gy, b.gz);
      if(p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2){
        S.selectedBlocks.add(b);
      }
    }
    S.boxSelect = null;
    draw();
    return;
  }
  if(S.dragBlock){
    _removeDragOverlay();
    document.getElementById('stagingArea').style.pointerEvents = 'auto';
    stagingHighlight(false);
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
        delete S.dragBlock._dragGx;
        delete S.dragBlock._dragGy;
        delete S.dragBlock._copyMode;
        S.dragBlock = null;
        S.groupOffsets = null;
        S.reachableSet = null;
        S.panDrag = false;
        draw();
        return;
      }
    }
    if(!S.groupOffsets){
      S.dragBlock.gx = S.lastValidGx;
      S.dragBlock.gy = S.lastValidGy;
    }
    delete S.dragBlock._dragGx;
    delete S.dragBlock._dragGy;
    delete S.dragBlock._copyMode;
    S.dragBlock = null;
    S.groupOffsets = null;
  }
  S.reachableSet = null;
  S.panDrag = false;
  canvas.style.cursor = (S.brushMode||S.eraserMode||S.fillMode||S.rectMode||S.lineMode) ? 'crosshair' : 'grab';
  draw();
}

// ── onWheel ──
function _onWheel(e){
  e.preventDefault();
  if(S.dragBlock && !S.dragBlock._copyMode){
    const dir = e.deltaY < 0 ? 1 : -1;
    const cur = S.dragBlock.yOffset || 0;
    const next = Math.max(0, Math.min(5, cur + dir));
    if(next !== cur){
      S.dragBlock.yOffset = next;
      draw();
    }
    return;
  }
  const pos = mousePos(e);
  const before = toGrid(pos.x, pos.y);
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  camera.zoom = Math.max(0.15, Math.min(3, camera.zoom * delta));
  const after = toScreen(before.gx, before.gy, 0);
  camera.x += pos.x - after.x;
  camera.y += pos.y - after.y;
  draw();
}

// ── onDbl ──
export function onDbl(e){
  const pos = mousePos(e);
  const hit = hitTest(pos.x, pos.y);
  if(hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    if(computeReachable(hit.gx, hit.gy, hit.gz, hit).size <= 1){ triggerShake(hit); return; }
    saveSnapshot(); removeBlock(hit); draw();
  }
}

// ── Bind events ──
canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
document.addEventListener('mouseup', onUp);
canvas.addEventListener('wheel', _onWheel, {passive:false});
canvas.addEventListener('dblclick', onDbl);
canvas.addEventListener('contextmenu', onCtx);

// Global mouse/touch position tracking
document.addEventListener('mousemove', (e) => {
  S.lastMouseClientX = e.clientX; S.lastMouseClientY = e.clientY;
}, true);
document.addEventListener('touchmove', (e) => {
  if(e.touches[0]){ S.lastMouseClientX = e.touches[0].clientX; S.lastMouseClientY = e.touches[0].clientY; }
}, true);

// Window blur cleanup
window.addEventListener('blur', () => {
  if(S.tileDrag){ S.tileDrag.el.remove(); S.tileDrag = null; stagingHighlight(false); }
  if(S.mobileDragEl){ S.mobileDragEl.remove(); S.mobileDragEl = null; S.mobileDragKey = null; stagingHighlight(false); }
  _removeDragOverlay();
});
