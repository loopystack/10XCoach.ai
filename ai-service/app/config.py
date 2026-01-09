"""
Configuration settings for the AI service
"""
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App
    APP_NAME: str = "10XCoach AI Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/10xcoach"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = None
    
    # Cache TTL (in seconds)
    SESSION_CONTEXT_TTL: int = 3600  # 1 hour
    USER_SESSION_TTL: int = 86400    # 24 hours
    RATE_LIMIT_TTL: int = 60         # 1 minute
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 60    # requests per minute
    RATE_LIMIT_ENABLED: bool = True
    
    # LLM Provider (openai, groq, anthropic)
    LLM_PROVIDER: str = "openai"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Groq
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    
    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-sonnet-20240229"
    
    # LLM Settings
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000
    
    # Vector DB
    EMBEDDING_DIMENSION: int = 1536
    SIMILARITY_THRESHOLD: float = 0.7
    MAX_CONTEXT_RESULTS: int = 5
    
    # Node.js Backend
    BACKEND_URL: str = "http://localhost:3001"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

