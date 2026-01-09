# Voice-to-Voice Chat with ElevenLabs

A real-time voice-to-voice chat application that integrates with ElevenLabs API for natural AI voice responses.

## Features

- 🎤 Voice input using Web Speech API
- 🤖 AI-powered responses
- 🔊 Natural voice output via ElevenLabs TTS
- 🎨 Beautiful, modern UI with animated button
- ⚡ Real-time communication

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API key:**
   The ElevenLabs API key is already configured in `.env` file.

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

## Usage

1. Click the circular button on the homepage
2. Speak your question or message
3. The AI will process your input and respond with voice
4. The response will play automatically

## Browser Compatibility

- Chrome (recommended)
- Edge
- Safari (with limitations)
- Firefox (may require additional setup)

## Project Structure

```
elevenlabs/
├── server.js          # Express backend server
├── public/
│   ├── index.html     # Main page
│   ├── styles.css     # Styling
│   └── app.js         # Frontend logic
├── .env               # Environment variables (API key)
├── package.json       # Dependencies
└── README.md          # This file
```

## API Endpoints

- `POST /api/voice-chat` - Processes voice input and returns AI voice response

## Notes

- The current AI responses are rule-based. You can replace the `getAIResponse` function in `server.js` with an actual AI API (like OpenAI) for more intelligent responses.
- The default ElevenLabs voice is "Rachel". You can change the `voiceId` in `server.js` to use different voices.

