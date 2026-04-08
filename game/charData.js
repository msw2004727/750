// ── Character Data: pure data + query helpers (Data layer) ──

import { TILES } from './tileData.js';
import { shKey, shGet } from './spatialHash.js';

export const IMG_BASE = '%E7%B4%A0%E6%9D%90/%E4%BA%BA%E7%89%A9/%E5%88%87%E5%89%B2/';
export const CHAR_LAYER = 6; // above tiles (0-5) but below gz+1 in sort key

// Action English → Chinese label
export const ACTION_LABEL = {
  idle:'待機', walk:'走路', idle_back:'待機(背面)', walk_back:'走路(背面)',
  interact:'互動', attack:'攻擊', attack_back:'攻擊(背面)',
  hurt:'受傷', death:'死亡', block:'防禦', reload:'裝填',
  cast_1:'施法1', cast_2:'施法2', cast_3:'施法3', cast_4:'施法4',
  work_1:'工作1', work_2:'工作2', run:'奔跑',
};

// ── Class base stats ──
export const CLASS_STATS = {
  '村民': { hp:30, atk:3,  def:1, spd:3, range:1, atkSpeed:1.0, maxMp:0,   mpCost:0  },
  '步兵': { hp:80, atk:10, def:8, spd:2, range:1, atkSpeed:1.2, maxMp:0,   mpCost:0  },
  '射手': { hp:50, atk:12, def:3, spd:2, range:4, atkSpeed:1.5, maxMp:0,   mpCost:0  },
  '法師': { hp:45, atk:15, def:2, spd:1, range:3, atkSpeed:2.0, maxMp:100, mpCost:15 },
  '騎兵': { hp:70, atk:12, def:5, spd:4, range:1, atkSpeed:1.0, maxMp:0,   mpCost:0  },
};

// ── Faction system ──
const FACTIONS = ['正義','反派','邪惡','善良'];
export const FACTION_COLORS = { '正義':'#4A9FDD', '反派':'#E85050', '邪惡':'#9B59B6', '善良':'#5CBF5C' };
const FACTION_LABELS = { '正義':'Justice', '反派':'Villain', '邪惡':'Evil', '善良':'Gentle' };

// Relation matrix: how factionA reacts to factionB
// 'hostile' = attack, 'flee' = run away, 'neutral' = ignore
const RELATIONS = {
  '正義': { '正義':'neutral', '反派':'hostile', '邪惡':'hostile', '善良':'neutral' },
  '反派': { '正義':'hostile', '反派':'neutral', '邪惡':'hostile', '善良':'neutral' },
  '邪惡': { '正義':'hostile', '反派':'hostile', '邪惡':'neutral', '善良':'hostile' },
  '善良': { '正義':'neutral', '反派':'flee',    '邪惡':'flee',    '善良':'neutral' },
};

export function getRelation(factionA, factionB){
  if(!RELATIONS[factionA]) return 'neutral';
  return RELATIONS[factionA][factionB] || 'neutral';
}

export function getClassStats(clsLabel){
  return CLASS_STATS[clsLabel] || CLASS_STATS['村民'];
}

// Character database
export const CHARS = [
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

// ── Query helpers ──
export function getCharAt(gx, gy, gz){
  const set = shGet(shKey(gx, gy, gz, CHAR_LAYER));
  if(!set) return null;
  for(const b of set){
    if(b.type === 'character') return b;
  }
  return null;
}

export function canMoveTo(charBlock, nx, ny){
  const gz = charBlock.gz;
  // Check ground: need a tile at (nx, ny, gz, layer 0-5)
  let hasGround = false;
  for(let l = 0; l <= 5; l++){
    const s = shGet(shKey(nx, ny, gz, l));
    if(s && s.size > 0){
      // Check if any ground tile is a tall wall (srcH > 32)
      for(const b of s){
        const bTd = TILES[b.color];
        const bH = (bTd && bTd.blockH) || b.srcH || 32;
        if(b.type === 'tile' && bH > 32) return false; // wall blocks
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
