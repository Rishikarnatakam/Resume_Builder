"""
AI Chat Session Manager - Proper Chat Sessions
Uses Gemini's native chat sessions with context set ONCE at start
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
import google.generativeai as genai
from sqlalchemy.ext.asyncio import AsyncSession
import base64

from database import AIChatSession
from utils.config import get_gemini_model, get_gemini_api_key

logger = logging.getLogger(__name__)

class ChatSessionManager:
    """Smart session manager using proper Gemini chat sessions"""
    
    def __init__(self):
        genai.configure(api_key=get_gemini_api_key())
        self.model_name = get_gemini_model()
        # Store active chat sessions in memory
        self.active_chats: Dict[str, genai.ChatSession] = {}
        logger.info(f"🔧 SESSION: Initialized with model {self.model_name}")

    async def create_session(
        self, 
        db: AsyncSession,
        resume_id: str, 
        user_id: str,
        form_data: Dict[str, Any],
        template_content: str,
        template_instructions: str = "",
        job_description: Optional[str] = None
    ) -> str:
        """Create chat session with context set ONCE"""
        logger.info(f"🚀 SESSION: Creating chat session for resume {resume_id}")
        
        # Build initial context message (sent ONCE)
        initial_context = self._build_initial_context(
            template_content=template_content,
            template_instructions=template_instructions,
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
        
        # Store session metadata in database
        session = AIChatSession(
            id=session_id,
            resume_id=resume_id,
            user_id=user_id,
            cache_id=None,  # Not needed for native chat sessions
            cache_expires_at=None,
            template_content=template_content,
            form_data=json.dumps(form_data),  # Just store the raw form data
            conversation_history=json.dumps([
                {"role": "user", "content": "Initial context established", "timestamp": datetime.utcnow().isoformat()},
                {"role": "assistant", "content": "Ready to help with LaTeX resume editing", "timestamp": datetime.utcnow().isoformat()}
            ]),
            is_active=True
        )
        
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
        logger.info(f"✅ SESSION: Created session {session_id} with native chat memory")
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
        logger.info(f"💬 SESSION: Processing message in session {session_id}")
        
        # Get session from database
        session = await self._get_session(db, session_id)
        if not session:
            raise Exception(f"Session {session_id} not found")
        
        # Get chat from memory
        chat = self.active_chats.get(session_id)
        if not chat:
            # Reconstruct chat from conversation history if needed
            chat = await self._reconstruct_chat(session)
            self.active_chats[session_id] = chat
        
        # Build simple prompt - just the essentials!
        simple_prompt = self._build_simple_prompt(current_latex, user_message)
        
        try:
            # Handle attachments if provided
            message_parts = [simple_prompt]
            
            if image_data:
                # Process image
                processed_image = await self._process_image_attachment(image_data)
                message_parts.append(processed_image)
                logger.info("📸 SESSION: Added image to message")
            
            if pdf_data:
                # Process PDF  
                processed_pdf = await self._process_pdf_attachment(pdf_data)
                if processed_pdf:
                    message_parts.append(processed_pdf)
                logger.info("📄 SESSION: Added PDF to message")
            
            # Send to chat session - AI remembers all previous context!
            response = chat.send_message(message_parts)
            
            # Log token usage
            if hasattr(response, 'usage_metadata'):
                input_tokens = response.usage_metadata.prompt_token_count
                output_tokens = response.usage_metadata.candidates_token_count
                total_tokens = input_tokens + output_tokens
                logger.info(f"💰 TOKENS: Input: {input_tokens}, Output: {output_tokens}, Total: {total_tokens}")
            else:
                logger.info("💰 TOKENS: Usage metadata not available")
            
            # Parse AI response - could be JSON patch or full LaTeX
            response_text = response.text.strip()
            response_length = len(response_text)
            logger.info(f"🔍 SESSION: AI response length: {response_length} characters")
            logger.info(f"🔍 SESSION: AI response preview: {response_text[:100]}...")
            
            # Try to parse as JSON patch first
            try:
                import json
                import re
                
                # Clean up response text - remove markdown formatting if present
                clean_response = response_text
                if clean_response.startswith('```json'):
                    clean_response = re.sub(r'^```json\s*', '', clean_response)
                    clean_response = re.sub(r'\s*```$', '', clean_response)
                elif clean_response.startswith('```'):
                    clean_response = re.sub(r'^```\s*', '', clean_response)
                    clean_response = re.sub(r'\s*```$', '', clean_response)
                
                # Try to detect and fix common JSON issues
                if '{' in clean_response and '"type"' in clean_response:
                    logger.info(f"🔍 SESSION: Detected potential JSON, attempting to parse...")
                    # Extract JSON-like content
                    start_idx = clean_response.find('{')
                    end_idx = clean_response.rfind('}') + 1
                    if start_idx != -1 and end_idx > start_idx:
                        json_content = clean_response[start_idx:end_idx]
                        logger.info(f"🔍 SESSION: Extracted JSON content: {json_content}")
                        
                        # Try to parse the JSON
                        patch_data = json.loads(json_content)
                        if patch_data.get('type') == 'patch' and 'operations' in patch_data:
                            logger.info(f"✅ SESSION: Received JSON patch with {len(patch_data['operations'])} operations")
                            return {
                                "success": True,
                                "response": patch_data.get('message', 'Changes applied'),
                                "patch_data": patch_data,
                                "is_patch": True
                            }
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                logger.warning(f"⚠️ SESSION: Failed to parse JSON patch: {e}")
                # Not a valid JSON patch, continue with LaTeX extraction
                pass
            
            # Extract LaTeX and clean response (fallback for full code responses)
            latex_code = self._extract_latex_from_response(response_text)
            clean_response = self._clean_response_text(response_text, latex_code)
            
            # Update conversation history in database
            await self._update_conversation_history(db, session, user_message, clean_response)
            
            logger.info(f"✅ SESSION: Message processed successfully")
            
            return {
                "success": True,
                "response": clean_response,
                "modified_latex": latex_code,
                "is_patch": False
            }
            
        except Exception as e:
            logger.error(f"❌ SESSION: Error processing message: {str(e)}")
            return {
                "success": False,
                "response": "I encountered an error processing your request. Please try again.",
                "error": str(e)
            }

    def _build_initial_context(
        self, 
        template_content: str, 
        template_instructions: str,
        form_data: Dict[str, Any], 
        job_description: Optional[str]
    ) -> str:
        """Build the initial context message sent ONCE at session start"""
        
        context_parts = [
            "You are a LaTeX resume assistant. Here's the context for our entire conversation:",
            "",
            "=== TEMPLATE INSTRUCTIONS (FOLLOW THESE RULES) ===",
            template_instructions,
            "",
            "=== USER RESUME DATA ===",
            json.dumps(form_data, indent=2),
            "",
            "=== CONVERSATION GUIDELINES ===",
            "- You are a friendly, expert AI resume builder - not a LaTeX teacher",
            "- Be warm, helpful, and conversational while getting things done",
            "- Just DO what the user asks - don't explain HOW LaTeX works unless specifically asked", 
            "- When user asks for changes: Make them right away with a friendly confirmation",
            "- Use natural language like 'Perfect!', 'Got it!', 'There you go!', 'All set!'",
            "",
            "🚨 FORBIDDEN PHRASES - NEVER SAY THESE:",
            "- 'Here's your updated LaTeX code'",
            "- 'Here's the corrected code'", 
            "- 'Updated LaTeX resume'",
            "- 'The code is now'",
            "- 'Here's your LaTeX'",
            "- ANY mention of 'LaTeX' or 'code' in responses",
            "",
            "✅ REQUIRED RESPONSE EXAMPLES:",
            "- Instead of 'Here's your updated code with smaller name' → Say 'Done! Your name is now the perfect size.'",
            "- Instead of 'Here's the corrected code for your header' → Say 'Fixed! Your contact info now spans two lines.'",
            "- Instead of 'Updated LaTeX resume' → Say 'Perfect! Made that change for you.'",
            "- Focus on WHAT you changed, not HOW you changed it",
            "- When user asks to tailor: Apply professional resume writing principles",
            "- Write naturally flowing content, not keyword-stuffed text",
            "- Focus on showcasing relevant qualifications in a compelling way",
            "- Provide clean LaTeX code without comments",
            "- Remember user customizations throughout our conversation",
            "- Put LaTeX code in ```latex code blocks",
            "- Be encouraging and supportive - you're helping them build something important",
            "",
            "🚨 CRITICAL: CODE vs EXPLANATION RULES 🚨",
            "- ONLY provide LaTeX code when the user asks to CHANGE/ADD/MODIFY their resume content",
            "- When user asks WHY/EXPLAIN/WHAT CAUSES: Give text explanation ONLY, NO code examples",
            "- When user asks for template fixes: Clearly say 'This requires a template change' and explain",
            "- NEVER include example code snippets in explanations - they will replace the user's resume!",
            "- If you must show code structure, describe it in words, not actual code",
            "",
            "=== CRITICAL CODE FORMATTING RULE ===",
            "🚨 ALWAYS add an empty line after every \\cvsection{} command in your LaTeX code",
            "Example: \\cvsection{Education}",
            "         [EMPTY LINE HERE]",
            "         \\cvevent{...}",
            "",
            "=== TEMPLATE STRUCTURE REFERENCE ===",
            template_content[:2000] + "..." if len(template_content) > 2000 else template_content  # Truncate if too long
        ]
        
        if job_description and job_description.strip():
            context_parts.extend([
                "",
                "=== JOB DESCRIPTION ===", 
                job_description,
                "",
                "🎯 PROFESSIONAL RESUME WRITING:",
                "You are a professional resume writer helping tailor this resume for the job above.",
                "Apply resume writing best practices - write compelling, natural content that flows well.",
                "Think strategically about what employers want to see for this specific role.",
                "Focus on creating professional descriptions that showcase relevant qualifications naturally.",
                "Avoid keyword stuffing - instead, craft content that reads like a skilled professional wrote it.",
                "Make it ATS-friendly while maintaining readability and professional tone."
            ])
        
        context_parts.extend([
            "",
            "Remember all of this context for our conversation. I'll send you current LaTeX code and requests, and you should help me edit the resume accordingly."
        ])
        
        return "\n".join(context_parts)

    def _build_simple_prompt(self, current_latex: str, user_message: str) -> str:
        """Build simple prompt with just the essentials - AI remembers the context!"""
        
        # Detect type of request
        explanation_keywords = ['why', 'what causes', 'how does', 'explain why', 'tell me why', 'what makes']
        change_keywords = ['make', 'change', 'add', 'remove', 'modify', 'update', 'fix', 'create', 'bigger', 'smaller', 'larger', 'move', 'put']
        
        user_lower = user_message.lower()
        is_explanation = any(phrase in user_lower for phrase in explanation_keywords)
        is_change = any(word in user_lower for word in change_keywords)
        is_tailoring = 'ats-friendly' in user_lower and 'target position' in user_lower
        
        instruction = ""
        if is_tailoring:
            instruction = "\n🚨 TAILORING REQUEST: Generate complete tailored resume AND provide a summary of key changes made. Format response as: 'I've tailored your resume for [position]! Here are the key improvements I made: • [change 1] • [change 2] • [change 3]'"
        elif is_explanation and not is_change:
            instruction = "\n🚨 EXPLANATION REQUEST: Provide text explanation ONLY. Do NOT include any code examples."
        elif is_change:
            instruction = "\n🚨 PATCH REQUEST: Return ONLY valid JSON patch. No explanations, no markdown, no other text. Just pure JSON."
        
        # Split current LaTeX into numbered lines for AI reference
        latex_lines = current_latex.split('\n')
        numbered_latex = '\n'.join([f"{i+1:3d}: {line}" for i, line in enumerate(latex_lines)])

        if is_change:
            return f"""Current LaTeX code (with line numbers):
```latex
{numbered_latex}
```

Request: {user_message}

🚨 CRITICAL: Return ONLY this JSON format (no explanations, no markdown, no other text):
{{"type": "patch", "operations": [{{"op": "replace", "line": 8, "content": "new content here"}}], "message": "Done! Summary removed."}}

Valid operations:
- "replace": Change existing line content
- "insert": Add new line after specified line number  
- "delete": Remove specified line

IMPORTANT:
- Line numbers are 1-indexed (first line = 1)
- "content" must be a single string, not an array
- For multiple lines, use multiple operations
- Return ONLY the JSON, nothing else"""
        else:
            return f"""Current LaTeX code (with line numbers):
```latex
{numbered_latex}
```

Request: {user_message}{instruction}

Please help with this request, referring to the template and data we discussed at the start of our conversation."""

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
            
            logger.info(f"✅ SESSION: Image processed successfully for Gemini - Size: {len(decoded)} bytes")
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
            
            logger.info(f"✅ SESSION: PDF processed successfully for Gemini - Size: {len(decoded_pdf)} bytes")
            return pdf_part
                
        except Exception as e:
            logger.error(f"❌ SESSION: Error processing PDF: {e}")
            raise Exception(f"PDF processing failed: {e}")

    async def _reconstruct_chat(self, session: AIChatSession) -> genai.ChatSession:
        """Reconstruct chat session from conversation history if needed"""
        logger.info(f"🔄 SESSION: Reconstructing chat session {session.id}")
        
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

    def _extract_latex_from_response(self, response: str) -> Optional[str]:
        """Extract LaTeX code from AI response"""
        import re
        
        # Look for latex code blocks
        code_block_pattern = r'```(?:latex)?\s*\n(.*?)```'
        matches = re.findall(code_block_pattern, response, re.DOTALL)
        if matches:
            # PRESERVE EMPTY LINES - only strip leading/trailing whitespace from the entire block
            return matches[0].rstrip()
        
        # Look for \documentclass patterns
        doc_pattern = r'\\documentclass.*?\\end\{document\}'
        matches = re.findall(doc_pattern, response, re.DOTALL)
        if matches:
            # PRESERVE EMPTY LINES - only strip leading/trailing whitespace from the entire block
            return matches[0].rstrip()
        
        return None

    def _clean_response_text(self, response: str, latex_code: Optional[str]) -> str:
        """Remove LaTeX code from response to show only conversational part"""
        import re
        
        if latex_code:
            # Remove code blocks
            response = re.sub(r'```(?:latex)?\s*\n.*?```', '', response, flags=re.DOTALL)
            # Remove the LaTeX code itself
            response = response.replace(latex_code, '')
        
        # Clean up extra whitespace
        lines = [line.strip() for line in response.split('\n') if line.strip()]
        cleaned_response = '\n'.join(lines)
        
        # If response is empty or very short after cleaning, provide a friendly response
        if latex_code and (not cleaned_response or len(cleaned_response.strip()) < 10):
            friendly_responses = [
                "Perfect! I've made that change for you.",
                "Got it! Your resume has been updated.",
                "There you go! All set with that change.",
                "Done! That looks much better now.",
                "All updated! How does that look?"
            ]
            import random
            return random.choice(friendly_responses)
        
        return cleaned_response

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