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
  const tiles = sel.map(b => ({dx:b.gx - minGx, dy:b.gy - minGy, color:b.color, srcH:b.srcH, yOffset:b.yOffset||0, state:{...(b.state||{})}}));
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
      addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:t.color, srcH:t.srcH, yOffset:t.yOffset||0, state:{...(t.state||{})}});
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

// ── Export combos ──
document.getElementById('comboExport').addEventListener('click', () => {
  if(S.combos.length === 0){ showToast('沒有範本可匯出'); return; }
  const blob = new Blob([JSON.stringify(S.combos, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'combos_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('已匯出 ' + S.combos.length + ' 個範本');
});

// ── Import combos ──
document.getElementById('comboImport').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.addEventListener('change', () => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if(!Array.isArray(data)) throw new Error('格式錯誤');
        let added = 0;
        for(const combo of data){
          if(combo.name && Array.isArray(combo.tiles)){
            if(!S.combos.some(c => c.name === combo.name)){
              S.combos.push(combo);
              added++;
            }
          }
        }
        saveCombos();
        renderComboSelect();
        showToast('已匯入 ' + added + ' 個範本' + (data.length - added > 0 ? '（跳過 ' + (data.length - added) + ' 個重複）' : ''));
      } catch(err){ showToast('匯入失敗：' + err.message, 4000); }
    };
    reader.readAsText(input.files[0]);
  });
  input.click();
});

renderComboSelect();
