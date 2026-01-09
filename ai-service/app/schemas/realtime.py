"""
Pydantic schemas for real-time communication endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class TransportTypeEnum(str, Enum):
    """Available transport types"""
    HTTP = "http"
    WEBSOCKET = "websocket"
    WEBRTC = "webrtc"


class MessageTypeEnum(str, Enum):
    """Types of messages"""
    TEXT = "text"
    AUDIO_CHUNK = "audio_chunk"
    TRANSCRIPT_FINAL = "transcript_final"
    AI_RESPONSE = "ai_response"
    ERROR = "error"


# ============================================================
# Session Management
# ============================================================

class CreateSessionRequest(BaseModel):
    """Request to create a new conversation session"""
    user_id: int = Field(..., description="User ID")
    coach_id: int = Field(..., description="Coach ID to converse with")
    transport: TransportTypeEnum = Field(
        default=TransportTypeEnum.HTTP,
        description="Transport type (HTTP for now)"
    )


class CreateSessionResponse(BaseModel):
    """Response with session details"""
    session_id: str = Field(..., description="Unique session identifier")
    user_id: int
    coach_id: int
    transport: str
    created_at: str
    endpoints: Dict[str, str] = Field(
        default_factory=dict,
        description="Available endpoints for this session"
    )


class SessionStatusResponse(BaseModel):
    """Current session status"""
    session_id: str
    is_active: bool
    user_id: int
    coach_id: int
    turn_count: int
    created_at: str
    last_activity: str
    total_audio_seconds: float = 0.0


class EndSessionRequest(BaseModel):
    """Request to end a session"""
    generate_notes: bool = Field(
        default=True,
        description="Whether to generate coaching notes from the session"
    )


class EndSessionResponse(BaseModel):
    """Response after ending session"""
    session_id: str
    duration_seconds: float
    turn_count: int
    notes_generated: bool
    notes_id: Optional[str] = None


# ============================================================
# Turn-Based Communication (HTTP)
# ============================================================

class TurnRequest(BaseModel):
    """
    Send a turn in the conversation (HTTP mode)
    
    For Week 1, this is text-based.
    Audio support will be added later.
    """
    text: str = Field(..., description="User's text input")
    # Future: audio_base64: Optional[str] = Field(None, description="Base64 encoded audio")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional context for this turn"
    )


class TurnResponse(BaseModel):
    """
    Response to a conversation turn
    """
    session_id: str
    message_id: str
    reply_text: str = Field(..., description="Coach's text response")
    # Future: reply_audio_url: Optional[str] = Field(None, description="URL to audio response")
    
    # Metadata
    turn_number: int
    actions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Action items identified in this turn"
    )
    summary: Optional[str] = Field(
        None,
        description="Brief summary of the turn"
    )
    
    # Processing info
    processing_time_ms: int
    tokens_used: Optional[int] = None


# ============================================================
# Future: Streaming Types (for WebSocket)
# ============================================================

class StreamingChunk(BaseModel):
    """
    A chunk of streaming response (for future WebSocket use)
    """
    session_id: str
    sequence: int
    content: str
    is_final: bool = False
    chunk_type: str = "text"  # text, audio, metadata


class AudioChunk(BaseModel):
    """
    Audio data chunk (for future streaming)
    """
    session_id: str
    sequence: int
    audio_base64: str
    format: str = "opus"  # opus, pcm, mp3
    sample_rate: int = 16000
    is_final: bool = False


class TranscriptUpdate(BaseModel):
    """
    Real-time transcription update (for future)
    """
    session_id: str
    text: str
    is_final: bool
    confidence: float = 1.0


# ============================================================
# Connection Stats
# ============================================================

class ConnectionStats(BaseModel):
    """Statistics about active connections"""
    total_sessions: int
    active_sessions: int
    by_transport: Dict[str, int]


# ============================================================
# Error Response
# ============================================================

class RealtimeError(BaseModel):
    """Error response for real-time endpoints"""
    error_code: str
    message: str
    session_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

