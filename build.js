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
  'input.js',
  'touch.js',
  'palette.js',
  'saveLoad.js',
  'combos.js',
  'ui.js',
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
