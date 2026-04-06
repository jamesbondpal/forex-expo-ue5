#!/bin/bash
# Forex Expo Dubai — UE5 Pixel Streaming Launch Script (Linux/AWS)

UE5_EXE="./ForexExpoHall/Binaries/Linux/ForexExpoHall-Linux-Shipping"
SIGNAL_HOST="${SIGNAL_HOST:-localhost}"
SIGNAL_PORT="${SIGNAL_PORT:-8888}"

echo "=========================================="
echo "  Forex Expo Dubai — UE5 Pixel Streaming"
echo "=========================================="
echo "  Signalling: ws://${SIGNAL_HOST}:${SIGNAL_PORT}/ue5"
echo "  Resolution: 1920x1080"
echo "  Rendering:  Offscreen"
echo "=========================================="

if [ ! -f "$UE5_EXE" ]; then
    echo "ERROR: UE5 executable not found at $UE5_EXE"
    echo "Make sure you've packaged the project for Linux Shipping."
    exit 1
fi

chmod +x "$UE5_EXE"

"$UE5_EXE" \
  -PixelStreamingURL="ws://${SIGNAL_HOST}:${SIGNAL_PORT}/ue5" \
  -AudioMixer \
  -RenderOffScreen \
  -ResX=1920 -ResY=1080 \
  -GraphicsAdapter=0 \
  -AllowSoftwareRendering=false \
  -unattended \
  -log \
  -LogCmds="LogPixelStreaming Verbose"
