import { S, camera, canvas, draw } from './state.js';
import { TILES, SOURCES } from './tileData.js';
import { toScreen, toGrid, snap } from './coords.js';
import { hasBlockAt } from './blocks.js';
import { addBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { onDown, onMove, onUp, onDbl } from './input.js';
import { stagingHighlight, findStagingSlotAt, addToStaging } from './staging.js';

// ── Mobile tile drag from palette ──
export function setupMobileTileDrag(btn, key){
  let timer = null;
  btn.addEventListener('touchstart', (e) => {
    timer = setTimeout(() => {
      e.preventDefault();
      S.mobileDragKey = key;
      S.mobileDragEl = document.createElement('div');
      S.mobileDragEl.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.7;width:42px;height:42px;';
      const img = document.createElement('img');
      const td = TILES[key];
      const src2 = SOURCES.find(s => s.prefix === key.charAt(0));
      if(src2 && td) img.src = src2.base + td.file;
      img.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      S.mobileDragEl.appendChild(img);
      document.body.appendChild(S.mobileDragEl);
      const t = e.touches[0];
      S.mobileDragEl.style.left = (t.clientX - 21) + 'px';
      S.mobileDragEl.style.top = (t.clientY - 21) + 'px';
    }, 50);
  }, {passive:false});

  btn.addEventListener('touchmove', (e) => {
    if(S.mobileDragKey){
      e.preventDefault();
      const t = e.touches[0];
      if(S.mobileDragEl){
        S.mobileDragEl.style.left = (t.clientX - 21) + 'px';
        S.mobileDragEl.style.top = (t.clientY - 21) + 'px';
      }
      const slot = findStagingSlotAt(t.clientX, t.clientY);
      stagingHighlight(slot >= 0);
    } else {
      clearTimeout(timer);
    }
  }, {passive:false});

  btn.addEventListener('touchend', (e) => {
    clearTimeout(timer);
    if(S.mobileDragKey && S.mobileDragEl){
      const t = e.changedTouches[0];
      stagingHighlight(false);
      const slot = findStagingSlotAt(t.clientX, t.clientY);
      if(slot >= 0){
        addToStaging(S.mobileDragKey, TILES[S.mobileDragKey].srcH);
      } else {
        const r = canvas.getBoundingClientRect();
        if(t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom){
          const mx = t.clientX - r.left, my = t.clientY - r.top;
          const g = toGrid(mx, my);
          const gx = snap(g.gx), gy = snap(g.gy);
          if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
            saveSnapshot();
            addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.mobileDragKey, srcH:TILES[S.mobileDragKey].srcH, yOffset:0});
            draw();
          }
        }
      }
      S.mobileDragEl.remove();
      S.mobileDragEl = null;
      S.mobileDragKey = null;
    }
  });
}

// ── Canvas touch: single finger + pinch zoom ──
canvas.addEventListener('touchstart', (e) => {
  if(e.touches.length === 2){
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const r = canvas.getBoundingClientRect();
    S.pinch = {
      dist,
      zoom0: camera.zoom,
      cx: (t0.clientX + t1.clientX) / 2 - r.left,
      cy: (t0.clientY + t1.clientY) / 2 - r.top
    };
    return;
  }
  S.pinch = null;
  onDown(e);
}, {passive:false});

canvas.addEventListener('touchmove', (e) => {
  if(S.pinch && e.touches.length === 2){
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const before = toGrid(S.pinch.cx, S.pinch.cy);
    camera.zoom = Math.max(0.15, Math.min(3, S.pinch.zoom0 * (dist / S.pinch.dist)));
    const after = toScreen(before.gx, before.gy, 0);
    camera.x += S.pinch.cx - after.x;
    camera.y += S.pinch.cy - after.y;
    draw();
    return;
  }
  onMove(e);
}, {passive:false});

canvas.addEventListener('touchend', (e) => {
  if(S.pinch){ S.pinch = null; return; }
  onUp(e);
  const now = Date.now();
  if(now - S.lastTapTime < 300 && e.changedTouches.length === 1){
    const t = e.changedTouches[0];
    const fakeE = {clientX:t.clientX, clientY:t.clientY, preventDefault(){}};
    onDbl(fakeE);
  }
  S.lastTapTime = now;
});

// Mobile pan: canvas only (no document-level pan)
