"""
Configuration management for LaTeX Resume AI
Centralizes all environment variables and model settings
"""
import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

class Config:
    """Centralized configuration management"""
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")  # JWT secret for token verification
    
    # Model Configuration
    DEFAULT_GEMINI_MODEL: str = os.getenv("DEFAULT_GEMINI_MODEL", "")
    
    # Database - Now using PostgreSQL/Supabase only
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Context Caching
    DEFAULT_CACHE_TTL_HOURS: int = int(os.getenv("DEFAULT_CACHE_TTL_HOURS", "24"))
    MIN_CACHE_TOKENS: int = int(os.getenv("MIN_CACHE_TOKENS", "1024"))
    
    # File Upload (kept for potential future use, but PDFs are now streamed)
    MAX_PDF_SIZE_MB: int = int(os.getenv("MAX_PDF_SIZE_MB", "10"))
    # UPLOAD_DIR no longer used - PDFs are streamed directly to browser
    # UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "static/uploaded_pdfs")
    
    # Security
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # CORS Configuration - No defaults, must be set in .env
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    CORS_ALLOWED_ORIGINS: list[str] = [origin.strip() for origin in raw_origins.split(',') if origin.strip()]
    CORS_ALLOW_ORIGIN_REGEX: str = os.getenv("CORS_ALLOW_ORIGIN_REGEX", "")

    @classmethod
    def get_gemini_model(cls) -> str:
        """Get the configured Gemini model"""
        return cls.DEFAULT_GEMINI_MODEL
    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate that required configuration is present"""
        if not cls.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        if not cls.DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is required - please configure Supabase connection")
        if "sqlite" in cls.DATABASE_URL.lower():
            raise ValueError("SQLite is no longer supported - please use Supabase PostgreSQL")
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not cls.SUPABASE_JWT_SECRET:
            raise ValueError("SUPABASE_JWT_SECRET environment variable is required")
        return True

# Global config instance
config = Config()

# Convenience functions
def get_gemini_model() -> str:
    """Get the current Gemini model to use"""
    return config.get_gemini_model()

def get_gemini_api_key() -> str:
    """Get Gemini API key"""
    if not config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return config.GEMINI_API_KEY 