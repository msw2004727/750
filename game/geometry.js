// ── Pure geometry computations (Engine layer, no state dependency) ──

export function getRectCells(x0, y0, x1, y1){
  const cells = [];
  const ax = Math.min(x0,x1), bx = Math.max(x0,x1);
  const ay = Math.min(y0,y1), by = Math.max(y0,y1);
  for(let x=ax;x<=bx;x++) for(let y=ay;y<=by;y++) cells.push([x,y]);
  return cells;
}

export function getLineCells(x0, y0, x1, y1){
  const cells = [];
  let cx=x0, cy=y0;
  const dx=Math.abs(x1-cx), dy=Math.abs(y1-cy);
  const sx=cx<x1?1:-1, sy=cy<y1?1:-1;
  let err=dx-dy;
  while(true){
    cells.push([cx,cy]);
    if(cx===x1&&cy===y1) break;
    const e2=2*err;
    if(e2>-dy){err-=dy;cx+=sx;}
    if(e2<dx){err+=dx;cy+=sy;}
  }
  return cells;
}

export function floodFill(startGx, startGy, isBlocked, maxCount){
  const result = [];
  if(isBlocked(startGx, startGy)) return result;
  const visited = new Set();
  const queue = [[startGx, startGy]];
  const key = (x,y) => x+','+y;
  visited.add(key(startGx, startGy));
  const MAX = maxCount || 500;
  while(queue.length > 0 && visited.size < MAX){
    const [cx, cy] = queue.shift();
    result.push([cx, cy]);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, ny=cy+dy;
      const k = key(nx, ny);
      if(!visited.has(k) && !isBlocked(nx, ny)){
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return result;
}
