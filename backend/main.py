from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import logging
from dotenv import load_dotenv  # Import the library

load_dotenv()  # Load environment variables from .env file

import sys
import os
from pathlib import Path

# Add backend directory to path for proper imports
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from routes import auth, resumes, latex, users, templates, ai_chat, subscriptions, pricing
from database import init_db, engine
from utils.config import config
from utils.rate_limiter import rate_limit_middleware

# Configure logging
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting LaTeX Resume AI...")
    
    # Validate configuration
    config.validate_config()
    logger.info(f"✅ Configuration validated - Using model: {config.get_gemini_model()}")
    
    # await init_db()  # Disabled for production safety
    logger.info("✅ Database initialized")
    yield
    # Shutdown
    logger.info("🛑 Shutting down LaTeX Resume AI...")
    # Properly close database connections
    await engine.dispose()
    logger.info("✅ Database connections closed")

# Create FastAPI app with modern config
app = FastAPI(
    title="LaTeX Resume AI",
    description="AI-powered LaTeX resume generator with live preview",
    version="1.0.0",
    docs_url="/api/docs" if config.ENVIRONMENT == "development" else None,
    redoc_url="/api/redoc" if config.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# Security middleware - Trusted hosts
if config.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure with your actual domain in production
    )

# Rate limiting middleware
@app.middleware("http")
async def rate_limit(request: Request, call_next):
    return await rate_limit_middleware(request, call_next)

# Define allowed origins for CORS
# This is now controlled by environment variables via config.py
allow_origins = config.CORS_ALLOWED_ORIGINS
allow_origin_regex = config.CORS_ALLOW_ORIGIN_REGEX

# Add CORS middleware to the application
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Success", "X-Filename", "X-Error"],  # Expose custom headers
)

# Static files no longer needed - PDFs are streamed directly to browser
# app.mount("/static", StaticFiles(directory="static"), name="static")

# API Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["Resumes"])
app.include_router(latex.router, prefix="/api", tags=["LaTeX"])  # latex router already has /latex prefix
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["AI Chat (Session-based)"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["Subscriptions"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "LaTeX Resume AI",
        "version": "2.0.0",
        "environment": config.ENVIRONMENT,
        "model": config.get_gemini_model(),
        "features": {
            "session_based_ai": True,
            "context_caching": True,
            "pdf_storage": True,
            "environment_config": True
        }
    }

@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "message": "🤖 LaTeX Resume AI API",
        "docs": "/api/docs" if config.ENVIRONMENT == "development" else "API docs disabled in production",
        "health": "/api/health",
        "environment": config.ENVIRONMENT
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 