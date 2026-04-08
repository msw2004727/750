"""
切割人物精靈圖 → 按角色類別 + 行為動作分資料夾
輸出：素材/人物/切割/{類別}/{角色名}/{動作}/frame_N.png
同時處理 Outline 和 NoOutline 兩版
"""
from PIL import Image
import os, shutil

CELL = 32
BASE = os.path.join(os.path.dirname(__file__), '素材', '人物')
OUT  = os.path.join(BASE, '切割')

# ── 每列行為定義 ──
ROW_MAP = {
    # ═══ 村民 (MinifolksVillagers) ═══
    'MiniVillagerMan':   ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniVillagerWoman': ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniNobleMan':      ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniNobleWoman':    ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniOldMan':        ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniOldWoman':      ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniPrincess':      ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniQueen':         ['idle', 'walk', 'idle_back', 'walk_back', 'interact'],
    'MiniPeasant':       ['idle', 'walk', 'idle_back', 'attack', 'hurt', 'death'],
    'MiniWorker':        ['idle', 'walk', 'idle_back', 'work_1', 'work_2', 'hurt', 'death'],

    # ═══ 步兵 (minifhumans) ═══
    'MiniSwordMan':      ['idle', 'walk', 'idle_back', 'attack', 'hurt', 'death'],
    'MiniHalberdMan':    ['idle', 'walk', 'idle_back', 'attack', 'hurt', 'death'],
    'MiniSpearMan':      ['idle', 'walk', 'idle_back', 'attack', 'hurt', 'death'],
    'MiniPrinceMan':     ['idle', 'walk', 'idle_back', 'attack', 'hurt', 'death'],
    'MiniShieldMan':     ['idle', 'walk', 'idle_back', 'attack', 'block', 'hurt', 'death'],
    'MiniKingMan':       ['idle', 'walk', 'walk_back', 'idle_back', 'attack', 'hurt', 'death'],

    # ═══ 射手 ═══
    'MiniArcherMan':     ['idle', 'walk', 'idle_back', 'attack', 'attack_back', 'hurt', 'death'],
    'MiniCrossBowMan':   ['idle', 'walk', 'idle_back', 'attack', 'reload', 'hurt', 'death'],

    # ═══ 法師 ═══
    'MiniMage':          ['idle', 'walk', 'idle_back', 'cast_1', 'cast_2', 'cast_3', 'hurt', 'death'],
    'MiniArchMage':      ['idle', 'walk', 'idle_back', 'cast_1', 'cast_2', 'cast_3', 'cast_4', 'hurt', 'death'],

    # ═══ 騎兵 ═══
    'MiniCavalierMan':   ['idle', 'walk', 'run', 'idle_back', 'attack', 'hurt', 'death'],
    'MiniHorseMan':      ['idle', 'walk', 'run', 'idle_back', 'attack', 'hurt', 'death'],
}

# ── 角色→職業分類 ──
CLASS_MAP = {
    '1_村民': [
        'MiniVillagerMan', 'MiniVillagerWoman',
        'MiniNobleMan', 'MiniNobleWoman',
        'MiniOldMan', 'MiniOldWoman',
        'MiniPrincess', 'MiniQueen',
        'MiniWorker', 'MiniPeasant',
    ],
    '2_步兵': [
        'MiniSwordMan', 'MiniHalberdMan', 'MiniSpearMan',
        'MiniShieldMan', 'MiniPrinceMan', 'MiniKingMan',
    ],
    '3_射手': ['MiniArcherMan', 'MiniCrossBowMan'],
    '4_法師': ['MiniMage', 'MiniArchMage'],
    '5_騎兵': ['MiniCavalierMan', 'MiniHorseMan'],
}

# Reverse lookup: character → class folder
CHAR_CLASS = {}
for cls, chars in CLASS_MAP.items():
    for ch in chars:
        CHAR_CLASS[ch] = cls

# ── Source directories ──
SOURCES = [
    ('MinifolksVillagers', 'Outline', 'Without Outline'),
    ('minifhumans', 'Outline', 'Without Outline'),
]

def cut_sheet(img_path, char_name, out_base):
    """Cut one sprite sheet into action folders."""
    img = Image.open(img_path)
    w, h = img.size
    cols, rows = w // CELL, h // CELL
    actions = ROW_MAP.get(char_name)
    if not actions:
        print(f'  [SKIP] No mapping for {char_name}')
        return 0

    total = 0
    for r in range(min(rows, len(actions))):
        action = actions[r]
        action_dir = os.path.join(out_base, action)
        os.makedirs(action_dir, exist_ok=True)
        frame_idx = 0
        for c in range(cols):
            box = (c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)
            cell = img.crop(box)
            # skip empty cells
            if cell.mode == 'RGBA':
                alpha = cell.split()[3]
                if not alpha.getbbox():
                    continue
            out_path = os.path.join(action_dir, f'{frame_idx}.png')
            cell.save(out_path)
            frame_idx += 1
            total += 1
    return total

def cut_projectiles():
    """Cut HumansProjectiles.png (16x16 cells)."""
    path = os.path.join(BASE, 'minifhumans', 'HumansProjectiles.png')
    if not os.path.exists(path):
        return
    img = Image.open(path)
    w, h = img.size
    out_dir = os.path.join(OUT, '6_投射物')
    os.makedirs(out_dir, exist_ok=True)
    cell = 16
    idx = 0
    for r in range(h // cell):
        for c in range(w // cell):
            box = (c * cell, r * cell, (c + 1) * cell, (r + 1) * cell)
            tile = img.crop(box)
            if tile.mode == 'RGBA':
                alpha = tile.split()[3]
                if not alpha.getbbox():
                    continue
            tile.save(os.path.join(out_dir, f'projectile_{idx}.png'))
            idx += 1
    print(f'  投射物: {idx} frames')

def main():
    # Clean output
    if os.path.exists(OUT):
        shutil.rmtree(OUT)

    grand_total = 0

    for pack, outline_dir, no_outline_dir in SOURCES:
        for style_dir, style_label in [(outline_dir, 'outline'), (no_outline_dir, 'no_outline')]:
            src_dir = os.path.join(BASE, pack, style_dir)
            if not os.path.isdir(src_dir):
                continue
            for fname in sorted(os.listdir(src_dir)):
                if not fname.endswith('.png'):
                    continue
                char_name = fname[:-4]  # strip .png
                cls = CHAR_CLASS.get(char_name, '9_其他')
                # Strip "Mini" prefix for cleaner folder name
                short = char_name.replace('Mini', '')
                out_base = os.path.join(OUT, cls, short, style_label)
                count = cut_sheet(os.path.join(src_dir, fname), char_name, out_base)
                grand_total += count
                if count:
                    print(f'  {cls}/{short}/{style_label}: {count} frames')

    cut_projectiles()
    print(f'\n完成！共切割 {grand_total} 張幀圖')
    print(f'輸出目錄: {OUT}')

if __name__ == '__main__':
    main()
