/**
 * Meeting Booking Form
 *
 * Full booking flow: form -> validation -> submission -> confirmation + .ics download.
 */

import { sessionId, sendToUE5 } from '../main.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIME_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
];

const TOPICS = [
  'Account Opening',
  'Platform Demo',
  'Spreads & Pricing',
  'Copy Trading',
  'API/Algo Trading',
  'Partnership/IB',
  'General Inquiry',
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let modal = null;
let selectedSlot = null;
let takenSlots = new Set();

// ---------------------------------------------------------------------------
// Pick 3 random "taken" slots
// ---------------------------------------------------------------------------
function pickTakenSlots() {
  takenSlots.clear();
  const indices = [];
  while (indices.length < 3) {
    const r = Math.floor(Math.random() * TIME_SLOTS.length);
    if (!indices.includes(r)) indices.push(r);
  }
  indices.forEach((i) => takenSlots.add(TIME_SLOTS[i]));
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  let err = el.parentElement.querySelector('.bk-field-error');
  if (!err) {
    err = document.createElement('div');
    err.className = 'bk-field-error';
    el.parentElement.appendChild(err);
  }
  err.textContent = message;
  err.style.display = 'block';
  el.style.borderColor = '#ff1744';
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const err = el.parentElement.querySelector('.bk-field-error');
  if (err) err.style.display = 'none';
  el.style.borderColor = '#30363d';
}

function clearAllErrors() {
  modal.querySelectorAll('.bk-field-error').forEach((e) => (e.style.display = 'none'));
  modal.querySelectorAll('input, select, textarea').forEach((e) => (e.style.borderColor = '#30363d'));
}

// ---------------------------------------------------------------------------
// ICS file generation
// ---------------------------------------------------------------------------
function generateICS({ brokerName, agentName, topic, timeSlot, zoomLink }) {
  // Build a date string for today with the time slot
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

  // Parse time slot
  const match = timeSlot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const startH = String(hours).padStart(2, '0');
  const startM = String(minutes).padStart(2, '0');
  const endHours = hours + 1;
  const endH = String(endHours).padStart(2, '0');

  const dtStart = `${dateStr}T${startH}${startM}00`;
  const dtEnd = `${dateStr}T${endH}${startM}00`;
  const uid = `forex-expo-${Date.now()}@forexexpodubai.com`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Forex Expo Dubai//Meeting Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `DTSTAMP:${stamp}`,
    `UID:${uid}`,
    `SUMMARY:${topic} - ${brokerName}`,
    `DESCRIPTION:Meeting with ${agentName} at ${brokerName}\\nTopic: ${topic}\\nZoom: ${zoomLink}`,
    `LOCATION:${zoomLink}`,
    `URL:${zoomLink}`,
    `ORGANIZER;CN=${agentName}:mailto:noreply@forexexpodubai.com`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Meeting in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ics;
}

function downloadICS(icsContent, filename) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// DOM creation
// ---------------------------------------------------------------------------
function createModal(brokerId) {
  const el = document.createElement('div');
  el.id = 'booking-modal';
  el.innerHTML = `
    <style>
      #booking-modal {
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', 'Segoe UI', sans-serif; color: #e0e0e0;
        animation: bkFadeIn 0.25s ease;
      }
      @keyframes bkFadeIn { from { opacity: 0; } to { opacity: 1; } }
      .bk-container {
        background: #0d1117; border-radius: 12px; width: 92vw; max-width: 560px;
        max-height: 92vh; overflow-y: auto; border: 1px solid #1c2333;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6);
        scrollbar-width: thin; scrollbar-color: #1c2333 transparent;
      }
      .bk-container::-webkit-scrollbar { width: 6px; }
      .bk-container::-webkit-scrollbar-track { background: transparent; }
      .bk-container::-webkit-scrollbar-thumb { background: #1c2333; border-radius: 3px; }
      .bk-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid #1c2333; background: #0a0e16;
        position: sticky; top: 0; z-index: 1;
      }
      .bk-header h2 { margin: 0; font-size: 16px; font-weight: 600; color: #00d2ff; }
      .bk-header .bk-sub { font-size: 12px; color: #8b949e; margin-top: 2px; }
      .bk-close {
        background: none; border: none; color: #8b949e; font-size: 22px; cursor: pointer;
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        border-radius: 6px; transition: all 0.15s;
      }
      .bk-close:hover { background: #1c2333; color: #fff; }
      .bk-form { padding: 20px; }
      .bk-field { margin-bottom: 16px; position: relative; }
      .bk-field label {
        display: block; font-size: 13px; font-weight: 600; color: #c9d1d9;
        margin-bottom: 6px;
      }
      .bk-field label .req { color: #ff1744; margin-left: 2px; }
      .bk-field input, .bk-field select, .bk-field textarea {
        width: 100%; padding: 10px 12px; border-radius: 6px;
        border: 1px solid #30363d; background: #161b22; color: #e0e0e0;
        font-size: 14px; font-family: inherit; outline: none; box-sizing: border-box;
        transition: border-color 0.15s;
      }
      .bk-field input:focus, .bk-field select:focus, .bk-field textarea:focus {
        border-color: #00d2ff;
      }
      .bk-field textarea { resize: vertical; min-height: 70px; }
      .bk-field-error {
        font-size: 12px; color: #ff1744; margin-top: 4px; display: none;
      }
      .bk-slots-label { font-size: 13px; font-weight: 600; color: #c9d1d9; margin-bottom: 8px; }
      .bk-slots-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
        margin-bottom: 16px;
      }
      .bk-slot {
        padding: 10px 4px; border-radius: 6px; border: 1px solid #30363d;
        background: #161b22; color: #c9d1d9; font-size: 13px; text-align: center;
        cursor: pointer; transition: all 0.15s; user-select: none;
      }
      .bk-slot:hover:not(.taken):not(.selected) { border-color: #58a6ff; }
      .bk-slot.selected { background: #00d2ff; color: #0d1117; border-color: #00d2ff; font-weight: 600; }
      .bk-slot.taken {
        background: #1c2333; color: #484f58; border-color: #1c2333;
        cursor: not-allowed; text-decoration: line-through;
      }
      .bk-submit {
        width: 100%; padding: 12px; border-radius: 8px; border: none;
        background: linear-gradient(135deg, #00d2ff, #0088cc);
        color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
        transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .bk-submit:hover { opacity: 0.9; }
      .bk-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      .bk-spinner {
        width: 16px; height: 16px; border: 2px solid transparent;
        border-top-color: #fff; border-radius: 50%;
        animation: bkSpin 0.6s linear infinite; display: none;
      }
      @keyframes bkSpin { to { transform: rotate(360deg); } }
      .bk-submit.loading .bk-spinner { display: block; }
      .bk-submit.loading .bk-submit-text { display: none; }
      .bk-success {
        padding: 40px 20px; text-align: center; display: none;
      }
      .bk-success .check-icon {
        width: 64px; height: 64px; border-radius: 50%;
        background: linear-gradient(135deg, #00c853, #00e676);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px; font-size: 32px; color: #fff;
      }
      .bk-success h3 { margin: 0 0 20px; font-size: 20px; color: #00c853; }
      .bk-details-table {
        width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 20px;
      }
      .bk-details-table td {
        padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #1c2333;
      }
      .bk-details-table td:first-child { color: #8b949e; font-weight: 600; width: 110px; }
      .bk-details-table td:last-child { color: #e0e0e0; }
      .bk-details-table a { color: #00d2ff; text-decoration: none; }
      .bk-details-table a:hover { text-decoration: underline; }
      .bk-cal-btn {
        padding: 10px 24px; border-radius: 8px; border: 1px solid #00d2ff;
        background: transparent; color: #00d2ff; font-size: 14px; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
      }
      .bk-cal-btn:hover { background: rgba(0,210,255,0.1); }
    </style>
    <div class="bk-container">
      <div class="bk-header">
        <div>
          <h2>Book a Meeting</h2>
          <div class="bk-sub" id="bk-broker-info"></div>
        </div>
        <button class="bk-close" id="bk-close-btn">&times;</button>
      </div>
      <div class="bk-form" id="bk-form-section">
        <div class="bk-field">
          <label>Full Name <span class="req">*</span></label>
          <input type="text" id="bk-name" placeholder="John Doe" autocomplete="name" />
          <div class="bk-field-error"></div>
        </div>
        <div class="bk-field">
          <label>Email <span class="req">*</span></label>
          <input type="email" id="bk-email" placeholder="john@example.com" autocomplete="email" />
          <div class="bk-field-error"></div>
        </div>
        <div class="bk-field">
          <label>Phone</label>
          <input type="tel" id="bk-phone" placeholder="+971 50 123 4567" autocomplete="tel" />
          <div class="bk-field-error"></div>
        </div>
        <div class="bk-field">
          <label>Topic <span class="req">*</span></label>
          <select id="bk-topic">
            <option value="">Select a topic...</option>
            ${TOPICS.map((t) => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <div class="bk-field-error"></div>
        </div>
        <div class="bk-field">
          <div class="bk-slots-label">Select a Time Slot <span style="color:#ff1744;">*</span></div>
          <div class="bk-slots-grid" id="bk-slots-grid"></div>
          <div class="bk-field-error" id="bk-slot-error"></div>
        </div>
        <div class="bk-field">
          <label>Message</label>
          <textarea id="bk-message" placeholder="Any additional details or questions..."></textarea>
        </div>
        <button class="bk-submit" id="bk-submit-btn">
          <span class="bk-submit-text">Book Meeting</span>
          <div class="bk-spinner"></div>
        </button>
      </div>
      <div class="bk-success" id="bk-success-section">
        <div class="check-icon">\u2713</div>
        <h3>Meeting Confirmed!</h3>
        <table class="bk-details-table" id="bk-details-table"></table>
        <button class="bk-cal-btn" id="bk-cal-btn">\uD83D\uDCC5 Add to Calendar</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Time slot grid
// ---------------------------------------------------------------------------
function renderSlots() {
  const grid = document.getElementById('bk-slots-grid');
  if (!grid) return;
  grid.innerHTML = '';

  TIME_SLOTS.forEach((slot) => {
    const btn = document.createElement('div');
    btn.className = 'bk-slot';
    btn.textContent = slot;

    if (takenSlots.has(slot)) {
      btn.classList.add('taken');
    } else {
      btn.addEventListener('click', () => {
        selectedSlot = slot;
        grid.querySelectorAll('.bk-slot').forEach((s) => s.classList.remove('selected'));
        btn.classList.add('selected');
        const err = document.getElementById('bk-slot-error');
        if (err) err.style.display = 'none';
      });
    }

    grid.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------
async function handleSubmit(brokerId) {
  clearAllErrors();

  const name = document.getElementById('bk-name').value.trim();
  const email = document.getElementById('bk-email').value.trim();
  const phone = document.getElementById('bk-phone').value.trim();
  const topic = document.getElementById('bk-topic').value;
  const message = document.getElementById('bk-message').value.trim();

  let valid = true;

  if (!name) {
    showFieldError('bk-name', 'Full name is required');
    valid = false;
  }
  if (!email) {
    showFieldError('bk-email', 'Email is required');
    valid = false;
  } else if (!validateEmail(email)) {
    showFieldError('bk-email', 'Please enter a valid email address');
    valid = false;
  }
  if (!topic) {
    showFieldError('bk-topic', 'Please select a topic');
    valid = false;
  }
  if (!selectedSlot) {
    const err = document.getElementById('bk-slot-error');
    if (err) {
      err.textContent = 'Please select a time slot';
      err.style.display = 'block';
    }
    valid = false;
  }

  if (!valid) return;

  // Loading state
  const btn = document.getElementById('bk-submit-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const res = await fetch('/api/book-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brokerId,
        name,
        email,
        phone: phone || undefined,
        topic,
        timeSlot: selectedSlot,
        message: message || undefined,
        sessionId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Booking failed');
    }

    // Show success screen
    showSuccess({
      brokerName: brokerId,
      agentName: data.agentName || 'Agent',
      topic,
      timeSlot: selectedSlot,
      zoomLink: data.zoomLink,
      meetingId: data.meetingId,
    });

    // Notify UE5
    sendToUE5('meetingBooked', { brokerId, slot: selectedSlot });
  } catch (err) {
    btn.classList.remove('loading');
    btn.disabled = false;
    showFieldError('bk-name', err.message || 'Failed to book meeting. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------
function showSuccess({ brokerName, agentName, topic, timeSlot, zoomLink, meetingId }) {
  const formSection = document.getElementById('bk-form-section');
  const successSection = document.getElementById('bk-success-section');
  const table = document.getElementById('bk-details-table');

  if (formSection) formSection.style.display = 'none';
  if (successSection) successSection.style.display = 'block';

  if (table) {
    table.innerHTML = `
      <tr><td>Broker</td><td>${brokerName}</td></tr>
      <tr><td>Agent</td><td>${agentName}</td></tr>
      <tr><td>Topic</td><td>${topic}</td></tr>
      <tr><td>Time</td><td>${timeSlot}</td></tr>
      <tr><td>Meeting ID</td><td>${meetingId}</td></tr>
      <tr><td>Zoom Link</td><td><a href="${zoomLink}" target="_blank" rel="noopener">${zoomLink}</a></td></tr>
    `;
  }

  // Calendar button
  const calBtn = document.getElementById('bk-cal-btn');
  if (calBtn) {
    calBtn.addEventListener('click', () => {
      const ics = generateICS({ brokerName, agentName, topic, timeSlot, zoomLink });
      downloadICS(ics, `forex-expo-meeting-${meetingId}.ics`);
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function open({ brokerId } = {}) {
  if (modal) return;

  selectedSlot = null;
  pickTakenSlots();

  modal = createModal(brokerId);

  // Broker info
  const infoEl = document.getElementById('bk-broker-info');
  if (infoEl && brokerId) {
    infoEl.textContent = `Broker: ${brokerId}`;
    // Try to fetch broker details for agent name
    fetch(`/api/brokers/${brokerId}`)
      .then((r) => r.json())
      .then((broker) => {
        if (broker && broker.agent) {
          infoEl.textContent = `${broker.name} \u2014 ${broker.agent.name}`;
        }
      })
      .catch(() => {});
  }

  renderSlots();

  // Close
  document.getElementById('bk-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', escHandler);
  modal._escHandler = escHandler;

  // Submit
  document.getElementById('bk-submit-btn').addEventListener('click', () => handleSubmit(brokerId));

  // Enter key submits
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSubmit(brokerId);
    }
  });
}

export function close() {
  if (!modal) return;

  if (modal._escHandler) {
    document.removeEventListener('keydown', modal._escHandler);
  }

  modal.remove();
  modal = null;
  selectedSlot = null;
}
