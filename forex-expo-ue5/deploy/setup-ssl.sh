#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "  SSL Certificate Setup (Let's Encrypt)"
echo "=========================================="

if [ -z "${1:-}" ]; then
    echo "Usage: bash setup-ssl.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}"

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo "SSL configured for ${DOMAIN}"
echo "Certificate will auto-renew via systemd timer."
echo "Access your site at: https://${DOMAIN}"
