# AI Coach Conversation Flow - Full Pipeline

## Complete Step-by-Step Flow (User Speaks → AI Responds)

### **FRONTEND (Browser) - Voice Detection & Recording**

1. **Voice Activity Detection (VAD)**
   - Location: `mycoach/lib/voiceActivityDetection.ts`
   - Continuously monitors microphone input
   - Detects when user starts speaking (volume threshold: 0.08)
   - Detects when user stops speaking (silence duration: 500ms)
   - Filters noise using frequency analysis (human voice: 85-255 Hz)

2. **Audio Recording**
   - Location: `mycoach/components/VoiceControl.tsx` → `mycoach/lib/audioClient.ts`
   - Starts recording when speech detected
   - Records in WebM format (16kHz, mono)
   - Stops recording when silence detected
   - Validates audio size (minimum: 15000 bytes = ~0.3 seconds)

3. **Audio Validation**
   - Location: `mycoach/app/coach-alan/page.tsx` → `handleSpeechEnd()`
   - Checks if audio blob is empty
   - Checks minimum size (10000 bytes)
   - Checks maximum size (500000 bytes = ~10-15 seconds)
   - Skips if audio is too short/long

4. **State Management**
   - Location: `mycoach/app/coach-alan/page.tsx`
   - Sets `avatarState` to `'thinking'`
   - Sets `isProcessing` to `true`
   - Creates abort controller for cancellation

---

### **API ROUTE - Next.js Backend**

5. **FormData Parsing**
   - Location: `mycoach/app/api/voice-turn/route.ts`
   - Parses FormData from frontend
   - Extracts audio file and sessionId
   - Validates audio file exists and is not empty

6. **Audio Conversion**
   - Location: `mycoach/app/api/voice-turn/route.ts`
   - Converts File to ArrayBuffer
   - Converts ArrayBuffer to Buffer
   - Converts Buffer to base64 string
   - Validates buffer is not empty

7. **HTTP Request to AI Service**
   - Location: `mycoach/app/api/voice-turn/route.ts`
   - Sends POST request to `http://localhost:8001/ai/coach-turn`
   - Sends JSON body: `{ sessionId, audioBase64, audioMimeType }`
   - Waits for AI service response

---

### **AI SERVICE (Python FastAPI) - Processing Pipeline**

8. **Base64 Decode**
   - Location: `mycoach/ai-service/main.py` → `transcribe_audio()`
   - Decodes base64 audio string to bytes
   - Validates audio bytes are not empty

9. **Speech-to-Text (STT) - Whisper API**
   - Location: `mycoach/ai-service/main.py` → `transcribe_audio()`
   - Tries to use BytesIO (in-memory, no disk I/O)
   - Falls back to temp file if BytesIO fails
   - Calls OpenAI Whisper API (`whisper-1` model)
   - Language: English
   - Returns transcribed text
   - **TIMING: ~1-3 seconds**

10. **Text Validation**
    - Location: `mycoach/ai-service/main.py` → `coach_turn()`
    - Checks if transcription is empty
    - Filters out error messages (fallback responses)

11. **Get Conversation Context**
    - Location: `mycoach/ai-service/main.py` → `get_session_context()`
    - Retrieves last 3 conversation turns from in-memory cache
    - Builds context array for LLM

12. **LLM Response Generation**
    - Location: `mycoach/ai-service/main.py` → `generate_coach_response()`
    - Builds messages array: [system prompt, context, user message]
    - Calls OpenAI Chat API (`gpt-4o-mini` model)
    - Uses streaming (collects tokens as they arrive)
    - Temperature: 0.7
    - Max tokens: 60 (1-2 sentences)
    - Saves turn to in-memory context
    - **TIMING: ~0.5-2 seconds**

13. **Text-to-Speech (TTS)**
    - Location: `mycoach/ai-service/main.py` → `text_to_speech()`
    - Calls OpenAI TTS API (`tts-1` model)
    - Voice: "alloy"
    - Speed: 1.0 (natural human speed)
    - Returns audio bytes (MP3 format)
    - **TIMING: ~0.5-1.5 seconds**

14. **Base64 Encode**
    - Location: `mycoach/ai-service/main.py` → `coach_turn()`
    - Encodes audio bytes to base64 string
    - **TIMING: ~0.01 seconds**

15. **Return Response**
    - Location: `mycoach/ai-service/main.py` → `coach_turn()`
    - Returns JSON: `{ userText, coachText, audioBase64, mimeType }`

---

### **API ROUTE - Response Handling**

16. **Parse AI Service Response**
    - Location: `mycoach/app/api/voice-turn/route.ts`
    - Parses JSON response from AI service
    - Extracts: `userText`, `coachText`, `audioBase64`, `mimeType`

17. **Database Writes (Non-blocking, Fire-and-Forget)**
    - Location: `mycoach/app/api/voice-turn/route.ts`
    - Updates session transcript (upsert)
    - Creates user message record
    - Creates coach message record
    - Processes session for memory (every 10 messages)
    - **NOTE: These run in background, don't block response**

18. **Return Response to Frontend**
    - Location: `mycoach/app/api/voice-turn/route.ts`
    - Returns JSON: `{ userText, coachText, sessionId, turnId, audioBase64, audioMimeType }`
    - **NOTE: Returns immediately, doesn't wait for database writes**

---

### **FRONTEND - Audio Playback**

19. **Parse Response**
    - Location: `mycoach/app/coach-alan/page.tsx` → `handleSpeechEnd()`
    - Parses JSON response
    - Creates Turn objects for user and coach
    - Adds turns to conversation history

20. **Base64 to ArrayBuffer**
    - Location: `mycoach/app/coach-alan/page.tsx` → `base64ToArrayBuffer()`
    - Converts base64 string to ArrayBuffer
    - Prepares audio data for playback

21. **Audio Playback Setup**
    - Location: `mycoach/lib/audioClient.ts` → `playAudio()`
    - Creates Blob from ArrayBuffer
    - Creates Object URL from Blob
    - Creates HTML Audio element
    - Sets up event listeners (timeupdate, loadedmetadata, canplay, ended, error)
    - Sets `preload = 'auto'`

22. **Audio Loading & Playback**
    - Location: `mycoach/lib/audioClient.ts` → `playAudio()`
    - Waits for `canplay` event (enough data loaded)
    - Calls `audio.play()` when ready
    - Sets `avatarState` to `'speaking'`
    - Updates word highlighting during playback

23. **State Reset**
    - Location: `mycoach/app/coach-alan/page.tsx` → `handleSpeechEnd()`
    - When audio ends, sets `avatarState` back to `'listening'`
    - Sets `isProcessing` to `false`
    - Clears processing lock

---

## **TOTAL LATENCY BREAKDOWN**

### **Blocking Operations (Must Wait)**
- **STT (Whisper)**: ~1-3 seconds
- **LLM (GPT-4o-mini)**: ~0.5-2 seconds
- **TTS (tts-1)**: ~0.5-1.5 seconds
- **Network overhead**: ~0.1-0.5 seconds
- **Base64 encode/decode**: ~0.01 seconds
- **Total**: ~2.1-7 seconds

### **Non-Blocking Operations (Don't Affect Response Time)**
- Database writes (fire-and-forget)
- Memory processing (every 10 messages)
- Audio playback (happens after response)

---

## **OPTIMIZATION OPPORTUNITIES**

### **Can Be Removed/Reduced:**
1. ✅ **Audio validation checks** (already minimal)
2. ✅ **Base64 encoding/decoding** (required for HTTP)
3. ✅ **Database writes** (already non-blocking)
4. ⚠️ **Conversation context** (reduced to 3 turns, could go to 1-2)
5. ⚠️ **Max tokens** (currently 60, could reduce to 40-50)
6. ⚠️ **STT language parameter** (could remove if always English)
7. ⚠️ **TTS voice selection** (could hardcode if always same voice)
8. ⚠️ **Error message filtering** (adds small overhead)

### **Cannot Be Removed:**
- STT (required to understand user)
- LLM (required to generate response)
- TTS (required to speak response)
- Network requests (required for API calls)
- Base64 encoding (required for HTTP transport)

### **Potential Optimizations:**
1. **Reduce context turns**: 3 → 1-2 turns (faster LLM)
2. **Reduce max_tokens**: 60 → 40-50 (faster LLM, shorter responses)
3. **Remove STT language parameter**: If always English
4. **Stream TTS**: If OpenAI supports streaming TTS (currently not available)
5. **Parallel processing**: Start TTS while LLM is still generating (if possible)
6. **Pre-warm connections**: Keep HTTP connections alive
7. **Reduce audio validation**: Remove some checks if confident in VAD

---

## **CURRENT SETTINGS**

- **VAD volume threshold**: 0.08 (higher = less sensitive)
- **VAD silence duration**: 500ms
- **VAD min speech duration**: 500ms
- **Min audio size**: 15000 bytes
- **LLM model**: gpt-4o-mini
- **LLM max_tokens**: 60
- **LLM context turns**: 3
- **TTS model**: tts-1
- **TTS speed**: 1.0 (natural)
- **TTS voice**: alloy
- **STT model**: whisper-1
- **STT language**: en

