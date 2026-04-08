// ── Play mode lifecycle (skeleton) ──
// enterPlay() / exitPlay() toggle between editor and game modes.
// Game modules listen to bus events; editor modules stay untouched.

import { S, game, draw } from './state.js';
import { bus } from './eventBus.js';

let _savedEditor = null;

export function enterPlay(){
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

export function exitPlay(){
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

export function togglePlay(){
  if(game.running) exitPlay();
  else enterPlay();
}

// ── Init: start in editor mode ──
document.body.classList.add('mode-editor');
