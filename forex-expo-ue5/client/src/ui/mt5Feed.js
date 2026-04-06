/**
 * Live MT5 Price Feed + Candlestick Chart
 *
 * Displays real-time simulated forex prices with a scrollable ticker strip
 * and an interactive candlestick chart on canvas.
 */

// ---------------------------------------------------------------------------
// Pair definitions
// ---------------------------------------------------------------------------
const PAIRS = [
  { symbol: 'EUR/USD', price: 1.0850, step: [0.0001, 0.0005], decimals: 4 },
  { symbol: 'GBP/USD', price: 1.2650, step: [0.0001, 0.0005], decimals: 4 },
  { symbol: 'USD/JPY', price: 149.50, step: [0.01, 0.05], decimals: 2 },
  { symbol: 'XAU/USD', price: 2340.00, step: [0.50, 2.00], decimals: 2 },
  { symbol: 'BTC/USD', price: 67500, step: [50, 200], decimals: 0 },
  { symbol: 'USD/CAD', price: 1.3650, step: [0.0001, 0.0005], decimals: 4 },
  { symbol: 'AUD/USD', price: 0.6580, step: [0.0001, 0.0005], decimals: 4 },
  { symbol: 'EUR/GBP', price: 0.8570, step: [0.0001, 0.0005], decimals: 4 },
];

// Timeframe configs (how many ticks per candle)
const TIMEFRAMES = {
  M1: { label: 'M1', ticksPerCandle: 3 },
  M5: { label: 'M5', ticksPerCandle: 8 },
  H1: { label: 'H1', ticksPerCandle: 15 },
  H4: { label: 'H4', ticksPerCandle: 25 },
  D1: { label: 'D1', ticksPerCandle: 40 },
};

const NUM_CANDLES = 30;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let modal = null;
let tickInterval = null;
let selectedPairIndex = 0;
let activeTimeframe = 'M1';

// Per-pair state
let pairStates = [];

function initPairStates() {
  pairStates = PAIRS.map((p) => {
    const spread = randomSpread(p);
    return {
      bid: p.price,
      ask: p.price + spread,
      prevBid: p.price,
      direction: 0, // 1 = up, -1 = down, 0 = neutral
      history: generateInitialHistory(p, 120),
      candles: [],
      tickCount: 0,
      currentCandle: null,
    };
  });
  // Build initial candles for each pair
  pairStates.forEach((ps, i) => {
    ps.candles = buildCandlesFromHistory(ps.history, TIMEFRAMES[activeTimeframe].ticksPerCandle);
  });
}

function randomSpread(pair) {
  if (pair.decimals === 0) return Math.round(Math.random() * 30 + 20);
  if (pair.decimals === 2) {
    if (pair.symbol === 'XAU/USD') return +(Math.random() * 0.40 + 0.20).toFixed(2);
    return +(Math.random() * 0.03 + 0.01).toFixed(2);
  }
  return +(Math.random() * 0.0003 + 0.0001).toFixed(pair.decimals);
}

function generateInitialHistory(pair, count) {
  const history = [];
  let price = pair.price - (pair.step[1] * count * 0.3);
  for (let i = 0; i < count; i++) {
    const delta = randomStep(pair);
    price += delta;
    if (price <= 0) price = pair.step[1];
    history.push(+price.toFixed(pair.decimals));
  }
  return history;
}

function randomStep(pair) {
  const [minStep, maxStep] = pair.step;
  const magnitude = minStep + Math.random() * (maxStep - minStep);
  return Math.random() > 0.5 ? magnitude : -magnitude;
}

function buildCandlesFromHistory(history, ticksPerCandle) {
  const candles = [];
  for (let i = 0; i < history.length; i += ticksPerCandle) {
    const slice = history.slice(i, i + ticksPerCandle);
    if (slice.length === 0) break;
    candles.push({
      open: slice[0],
      close: slice[slice.length - 1],
      high: Math.max(...slice),
      low: Math.min(...slice),
    });
  }
  // Keep last NUM_CANDLES
  return candles.slice(-NUM_CANDLES);
}

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------
function showToast(message) {
  let toast = document.getElementById('mt5-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mt5-toast';
    Object.assign(toast.style, {
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      background: '#1a1a2e', color: '#e0e0e0', padding: '12px 24px', borderRadius: '8px',
      fontSize: '14px', zIndex: '100001', opacity: '0', transition: 'opacity 0.3s',
      border: '1px solid #00d2ff', boxShadow: '0 4px 20px rgba(0,210,255,0.3)',
    });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ---------------------------------------------------------------------------
// DOM creation
// ---------------------------------------------------------------------------
function createModal(brokerId) {
  const el = document.createElement('div');
  el.id = 'mt5-modal';
  el.innerHTML = `
    <style>
      #mt5-modal {
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', 'Segoe UI', sans-serif; color: #e0e0e0;
        animation: mt5FadeIn 0.25s ease;
      }
      @keyframes mt5FadeIn { from { opacity: 0; } to { opacity: 1; } }
      .mt5-container {
        background: #0d1117; border-radius: 12px; width: 94vw; max-width: 1100px;
        max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
        border: 1px solid #1c2333; box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      }
      .mt5-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 20px; border-bottom: 1px solid #1c2333; background: #0a0e16;
      }
      .mt5-header h2 { margin: 0; font-size: 16px; font-weight: 600; color: #00d2ff; }
      .mt5-header span { font-size: 13px; color: #8b949e; margin-left: 10px; }
      .mt5-close {
        background: none; border: none; color: #8b949e; font-size: 22px; cursor: pointer;
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        border-radius: 6px; transition: all 0.15s;
      }
      .mt5-close:hover { background: #1c2333; color: #fff; }
      .mt5-ticker-strip {
        display: flex; gap: 2px; overflow-x: auto; padding: 8px 12px;
        background: #0a0e16; border-bottom: 1px solid #1c2333;
        scrollbar-width: thin; scrollbar-color: #1c2333 transparent;
      }
      .mt5-ticker-strip::-webkit-scrollbar { height: 4px; }
      .mt5-ticker-strip::-webkit-scrollbar-track { background: transparent; }
      .mt5-ticker-strip::-webkit-scrollbar-thumb { background: #1c2333; border-radius: 2px; }
      .mt5-pair {
        flex-shrink: 0; padding: 8px 12px; border-radius: 6px; cursor: pointer;
        background: #161b22; border: 1px solid transparent; min-width: 120px;
        transition: all 0.15s; user-select: none;
      }
      .mt5-pair:hover { border-color: #30363d; }
      .mt5-pair.selected { border-color: #00d2ff; background: #111820; }
      .mt5-pair .symbol { font-size: 11px; font-weight: 600; color: #8b949e; margin-bottom: 3px; }
      .mt5-pair .prices { display: flex; gap: 8px; align-items: baseline; }
      .mt5-pair .bid { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
      .mt5-pair .ask { font-size: 11px; color: #8b949e; font-variant-numeric: tabular-nums; }
      .mt5-pair .spread-val { font-size: 10px; color: #6e7681; }
      .mt5-pair .arrow { font-size: 12px; margin-left: 4px; }
      .mt5-pair .flash-green { animation: flashG 0.4s; }
      .mt5-pair .flash-red { animation: flashR 0.4s; }
      @keyframes flashG { 0%,100% { background: transparent; } 30% { background: rgba(0,210,100,0.15); } }
      @keyframes flashR { 0%,100% { background: transparent; } 30% { background: rgba(255,60,60,0.15); } }
      .mt5-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
      .mt5-chart-area { flex: 1; position: relative; min-height: 280px; padding: 10px; }
      .mt5-chart-area canvas { width: 100%; height: 100%; display: block; }
      .mt5-controls {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 10px 16px; border-top: 1px solid #1c2333; background: #0a0e16;
        flex-wrap: wrap;
      }
      .mt5-tf-group { display: flex; gap: 4px; }
      .mt5-tf-btn {
        padding: 5px 12px; border-radius: 4px; border: 1px solid #30363d;
        background: #161b22; color: #8b949e; font-size: 12px; cursor: pointer;
        font-weight: 600; transition: all 0.15s;
      }
      .mt5-tf-btn:hover { border-color: #58a6ff; color: #c9d1d9; }
      .mt5-tf-btn.active { background: #00d2ff; color: #0d1117; border-color: #00d2ff; }
      .mt5-trade-btns { display: flex; gap: 8px; }
      .mt5-buy-btn, .mt5-sell-btn {
        padding: 8px 28px; border-radius: 6px; border: none; font-size: 13px;
        font-weight: 700; cursor: pointer; transition: all 0.15s; letter-spacing: 0.5px;
      }
      .mt5-buy-btn { background: #00c853; color: #fff; }
      .mt5-buy-btn:hover { background: #00e676; }
      .mt5-sell-btn { background: #ff1744; color: #fff; }
      .mt5-sell-btn:hover { background: #ff5252; }
    </style>
    <div class="mt5-container">
      <div class="mt5-header">
        <div style="display:flex;align-items:center;">
          <h2>MT5 Live Feed</h2>
          <span>${brokerId ? `Broker: ${brokerId}` : 'Market Watch'}</span>
        </div>
        <button class="mt5-close" id="mt5-close-btn">&times;</button>
      </div>
      <div class="mt5-ticker-strip" id="mt5-ticker-strip"></div>
      <div class="mt5-body">
        <div class="mt5-chart-area">
          <canvas id="mt5-canvas"></canvas>
        </div>
        <div class="mt5-controls">
          <div class="mt5-tf-group" id="mt5-tf-group"></div>
          <div class="mt5-trade-btns">
            <button class="mt5-buy-btn" id="mt5-buy-btn">BUY</button>
            <button class="mt5-sell-btn" id="mt5-sell-btn">SELL</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Ticker strip rendering
// ---------------------------------------------------------------------------
function renderTickerStrip() {
  const strip = document.getElementById('mt5-ticker-strip');
  if (!strip) return;

  if (strip.children.length === 0) {
    // Initial render
    PAIRS.forEach((pair, i) => {
      const div = document.createElement('div');
      div.className = `mt5-pair${i === selectedPairIndex ? ' selected' : ''}`;
      div.dataset.index = i;
      div.addEventListener('click', () => selectPair(i));
      div.innerHTML = `
        <div class="symbol">${pair.symbol}</div>
        <div class="prices">
          <span class="bid"></span>
          <span class="ask"></span>
          <span class="arrow"></span>
        </div>
        <div class="spread-val"></div>
      `;
      strip.appendChild(div);
    });
  }

  // Update values
  const pairEls = strip.querySelectorAll('.mt5-pair');
  pairEls.forEach((el, i) => {
    const ps = pairStates[i];
    const pair = PAIRS[i];
    const bidEl = el.querySelector('.bid');
    const askEl = el.querySelector('.ask');
    const arrowEl = el.querySelector('.arrow');
    const spreadEl = el.querySelector('.spread-val');

    bidEl.textContent = ps.bid.toFixed(pair.decimals);
    askEl.textContent = ps.ask.toFixed(pair.decimals);

    const spread = ps.ask - ps.bid;
    if (pair.decimals >= 4) {
      spreadEl.textContent = `Spread: ${(spread * 10000).toFixed(1)} pts`;
    } else if (pair.decimals === 2 && pair.symbol === 'XAU/USD') {
      spreadEl.textContent = `Spread: ${spread.toFixed(2)}`;
    } else if (pair.decimals === 0) {
      spreadEl.textContent = `Spread: ${spread.toFixed(0)}`;
    } else {
      spreadEl.textContent = `Spread: ${(spread * 100).toFixed(1)} pts`;
    }

    if (ps.direction > 0) {
      arrowEl.textContent = '\u25B2';
      arrowEl.style.color = '#00c853';
      bidEl.style.color = '#00c853';
    } else if (ps.direction < 0) {
      arrowEl.textContent = '\u25BC';
      arrowEl.style.color = '#ff1744';
      bidEl.style.color = '#ff1744';
    } else {
      arrowEl.textContent = '';
      bidEl.style.color = '#e0e0e0';
    }

    // Flash animation
    if (ps.direction !== 0) {
      const flashClass = ps.direction > 0 ? 'flash-green' : 'flash-red';
      bidEl.classList.remove('flash-green', 'flash-red');
      // Force reflow
      void bidEl.offsetWidth;
      bidEl.classList.add(flashClass);
    }

    el.classList.toggle('selected', i === selectedPairIndex);
  });
}

function selectPair(index) {
  selectedPairIndex = index;
  renderTickerStrip();
  drawChart();
}

// ---------------------------------------------------------------------------
// Timeframe buttons
// ---------------------------------------------------------------------------
function renderTimeframeButtons() {
  const group = document.getElementById('mt5-tf-group');
  if (!group) return;
  group.innerHTML = '';

  Object.keys(TIMEFRAMES).forEach((key) => {
    const btn = document.createElement('button');
    btn.className = `mt5-tf-btn${key === activeTimeframe ? ' active' : ''}`;
    btn.textContent = TIMEFRAMES[key].label;
    btn.addEventListener('click', () => {
      activeTimeframe = key;
      // Rebuild candles for all pairs with new timeframe
      pairStates.forEach((ps) => {
        ps.candles = buildCandlesFromHistory(ps.history, TIMEFRAMES[activeTimeframe].ticksPerCandle);
        ps.tickCount = 0;
        ps.currentCandle = null;
      });
      renderTimeframeButtons();
      drawChart();
    });
    group.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// Candlestick chart drawing
// ---------------------------------------------------------------------------
function drawChart() {
  const canvas = document.getElementById('mt5-canvas');
  if (!canvas) return;

  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const ps = pairStates[selectedPairIndex];
  const pair = PAIRS[selectedPairIndex];
  let candles = [...ps.candles];
  if (ps.currentCandle) {
    candles.push(ps.currentCandle);
  }
  candles = candles.slice(-NUM_CANDLES);

  if (candles.length === 0) return;

  // Price range
  let allHigh = -Infinity;
  let allLow = Infinity;
  candles.forEach((c) => {
    if (c.high > allHigh) allHigh = c.high;
    if (c.low < allLow) allLow = c.low;
  });

  const priceRange = allHigh - allLow || 1;
  const paddingTop = 20;
  const paddingBottom = 10;
  const paddingRight = 70;
  const paddingLeft = 10;
  const chartW = W - paddingLeft - paddingRight;
  const chartH = H - paddingTop - paddingBottom;

  const candleWidth = Math.max(2, (chartW / NUM_CANDLES) * 0.7);
  const candleGap = chartW / NUM_CANDLES;

  function priceToY(price) {
    return paddingTop + chartH - ((price - allLow) / priceRange) * chartH;
  }

  // Grid lines
  ctx.strokeStyle = '#1c2333';
  ctx.lineWidth = 0.5;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const price = allLow + (priceRange / gridLines) * i;
    const y = priceToY(price);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(W - paddingRight, y);
    ctx.stroke();

    // Price label on right axis
    ctx.fillStyle = '#6e7681';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(price.toFixed(pair.decimals), W - paddingRight + 6, y + 4);
  }

  // Draw candles
  candles.forEach((c, i) => {
    const x = paddingLeft + i * candleGap + candleGap / 2;
    const isUp = c.close >= c.open;
    const color = isUp ? '#00c853' : '#ff1744';

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, priceToY(c.high));
    ctx.lineTo(x, priceToY(c.low));
    ctx.stroke();

    // Body
    const bodyTop = priceToY(Math.max(c.open, c.close));
    const bodyBottom = priceToY(Math.min(c.open, c.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    ctx.fillStyle = color;
    if (isUp) {
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    } else {
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }
  });

  // Current price line
  const currentPrice = ps.bid;
  const cpY = priceToY(currentPrice);
  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(paddingLeft, cpY);
  ctx.lineTo(W - paddingRight, cpY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Price tag
  ctx.fillStyle = '#00d2ff';
  ctx.fillRect(W - paddingRight, cpY - 9, paddingRight - 2, 18);
  ctx.fillStyle = '#0d1117';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(currentPrice.toFixed(pair.decimals), W - paddingRight + 4, cpY + 4);

  // Pair label
  ctx.fillStyle = '#8b949e';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${pair.symbol}  ${TIMEFRAMES[activeTimeframe].label}`, paddingLeft + 6, paddingTop + 16);
}

// ---------------------------------------------------------------------------
// Price tick
// ---------------------------------------------------------------------------
function tick() {
  const tf = TIMEFRAMES[activeTimeframe];

  pairStates.forEach((ps, i) => {
    const pair = PAIRS[i];
    ps.prevBid = ps.bid;

    // Random walk
    const delta = randomStep(pair);
    let newBid = +(ps.bid + delta).toFixed(pair.decimals);
    if (newBid <= 0) newBid = pair.step[1];
    ps.bid = newBid;

    const spread = randomSpread(pair);
    ps.ask = +(ps.bid + spread).toFixed(pair.decimals);

    // Direction
    if (ps.bid > ps.prevBid) ps.direction = 1;
    else if (ps.bid < ps.prevBid) ps.direction = -1;
    else ps.direction = 0;

    // History
    ps.history.push(ps.bid);

    // Candle building
    ps.tickCount++;
    if (!ps.currentCandle) {
      ps.currentCandle = { open: ps.bid, high: ps.bid, low: ps.bid, close: ps.bid };
    } else {
      ps.currentCandle.close = ps.bid;
      if (ps.bid > ps.currentCandle.high) ps.currentCandle.high = ps.bid;
      if (ps.bid < ps.currentCandle.low) ps.currentCandle.low = ps.bid;
    }

    if (ps.tickCount >= tf.ticksPerCandle) {
      ps.candles.push({ ...ps.currentCandle });
      if (ps.candles.length > NUM_CANDLES) ps.candles.shift();
      ps.currentCandle = null;
      ps.tickCount = 0;
    }
  });

  renderTickerStrip();
  drawChart();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function open({ brokerId } = {}) {
  if (modal) return;

  initPairStates();
  selectedPairIndex = 0;
  activeTimeframe = 'M1';

  modal = createModal(brokerId);

  // Close button
  document.getElementById('mt5-close-btn').addEventListener('click', close);

  // Click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', escHandler);
  modal._escHandler = escHandler;

  // Trade buttons
  document.getElementById('mt5-buy-btn').addEventListener('click', () => {
    showToast('Open a live account to trade');
  });
  document.getElementById('mt5-sell-btn').addEventListener('click', () => {
    showToast('Open a live account to trade');
  });

  renderTimeframeButtons();
  renderTickerStrip();
  drawChart();

  // Start tick
  tickInterval = setInterval(tick, 800);

  // Resize handler
  const resizeHandler = () => drawChart();
  window.addEventListener('resize', resizeHandler);
  modal._resizeHandler = resizeHandler;
}

export function close() {
  if (!modal) return;

  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }

  if (modal._escHandler) {
    document.removeEventListener('keydown', modal._escHandler);
  }
  if (modal._resizeHandler) {
    window.removeEventListener('resize', modal._resizeHandler);
  }

  modal.remove();
  modal = null;
  pairStates = [];
}
