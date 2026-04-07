import { TH } from './constants.js';
import { S, camera, ctx } from './state.js';
import { toScreen } from './coords.js';

export function drawGrid(vr){
  if(!S.showGrid) return;
  const R = Math.min(50, Math.max(Math.abs(vr.minGx), Math.abs(vr.maxGx), Math.abs(vr.minGy), Math.abs(vr.maxGy)) + 2);
  const gz = S.currentHeight;
  const th2 = TH * 2 * camera.zoom;

  for(let h = -5; h <= 5; h++){
    const isCurrent = (h === gz);
    ctx.globalAlpha = isCurrent ? 0.25 : 0.05;
    ctx.strokeStyle = isCurrent ? '#6a8aaa' : '#4a5568';
    ctx.lineWidth = isCurrent ? 0.5 : 0.3;
    for(let i = -R; i <= R; i++){
      let a = toScreen(i, -R, h);
      let b = toScreen(i, R, h);
      ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
      a = toScreen(-R, i, h);
      b = toScreen(R, i, h);
      ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
    }
  }

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

  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#8ab8dd';
  ctx.lineWidth = 1.5;
  let a = toScreen(0, -R, gz), b = toScreen(0, R, gz);
  ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
  a = toScreen(-R, 0, gz); b = toScreen(R, 0, gz);
  ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();

  const origin = toScreen(0, 0, gz);
  ctx.globalAlpha = 0.7;
  ctx.font = `${Math.max(10, 12*camera.zoom)}px monospace`;
  ctx.fillStyle = '#8ab8dd';
  ctx.textAlign = 'center';
  ctx.fillText('H:'+gz, origin.x, origin.y + th2 + 14*camera.zoom);
  ctx.globalAlpha = 1;
}

export function drawVGrid(vr){
  if(!S.showVGrid) return;
  const R = Math.min(50, Math.max(Math.abs(vr.minGx), Math.abs(vr.maxGx), Math.abs(vr.minGy), Math.abs(vr.maxGy)) + 2);
  const gz = S.currentHeight;
  const th2 = TH * 2 * camera.zoom;

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
