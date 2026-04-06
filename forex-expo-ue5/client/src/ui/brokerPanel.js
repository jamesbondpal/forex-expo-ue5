/**
 * brokerPanel.js — Slide-up broker info panel (bottom-right).
 * Fetches broker data from the server API, caches it, and renders a
 * rich info card with CTA buttons that open the relevant modals.
 */

import { openModal } from './overlay.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const brokerCache = new Map();
let panelEl = null;
let currentBrokerId = null;
let _sendToUE5 = null;

async function getSendToUE5() {
  if (!_sendToUE5) {
    const mainModule = await import('../main.js');
    _sendToUE5 = mainModule.sendToUE5;
  }
  return _sendToUE5;
}

// ---------------------------------------------------------------------------
// Broker data fetching
// ---------------------------------------------------------------------------

async function fetchBroker(brokerId) {
  if (brokerCache.has(brokerId)) {
    return brokerCache.get(brokerId);
  }
  try {
    const res = await fetch(`/api/brokers/${brokerId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const broker = await res.json();
    brokerCache.set(brokerId, broker);
    return broker;
  } catch (err) {
    console.error(`[brokerPanel] Failed to fetch broker ${brokerId}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function ensurePanel() {
  if (panelEl) return panelEl;

  panelEl = document.getElementById('broker-panel');
  if (!panelEl) {
    panelEl = document.createElement('div');
    panelEl.id = 'broker-panel';
    panelEl.className = 'broker-panel';
    document.getElementById('ui-overlay').appendChild(panelEl);
  }
  return panelEl;
}

function tierBadgeHTML(tier, badgeGradient) {
  const gradient = badgeGradient || 'linear-gradient(135deg, #c9a44c, #f7e08a)';
  return `<span class="broker-tier-badge" style="background:${gradient}">${tier || 'Exhibitor'}</span>`;
}

function featuresGridHTML(features) {
  if (!features || features.length === 0) return '';
  const items = features
    .map(f => `<div class="feature-item"><span class="feature-icon">${f.icon || ''}</span><span class="feature-text">${f.label || f}</span></div>`)
    .join('');
  return `<div class="features-grid">${items}</div>`;
}

function renderPanel(broker) {
  const panel = ensurePanel();

  const primaryColor = broker.primaryColor || '#c9a44c';
  const accentColor = broker.accentColor || '#1a2744';

  // Apply broker colours as CSS custom properties
  panel.style.setProperty('--broker-primary', primaryColor);
  panel.style.setProperty('--broker-accent', accentColor);

  const features = broker.features || broker.highlights || [];
  const badgeGradient = broker.badgeGradient || `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;

  panel.innerHTML = `
    <button class="broker-panel-close" aria-label="Close">&times;</button>
    <div class="broker-panel-header">
      ${tierBadgeHTML(broker.tier, badgeGradient)}
      <h2 class="broker-name">${broker.name || broker.id}</h2>
      ${broker.tagline ? `<p class="broker-tagline">${broker.tagline}</p>` : ''}
    </div>
    ${broker.description ? `<p class="broker-description">${broker.description}</p>` : ''}
    ${featuresGridHTML(features)}
    <div class="broker-cta-row">
      <button class="cta-btn cta-ai" data-action="aiChat">AI Agent</button>
      <button class="cta-btn cta-mt5" data-action="mt5Feed">MT5 Live</button>
      <button class="cta-btn cta-book" data-action="booking">Book Meeting</button>
    </div>
  `;

  // Close button
  panel.querySelector('.broker-panel-close').addEventListener('click', () => {
    hide();
  });

  // CTA buttons
  panel.querySelectorAll('.cta-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const brokerId = currentBrokerId;

      // Notify UE5 side
      const send = await getSendToUE5();
      send({
        type: 'command',
        action: 'uiEvent',
        data: { event: action, brokerId },
      });

      // Open the corresponding modal
      openModal(action, { brokerId });
    });
  });
}

// ---------------------------------------------------------------------------
// Proximity listener (auto-close when visitor walks away)
// ---------------------------------------------------------------------------

function onProximityUpdate(event) {
  const msg = event.detail;
  if (!msg || msg.type !== 'event' || msg.name !== 'brokerProximity') return;
  const { distance } = msg.data || {};
  if (distance > 8 && panelEl && panelEl.classList.contains('visible')) {
    hide();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Show the broker panel for the given broker ID.
 * Fetches data (or uses cache) and slides the panel in.
 */
export async function show(brokerId) {
  if (!brokerId) return;

  // If already showing this broker, do nothing
  if (currentBrokerId === brokerId && panelEl && panelEl.classList.contains('visible')) {
    return;
  }

  currentBrokerId = brokerId;
  const broker = await fetchBroker(brokerId);
  if (!broker) return;

  renderPanel(broker);
  ensurePanel().classList.add('visible');

  // Listen for further proximity events to auto-close
  window.addEventListener('ue5-message', onProximityUpdate);
}

/**
 * Hide the broker panel.
 */
export function hide() {
  if (panelEl) {
    panelEl.classList.remove('visible');
  }
  currentBrokerId = null;
  window.removeEventListener('ue5-message', onProximityUpdate);
}
