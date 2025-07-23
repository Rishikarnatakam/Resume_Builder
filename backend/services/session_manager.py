"""
AI Chat Session Manager - Proper Chat Sessions
Uses Gemini's native chat sessions with context set ONCE at start
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional, AsyncGenerator
import google.generativeai as genai
import os
# Set the global API key for GenerativeModel API
API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)
from sqlalchemy.ext.asyncio import AsyncSession
import base64

from database import AIChatSession
from utils.config import get_gemini_model
from utils.prompt_composer import prompt_composer

logger = logging.getLogger(__name__)

class ChatSessionManager:
    """Smart session manager using proper Gemini chat sessions"""
    
    def __init__(self):
        self.model_name = get_gemini_model()
        self.active_chats = {}  # Store active chat sessions
        self.active_models = {}  # Store model instances for each session
        
    async def create_session(
        self, 
        db: AsyncSession,
        resume_id: str, 
        user_id: str,
        form_data: Dict[str, Any],
        template_content: str,
        template_instructions: str = "",
        job_description: Optional[str] = None,
        template_name: str = None  # Add template_name as explicit argument
    ) -> str:
        """Create chat session with context set ONCE"""
        # Commented out to reduce terminal clutter. Uncomment for debugging.
        # logger.info(f"🚀 SESSION: Creating chat session for resume {resume_id}")
        
        # Use the template_name passed from the frontend (trust the client)
        if not template_name:
            logger.error(f"❌ SESSION: No template_name provided!")
            raise Exception("No template_name provided for session creation")
        # logger.info(f"✅ SESSION: Using template_name from request: {template_name}")
        
        # Build initial context using prompt composer
        initial_context = self._build_initial_context(
            template_name=template_name,
            form_data=form_data,
            job_description=job_description
        )
        
        # Create Gemini model and start chat
        model = genai.GenerativeModel(self.model_name)
        
        # Start chat with initial context
        chat = model.start_chat(history=[
            {
                "role": "user",
                "parts": [initial_context]
            },
            {
                "role": "model", 
                "parts": ["Perfect! I understand your resume template, instructions, and data. I'm ready to help you edit your LaTeX resume. Just send me your current LaTeX code and tell me what you'd like to change, and I'll refer back to all the context we just established."]
            }
        ])
        
        # Generate session ID
        session_id = f"chat_session_{datetime.utcnow().timestamp()}_{resume_id}"
        
        # Store chat session in memory
        self.active_chats[session_id] = chat
        self.active_models[session_id] = model
        
        # Store session in database
        session = AIChatSession(
            id=session_id,
            resume_id=resume_id,
            user_id=user_id,
            template_content=template_content,  # Required by database
            form_data=json.dumps(form_data),    # Required by database
            conversation_history=json.dumps([]),
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(session)
        await db.commit()
        
        # logger.info(f"✅ SESSION: Created session {session_id}")
        return session_id

    async def send_message(
        self,
        db: AsyncSession,
        session_id: str,
        user_message: str,
        current_latex: str,
        image_data: Optional[str] = None,
        pdf_data: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send message using native chat session - NO massive context!"""
        # logger.info(f"💬 SESSION: Processing message in session {session_id}")
        
        # Get session from database
        session = await self._get_session(db, session_id)
        if not session:
            raise Exception(f"Session {session_id} not found")
        
        # Get chat from memory
        chat = self.active_chats.get(session_id)
        model = self.active_models.get(session_id)
        if not chat:
            # Reconstruct chat from conversation history if needed
            chat = await self._reconstruct_chat(session)
            self.active_chats[session_id] = chat
            # Also reconstruct the model
            model = genai.GenerativeModel(self.model_name)
            self.active_models[session_id] = model
        
        # Build simple prompt - just the essentials!
        simple_prompt = self._build_simple_prompt(current_latex, user_message)
        
        try:
            # Handle attachments if provided
            message_parts = [simple_prompt]
            
            if image_data:
                # Process image
                processed_image = await self._process_image_attachment(image_data)
                message_parts.append(processed_image)
                # logger.info("📸 SESSION: Added image to message")
            
            if pdf_data:
                # Process PDF  
                processed_pdf = await self._process_pdf_attachment(pdf_data)
                if processed_pdf:
                    message_parts.append(processed_pdf)
                # logger.info("📄 SESSION: Added PDF to message")
            
            # Print the exact prompt sent to Gemini for chat messages
            print("==== GEMINI CHAT PROMPT START ====")
            print(simple_prompt)
            print("==== GEMINI CHAT PROMPT END ====")
            # Send to chat session - AI remembers all previous context!
            response = chat.send_message(message_parts)
            response_text = response.text.strip()
            print("==== GEMINI CHAT RESPONSE START ====")
            print(response_text)
            print("==== GEMINI CHAT RESPONSE END ====")
            
            # --- Token/Word Count Logging ---
            def simple_token_word_count(text):
                cleaned = text.replace('\n', ' ').replace('\r', ' ').strip()
                words = cleaned.split()
                word_count = len(words)
                token_estimate = int(word_count * 1.3)  # 1 word ≈ 1.3 tokens for code/JSON
                print(f"🔢 AI Response Word Count: {word_count}")
                print(f"🔢 AI Response Estimated Token Count: {token_estimate}")
                return word_count, token_estimate

            simple_token_word_count(response_text)
            # --- End Logging ---

            # --- Robust JSON Extraction ---
            import re
            import json
            def escape_backslashes(s):
                # Replace single backslashes not already doubled or part of an escape
                return re.sub(r'(?<!\\)\\(?![\\"/bfnrtu])', r'\\\\', s)
            clean_response = response_text.strip()
            # Remove code block markers if present
            clean_response = re.sub(r'^```json\s*', '', clean_response, flags=re.IGNORECASE)
            clean_response = re.sub(r'^```\s*', '', clean_response)
            clean_response = re.sub(r'\s*```$', '', clean_response)
            # Extract the first JSON object in the string
            match = re.search(r'\{.*\}', clean_response, re.DOTALL)
            if match:
                json_content = match.group(0)
                json_content = escape_backslashes(json_content)
                patch_data = json.loads(json_content)
                # ... continue as before (existing logic for patch_data)
                if patch_data.get('type') == 'patch':
                    operations = patch_data.get('operations', [])
                    message = patch_data.get('message', 'Task completed')
                    await self._update_conversation_history(db, session, user_message, message)
                    return {
                        "success": True,
                        "response": message,
                        "patch_data": patch_data
                    }
                else:
                    pass  # Invalid patch format, fallback below
            else:
                # Fallback: return error
                return {
                    "success": False,
                    "response": "I had trouble understanding that request. Please try rephrasing it, and I'll respond in the proper format.",
                    "error": "No valid JSON object found in AI response."
                }
            
            # If we get here, no valid JSON was found
            # logger.error(f"❌ SESSION: No valid JSON patch found in response")
            return {
                "success": False,
                "response": "I had trouble formatting my response correctly. Please try your request again.",
                "error": "No valid JSON patch format detected"
            }
            
        except Exception as e:
            print("==== GEMINI CHAT ERROR ====")
            print(repr(e))
            print("==== GEMINI CHAT ERROR END ====")
            return {
                "success": False,
                "response": "I encountered an error processing your request. Please try again.",
                "error": str(e)
            }

    def _build_initial_context(
        self, 
        template_name: str, 
        form_data: Dict[str, Any], 
        job_description: Optional[str]
    ) -> str:
        """Build the initial context using prompt composer"""
        
        # Use prompt composer to build conversation prompt
        conversation_prompt = prompt_composer.build_conversation_prompt(template_name)
        
        # Add user data context
        context_parts = [
            conversation_prompt,
            "",
            "# Current Session Context",
            f"Template: {template_name}",
            "",
            "# User Resume Data",
            json.dumps(form_data, indent=2)
        ]
        
        if job_description and job_description.strip():
            context_parts.extend([
                "",
                "# Job Description", 
                job_description,
                "",
                "Apply professional resume writing principles when tailoring content for this role."
            ])
        
        context_parts.extend([
            "",
            "Remember: Always respond in JSON patch format with operations and message fields.",
            "I'll send you current LaTeX code and requests, and you should help me edit accordingly."
        ])
        
        initial_context = "\n".join(context_parts)
        # Add Gemini prompt/context prints for session initialization
        print("==== GEMINI SESSION INIT PROMPT START ====")
        print(initial_context)
        print("==== GEMINI SESSION INIT PROMPT END ====")
        return initial_context

    def _build_simple_prompt(self, current_latex: str, user_message: str) -> str:
        """Build simple prompt - always request patch format for consistency"""
        
        # Split current LaTeX into numbered lines for AI reference
        latex_lines = current_latex.split('\n')
        numbered_latex = '\n'.join([f"{i+1:3d}: {line}" for i, line in enumerate(latex_lines)])

        return f"""Current LaTeX code (with line numbers):
```latex
{numbered_latex}
```

Request: {user_message}

🚨 CRITICAL: Always respond in this JSON patch format (no exceptions):
{{"type": "patch", "operations": [...], "message": "Your response message here"}}

RESPONSE RULES:
- **Keep messages SHORT** - use 1-3 words by default: "Done!", "Fixed!", "Perfect!"
- **Encourage interaction** - end with: "More changes?" "What else?" "Need anything?"
- **Only explain if user asks "why" or "how"** - save tokens otherwise
- **Be friendly but brief** - warm tone in minimal words

Instructions:
- If the request requires changes to the LaTeX code, put the changes in "operations"
- If the request is just a question or doesn't need changes, leave "operations" as an empty array []
- Always put your response/explanation in the "message" field
- Use natural, helpful language in the message

Valid operations for LaTeX changes:
- {{"op": "replace", "line": 8, "content": "new content here"}}
- {{"op": "insert", "line": 8, "content": "new line to add after line 8"}}
- {{"op": "delete", "line": 8}}

IMPORTANT:
- Line numbers are 1-indexed (first line = 1)
- "content" must be a single string, not an array
- For multiple lines, use multiple operations
- ALWAYS return valid JSON in this exact format
- Even for questions/explanations, use this format with empty operations array

Examples:
- For "Why is my margin off?": {{"type": "patch", "operations": [], "message": "Margins look fine! More changes?"}}
- For "Make my name bold": {{"type": "patch", "operations": [{{"op": "replace", "line": 5, "content": "\\name{{\\textbf{{John Doe}}}}"}}], "message": "Name now bold. What else?"}}

Return ONLY the JSON, nothing else."""

    async def _process_image_attachment(self, image_data: str):
        """Process image for Gemini"""
        try:
            # Handle data URL format
            if image_data.startswith('data:image/'):
                header, base64_data = image_data.split(',', 1)
                mime_type = "image/jpeg"  # Default
                if 'png' in header:
                    mime_type = "image/png"
                elif 'webp' in header:
                    mime_type = "image/webp" 
                elif 'jpeg' in header:
                    mime_type = "image/jpeg"
                elif 'jpg' in header:
                    mime_type = "image/jpeg"
                else:
                    mime_type = "image/jpeg"
            else:
                base64_data = image_data
                mime_type = "image/jpeg"
            
            # Decode and create image part
            import io
            import PIL.Image
            decoded = base64.b64decode(base64_data)
            image = PIL.Image.open(io.BytesIO(decoded))
            
            return image
                
        except Exception as e:
            logger.error(f"❌ SESSION: Error processing image: {e}")
            raise Exception(f"Image processing failed: {e}")

    async def _process_pdf_attachment(self, pdf_data: str):
        """Process PDF for Gemini"""
        try:
            # Decode base64 PDF data to binary
            decoded_pdf = base64.b64decode(pdf_data)
            
            # Create a temporary file-like object for Gemini
            import io
            pdf_io = io.BytesIO(decoded_pdf)
            
            # Create Gemini document part
            import google.generativeai as genai
            pdf_part = {
                "mime_type": "application/pdf",
                "data": decoded_pdf
            }
            
            # logger.info(f"✅ SESSION: PDF processed successfully for Gemini - Size: {len(decoded_pdf)} bytes")
            return pdf_part
                
        except Exception as e:
            logger.error(f"❌ SESSION: Error processing PDF: {e}")
            raise Exception(f"PDF processing failed: {e}")

    async def _reconstruct_chat(self, session: AIChatSession) -> genai.ChatSession:
        """Reconstruct chat session from conversation history if needed"""
        # logger.info(f"🔄 SESSION: Reconstructing chat session {session.id}")
        
        # Get conversation history
        history = json.loads(session.conversation_history)
        
        # Build history for Gemini chat
        chat_history = []
        for msg in history:
            if msg.get("role") == "user":
                chat_history.append({"role": "user", "parts": [msg.get("content", "")]})
            elif msg.get("role") == "assistant":
                chat_history.append({"role": "model", "parts": [msg.get("content", "")]})
        
        # Create model and start chat with history
        model = genai.GenerativeModel(self.model_name)
        chat = model.start_chat(history=chat_history)
        
        return chat

    async def _update_conversation_history(
        self, 
        db: AsyncSession, 
        session: AIChatSession, 
        user_message: str, 
        ai_response: str
    ):
        """Update conversation history in database"""
        history = json.loads(session.conversation_history)
        
        history.extend([
            {
                "role": "user",
                "content": user_message,
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "role": "assistant", 
                "content": ai_response,
                "timestamp": datetime.utcnow().isoformat()
            }
        ])
        
        session.conversation_history = json.dumps(history)
        session.updated_at = datetime.utcnow()
        await db.commit()

    async def get_session_info(self, db: AsyncSession, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        session = await self._get_session(db, session_id)
        if not session:
            return None
            
        history = json.loads(session.conversation_history)
            
        return {
            "id": session.id,
            "resume_id": session.resume_id,
            "is_active": session.is_active,
            "session_type": "native_chat",
            "conversation_count": len([msg for msg in history if msg.get("role") == "user"]),
            "created_at": session.created_at.isoformat()
        }

    async def end_session(self, db: AsyncSession, session_id: str) -> bool:
        """End session and cleanup"""
        session = await self._get_session(db, session_id)
        if not session:
            return False
            
        # Remove from active chats
        if session_id in self.active_chats:
            del self.active_chats[session_id]
        
        # Mark as inactive in database
        session.is_active = False
        session.updated_at = datetime.utcnow()
        await db.commit()
        
        logger.info(f"✅ SESSION: Ended session {session_id}")
        return True

    async def _get_session(self, db: AsyncSession, session_id: str) -> Optional[AIChatSession]:
        """Get session from database"""
        session = await db.get(AIChatSession, session_id)
        if not session:
            logger.warning(f"⚠️ SESSION: Session {session_id} not found")
        return session

# Global instance
session_manager = ChatSessionManager()