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
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.info(message)
    
    @staticmethod
    def error(message: str, **kwargs):
        """Log error message"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.error(message)
    
    @staticmethod
    def warning(message: str, **kwargs):
        """Log warning message"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.warning(message)
    
    @staticmethod
    def debug(message: str, **kwargs):
        """Log debug message (only in development)"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.debug(message)
    
    @staticmethod
    def ai_request(prompt: str, response: str, token_count: Optional[int] = None):
        """Log AI request/response (sanitized for production)"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.info(f"AI Request - Tokens: {token_count}, Response length: {len(response)}")
    
    @staticmethod
    def ai_error(error: str):
        """Log AI error"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.error(f"AI Error: {error}")
    
    @staticmethod
    def compilation_start(content_length: int):
        """Log LaTeX compilation start"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.info(f"LaTeX compilation started - Content length: {content_length}")
    
    @staticmethod
    def compilation_success(filename: str):
        """Log successful LaTeX compilation"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.info(f"LaTeX compilation successful - Filename: {filename}")
    
    @staticmethod
    def compilation_error(error: str, log_output: str = ""):
        """Log LaTeX compilation error"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.error(f"LaTeX compilation failed: {error}")
    
    @staticmethod
    def session_start(session_id: str, user_id: str):
        """Log AI session start"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.info(f"AI session started - Session: {session_id}, User: {user_id}")
    
    @staticmethod
    def session_end(session_id: str):
        """Log AI session end"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            logger.info(f"AI session ended - Session: {session_id}")
    
    @staticmethod
    def pdf_processing(file_size: int, success: bool):
        """Log PDF processing"""
        # Completely silent in production - no terminal output
        if config.ENVIRONMENT != "production":
            status = "successful" if success else "failed"
            logger.info(f"PDF processing {status} - File size: {file_size} bytes")

# Global logger instance
prod_logger = ProductionLogger() 