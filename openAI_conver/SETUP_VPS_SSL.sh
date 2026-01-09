#!/bin/bash
# VPS SSL Setup Script for openAI_conver
# This script sets up nginx reverse proxy with Let's Encrypt SSL

echo "🔒 VPS SSL Setup for openAI_conver"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root/sudo"
    exit 1
fi

# Check if domain name is provided
if [ -z "$1" ]; then
    echo "Usage: sudo ./SETUP_VPS_SSL.sh yourdomain.com"
    echo ""
    echo "⚠️  IMPORTANT: You need a domain name for Let's Encrypt"
    echo "   Let's Encrypt does NOT issue certificates for IP addresses"
    echo ""
    echo "Options:"
    echo "1. Get a free domain from Freenom (.tk, .ml, .ga)"
    echo "2. Point DNS A record to your VPS IP: 95.216.225.37"
    echo "3. Run this script: sudo ./SETUP_VPS_SSL.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

echo "📍 Domain: $DOMAIN"
echo "📍 VPS IP: 95.216.225.37"
echo ""

# Update system
echo "📦 Updating system packages..."
apt update

# Install nginx
echo "📦 Installing nginx..."
apt install -y nginx

# Install certbot
echo "📦 Installing certbot..."
apt install -y certbot python3-certbot-nginx

# Create nginx configuration
echo "📝 Creating nginx configuration..."
cat > /etc/nginx/sites-available/openai-conver << EOF
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL will be configured by certbot
    # Temporary self-signed cert (will be replaced)
    
    # Proxy to Node.js app
    location / {
        proxy_pass https://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    location /health {
        proxy_pass https://localhost:5000/health;
    }
}
EOF

# Enable site
echo "🔗 Enabling nginx site..."
ln -sf /etc/nginx/sites-available/openai-conver /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Start nginx
echo "🚀 Starting nginx..."
systemctl restart nginx
systemctl enable nginx

# Get SSL certificate
echo ""
echo "🔐 Getting SSL certificate from Let's Encrypt..."
echo "⚠️  Make sure your domain DNS is pointing to 95.216.225.37"
echo ""
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL certificate installed successfully!"
    echo ""
    echo "📍 Your app is now available at:"
    echo "   https://$DOMAIN"
    echo ""
    echo "✅ NO browser warning - certificate is trusted by all browsers!"
    echo ""
    echo "📝 Update your redirect URL in client/src/pages/Coaches.tsx to:"
    echo "   https://$DOMAIN"
else
    echo ""
    echo "❌ SSL certificate installation failed!"
    echo "   Make sure:"
    echo "   1. DNS A record points to 95.216.225.37"
    echo "   2. Port 80 and 443 are open in firewall"
    echo "   3. Domain is accessible from internet"
    exit 1
fi

# Setup auto-renewal
echo "🔄 Setting up certificate auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update client/src/pages/Coaches.tsx redirect URL to: https://$DOMAIN"
echo "   2. Restart your Node.js app"
echo "   3. Test access: https://$DOMAIN"
echo ""

