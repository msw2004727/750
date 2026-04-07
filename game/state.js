export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');

// ── Separated sub-objects ──
export const world = { blocks: [] };
export const camera = { x: 0, y: 0, zoom: 1, W: 0, H: 0 };

export const S = {
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
  showCoords: false, showGrid: false, showVGrid: false,
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
  staging: new Array(9).fill(null),

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
};

// ── draw() sets dirty flag — gameLoop does the actual render ──
export function draw() { S._dirty = true; }
