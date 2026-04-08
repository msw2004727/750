(function(){
// ── constants.js ──
const TILE = 40;
const ANG = Math.PI / 6;
const COS = Math.cos(ANG);
const SIN = Math.sin(ANG);
const TW = TILE * COS;
const TH = TILE * SIN;
const CUBE_H = TILE * 0.8;


// ── state.js ──
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ── Separated sub-objects ──
const world = { blocks: [], fogRadius: 0, fogCenter: { gx: 0, gy: 0 } };
const camera = { x: 0, y: 0, zoom: 1, W: 0, H: 0 };
const game = { running: false, resources: {}, lastTick: 0 };

const S = {
  // Selection
  selectedBlocks: new Set(),
  groupOffsets: null,
  boxSelect: null,

  // History
  history: [],
  redoStack: [],

  // Drag
  dragBlock: null,
  dragOffX: 0, dragOffY: 0,
  lastValidGx: 0, lastValidGy: 0,

  // Animation
  shakeBlock: null, shakeStart: 0,
  animTick: 0,

  // Pan
  panDrag: false,
  panStartX: 0, panStartY: 0,
  panCamStartX: 0, panCamStartY: 0,

  // Navigation
  reachableSet: null,
  currentHeight: 0,
  currentLayer: 0,

  // Display toggles
  showCoords: false, showGrid: false, showVGrid: false, showBlockInfo: false,
  showHover: false, showMinimap: false, showLayerInfo: false,
  hoverBlock: null,

  // Tool modes
  selectMode: false, locateMode: false, copyMode: false,
  autoSelectMode: false,
  brushMode: false, eraserMode: false,
  fillMode: false, rectMode: false, lineMode: false,

  // Brush state
  brushTile: null, brushPainting: false,
  brushCursorGx: -999, brushCursorGy: -999,

  // Shape tools
  rectStart: null, fillPreview: [],

  // Clipboard
  clipboard: null,

  // Mouse tracking
  lastMouseClientX: 0, lastMouseClientY: 0,
  canvasDragOverlay: null,

  // Visibility
  hiddenHeights: new Set(),
  hiddenLayers: new Set(),

  // Tile drag (palette -> canvas/staging)
  tileDrag: null,

  // Mobile drag
  mobileDragKey: null, mobileDragEl: null,

  // Staging
  staging: new Array(3).fill(null),

  // Palette
  selectedSrc: -1, selectedCat: 0,

  // Context menu
  ctxMenu: null,

  // Combos
  combos: JSON.parse(localStorage.getItem('blockBuilder_combos') || '[]'),
  activeCombo: -1,

  // Pinch zoom
  pinch: null, lastTapTime: 0,

  // Render flag
  _dirty: true,
  animBlockCount: 0,
};

// ── draw() sets dirty flag — gameLoop does the actual render ──
function draw() { S._dirty = true; }


// ── eventBus.js ──
const listeners = new Map();

const bus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(handler);
  },
  off(event, handler) {
    const arr = listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(handler);
      if (idx >= 0) arr.splice(idx, 1);
    }
  },
  emit(event, data) {
    const arr = listeners.get(event);
    if (arr) for (const fn of [...arr]) fn(data);
  },
};


// ── tileData.js ──

// ── Image base paths ──
const IMG_BASE_A = '%E7%B4%A0%E6%9D%90/isometric%20tileset/separated%20images/';
const IMG_BASE_B = '%E7%B4%A0%E6%9D%90/isometric_jumpstart_v230311/separated/';
const IMG_BASE_C = '%E7%B4%A0%E6%9D%90/3232iso/';
const IMG_BASE_D = '%E7%B4%A0%E6%9D%90/Isometric%20Strategy/';
const MEDIEVAL_VARIANTS = [
  {key:'mw1',  label:'日間', prefix:'m'},
  {key:'mw2',  label:'夜間', prefix:'n'},
  {key:'mw3',  label:'原色', prefix:'o'},
  {key:'mw1w', label:'冬季', prefix:'p'},
  {key:'mw2w', label:'冬夜', prefix:'q'},
  {key:'mw3w', label:'冬原', prefix:'r'},
];

function tileFile(i){ return 'tile_' + String(i).padStart(3,'0') + '.png'; }

// ── Crop / height arrays ──
const CROP_A = [8,8,8,8,8,8,8,8,8,8,8,8,8,7,8,8,8,8,8,8,8,9,4,3,6,8,8,6,8,4,6,4,2,6,2,8,3,4,4,3,8,11,16,9,6,8,14,17,12,6,13,10,10,13,7,3,5,6,10,2,0,7,10,7,0,4,7,8,2,7,10,8,0,2,4,16,11,10,8,0,2,4,19,19,19,21,12,12,12,12,12,12,12,12,12,16,16,16,16,16,16,16,16,16,12,12,12,12,12,12,12,12,12,12,8];
const CROP_B = [10,12,11,12,12,12,12,12,15,15,14,8,8,8,0,2,3,4,2,4,4,4,4,4,7,7,6,8,8,8,8,8,0,0,0,0,0,0,0,0,27,21,27,21,0,0,0,0,8,8,8,8,8,8,8,8,8,8,0,0,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,8,8,8,8,8,8,8,8,8,8,8,6,7,6,5,10,12,11,12,12,12,12,12,15,15,14,10,11,10,9,0,0,0,0,0,3,4,2,4,4,4,4,4,7,7,6,8,8,8,8,8];
const SRCH_B = [48,48,48,48,48,48,48,48,48,48,48,48,48,48,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,48,48,48,48,48,48,48,48,48,48,48,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32];

const FILES_C = ["acid.png","acidfull.png","barrel.png","barreldark.png","chestdark.png","chestdarkl.png","chestdarkopenr.png","chestdarkr.png","chestl.png","chestopendarkl.png","chestopenl.png","chestopenr.png","chestr.png","crate.png","dirt.png","dirtdark.png","dirtdarkfull.png","dirtfull.png","dirtgrass.png","dirtgrassfull.png","dirtgreendark.png","dirtgreendarkfull.png","fish.png","flowers.png","flowersdark.png","grass.png","grassbush.png","grassbushdark.png","grassdark.png","grassdarkfull.png","grassfull.png","grassweeds.png","grassweedsdark.png","lava.png","lavadark.png","lavadarkfull.png","lavafull.png","poppy.png","poppydark.png","rug.png","sand.png","sandfull.png","slimegreen.png","slimegreenfull.png","slimepurple.png","slimepurplefull.png","snow.png","snowfull.png","stone.png","stoneblue.png","stonebluebridgedown.png","stonebluebridgeup.png","stonebluebroke.png","stonebluedown.png","stonebluefull.png","stonebluehalf.png","stonebluehalf2.png","stonebluepillar.png","stonebluerocks.png","stoneblueup.png","stonebrick.png","stonebrickblue.png","stonebrickbluefull.png","stonebrickdark.png","stonebrickdarkfull.png","stonebrickfull.png","stonebridgedown.png","stonebridgeup.png","stonebroke.png","stonebutton.png","stonebuttonblue.png","stonebuttonbluepressed.png","stonebuttondark.png","stonebuttondarkpressed.png","stonebuttonpressed.png","stonedark.png","stonedarkbridgedown.png","stonedarkbridgeup.png","stonedarkbroke.png","stonedarkdown.png","stonedarkfull.png","stonedarkhalf.png","stonedarkhalf2.png","stonedarkpillar.png","stonedarkrocks.png","stonedarkup.png","stonedown.png","stonefull.png","stonehalf.png","stonehalf2.png","stonepillar.png","stonerocks.png","stonetorchbluel.png","stonetorchbluer.png","stonetorchdarkl.png","stonetorchdarkr.png","stonetorchl.png","stonetorchr.png","stoneup.png","stonewindowarcher.png","stonewindowarcherblue.png","stonewindowarcherbluel.png","stonewindowarcherdarkl.png","stonewindowarcherdarkr.png","stonewindowarcherl.png","stonewindowbluel.png","stonewindowbluer.png","stonewindowdarkl.png","stonewindowdarkr.png","stonewindowl.png","stonewindowr.png","stonewindowwoodbluel.png","stonewindowwoodbluer.png","stonewindowwooddarkl.png","stonewindowwooddarkr.png","stonewindowwoodl.png","stonewindowwoodr.png","tulips.png","tulipsdark.png","wallflagl.png","wallflagr.png","water.png","waterdark.png","waterdarkfull.png","waterfull.png","wood.png","woodbroke.png","wooddark.png","wooddarkbroke.png","wooddarkflip.png","wooddarkfull.png","wooddarkfullflip.png","wooddarkhalf.png","wooddarkpillar.png","wooddoorl.png","wooddoorr.png","woodflip.png","woodfull.png","woodfullflip.png","woodhalf.png","woodpillar.png","woodtorchl.png","woodtorchr.png"];
const CROP_C = [10,0,2,2,4,3,1,3,3,1,1,1,3,4,8,8,0,0,8,0,8,0,17,2,2,8,2,2,8,0,0,8,8,10,10,0,0,2,2,10,8,0,10,0,10,0,8,0,8,8,0,0,8,8,0,11,8,0,4,8,8,8,0,8,0,0,0,0,8,10,10,12,10,12,12,8,0,0,8,8,0,11,8,0,4,8,8,0,11,8,0,4,14,14,14,14,14,14,8,14,14,14,14,14,14,15,15,15,15,15,15,14,14,14,14,14,14,0,0,13,13,10,10,0,0,8,8,8,8,8,0,0,12,0,11,11,8,0,0,12,0,13,13];

const FILES_D = [
"grass_path_folder/grass_path_1.png","grass_path_folder/grass_path_10.png","grass_path_folder/grass_path_11.png","grass_path_folder/grass_path_12.png","grass_path_folder/grass_path_13.png","grass_path_folder/grass_path_14.png","grass_path_folder/grass_path_15.png","grass_path_folder/grass_path_16.png","grass_path_folder/grass_path_2.png","grass_path_folder/grass_path_3.png","grass_path_folder/grass_path_4.png","grass_path_folder/grass_path_5.png","grass_path_folder/grass_path_6.png","grass_path_folder/grass_path_7.png","grass_path_folder/grass_path_8.png","grass_path_folder/grass_path_9.png",
"wall_folder/wall_1.png","wall_folder/wall_10.png","wall_folder/wall_11.png","wall_folder/wall_12.png","wall_folder/wall_13.png","wall_folder/wall_14.png","wall_folder/wall_15.png","wall_folder/wall_16.png","wall_folder/wall_2.png","wall_folder/wall_3.png","wall_folder/wall_4.png","wall_folder/wall_5.png","wall_folder/wall_6.png","wall_folder/wall_7.png","wall_folder/wall_8.png","wall_folder/wall_9.png",
"weat_folder/weat_1.png","weat_folder/weat_10.png","weat_folder/weat_11.png","weat_folder/weat_12.png","weat_folder/weat_13.png","weat_folder/weat_14.png","weat_folder/weat_15.png","weat_folder/weat_16.png","weat_folder/weat_2.png","weat_folder/weat_3.png","weat_folder/weat_4.png","weat_folder/weat_5.png","weat_folder/weat_6.png","weat_folder/weat_7.png","weat_folder/weat_8.png","weat_folder/weat_9.png",
"water_folder/water_sheet_small1.png","water_folder/water_sheet_small10.png","water_folder/water_sheet_small11.png","water_folder/water_sheet_small12.png","water_folder/water_sheet_small13.png","water_folder/water_sheet_small14.png","water_folder/water_sheet_small15.png","water_folder/water_sheet_small16.png","water_folder/water_sheet_small2.png","water_folder/water_sheet_small3.png","water_folder/water_sheet_small4.png","water_folder/water_sheet_small5.png","water_folder/water_sheet_small6.png","water_folder/water_sheet_small7.png","water_folder/water_sheet_small8.png","water_folder/water_sheet_small9.png",
"other/box_1.png","other/box_2.png","other/box_3.png","other/bridge_small.png","other/gate1.png","other/gate2.png","other/grass.png","other/house.png","other/hut.png","other/path_box_1.png","other/path_box_2.png","other/path_box_3.png","other/podium.png","other/rock_1.png","other/sign_1.png","other/sign_2.png","other/sign_3.png","other/sign_4.png","other/tent.png","other/tent_2.png","other/tree_1.png","other/tree_2.png","other/tree_3.png","other/turf_house.png","other/well_1.png","other/well_2.png",
"animations/fire-Sheet.png","animations/flag-Sheet.png","animations/podium_flag-Sheet.png","animations/wind_mill-Sheet.png"
];
const CROP_D = [61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,36,28,28,28,28,28,28,28,28,28,28,28,28,28,37,27,48,58,48,48,48,48,58,58,48,48,48,58,48,48,48,48,32,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,54,57,57,60,36,36,61,33,31,61,56,61,55,61,51,45,42,52,55,55,52,44,51,56,46,52,37,22,22,16];
const SRCH_D = [100,100,100,100];
const FRAMES_D = [4,14,14,7];

// ── Source definitions ──
const SOURCES = [
  { key:'A', label:'Scrabling', base:IMG_BASE_A, count:115, prefix:'t',
    fileOf:i => tileFile(i), cropOf:i => CROP_A[i], srcHOf:() => 32,
    cats:[
      {label:'泥土', tiles:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14], stroke:'#3A2A1E', ghost:'#8B7355', elem:'土'},
      {label:'地層', tiles:[15,16,17],                            stroke:'#503820', ghost:'#A08060', elem:'土'},
      {label:'草皮', tiles:[18,19,20,21,22,23,24,25,26],          stroke:'#2A4A1E', ghost:'#6BA840', elem:'木'},
      {label:'草地', tiles:[27,28,37,38,39,40],                   stroke:'#2A4010', ghost:'#5B8B30', elem:'木'},
      {label:'灌木', tiles:[29,30,31,32,33,34,35,36],             stroke:'#1A3A0A', ghost:'#4A7A20', elem:'木'},
      {label:'花草', tiles:[41,42,43,44],                         stroke:'#6A2A4A', ghost:'#CC6699', elem:'木'},
      {label:'地物', tiles:[45,46,47],                            stroke:'#5A4A2A', ghost:'#AA8855', elem:'無'},
      {label:'木材', tiles:[48,49,50,51,52],                      stroke:'#4A3018', ghost:'#8B6040', elem:'無'},
      {label:'岩石', tiles:[53,54,55,56,57,58,59,60],             stroke:'#3A2818', ghost:'#7A5838', elem:'土'},
      {label:'石塊', tiles:[61,62,63,64,65,66,67,68],             stroke:'#3A4555', ghost:'#7A8A9A', elem:'土'},
      {label:'冰水', tiles:[69,70,71],                            stroke:'#2A4555', ghost:'#6A99AA', elem:'水'},
      {label:'冰晶', tiles:[72,73,74,75,76,77,78,79,80,81],       stroke:'#3A5566', ghost:'#8ABBCC', elem:'水'},
      {label:'粒子', tiles:[82,83,84,85],                         stroke:'#333',    ghost:'#666', elem:'無'},
      {label:'深水', tiles:[86,87,88,89,90,91,92,93,94],          stroke:'#0E1828', ghost:'#2A3555', elem:'水'},
      {label:'水面', tiles:[95,96,97,98,99,100,101,102,103],      stroke:'#1A3050', ghost:'#4A7099', elem:'水'},
      {label:'淺水', tiles:[104,105,106,107,108,109,110,111,112,113,114], stroke:'#2A5070', ghost:'#6AAACC', elem:'水'},
    ]},
  { key:'B', label:'Jumpstart', base:IMG_BASE_B, count:132, prefix:'j',
    fileOf:i => tileFile(i), cropOf:i => CROP_B[i], srcHOf:i => SRCH_B[i],
    cats:[
      {label:'高草地',   tiles:[0,1,2,3,4,5,6,7,8,9,10],                         stroke:'#2A4A1E', ghost:'#6BA840', elem:'木'},
      {label:'寶箱',     tiles:[11,12],                                           stroke:'#5A4A2A', ghost:'#AA8855', elem:'無'},
      {label:'怪物',     tiles:[13],                                              stroke:'#6A2A4A', ghost:'#CC6699', elem:'無'},
      {label:'草地',     tiles:[14,16,17,18,19,24,25,26,27],                      stroke:'#2A4010', ghost:'#5B8B30', elem:'木'},
      {label:'木箱',     tiles:[15,74,75],                                        stroke:'#4A3018', ghost:'#8B6040', elem:'無'},
      {label:'草石階',   tiles:[20,21,22,23],                                     stroke:'#3A5A2A', ghost:'#6A9A4A', elem:'無'},
      {label:'冰塊',     tiles:[28,29,30,31,44,45,46,47,68,69,70,71],             stroke:'#3A5566', ghost:'#8ABBCC', elem:'水'},
      {label:'泥土',     tiles:[32,33,34,35,48,49,50,51],                         stroke:'#3A2A1E', ghost:'#8B7355', elem:'土'},
      {label:'石磚',     tiles:[36,37,38,39,52,53,54,55],                         stroke:'#3A4555', ghost:'#7A8A9A', elem:'無'},
      {label:'水花',     tiles:[40,41],                                           stroke:'#1A3050', ghost:'#4A7099', elem:'水'},
      {label:'火焰',     tiles:[42,43],                                           stroke:'#AA3300', ghost:'#FF6633', elem:'火'},
      {label:'木橋',     tiles:[56,57,58,59,72,73,88,89,90,91],                   stroke:'#4A3018', ghost:'#8B6040', elem:'無'},
      {label:'岩漿',     tiles:[60,61,62,63,76,77,78,79],                         stroke:'#AA3300', ghost:'#FF6633', elem:'火'},
      {label:'深石',     tiles:[64,65,66,67,80,81,82,83],                         stroke:'#1A1A2A', ghost:'#3A3A5A', elem:'土'},
      {label:'冰磚',     tiles:[84,85,86,87],                                     stroke:'#2A5070', ghost:'#6AAACC', elem:'無'},
      {label:'碎石',     tiles:[92,93,94,95],                                     stroke:'#5A4A3A', ghost:'#8A7A6A', elem:'土'},
      {label:'枯草地',   tiles:[96,97,98,99,116,117,118,119],                     stroke:'#5A4A2A', ghost:'#AA8855', elem:'木'},
      {label:'枯草欄',   tiles:[100,101,102,103,120,121,122,123],                 stroke:'#4A3A1A', ghost:'#8A7A4A', elem:'無'},
      {label:'枯草短',   tiles:[104,105,106,107,108,109,110,124,125,126,127],     stroke:'#5A4A2A', ghost:'#9A8A5A', elem:'木'},
      {label:'水滴',     tiles:[111,112,113,114,115],                             stroke:'#2A5070', ghost:'#6AAACC', elem:'水'},
      {label:'冰階',     tiles:[128,129,130,131],                                 stroke:'#3A5566', ghost:'#8ABBCC', elem:'無'},
    ]},
  { key:'C', label:'3232iso', base:IMG_BASE_C, count:143, prefix:'c',
    fileOf:i => FILES_C[i], cropOf:i => CROP_C[i], srcHOf:() => 32,
    cats:[
      {label:'泥土',   tiles:[14,15,16,17,18,19,20,21],                     stroke:'#3A2A1E', ghost:'#8B7355', elem:'土'},
      {label:'草地',   tiles:[25,26,27,28,29,30,31,32],                     stroke:'#2A4010', ghost:'#5B8B30', elem:'木'},
      {label:'植物',   tiles:[23,24,37,38,117,118],                         stroke:'#6A2A4A', ghost:'#CC6699', elem:'木'},
      {label:'水',     tiles:[122,123,124,125],                             stroke:'#1A3050', ghost:'#4A7099', elem:'水'},
      {label:'岩漿',   tiles:[33,34,35,36],                                 stroke:'#AA3300', ghost:'#FF6633', elem:'火'},
      {label:'酸液',   tiles:[0,1],                                         stroke:'#3A6A1A', ghost:'#7ACC44', elem:'無'},
      {label:'史萊姆', tiles:[42,43,44,45],                                 stroke:'#4A2A6A', ghost:'#9966CC', elem:'無'},
      {label:'沙/雪',  tiles:[40,41,46,47],                                 stroke:'#8A7A5A', ghost:'#CCBB88', elem:'土'},
      {label:'石材',   tiles:[48,86,87,88,89,90,91,98,66,67,68],            stroke:'#6A6A6A', ghost:'#AAAAAA', elem:'土'},
      {label:'藍石',   tiles:[49,50,51,52,53,54,55,56,57,58,59],            stroke:'#3A5580', ghost:'#6688BB', elem:'土'},
      {label:'暗石',   tiles:[75,76,77,78,79,80,81,82,83,84,85],            stroke:'#3A3A4A', ghost:'#6A6A7A', elem:'金'},
      {label:'石磚',   tiles:[60,61,62,63,64,65],                           stroke:'#5A5A6A', ghost:'#8A8A9A', elem:'無'},
      {label:'按鈕',   tiles:[69,70,71,72,73,74],                           stroke:'#5A5A5A', ghost:'#9A9A9A', elem:'無'},
      {label:'火炬',   tiles:[92,93,94,95,96,97],                           stroke:'#AA6A1A', ghost:'#FFAA44', elem:'無'},
      {label:'石窗',   tiles:[99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116], stroke:'#5A5A6A', ghost:'#8A8A9A', elem:'無'},
      {label:'木材',   tiles:[126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142], stroke:'#4A3018', ghost:'#8B6040', elem:'無'},
      {label:'寶箱',   tiles:[2,3,4,5,6,7,8,9,10,11,12,13],                stroke:'#5A4A2A', ghost:'#AA8855', elem:'無'},
      {label:'裝飾',   tiles:[22,39,119,120],                               stroke:'#6A4A4A', ghost:'#AA7777', elem:'無'},
    ]},
  { key:'D', label:'Strategy', base:IMG_BASE_D, count:94, prefix:'s',
    fileOf:i => FILES_D[i], cropOf:i => CROP_D[i],
    srcHOf:i => (i < 90 ? 100 : SRCH_D[i - 90]),
    srcWOf:i => 64,
    framesOf:i => (i < 90 ? 1 : FRAMES_D[i - 90]),
    cats:[
      {label:'草地路徑', tiles:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],     stroke:'#2A4A1E', ghost:'#6BA840', elem:'木'},
      {label:'圍牆',     tiles:[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31], stroke:'#5A5A6A', ghost:'#8A8A9A', elem:'無'},
      {label:'麥田',     tiles:[32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47], stroke:'#8A7A2A', ghost:'#CCBB44', elem:'無'},
      {label:'水面',     tiles:[48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63], stroke:'#1A3050', ghost:'#4A7099', elem:'水'},
      {label:'箱子',     tiles:[64,65,66,73,74,75],                               stroke:'#5A4A2A', ghost:'#AA8855', elem:'無'},
      {label:'建築',     tiles:[71,72,87,69,70],                                  stroke:'#4A3A5A', ghost:'#7A6A9A', elem:'無'},
      {label:'植物',     tiles:[84,85,86],                                        stroke:'#2A4010', ghost:'#5B8B30', elem:'木'},
      {label:'裝飾',     tiles:[67,68,76,77,78,79,80,81,82,83,88,89],             stroke:'#6A4A4A', ghost:'#AA7777', elem:'無'},
      {label:'動畫',     tiles:[90,91,92,93],                                     stroke:'#AA5500', ghost:'#FF8833', elem:'火'},
    ]},
];

// ── Generate 6 Medieval variant sources ──
const MW_CATS = [
  {label:'地形',  tiles:[1,2,3,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43], stroke:'#4A6A2A', ghost:'#7AAA50', elem:'土'},
  {label:'草地',  tiles:[44,45,46,47,48],                                    stroke:'#2A6A1E', ghost:'#5BA840', elem:'木'},
  {label:'水面',  tiles:[19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],stroke:'#1A4060', ghost:'#4A80AA', elem:'水'},
  {label:'植物',  tiles:[10,11,12,13,14,48,49,50,51,52],                     stroke:'#2A5A10', ghost:'#5B9B30', elem:'木'},
  {label:'裝飾',  tiles:[15,16,17],                                           stroke:'#6A6A6A', ghost:'#AAAAAA', elem:'無'},
  {label:'農場',  tiles:[56,57,58,59,60],                                    stroke:'#8A7A2A', ghost:'#CCBB44', elem:'無'},
  {label:'建築',  tiles:[4,5,6,7,8,9,53,54,55,61,81,82,83,84,85,86,87,88],  stroke:'#8A6A3A', ghost:'#BB9966', elem:'無'},
  {label:'城牆',  tiles:[62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80], stroke:'#7A6A5A', ghost:'#AA9A8A', elem:'無'},
];
const MEDIEVAL_FIRST_IDX = SOURCES.length; // index of first Medieval source
const MW_COUNTS = {mw1:90, mw2:90, mw3:90, mw1w:90, mw2w:89, mw3w:89};
for(const v of MEDIEVAL_VARIANTS){
  SOURCES.push({
    key:'E_'+v.key, label:'Medieval-'+v.label,
    base:'%E7%B4%A0%E6%9D%90/medieval/'+v.key+'/',
    count: MW_COUNTS[v.key],
    prefix: v.prefix,
    group: 'Medieval',
    fileOf:i => 'tile_' + String(i).padStart(3,'0') + '.png',
    cropOf:() => 0, srcHOf:() => 96, srcWOf:() => 96,
    cats: MW_CATS,
  });
}

// ── Per-tile default yOffset (exported from editor, manually curated) ──
const DEFAULT_Y_OFFSETS = {
    "s083": 2,
    "s090": 1.75,
    "m040": 0.5,
    "s086": 0.5,
    "s085": 1,
    "c020": 0.5
  };

// ── Per-tile element overrides (由 build.cjs 自動從 offsets.json 合併) ──
const ELEM_OVERRIDES = {
    "o010": "無",
    "p010": "無",
    "q010": "無",
    "r010": "無",
    "m010": "無",
    "n010": "無",
    "r001": "無",
    "o048": "土",
    "p044": "土",
    "p045": "土",
    "p046": "土",
    "p047": "土",
    "p048": "土",
    "q044": "土",
    "q045": "土",
    "q046": "土",
    "q047": "土",
    "q048": "土",
    "r044": "土",
    "r045": "土",
    "r046": "土",
    "r047": "土",
    "r048": "土",
    "t018": "土",
    "t019": "土",
    "t020": "土",
    "t021": "土",
    "t022": "土",
    "t023": "土",
    "t024": "土",
    "t025": "土",
    "t026": "土",
    "t027": "土",
    "t028": "土",
    "t037": "土",
    "t038": "土",
    "t039": "土",
    "t040": "土",
    "t069": "土",
    "t070": "土",
    "t071": "土",
    "t072": "土",
    "t073": "土",
    "t074": "土",
    "t075": "土",
    "t076": "土",
    "t077": "土",
    "t078": "土",
    "t079": "土",
    "t080": "土",
    "t081": "土",
    "j000": "土",
    "j001": "土",
    "j002": "土",
    "j003": "土",
    "j004": "土",
    "j005": "土",
    "j006": "土",
    "j007": "土",
    "j008": "土",
    "j009": "土",
    "j010": "土",
    "j014": "土",
    "j016": "土",
    "j017": "土",
    "j018": "土",
    "j019": "土",
    "j024": "土",
    "j025": "土",
    "j026": "土",
    "j027": "土",
    "j096": "土",
    "j097": "土",
    "j098": "土",
    "j099": "土",
    "j104": "土",
    "j105": "土",
    "j106": "土",
    "j111": "土",
    "j116": "土",
    "j117": "土",
    "j118": "土",
    "j119": "土",
    "j124": "土",
    "j125": "土",
    "j126": "土",
    "j127": "土",
    "c025": "土",
    "c028": "土",
    "c029": "土",
    "c030": "土",
    "c031": "土",
    "c032": "土",
    "c125": "土",
    "s000": "土",
    "s001": "土",
    "s002": "土",
    "s003": "土",
    "s004": "土",
    "s005": "土",
    "s006": "土",
    "s007": "土",
    "s008": "土",
    "s009": "土",
    "s010": "土",
    "s011": "土",
    "s012": "土",
    "s013": "土",
    "s014": "土",
    "s015": "土",
    "s048": "土",
    "s049": "土",
    "s050": "土",
    "s051": "土",
    "s052": "土",
    "s053": "土",
    "s054": "土",
    "s055": "土",
    "s056": "土",
    "s057": "土",
    "s058": "土",
    "s059": "土",
    "s060": "土",
    "s061": "土",
    "s062": "土",
    "s063": "土",
    "s090": "無",
    "s091": "無",
    "s092": "無",
    "s093": "無",
    "m044": "土",
    "m045": "土",
    "m046": "土",
    "m047": "土",
    "m048": "土",
    "n044": "土",
    "n045": "土",
    "n046": "土",
    "n047": "土",
    "n048": "土",
    "o044": "土",
    "o045": "土",
    "o046": "土",
    "o047": "土",
    "j092": "金",
    "j093": "金",
    "j094": "金",
    "j095": "金",
    "m001": "金",
    "m019": "金",
    "n001": "金",
    "n019": "金",
    "o001": "金",
    "o019": "金",
    "p001": "金",
    "p019": "金",
    "q001": "金",
    "q019": "金",
    "r019": "金"
  };

// ── Build TILES + preload images ──
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
    let stroke = '#555', ghost = '#888', elem = '無';
    for(const cat of src.cats){
      if(cat.tiles.includes(i)){ stroke = cat.stroke; ghost = cat.ghost; elem = cat.elem || '無'; break; }
    }
    // Apply element override if defined
    if(ELEM_OVERRIDES[key]) elem = ELEM_OVERRIDES[key];
    const srcW = src.srcWOf ? src.srcWOf(i) : 32;
    const frames = src.framesOf ? src.framesOf(i) : 1;
    const defaultYOff = DEFAULT_Y_OFFSETS[key] || 0;
    TILES[key] = {file, cropY, srcH, srcW, frames, stroke, ghost, defaultYOff, elem};
    const img = new Image();
    img.onload = () => { tileImages[key] = img; if(++tilesLoaded >= totalImages) draw(); };
    img.src = src.base + file;
  }
}



// ── gameLoop.js ──

// ── Real draw registration (renderer registers its draw function here) ──
let _realDraw = () => {};
function setRealDraw(fn) { _realDraw = fn; }

// ── Immediate draw (for export image — must render before toDataURL) ──
function drawNow() {
  _realDraw();
  S._dirty = false;
}

// ── Main loop ──
let lastTime = 0;
let animAccum = 0;
const ANIM_INTERVAL = 600;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = lastTime ? now - lastTime : 0;
  lastTime = now;

  // Shake animation
  if (S.shakeBlock) {
    if (now - S.shakeStart > 400) S.shakeBlock = null;
    S._dirty = true;
  }

  // Spritesheet animation tick
  animAccum += dt;
  if (animAccum >= ANIM_INTERVAL) {
    animAccum -= ANIM_INTERVAL;
    S.animTick++;
    if (S.animBlockCount > 0) S._dirty = true;
  }

  // Game tick (1 second interval when running)
  if (game.running && now - game.lastTick >= 1000) {
    game.lastTick = now;
    bus.emit('play:tick', now);
  }

  // Render once per frame if needed
  if (S._dirty) {
    _realDraw();
    S._dirty = false;
  }
}

function startLoop() {
  requestAnimationFrame(loop);
}


// ── spatialHash.js ──

// ── Spatial hash index ──
const spatialHash = new Map();

function shKey(gx, gy, gz, layer){ return gx+','+gy+','+gz+','+layer; }

function shAdd(b){
  const k = shKey(b.gx, b.gy, b.gz, b.layer);
  if(!spatialHash.has(k)) spatialHash.set(k, new Set());
  spatialHash.get(k).add(b);
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
  for(const b of world.blocks) shAdd(b);
}

function shGet(k){ return spatialHash.get(k); }

function _isAnimated(b){
  const td = TILES[b.color];
  return td && td.frames > 1;
}

function addBlock(b){
  if(!b.type) b.type = 'tile';
  if(!b.state) b.state = {};
  // Apply per-tile default yOffset if not explicitly set
  if(!b.yOffset){
    const td = TILES[b.color];
    if(td && td.defaultYOff) b.yOffset = td.defaultYOff;
  }
  world.blocks.push(b);
  shAdd(b);
  if(_isAnimated(b)) S.animBlockCount++;
}

function removeBlock(b){
  const idx = world.blocks.indexOf(b);
  if(idx >= 0) world.blocks.splice(idx, 1);
  shRemove(b);
  if(_isAnimated(b)) S.animBlockCount--;
}

function removeBlocksWhere(fn){
  const removing = world.blocks.filter(fn);
  for(const b of removing){
    shRemove(b);
    if(_isAnimated(b)) S.animBlockCount--;
  }
  world.blocks = world.blocks.filter(b => !fn(b));
}

function setBlocks(newBlocks){
  for(const b of newBlocks){ if(!b.type) b.type = 'tile'; if(!b.state) b.state = {}; }
  world.blocks = newBlocks;
  shRebuild();
  S.animBlockCount = newBlocks.filter(_isAnimated).length;
}


// ── coords.js ──

function toScreen(gx, gy, gz){
  return {
    x: camera.W/2 + camera.x + (gx - gy) * TW * camera.zoom,
    y: camera.H/2 + camera.y + ((gx + gy) * TH - gz * CUBE_H) * camera.zoom
  };
}

function toGrid(sx, sy){
  const dx = (sx - camera.W/2 - camera.x) / camera.zoom;
  const dy = (sy - camera.H/2 - camera.y) / camera.zoom;
  return {
    gx: (dx / TW + dy / TH) / 2,
    gy: (dy / TH - dx / TW) / 2
  };
}

function snap(v){ return Math.round(v); }

function resize(){
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


// ── blocks.js ──

function hasBlockAt(gx, gy, gz, exclude, layer){
  const chkLayer = (layer !== undefined) ? layer : S.currentLayer;
  const k = shKey(gx, gy, gz, chkLayer);
  const s = shGet(k);
  if(!s) return false;
  for(const b of s){
    if(b !== exclude) return true;
  }
  return false;
}

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
      const lyr = excludeBlock ? excludeBlock.layer : S.currentLayer;
      const blocked = hasBlockAt(nx, ny, gz, excludeBlock, lyr) || (isTall && hasBlockAt(nx, ny, gz + 1, excludeBlock, lyr));
      if(!reachable.has(k) && !blocked){
        reachable.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return reachable;
}

function selectConnected(startBlock){
  S.selectedBlocks = new Set();
  S.selectedBlocks.add(startBlock);
  const queue = [startBlock];
  while(queue.length > 0){
    const cur = queue.shift();
    for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx = cur.gx + dx, ny = cur.gy + dy;
      const set = shGet(shKey(nx, ny, cur.gz, cur.layer));
      if(!set) continue;
      for(const b of set){
        if(!S.selectedBlocks.has(b)){
          S.selectedBlocks.add(b);
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
          if(!hasBlockAt(dx, dy, S.currentHeight, null, S.currentLayer)) return {gx:dx, gy:dy};
        }
      }
    }
  }
  return {gx:0, gy:0};
}


// ── geometry.js ──
// ── Pure geometry computations (Engine layer, no state dependency) ──

function getRectCells(x0, y0, x1, y1){
  const cells = [];
  const ax = Math.min(x0,x1), bx = Math.max(x0,x1);
  const ay = Math.min(y0,y1), by = Math.max(y0,y1);
  for(let x=ax;x<=bx;x++) for(let y=ay;y<=by;y++) cells.push([x,y]);
  return cells;
}

function getLineCells(x0, y0, x1, y1){
  const cells = [];
  let cx=x0, cy=y0;
  const dx=Math.abs(x1-cx), dy=Math.abs(y1-cy);
  const sx=cx<x1?1:-1, sy=cy<y1?1:-1;
  let err=dx-dy;
  while(true){
    cells.push([cx,cy]);
    if(cx===x1&&cy===y1) break;
    const e2=2*err;
    if(e2>-dy){err-=dy;cx+=sx;}
    if(e2<dx){err+=dx;cy+=sy;}
  }
  return cells;
}

function floodFill(startGx, startGy, isBlocked, maxCount){
  const result = [];
  if(isBlocked(startGx, startGy)) return result;
  const visited = new Set();
  const queue = [[startGx, startGy]];
  const key = (x,y) => x+','+y;
  visited.add(key(startGx, startGy));
  const MAX = maxCount || 500;
  while(queue.length > 0 && visited.size < MAX){
    const [cx, cy] = queue.shift();
    result.push([cx, cy]);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, ny=cy+dy;
      const k = key(nx, ny);
      if(!visited.has(k) && !isBlocked(nx, ny)){
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return result;
}


// ── tools.js ──

function getRectLineCells(x0, y0, x1, y1){
  return S.rectMode ? getRectCells(x0, y0, x1, y1) : getLineCells(x0, y0, x1, y1);
}

function computeFillPreview(gx, gy){
  return floodFill(gx, gy, (x, y) => hasBlockAt(x, y, S.currentHeight, null, S.currentLayer));
}

function clearDrawTools(except){
  if(except!=='chkBrush'){ S.brushMode = false; document.getElementById('chkBrush').checked = false; }
  if(except!=='chkEraser'){ S.eraserMode = false; document.getElementById('chkEraser').checked = false; }
  if(except!=='chkFill'){ S.fillMode = false; document.getElementById('chkFill').checked = false; }
  if(except!=='chkRect'){ S.rectMode = false; document.getElementById('chkRect').checked = false; }
  if(except!=='chkLine'){ S.lineMode = false; document.getElementById('chkLine').checked = false; }
  S.rectStart = null;
  canvas.style.cursor = (except && document.getElementById(except).checked) ? 'crosshair' : 'grab';
}

function updateBrushIndicator(){
  const el = document.getElementById('brushInfo');
  if(!el) return;
  if(S.brushTile){
    el.textContent = S.brushTile.color;
    el.style.display = 'inline';
  } else {
    el.style.display = 'none';
  }
}


// ── gridOverlay.js ──

function drawGrid(vr){
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

// 3D cube grid — limited range, precomputed positions, 4 draw calls
function _drawCubeGrid(vr, R, gz){
  const tw = TW * camera.zoom;
  const th = TH * camera.zoom;
  const ch = CUBE_H * camera.zoom;

  // Only draw 3D cubes within ±10 of visible center (max ~441 cells)
  const CUBE_R = 10;
  const cx = Math.round((vr.minGx + vr.maxGx) / 2);
  const cy = Math.round((vr.minGy + vr.maxGy) / 2);
  const x0 = Math.max(-R, cx - CUBE_R);
  const x1 = Math.min(R, cx + CUBE_R);
  const y0 = Math.max(-R, cy - CUBE_R);
  const y1 = Math.min(R, cy + CUBE_R);

  // Precompute screen positions once
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  const px = new Float32Array(cols * rows);
  const py = new Float32Array(cols * rows);
  for(let gx = x0; gx <= x1; gx++){
    for(let gy = y0; gy <= y1; gy++){
      const idx = (gx - x0) * rows + (gy - y0);
      const p = toScreen(gx, gy, gz);
      px[idx] = p.x;
      py[idx] = p.y;
    }
  }

  // Helper
  function _forEachCell(fn){
    for(let i = 0; i < cols; i++){
      for(let j = 0; j < rows; j++){
        const idx = i * rows + j;
        fn(px[idx], py[idx]);
      }
    }
  }

  // Batch 1: top faces
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#8ab8dd';
  ctx.beginPath();
  _forEachCell((x, y) => {
    ctx.moveTo(x, y - ch);
    ctx.lineTo(x - tw, y + th - ch);
    ctx.lineTo(x, y + th*2 - ch);
    ctx.lineTo(x + tw, y + th - ch);
  });
  ctx.fill();

  // Batch 2: left faces
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#4a6a8a';
  ctx.beginPath();
  _forEachCell((x, y) => {
    ctx.moveTo(x - tw, y + th - ch);
    ctx.lineTo(x - tw, y + th);
    ctx.lineTo(x, y + th*2);
    ctx.lineTo(x, y + th*2 - ch);
  });
  ctx.fill();

  // Batch 3: right faces
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#6a8aaa';
  ctx.beginPath();
  _forEachCell((x, y) => {
    ctx.moveTo(x + tw, y + th - ch);
    ctx.lineTo(x + tw, y + th);
    ctx.lineTo(x, y + th*2);
    ctx.lineTo(x, y + th*2 - ch);
  });
  ctx.fill();

  // Batch 4: wireframe
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#6a8aaa';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  _forEachCell((x, y) => {
    ctx.moveTo(x, y - ch);
    ctx.lineTo(x - tw, y + th - ch);
    ctx.lineTo(x, y + th*2 - ch);
    ctx.lineTo(x + tw, y + th - ch);
    ctx.lineTo(x, y - ch);
    ctx.moveTo(x - tw, y + th - ch); ctx.lineTo(x - tw, y + th);
    ctx.moveTo(x + tw, y + th - ch); ctx.lineTo(x + tw, y + th);
    ctx.moveTo(x, y + th*2 - ch);    ctx.lineTo(x, y + th*2);
    ctx.moveTo(x - tw, y + th); ctx.lineTo(x, y + th*2); ctx.lineTo(x + tw, y + th);
  });
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Outside cube range: fall back to flat grid lines
  const th2 = TH * 2 * camera.zoom;
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#6a8aaa';
  ctx.lineWidth = 0.4;
  const vx0 = Math.max(-R, vr.minGx), vx1 = Math.min(R, vr.maxGx);
  const vy0 = Math.max(-R, vr.minGy), vy1 = Math.min(R, vr.maxGy);
  for(let i = vx0; i <= vx1; i++){
    if(i >= x0 && i <= x1) continue;
    let a = toScreen(i, vy0, gz), b = toScreen(i, vy1, gz);
    ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
  }
  for(let j = vy0; j <= vy1; j++){
    if(j >= y0 && j <= y1) continue;
    let a = toScreen(vx0, j, gz), b = toScreen(vx1, j, gz);
    ctx.beginPath();ctx.moveTo(a.x, a.y+th2);ctx.lineTo(b.x, b.y+th2);ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawVGrid(vr){
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


// ── minimap.js ──

let minimapBounds = null;

// Isometric projection for minimap (matches main view perspective)
const ASPECT = TH / TW;
function _toIso(gx, gy){ return { x: gx - gy, y: (gx + gy) * ASPECT }; }
function _fromIso(ix, iy){ const gy2 = iy / ASPECT; return { gx: (ix + gy2) / 2, gy: (gy2 - ix) / 2 }; }

function drawMinimap(vr){
  if(!S.showMinimap){ minimapBounds = null; return; }

  const mmW = 160, mmH = 110, mmX = camera.W - mmW - 8, mmY = camera.H - mmH - 22;
  ctx.save();

  // Background
  ctx.fillStyle = 'rgba(15,15,30,0.85)';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  // Clip
  ctx.beginPath();
  ctx.rect(mmX, mmY, mmW, mmH);
  ctx.clip();

  // Compute isometric bounds from all blocks + viewport
  let ix1 = Infinity, ix2 = -Infinity, iy1 = Infinity, iy2 = -Infinity;
  for(const b of world.blocks){
    const p = _toIso(b.gx, b.gy);
    ix1 = Math.min(ix1, p.x); ix2 = Math.max(ix2, p.x);
    iy1 = Math.min(iy1, p.y); iy2 = Math.max(iy2, p.y);
  }
  // Include viewport corners
  const corners = [
    toGrid(0, 0), toGrid(camera.W, 0),
    toGrid(0, camera.H), toGrid(camera.W, camera.H)
  ];
  for(const c of corners){
    const p = _toIso(c.gx, c.gy);
    ix1 = Math.min(ix1, p.x); ix2 = Math.max(ix2, p.x);
    iy1 = Math.min(iy1, p.y); iy2 = Math.max(iy2, p.y);
  }
  ix1 -= 2; ix2 += 2; iy1 -= 2; iy2 += 2;

  const rangeX = ix2 - ix1 || 1, rangeY = iy2 - iy1 || 1;
  const sc = Math.min((mmW - 8) / rangeX, (mmH - 8) / rangeY);
  const ox = mmX + mmW / 2, oy = mmY + mmH / 2;
  const midIx = (ix1 + ix2) / 2, midIy = (iy1 + iy2) / 2;

  // Helper: iso → minimap screen
  function _toMM(gx, gy){
    const p = _toIso(gx, gy);
    return { x: ox + (p.x - midIx) * sc, y: oy + (p.y - midIy) * sc };
  }

  // Checkerboard (isometric diamonds)
  const halfW = sc * 0.5, halfH = sc * ASPECT * 0.5;
  ctx.fillStyle = 'rgba(40,50,70,0.4)';
  ctx.beginPath();
  for(let gx = Math.floor(vr.minGx) - 1; gx <= Math.ceil(vr.maxGx) + 1; gx++){
    for(let gy = Math.floor(vr.minGy) - 1; gy <= Math.ceil(vr.maxGy) + 1; gy++){
      if((gx + gy) % 2 !== 0) continue;
      const m = _toMM(gx, gy);
      ctx.moveTo(m.x, m.y - halfH);
      ctx.lineTo(m.x - halfW, m.y);
      ctx.lineTo(m.x, m.y + halfH);
      ctx.lineTo(m.x + halfW, m.y);
    }
  }
  ctx.fill();

  // Blocks as diamonds
  const bw = Math.max(2, sc * 0.45), bh = Math.max(1.5, sc * ASPECT * 0.45);
  for(const b of world.blocks){
    const m = _toMM(b.gx, b.gy);
    if(b.gz === S.currentHeight && b.layer === S.currentLayer){
      ctx.fillStyle = '#6af';
    } else if(b.gz === S.currentHeight){
      ctx.fillStyle = '#48a';
    } else {
      ctx.fillStyle = '#345';
    }
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - bh);
    ctx.lineTo(m.x - bw, m.y);
    ctx.lineTo(m.x, m.y + bh);
    ctx.lineTo(m.x + bw, m.y);
    ctx.fill();
  }

  // Viewport diamond (screen corners → grid → minimap)
  const vc = [
    _toMM(corners[0].gx, corners[0].gy),
    _toMM(corners[1].gx, corners[1].gy),
    _toMM(corners[3].gx, corners[3].gy),
    _toMM(corners[2].gx, corners[2].gy),
  ];
  ctx.strokeStyle = 'rgba(255,220,100,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(vc[0].x, vc[0].y);
  for(let i = 1; i < 4; i++) ctx.lineTo(vc[i].x, vc[i].y);
  ctx.closePath();
  ctx.stroke();

  // Origin marker
  const o0 = _toMM(0, 0);
  ctx.fillStyle = 'rgba(255,100,100,0.7)';
  ctx.beginPath();
  ctx.arc(o0.x, o0.y, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  minimapBounds = { mmX, mmY, mmW, mmH, midIx, midIy, sc, ox, oy };
}

// Convert minimap screen position to grid coordinates
function minimapToGrid(px, py){
  if(!minimapBounds) return null;
  const mm = minimapBounds;
  const ix = (px - mm.ox) / mm.sc + mm.midIx;
  const iy = (py - mm.oy) / mm.sc + mm.midIy;
  return _fromIso(ix, iy);
}


// ── renderer.js ──

// ── Shake animation (gameLoop handles the timing) ──
function triggerShake(block){
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
function getVisibleRange(){
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

// ── Pixel-perfect step sizes (rounded once, shared by all tiles) ──
let _stepTW = 0, _stepTH = 0, _stepCH = 0, _baseX = 0, _baseY = 0;
function updateRenderSteps(){
  _stepTW = Math.round(TW * camera.zoom);
  _stepTH = Math.round(TH * camera.zoom);
  _stepCH = Math.round(CUBE_H * camera.zoom);
  _baseX = Math.round(camera.W / 2 + camera.x);
  _baseY = Math.round(camera.H / 2 + camera.y);
}

// Pixel-perfect screen position (integer coords, no sub-pixel gaps)
function _pixelPos(gx, gy, gz){
  return {
    x: _baseX + (gx - gy) * _stepTW,
    y: _baseY + (gx + gy) * _stepTH - gz * _stepCH
  };
}

// ── Draw block ──
function drawCube(gx, gy, gz, color, hl, block){
  const p = _pixelPos(gx, gy, gz);
  const sh = getShakeOff(block);
  const yOff = Math.round((block && block.yOffset || 0) * (_stepCH / 5));
  const iGx = (block && block.isoGx || 0) / 5;
  const iGy = (block && block.isoGy || 0) / 5;
  const x = p.x + Math.round(sh.sx) + Math.round((iGx - iGy) * _stepTW);
  const y = p.y + Math.round(sh.sy) - yOff + Math.round((iGx + iGy) * _stepTH);
  const tw = _stepTW, th = _stepTH, ch = _stepCH;

  const tileImg = tileImages[color];
  if(tileImg){
    ctx.imageSmoothingEnabled = false;
    const td = TILES[color] || {};
    const srcW = td.srcW || 32;
    const srcH = td.srcH || 32;
    const cropY = td.cropY || 0;
    const frames = td.frames || 1;
    const contentH = srcH - cropY;
    const dw = 2 * tw;
    const dh = Math.round(contentH * dw / srcW);
    const dx = x - tw;
    const dy = y + 2 * th - dh;
    if(frames > 1){
      const frame = S.animTick % frames;
      ctx.drawImage(tileImg, frame * srcW, cropY, srcW, contentH, dx, dy, dw, dh);
    } else {
      ctx.drawImage(tileImg, 0, cropY, srcW, contentH, dx, dy, dw, dh);
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

  if(S.showBlockInfo && block){
    const td2 = TILES[color] || {};
    const elem = td2.elem || '無';
    const elemColors = {'金':'#FFD700','木':'#66BB6A','水':'#42A5F5','火':'#EF5350','土':'#FFA726','無':'#888'};
    const val = block.state && Object.keys(block.state).length > 0
      ? JSON.stringify(block.state).slice(1,-1) : '-';
    const infoText = `${elem}(${val})`;
    const fontSize2 = Math.max(8, 10 * camera.zoom);
    ctx.font = `bold ${fontSize2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ix = x, iy = y + th * 1.2;
    const tw3 = ctx.measureText(infoText).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(ix - tw3/2 - 3, iy - fontSize2/2 - 2, tw3 + 6, fontSize2 + 4, 3);
    ctx.fill();
    ctx.fillStyle = elemColors[elem] || '#888';
    ctx.fillText(infoText, ix, iy);
  }

  if(S.showLayerInfo && block){
    const fontSize = Math.max(8, 10 * camera.zoom);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lx = x, ly = y - ch + th * 0.5;
    // Background pill
    const text = `H${gz} L${block.layer}`;
    const tw2 = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(lx - tw2/2 - 3, ly - fontSize/2 - 2, tw2 + 6, fontSize + 4, 3);
    ctx.fill();
    // Color by layer
    const colors = ['#6af','#f8a','#af6','#fa6','#a6f','#6fa'];
    ctx.fillStyle = colors[block.layer % colors.length];
    ctx.fillText(text, lx, ly);
  }
}

// ── Character sprite cache + draw ──
const _charImgCache = new Map();
function _getCharImg(charName, style, action, frameIdx){
  const charDef = CHARS.find(c => c.name === charName);
  if(!charDef) return null;
  const cls = charDef.cls;
  const path = IMG_BASE +
    encodeURIComponent(cls) + '/' +
    charName + '/' + style + '/' + action + '/' + frameIdx + '.png';
  if(!_charImgCache.has(path)){
    const img = new Image();
    img.src = path;
    _charImgCache.set(path, img);
  }
  return _charImgCache.get(path);
}

function _drawCharacter(block){
  const p = _pixelPos(block.gx, block.gy, block.gz);
  const tw = _stepTW, th = _stepTH;
  const x = p.x, y = p.y;
  const st = block.state || {};
  const action = st.action || 'idle';
  const style = st.style || 'outline';
  const actions = st.actions || {};
  const frameCount = actions[action] || 1;
  const frame = S.animTick % frameCount;
  const img = _getCharImg(block.color, style, action, frame);
  if(!img || !img.complete || !img.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  // Draw character centered on tile, scaled to tile width
  const scale = (tw * 2) / img.naturalWidth;
  const dw = Math.round(img.naturalWidth * scale);
  const dh = Math.round(img.naturalHeight * scale);
  const dx = x - dw / 2;
  const dy = y + th - dh; // feet at tile center bottom
  ctx.drawImage(img, dx, dy, dw, dh);
  // Shadow ellipse
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + th * 1.5, tw * 0.4, th * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Selection highlight
  if(S.selectedBlocks.has(block)){
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + th * 1.5, tw * 0.5, th * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Draw ghost preview ──
function drawGhost(gx, gy, gz, color, valid){
  const p = _pixelPos(gx, gy, gz);
  const x = p.x, y = p.y;
  const tw = _stepTW, th = _stepTH, ch = _stepCH;
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
  updateRenderSteps();
  ctx.clearRect(0,0,camera.W,camera.H);
  const vr = getVisibleRange();

  // Fog of war: circular (Euclidean) distance filter
  const fogOn = world.fogRadius > 0;
  const fogR = world.fogRadius / 2;
  const fogCx = world.fogCenter.gx, fogCy = world.fogCenter.gy;
  const fogR2 = fogR * fogR;

  const visible = world.blocks.filter(b => isVisible(b, vr) && !S.hiddenHeights.has(b.gz) && !S.hiddenLayers.has(b.layer)
    && (!fogOn || ((b.gx - fogCx) * (b.gx - fogCx) + (b.gy - fogCy) * (b.gy - fogCy)) <= fogR2));
  const sorted = visible.sort((a,b) => {
    return (a.gx+a.gy)*1000+a.gz*10+a.layer - ((b.gx+b.gy)*1000+b.gz*10+b.layer);
  });

  for(const b of sorted){
    if(b.gz < S.currentHeight){
      ctx.globalAlpha = 0.4;
      if(b.type === 'character') _drawCharacter(b);
      else drawCube(b.gx, b.gy, b.gz, b.color, b===S.dragBlock, b);
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
    if(b.gz >= S.currentHeight){
      if(b.type === 'character') _drawCharacter(b);
      else drawCube(b.gx, b.gy, b.gz, b.color, b===S.dragBlock, b);
    }
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
    const ep = _pixelPos(S.brushCursorGx, S.brushCursorGy, S.currentHeight);
    const tw2 = _stepTW, th2 = _stepTH, ch2 = _stepCH;
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
    const sp = _pixelPos(S.rectStart.gx, S.rectStart.gy, S.currentHeight);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    ctx.setLineDash([3,3]);
    const ep = _pixelPos(S.brushCursorGx, S.brushCursorGy, S.currentHeight);
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y + _stepTH);
    ctx.lineTo(ep.x, ep.y + _stepTH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Fog of war overlay — circular with gradient edge
  if(fogOn){
    const center = _pixelPos(fogCx, fogCy, S.currentHeight);
    const cx = center.x, cy = center.y + _stepTH;
    // Screen-space radius: use average of TW and TH scaled by zoom and fogR
    const screenR = fogR * (_stepTW + _stepTH);
    const innerR = screenR * 0.75;  // fully clear zone
    // Radial gradient: transparent center → black edge
    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, screenR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    // Draw gradient ring (fog edge)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, camera.W, camera.H);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - screenR, cy - screenR, screenR * 2, screenR * 2);
    ctx.restore();
    // Solid black outside the outer radius
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, camera.W, camera.H);
    ctx.arc(cx, cy, screenR, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, camera.W, camera.H);
    ctx.restore();
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


// ── hitTest.js ──

function mousePos(e){
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

function hitTest(mx, my){
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

// Hit test across ALL heights and layers (for auto-select, locate, etc.)
function hitTestAll(mx, my){
  // Sort front-to-back: higher layer drawn on top → check first
  const sorted = [...world.blocks].sort((a,b) => {
    const ka = (a.gx+a.gy)*1000 + a.gz*10 + a.layer;
    const kb = (b.gx+b.gy)*1000 + b.gz*10 + b.layer;
    return kb - ka;
  });
  for(const b of sorted){
    const p = toScreen(b.gx, b.gy, b.gz);
    if(_pointInCube(mx, my, p.x, p.y)) return b;
  }
  return null;
}


// ── contextMenu.js ──

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

function onCtx(e){
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


// ── history.js ──

function saveSnapshot(){
  S.history.push(JSON.stringify(world.blocks));
  if(S.history.length > 50) S.history.shift();
  S.redoStack = [];
  scheduleAutoSave();
}

function doUndo(){
  if(S.history.length === 0) return;
  S.redoStack.push(JSON.stringify(world.blocks));
  setBlocks(JSON.parse(S.history.pop()));
  S.selectedBlocks = new Set();
  draw();
}

function doRedo(){
  if(S.redoStack.length === 0) return;
  S.history.push(JSON.stringify(world.blocks));
  setBlocks(JSON.parse(S.redoStack.pop()));
  S.selectedBlocks = new Set();
  draw();
}

// ── Keyboard shortcuts ──
document.getElementById('undoBtn').addEventListener('click', doUndo);
document.getElementById('redoBtn').addEventListener('click', doRedo);

document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === 'z'){ e.preventDefault(); doUndo(); }
  if(e.ctrlKey && e.key === 'y'){ e.preventDefault(); doRedo(); }
  if(e.ctrlKey && e.key === 'c'){
    if(S.selectedBlocks.size > 0){
      e.preventDefault();
      const sel = [...S.selectedBlocks];
      const minGx = Math.min(...sel.map(b=>b.gx)), minGy = Math.min(...sel.map(b=>b.gy));
      S.clipboard = sel.map(b => ({dx:b.gx-minGx, dy:b.gy-minGy, color:b.color, srcH:b.srcH, yOffset:b.yOffset||0, state:{...(b.state||{})}}));
    }
  }
  if(e.ctrlKey && e.key === 'v'){
    if(S.clipboard && S.clipboard.length > 0){
      e.preventDefault();
      saveSnapshot();
      const center = toGrid(camera.W/2, camera.H/2);
      const gx = snap(center.gx), gy = snap(center.gy);
      const pasted = [];
      for(const t of S.clipboard){
        const nx = gx+t.dx, ny = gy+t.dy;
        if(!hasBlockAt(nx, ny, S.currentHeight, null, S.currentLayer)){
          const b = {gx:nx, gy:ny, gz:S.currentHeight, layer:S.currentLayer, color:t.color, srcH:t.srcH, yOffset:t.yOffset, state:{...(t.state||{})}};
          addBlock(b);
          pasted.push(b);
        }
      }
      // Keep pasted blocks selected for immediate group move
      S.selectedBlocks = new Set(pasted);
      draw();
    }
  }
  // Delete key: delete selected blocks
  if(e.key === 'Delete' && S.selectedBlocks.size > 0){
    e.preventDefault();
    saveSnapshot();
    for(const b of S.selectedBlocks) removeBlock(b);
    S.selectedBlocks = new Set();
    draw();
  }
});


// ── staging.js ──

// ── Staging highlight + slot detection ──
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
  const sr = document.getElementById('stagingArea').getBoundingClientRect();
  if(clientX >= sr.left && clientX <= sr.right && clientY >= sr.top && clientY <= sr.bottom){
    const slot = S.staging.indexOf(null);
    return slot >= 0 ? slot : 8;
  }
  return -1;
}

function addToStaging(color, srcH, combo){
  if(combo){
    // Combos always take a new slot
    let slot = S.staging.indexOf(null);
    if(slot === -1) slot = 2;
    S.staging[slot] = {combo};
    renderStagingCell(slot);
    return;
  }
  // Find existing slot with same tile — stack count
  for(let i = 0; i < 3; i++){
    const s = S.staging[i];
    if(s && !s.combo && s.color === color){
      s.count = (s.count || 1) + 1;
      renderStagingCell(i);
      return;
    }
  }
  // No match — use empty slot
  let slot = S.staging.indexOf(null);
  if(slot === -1) slot = 2;
  S.staging[slot] = {color, srcH, count: 1};
  renderStagingCell(slot);
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
  if(S.staging[idx]){
    if(S.staging[idx].combo){
      const combo = S.staging[idx].combo;
      const thumbCanvas = document.createElement('canvas');
      const sz = 40;
      thumbCanvas.width = sz; thumbCanvas.height = sz;
      const tctx = thumbCanvas.getContext('2d');
      tctx.imageSmoothingEnabled = false;
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
      const td = TILES[S.staging[idx].color];
      if(td){
        const img = document.createElement('img');
        const src2 = SOURCES.find(s => s.prefix === S.staging[idx].color.charAt(0));
        img.src = (src2 ? src2.base : '') + td.file;
        cell.insertBefore(img, cell.firstChild);
      }
      const cnt = S.staging[idx].count || 1;
      if(cnt > 1){
        const lbl = document.createElement('span');
        lbl.className = 'staging-label';
        lbl.textContent = 'x' + cnt;
        cell.appendChild(lbl);
      }
    }
  }
}

// ── Tile drag system (palette/staging -> canvas/staging) ──
function startTileDrag(key, srcH, e){
  const td = TILES[key];
  if(!td) return;
  S.tileDrag = {key, srcH, fromStaging: false};
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.7;width:42px;height:42px;';
  const img2 = document.createElement('img');
  const src2 = SOURCES.find(s => s.prefix === key.charAt(0));
  img2.src = (src2 ? src2.base : '') + td.file;
  img2.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
  el.appendChild(img2);
  document.body.appendChild(el);
  S.tileDrag.el = el;
  const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0;
  el.style.left = (cx - 21) + 'px';
  el.style.top = (cy - 21) + 'px';
}

// Global tile drag tracking (mouse)
document.addEventListener('mousemove', (e) => {
  if(!S.tileDrag) return;
  S.tileDrag.el.style.left = (e.clientX - 21) + 'px';
  S.tileDrag.el.style.top = (e.clientY - 21) + 'px';
  stagingHighlight(findStagingSlotAt(e.clientX, e.clientY) >= 0);
});

document.addEventListener('mouseup', (e) => {
  if(!S.tileDrag) return;
  stagingHighlight(false);
  const slot = findStagingSlotAt(e.clientX, e.clientY);
  if(slot >= 0){
    addToStaging(S.tileDrag.key, S.tileDrag.srcH);
  } else {
    const r = canvas.getBoundingClientRect();
    if(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom){
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const g = toGrid(mx, my);
      const gx = snap(g.gx), gy = snap(g.gy);
      if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
        saveSnapshot();
        addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.tileDrag.key, srcH:S.tileDrag.srcH, yOffset:0});
        draw();
      }
    }
  }
  S.tileDrag.el.remove();
  S.tileDrag = null;
});

// ── Init staging grid ──
function initStagingGrid(){
  const grid = document.getElementById('stagingGrid');
  for(let i = 0; i < 3; i++){
    const cell = document.createElement('div');
    cell.className = 'staging-cell';
    cell.dataset.idx = i;
    const del = document.createElement('span');
    del.className = 'staging-del';
    del.textContent = '\u2715';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      S.staging[i] = null;
      renderStagingCell(i);
    });
    cell.appendChild(del);

    function placeStagingItem(si, gx, gy){
      if(!S.staging[si]) return;
      saveSnapshot();
      if(S.staging[si].combo){
        for(const t of S.staging[si].combo){
          const nx = gx+t.dx, ny = gy+t.dy;
          if(!hasBlockAt(nx, ny, S.currentHeight, null, S.currentLayer)){
            addBlock({gx:nx, gy:ny, gz:S.currentHeight, layer:S.currentLayer, color:t.color, srcH:t.srcH, yOffset:t.yOffset||0});
          }
        }
      } else {
        if(hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)) return;
        addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.staging[si].color, srcH:S.staging[si].srcH, yOffset:0});
      }
      // Decrement count (stacked tiles)
      const st = S.staging[si];
      if(st && !st.combo && st.count > 1){
        st.count--;
        renderStagingCell(si);
      } else {
        S.staging[si] = null;
        renderStagingCell(si);
      }
      draw();
    }

    // ── PC: mousedown drag ──
    let sDragStarted = false;
    cell.addEventListener('mousedown', (e) => {
      if(!S.staging[i] || e.button !== 0) return;
      sDragStarted = false;
      const sx = e.clientX, sy = e.clientY;
      const onM = (e2) => {
        if(!sDragStarted && (Math.abs(e2.clientX-sx)>4 || Math.abs(e2.clientY-sy)>4)){
          sDragStarted = true;
          if(!S.staging[i].combo){
            startTileDrag(S.staging[i].color, S.staging[i].srcH, e);
            S.tileDrag.fromStaging = i;
          }
        }
      };
      const onU = () => {
        document.removeEventListener('mousemove', onM);
        document.removeEventListener('mouseup', onU);
        if(!sDragStarted){
          if(S.brushMode && S.staging[i] && !S.staging[i].combo){
            S.brushTile = {color:S.staging[i].color, srcH:S.staging[i].srcH};
            updateBrushIndicator();
            return;
          }
          const center = toGrid(camera.W/2, camera.H/2);
          placeStagingItem(i, snap(center.gx), snap(center.gy));
        }
      };
      document.addEventListener('mousemove', onM);
      document.addEventListener('mouseup', onU);
    });

    // ── Mobile: touch drag + double-tap delete ──
    let sTouchDrag = false;
    let sTouchEl = null;
    let sLastTap = 0;
    cell.addEventListener('touchstart', (e) => {
      if(!S.staging[i]) return;
      e.preventDefault();
      if(S.staging[i].combo) return;
      sTouchDrag = false;
      const t = e.touches[0];
      const sx = t.clientX, sy = t.clientY;
      const _onTM = (e2) => {
        const t2 = e2.touches[0];
        if(!sTouchDrag && (Math.abs(t2.clientX-sx)>6 || Math.abs(t2.clientY-sy)>6)){
          sTouchDrag = true;
          sTouchEl = document.createElement('div');
          sTouchEl.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.7;width:42px;height:42px;';
          const img = document.createElement('img');
          const td = TILES[S.staging[i].color];
          const src2 = SOURCES.find(s => s.prefix === S.staging[i].color.charAt(0));
          if(src2 && td) img.src = src2.base + td.file;
          img.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
          sTouchEl.appendChild(img);
          document.body.appendChild(sTouchEl);
        }
        if(sTouchDrag && sTouchEl){
          e2.preventDefault();
          sTouchEl.style.left = (t2.clientX - 21) + 'px';
          sTouchEl.style.top = (t2.clientY - 21) + 'px';
        }
      };
      const _onTE = (e2) => {
        document.removeEventListener('touchmove', _onTM);
        document.removeEventListener('touchend', _onTE);
        if(sTouchDrag && sTouchEl){
          const t2 = e2.changedTouches[0];
          sTouchEl.remove(); sTouchEl = null;
          const r = canvas.getBoundingClientRect();
          if(t2.clientX >= r.left && t2.clientX <= r.right && t2.clientY >= r.top && t2.clientY <= r.bottom){
            const mx = t2.clientX - r.left, my = t2.clientY - r.top;
            const g = toGrid(mx, my);
            const gx = snap(g.gx), gy = snap(g.gy);
            placeStagingItem(i, gx, gy);
          }
        } else {
          // Tap — check double-tap to delete
          const now = Date.now();
          if(now - sLastTap < 300){
            S.staging[i] = null;
            renderStagingCell(i);
            sLastTap = 0;
          } else {
            sLastTap = now;
          }
        }
        sTouchDrag = false;
      };
      document.addEventListener('touchmove', _onTM, {passive:false});
      document.addEventListener('touchend', _onTE);
    }, {passive:false});

    grid.appendChild(cell);
  }
}

initStagingGrid();


// ── inputDrag.js ──
// ── Drag mechanics extracted from input.js ──
// Handles: drag overlay, block movement (single/copy/group), staging drop on end


// ── Canvas drag overlay (for mobile staging proximity) ──
function createDragOverlay(key){
  if(S.canvasDragOverlay) S.canvasDragOverlay.remove();
  const td = TILES[key];
  if(!td) return;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.6;width:48px;height:48px;';
  const img = document.createElement('img');
  const src2 = SOURCES.find(s => s.prefix === key.charAt(0));
  img.src = (src2 ? src2.base : '') + td.file;
  img.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
  el.appendChild(img);
  document.body.appendChild(el);
  S.canvasDragOverlay = el;
}

function updateDragOverlay(){
  if(S.canvasDragOverlay){
    S.canvasDragOverlay.style.left = (S.lastMouseClientX - 24) + 'px';
    S.canvasDragOverlay.style.top = (S.lastMouseClientY - 24) + 'px';
  }
}

function removeDragOverlay(){
  if(S.canvasDragOverlay){ S.canvasDragOverlay.remove(); S.canvasDragOverlay = null; }
}

// ── Start drag: initialise common drag state on a hit block ──
function startDrag(hit, pos, mode){
  S.dragBlock = hit;
  document.getElementById('stagingArea').style.pointerEvents = 'none';
  const sp = toScreen(hit.gx, hit.gy, hit.gz);
  S.dragOffX = pos.x - sp.x;
  S.dragOffY = pos.y - sp.y;
  S.lastValidGx = hit.gx;
  S.lastValidGy = hit.gy;
  hit._dragGx = hit.gx;
  hit._dragGy = hit.gy;
  canvas.style.cursor = mode === 'copy' ? 'copy' : 'grabbing';
}

// ── Update drag: move block(s) based on new mouse position ──
function updateDrag(pos){
  const sx = pos.x - S.dragOffX;
  const sy = pos.y - S.dragOffY;
  const g = toGrid(sx, sy);
  const tgx = snap(g.gx), tgy = snap(g.gy);
  S.dragBlock._dragGx = g.gx;
  S.dragBlock._dragGy = g.gy;

  if(S.dragBlock._copyMode){
    if(!hasBlockAt(tgx, tgy, S.dragBlock.gz, S.dragBlock, S.dragBlock.layer)){
      shRemove(S.dragBlock);
      S.dragBlock.gx = tgx;
      S.dragBlock.gy = tgy;
      shAdd(S.dragBlock);
      S.lastValidGx = tgx;
      S.lastValidGy = tgy;
    }
  } else if(S.groupOffsets){
    const ddx = tgx - S.lastValidGx, ddy = tgy - S.lastValidGy;
    if(ddx !== 0 || ddy !== 0){
      let canMove = true;
      for(const go of S.groupOffsets){
        const nx = go.block.gx + ddx, ny = go.block.gy + ddy;
        if(hasBlockAt(nx, ny, S.dragBlock.gz, null, S.dragBlock.layer)){
          let inGroup = false;
          for(const go2 of S.groupOffsets){
            if(go2.block.gx === nx && go2.block.gy === ny){ inGroup = true; break; }
          }
          if(!inGroup){ canMove = false; break; }
        }
      }
      if(canMove){
        for(const go of S.groupOffsets) shRemove(go.block);
        for(const go of S.groupOffsets){
          go.block.gx += ddx;
          go.block.gy += ddy;
        }
        for(const go of S.groupOffsets) shAdd(go.block);
        S.lastValidGx = tgx;
        S.lastValidGy = tgy;
      }
    }
  } else {
    const k = tgx + ',' + tgy;
    if(S.reachableSet && S.reachableSet.has(k)){
      shRemove(S.dragBlock);
      S.dragBlock.gx = tgx;
      S.dragBlock.gy = tgy;
      shAdd(S.dragBlock);
      S.lastValidGx = tgx;
      S.lastValidGy = tgy;
    }
  }
  draw();
}

// ── End drag: finalise position, handle staging drop on mobile ──
function endDrag(){
  removeDragOverlay();
  document.getElementById('stagingArea').style.pointerEvents = 'auto';
  stagingHighlight(false);

  // Mobile: check if dropped onto staging area
  if('ontouchstart' in window){
    const slot = findStagingSlotAt(S.lastMouseClientX, S.lastMouseClientY);
    if(slot >= 0){
      saveSnapshot();
      if(S.groupOffsets && S.groupOffsets.length > 1){
        const minGx = Math.min(...S.groupOffsets.map(g=>g.block.gx));
        const minGy = Math.min(...S.groupOffsets.map(g=>g.block.gy));
        const combo = S.groupOffsets.map(g => ({
          dx:g.block.gx-minGx, dy:g.block.gy-minGy, color:g.block.color, srcH:g.block.srcH, yOffset:g.block.yOffset||0
        }));
        addToStaging(null, 0, combo);
        for(const g of S.groupOffsets) removeBlock(g.block);
        S.selectedBlocks = new Set();
      } else {
        addToStaging(S.dragBlock.color, S.dragBlock.srcH);
        removeBlock(S.dragBlock);
      }
      _cleanupDrag();
      S.reachableSet = null;
      S.panDrag = false;
      draw();
      return true; // signals staging drop handled
    }
  }

  if(!S.groupOffsets){
    S.dragBlock.gx = S.lastValidGx;
    S.dragBlock.gy = S.lastValidGy;
  }
  _cleanupDrag();
  return false;
}

function _cleanupDrag(){
  delete S.dragBlock._dragGx;
  delete S.dragBlock._dragGy;
  delete S.dragBlock._copyMode;
  S.dragBlock = null;
  S.groupOffsets = null;
}


// ── input.js ──

// jumpToTile callback registration (set by palette.js)


// Minimap drag state
let _mmDrag = false;
let _mmLastX = 0, _mmLastY = 0;

function _inMinimap(px, py){
  if(!S.showMinimap || !minimapBounds) return false;
  const mm = minimapBounds;
  return px >= mm.mmX && px <= mm.mmX+mm.mmW && py >= mm.mmY && py <= mm.mmY+mm.mmH;
}

// ── onDown ──
function onDown(e){
  e.preventDefault();
  const pos = mousePos(e);

  // Game mode: delegate to game input via bus
  if(game.running){
    bus.emit('play:pointerdown', {pos, event:e});
    // Allow pan in game mode
    S.panDrag = true;
    S.panStartX = pos.x; S.panStartY = pos.y;
    S.panCamStartX = camera.x; S.panCamStartY = camera.y;
    canvas.style.cursor = 'grabbing';
    return;
  }

  // Minimap drag start
  if(_inMinimap(pos.x, pos.y)){
    const g = minimapToGrid(pos.x, pos.y);
    if(g){
      const cp = toScreen(g.gx, g.gy, S.currentHeight);
      camera.x += camera.W/2 - cp.x;
      camera.y += camera.H/2 - cp.y;
      draw();
    }
    _mmDrag = true;
    _mmLastX = pos.x;
    _mmLastY = pos.y;
    return;
  }

  // Auto-select: click any block → switch to its height+layer
  if(S.autoSelectMode){
    const anyHit = hitTestAll(pos.x, pos.y);
    if(anyHit){
      S.currentHeight = anyHit.gz;
      S.currentLayer = anyHit.layer;
      document.getElementById('heightNum').textContent = S.currentHeight;
      document.getElementById('layerNum').textContent = S.currentLayer;
      S.autoSelectMode = false;
      document.getElementById('chkAutoSelect').checked = false;
      draw();
      return;
    }
  }

  // Locate mode
  if(S.locateMode){
    const locHit = hitTestAll(pos.x, pos.y);
    if(locHit){
      if(jumpToTile) jumpToTile(locHit.color);
    }
    S.locateMode = false; document.getElementById('chkLocate').checked = false;
    return;
  }

  const hit = hitTest(pos.x, pos.y);

  // ── Tool modes ──
  if(S.brushMode && !S.brushTile && !e.shiftKey && !e.ctrlKey){
    showToast('請先點擊素材面板或暫存區選擇筆刷素材');
    return;
  }
  if(S.brushMode && S.brushTile && !e.shiftKey && !e.ctrlKey){
    const g = toGrid(pos.x, pos.y);
    const gx = snap(g.gx), gy = snap(g.gy);
    if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
      saveSnapshot();
      addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
      draw();
    }
    S.brushPainting = true;
    return;
  }
  if(S.eraserMode && hit && !e.shiftKey){
    if(hit.gz === S.currentHeight && hit.layer === S.currentLayer){
      saveSnapshot();
      removeBlock(hit);
      draw();
    }
    S.brushPainting = true;
    return;
  }
  if(S.fillMode && !e.shiftKey){
    if(!S.brushTile){ showToast('請先選擇筆刷素材再使用填充'); return; }
    if(S.fillPreview.length > 0){
      saveSnapshot();
      for(const [fx,fy] of S.fillPreview){
        addBlock({gx:fx, gy:fy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
      }
      S.fillPreview = [];
      draw();
    }
    return;
  }
  if((S.rectMode || S.lineMode) && !e.shiftKey){
    if(!S.brushTile){ showToast('請先選擇筆刷素材'); return; }
    const g = toGrid(pos.x, pos.y);
    S.rectStart = {gx: snap(g.gx), gy: snap(g.gy)};
    S.brushPainting = true;
    draw();
    return;
  }

  // ── Copy drag ──
  if((e.ctrlKey || S.copyMode) && hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    saveSnapshot();
    const clone = {gx:hit.gx, gy:hit.gy, gz:hit.gz, layer:hit.layer, color:hit.color, srcH:hit.srcH, yOffset:hit.yOffset||0, state:{...(hit.state||{})}};
    addBlock(clone);
    S.reachableSet = null;
    S.groupOffsets = null;
    startDrag(hit, pos, 'copy');
    hit._copyMode = true;
    draw();
    return;
  }

  // ── Shift / select mode ──
  if(e.shiftKey || S.selectMode){
    if(hit){
      if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
      selectConnected(hit);
      draw();
    } else {
      S.boxSelect = {sx:pos.x, sy:pos.y, ex:pos.x, ey:pos.y};
    }
    return;
  }

  // ── Group drag (selected blocks) ──
  if(S.selectedBlocks.size > 0 && !e.shiftKey){
    if(hit && S.selectedBlocks.has(hit)){
      saveSnapshot();
      S.groupOffsets = [];
      for(const b of S.selectedBlocks){
        S.groupOffsets.push({block:b, dx:b.gx - hit.gx, dy:b.gy - hit.gy, origGx:b.gx, origGy:b.gy});
      }
      startDrag(hit, pos, 'grab');
      draw();
      return;
    }
    S.selectedBlocks = new Set();
    S.groupOffsets = null;
    draw();
    if(!hit){
      S.panDrag = true;
      S.panStartX = pos.x; S.panStartY = pos.y;
      S.panCamStartX = camera.x; S.panCamStartY = camera.y;
      canvas.style.cursor = 'grabbing';
    }
    return;
  }

  // ── Single block drag ──
  if(hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    S.reachableSet = computeReachable(hit.gx, hit.gy, hit.gz, hit);
    if(S.reachableSet.size <= 1){ triggerShake(hit); S.reachableSet = null; return; }
    saveSnapshot();
    S.groupOffsets = null;
    startDrag(hit, pos, 'grab');
    draw();
  } else {
    S.panDrag = true;
    S.panStartX = pos.x; S.panStartY = pos.y;
    S.panCamStartX = camera.x; S.panCamStartY = camera.y;
    canvas.style.cursor = 'grabbing';
  }
}

// ── onMove ──
function onMove(e){
  // Minimap drag
  if(_mmDrag){
    e.preventDefault();
    const pos = mousePos(e);
    const g1 = minimapToGrid(_mmLastX, _mmLastY);
    const g2 = minimapToGrid(pos.x, pos.y);
    if(g1 && g2){
      const sp1 = toScreen(g1.gx, g1.gy, S.currentHeight);
      const sp2 = toScreen(g2.gx, g2.gy, S.currentHeight);
      camera.x += sp1.x - sp2.x;
      camera.y += sp1.y - sp2.y;
      draw();
    }
    _mmLastX = pos.x;
    _mmLastY = pos.y;
    return;
  }

  // Mobile: drag overlay near staging
  if(S.dragBlock){
    if('ontouchstart' in window){
      const nearStaging = findStagingSlotAt(S.lastMouseClientX, S.lastMouseClientY) >= 0;
      stagingHighlight(nearStaging);
      if(nearStaging && !S.canvasDragOverlay) createDragOverlay(S.dragBlock.color);
      if(!nearStaging && S.canvasDragOverlay) removeDragOverlay();
    }
    updateDragOverlay();
  }

  // Brush / eraser painting
  if(S.brushPainting){
    e.preventDefault();
    const pos = mousePos(e);
    const g = toGrid(pos.x, pos.y);
    const gx = snap(g.gx), gy = snap(g.gy);
    S.brushCursorGx = gx; S.brushCursorGy = gy;
    if(S.brushMode && S.brushTile){
      if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
        addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
      }
    } else if(S.eraserMode){
      const hit2 = hitTest(pos.x, pos.y);
      if(hit2 && hit2.gz === S.currentHeight && hit2.layer === S.currentLayer){
        removeBlock(hit2);
      }
    }
    draw();
    return;
  }

  // Block drag
  if(S.dragBlock){
    e.preventDefault();
    const pos = mousePos(e);
    updateDrag(pos);
    return;
  }

  // Box select
  if(S.boxSelect){
    e.preventDefault();
    const pos = mousePos(e);
    S.boxSelect.ex = pos.x;
    S.boxSelect.ey = pos.y;
    draw();
    return;
  }

  // Pan
  if(S.panDrag){
    e.preventDefault();
    const pos = mousePos(e);
    camera.x = S.panCamStartX + (pos.x - S.panStartX);
    camera.y = S.panCamStartY + (pos.y - S.panStartY);
    draw();
    return;
  }

  // Hover / cursor preview
  if(S.showHover || S.brushMode || S.eraserMode || S.fillMode || S.rectMode || S.lineMode){
    const pos = mousePos(e);
    let needDraw = false;
    const g = toGrid(pos.x, pos.y);
    const newGx = snap(g.gx), newGy = snap(g.gy);
    if(newGx !== S.brushCursorGx || newGy !== S.brushCursorGy){
      S.brushCursorGx = newGx; S.brushCursorGy = newGy;
      needDraw = true;
      if(S.fillMode && S.brushTile){
        S.fillPreview = computeFillPreview(newGx, newGy);
      }
    }
    if(S.showHover){
      const prev = S.hoverBlock;
      S.hoverBlock = hitTest(pos.x, pos.y);
      if(S.hoverBlock !== prev) needDraw = true;
    }
    if(needDraw) draw();
  }
}

// ── onUp ──
function onUp(){
  if(_mmDrag){ _mmDrag = false; return; }

  // Brush/rect/line commit
  if(S.brushPainting){
    S.brushPainting = false;
    if((S.rectMode || S.lineMode) && S.rectStart && S.brushTile){
      const gx = S.brushCursorGx, gy = S.brushCursorGy;
      saveSnapshot();
      const cells = getRectLineCells(S.rectStart.gx, S.rectStart.gy, gx, gy);
      for(const [cx,cy] of cells){
        if(!hasBlockAt(cx, cy, S.currentHeight, null, S.currentLayer)){
          addBlock({gx:cx, gy:cy, gz:S.currentHeight, layer:S.currentLayer, color:S.brushTile.color, srcH:S.brushTile.srcH, yOffset:0});
        }
      }
      S.rectStart = null;
      draw();
    }
    return;
  }

  // Box select commit
  if(S.boxSelect){
    const x1 = Math.min(S.boxSelect.sx, S.boxSelect.ex);
    const y1 = Math.min(S.boxSelect.sy, S.boxSelect.ey);
    const x2 = Math.max(S.boxSelect.sx, S.boxSelect.ex);
    const y2 = Math.max(S.boxSelect.sy, S.boxSelect.ey);
    S.selectedBlocks = new Set();
    for(const b of world.blocks){
      const p = toScreen(b.gx, b.gy, b.gz);
      if(p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2){
        S.selectedBlocks.add(b);
      }
    }
    S.boxSelect = null;
    draw();
    return;
  }

  // Drag end
  if(S.dragBlock){
    const handled = endDrag();
    if(handled) return;
  }

  S.reachableSet = null;
  S.panDrag = false;
  canvas.style.cursor = (S.brushMode||S.eraserMode||S.fillMode||S.rectMode||S.lineMode) ? 'crosshair' : 'grab';
  draw();
}

// ── Right-click held state (for iso offset scroll) ──
let _rightHeld = false;
canvas.addEventListener('mousedown', (e) => { if(e.button === 2) _rightHeld = true; });
document.addEventListener('mouseup', (e) => { if(e.button === 2) _rightHeld = false; });

// ── onWheel ──
function _onWheel(e){
  e.preventDefault();
  // Right-click held + scroll = iso axis offset on hovered block
  if(_rightHeld){
    const pos = mousePos(e);
    const hit = hitTest(pos.x, pos.y);
    if(hit && hit.gz === S.currentHeight && hit.layer === S.currentLayer){
      const dir = e.deltaY < 0 ? 0.25 : -0.25;
      if(e.shiftKey){
        const cur = hit.isoGy || 0;
        hit.isoGy = Math.round(Math.max(-5, Math.min(5, cur + dir)) * 100) / 100;
      } else {
        const cur = hit.isoGx || 0;
        hit.isoGx = Math.round(Math.max(-5, Math.min(5, cur + dir)) * 100) / 100;
      }
      draw();
    }
    return;
  }
  // Left-drag + scroll = yOffset
  if(S.dragBlock && !S.dragBlock._copyMode){
    const dir = e.deltaY < 0 ? 0.25 : -0.25;
    const cur = S.dragBlock.yOffset || 0;
    const next = Math.max(0, Math.min(5, Math.round((cur + dir) * 100) / 100));
    if(next !== cur){
      S.dragBlock.yOffset = next;
      draw();
    }
    return;
  }
  const pos = mousePos(e);
  const before = toGrid(pos.x, pos.y);
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  camera.zoom = Math.max(0.15, Math.min(3, camera.zoom * delta));
  const after = toScreen(before.gx, before.gy, 0);
  camera.x += pos.x - after.x;
  camera.y += pos.y - after.y;
  draw();
}

// ── onDbl ──
function onDbl(e){
  const pos = mousePos(e);
  const hit = hitTest(pos.x, pos.y);
  if(hit){
    if(hit.gz !== S.currentHeight || hit.layer !== S.currentLayer) return;
    if(computeReachable(hit.gx, hit.gy, hit.gz, hit).size <= 1){ triggerShake(hit); return; }
    saveSnapshot(); removeBlock(hit); draw();
  }
}

// ── Bind events ──
canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
document.addEventListener('mouseup', onUp);
canvas.addEventListener('wheel', _onWheel, {passive:false});
canvas.addEventListener('dblclick', onDbl);
canvas.addEventListener('contextmenu', onCtx);

// Global mouse/touch position tracking
document.addEventListener('mousemove', (e) => {
  S.lastMouseClientX = e.clientX; S.lastMouseClientY = e.clientY;
}, true);
document.addEventListener('touchmove', (e) => {
  if(e.touches[0]){ S.lastMouseClientX = e.touches[0].clientX; S.lastMouseClientY = e.touches[0].clientY; }
}, true);

// Window blur cleanup
window.addEventListener('blur', () => {
  if(S.tileDrag){ S.tileDrag.el.remove(); S.tileDrag = null; stagingHighlight(false); }
  if(S.mobileDragEl){ S.mobileDragEl.remove(); S.mobileDragEl = null; S.mobileDragKey = null; stagingHighlight(false); }
  removeDragOverlay();
});


// ── touch.js ──

// ── Mobile tile drag from palette ──
function setupMobileTileDrag(btn, key){
  let timer = null;
  btn.addEventListener('touchstart', (e) => {
    timer = setTimeout(() => {
      e.preventDefault();
      S.mobileDragKey = key;
      S.mobileDragEl = document.createElement('div');
      S.mobileDragEl.style.cssText = 'position:fixed;pointer-events:none;z-index:999;opacity:0.7;width:42px;height:42px;';
      const img = document.createElement('img');
      const td = TILES[key];
      const src2 = SOURCES.find(s => s.prefix === key.charAt(0));
      if(src2 && td) img.src = src2.base + td.file;
      img.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      S.mobileDragEl.appendChild(img);
      document.body.appendChild(S.mobileDragEl);
      const t = e.touches[0];
      S.mobileDragEl.style.left = (t.clientX - 21) + 'px';
      S.mobileDragEl.style.top = (t.clientY - 21) + 'px';
    }, 50);
  }, {passive:false});

  btn.addEventListener('touchmove', (e) => {
    if(S.mobileDragKey){
      e.preventDefault();
      const t = e.touches[0];
      if(S.mobileDragEl){
        S.mobileDragEl.style.left = (t.clientX - 21) + 'px';
        S.mobileDragEl.style.top = (t.clientY - 21) + 'px';
      }
      const slot = findStagingSlotAt(t.clientX, t.clientY);
      stagingHighlight(slot >= 0);
    } else {
      clearTimeout(timer);
    }
  }, {passive:false});

  btn.addEventListener('touchend', (e) => {
    clearTimeout(timer);
    if(S.mobileDragKey && S.mobileDragEl){
      const t = e.changedTouches[0];
      stagingHighlight(false);
      const slot = findStagingSlotAt(t.clientX, t.clientY);
      if(slot >= 0){
        addToStaging(S.mobileDragKey, TILES[S.mobileDragKey].srcH);
      } else {
        const r = canvas.getBoundingClientRect();
        if(t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom){
          const mx = t.clientX - r.left, my = t.clientY - r.top;
          const g = toGrid(mx, my);
          const gx = snap(g.gx), gy = snap(g.gy);
          if(!hasBlockAt(gx, gy, S.currentHeight, null, S.currentLayer)){
            saveSnapshot();
            addBlock({gx, gy, gz:S.currentHeight, layer:S.currentLayer, color:S.mobileDragKey, srcH:TILES[S.mobileDragKey].srcH, yOffset:0});
            draw();
          }
        }
      }
      S.mobileDragEl.remove();
      S.mobileDragEl = null;
      S.mobileDragKey = null;
    }
  });
}

// ── Canvas touch: single finger + pinch zoom ──
canvas.addEventListener('touchstart', (e) => {
  if(e.touches.length === 2){
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const r = canvas.getBoundingClientRect();
    S.pinch = {
      dist,
      zoom0: camera.zoom,
      cx: (t0.clientX + t1.clientX) / 2 - r.left,
      cy: (t0.clientY + t1.clientY) / 2 - r.top
    };
    return;
  }
  S.pinch = null;
  onDown(e);
}, {passive:false});

canvas.addEventListener('touchmove', (e) => {
  if(S.pinch && e.touches.length === 2){
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const before = toGrid(S.pinch.cx, S.pinch.cy);
    camera.zoom = Math.max(0.15, Math.min(3, S.pinch.zoom0 * (dist / S.pinch.dist)));
    const after = toScreen(before.gx, before.gy, 0);
    camera.x += S.pinch.cx - after.x;
    camera.y += S.pinch.cy - after.y;
    draw();
    return;
  }
  onMove(e);
}, {passive:false});

canvas.addEventListener('touchend', (e) => {
  if(S.pinch){ S.pinch = null; return; }
  onUp(e);
  const now = Date.now();
  if(now - S.lastTapTime < 300 && e.changedTouches.length === 1){
    const t = e.changedTouches[0];
    const fakeE = {clientX:t.clientX, clientY:t.clientY, preventDefault(){}};
    onDbl(fakeE);
  }
  S.lastTapTime = now;
});

// Mobile pan: canvas only (no document-level pan)


// ── palette.js ──

// ── Place tile on canvas (spiral search for free cell) ──
function placeOnCanvas(color, srcH){
  const center = toGrid(camera.W / 2, camera.H / 2);
  const cx = snap(center.gx), cy = snap(center.gy);
  const gz = S.currentHeight, layer = S.currentLayer;
  // Spiral outward: check center first, then ring 1, ring 2, ...
  let gx = cx, gy = cy;
  if(!hasBlockAt(gx, gy, gz, null, layer)){
    saveSnapshot();
    addBlock({gx, gy, gz, layer, color, srcH, yOffset:0});
    draw();
    return;
  }
  // dx,dy direction sequence: right, down, left, up
  const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
  let steps = 1, di = 0, walked = 0;
  gx = cx; gy = cy;
  for(let i = 0; i < 10000; i++){
    gx += dirs[di][0];
    gy += dirs[di][1];
    if(!hasBlockAt(gx, gy, gz, null, layer)){
      saveSnapshot();
      addBlock({gx, gy, gz, layer, color, srcH, yOffset:0});
      draw();
      return;
    }
    walked++;
    if(walked === steps){
      walked = 0;
      di = (di + 1) % 4;
      if(di % 2 === 0) steps++;
    }
  }
}

// ── Tile locate (jump palette to tile) ──
function jumpToTile(tileKey){
  const prefix = tileKey.charAt(0);
  const idx = parseInt(tileKey.slice(1));
  for(let si = 0; si < SOURCES.length; si++){
    const src = SOURCES[si];
    if(src.prefix !== prefix) continue;
    for(let ci = 0; ci < src.cats.length; ci++){
      if(src.cats[ci].tiles.includes(idx)){
        document.getElementById('srcSelect').value = si;
        S.selectedSrc = si;
        buildCatOptions();
        // catSelect value offset: +1 because '全部' is at index 0
        document.getElementById('catSelect').value = ci + 1;
        S.selectedCat = ci + 1;
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

// ── Palette multi-select (Ctrl+click) ──
const _paletteSelected = new Set();
function _clearPaletteSelection(){
  _paletteSelected.clear();
  document.querySelectorAll('#tilePalette .tb.palette-sel').forEach(b => b.classList.remove('palette-sel'));
}
function _togglePaletteSelect(btn, key){
  if(_paletteSelected.has(key)){
    _paletteSelected.delete(key);
    btn.classList.remove('palette-sel');
  } else {
    _paletteSelected.add(key);
    btn.classList.add('palette-sel');
  }
}

// ── Shared tile button creator ──
function _createTileButton(container, key, src, i){
  const btn = document.createElement('button');
  btn.className = 'tb';
  btn.title = key + ' [' + src.label + '] ' + src.fileOf(i);
  const img = document.createElement('img');
  img.src = src.base + src.fileOf(i);
  img.draggable = false;
  btn.appendChild(img);
  const num = document.createElement('span');
  num.className = 'tb-num';
  num.textContent = src.prefix + i;
  btn.appendChild(num);
  const srcH = (TILES[key] && TILES[key].srcH) || 32;
  let dragStarted = false;
  btn.addEventListener('mousedown', (e) => {
    if(e.button !== 0) return;
    // Ctrl+click: toggle palette selection
    if(e.ctrlKey){
      e.preventDefault();
      _togglePaletteSelect(btn, key);
      return;
    }
    dragStarted = false;
    const sx = e.clientX, sy = e.clientY;
    const onMove2 = (e2) => {
      if(!dragStarted && (Math.abs(e2.clientX-sx)>4 || Math.abs(e2.clientY-sy)>4)){
        dragStarted = true;
        startTileDrag(key, srcH, e);
      }
    };
    const onUp2 = () => {
      document.removeEventListener('mousemove', onMove2);
      document.removeEventListener('mouseup', onUp2);
      if(!dragStarted){
        if(S.brushMode){ S.brushTile = {color:key, srcH}; updateBrushIndicator(); return; }
        _clearPaletteSelection();
        placeOnCanvas(key, srcH);
      }
    };
    document.addEventListener('mousemove', onMove2);
    document.addEventListener('mouseup', onUp2);
  });
  btn.addEventListener('click', (e) => { e.preventDefault(); });
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // If this tile is in the multi-selection, or selection is non-empty, show batch picker
    const targets = _paletteSelected.size > 0 ? [..._paletteSelected] : [key];
    _showElemPicker(e.clientX, e.clientY, targets);
  });
  setupMobileTileDrag(btn, key);
  container.appendChild(btn);
}

// ── Element picker (right-click on palette tile, supports batch) ──
let _elemPickerEl = null;
function _showElemPicker(cx, cy, keys){
  _hideElemPicker();
  if(!Array.isArray(keys)) keys = [keys];
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = cx + 'px';
  menu.style.top = cy + 'px';
  const title = document.createElement('div');
  title.style.cssText = 'padding:4px 14px;font-size:10px;color:#888;';
  if(keys.length === 1){
    const td = TILES[keys[0]];
    title.textContent = keys[0] + ' 屬性：' + (td && td.elem || '無');
  } else {
    title.textContent = '批次修改 ' + keys.length + ' 個素材';
  }
  menu.appendChild(title);
  for(const el of ['金','木','水','火','土','無']){
    const item = document.createElement('div');
    item.className = 'ctx-item';
    item.textContent = el;
    item.addEventListener('click', () => {
      for(const k of keys){
        const td = TILES[k];
        if(td){ td.elem = el; td._elemOverride = true; }
      }
      _hideElemPicker();
      _clearPaletteSelection();
      showToast(keys.length + ' 個素材 → ' + el);
    });
    menu.appendChild(item);
  }
  document.body.appendChild(menu);
  _elemPickerEl = menu;
  setTimeout(() => document.addEventListener('click', _hideElemPicker, {once:true}), 10);
}
function _hideElemPicker(){
  if(_elemPickerEl){ _elemPickerEl.remove(); _elemPickerEl = null; }
}

// ── Palette population ──
function populatePalette(){
  const container = document.getElementById('tilePalette');
  container.innerHTML = '';
  const catSel = document.getElementById('catSelect');
  const catLabel = catSel.options[catSel.selectedIndex]?.dataset?.label || '';

  const elemFilter = document.getElementById('elemSelect').value;
  const items = [];
  const seen = new Set();
  const srcList = S.selectedSrc === -1 ? SOURCES : [SOURCES[S.selectedSrc]];
  const showAll = catLabel === '__all__';
  for(const src of srcList){
    for(const cat of src.cats){
      if(!showAll && cat.label !== catLabel) continue;
      for(const i of cat.tiles){
        const key = src.prefix + String(i).padStart(3,'0');
        if(seen.has(key)) continue;
        seen.add(key);
        if(elemFilter){
          const td = TILES[key];
          if((td && td.elem || '無') !== elemFilter) continue;
        }
        items.push({key, src, i});
      }
    }
  }

  for(const {key, src, i} of items){
    _createTileButton(container, key, src, i);
  }
}

// ── Category dropdown ──
function buildCatOptions(){
  const catSel = document.getElementById('catSelect');
  catSel.innerHTML = '';
  const labelSet = new Map();
  const srcList = S.selectedSrc === -1 ? SOURCES : [SOURCES[S.selectedSrc]];
  for(const src of srcList){
    for(const cat of src.cats){
      if(!labelSet.has(cat.label)) labelSet.set(cat.label, 0);
      labelSet.set(cat.label, labelSet.get(cat.label) + 1);
    }
  }
  // "全部" option at the top
  const allOpt = document.createElement('option');
  allOpt.value = 0;
  allOpt.textContent = '全部';
  allOpt.dataset.label = '__all__';
  catSel.appendChild(allOpt);

  let idx = 1;
  let defaultIdx = 0;
  for(const [label, count] of labelSet){
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = label + (S.selectedSrc === -1 && count > 1 ? ' ('+count+')' : '');
    opt.dataset.label = label;
    // defaultIdx stays 0 = '全部'
    catSel.appendChild(opt);
    idx++;
  }
  catSel.value = defaultIdx;
}

// ── Init selectors ──
function initSelectors(){
  const srcSel = document.getElementById('srcSelect');
  const allOpt = document.createElement('option');
  allOpt.value = -1; allOpt.textContent = '全部來源';
  srcSel.appendChild(allOpt);
  // Show non-grouped sources + one entry per group
  const shown = new Set();
  SOURCES.forEach((src, i) => {
    if(src.group){
      if(shown.has(src.group)) return;
      shown.add(src.group);
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = src.group;
      srcSel.appendChild(opt);
    } else {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = src.label;
      srcSel.appendChild(opt);
    }
  });
  srcSel.value = -1;

  // Medieval variant selector
  const varSel = document.createElement('select');
  varSel.id = 'variantSelect';
  varSel.style.cssText = 'display:none;font-size:11px;background:#2a2a3e;color:#ccc;border:1px solid #444;border-radius:4px;padding:2px 4px;';
  MEDIEVAL_VARIANTS.forEach((v, vi) => {
    const opt = document.createElement('option');
    opt.value = MEDIEVAL_FIRST_IDX + vi;
    opt.textContent = v.label;
    varSel.appendChild(opt);
  });
  srcSel.parentElement.insertBefore(varSel, srcSel.nextSibling);

  function _isMedieval(){
    return S.selectedSrc >= MEDIEVAL_FIRST_IDX && S.selectedSrc < MEDIEVAL_FIRST_IDX + MEDIEVAL_VARIANTS.length;
  }

  function _updateVariantVisibility(){
    varSel.style.display = _isMedieval() ? '' : 'none';
  }

  varSel.addEventListener('change', () => {
    S.selectedSrc = parseInt(varSel.value);
    buildCatOptions();
    populatePalette();
  });

  srcSel.addEventListener('change', () => {
    S.selectedSrc = parseInt(srcSel.value);
    if(_isMedieval()) varSel.value = S.selectedSrc;
    _updateVariantVisibility();
    buildCatOptions();
    populatePalette();
  });

  const catSel = document.getElementById('catSelect');
  catSel.addEventListener('change', () => {
    populatePalette();
  });

  document.getElementById('elemSelect').addEventListener('change', () => {
    populatePalette();
  });

  buildCatOptions();
  populatePalette();
}
initSelectors();

// ── Tile search ──
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
        _createTileButton(container, key, src, i);
      }
    }
  }
});


// ── saveLoad.js ──

function updateHeightUI(){
  const el = document.getElementById('heightNum');
  if(el) el.textContent = S.currentHeight;
}
function updateLayerUI(){
  const el = document.getElementById('layerNum');
  if(el) el.textContent = S.currentLayer;
}

// ── Height + Layer controls ──
document.getElementById('heightUp').addEventListener('click', () => {
  if(S.currentHeight < 5){ S.currentHeight++; updateHeightUI(); draw(); }
});
document.getElementById('heightDown').addEventListener('click', () => {
  if(S.currentHeight > -5){ S.currentHeight--; updateHeightUI(); draw(); }
});
document.getElementById('layerUp').addEventListener('click', () => {
  if(S.currentLayer < 5){ S.currentLayer++; updateLayerUI(); draw(); }
});
document.getElementById('layerDown').addEventListener('click', () => {
  if(S.currentLayer > 0){ S.currentLayer--; updateLayerUI(); draw(); }
});

// ── Save / Save As / Load ──
function _buildSaveData(){
  return JSON.stringify({blocks:world.blocks, camX:camera.x, camY:camera.y, zoom:camera.zoom, currentHeight:S.currentHeight, currentLayer:S.currentLayer, fogRadius:world.fogRadius, fogCenter:world.fogCenter});
}

function _doSave(label){
  localStorage.setItem('blockBuilder_save', _buildSaveData());
  _showCanvasSaveHint(label || '已儲存');
}

// ── Canvas center save hint (fade out) ──
let _saveHintEl = null;
let _saveHintTimer = null;
function _showCanvasSaveHint(text){
  if(!_saveHintEl){
    _saveHintEl = document.createElement('div');
    _saveHintEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(20,20,40,0.85);color:#6f6;font-size:14px;font-weight:bold;' +
      'padding:8px 20px;border-radius:8px;pointer-events:none;z-index:30;' +
      'transition:opacity 0.8s;border:1px solid #4a4a6a;';
    document.getElementById('canvasWrap').appendChild(_saveHintEl);
  }
  _saveHintEl.textContent = text;
  _saveHintEl.style.opacity = '1';
  clearTimeout(_saveHintTimer);
  _saveHintTimer = setTimeout(() => { _saveHintEl.style.opacity = '0'; }, 1500);
}

// Save: overwrite localStorage (no file download)
document.getElementById('saveBtn').addEventListener('click', () => {
  _doSave('手動儲存');
});

// Save As: download as new JSON file
document.getElementById('saveAsBtn').addEventListener('click', () => {
  const blob = new Blob([_buildSaveData()], {type:'application/json'});
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
        loadFromData(data);
      } catch(err){ showToast('載入失敗：' + err.message, 4000); }
    };
    reader.readAsText(input.files[0]);
  });
  input.click();
});

// ── Export image ──
document.getElementById('exportImg').addEventListener('click', () => {
  if(world.blocks.length === 0){ showToast('沒有方塊可匯出'); return; }
  const oldCamX = camera.x, oldCamY = camera.y, oldZoom = camera.zoom;
  const oldHH = new Set(S.hiddenHeights), oldHL = new Set(S.hiddenLayers);
  const oldGrid = S.showGrid, oldVGrid = S.showVGrid, oldCoord = S.showCoords;
  S.hiddenHeights = new Set(); S.hiddenLayers = new Set();
  S.showGrid = false; S.showVGrid = false; S.showCoords = false;
  let minGx=Infinity, maxGx=-Infinity, minGy=Infinity, maxGy=-Infinity, minGz=Infinity, maxGz=-Infinity;
  for(const b of world.blocks){
    minGx=Math.min(minGx,b.gx); maxGx=Math.max(maxGx,b.gx);
    minGy=Math.min(minGy,b.gy); maxGy=Math.max(maxGy,b.gy);
    minGz=Math.min(minGz,b.gz); maxGz=Math.max(maxGz,b.gz);
  }
  camera.zoom = 1; camera.x = 0; camera.y = 0;
  const cx = (minGx+maxGx)/2, cy = (minGy+maxGy)/2, cz = (minGz+maxGz)/2;
  const cp = toScreen(cx, cy, cz);
  camera.x = camera.W/2 - cp.x;
  camera.y = camera.H/2 - cp.y;
  drawNow();
  try {
    const link = document.createElement('a');
    link.download = 'map_' + new Date().toISOString().slice(0,10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch(err) {
    showToast('本地開啟無法匯出圖片，請用 GitHub Pages 或本地伺服器開啟', 4000);
  }
  camera.x = oldCamX; camera.y = oldCamY; camera.zoom = oldZoom;
  S.hiddenHeights = oldHH; S.hiddenLayers = oldHL;
  S.showGrid = oldGrid; S.showVGrid = oldVGrid; S.showCoords = oldCoord;
  draw();
});

// ── Export offsets + element overrides as offsets.json ──
document.getElementById('exportOffsets').addEventListener('click', () => {
  // Collect yOffset changes
  const offsets = {};
  for(const b of world.blocks){
    if(b.yOffset && b.yOffset !== 0) offsets[b.color] = b.yOffset;
  }
  for(const [key, td] of Object.entries(TILES)){
    if(td.defaultYOff && !offsets[key]) offsets[key] = td.defaultYOff;
  }
  // Collect element overrides (compare TILES[key].elem against original cat.elem)
  const elements = {};
  for(const [key, td] of Object.entries(TILES)){
    if(td._elemOverride) elements[key] = td.elem;
  }
  const nOff = Object.keys(offsets).length;
  const nElem = Object.keys(elements).length;
  if(nOff === 0 && nElem === 0){ showToast('沒有任何修改'); return; }
  const data = { offsets, elements };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'offsets.json';
  a.click();
  URL.revokeObjectURL(a.href);
  const n = nOff + nElem;
  _openCloudModal('匯出偏移完成',
    '<div style="text-align:left;font-size:12px;color:#bbb;line-height:2;">' +
    '<div style="color:#6f6;font-size:13px;margin-bottom:8px;">已下載 offsets.json（' + nOff + ' 筆偏移 + ' + nElem + ' 筆屬性）</div>' +
    '<div style="color:#FFD700;margin-bottom:4px;">接下來請依序操作：</div>' +
    '<div><span style="color:#6bf;">步驟 1.</span> 把下載的 <b>offsets.json</b> 放到專案資料夾（750/）</div>' +
    '<div><span style="color:#6bf;">步驟 2.</span> 開啟終端機，進入專案資料夾</div>' +
    '<div><span style="color:#6bf;">步驟 3.</span> 執行以下任一指令：</div>' +
    '<div style="background:#1a1a2e;border:1px solid #444;border-radius:6px;padding:8px 12px;margin:8px 0;font-family:monospace;">' +
    '<div style="color:#888;font-size:10px;">▸ 一鍵部署（build + commit + push）：</div>' +
    '<div style="color:#fff;margin:4px 0;">npm run deploy</div>' +
    '<div style="color:#888;font-size:10px;margin-top:8px;">▸ 或分步執行：</div>' +
    '<div style="color:#ccc;">node build.cjs</div>' +
    '<div style="color:#ccc;">git add -A</div>' +
    '<div style="color:#ccc;">git commit -m "update offsets"</div>' +
    '<div style="color:#ccc;">git push</div>' +
    '</div>' +
    '<div style="color:#888;font-size:11px;margin-top:6px;">build 會自動讀取 offsets.json 並寫入程式碼，<br>部署後所有人放素材都會自動套用你調好的偏移。</div>' +
    '</div>');
});

// ── Cloud Save / Load (jsonblob.com) ──
const CLOUD_API = 'https://jsonblob.com/api/jsonBlob';

function _openCloudModal(title, bodyHTML){
  document.getElementById('cloudTitle').textContent = title;
  document.getElementById('cloudBody').innerHTML = bodyHTML;
  document.getElementById('cloudOverlay').style.display = 'flex';
}
function _closeCloudModal(){
  document.getElementById('cloudOverlay').style.display = 'none';
}
document.getElementById('cloudClose').addEventListener('click', _closeCloudModal);
document.getElementById('cloudOverlay').addEventListener('click', (e) => {
  if(e.target === e.currentTarget) _closeCloudModal();
});

function _updateFogUI(){
  const sel = document.getElementById('fogRadius');
  if(sel) sel.value = world.fogRadius;
  const gxIn = document.getElementById('fogCenterGx');
  const gyIn = document.getElementById('fogCenterGy');
  if(gxIn) gxIn.value = world.fogCenter.gx;
  if(gyIn) gyIn.value = world.fogCenter.gy;
}

function loadFromData(data){
  if(data.blocks) setBlocks(data.blocks);
  if(data.camX !== undefined) camera.x = data.camX;
  if(data.camY !== undefined) camera.y = data.camY;
  if(data.zoom !== undefined) camera.zoom = data.zoom;
  if(data.currentHeight !== undefined){ S.currentHeight = data.currentHeight; updateHeightUI(); }
  if(data.currentLayer !== undefined){ S.currentLayer = data.currentLayer; updateLayerUI(); }
  world.fogRadius = data.fogRadius || 0;
  world.fogCenter = data.fogCenter || { gx: 0, gy: 0 };
  _updateFogUI();
  draw();
}

document.getElementById('cloudSaveBtn').addEventListener('click', async () => {
  if(world.blocks.length === 0){ showToast('沒有方塊可上傳'); return; }
  _openCloudModal('雲端上傳',
    '<div class="cloud-status">上傳中...</div>');
  try {
    const res = await fetch(CLOUD_API, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: _buildSaveData()
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const blobId = res.headers.get('X-jsonblob') || res.headers.get('x-jsonblob') || '';
    // Fallback: extract ID from Location header
    const loc = res.headers.get('Location') || '';
    const id = blobId || loc.split('/').pop() || '';
    if(!id) throw new Error('無法取得存檔 ID');
    // Save the ID locally for convenience
    localStorage.setItem('blockBuilder_cloudId', id);
    _openCloudModal('上傳成功',
      '<div style="font-size:12px;color:#aaa;margin-bottom:6px;">你的存檔代碼：</div>' +
      '<div class="cloud-id" id="_cloudIdDisplay"></div>' +
      '<button class="cloud-action primary" id="_cloudCopy">複製代碼</button>' +
      '<div class="cloud-status">把代碼分享給朋友，對方用「☁ 下載」貼上即可載入</div>');
    document.getElementById('_cloudIdDisplay').textContent = id;
    document.getElementById('_cloudCopy').addEventListener('click', () => {
      navigator.clipboard.writeText(id).then(() => {
        showToast('已複製到剪貼簿');
      }).catch(() => {
        // Fallback: select text
        const el = document.querySelector('.cloud-id');
        if(el){ const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
        showToast('請手動複製上方代碼');
      });
    });
  } catch(err){
    _openCloudModal('上傳失敗',
      '<div style="color:#f66;margin:12px 0;" id="_cloudErr"></div>' +
      '<div class="cloud-status">請檢查網路連線後重試</div>');
    document.getElementById('_cloudErr').textContent = err.message;
  }
});

document.getElementById('cloudLoadBtn').addEventListener('click', () => {
  const lastId = localStorage.getItem('blockBuilder_cloudId') || '';
  _openCloudModal('雲端下載',
    '<div style="font-size:12px;color:#aaa;margin-bottom:4px;">輸入存檔代碼：</div>' +
    '<input class="cloud-input" id="_cloudIdInput" placeholder="貼上代碼...">' +
    '<div><button class="cloud-action primary" id="_cloudLoadGo">載入</button></div>' +
    '<div class="cloud-status">向朋友索取代碼，或貼上你之前上傳的代碼</div>');
  const inp = document.getElementById('_cloudIdInput');
  inp.value = lastId;
  inp.focus();
  inp.select();
  const goBtn = document.getElementById('_cloudLoadGo');
  async function _doCloudLoad(){
    const id = inp.value.trim();
    if(!id){ showToast('請輸入存檔代碼'); return; }
    goBtn.textContent = '載入中...';
    goBtn.style.pointerEvents = 'none';
    try {
      const res = await fetch(CLOUD_API + '/' + id);
      if(!res.ok) throw new Error(res.status === 404 ? '找不到此存檔代碼' : 'HTTP ' + res.status);
      const data = await res.json();
      if(!data.blocks) throw new Error('無效的存檔格式');
      loadFromData(data);
      localStorage.setItem('blockBuilder_cloudId', id);
      _closeCloudModal();
      showToast('雲端載入成功');
    } catch(err){
      goBtn.textContent = '載入';
      goBtn.style.pointerEvents = '';
      showToast('載入失敗：' + err.message, 4000);
    }
  }
  goBtn.addEventListener('click', _doCloudLoad);
  inp.addEventListener('keydown', (e) => { if(e.key === 'Enter') _doCloudLoad(); });
});

// ── Height visibility ──
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
  if(S.hiddenHeights.has(v)) S.hiddenHeights.delete(v);
  else S.hiddenHeights.add(v);
  document.getElementById('hideHeightBtn').textContent = S.hiddenHeights.has(v) ? '顯示' : '隱藏';
  draw();
});
document.getElementById('hideHeight').addEventListener('change', () => {
  const v = parseInt(document.getElementById('hideHeight').value);
  document.getElementById('hideHeightBtn').textContent = S.hiddenHeights.has(v) ? '顯示' : '隱藏';
});
document.getElementById('showAllBtn').addEventListener('click', () => {
  S.hiddenHeights.clear(); S.hiddenLayers.clear(); draw();
});

// ── Auto-save: debounce 5s after edit + 10 min interval ──
let _autoSaveTimer = null;

function scheduleAutoSave(){
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    _doSave('自動儲存');
  }, 5000);
}

// 10-minute interval auto-save
const _autoInterval = setInterval(() => {
  if(world.blocks.length > 0){
    _doSave('自動儲存');
  }
}, 10 * 60 * 1000);
if(typeof _autoInterval === 'object' && _autoInterval.unref) _autoInterval.unref();

window.addEventListener('beforeunload', () => {
  localStorage.setItem('blockBuilder_save', _buildSaveData());
});

// ── Ctrl+S intercept ──
document.addEventListener('keydown', (e) => {
  if(e.ctrlKey && e.key === 's'){
    e.preventDefault();
    _doSave('手動儲存');
  }
});


// ── combos.js ──

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

renderComboSelect();


// ── ui.js ──

// ── Tool checkboxes (mutually exclusive draw tools) ──
document.getElementById('chkBrush').addEventListener('change', (e) => { clearDrawTools('chkBrush'); S.brushMode = e.target.checked; canvas.style.cursor = S.brushMode?'crosshair':'grab'; });
document.getElementById('chkEraser').addEventListener('change', (e) => { clearDrawTools('chkEraser'); S.eraserMode = e.target.checked; canvas.style.cursor = S.eraserMode?'crosshair':'grab'; });
document.getElementById('chkFill').addEventListener('change', (e) => { clearDrawTools('chkFill'); S.fillMode = e.target.checked; canvas.style.cursor = S.fillMode?'crosshair':'grab'; });
document.getElementById('chkRect').addEventListener('change', (e) => { clearDrawTools('chkRect'); S.rectMode = e.target.checked; canvas.style.cursor = S.rectMode?'crosshair':'grab'; });
document.getElementById('chkLine').addEventListener('change', (e) => { clearDrawTools('chkLine'); S.lineMode = e.target.checked; canvas.style.cursor = S.lineMode?'crosshair':'grab'; });
document.getElementById('chkMinimap').addEventListener('change', (e) => { S.showMinimap = e.target.checked; draw(); });
document.getElementById('chkSelect').addEventListener('change', (e) => { S.selectMode = e.target.checked; });
document.getElementById('chkLocate').addEventListener('change', (e) => { S.locateMode = e.target.checked; });
document.getElementById('chkCopy').addEventListener('change', (e) => { S.copyMode = e.target.checked; });
document.getElementById('chkHover').addEventListener('change', (e) => { S.showHover = e.target.checked; S.hoverBlock = null; draw(); });
document.getElementById('chkGrid').addEventListener('change', (e) => { S.showGrid = e.target.checked; draw(); });
document.getElementById('chkVGrid').addEventListener('change', (e) => { S.showVGrid = e.target.checked; draw(); });
document.getElementById('chkCoord').addEventListener('change', (e) => { S.showCoords = e.target.checked; draw(); });
document.getElementById('chkLayerInfo').addEventListener('change', (e) => { S.showLayerInfo = e.target.checked; draw(); });
document.getElementById('chkAutoSelect').addEventListener('change', (e) => { S.autoSelectMode = e.target.checked; });
document.getElementById('chkBlockInfo').addEventListener('change', (e) => { S.showBlockInfo = e.target.checked; draw(); });

// ── Fog of war controls ──
document.getElementById('fogRadius').addEventListener('change', (e) => {
  world.fogRadius = parseInt(e.target.value) || 0;
  draw();
});
document.getElementById('fogCenterGx').addEventListener('change', (e) => {
  world.fogCenter.gx = parseInt(e.target.value) || 0;
  draw();
});
document.getElementById('fogCenterGy').addEventListener('change', (e) => {
  world.fogCenter.gy = parseInt(e.target.value) || 0;
  draw();
});

// ── Home button ──
document.getElementById('homeBtn').addEventListener('click', () => {
  camera.x = 0; camera.y = 0; camera.zoom = 1; draw();
});

// ── Clear all (with confirmation modal) ──
document.getElementById('clearBtn').addEventListener('click', () => {
  const overlay = document.getElementById('cloudOverlay');
  document.getElementById('cloudTitle').textContent = '確認清除';
  document.getElementById('cloudBody').innerHTML =
    '<div style="color:#f66;font-size:14px;margin:12px 0;">確定要刪除所有方塊？</div>' +
    '<div style="color:#888;font-size:12px;margin-bottom:12px;">此操作可用 Ctrl+Z 復原</div>' +
    '<button class="cloud-action" id="_clearCancel">取消</button>' +
    '<button class="cloud-action" id="_clearConfirm" style="color:#f66;border-color:#633;">確認清除</button>';
  overlay.style.display = 'flex';
  document.getElementById('_clearCancel').addEventListener('click', () => { overlay.style.display = 'none'; });
  document.getElementById('_clearConfirm').addEventListener('click', () => {
    overlay.style.display = 'none';
    saveSnapshot();
    setBlocks([]); draw();
  });
});

// ── Fold panels ──
document.querySelectorAll('.fold-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.dataset.target);
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'flex';
    btn.classList.toggle('open', !isOpen);
    btn.textContent = btn.textContent.replace(isOpen ? '\u25B2' : '\u25BC', isOpen ? '\u25BC' : '\u25B2');
  });
});

// ── Help panel ──
const helpHTML = `
<h3>基本操作</h3>
<kbd>左鍵</kbd> 拖曳方塊 — 移動（被四面包圍無法移動）<br>
<kbd>Ctrl</kbd>+<kbd>拖曳</kbd> — 複製並拖曳副本<br>
拖曳中 <kbd>滾輪</kbd> — 微調素材高度（1/5 格）<br>
<kbd>雙擊</kbd> — 刪除方塊<br>
空白處拖曳 — 平移視角<br>
<kbd>滾輪</kbd> — 縮放

<h3>鍵盤快捷鍵</h3>
<kbd>B</kbd> 筆刷 | <kbd>E</kbd> 橡皮擦 | <kbd>G</kbd> 填充 | <kbd>R</kbd> 矩形 | <kbd>L</kbd> 線段<br>
<kbd>I</kbd> 吸管（點擊方塊設為筆刷）<br>
<kbd>[</kbd> <kbd>]</kbd> 高度 -1 / +1<br>
<kbd>Escape</kbd> 取消所有工具和選取<br>
<kbd>Delete</kbd> 刪除選取的方塊<br>
<kbd>Ctrl+Z</kbd> 返回 | <kbd>Ctrl+Y</kbd> 復原<br>
<kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd> 複製 / 貼上選取組<br>
<kbd>Ctrl+S</kbd> 儲存到瀏覽器

<h3>右鍵選單</h3>
右鍵點擊方塊可選擇：<br>
<kbd>複製</kbd> 複製到相鄰空位 | <kbd>放入暫存</kbd> 存到暫存區<br>
<kbd>組合放入暫存</kbd>（需先選取多個）| <kbd>更改層級</kbd> | <kbd>刪除</kbd>

<h3>工具箱（互斥，同時只能開一個）</h3>
<kbd>筆刷</kbd> — 先點素材選為筆刷，再在畫布上點擊/拖曳連續放置<br>
<kbd>橡皮擦</kbd> — 點擊/拖曳連續刪除當前高度+圖層的方塊<br>
<kbd>填充</kbd> — 游標移動顯示半透明預覽，點擊確認填充（上限 500 格）<br>
<kbd>矩形</kbd> — 按住拖曳畫出矩形範圍，放開後填充整個矩形<br>
<kbd>線段</kbd> — 按住拖曳畫出直線路徑，放開後沿線填充

<h3>快捷類</h3>
<kbd>選取</kbd> — 取代 Shift 鍵，點擊方塊高亮相連群組，拖曳空白處框選<br>
<kbd>定位</kbd> — 點擊畫布上的方塊，自動跳到素材面板對應位置<br>
<kbd>複製</kbd> — 取代 Ctrl 鍵，拖曳方塊產生副本<br>
<kbd>自動選取</kbd> — 點擊任意方塊，自動切換到該方塊的高度+圖層

<h3>顯示類</h3>
<kbd>懸停</kbd> — 滑鼠移到方塊上時反白高亮<br>
<kbd>格線</kbd> — 顯示各高度的水平等距格線，當前高度加亮<br>
<kbd>立體</kbd> — 顯示垂直高度線和刻度標籤<br>
<kbd>格線</kbd>+<kbd>立體</kbd> 同時勾選 → 當前高度顯示 3D 立體方格效果<br>
<kbd>座標</kbd> — 在每個方塊上顯示 gx,gy 座標<br>
<kbd>小地圖</kbd> — 右下角等距縮覽圖，可點擊/拖曳平移視角<br>
<kbd>圖層標示</kbd> — 在每個方塊上顯示 H(高度) L(圖層) 標籤，顏色依圖層區分

<h3>隱藏高度</h3>
<kbd>下拉選單</kbd> — 選擇要操作的高度層<br>
<kbd>隱藏/顯示</kbd> — 切換選中高度層的可見性<br>
<kbd>全部顯示</kbd> — 一鍵恢復所有隱藏的高度層和圖層

<h3>選取與整組操作</h3>
<kbd>Shift</kbd>+<kbd>點擊</kbd> — 高亮相鄰方塊群組（flood fill 連通）<br>
<kbd>Shift</kbd>+<kbd>拖曳</kbd> — 框選矩形區域內的方塊<br>
拖曳高亮方塊 — 整組移動<br>
<kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd> — 複製/貼上選取組<br>
點擊空白 — 取消高亮

<h3>暫存區（左上 3 格）</h3>
從素材面板或畫布拖曳到暫存區存放<br>
相同素材自動堆疊（顯示 x2, x3...）<br>
點擊暫存格 — 放到畫面中央（堆疊時數量 -1）<br>
拖曳暫存格 — 放到指定位置<br>
<kbd>✕</kbd> 清除該格 | 手機雙擊 — 清除該格

<h3>高度與圖層</h3>
<kbd>高度 ▲▼</kbd> — 切換垂直高度（-5 ~ +5）<br>
<kbd>圖層 ▲▼</kbd> — 切換重疊圖層（0 ~ 5）<br>
只能操作當前高度 + 圖層的方塊

<h3>素材面板</h3>
五組來源：Scrabling / Jumpstart / 3232iso / Strategy / Medieval（6 色盤）<br>
類別下拉選「全部」可一次顯示該來源所有素材<br>
<kbd>搜尋</kbd> — 輸入關鍵字篩選全部素材（檔名或編號）<br>
點擊素材 — 放到畫面中央 | 拖曳素材 — 放到畫布或暫存區

<h3>範本</h3>
高亮 2+ 方塊 → <kbd>儲存</kbd> → 命名<br>
選範本 → <kbd>放置</kbd> → 一鍵放入 | <kbd>刪除</kbd> → 移除範本

<h3>檔案操作</h3>
<kbd>儲存</kbd> — 覆蓋存到瀏覽器（開啟時自動載入，每次編輯自動存檔）<br>
<kbd>另存</kbd> — 下載新 JSON 檔案<br>
<kbd>載入</kbd> — 從 JSON 檔案讀取<br>
<kbd>☁ 上傳</kbd> — 存到雲端，取得分享代碼<br>
<kbd>☁ 下載</kbd> — 貼上代碼，載入別人分享的地圖<br>
<kbd>匯出圖</kbd> — 下載 PNG 截圖<br>
<kbd>原點</kbd> — 回到 (0,0) | <kbd>清除全部</kbd> — 刪除所有方塊（可 Ctrl+Z 復原）

<h3>手機操作</h3>
單指拖曳方塊 — 移動 | 單指空白處 — 平移<br>
雙指捏合 — 縮放 | 雙擊 — 刪除方塊<br>
長按素材 — 拖曳到畫布或暫存區<br>
拖曳方塊到暫存區範圍 — 存入暫存
`;
document.getElementById('helpBody').innerHTML = helpHTML;

function _openHelp(){
  document.getElementById('helpOverlay').style.display = 'flex';
}
function _closeHelp(){
  document.getElementById('helpOverlay').style.display = 'none';
}
document.getElementById('hintToggle').addEventListener('click', _openHelp);
document.getElementById('helpClose').addEventListener('click', _closeHelp);
document.getElementById('helpOverlay').addEventListener('click', (e) => {
  if(e.target === e.currentTarget) _closeHelp();
});

// ── Toast notification ──
let _toastTimer = null;
function showToast(msg, duration){
  let el = document.getElementById('_toast');
  if(!el){
    el = document.createElement('div');
    el.id = '_toast';
    el.style.cssText = 'position:fixed;bottom:48px;left:50%;transform:translateX(-50%);background:rgba(25,25,45,0.92);color:#eee;padding:8px 18px;border-radius:8px;font-size:12px;z-index:999;pointer-events:none;transition:opacity 0.3s;border:1px solid #555;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.opacity = '0'; }, duration || 2000);
}

// ── Keyboard shortcuts ──
function _inputFocused(){
  const tag = document.activeElement && document.activeElement.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function _toggleTool(chkId, stateKey){
  const chk = document.getElementById(chkId);
  clearDrawTools(chkId);
  S[stateKey] = !S[stateKey];
  chk.checked = S[stateKey];
  canvas.style.cursor = S[stateKey] ? 'crosshair' : 'grab';
}

document.addEventListener('keydown', (e) => {
  if(_inputFocused()) return;
  if(e.ctrlKey || e.altKey || e.metaKey) return;
  switch(e.key.toLowerCase()){
    case 'b': _toggleTool('chkBrush','brushMode'); break;
    case 'e': _toggleTool('chkEraser','eraserMode'); break;
    case 'g': _toggleTool('chkFill','fillMode'); break;
    case 'r': _toggleTool('chkRect','rectMode'); break;
    case 'l': _toggleTool('chkLine','lineMode'); break;
    case 'i': {
      // Eyedropper: pick tile under last mouse position as brush
      const r = canvas.getBoundingClientRect();
      const mx = S.lastMouseClientX - r.left, my = S.lastMouseClientY - r.top;
      const hit = hitTest(mx, my);
      if(hit){
        S.brushTile = {color:hit.color, srcH:hit.srcH};
        updateBrushIndicator();
        showToast('吸管：' + hit.color, 1500);
      }
      break;
    }
    case '[':
      if(S.currentHeight > -5){ S.currentHeight--; document.getElementById('heightNum').textContent = S.currentHeight; draw(); }
      break;
    case ']':
      if(S.currentHeight < 5){ S.currentHeight++; document.getElementById('heightNum').textContent = S.currentHeight; draw(); }
      break;
    case 'escape':
      clearDrawTools();
      S.selectedBlocks = new Set();
      S.selectMode = false; document.getElementById('chkSelect').checked = false;
      S.copyMode = false; document.getElementById('chkCopy').checked = false;
      S.locateMode = false; document.getElementById('chkLocate').checked = false;
      S.autoSelectMode = false; document.getElementById('chkAutoSelect').checked = false;
      draw();
      break;
  }
});


// ── playMode.js ──
// ── Play mode lifecycle (skeleton) ──
// enterPlay() / exitPlay() toggle between editor and game modes.
// Game modules listen to bus events; editor modules stay untouched.


let _savedEditor = null;

function enterPlay(){
  // Save editor tool state so we can restore on exit
  _savedEditor = {
    brushMode: S.brushMode, eraserMode: S.eraserMode,
    fillMode: S.fillMode, rectMode: S.rectMode, lineMode: S.lineMode,
    selectMode: S.selectMode, copyMode: S.copyMode,
    locateMode: S.locateMode, autoSelectMode: S.autoSelectMode,
    showGrid: S.showGrid, showVGrid: S.showVGrid, showCoords: S.showCoords,
    showLayerInfo: S.showLayerInfo, showBlockInfo: S.showBlockInfo,
  };

  // Disable all editor tools
  S.brushMode = false; S.eraserMode = false;
  S.fillMode = false; S.rectMode = false; S.lineMode = false;
  S.selectMode = false; S.copyMode = false;
  S.locateMode = false; S.autoSelectMode = false;
  S.selectedBlocks = new Set();

  // Activate game
  game.running = true;
  game.lastTick = performance.now();
  document.body.classList.remove('mode-editor');
  document.body.classList.add('mode-game');
  document.getElementById('modeToggle').textContent = '編輯模式';
  bus.emit('mode', 'game');
  draw();
}

function exitPlay(){
  game.running = false;
  document.body.classList.remove('mode-game');
  document.body.classList.add('mode-editor');
  document.getElementById('modeToggle').textContent = '遊戲模式';

  // Restore editor state
  if(_savedEditor) Object.assign(S, _savedEditor);
  _savedEditor = null;

  bus.emit('mode', 'editor');
  draw();
}

function togglePlay(){
  if(game.running) exitPlay();
  else enterPlay();
}

// ── Init: start in editor mode ──
document.body.classList.add('mode-editor');


// ── resourceUI.js ──
// ── Resource bar UI: syncs game.resources to the #resourceBar display ──


const ELEMENTS = ['金', '木', '水', '火', '土'];
const CAPS = { 金: 9999, 木: 9999, 水: 9999, 火: 9999, 土: 9999 };

// Track rate: accumulate per-tick production, average over window
let _rateAccum = {};
let _rateWindow = [];
const RATE_SAMPLES = 30; // 30 ticks (60s at 2s/tick) for smoothing

function _resetRateTracking(){
  _rateAccum = {};
  _rateWindow = [];
  for(const e of ELEMENTS) _rateAccum[e] = 0;
}
_resetRateTracking();

// Called by game tick to record production deltas
function recordProduction(element, amount){
  _rateAccum[element] = (_rateAccum[element] || 0) + amount;
}

// Flush one tick's accumulation into the sliding window
function _flushRateTick(){
  _rateWindow.push({..._rateAccum});
  if(_rateWindow.length > RATE_SAMPLES) _rateWindow.shift();
  for(const e of ELEMENTS) _rateAccum[e] = 0;
}

// Calculate per-hour rate from sliding window
function _getRate(element){
  if(_rateWindow.length === 0) return 0;
  let total = 0;
  for(const w of _rateWindow) total += (w[element] || 0);
  const perTick = total / _rateWindow.length;
  // Convert: perTick * (3600 / tickInterval_s)
  return perTick * (3600 / 2); // 2s tick → 1800 ticks/hr
}

// Update DOM
function updateResourceBar(){
  for(const e of ELEMENTS){
    const cur = Math.floor(game.resources[e] || 0);
    const cap = CAPS[e];
    const pct = Math.min(100, (cur / cap) * 100);
    const rate = _getRate(e);

    const bar = document.getElementById('bar_' + e);
    const val = document.getElementById('val_' + e);
    const rateEl = document.getElementById('rate_' + e);
    if(bar) bar.style.width = pct + '%';
    if(val) val.textContent = cur + '/' + cap;
    if(rateEl){
      const sign = rate >= 0 ? '+' : '';
      rateEl.textContent = sign + Math.round(rate) + '/h';
      rateEl.className = 'res-rate ' + (rate > 0 ? 'positive' : rate < 0 ? 'negative' : 'zero');
    }
  }
}

// Listen to game tick for rate tracking + UI refresh
bus.on('play:tick', () => {
  _flushRateTick();
  updateResourceBar();
});

// Listen to mode change: refresh on enter, reset on exit
bus.on('mode', (mode) => {
  if(mode === 'game'){
    _resetRateTracking();
    // Init resources if empty
    if(!game.resources || Object.keys(game.resources).length === 0){
      game.resources = { 金: 10, 木: 30, 水: 15, 火: 20, 土: 20 };
    }
    updateResourceBar();
  }
});


// ── characterLib.js ──
// ── Character Library: browse & preview all character sprites ──

const IMG_BASE = '%E7%B4%A0%E6%9D%90/%E4%BA%BA%E7%89%A9/%E5%88%87%E5%89%B2/';
const CHAR_LAYER = 10; // dedicated character layer

// Action English → Chinese label
const ACTION_LABEL = {
  idle:'待機', walk:'走路', idle_back:'待機(背面)', walk_back:'走路(背面)',
  interact:'互動', attack:'攻擊', attack_back:'攻擊(背面)',
  hurt:'受傷', death:'死亡', block:'防禦', reload:'裝填',
  cast_1:'施法1', cast_2:'施法2', cast_3:'施法3', cast_4:'施法4',
  work_1:'工作1', work_2:'工作2', run:'奔跑',
};

// Character database
const CHARS = [
  {name:'NobleMan',     label:'貴族男',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'NobleWoman',   label:'貴族女',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'OldMan',       label:'老人',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:3}},
  {name:'OldWoman',     label:'老婦',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'VillagerMan',  label:'村民男',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'VillagerWoman',label:'村民女',   cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:4}},
  {name:'Princess',     label:'公主',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:5}},
  {name:'Queen',        label:'皇后',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,walk_back:3,interact:5}},
  {name:'Worker',       label:'工人',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,work_1:4,work_2:5,hurt:3,death:4}},
  {name:'Peasant',      label:'農夫',     cls:'1_村民', clsLabel:'村民', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,hurt:3,death:4}},

  {name:'SwordMan',     label:'劍士',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,hurt:3,death:4}},
  {name:'HalberdMan',   label:'戟兵',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,hurt:3,death:5}},
  {name:'SpearMan',     label:'槍兵',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:7,hurt:3,death:5}},
  {name:'ShieldMan',    label:'盾兵',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:6,block:6,hurt:3,death:4}},
  {name:'PrinceMan',    label:'王子',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:6,idle_back:5,attack:6,hurt:3,death:6}},
  {name:'KingMan',      label:'國王',     cls:'2_步兵', clsLabel:'步兵', type:'物理', actions:{idle:4,walk:5,walk_back:6,idle_back:5,attack:10,hurt:3,death:6}},

  {name:'ArcherMan',    label:'弓箭手',   cls:'3_射手', clsLabel:'射手', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:11,attack_back:6,hurt:3,death:4}},
  {name:'CrossBowMan',  label:'弩手',     cls:'3_射手', clsLabel:'射手', type:'物理', actions:{idle:4,walk:6,idle_back:3,attack:10,reload:4,hurt:3,death:4}},

  {name:'Mage',         label:'法師',     cls:'4_法師', clsLabel:'法師', type:'魔法', actions:{idle:4,walk:6,idle_back:3,cast_1:11,cast_2:9,cast_3:9,hurt:2,death:9}},
  {name:'ArchMage',     label:'大法師',   cls:'4_法師', clsLabel:'法師', type:'魔法', actions:{idle:4,walk:6,idle_back:3,cast_1:11,cast_2:9,cast_3:9,cast_4:10,hurt:2,death:9}},

  {name:'CavalierMan',  label:'騎士',     cls:'5_騎兵', clsLabel:'騎兵', type:'物理', actions:{idle:8,walk:6,run:6,idle_back:3,attack:7,hurt:2,death:6}},
  {name:'HorseMan',     label:'馬兵',     cls:'5_騎兵', clsLabel:'騎兵', type:'物理', actions:{idle:8,walk:6,run:6,idle_back:3,attack:7,hurt:2,death:6}},
];

// ── State ──
let _style = 'outline';
let _curChar = CHARS[0];
let _curAction = 'idle';
let _frameIdx = 0;
let _timer = null;
let _speed = 200; // ms per frame
let _frameImages = [];  // preloaded Image objects

// ── Build frame path ──
function _framePath(ch, style, action, idx){
  return IMG_BASE +
    encodeURIComponent(ch.cls) + '/' +
    ch.name + '/' + style + '/' + action + '/' + idx + '.png';
}

// ── Preload frames for current selection ──
function _loadFrames(){
  const count = _curChar.actions[_curAction] || 0;
  _frameImages = [];
  for(let i = 0; i < count; i++){
    const img = new Image();
    img.src = _framePath(_curChar, _style, _curAction, i);
    _frameImages.push(img);
  }
  _frameIdx = 0;
  _drawPreview();
}

// ── Draw current frame on preview canvas ──
function _drawPreview(){
  const cv = document.getElementById('charPreviewCanvas');
  if(!cv) return;
  const cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.clearRect(0, 0, cv.width, cv.height);

  // Checkerboard background
  const sz = 16;
  for(let y = 0; y < cv.height; y += sz){
    for(let x = 0; x < cv.width; x += sz){
      cx.fillStyle = ((x/sz + y/sz) % 2 === 0) ? '#2a2a3a' : '#22222e';
      cx.fillRect(x, y, sz, sz);
    }
  }

  if(_frameImages.length === 0) return;
  const img = _frameImages[_frameIdx % _frameImages.length];
  if(!img.complete || !img.naturalWidth) {
    // Wait for load
    img.onload = () => _drawPreview();
    return;
  }
  // Draw centered, scaled 4x (32→128)
  const scale = 4;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (cv.width - dw) / 2;
  const dy = (cv.height - dh) / 2;
  cx.drawImage(img, dx, dy, dw, dh);

  // Frame counter
  cx.font = '11px monospace';
  cx.fillStyle = 'rgba(255,255,255,0.5)';
  cx.textAlign = 'right';
  cx.fillText((_frameIdx % _frameImages.length + 1) + '/' + _frameImages.length, cv.width - 4, cv.height - 4);
}

// ── Animation loop ──
function _startAnim(){
  _stopAnim();
  if(_frameImages.length <= 1) return;
  _timer = setInterval(() => {
    _frameIdx = (_frameIdx + 1) % _frameImages.length;
    _drawPreview();
  }, _speed);
}

function _stopAnim(){
  if(_timer){ clearInterval(_timer); _timer = null; }
}

// ── Populate dropdowns ──
function _getClasses(){
  const set = new Set();
  for(const c of CHARS) set.add(c.clsLabel);
  return [...set];
}

function _filteredChars(){
  const clsSel = document.getElementById('charClsSelect').value;
  const typeSel = document.getElementById('charTypeSelect').value;
  return CHARS.filter(c => {
    if(clsSel && c.clsLabel !== clsSel) return false;
    if(typeSel && c.type !== typeSel) return false;
    return true;
  });
}

function _refreshCharSelect(){
  const sel = document.getElementById('charNameSelect');
  const filtered = _filteredChars();
  sel.innerHTML = '';
  for(const c of filtered){
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.label + ' ' + c.name;
    sel.appendChild(opt);
  }
  if(filtered.length > 0){
    _curChar = filtered[0];
    _refreshActionSelect();
  }
}

function _refreshActionSelect(){
  const sel = document.getElementById('charActionSelect');
  sel.innerHTML = '';
  const actions = Object.keys(_curChar.actions);
  for(const a of actions){
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = (ACTION_LABEL[a] || a) + ' (' + _curChar.actions[a] + ')';
    sel.appendChild(opt);
  }
  _curAction = actions[0] || 'idle';
  _loadFrames();
  _startAnim();
}

// ── Open / Close ──
function _open(){
  document.getElementById('charLibOverlay').style.display = 'flex';
  _refreshCharSelect();
}

function _close(){
  _stopAnim();
  document.getElementById('charLibOverlay').style.display = 'none';
}

// ── Init ──
// Style select
document.getElementById('charStyleSelect').addEventListener('change', (e) => {
  _style = e.target.value;
  _loadFrames();
  _startAnim();
});

// Class filter
document.getElementById('charClsSelect').addEventListener('change', () => {
  _refreshCharSelect();
});

// Type filter
document.getElementById('charTypeSelect').addEventListener('change', () => {
  _refreshCharSelect();
});

// Character select
document.getElementById('charNameSelect').addEventListener('change', (e) => {
  const found = CHARS.find(c => c.name === e.target.value);
  if(found){
    _curChar = found;
    _refreshActionSelect();
  }
});

// Action select
document.getElementById('charActionSelect').addEventListener('change', (e) => {
  _curAction = e.target.value;
  _loadFrames();
  _startAnim();
});

// Speed slider
document.getElementById('charSpeed').addEventListener('input', (e) => {
  _speed = 500 - parseInt(e.target.value) + 50;
  if(_timer) _startAnim();
});

// Open/Close
document.getElementById('charLibBtn').addEventListener('click', _open);
document.getElementById('charLibClose').addEventListener('click', _close);
document.getElementById('charLibOverlay').addEventListener('click', (e) => {
  if(e.target === e.currentTarget) _close();
});

// ── Placement API ──
let _placeTarget = null; // {gx, gy, gz} set by context menu

function openForPlacement(gx, gy, gz){
  _placeTarget = {gx, gy, gz};
  document.getElementById('charPlaceRow').style.display = '';
  _open();
}

function _closePlacement(){
  _placeTarget = null;
  document.getElementById('charPlaceRow').style.display = 'none';
  _close();
}

document.getElementById('charPlaceBtn').addEventListener('click', () => {
  if(!_placeTarget || !_curChar) return;
  const {gx, gy, gz} = _placeTarget;
  saveSnapshot();
  // Remove existing character at this position
  const existing = getCharAt(gx, gy, gz);
  if(existing) removeBlock(existing);
  addBlock({
    gx, gy, gz, layer: CHAR_LAYER,
    type: 'character',
    color: _curChar.name,
    srcH: 32, srcW: 32,
    state: {
      cls: _curChar.cls,
      clsLabel: _curChar.clsLabel,
      charType: _curChar.type,
      action: _curAction,
      style: _style,
      facing: 'SE',
      speed: 1,
      path: [],
      actions: _curChar.actions,
    }
  });
  draw();
  showToast('已放置 ' + _curChar.label);
  _closePlacement();
});

// ── Query helpers ──
function getCharAt(gx, gy, gz){
  const set = shGet(shKey(gx, gy, gz, CHAR_LAYER));
  if(!set) return null;
  for(const b of set){
    if(b.type === 'character') return b;
  }
  return null;
}

function canMoveTo(charBlock, nx, ny){
  const gz = charBlock.gz;
  // Check ground: need a tile at (nx, ny, gz, layer 0-5)
  let hasGround = false;
  for(let l = 0; l <= 5; l++){
    const s = shGet(shKey(nx, ny, gz, l));
    if(s && s.size > 0){
      // Check if any ground tile is a tall wall (srcH > 32)
      for(const b of s){
        if(b.type === 'tile' && b.srcH > 32) return false; // wall blocks
      }
      hasGround = true;
    }
  }
  if(!hasGround) return false;
  // Check head space: nothing at gz+1 blocking
  for(let l = 0; l <= 5; l++){
    const s = shGet(shKey(nx, ny, gz + 1, l));
    if(s && s.size > 0) return false;
  }
  // Check no other character there
  if(getCharAt(nx, ny, gz)) return false;
  return true;
}

// Export CHARS for external use


// ── main.js ──
// ── Entry point: imports establish module evaluation order ──

// These imports trigger their side effects (event listeners, init calls)

// ── Load saved state or default blocks ──

const saved = localStorage.getItem('blockBuilder_save');
if(saved){
  try { loadFromData(JSON.parse(saved)); } catch(e){}
}
if(world.blocks.length === 0){
  // ── Auto-tiled village path layout ──
  // Path tile lookup: binary key [NW,NE,SE,SW] → tile
  const PATH = {
    '0000':'s008','0001':'s013','0010':'s010','0011':'s003',
    '0100':'s012','0101':'s014','0110':'s002','0111':'s005',
    '1000':'s009','1001':'s015','1010':'s000','1011':'s004',
    '1100':'s001','1101':'s007','1110':'s006','1111':'s011'
  };
  // Village road positions
  const roads = new Set();
  // Main NW-SE road (gy=0)
  for(let gx=-4;gx<=4;gx++) roads.add(gx+',0');
  // Cross NE-SW road (gx=0)
  for(let gy=-4;gy<=4;gy++) roads.add('0,'+gy);
  // Branch to NE house area
  roads.add('2,-1'); roads.add('2,-2');
  // Branch to SW house area
  roads.add('-2,1'); roads.add('-2,2');
  // Branch to SE house area
  roads.add('1,2'); roads.add('2,2');
  // Branch to NW house area
  roads.add('-1,-2'); roads.add('-2,-2');

  for(const k of roads){
    const [gx,gy] = k.split(',').map(Number);
    const nw = roads.has((gx-1)+','+gy) ? '1':'0';
    const ne = roads.has(gx+','+(gy-1)) ? '1':'0';
    const se = roads.has((gx+1)+','+gy) ? '1':'0';
    const sw = roads.has(gx+','+(gy+1)) ? '1':'0';
    const tile = PATH[nw+ne+se+sw];
    addBlock({gx, gy, gz:0, layer:0, color:tile, srcH:100});
  }
}

// ── Mode toggle buttons (one in editor-ui, one in game-ui) ──
document.getElementById('modeToggle').addEventListener('click', togglePlay);
document.getElementById('modeToggleGame').addEventListener('click', togglePlay);

// ── Initial resize + start game loop ──
window.addEventListener('resize', resize);
resize();
startLoop();


})();