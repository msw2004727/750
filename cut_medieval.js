const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '素材/MedimonGames - Pixometric Collection - Medieval World');
const OUT = path.join(__dirname, '素材/medieval');

const SHEETS = [
  { file: 'MedievalWorld-1.png', prefix: 'mw1', frames: 90 },
  { file: 'MedievalWorld-2.png', prefix: 'mw2', frames: 90 },
  { file: 'MedievalWorld-3.png', prefix: 'mw3', frames: 90 },
  { file: 'Winter Season/MedievalWorld-1-Winter.png', prefix: 'mw1w', frames: 90 },
  { file: 'Winter Season/MedievalWorld-2-Winter.png', prefix: 'mw2w', frames: 89 },
  { file: 'Winter Season/MedievalWorld-3-Winter.png', prefix: 'mw3w', frames: 89 },
];

const CELL = 96; // 32x32 at 3x zoom
const COLS = 9;

async function cutSheet(sheet) {
  const outDir = path.join(OUT, sheet.prefix);
  fs.mkdirSync(outDir, { recursive: true });

  const img = sharp(path.join(SRC, sheet.file));
  const meta = await img.metadata();
  const rows = Math.ceil(sheet.frames / COLS);

  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      if (idx >= sheet.frames) break;

      const left = c * CELL;
      const top = r * CELL;
      const w = Math.min(CELL, meta.width - left);
      const h = Math.min(CELL, meta.height - top);
      if (w <= 0 || h <= 0) continue;

      const outFile = path.join(outDir, `tile_${String(idx).padStart(3, '0')}.png`);
      await sharp(path.join(SRC, sheet.file))
        .extract({ left, top, width: w, height: h })
        .toFile(outFile);
      count++;
    }
  }
  console.log(`${sheet.prefix}: ${count} tiles cut to ${outDir}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const sheet of SHEETS) {
    await cutSheet(sheet);
  }
  console.log('Done!');
})();
