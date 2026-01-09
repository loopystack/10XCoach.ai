# VPS SSL Setup - Remove Browser Warning (Let's Encrypt)

Since `95.216.225.37` is your VPS server, we need **Let's Encrypt** certificates (free, trusted by all browsers) instead of mkcert.

## Solution: Nginx Reverse Proxy + Let's Encrypt

### Option 1: Use a Domain Name (Recommended)

If you have a domain name pointing to your VPS (e.g., `openai.yourdomain.com`), use this:

**Step 1: Install Nginx and Certbot**
```bash
# SSH into your VPS
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

**Step 2: Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/openai-conver
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name openai.yourdomain.com;  # Replace with your domain

    location / {
        proxy_pass https://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Step 3: Enable the site**
```bash
sudo ln -s /etc/nginx/sites-available/openai-conver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 4: Get SSL Certificate**
```bash
sudo certbot --nginx -d openai.yourdomain.com
```

This will:
- Get a free Let's Encrypt certificate
- Configure nginx to use HTTPS
- Set up automatic renewal

**Step 5: Update your app redirect**
Users will now access: `https://openai.yourdomain.com` (no warning!)

### Option 2: IP Address Only (More Complex)

If you don't have a domain, you have limited options:

**Option A: Use Cloudflare Tunnel (Free)**
1. Sign up for Cloudflare (free)
2. Install cloudflared on your VPS
3. Create a tunnel that gives you a domain name
4. Cloudflare provides free SSL certificates

**Option B: Use a Self-Signed Certificate (Still shows warning, but users can proceed)**

Since you're using an IP address, Let's Encrypt won't issue certificates for IPs (only domains). The best solution is to:

1. **Get a free domain** (Freenom, Namecheap, etc.)
2. **Point it to your VPS IP** (A record: `@` → `95.216.225.37`)
3. **Use Option 1 above** with Let's Encrypt

**Option C: Accept the Warning (Users click "Proceed")**

If you must use IP address, the browser warning is unavoidable. However, we can make it easier for users by:
- Adding instructions on how to proceed
- Using a certificate that at least encrypts the connection (even if not trusted)

## Recommended: Quick Domain Setup

1. Get a free domain from:
   - Freenom (.tk, .ml, .ga domains - free)
   - Or use a subdomain from a service like DuckDNS

2. Point DNS A record to `95.216.225.37`

3. Follow Option 1 above

This gives you:
- ✅ No browser warning
- ✅ Free SSL certificate (Let's Encrypt)
- ✅ Automatic renewal
- ✅ Professional URL: `https://openai.yourdomain.com`

