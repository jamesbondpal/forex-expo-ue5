import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadBrokers() {
  try {
    const dataPath = join(__dirname, '..', '..', 'data', 'brokers.json');
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    console.log(`[BrokerManager] Loaded ${data.brokers.length} brokers`);
    return data.brokers;
  } catch (err) {
    console.error(`[BrokerManager] Failed to load brokers.json: ${err.message}`);
    return [];
  }
}

// In-memory session tracking
const sessions = new Map();

export function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      startedAt: new Date().toISOString(),
      visitedBooths: [],
      chatMessages: 0,
      meetingsBooked: 0,
      events: []
    });
  }
  return sessions.get(sessionId);
}

export function trackEvent(sessionId, event, brokerId, data) {
  const session = getOrCreateSession(sessionId);
  session.events.push({
    event,
    brokerId: brokerId || null,
    data: data || {},
    timestamp: new Date().toISOString()
  });
  return session;
}
