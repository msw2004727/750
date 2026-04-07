import { TW, TH, CUBE_H } from './constants.js';
import { camera, canvas, ctx, draw } from './state.js';

export function toScreen(gx, gy, gz){
  return {
    x: camera.W/2 + camera.x + (gx - gy) * TW * camera.zoom,
    y: camera.H/2 + camera.y + ((gx + gy) * TH - gz * CUBE_H) * camera.zoom
  };
}

export function toGrid(sx, sy){
  const dx = (sx - camera.W/2 - camera.x) / camera.zoom;
  const dy = (sy - camera.H/2 - camera.y) / camera.zoom;
  return {
    gx: (dx / TW + dy / TH) / 2,
    gy: (dy / TH - dx / TW) / 2
  };
}

export function snap(v){ return Math.round(v); }

export function resize(){
  const r = canvas.parentElement.getBoundingClientRect();
  camera.W = r.width;
  const toolbar = document.getElementById('toolbar');
  const tbH = toolbar ? toolbar.getBoundingClientRect().height : 0;
  camera.H = Math.max(300, window.innerHeight - tbH - 60);
  canvas.width = camera.W * devicePixelRatio;
  canvas.height = camera.H * devicePixelRatio;
  canvas.style.height = camera.H + 'px';
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  draw();
}
