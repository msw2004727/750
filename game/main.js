// ── Entry point: imports establish module evaluation order ──
import { TILES } from './tileData.js';
import { S, draw } from './state.js';
import { addBlock } from './spatialHash.js';
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

// ── Default blocks (5x5 grass field) ──
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

// ── Initial resize + start game loop ──
window.addEventListener('resize', resize);
resize();
startLoop();
