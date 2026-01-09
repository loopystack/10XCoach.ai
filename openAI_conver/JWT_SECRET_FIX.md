# JWT_SECRET Configuration for openAI_conver

## The Problem
The `openAI_conver` server needs to verify JWT tokens from the main server, but it's using a different `JWT_SECRET`, causing "Invalid or expired token" errors.

## The Solution

### Step 1: Check Main Server's JWT_SECRET

Open `server/.env` and find the `JWT_SECRET` value:
```env
JWT_SECRET=your-actual-secret-key-here
```

### Step 2: Add JWT_SECRET to openAI_conver/.env

Create or update `openAI_conver/.env` file with:

```env
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key

# ElevenLabs API Key (optional, for TTS comparison)
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Server Configuration
PORT=5000
HTTPS=true

# JWT Secret - MUST match server/.env exactly
JWT_SECRET=your-actual-secret-key-here

# Main Server URL (for API calls)
MAIN_API_URL=http://localhost:3001
```

**CRITICAL**: The `JWT_SECRET` value must be **EXACTLY THE SAME** as in `server/.env`

### Step 3: Restart openAI_conver Server

After updating `.env`, restart the server:
```bash
cd openAI_conver
# Stop the server (Ctrl+C)
# Then restart
npm start
# or
node server.js
```

## Verification

After restarting, try saving a conversation again. Check the server console - you should see:
- `✅ Decoded user ID from token: [number]` instead of token errors
- No "Invalid or expired token" errors

## Alternative: If JWT_SECRET Still Doesn't Work

The code now has a fallback that will try to get the user ID from the main server's `/api/auth/me` endpoint if token decoding fails. This should work even if JWT_SECRET doesn't match, but it's better to fix the JWT_SECRET configuration.

