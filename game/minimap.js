import { TW, TH } from './constants.js';
import { S, camera, world, ctx } from './state.js';
import { toGrid } from './coords.js';

export let minimapBounds = null;

// Isometric projection for minimap (matches main view perspective)
const ASPECT = TH / TW;
function _toIso(gx, gy){ return { x: gx - gy, y: (gx + gy) * ASPECT }; }
function _fromIso(ix, iy){ const gy2 = iy / ASPECT; return { gx: (ix + gy2) / 2, gy: (gy2 - ix) / 2 }; }

export function drawMinimap(vr){
  if(!S.showMinimap){ minimapBounds = null; return; }

  const mmW = 160, mmH = 110, mmX = camera.W - mmW - 8, mmY = camera.H - mmH - 22;
  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(15,15,30,0.85)';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  // Clip
  ctx.beginPath();
  ctx.rect(mmX, mmY, mmW, mmH);
  ctx.clip();

  // Compute isometric bounds from all blocks + viewport
  let ix1 = Infinity, ix2 = -Infinity, iy1 = Infinity, iy2 = -Infinity;
  for(const b of world.blocks){
    const p = _toIso(b.gx, b.gy);
    ix1 = Math.min(ix1, p.x); ix2 = Math.max(ix2, p.x);
    iy1 = Math.min(iy1, p.y); iy2 = Math.max(iy2, p.y);
  }
  // Include viewport corners
  const corners = [
    toGrid(0, 0), toGrid(camera.W, 0),
    toGrid(0, camera.H), toGrid(camera.W, camera.H)
  ];
  for(const c of corners){
    const p = _toIso(c.gx, c.gy);
    ix1 = Math.min(ix1, p.x); ix2 = Math.max(ix2, p.x);
    iy1 = Math.min(iy1, p.y); iy2 = Math.max(iy2, p.y);
  }
  ix1 -= 2; ix2 += 2; iy1 -= 2; iy2 += 2;

  const rangeX = ix2 - ix1 || 1, rangeY = iy2 - iy1 || 1;
  const sc = Math.min((mmW - 8) / rangeX, (mmH - 8) / rangeY);
  const ox = mmX + mmW / 2, oy = mmY + mmH / 2;
  const midIx = (ix1 + ix2) / 2, midIy = (iy1 + iy2) / 2;

  // Helper: iso → minimap screen
  function _toMM(gx, gy){
    const p = _toIso(gx, gy);
    return { x: ox + (p.x - midIx) * sc, y: oy + (p.y - midIy) * sc };
  }

  // Checkerboard (isometric diamonds)
  const halfW = sc * 0.5, halfH = sc * ASPECT * 0.5;
  ctx.fillStyle = 'rgba(40,50,70,0.4)';
  ctx.beginPath();
  for(let gx = Math.floor(vr.minGx) - 1; gx <= Math.ceil(vr.maxGx) + 1; gx++){
    for(let gy = Math.floor(vr.minGy) - 1; gy <= Math.ceil(vr.maxGy) + 1; gy++){
      if((gx + gy) % 2 !== 0) continue;
      const m = _toMM(gx, gy);
      ctx.moveTo(m.x, m.y - halfH);
      ctx.lineTo(m.x - halfW, m.y);
      ctx.lineTo(m.x, m.y + halfH);
      ctx.lineTo(m.x + halfW, m.y);
    }
  }
  ctx.fill();

  // Blocks as diamonds
  const bw = Math.max(2, sc * 0.45), bh = Math.max(1.5, sc * ASPECT * 0.45);
  for(const b of world.blocks){
    const m = _toMM(b.gx, b.gy);
    if(b.gz === S.currentHeight && b.layer === S.currentLayer){
      ctx.fillStyle = '#6af';
    } else if(b.gz === S.currentHeight){
      ctx.fillStyle = '#48a';
    } else {
      ctx.fillStyle = '#345';
    }
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - bh);
    ctx.lineTo(m.x - bw, m.y);
    ctx.lineTo(m.x, m.y + bh);
    ctx.lineTo(m.x + bw, m.y);
    ctx.fill();
  }

  // Viewport diamond (screen corners → grid → minimap)
  const vc = [
    _toMM(corners[0].gx, corners[0].gy),
    _toMM(corners[1].gx, corners[1].gy),
    _toMM(corners[3].gx, corners[3].gy),
    _toMM(corners[2].gx, corners[2].gy),
  ];
  ctx.strokeStyle = 'rgba(255,220,100,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(vc[0].x, vc[0].y);
  for(let i = 1; i < 4; i++) ctx.lineTo(vc[i].x, vc[i].y);
  ctx.closePath();
  ctx.stroke();

  // Origin marker
  const o0 = _toMM(0, 0);
  ctx.fillStyle = 'rgba(255,100,100,0.7)';
  ctx.beginPath();
  ctx.arc(o0.x, o0.y, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  minimapBounds = { mmX, mmY, mmW, mmH, midIx, midIy, sc, ox, oy };
}

// Convert minimap screen position to grid coordinates
export function minimapToGrid(px, py){
  if(!minimapBounds) return null;
  const mm = minimapBounds;
  const ix = (px - mm.ox) / mm.sc + mm.midIx;
  const iy = (py - mm.oy) / mm.sc + mm.midIy;
  return _fromIso(ix, iy);
}
