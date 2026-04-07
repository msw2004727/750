import { S, canvas } from './state.js';
import { hasBlockAt } from './blocks.js';

export function getRectLineCells(x0, y0, x1, y1){
  const cells = [];
  if(S.rectMode){
    const ax = Math.min(x0,x1), bx = Math.max(x0,x1);
    const ay = Math.min(y0,y1), by = Math.max(y0,y1);
    for(let x=ax;x<=bx;x++) for(let y=ay;y<=by;y++) cells.push([x,y]);
  } else {
    let cx=x0,cy=y0;
    const dx=Math.abs(x1-cx),dy=Math.abs(y1-cy);
    const sx=cx<x1?1:-1,sy=cy<y1?1:-1;
    let err=dx-dy;
    while(true){
      cells.push([cx,cy]);
      if(cx===x1&&cy===y1) break;
      const e2=2*err;
      if(e2>-dy){err-=dy;cx+=sx;}
      if(e2<dx){err+=dx;cy+=sy;}
    }
  }
  return cells;
}

export function computeFillPreview(gx, gy){
  const result = [];
  if(hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)) return result;
  const visited = new Set();
  const queue = [[gx, gy]];
  const key = (x,y) => x+','+y;
  visited.add(key(gx, gy));
  const MAX = 500;
  while(queue.length > 0 && visited.size < MAX){
    const [cx, cy] = queue.shift();
    result.push([cx, cy]);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, ny=cy+dy;
      const k = key(nx, ny);
      if(!visited.has(k) && !hasBlockAt(nx, ny, S.currentHeight, null, S.currentLayer)){
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return result;
}

export function clearDrawTools(except){
  if(except!=='chkBrush'){ S.brushMode = false; document.getElementById('chkBrush').checked = false; }
  if(except!=='chkEraser'){ S.eraserMode = false; document.getElementById('chkEraser').checked = false; }
  if(except!=='chkFill'){ S.fillMode = false; document.getElementById('chkFill').checked = false; }
  if(except!=='chkRect'){ S.rectMode = false; document.getElementById('chkRect').checked = false; }
  if(except!=='chkLine'){ S.lineMode = false; document.getElementById('chkLine').checked = false; }
  S.rectStart = null;
  canvas.style.cursor = (except && document.getElementById(except).checked) ? 'crosshair' : 'grab';
}

export function updateBrushIndicator(){
  const el = document.getElementById('brushInfo');
  if(!el) return;
  if(S.brushTile){
    el.textContent = S.brushTile.color;
    el.style.display = 'inline';
  } else {
    el.style.display = 'none';
  }
}
