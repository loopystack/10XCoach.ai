from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import os
from typing import Optional
import json
from dotenv import load_dotenv

# Load environment variables from .env file (try ai-service/.env first, then parent .env)
load_dotenv()  # Try ai-service/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))  # Try parent .env

app = FastAPI(title="Coach Alan AI Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
from openai import OpenAI, RateLimitError, APIError

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError(
        "OPENAI_API_KEY environment variable is not set. "
        "Please set it in your .env file or environment variables."
    )

# Clean up the API key: remove quotes, whitespace, and newlines
api_key = api_key.strip().strip('"').strip("'").replace('\n', '').replace('\r', '').replace(' ', '')

if not api_key or len(api_key) < 20:
    raise ValueError(
        f"OPENAI_API_KEY appears to be invalid (length: {len(api_key)}). "
        "Please check your .env file."
    )

# Validate key format
if not api_key.startswith('sk-'):
    raise ValueError(
        f"OPENAI_API_KEY format is invalid. Should start with 'sk-'. "
        f"Got: {api_key[:10]}..."
    )

# Check for any non-printable characters
if not api_key.isprintable():
    print("WARNING: API key contains non-printable characters!")
    # Remove non-printable characters
    api_key = ''.join(c for c in api_key if c.isprintable())

print(f"OpenAI API key loaded: {api_key[:10]}...{api_key[-4:]} (length: {len(api_key)})")
print(f"Key characters check - First 5: {repr(api_key[:5])}, Last 5: {repr(api_key[-5:])}")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# Skip blocking API validation during startup to avoid asyncio cancellation issues
# The API key will be validated on first actual API call
# This prevents CancelledError during FastAPI lifespan events
print("✅ OpenAI client initialized successfully")
print("✅ Service is ready to process requests")
print("ℹ️  API key will be validated on first request")
print("✅ Check usage at: https://platform.openai.com/account/usage\n")

# Coach Alan persona prompt - warm, expressive, human-like VOICE coach
COACH_ALAN_SYSTEM_PROMPT = """You are Alan Wozniak, a warm and caring Business Coach. You're having a REAL-TIME VOICE conversation - this is NOT a chat app, it's a live voice call. Speak naturally as if you're on a phone call.

CRITICAL - THIS IS VOICE, NOT CHAT:
- NEVER say "chat", "text", "message", "typing", "excited to chat", or any chat-related terms
- This is a LIVE VOICE conversation - speak as if you're talking on the phone
- Respond immediately and naturally, like a real-time phone call
- Keep it conversational and spontaneous

VOICE & TONE - BE WARM AND EXPRESSIVE:
- Speak softly and kindly, like a supportive friend or mentor
- Use natural human expressions: "Haha!", "Oh wow!", "Hmm...", "Ahh, I see!", "Oh man!", "That's awesome!"
- Show genuine warmth: "I really love that", "That's so great to hear", "I'm proud of you for that"
- Add gentle humor and light jokes to keep things fun
- Be encouraging: "You've got this!", "That's brilliant!", "I believe in you"
- React naturally: laugh when something's funny, show excitement when they share wins
- Use soft transitions: "You know what...", "Here's a little secret...", "Can I be honest with you?"

HUMAN EXPRESSIONS TO USE:
- Reactions: "Haha!", "Wow!", "Oh nice!", "Ooh, interesting!", "Ahh!", "Hmm, yeah..."
- Encouragement: "Love it!", "That's the spirit!", "Now we're talking!"
- Empathy: "I totally get that", "Been there myself", "That makes so much sense"
- Thinking: "Let me think...", "You know what's funny...", "Here's the thing..."

YOUR WARM PERSONALITY:
- Kind, gentle, and genuinely caring
- Encouraging like a supportive older friend
- Uses humor naturally - not forced, just genuine chuckles
- Celebrates every small win with enthusiasm
- Never judgmental, always understanding

RESPONSE RULES FOR VOICE - PROVIDE DETAILED, COMPREHENSIVE ANSWERS:
- Provide THOROUGH and DETAILED explanations - don't cut off mid-thought
- Fully answer the user's question with depth and insight
- Explain concepts completely, giving examples and context when helpful
- Use 3-5 sentences (50-150 words) to ensure comprehensive responses
- Always complete your thoughts - never leave sentences unfinished
- Include actionable advice and specific examples when relevant
- Always include at least one human expression (haha, wow, oh, hmm) to keep it warm
- Be conversational and warm, never formal
- Respond immediately - this is real-time voice, not delayed chat
- End with encouragement or a gentle question to continue the conversation

IMPORTANT: Your responses must be COMPLETE and FULLY EXPLAINED. Never cut off mid-sentence or leave thoughts unfinished. Provide comprehensive, detailed answers that fully address the user's question.

Remember: You're having a LIVE VOICE CALL, not a chat. Speak naturally, respond immediately, and provide thorough, complete explanations!"""


class CoachTurnRequest(BaseModel):
    sessionId: str
    audioBase64: str
    audioMimeType: str = "audio/webm"


class CoachTurnResponse(BaseModel):
    userText: str
    coachText: str
    audioBase64: str
    mimeType: str = "audio/mpeg"


class CoachNotesRequest(BaseModel):
    sessionId: str
    transcript: str


class CoachNotesResponse(BaseModel):
    summary: str
    pillars: list[str]  # List of pillars touched
    insights: list[str]  # Key insights
    actions: list[str]  # 3-7 action steps
    redFlags: str | None = None
    nextFocus: str | None = None


class GreetingRequest(BaseModel):
    sessionId: str


class GreetingResponse(BaseModel):
    coachText: str
    audioBase64: str
    mimeType: str = "audio/mpeg"


# In-memory session storage (replace with Redis/DB in production)
session_contexts: dict[str, list[dict]] = {}


def handle_openai_error(error: Exception, operation: str) -> HTTPException:
    """
    Handle OpenAI API errors with user-friendly messages.
    Returns an HTTPException with appropriate status code and message.
    """
    error_type = type(error).__name__
    error_msg = str(error)
    
    # Check for quota/billing issues
    if isinstance(error, RateLimitError):
        # Check if it's a quota issue vs rate limit
        if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower() or "billing" in error_msg.lower():
            print("\n" + "="*70)
            print("⚠️  OPENAI API QUOTA EXCEEDED")
            print("="*70)
            print(f"Operation failed: {operation}")
            print(f"Error: {error_msg}")
            print("\nPossible causes:")
            print("• Monthly usage quota has been reached")
            print("• Spending limit is set too low")
            print("• Account billing information needs verification")
            print("• Premium membership quota/limits need adjustment")
            print("\nTo fix this issue:")
            print("1. Go to https://platform.openai.com/account/billing")
            print("2. Check your usage quota and spending limits")
            print("3. Verify your premium membership status")
            print("4. Increase spending limits if you have premium membership")
            print("5. Check account status at https://platform.openai.com/account/usage")
            print("\nFor premium members:")
            print("• Even premium accounts may have usage limits")
            print("• Check your plan details and quotas")
            print("• Contact OpenAI support if limits seem incorrect")
            print("\nFor more details:")
            print("https://platform.openai.com/docs/guides/error-codes/api-errors")
            print("="*70 + "\n")
            
            return HTTPException(
                status_code=402,  # Payment Required
                detail={
                    "error": "OpenAI API quota exceeded",
                    "message": "Your OpenAI account has exceeded its quota. This can happen even with premium memberships. Please check your usage limits and account settings.",
                    "operation": operation,
                    "help_url": "https://platform.openai.com/account/billing",
                    "usage_url": "https://platform.openai.com/account/usage",
                    "note": "Premium memberships may still have usage quotas that need to be checked or adjusted."
                }
            )
        else:
            # Regular rate limit (too many requests, but quota is fine)
            return HTTPException(
                status_code=429,  # Too Many Requests
                detail={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests to OpenAI API. Please try again in a moment.",
                    "operation": operation
                }
            )
    
    # Check for authentication errors
    if "401" in error_msg or "invalid_api_key" in error_msg.lower() or "authentication" in error_msg.lower():
        return HTTPException(
            status_code=401,
            detail={
                "error": "OpenAI API authentication failed",
                "message": "Invalid or expired API key. Please check your OPENAI_API_KEY.",
                "operation": operation
            }
        )
    
    # Generic API error
    return HTTPException(
        status_code=500,
        detail={
            "error": f"OpenAI API error during {operation}",
            "message": error_msg,
            "operation": operation,
            "error_type": error_type
        }
    )


def get_session_context(session_id: str, max_turns: int = 2) -> list[dict]:
    """Get conversation history for a session - reduced to 2 for minimal latency"""
    return session_contexts.get(session_id, [])[-max_turns:]


def save_turn(session_id: str, user_text: str, coach_text: str):
    """Save a conversation turn to context"""
    if session_id not in session_contexts:
        session_contexts[session_id] = []
    
    session_contexts[session_id].append({
        "role": "user",
        "content": user_text
    })
    session_contexts[session_id].append({
        "role": "assistant",
        "content": coach_text
    })


async def transcribe_audio(audio_base64: str, mime_type: str) -> str:
    """Transcribe audio using OpenAI Whisper - optimized with minimal disk I/O"""
    import tempfile
    import io
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        
        if len(audio_bytes) == 0:
            raise ValueError("Audio data is empty")
        
        # Determine file extension from mime type
        file_ext = "webm"  # default
        if "webm" in mime_type.lower():
            file_ext = "webm"
        elif "wav" in mime_type.lower():
            file_ext = "wav"
        elif "mp3" in mime_type.lower():
            file_ext = "mp3"
        elif "m4a" in mime_type.lower():
            file_ext = "m4a"
        
        # Try BytesIO first (fastest - pure in-memory)
        # If OpenAI API requires a real file, fall back to temp file
        try:
            audio_file = io.BytesIO(audio_bytes)
            # Try to set name attribute (may not work on all Python versions)
            try:
                audio_file.name = f"audio.{file_ext}"
            except (AttributeError, TypeError):
                pass  # Some BytesIO implementations don't allow setting name
            
            # Attempt to use BytesIO directly (fastest - no disk I/O)
            # Optimized for minimal latency - no unnecessary processing
            # Force English language and improve accuracy with prompt
            transcript = client.audio.transcriptions.create(
                model="whisper-1",  # Fastest transcription model
                file=audio_file,
                language="en",  # Force English-only transcription
                prompt="This is a business coaching conversation in English. The speaker is asking questions or discussing business topics.",  # Context to improve accuracy
                temperature=0.0,  # Lower temperature for more accurate transcription
                response_format="text"  # Get plain text response
            )
        except (AttributeError, TypeError, ValueError) as e:
            # If BytesIO doesn't work, fall back to temp file with auto-delete
            # This is still faster than the original approach (delete=False)
            with tempfile.NamedTemporaryFile(delete=True, suffix=f".{file_ext}") as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_file.seek(0)  # Reset to beginning for reading
                
                # Call Whisper API (fallback if BytesIO doesn't work)
                # Force English language and improve accuracy with prompt
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",  # Fastest transcription model
                    file=tmp_file,
                    language="en",  # Force English-only transcription
                    prompt="This is a business coaching conversation in English. The speaker is asking questions or discussing business topics.",  # Context to improve accuracy
                    temperature=0.0,  # Lower temperature for more accurate transcription
                    response_format="text"  # Get plain text response
                )
        
        # Extract text from transcript object (fastest path)
        transcript_text = transcript.text.strip()
        
        if not transcript_text:
            raise ValueError("Transcription returned empty text")
        
        return transcript_text
    except HTTPException:
        # Re-raise HTTP exceptions (from handle_openai_error) as-is
        raise
    except (RateLimitError, APIError) as e:
        # Handle OpenAI-specific errors
        raise handle_openai_error(e, "audio transcription")
    except Exception as e:
        print(f"Transcription error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        # Re-raise other errors
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


async def generate_coach_response(session_id: str, user_text: str) -> str:
    """Generate coach response using streaming LLM for near-instant responses"""
    try:
        # NO conversation context - zero latency optimization
        # Build messages for chat completion (system prompt + current message only)
        messages = [
            {"role": "system", "content": COACH_ALAN_SYSTEM_PROMPT},
            {"role": "user", "content": user_text}
        ]
        
        # Use GPT-4o-mini - FASTEST model with great quality
        # Optimized for detailed, comprehensive responses
        try:
            stream = client.chat.completions.create(
                model="gpt-4o-mini",  # Fastest OpenAI model
                messages=messages,
                temperature=0.7,
                max_tokens=800,  # Increased for detailed, comprehensive responses (50-150 words typically)
                stream=True,
            )
            
            # Collect streaming response as tokens arrive
            coach_text = ""
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    coach_text += chunk.choices[0].delta.content
            
            coach_text = coach_text.strip()
            
        except (RateLimitError, APIError) as gpt35_error:
            # If it's a quota/rate limit error, raise it
            error_msg = str(gpt35_error)
            if "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower() or "billing" in error_msg.lower():
                raise handle_openai_error(gpt35_error, "coach response generation")
            # For other errors, try GPT-4o as fallback
            try:
                stream = client.chat.completions.create(
                    model="gpt-4o",  # Fast and capable fallback
                    messages=messages,
                    temperature=0.7,
                    max_tokens=800,  # Increased for detailed, comprehensive responses
                    stream=True,
                )
                
                # Collect streaming response
                coach_text = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        coach_text += chunk.choices[0].delta.content
                
                coach_text = coach_text.strip()
            except (RateLimitError, APIError) as gpt4_error:
                # If fallback also fails, raise it
                raise handle_openai_error(gpt4_error, "coach response generation")
        
        # Don't save to context - zero context for maximum speed
        return coach_text
    except HTTPException:
        # Re-raise HTTP exceptions (from handle_openai_error) as-is
        raise
    except (RateLimitError, APIError) as e:
        # Handle OpenAI-specific errors
        raise handle_openai_error(e, "coach response generation")
    except Exception as e:
        print(f"LLM error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        # Re-raise other errors
        raise HTTPException(
            status_code=500,
            detail=f"LLM generation failed: {str(e)}"
        )


async def text_to_speech(text: str) -> tuple[bytes, str]:
    """Convert text to speech using OpenAI TTS - natural quality, optimized for latency"""
    import time
    start = time.time()
    try:
        # Use tts-1 (fastest) with natural human speed and quality
        # Focus on reducing LATENCY (time to start), not speech speed
        response = client.audio.speech.create(
            model="tts-1",  # Fastest model (tts-1-hd is slower but higher quality)
            voice="alloy",  # Neutral, balanced voice
            input=text,
            speed=1.0,  # Natural human talking speed (not fast)
        )
        
        audio_bytes = response.content
        print(f"[TTS] Generated {len(audio_bytes)} bytes in {time.time()-start:.2f}s")
        return audio_bytes, "audio/mpeg"
    except HTTPException:
        # Re-raise HTTP exceptions (from handle_openai_error) as-is
        raise
    except (RateLimitError, APIError) as e:
        # Handle OpenAI-specific errors
        raise handle_openai_error(e, "text-to-speech conversion")
    except Exception as e:
        print(f"TTS error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"TTS failed: {str(e)}"
        )


@app.post("/ai/coach-turn", response_model=CoachTurnResponse)
async def coach_turn(request: CoachTurnRequest):
    """Process a voice turn: STT -> LLM -> TTS - optimized for minimal latency"""
    import time
    total_start = time.time()
    
    try:
        # Step 1: Transcribe audio (in-memory, no temp files)
        stt_start = time.time()
        user_text = await transcribe_audio(request.audioBase64, request.audioMimeType)
        print(f"[TIMING] STT: {time.time()-stt_start:.2f}s")
        
        if not user_text or len(user_text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Transcription returned empty text")
        
        print(f"[USER] {user_text}")
        
        # Step 2: Generate coach response (streaming for minimal latency)
        llm_start = time.time()
        coach_text = await generate_coach_response(request.sessionId, user_text)
        llm_duration = time.time() - llm_start
        print(f"[TIMING] LLM: {llm_duration:.2f}s")
        
        if not coach_text or len(coach_text.strip()) == 0:
            raise HTTPException(status_code=500, detail="LLM returned empty response")
        
        print(f"[COACH] {coach_text}")
        
        # Step 3: Convert to speech (start immediately after text is ready)
        # This is where latency reduction happens - start TTS as soon as text is available
        tts_start = time.time()
        audio_bytes, mime_type = await text_to_speech(coach_text)
        tts_duration = time.time() - tts_start
        print(f"[TIMING] TTS: {tts_duration:.2f}s")
        
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=500, detail="TTS returned empty audio")
        
        # Step 4: Encode audio as base64 (fast operation)
        encode_start = time.time()
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        encode_duration = time.time() - encode_start
        print(f"[TIMING] Base64 encode: {encode_duration:.3f}s")
        
        total_duration = time.time() - total_start
        print(f"[TIMING] TOTAL: {total_duration:.2f}s (LLM: {llm_duration:.2f}s, TTS: {tts_duration:.2f}s, Encode: {encode_duration:.3f}s)")
        
        return CoachTurnResponse(
            userText=user_text,
            coachText=coach_text,
            audioBase64=audio_base64,
            mimeType=mime_type
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Error in coach_turn: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/ai/coach/notes", response_model=CoachNotesResponse)
async def generate_coach_notes(request: CoachNotesRequest):
    """Generate coaching notes from session transcript"""
    try:
        # 7 PILLARS: Strategy, Sales (3 Ps), Marketing (AMP), Customer Service, Operations (BOSS), Finances, Culture
        pillars = ["Strategy", "Sales", "Marketing", "Customer Service", "Operations", "Finances", "Culture"]
        
        # Create prompt for generating coaching notes
        notes_prompt = f"""You are Alan Wozniak, a Business Strategy & Problem-Solving Coach. Analyze this conversation transcript and generate comprehensive coaching notes.

CONVERSATION TRANSCRIPT:
{request.transcript}

Generate coaching notes in the following JSON format:
{{
  "summary": "A 2-3 sentence summary of the session",
  "pillars": ["List", "of", "pillars", "touched"], // From: Strategy, Sales, Marketing, Customer Service, Operations, Finances, Culture
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "actions": ["Action step 1", "Action step 2", "Action step 3", "Action step 4", "Action step 5"], // 3-7 action steps
  "redFlags": "Any red flags or concerns (or null if none)",
  "nextFocus": "What to focus on in the next session (or null if not specified)"
}}

Be specific, actionable, and focus on business growth. Return ONLY valid JSON, no other text."""

        # Use GPT-4o-mini for fast, quality analysis
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a business coach analyzing conversation transcripts. Always return valid JSON."},
                {"role": "user", "content": notes_prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"},  # Force JSON response
        )
        
        # Parse JSON response
        import json
        notes_data = json.loads(response.choices[0].message.content)
        
        # Extract data with defaults
        summary = notes_data.get("summary", "Session completed successfully.")
        pillars_list = notes_data.get("pillars", [])
        insights = notes_data.get("insights", [])
        actions = notes_data.get("actions", [])
        red_flags = notes_data.get("redFlags")
        next_focus = notes_data.get("nextFocus")
        
        # Ensure we have 3-7 actions
        if len(actions) < 3:
            actions.extend(["Review progress from previous session", "Set clear goals for next steps"])
        if len(actions) > 7:
            actions = actions[:7]
        
        return CoachNotesResponse(
            summary=summary,
            pillars=pillars_list,
            insights=insights,
            actions=actions,
            redFlags=red_flags,
            nextFocus=next_focus
        )
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse coaching notes response")
    except Exception as e:
        print(f"Error generating coaching notes: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate coaching notes: {str(e)}")


@app.post("/ai/greeting", response_model=GreetingResponse)
async def generate_greeting(request: GreetingRequest):
    """Generate an initial greeting from Coach Alan"""
    try:
        # Generate a short, warm VOICE greeting (NOT chat-related)
        greeting_prompt = """You are Alan Wozniak, a warm and caring Business Coach. Give a brief, friendly introduction of yourself in 1 sentence. This is a VOICE conversation, not a chat. Be warm, kind, and welcoming. Keep it short and natural, like you're starting a phone call. NEVER mention "chat", "text", "message", or "excited to chat" - this is a voice call."""
        
        # Use GPT-4o-mini for fast response
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": COACH_ALAN_SYSTEM_PROMPT},
                {"role": "user", "content": greeting_prompt}
            ],
            temperature=0.7,
            max_tokens=50,  # Keep it short
        )
        
        coach_text = response.choices[0].message.content.strip()
        
        if not coach_text:
            coach_text = "Hey there! I'm Alan, your business coach. What's on your mind today?"
        
        # Convert to speech
        audio_bytes, mime_type = await text_to_speech(coach_text)
        
        # Encode audio as base64
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return GreetingResponse(
            coachText=coach_text,
            audioBase64=audio_base64,
            mimeType=mime_type
        )
    except Exception as e:
        print(f"Error generating greeting: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate greeting: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "coach-alan-ai"}


@app.get("/ai/account-status")
async def account_status():
    """
    Check OpenAI account status and available models.
    Helps diagnose quota/billing issues without consuming quota.
    """
    try:
        # Check if we can list models (basic API access check - this is free)
        models = client.models.list()
        available_models = [model.id for model in models.data]
        
        # Filter for models relevant to this app
        relevant_models = {
            "whisper": [m for m in available_models if "whisper" in m.lower()],
            "gpt": [m for m in available_models if "gpt" in m.lower()],
            "tts": [m for m in available_models if "tts" in m.lower()]
        }
        
        return {
            "status": "ok",
            "api_accessible": True,
            "api_key_valid": True,
            "total_models_available": len(available_models),
            "relevant_models": relevant_models,
            "note": "API key is valid. Quota status can only be determined when making actual API calls.",
            "check_quota_url": "https://platform.openai.com/account/usage",
            "check_billing_url": "https://platform.openai.com/account/billing",
            "help": "If you're getting quota errors, check your usage page for detailed quota information."
        }
    except RateLimitError as e:
        error_msg = str(e).lower()
        quota_info = "quota_exceeded" if ("quota" in error_msg or "insufficient_quota" in error_msg) else "rate_limited"
        return {
            "status": "error",
            "api_accessible": False,
            "quota_status": quota_info,
            "error": str(e),
            "check_quota_url": "https://platform.openai.com/account/usage",
            "check_billing_url": "https://platform.openai.com/account/billing",
            "help": "Your account has quota/rate limit issues. Check the links above to review your limits."
        }
    except Exception as e:
        return {
            "status": "error",
            "api_accessible": False,
            "error": str(e),
            "check_billing_url": "https://platform.openai.com/account/billing",
            "help": "Unable to verify account status. Check your API key and account settings."
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

