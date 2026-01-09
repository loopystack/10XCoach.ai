# Quick Start Guide

Get up and running in 5 minutes!

## 1. Install Dependencies

```bash
npm install
cd ai-service
pip install -r requirements.txt
cd ..
```

## 2. Set Environment Variables

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mycoach"
OPENAI_API_KEY="your-key-here"
AI_SERVICE_URL="http://localhost:8000"
```

## 3. Initialize Database

```bash
npx prisma migrate dev --name init
```

## 4. Start Services

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run ai-service
```

## 5. Open Browser

Go to http://localhost:3000 and start talking!

---

**Note:** Make sure PostgreSQL is running and you have a valid OpenAI API key.

