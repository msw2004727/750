const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'game');
const OUT = path.join(__dirname, 'game.js');

// Module concatenation order (dependency-safe)
const ORDER = [
  'constants.js',
  'state.js',
  'eventBus.js',
  'tileData.js',
  'gameLoop.js',
  'spatialHash.js',
  'coords.js',
  'blocks.js',
  'geometry.js',
  'tools.js',
  'gridOverlay.js',
  'minimap.js',
  'renderer.js',
  'hitTest.js',
  'contextMenu.js',
  'history.js',
  'staging.js',
  'inputDrag.js',
  'input.js',
  'touch.js',
  'palette.js',
  'saveLoad.js',
  'combos.js',
  'ui.js',
  'playMode.js',
  'resourceUI.js',
  'main.js',
];

function strip(filename, src) {
  let lines = src.split('\n');

  // Remove import lines
  lines = lines.filter(l => !l.trimStart().startsWith('import '));

  // Remove "export { ... }" lines
  lines = lines.filter(l => !/^\s*export\s*\{/.test(l));

  let text = lines.join('\n');

  // Strip export keywords, keep declarations
  text = text.replace(/^export function /gm, 'function ');
  text = text.replace(/^export const /gm,    'const ');
  text = text.replace(/^export let /gm,      'let ');

  // state.js: draw() is now a function that sets _dirty — keep it as is
  // Remove old patterns if any remain
  if (filename === 'state.js') {
    text = text.replace(/^let draw = \(\) => \{\};\s*$/gm, '');
    text = text.replace(/^function _setDraw\(fn\)\s*\{\s*draw\s*=\s*fn;\s*\}\s*$/gm, '');
  }

  // gameLoop.js: setRealDraw registration works in bundle scope — keep it
  // renderer.js: setRealDraw call works in bundle scope — keep it

  // input.js: remove setJumpToTile indirection (direct call works in single scope)
  if (filename === 'input.js') {
    text = text.replace(/^let _jumpToTile = null;\s*$/gm, '');
    text = text.replace(/^function setJumpToTile\(fn\)\s*\{\s*_jumpToTile\s*=\s*fn;\s*\}\s*$/gm, '');
    text = text.replace(/if\(_jumpToTile\)\s*_jumpToTile\(/g, 'if(jumpToTile) jumpToTile(');
  }

  // palette.js: remove setJumpToTile call
  if (filename === 'palette.js') {
    text = text.replace(/^setJumpToTile\(jumpToTile\);\s*$/gm, '');
  }

  return text;
}

// ── Auto-merge offsets.json into tileData.js ──
const OFFSETS_FILE = path.join(__dirname, 'offsets.json');
if (fs.existsSync(OFFSETS_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(OFFSETS_FILE, 'utf8'));
    // Support new format {offsets:{}, elements:{}} and old flat format {key:val}
    const offsets = raw.offsets || (raw.elements ? {} : raw);
    const elements = raw.elements || {};
    const tdPath = path.join(DIR, 'tileData.js');
    let td = fs.readFileSync(tdPath, 'utf8');
    let merged = 0;

    // Helper: parse existing JS object literal from source
    function _parseExisting(src, varName) {
      const re = new RegExp('const ' + varName + ' = (\\{[^}]*\\});', 's');
      const m = src.match(re);
      if (m) try { return JSON.parse(m[1].replace(/'/g, '"').replace(/,\s*}/g, '}')); } catch(e) {}
      return {};
    }

    // Merge yOffset defaults (additive)
    if (Object.keys(offsets).length > 0) {
      const existing = _parseExisting(td, 'DEFAULT_Y_OFFSETS');
      const combined = Object.assign(existing, offsets);
      const formatted = JSON.stringify(combined, null, 2).replace(/^/gm, '  ').trim();
      td = td.replace(
        /const DEFAULT_Y_OFFSETS = \{[^}]*\};/s,
        'const DEFAULT_Y_OFFSETS = ' + formatted + ';'
      );
      merged += Object.keys(offsets).length;
      console.log(`Merged ${Object.keys(offsets).length} offsets (total: ${Object.keys(combined).length})`);
    }

    // Merge element overrides (additive)
    if (Object.keys(elements).length > 0) {
      const existing = _parseExisting(td, 'ELEM_OVERRIDES');
      const combined = Object.assign(existing, elements);
      const elemFormatted = JSON.stringify(combined, null, 2).replace(/^/gm, '  ').trim();
      if (td.includes('const ELEM_OVERRIDES')) {
        td = td.replace(
          /const ELEM_OVERRIDES = \{[^}]*\};/s,
          'const ELEM_OVERRIDES = ' + elemFormatted + ';'
        );
      } else {
        td = td.replace(
          /(const DEFAULT_Y_OFFSETS = \{[^}]*\};)/s,
          '$1\n\nconst ELEM_OVERRIDES = ' + elemFormatted + ';'
        );
      }
      merged += Object.keys(elements).length;
      console.log(`Merged ${Object.keys(elements).length} element overrides (total: ${Object.keys(combined).length})`);
    }
    if (merged > 0) fs.writeFileSync(tdPath, td, 'utf8');
  } catch (e) {
    console.warn('Warning: failed to read offsets.json:', e.message);
  }
}

// Build
const parts = ['(function(){'];
for (const file of ORDER) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const stripped = strip(file, src);
  parts.push(`// ── ${file} ──`);
  parts.push(stripped);
  parts.push('');
}
parts.push('})();');

fs.writeFileSync(OUT, parts.join('\n'), 'utf8');

const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`Built ${OUT} (${kb} KB) from ${ORDER.length} modules`);
