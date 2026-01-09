# 🚀 Deployment Guide for Hostinger VPS

## ⚠️ Important: No Sudo Access

**This guide is specifically for Hostinger VPS without sudo/root access.** All commands use user-level permissions only.

If you have sudo access, you can use the standard Linux deployment methods. Otherwise, follow this guide which uses Hostinger's control panel (hPanel) for system-level configurations.

## Overview

This is a full-stack application with:
- **Frontend**: React/Vite app in `client/` folder
- **Backend**: Node.js/Express server in `server/` folder
- **Database**: PostgreSQL (via Prisma)
- **AI Service**: Python FastAPI (optional, in `ai-service/` folder)

## Prerequisites

1. **Node.js** (v18 or higher) and npm (usually pre-installed on Hostinger)
2. **PostgreSQL** database (available via Hostinger hPanel)
3. **PM2** (process manager) - installed locally without sudo
4. **Web Server** - managed via Hostinger hPanel or Node.js app manager
5. **Git** (to clone/upload your project) or SFTP access

---

## Step 1: Prepare Your Project

### On Your Local Machine (Before Deployment)

1. **Build the client** (REQUIRED):
   ```bash
   cd client
   npm install
   npm run build
   ```
   This creates a `dist/` folder with optimized production files.

2. **Create environment file** for server:
   Create `server/.env` with:
   ```env
   NODE_ENV=production
   PORT=3001
   HTTPS=false  # Set to false for VPS (use Nginx SSL instead)
   
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/10xcoach"
   
   # JWT Secret (generate a strong random string)
   JWT_SECRET="your-super-secret-jwt-key-change-this"
   
   # OpenAI API Key (required for AI conversations)
   OPENAI_API_KEY="your-openai-api-key"
   
   # Server URL (your VPS domain/IP)
   SERVER_URL="https://yourdomain.com"
   ```

3. **Test locally** (optional but recommended):
   ```bash
   npm run build  # Build client
   cd server
   npm install
   npm start      # Test server works
   ```

---

## Step 2: Upload to VPS

### Option A: Using Git (Recommended)

```bash
# On VPS
cd /var/www  # or your preferred directory
git clone <your-repo-url> 10x-dashboard
cd 10x-dashboard
```

### Option B: Using SCP/SFTP

1. Create a ZIP of your project (excluding `node_modules`)
2. Upload to VPS via SFTP/SCP
3. Extract on VPS:
   ```bash
   unzip 10x-dashboard.zip -d /var/www/
   cd /var/www/10x-dashboard
   ```

---

## Step 3: Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install --production  # --production excludes dev dependencies

# Install client dependencies (needed for build)
cd ../client
npm install
```

---

## Step 4: Build Frontend (REQUIRED)

```bash
# From project root
cd client
npm run build
```

**Important**: The `dist/` folder created here is what the server serves in production. Make sure it exists!

Verify the build:
```bash
ls -la client/dist/
# Should see: index.html, assets/, etc.
```

---

## Step 5: Set Up Database (Without Sudo)

### Option A: Use Hostinger Database Panel (Recommended)

1. **Access Hostinger Control Panel** (hPanel):
   - Log into your Hostinger account
   - Go to **Databases** → **PostgreSQL Databases**

2. **Create a New Database**:
   - Click **Create Database**
   - Database name: `10xcoach` (or your preferred name)
   - Note the database name, username, and password provided

3. **Get Connection Details**:
   - Check the database host (might be `localhost` or something like `pgsql123.hosting.com`)
   - Note the port (usually `5432`)
   - Save the username and password

4. **Update DATABASE_URL in `server/.env`**:
   ```env
   DATABASE_URL="postgresql://username:password@host:5432/database_name"
   ```
   Example:
   ```env
   DATABASE_URL="postgresql://u774956217_coach:your_password@pgsql123.hosting.com:5432/u774956217_10xcoach"
   ```

### Option B: Use Remote PostgreSQL (if available)

If Hostinger doesn't provide PostgreSQL, you can:
1. Use a free PostgreSQL service like **Neon**, **Supabase**, or **ElephantSQL**
2. Get connection string from their dashboard
3. Update `DATABASE_URL` in `server/.env`

### Run Prisma Migrations

```bash
cd server
npx prisma generate
npx prisma db push
# Or if you have migrations:
# npx prisma migrate deploy
```

**Note**: If you get connection errors, make sure your database host allows connections from your VPS IP.

---

## Step 6: Set Up Environment Variables

Create `server/.env` file:

```bash
cd server
nano .env
```

Paste your environment variables (from Step 1) and save.

---

## Step 7: Install PM2 (Without Sudo)

### Install PM2 Locally (No Sudo Required)

```bash
# Install PM2 locally (in your home directory or project)
cd ~  # or your project directory
npm install pm2 --save-dev

# OR install globally to your user directory (no sudo needed)
npm install pm2 -g --prefix ~/.npm-global

# Add to PATH (add this to ~/.bashrc or ~/.bash_profile)
export PATH=~/.npm-global/bin:$PATH

# Reload your shell config
source ~/.bashrc  # or source ~/.bash_profile
```

### Alternative: Use PM2 from node_modules

If you install PM2 locally in your project:

```bash
cd /home/u774956217/domains/10xcoach.ai/public_html

# Install PM2 locally in the project
npm install pm2 --save-dev

# Use npx to run PM2
npx pm2 start server/src/index.js --name "10x-dashboard"

# Or use ecosystem config
npx pm2 start ecosystem.config.js

# Save PM2 configuration
npx pm2 save
```

### Create PM2 Start Script

Create a simple start script that doesn't require global PM2:

```bash
# Create start.sh in your project root
cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
node_modules/.bin/pm2 start ecosystem.config.js
node_modules/.bin/pm2 save
EOF

chmod +x start.sh
```

### PM2 Useful Commands (Using Local Install)

```bash
# If installed globally in user directory:
pm2 list
pm2 logs 10x-dashboard
pm2 restart 10x-dashboard
pm2 stop 10x-dashboard
pm2 delete 10x-dashboard

# If installed locally:
npx pm2 list
npx pm2 logs 10x-dashboard
npx pm2 restart 10x-dashboard
```

### Note About Auto-Start on Boot

Without sudo, you can't use `pm2 startup`. However, Hostinger may have:
- A cron job system you can use
- A Node.js app management panel in hPanel
- Or you can manually start PM2 after server restarts

To create a cron job that checks if PM2 is running:
```bash
# Edit your crontab (no sudo needed)
crontab -e

# Add this line to check every 5 minutes if server is running
*/5 * * * * cd /home/u774956217/domains/10xcoach.ai/public_html && node_modules/.bin/pm2 restart 10x-dashboard || node_modules/.bin/pm2 start ecosystem.config.js
```

---

## Step 8: Configure Web Server (Without Sudo)

### Option A: Use Hostinger's Node.js App Manager (Recommended)

Hostinger often provides a Node.js management panel:

1. **Access hPanel**:
   - Go to **Advanced** → **Node.js** (or similar)
   - Create a new Node.js app

2. **Configure the App**:
   - **App name**: `10x-dashboard`
   - **Node.js version**: Select 18.x or 20.x
   - **Start command**: `cd server && node src/index.js`
   - **Working directory**: `/home/u774956217/domains/10xcoach.ai/public_html`
   - **Port**: Usually auto-assigned, or use environment variable

3. **Set Environment Variables** in the panel:
   - `NODE_ENV=production`
   - `PORT=3001` (or the assigned port)
   - `DATABASE_URL=your_database_url`
   - `JWT_SECRET=your_secret`
   - `OPENAI_API_KEY=your_key`
   - `HTTPS=false`

4. **Enable the App** and Hostinger will handle proxying

### Option B: Use .htaccess (If Apache is Available)

If your domain uses Apache, create `.htaccess` in `public_html`:

```apache
RewriteEngine On

# Proxy to Node.js server
RewriteCond %{REQUEST_URI} !^/node
RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]

# WebSocket support (might need mod_proxy_wstunnel)
ProxyPass /ws ws://localhost:3001/ws
ProxyPassReverse /ws ws://localhost:3001/ws
```

### Option C: Direct Port Access (Temporary Testing)

If nothing else works, you can temporarily access directly via port:
- Visit: `http://yourdomain.com:3001`
- This is not recommended for production

### Option D: Contact Hostinger Support

Ask them to:
1. Configure reverse proxy from your domain to port 3001
2. Enable WebSocket support for your domain
3. Set up SSL certificate for your domain

---

## Step 9: Set Up SSL (Without Sudo)

### Option A: Use Hostinger's SSL Manager (Recommended)

1. **Access hPanel**:
   - Go to **Advanced** → **SSL/TLS** or **SSL Manager**

2. **Enable SSL**:
   - Click **Manage SSL** for your domain
   - Select **Let's Encrypt** (free)
   - Click **Install** or **Enable**
   - Wait for the certificate to be installed (usually 1-5 minutes)

3. **Force HTTPS**:
   - Look for an option to **Force HTTPS** or **Redirect HTTP to HTTPS**
   - Enable it to redirect all HTTP traffic to HTTPS

### Option B: Use Cloudflare (Free Alternative)

1. **Sign up for Cloudflare** (free tier)
2. **Add your domain** to Cloudflare
3. **Update nameservers** at Hostinger to point to Cloudflare
4. **Enable SSL/TLS** in Cloudflare dashboard:
   - Go to **SSL/TLS** → Set to **Full** or **Full (strict)**
   - Enable **Always Use HTTPS**

### Note

If you use Hostinger's Node.js app manager (Step 8, Option A), SSL is usually configured automatically.

---

## Step 10: Configure HTTPS (If Using Manual Setup)

If you're using Hostinger's Node.js manager (Step 8, Option A), HTTPS is usually handled automatically.

If you need manual configuration, the reverse proxy settings should already handle HTTPS when SSL is enabled in hPanel.

---

## Step 11: Firewall Configuration (No Action Needed)

Hostinger manages the firewall at the server level. You typically don't need to configure it manually.

If you have issues connecting:
- **Check Hostinger firewall** settings in hPanel
- **Verify your Node.js app** is binding to the correct port
- **Contact Hostinger support** if ports seem blocked

---

## Step 12: Verify Deployment

1. **Check server is running**:
   ```bash
   pm2 list
   pm2 logs 10x-dashboard
   ```

2. **Test locally on VPS**:
   ```bash
   curl http://localhost:3001/health
   ```

3. **Access via browser**:
   - Visit `http://yourdomain.com` or `https://yourdomain.com`

---

## Troubleshooting

### Server not starting
- Check logs: `pm2 logs 10x-dashboard`
- Verify `.env` file exists and has correct values
- Check database connection: `cd server && node test-db-connection.js`

### 404 errors on frontend routes
- Verify `client/dist/` folder exists
- Check server is serving static files from correct path
- Verify Nginx proxy_pass is correct

### Database connection errors
- Check DATABASE_URL in `.env` is correct (verify host, port, username, password)
- Test connection: `psql -U your_username -h hostname -d 10xcoach`
- Verify database exists in Hostinger panel
- Check if database host allows connections from your VPS IP
- If using remote database, ensure firewall allows your VPS IP

### WebSocket not working
- Ensure Nginx config includes WebSocket headers
- Check firewall allows port 443
- Verify server has `HTTPS=false` in `.env` (let Nginx handle SSL)

### Permission denied when running build (`tsc: Permission denied`)
This happens when files are uploaded via FTP/SFTP and lose execute permissions. Fix with:

```bash
# Option 1: Fix permissions on binaries
cd client
chmod +x node_modules/.bin/*

# Option 2: Reinstall node_modules (cleaner solution)
cd client
rm -rf node_modules package-lock.json
npm install
npm run build

# Option 3: Use npx directly (temporary workaround)
cd client
npx tsc && vite build
```

### Server crashes with "Aborted (core dumped)"
This usually happens due to missing Prisma client or native module issues. Fix with:

```bash
cd /home/u774956217/domains/10xcoach.ai/public_html/server

# Step 1: Generate Prisma Client (CRITICAL - must be done first)
npx prisma generate

# Step 2: Verify Prisma client was generated
ls -la node_modules/.prisma/client/

# Step 3: Check if database connection is valid
# Make sure your .env file has the correct DATABASE_URL
cat .env | grep DATABASE_URL

# Step 4: Test database connection (optional)
node -e "const prisma = require('./src/lib/prisma'); prisma.$connect().then(() => { console.log('✅ Database connected'); process.exit(0); }).catch(e => { console.error('❌ Database error:', e.message); process.exit(1); })"

# Step 5: If still crashing, rebuild native modules
npm rebuild
# Or reinstall:
rm -rf node_modules package-lock.json
npm install

# Step 6: Check Node.js version (should be 18+)
node --version
```

**Common causes:**
- Prisma client not generated: Run `npx prisma generate` in the `server/` directory
- Invalid DATABASE_URL: Check `.env` file has correct database connection string
- Native modules compiled for wrong architecture: Run `npm rebuild`
- Node.js version too old: Use Node.js 18 or higher

---

## Quick Deploy Script

Create a deploy script for easier updates:

```bash
#!/bin/bash
# deploy.sh

cd /var/www/10x-dashboard

# Pull latest code (if using git)
# git pull

# Install/update dependencies
npm install
cd server && npm install --production && cd ..
cd client && npm install && npm run build && cd ..

# Restart PM2
pm2 restart 10x-dashboard

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

---

## Summary Checklist

- [ ] Built client (`npm run build` in `client/` folder)
- [ ] Created `server/.env` with all required variables
- [ ] Database created and migrations run
- [ ] PM2 installed and server running
- [ ] Nginx configured and running
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Firewall configured
- [ ] Tested via browser

---

## Notes

- **HTTPS**: The server can generate self-signed certificates, but for production, use Nginx with Let's Encrypt SSL
- **Port**: Server runs on port 3001 by default. Nginx proxies to it
- **Environment**: Set `NODE_ENV=production` for optimal performance
- **Updates**: After code changes, rebuild client and restart PM2: `npm run build && pm2 restart 10x-dashboard`

Good luck with your deployment! 🚀

