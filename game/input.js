import { S, camera, world, canvas, draw, game } from './state.js';
import { bus } from './eventBus.js';
import { toScreen, toGrid, snap } from './coords.js';
import { hasBlockAt, computeReachable, selectConnected } from './blocks.js';
import { addBlock, removeBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { triggerShake } from './renderer.js';
import { stagingHighlight, findStagingSlotAt } from './staging.js';
import { getRectLineCells, computeFillPreview } from './tools.js';
import { mousePos, hitTest, hitTestAll } from './hitTest.js';
import { onCtx } from './contextMenu.js';
import { minimapBounds, minimapToGrid } from './minimap.js';
import { showToast } from './ui.js';
import { createDragOverlay, updateDragOverlay, removeDragOverlay, startDrag, updateDrag, endDrag } from './inputDrag.js';

// jumpToTile callback registration (set by palette.js)
let _jumpToTile = null;
export function setJumpToTile(fn){ _jumpToTile = fn; }

// Minimap drag state
let _mmDrag = false;
let _mmLastX = 0, _mmLastY = 0;

function _inMinimap(px, py){
  if(!S.showMinimap || !minimapBounds) return false;
  const mm = minimapBounds;
  return px >= mm.mmX && px <= mm.mmX+mm.mmW && py >= mm.mmY && py <= mm.mmY+mm.mmH;
}

// ── onDown ──
export function onDown(e){
  e.preventDefault();
  const pos = mousePos(e);

  // Game mode: delegate to game input via bus
  if(game.running){
    bus.emit('play:pointerdown', {pos, event:e});
    // Allow pan in game mode
    S.panDrag = true;
    S.panStartX = pos.x; S.panStartY = pos.y;
    S.panCamStartX = camera.x; S.panCamStartY = camera.y;
    canvas.style.cursor = 'grabbing';
    return;
  }

  // Minimap drag start
  if(_inMinimap(pos.x, pos.y)){
    const g = minimapToGrid(pos.x, pos.y);
    if(g){
      const cp = toScreen(g.gx, g.gy, S.currentHeight);
      camera.x += camera.W/2 - cp.x;
      camera.y += camera.H/2 - cp.y;
      draw();
    }
    _mmDrag = true;
    _mmLastX = pos.x;
    _mmLastY = pos.y;
    return;
  }

  // Auto-select: click any block → switch to its height+layer
  if(S.autoSelectMode){
    const anyHit = hitTestAll(pos.x, pos.y);
    if(anyHit){
      S.currentHeight = anyHit.gz;
      S.currentLayer = anyHit.layer;
      document.getElementById('heightNum').textContent = S.currentHeight;
      document.getElementById('layerNum').textContent = S.currentLayer;
      S.autoSelectMode = false;
      document.getElementById('chkAutoSelect').checked = false;
      draw();
      return;
    }
  }

  // Locate mode
  if(S.locateMode){
    const locHit = hitTestAll(pos.x, pos.y);
    if(locHit){
      if(_jumpToTile) _jumpToTile(locHit.color);
    }
    S.locateMode = false; document.getElementById('chkLocate').checked = false;
    return;
  }

  const hit = hitTest(pos.x, pos.y);

  // ── Tool modes ──
  if(S.brushMode && !S.brushTile && !e.shiftKey && !e.ctrlKey){
    showToast('請先點擊素材面板或暫存區選擇筆刷素材');
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
    if(!S.brushTile){ showToast('請先選擇筆刷素材再使用填充'); return; }
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
    if(!S.brushTile){ showToast('請先選擇筆刷素材'); return; }
    const g = toGrid(pos.x, pos.y);
    S.rectStart = {gx: snap(g.gx), gy: snap(g.gy)};
    S.brushPainting = true;
    draw();
    return;
  }

  // ── Copy drag ──
  if((e.ctrlKey || S.copyMode) && hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    saveSnapshot();
    const clone = {gx:hit.gx, gy:hit.gy, gz:hit.gz, layer:hit.layer, color:hit.color, srcH:hit.srcH};
    addBlock(clone);
    S.reachableSet = null;
    S.groupOffsets = null;
    startDrag(hit, pos, 'copy');
    hit._copyMode = true;
    draw();
    return;
  }

  // ── Shift / select mode ──
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

  // ── Group drag (selected blocks) ──
  if(S.selectedBlocks.size > 0 && !e.shiftKey){
    if(hit && S.selectedBlocks.has(hit)){
      saveSnapshot();
      S.groupOffsets = [];
      for(const b of S.selectedBlocks){
        S.groupOffsets.push({block:b, dx:b.gx - hit.gx, dy:b.gy - hit.gy, origGx:b.gx, origGy:b.gy});
      }
      startDrag(hit, pos, 'grab');
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

  // ── Single block drag ──
  if(hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    S.reachableSet = computeReachable(hit.gx, hit.gy, hit.gz, hit);
    if(S.reachableSet.size <= 1){ triggerShake(hit); S.reachableSet = null; return; }
    saveSnapshot();
    S.groupOffsets = null;
    startDrag(hit, pos, 'grab');
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
  // Minimap drag
  if(_mmDrag){
    e.preventDefault();
    const pos = mousePos(e);
    const g1 = minimapToGrid(_mmLastX, _mmLastY);
    const g2 = minimapToGrid(pos.x, pos.y);
    if(g1 && g2){
      const sp1 = toScreen(g1.gx, g1.gy, S.currentHeight);
      const sp2 = toScreen(g2.gx, g2.gy, S.currentHeight);
      camera.x += sp1.x - sp2.x;
      camera.y += sp1.y - sp2.y;
      draw();
    }
    _mmLastX = pos.x;
    _mmLastY = pos.y;
    return;
  }

  // Mobile: drag overlay near staging
  if(S.dragBlock){
    if('ontouchstart' in window){
      const nearStaging = findStagingSlotAt(S.lastMouseClientX, S.lastMouseClientY) >= 0;
      stagingHighlight(nearStaging);
      if(nearStaging && !S.canvasDragOverlay) createDragOverlay(S.dragBlock.color);
      if(!nearStaging && S.canvasDragOverlay) removeDragOverlay();
    }
    updateDragOverlay();
  }

  // Brush / eraser painting
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

  // Block drag
  if(S.dragBlock){
    e.preventDefault();
    const pos = mousePos(e);
    updateDrag(pos);
    return;
  }

  // Box select
  if(S.boxSelect){
    e.preventDefault();
    const pos = mousePos(e);
    S.boxSelect.ex = pos.x;
    S.boxSelect.ey = pos.y;
    draw();
    return;
  }

  // Pan
  if(S.panDrag){
    e.preventDefault();
    const pos = mousePos(e);
    camera.x = S.panCamStartX + (pos.x - S.panStartX);
    camera.y = S.panCamStartY + (pos.y - S.panStartY);
    draw();
    return;
  }

  // Hover / cursor preview
  if(S.showHover || S.brushMode || S.eraserMode || S.fillMode || S.rectMode || S.lineMode){
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
  if(_mmDrag){ _mmDrag = false; return; }

  // Brush/rect/line commit
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

  // Box select commit
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

  // Drag end
  if(S.dragBlock){
    const handled = endDrag();
    if(handled) return;
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
    const dir = e.deltaY < 0 ? 0.25 : -0.25;
    const cur = S.dragBlock.yOffset || 0;
    const next = Math.max(0, Math.min(5, Math.round((cur + dir) * 100) / 100));
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
  removeDragOverlay();
});
