"""
AI Chat Routes - Session-based with Gemini Context Caching
Provides ChatGPT-style conversational AI for resume editing
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, AsyncGenerator
import json
import uuid
import asyncio
from datetime import datetime, timedelta

from database import get_db, get_user_subscription, update_user_subscription, UserSubscription
from routes.auth import get_current_user
from services.session_manager import session_manager
from utils.config import get_gemini_model
from sqlalchemy.future import select
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class SessionStartRequest(BaseModel):
    resume_id: str
    form_data: Dict[str, Any]  # Current form data (source of truth)
    template_name: str
    job_description: Optional[str] = None

class SessionStartResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    message: str
    model_info: Dict[str, str]

class ChatMessageRequest(BaseModel):
    session_id: str
    message: str
    current_latex: str
    image_data: Optional[str] = None  # Base64 encoded image
    pdf_data: Optional[str] = None    # Base64 encoded PDF

class ChatMessageResponse(BaseModel):
    success: bool
    response: str
    patch_data: Optional[Dict[str, Any]] = None
    session_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class SessionInfoResponse(BaseModel):
    success: bool
    session_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@router.post("/session/start", response_model=SessionStartResponse)
async def start_chat_session(
    request: SessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new AI chat session with context caching
    
    This creates a Gemini context cache with:
    - User form data (primary source of truth)
    - LaTeX template content
    - Original PDF (if available)
    - Job description (if provided)
    """
    try:
        logger.info(f"🚀 AI_CHAT: Starting session for resume {request.resume_id}")
        
        # Log detailed form data structure received
        logger.info(f"📊 AI_CHAT: Form data received:")
        logger.info(f"  - Personal Info: {bool(request.form_data.get('personalInfo'))}")
        logger.info(f"  - Summary: {bool(request.form_data.get('summary'))}")
        logger.info(f"  - Experience: {len(request.form_data.get('experience', []))} items")
        logger.info(f"  - Education: {len(request.form_data.get('education', []))} items") 
        logger.info(f"  - Skills: {len(request.form_data.get('skills', []))} items")
        logger.info(f"  - Projects: {len(request.form_data.get('projects', []))} items")
        logger.info(f"  - Awards: {len(request.form_data.get('awards', []))} items")
        logger.info(f"  - Certifications: {len(request.form_data.get('certifications', []))} items")
        logger.info(f"  - Languages: {len(request.form_data.get('languages', []))} items")
        logger.info(f"  - Publications: {len(request.form_data.get('publications', []))} items")
        logger.info(f"  - Volunteering: {len(request.form_data.get('volunteering', []))} items")
        logger.info(f"  - Speaking: {len(request.form_data.get('speaking', []))} items")
        logger.info(f"  - Military: {len(request.form_data.get('military', []))} items")
        logger.info(f"  - References: {bool(request.form_data.get('references'))}")
        logger.info(f"  - Hobbies: {len(request.form_data.get('hobbies', []))} items")
        logger.info(f"  - Additional Sections: {len(request.form_data.get('additional_sections', []))} items")
        
        if request.form_data.get('additional_sections'):
            logger.info(f"🔍 AI_CHAT: Additional sections details:")
            for i, section in enumerate(request.form_data.get('additional_sections', [])):
                logger.info(f"    Section {i+1}: {section.get('title', 'No title')} - {len(section.get('content', ''))} chars")
        
        # Get resume and validate ownership
        query = text("SELECT id FROM resumes WHERE id = :resume_id AND user_id = :user_id")
        resume_result = await db.execute(query, {"resume_id": request.resume_id, "user_id": current_user['id']})
        resume = resume_result.fetchone()
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found or access denied"
            )
        
        # Get template content and instructions
        logger.info(f"🔍 AI_CHAT: Using template name from request: {request.template_name}")
        template_content = await _get_template_content(request.template_name)
        # Remove unnecessary template instructions loading - it's handled by prompt_composer
        
        # Create session with context caching
        session_id = await session_manager.create_session(
            db=db,
            resume_id=request.resume_id,
            user_id=current_user['id'],
            form_data=request.form_data,
            template_name=request.template_name,
            job_description=request.job_description
        )
        
        return SessionStartResponse(
            success=True,
            session_id=session_id,
            message=f"AI chat session started! I have context of your resume data and template. I can help you edit your LaTeX resume with full memory of our conversation.",
            model_info={
                "model": get_gemini_model(),
                "context_caching": "enabled",
                "memory": "persistent"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ AI_CHAT: Failed to start session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start chat session: {str(e)}"
        )

@router.post("/session/message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message in an existing chat session
    
    The AI maintains full context and memory of the conversation,
    form data, template, and any previous changes made.
    """
    try:
        logger.info(f"💬 AI_CHAT: Processing message in session {request.session_id}")
        
        # Log attachment data info
        if request.image_data:
            logger.info(f"📸 AI_CHAT: Received image data - Length: {len(request.image_data)} chars")
            if request.image_data.startswith('data:image/'):
                header_part = request.image_data.split(',')[0] if ',' in request.image_data else request.image_data[:50]
                logger.info(f"📸 AI_CHAT: Image data header: {header_part}")
            else:
                logger.info(f"📸 AI_CHAT: Image data preview: {request.image_data[:50]}...")
        else:
            logger.info(f"📸 AI_CHAT: No image data received")
            
        if request.pdf_data:
            logger.info(f"📄 AI_CHAT: Received PDF data - Length: {len(request.pdf_data)} chars")
            logger.info(f"📄 AI_CHAT: PDF data preview: {request.pdf_data[:50]}...")
        else:
            logger.info(f"📄 AI_CHAT: No PDF data received")
        
        # --- Message Quota Enforcement ---
        user_id = current_user['id']
        subscription = await get_user_subscription(user_id, db)

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="You need to purchase a message pack to send messages."
            )
        
        if subscription.messages_used >= subscription.message_quota:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="You have exhausted your message quota. Please buy a new message pack."
            )
        # --- End Message Quota Enforcement ---

        # Validate session belongs to user
        session_info = await session_manager.get_session_info(db, request.session_id)
        if not session_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found or expired"
            )
        
        # Verify session belongs to user's resume
        query = text("SELECT id FROM resumes WHERE id = :resume_id AND user_id = :user_id")
        resume_result = await db.execute(query, {"resume_id": session_info["resume_id"], "user_id": current_user['id']})
        if not resume_result.fetchone():
                raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this chat session"
            )
        
        # Send message to AI
        response = await session_manager.send_message(
            db=db,
            session_id=request.session_id,
            user_message=request.message,
            current_latex=request.current_latex,
            image_data=request.image_data,
            pdf_data=request.pdf_data
        )

        # Get updated session info
        updated_session_info = await session_manager.get_session_info(db, request.session_id)

        # IMPORTANT: Increment message count ONLY if the AI response was successful
        if response["success"]:
            await update_user_subscription(db, subscription.id, messages_used=subscription.messages_used + 1)
            updated_sub = await get_user_subscription(user_id, db)
            logger.info(f"Incremented message count for user {user_id}. Used: {updated_sub.messages_used}/{updated_sub.message_quota}")

        return ChatMessageResponse(
            success=response["success"],
            response=response["response"],
            patch_data=response.get("patch_data"),
            session_info=updated_session_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ AI_CHAT: Failed to process message: {str(e)}")
        return ChatMessageResponse(
            success=False,
            response="I encountered an error processing your message. Please try again.",
            error=str(e)
        )

@router.get("/session/{session_id}/info", response_model=SessionInfoResponse)
async def get_session_info(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get information about a chat session"""
    try:
        session_info = await session_manager.get_session_info(db, session_id)
        
        if not session_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Verify session belongs to user
        query = text("SELECT id FROM resumes WHERE id = :resume_id AND user_id = :user_id")
        resume_result = await db.execute(query, {"resume_id": session_info["resume_id"], "user_id": current_user['id']})
        if not resume_result.fetchone():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return SessionInfoResponse(
            success=True,
            session_info=session_info
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ AI_CHAT: Failed to get session info: {str(e)}")
        return SessionInfoResponse(
            success=False,
            error=str(e)
        )

@router.delete("/session/{session_id}")
async def end_chat_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """End a chat session and cleanup resources"""
    try:
        # Verify session belongs to user
        session_info = await session_manager.get_session_info(db, session_id)
        if session_info:
            query = text("SELECT id FROM resumes WHERE id = :resume_id AND user_id = :user_id")
            resume_result = await db.execute(query, {"resume_id": session_info["resume_id"], "user_id": current_user['id']})
            if not resume_result.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        success = await session_manager.end_session(db, session_id)
        
        return {
            "success": success,
            "message": "Chat session ended successfully" if success else "Failed to end session"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ AI_CHAT: Failed to end session: {str(e)}")
        return {
            "success": False,
            "message": f"Error ending session: {str(e)}"
        }

@router.get("/status")
async def get_ai_status():
    """Get AI service status and capabilities"""
    try:
        return {
            "success": True,
            "status": "active",
            "model": get_gemini_model(),
            "features": {
                "session_based_chat": True,
                "context_caching": True,
                "persistent_memory": True,
                "template_awareness": True,
                "form_data_integration": True
            },
            "endpoints": {
                "start_session": "/api/ai/session/start",
                "send_message": "/api/ai/session/message", 
                "get_session_info": "/api/ai/session/{session_id}/info",
                "end_session": "/api/ai/session/{session_id}"
            },
            "cost_optimization": "75% savings with context caching"
        }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "error": str(e)
        }

async def _get_template_content(template_name: str) -> str:
    """Get template content from .cls file"""
    from pathlib import Path
    
    try:
        # Get template directory path
        template_dir = Path(__file__).parent.parent / "templates" / template_name
        template_file = template_dir / f"{template_name}.cls"
        
        if not template_file.exists():
            logger.warning(f"Template file not found: {template_file}")
            return f"% Template {template_name} not found"
        
        # Read template content
        with open(template_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        logger.info(f"✅ Template loaded: {template_name} ({len(content)} chars)")
        return content
        
    except Exception as e:
        logger.error(f"❌ Error loading template {template_name}: {str(e)}")
        return f"% Error loading template {template_name}: {str(e)}" 