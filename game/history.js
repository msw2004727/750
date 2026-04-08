import { S, camera, world, draw } from './state.js';
import { setBlocks, addBlock, removeBlock } from './spatialHash.js';
import { toGrid, snap } from './coords.js';
import { hasBlockAt } from './blocks.js';
import { scheduleAutoSave } from './saveLoad.js';

export function saveSnapshot(){
  S.history.push(JSON.stringify(world.blocks));
  if(S.history.length > 50) S.history.shift();
  S.redoStack = [];
  scheduleAutoSave();
}

export function doUndo(){
  if(S.history.length === 0) return;
  S.redoStack.push(JSON.stringify(world.blocks));
  setBlocks(JSON.parse(S.history.pop()));
  S.selectedBlocks = new Set();
  draw();
}

export function doRedo(){
  if(S.redoStack.length === 0) return;
  S.history.push(JSON.stringify(world.blocks));
  setBlocks(JSON.parse(S.redoStack.pop()));
  S.selectedBlocks = new Set();
  draw();
}

// ── Keyboard shortcuts ──
document.getElementById('undoBtn').addEventListener('click', doUndo);
document.getElementById('redoBtn').addEventListener('click', doRedo);

document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === 'z'){ e.preventDefault(); doUndo(); }
  if(e.ctrlKey && e.key === 'y'){ e.preventDefault(); doRedo(); }
  if(e.ctrlKey && e.key === 'c'){
    if(S.selectedBlocks.size > 0){
      e.preventDefault();
      const sel = [...S.selectedBlocks];
      const minGx = Math.min(...sel.map(b=>b.gx)), minGy = Math.min(...sel.map(b=>b.gy));
      S.clipboard = sel.map(b => ({dx:b.gx-minGx, dy:b.gy-minGy, color:b.color, srcH:b.srcH, yOffset:b.yOffset||0}));
    }
  }
  if(e.ctrlKey && e.key === 'v'){
    if(S.clipboard && S.clipboard.length > 0){
      e.preventDefault();
      saveSnapshot();
      const center = toGrid(camera.W/2, camera.H/2);
      const gx = snap(center.gx), gy = snap(center.gy);
      const pasted = [];
      for(const t of S.clipboard){
        const nx = gx+t.dx, ny = gy+t.dy;
        if(!hasBlockAt(nx, ny, S.currentHeight, null, S.currentLayer)){
          const b = {gx:nx, gy:ny, gz:S.currentHeight, layer:S.currentLayer, color:t.color, srcH:t.srcH, yOffset:t.yOffset};
          addBlock(b);
          pasted.push(b);
        }
      }
      // Keep pasted blocks selected for immediate group move
      S.selectedBlocks = new Set(pasted);
      draw();
    }
  }
  // Delete key: delete selected blocks
  if(e.key === 'Delete' && S.selectedBlocks.size > 0){
    e.preventDefault();
    saveSnapshot();
    for(const b of S.selectedBlocks) removeBlock(b);
    S.selectedBlocks = new Set();
    draw();
  }
});
