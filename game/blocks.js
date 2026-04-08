import { S } from './state.js';
import { shKey, shGet } from './spatialHash.js';

export function hasBlockAt(gx, gy, gz, exclude, layer){
  const chkLayer = (layer !== undefined) ? layer : S.currentLayer;
  const k = shKey(gx, gy, gz, chkLayer);
  const s = shGet(k);
  if(!s) return false;
  for(const b of s){
    if(b !== exclude) return true;
  }
  return false;
}

export function computeReachable(startGx, startGy, gz, excludeBlock){
  const reachable = new Set();
  const queue = [[startGx, startGy]];
  const key = (x, y) => x + ',' + y;
  reachable.add(key(startGx, startGy));
  while(queue.length > 0){
    const [cx, cy] = queue.shift();
    if(Math.abs(cx - startGx) > 50 || Math.abs(cy - startGy) > 50) continue;
    for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = cx + dx, ny = cy + dy;
      const k = key(nx, ny);
      const isTall = excludeBlock && excludeBlock.srcH > 32;
      const lyr = excludeBlock ? excludeBlock.layer : S.currentLayer;
      const blocked = hasBlockAt(nx, ny, gz, excludeBlock, lyr) || (isTall && hasBlockAt(nx, ny, gz + 1, excludeBlock, lyr));
      if(!reachable.has(k) && !blocked){
        reachable.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return reachable;
}

export function selectConnected(startBlock){
  S.selectedBlocks = new Set();
  S.selectedBlocks.add(startBlock);
  const queue = [startBlock];
  while(queue.length > 0){
    const cur = queue.shift();
    for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = cur.gx + dx, ny = cur.gy + dy;
      const set = shGet(shKey(nx, ny, cur.gz, cur.layer));
      if(!set) continue;
      for(const b of set){
        if(!S.selectedBlocks.has(b)){
          S.selectedBlocks.add(b);
          queue.push(b);
        }
      }
    }
  }
}

export function findEmptySpot(){
  for(let r = 0; r < 30; r++){
    for(let dx = -r; dx <= r; dx++){
      for(let dy = -r; dy <= r; dy++){
        if(Math.abs(dx) === r || Math.abs(dy) === r){
          if(!hasBlockAt(dx, dy, S.currentHeight, null, S.currentLayer)) return {gx:dx, gy:dy};
        }
      }
    }
  }
  return {gx:0, gy:0};
}
