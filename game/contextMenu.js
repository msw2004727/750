import { S, draw } from './state.js';
import { hasBlockAt, computeReachable } from './blocks.js';
import { addBlock, removeBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { triggerShake } from './renderer.js';
import { addToStaging } from './staging.js';
import { mousePos, hitTest } from './hitTest.js';

function _showCtxMenu(x, y, items){
  _hideCtxMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  for(const item of items){
    const btn = document.createElement('div');
    btn.className = 'ctx-item';
    btn.textContent = item.label;
    btn.addEventListener('click', () => { _hideCtxMenu(); item.action(); });
    menu.appendChild(btn);
  }
  document.body.appendChild(menu);
  S.ctxMenu = menu;
  setTimeout(() => document.addEventListener('click', _hideCtxMenu, {once:true}), 10);
}

function _hideCtxMenu(){
  if(S.ctxMenu){ S.ctxMenu.remove(); S.ctxMenu = null; }
}

export function onCtx(e){
  e.preventDefault();
  const pos = mousePos(e);
  const hit = hitTest(pos.x, pos.y);
  if(!hit) return;
  if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;

  const items = [];
  items.push({label:'複製', action:() => {
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
      const nx = hit.gx+dx, ny = hit.gy+dy;
      if(!hasBlockAt(nx, ny, S.currentHeight, null, S.currentLayer)){
        saveSnapshot();
        addBlock({gx:nx, gy:ny, gz:hit.gz, layer:hit.layer, color:hit.color, srcH:hit.srcH, yOffset:hit.yOffset||0});
        draw();
        return;
      }
    }
  }});

  items.push({label:'放入暫存', action:() => {
    addToStaging(hit.color, hit.srcH);
  }});

  if(S.selectedBlocks.size > 1 && S.selectedBlocks.has(hit)){
    items.push({label:'組合放入暫存 (' + S.selectedBlocks.size + ')', action:() => {
      const sel = [...S.selectedBlocks];
      const minGx = Math.min(...sel.map(b=>b.gx));
      const minGy = Math.min(...sel.map(b=>b.gy));
      const combo = sel.map(b => ({dx:b.gx-minGx, dy:b.gy-minGy, color:b.color, srcH:b.srcH, yOffset:b.yOffset||0}));
      addToStaging(null, 0, combo);
      saveSnapshot();
      for(const b of sel) removeBlock(b);
      S.selectedBlocks = new Set();
      draw();
    }});
  }

  items.push({label:'刪除', action:() => {
    if(computeReachable(hit.gx, hit.gy, hit.gz, hit).size <= 1){ triggerShake(hit); return; }
    saveSnapshot(); removeBlock(hit); draw();
  }});

  _showCtxMenu(e.clientX, e.clientY, items);
}
