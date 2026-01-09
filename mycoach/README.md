# Coach Alan - Voice-to-Voice AI Coach

A real-time, two-way conversational coach application featuring Coach Alan Wozniak.

## Features

- Voice-to-voice conversation with natural speech
- Conversation memory and context
- Real-time transcription and response
- Clean, minimal UI with coach avatar

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes
- **AI Service**: Python FastAPI
- **STT**: OpenAI Whisper / Deepgram
- **LLM**: OpenAI GPT-4 / Anthropic Claude
- **TTS**: ElevenLabs / AWS Polly
- **Database**: PostgreSQL (via Prisma) + Redis

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (see `.env.example`)

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Start the Next.js dev server:
```bash
npm run dev
```

5. Start the AI service (in a separate terminal):
```bash
npm run ai-service
```

## Project Structure

- `app/coach-alan/` - Main coach interface page
- `components/` - React components (CoachAvatar, VoiceControl, TranscriptPane)
- `app/api/` - Next.js API routes
- `ai-service/` - Python FastAPI service for AI orchestration
- `lib/` - Utility functions and clients

