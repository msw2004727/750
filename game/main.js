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
import { loadFromData } from './saveLoad.js';

const saved = localStorage.getItem('blockBuilder_save');
if(saved){
  try { loadFromData(JSON.parse(saved)); } catch(e){}
}
if(world.blocks.length === 0){
  // ── Auto-tiled village path layout ──
  // Path tile lookup: binary key [NW,NE,SE,SW] → tile
  const PATH = {
    '0000':'s008','0001':'s013','0010':'s010','0011':'s003',
    '0100':'s012','0101':'s014','0110':'s002','0111':'s005',
    '1000':'s009','1001':'s015','1010':'s000','1011':'s004',
    '1100':'s001','1101':'s007','1110':'s006','1111':'s011'
  };
  // Village road positions
  const roads = new Set();
  // Main NW-SE road (gy=0)
  for(let gx=-4;gx<=4;gx++) roads.add(gx+',0');
  // Cross NE-SW road (gx=0)
  for(let gy=-4;gy<=4;gy++) roads.add('0,'+gy);
  // Branch to NE house area
  roads.add('2,-1'); roads.add('2,-2');
  // Branch to SW house area
  roads.add('-2,1'); roads.add('-2,2');
  // Branch to SE house area
  roads.add('1,2'); roads.add('2,2');
  // Branch to NW house area
  roads.add('-1,-2'); roads.add('-2,-2');

  for(const k of roads){
    const [gx,gy] = k.split(',').map(Number);
    const nw = roads.has((gx-1)+','+gy) ? '1':'0';
    const ne = roads.has(gx+','+(gy-1)) ? '1':'0';
    const se = roads.has((gx+1)+','+gy) ? '1':'0';
    const sw = roads.has(gx+','+(gy+1)) ? '1':'0';
    const tile = PATH[nw+ne+se+sw];
    addBlock({gx, gy, gz:0, layer:0, color:tile, srcH:100});
  }
}

// ── Initial resize + start game loop ──
window.addEventListener('resize', resize);
resize();
startLoop();
