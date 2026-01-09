"""
CoachMemory model for vector storage with pgvector
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from app.database import Base
from app.config import get_settings

settings = get_settings()


class CoachMemory(Base):
    """
    Stores embeddings for coach-user conversations
    Enables semantic search for relevant context
    """
    __tablename__ = "coach_memories"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    coach_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    
    # The actual text content
    text = Column(Text, nullable=False)
    
    # Vector embedding for semantic search
    embedding = Column(Vector(settings.EMBEDDING_DIMENSION), nullable=False)
    
    # Metadata
    memory_type = Column(String(50), default="conversation")  # conversation, insight, action
    session_id = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Create index for vector similarity search
    __table_args__ = (
        Index(
            'ix_coach_memories_embedding',
            embedding,
            postgresql_using='ivfflat',
            postgresql_with={'lists': 100},
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        ),
    )
    
    def __repr__(self):
        return f"<CoachMemory(id={self.id}, coach_id={self.coach_id}, user_id={self.user_id})>"

