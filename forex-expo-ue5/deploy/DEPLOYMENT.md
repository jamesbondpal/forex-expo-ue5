# Forex Expo Dubai UE5 -- Deployment Guide

## Prerequisites

Before deploying, ensure you have the following:

- **AWS Account** with permission to launch EC2 instances
- **Instance type:** g5.xlarge (1x NVIDIA A10G GPU, 4 vCPUs, 16 GB RAM)
- **AMI:** Ubuntu 22.04 LTS (x86_64)
- **Domain name** pointed at your server IP (for SSL)
- **SMTP credentials** for transactional email (booking confirmations)
- **UE5 5.3+** installed locally to package the project for Linux
- An SSH key pair registered with AWS

---

## Step 1: Launch the AWS Instance

1. Open the EC2 console and click **Launch Instance**.
2. Choose **Ubuntu Server 22.04 LTS** as the AMI.
3. Select instance type **g5.xlarge**.
4. Storage: allocate at least **100 GB** gp3 (the packaged UE5 build is large).
5. Configure the **Security Group** with the following inbound rules:

| Port  | Protocol | Source    | Purpose                |
|-------|----------|-----------|------------------------|
| 22    | TCP      | Your IP   | SSH access             |
| 80    | TCP      | 0.0.0.0/0 | HTTP (nginx)          |
| 443   | TCP      | 0.0.0.0/0 | HTTPS (nginx + SSL)   |
| 3000  | TCP      | 0.0.0.0/0 | Signalling server      |
| 8888  | TCP      | 0.0.0.0/0 | Pixel Streaming        |

6. Launch the instance and note the **public IP address**.

---

## Step 2: SSH In and Run the Setup Script

```bash
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP

# Clone the repository
sudo mkdir -p /opt/forex-expo-ue5
sudo chown ubuntu:ubuntu /opt/forex-expo-ue5
git clone <your-repo-url> /opt/forex-expo-ue5

# Run the automated setup
cd /opt/forex-expo-ue5
bash deploy/setup-aws.sh
```

The setup script installs NVIDIA drivers, CUDA, Node.js 20, PM2, nginx, and Docker. After it finishes you may need to **reboot** for the NVIDIA driver to load:

```bash
sudo reboot
# Wait ~60 seconds, then reconnect
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP
nvidia-smi   # Verify the GPU is visible
```

---

## Step 3: Package the UE5 Project (Shipping Build for Linux)

On your local development machine (Windows or macOS with UE5 installed):

1. Open `ForexExpoHall.uproject` in Unreal Editor 5.3+.
2. Verify the **Pixel Streaming** plugin is enabled under Edit > Plugins.
3. Go to **Platforms > Linux > Package Project**.
   - Build configuration: **Shipping**
   - Target platform: **Linux**
4. Wait for the cook and package process to complete. The output folder will contain the packaged binary and all cooked assets.

Alternatively, use the command line:

```bash
# From your UE5 engine directory
./RunUAT.sh BuildCookRun \
  -project="/path/to/ForexExpoHall.uproject" \
  -noP4 -platform=Linux -clientconfig=Shipping \
  -cook -build -stage -pak -archive \
  -archivedirectory="/path/to/output"
```

---

## Step 4: Transfer the Packaged Build via SCP

```bash
# From your local machine
scp -i your-key.pem -r /path/to/output/LinuxServer/ \
  ubuntu@YOUR_PUBLIC_IP:/opt/ForexExpoHall/
```

This may take a while depending on build size (typically 2--5 GB). Consider using `rsync` for resumable transfers:

```bash
rsync -avz --progress -e "ssh -i your-key.pem" \
  /path/to/output/LinuxServer/ \
  ubuntu@YOUR_PUBLIC_IP:/opt/ForexExpoHall/
```

---

## Step 5: Configure the Environment

SSH into the server and edit the `.env` file:

```bash
nano /opt/forex-expo-ue5/server/.env
```

Fill in the required values:

```
NODE_ENV=production
PORT=3000
UE5_STREAMER_PORT=8888
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=<generate-a-random-64-char-string>
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<your-smtp-password>
MONGODB_URI=mongodb://localhost:27017/forex-expo
```

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

---

## Step 6: Run the UE5 App in tmux

Use tmux so the UE5 process survives SSH disconnects:

```bash
tmux new -s ue5

cd /opt/forex-expo-ue5
bash ue5-config/launch-linux.sh

# Detach from tmux: Ctrl+B then D
```

Verify the Pixel Streaming endpoint is listening:

```bash
curl -s http://localhost:8888 | head -5
```

To reattach later:

```bash
tmux attach -t ue5
```

---

## Step 7: Start the Signalling Server with PM2

If the setup script already started PM2, verify it is running:

```bash
pm2 status
```

If not, start it manually:

```bash
cd /opt/forex-expo-ue5
pm2 start deploy/ecosystem.config.js
pm2 save
```

Test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

---

## Step 8: Set Up SSL

Point your domain's DNS A record to the server's public IP, then run:

```bash
bash /opt/forex-expo-ue5/deploy/setup-ssl.sh yourdomain.com
```

This installs certbot, obtains a Let's Encrypt certificate, and configures auto-renewal. After completion:

```bash
curl -I https://yourdomain.com
```

You should see a `200 OK` with valid SSL headers.

---

## Step 9: Test from a Browser

Open your browser and navigate to:

```
https://yourdomain.com
```

You should see the Forex Expo Dubai lobby with a live Pixel Streaming viewport. Test the following:

1. **Video stream loads** -- you should see the 3D expo hall rendered by UE5.
2. **Navigation works** -- click or tap to move around the hall.
3. **Broker booths** -- approaching a booth should trigger the overlay panel.
4. **Meeting booking** -- fill in the booking form; confirm you receive a confirmation email.
5. **Seminar area** -- walk into the seminar zone and verify the modal opens.
6. **Multiple users** -- open a second browser tab to verify multi-viewer support.

---

## Step 10: Monitoring

### PM2 (Signalling Server)

```bash
pm2 status                     # Process overview
pm2 logs forex-expo-signalling # Live log tail
pm2 monit                      # CPU/memory dashboard
```

### nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### UE5 Application

```bash
tmux attach -t ue5             # View live UE5 console output
```

### System Resources

```bash
nvidia-smi                     # GPU utilization
htop                           # CPU and memory
df -h                          # Disk usage
```

### Log Files

| Log                              | Location                          |
|----------------------------------|-----------------------------------|
| Signalling stdout                | /var/log/forex-expo/out.log       |
| Signalling errors                | /var/log/forex-expo/error.log     |
| nginx access                     | /var/log/nginx/access.log         |
| nginx errors                     | /var/log/nginx/error.log          |
| UE5 output                       | tmux session `ue5`                |

---

## Troubleshooting

### nvidia-smi shows "No devices found"

The NVIDIA driver may not have loaded after installation. Reboot the instance:

```bash
sudo reboot
```

If the problem persists, verify the driver is installed:

```bash
dpkg -l | grep nvidia-driver
```

Re-install if necessary:

```bash
sudo apt-get install -y nvidia-driver-535
sudo reboot
```

### UE5 crashes immediately on launch

- Check that the packaged build targets **Linux** and uses the **Shipping** configuration.
- Verify GPU access: `nvidia-smi` should show the A10G GPU.
- Check UE5 logs in the tmux session for specific error messages.
- Ensure the binary has execute permissions: `chmod +x /opt/ForexExpoHall/ForexExpoHall.sh`

### Pixel Streaming video does not appear in the browser

- Confirm UE5 is running and listening on port 8888: `ss -tlnp | grep 8888`
- Check that the signalling server is running: `pm2 status`
- Verify nginx is proxying WebSocket connections correctly: `sudo nginx -t`
- Open browser developer tools and check the console for WebRTC errors.
- Ensure ports 8888 and 3000 are open in the AWS security group.

### WebSocket connection fails

- Confirm nginx is configured to proxy WebSocket upgrades (check for `proxy_set_header Upgrade` directives).
- Test locally: `wscat -c ws://localhost:3000/ws`
- Check nginx error logs for upstream connection refused errors.

### PM2 process keeps restarting

```bash
pm2 logs forex-expo-signalling --lines 50
```

Common causes:
- Missing `.env` file or incorrect environment variables.
- Port 3000 already in use: `ss -tlnp | grep 3000`
- Missing Node.js dependencies: `cd /opt/forex-expo-ue5/server && npm install`

### SSL certificate fails to obtain

- Verify the domain's A record points to the server's public IP: `dig yourdomain.com`
- Ensure port 80 is open (certbot uses HTTP-01 challenge).
- Check certbot logs: `sudo journalctl -u certbot`

### High GPU memory usage or OOM

- The g5.xlarge has 24 GB GPU memory. If running multiple streams, consider g5.2xlarge or higher.
- Monitor with `nvidia-smi dmon -s u` for real-time utilization.
- Reduce rendering quality in UE5 project settings if necessary.

### Cannot connect via SSH after reboot

- The instance may take 2--3 minutes to fully boot after a reboot.
- Check the EC2 console for instance status checks.
- Verify your security group still allows SSH from your IP.
