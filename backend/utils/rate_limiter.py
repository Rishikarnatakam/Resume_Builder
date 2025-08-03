"""
Rate limiting middleware for FastAPI
Protects API endpoints from abuse
"""
import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from utils.config import config

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests: Dict[str, list] = {}
        self.cleanup_interval = 60  # Clean up old entries every 60 seconds
        self.last_cleanup = time.time()
    
    def is_allowed(self, client_id: str, limit: int = None) -> bool:
        """Check if request is allowed"""
        if limit is None:
            limit = config.RATE_LIMIT_PER_MINUTE
        
        current_time = time.time()
        
        # Clean up old entries periodically
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries(current_time)
            self.last_cleanup = current_time
        
        # Get or create request history for this client
        if client_id not in self.requests:
            self.requests[client_id] = []
        
        # Remove requests older than 1 minute
        cutoff_time = current_time - 60
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id] 
            if req_time > cutoff_time
        ]
        
        # Check if under limit
        if len(self.requests[client_id]) >= limit:
            return False
        
        # Add current request
        self.requests[client_id].append(current_time)
        return True
    
    def _cleanup_old_entries(self, current_time: float):
        """Remove old entries to prevent memory leaks"""
        cutoff_time = current_time - 60
        for client_id in list(self.requests.keys()):
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id] 
                if req_time > cutoff_time
            ]
            # Remove empty entries
            if not self.requests[client_id]:
                del self.requests[client_id]

# Global rate limiter instance
rate_limiter = RateLimiter()

def get_client_id(request: Request) -> str:
    """Get unique client identifier"""
    # Use X-Forwarded-For header if available (behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host
    
    # Combine with user agent for better identification
    user_agent = request.headers.get("User-Agent", "")
    return f"{client_ip}:{hash(user_agent) % 10000}"

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    client_id = get_client_id(request)
    
    if not rate_limiter.is_allowed(client_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "60"}
        )
    
    response = await call_next(request)
    return response 