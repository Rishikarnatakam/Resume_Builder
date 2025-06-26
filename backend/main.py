from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

import sys
import os
from pathlib import Path

# Add backend directory to path for proper imports
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from routes import auth, resumes, latex, users, templates, ai_chat
from database import init_db
from utils.config import config

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting LaTeX Resume AI...")
    
    # Validate configuration
    config.validate_config()
    print(f"✅ Configuration validated - Using model: {config.get_gemini_model()}")
    
    await init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("🛑 Shutting down LaTeX Resume AI...")

# Create FastAPI app with modern config
app = FastAPI(
    title="LaTeX Resume AI",
    description="AI-powered LaTeX resume generator with live preview",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Configure CORS for production and development
allowed_origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",  # Local dev
    "http://localhost:3000",  # Production frontend container
    "http://frontend:80",     # Docker internal
]

# Add environment-specific origins
if os.getenv("ENVIRONMENT") == "production":
    domain = os.getenv("DOMAIN")
    if domain:
        allowed_origins.extend([
            f"http://{domain}",
            f"https://{domain}",
        ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for PDFs and assets
app.mount("/static", StaticFiles(directory="static"), name="static")

# API Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["Resumes"])
app.include_router(latex.router, prefix="/api/latex", tags=["LaTeX"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["AI Chat (Session-based)"])

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "LaTeX Resume AI",
        "version": "2.0.0",
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
        "docs": "/api/docs",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 