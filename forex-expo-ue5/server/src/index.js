import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createSignallingServer } from './signalling.js';
import { createApiRouter } from './api.js';
import { loadBrokers } from './brokerManager.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080').split(',');

// In development, also allow any localhost port
function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true); // Allow non-browser requests
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
  callback(new Error('CORS not allowed'));
}

const app = express();
const server = http.createServer(app);

// Security & logging
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: corsOrigin, credentials: true }));

// Rate limiting on API routes
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Load brokers
const brokers = loadBrokers();

// Signalling server (WebSocket)
const signalling = createSignallingServer(server);

// REST API
app.use('/api', createApiRouter(brokers, signalling));

// Start
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  FOREX EXPO DUBAI — Signalling Server`);
  console.log(`========================================`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  UE5 Host:    ${process.env.UE5_HOST || 'localhost'}:${process.env.UE5_PORT || '8888'}`);
  console.log(`  Brokers:     ${brokers.length} loaded`);
  console.log(`  Origins:     ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`  Time:        ${new Date().toISOString()}`);
  console.log(`========================================\n`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  signalling.close();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
