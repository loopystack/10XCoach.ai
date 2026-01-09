"""
HTTP Transport Implementation

Simple turn-based request/response transport.
This is the default for Week 1 - voice → text → reply flow.

Flow:
1. Client sends POST with audio/text
2. Server processes and returns response
3. No persistent connection needed
"""

from typing import Optional, Dict, Any
from datetime import datetime

from app.services.realtime.base import (
    BaseTransport,
    TransportType,
    TransportMessage,
    TransportSession,
    MessageType
)


class HTTPTransport(BaseTransport):
    """
    HTTP-based transport for turn-based conversations
    
    This implementation:
    - Uses request/response pattern
    - Stores session state in Redis (via cache service)
    - Returns complete responses (no streaming in Week 1)
    
    Later, this can be swapped for WebSocket transport for streaming.
    """
    
    transport_type = TransportType.HTTP
    
    def __init__(self):
        # In-memory session tracking (for quick lookups)
        # Full state is in Redis
        self._sessions: Dict[str, TransportSession] = {}
        self._pending_responses: Dict[str, TransportMessage] = {}
    
    async def connect(self, session: TransportSession) -> bool:
        """
        Initialize HTTP session
        
        For HTTP, this just registers the session.
        No actual connection to maintain.
        """
        self._sessions[session.id] = session
        return True
    
    async def disconnect(self, session_id: str):
        """
        Clean up HTTP session
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
        if session_id in self._pending_responses:
            del self._pending_responses[session_id]
    
    async def send(self, session_id: str, message: TransportMessage) -> bool:
        """
        Queue a message for HTTP response
        
        Since HTTP is request/response, we store the message
        to be returned in the response body.
        """
        self._pending_responses[session_id] = message
        return True
    
    async def receive(self, session_id: str) -> Optional[TransportMessage]:
        """
        For HTTP, receiving happens in the request handler.
        This method isn't used in the typical HTTP flow.
        """
        return None
    
    def is_connected(self, session_id: str) -> bool:
        """Check if session exists"""
        return session_id in self._sessions
    
    def get_session(self, session_id: str) -> Optional[TransportSession]:
        """Get session by ID"""
        return self._sessions.get(session_id)
    
    def get_pending_response(self, session_id: str) -> Optional[TransportMessage]:
        """Get and clear pending response for session"""
        return self._pending_responses.pop(session_id, None)
    
    async def process_turn(
        self,
        session_id: str,
        user_id: int,
        coach_id: int,
        input_message: TransportMessage
    ) -> TransportMessage:
        """
        Process a single conversation turn
        
        This is the main entry point for HTTP-based conversations:
        1. Receive user input (text or audio)
        2. Process through AI
        3. Return response
        
        Args:
            session_id: Session identifier
            user_id: User ID
            coach_id: Coach ID
            input_message: User's input message
            
        Returns:
            AI response message
        """
        # Get or create session
        session = self._sessions.get(session_id)
        if not session:
            session = TransportSession(
                id=session_id,
                user_id=user_id,
                coach_id=coach_id
            )
            await self.connect(session)
        
        session.update_activity()
        
        # Handle based on message type
        if input_message.type == MessageType.AUDIO_CHUNK:
            # Audio processing would happen here
            # For Week 1, we expect text input
            return TransportMessage.error(
                code="NOT_IMPLEMENTED",
                message="Audio processing not yet implemented. Please send text.",
                session_id=session_id
            )
        
        elif input_message.type == MessageType.TEXT:
            # Add user turn to transcript
            session.add_turn("user", input_message.content)
            
            # The actual AI processing happens in the router
            # This transport layer just handles the communication
            return TransportMessage(
                type=MessageType.AI_RESPONSE_START,
                session_id=session_id,
                content=None  # Will be filled by the AI router
            )
        
        else:
            return TransportMessage.error(
                code="INVALID_MESSAGE_TYPE",
                message=f"Unsupported message type: {input_message.type}",
                session_id=session_id
            )
    
    def create_response(
        self,
        session_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TransportMessage:
        """
        Create a response message
        
        Helper for building the final HTTP response.
        """
        session = self._sessions.get(session_id)
        if session:
            session.add_turn("assistant", content)
        
        return TransportMessage(
            type=MessageType.TEXT,
            content=content,
            session_id=session_id,
            is_final=True
        )


# Singleton instance
_http_transport: Optional[HTTPTransport] = None


def get_http_transport() -> HTTPTransport:
    """Get the HTTP transport singleton"""
    global _http_transport
    if _http_transport is None:
        _http_transport = HTTPTransport()
    return _http_transport

