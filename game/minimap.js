import { S, camera, world, ctx } from './state.js';

// Minimap data for click-to-jump (replaces window._mm)
export let minimapBounds = null;

export function drawMinimap(vr){
  if(!S.showMinimap){ minimapBounds = null; return; }

  const mmW = 140, mmH = 100, mmX = camera.W - mmW - 8, mmY = camera.H - mmH - 22;
  ctx.save();
  ctx.fillStyle = 'rgba(15,15,30,0.85)';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  let bx1 = vr.minGx, bx2 = vr.maxGx, by1 = vr.minGy, by2 = vr.maxGy;
  for(const b of world.blocks){
    bx1 = Math.min(bx1, b.gx); bx2 = Math.max(bx2, b.gx);
    by1 = Math.min(by1, b.gy); by2 = Math.max(by2, b.gy);
  }
  bx1 -= 2; bx2 += 2; by1 -= 2; by2 += 2;
  const rangeX = bx2 - bx1 || 1, rangeY = by2 - by1 || 1;
  const sc = Math.min((mmW - 8) / rangeX, (mmH - 8) / rangeY);
  const ox = mmX + mmW/2, oy = mmY + mmH/2;
  const midX = (bx1+bx2)/2, midY = (by1+by2)/2;

  ctx.beginPath();
  ctx.rect(mmX, mmY, mmW, mmH);
  ctx.clip();

  ctx.fillStyle = 'rgba(40,50,70,0.5)';
  for(let gx = Math.floor(bx1); gx <= Math.ceil(bx2); gx++){
    for(let gy = Math.floor(by1); gy <= Math.ceil(by2); gy++){
      if((gx+gy)%2 === 0){
        ctx.fillRect(ox + (gx-midX)*sc - sc/2, oy + (gy-midY)*sc - sc/2, sc, sc);
      }
    }
  }

  for(const b of world.blocks){
    const px = ox + (b.gx - midX) * sc;
    const py = oy + (b.gy - midY) * sc;
    const sz = Math.max(2, sc * 0.8);
    if(b.gz === S.currentHeight && b.layer === S.currentLayer){
      ctx.fillStyle = '#6af';
    } else if(b.gz === S.currentHeight){
      ctx.fillStyle = '#48a';
    } else {
      ctx.fillStyle = '#345';
    }
    ctx.fillRect(px - sz/2, py - sz/2, sz, sz);
  }

  const vx1 = ox + (vr.minGx - midX) * sc;
  const vy1 = oy + (vr.minGy - midY) * sc;
  const vx2 = ox + (vr.maxGx - midX) * sc;
  const vy2 = oy + (vr.maxGy - midY) * sc;
  ctx.strokeStyle = 'rgba(255,220,100,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(vx1, vy1, vx2-vx1, vy2-vy1);

  const o0x = ox + (0 - midX) * sc;
  const o0y = oy + (0 - midY) * sc;
  ctx.fillStyle = 'rgba(255,100,100,0.7)';
  ctx.fillRect(o0x-2, o0y-2, 4, 4);

  ctx.restore();

  minimapBounds = {mmX, mmY, mmW, mmH, midX, midY, sc, ox, oy};
}
