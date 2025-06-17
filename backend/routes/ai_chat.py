from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from routes.auth import get_current_user
from database import User
from google import genai
from google.genai import types
import os
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()

# Configure Gemini API with new SDK
def get_gemini_client():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment variables")
        return None
    return genai.Client(api_key=api_key)

class ConversationMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    current_latex: str
    conversation_history: Optional[List[ConversationMessage]] = []
    template_name: Optional[str] = None
    template_content: Optional[str] = None
    image_data: Optional[str] = None  # Base64 encoded image
    image_type: Optional[str] = None  # "png", "jpg", "jpeg", "pdf", "webp"

class ChatResponse(BaseModel):
    success: bool
    response: str
    modified_latex: Optional[str] = None
    error: Optional[str] = None

@router.post("/chat", response_model=ChatResponse)
async def handle_ai_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Handle AI chat requests to modify LaTeX code based on user instructions
    Now with template awareness!
    """
    try:
        if not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )

        logger.info(f"🔄 BACKEND: Received template-aware chat request - Message: '{request.message}', Template: {request.template_name}, History length: {len(request.conversation_history or [])}")

        # Get Gemini client
        client = get_gemini_client()
        if not client:
            return ChatResponse(
                success=True,
                response="AI service is not configured. Please set your GEMINI_API_KEY in the environment variables.",
                modified_latex=None,
                error="API key not configured"
            )

        # Prepare image content if provided
        image_part = None
        if request.image_data and request.image_type:
            try:
                # Decode base64 image data
                import base64
                image_bytes = base64.b64decode(request.image_data)
                
                # Map file extensions to MIME types
                mime_type_map = {
                    "png": "image/png",
                    "jpg": "image/jpeg", 
                    "jpeg": "image/jpeg",
                    "pdf": "application/pdf",
                    "webp": "image/webp"
                }
                
                mime_type = mime_type_map.get(request.image_type.lower(), "image/jpeg")
                
                image_part = types.Part(
                    inline_data=types.Blob(
                        data=image_bytes,
                        mime_type=mime_type
                    )
                )
                logger.info(f"📸 BACKEND: Prepared image for AI analysis - {request.image_type} ({len(image_bytes)} bytes)")
                
            except Exception as img_error:
                logger.error(f"❌ BACKEND: Image processing error: {str(img_error)}")
                return ChatResponse(
                    success=False,
                    response="Sorry, I couldn't process the uploaded image. Please try with a different image format.",
                    error="Image processing failed"
                )

        # Create template-aware system prompt (enhanced for image support)
        if request.template_content and request.template_name:
            # Template-aware mode (with optional image support)
            image_instructions = ""
            if image_part:
                image_instructions = f"""
📸 IMAGE ANALYSIS INSTRUCTIONS:
I can see an uploaded image. Use this image as visual reference for:
- Layout inspiration and design elements
- Styling cues (fonts, spacing, formatting)
- Content organization and section structure
- Color schemes and visual hierarchy
- Job posting analysis (if it's a job description)

APPLY IMAGE INSIGHTS:
- If it's a resume design: Adapt the visual layout using template commands
- If it's a job posting: Optimize content for the job requirements  
- If it's formatting reference: Apply similar styling within template constraints
- If showing layout issues: MAKE THE REQUESTED CHANGES even if they seem minor
- Always respect the template's available commands and structure

IMPORTANT: When user shows screenshots or describes layout changes, ALWAYS make modifications. Don't refuse layout requests.

"""

            system_prompt = f"""You are a LaTeX resume editor specialized in the {request.template_name} template. Your goal: generate clean, ATS-friendly code using ONLY the template's defined commands and structure.

TEMPLATE ANALYSIS - {request.template_name.upper()}:
{request.template_content}

TEMPLATE UNDERSTANDING:
Based on the template above, I can see the available commands, environments, and structure. I will use ONLY these defined elements and follow the template's conventions exactly.

{image_instructions}

STRICT RULES:
1. ✅ USE ONLY: Commands and environments defined in the template above
2. ❌ NEVER INVENT: New commands, custom layouts, or structures not in the template
3. ❌ NO CONTENT before \\begin{{document}}
4. ✅ SIMPLE CHANGES ONLY: Adjust text, use template's formatting commands appropriately
5. ✅ FOLLOW TEMPLATE STRUCTURE: Use the exact sectioning and formatting approach defined in the template

CURRENT LATEX:
{request.current_latex}

CONVERSATION HISTORY:
{build_conversation_context(request.conversation_history)}

USER REQUEST: {request.message}

CRITICAL INSTRUCTIONS:
- Return ONLY the complete, clean LaTeX code
- NO JSON, NO explanations, NO markdown code blocks
- Start with \\documentclass and end with \\end{{document}}
- ALWAYS make requested changes - don't refuse layout modifications
- Use template-defined commands appropriately
- For education/timeline/GPA requests: rearrange content as specified
- Preserve all backslashes and LaTeX syntax exactly

OUTPUT: Clean LaTeX code only"""
        else:
            # Fallback mode (generic professional_resume.cls with optional image support)
            image_instructions = ""
            if image_part:
                image_instructions = f"""
📸 IMAGE ANALYSIS INSTRUCTIONS:
I can see an uploaded image. Use this image as visual reference for:
- Layout inspiration and design elements
- Styling cues (fonts, spacing, formatting)  
- Content organization and section structure
- Job posting analysis (if it's a job description)

APPLY IMAGE INSIGHTS:
- If it's a resume design: Adapt the visual layout using available professional_resume.cls commands
- If it's a job posting: Optimize content for the job requirements
- If it's formatting reference: Apply similar styling within template constraints
- If showing layout issues: MAKE THE REQUESTED CHANGES even if they seem minor
- Always respect the professional_resume.cls template structure

IMPORTANT: When user shows screenshots or describes layout changes, ALWAYS make modifications. Don't refuse layout requests.

"""

            system_prompt = f"""You are a LaTeX resume editor specialized in the professional_resume.cls template. Your goal: generate clean, ATS-friendly code using ONLY the template's defined commands.

MANDATORY TEMPLATE STRUCTURE:
\\documentclass{{professional_resume}}
\\begin{{document}}
\\name{{Full Name}}
\\address{{contact info line 1}}
\\address{{contact info line 2}}
\\begin{{rSection}}{{Section Title}}
\\begin{{rSubsection}}{{Title}}{{Dates}}{{Subtitle}}{{Location}}
\\resumeItem{{Bullet point}}
\\end{{rSubsection}}
\\end{{rSection}}
\\end{{document}}

{image_instructions}

STRICT RULES:
1. ✅ USE ONLY: \\name, \\address, \\rSection, \\rSubsection, \\resumeItem, \\textbf, \\textit, \\Large
2. ❌ NEVER USE: \\newcommand, \\begin{{center}}, \\begin{{tabular}}, custom layouts, complex formatting
3. ❌ NO CONTENT before \\begin{{document}}
4. ✅ LAYOUT CHANGES: Rearrange \\rSubsection parameters as requested (Title, Dates, Subtitle, Location)
5. ✅ EDUCATION FORMATTING: Move GPA/timeline between fields as user specifies

CURRENT LATEX:
{request.current_latex}

CONVERSATION HISTORY:
{build_conversation_context(request.conversation_history)}

USER REQUEST: {request.message}

CRITICAL INSTRUCTIONS:
- Return ONLY the complete, clean LaTeX code
- NO JSON, NO explanations, NO markdown code blocks  
- Start with \\documentclass and end with \\end{{document}}
- ALWAYS make requested changes - don't refuse layout modifications
- Use template commands appropriately for layout changes
- For education/timeline/GPA requests: rearrange \\rSubsection parameters as specified
- Preserve all backslashes and LaTeX syntax exactly

OUTPUT: Clean LaTeX code only"""

        try:
            mode_type = "image-aware" if image_part else ("template-aware" if request.template_content else "generic")
            logger.info(f"📤 BACKEND: Sending {mode_type} prompt to Gemini")
            
            # Prepare content for AI (text + optional image)
            content_parts = [types.Part(text=system_prompt)]
            if image_part:
                content_parts.append(image_part)
                logger.info("📸 BACKEND: Including image in AI request")
            
            # Generate response using new SDK with multimodal support
            logger.info(f"🔧 BACKEND: Sending to Gemini - Parts: {len(content_parts)}, Has Image: {bool(image_part)}")
            
            response = client.models.generate_content(
                model='gemini-2.5-flash-preview-05-20',
                contents=[types.Content(parts=content_parts, role="user")],
                config=types.GenerateContentConfig(
                    temperature=0.2,  # Low for consistent LaTeX code generation
                    top_p=0.9,  # Balanced focus with some creativity for user interaction
                    top_k=32,  # Moderate vocabulary for LaTeX consistency
                    max_output_tokens=8192,  # Higher limit for comprehensive LaTeX
                    candidate_count=1,  # Single best response
                    response_mime_type="text/plain",  # Ensure clean text output
                )
            )
            
            logger.info(f"📥 BACKEND: Received response from Gemini: {response.text[:200]}...")
            
            if not response.text:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Empty response from AI model"
                )
            
            # Clean the response - remove any markdown blocks if present
            clean_latex = response.text.strip()
            
            # Remove markdown code blocks if AI ignored instructions
            if clean_latex.startswith('```latex'):
                clean_latex = clean_latex[7:]
            elif clean_latex.startswith('```'):
                clean_latex = clean_latex[3:]
                
            if clean_latex.endswith('```'):
                clean_latex = clean_latex[:-3]
                
            clean_latex = clean_latex.strip()
            
            # Basic validation
            if not clean_latex.startswith('\\documentclass'):
                logger.warning(f"⚠️ AI response doesn't start with \\documentclass: {clean_latex[:100]}")
                # Don't apply if it's not valid LaTeX
                return ChatResponse(
                    success=True,
                    response="I couldn't generate valid LaTeX. Please try rephrasing your request.",
                    modified_latex=None
                )
            
            if not clean_latex.endswith('\\end{document}'):
                clean_latex += '\n\\end{document}'
            
            logger.info(f"✅ BACKEND: Successfully processed clean LaTeX (length: {len(clean_latex)})")
            
            # 🔍 CHANGE DETECTION: Compare original vs modified LaTeX
            original_latex_clean = request.current_latex.strip()
            generated_latex_clean = clean_latex.strip()
            
            if original_latex_clean == generated_latex_clean:
                logger.info("ℹ️ BACKEND: No changes detected - LaTeX is identical")
                return ChatResponse(
                    success=True,
                    response="No changes were needed for your request. Your resume already looks good, or I couldn't identify specific modifications to make based on your request. Please try being more specific about what you'd like to change.",
                    modified_latex=None
                )
            else:
                logger.info(f"✅ BACKEND: Changes detected - Original: {len(original_latex_clean)} chars, Modified: {len(generated_latex_clean)} chars")
                return ChatResponse(
                    success=True,
                    response="I've updated your resume with the requested changes.",
                    modified_latex=clean_latex
                )
                
        except Exception as gemini_error:
            logger.error(f"❌ BACKEND: Gemini API error: {str(gemini_error)}")
            
            # Fallback response if Gemini API fails
            return ChatResponse(
                success=True,
                response="I'm having trouble processing your request right now. Please try again later or be more specific about what you'd like to change.",
                modified_latex=None,
                error="AI service temporarily unavailable"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ BACKEND: Unexpected error in AI chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request"
        )

def build_conversation_context(conversation_history: Optional[List[ConversationMessage]]) -> str:
    """Build conversation context from history"""
    if not conversation_history:
        return "This is the start of the conversation."
    
    context_lines = []
    for msg in conversation_history[-6:]:  # Only use last 6 messages for context
        role_label = "USER" if msg.role == "user" else "ASSISTANT"
        context_lines.append(f"{role_label}: {msg.content}")
    return "\n".join(context_lines)

@router.get("/status")
async def get_ai_status():
    """
    Check if AI service is available
    """
    try:
        client = get_gemini_client()
        if not client:
            return {
                "status": "unavailable",
                "message": "GEMINI_API_KEY not configured"
            }
        
        # Quick test of the API
        test_response = client.models.generate_content(
            model='gemini-2.5-flash-preview-05-20',
            contents="Hello",
            config=types.GenerateContentConfig(
                temperature=0.1,  # Very low for simple test
                top_p=0.95,
                top_k=20,
                max_output_tokens=50,  # Slightly higher for proper response
                response_mime_type="text/plain"
            )
        )
        
        if test_response.text:
            return {
                "status": "available",
                "message": "AI service is ready"
            }
        else:
            return {
                "status": "error",
                "message": "AI service responded but with empty content"
            }
            
    except Exception as e:
        logger.error(f"AI status check failed: {str(e)}")
        return {
            "status": "error",
            "message": f"AI service error: {str(e)}"
        } 