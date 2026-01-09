# Coach Alan AI Service

Python FastAPI service for handling AI orchestration (STT, LLM, TTS).

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

3. Run the service:
```bash
uvicorn main:app --reload --port 8000
```

Or use the npm script:
```bash
npm run ai-service
```

## Endpoints

- `POST /ai/coach-turn` - Process a voice turn (STT -> LLM -> TTS)
- `GET /health` - Health check

## Configuration

The service uses:
- **STT**: OpenAI Whisper
- **LLM**: OpenAI GPT-4
- **TTS**: OpenAI TTS (tts-1 model)

You can modify the voice in `main.py` (currently "alloy"). Options: alloy, echo, fable, onyx, nova, shimmer.

