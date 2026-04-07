import { TW, TH, CUBE_H } from './constants.js';
import { S, camera, ctx } from './state.js';
import { toScreen } from './coords.js';

export function drawGrid(vr){
  if(!S.showGrid) return;
  const R = Math.min(50, Math.max(Math.abs(vr.minGx), Math.abs(vr.maxGx), Math.abs(vr.minGy), Math.abs(vr.maxGy)) + 2);
  const gz = S.currentHeight;
  const th2 = TH * 2 * camera.zoom;

  // Non-current height layers: simple flat grid lines
  for(let h = -5; h <= 5; h++){
    if(h === gz) continue;
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 0.3;
    for(let i = -R; i <= R; i++){
      let a = toScreen(i, -R, h);
      let b = toScreen(i, R, h);
      ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
      a = toScreen(-R, i, h);
      b = toScreen(R, i, h);
      ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
    }
  }

  // Current height: 3D cube grid (only when both showGrid + showVGrid)
  if(S.showVGrid){
    _drawCubeGrid(vr, R, gz);
  } else {
    _drawFlatGrid(R, gz, th2);
  }

  // Origin cross
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#8ab8dd';
  ctx.lineWidth = 1.5;
  let a = toScreen(0, -R, gz), b = toScreen(0, R, gz);
  ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
  a = toScreen(-R, 0, gz); b = toScreen(R, 0, gz);
  ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();

  // Height label
  const origin = toScreen(0, 0, gz);
  ctx.globalAlpha = 0.7;
  ctx.font = `${Math.max(10, 12*camera.zoom)}px monospace`;
  ctx.fillStyle = '#8ab8dd';
  ctx.textAlign = 'center';
  ctx.fillText('H:'+gz, origin.x, origin.y + th2 + 14*camera.zoom);
  ctx.globalAlpha = 1;
}

// Flat grid for current height (when VGrid is off)
function _drawFlatGrid(R, gz, th2){
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#6a8aaa';
  ctx.lineWidth = 0.5;
  for(let i = -R; i <= R; i++){
    let a = toScreen(i, -R, gz);
    let b = toScreen(i, R, gz);
    ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
    a = toScreen(-R, i, gz);
    b = toScreen(R, i, gz);
    ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
  }

  // Floor fill
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#aaccee';
  const cA = toScreen(-R, -R, gz);
  const cB = toScreen(R, -R, gz);
  const cC = toScreen(R, R, gz);
  const cD = toScreen(-R, R, gz);
  ctx.beginPath();
  ctx.moveTo(cA.x, cA.y+th2);
  ctx.lineTo(cB.x, cB.y+th2);
  ctx.lineTo(cC.x, cC.y+th2);
  ctx.lineTo(cD.x, cD.y+th2);
  ctx.closePath();
  ctx.fill();
}

// 3D cube wireframe grid (when both Grid + VGrid are on)
function _drawCubeGrid(vr, R, gz){
  const tw = TW * camera.zoom;
  const th = TH * camera.zoom;
  const ch = CUBE_H * camera.zoom;

  // Clamp to visible range
  const x0 = Math.max(-R, vr.minGx);
  const x1 = Math.min(R, vr.maxGx);
  const y0 = Math.max(-R, vr.minGy);
  const y1 = Math.min(R, vr.maxGy);

  for(let gx = x0; gx <= x1; gx++){
    for(let gy = y0; gy <= y1; gy++){
      const p = toScreen(gx, gy, gz);
      const x = p.x, y = p.y;

      // Top face (brightest)
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#8ab8dd';
      ctx.beginPath();
      ctx.moveTo(x, y - ch);
      ctx.lineTo(x - tw, y + th - ch);
      ctx.lineTo(x, y + th*2 - ch);
      ctx.lineTo(x + tw, y + th - ch);
      ctx.closePath();
      ctx.fill();

      // Left face (darkest)
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = '#4a6a8a';
      ctx.beginPath();
      ctx.moveTo(x - tw, y + th - ch);
      ctx.lineTo(x - tw, y + th);
      ctx.lineTo(x, y + th*2);
      ctx.lineTo(x, y + th*2 - ch);
      ctx.closePath();
      ctx.fill();

      // Right face (medium)
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#6a8aaa';
      ctx.beginPath();
      ctx.moveTo(x + tw, y + th - ch);
      ctx.lineTo(x + tw, y + th);
      ctx.lineTo(x, y + th*2);
      ctx.lineTo(x, y + th*2 - ch);
      ctx.closePath();
      ctx.fill();

      // Wireframe edges
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#6a8aaa';
      ctx.lineWidth = 0.4;

      // Top diamond
      ctx.beginPath();
      ctx.moveTo(x, y - ch);
      ctx.lineTo(x - tw, y + th - ch);
      ctx.lineTo(x, y + th*2 - ch);
      ctx.lineTo(x + tw, y + th - ch);
      ctx.closePath();
      ctx.stroke();

      // Three vertical edges
      ctx.beginPath();
      ctx.moveTo(x - tw, y + th - ch); ctx.lineTo(x - tw, y + th);
      ctx.moveTo(x + tw, y + th - ch); ctx.lineTo(x + tw, y + th);
      ctx.moveTo(x, y + th*2 - ch);    ctx.lineTo(x, y + th*2);
      ctx.stroke();

      // Bottom two edges
      ctx.beginPath();
      ctx.moveTo(x - tw, y + th);
      ctx.lineTo(x, y + th*2);
      ctx.lineTo(x + tw, y + th);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawVGrid(vr){
  if(!S.showVGrid) return;
  // When both Grid+VGrid are on, cube grid already handles current height visuals
  // Only draw the non-current vertical lines and height labels here
  const R = Math.min(50, Math.max(Math.abs(vr.minGx), Math.abs(vr.maxGx), Math.abs(vr.minGy), Math.abs(vr.maxGy)) + 2);
  const gz = S.currentHeight;
  const th2 = TH * 2 * camera.zoom;

  // Full-height vertical lines (faint)
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#6a8aaa';
  ctx.lineWidth = 0.3;
  for(let i = -R; i <= R; i++){
    for(let j = -R; j <= R; j++){
      const top = toScreen(i, j, 5);
      const bot = toScreen(i, j, -5);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y + th2);
      ctx.lineTo(bot.x, bot.y + th2);
      ctx.stroke();
    }
  }

  // Current height segment (brighter) — skip if cube grid already draws it
  if(!S.showGrid){
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#8ab8dd';
    ctx.lineWidth = 0.5;
    for(let i = -R; i <= R; i++){
      for(let j = -R; j <= R; j++){
        const top = toScreen(i, j, gz + 1);
        const bot = toScreen(i, j, gz);
        ctx.beginPath();
        ctx.moveTo(top.x, top.y + th2);
        ctx.lineTo(bot.x, bot.y + th2);
        ctx.stroke();
      }
    }
  }

  // Height scale labels
  ctx.globalAlpha = 0.5;
  ctx.font = `${Math.max(8, 9*camera.zoom)}px monospace`;
  ctx.textAlign = 'left';
  for(let h = -5; h <= 5; h++){
    const p = toScreen(0, 0, h);
    ctx.fillStyle = h === gz ? '#FFD700' : '#8ab8dd';
    ctx.fillText(h === gz ? '>'+h : ''+h, p.x + 5, p.y + th2 + 3);
  }
  ctx.globalAlpha = 1;
}
