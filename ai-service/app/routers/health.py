"""
Health check endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.config import get_settings

settings = get_settings()
router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@router.get("/health/db")
async def database_health(db: AsyncSession = Depends(get_db)):
    """Database connection health check"""
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


@router.get("/health/redis")
async def redis_health():
    """Redis connection health check"""
    from app.services.cache_service import get_cache_service
    
    try:
        cache = await get_cache_service()
        is_connected = await cache.ping()
        
        if is_connected:
            return {
                "status": "healthy",
                "redis": "connected"
            }
        else:
            return {
                "status": "unhealthy",
                "redis": "disconnected"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "redis": "disconnected",
            "error": str(e)
        }


@router.get("/health/llm")
async def llm_health():
    """LLM provider health check"""
    from app.services.llm_client import get_llm_client
    
    try:
        client = get_llm_client()
        # Simple test call
        response = await client.generate(
            prompt="Say 'OK' in one word.",
            max_tokens=10
        )
        return {
            "status": "healthy",
            "provider": settings.LLM_PROVIDER,
            "model": response.model
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "provider": settings.LLM_PROVIDER,
            "error": str(e)
        }


@router.get("/health/all")
async def full_health_check(db: AsyncSession = Depends(get_db)):
    """Complete health check of all services"""
    from app.services.cache_service import get_cache_service
    
    health = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "components": {}
    }
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        health["components"]["database"] = "healthy"
    except Exception as e:
        health["components"]["database"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"
    
    # Check Redis
    try:
        cache = await get_cache_service()
        if await cache.ping():
            health["components"]["redis"] = "healthy"
        else:
            health["components"]["redis"] = "unhealthy"
            health["status"] = "degraded"
    except Exception as e:
        health["components"]["redis"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"
    
    # Check LLM (skip actual call for speed)
    health["components"]["llm"] = {
        "provider": settings.LLM_PROVIDER,
        "configured": bool(
            settings.OPENAI_API_KEY or 
            settings.GROQ_API_KEY or 
            settings.ANTHROPIC_API_KEY
        )
    }
    
    return health

