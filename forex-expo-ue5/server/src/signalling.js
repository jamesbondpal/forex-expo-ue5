import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export function createSignallingServer(httpServer) {
  const emitter = new EventEmitter();

  // UE5 connection path
  const wssUE5 = new WebSocketServer({ noServer: true });
  // Browser connections path
  const wssBrowser = new WebSocketServer({ noServer: true });

  let ue5Socket = null;
  let ue5Connected = false;
  const players = new Map(); // playerId → ws
  let nextPlayerId = 1;

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
    // Add TURN server for production behind NAT:
    // { urls: 'turn:your-turn-server:3478', username: 'user', credential: 'pass' }
  ];

  function timestamp() {
    return new Date().toISOString();
  }

  function log(msg) {
    console.log(`[Signalling ${timestamp()}] ${msg}`);
  }

  function sendToUE5(message) {
    if (ue5Socket && ue5Socket.readyState === 1) {
      ue5Socket.send(JSON.stringify(message));
    }
  }

  function sendToPlayer(playerId, message) {
    const ws = players.get(playerId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }

  function broadcastToPlayers(message, excludeId) {
    for (const [id, ws] of players) {
      if (id !== excludeId && ws.readyState === 1) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  // Handle UE5 connection
  wssUE5.on('connection', (ws) => {
    log('UE5 application connected');
    ue5Socket = ws;
    ue5Connected = true;
    emitter.emit('ue5:connected');

    // Send config to UE5
    ws.send(JSON.stringify({
      type: 'config',
      peerConnectionOptions: { iceServers: ICE_SERVERS }
    }));

    // Notify UE5 of existing players
    for (const [playerId] of players) {
      ws.send(JSON.stringify({ type: 'playerConnected', playerId }));
    }

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        log('Invalid JSON from UE5');
        return;
      }

      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
          break;

        case 'offer': {
          // Forward SDP offer to the target player
          const targetId = msg.playerId;
          log(`UE5 → offer → player ${targetId}`);
          sendToPlayer(targetId, {
            type: 'offer',
            sdp: msg.sdp
          });
          break;
        }

        case 'iceCandidate': {
          const targetId = msg.playerId;
          log(`UE5 → ICE candidate → player ${targetId}`);
          sendToPlayer(targetId, {
            type: 'iceCandidate',
            candidate: msg.candidate
          });
          break;
        }

        case 'disconnectPlayer': {
          const targetId = msg.playerId;
          log(`UE5 requests disconnect player ${targetId}`);
          const playerWs = players.get(targetId);
          if (playerWs) playerWs.close(1000, 'Disconnected by UE5');
          break;
        }

        default:
          // Forward unknown UE5 messages to target player if playerId present
          if (msg.playerId) {
            sendToPlayer(msg.playerId, msg);
          }
          break;
      }
    });

    ws.on('close', () => {
      log('UE5 application disconnected');
      ue5Socket = null;
      ue5Connected = false;
      emitter.emit('ue5:disconnected');
    });

    ws.on('error', (err) => {
      log(`UE5 WebSocket error: ${err.message}`);
    });
  });

  // Handle browser connections
  wssBrowser.on('connection', (ws) => {
    const playerId = nextPlayerId++;
    players.set(playerId, ws);
    log(`Player ${playerId} connected (total: ${players.size})`);
    emitter.emit('player:connected', playerId);

    // Send player their ID and config
    ws.send(JSON.stringify({
      type: 'config',
      playerId,
      peerConnectionOptions: { iceServers: ICE_SERVERS }
    }));

    // Notify UE5 of new player
    sendToUE5({ type: 'playerConnected', playerId });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        log(`Invalid JSON from player ${playerId}`);
        return;
      }

      switch (msg.type) {
        case 'pong':
          // Latency tracking if needed
          break;

        case 'answer':
          log(`Player ${playerId} → answer → UE5`);
          sendToUE5({
            type: 'answer',
            playerId,
            sdp: msg.sdp
          });
          break;

        case 'iceCandidate':
          log(`Player ${playerId} → ICE candidate → UE5`);
          sendToUE5({
            type: 'iceCandidate',
            playerId,
            candidate: msg.candidate
          });
          break;

        case 'dataChannelRequest':
          log(`Player ${playerId} requesting data channel`);
          sendToUE5({
            type: 'dataChannelRequest',
            playerId
          });
          break;

        default:
          // Forward other messages from player to UE5
          sendToUE5({ ...msg, playerId });
          break;
      }
    });

    ws.on('close', () => {
      players.delete(playerId);
      log(`Player ${playerId} disconnected (total: ${players.size})`);
      emitter.emit('player:disconnected', playerId);
      sendToUE5({ type: 'playerDisconnected', playerId });
    });

    ws.on('error', (err) => {
      log(`Player ${playerId} WebSocket error: ${err.message}`);
    });

    // Ping to keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
      }
    }, 30000);
    ws.on('close', () => clearInterval(pingInterval));
  });

  // Route upgrade requests based on path
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === '/ue5') {
      wssUE5.handleUpgrade(request, socket, head, (ws) => {
        wssUE5.emit('connection', ws, request);
      });
    } else if (url.pathname === '/ws' || url.pathname === '/') {
      wssBrowser.handleUpgrade(request, socket, head, (ws) => {
        wssBrowser.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  return {
    get ue5Connected() { return ue5Connected; },
    get playerCount() { return players.size; },
    broadcastToPlayers,
    sendToPlayer,
    sendToUE5,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    close() {
      for (const [, ws] of players) ws.close();
      players.clear();
      if (ue5Socket) ue5Socket.close();
      wssUE5.close();
      wssBrowser.close();
      log('Signalling server closed');
    }
  };
}
