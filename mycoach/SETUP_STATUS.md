# Setup Status ✅

## Completed Steps

✅ **Node.js dependencies installed** - All npm packages are ready
✅ **Prisma client generated** - Database client is ready
✅ **Python dependencies installed** - AI service packages are ready

## Next Steps Required

### 1. Configure Environment Variables

Create a `.env` file in the root directory with:

```env
# Database (update with your PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@localhost:5432/mycoach?schema=public"

# OpenAI API Key (REQUIRED - get from https://platform.openai.com/api-keys)
OPENAI_API_KEY="your-actual-openai-api-key-here"

# AI Service URL
AI_SERVICE_URL="http://localhost:8000"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Set Up Database

**Option A: If you have PostgreSQL running locally:**
```bash
npx prisma migrate dev --name init
```

**Option B: Use a cloud database (Supabase/Neon):**
1. Create a free PostgreSQL database
2. Update DATABASE_URL in `.env`
3. Run: `npx prisma migrate deploy`

### 3. Set OpenAI API Key for Python Service

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="your-actual-openai-api-key-here"
```

**Or create `.env` file in `ai-service/` folder:**
```env
OPENAI_API_KEY=your-actual-openai-api-key-here
```

### 4. Start the Services

**Terminal 1 - Next.js (Frontend + API):**
```bash
npm run dev
```

**Terminal 2 - AI Service (Python):**
```bash
npm run ai-service
```

Or manually:
```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

### 5. Open the Application

Navigate to: **http://localhost:3000**

## Quick Test

Once both services are running:
1. Go to http://localhost:3000
2. Click "Start Coaching Session"
3. Grant microphone permissions
4. Click "Talk to Coach Alan"
5. Speak for a few seconds
6. Click "Stop Talking"
7. Wait for Coach Alan's response!

## Troubleshooting

- **Database connection errors**: Make sure PostgreSQL is running and DATABASE_URL is correct
- **AI service not responding**: Check that OPENAI_API_KEY is set and the service is running on port 8000
- **Microphone not working**: Grant browser permissions and check your mic is connected

