from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List

from database import get_db
from routes.auth import get_current_user, UserResponse

router = APIRouter()

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user['id'],
        username=current_user['username'],
        email=current_user['email'],
        is_active=current_user['is_active'],
        created_at=current_user['created_at']
    )

@router.get("/resumes", response_model=List[dict])
async def get_user_resumes(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all resumes for the current user"""
    query = text("SELECT id, title, template_name, created_at, updated_at FROM resumes WHERE user_id = :user_id ORDER BY updated_at DESC")
    result = await db.execute(query, {"user_id": current_user['id']})
    resumes = result.fetchall()
    
    return [
        {
            "id": r.id,
            "title": r.title,
            "template_name": r.template_name,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        }
        for r in resumes
    ]

@router.delete("/resumes")
async def delete_all_user_resumes(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all resumes for the current user"""
    query = text("DELETE FROM resumes WHERE user_id = :user_id")
    result = await db.execute(query, {"user_id": current_user['id']})
    await db.commit()
    
    return {"message": f"Deleted all resumes for user {current_user['username']}"}

@router.delete("/account")
async def delete_user_account(
    current_user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Delete user account and all associated data"""
    # Delete all user's resumes first
    query = text("DELETE FROM resumes WHERE user_id = :user_id")
    await db.execute(query, {"user_id": current_user['id']})
    
    # Note: User deletion should be handled through Supabase Auth, not directly in the database
    # This endpoint now only cleans up associated data
    await db.commit()
    
    return {"message": "User data deleted successfully"} 