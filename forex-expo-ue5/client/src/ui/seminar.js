/**
 * Webinar / Seminar Stage Interface
 *
 * Three-tab modal: Live Session, Schedule, Q&A Archive.
 */

import { sendToUE5 } from '../main.js';

// ---------------------------------------------------------------------------
// Seminar data
// ---------------------------------------------------------------------------
const SESSIONS = [
  {
    id: 1,
    title: 'Mastering Risk Management in Volatile Forex Markets',
    time: '10:30 AM',
    presenter: 'Dr. Omar Al-Farsi',
    role: 'Head of Risk, Dubai Financial Markets',
    bio: 'Dr. Al-Farsi has over 20 years of experience in quantitative risk modeling for emerging market currencies. He advises institutional traders across the MENA region.',
    status: 'LIVE',
    slides: [
      {
        title: 'Risk Management Fundamentals',
        bullets: [
          'Position sizing based on account equity',
          'Maximum 2% risk per trade rule',
          'Correlation analysis across currency pairs',
          'Stop-loss placement strategies',
        ],
      },
      {
        title: 'Volatility Indicators',
        bullets: [
          'ATR (Average True Range) for dynamic stops',
          'Bollinger Band width as volatility gauge',
          'VIX correlation with forex pairs',
          'Event-driven volatility spikes',
        ],
      },
      {
        title: 'Hedging Techniques',
        bullets: [
          'Direct hedging vs. cross-pair hedging',
          'Options-based protection strategies',
          'Portfolio-level risk balancing',
          'Cost of hedging calculations',
        ],
      },
      {
        title: 'Case Study: GBP Flash Crash 2016',
        bullets: [
          'Market conditions leading to the event',
          'How risk-managed portfolios survived',
          'Lessons for retail traders',
          'Building a crisis response plan',
        ],
      },
      {
        title: 'Key Takeaways',
        bullets: [
          'Never risk more than you can afford to lose',
          'Diversify across uncorrelated pairs',
          'Always use stop-losses in volatile markets',
          'Review and adjust risk parameters weekly',
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'AI-Powered Trading: The Capital.com Approach',
    time: '11:30 AM',
    presenter: 'Sarah Chen',
    role: 'VP of AI Research, Capital.com',
    bio: 'Sarah leads the AI trading systems team, developing neural network models for market prediction and trade execution optimization.',
    status: 'UPCOMING',
    slides: [],
  },
  {
    id: 3,
    title: 'ECN/STP Execution: What Traders Need to Know',
    time: '1:00 PM',
    presenter: 'Ahmed Hassan',
    role: 'Senior Execution Analyst, Pepperstone',
    bio: 'Ahmed specializes in market microstructure and order execution analysis across ECN and STP liquidity pools.',
    status: 'UPCOMING',
    slides: [],
  },
  {
    id: 4,
    title: 'Copy Trading Strategies for Passive Income',
    time: '2:00 PM',
    presenter: 'Lisa Park',
    role: 'Lead Strategist, eToro',
    bio: 'Lisa has managed copy trading portfolios generating consistent returns for over 50,000 followers worldwide.',
    status: 'UPCOMING',
    slides: [],
  },
  {
    id: 5,
    title: 'Regulation & Fund Safety in MENA',
    time: '3:00 PM',
    presenter: 'James Worthington',
    role: 'Compliance Director, DFSA',
    bio: 'James oversees broker compliance and fund safety regulations in the Dubai Financial Services Authority.',
    status: 'UPCOMING',
    slides: [],
  },
  {
    id: 6,
    title: 'Building a Trading Bot: From Idea to Live',
    time: '4:00 PM',
    presenter: 'Dr. Yusuf Mansouri',
    role: 'CTO, AlgoTrader Pro',
    bio: 'Dr. Mansouri has built and deployed over 200 algorithmic trading systems for hedge funds and retail platforms.',
    status: 'UPCOMING',
    slides: [],
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let modal = null;
let activeTab = 'live';
let currentSlide = 0;
let attendeeCount = 247;
let attendeeInterval = null;
let livePulseInterval = null;
let questions = [];

// ---------------------------------------------------------------------------
// DOM creation
// ---------------------------------------------------------------------------
function createModal() {
  const el = document.createElement('div');
  el.id = 'seminar-modal';
  el.innerHTML = `
    <style>
      #seminar-modal {
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', 'Segoe UI', sans-serif; color: #e0e0e0;
        animation: semFadeIn 0.25s ease;
      }
      @keyframes semFadeIn { from { opacity: 0; } to { opacity: 1; } }
      .sem-container {
        background: #0d1117; border-radius: 12px; width: 94vw; max-width: 900px;
        max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
        border: 1px solid #1c2333; box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      }
      .sem-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 20px; border-bottom: 1px solid #1c2333; background: #0a0e16;
      }
      .sem-header h2 { margin: 0; font-size: 16px; font-weight: 600; color: #00d2ff; }
      .sem-close {
        background: none; border: none; color: #8b949e; font-size: 22px; cursor: pointer;
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        border-radius: 6px; transition: all 0.15s;
      }
      .sem-close:hover { background: #1c2333; color: #fff; }
      .sem-tabs {
        display: flex; border-bottom: 1px solid #1c2333; background: #0a0e16;
        position: relative; padding: 0 16px;
      }
      .sem-tab {
        padding: 12px 20px; font-size: 13px; font-weight: 600; color: #8b949e;
        cursor: pointer; position: relative; transition: color 0.15s; user-select: none;
        background: none; border: none; font-family: inherit;
      }
      .sem-tab:hover { color: #c9d1d9; }
      .sem-tab.active { color: #00d2ff; }
      .sem-tab-underline {
        position: absolute; bottom: 0; height: 2px; background: #00d2ff;
        transition: left 0.3s ease, width 0.3s ease;
      }
      .sem-body { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #1c2333 transparent; }
      .sem-body::-webkit-scrollbar { width: 6px; }
      .sem-body::-webkit-scrollbar-track { background: transparent; }
      .sem-body::-webkit-scrollbar-thumb { background: #1c2333; border-radius: 3px; }
      .sem-panel { display: none; padding: 20px; }
      .sem-panel.active { display: block; }

      /* Live Session */
      .sem-live-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
      }
      .sem-live-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(255,23,68,0.15); color: #ff1744; padding: 4px 12px;
        border-radius: 20px; font-size: 12px; font-weight: 700;
      }
      .sem-live-dot {
        width: 8px; height: 8px; border-radius: 50%; background: #ff1744;
        animation: semPulse 1.2s ease-in-out infinite;
      }
      @keyframes semPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      .sem-attendees { font-size: 13px; color: #8b949e; }
      .sem-attendees strong { color: #e0e0e0; }
      .sem-slide-area {
        background: #161b22; border-radius: 8px; border: 1px solid #1c2333;
        padding: 0; margin-bottom: 16px; position: relative; overflow: hidden;
      }
      .sem-slide-area canvas { display: block; width: 100%; }
      .sem-slide-nav {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        margin-bottom: 16px;
      }
      .sem-slide-btn {
        padding: 6px 16px; border-radius: 6px; border: 1px solid #30363d;
        background: #161b22; color: #c9d1d9; font-size: 13px; cursor: pointer;
        transition: all 0.15s;
      }
      .sem-slide-btn:hover { border-color: #58a6ff; }
      .sem-slide-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .sem-slide-counter { font-size: 13px; color: #8b949e; min-width: 60px; text-align: center; }
      .sem-presenter {
        display: flex; align-items: center; gap: 14px; padding: 14px;
        background: #161b22; border-radius: 8px; border: 1px solid #1c2333;
      }
      .sem-presenter-avatar {
        width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #00d2ff, #0088cc);
        display: flex; align-items: center; justify-content: center; font-size: 20px;
        font-weight: 700; color: #fff; flex-shrink: 0;
      }
      .sem-presenter-name { font-size: 14px; font-weight: 600; color: #e0e0e0; }
      .sem-presenter-role { font-size: 12px; color: #8b949e; margin-top: 2px; }
      .sem-presenter-bio { font-size: 12px; color: #6e7681; margin-top: 4px; line-height: 1.4; }

      /* Schedule */
      .sem-schedule-item {
        display: flex; align-items: flex-start; gap: 14px; padding: 14px;
        background: #161b22; border-radius: 8px; border: 1px solid #1c2333;
        margin-bottom: 10px; transition: border-color 0.15s;
      }
      .sem-schedule-item:hover { border-color: #30363d; }
      .sem-schedule-time {
        font-size: 13px; font-weight: 700; color: #00d2ff; min-width: 75px;
        flex-shrink: 0; padding-top: 2px;
      }
      .sem-schedule-info { flex: 1; }
      .sem-schedule-title { font-size: 14px; font-weight: 600; color: #e0e0e0; margin-bottom: 4px; }
      .sem-schedule-presenter { font-size: 12px; color: #8b949e; }
      .sem-status-badge {
        padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;
        flex-shrink: 0;
      }
      .sem-status-badge.live { background: rgba(255,23,68,0.15); color: #ff1744; }
      .sem-status-badge.upcoming { background: rgba(0,210,255,0.1); color: #00d2ff; }
      .sem-status-badge.ended { background: rgba(110,118,129,0.2); color: #6e7681; }

      /* Q&A */
      .sem-qa-input-row {
        display: flex; gap: 8px; margin-bottom: 20px;
      }
      .sem-qa-input {
        flex: 1; padding: 10px 12px; border-radius: 6px; border: 1px solid #30363d;
        background: #161b22; color: #e0e0e0; font-size: 14px; outline: none;
        font-family: inherit; transition: border-color 0.15s;
      }
      .sem-qa-input:focus { border-color: #00d2ff; }
      .sem-qa-submit {
        padding: 10px 20px; border-radius: 6px; border: none;
        background: #00d2ff; color: #0d1117; font-size: 13px; font-weight: 700;
        cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
      }
      .sem-qa-submit:hover { opacity: 0.85; }
      .sem-qa-list { display: flex; flex-direction: column; gap: 10px; }
      .sem-qa-item {
        padding: 14px; background: #161b22; border-radius: 8px;
        border: 1px solid #1c2333;
      }
      .sem-qa-question { font-size: 14px; font-weight: 600; color: #e0e0e0; margin-bottom: 6px; }
      .sem-qa-meta { font-size: 11px; color: #6e7681; margin-bottom: 8px; }
      .sem-qa-answer { font-size: 13px; color: #c9d1d9; line-height: 1.5; }
      .sem-qa-waiting { font-size: 13px; color: #8b949e; font-style: italic; }
    </style>
    <div class="sem-container">
      <div class="sem-header">
        <h2>Seminar Stage</h2>
        <button class="sem-close" id="sem-close-btn">&times;</button>
      </div>
      <div class="sem-tabs" id="sem-tabs">
        <button class="sem-tab active" data-tab="live">Live Session</button>
        <button class="sem-tab" data-tab="schedule">Schedule</button>
        <button class="sem-tab" data-tab="qa">Q&A Archive</button>
        <div class="sem-tab-underline" id="sem-tab-underline"></div>
      </div>
      <div class="sem-body">
        <div class="sem-panel active" id="sem-panel-live"></div>
        <div class="sem-panel" id="sem-panel-schedule"></div>
        <div class="sem-panel" id="sem-panel-qa"></div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
function initTabs() {
  const tabs = modal.querySelectorAll('.sem-tab');
  const underline = document.getElementById('sem-tab-underline');

  function updateUnderline(tabEl) {
    const rect = tabEl.getBoundingClientRect();
    const parentRect = tabEl.parentElement.getBoundingClientRect();
    underline.style.left = (rect.left - parentRect.left) + 'px';
    underline.style.width = rect.width + 'px';
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;

      modal.querySelectorAll('.sem-panel').forEach((p) => p.classList.remove('active'));
      const panel = document.getElementById(`sem-panel-${activeTab}`);
      if (panel) panel.classList.add('active');

      updateUnderline(tab);
    });
  });

  // Initial underline position
  requestAnimationFrame(() => {
    const activeTabEl = modal.querySelector('.sem-tab.active');
    if (activeTabEl) updateUnderline(activeTabEl);
  });
}

// ---------------------------------------------------------------------------
// Live Session panel
// ---------------------------------------------------------------------------
function renderLivePanel() {
  const panel = document.getElementById('sem-panel-live');
  if (!panel) return;

  const session = SESSIONS[0]; // The LIVE session
  currentSlide = 0;

  panel.innerHTML = `
    <div class="sem-live-header">
      <div class="sem-live-badge">
        <div class="sem-live-dot"></div>
        LIVE
      </div>
      <div class="sem-attendees"><strong id="sem-attendee-count">${attendeeCount}</strong> watching</div>
    </div>
    <div class="sem-slide-area">
      <canvas id="sem-slide-canvas" width="800" height="450"></canvas>
    </div>
    <div class="sem-slide-nav">
      <button class="sem-slide-btn" id="sem-prev-btn">\u25C0 Prev</button>
      <span class="sem-slide-counter" id="sem-slide-counter">1 / ${session.slides.length}</span>
      <button class="sem-slide-btn" id="sem-next-btn">Next \u25B6</button>
    </div>
    <div class="sem-presenter">
      <div class="sem-presenter-avatar">${session.presenter.charAt(0)}</div>
      <div>
        <div class="sem-presenter-name">${session.presenter}</div>
        <div class="sem-presenter-role">${session.role}</div>
        <div class="sem-presenter-bio">${session.bio}</div>
      </div>
    </div>
  `;

  drawSlide();

  document.getElementById('sem-prev-btn').addEventListener('click', () => {
    if (currentSlide > 0) {
      currentSlide--;
      drawSlide();
      updateSlideCounter();
    }
  });

  document.getElementById('sem-next-btn').addEventListener('click', () => {
    if (currentSlide < session.slides.length - 1) {
      currentSlide++;
      drawSlide();
      updateSlideCounter();
    }
  });

  // Attendee counter tick
  attendeeInterval = setInterval(() => {
    const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
    attendeeCount = Math.max(200, attendeeCount + delta);
    const countEl = document.getElementById('sem-attendee-count');
    if (countEl) countEl.textContent = attendeeCount;
  }, 5000);
}

function updateSlideCounter() {
  const counter = document.getElementById('sem-slide-counter');
  const session = SESSIONS[0];
  if (counter) counter.textContent = `${currentSlide + 1} / ${session.slides.length}`;

  const prevBtn = document.getElementById('sem-prev-btn');
  const nextBtn = document.getElementById('sem-next-btn');
  if (prevBtn) prevBtn.disabled = currentSlide === 0;
  if (nextBtn) nextBtn.disabled = currentSlide >= session.slides.length - 1;
}

function drawSlide() {
  const canvas = document.getElementById('sem-slide-canvas');
  if (!canvas) return;

  const session = SESSIONS[0];
  const slide = session.slides[currentSlide];
  if (!slide) return;

  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const containerWidth = container.getBoundingClientRect().width;
  const aspect = 16 / 9;
  const canvasW = containerWidth;
  const canvasH = containerWidth / aspect;

  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
  grad.addColorStop(0, '#0a0e16');
  grad.addColorStop(1, '#0d1a2d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Decorative accent line
  ctx.fillStyle = '#00d2ff';
  ctx.fillRect(0, 0, 4, canvasH);

  // Slide number
  ctx.fillStyle = '#30363d';
  ctx.font = `bold ${canvasW * 0.025}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`SLIDE ${currentSlide + 1}`, canvasW - 30, 35);

  // Title
  ctx.fillStyle = '#00d2ff';
  ctx.font = `bold ${Math.max(16, canvasW * 0.032)}px sans-serif`;
  ctx.textAlign = 'left';

  // Word-wrap title
  const titleMaxWidth = canvasW - 80;
  const titleLines = wrapText(ctx, slide.title, titleMaxWidth);
  const titleFontSize = Math.max(16, canvasW * 0.032);
  let y = 65;
  titleLines.forEach((line) => {
    ctx.fillText(line, 30, y);
    y += titleFontSize * 1.3;
  });

  // Divider
  y += 10;
  ctx.fillStyle = '#1c2333';
  ctx.fillRect(30, y, canvasW - 60, 1);
  y += 25;

  // Bullets
  const bulletFontSize = Math.max(13, canvasW * 0.022);
  ctx.font = `${bulletFontSize}px sans-serif`;
  ctx.fillStyle = '#c9d1d9';

  slide.bullets.forEach((bullet) => {
    // Bullet dot
    ctx.fillStyle = '#00d2ff';
    ctx.beginPath();
    ctx.arc(44, y - bulletFontSize * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#c9d1d9';
    const bulletLines = wrapText(ctx, bullet, canvasW - 110);
    bulletLines.forEach((line) => {
      ctx.fillText(line, 60, y);
      y += bulletFontSize * 1.6;
    });
    y += 6;
  });

  // Footer
  ctx.fillStyle = '#30363d';
  ctx.font = `${Math.max(11, canvasW * 0.016)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${session.presenter} \u2014 ${session.title}`, 30, canvasH - 18);

  ctx.textAlign = 'right';
  ctx.fillText('Forex Expo Dubai 2026', canvasW - 30, canvasH - 18);

  updateSlideCounter();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ---------------------------------------------------------------------------
// Schedule panel
// ---------------------------------------------------------------------------
function renderSchedulePanel() {
  const panel = document.getElementById('sem-panel-schedule');
  if (!panel) return;

  panel.innerHTML = SESSIONS.map((s) => {
    const statusClass = s.status.toLowerCase();
    return `
      <div class="sem-schedule-item">
        <div class="sem-schedule-time">${s.time}</div>
        <div class="sem-schedule-info">
          <div class="sem-schedule-title">${s.title}</div>
          <div class="sem-schedule-presenter">${s.presenter}</div>
        </div>
        <span class="sem-status-badge ${statusClass}">${s.status}</span>
      </div>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// Q&A panel
// ---------------------------------------------------------------------------
function renderQAPanel() {
  const panel = document.getElementById('sem-panel-qa');
  if (!panel) return;

  panel.innerHTML = `
    <div class="sem-qa-input-row">
      <input class="sem-qa-input" id="sem-qa-input" type="text"
             placeholder="Ask a question..." maxlength="500" />
      <button class="sem-qa-submit" id="sem-qa-submit">Submit</button>
    </div>
    <div class="sem-qa-list" id="sem-qa-list"></div>
  `;

  renderQuestionList();

  document.getElementById('sem-qa-submit').addEventListener('click', submitQuestion);
  document.getElementById('sem-qa-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitQuestion();
  });
}

function renderQuestionList() {
  const list = document.getElementById('sem-qa-list');
  if (!list) return;

  if (questions.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:#6e7681;padding:20px;font-size:13px;">No questions yet. Be the first to ask!</div>';
    return;
  }

  list.innerHTML = questions.map((q) => `
    <div class="sem-qa-item" data-qid="${q.id}">
      <div class="sem-qa-question">${escapeHtml(q.question)}</div>
      <div class="sem-qa-meta">${escapeHtml(q.visitorName)} &middot; ${formatTime(q.timestamp)}</div>
      ${q.answer
        ? `<div class="sem-qa-answer">${escapeHtml(q.answer)}</div>`
        : '<div class="sem-qa-waiting">Waiting for answer...</div>'
      }
    </div>
  `).reverse().join('');
}

async function submitQuestion() {
  const input = document.getElementById('sem-qa-input');
  if (!input) return;

  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  input.disabled = true;
  const btn = document.getElementById('sem-qa-submit');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/seminar/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, visitorName: 'Visitor' }),
    });

    const data = await res.json();

    if (res.ok) {
      questions.push({
        id: data.questionId,
        question,
        visitorName: 'Visitor',
        answer: null,
        timestamp: new Date().toISOString(),
      });
      renderQuestionList();

      // Notify UE5
      sendToUE5('seminarQuestion', { question });
    }
  } catch (err) {
    console.error('[Seminar] Failed to submit question:', err);
  } finally {
    if (input) input.disabled = false;
    if (btn) btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// WebSocket answer listener
// ---------------------------------------------------------------------------
function onUE5Message(event) {
  const msg = event.detail;
  if (!msg) return;

  // Listen for seminar question answers
  if (msg.name === 'seminarAnswer' && msg.data) {
    const { questionId, answer } = msg.data;
    const q = questions.find((q) => q.id === questionId);
    if (q) {
      q.answer = answer;
      renderQuestionList();
    }
  }
}

// ---------------------------------------------------------------------------
// Fetch initial data
// ---------------------------------------------------------------------------
async function fetchQuestions() {
  try {
    const res = await fetch('/api/seminar/questions');
    const data = await res.json();
    if (data.questions && Array.isArray(data.questions)) {
      questions = data.questions;
    }
  } catch (err) {
    console.error('[Seminar] Failed to fetch questions:', err);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function open() {
  if (modal) return;

  activeTab = 'live';
  currentSlide = 0;
  attendeeCount = 247;

  modal = createModal();

  // Fetch questions from server
  await fetchQuestions();

  initTabs();
  renderLivePanel();
  renderSchedulePanel();
  renderQAPanel();

  // Close
  document.getElementById('sem-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', escHandler);
  modal._escHandler = escHandler;

  // Resize handler for slide canvas
  const resizeHandler = () => {
    if (activeTab === 'live') drawSlide();
  };
  window.addEventListener('resize', resizeHandler);
  modal._resizeHandler = resizeHandler;

  // Listen for UE5 answers
  window.addEventListener('ue5-message', onUE5Message);
}

export function close() {
  if (!modal) return;

  if (attendeeInterval) {
    clearInterval(attendeeInterval);
    attendeeInterval = null;
  }

  if (livePulseInterval) {
    clearInterval(livePulseInterval);
    livePulseInterval = null;
  }

  if (modal._escHandler) {
    document.removeEventListener('keydown', modal._escHandler);
  }
  if (modal._resizeHandler) {
    window.removeEventListener('resize', modal._resizeHandler);
  }

  window.removeEventListener('ue5-message', onUE5Message);

  modal.remove();
  modal = null;
}
