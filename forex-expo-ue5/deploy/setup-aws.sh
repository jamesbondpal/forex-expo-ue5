#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "  Forex Expo Dubai — AWS Server Setup"
echo "  Target: g5.xlarge (Ubuntu 22.04)"
echo "=========================================="

# 1. Update system
echo "[1/10] Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install NVIDIA drivers
echo "[2/10] Installing NVIDIA drivers..."
sudo apt-get install -y linux-headers-$(uname -r)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID | sed -e 's/\.//g')
wget https://developer.download.nvidia.com/compute/cuda/repos/${distribution}/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update
sudo apt-get install -y nvidia-driver-535
echo "NVIDIA driver installed. A reboot may be required."

# 3. Install CUDA toolkit
echo "[3/10] Installing CUDA toolkit..."
sudo apt-get install -y cuda-toolkit-12-2

# 4. Install Node.js 20 LTS via nvm
echo "[4/10] Installing Node.js 20 LTS..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20

# 5. Install PM2
echo "[5/10] Installing PM2..."
npm install -g pm2

# 6. Install nginx
echo "[6/10] Installing nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx

# 7. Install Docker + Docker Compose
echo "[7/10] Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER

# 8. Install project dependencies
echo "[8/10] Installing project dependencies..."
cd /opt
if [ -d "forex-expo-ue5" ]; then
    cd forex-expo-ue5 && git pull
else
    echo "Please clone the repository to /opt/forex-expo-ue5"
    echo "  git clone <your-repo-url> /opt/forex-expo-ue5"
fi
if [ -d "/opt/forex-expo-ue5" ]; then
    cd /opt/forex-expo-ue5
    npm install
    cd server && npm install && cd ..
    cd client && npm install && cd ..
fi

# 9. Configure environment
echo "[9/10] Configuring environment..."
if [ -f "/opt/forex-expo-ue5/server/.env" ]; then
    echo ".env already exists, skipping..."
else
    cp /opt/forex-expo-ue5/server/.env.example /opt/forex-expo-ue5/server/.env
    echo ""
    echo "IMPORTANT: Edit /opt/forex-expo-ue5/server/.env with your values:"
    echo "  nano /opt/forex-expo-ue5/server/.env"
    echo ""
fi

# 10. Start services
echo "[10/10] Starting services with PM2..."
if [ -d "/opt/forex-expo-ue5" ]; then
    cd /opt/forex-expo-ue5
    pm2 start deploy/ecosystem.config.js
    pm2 save
    pm2 startup | tail -1 | bash || true
fi

# Configure nginx
echo "Configuring nginx..."
sudo mkdir -p /var/log/forex-expo
sudo cp /opt/forex-expo-ue5/nginx.conf /etc/nginx/sites-available/forex-expo
sudo ln -sf /etc/nginx/sites-available/forex-expo /etc/nginx/sites-enabled/forex-expo
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Summary
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo "  Public IP:     ${PUBLIC_IP}"
echo "  Web:           http://${PUBLIC_IP}"
echo "  API:           http://${PUBLIC_IP}/api/health"
echo "  Signalling:    ws://${PUBLIC_IP}/ws"
echo ""
echo "  Next steps:"
echo "  1. Edit .env:  nano /opt/forex-expo-ue5/server/.env"
echo "  2. Upload UE5: scp -r ForexExpoHall/ ubuntu@${PUBLIC_IP}:/opt/"
echo "  3. Run UE5:    cd /opt && bash forex-expo-ue5/ue5-config/launch-linux.sh"
echo "  4. SSL:        bash forex-expo-ue5/deploy/setup-ssl.sh"
echo "=========================================="
