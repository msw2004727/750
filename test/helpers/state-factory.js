// ── Reset shared singleton state between tests ──
import { S, world, camera, game } from '../../game/state.js';
import { shRebuild } from '../../game/spatialHash.js';

export function resetState() {
  // Game
  game.running = false;
  game.resources = {};
  game.lastTick = 0;

  // World
  world.blocks = [];
  world.fogRadius = 0;
  world.fogCenter = { gx: 0, gy: 0 };

  // Camera
  camera.x = 0;
  camera.y = 0;
  camera.zoom = 1;
  camera.W = 800;
  camera.H = 600;

  // Editor state — reset all fields to defaults
  S.selectedBlocks = new Set();
  S.groupOffsets = null;
  S.boxSelect = null;

  S.history = [];
  S.redoStack = [];

  S.dragBlock = null;
  S.dragOffX = 0;
  S.dragOffY = 0;
  S.lastValidGx = 0;
  S.lastValidGy = 0;

  S.shakeBlock = null;
  S.shakeStart = 0;
  S.animTick = 0;

  S.panDrag = false;
  S.panStartX = 0;
  S.panStartY = 0;
  S.panCamStartX = 0;
  S.panCamStartY = 0;

  S.reachableSet = null;
  S.currentHeight = 0;
  S.currentLayer = 0;

  S.showCoords = false;
  S.showGrid = false;
  S.showVGrid = false;
  S.showHover = false;
  S.showMinimap = false;
  S.showLayerInfo = false;
  S.hoverBlock = null;

  S.selectMode = false;
  S.locateMode = false;
  S.copyMode = false;
  S.autoSelectMode = false;
  S.brushMode = false;
  S.eraserMode = false;
  S.fillMode = false;
  S.rectMode = false;
  S.lineMode = false;

  S.brushTile = null;
  S.brushPainting = false;
  S.brushCursorGx = -999;
  S.brushCursorGy = -999;

  S.rectStart = null;
  S.fillPreview = [];

  S.clipboard = null;
  S.lastMouseClientX = 0;
  S.lastMouseClientY = 0;
  S.canvasDragOverlay = null;

  S.hiddenHeights = new Set();
  S.hiddenLayers = new Set();

  S.tileDrag = null;
  S.mobileDragKey = null;
  S.mobileDragEl = null;

  S.staging = new Array(3).fill(null);
  S.selectedSrc = -1;
  S.selectedCat = 0;

  S.ctxMenu = null;
  S.combos = [];
  S.activeCombo = -1;

  S.pinch = null;
  S.lastTapTime = 0;

  S._dirty = false;
  S.animBlockCount = 0;

  // Rebuild spatial hash (clears it since world.blocks is empty)
  shRebuild();
}
