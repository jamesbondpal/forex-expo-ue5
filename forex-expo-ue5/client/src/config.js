/**
 * Client configuration — centralizes server URLs.
 * In production behind nginx, API is same-origin at /api.
 * In development, the API server runs on port 3000.
 */
const isDev = location.port && location.port !== '80' && location.port !== '443';
export const API_BASE = isDev ? `http://${location.hostname}:3000` : '';
export const WS_URL = isDev
  ? `ws://${location.hostname}:3000/`
  : `ws://${location.hostname}/ws`;
