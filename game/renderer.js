import { TW, TH, CUBE_H } from './constants.js';
import { TILES, tileImages } from './tileData.js';
import { S, camera, world, ctx } from './state.js';
import { toScreen, toGrid, snap } from './coords.js';
import { getRectCells, getLineCells } from './geometry.js';
import { setRealDraw } from './gameLoop.js';
import { drawGrid, drawVGrid } from './gridOverlay.js';
import { drawMinimap } from './minimap.js';
import { CHARS, IMG_BASE, FACTION_COLORS } from './characterLib.js';
import { drawProjectiles, drawFloats } from './floatingFX.js';

// ── Shake animation (gameLoop handles the timing) ──
export function triggerShake(block){
  S.shakeBlock = block;
  S.shakeStart = performance.now();
}

function getShakeOff(block){
  if(block !== S.shakeBlock) return {sx:0,sy:0};
  const t = performance.now() - S.shakeStart;
  if(t > 400) return {sx:0,sy:0};
  const d = 1 - t / 400;
  return {sx: Math.sin(t*0.05)*3*d, sy: Math.cos(t*0.07)*1.5*d};
}

// ── Visibility culling ──
export function getVisibleRange(){
  const margin = 3;
  const corners = [
    toGrid(0, 0), toGrid(camera.W, 0), toGrid(0, camera.H), toGrid(camera.W, camera.H)
  ];
  const allGx = corners.map(c => c.gx);
  const allGy = corners.map(c => c.gy);
  return {
    minGx: Math.floor(Math.min(...allGx)) - margin,
    maxGx: Math.ceil(Math.max(...allGx)) + margin,
    minGy: Math.floor(Math.min(...allGy)) - margin,
    maxGy: Math.ceil(Math.max(...allGy)) + margin,
  };
}

function isVisible(b, vr){
  return b.gx >= vr.minGx && b.gx <= vr.maxGx && b.gy >= vr.minGy && b.gy <= vr.maxGy;
}

// ── Pixel-perfect step sizes (rounded once, shared by all tiles) ──
let _stepTW = 0, _stepTH = 0, _stepCH = 0, _baseX = 0, _baseY = 0;
export function updateRenderSteps(){
  _stepTW = Math.round(TW * camera.zoom);
  _stepTH = Math.round(TH * camera.zoom);
  _stepCH = Math.round(CUBE_H * camera.zoom);
  _baseX = Math.round(camera.W / 2 + camera.x);
  _baseY = Math.round(camera.H / 2 + camera.y);
}

// Pixel-perfect screen position (integer coords, no sub-pixel gaps)
function _pixelPos(gx, gy, gz){
  return {
    x: _baseX + (gx - gy) * _stepTW,
    y: _baseY + (gx + gy) * _stepTH - gz * _stepCH
  };
}

// ── Draw block ──
export function drawCube(gx, gy, gz, color, hl, block){
  const p = _pixelPos(gx, gy, gz);
  const sh = getShakeOff(block);
  const yOff = Math.round((block && block.yOffset || 0) * (_stepCH / 5));
  const iGx = (block && block.isoGx || 0) / 5;
  const iGy = (block && block.isoGy || 0) / 5;
  const x = p.x + Math.round(sh.sx) + Math.round((iGx - iGy) * _stepTW);
  const y = p.y + Math.round(sh.sy) - yOff + Math.round((iGx + iGy) * _stepTH);
  const tw = _stepTW, th = _stepTH, ch = _stepCH;

  const tileImg = tileImages[color];
  if(tileImg){
    ctx.imageSmoothingEnabled = false;
    const td = TILES[color] || {};
    const srcW = td.srcW || 32;
    const srcH = td.srcH || 32;
    const cropY = td.cropY || 0;
    const frames = td.frames || 1;
    const contentH = srcH - cropY;
    const dw = 2 * tw;
    const dh = Math.round(contentH * dw / srcW);
    const dx = x - tw;
    const dy = y + 2 * th - dh;
    if(frames > 1){
      const frame = S.animTick % frames;
      ctx.drawImage(tileImg, frame * srcW, cropY, srcW, contentH, dx, dy, dw, dh);
    } else {
      ctx.drawImage(tileImg, 0, cropY, srcW, contentH, dx, dy, dw, dh);
    }
  }

  if(hl){
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(x, y - ch);
    ctx.lineTo(x - tw, y + th - ch);
    ctx.lineTo(x, y + th*2 - ch);
    ctx.lineTo(x + tw, y + th - ch);
    ctx.closePath();
    ctx.stroke();
  }

  if(S.selectedBlocks.has(block)){
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(x, y - ch);
    ctx.lineTo(x - tw, y + th - ch);
    ctx.lineTo(x - tw, y + th);
    ctx.lineTo(x, y + th*2);
    ctx.lineTo(x + tw, y + th);
    ctx.lineTo(x + tw, y + th - ch);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.12)';
    ctx.fill();
  }

  if(S.showHover && block === S.hoverBlock){
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - ch);
    ctx.lineTo(x - tw, y + th - ch);
    ctx.lineTo(x - tw, y + th);
    ctx.lineTo(x, y + th*2);
    ctx.lineTo(x + tw, y + th);
    ctx.lineTo(x + tw, y + th - ch);
    ctx.closePath();
    ctx.fill();
  }

  if(S.showCoords){
    const label = `${gx},${gy}`;
    const cy2 = y + th - ch * 0.3;
    ctx.font = `${Math.max(9, 11 * camera.zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(label, x + 1, cy2 + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x, cy2);
  }

  if(S.showBlockInfo && block){
    const td2 = TILES[color] || {};
    const elem = td2.elem || '無';
    const elemColors = {'金':'#FFD700','木':'#66BB6A','水':'#42A5F5','火':'#EF5350','土':'#FFA726','無':'#888'};
    const val = block.state && Object.keys(block.state).length > 0
      ? JSON.stringify(block.state).slice(1,-1) : '-';
    const infoText = `${elem}(${val})`;
    const fontSize2 = Math.max(8, 10 * camera.zoom);
    ctx.font = `bold ${fontSize2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ix = x, iy = y + th * 1.2;
    const tw3 = ctx.measureText(infoText).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(ix - tw3/2 - 3, iy - fontSize2/2 - 2, tw3 + 6, fontSize2 + 4, 3);
    ctx.fill();
    ctx.fillStyle = elemColors[elem] || '#888';
    ctx.fillText(infoText, ix, iy);
  }

  if(S.showLayerInfo && block){
    const fontSize = Math.max(8, 10 * camera.zoom);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lx = x, ly = y - ch + th * 0.5;
    // Background pill
    const text = `H${gz} L${block.layer}`;
    const tw2 = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(lx - tw2/2 - 3, ly - fontSize/2 - 2, tw2 + 6, fontSize + 4, 3);
    ctx.fill();
    // Color by layer
    const colors = ['#6af','#f8a','#af6','#fa6','#a6f','#6fa'];
    ctx.fillStyle = colors[block.layer % colors.length];
    ctx.fillText(text, lx, ly);
  }
}

// ── Character sprite cache + draw ──
const _charImgCache = new Map();
function _getCharImg(charName, style, action, frameIdx){
  const charDef = CHARS.find(c => c.name === charName);
  if(!charDef) return null;
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

function _drawCharacter(block){
  const p = _pixelPos(block.gx, block.gy, block.gz);
  const tw = _stepTW, th = _stepTH;
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
  const scale = (tw * 2) / img.naturalWidth;
  const dw = Math.round(img.naturalWidth * scale);
  const dh = Math.round(img.naturalHeight * scale);
  const dy = y + th - dh;
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(flipScale, 1);
  ctx.drawImage(img, -dw / 2, dy, dw, dh);
  ctx.restore();
  // Faction color ring
  const factionColor = FACTION_COLORS[st.faction];
  if(factionColor){
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = factionColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + th * 1.5, tw * 0.45, th * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Shadow ellipse
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + th * 1.5, tw * 0.35, th * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Selection highlight
  if(S.selectedBlocks.has(block)){
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y + th * 1.5, tw * 0.5, th * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Draw ghost preview ──
function drawGhost(gx, gy, gz, color, valid){
  const p = _pixelPos(gx, gy, gz);
  const x = p.x, y = p.y;
  const tw = _stepTW, th = _stepTH, ch = _stepCH;
  const t = TILES[color] || {stroke:'#555', ghost:'#888'};
  ctx.globalAlpha = valid ? 0.25 : 0.12;
  ctx.setLineDash(valid ? [4,4] : [2,6]);
  ctx.strokeStyle = valid ? t.stroke : '#E24B4A';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - ch);
  ctx.lineTo(x - tw, y + th - ch);
  ctx.lineTo(x - tw, y + th);
  ctx.lineTo(x, y + th*2);
  ctx.lineTo(x + tw, y + th);
  ctx.lineTo(x + tw, y + th - ch);
  ctx.closePath();
  ctx.stroke();
  if(valid){ ctx.fillStyle = t.ghost; ctx.globalAlpha = 0.08; ctx.fill(); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}

// ── Main draw ──
function _drawActual(){
  updateRenderSteps();
  ctx.clearRect(0,0,camera.W,camera.H);
  const vr = getVisibleRange();

  // Fog of war: circular (Euclidean) distance filter
  const fogOn = world.fogRadius > 0;
  const fogR = world.fogRadius / 2;
  const fogCx = world.fogCenter.gx, fogCy = world.fogCenter.gy;
  const fogR2 = fogR * fogR;

  const visible = world.blocks.filter(b => isVisible(b, vr) && !S.hiddenHeights.has(b.gz) && !S.hiddenLayers.has(b.layer)
    && (!fogOn || ((b.gx - fogCx) * (b.gx - fogCx) + (b.gy - fogCy) * (b.gy - fogCy)) <= fogR2));
  const sorted = visible.sort((a,b) => {
    return (a.gx+a.gy)*1000+a.gz*10+a.layer - ((b.gx+b.gy)*1000+b.gz*10+b.layer);
  });

  for(const b of sorted){
    if(b.gz < S.currentHeight){
      ctx.globalAlpha = 0.4;
      if(b.type === 'character') _drawCharacter(b);
      else drawCube(b.gx, b.gy, b.gz, b.color, b===S.dragBlock, b);
      ctx.globalAlpha = 1;
    }
  }

  drawGrid(vr);

  if(S.dragBlock){
    const tgx = snap(S.dragBlock._dragGx);
    const tgy = snap(S.dragBlock._dragGy);
    const k = tgx + ',' + tgy;
    const valid = S.reachableSet && S.reachableSet.has(k);
    drawGhost(tgx, tgy, S.dragBlock.gz, S.dragBlock.color, valid);
  }

  for(const b of sorted){
    if(b.gz >= S.currentHeight){
      if(b.type === 'character') _drawCharacter(b);
      else drawCube(b.gx, b.gy, b.gz, b.color, b===S.dragBlock, b);
    }
  }

  drawVGrid(vr);

  if(S.boxSelect){
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(255,215,0,0.08)';
    const bx = Math.min(S.boxSelect.sx, S.boxSelect.ex);
    const by = Math.min(S.boxSelect.sy, S.boxSelect.ey);
    const bw = Math.abs(S.boxSelect.ex - S.boxSelect.sx);
    const bh = Math.abs(S.boxSelect.ey - S.boxSelect.sy);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillRect(bx, by, bw, bh);
    ctx.setLineDash([]);
  }

  if(S.brushMode && S.brushTile && S.brushCursorGx !== -999){
    ctx.globalAlpha = 0.5;
    drawCube(S.brushCursorGx, S.brushCursorGy, S.currentHeight, S.brushTile.color, false, null);
    ctx.globalAlpha = 1;
  }
  if(S.eraserMode && S.brushCursorGx !== -999){
    const ep = _pixelPos(S.brushCursorGx, S.brushCursorGy, S.currentHeight);
    const tw2 = _stepTW, th2 = _stepTH, ch2 = _stepCH;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(ep.x, ep.y-ch2);
    ctx.lineTo(ep.x-tw2, ep.y+th2-ch2);
    ctx.lineTo(ep.x, ep.y+th2*2-ch2);
    ctx.lineTo(ep.x+tw2, ep.y+th2-ch2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if(S.fillMode && S.fillPreview.length > 0 && S.brushTile){
    ctx.globalAlpha = 0.3;
    for(const [fx,fy] of S.fillPreview){
      drawCube(fx, fy, S.currentHeight, S.brushTile.color, false, null);
    }
    ctx.globalAlpha = 1;
  }

  if(S.brushPainting && S.rectStart && (S.rectMode||S.lineMode) && S.brushTile){
    const cells = S.rectMode
      ? getRectCells(S.rectStart.gx, S.rectStart.gy, S.brushCursorGx, S.brushCursorGy)
      : getLineCells(S.rectStart.gx, S.rectStart.gy, S.brushCursorGx, S.brushCursorGy);
    ctx.globalAlpha = 0.4;
    for(const [cx,cy] of cells){
      drawCube(cx, cy, S.currentHeight, S.brushTile.color, false, null);
    }
    ctx.globalAlpha = 1;
    const sp = _pixelPos(S.rectStart.gx, S.rectStart.gy, S.currentHeight);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    ctx.setLineDash([3,3]);
    const ep = _pixelPos(S.brushCursorGx, S.brushCursorGy, S.currentHeight);
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y + _stepTH);
    ctx.lineTo(ep.x, ep.y + _stepTH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Projectiles + floating numbers (before fog so they're visible in clear area)
  drawProjectiles();
  drawFloats();

  // Fog of war overlay — circular with gradient edge
  if(fogOn){
    const center = _pixelPos(fogCx, fogCy, S.currentHeight);
    const cx = center.x, cy = center.y + _stepTH;
    // Screen-space radius: use average of TW and TH scaled by zoom and fogR
    const screenR = fogR * (_stepTW + _stepTH);
    const innerR = screenR * 0.75;  // fully clear zone
    // Radial gradient: transparent center → black edge
    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, screenR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    // Draw gradient ring (fog edge)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, camera.W, camera.H);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - screenR, cy - screenR, screenR * 2, screenR * 2);
    ctx.restore();
    // Solid black outside the outer radius
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, camera.W, camera.H);
    ctx.arc(cx, cy, screenR, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, camera.W, camera.H);
    ctx.restore();
  }

  ctx.globalAlpha = 0.5;
  ctx.font = '10px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'right';
  ctx.fillText(`${visible.length}/${world.blocks.length} blocks`, camera.W - 8, camera.H - 8);
  ctx.globalAlpha = 1;

  drawMinimap(vr);
}

// Register with gameLoop
setRealDraw(_drawActual);
