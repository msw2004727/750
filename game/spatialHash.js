import { S, world } from './state.js';
import { TILES } from './tileData.js';

// ── Spatial hash index ──
const spatialHash = new Map();

export function shKey(gx, gy, gz, layer){ return gx+','+gy+','+gz+','+layer; }

export function shAdd(b){
  const k = shKey(b.gx, b.gy, b.gz, b.layer);
  if(!spatialHash.has(k)) spatialHash.set(k, new Set());
  spatialHash.get(k).add(b);
  if(b.srcH > 32){
    const k2 = shKey(b.gx, b.gy, b.gz + 1, b.layer);
    if(!spatialHash.has(k2)) spatialHash.set(k2, new Set());
    spatialHash.get(k2).add(b);
  }
}

export function shRemove(b){
  const k = shKey(b.gx, b.gy, b.gz, b.layer);
  const s = spatialHash.get(k);
  if(s){ s.delete(b); if(s.size === 0) spatialHash.delete(k); }
  if(b.srcH > 32){
    const k2 = shKey(b.gx, b.gy, b.gz + 1, b.layer);
    const s2 = spatialHash.get(k2);
    if(s2){ s2.delete(b); if(s2.size === 0) spatialHash.delete(k2); }
  }
}

export function shRebuild(){
  spatialHash.clear();
  for(const b of world.blocks) shAdd(b);
}

export function shGet(k){ return spatialHash.get(k); }

function _isAnimated(b){
  const td = TILES[b.color];
  return td && td.frames > 1;
}

export function addBlock(b){
  if(!b.type) b.type = 'tile';
  if(!b.state) b.state = {};
  world.blocks.push(b);
  shAdd(b);
  if(_isAnimated(b)) S.animBlockCount++;
}

export function removeBlock(b){
  const idx = world.blocks.indexOf(b);
  if(idx >= 0) world.blocks.splice(idx, 1);
  shRemove(b);
  if(_isAnimated(b)) S.animBlockCount--;
}

export function removeBlocksWhere(fn){
  const removing = world.blocks.filter(fn);
  for(const b of removing){
    shRemove(b);
    if(_isAnimated(b)) S.animBlockCount--;
  }
  world.blocks = world.blocks.filter(b => !fn(b));
}

export function setBlocks(newBlocks){
  for(const b of newBlocks){ if(!b.type) b.type = 'tile'; if(!b.state) b.state = {}; }
  world.blocks = newBlocks;
  shRebuild();
  S.animBlockCount = newBlocks.filter(_isAnimated).length;
}
