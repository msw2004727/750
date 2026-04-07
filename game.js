(function(){
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const TILE = 40;
const ANG = Math.PI / 6;
const COS = Math.cos(ANG);
const SIN = Math.sin(ANG);
const TW = TILE * COS;
const TH = TILE * SIN;
const CUBE_H = TILE * 0.8;  // 一格高度

// ── 貼圖定義（四組來源） ──
const IMG_BASE_A = '%E7%B4%A0%E6%9D%90/isometric%20tileset/separated%20images/';
const IMG_BASE_B = '%E7%B4%A0%E6%9D%90/isometric_jumpstart_v230311/separated/';
const IMG_BASE_C = '%E7%B4%A0%E6%9D%90/3232iso/';
const IMG_BASE_D = '%E7%B4%A0%E6%9D%90/Isometric%20Strategy/';

function tileFile(i){ return 'tile_' + String(i).padStart(3,'0') + '.png'; }

const CROP_A = [8,8,8,8,8,8,8,8,8,8,8,8,8,7,8,8,8,8,8,8,8,9,4,3,6,8,8,6,8,4,6,4,2,6,2,8,3,4,4,3,8,11,16,9,6,8,14,17,12,6,13,10,10,13,7,3,5,6,10,2,0,7,10,7,0,4,7,8,2,7,10,8,0,2,4,16,11,10,8,0,2,4,19,19,19,21,12,12,12,12,12,12,12,12,12,16,16,16,16,16,16,16,16,16,12,12,12,12,12,12,12,12,12,12,8];
const CROP_B = [10,12,11,12,12,12,12,12,15,15,14,8,8,8,0,2,3,4,2,4,4,4,4,4,7,7,6,8,8,8,8,8,0,0,0,0,0,0,0,0,27,21,27,21,0,0,0,0,8,8,8,8,8,8,8,8,8,8,0,0,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,8,8,8,8,8,8,8,8,8,8,8,6,7,6,5,10,12,11,12,12,12,12,12,15,15,14,10,11,10,9,0,0,0,0,0,3,4,2,4,4,4,4,4,7,7,6,8,8,8,8,8];
const SRCH_B = [48,48,48,48,48,48,48,48,48,48,48,48,48,48,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,48,48,48,48,48,48,48,48,48,48,48,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32];

const FILES_C = ["acid.png","acidfull.png","barrel.png","barreldark.png","chestdark.png","chestdarkl.png","chestdarkopenr.png","chestdarkr.png","chestl.png","chestopendarkl.png","chestopenl.png","chestopenr.png","chestr.png","crate.png","dirt.png","dirtdark.png","dirtdarkfull.png","dirtfull.png","dirtgrass.png","dirtgrassfull.png","dirtgreendark.png","dirtgreendarkfull.png","fish.png","flowers.png","flowersdark.png","grass.png","grassbush.png","grassbushdark.png","grassdark.png","grassdarkfull.png","grassfull.png","grassweeds.png","grassweedsdark.png","lava.png","lavadark.png","lavadarkfull.png","lavafull.png","poppy.png","poppydark.png","rug.png","sand.png","sandfull.png","slimegreen.png","slimegreenfull.png","slimepurple.png","slimepurplefull.png","snow.png","snowfull.png","stone.png","stoneblue.png","stonebluebridgedown.png","stonebluebridgeup.png","stonebluebroke.png","stonebluedown.png","stonebluefull.png","stonebluehalf.png","stonebluehalf2.png","stonebluepillar.png","stonebluerocks.png","stoneblueup.png","stonebrick.png","stonebrickblue.png","stonebrickbluefull.png","stonebrickdark.png","stonebrickdarkfull.png","stonebrickfull.png","stonebridgedown.png","stonebridgeup.png","stonebroke.png","stonebutton.png","stonebuttonblue.png","stonebuttonbluepressed.png","stonebuttondark.png","stonebuttondarkpressed.png","stonebuttonpressed.png","stonedark.png","stonedarkbridgedown.png","stonedarkbridgeup.png","stonedarkbroke.png","stonedarkdown.png","stonedarkfull.png","stonedarkhalf.png","stonedarkhalf2.png","stonedarkpillar.png","stonedarkrocks.png","stonedarkup.png","stonedown.png","stonefull.png","stonehalf.png","stonehalf2.png","stonepillar.png","stonerocks.png","stonetorchbluel.png","stonetorchbluer.png","stonetorchdarkl.png","stonetorchdarkr.png","stonetorchl.png","stonetorchr.png","stoneup.png","stonewindowarcher.png","stonewindowarcherblue.png","stonewindowarcherbluel.png","stonewindowarcherdarkl.png","stonewindowarcherdarkr.png","stonewindowarcherl.png","stonewindowbluel.png","stonewindowbluer.png","stonewindowdarkl.png","stonewindowdarkr.png","stonewindowl.png","stonewindowr.png","stonewindowwoodbluel.png","stonewindowwoodbluer.png","stonewindowwooddarkl.png","stonewindowwooddarkr.png","stonewindowwoodl.png","stonewindowwoodr.png","tulips.png","tulipsdark.png","wallflagl.png","wallflagr.png","water.png","waterdark.png","waterdarkfull.png","waterfull.png","wood.png","woodbroke.png","wooddark.png","wooddarkbroke.png","wooddarkflip.png","wooddarkfull.png","wooddarkfullflip.png","wooddarkhalf.png","wooddarkpillar.png","wooddoorl.png","wooddoorr.png","woodflip.png","woodfull.png","woodfullflip.png","woodhalf.png","woodpillar.png","woodtorchl.png","woodtorchr.png"];
const CROP_C = [10,0,2,2,4,3,1,3,3,1,1,1,3,4,8,8,0,0,8,0,8,0,17,2,2,8,2,2,8,0,0,8,8,10,10,0,0,2,2,10,8,0,10,0,10,0,8,0,8,8,0,0,8,8,0,11,8,0,4,8,8,8,0,8,0,0,0,0,8,10,10,12,10,12,12,8,0,0,8,8,0,11,8,0,4,8,8,0,11,8,0,4,14,14,14,14,14,14,8,14,14,14,14,14,14,15,15,15,15,15,15,14,14,14,14,14,14,0,0,13,13,10,10,0,0,8,8,8,8,8,0,0,12,0,11,11,8,0,0,12,0,13,13];

// 三來源定義
const SOURCES = [
  { key:'A', label:'Scrabling', base:IMG_BASE_A, count:115, prefix:'t',
    fileOf:i => tileFile(i), cropOf:i => CROP_A[i], srcHOf:() => 32,
    cats:[
      {label:'泥土', tiles:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14], stroke:'#3A2A1E', ghost:'#8B7355'},
      {label:'地層', tiles:[15,16,17],                            stroke:'#503820', ghost:'#A08060'},
      {label:'草皮', tiles:[18,19,20,21,22,23,24,25,26],          stroke:'#2A4A1E', ghost:'#6BA840'},
      {label:'草地', tiles:[27,28,37,38,39,40],                   stroke:'#2A4010', ghost:'#5B8B30'},
      {label:'灌木', tiles:[29,30,31,32,33,34,35,36],             stroke:'#1A3A0A', ghost:'#4A7A20'},
      {label:'花草', tiles:[41,42,43,44],                         stroke:'#6A2A4A', ghost:'#CC6699'},
      {label:'地物', tiles:[45,46,47],                            stroke:'#5A4A2A', ghost:'#AA8855'},
      {label:'木材', tiles:[48,49,50,51,52],                      stroke:'#4A3018', ghost:'#8B6040'},
      {label:'岩石', tiles:[53,54,55,56,57,58,59,60],             stroke:'#3A2818', ghost:'#7A5838'},
      {label:'石塊', tiles:[61,62,63,64,65,66,67,68],             stroke:'#3A4555', ghost:'#7A8A9A'},
      {label:'冰水', tiles:[69,70,71],                            stroke:'#2A4555', ghost:'#6A99AA'},
      {label:'冰晶', tiles:[72,73,74,75,76,77,78,79,80,81],       stroke:'#3A5566', ghost:'#8ABBCC'},
      {label:'粒子', tiles:[82,83,84,85],                         stroke:'#333',    ghost:'#666'},
      {label:'深水', tiles:[86,87,88,89,90,91,92,93,94],          stroke:'#0E1828', ghost:'#2A3555'},
      {label:'水面', tiles:[95,96,97,98,99,100,101,102,103],      stroke:'#1A3050', ghost:'#4A7099'},
      {label:'淺水', tiles:[104,105,106,107,108,109,110,111,112,113,114], stroke:'#2A5070', ghost:'#6AAACC'},
    ]},
  { key:'B', label:'Jumpstart', base:IMG_BASE_B, count:132, prefix:'j',
    fileOf:i => tileFile(i), cropOf:i => CROP_B[i], srcHOf:i => SRCH_B[i],
    cats:[
      {label:'高草地',   tiles:[0,1,2,3,4,5,6,7,8,9,10],                         stroke:'#2A4A1E', ghost:'#6BA840'},
      {label:'寶箱',     tiles:[11,12],                                           stroke:'#5A4A2A', ghost:'#AA8855'},
      {label:'怪物',     tiles:[13],                                              stroke:'#6A2A4A', ghost:'#CC6699'},
      {label:'草地',     tiles:[14,16,17,18,19,24,25,26,27],                      stroke:'#2A4010', ghost:'#5B8B30'},
      {label:'木箱',     tiles:[15,74,75],                                        stroke:'#4A3018', ghost:'#8B6040'},
      {label:'草石階',   tiles:[20,21,22,23],                                     stroke:'#3A5A2A', ghost:'#6A9A4A'},
      {label:'冰塊',     tiles:[28,29,30,31,44,45,46,47,68,69,70,71],             stroke:'#3A5566', ghost:'#8ABBCC'},
      {label:'泥土',     tiles:[32,33,34,35,48,49,50,51],                         stroke:'#3A2A1E', ghost:'#8B7355'},
      {label:'石磚',     tiles:[36,37,38,39,52,53,54,55],                         stroke:'#3A4555', ghost:'#7A8A9A'},
      {label:'水花',     tiles:[40,41],                                           stroke:'#1A3050', ghost:'#4A7099'},
      {label:'火焰',     tiles:[42,43],                                           stroke:'#AA3300', ghost:'#FF6633'},
      {label:'木橋',     tiles:[56,57,58,59,72,73,88,89,90,91],                   stroke:'#4A3018', ghost:'#8B6040'},
      {label:'岩漿',     tiles:[60,61,62,63,76,77,78,79],                         stroke:'#AA3300', ghost:'#FF6633'},
      {label:'深石',     tiles:[64,65,66,67,80,81,82,83],                         stroke:'#1A1A2A', ghost:'#3A3A5A'},
      {label:'冰磚',     tiles:[84,85,86,87],                                     stroke:'#2A5070', ghost:'#6AAACC'},
      {label:'碎石',     tiles:[92,93,94,95],                                     stroke:'#5A4A3A', ghost:'#8A7A6A'},
      {label:'枯草地',   tiles:[96,97,98,99,116,117,118,119],                     stroke:'#5A4A2A', ghost:'#AA8855'},
      {label:'枯草欄',   tiles:[100,101,102,103,120,121,122,123],                 stroke:'#4A3A1A', ghost:'#8A7A4A'},
      {label:'枯草短',   tiles:[104,105,106,107,108,109,110,124,125,126,127],     stroke:'#5A4A2A', ghost:'#9A8A5A'},
      {label:'水滴',     tiles:[111,112,113,114,115],                             stroke:'#2A5070', ghost:'#6AAACC'},
      {label:'冰階',     tiles:[128,129,130,131],                                 stroke:'#3A5566', ghost:'#8ABBCC'},
    ]},
  { key:'C', label:'3232iso', base:IMG_BASE_C, count:143, prefix:'c',
    fileOf:i => FILES_C[i], cropOf:i => CROP_C[i], srcHOf:() => 32,
    cats:[
      {label:'泥土',   tiles:[14,15,16,17,18,19,20,21],                     stroke:'#3A2A1E', ghost:'#8B7355'},
      {label:'草地',   tiles:[25,26,27,28,29,30,31,32],                     stroke:'#2A4010', ghost:'#5B8B30'},
      {label:'植物',   tiles:[23,24,37,38,117,118],                         stroke:'#6A2A4A', ghost:'#CC6699'},
      {label:'水',     tiles:[122,123,124,125],                             stroke:'#1A3050', ghost:'#4A7099'},
      {label:'岩漿',   tiles:[33,34,35,36],                                 stroke:'#AA3300', ghost:'#FF6633'},
      {label:'酸液',   tiles:[0,1],                                         stroke:'#3A6A1A', ghost:'#7ACC44'},
      {label:'史萊姆', tiles:[42,43,44,45],                                 stroke:'#4A2A6A', ghost:'#9966CC'},
      {label:'沙/雪',  tiles:[40,41,46,47],                                 stroke:'#8A7A5A', ghost:'#CCBB88'},
      {label:'石材',   tiles:[48,86,87,88,89,90,91,98,66,67,68],            stroke:'#6A6A6A', ghost:'#AAAAAA'},
      {label:'藍石',   tiles:[49,50,51,52,53,54,55,56,57,58,59],            stroke:'#3A5580', ghost:'#6688BB'},
      {label:'暗石',   tiles:[75,76,77,78,79,80,81,82,83,84,85],            stroke:'#3A3A4A', ghost:'#6A6A7A'},
      {label:'石磚',   tiles:[60,61,62,63,64,65],                           stroke:'#5A5A6A', ghost:'#8A8A9A'},
      {label:'按鈕',   tiles:[69,70,71,72,73,74],                           stroke:'#5A5A5A', ghost:'#9A9A9A'},
      {label:'火炬',   tiles:[92,93,94,95,96,97],                           stroke:'#AA6A1A', ghost:'#FFAA44'},
      {label:'石窗',   tiles:[99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116], stroke:'#5A5A6A', ghost:'#8A8A9A'},
      {label:'木材',   tiles:[126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142], stroke:'#4A3018', ghost:'#8B6040'},
      {label:'寶箱',   tiles:[2,3,4,5,6,7,8,9,10,11,12,13],                stroke:'#5A4A2A', ghost:'#AA8855'},
      {label:'裝飾',   tiles:[22,39,119,120],                               stroke:'#6A4A4A', ghost:'#AA7777'},
    ]},
  { key:'D', label:'Strategy', base:IMG_BASE_D, count:94, prefix:'s',
    fileOf:i => FILES_D[i], cropOf:i => CROP_D[i],
    srcHOf:i => (i < 90 ? 100 : SRCH_D[i - 90]),
    srcWOf:i => 64,
    framesOf:i => (i < 90 ? 1 : FRAMES_D[i - 90]),
    cats:[
      {label:'草地路徑', tiles:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],     stroke:'#2A4A1E', ghost:'#6BA840'},
      {label:'圍牆',     tiles:[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31], stroke:'#5A5A6A', ghost:'#8A8A9A'},
      {label:'麥田',     tiles:[32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47], stroke:'#8A7A2A', ghost:'#CCBB44'},
      {label:'水面',     tiles:[48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63], stroke:'#1A3050', ghost:'#4A7099'},
      {label:'箱子',     tiles:[64,65,66,73,74,75],                               stroke:'#5A4A2A', ghost:'#AA8855'},
      {label:'建築',     tiles:[71,72,87,69,70],                                  stroke:'#4A3A5A', ghost:'#7A6A9A'},
      {label:'植物',     tiles:[84,85,86],                                        stroke:'#2A4010', ghost:'#5B8B30'},
      {label:'裝飾',     tiles:[67,68,76,77,78,79,80,81,82,83,88,89],             stroke:'#6A4A4A', ghost:'#AA7777'},
      {label:'動畫',     tiles:[90,91,92,93],                                     stroke:'#AA5500', ghost:'#FF8833'},
    ]},
];

// Strategy 檔案列表
const FILES_D = [
"grass_path_folder/grass_path_1.png","grass_path_folder/grass_path_10.png","grass_path_folder/grass_path_11.png","grass_path_folder/grass_path_12.png","grass_path_folder/grass_path_13.png","grass_path_folder/grass_path_14.png","grass_path_folder/grass_path_15.png","grass_path_folder/grass_path_16.png","grass_path_folder/grass_path_2.png","grass_path_folder/grass_path_3.png","grass_path_folder/grass_path_4.png","grass_path_folder/grass_path_5.png","grass_path_folder/grass_path_6.png","grass_path_folder/grass_path_7.png","grass_path_folder/grass_path_8.png","grass_path_folder/grass_path_9.png",
"wall_folder/wall_1.png","wall_folder/wall_10.png","wall_folder/wall_11.png","wall_folder/wall_12.png","wall_folder/wall_13.png","wall_folder/wall_14.png","wall_folder/wall_15.png","wall_folder/wall_16.png","wall_folder/wall_2.png","wall_folder/wall_3.png","wall_folder/wall_4.png","wall_folder/wall_5.png","wall_folder/wall_6.png","wall_folder/wall_7.png","wall_folder/wall_8.png","wall_folder/wall_9.png",
"weat_folder/weat_1.png","weat_folder/weat_10.png","weat_folder/weat_11.png","weat_folder/weat_12.png","weat_folder/weat_13.png","weat_folder/weat_14.png","weat_folder/weat_15.png","weat_folder/weat_16.png","weat_folder/weat_2.png","weat_folder/weat_3.png","weat_folder/weat_4.png","weat_folder/weat_5.png","weat_folder/weat_6.png","weat_folder/weat_7.png","weat_folder/weat_8.png","weat_folder/weat_9.png",
"water_folder/water_sheet_small1.png","water_folder/water_sheet_small10.png","water_folder/water_sheet_small11.png","water_folder/water_sheet_small12.png","water_folder/water_sheet_small13.png","water_folder/water_sheet_small14.png","water_folder/water_sheet_small15.png","water_folder/water_sheet_small16.png","water_folder/water_sheet_small2.png","water_folder/water_sheet_small3.png","water_folder/water_sheet_small4.png","water_folder/water_sheet_small5.png","water_folder/water_sheet_small6.png","water_folder/water_sheet_small7.png","water_folder/water_sheet_small8.png","water_folder/water_sheet_small9.png",
"other/box_1.png","other/box_2.png","other/box_3.png","other/bridge_small.png","other/gate1.png","other/gate2.png","other/grass.png","other/house.png","other/hut.png","other/path_box_1.png","other/path_box_2.png","other/path_box_3.png","other/podium.png","other/rock_1.png","other/sign_1.png","other/sign_2.png","other/sign_3.png","other/sign_4.png","other/tent.png","other/tent_2.png","other/tree_1.png","other/tree_2.png","other/tree_3.png","other/turf_house.png","other/well_1.png","other/well_2.png",
"animations/fire-Sheet.png","animations/flag-Sheet.png","animations/podium_flag-Sheet.png","animations/wind_mill-Sheet.png"
];
const CROP_D = [61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,36,28,28,28,28,28,28,28,28,28,28,28,28,28,37,27,48,58,48,48,48,48,58,58,48,48,48,58,48,48,48,48,32,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,54,57,57,60,36,36,61,33,31,61,56,61,55,61,51,45,42,52,55,55,52,44,51,56,46,52,37,22,22,16];
const SRCH_D = [100,100,100,100]; // 動畫的 srcH
const FRAMES_D = [4,14,14,7]; // 動畫幀數

// 動畫計時器（僅場景有動畫素材時才重繪）
let animTick = 0;
setInterval(() => {
  animTick++;
  const hasAnim = blocks.some(b => { const td = TILES[b.color]; return td && td.frames > 1; });
  if(hasAnim) draw();
}, 200);

// 建立 TILES 物件 + 預載圖片
const TILES = {};
const tileImages = {};
let tilesLoaded = 0;
let totalImages = 0;
for(const src of SOURCES) totalImages += src.count;

for(const src of SOURCES){
  for(let i = 0; i < src.count; i++){
    const key = src.prefix + String(i).padStart(3,'0');
    const file = src.fileOf(i);
    const cropY = src.cropOf(i);
    const srcH = src.srcHOf(i);
    // 找此 tile 所屬分類的顏色
    let stroke = '#555', ghost = '#888';
    for(const cat of src.cats){
      if(cat.tiles.includes(i)){ stroke = cat.stroke; ghost = cat.ghost; break; }
    }
    const srcW = src.srcWOf ? src.srcWOf(i) : 32;
    const frames = src.framesOf ? src.framesOf(i) : 1;
    TILES[key] = {file, cropY, srcH, srcW, frames, stroke, ghost};
    // 預載圖片
    const img = new Image();
    img.onload = () => { tileImages[key] = img; if(++tilesLoaded >= totalImages) draw(); };
    img.src = src.base + file;
  }
}

// ── 暫存區（9格） ──
const staging = new Array(9).fill(null); // 每格存 {color, srcH} 或 null

function initStagingGrid(){
  const grid = document.getElementById('stagingGrid');
  for(let i = 0; i < 9; i++){
    const cell = document.createElement('div');
    cell.className = 'staging-cell';
    cell.dataset.idx = i;
    const del = document.createElement('span');
    del.className = 'staging-del';
    del.textContent = '✕';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      staging[i] = null;
      renderStagingCell(i);
    });
    cell.appendChild(del);
    cell.addEventListener('click', () => {
      if(!staging[i]) return;
      if(brushMode){
        // 筆刷模式：選為筆刷素材
        brushTile = {color: staging[i].color, srcH: staging[i].srcH};
        updateBrushIndicator();
        return;
      }
      // 放到畫面中央位置
      const center = toGrid(W/2, H/2);
      const gx = snap(center.gx), gy = snap(center.gy);
      const s = staging[i];
      saveSnapshot();
      if(s.combo){
        // 組合放置
        for(const t of s.combo){
          const nx = gx+t.dx, ny = gy+t.dy;
          if(!hasBlockAt(nx, ny, currentHeight, null, currentLayer)){
            addBlock({gx:nx, gy:ny, gz:currentHeight, layer:currentLayer, color:t.color, srcH:t.srcH, yOffset:t.yOffset||0});
          }
        }
      } else {
        if(hasBlockAt(gx, gy, currentHeight, null, currentLayer)) return;
        addBlock({gx, gy, gz:currentHeight, layer:currentLayer, color:s.color, srcH:s.srcH, yOffset:0});
      }
      draw();
    });
    grid.appendChild(cell);
  }
}

function renderStagingCell(idx){
  const cells = document.querySelectorAll('.staging-cell');
  const cell = cells[idx];
  if(!cell) return;
  const oldImg = cell.querySelector('img');
  if(oldImg) oldImg.remove();
  const oldCanvas = cell.querySelector('canvas');
  if(oldCanvas) oldCanvas.remove();
  const oldLabel = cell.querySelector('.staging-label');
  if(oldLabel) oldLabel.remove();
  if(staging[idx]){
    if(staging[idx].combo){
      // 組合：用 offscreen canvas 畫縮圖快照
      const combo = staging[idx].combo;
      const thumbCanvas = document.createElement('canvas');
      const sz = 40;
      thumbCanvas.width = sz; thumbCanvas.height = sz;
      const tctx = thumbCanvas.getContext('2d');
      tctx.imageSmoothingEnabled = false;
      // 計算組合邊界
      let cx1=Infinity,cx2=-Infinity,cy1=Infinity,cy2=-Infinity;
      for(const t of combo){ cx1=Math.min(cx1,t.dx);cx2=Math.max(cx2,t.dx);cy1=Math.min(cy1,t.dy);cy2=Math.max(cy2,t.dy); }
      const range = Math.max(cx2-cx1+1, cy2-cy1+1, 1);
      const tileSize = Math.floor(sz / (range + 0.5));
      const ox = sz/2, oy = sz*0.3;
      for(const t of combo){
        const ti = tileImages[t.color];
        if(!ti) continue;
        const rx = (t.dx - (cx1+cx2)/2) * tileSize * 0.5;
        const ry = (t.dy - (cy1+cy2)/2) * tileSize * 0.5;
        const px = ox + (rx - ry);
        const py = oy + (rx + ry) * 0.5;
        tctx.drawImage(ti, px - tileSize/2, py - tileSize/2, tileSize, tileSize);
      }
      thumbCanvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      cell.insertBefore(thumbCanvas, cell.firstChild);
      const lbl = document.createElement('span');
      lbl.className = 'staging-label';
      lbl.textContent = combo.length + '組';
      cell.appendChild(lbl);
    } else {
      const td = TILES[staging[idx].color];
      if(td){
        const img = document.createElement('img');
        const src2 = SOURCES.find(s => s.prefix === staging[idx].color.charAt(0));
        img.src = (src2 ? src2.base : '') + td.file;
        cell.insertBefore(img, cell.firstChild);
      }
    }
  }
}

// 暫存區拖放高亮 + 接收（PC + 手機共用）
function stagingHighlight(on){
  document.getElementById('stagingArea').classList.toggle('drag-active', on);
  document.querySelectorAll('.staging-cell').forEach(c => c.classList.toggle('drag-over', on));
}

function findStagingSlotAt(clientX, clientY){
  const cells = document.querySelectorAll('.staging-cell');
  for(let i = 0; i < cells.length; i++){
    const r = cells[i].getBoundingClientRect();
    if(clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return i;
  }
  // 在暫存區範圍內但不在特定格子上 → 找第一個空格
  const sr = document.getElementById('stagingArea').getBoundingClientRect();
  if(clientX >= sr.left && clientX <= sr.right && clientY >= sr.top && clientY <= sr.bottom){
    const slot = staging.indexOf(null);
    return slot >= 0 ? slot : 8;
  }
  return -1;
}

// PC 拖放到暫存區（用 stagingArea 整體接收，事件委派）
const stagingAreaEl = document.getElementById('stagingArea');
stagingAreaEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  stagingHighlight(true);
});
stagingAreaEl.addEventListener('dragleave', (e) => {
  // 只在離開整個 stagingArea 時才關閉高亮
  if(!stagingAreaEl.contains(e.relatedTarget)) stagingHighlight(false);
});
stagingAreaEl.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  stagingHighlight(false);
  const key = e.dataTransfer.getData('text/plain');
  if(key && TILES[key]) addToStaging(key, TILES[key].srcH);
});

function addToStaging(color, srcH, combo){
  let slot = staging.indexOf(null);
  if(slot === -1) slot = 8;
  if(combo){
    staging[slot] = {combo}; // 組合暫存
  } else {
    staging[slot] = {color, srcH};
  }
  renderStagingCell(slot);
}

function updateBrushIndicator(){
  const el = document.getElementById('brushInfo');
  if(!el) return;
  if(brushTile){
    const td = TILES[brushTile.color];
    el.textContent = brushTile.color;
    el.style.display = 'inline';
  } else {
    el.style.display = 'none';
  }
}

initStagingGrid();

// ── 空間雜湊索引 ──
const spatialHash = new Map(); // key "gx,gy,gz,layer" -> Set of blocks

function shKey(gx, gy, gz, layer){ return gx+','+gy+','+gz+','+layer; }

function shAdd(b){
  const k = shKey(b.gx, b.gy, b.gz, b.layer);
  if(!spatialHash.has(k)) spatialHash.set(k, new Set());
  spatialHash.get(k).add(b);
  // 高型素材也佔上方一格
  if(b.srcH > 32){
    const k2 = shKey(b.gx, b.gy, b.gz + 1, b.layer);
    if(!spatialHash.has(k2)) spatialHash.set(k2, new Set());
    spatialHash.get(k2).add(b);
  }
}

function shRemove(b){
  const k = shKey(b.gx, b.gy, b.gz, b.layer);
  const s = spatialHash.get(k);
  if(s){ s.delete(b); if(s.size === 0) spatialHash.delete(k); }
  if(b.srcH > 32){
    const k2 = shKey(b.gx, b.gy, b.gz + 1, b.layer);
    const s2 = spatialHash.get(k2);
    if(s2){ s2.delete(b); if(s2.size === 0) spatialHash.delete(k2); }
  }
}

function shRebuild(){
  spatialHash.clear();
  for(const b of blocks) shAdd(b);
}

// 方塊陣列管理（自動維護索引）
function addBlock(b){
  blocks.push(b);
  shAdd(b);
}

function removeBlock(b){
  const idx = blocks.indexOf(b);
  if(idx >= 0) blocks.splice(idx, 1);
  shRemove(b);
}

function removeBlocksWhere(fn){
  const removing = blocks.filter(fn);
  for(const b of removing) shRemove(b);
  blocks = blocks.filter(b => !fn(b));
}

function setBlocks(newBlocks){
  blocks = newBlocks;
  shRebuild();
}

// ── 狀態 ──
let blocks = [];
let selectedBlocks = new Set(); // 金色高亮選取
let groupOffsets = null; // 整組拖曳偏移
let history = []; // 返回歷史
let redoStack = []; // 復原歷史
let boxSelect = null; // {sx, sy, ex, ey} 框選座標
let dragBlock = null;
let dragOffX = 0, dragOffY = 0;
let lastValidGx = 0, lastValidGy = 0;
let shakeBlock = null;
let shakeStart = 0;
let W, H;
let camX = 0, camY = 0;
let zoom = 1;
let panDrag = false;
let panStartX = 0, panStartY = 0, panCamStartX = 0, panCamStartY = 0;
let animFrame = null;
let reachableSet = null;
let currentHeight = 0;  // 高度 -5~+5
let currentLayer = 0;   // 圖層 0~5（同高度重疊用）
let showCoords = false;
let showGrid = false;
let showVGrid = false;
let showHover = false;
let hoverBlock = null;
let selectMode = false;
let locateMode = false;
let copyMode = false;
let brushMode = false;   // 筆刷工具
let eraserMode = false;  // 橡皮擦工具
let brushTile = null;    // 筆刷選中的素材 {color, srcH}
let brushPainting = false; // 正在筆刷繪製中
let brushCursorGx = -999, brushCursorGy = -999;
let lastMouseClientX = 0, lastMouseClientY = 0;
let hiddenHeights = new Set(); // 隱藏的高度層
let hiddenLayers = new Set();  // 隱藏的圖層
let fillMode = false;          // 填充工具
let rectMode = false;          // 矩形繪製
let lineMode = false;          // 線段繪製
let rectStart = null;          // {gx, gy} 矩形/線段起點
let fillPreview = [];          // 填充預覽座標 [[gx,gy],...]
let clipboard = null;          // 複製的方塊 [{dx,dy,color,srcH,yOffset}]
let showMinimap = false;

// ── 座標轉換 ──
function resize(){
  const r = canvas.parentElement.getBoundingClientRect();
  W = r.width;
  // 手機：扣掉工具列高度，填滿剩餘空間
  const toolbar = document.getElementById('toolbar');
  const tbH = toolbar ? toolbar.getBoundingClientRect().height : 0;
  H = Math.max(300, window.innerHeight - tbH - 60);
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.height = H + 'px';
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  draw();
}

function toScreen(gx, gy, gz){
  return {
    x: W/2 + camX + (gx - gy) * TW * zoom,
    y: H/2 + camY + ((gx + gy) * TH - gz * CUBE_H) * zoom
  };
}

function toGrid(sx, sy){
  const dx = (sx - W/2 - camX) / zoom;
  const dy = (sy - H/2 - camY) / zoom;
  return {
    gx: (dx / TW + dy / TH) / 2,
    gy: (dy / TH - dx / TW) / 2
  };
}

function snap(v){ return Math.round(v); }

// ── 方塊邏輯 ──
// 碰撞檢查：O(1) 空間雜湊查找
function hasBlockAt(gx, gy, gz, exclude, layer){
  const chkLayer = (layer !== undefined) ? layer : currentLayer;
  const k = shKey(gx, gy, gz, chkLayer);
  const s = spatialHash.get(k);
  if(!s) return false;
  for(const b of s){
    if(b !== exclude) return true;
  }
  return false;
}

// 從起點 flood fill 找出所有可到達的空格
function computeReachable(startGx, startGy, gz, excludeBlock){
  const reachable = new Set();
  const queue = [[startGx, startGy]];
  const key = (x, y) => x + ',' + y;
  reachable.add(key(startGx, startGy));
  while(queue.length > 0){
    const [cx, cy] = queue.shift();
    if(Math.abs(cx - startGx) > 50 || Math.abs(cy - startGy) > 50) continue;
    for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = cx + dx, ny = cy + dy;
      const k = key(nx, ny);
      const isTall = excludeBlock && excludeBlock.srcH > 32;
      const lyr = excludeBlock ? excludeBlock.layer : currentLayer;
      const blocked = hasBlockAt(nx, ny, gz, excludeBlock, lyr) || (isTall && hasBlockAt(nx, ny, gz + 1, excludeBlock, lyr));
      if(!reachable.has(k) && !blocked){
        reachable.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return reachable;
}

// Shift+點擊：flood fill 選取相鄰接觸的方塊
function selectConnected(startBlock){
  selectedBlocks = new Set();
  selectedBlocks.add(startBlock);
  const queue = [startBlock];
  while(queue.length > 0){
    const cur = queue.shift();
    for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = cur.gx + dx, ny = cur.gy + dy;
      for(const b of blocks){
        if(selectedBlocks.has(b)) continue;
        if(b.gx === nx && b.gy === ny && b.gz === cur.gz && b.layer === cur.layer){
          selectedBlocks.add(b);
          queue.push(b);
        }
      }
    }
  }
}

function findEmptySpot(){
  for(let r = 0; r < 30; r++){
    for(let dx = -r; dx <= r; dx++){
      for(let dy = -r; dy <= r; dy++){
        if(Math.abs(dx) === r || Math.abs(dy) === r){
          if(!hasBlockAt(dx, dy, currentHeight, null, currentLayer)) return {gx:dx, gy:dy};
        }
      }
    }
  }
  return {gx:0, gy:0};
}

// ── 抖動動畫 ──
function triggerShake(block){
  shakeBlock = block;
  shakeStart = performance.now();
  if(!animFrame) animLoop();
}

function animLoop(){
  const now = performance.now();
  if(shakeBlock && now - shakeStart > 400) shakeBlock = null;
  draw();
  if(shakeBlock) animFrame = requestAnimationFrame(animLoop);
  else animFrame = null;
}

function getShakeOff(block){
  if(block !== shakeBlock) return {sx:0,sy:0};
  const t = performance.now() - shakeStart;
  if(t > 400) return {sx:0,sy:0};
  const d = 1 - t / 400;
  return {sx: Math.sin(t*0.05)*3*d, sy: Math.cos(t*0.07)*1.5*d};
}

// ── 繪製：方塊 ──
function drawCube(gx, gy, gz, color, hl, block){
  const p = toScreen(gx, gy, gz);
  const sh = getShakeOff(block);
  const yOff = (block && block.yOffset || 0) * (CUBE_H * zoom / 5);
  const x = p.x + sh.sx, y = p.y + sh.sy - yOff;
  const tw = TW * zoom, th = TH * zoom, ch = CUBE_H * zoom;

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
      // 精靈圖動畫：從 spritesheet 裁切當前幀
      const frame = animTick % frames;
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

  // 金色高亮（Shift 選取）
  if(selectedBlocks.has(block)){
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

  // 滑鼠懸停反白
  if(showHover && block === hoverBlock){
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

  if(showCoords){
    const label = `${gx},${gy}`;
    const cy = y + th - ch * 0.3;
    ctx.font = `${Math.max(9, 11 * zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(label, x + 1, cy + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x, cy);
  }
}

// ── 繪製：幽靈預覽 ──
function drawGhost(gx, gy, gz, color, valid){
  const p = toScreen(gx, gy, gz);
  const x = p.x, y = p.y;
  const tw = TW*zoom, th = TH*zoom, ch = CUBE_H*zoom;
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

// ── 繪製：格線 ──
// 水平格線（每層都畫，當前層加亮）
function drawGrid(){
  if(!showGrid) return;
  const vr = getVisibleRange();
  const R = Math.min(50, Math.max(Math.abs(vr.minGx), Math.abs(vr.maxGx), Math.abs(vr.minGy), Math.abs(vr.maxGy)) + 2);
  const gz = currentHeight;
  const th2 = TH * 2 * zoom;

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

  // 當前高度的地板面：整片半透明，有方塊處挖空
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#aaccee';
  // 先畫整片菱形地板
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

  // 當前高度原點十字加粗
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#8ab8dd';
  ctx.lineWidth = 1.5;
  let a = toScreen(0, -R, gz), b = toScreen(0, R, gz);
  ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
  a = toScreen(-R, 0, gz); b = toScreen(R, 0, gz);
  ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();

  // 高度標籤
  const origin = toScreen(0, 0, gz);
  ctx.globalAlpha = 0.7;
  ctx.font = `${Math.max(10, 12*zoom)}px monospace`;
  ctx.fillStyle = '#8ab8dd';
  ctx.textAlign = 'center';
  ctx.fillText('H:'+gz, origin.x, origin.y + th2 + 14*zoom);
  ctx.globalAlpha = 1;
}

// 立體格線（每個格子的垂直邊都畫出來，形成立體方格）
function drawVGrid(){
  if(!showVGrid) return;
  const vr = getVisibleRange();
  const R = Math.min(50, Math.max(Math.abs(vr.minGx), Math.abs(vr.maxGx), Math.abs(vr.minGy), Math.abs(vr.maxGy)) + 2);
  const gz = currentHeight;
  const th2 = TH * 2 * zoom;

  // 每條格線位置畫垂直線（從 -5 到 +5 高度）
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

  // 當前高度的垂直線加亮
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

  // 高度刻度標籤（原點）
  ctx.globalAlpha = 0.5;
  ctx.font = `${Math.max(8, 9*zoom)}px monospace`;
  ctx.textAlign = 'left';
  for(let h = -5; h <= 5; h++){
    const p = toScreen(0, 0, h);
    ctx.fillStyle = h === gz ? '#FFD700' : '#8ab8dd';
    ctx.fillText(h === gz ? '>'+h : ''+h, p.x + 5, p.y + th2 + 3);
  }
  ctx.globalAlpha = 1;
}

// ── 視窗裁切：只繪製可見範圍內的方塊 ──
function getVisibleRange(){
  // 螢幕四角轉換為網格座標，取得可見範圍
  const margin = 3; // 額外邊界避免邊緣閃爍
  const corners = [
    toGrid(0, 0), toGrid(W, 0), toGrid(0, H), toGrid(W, H)
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

// ── 主繪製 ──
function draw(){
  ctx.clearRect(0,0,W,H);
  const vr = getVisibleRange();

  // 只排序可見且未隱藏的方塊
  const visible = blocks.filter(b => isVisible(b, vr) && !hiddenHeights.has(b.gz) && !hiddenLayers.has(b.layer));
  const sorted = visible.sort((a,b) => {
    return (a.gx+a.gy)*100+a.gz - ((b.gx+b.gy)*100+b.gz);
  });

  // 1. 先畫低於當前高度的方塊（變暗）
  for(const b of sorted){
    if(b.gz < currentHeight){
      ctx.globalAlpha = 0.4;
      drawCube(b.gx, b.gy, b.gz, b.color, b===dragBlock, b);
      ctx.globalAlpha = 1;
    }
  }

  // 2. 格線蓋在低層方塊上面
  drawGrid();

  // 3. 拖曳幽靈
  if(dragBlock){
    const tgx = snap(dragBlock._dragGx);
    const tgy = snap(dragBlock._dragGy);
    const k = tgx + ',' + tgy;
    const valid = reachableSet && reachableSet.has(k);
    drawGhost(tgx, tgy, dragBlock.gz, dragBlock.color, valid);
  }

  // 4. 當前高度及以上的方塊畫在格線上面
  for(const b of sorted){
    if(b.gz >= currentHeight) drawCube(b.gx, b.gy, b.gz, b.color, b===dragBlock, b);
  }

  // 5. 垂直格線最上層
  drawVGrid();

  // 框選矩形
  if(boxSelect){
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(255,215,0,0.08)';
    const bx = Math.min(boxSelect.sx, boxSelect.ex);
    const by = Math.min(boxSelect.sy, boxSelect.ey);
    const bw = Math.abs(boxSelect.ex - boxSelect.sx);
    const bh = Math.abs(boxSelect.ey - boxSelect.sy);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillRect(bx, by, bw, bh);
    ctx.setLineDash([]);
  }

  // 筆刷游標預覽
  if(brushMode && brushTile && brushCursorGx !== -999){
    ctx.globalAlpha = 0.5;
    drawCube(brushCursorGx, brushCursorGy, currentHeight, brushTile.color, false, null);
    ctx.globalAlpha = 1;
  }
  // 橡皮擦游標
  if(eraserMode && brushCursorGx !== -999){
    const ep = toScreen(brushCursorGx, brushCursorGy, currentHeight);
    const tw2 = TW*zoom, th2 = TH*zoom, ch2 = CUBE_H*zoom;
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

  // 填充預覽
  if(fillMode && fillPreview.length > 0 && brushTile){
    ctx.globalAlpha = 0.3;
    for(const [fx,fy] of fillPreview){
      drawCube(fx, fy, currentHeight, brushTile.color, false, null);
    }
    ctx.globalAlpha = 1;
  }

  // 矩形/線段拖曳預覽
  if(brushPainting && rectStart && (rectMode||lineMode) && brushTile){
    const cells = getRectLineCells(rectStart.gx, rectStart.gy, brushCursorGx, brushCursorGy);
    ctx.globalAlpha = 0.4;
    for(const [cx,cy] of cells){
      drawCube(cx, cy, currentHeight, brushTile.color, false, null);
    }
    ctx.globalAlpha = 1;
    // 起點標記
    const sp = toScreen(rectStart.gx, rectStart.gy, currentHeight);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    ctx.setLineDash([3,3]);
    const ep = toScreen(brushCursorGx, brushCursorGy, currentHeight);
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y + TH*zoom);
    ctx.lineTo(ep.x, ep.y + TH*zoom);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 右下角資訊
  ctx.globalAlpha = 0.5;
  ctx.font = '10px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'right';
  ctx.fillText(`${visible.length}/${blocks.length} blocks`, W - 8, H - 8);
  ctx.globalAlpha = 1;

  // 小地圖（正交俯瞰，可點擊跳轉）
  if(showMinimap){
    const mmW = 140, mmH = 100, mmX = W - mmW - 8, mmY = H - mmH - 22;
    ctx.save();
    ctx.fillStyle = 'rgba(15,15,30,0.85)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    // 計算範圍：包含所有方塊 + 當前視窗
    const vr2 = getVisibleRange();
    let bx1 = vr2.minGx, bx2 = vr2.maxGx, by1 = vr2.minGy, by2 = vr2.maxGy;
    for(const b of blocks){
      bx1 = Math.min(bx1, b.gx); bx2 = Math.max(bx2, b.gx);
      by1 = Math.min(by1, b.gy); by2 = Math.max(by2, b.gy);
    }
    bx1 -= 2; bx2 += 2; by1 -= 2; by2 += 2;
    const rangeX = bx2 - bx1 || 1, rangeY = by2 - by1 || 1;
    const sc = Math.min((mmW - 8) / rangeX, (mmH - 8) / rangeY);
    const ox = mmX + mmW/2, oy = mmY + mmH/2;
    const midX = (bx1+bx2)/2, midY = (by1+by2)/2;

    // 裁切到小地圖範圍
    ctx.beginPath();
    ctx.rect(mmX, mmY, mmW, mmH);
    ctx.clip();

    // 格子背景
    ctx.fillStyle = 'rgba(40,50,70,0.5)';
    for(let gx = Math.floor(bx1); gx <= Math.ceil(bx2); gx++){
      for(let gy = Math.floor(by1); gy <= Math.ceil(by2); gy++){
        if((gx+gy)%2 === 0){
          ctx.fillRect(ox + (gx-midX)*sc - sc/2, oy + (gy-midY)*sc - sc/2, sc, sc);
        }
      }
    }

    // 方塊
    for(const b of blocks){
      const px = ox + (b.gx - midX) * sc;
      const py = oy + (b.gy - midY) * sc;
      const s = Math.max(2, sc * 0.8);
      if(b.gz === currentHeight && b.layer === currentLayer){
        ctx.fillStyle = '#6af';
      } else if(b.gz === currentHeight){
        ctx.fillStyle = '#48a';
      } else {
        ctx.fillStyle = '#345';
      }
      ctx.fillRect(px - s/2, py - s/2, s, s);
    }

    // 視窗框
    const vx1 = ox + (vr2.minGx - midX) * sc;
    const vy1 = oy + (vr2.minGy - midY) * sc;
    const vx2 = ox + (vr2.maxGx - midX) * sc;
    const vy2 = oy + (vr2.maxGy - midY) * sc;
    ctx.strokeStyle = 'rgba(255,220,100,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx1, vy1, vx2-vx1, vy2-vy1);

    // 原點標記
    const o0x = ox + (0 - midX) * sc;
    const o0y = oy + (0 - midY) * sc;
    ctx.fillStyle = 'rgba(255,100,100,0.7)';
    ctx.fillRect(o0x-2, o0y-2, 4, 4);

    ctx.restore();

    // 儲存小地圖參數供點擊跳轉用
    window._mm = {mmX, mmY, mmW, mmH, midX, midY, sc, ox, oy};
  }
}

// ── 輸入處理 ──
function mousePos(e){
  const r = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {x: t.clientX - r.left, y: t.clientY - r.top};
}

function pointInCube(px, py, bx, by){
  const tw = TW*zoom, th = TH*zoom, ch = CUBE_H*zoom;
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

// 計算矩形或線段覆蓋的格子
function getRectLineCells(x0,y0,x1,y1){
  const cells = [];
  if(rectMode){
    const ax = Math.min(x0,x1), bx = Math.max(x0,x1);
    const ay = Math.min(y0,y1), by = Math.max(y0,y1);
    for(let x=ax;x<=bx;x++) for(let y=ay;y<=by;y++) cells.push([x,y]);
  } else {
    let cx=x0,cy=y0;
    const dx=Math.abs(x1-cx),dy=Math.abs(y1-cy);
    const sx=cx<x1?1:-1,sy=cy<y1?1:-1;
    let err=dx-dy;
    while(true){
      cells.push([cx,cy]);
      if(cx===x1&&cy===y1) break;
      const e2=2*err;
      if(e2>-dy){err-=dy;cx+=sx;}
      if(e2<dx){err+=dx;cy+=sy;}
    }
  }
  return cells;
}

// 計算填充預覽區域
function computeFillPreview(gx, gy){
  const result = [];
  if(hasBlockAt(gx, gy, currentHeight, null, currentLayer)) return result;
  const visited = new Set();
  const queue = [[gx, gy]];
  const key = (x,y) => x+','+y;
  visited.add(key(gx, gy));
  const MAX = 500;
  while(queue.length > 0 && visited.size < MAX){
    const [cx, cy] = queue.shift();
    result.push([cx, cy]);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, ny=cy+dy;
      const k = key(nx, ny);
      if(!visited.has(k) && !hasBlockAt(nx, ny, currentHeight, null, currentLayer)){
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return result;
}

function hitTest(mx, my){
  // 只偵測當前高度+圖層的物件
  const filtered = blocks.filter(b => b.gz === currentHeight && b.layer === currentLayer);
  const sorted = filtered.sort((a,b) => {
    return (b.gx+b.gy)*100+b.gz - ((a.gx+a.gy)*100+a.gz);
  });
  for(const b of sorted){
    const p = toScreen(b.gx, b.gy, b.gz);
    if(pointInCube(mx, my, p.x, p.y)) return b;
  }
  return null;
}

function onDown(e){
  e.preventDefault();
  const pos = mousePos(e);

  // 小地圖點擊跳轉
  if(showMinimap && window._mm){
    const mm = window._mm;
    if(pos.x >= mm.mmX && pos.x <= mm.mmX+mm.mmW && pos.y >= mm.mmY && pos.y <= mm.mmY+mm.mmH){
      const tgx = mm.midX + (pos.x - mm.ox) / mm.sc;
      const tgy = mm.midY + (pos.y - mm.oy) / mm.sc;
      const cp = toScreen(tgx, tgy, currentHeight);
      camX += W/2 - cp.x;
      camY += H/2 - cp.y;
      draw();
      return;
    }
  }

  const hit = hitTest(pos.x, pos.y);

  // 定位模式：跳到素材位置
  if(locateMode && hit){
    jumpToTile(hit.color);
    locateMode = false; document.getElementById('chkLocate').checked = false;
    return;
  }

  // 筆刷模式
  if(brushMode && !brushTile && !e.shiftKey && !e.ctrlKey){
    alert('請先點擊素材面板或暫存區選擇筆刷素材');
    return;
  }
  if(brushMode && brushTile && !e.shiftKey && !e.ctrlKey){
    const g = toGrid(pos.x, pos.y);
    const gx = snap(g.gx), gy = snap(g.gy);
    if(!hasBlockAt(gx, gy, currentHeight, null, currentLayer)){
      saveSnapshot();
      addBlock({gx, gy, gz:currentHeight, layer:currentLayer, color:brushTile.color, srcH:brushTile.srcH, yOffset:0});
      draw();
    }
    brushPainting = true;
    return;
  }

  // 橡皮擦模式：點擊刪除
  if(eraserMode && hit && !e.shiftKey){
    if(hit.gz === currentHeight && hit.layer === currentLayer){
      saveSnapshot();
      removeBlock(hit);
      draw();
    }
    brushPainting = true; // 複用此 flag 做連續擦除
    return;
  }

  // 填充工具：點擊執行（預覽在 draw 中處理）
  if(fillMode && !e.shiftKey){
    if(!brushTile){ alert('請先選擇筆刷素材再使用填充'); return; }
    if(fillPreview.length > 0){
      saveSnapshot();
      for(const [fx,fy] of fillPreview){
        addBlock({gx:fx, gy:fy, gz:currentHeight, layer:currentLayer, color:brushTile.color, srcH:brushTile.srcH, yOffset:0});
      }
      fillPreview = [];
      draw();
    }
    return;
  }

  // 矩形/線段繪製：按住拖曳 → 預覽 → 放開填充
  if((rectMode || lineMode) && !e.shiftKey){
    if(!brushTile){ alert('請先選擇筆刷素材'); return; }
    const g = toGrid(pos.x, pos.y);
    rectStart = {gx: snap(g.gx), gy: snap(g.gy)};
    brushPainting = true;
    draw();
    return;
  }

  // Ctrl+左鍵 或 複製模式：複製拖曳
  if((e.ctrlKey || copyMode) && hit){
    if(hit.gz !== currentHeight || hit.layer !== currentLayer) return;
    saveSnapshot();
    const clone = {gx:hit.gx, gy:hit.gy, gz:hit.gz, layer:hit.layer, color:hit.color, srcH:hit.srcH};
    addBlock(clone);
    // 拖曳原方塊，副本留在原位
    reachableSet = null; // 複製拖曳不受圍牆限制
    dragBlock = hit;
    dragBlock._copyMode = true;
    groupOffsets = null;
    const sp = toScreen(hit.gx, hit.gy, hit.gz);
    dragOffX = pos.x - sp.x;
    dragOffY = pos.y - sp.y;
    lastValidGx = hit.gx;
    lastValidGy = hit.gy;
    hit._dragGx = hit.gx;
    hit._dragGy = hit.gy;
    canvas.style.cursor = 'copy';
    draw();
    return;
  }

  // Shift+左鍵 或 選取模式
  if(e.shiftKey || selectMode){
    if(hit){
      // 點到方塊：flood fill 選取
      if(hit.gz !== currentHeight || hit.layer !== currentLayer) return;
      selectConnected(hit);
      draw();
    } else {
      // 空白處：開始框選
      boxSelect = {sx:pos.x, sy:pos.y, ex:pos.x, ey:pos.y};
    }
    return;
  }

  // 有高亮狀態
  if(selectedBlocks.size > 0 && !e.shiftKey){
    // 點到高亮方塊 → 整組拖曳
    if(hit && selectedBlocks.has(hit)){
      saveSnapshot();
      dragBlock = hit;
      // 記錄每個選取方塊相對於拖曳方塊的偏移
      groupOffsets = [];
      for(const b of selectedBlocks){
        groupOffsets.push({block:b, dx:b.gx - hit.gx, dy:b.gy - hit.gy, origGx:b.gx, origGy:b.gy});
      }
      const sp = toScreen(hit.gx, hit.gy, hit.gz);
      dragOffX = pos.x - sp.x;
      dragOffY = pos.y - sp.y;
      lastValidGx = hit.gx;
      lastValidGy = hit.gy;
      hit._dragGx = hit.gx;
      hit._dragGy = hit.gy;
      canvas.style.cursor = 'grabbing';
      draw();
      return;
    }
    // 點到其他地方 → 取消高亮
    selectedBlocks = new Set();
    groupOffsets = null;
    draw();
    if(!hit){
      panDrag = true;
      panStartX = pos.x; panStartY = pos.y;
      panCamStartX = camX; panCamStartY = camY;
      canvas.style.cursor = 'grabbing';
    }
    return;
  }

  if(hit){
    if(hit.gz !== currentHeight || hit.layer !== currentLayer) return;
    reachableSet = computeReachable(hit.gx, hit.gy, hit.gz, hit);
    if(reachableSet.size <= 1){ triggerShake(hit); reachableSet = null; return; }
    saveSnapshot();
    dragBlock = hit;
    groupOffsets = null;
    const sp = toScreen(hit.gx, hit.gy, hit.gz);
    dragOffX = pos.x - sp.x;
    dragOffY = pos.y - sp.y;
    lastValidGx = hit.gx;
    lastValidGy = hit.gy;
    hit._dragGx = hit.gx;
    hit._dragGy = hit.gy;
    canvas.style.cursor = 'grabbing';
    draw();
  } else {
    panDrag = true;
    panStartX = pos.x; panStartY = pos.y;
    panCamStartX = camX; panCamStartY = camY;
    canvas.style.cursor = 'grabbing';
  }
}

function onMove(e){
  // 追蹤滑鼠位置（用於 onUp 時判斷暫存區）
  if(e.clientX !== undefined){ lastMouseClientX = e.clientX; lastMouseClientY = e.clientY; }
  else if(e.touches && e.touches[0]){ lastMouseClientX = e.touches[0].clientX; lastMouseClientY = e.touches[0].clientY; }
  // 拖曳方塊時暫存區高亮
  if(dragBlock){ stagingHighlight(findStagingSlotAt(lastMouseClientX, lastMouseClientY) >= 0); }
  // 筆刷/橡皮擦/矩形/線段拖曳
  if(brushPainting){
    e.preventDefault();
    const pos = mousePos(e);
    const g = toGrid(pos.x, pos.y);
    const gx = snap(g.gx), gy = snap(g.gy);
    brushCursorGx = gx; brushCursorGy = gy;
    if(brushMode && brushTile){
      if(!hasBlockAt(gx, gy, currentHeight, null, currentLayer)){
        addBlock({gx, gy, gz:currentHeight, layer:currentLayer, color:brushTile.color, srcH:brushTile.srcH, yOffset:0});
      }
    } else if(eraserMode){
      const hit2 = hitTest(pos.x, pos.y);
      if(hit2 && hit2.gz === currentHeight && hit2.layer === currentLayer){
        removeBlock(hit2);
      }
    }
    // 矩形/線段只更新游標位置（預覽在 draw 中）
    draw();
    return;
  }
  if(dragBlock){
    e.preventDefault();
    const pos = mousePos(e);
    const sx = pos.x - dragOffX;
    const sy = pos.y - dragOffY;
    const g = toGrid(sx, sy);
    const tgx = snap(g.gx), tgy = snap(g.gy);
    dragBlock._dragGx = g.gx;
    dragBlock._dragGy = g.gy;

    if(dragBlock._copyMode){
      if(!hasBlockAt(tgx, tgy, dragBlock.gz, dragBlock, dragBlock.layer)){
        shRemove(dragBlock);
        dragBlock.gx = tgx;
        dragBlock.gy = tgy;
        shAdd(dragBlock);
        lastValidGx = tgx;
        lastValidGy = tgy;
      }
    } else if(groupOffsets){
      // 整組移動：檢查所有方塊新位置是否可用
      const ddx = tgx - lastValidGx, ddy = tgy - lastValidGy;
      if(ddx !== 0 || ddy !== 0){
        let canMove = true;
        for(const go of groupOffsets){
          const nx = go.block.gx + ddx, ny = go.block.gy + ddy;
          if(hasBlockAt(nx, ny, dragBlock.gz, null, dragBlock.layer)){
            // 檢查目標是否也在選取組內
            let inGroup = false;
            for(const go2 of groupOffsets){
              if(go2.block.gx === nx && go2.block.gy === ny){ inGroup = true; break; }
            }
            if(!inGroup){ canMove = false; break; }
          }
        }
        if(canMove){
          for(const go of groupOffsets) shRemove(go.block);
          for(const go of groupOffsets){
            go.block.gx += ddx;
            go.block.gy += ddy;
          }
          for(const go of groupOffsets) shAdd(go.block);
          lastValidGx = tgx;
          lastValidGy = tgy;
        }
      }
    } else {
      const k = tgx + ',' + tgy;
      if(reachableSet && reachableSet.has(k)){
        shRemove(dragBlock);
        dragBlock.gx = tgx;
        dragBlock.gy = tgy;
        shAdd(dragBlock);
        lastValidGx = tgx;
        lastValidGy = tgy;
      }
    }
    draw();
  } else if(boxSelect){
    e.preventDefault();
    const pos = mousePos(e);
    boxSelect.ex = pos.x;
    boxSelect.ey = pos.y;
    draw();
  } else if(panDrag){
    e.preventDefault();
    const pos = mousePos(e);
    camX = panCamStartX + (pos.x - panStartX);
    camY = panCamStartY + (pos.y - panStartY);
    draw();
  } else if(showHover || brushMode || eraserMode || fillMode || rectMode || lineMode){
    const pos = mousePos(e);
    let needDraw = false;
    const g = toGrid(pos.x, pos.y);
    const newGx = snap(g.gx), newGy = snap(g.gy);
    if(newGx !== brushCursorGx || newGy !== brushCursorGy){
      brushCursorGx = newGx; brushCursorGy = newGy;
      needDraw = true;
      // 填充預覽
      if(fillMode && brushTile){
        fillPreview = computeFillPreview(newGx, newGy);
      }
    }
    if(showHover){
      const prev = hoverBlock;
      hoverBlock = hitTest(pos.x, pos.y);
      if(hoverBlock !== prev) needDraw = true;
    }
    if(needDraw) draw();
  }
}

function onUp(){
  if(brushPainting){
    brushPainting = false;
    // 矩形/線段放開時執行填充
    if((rectMode || lineMode) && rectStart && brushTile){
      const gx = brushCursorGx, gy = brushCursorGy;
      saveSnapshot();
      const cells = getRectLineCells(rectStart.gx, rectStart.gy, gx, gy);
      for(const [cx,cy] of cells){
        if(!hasBlockAt(cx, cy, currentHeight, null, currentLayer)){
          addBlock({gx:cx, gy:cy, gz:currentHeight, layer:currentLayer, color:brushTile.color, srcH:brushTile.srcH, yOffset:0});
        }
      }
      rectStart = null;
      draw();
    }
    return;
  }
  if(boxSelect){
    // 框選結束：選取框內的方塊
    const x1 = Math.min(boxSelect.sx, boxSelect.ex);
    const y1 = Math.min(boxSelect.sy, boxSelect.ey);
    const x2 = Math.max(boxSelect.sx, boxSelect.ex);
    const y2 = Math.max(boxSelect.sy, boxSelect.ey);
    selectedBlocks = new Set();
    for(const b of blocks){
      if(b.gz !== currentHeight || b.layer !== currentLayer) continue;
      const p = toScreen(b.gx, b.gy, b.gz);
      if(p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2){
        selectedBlocks.add(b);
      }
    }
    boxSelect = null;
    draw();
    return;
  }
  if(dragBlock){
    stagingHighlight(false);
    // 檢查是否放到暫存區
    const slot = findStagingSlotAt(lastMouseClientX, lastMouseClientY);
    if(slot >= 0){
      saveSnapshot();
      if(groupOffsets && groupOffsets.length > 1){
        // 整組存為組合暫存
        const minGx = Math.min(...groupOffsets.map(g=>g.block.gx));
        const minGy = Math.min(...groupOffsets.map(g=>g.block.gy));
        const combo = groupOffsets.map(g => ({
          dx:g.block.gx-minGx, dy:g.block.gy-minGy, color:g.block.color, srcH:g.block.srcH, yOffset:g.block.yOffset||0
        }));
        addToStaging(null, 0, combo);
        for(const g of groupOffsets) removeBlock(g.block);
        selectedBlocks = new Set();
      } else {
        // 單一素材
        addToStaging(dragBlock.color, dragBlock.srcH);
        removeBlock(dragBlock);
      }
    }
    if(!groupOffsets){
      dragBlock.gx = lastValidGx;
      dragBlock.gy = lastValidGy;
    }
    delete dragBlock._dragGx;
    delete dragBlock._dragGy;
    delete dragBlock._copyMode;
    dragBlock = null;
    groupOffsets = null;
  }
  reachableSet = null;
  panDrag = false;
  canvas.style.cursor = (brushMode||eraserMode||fillMode||rectMode||lineMode) ? 'crosshair' : 'grab';
  draw();
}

function onWheel(e){
  e.preventDefault();
  // 拖曳中滾輪：微調素材高度（1/5 格）
  if(dragBlock && !dragBlock._copyMode){
    const dir = e.deltaY < 0 ? 1 : -1;
    const cur = dragBlock.yOffset || 0;
    const next = Math.max(0, Math.min(5, cur + dir));
    if(next !== cur){
      dragBlock.yOffset = next;
      draw();
    }
    return;
  }
  // 一般滾輪：縮放
  const pos = mousePos(e);
  const before = toGrid(pos.x, pos.y);
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  zoom = Math.max(0.15, Math.min(3, zoom * delta));
  const after = toScreen(before.gx, before.gy, 0);
  camX += pos.x - after.x;
  camY += pos.y - after.y;
  draw();
}

function onDbl(e){
  const pos = mousePos(e);
  const hit = hitTest(pos.x, pos.y);
  if(hit){
    if(hit.gz !== currentHeight || hit.layer !== currentLayer) return;
    if(computeReachable(hit.gx, hit.gy, hit.gz, hit).size <= 1){ triggerShake(hit); return; }
    saveSnapshot(); removeBlock(hit); draw();
  }
}

function onCtx(e){
  e.preventDefault();
  const pos = mousePos(e);
  const hit = hitTest(pos.x, pos.y);
  if(hit){
    if(hit.gz !== currentHeight || hit.layer !== currentLayer) return;
    if(computeReachable(hit.gx, hit.gy, hit.gz, hit).size <= 1){ triggerShake(hit); return; }
    saveSnapshot(); removeBlock(hit); draw();
  }
}

// ── 事件綁定 ──
canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onUp);
canvas.addEventListener('mouseleave', onUp);
canvas.addEventListener('wheel', onWheel, {passive:false});
canvas.addEventListener('dblclick', onDbl);
canvas.addEventListener('contextmenu', onCtx);

// 從素材面板拖放到畫布（PC）
canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  const key = e.dataTransfer.getData('text/plain');
  if(!key || !TILES[key]) return;
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const g = toGrid(mx, my);
  const gx = snap(g.gx), gy = snap(g.gy);
  if(!hasBlockAt(gx, gy, currentHeight, null, currentLayer)){
    saveSnapshot();
    addBlock({gx, gy, gz:currentHeight, layer:currentLayer, color:key, srcH:TILES[key].srcH, yOffset:0});
    draw();
  }
});

// 從素材面板拖放到畫布（手機觸控）
let mobileDragKey = null;
let mobileDragEl = null;

function setupMobileTileDrag(btn, key){
  let timer = null;
  btn.addEventListener('touchstart', (e) => {
    timer = setTimeout(() => { // 150ms 長按啟動拖曳
      e.preventDefault();
      mobileDragKey = key;
      // 建立浮動預覽
      mobileDragEl = document.createElement('div');
      mobileDragEl.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.7;width:42px;height:42px;';
      const img = document.createElement('img');
      const td = TILES[key];
      const src2 = SOURCES.find(s => s.prefix === key.charAt(0));
      if(src2 && td) img.src = src2.base + td.file;
      img.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      mobileDragEl.appendChild(img);
      document.body.appendChild(mobileDragEl);
      const t = e.touches[0];
      mobileDragEl.style.left = (t.clientX - 21) + 'px';
      mobileDragEl.style.top = (t.clientY - 21) + 'px';
    }, 100);
  }, {passive:false});

  btn.addEventListener('touchmove', (e) => {
    if(mobileDragKey){
      e.preventDefault();
      const t = e.touches[0];
      if(mobileDragEl){
        mobileDragEl.style.left = (t.clientX - 21) + 'px';
        mobileDragEl.style.top = (t.clientY - 21) + 'px';
      }
      // 暫存區高亮
      const slot = findStagingSlotAt(t.clientX, t.clientY);
      stagingHighlight(slot >= 0);
    } else {
      clearTimeout(timer);
    }
  }, {passive:false});

  btn.addEventListener('touchend', (e) => {
    clearTimeout(timer);
    if(mobileDragKey && mobileDragEl){
      const t = e.changedTouches[0];
      stagingHighlight(false);
      // 先檢查暫存區
      const slot = findStagingSlotAt(t.clientX, t.clientY);
      if(slot >= 0){
        addToStaging(mobileDragKey, TILES[mobileDragKey].srcH);
      } else {
        // 放到畫布
        const r = canvas.getBoundingClientRect();
        if(t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom){
          const mx = t.clientX - r.left, my = t.clientY - r.top;
          const g = toGrid(mx, my);
          const gx = snap(g.gx), gy = snap(g.gy);
          if(!hasBlockAt(gx, gy, currentHeight, null, currentLayer)){
            saveSnapshot();
            addBlock({gx, gy, gz:currentHeight, layer:currentLayer, color:mobileDragKey, srcH:TILES[mobileDragKey].srcH, yOffset:0});
            draw();
          }
        }
      }
      mobileDragEl.remove();
      mobileDragEl = null;
      mobileDragKey = null;
    }
  });
}

// 手機觸控：單指操作 + 雙指縮放
let pinch = null; // {dist, zoom0, cx, cy}

canvas.addEventListener('touchstart', (e) => {
  if(e.touches.length === 2){
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const r = canvas.getBoundingClientRect();
    pinch = {
      dist,
      zoom0: zoom,
      cx: (t0.clientX + t1.clientX) / 2 - r.left,
      cy: (t0.clientY + t1.clientY) / 2 - r.top
    };
    return;
  }
  pinch = null;
  onDown(e);
}, {passive:false});

canvas.addEventListener('touchmove', (e) => {
  if(pinch && e.touches.length === 2){
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const before = toGrid(pinch.cx, pinch.cy);
    zoom = Math.max(0.15, Math.min(3, pinch.zoom0 * (dist / pinch.dist)));
    const after = toScreen(before.gx, before.gy, 0);
    camX += pinch.cx - after.x;
    camY += pinch.cy - after.y;
    draw();
    return;
  }
  onMove(e);
}, {passive:false});

let lastTapTime = 0;
canvas.addEventListener('touchend', (e) => {
  if(pinch){ pinch = null; return; }
  onUp(e);
  // 手機雙擊刪除
  const now = Date.now();
  if(now - lastTapTime < 300 && e.changedTouches.length === 1){
    const t = e.changedTouches[0];
    const r = canvas.getBoundingClientRect();
    const fakeE = {clientX:t.clientX, clientY:t.clientY, preventDefault(){}};
    onDbl(fakeE);
  }
  lastTapTime = now;
});


// ── 素材定位 ──
function jumpToTile(tileKey){
  const prefix = tileKey.charAt(0);
  const idx = parseInt(tileKey.slice(1));
  for(let si = 0; si < SOURCES.length; si++){
    const src = SOURCES[si];
    if(src.prefix !== prefix) continue;
    for(let ci = 0; ci < src.cats.length; ci++){
      if(src.cats[ci].tiles.includes(idx)){
        document.getElementById('srcSelect').value = si;
        selectedSrc = si;
        buildCatOptions();
        document.getElementById('catSelect').value = ci;
        selectedCat = ci;
        populatePalette();
        const btns = document.querySelectorAll('#tilePalette .tb');
        for(const btn of btns){
          if(btn.title && btn.title.startsWith(tileKey)){
            btn.style.outline = '2px solid #FFD700';
            btn.scrollIntoView({behavior:'smooth', block:'nearest'});
            setTimeout(() => { btn.style.outline = ''; }, 2000);
            break;
          }
        }
        return;
      }
    }
  }
}

// ── 素材面板（下拉選單） ──
let selectedSrc = -1; // -1 = 全部來源
let selectedCat = 0;

function populatePalette(){
  const container = document.getElementById('tilePalette');
  container.innerHTML = '';
  const catSel = document.getElementById('catSelect');
  const catLabel = catSel.options[catSel.selectedIndex]?.text || '';

  // 收集要顯示的素材
  const items = [];
  const srcList = selectedSrc === -1 ? SOURCES : [SOURCES[selectedSrc]];
  for(const src of srcList){
    for(const cat of src.cats){
      if(cat.label !== catLabel) continue;
      for(const i of cat.tiles){
        const key = src.prefix + String(i).padStart(3,'0');
        items.push({key, src, i});
      }
    }
  }

  for(const {key, src, i} of items){
    const btn = document.createElement('button');
    btn.className = 'tb';
    btn.title = key + ' [' + src.label + ']';
    const img = document.createElement('img');
    img.src = src.base + src.fileOf(i);
    btn.appendChild(img);
    const num = document.createElement('span');
    num.className = 'tb-num';
    num.textContent = src.prefix + i;
    btn.appendChild(num);
    btn.addEventListener('click', () => {
      const srcH = (TILES[key] && TILES[key].srcH) || 32;
      if(brushMode){ brushTile = {color:key, srcH}; updateBrushIndicator(); return; }
      addToStaging(key, srcH);
    });
    // 拖曳到畫布（PC + 手機）
    btn.draggable = true;
    btn.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', key); });
    setupMobileTileDrag(btn, key);
    container.appendChild(btn);
  }
}

function buildCatOptions(){
  const catSel = document.getElementById('catSelect');
  const prevVal = catSel.value;
  catSel.innerHTML = '';
  // 收集類型（依來源篩選或全部）
  const labelSet = new Map();
  const srcList = selectedSrc === -1 ? SOURCES : [SOURCES[selectedSrc]];
  for(const src of srcList){
    for(const cat of src.cats){
      if(!labelSet.has(cat.label)) labelSet.set(cat.label, 0);
      labelSet.set(cat.label, labelSet.get(cat.label) + 1);
    }
  }
  let idx = 0;
  let defaultIdx = 0;
  for(const [label, count] of labelSet){
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = label + (selectedSrc === -1 && count > 1 ? ' ('+count+')' : '');
    opt.dataset.label = label;
    if(label === '草皮') defaultIdx = idx;
    catSel.appendChild(opt);
    idx++;
  }
  catSel.value = defaultIdx;
}

function initSelectors(){
  const srcSel = document.getElementById('srcSelect');
  // 來源下拉
  const allOpt = document.createElement('option');
  allOpt.value = -1; allOpt.textContent = '全部來源';
  srcSel.appendChild(allOpt);
  SOURCES.forEach((src, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = src.label;
    srcSel.appendChild(opt);
  });
  srcSel.value = -1;

  srcSel.addEventListener('change', () => {
    selectedSrc = parseInt(srcSel.value);
    buildCatOptions();
    populatePalette();
  });

  const catSel = document.getElementById('catSelect');
  catSel.addEventListener('change', () => {
    populatePalette();
  });

  buildCatOptions();
  populatePalette();
}
initSelectors();

// ── 素材搜尋 ──
document.getElementById('tileSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if(!q){ populatePalette(); return; }
  const container = document.getElementById('tilePalette');
  container.innerHTML = '';
  for(const src of SOURCES){
    for(let i = 0; i < src.count; i++){
      const file = src.fileOf(i).toLowerCase();
      const key = src.prefix + String(i).padStart(3,'0');
      if(file.includes(q) || key.includes(q)){
        const btn = document.createElement('button');
        btn.className = 'tb';
        btn.title = key + ' [' + src.label + '] ' + src.fileOf(i);
        const img = document.createElement('img');
        img.src = src.base + src.fileOf(i);
        btn.appendChild(img);
        const num = document.createElement('span');
        num.className = 'tb-num';
        num.textContent = src.prefix + i;
        btn.appendChild(num);
        btn.addEventListener('click', () => {
          const srcH = (TILES[key] && TILES[key].srcH) || 32;
          if(brushMode){ brushTile = {color:key, srcH}; updateBrushIndicator(); return; }
          addToStaging(key, srcH);
        });
        btn.draggable = true;
        btn.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', key); });
        setupMobileTileDrag(btn, key);
        container.appendChild(btn);
      }
    }
  }
});

// ── 高度 + 圖層切換 ──
function updateHeightUI(){
  const el = document.getElementById('heightNum');
  if(el) el.textContent = currentHeight;
}
function updateLayerUI(){
  const el = document.getElementById('layerNum');
  if(el) el.textContent = currentLayer;
}
document.getElementById('heightUp').addEventListener('click', () => {
  if(currentHeight < 5){ currentHeight++; updateHeightUI(); draw(); }
});
document.getElementById('heightDown').addEventListener('click', () => {
  if(currentHeight > -5){ currentHeight--; updateHeightUI(); draw(); }
});
document.getElementById('layerUp').addEventListener('click', () => {
  if(currentLayer < 5){ currentLayer++; updateLayerUI(); draw(); }
});
document.getElementById('layerDown').addEventListener('click', () => {
  if(currentLayer > 0){ currentLayer--; updateLayerUI(); draw(); }
});

// ── 返回 / 復原 ──
function saveSnapshot(){
  history.push(JSON.stringify(blocks));
  if(history.length > 50) history.shift();
  redoStack = [];
}
function doUndo(){
  if(history.length === 0) return;
  redoStack.push(JSON.stringify(blocks));
  setBlocks(JSON.parse(history.pop()));
  selectedBlocks = new Set();
  draw();
}
function doRedo(){
  if(redoStack.length === 0) return;
  history.push(JSON.stringify(blocks));
  setBlocks(JSON.parse(redoStack.pop()));
  selectedBlocks = new Set();
  draw();
}
document.getElementById('undoBtn').addEventListener('click', doUndo);
document.getElementById('redoBtn').addEventListener('click', doRedo);
document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === 'z'){ e.preventDefault(); doUndo(); }
  if(e.ctrlKey && e.key === 'y'){ e.preventDefault(); doRedo(); }
  if(e.ctrlKey && e.key === 'c'){
    // Ctrl+C 複製選取
    if(selectedBlocks.size > 0){
      e.preventDefault();
      const sel = [...selectedBlocks];
      const minGx = Math.min(...sel.map(b=>b.gx)), minGy = Math.min(...sel.map(b=>b.gy));
      clipboard = sel.map(b => ({dx:b.gx-minGx, dy:b.gy-minGy, color:b.color, srcH:b.srcH, yOffset:b.yOffset||0}));
    }
  }
  if(e.ctrlKey && e.key === 'v'){
    // Ctrl+V 貼上到畫面中央
    if(clipboard && clipboard.length > 0){
      e.preventDefault();
      saveSnapshot();
      const center = toGrid(W/2, H/2);
      const gx = snap(center.gx), gy = snap(center.gy);
      for(const t of clipboard){
        const nx = gx+t.dx, ny = gy+t.dy;
        if(!hasBlockAt(nx, ny, currentHeight, null, currentLayer)){
          addBlock({gx:nx, gy:ny, gz:currentHeight, layer:currentLayer, color:t.color, srcH:t.srcH, yOffset:t.yOffset});
        }
      }
      selectedBlocks = new Set();
      draw();
    }
  }
});

document.getElementById('clearBtn').addEventListener('click', () => {
  saveSnapshot();
  setBlocks([]); draw();
});

// ── 勾選開關 ──
// 繪製工具互斥
function clearDrawTools(except){
  const tools = {chkBrush:'brushMode',chkEraser:'eraserMode',chkFill:'fillMode',chkRect:'rectMode',chkLine:'lineMode'};
  for(const [id, v] of Object.entries(tools)){
    if(id !== except){ window[v.replace('Mode','Mode')] = false; document.getElementById(id).checked = false; }
  }
  // 靠直接賦值
  if(except!=='chkBrush') brushMode = false;
  if(except!=='chkEraser') eraserMode = false;
  if(except!=='chkFill') fillMode = false;
  if(except!=='chkRect') rectMode = false;
  if(except!=='chkLine') lineMode = false;
  rectStart = null;
  canvas.style.cursor = (except && document.getElementById(except).checked) ? 'crosshair' : 'grab';
}
document.getElementById('chkBrush').removeEventListener('change',()=>{});
document.getElementById('chkBrush').addEventListener('change', (e) => { clearDrawTools('chkBrush'); brushMode = e.target.checked; canvas.style.cursor = brushMode?'crosshair':'grab'; });
document.getElementById('chkEraser').removeEventListener('change',()=>{});
document.getElementById('chkEraser').addEventListener('change', (e) => { clearDrawTools('chkEraser'); eraserMode = e.target.checked; canvas.style.cursor = eraserMode?'crosshair':'grab'; });
document.getElementById('chkFill').addEventListener('change', (e) => { clearDrawTools('chkFill'); fillMode = e.target.checked; canvas.style.cursor = fillMode?'crosshair':'grab'; });
document.getElementById('chkRect').addEventListener('change', (e) => { clearDrawTools('chkRect'); rectMode = e.target.checked; canvas.style.cursor = rectMode?'crosshair':'grab'; });
document.getElementById('chkLine').addEventListener('change', (e) => { clearDrawTools('chkLine'); lineMode = e.target.checked; canvas.style.cursor = lineMode?'crosshair':'grab'; });
document.getElementById('chkMinimap').addEventListener('change', (e) => { showMinimap = e.target.checked; draw(); });
document.getElementById('chkSelect').addEventListener('change', (e) => { selectMode = e.target.checked; });
document.getElementById('chkLocate').addEventListener('change', (e) => { locateMode = e.target.checked; });
document.getElementById('chkCopy').addEventListener('change', (e) => { copyMode = e.target.checked; });
document.getElementById('chkHover').addEventListener('change', (e) => { showHover = e.target.checked; hoverBlock = null; draw(); });
document.getElementById('chkGrid').addEventListener('change', (e) => { showGrid = e.target.checked; draw(); });
document.getElementById('chkVGrid').addEventListener('change', (e) => { showVGrid = e.target.checked; draw(); });
document.getElementById('chkCoord').addEventListener('change', (e) => { showCoords = e.target.checked; draw(); });

// ── 回到原點 ──
document.getElementById('homeBtn').addEventListener('click', () => {
  camX = 0; camY = 0; zoom = 1; draw();
});

// ── 匯出地圖為圖片 ──
document.getElementById('exportImg').addEventListener('click', () => {
  if(blocks.length === 0){ alert('沒有方塊可匯出'); return; }
  // 暫存狀態
  const oldCamX = camX, oldCamY = camY, oldZoom = zoom;
  const oldHH = new Set(hiddenHeights), oldHL = new Set(hiddenLayers);
  const oldGrid = showGrid, oldVGrid = showVGrid, oldCoord = showCoords;
  // 關閉格線等裝飾
  hiddenHeights = new Set(); hiddenLayers = new Set();
  showGrid = false; showVGrid = false; showCoords = false;
  // 計算邊界並置中
  let minGx=Infinity, maxGx=-Infinity, minGy=Infinity, maxGy=-Infinity, minGz=Infinity, maxGz=-Infinity;
  for(const b of blocks){
    minGx=Math.min(minGx,b.gx); maxGx=Math.max(maxGx,b.gx);
    minGy=Math.min(minGy,b.gy); maxGy=Math.max(maxGy,b.gy);
    minGz=Math.min(minGz,b.gz); maxGz=Math.max(maxGz,b.gz);
  }
  zoom = 1; camX = 0; camY = 0;
  const cx = (minGx+maxGx)/2, cy = (minGy+maxGy)/2, cz = (minGz+maxGz)/2;
  const cp = toScreen(cx, cy, cz);
  camX = W/2 - cp.x;
  camY = H/2 - cp.y;
  draw();
  // 下載
  try {
    const link = document.createElement('a');
    link.download = 'map_' + new Date().toISOString().slice(0,10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch(e) {
    alert('本地開啟無法匯出圖片，請用 GitHub Pages 或本地伺服器開啟');
  }
  // 還原
  camX = oldCamX; camY = oldCamY; zoom = oldZoom;
  hiddenHeights = oldHH; hiddenLayers = oldHL;
  showGrid = oldGrid; showVGrid = oldVGrid; showCoords = oldCoord;
  draw();
});

// ── 圖層可見度 ──
(function(){
  const sel = document.getElementById('hideHeight');
  for(let h = -5; h <= 5; h++){
    const opt = document.createElement('option');
    opt.value = h; opt.textContent = '高度 ' + h;
    sel.appendChild(opt);
  }
})();
document.getElementById('hideHeightBtn').addEventListener('click', () => {
  const v = parseInt(document.getElementById('hideHeight').value);
  if(isNaN(v)) return;
  if(hiddenHeights.has(v)) hiddenHeights.delete(v);
  else hiddenHeights.add(v);
  document.getElementById('hideHeightBtn').textContent = hiddenHeights.has(v) ? '顯示' : '隱藏';
  draw();
});
document.getElementById('hideHeight').addEventListener('change', () => {
  const v = parseInt(document.getElementById('hideHeight').value);
  document.getElementById('hideHeightBtn').textContent = hiddenHeights.has(v) ? '顯示' : '隱藏';
});
document.getElementById('showAllBtn').addEventListener('click', () => {
  hiddenHeights.clear(); hiddenLayers.clear(); draw();
});

// ── 儲存 / 載入 ──
document.getElementById('saveBtn').addEventListener('click', () => {
  const data = JSON.stringify({blocks, camX, camY, zoom, currentHeight, currentLayer});
  localStorage.setItem('blockBuilder_save', data);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'block_save_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
});

document.getElementById('loadBtn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.addEventListener('change', () => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if(data.blocks) setBlocks(data.blocks);
        if(data.camX !== undefined) camX = data.camX;
        if(data.camY !== undefined) camY = data.camY;
        if(data.zoom !== undefined) zoom = data.zoom;
        if(data.currentHeight !== undefined){ currentHeight = data.currentHeight; updateHeightUI(); }
        if(data.currentLayer !== undefined){ currentLayer = data.currentLayer; updateLayerUI(); }
        draw();
      } catch(e){ alert('載入失敗：' + e.message); }
    };
    reader.readAsText(input.files[0]);
  });
  input.click();
});

// ── 自訂組合 ──
let combos = JSON.parse(localStorage.getItem('blockBuilder_combos') || '[]');
let activeCombo = -1;
let comboPlaceMode = false;

function saveCombos(){
  localStorage.setItem('blockBuilder_combos', JSON.stringify(combos));
}

function renderComboSelect(){
  const sel = document.getElementById('comboSelect');
  sel.innerHTML = '<option value="">-- 選擇範本 --</option>';
  combos.forEach((combo, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = combo.name + ' (' + combo.tiles.length + ')';
    sel.appendChild(opt);
  });
  if(activeCombo >= 0 && activeCombo < combos.length) sel.value = activeCombo;
}

document.getElementById('comboSelect').addEventListener('change', (e) => {
  activeCombo = e.target.value === '' ? -1 : parseInt(e.target.value);
});

document.getElementById('comboSave').addEventListener('click', () => {
  const sel = [...selectedBlocks];
  if(sel.length < 2){ alert('請先 Shift+點擊 選取 2 個以上相鄰方塊，或是開啟選取開關'); return; }
  const name = prompt('範本名稱：', '範本' + (combos.length + 1));
  if(!name) return;
  const minGx = Math.min(...sel.map(b => b.gx));
  const minGy = Math.min(...sel.map(b => b.gy));
  const tiles = sel.map(b => ({dx:b.gx - minGx, dy:b.gy - minGy, color:b.color, srcH:b.srcH}));
  combos.push({name, tiles});
  saveCombos();
  selectedBlocks = new Set();
  renderComboSelect();
  draw();
});

document.getElementById('comboPlace').addEventListener('click', () => {
  if(activeCombo < 0 || activeCombo >= combos.length){ alert('請先選擇一個範本'); return; }
  const combo = combos[activeCombo];
  saveSnapshot();
  const spot = findEmptySpot();
  for(const t of combo.tiles){
    const gx = spot.gx + t.dx;
    const gy = spot.gy + t.dy;
    if(!hasBlockAt(gx, gy, currentHeight, null, currentLayer)){
      addBlock({gx, gy, gz:currentHeight, layer:currentLayer, color:t.color, srcH:t.srcH});
    }
  }
  draw();
});

document.getElementById('comboDel').addEventListener('click', () => {
  if(activeCombo < 0 || activeCombo >= combos.length){ alert('請先選擇一個範本'); return; }
  combos.splice(activeCombo, 1);
  activeCombo = -1;
  saveCombos();
  renderComboSelect();
});

renderComboSelect();

// ── 預設方塊 ──
const init = [
  {gx:0,gy:0,color:'t000'},{gx:1,gy:0,color:'t010'},{gx:2,gy:0,color:'t015'},
  {gx:0,gy:1,color:'t027'},{gx:1,gy:1,color:'t040'},{gx:2,gy:1,color:'t063'},
  {gx:0,gy:2,color:'t090'},{gx:1,gy:2,color:'t000'},{gx:2,gy:2,color:'t027'},
];
init.forEach(d => {
  const srcH = (TILES[d.color] && TILES[d.color].srcH) || 32;
  addBlock({gx:d.gx, gy:d.gy, gz:0, layer:0, color:d.color, srcH:srcH});
});

// ── 操作說明面板 ──
// ── 收折面板 ──
document.querySelectorAll('.fold-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.dataset.target);
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'flex';
    btn.classList.toggle('open', !isOpen);
    btn.textContent = btn.textContent.replace(isOpen ? '▲' : '▼', isOpen ? '▼' : '▲');
  });
});

const helpHTML = `
<h3>工具箱（互斥，收折面板）</h3>
<kbd>筆刷</kbd> — 點素材選為筆刷，畫布上點擊/拖曳連續放置<br>
<kbd>橡皮擦</kbd> — 點擊/拖曳連續刪除<br>
<kbd>填充</kbd> — 游標移動顯示半透明預覽，點擊確認填充（上限 500 格）<br>
<kbd>矩形</kbd> — 按住拖曳顯示預覽範圍，放開填充<br>
<kbd>線段</kbd> — 按住拖曳顯示預覽路線，放開填充

<h3>基本操作</h3>
<kbd>左鍵</kbd> 拖曳方塊 — 移動（被四面包圍無法移動）<br>
<kbd>Ctrl</kbd>+<kbd>拖曳</kbd> — 複製並拖曳副本<br>
拖曳中 <kbd>滾輪</kbd> — 微調素材高度（1/5 格）<br>
<kbd>雙擊</kbd> / <kbd>右鍵</kbd> — 刪除方塊<br>
空白處拖曳 — 平移視角<br>
<kbd>滾輪</kbd> / 雙指捏合 — 縮放

<h3>高度與圖層</h3>
<kbd>高度 ▲▼</kbd> — 垂直高度（-5 ~ +5）<br>
<kbd>圖層 ▲▼</kbd> — 重疊圖層（0 ~ 5）<br>
<kbd>隱藏高度</kbd> — 隱藏/顯示指定高度層<br>
只能操作當前高度 + 圖層的方塊

<h3>選取與整組操作</h3>
<kbd>Shift</kbd>+<kbd>點擊</kbd> — 高亮相鄰方塊群組<br>
<kbd>Shift</kbd>+<kbd>拖曳</kbd> — 框選區域<br>
拖曳高亮方塊 — 整組移動<br>
點擊空白 — 取消高亮

<h3>範本</h3>
高亮 2+ 方塊 → <kbd>儲存</kbd> → 命名<br>
選範本 → <kbd>放置</kbd> → 一鍵放入

<h3>顯示工具</h3>
<h3>顯示類（收折面板）</h3>
<kbd>懸停</kbd> 反白 | <kbd>格線</kbd> 水平 | <kbd>立體</kbd> 垂直 | <kbd>座標</kbd> 座標 | <kbd>小地圖</kbd> 右下縮覽

<h3>檔案操作</h3>
<kbd>Ctrl+Z</kbd> 返回 | <kbd>Ctrl+Y</kbd> 復原 | <kbd>Ctrl+C</kbd> 複製選取 | <kbd>Ctrl+V</kbd> 貼上<br>
<kbd>儲存</kbd> JSON | <kbd>載入</kbd> JSON | <kbd>匯出圖</kbd> PNG<br>
<kbd>原點</kbd> 回到 (0,0) | <kbd>清除全部</kbd><br>
<kbd>搜尋</kbd> — 輸入關鍵字篩選全部素材（檔名或編號）

<h3>快捷類（收折面板）</h3>
<kbd>選取</kbd> 取代 Shift（選取/框選）| <kbd>定位</kbd> 點方塊跳到素材面板 | <kbd>複製</kbd> 取代 Ctrl（複製拖曳）<br>
雙指捏合縮放 | 暫存區快速放置
`;
document.getElementById('helpPanel').innerHTML = helpHTML;
document.getElementById('hintToggle').addEventListener('click', () => {
  const panel = document.getElementById('helpPanel');
  const toggle = document.getElementById('hintToggle');
  if(panel.style.display === 'none'){
    panel.style.display = 'block';
    toggle.textContent = '操作說明 ▲';
  } else {
    panel.style.display = 'none';
    toggle.textContent = '操作說明 ▼';
  }
});

window.addEventListener('resize', resize);
resize();
})();
