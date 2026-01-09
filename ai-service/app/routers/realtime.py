"""
Real-time Communication Router

HTTP endpoints for turn-based conversation (Week 1)
Structure ready for WebSocket/WebRTC upgrade later.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import time
import uuid

from app.database import get_db
from app.services.llm_client import get_llm_client
from app.services.cache_service import get_cache_service
from app.services.realtime import (
    get_connection_manager,
    get_transport,
    TransportType,
    TransportMessage,
    MessageType
)
from app.schemas.realtime import (
    CreateSessionRequest,
    CreateSessionResponse,
    SessionStatusResponse,
    EndSessionRequest,
    EndSessionResponse,
    TurnRequest,
    TurnResponse,
    ConnectionStats
)
from app.routers.coach import get_coach_persona, extract_response_metadata

router = APIRouter()


# ============================================================
# Session Management
# ============================================================

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest):
    """
    Create a new conversation session
    
    This initializes a session for the user-coach pair.
    Returns session ID and available endpoints.
    """
    manager = get_connection_manager()
    
    session = await manager.create_session(
        user_id=request.user_id,
        coach_id=request.coach_id,
        transport_type=TransportType(request.transport.value)
    )
    
    # Store session in Redis for persistence
    try:
        cache = await get_cache_service()
        await cache.set_user_last_session(request.user_id, int(session.id[:8], 16) % 1000000)
    except Exception:
        pass  # Continue without caching
    
    return CreateSessionResponse(
        session_id=session.id,
        user_id=session.user_id,
        coach_id=session.coach_id,
        transport=request.transport.value,
        created_at=session.created_at,
        endpoints={
            "turn": f"/realtime/sessions/{session.id}/turn",
            "status": f"/realtime/sessions/{session.id}",
            "end": f"/realtime/sessions/{session.id}/end",
            # Future endpoints
            "websocket": f"/ws/sessions/{session.id}",  # Not implemented yet
        }
    )


@router.get("/sessions/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """
    Get current session status
    """
    manager = get_connection_manager()
    session = await manager.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionStatusResponse(
        session_id=session.id,
        is_active=session.is_active,
        user_id=session.user_id,
        coach_id=session.coach_id,
        turn_count=session.turn_count,
        created_at=session.created_at,
        last_activity=session.last_activity,
        total_audio_seconds=session.total_audio_seconds
    )


@router.post("/sessions/{session_id}/end", response_model=EndSessionResponse)
async def end_session(
    session_id: str,
    request: EndSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    End a conversation session
    
    Optionally generates coaching notes from the transcript.
    """
    manager = get_connection_manager()
    session = await manager.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate duration
    start = datetime.fromisoformat(session.created_at)
    end = datetime.utcnow()
    duration = (end - start).total_seconds()
    
    notes_id = None
    
    # Generate notes if requested
    if request.generate_notes and session.transcript:
        # TODO: Call the notes generation endpoint
        # For now, just mark that we would generate notes
        notes_id = str(uuid.uuid4())
    
    # End the session
    await manager.end_session(session_id)
    
    return EndSessionResponse(
        session_id=session_id,
        duration_seconds=duration,
        turn_count=session.turn_count,
        notes_generated=notes_id is not None,
        notes_id=notes_id
    )


# ============================================================
# Turn-Based Communication (HTTP)
# ============================================================

@router.post("/sessions/{session_id}/turn", response_model=TurnResponse)
async def send_turn(
    session_id: str,
    request: TurnRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a conversation turn and get AI response
    
    This is the main endpoint for Week 1 turn-based conversation:
    1. User sends text
    2. AI processes and responds
    3. Response returned immediately
    
    Future: Will support audio input/output and streaming.
    """
    start_time = time.time()
    
    manager = get_connection_manager()
    session = await manager.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session has ended")
    
    # Mark session as processing
    session.is_processing = True
    session.update_activity()
    
    # Get coach persona
    persona = get_coach_persona(session.coach_id)
    
    # Get conversation history from cache
    try:
        cache = await get_cache_service()
        history = await cache.get_user_coach_context(
            user_id=session.user_id,
            coach_id=session.coach_id
        ) or []
    except Exception:
        history = [{"role": t["role"], "content": t["content"]} for t in session.transcript]
    
    # Build system prompt
    system_prompt = f"""{persona['system_prompt']}

You are having a live coaching conversation. Keep responses conversational but insightful.
If you identify action items, mention them naturally in your response.
"""
    
    # Generate AI response
    llm_client = get_llm_client()
    
    try:
        response = await llm_client.generate(
            prompt=request.text,
            system_prompt=system_prompt,
            history=history[-10:]  # Last 10 turns for context
        )
    except Exception as e:
        session.is_processing = False
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")
    
    # Add turns to session transcript
    session.add_turn("user", request.text)
    session.add_turn("assistant", response.content)
    session.is_processing = False
    
    # Update cache
    try:
        cache = await get_cache_service()
        await cache.append_to_user_coach_context(
            user_id=session.user_id,
            coach_id=session.coach_id,
            role="user",
            content=request.text
        )
        await cache.append_to_user_coach_context(
            user_id=session.user_id,
            coach_id=session.coach_id,
            role="assistant",
            content=response.content
        )
    except Exception:
        pass  # Continue without caching
    
    # Extract metadata
    meta = await extract_response_metadata(llm_client, request.text, response.content)
    
    processing_time = int((time.time() - start_time) * 1000)
    
    return TurnResponse(
        session_id=session_id,
        message_id=str(uuid.uuid4()),
        reply_text=response.content,
        turn_number=session.turn_count,
        actions=[a.dict() for a in meta.actions] if meta.actions else [],
        summary=meta.summary,
        processing_time_ms=processing_time,
        tokens_used=response.usage.get("total_tokens") if response.usage else None
    )


# ============================================================
# Stats & Management
# ============================================================

@router.get("/stats", response_model=ConnectionStats)
async def get_connection_stats():
    """
    Get real-time connection statistics
    """
    manager = get_connection_manager()
    stats = manager.get_stats()
    
    return ConnectionStats(**stats)


@router.post("/cleanup")
async def cleanup_stale_sessions(max_idle_minutes: int = 60):
    """
    Clean up stale sessions (admin endpoint)
    """
    manager = get_connection_manager()
    cleaned = await manager.cleanup_stale_sessions(max_idle_minutes)
    
    return {
        "cleaned_sessions": cleaned,
        "max_idle_minutes": max_idle_minutes
    }


# ============================================================
# Future: WebSocket Endpoint (Placeholder)
# ============================================================

# @router.websocket("/ws/sessions/{session_id}")
# async def websocket_session(websocket: WebSocket, session_id: str):
#     """
#     WebSocket endpoint for streaming conversation
#     
#     NOT IMPLEMENTED YET - Placeholder for future sprint
#     
#     Flow:
#     1. Client connects via WebSocket
#     2. Client sends audio chunks or text
#     3. Server streams transcription + AI response
#     4. Bidirectional real-time communication
#     """
#     await websocket.close(code=4001, reason="WebSocket not implemented yet. Use HTTP /turn endpoint.")

