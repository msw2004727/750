// ── Character sprite rendering (Engine layer) ──

import { S, world, ctx } from './state.js';
import { TILES } from './tileData.js';
import { CHARS, IMG_BASE, FACTION_COLORS } from './charData.js';

// ── Character sprite cache ──
const _charImgCache = new Map();
function _getCharImg(charName, style, action, frameIdx){
  const charDef = CHARS.find(c => c.name === charName);
  if(!charDef) return null;
  // Fallback: if this action doesn't exist for the character, use idle
  if(!charDef.actions[action]) action = 'idle';
  const cls = charDef.cls;
  const path = IMG_BASE +
    encodeURIComponent(cls) + '/' +
    charName + '/' + style + '/' + action + '/' + frameIdx + '.png';
  if(!_charImgCache.has(path)){
    const img = new Image();
    img.src = path;
    _charImgCache.set(path, img);
  }
  return _charImgCache.get(path);
}

export function drawCharacter(block, pixelPosFn, stepTW, stepTH, stepCH){
  const p = pixelPosFn(block.gx, block.gy, block.gz);
  const tw = stepTW, th = stepTH;
  // Sub-grid offset
  const st = block.state || {};
  const subX = st.subX || 0, subY = st.subY || 0;
  const x = p.x + Math.round((subX - subY) * tw);
  const y = p.y + Math.round((subX + subY) * th * 0.5);
  const facing = st.facing || 'right';
  const style = st.style || 'outline';
  const actions = st.actions || {};
  let action = st.action || 'idle';
  const frameCount = actions[action] || 1;
  const frame = S.animTick % frameCount;
  const img = _getCharImg(block.color, style, action, frame);
  if(!img || !img.complete || !img.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  // Mirror horizontally when facing left
  const shouldFlip = (facing === 'left');
  // Flip transition: squeeze to 0 then expand to target direction
  if(st._flipState === undefined) st._flipState = shouldFlip ? -1 : 1;
  const targetFlip = shouldFlip ? -1 : 1;
  if(st._flipState !== targetFlip){
    const speed = 0.25;
    // Move toward target: 1 → 0 → -1 or -1 → 0 → 1
    st._flipState += (targetFlip - st._flipState > 0 ? speed : -speed);
    // Snap when close
    if(Math.abs(st._flipState - targetFlip) < speed) st._flipState = targetFlip;
    S._dirty = true;
  }
  const flipScale = st._flipState || 1;
  // Find ground block height at character position (use blockH for logical height)
  let groundBlockH = 32;
  for(const b of world.blocks){
    if(b.type === 'character') continue;
    if(b.gx === block.gx && b.gy === block.gy && b.gz === block.gz && b.layer <= 5){
      const td = TILES[b.color];
      const bh = (td && td.blockH) || b.srcH || 32;
      if(bh > groundBlockH) groundBlockH = bh;
    }
  }
  // Scale standing offset proportionally (16=0.5x, 32=1x, 48=1.5x CUBE_H)
  const tileTopOffset = Math.round(stepCH * (groundBlockH / 32));
  const scale = (tw * 2) / img.naturalWidth;
  const dw = Math.round(img.naturalWidth * scale);
  const dh = Math.round(img.naturalHeight * scale);
  // Feet on top face of the ground tile
  const feetY = y + th - tileTopOffset;
  const dy = feetY - dh;
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(flipScale, 1);
  ctx.drawImage(img, -dw / 2, dy, dw, dh);
  ctx.restore();
  // Faction color ring (on top face)
  const factionColor = FACTION_COLORS[st.faction];
  if(factionColor){
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = factionColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, feetY, tw * 0.45, th * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Shadow ellipse (on top face)
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, feetY, tw * 0.35, th * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Selection highlight
  if(S.selectedBlocks.has(block)){
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, feetY, tw * 0.5, th * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}
