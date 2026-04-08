import { S, draw } from './state.js';

// ── Image base paths ──
const IMG_BASE_A = '%E7%B4%A0%E6%9D%90/isometric%20tileset/separated%20images/';
const IMG_BASE_B = '%E7%B4%A0%E6%9D%90/isometric_jumpstart_v230311/separated/';
const IMG_BASE_C = '%E7%B4%A0%E6%9D%90/3232iso/';
const IMG_BASE_D = '%E7%B4%A0%E6%9D%90/Isometric%20Strategy/';
export const MEDIEVAL_VARIANTS = [
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
export const SOURCES = [
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
export const MEDIEVAL_FIRST_IDX = SOURCES.length; // index of first Medieval source
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
    "c020": 0.5,
    "s070": 0.5
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

// ── Per-tile height overrides (由 build.cjs 自動從 offsets.json 合併) ──
const HEIGHT_OVERRIDES = {};

// ── Per-tile bottom crop overrides (由 build.cjs 自動從 offsets.json 合併) ──
const CROPB_OVERRIDES = {};

// ── Build TILES + preload images ──
export const TILES = {};
export const tileImages = {};
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
    const blockH = HEIGHT_OVERRIDES[key] || srcH;
    const cropB = CROPB_OVERRIDES[key] || 0;
    TILES[key] = {file, cropY, srcH, srcW, frames, stroke, ghost, defaultYOff, elem, blockH, cropB};
    const img = new Image();
    img.onload = () => { tileImages[key] = img; if(++tilesLoaded >= totalImages) draw(); };
    img.src = src.base + file;
  }
}

