import { TW, TH, CUBE_H } from './constants.js';
import { S, camera, world, canvas } from './state.js';
import { toScreen } from './coords.js';

export function mousePos(e){
  const r = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {x: t.clientX - r.left, y: t.clientY - r.top};
}

function _pointInCube(px, py, bx, by){
  const tw = TW*camera.zoom, th = TH*camera.zoom, ch = CUBE_H*camera.zoom;
  const pts = [
    {x:bx, y:by-ch},{x:bx-tw, y:by+th-ch},{x:bx-tw, y:by+th},
    {x:bx, y:by+th*2},{x:bx+tw, y:by+th},{x:bx+tw, y:by+th-ch}
  ];
  let inside = false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

export function hitTest(mx, my){
  const filtered = world.blocks.filter(b => b.gz === S.currentHeight && b.layer === S.currentLayer);
  const sorted = filtered.sort((a,b) => {
    return (b.gx+b.gy)*100+b.gz - ((a.gx+a.gy)*100+a.gz);
  });
  for(const b of sorted){
    const p = toScreen(b.gx, b.gy, b.gz);
    if(_pointInCube(mx, my, p.x, p.y)) return b;
  }
  return null;
}
