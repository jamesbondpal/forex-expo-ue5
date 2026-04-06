/**
 * Forex Expo Dubai — UE5 Pixel Streaming Client
 *
 * Handles WebRTC signalling, peer connection lifecycle,
 * data-channel messaging, and auto-reconnect logic.
 */

// ---------------------------------------------------------------------------
// Session ID — persisted across page reloads
// ---------------------------------------------------------------------------
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const sessionId = (() => {
  let id = sessionStorage.getItem('forex-expo-session-id');
  if (!id) {
    id = generateUUID();
    sessionStorage.setItem('forex-expo-session-id', id);
  }
  return id;
})();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
import { WS_URL } from './config.js';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const MAX_ATTEMPTS_BEFORE_FALLBACK = 1;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let ws = null;
let pc = null;
let dataChannel = null;
let playerId = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let iceServers = DEFAULT_ICE_SERVERS;
let intentionalClose = false;

// DOM references
const videoEl = document.getElementById('ue5-stream');
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const fallbackMessage = document.getElementById('fallback-message');
const retryBtn = document.getElementById('retry-btn');
const fallbackBtn = document.getElementById('fallback-btn');

// ---------------------------------------------------------------------------
// Connection-state helpers
// ---------------------------------------------------------------------------
function setConnectionState(state, detail) {
  window.dispatchEvent(
    new CustomEvent('connection-state', { detail: { state, ...detail } })
  );

  switch (state) {
    case 'connecting':
      updateLoadingStatus('Connecting to server...');
      setStepState('ws', 'active');
      break;
    case 'signalling':
      updateLoadingStatus('Negotiating stream...');
      setStepState('ws', 'done');
      setStepState('webrtc', 'active');
      break;
    case 'streaming':
      updateLoadingStatus('Stream active');
      setStepState('webrtc', 'done');
      setStepState('stream', 'done');
      hideLoading();
      break;
    case 'connected':
      updateLoadingStatus('Connected — waiting for video...');
      setStepState('webrtc', 'done');
      setStepState('stream', 'active');
      break;
    case 'disconnected':
      updateLoadingStatus('Disconnected — reconnecting...');
      break;
    case 'failed':
      updateLoadingStatus('Connection failed');
      break;
  }
}

function setStepState(stepName, state) {
  const stepEl = document.querySelector(`.step[data-step="${stepName}"]`);
  if (!stepEl) return;
  stepEl.classList.remove('active', 'done', 'error');
  if (state) stepEl.classList.add(state);
}

function resetSteps() {
  document.querySelectorAll('.step').forEach((el) => {
    el.classList.remove('active', 'done', 'error');
  });
}

function updateLoadingStatus(text) {
  if (loadingStatus) loadingStatus.textContent = text;
}

function showLoading() {
  if (fallbackShown) return; // Don't override fallback
  if (loadingScreen) loadingScreen.classList.remove('hidden');
  if (fallbackMessage) fallbackMessage.classList.add('hidden');
}

function hideLoading() {
  if (loadingScreen) loadingScreen.classList.add('hidden');
}

let fallbackShown = false;

function showFallback() {
  fallbackShown = true;
  intentionalClose = true;
  clearTimeout(reconnectTimer);
  clearTimeout(offerTimer);
  if (loadingScreen) loadingScreen.classList.add('hidden');
  if (fallbackMessage) fallbackMessage.classList.remove('hidden');

  // Auto-enter fallback mode after 3 seconds
  setTimeout(() => {
    if (fallbackMessage && !fallbackMessage.classList.contains('hidden')) {
      window.dispatchEvent(new CustomEvent('enter-fallback-mode'));
    }
  }, 3000);
}

// ---------------------------------------------------------------------------
// WebSocket signalling
// ---------------------------------------------------------------------------
function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  intentionalClose = false;
  showLoading();
  resetSteps();
  setConnectionState('connecting');

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'identify', sessionId }));
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      console.warn('[PS] Non-JSON WS message:', event.data);
      return;
    }
    handleSignallingMessage(msg);
  };

  ws.onerror = (err) => {
    console.error('[PS] WebSocket error:', err);
  };

  ws.onclose = () => {
    if (!intentionalClose) {
      setConnectionState('disconnected');
      scheduleReconnect();
    }
  };
}

// ---------------------------------------------------------------------------
// Signalling message dispatch
// ---------------------------------------------------------------------------
function handleSignallingMessage(msg) {
  switch (msg.type) {
    case 'config':
      handleConfig(msg);
      break;
    case 'offer':
      handleOffer(msg);
      break;
    case 'iceCandidate':
      handleRemoteIceCandidate(msg);
      break;
    case 'playerCount':
    case 'ping':
      // informational — no action needed
      break;
    default:
      console.log('[PS] Unknown signalling message:', msg.type);
  }
}

// ---------------------------------------------------------------------------
// Config — receive playerId and optional ICE servers
// ---------------------------------------------------------------------------
let offerTimer = null;
const OFFER_TIMEOUT_MS = 3000; // Show fallback if no offer within 3s

function handleConfig(msg) {
  playerId = msg.playerId ?? playerId;

  if (msg.peerConnectionOptions && msg.peerConnectionOptions.iceServers) {
    iceServers = msg.peerConnectionOptions.iceServers;
  } else if (msg.iceServers && Array.isArray(msg.iceServers) && msg.iceServers.length > 0) {
    iceServers = msg.iceServers;
  }

  setConnectionState('signalling');
  // Don't create PeerConnection yet — wait for an actual offer from UE5.
  // If no offer arrives within timeout, go straight to fallback.
  clearTimeout(offerTimer);
  offerTimer = setTimeout(() => {
    if (!videoEl.srcObject) {
      console.log('[PS] No offer received — showing fallback');
      showFallback();
    }
  }, OFFER_TIMEOUT_MS);
}

// ---------------------------------------------------------------------------
// RTCPeerConnection
// ---------------------------------------------------------------------------
function createPeerConnection() {
  closePeerConnection();

  pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'iceCandidate',
          candidate: event.candidate,
          playerId,
        })
      );
    }
  };

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    console.log('[PS] ICE connection state:', state);

    switch (state) {
      case 'connected':
      case 'completed':
        setConnectionState('connected');
        break;
      case 'disconnected':
        setConnectionState('disconnected');
        break;
      case 'failed':
        // Don't reconnect on ICE failure — let the offer timer trigger fallback
        console.log('[PS] ICE failed — waiting for offer timeout to trigger fallback');
        closePeerConnection();
        break;
    }
  };

  pc.ontrack = (event) => {
    console.log('[PS] Track received:', event.track.kind);
    if (event.streams && event.streams[0]) {
      videoEl.srcObject = event.streams[0];
    } else {
      const stream = new MediaStream();
      stream.addTrack(event.track);
      videoEl.srcObject = stream;
    }
    reconnectAttempts = 0;
    setConnectionState('streaming');
  };

  // Create data channel for bidirectional messaging
  setupDataChannel();
}

// ---------------------------------------------------------------------------
// Data channel
// ---------------------------------------------------------------------------
function setupDataChannel() {
  dataChannel = pc.createDataChannel('pixel-streaming', { ordered: true });

  dataChannel.onopen = () => {
    console.log('[PS] Data channel open');
    window.dispatchEvent(new CustomEvent('ue5-datachannel', { detail: { state: 'open' } }));
  };

  dataChannel.onclose = () => {
    console.log('[PS] Data channel closed');
    window.dispatchEvent(new CustomEvent('ue5-datachannel', { detail: { state: 'closed' } }));
  };

  dataChannel.onmessage = (event) => {
    let parsed;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      console.warn('[PS] Non-JSON data channel message:', event.data);
      return;
    }
    window.dispatchEvent(new CustomEvent('ue5-message', { detail: parsed }));
  };
}

// ---------------------------------------------------------------------------
// Handle SDP offer from server
// ---------------------------------------------------------------------------
async function handleOffer(msg) {
  clearTimeout(offerTimer);

  // Create PeerConnection on-demand when we receive an actual offer
  if (!pc) {
    createPeerConnection();
  }

  try {
    const offer = new RTCSessionDescription({
      type: 'offer',
      sdp: msg.sdp,
    });

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'answer',
          sdp: answer.sdp,
          playerId,
        })
      );
    }
  } catch (err) {
    console.error('[PS] Error handling offer:', err);
    setConnectionState('failed');
    scheduleReconnect();
  }
}

// ---------------------------------------------------------------------------
// Handle remote ICE candidate
// ---------------------------------------------------------------------------
async function handleRemoteIceCandidate(msg) {
  if (!pc) return;

  try {
    const candidate = new RTCIceCandidate(msg.candidate);
    await pc.addIceCandidate(candidate);
  } catch (err) {
    console.warn('[PS] Error adding ICE candidate:', err);
  }
}

// ---------------------------------------------------------------------------
// Send message to UE5 via data channel
// ---------------------------------------------------------------------------
export function sendToUE5(action, data = {}) {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    console.warn('[PS] Data channel not open — cannot send:', action);
    return false;
  }

  const payload = JSON.stringify({ type: 'command', action, data });
  dataChannel.send(payload);
  return true;
}

// ---------------------------------------------------------------------------
// Reconnection with exponential backoff
// ---------------------------------------------------------------------------
function scheduleReconnect() {
  if (intentionalClose || fallbackShown) return;

  reconnectAttempts++;

  if (reconnectAttempts > MAX_ATTEMPTS_BEFORE_FALLBACK) {
    showFallback();
    setConnectionState('failed', { reason: 'max-attempts' });
    return;
  }

  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts - 1),
    RECONNECT_MAX_MS
  );

  console.log(
    `[PS] Reconnect attempt ${reconnectAttempts}/${MAX_ATTEMPTS_BEFORE_FALLBACK} in ${delay}ms`
  );
  updateLoadingStatus(
    `Reconnecting (attempt ${reconnectAttempts}/${MAX_ATTEMPTS_BEFORE_FALLBACK})...`
  );

  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    cleanup();
    connectWebSocket();
  }, delay);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
function closePeerConnection() {
  if (dataChannel) {
    dataChannel.onopen = null;
    dataChannel.onclose = null;
    dataChannel.onmessage = null;
    dataChannel.close();
    dataChannel = null;
  }

  if (pc) {
    pc.onicecandidate = null;
    pc.oniceconnectionstatechange = null;
    pc.ontrack = null;
    pc.close();
    pc = null;
  }
}

function cleanup() {
  closePeerConnection();

  if (ws) {
    intentionalClose = true;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    ws = null;
    intentionalClose = false;
  }
}

// ---------------------------------------------------------------------------
// UI button handlers
// ---------------------------------------------------------------------------
if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    reconnectAttempts = 0;
    showLoading();
    resetSteps();
    cleanup();
    connectWebSocket();
  });
}

if (fallbackBtn) {
  fallbackBtn.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('enter-fallback-mode'));
  });
}

// ---------------------------------------------------------------------------
// Visibility-based reconnect
// ---------------------------------------------------------------------------
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reconnectAttempts = 0;
      cleanup();
      connectWebSocket();
    }
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
console.log(`[PS] Forex Expo Dubai — session ${sessionId}`);
connectWebSocket();
