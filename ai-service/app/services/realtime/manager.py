"""
Connection Manager

Central manager for all transport types and active sessions.
Provides a unified interface regardless of the underlying transport.
"""

from typing import Optional, Dict, Set
from datetime import datetime, timedelta

from app.services.realtime.base import (
    TransportType,
    TransportMessage,
    TransportSession,
    BaseTransport
)
from app.services.realtime.http_transport import HTTPTransport, get_http_transport


class ConnectionManager:
    """
    Manages all active connections across transport types
    
    Features:
    - Unified session management
    - Transport abstraction
    - Session cleanup
    - Connection metrics
    """
    
    def __init__(self):
        self._transports: Dict[TransportType, BaseTransport] = {}
        self._sessions: Dict[str, TransportSession] = {}
        self._session_transport: Dict[str, TransportType] = {}
        
        # Initialize available transports
        self._transports[TransportType.HTTP] = get_http_transport()
    
    def get_transport(self, transport_type: TransportType) -> BaseTransport:
        """Get a transport implementation by type"""
        if transport_type not in self._transports:
            raise ValueError(f"Transport type {transport_type} not available")
        return self._transports[transport_type]
    
    async def create_session(
        self,
        user_id: int,
        coach_id: int,
        transport_type: TransportType = TransportType.HTTP,
        session_id: Optional[str] = None
    ) -> TransportSession:
        """
        Create a new session
        
        Args:
            user_id: User ID
            coach_id: Coach ID
            transport_type: Type of transport to use
            session_id: Optional custom session ID
            
        Returns:
            New TransportSession
        """
        session = TransportSession(
            user_id=user_id,
            coach_id=coach_id
        )
        if session_id:
            session.id = session_id
        
        # Register session
        self._sessions[session.id] = session
        self._session_transport[session.id] = transport_type
        
        # Connect via transport
        transport = self.get_transport(transport_type)
        await transport.connect(session)
        
        return session
    
    async def get_session(self, session_id: str) -> Optional[TransportSession]:
        """Get session by ID"""
        return self._sessions.get(session_id)
    
    async def end_session(self, session_id: str):
        """End and clean up a session"""
        if session_id not in self._sessions:
            return
        
        session = self._sessions[session_id]
        session.is_active = False
        
        # Disconnect from transport
        transport_type = self._session_transport.get(session_id, TransportType.HTTP)
        transport = self.get_transport(transport_type)
        await transport.disconnect(session_id)
        
        # Clean up
        del self._sessions[session_id]
        if session_id in self._session_transport:
            del self._session_transport[session_id]
    
    async def send_message(
        self,
        session_id: str,
        message: TransportMessage
    ) -> bool:
        """Send a message through the appropriate transport"""
        transport_type = self._session_transport.get(session_id, TransportType.HTTP)
        transport = self.get_transport(transport_type)
        return await transport.send(session_id, message)
    
    def get_active_sessions(self) -> Dict[str, TransportSession]:
        """Get all active sessions"""
        return {
            sid: session 
            for sid, session in self._sessions.items() 
            if session.is_active
        }
    
    def get_user_sessions(self, user_id: int) -> Dict[str, TransportSession]:
        """Get all sessions for a user"""
        return {
            sid: session 
            for sid, session in self._sessions.items() 
            if session.user_id == user_id
        }
    
    async def cleanup_stale_sessions(
        self,
        max_idle_minutes: int = 60
    ) -> int:
        """
        Clean up sessions that have been idle too long
        
        Returns number of sessions cleaned up
        """
        cutoff = datetime.utcnow() - timedelta(minutes=max_idle_minutes)
        stale_sessions = []
        
        for session_id, session in self._sessions.items():
            last_activity = datetime.fromisoformat(session.last_activity)
            if last_activity < cutoff:
                stale_sessions.append(session_id)
        
        for session_id in stale_sessions:
            await self.end_session(session_id)
        
        return len(stale_sessions)
    
    def get_stats(self) -> Dict:
        """Get connection statistics"""
        active_count = sum(1 for s in self._sessions.values() if s.is_active)
        
        transport_counts = {}
        for transport_type in self._session_transport.values():
            transport_counts[transport_type.value] = \
                transport_counts.get(transport_type.value, 0) + 1
        
        return {
            "total_sessions": len(self._sessions),
            "active_sessions": active_count,
            "by_transport": transport_counts
        }


# Singleton instance
_connection_manager: Optional[ConnectionManager] = None


def get_connection_manager() -> ConnectionManager:
    """Get the connection manager singleton"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager


def get_transport(transport_type: TransportType = TransportType.HTTP) -> BaseTransport:
    """Convenience function to get a transport"""
    return get_connection_manager().get_transport(transport_type)

