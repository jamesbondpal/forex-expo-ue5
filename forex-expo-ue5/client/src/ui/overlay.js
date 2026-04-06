/**
 * overlay.js — Master UI controller for the Forex Expo Dubai UE5 Pixel Streaming client.
 * Listens for 'ue5-message' custom events dispatched by main.js and routes them
 * to the appropriate UI module.  Manages modals, zone HUD, visitor counter,
 * and mobile on-screen controls.
 */

import { show as showBrokerPanel, hide as hideBrokerPanel } from './brokerPanel.js';
import { open as openAiChat, close as closeAiChat } from './aiChat.js';
import { open as openMt5Feed, close as closeMt5Feed } from './mt5Feed.js';
import { open as openBooking, close as closeBooking } from './booking.js';
import { open as openSeminar, close as closeSeminar } from './seminar.js';
import { open as openSponsorship, close as closeSponsorship } from './sponsorship.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let activeModal = null; // 'aiChat' | 'mt5Feed' | 'booking' | 'seminar' | null

const MODAL_MAP = {
  aiChat:   { open: openAiChat,   close: closeAiChat },
  mt5Feed:  { open: openMt5Feed,  close: closeMt5Feed },
  booking:  { open: openBooking,  close: closeBooking },
  seminar:      { open: openSeminar,      close: closeSeminar },
  sponsorship:  { open: openSponsorship,  close: closeSponsorship },
};

// ---------------------------------------------------------------------------
// Helpers — sendToUE5 import (lazy, avoids circular-dep at module-eval time)
// ---------------------------------------------------------------------------

let _sendToUE5 = null;

async function getSendToUE5() {
  if (!_sendToUE5) {
    const mainModule = await import('../main.js');
    _sendToUE5 = mainModule.sendToUE5;
  }
  return _sendToUE5;
}

function sendInput(key) {
  getSendToUE5().then(send => {
    send({ type: 'command', action: 'input', data: { key } });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open a named modal.  If another modal is already open it is closed first.
 * @param {string} name   One of 'aiChat', 'mt5Feed', 'booking', 'seminar'
 * @param {object} [data] Passed through to the modal's open() function
 */
export function openModal(name, data) {
  if (activeModal) {
    const prev = MODAL_MAP[activeModal];
    if (prev) prev.close();
  }
  const entry = MODAL_MAP[name];
  if (!entry) {
    console.warn(`[overlay] Unknown modal: ${name}`);
    return;
  }
  entry.open(data);
  activeModal = name;
}

/**
 * Close whichever modal is currently open.
 */
export function closeModal() {
  if (activeModal) {
    const entry = MODAL_MAP[activeModal];
    if (entry) entry.close();
    activeModal = null;
  }
}

// ---------------------------------------------------------------------------
// Zone label
// ---------------------------------------------------------------------------

const ZONE_LABELS = {
  main_hall:       'MAIN HALL',
  sponsor_booths:  'SPONSOR BOOTHS',
  business_lounge: 'BUSINESS LOUNGE',
  seminar_stage:   'SEMINAR STAGE',
};

let zoneLabelEl = null;
let zoneFadeTimer = null;

function ensureZoneLabel() {
  if (zoneLabelEl) return zoneLabelEl;
  zoneLabelEl = document.getElementById('zone-label');
  if (!zoneLabelEl) {
    zoneLabelEl = document.createElement('div');
    zoneLabelEl.id = 'zone-label';
    zoneLabelEl.className = 'hud-zone-label';
    document.getElementById('ui-overlay').appendChild(zoneLabelEl);
  }
  return zoneLabelEl;
}

function updateZone(zone) {
  const el = ensureZoneLabel();
  const label = ZONE_LABELS[zone] || zone.toUpperCase().replace(/_/g, ' ');
  el.textContent = label;
  el.classList.add('visible');

  clearTimeout(zoneFadeTimer);
  zoneFadeTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, 4000);
}

// ---------------------------------------------------------------------------
// Visitor counter
// ---------------------------------------------------------------------------

let visitorCountEl = null;

function ensureVisitorCount() {
  if (visitorCountEl) return visitorCountEl;
  visitorCountEl = document.getElementById('visitor-count');
  if (!visitorCountEl) {
    visitorCountEl = document.createElement('div');
    visitorCountEl.id = 'visitor-count';
    visitorCountEl.className = 'hud-visitor-count';
    visitorCountEl.innerHTML = '<span class="visitor-icon">&#x1f465;</span> <span class="visitor-number">0</span>';
    document.getElementById('ui-overlay').appendChild(visitorCountEl);
  }
  return visitorCountEl;
}

function updateVisitorCount(count) {
  const el = ensureVisitorCount();
  const num = el.querySelector('.visitor-number');
  if (num) {
    num.textContent = String(count);
  }
}

// ---------------------------------------------------------------------------
// Mobile controls (WASD)
// ---------------------------------------------------------------------------

function createMobileControls() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const container = document.createElement('div');
  container.id = 'mobile-controls';
  container.className = 'mobile-controls';
  if (!isTouchDevice) {
    container.classList.add('hidden');
  }

  const keys = [
    { key: 'w', label: 'W', gridArea: 'w' },
    { key: 'a', label: 'A', gridArea: 'a' },
    { key: 's', label: 'S', gridArea: 's' },
    { key: 'd', label: 'D', gridArea: 'd' },
  ];

  keys.forEach(({ key, label, gridArea }) => {
    const btn = document.createElement('button');
    btn.className = 'mobile-btn';
    btn.dataset.key = key;
    btn.textContent = label;
    btn.style.gridArea = gridArea;
    btn.setAttribute('aria-label', `Move ${label}`);

    // Support both touch and pointer events
    const onDown = (e) => {
      e.preventDefault();
      btn.classList.add('active');
      sendInput(key);
    };
    const onUp = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
    };

    btn.addEventListener('touchstart', onDown, { passive: false });
    btn.addEventListener('touchend', onUp, { passive: false });
    btn.addEventListener('mousedown', onDown);
    btn.addEventListener('mouseup', onUp);
    btn.addEventListener('mouseleave', onUp);

    container.appendChild(btn);
  });

  document.getElementById('ui-overlay').appendChild(container);
}

// ---------------------------------------------------------------------------
// UE5 message handler
// ---------------------------------------------------------------------------

function handleUE5Message(event) {
  const msg = event.detail;
  if (!msg || msg.type !== 'event') return;

  switch (msg.name) {
    case 'brokerProximity': {
      const { brokerId, distance } = msg.data || {};
      if (distance <= 8) {
        showBrokerPanel(brokerId);
      } else {
        hideBrokerPanel();
      }
      break;
    }

    case 'zone': {
      const { zone } = msg.data || {};
      if (zone) updateZone(zone);
      break;
    }

    case 'seminarTrigger': {
      openModal('seminar');
      break;
    }

    case 'playerCount': {
      const { count } = msg.data || {};
      if (count !== undefined) updateVisitorCount(count);
      break;
    }

    default:
      // Unknown event — ignore silently
      break;
  }
}

// ---------------------------------------------------------------------------
// Fallback mode
// ---------------------------------------------------------------------------

function enterFallbackMode() {
  console.log('[overlay] Entering fallback mode');

  // Hide fallback prompt, show fallback bar
  const fallbackMsg = document.getElementById('fallback-message');
  const loadingScreen = document.getElementById('loading-screen');
  const fallbackBar = document.getElementById('fallback-bar');
  if (fallbackMsg) fallbackMsg.classList.add('hidden');
  if (loadingScreen) loadingScreen.classList.add('hidden');
  if (fallbackBar) fallbackBar.classList.remove('hidden');

  // Show zone label for context
  updateZone('main_hall');

  // Show a simulated visitor count
  updateVisitorCount(247);

  // Wire up broker buttons
  document.querySelectorAll('.fallback-broker-btn[data-broker]').forEach(btn => {
    btn.addEventListener('click', () => {
      const brokerId = btn.dataset.broker;
      showBrokerPanel(brokerId);
    });
  });

  // Wire up seminar button
  const seminarBtn = document.querySelector('.fallback-seminar-btn');
  if (seminarBtn) {
    seminarBtn.addEventListener('click', () => {
      openModal('seminar');
    });
  }

  // Wire up sponsorship button
  const sponsorBtn = document.querySelector('.fallback-sponsor-btn');
  if (sponsorBtn) {
    sponsorBtn.addEventListener('click', () => {
      openModal('sponsorship');
    });
  }

  // Tick visitor count randomly
  setInterval(() => {
    const el = ensureVisitorCount();
    const num = el.querySelector('.visitor-number');
    if (num) {
      const current = parseInt(num.textContent, 10) || 247;
      const delta = Math.floor(Math.random() * 5) - 2;
      num.textContent = String(Math.max(200, current + delta));
    }
  }, 5000);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
  // Ensure HUD elements exist
  ensureZoneLabel();
  ensureVisitorCount();

  // Mobile WASD
  createMobileControls();

  // Listen for messages from the Pixel Streaming layer
  window.addEventListener('ue5-message', handleUE5Message);

  // Listen for fallback mode request
  window.addEventListener('enter-fallback-mode', enterFallbackMode);

  // Allow Escape to close any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      hideBrokerPanel();
    }
  });

  console.log('[overlay] UI overlay initialised');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
