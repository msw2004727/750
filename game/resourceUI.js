// ── Resource bar UI: syncs game.resources to the #resourceBar display ──

import { game } from './state.js';
import { bus } from './eventBus.js';

const ELEMENTS = ['金', '木', '水', '火', '土'];
const CAPS = { 金: 9999, 木: 9999, 水: 9999, 火: 9999, 土: 9999 };

// Track rate: accumulate per-tick production, average over window
let _rateAccum = {};
let _rateWindow = [];
const RATE_SAMPLES = 30; // 30 ticks (60s at 2s/tick) for smoothing

function _resetRateTracking(){
  _rateAccum = {};
  _rateWindow = [];
  for(const e of ELEMENTS) _rateAccum[e] = 0;
}
_resetRateTracking();

// Called by game tick to record production deltas
export function recordProduction(element, amount){
  _rateAccum[element] = (_rateAccum[element] || 0) + amount;
}

// Flush one tick's accumulation into the sliding window
function _flushRateTick(){
  _rateWindow.push({..._rateAccum});
  if(_rateWindow.length > RATE_SAMPLES) _rateWindow.shift();
  for(const e of ELEMENTS) _rateAccum[e] = 0;
}

// Calculate per-hour rate from sliding window
function _getRate(element){
  if(_rateWindow.length === 0) return 0;
  let total = 0;
  for(const w of _rateWindow) total += (w[element] || 0);
  const perTick = total / _rateWindow.length;
  // Convert: perTick * (3600 / tickInterval_s)
  return perTick * (3600 / 2); // 2s tick → 1800 ticks/hr
}

// Update DOM
export function updateResourceBar(){
  for(const e of ELEMENTS){
    const cur = Math.floor(game.resources[e] || 0);
    const cap = CAPS[e];
    const pct = Math.min(100, (cur / cap) * 100);
    const rate = _getRate(e);

    const bar = document.getElementById('bar_' + e);
    const val = document.getElementById('val_' + e);
    const rateEl = document.getElementById('rate_' + e);
    if(bar) bar.style.width = pct + '%';
    if(val) val.textContent = cur + '/' + cap;
    if(rateEl){
      const sign = rate >= 0 ? '+' : '';
      rateEl.textContent = sign + Math.round(rate) + '/h';
      rateEl.className = 'res-rate ' + (rate > 0 ? 'positive' : rate < 0 ? 'negative' : 'zero');
    }
  }
}

// Listen to game tick for rate tracking + UI refresh
bus.on('play:tick', () => {
  _flushRateTick();
  updateResourceBar();
});

// Listen to mode change: refresh on enter, reset on exit
bus.on('mode', (mode) => {
  if(mode === 'game'){
    _resetRateTracking();
    // Init resources if empty
    if(!game.resources || Object.keys(game.resources).length === 0){
      game.resources = { 金: 10, 木: 30, 水: 15, 火: 20, 土: 20 };
    }
    updateResourceBar();
  }
});
