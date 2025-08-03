"""
Production logging utility for LaTeX Resume AI
Replaces all print statements with proper structured logging
"""
import logging
import os
from typing import Any, Dict, Optional
from utils.config import config

# Configure logger
logger = logging.getLogger(__name__)

class ProductionLogger:
    """Production-safe logging utility"""
    
    @staticmethod
    def info(message: str, **kwargs):
        """Log info message"""
        if config.ENVIRONMENT == "production":
            logger.info(message)
        # No print in production - completely silent
    
    @staticmethod
    def error(message: str, **kwargs):
        """Log error message"""
        if config.ENVIRONMENT == "production":
            logger.error(message)
        # No print in production - completely silent
    
    @staticmethod
    def warning(message: str, **kwargs):
        """Log warning message"""
        if config.ENVIRONMENT == "production":
            logger.warning(message)
        # No print in production - completely silent
    
    @staticmethod
    def debug(message: str, **kwargs):
        """Log debug message (only in development)"""
        if config.DEBUG and config.ENVIRONMENT == "production":
            logger.debug(message)
        # No print in production - completely silent
    
    @staticmethod
    def ai_request(prompt: str, response: str, token_count: Optional[int] = None):
        """Log AI request/response (sanitized for production)"""
        if config.ENVIRONMENT == "production":
            logger.info(f"AI Request - Tokens: {token_count}, Response length: {len(response)}")
        # No print in production - completely silent
    
    @staticmethod
    def ai_error(error: str):
        """Log AI error"""
        if config.ENVIRONMENT == "production":
            logger.error(f"AI Error: {error}")
        # No print in production - completely silent
    
    @staticmethod
    def compilation_start(content_length: int):
        """Log LaTeX compilation start"""
        if config.ENVIRONMENT == "production":
            logger.info(f"LaTeX compilation started - Content length: {content_length}")
        # No print in production - completely silent
    
    @staticmethod
    def compilation_success(filename: str):
        """Log successful LaTeX compilation"""
        if config.ENVIRONMENT == "production":
            logger.info(f"LaTeX compilation successful - Filename: {filename}")
        # No print in production - completely silent
    
    @staticmethod
    def compilation_error(error: str, log_output: str = ""):
        """Log LaTeX compilation error"""
        if config.ENVIRONMENT == "production":
            logger.error(f"LaTeX compilation failed: {error}")
        # No print in production - completely silent
    
    @staticmethod
    def session_start(session_id: str, user_id: str):
        """Log AI session start"""
        if config.ENVIRONMENT == "production":
            logger.info(f"AI session started - Session: {session_id}, User: {user_id}")
        # No print in production - completely silent
    
    @staticmethod
    def session_end(session_id: str):
        """Log AI session end"""
        if config.ENVIRONMENT == "production":
            logger.info(f"AI session ended - Session: {session_id}")
        # No print in production - completely silent
    
    @staticmethod
    def pdf_processing(file_size: int, success: bool):
        """Log PDF processing"""
        if config.ENVIRONMENT == "production":
            status = "successful" if success else "failed"
            logger.info(f"PDF processing {status} - File size: {file_size} bytes")
        # No print in production - completely silent

# Global logger instance
prod_logger = ProductionLogger() 