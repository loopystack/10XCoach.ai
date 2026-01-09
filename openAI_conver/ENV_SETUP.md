# Environment Variables Setup

## 📋 Required Environment Variables

Create a `.env` file in the `openAI_conver` directory with the following variables:

### 1. OpenAI API Key (Required)
```
OPENAI_API_KEY=your_openai_api_key_here
```
- **Where to get it**: https://platform.openai.com/api-keys
- **Required for**: Both OpenAI and ElevenLabs modes (used for text generation)

### 2. ElevenLabs API Key (Required for ElevenLabs mode)
```
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```
- **Where to get it**: https://elevenlabs.io/app/settings/api-keys
- **Required for**: ElevenLabs button to work (voice synthesis)
- **Not required for**: OpenAI button (uses OpenAI's built-in TTS)

### 3. Server Configuration (Optional)
```
PORT=5000
HTTPS=true
MAIN_API_URL=http://localhost:3001
```

### 4. JWT Secret (REQUIRED for saving conversations)
```
JWT_SECRET=your-secret-key-here
```
- **CRITICAL**: This MUST match the `JWT_SECRET` in your main server's `server/.env` file
- **Where to find it**: Check `server/.env` file for the `JWT_SECRET` value
- **Required for**: Saving conversations, sending notes, creating reminders
- **If not set**: Token verification will fail and you'll get "Invalid or expired token" errors

## 🚀 Quick Setup

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** and add your API keys:
   ```
   OPENAI_API_KEY=sk-...
   ELEVENLABS_API_KEY=...
   ```

3. **Restart the server**:
   ```bash
   npm start
   ```

## ⚠️ Important Notes

- **Never commit `.env` to git** - it contains sensitive API keys
- The `.env` file should be in the `openAI_conver` directory (same level as `server.js`)
- Both API keys are required if you want to use both buttons
- If you only want to use the OpenAI button, you only need `OPENAI_API_KEY`

## 🔍 Verify Setup

After setting up, you can verify by:
1. Starting the server - it should not show any API key errors
2. Clicking "Talk to XXX (OpenAI)" - should work with just OpenAI key
3. Clicking "Talk to XXX (ElevenLabs)" - requires both keys

