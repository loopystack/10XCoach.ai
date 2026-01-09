# Real-time Voice-to-Voice AI Conversation

A real-time voice-to-voice conversational AI application using OpenAI's Realtime API. This application enables natural voice conversations with AI without converting to text - pure voice-to-voice communication.

## Features

- 🎤 **Real-time Voice Conversation**: Direct voice-to-voice communication with AI
- 🚀 **No Text Conversion**: Pure audio streaming, no STT/TTS delays
- 🎨 **Modern UI**: Beautiful, responsive interface with audio visualizer
- ⚡ **Low Latency**: Optimized for real-time performance

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key with access to Realtime API

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=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
   ```
   
   **Note:** Your API key is already provided above. Just copy it into your `.env` file.

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. Click the **"Start Conversation"** button
2. Allow microphone access when prompted
3. Speak naturally - the AI will listen and respond with voice
4. Click **"Stop Conversation"** when done

## How It Works

- The application uses OpenAI's Realtime API for voice-to-voice communication
- Audio is captured from your microphone and streamed to OpenAI
- AI processes the audio and responds with voice directly
- No intermediate text conversion - pure audio streaming

## Project Structure

```
.
├── server.js          # Express server with WebSocket support
├── public/
│   ├── index.html     # Main HTML interface
│   ├── style.css      # Styling
│   └── app.js         # Frontend JavaScript
├── package.json       # Dependencies
└── .env              # Environment variables (not in git)
```

## Notes

- Make sure your OpenAI API key has access to the Realtime API
- The application requires microphone permissions
- Works best with a stable internet connection
- Audio format: PCM16 at 24kHz sample rate

## License

MIT

