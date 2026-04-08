import { S, draw } from './state.js';
import { hasBlockAt, findEmptySpot } from './blocks.js';
import { addBlock } from './spatialHash.js';
import { saveSnapshot } from './history.js';
import { showToast } from './ui.js';

function saveCombos(){
  localStorage.setItem('blockBuilder_combos', JSON.stringify(S.combos));
}

function renderComboSelect(){
  const sel = document.getElementById('comboSelect');
  sel.innerHTML = '<option value="">-- 選擇範本 --</option>';
  S.combos.forEach((combo, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = combo.name + ' (' + combo.tiles.length + ')';
    sel.appendChild(opt);
  });
  if(S.activeCombo >= 0 && S.activeCombo < S.combos.length) sel.value = S.activeCombo;
}

document.getElementById('comboSelect').addEventListener('change', (e) => {
  S.activeCombo = e.target.value === '' ? -1 : parseInt(e.target.value);
});

document.getElementById('comboSave').addEventListener('click', () => {
  const sel = [...S.selectedBlocks];
  if(sel.length < 2){ showToast('請先 Shift+點擊 選取 2 個以上相鄰方塊，或是開啟選取開關', 3000); return; }
  const name = prompt('範本名稱：', '範本' + (S.combos.length + 1));
  if(!name) return;
  const minGx = Math.min(...sel.map(b => b.gx));
  const minGy = Math.min(...sel.map(b => b.gy));
  const tiles = sel.map(b => ({dx:b.gx - minGx, dy:b.gy - minGy, color:b.color, srcH:b.srcH, yOffset:b.yOffset||0}));
  S.combos.push({name, tiles});
  saveCombos();
  S.selectedBlocks = new Set();
  renderComboSelect();
  draw();
});

document.getElementById('comboPlace').addEventListener('click', () => {
  if(S.activeCombo < 0 || S.activeCombo >= S.combos.length){ showToast('請先選擇一個範本'); return; }
  const combo = S.combos[S.activeCombo];
  saveSnapshot();
  const spot = findEmptySpot();
  for(const t of combo.tiles){
    const gx = spot.gx + t.dx;
    const gy = spot.gy + t.dy;
    if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
      addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:t.color, srcH:t.srcH});
    }
  }
  draw();
});

document.getElementById('comboDel').addEventListener('click', () => {
  if(S.activeCombo < 0 || S.activeCombo >= S.combos.length){ showToast('請先選擇一個範本'); return; }
  S.combos.splice(S.activeCombo, 1);
  S.activeCombo = -1;
  saveCombos();
  renderComboSelect();
});

renderComboSelect();
