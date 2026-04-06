# Forex Expo Dubai — UE5 Pixel Streaming Launch Script (Windows)
# Run from the packaged game directory

$UE5_EXE = ".\ForexExpoHall\Binaries\Win64\ForexExpoHall-Win64-Shipping.exe"
$SIGNAL_HOST = if ($env:SIGNAL_HOST) { $env:SIGNAL_HOST } else { "localhost" }
$SIGNAL_PORT = if ($env:SIGNAL_PORT) { $env:SIGNAL_PORT } else { "8888" }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Forex Expo Dubai — UE5 Pixel Streaming" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Signalling: ws://${SIGNAL_HOST}:${SIGNAL_PORT}/ue5"
Write-Host "  Resolution: 1920x1080"
Write-Host "  Rendering:  Offscreen"
Write-Host "==========================================" -ForegroundColor Cyan

if (-not (Test-Path $UE5_EXE)) {
    Write-Host "ERROR: UE5 executable not found at $UE5_EXE" -ForegroundColor Red
    Write-Host "Make sure you've packaged the project for Win64 Shipping." -ForegroundColor Yellow
    exit 1
}

& $UE5_EXE `
  -PixelStreamingURL="ws://${SIGNAL_HOST}:${SIGNAL_PORT}/ue5" `
  -AudioMixer `
  -RenderOffScreen `
  -ResX=1920 -ResY=1080 `
  -GraphicsAdapter=0 `
  -AllowSoftwareRendering=false `
  -unattended `
  -log `
  -LogCmds="LogPixelStreaming Verbose"
