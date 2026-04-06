import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateAiResponse } from './aiChat.js';
import { trackEvent } from './brokerManager.js';
import { sendBookingConfirmation, sendAgentNotification } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const startTime = Date.now();

// In-memory seminar questions
const seminarQuestions = [];

export function createApiRouter(brokers, signalling) {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      ue5Connected: signalling.ue5Connected,
      playerCount: signalling.playerCount,
      timestamp: new Date().toISOString()
    });
  });

  // Get all brokers
  router.get('/brokers', (req, res) => {
    res.json({ brokers });
  });

  // Get single broker
  router.get('/brokers/:id', (req, res) => {
    const broker = brokers.find(b => b.id === req.params.id);
    if (!broker) return res.status(404).json({ error: 'Broker not found' });
    res.json(broker);
  });

  // AI Chat
  router.post('/ai-chat', (req, res) => {
    const { brokerId, message, sessionId } = req.body;
    if (!brokerId || !message) {
      return res.status(400).json({ error: 'brokerId and message are required' });
    }

    const result = generateAiResponse({ brokerId, message });

    if (sessionId) {
      trackEvent(sessionId, 'ai_chat', brokerId, { message: message.substring(0, 100) });
    }

    res.json({
      reply: result.reply,
      agentName: result.agentName,
      brokerId,
      suggestedActions: result.suggestedActions,
      delay: result.delay,
      timestamp: new Date().toISOString()
    });
  });

  // Book meeting
  router.post('/book-meeting', async (req, res) => {
    const { brokerId, name, email, topic, timeSlot, message, phone } = req.body;

    if (!brokerId || !name || !email || !topic || !timeSlot) {
      return res.status(400).json({ error: 'brokerId, name, email, topic, and timeSlot are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const broker = brokers.find(b => b.id === brokerId);
    if (!broker) return res.status(404).json({ error: 'Broker not found' });

    const meetingId = uuidv4().replace(/-/g, '').substring(0, 9);
    const zoomLink = `https://zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;

    const booking = {
      meetingId,
      brokerId,
      brokerName: broker.name,
      agentName: broker.agent.name,
      agentEmail: broker.agent.email,
      name,
      email,
      phone: phone || null,
      topic,
      timeSlot,
      message: message || '',
      zoomLink,
      bookedAt: new Date().toISOString()
    };

    // Send emails (non-blocking)
    sendBookingConfirmation(booking).catch(err => console.error('Booking email failed:', err));
    sendAgentNotification(booking).catch(err => console.error('Agent notification failed:', err));

    // Track event
    if (req.body.sessionId) {
      trackEvent(req.body.sessionId, 'meeting_booked', brokerId, { meetingId, timeSlot });
    }

    res.json({
      confirmed: true,
      meetingId,
      zoomLink,
      agentName: broker.agent.name,
      slot: timeSlot,
      confirmationSentTo: email
    });
  });

  // Seminar question
  router.post('/seminar/question', (req, res) => {
    const { question, visitorName } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const q = {
      id: uuidv4(),
      question,
      visitorName: visitorName || 'Anonymous',
      answer: null,
      timestamp: new Date().toISOString()
    };

    seminarQuestions.push(q);

    // Broadcast to all connected browser clients
    signalling.broadcastToPlayers({
      type: 'event',
      name: 'seminarQuestion',
      data: { questionId: q.id, question: q.question, visitorName: q.visitorName }
    });

    res.json({
      received: true,
      questionId: q.id,
      position: seminarQuestions.length
    });
  });

  // Get seminar questions
  router.get('/seminar/questions', (req, res) => {
    res.json({ questions: seminarQuestions });
  });

  // Analytics event
  router.post('/analytics/event', (req, res) => {
    const { event, brokerId, sessionId, data } = req.body;
    if (!event) return res.status(400).json({ error: 'event is required' });

    console.log(`[Analytics] ${event} | broker=${brokerId || 'n/a'} | session=${sessionId || 'n/a'} | data=${JSON.stringify(data || {})}`);

    if (sessionId) {
      trackEvent(sessionId, event, brokerId, data);
    }

    res.json({ ok: true });
  });

  // ── Sponsorship Products ─────────────────────────────────────────────

  function loadSponsorshipData() {
    const raw = readFileSync(join(__dirname, '../../data/sponsorship-products.json'), 'utf-8');
    return JSON.parse(raw);
  }

  // Get booth packages
  router.get('/sponsorship/packages', (req, res) => {
    const data = loadSponsorshipData();
    res.json({ boothPackages: data.boothPackages });
  });

  // Get branding opportunities
  router.get('/sponsorship/branding', (req, res) => {
    const data = loadSponsorshipData();
    res.json({ brandingOpportunities: data.brandingOpportunities });
  });

  // Get digital products
  router.get('/sponsorship/digital', (req, res) => {
    const data = loadSponsorshipData();
    res.json({ digitalProducts: data.digitalProducts });
  });

  // Get all sponsorship products
  router.get('/sponsorship/all', (req, res) => {
    const data = loadSponsorshipData();
    res.json(data);
  });

  // Submit sponsorship inquiry
  router.post('/sponsorship/inquire', (req, res) => {
    const { productId, brokerId, name, email, company, message } = req.body;

    if (!productId || !name || !email) {
      return res.status(400).json({ error: 'productId, name, and email are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Look up the product
    const data = loadSponsorshipData();
    const allProducts = [
      ...data.boothPackages,
      ...data.brandingOpportunities,
      ...data.advertisingOpportunities,
      ...data.digitalProducts
    ];
    const product = allProducts.find(p => p.id === productId);

    const inquiryId = uuidv4().replace(/-/g, '').substring(0, 12);

    console.log(`[Sponsorship Inquiry] ${inquiryId} | product=${productId} | broker=${brokerId || 'n/a'} | ${name} <${email}> | ${company || 'n/a'}`);

    res.json({
      received: true,
      inquiryId,
      product: product ? { id: product.id, name: product.name, price: product.price, category: product.category } : null,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
