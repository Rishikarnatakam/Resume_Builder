from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import jwt  # PyJWT library for proper JWT verification
from datetime import datetime

from database import get_db
from utils.config import config

# Supabase JWT Secret for verification (not the service key)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

if not SUPABASE_JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET environment variable is required")

router = APIRouter()

# Pydantic models for compatibility with existing frontend
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str  # Changed from int to str for UUID
    username: str
    email: str
    is_active: bool
    created_at: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

async def get_current_user(authorization: str = Header(None)) -> dict:
    """Get current user from Supabase JWT token using local verification"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = authorization.split(" ")[1]
    
    try:
        # Verify the JWT token locally, allowing for clock skew
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            leeway=10  # Add 10 seconds of leeway for clock skew
        )
        
        # Extract user information from JWT payload
        user_id = payload.get("sub")
        email = payload.get("email")
        user_metadata = payload.get("user_metadata") or {}
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Return user info as a dictionary
        return {
            "id": user_id,
            "email": email,
            "username": user_metadata.get('username', email.split('@')[0]),
            "is_active": True,
            "created_at": payload.get("iat", "")
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
# Routes - keeping same endpoints for compatibility
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register endpoint - Note: Registration should happen through Supabase Auth on the frontend"""
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Please use Supabase Auth for registration on the frontend."
    )

@router.post("/login", response_model=Token)
async def login():
    """Login endpoint - Note: Login should happen through Supabase Auth on the frontend"""
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Please use Supabase Auth for login on the frontend."
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user['id'],
        username=current_user['username'],
        email=current_user['email'],
        is_active=current_user['is_active'],
        created_at=current_user['created_at']
    ) 