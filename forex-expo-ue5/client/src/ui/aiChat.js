/**
 * aiChat.js — AI Chat modal for broker-specific AI agent conversations.
 * Communicates with POST /api/ai-chat and renders a rich chat interface
 * with quick-question chips, typing indicators, and suggested actions.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let modalEl = null;
let currentBrokerId = null;
let brokerData = null;
let messagesContainer = null;
let inputEl = null;

let _sessionId = null;

async function getSessionId() {
  if (!_sessionId) {
    try {
      const mainModule = await import('../main.js');
      _sessionId = mainModule.sessionId;
    } catch {
      _sessionId = 'anonymous';
    }
  }
  return _sessionId;
}

// Broker cache (shared with brokerPanel via fetch)
const brokerCache = new Map();

async function fetchBroker(brokerId) {
  if (brokerCache.has(brokerId)) return brokerCache.get(brokerId);
  try {
    const res = await fetch(`/api/brokers/${brokerId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    brokerCache.set(brokerId, data);
    return data;
  } catch (err) {
    console.error(`[aiChat] Failed to fetch broker ${brokerId}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DOM construction
// ---------------------------------------------------------------------------

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.getElementById('ai-chat-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'ai-chat-modal';
    modalEl.className = 'modal ai-chat-modal';
    document.getElementById('ui-overlay').appendChild(modalEl);
  }
  return modalEl;
}

function renderModal(broker) {
  const modal = ensureModal();
  const accentColor = broker.accentColor || broker.primaryColor || '#c9a44c';
  const agentName = broker.agent?.name || broker.agentName || 'AI Assistant';
  const brokerName = broker.name || broker.id || 'Broker';

  modal.style.setProperty('--chat-accent', accentColor);

  const quickQuestions = broker.quickQuestions || broker.suggestedQuestions || [
    'What spreads do you offer?',
    'Tell me about your platforms',
    'How do I open an account?',
    'What regulation do you hold?',
    'Do you offer copy trading?',
  ];

  modal.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="agent-avatar" style="background:${accentColor}">${agentName.charAt(0)}</div>
          <div class="chat-header-text">
            <span class="agent-name">${agentName}</span>
            <span class="broker-label">${brokerName}</span>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="chat-clear-btn" aria-label="Clear chat" title="Clear chat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="chat-close-btn" aria-label="Close">&times;</button>
        </div>
      </div>

      <div class="chat-messages" id="chat-messages"></div>

      <div class="chat-quick-questions" id="chat-quick-questions">
        ${quickQuestions.map(q => `<button class="quick-chip">${q}</button>`).join('')}
      </div>

      <div class="chat-input-row">
        <textarea
          class="chat-input"
          id="chat-input"
          placeholder="Ask ${agentName} anything..."
          rows="1"
        ></textarea>
        <button class="chat-send-btn" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
  `;

  // Cache references
  messagesContainer = modal.querySelector('#chat-messages');
  inputEl = modal.querySelector('#chat-input');

  // Bind events
  modal.querySelector('.chat-close-btn').addEventListener('click', () => close());
  modal.querySelector('.chat-clear-btn').addEventListener('click', () => clearChat());
  modal.querySelector('.chat-send-btn').addEventListener('click', () => handleSend());

  // Textarea enter / shift+enter
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  // Quick question chips
  modal.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sendMessage(chip.textContent);
    });
  });
}

// ---------------------------------------------------------------------------
// Chat message rendering
// ---------------------------------------------------------------------------

function addUserMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble user-bubble';
  bubble.textContent = text;
  messagesContainer.appendChild(bubble);
  scrollToBottom();
}

function addAgentMessage(text, suggestedActions) {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-bubble-wrapper agent-wrapper';

  const avatarChar = brokerData?.agent?.name?.charAt(0) ||
                     brokerData?.agentName?.charAt(0) || 'A';
  const accentColor = brokerData?.accentColor || brokerData?.primaryColor || '#c9a44c';

  const avatar = document.createElement('div');
  avatar.className = 'agent-avatar-small';
  avatar.style.background = accentColor;
  avatar.textContent = avatarChar;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble agent-bubble';
  bubble.innerHTML = formatMessage(text);

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  messagesContainer.appendChild(wrapper);

  // Suggested action chips
  if (suggestedActions && suggestedActions.length > 0) {
    const chipsRow = document.createElement('div');
    chipsRow.className = 'suggested-actions';
    suggestedActions.forEach(action => {
      const chip = document.createElement('button');
      chip.className = 'action-chip';
      chip.textContent = action;
      chip.addEventListener('click', () => {
        sendMessage(action);
      });
      chipsRow.appendChild(chip);
    });
    messagesContainer.appendChild(chipsRow);
  }

  scrollToBottom();
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = `
    <div class="typing-dots">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;
  messagesContainer.appendChild(indicator);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = messagesContainer.querySelector('#typing-indicator');
  if (indicator) indicator.remove();
}

function formatMessage(text) {
  // Simple markdown-like formatting: bold, line breaks
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function scrollToBottom() {
  if (messagesContainer) {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }
}

function clearChat() {
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
  // Show quick questions again
  const quickSection = modalEl.querySelector('#chat-quick-questions');
  if (quickSection) quickSection.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Send / receive logic
// ---------------------------------------------------------------------------

async function handleSend() {
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendMessage(text);
}

async function sendMessage(text) {
  // Hide quick questions after first message
  const quickSection = modalEl?.querySelector('#chat-quick-questions');
  if (quickSection) quickSection.classList.add('hidden');

  addUserMessage(text);
  showTypingIndicator();

  try {
    const sessionId = await getSessionId();
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brokerId: currentBrokerId,
        message: text,
        sessionId,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Simulate typing delay
    const delay = data.delay || 400;
    await new Promise(resolve => setTimeout(resolve, delay));

    removeTypingIndicator();
    addAgentMessage(data.reply, data.suggestedActions);
  } catch (err) {
    console.error('[aiChat] Send failed:', err);
    removeTypingIndicator();
    addAgentMessage(
      'Sorry, I encountered a connection issue. Please try again in a moment.',
      ['Retry', 'Book a meeting instead']
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the AI chat modal for a given broker.
 * @param {{ brokerId: string }} params
 */
export async function open({ brokerId } = {}) {
  if (!brokerId) {
    console.warn('[aiChat] open() called without brokerId');
    return;
  }

  currentBrokerId = brokerId;
  brokerData = await fetchBroker(brokerId);

  renderModal(brokerData || { id: brokerId, name: brokerId });
  ensureModal().classList.add('visible');

  // Focus input after transition
  setTimeout(() => {
    if (inputEl) inputEl.focus();
  }, 350);
}

/**
 * Close the AI chat modal.
 */
export function close() {
  if (modalEl) {
    modalEl.classList.remove('visible');
  }
}
