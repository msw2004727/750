// ── Minimal DOM/Canvas/localStorage stubs for Node.js testing ──
// Must be imported BEFORE any game/ module (state.js does getElementById at eval time)

function _makeElement(tag) {
  const el = {
    tagName: tag?.toUpperCase() || 'DIV',
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    draggable: false,
    checked: false,
    value: '',
    type: '',
    accept: '',
    download: '',
    href: '',
    src: '',
    width: 800,
    height: 600,
    dataset: {},
    options: [],
    selectedIndex: 0,
    children: [],
    childNodes: [],
    parentElement: null,
    style: new Proxy({}, { set: () => true, get: () => '' }),
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) {
        if (force === undefined) force = !this._set.has(c);
        force ? this._set.add(c) : this._set.delete(c);
      },
      contains(c) { return this._set.has(c); },
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { el.children.push(child); child.parentElement = el; return child; },
    insertBefore(child) { el.children.unshift(child); child.parentElement = el; return child; },
    remove() {},
    click() {},
    focus() {},
    blur() {},
    contains(other) { return false; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 };
    },
    // Canvas-specific
    getContext(type) {
      if (type === '2d') return _mockCtx;
      return null;
    },
    toDataURL() { return 'data:image/png;base64,'; },
  };
  return el;
}

// Mock Canvas 2D context — all methods are no-ops
const _ctxMethods = [
  'clearRect', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'measureText',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'bezierCurveTo',
  'quadraticCurveTo', 'rect', 'roundRect', 'fill', 'stroke', 'clip',
  'drawImage', 'save', 'restore', 'setTransform', 'scale', 'translate', 'rotate',
  'setLineDash', 'getLineDash',
];
const _mockCtx = { imageSmoothingEnabled: true, globalAlpha: 1, lineWidth: 1,
  strokeStyle: '', fillStyle: '', font: '', textAlign: '', textBaseline: '',
  lineJoin: '', lineCap: '' };
for (const m of _ctxMethods) {
  _mockCtx[m] = m === 'measureText' ? () => ({ width: 10 }) : () => {};
}

// Element registry (for getElementById)
const _elements = new Map();
function _getOrCreate(id) {
  if (!_elements.has(id)) {
    const el = _makeElement('div');
    el.id = id;
    // Canvas element needs parentElement for resize()
    if (id === 'c') {
      el.tagName = 'CANVAS';
      el.parentElement = _makeElement('div');
      el.parentElement.getBoundingClientRect = () => ({ width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600 });
    }
    if (id === 'stagingGrid') {
      el.tagName = 'DIV';
    }
    _elements.set(id, el);
  }
  return _elements.get(id);
}

// document
globalThis.document = {
  getElementById: (id) => _getOrCreate(id),
  createElement: (tag) => _makeElement(tag),
  addEventListener() {},
  removeEventListener() {},
  querySelectorAll() { return []; },
  body: _makeElement('body'),
  activeElement: null,
};

// window
globalThis.window = globalThis.window || globalThis;
globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
globalThis.window.innerHeight = globalThis.window.innerHeight || 768;

// localStorage
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => _store.get(k) ?? null,
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
};

// Image
globalThis.Image = class Image {
  constructor() { this.onload = null; this.onerror = null; }
  set src(v) { /* do not trigger onload to avoid side effects */ }
  get src() { return ''; }
};

// Other browser globals
globalThis.devicePixelRatio = globalThis.devicePixelRatio || 1;
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.URL = globalThis.URL || { createObjectURL: () => '' };
globalThis.Blob = globalThis.Blob || class Blob { constructor() {} };
globalThis.FileReader = globalThis.FileReader || class FileReader {
  readAsText() {}
  set onload(fn) {}
};
globalThis.setTimeout = globalThis.setTimeout || ((fn, ms) => fn());
globalThis.clearTimeout = globalThis.clearTimeout || (() => {});

// Export for resetting between tests
export function resetDOM() {
  _elements.clear();
  _store.clear();
}
