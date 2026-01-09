# 10XCoach.ai - AI Orchestration Service

Python FastAPI service for AI coach interactions with vector memory.

## Features

- 🤖 **Multi-Provider LLM Support**: OpenAI, Groq, Anthropic (easily swappable)
- 🧠 **Vector Memory**: pgvector for semantic search and context retrieval
- 🔴 **Redis Caching**: Session context and rate limiting
- 🎭 **Coach Personas**: Specialized AI coaches for different business domains
- 📝 **Session Notes**: Automatic generation of coaching notes and action items

## API Endpoints

### AI Coach

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/coach/respond` | Get AI coach response to user message |
| POST | `/ai/coach/notes` | Generate coaching notes from transcript |
| GET | `/ai/coach/memory/{user_id}/{coach_id}` | Get conversation memories |
| DELETE | `/ai/coach/memory/{user_id}/{coach_id}` | Clear conversation memories |

### Real-time (Turn-based HTTP for Week 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/realtime/sessions` | Create new conversation session |
| GET | `/realtime/sessions/{id}` | Get session status |
| POST | `/realtime/sessions/{id}/turn` | Send a turn, get AI response |
| POST | `/realtime/sessions/{id}/end` | End session, optionally generate notes |
| GET | `/realtime/stats` | Get connection statistics |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/db` | Database connection check |
| GET | `/health/redis` | Redis connection check |
| GET | `/health/llm` | LLM provider check |
| GET | `/health/all` | Full health check (all services) |

## Quick Start

### 1. Install Dependencies

```bash
cd ai-service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```env
# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/10xcoach

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=           # Optional, leave empty if no password

# Cache TTL (seconds)
SESSION_CONTEXT_TTL=3600  # 1 hour
USER_SESSION_TTL=86400    # 24 hours
RATE_LIMIT_TTL=60         # 1 minute

# Rate Limiting
RATE_LIMIT_REQUESTS=60    # requests per minute
RATE_LIMIT_ENABLED=true

# LLM Provider (openai, groq, anthropic)
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# OR Groq (faster, cheaper)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-70b-versatile

# OR Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Server
PORT=8000
DEBUG=true
```

### 3. Setup Database

Make sure PostgreSQL has pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run migrations:

```bash
alembic upgrade head
```

Or let the app create tables on startup.

### 4. Run the Service

```bash
# Development
python run.py

# Or with uvicorn directly
uvicorn app.main:app --reload --port 8000
```

### 5. Test the API

```bash
# Health check
curl http://localhost:8000/health

# Coach respond
curl -X POST http://localhost:8000/ai/coach/respond \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "coach_id": 1,
    "text": "How can I improve my sales process?"
  }'

# Generate notes
curl -X POST http://localhost:8000/ai/coach/notes \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "coach_id": 1,
    "transcript": "User: How can I improve sales?\nCoach: Let me help you analyze your current process..."
  }'
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Settings management
│   ├── database.py          # DB connection + pgvector
│   ├── models/
│   │   ├── coach_memory.py  # Vector storage model
│   │   └── conversation.py  # Chat history model
│   ├── routers/
│   │   ├── coach.py         # AI coach endpoints
│   │   └── health.py        # Health checks
│   ├── schemas/
│   │   └── coach.py         # Pydantic schemas
│   └── services/
│       ├── llm_client.py    # LLM abstraction layer
│       ├── embedding_service.py  # Text embeddings
│       ├── memory_service.py     # Vector memory ops
│       └── cache_service.py      # Redis caching
├── alembic/                 # Database migrations
├── requirements.txt
├── run.py
└── README.md
```

## LLM Client Usage

```python
from app.services.llm_client import get_llm_client

client = get_llm_client()

# Simple generation
response = await client.generate(
    prompt="How do I scale my business?",
    system_prompt="You are a business coach."
)
print(response.content)

# With history
response = await client.generate(
    prompt="Tell me more about that",
    system_prompt="You are a business coach.",
    history=[
        {"role": "user", "content": "How do I scale?"},
        {"role": "assistant", "content": "There are several strategies..."}
    ]
)

# JSON response
data = await client.generate_json(
    prompt="List 3 action items for improving sales",
    system_prompt="Return valid JSON with an 'actions' array."
)
```

## Redis Cache Usage

```python
from app.services.cache_service import get_cache_service

cache = await get_cache_service()

# Session Context - Store conversation state
await cache.append_message(
    session_id=123,
    user_id=1,
    coach_id=2,
    role="user",
    content="How do I scale my business?"
)

# Get recent messages for LLM context
history = await cache.get_recent_messages(session_id=123, limit=10)
# Returns: [{"role": "user", "content": "..."}, ...]

# User-Coach Context (without formal session)
await cache.append_to_user_coach_context(
    user_id=1,
    coach_id=2,
    role="assistant",
    content="There are several strategies..."
)

# Rate Limiting
is_allowed, remaining = await cache.check_rate_limit(
    user_id=1,
    endpoint="/ai/coach/respond"
)
if not is_allowed:
    raise RateLimitExceeded()

# Get user's last session
session_id = await cache.get_user_last_session(user_id=1)
```

### Redis Key Patterns

| Key Pattern | Description | TTL |
|-------------|-------------|-----|
| `session:{session_id}:context` | Full conversation context for a session | 1 hour |
| `user:{user_id}:last_session` | Reference to user's most recent session | 24 hours |
| `user:{user_id}:coach:{coach_id}:context` | User-coach conversation context | 1 hour |
| `ratelimit:{user_id}:{endpoint}` | Rate limiting counters | 1 minute |

## Memory Service Usage

```python
from app.services.memory_service import MemoryService

memory = MemoryService(db_session)

# Store embedding
await memory.store_embedding(
    text="User wants to improve their sales funnel",
    user_id=1,
    coach_id=2,
    memory_type="insight"
)

# Search similar
results = await memory.search_similar(
    user_id=1,
    coach_id=2,
    query="sales optimization strategies",
    limit=5
)

for r in results:
    print(f"{r.similarity:.2f}: {r.text}")
```

## Real-time Communication

### Week 1: HTTP Turn-Based

```python
# Create a session
POST /realtime/sessions
{
    "user_id": 1,
    "coach_id": 2,
    "transport": "http"
}
# Returns: { "session_id": "abc123", "endpoints": {...} }

# Send turns back and forth
POST /realtime/sessions/{session_id}/turn
{
    "text": "How can I improve my sales process?"
}
# Returns: { "reply_text": "...", "turn_number": 1, "actions": [...] }

# End session
POST /realtime/sessions/{session_id}/end
{
    "generate_notes": true
}
```

### Future: WebSocket Streaming

The real-time layer is designed for easy upgrade to WebSocket/WebRTC:

```
ai-service/app/services/realtime/
├── base.py              # Abstract transport interface
├── http_transport.py    # Current implementation
├── websocket_transport.py  # Future (placeholder)
└── manager.py           # Connection management
```

When upgrading:
1. Implement `WebSocketTransport` following the `BaseTransport` interface
2. Add WebSocket endpoint in router
3. Client switches from HTTP polling to WebSocket connection
4. Same message format (`TransportMessage`) works for both

## Switching LLM Providers

Simply change the `LLM_PROVIDER` env variable:

```env
# Use OpenAI (default)
LLM_PROVIDER=openai

# Use Groq (faster, good for high volume)
LLM_PROVIDER=groq

# Use Anthropic Claude
LLM_PROVIDER=anthropic
```

All providers implement the same interface, so no code changes needed!

