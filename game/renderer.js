import { TW, TH, CUBE_H } from './constants.js';
import { TILES, tileImages } from './tileData.js';
import { S, camera, world, ctx } from './state.js';
import { toScreen, toGrid, snap } from './coords.js';
import { getRectCells, getLineCells } from './geometry.js';
import { setRealDraw } from './gameLoop.js';
import { drawGrid, drawVGrid } from './gridOverlay.js';
import { drawMinimap } from './minimap.js';

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

// ── Draw block ──
export function drawCube(gx, gy, gz, color, hl, block){
  const p = toScreen(gx, gy, gz);
  const sh = getShakeOff(block);
  const yOff = (block && block.yOffset || 0) * (CUBE_H * camera.zoom / 5);
  const x = p.x + sh.sx, y = p.y + sh.sy - yOff;
  const tw = TW * camera.zoom, th = TH * camera.zoom, ch = CUBE_H * camera.zoom;

  const tileImg = tileImages[color];
  if(tileImg){
    ctx.imageSmoothingEnabled = false;
    const td = TILES[color] || {};
    const srcW = td.srcW || 32;
    const srcH = td.srcH || 32;
    const frames = td.frames || 1;
    const imgW = 2 * tw;
    const scale = imgW / srcW;
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    if(frames > 1){
      const frame = S.animTick % frames;
      ctx.drawImage(tileImg, frame * srcW, 0, srcW, srcH, x - tw, y + 2 * th - drawH, drawW, drawH);
    } else {
      ctx.drawImage(tileImg, x - tw, y + 2 * th - drawH, drawW, drawH);
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
}

// ── Draw ghost preview ──
function drawGhost(gx, gy, gz, color, valid){
  const p = toScreen(gx, gy, gz);
  const x = p.x, y = p.y;
  const tw = TW*camera.zoom, th = TH*camera.zoom, ch = CUBE_H*camera.zoom;
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
  ctx.clearRect(0,0,camera.W,camera.H);
  const vr = getVisibleRange();

  const visible = world.blocks.filter(b => isVisible(b, vr) && !S.hiddenHeights.has(b.gz) && !S.hiddenLayers.has(b.layer));
  const sorted = visible.sort((a,b) => {
    return (a.gx+a.gy)*100+a.gz - ((b.gx+b.gy)*100+b.gz);
  });

  for(const b of sorted){
    if(b.gz < S.currentHeight){
      ctx.globalAlpha = 0.4;
      drawCube(b.gx, b.gy, b.gz, b.color, b===S.dragBlock, b);
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
    if(b.gz >= S.currentHeight) drawCube(b.gx, b.gy, b.gz, b.color, b===S.dragBlock, b);
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
    const ep = toScreen(S.brushCursorGx, S.brushCursorGy, S.currentHeight);
    const tw2 = TW*camera.zoom, th2 = TH*camera.zoom, ch2 = CUBE_H*camera.zoom;
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
    const sp = toScreen(S.rectStart.gx, S.rectStart.gy, S.currentHeight);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    ctx.setLineDash([3,3]);
    const ep = toScreen(S.brushCursorGx, S.brushCursorGy, S.currentHeight);
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y + TH*camera.zoom);
    ctx.lineTo(ep.x, ep.y + TH*camera.zoom);
    ctx.stroke();
    ctx.setLineDash([]);
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
