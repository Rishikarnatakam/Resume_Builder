"""
AI Chat Session Manager - Proper Chat Sessions
Uses Gemini's native chat sessions with context set ONCE at start
"""

import logging
import json
import re
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
        prompt_str = self._build_simple_prompt(current_latex, user_message)
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
                            json_data = json.loads(json_str)
                        else:
                            # Fallback: try parsing the entire response
                            json_data = json.loads(response_text_clean)
                        print(f"🔧 DEBUG: Parsed JSON data: {json_data}")
                        message = json_data.get('message', 'No message provided')
                        operations = json_data.get('operations', [])
                        
                        print(f"🔧 DEBUG: Extracted message: {message}")
                        print(f"🔧 DEBUG: Extracted operations: {operations}")
                        print(f"🔧 DEBUG: Operations count: {len(operations) if operations else 0}")
                        
                        # Send JSON operations directly to frontend (client-side processing)
                        patch_data = Patch(
                            type="patch",
                            diff_text="",  # Empty - frontend will handle conversion
                            operations=operations,
                            message=message
                        )
                        print(f"🔧 DEBUG: Created patch_data: {patch_data.dict()}")
                    except json.JSONDecodeError as e:
                        print(f"❌ Error parsing JSON: {e}")
                        patch_data = Patch(
                            type="patch",
                            diff_text="",
                            operations=[],
                            message="Sorry, I couldn't process that. Please try rephrasing your request."
                        )
                else:
                    # Fallback: treat as message-only response
                    patch_data = Patch(
                        type="patch",
                        diff_text="",
                        operations=[],
                        message=response_text_clean if response_text_clean else "No changes needed."
                    )
            except Exception as e:
                print(f"❌ Error parsing response: {e}")
                patch_data = Patch(
                    type="patch", 
                    diff_text="", 
                    operations=[],
                    message="Sorry, I couldn't process that. Please try rephrasing your request."
                )
            
            await self._update_conversation_history(db, session, user_message, patch_data.message)
            
            # Success should be true for any valid response, even with empty operations
            success = patch_data.type == "patch"
            
            return {
                "success": success,
                "response": patch_data.message,
                "patch_data": patch_data.dict()
            }
            
        except Exception as e:
            print("==== GEMINI CHAT ERROR ====")
            print(repr(e))
            print("==== GEMINI CHAT ERROR END ====")
            return {
                "success": False,
                "response": "I encountered an error processing your request. Please try again.",
                "patch_data": {
                    "type": "patch",
                    "diff_text": "",
                    "message": "Sorry, I couldn't process that. Please try rephrasing your request."
                },
                "error": str(e)
            }

    @staticmethod
    def _build_initial_context_json(template_name: str, form_data: Dict[str, Any], job_description: Optional[str]) -> str:
        """Build the initial context using prompt composer"""
        
        # Use prompt composer to build conversation prompt as JSON
        prompt_json = prompt_composer.build_conversation_prompt(template_name, user_data=form_data, job_description=job_description)
        # Serialize the JSON prompt to a string for Gemini
        prompt_str = json.dumps(prompt_json, ensure_ascii=False, indent=2)
        return prompt_str



    @staticmethod
    def _validate_and_fix_latex(latex_code: str) -> str:
        """Validate and fix common LaTeX errors"""
        if not latex_code:
            return latex_code
            
        lines = latex_code.split('\n')
        fixed_lines = []
        section_count = {}
        
        for line in lines:
            # Count sections to prevent duplicates
            if '\\rSection{' in line:
                section_name = line.split('{')[1].split('}')[0] if '{' in line and '}' in line else 'unknown'
                section_count[section_name] = section_count.get(section_name, 0) + 1
                # Skip duplicate sections
                if section_count[section_name] > 1:
                    continue
                    
            # Remove content after \end{document}
            if '\\end{document}' in line:
                fixed_lines.append(line)
                break
                
            # Skip lines after \end{document}
            if any('\\end{document}' in prev_line for prev_line in fixed_lines):
                continue
                
            # Fix common tabular issues
            if '\\begin{tabular}' in line and '\\item' in line:
                # Replace tabular with simple text for skills
                continue
                
            fixed_lines.append(line)
            
        return '\n'.join(fixed_lines)



    def _build_simple_prompt(self, current_latex: str, user_message: str) -> str:
        """Build simple prompt - request JSON operations format for efficiency and reliability"""

        # Add line numbers to help AI with accuracy
        latex_lines = current_latex.split('\n')
        numbered_latex = '\n'.join([f"{i+1:3d}: {line}" for i, line in enumerate(latex_lines)])
        
        return (
            "🤔 CONTEXT AWARENESS: Before responding, actively think about the template instructions, user data, and rules provided in the session context. Consider the template limitations, font sizing rules, and formatting requirements.\n\n"
            "Current LaTeX code (with line numbers):\n"
            "```latex\n"
            f"{numbered_latex}\n"
            "```\n\n"
            f"Request: {user_message}\n\n"
            "🚨 JSON OPERATIONS FORMAT (TOKEN-EFFICIENT):\n"
            "Return ONLY a JSON object with this structure:\n"
            "```json\n"
            "{\n"
            '  "message": "natural friendly message",\n'
            '  "operations": [\n'
            '    {\n'
            '      "type": "delete|add|replace|delete_range|add_multiple|replace_range|move_section|reorder_items",\n'
            '      "line": 16,\n'
            '      "content": "new content (for add/replace)",\n'
            '      "start_line": 20,\n'
            '      "end_line": 25,\n'
            '      "section_name": "Projects",\n'
            '      "from_index": 3,\n'
            '      "to_index": 1\n'
            '    }\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "📝 OPERATION TYPES & EXAMPLES:\n\n"
            "1. BASIC LINE OPERATIONS:\n"
            "```json\n"
            "{\n"
            '  "message": "Removed summary section",\n'
            '  "operations": [\n'
            '    {"type": "delete", "line": 16},\n'
            '    {"type": "delete", "line": 17}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "```json\n"
            "{\n"
            '  "message": "Added new skill",\n'
            '  "operations": [\n'
            '    {"type": "add", "line": 25, "content": "\\item JavaScript"}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "```json\n"
            "{\n"
            '  "message": "Updated name",\n'
            '  "operations": [\n'
            '    {"type": "replace", "line": 10, "content": "\\\\name{John Doe}"}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "2. MULTI-LINE OPERATIONS:\n"
            "```json\n"
            "{\n"
            '  "message": "Removed entire section",\n'
            '  "operations": [\n'
            '    {"type": "delete_range", "start_line": 20, "end_line": 35}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "```json\n"
            "{\n"
            '  "message": "Added new project",\n'
            '  "operations": [\n'
            '    {"type": "add_multiple", "line": 40, "content": [\n'
            '      "\\\\begin{rSubsection}{Project Name}{2024}{Tech Stack}{URL}",\n'
            '      "\\\\item Achievement 1",\n'
            '      "\\\\item Achievement 2",\n'
            '      "\\\\end{rSubsection}"\n'
            '    ]}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "```json\n"
            "{\n"
            '  "message": "Updated project details",\n'
            '  "operations": [\n'
            '    {"type": "replace_range", "start_line": 25, "end_line": 28, "content": [\n'
            '      "\\\\item New achievement 1",\n'
            '      "\\\\item New achievement 2",\n'
            '      "\\\\item New achievement 3"\n'
            '    ]}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "3. SEMANTIC OPERATIONS:\n"
            "```json\n"
            "{\n"
            '  "message": "Moved project to top",\n'
            '  "operations": [\n'
            '    {"type": "move_section", "section_name": "Projects", "from_index": 3, "to_index": 1}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "```json\n"
            "{\n"
            '  "message": "Reordered skills",\n'
            '  "operations": [\n'
            '    {"type": "reorder_items", "section_name": "Skills", "changes": [\n'
            '      {"from": 3, "to": 1},\n'
            '      {"from": 1, "to": 2}\n'
            '    ]}\n'
            '  ]\n'
            "}\n"
            "```\n\n"
            "🎯 OPERATION SELECTION RULES:\n"
            "- Use SINGLE operations (delete/add/replace) for 1-2 line changes\n"
            "- Use RANGE operations (delete_range/add_multiple/replace_range) for 3+ line changes\n"
            "- Use SEMANTIC operations (move_section/reorder_items) for complex reordering\n"
            "- Keep messages short: 'Done!', 'Fixed!', 'Moved!'\n"
            "- Use line numbers (1-based) - COUNT CAREFULLY from the numbered LaTeX above\n"
            "- For semantic operations, use section names exactly as they appear in LaTeX\n"
            "- Always validate LaTeX syntax before returning\n"
            "- NEVER create duplicate sections\n"
            "- NEVER nest environments incorrectly\n"
            "- ALWAYS match \\begin/\\end pairs\n"
            "- NEVER use \\item outside proper environments\n"
            "- NEVER put content after \\end{document}\n"
            "- ALWAYS use template commands (\\rSection, \\rSubsection, \\rAward, \\rCertification, \\rSkills)\n"
            "- ALWAYS use template-specific skills formatting - check template instructions\n"
            "- CRITICAL: Double-check line numbers before returning - count from the numbered LaTeX above\n"
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