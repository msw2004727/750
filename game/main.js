// ── Entry point: imports establish module evaluation order ──
import { TILES } from './tileData.js';
import { S, camera, world, draw } from './state.js';
import { addBlock, setBlocks } from './spatialHash.js';
import { resize } from './coords.js';
import { startLoop } from './gameLoop.js';

// These imports trigger their side effects (event listeners, init calls)
import './renderer.js';
import './history.js';
import './staging.js';
import './input.js';
import './touch.js';
import './palette.js';
import './saveLoad.js';
import './combos.js';
import './ui.js';

// ── Load saved state or default blocks ──
import { updateHeightUI, updateLayerUI } from './saveLoad.js';

const saved = localStorage.getItem('blockBuilder_save');
if(saved){
  try {
    const data = JSON.parse(saved);
    if(data.blocks) setBlocks(data.blocks);
    if(data.camX !== undefined) camera.x = data.camX;
    if(data.camY !== undefined) camera.y = data.camY;
    if(data.zoom !== undefined) camera.zoom = data.zoom;
    if(data.currentHeight !== undefined){ S.currentHeight = data.currentHeight; updateHeightUI(); }
    if(data.currentLayer !== undefined){ S.currentLayer = data.currentLayer; updateLayerUI(); }
  } catch(e){}
}
if(world.blocks.length === 0){
  const init = [
    {gx:-2,gy:-3,color:'j019'},{gx:-2,gy:-2,color:'j016'},{gx:-2,gy:-1,color:'j018'},{gx:-2,gy:0,color:'j017'},{gx:-2,gy:1,color:'j018'},
    {gx:-1,gy:-3,color:'j019'},{gx:-1,gy:-2,color:'j018'},{gx:-1,gy:-1,color:'j016'},{gx:-1,gy:0,color:'j018'},{gx:-1,gy:1,color:'j017'},
    {gx: 0,gy:-3,color:'j016'},{gx: 0,gy:-2,color:'j018'},{gx: 0,gy:-1,color:'j017'},{gx: 0,gy:0,color:'j016'},{gx: 0,gy:1,color:'j017'},
    {gx: 1,gy:-3,color:'j019'},{gx: 1,gy:-2,color:'j016'},{gx: 1,gy:-1,color:'j018'},{gx: 1,gy:0,color:'j017'},{gx: 1,gy:1,color:'j018'},
    {gx: 2,gy:-3,color:'j019'},{gx: 2,gy:-2,color:'j018'},{gx: 2,gy:-1,color:'j016'},{gx: 2,gy:0,color:'j018'},{gx: 2,gy:1,color:'j017'},
  ];
  init.forEach(d => {
    addBlock({gx:d.gx, gy:d.gy, gz:0, layer:0, color:d.color, srcH:32});
  });
}

// ── Initial resize + start game loop ──
window.addEventListener('resize', resize);
resize();
startLoop();
