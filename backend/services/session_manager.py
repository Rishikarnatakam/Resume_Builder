"""
AI Chat Session Manager - Proper Chat Sessions
Uses Gemini's native chat sessions with context set ONCE at start
"""

import logging
import json
import re
from datetime import datetime
from typing import Dict, Any, Optional
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
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class Patch(BaseModel):
    type: str
    diff_text: str = ""  # Keep for backward compatibility
    operations: Optional[list] = None  # New structured operations format
    message: str

class ChatSessionManager:
    """Smart session manager using proper Gemini chat sessions"""
    
    def __init__(self):
        self.model_name = get_gemini_model()
        self.active_chats = {}  # Store active chat sessions
        self.active_models = {}  # Store model instances for each session
        self.session_data = {}  # Store template content and user data for each session
        
    async def create_session(
        self, 
        db: AsyncSession,
        resume_id: str, 
        user_id: str,
        form_data: Dict[str, Any],
        template_name: str,
        job_description: Optional[str] = None
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
        initial_context_json = ChatSessionManager._build_initial_context_json(
            template_name=template_name,
            form_data=form_data,
            job_description=job_description
        )
        print("==== GEMINI CHAT SESSION INIT PROMPT START ====")
        print(initial_context_json)
        print("==== GEMINI CHAT SESSION INIT PROMPT END ====")
        
        # Create Gemini model and start chat
        model = genai.GenerativeModel(self.model_name)
        
        # Start chat with initial context
        chat = model.start_chat(history=[
            {"role": "user", "parts": [initial_context_json]},
            {"role": "model", "parts": ["Perfect! I understand your resume template, instructions, and data. I'm ready to help you edit your LaTeX resume. I'll actively think about the template rules, user data, and formatting requirements before making any changes. What would you like to work on first?"]}
        ])
        print("==== GEMINI CHAT SESSION INIT RESPONSE START ====")
        print(chat.history)
        print("==== GEMINI CHAT SESSION INIT RESPONSE END ====")
        
        # Generate session ID
        session_id = f"chat_session_{datetime.utcnow().timestamp()}_{resume_id}"
        
        # Store chat session in memory
        self.active_chats[session_id] = chat
        self.active_models[session_id] = model
        
        # Store template content and user data for this session
        template_content = prompt_composer.read_template_content(template_name)
        self.session_data[session_id] = {
            'template_content': template_content,
            'user_data': form_data,
            'job_description': job_description
        }
        
        # Store session in database
        session = AIChatSession(
            id=session_id,
            resume_id=resume_id,
            user_id=user_id,
            template_content="",  # Empty string since we don't need it in prompt
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
        
        # Build prompt with line numbers and explicit patch instructions
        prompt_str = self._build_simple_prompt(session_id, current_latex, user_message)
        message_parts = [prompt_str]
        
        try:
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
            print(prompt_str)
            print("==== GEMINI CHAT PROMPT END ====")
            # For Gemini Flash models, do NOT pass response_mime_type, response_schema, or system_instruction
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

            # --- Robust JSON Operations Extraction ---
            patch_data = None
            try:
                # Extract JSON operations from response
                response_text_clean = response_text.strip()
                
                # Check if response contains JSON format (more flexible)
                if '{' in response_text_clean and '}' in response_text_clean:
                    try:
                        print(f"🔧 DEBUG: Attempting to parse JSON: {response_text_clean[:200]}...")
                        
                        # Try to extract JSON from the response
                        import re
                        json_match = re.search(r'\{.*\}', response_text_clean, re.DOTALL)
                        if json_match:
                            json_str = json_match.group(0)
                            print(f"🔧 DEBUG: Extracted JSON string: {json_str}")
                            # --- PATCH: Escape unescaped backslashes in LaTeX content fields ---
                            def escape_latex_in_json(json_str):
                                # Only escape backslashes that are not already escaped
                                # This is a simple heuristic: replace single backslash not followed by another backslash or a valid escape
                                import re
                                # Only inside string values: this is a best-effort fix for LaTeX
                                def replacer(match):
                                    content = match.group(0)
                                    # Replace single backslash with double, but not if already double
                                    return content.replace('\\', '\\\\').replace('"', '\\"')
                                # This regex finds all string values in JSON
                                # For a robust solution, use a JSON parser and walk the tree, but here we do a best-effort pre-pass
                                # Replace all single backslashes with double backslashes
                                return re.sub(r'(?<!\\)\\(?![\\"/bfnrtu])', r'\\\\', json_str)
                            json_str_escaped = escape_latex_in_json(json_str)
                            try:
                                json_data = json.loads(json_str_escaped)
                            except Exception as e:
                                print(f"❌ Error parsing JSON after escaping: {e}")
                                raise
                            print(f"🔧 DEBUG: Parsed JSON data: {json_data}")
                        else:
                            # Fallback: try parsing the entire response
                            json_data = json.loads(response_text_clean)
                        print(f"🔧 DEBUG: Parsed JSON data: {json_data}")
                        message = json_data.get('message', 'No message provided')
                        new_latex = json_data.get('new_latex', '')
                        
                        print(f"🔧 DEBUG: Extracted message: {message}")
                        print(f"🔧 DEBUG: Extracted new_latex length: {len(new_latex)}")
                        
                        # Create simple patch with new LaTeX
                        patch_data = Patch(
                            type="simple_patch",
                            diff_text="",  # Not used in simple approach
                            operations=[],  # Not used in simple approach
                            message=message
                        )
                        
                        # Add new_latex to the response
                        patch_data_dict = patch_data.dict()
                        patch_data_dict['new_latex'] = new_latex
                        print(f"🔧 DEBUG: Created patch_data: {patch_data_dict}")
                    except json.JSONDecodeError as e:
                        print(f"❌ Error parsing JSON: {e}")
                        # JSON parsing failed - this should not count as success
                        patch_data_dict = {
                            "type": "parse_error_patch",
                            "diff_text": "",
                            "operations": [],
                            "message": "No response received.",
                            "new_latex": ""
                        }
                else:
                    # No JSON found in response - treat as parsing error
                    patch_data_dict = {
                        "type": "parse_error_patch",
                        "diff_text": "",
                        "operations": [],
                        "message": "No response received.",
                        "new_latex": ""
                    }
            except Exception as e:
                print(f"❌ Error parsing response: {e}")
                patch_data_dict = {
                    "type": "parse_error_patch", 
                    "diff_text": "", 
                    "operations": [],
                    "message": "Sorry, I couldn't process that. Please try rephrasing your request.",
                    "new_latex": ""
                }
            
            await self._update_conversation_history(db, session, user_message, patch_data_dict['message'])
            
            # Success should be true only when we got a valid parsed response with actual content
            # Check if we have meaningful content (not just error messages)
            has_valid_content = (
                patch_data_dict['type'] == "simple_patch" and
                patch_data_dict.get('new_latex', '').strip() and
                not patch_data_dict['message'].startswith('Sorry, I couldn\'t process') and
                not patch_data_dict['message'].startswith('No response received')
            )
            
            # Explicitly mark parsing errors as failures
            if patch_data_dict['type'] in ["parse_error_patch", "error_patch"]:
                has_valid_content = False
            
            return {
                "success": has_valid_content,
                "response": patch_data_dict['message'],
                "patch_data": patch_data_dict,
                "credits_deducted": has_valid_content  # Add flag to indicate if credits were deducted
            }
            
        except Exception as e:
            print("==== GEMINI CHAT ERROR ====")
            print(repr(e))
            print("==== GEMINI CHAT ERROR END ====")
            return {
                "success": False,
                "response": "I encountered an error processing your request. Please try again.",
                "patch_data": {
                    "type": "error_patch",  # Changed to indicate this is an error
                    "diff_text": "",
                    "operations": [],
                    "message": "Sorry, I couldn't process that. Please try rephrasing your request.",
                    "new_latex": ""
                },
                "error": str(e),
                "credits_deducted": False  # No credits deducted for errors
            }

    @staticmethod
    def _build_initial_context_json(template_name: str, form_data: Dict[str, Any], job_description: Optional[str]) -> str:
        """Build the initial context using improved prompt composer"""
        
        # Use improved prompt composer with form data emphasis
        prompt = prompt_composer.build_improved_conversation_prompt(template_name, user_data=form_data, job_description=job_description)
        return prompt


    def _build_simple_prompt(self, session_id: str, current_latex: str, user_message: str) -> str:
        """Build simple prompt for complete LaTeX replacement"""
        
        return (
            "CURRENT LATEX:\n"
            f"{current_latex}\n\n"
            f"USER REQUEST: {user_message}\n\n"
            "INSTRUCTIONS:\n"
            "Return ONLY a JSON object with 'message' field for your explanation and 'new_latex' field for the complete updated LaTeX code.\n\n"
            "REQUIRED FORMAT:\n"
            "{\n"
            '  "message": "Brief explanation of changes made",\n'
            '  "new_latex": "\\\\documentclass{...}\\n\\\\begin{document}\\n... complete latex code ...\\n\\\\end{document}"\n'
            "}\n\n"
            "CRITICAL RULES:\n"
            "- Return ONLY the JSON object, no other text\n"
            "- Put explanations in 'message' field only\n"
            "- Put complete LaTeX code in 'new_latex' field only\n"
            "- Double-escape all backslashes in LaTeX code\n"
            "- Include the complete LaTeX document from \\documentclass to \\end{document}\n"
            "- Think like a modern code editor - replace the whole file\n"
            "- Always include an empty line between sections in the LaTeX code for better readability\n"
        )

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