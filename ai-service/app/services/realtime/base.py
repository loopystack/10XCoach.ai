"""
Base Transport Abstraction

Defines the interface that all transport implementations must follow.
This allows easy swapping between HTTP, WebSocket, and WebRTC.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, Dict, Any, List, Callable, AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime
import uuid


class TransportType(Enum):
    """Available transport types"""
    HTTP = "http"           # Turn-based request/response
    WEBSOCKET = "websocket" # Bidirectional streaming
    WEBRTC = "webrtc"       # Low-latency audio/video


class MessageType(Enum):
    """Types of messages in the real-time layer"""
    # Voice/Audio
    AUDIO_CHUNK = "audio_chunk"       # Raw audio data
    AUDIO_START = "audio_start"       # Start of audio stream
    AUDIO_END = "audio_end"           # End of audio stream
    
    # Text
    TEXT = "text"                     # Plain text message
    TEXT_CHUNK = "text_chunk"         # Streaming text chunk
    
    # Transcription
    TRANSCRIPT_PARTIAL = "transcript_partial"  # Partial transcription
    TRANSCRIPT_FINAL = "transcript_final"      # Final transcription
    
    # AI Response
    AI_RESPONSE_START = "ai_response_start"
    AI_RESPONSE_CHUNK = "ai_response_chunk"
    AI_RESPONSE_END = "ai_response_end"
    
    # Control
    PING = "ping"
    PONG = "pong"
    ERROR = "error"
    SESSION_START = "session_start"
    SESSION_END = "session_end"


@dataclass
class TransportMessage:
    """
    Unified message format for all transport types
    
    This structure is designed to work with:
    - HTTP: Serialized as JSON request/response
    - WebSocket: Serialized as JSON frames
    - WebRTC: Data channel messages
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: MessageType = MessageType.TEXT
    content: Any = None
    
    # Context
    session_id: Optional[str] = None
    user_id: Optional[int] = None
    coach_id: Optional[int] = None
    
    # Metadata
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    sequence: int = 0  # For ordering chunks
    is_final: bool = True  # False for streaming chunks
    
    # Audio-specific
    audio_format: Optional[str] = None  # "pcm", "opus", "mp3"
    sample_rate: Optional[int] = None   # e.g., 16000, 44100
    
    # Error info
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for JSON transport"""
        return {
            "id": self.id,
            "type": self.type.value,
            "content": self.content,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "coach_id": self.coach_id,
            "timestamp": self.timestamp,
            "sequence": self.sequence,
            "is_final": self.is_final,
            "audio_format": self.audio_format,
            "sample_rate": self.sample_rate,
            "error_code": self.error_code,
            "error_message": self.error_message
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TransportMessage":
        """Deserialize from dictionary"""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            type=MessageType(data.get("type", "text")),
            content=data.get("content"),
            session_id=data.get("session_id"),
            user_id=data.get("user_id"),
            coach_id=data.get("coach_id"),
            timestamp=data.get("timestamp", datetime.utcnow().isoformat()),
            sequence=data.get("sequence", 0),
            is_final=data.get("is_final", True),
            audio_format=data.get("audio_format"),
            sample_rate=data.get("sample_rate"),
            error_code=data.get("error_code"),
            error_message=data.get("error_message")
        )
    
    @classmethod
    def text(cls, content: str, **kwargs) -> "TransportMessage":
        """Create a text message"""
        return cls(type=MessageType.TEXT, content=content, **kwargs)
    
    @classmethod
    def audio(cls, content: bytes, format: str = "pcm", **kwargs) -> "TransportMessage":
        """Create an audio message"""
        return cls(
            type=MessageType.AUDIO_CHUNK,
            content=content,
            audio_format=format,
            **kwargs
        )
    
    @classmethod
    def error(cls, code: str, message: str, **kwargs) -> "TransportMessage":
        """Create an error message"""
        return cls(
            type=MessageType.ERROR,
            error_code=code,
            error_message=message,
            **kwargs
        )


@dataclass
class TransportSession:
    """
    Represents a real-time session
    
    Tracks the state of a conversation session regardless of transport type.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: int = 0
    coach_id: int = 0
    
    # State
    is_active: bool = True
    is_speaking: bool = False  # User currently speaking
    is_processing: bool = False  # AI currently processing
    
    # Timestamps
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_activity: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Accumulated data
    transcript: List[Dict[str, str]] = field(default_factory=list)
    pending_audio: List[bytes] = field(default_factory=list)
    
    # Metrics
    turn_count: int = 0
    total_audio_seconds: float = 0.0
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow().isoformat()
    
    def add_turn(self, role: str, content: str):
        """Add a conversation turn"""
        self.transcript.append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })
        self.turn_count += 1
        self.update_activity()


class BaseTransport(ABC):
    """
    Abstract base class for transport implementations
    
    All transport types (HTTP, WebSocket, WebRTC) must implement this interface.
    """
    
    transport_type: TransportType
    
    @abstractmethod
    async def connect(self, session: TransportSession) -> bool:
        """
        Establish connection for a session
        
        For HTTP: Just initialize session state
        For WebSocket: Accept the WebSocket connection
        For WebRTC: Establish peer connection
        """
        pass
    
    @abstractmethod
    async def disconnect(self, session_id: str):
        """
        Close connection for a session
        """
        pass
    
    @abstractmethod
    async def send(self, session_id: str, message: TransportMessage) -> bool:
        """
        Send a message to the client
        
        Returns True if message was sent successfully
        """
        pass
    
    @abstractmethod
    async def receive(self, session_id: str) -> Optional[TransportMessage]:
        """
        Receive a message from the client
        
        For HTTP: This is handled by the request body
        For WebSocket/WebRTC: This waits for incoming messages
        """
        pass
    
    async def stream_response(
        self,
        session_id: str,
        content_generator: AsyncIterator[str]
    ) -> None:
        """
        Stream response chunks to client
        
        Default implementation sends individual chunks.
        WebSocket can override for true streaming.
        """
        sequence = 0
        async for chunk in content_generator:
            message = TransportMessage(
                type=MessageType.AI_RESPONSE_CHUNK,
                content=chunk,
                session_id=session_id,
                sequence=sequence,
                is_final=False
            )
            await self.send(session_id, message)
            sequence += 1
        
        # Send end marker
        await self.send(session_id, TransportMessage(
            type=MessageType.AI_RESPONSE_END,
            session_id=session_id,
            sequence=sequence,
            is_final=True
        ))
    
    @abstractmethod
    def is_connected(self, session_id: str) -> bool:
        """Check if session is connected"""
        pass
    
    async def on_message(
        self,
        session_id: str,
        handler: Callable[[TransportMessage], None]
    ):
        """
        Register a message handler for incoming messages
        
        Primarily used by WebSocket/WebRTC for event-driven handling.
        HTTP doesn't use this pattern.
        """
        pass

