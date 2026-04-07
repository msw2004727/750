import { S, canvas } from './state.js';
import { hasBlockAt } from './blocks.js';
import { getRectCells, getLineCells, floodFill } from './geometry.js';

export function getRectLineCells(x0, y0, x1, y1){
  return S.rectMode ? getRectCells(x0, y0, x1, y1) : getLineCells(x0, y0, x1, y1);
}

export function computeFillPreview(gx, gy){
  return floodFill(gx, gy, (x, y) => hasBlockAt(x, y, S.currentHeight, null, S.currentLayer));
}

export function clearDrawTools(except){
  if(except!=='chkBrush'){ S.brushMode = false; document.getElementById('chkBrush').checked = false; }
  if(except!=='chkEraser'){ S.eraserMode = false; document.getElementById('chkEraser').checked = false; }
  if(except!=='chkFill'){ S.fillMode = false; document.getElementById('chkFill').checked = false; }
  if(except!=='chkRect'){ S.rectMode = false; document.getElementById('chkRect').checked = false; }
  if(except!=='chkLine'){ S.lineMode = false; document.getElementById('chkLine').checked = false; }
  S.rectStart = null;
  canvas.style.cursor = (except && document.getElementById(except).checked) ? 'crosshair' : 'grab';
}

export function updateBrushIndicator(){
  const el = document.getElementById('brushInfo');
  if(!el) return;
  if(S.brushTile){
    el.textContent = S.brushTile.color;
    el.style.display = 'inline';
  } else {
    el.style.display = 'none';
  }
}
