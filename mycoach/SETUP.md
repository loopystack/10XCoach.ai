# Setup Guide for Coach Alan

Follow these steps to get your voice-to-voice coaching application running.

## Prerequisites

- Node.js 18+ installed
- Python 3.9+ installed
- PostgreSQL database (or use a cloud service like Supabase/Neon)
- Redis (optional, for faster session caching)
- OpenAI API key

## Step 1: Install Node.js Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mycoach?schema=public"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# OpenAI (required)
OPENAI_API_KEY="your-openai-api-key"

# AI Service URL
AI_SERVICE_URL="http://localhost:8000"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Step 3: Set Up Database

1. Make sure PostgreSQL is running
2. Run Prisma migrations:

```bash
npx prisma migrate dev --name init
```

This will create the `sessions` and `turns` tables.

## Step 4: Set Up Python AI Service

1. Navigate to the AI service directory:

```bash
cd ai-service
```

2. Create a virtual environment (recommended):

```bash
python -m venv venv
```

3. Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

4. Install Python dependencies:

```bash
pip install -r requirements.txt
```

5. Set the OpenAI API key:

**Windows:**
```bash
set OPENAI_API_KEY=your-openai-api-key
```

**Mac/Linux:**
```bash
export OPENAI_API_KEY=your-openai-api-key
```

## Step 5: Start the Services

You'll need to run two services simultaneously:

### Terminal 1: Next.js Frontend + API

```bash
npm run dev
```

This starts the Next.js app on http://localhost:3000

### Terminal 2: Python AI Service

```bash
npm run ai-service
```

Or directly:

```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

This starts the AI service on http://localhost:8000

## Step 6: Access the Application

1. Open your browser to http://localhost:3000
2. Click "Start Coaching Session"
3. Grant microphone permissions when prompted
4. Click "Talk to Coach Alan" and start speaking!

## Troubleshooting

### Microphone Not Working
- Make sure you've granted browser permissions for microphone access
- Check that your microphone is connected and working
- Try a different browser (Chrome/Firefox recommended)

### AI Service Not Responding
- Check that the AI service is running on port 8000
- Verify your OpenAI API key is set correctly
- Check the AI service logs for errors

### Database Connection Issues
- Verify PostgreSQL is running
- Check your DATABASE_URL in `.env`
- Run `npx prisma studio` to verify database connection

### Audio Playback Issues
- Check browser console for errors
- Verify audio codec support (MP3/WebM)
- Try a different browser

## Next Steps

- Customize Coach Alan's persona in `ai-service/main.py` (COACH_ALAN_SYSTEM_PROMPT)
- Adjust TTS voice in `ai-service/main.py` (currently "alloy")
- Add Redis for faster session context retrieval
- Implement WebSocket streaming for real-time duplex conversation

## Production Deployment

For production:
1. Set up a production PostgreSQL database
2. Configure environment variables on your hosting platform
3. Deploy Next.js app (Vercel recommended)
4. Deploy Python service (Railway, Render, or AWS)
5. Set up proper CORS and security headers

