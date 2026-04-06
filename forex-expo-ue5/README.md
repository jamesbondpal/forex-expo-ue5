# Forex Expo Dubai -- Virtual Expo Hall (UE5 + Pixel Streaming)

A real-time virtual expo hall for Forex Expo Dubai, built with Unreal Engine 5 and delivered to web browsers via Pixel Streaming. Visitors walk a photorealistic 3D exhibition floor, interact with broker booths, book meetings, and attend live seminars -- all from a browser tab with no install required.

## Architecture

```
                          HTTPS / WSS
    +----------+        +------------+        +---------------------+
    |          | <----> |            | <----> |                     |
    | Browser  |        |   nginx    |        | Signalling Server   |
    | (React)  |        | (reverse   |        | (Node.js + WS)      |
    |          |        |  proxy)    |        |                     |
    +----+-----+        +------------+        +----------+----------+
         |                                               |
         |              WebRTC (UDP)                     |
         |         (video/audio/data)                    |
         |                                               |
         +---------------------------+-------------------+
                                     |
                              +------+------+
                              |             |
                              |  UE5 App    |
                              |  (Pixel     |
                              |  Streaming) |
                              |             |
                              +-------------+
                                NVIDIA GPU
```

**Data flow:**

1. The browser loads the React front-end via nginx.
2. nginx proxies API and WebSocket traffic to the Node.js signalling server.
3. The signalling server brokers a WebRTC connection between the browser and the UE5 application.
4. Once established, video frames stream directly from UE5 to the browser over WebRTC (UDP), bypassing nginx entirely.
5. Input events (mouse, keyboard, touch) travel back from the browser to UE5 over the same WebRTC data channel.

## Prerequisites

| Requirement       | Version / Spec                          |
|-------------------|-----------------------------------------|
| Node.js           | 20 LTS or later                         |
| npm               | 10+ (ships with Node 20)                |
| Unreal Engine     | 5.3 or later                            |
| NVIDIA GPU        | Required for Pixel Streaming on server  |
| Docker (optional) | 24+ with Compose plugin                 |
| OS (server)       | Ubuntu 22.04 LTS recommended            |

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone <your-repo-url> forex-expo-ue5
cd forex-expo-ue5
```

### 2. Install dependencies

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env with your local values (see Environment Variables below)
```

### 4. Start the signalling server

```bash
cd server
npm run dev
```

The server starts on `http://localhost:3000` with hot-reload enabled.

### 5. Start the client (in a separate terminal)

```bash
cd client
npm run dev
```

The React dev server starts on `http://localhost:5173` and proxies API requests to the signalling server.

### 6. Launch UE5 with Pixel Streaming

Open the `ForexExpoHall.uproject` in Unreal Editor and press **Play** with the Pixel Streaming flag, or run the packaged build:

```bash
# Windows
ForexExpoHall.exe -AudioMixer -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888

# Linux
./ForexExpoHall.sh -AudioMixer -PixelStreamingIP=127.0.0.1 -PixelStreamingPort=8888
```

Open `http://localhost:5173` in your browser to see the live stream.

## UE5 Setup

### Enable the Pixel Streaming Plugin

1. Open the project in Unreal Editor 5.3+.
2. Go to **Edit > Plugins**.
3. Search for **Pixel Streaming** and enable it.
4. Restart the editor when prompted.

### Copy Configuration Files

Copy the files from `ue5-config/` into your UE5 project directory:

```bash
cp ue5-config/*.ini /path/to/ForexExpoHall/Config/
cp ue5-config/launch-linux.sh /path/to/ForexExpoHall/
```

### Blueprint Event Reference

The signalling server and the UE5 application communicate via JSON messages over the Pixel Streaming data channel. The following events are used:

#### Browser to UE5

| Event            | Data                        | UE5 Action                            |
|------------------|-----------------------------|---------------------------------------|
| `openBooth`      | `{ brokerId }`              | Play WalkToBooth animation            |
| `meetingBooked`  | `{ brokerId, slot }`        | Play AgentCelebrate animation         |
| `seminarQuestion`| `{ question }`              | Show floating text above audience     |
| `playerJoined`   | (none)                      | Spawn visitor avatar                  |

#### UE5 to Browser

| Event              | Data                  | Browser Action                     |
|--------------------|-----------------------|------------------------------------|
| `brokerProximity`  | `{ brokerId, distance }` | Show broker panel in overlay    |
| `zone`             | `{ zone }`            | Update zone label HUD              |
| `seminarTrigger`   | (none)                | Open seminar modal                 |
| `playerCount`      | `{ count }`           | Update visitor counter             |

### Implementing Events in Blueprints

In your UE5 project, use the **Pixel Streaming Input** component to listen for incoming messages:

1. Add a **PixelStreamingInput** component to your GameMode or PlayerController.
2. Bind to the **OnInputReceived** event.
3. Parse the JSON string to extract the event name and data payload.
4. Dispatch to the appropriate Blueprint function (e.g., `WalkToBooth`, `SpawnVisitor`).

To send events back to the browser, call `SendPixelStreamingResponse` with a JSON string containing the event name and data.

## Production Deployment

For full production deployment instructions on AWS g5.xlarge instances, see:

**[deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md)**

Quick summary:

1. Launch a g5.xlarge EC2 instance with Ubuntu 22.04.
2. Run `bash deploy/setup-aws.sh` to install all dependencies.
3. Package the UE5 project for Linux (Shipping configuration).
4. Transfer the packaged build to the server.
5. Configure `.env` and start services.
6. Run `bash deploy/setup-ssl.sh yourdomain.com` for HTTPS.

## Environment Variables

Configure these in `server/.env`:

| Variable           | Required | Default     | Description                              |
|--------------------|----------|-------------|------------------------------------------|
| `NODE_ENV`         | No       | development | `development` or `production`            |
| `PORT`             | No       | 3000        | Signalling server HTTP port              |
| `UE5_STREAMER_PORT`| No       | 8888        | Port where UE5 Pixel Streaming listens   |
| `CORS_ORIGIN`      | Yes*     | *           | Allowed origin for CORS (production)     |
| `JWT_SECRET`       | Yes      | --          | Secret key for signing JWT tokens        |
| `SMTP_HOST`        | Yes      | --          | SMTP server hostname                     |
| `SMTP_PORT`        | No       | 587         | SMTP server port                         |
| `SMTP_USER`        | Yes      | --          | SMTP authentication username             |
| `SMTP_PASS`        | Yes      | --          | SMTP authentication password             |
| `MONGODB_URI`      | No       | mongodb://localhost:27017/forex-expo | MongoDB connection string |

\* In production, set `CORS_ORIGIN` to your domain (e.g., `https://yourdomain.com`).

## Docker

An optional Docker Compose setup is available for running the signalling server and supporting services:

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

The `docker-compose.yml` defines:

- **signalling** -- the Node.js signalling server (port 3000)
- **mongo** -- MongoDB instance for booking data (port 27017)
- **nginx** -- reverse proxy with SSL termination (ports 80, 443)

Note: The UE5 application itself runs outside Docker directly on the host GPU. Docker is used only for the web infrastructure.

### Building the Docker image

```bash
docker build -t forex-expo-signalling -f Dockerfile .
```

## Troubleshooting

### Video stream does not appear

- Confirm the UE5 application is running with Pixel Streaming enabled.
- Check that `UE5_STREAMER_PORT` in `.env` matches the port UE5 is listening on.
- Open browser DevTools and look for WebRTC connection errors in the console.
- Verify no firewall is blocking UDP traffic between the browser and server.

### "Connection refused" on localhost:3000

- Ensure the signalling server is running: `npm run dev` (development) or `pm2 status` (production).
- Check if port 3000 is already in use: `lsof -i :3000`

### Meeting confirmation emails not sending

- Verify SMTP credentials in `.env`.
- Check server logs for SMTP connection errors.
- Test SMTP connectivity: `telnet smtp.yourdomain.com 587`

### High latency or stuttering video

- Pixel Streaming works best on low-latency networks. Check the round-trip time in the browser's WebRTC internals (`chrome://webrtc-internals`).
- Reduce the streaming resolution in `ue5-config/Engine.ini` if bandwidth is limited.
- Ensure the GPU is not thermal throttling: `nvidia-smi -q -d TEMPERATURE`

### UE5 packaged build fails to start on Linux

- Ensure the binary has execute permissions: `chmod +x ForexExpoHall.sh`
- Install required system libraries: `sudo apt-get install -y libvulkan1 libopengl0`
- Check that the NVIDIA driver is loaded: `nvidia-smi`

## License

MIT
