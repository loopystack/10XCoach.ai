"""
Memory Service for storing and retrieving coach memories using vector similarity
"""
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coach_memory import CoachMemory
from app.services.embedding_service import get_embedding_service

from app.config import get_settings

settings = get_settings()


@dataclass
class MemoryResult:
    """Result from memory search"""
    id: int
    text: str
    similarity: float
    memory_type: str
    created_at: str


class MemoryService:
    """
    Service for storing and retrieving vector embeddings
    for coach-user conversation context
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedding_service = get_embedding_service()
    
    async def store_embedding(
        self,
        text: str,
        user_id: int,
        coach_id: int,
        memory_type: str = "conversation",
        session_id: Optional[int] = None
    ) -> CoachMemory:
        """
        Store a text with its embedding in the database
        
        Args:
            text: The text content to store
            user_id: User ID
            coach_id: Coach ID
            memory_type: Type of memory (conversation, insight, action)
            session_id: Optional session ID
            
        Returns:
            The created CoachMemory record
        """
        # Generate embedding
        embedding = await self.embedding_service.embed(text)
        
        # Create memory record
        memory = CoachMemory(
            coach_id=coach_id,
            user_id=user_id,
            text=text,
            embedding=embedding,
            memory_type=memory_type,
            session_id=session_id
        )
        
        self.db.add(memory)
        await self.db.commit()
        await self.db.refresh(memory)
        
        return memory
    
    async def search_similar(
        self,
        user_id: int,
        coach_id: int,
        query: str,
        limit: int = None,
        threshold: float = None,
        memory_types: Optional[List[str]] = None
    ) -> List[MemoryResult]:
        """
        Search for similar memories using vector similarity
        
        Args:
            user_id: User ID to search within
            coach_id: Coach ID to search within
            query: Query text to find similar memories
            limit: Max number of results (default from settings)
            threshold: Minimum similarity threshold (default from settings)
            memory_types: Optional filter by memory types
            
        Returns:
            List of MemoryResult sorted by similarity (descending)
        """
        limit = limit or settings.MAX_CONTEXT_RESULTS
        threshold = threshold or settings.SIMILARITY_THRESHOLD
        
        # Generate query embedding
        query_embedding = await self.embedding_service.embed(query)
        
        # Build the query using pgvector's cosine distance
        # Note: pgvector uses distance (lower is better), so we convert to similarity
        query_str = """
            SELECT 
                id,
                text,
                memory_type,
                created_at,
                1 - (embedding <=> :query_embedding::vector) as similarity
            FROM coach_memories
            WHERE user_id = :user_id 
              AND coach_id = :coach_id
              AND 1 - (embedding <=> :query_embedding::vector) >= :threshold
        """
        
        if memory_types:
            query_str += " AND memory_type = ANY(:memory_types)"
        
        query_str += " ORDER BY similarity DESC LIMIT :limit"
        
        # Execute query
        params = {
            "query_embedding": str(query_embedding),
            "user_id": user_id,
            "coach_id": coach_id,
            "threshold": threshold,
            "limit": limit
        }
        
        if memory_types:
            params["memory_types"] = memory_types
        
        result = await self.db.execute(text(query_str), params)
        rows = result.fetchall()
        
        return [
            MemoryResult(
                id=row.id,
                text=row.text,
                similarity=float(row.similarity),
                memory_type=row.memory_type,
                created_at=str(row.created_at)
            )
            for row in rows
        ]
    
    async def get_recent_context(
        self,
        user_id: int,
        coach_id: int,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent conversation context without vector search
        Useful for maintaining conversation flow
        
        Args:
            user_id: User ID
            coach_id: Coach ID
            limit: Max number of recent memories
            
        Returns:
            List of recent memories
        """
        query = (
            select(CoachMemory)
            .where(
                and_(
                    CoachMemory.user_id == user_id,
                    CoachMemory.coach_id == coach_id
                )
            )
            .order_by(CoachMemory.created_at.desc())
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        memories = result.scalars().all()
        
        return [
            {
                "id": m.id,
                "text": m.text,
                "memory_type": m.memory_type,
                "created_at": str(m.created_at)
            }
            for m in reversed(memories)  # Return in chronological order
        ]
    
    async def delete_user_memories(self, user_id: int, coach_id: Optional[int] = None):
        """
        Delete all memories for a user (optionally filtered by coach)
        
        Args:
            user_id: User ID
            coach_id: Optional coach ID filter
        """
        conditions = [CoachMemory.user_id == user_id]
        if coach_id:
            conditions.append(CoachMemory.coach_id == coach_id)
        
        query = select(CoachMemory).where(and_(*conditions))
        result = await self.db.execute(query)
        memories = result.scalars().all()
        
        for memory in memories:
            await self.db.delete(memory)
        
        await self.db.commit()

