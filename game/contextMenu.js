import { S, world, draw } from './state.js';
import { TILES } from './tileData.js';
import { hasBlockAt, computeReachable } from './blocks.js';
import { addBlock, removeBlock, shRemove, shAdd } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { triggerShake } from './renderer.js';
import { addToStaging } from './staging.js';
import { mousePos, hitTest, hitTestAll } from './hitTest.js';
import { showToast } from './ui.js';
import { openForPlacement, getCharAt, CHAR_LAYER } from './characterLib.js';

let _ctxDismiss = null;
function _showCtxMenu(x, y, items){
  _hideCtxMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  for(const item of items){
    const btn = document.createElement('div');
    btn.className = 'ctx-item';
    btn.textContent = item.label;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const keepPanel = item.keepPanel;
      _removeCtxMenu();
      item.action();
      if(!keepPanel) _hidePropertyPanel();
    });
    menu.appendChild(btn);
  }
  document.body.appendChild(menu);
  S.ctxMenu = menu;
  _ctxDismiss = () => { _removeCtxMenu(); _hidePropertyPanel(); };
  setTimeout(() => document.addEventListener('click', _ctxDismiss, {once:true}), 10);
}

function _removeCtxMenu(){
  if(_ctxDismiss){ document.removeEventListener('click', _ctxDismiss); _ctxDismiss = null; }
  if(S.ctxMenu){ S.ctxMenu.remove(); S.ctxMenu = null; }
}

function _hideCtxMenu(){
  _removeCtxMenu();
  _hidePropertyPanel();
}

// ── Property panel for selected block ──
let _propPanel = null;
let _propBlock = null;

function _hidePropertyPanel(){
  if(_propPanel){ _propPanel.remove(); _propPanel = null; }
  if(_propBlock){
    S.selectedBlocks = new Set();
    _propBlock = null;
    draw();
  }
}

function _showPropertyPanel(block, cx, cy){
  _hidePropertyPanel();
  _propBlock = block;
  S.selectedBlocks = new Set([block]);
  draw();

  const panel = document.createElement('div');
  panel.className = 'ctx-menu';
  panel.style.left = cx + 'px';
  panel.style.top = cy + 'px';
  panel.style.padding = '8px';
  panel.style.minWidth = '140px';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:11px;color:#aaa;margin-bottom:6px;text-align:center;';
  title.textContent = `${block.color} (${block.gx},${block.gy})`;
  panel.appendChild(title);

  function _makeRow(label, value, onUp, onDown){
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin:3px 0;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:12px;color:#ccc;';
    lbl.textContent = label;
    const ctrl = document.createElement('span');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const btnD = document.createElement('span');
    btnD.textContent = '◀';
    btnD.style.cssText = 'cursor:pointer;font-size:12px;color:#8af;';
    btnD.addEventListener('click', (e) => { e.stopPropagation(); onDown(); });
    const val = document.createElement('span');
    val.style.cssText = 'font-size:13px;color:#fff;min-width:20px;text-align:center;font-weight:bold;';
    val.textContent = value;
    val.id = '_prop_' + label;
    const btnU = document.createElement('span');
    btnU.textContent = '▶';
    btnU.style.cssText = 'cursor:pointer;font-size:12px;color:#8af;';
    btnU.addEventListener('click', (e) => { e.stopPropagation(); onUp(); });
    ctrl.appendChild(btnD);
    ctrl.appendChild(val);
    ctrl.appendChild(btnU);
    row.appendChild(lbl);
    row.appendChild(ctrl);
    panel.appendChild(row);
  }

  function _updateBlock(){
    document.getElementById('_prop_高度').textContent = block.gz;
    document.getElementById('_prop_圖層').textContent = block.layer;
    S.currentHeight = block.gz;
    S.currentLayer = block.layer;
    document.getElementById('heightNum').textContent = S.currentHeight;
    document.getElementById('layerNum').textContent = S.currentLayer;
  }

  _makeRow('高度', block.gz,
    () => { if(block.gz < 5){ saveSnapshot(); shRemove(block); block.gz++; shAdd(block); _updateBlock(); draw(); }},
    () => { if(block.gz > -5){ saveSnapshot(); shRemove(block); block.gz--; shAdd(block); _updateBlock(); draw(); }}
  );
  _makeRow('圖層', block.layer,
    () => { if(block.layer < 5){ saveSnapshot(); shRemove(block); block.layer++; shAdd(block); _updateBlock(); draw(); }},
    () => { if(block.layer > 0){ saveSnapshot(); shRemove(block); block.layer--; shAdd(block); _updateBlock(); draw(); }}
  );

  // Close button
  const closeBtn = document.createElement('div');
  closeBtn.style.cssText = 'text-align:center;margin-top:6px;font-size:11px;color:#888;cursor:pointer;';
  closeBtn.textContent = '關閉';
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); _hidePropertyPanel(); });
  panel.appendChild(closeBtn);

  document.body.appendChild(panel);
  _propPanel = panel;

  // Click outside: auto-select clicked block or close
  setTimeout(() => {
    document.addEventListener('mousedown', function _outsideClick(e2){
      if(_propPanel && !_propPanel.contains(e2.target)){
        document.removeEventListener('mousedown', _outsideClick);
        // Check if clicked another block → auto-select it
        const r = canvas.getBoundingClientRect();
        const mx = e2.clientX - r.left, my = e2.clientY - r.top;
        if(e2.clientX >= r.left && e2.clientX <= r.right && e2.clientY >= r.top && e2.clientY <= r.bottom){
          const nextHit = hitTestAll(mx, my);
          if(nextHit){
            _showPropertyPanel(nextHit, e2.clientX, e2.clientY);
            S.currentHeight = nextHit.gz;
            S.currentLayer = nextHit.layer;
            document.getElementById('heightNum').textContent = S.currentHeight;
            document.getElementById('layerNum').textContent = S.currentLayer;
            return;
          }
        }
        _hidePropertyPanel();
      }
    });
  }, 10);
}

export function onCtx(e){
  e.preventDefault();
  const pos = mousePos(e);
  const hit = hitTest(pos.x, pos.y);
  if(!hit) return;
  if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;

  const items = [];
  items.push({label:'複製', action:() => {
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
      const nx = hit.gx+dx, ny = hit.gy+dy;
      if(!hasBlockAt(nx, ny, S.currentHeight, null, S.currentLayer)){
        saveSnapshot();
        addBlock({gx:nx, gy:ny, gz:hit.gz, layer:hit.layer, color:hit.color, srcH:hit.srcH, yOffset:hit.yOffset||0, state:{...(hit.state||{})}});
        draw();
        return;
      }
    }
  }});

  items.push({label:'放入暫存', action:() => {
    addToStaging(hit.color, hit.srcH);
  }});

  if(S.selectedBlocks.size > 1 && S.selectedBlocks.has(hit)){
    items.push({label:'組合放入暫存 (' + S.selectedBlocks.size + ')', action:() => {
      const sel = [...S.selectedBlocks];
      const minGx = Math.min(...sel.map(b=>b.gx));
      const minGy = Math.min(...sel.map(b=>b.gy));
      const combo = sel.map(b => ({dx:b.gx-minGx, dy:b.gy-minGy, color:b.color, srcH:b.srcH, yOffset:b.yOffset||0}));
      addToStaging(null, 0, combo);
      saveSnapshot();
      for(const b of sel) removeBlock(b);
      S.selectedBlocks = new Set();
      draw();
    }});
  }

  items.push({label:'更改層級', keepPanel: true, action:() => {
    _showPropertyPanel(hit, e.clientX, e.clientY);
  }});

  items.push({label:'設為預設偏移 (' + (hit.yOffset||0) + ')', action:() => {
    const td = TILES[hit.color];
    if(td) td.defaultYOff = hit.yOffset || 0;
    showToast(hit.color + ' 預設偏移 = ' + (hit.yOffset||0));
  }});

  // Character placement
  const charHere = getCharAt(hit.gx, hit.gy, hit.gz);
  if(charHere){
    items.push({label:'替換角色 (' + charHere.color + ')', action:() => {
      openForPlacement(hit.gx, hit.gy, hit.gz);
    }});
    items.push({label:'移除角色', action:() => {
      saveSnapshot(); removeBlock(charHere); draw();
      showToast('已移除 ' + charHere.color);
    }});
  } else {
    items.push({label:'放置角色', action:() => {
      openForPlacement(hit.gx, hit.gy, hit.gz);
    }});
  }

  items.push({label:'刪除', action:() => {
    if(computeReachable(hit.gx, hit.gy, hit.gz, hit).size <= 1){ triggerShake(hit); return; }
    saveSnapshot(); removeBlock(hit); draw();
  }});

  _showCtxMenu(e.clientX, e.clientY, items);
}
