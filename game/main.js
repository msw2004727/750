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

// ── Default blocks ──
const init = [
  {gx:0,gy:0,color:'t000'},{gx:1,gy:0,color:'t010'},{gx:2,gy:0,color:'t015'},
  {gx:0,gy:1,color:'t027'},{gx:1,gy:1,color:'t040'},{gx:2,gy:1,color:'t063'},
  {gx:0,gy:2,color:'t090'},{gx:1,gy:2,color:'t000'},{gx:2,gy:2,color:'t027'},
];
init.forEach(d => {
  const srcH = (TILES[d.color] && TILES[d.color].srcH) || 32;
  addBlock({gx:d.gx, gy:d.gy, gz:0, layer:0, color:d.color, srcH:srcH});
});

// ── Initial resize + start game loop ──
window.addEventListener('resize', resize);
resize();
startLoop();
