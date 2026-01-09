"""
Redis Cache Service
Handles conversation state, session context, and rate limiting
"""
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, asdict
import redis.asyncio as redis

from app.config import get_settings

settings = get_settings()


# Redis key patterns
class CacheKeys:
    """Redis key patterns for different data types"""
    
    # Session context: stores conversation history for active sessions
    # Format: session:{session_id}:context
    SESSION_CONTEXT = "session:{session_id}:context"
    
    # User's last session reference
    # Format: user:{user_id}:last_session
    USER_LAST_SESSION = "user:{user_id}:last_session"
    
    # User's active coach session
    # Format: user:{user_id}:coach:{coach_id}:context
    USER_COACH_CONTEXT = "user:{user_id}:coach:{coach_id}:context"
    
    # Rate limiting counter
    # Format: ratelimit:{user_id}:{endpoint}
    RATE_LIMIT = "ratelimit:{user_id}:{endpoint}"
    
    # Coach persona cache (rarely changes)
    # Format: coach:{coach_id}:persona
    COACH_PERSONA = "coach:{coach_id}:persona"
    
    @staticmethod
    def session_context(session_id: int) -> str:
        return CacheKeys.SESSION_CONTEXT.format(session_id=session_id)
    
    @staticmethod
    def user_last_session(user_id: int) -> str:
        return CacheKeys.USER_LAST_SESSION.format(user_id=user_id)
    
    @staticmethod
    def user_coach_context(user_id: int, coach_id: int) -> str:
        return CacheKeys.USER_COACH_CONTEXT.format(user_id=user_id, coach_id=coach_id)
    
    @staticmethod
    def rate_limit(user_id: int, endpoint: str) -> str:
        return CacheKeys.RATE_LIMIT.format(user_id=user_id, endpoint=endpoint)
    
    @staticmethod
    def coach_persona(coach_id: int) -> str:
        return CacheKeys.COACH_PERSONA.format(coach_id=coach_id)


@dataclass
class ConversationMessage:
    """A message in the conversation context"""
    role: str  # user, assistant, system
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationMessage":
        return cls(**data)


@dataclass
class SessionContext:
    """Session context stored in Redis"""
    session_id: int
    user_id: int
    coach_id: int
    messages: List[ConversationMessage]
    created_at: str
    updated_at: str
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "coach_id": self.coach_id,
            "messages": [m.to_dict() for m in self.messages],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SessionContext":
        messages = [ConversationMessage.from_dict(m) for m in data.get("messages", [])]
        return cls(
            session_id=data["session_id"],
            user_id=data["user_id"],
            coach_id=data["coach_id"],
            messages=messages,
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            metadata=data.get("metadata")
        )


class CacheService:
    """
    Redis cache service for managing conversation state and rate limiting
    
    Key patterns:
    - session:{session_id}:context - Full conversation context for a session
    - user:{user_id}:last_session - Reference to user's most recent session
    - user:{user_id}:coach:{coach_id}:context - Quick access to user-coach conversation
    - ratelimit:{user_id}:{endpoint} - Rate limiting counters
    """
    
    _instance: Optional["CacheService"] = None
    _redis: Optional[redis.Redis] = None
    
    def __init__(self):
        self._redis = None
    
    @classmethod
    async def get_instance(cls) -> "CacheService":
        """Get singleton instance of cache service"""
        if cls._instance is None:
            cls._instance = CacheService()
            await cls._instance.connect()
        return cls._instance
    
    async def connect(self):
        """Connect to Redis"""
        if self._redis is None:
            self._redis = redis.from_url(
                settings.REDIS_URL,
                password=settings.REDIS_PASSWORD,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._redis.ping()
            print("✅ Redis connected")
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self._redis:
            await self._redis.close()
            self._redis = None
            print("👋 Redis disconnected")
    
    async def ping(self) -> bool:
        """Check Redis connection"""
        try:
            if self._redis:
                await self._redis.ping()
                return True
            return False
        except Exception:
            return False
    
    # =============================================
    # SESSION CONTEXT METHODS
    # =============================================
    
    async def get_session_context(self, session_id: int) -> Optional[SessionContext]:
        """
        Get conversation context for a session
        
        Args:
            session_id: The session ID
            
        Returns:
            SessionContext or None if not found
        """
        key = CacheKeys.session_context(session_id)
        data = await self._redis.get(key)
        
        if data:
            return SessionContext.from_dict(json.loads(data))
        return None
    
    async def set_session_context(
        self,
        session_id: int,
        user_id: int,
        coach_id: int,
        messages: List[ConversationMessage],
        metadata: Optional[Dict[str, Any]] = None
    ) -> SessionContext:
        """
        Store or update session context
        
        Args:
            session_id: The session ID
            user_id: User ID
            coach_id: Coach ID
            messages: List of conversation messages
            metadata: Optional additional metadata
            
        Returns:
            The stored SessionContext
        """
        now = datetime.utcnow().isoformat()
        
        # Check if context exists
        existing = await self.get_session_context(session_id)
        
        context = SessionContext(
            session_id=session_id,
            user_id=user_id,
            coach_id=coach_id,
            messages=messages,
            created_at=existing.created_at if existing else now,
            updated_at=now,
            metadata=metadata or (existing.metadata if existing else None)
        )
        
        key = CacheKeys.session_context(session_id)
        await self._redis.set(
            key,
            json.dumps(context.to_dict()),
            ex=settings.SESSION_CONTEXT_TTL
        )
        
        # Also update user's last session reference
        await self.set_user_last_session(user_id, session_id)
        
        return context
    
    async def append_message(
        self,
        session_id: int,
        user_id: int,
        coach_id: int,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SessionContext:
        """
        Append a message to session context
        
        Args:
            session_id: The session ID
            user_id: User ID
            coach_id: Coach ID
            role: Message role (user, assistant, system)
            content: Message content
            metadata: Optional message metadata
            
        Returns:
            Updated SessionContext
        """
        context = await self.get_session_context(session_id)
        
        message = ConversationMessage(
            role=role,
            content=content,
            timestamp=datetime.utcnow().isoformat(),
            metadata=metadata
        )
        
        if context:
            context.messages.append(message)
            messages = context.messages
        else:
            messages = [message]
        
        return await self.set_session_context(
            session_id=session_id,
            user_id=user_id,
            coach_id=coach_id,
            messages=messages
        )
    
    async def get_recent_messages(
        self,
        session_id: int,
        limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Get recent messages from session context
        Returns in format suitable for LLM history
        
        Args:
            session_id: The session ID
            limit: Max messages to return
            
        Returns:
            List of {"role": ..., "content": ...} dicts
        """
        context = await self.get_session_context(session_id)
        
        if not context:
            return []
        
        messages = context.messages[-limit:]
        return [{"role": m.role, "content": m.content} for m in messages]
    
    async def clear_session_context(self, session_id: int):
        """Clear session context from cache"""
        key = CacheKeys.session_context(session_id)
        await self._redis.delete(key)
    
    # =============================================
    # USER SESSION METHODS
    # =============================================
    
    async def get_user_last_session(self, user_id: int) -> Optional[int]:
        """
        Get user's last session ID
        
        Args:
            user_id: User ID
            
        Returns:
            Session ID or None
        """
        key = CacheKeys.user_last_session(user_id)
        data = await self._redis.get(key)
        
        if data:
            return int(data)
        return None
    
    async def set_user_last_session(self, user_id: int, session_id: int):
        """
        Set user's last session reference
        
        Args:
            user_id: User ID
            session_id: Session ID
        """
        key = CacheKeys.user_last_session(user_id)
        await self._redis.set(
            key,
            str(session_id),
            ex=settings.USER_SESSION_TTL
        )
    
    async def get_user_coach_context(
        self,
        user_id: int,
        coach_id: int
    ) -> Optional[List[Dict[str, str]]]:
        """
        Get quick context for user-coach pair
        Useful for continuing conversations without a formal session
        
        Args:
            user_id: User ID
            coach_id: Coach ID
            
        Returns:
            List of recent messages or None
        """
        key = CacheKeys.user_coach_context(user_id, coach_id)
        data = await self._redis.get(key)
        
        if data:
            return json.loads(data)
        return None
    
    async def set_user_coach_context(
        self,
        user_id: int,
        coach_id: int,
        messages: List[Dict[str, str]],
        max_messages: int = 20
    ):
        """
        Store quick context for user-coach pair
        
        Args:
            user_id: User ID
            coach_id: Coach ID
            messages: Messages to store
            max_messages: Max messages to keep
        """
        key = CacheKeys.user_coach_context(user_id, coach_id)
        
        # Keep only recent messages
        messages = messages[-max_messages:]
        
        await self._redis.set(
            key,
            json.dumps(messages),
            ex=settings.SESSION_CONTEXT_TTL
        )
    
    async def append_to_user_coach_context(
        self,
        user_id: int,
        coach_id: int,
        role: str,
        content: str,
        max_messages: int = 20
    ):
        """
        Append message to user-coach context
        
        Args:
            user_id: User ID
            coach_id: Coach ID
            role: Message role
            content: Message content
            max_messages: Max messages to keep
        """
        existing = await self.get_user_coach_context(user_id, coach_id) or []
        existing.append({"role": role, "content": content})
        await self.set_user_coach_context(user_id, coach_id, existing, max_messages)
    
    # =============================================
    # RATE LIMITING METHODS
    # =============================================
    
    async def check_rate_limit(
        self,
        user_id: int,
        endpoint: str = "default",
        max_requests: int = None,
        window_seconds: int = None
    ) -> tuple[bool, int]:
        """
        Check if user is within rate limit
        
        Args:
            user_id: User ID
            endpoint: Endpoint identifier
            max_requests: Max requests allowed (default from settings)
            window_seconds: Time window in seconds (default from settings)
            
        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        if not settings.RATE_LIMIT_ENABLED:
            return True, -1
        
        max_requests = max_requests or settings.RATE_LIMIT_REQUESTS
        window_seconds = window_seconds or settings.RATE_LIMIT_TTL
        
        key = CacheKeys.rate_limit(user_id, endpoint)
        
        # Get current count
        current = await self._redis.get(key)
        
        if current is None:
            # First request in window
            await self._redis.set(key, "1", ex=window_seconds)
            return True, max_requests - 1
        
        current = int(current)
        
        if current >= max_requests:
            # Rate limit exceeded
            return False, 0
        
        # Increment counter
        await self._redis.incr(key)
        return True, max_requests - current - 1
    
    async def get_rate_limit_status(
        self,
        user_id: int,
        endpoint: str = "default"
    ) -> Dict[str, Any]:
        """
        Get rate limit status for user
        
        Args:
            user_id: User ID
            endpoint: Endpoint identifier
            
        Returns:
            Dict with limit, remaining, reset_in
        """
        key = CacheKeys.rate_limit(user_id, endpoint)
        
        current = await self._redis.get(key)
        ttl = await self._redis.ttl(key)
        
        return {
            "limit": settings.RATE_LIMIT_REQUESTS,
            "remaining": settings.RATE_LIMIT_REQUESTS - int(current or 0),
            "reset_in": max(0, ttl)
        }
    
    # =============================================
    # GENERIC CACHE METHODS
    # =============================================
    
    async def get(self, key: str) -> Optional[str]:
        """Get a value from cache"""
        return await self._redis.get(key)
    
    async def set(self, key: str, value: str, ttl: int = 3600):
        """Set a value in cache"""
        await self._redis.set(key, value, ex=ttl)
    
    async def delete(self, key: str):
        """Delete a key from cache"""
        await self._redis.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        return await self._redis.exists(key) > 0


# Global cache instance
_cache_service: Optional[CacheService] = None


async def get_cache_service() -> CacheService:
    """Get the cache service instance"""
    global _cache_service
    if _cache_service is None:
        _cache_service = await CacheService.get_instance()
    return _cache_service


async def close_cache_service():
    """Close the cache service"""
    global _cache_service
    if _cache_service:
        await _cache_service.disconnect()
        _cache_service = None

