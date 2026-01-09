"""
10XCoach.ai AI Orchestration Service
FastAPI application for AI coach interactions
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import init_db, close_db
from app.services.cache_service import get_cache_service, close_cache_service
from app.routers import coach_router, health_router, realtime_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database
    await init_db()
    print(f"📊 Database connected")
    
    # Initialize Redis
    try:
        cache = await get_cache_service()
        if await cache.ping():
            print(f"🔴 Redis connected")
        else:
            print(f"⚠️ Redis connection failed - caching disabled")
    except Exception as e:
        print(f"⚠️ Redis unavailable: {e} - caching disabled")
    
    print(f"🤖 LLM Provider: {settings.LLM_PROVIDER}")
    
    yield
    
    # Shutdown
    await close_cache_service()
    await close_db()
    print("👋 AI Service shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Orchestration Service for 10XCoach.ai",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting to API requests"""
    # Skip rate limiting for health checks
    if request.url.path.startswith("/health"):
        return await call_next(request)
    
    # Try to get user_id from request (simplified - would use auth in production)
    user_id = request.headers.get("X-User-ID", "anonymous")
    
    try:
        cache = await get_cache_service()
        is_allowed, remaining = await cache.check_rate_limit(
            user_id=hash(user_id) % 1000000,  # Simple hash for demo
            endpoint=request.url.path
        )
        
        if not is_allowed:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded. Please try again later."},
                headers={"X-RateLimit-Remaining": "0"}
            )
        
        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
        
    except Exception:
        # If Redis is unavailable, allow the request
        return await call_next(request)


# Include routers
app.include_router(health_router, tags=["Health"])
app.include_router(coach_router, prefix="/ai/coach", tags=["AI Coach"])
app.include_router(realtime_router, prefix="/realtime", tags=["Real-time"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "llm_provider": settings.LLM_PROVIDER
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

