"""
AI LaTeX Generator Service
Uses Google Gemini AI to generate LaTeX resume code from template and user data
Optimized with better configuration and generation parameters
"""

import logging
import os
from pathlib import Path
from typing import Dict, Any
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class AILatexGenerator:
    """AI-powered LaTeX generator using Google Gemini with optimized configuration"""
    
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self._configure_ai()
        
    def _configure_ai(self):
        """Configure Google Gemini AI with optimized settings"""
        try:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not found in environment variables")
            
            self.client = genai.Client(api_key=api_key)
            logger.info("AI service configured successfully with optimized settings")
            
        except Exception as e:
            logger.error(f"Failed to configure AI service: {str(e)}")
            raise
    
    async def generate_latex_from_template(
        self, 
        template_name: str, 
        user_data: Dict[str, Any]
    ) -> str:
        """
        Generate LaTeX code using AI based on template and user data
        Optimized with better prompting and configuration
        
        Args:
            template_name: Name of the template to use (e.g., 'modern_resume')
            user_data: Complete parsed user data from CV
            
        Returns:
            Generated LaTeX code as string
        """
        try:
            # Read template file
            template_content = self._read_template(template_name)
            
            # Log what sections are being sent to AI
            additional_sections = user_data.get("additional_sections", [])
            if additional_sections:
                logger.info(f"📤 SENDING TO AI: {len(additional_sections)} additional sections")
                for section in additional_sections:
                    logger.info(f"   📋 {section.get('section_name', 'Unknown')}")
            else:
                logger.info("ℹ️ No additional sections in user_data")
            
            # Create optimized AI prompt
            prompt = self._create_optimized_prompt(template_content, user_data)
            
            # Generate LaTeX using AI with optimized config
            response = await self._generate_with_optimized_ai(prompt)
            
            # Clean and validate response
            latex_code = self._clean_latex_response(response)
            
            logger.info(f"Successfully generated LaTeX code with {len(latex_code)} characters")
            return latex_code
            
        except Exception as e:
            logger.error(f"Failed to generate LaTeX: {str(e)}")
            # Return fallback template
            return self._create_fallback_latex(user_data)

    async def generate_latex_with_context(
        self, 
        template_name: str, 
        user_data: Dict[str, Any],
        original_pdf_content: bytes = None,
        job_description: str = None
    ) -> str:
        """
        🧠 CONTEXT-AWARE LaTeX generation using both original PDF and user-edited data
        
        This method provides the AI with:
        1. Original PDF for full context and understanding
        2. User-edited structured data (takes priority)
        3. Job description for optimization
        
        The AI uses user edits as the source of truth while leveraging the PDF context
        for intelligent formatting, section relationships, and additional content handling.
        
        Args:
            template_name: LaTeX template to use
            user_data: User-edited structured data (PRIORITY)
            original_pdf_content: Original resume PDF bytes (CONTEXT)
            job_description: Job description for optimization (optional)
            
        Returns:
            Context-aware generated LaTeX code
        """
        try:
            # Read template file
            template_content = self._read_template(template_name)
            
            # Create context-aware AI prompt
            prompt = self._create_context_aware_prompt(
                template_content, 
                user_data, 
                original_pdf_content, 
                job_description
            )
            
            # Generate LaTeX using AI with enhanced context
            if original_pdf_content:
                # Use multi-modal approach with PDF + text prompt
                response = await self._generate_with_pdf_context(prompt, original_pdf_content)
            else:
                # Fallback to text-only generation
                response = await self._generate_with_optimized_ai(prompt)
            
            # Clean and validate response
            latex_code = self._clean_latex_response(response)
            
            logger.info(f"✅ Context-aware LaTeX generation complete: {len(latex_code)} characters")
            return latex_code
            
        except Exception as e:
            logger.error(f"❌ Context-aware LaTeX generation failed: {str(e)}")
            # Fallback to regular generation without PDF context
            return await self.generate_latex_from_template(template_name, user_data)
    
    def _read_template(self, template_name: str) -> str:
        """Read template .cls file content from new directory structure"""
        # Map template names to directory names
        template_mapping = {
            "professional": "professional_resume",
            "professional_resume": "professional_resume",
            "smooth": "smooth_cv", 
            "smooth_cv": "smooth_cv"
        }
        
        template_dir = template_mapping.get(template_name, "professional_resume")
        template_path = self.templates_dir / template_dir / f"{template_dir}.cls"
        
        if not template_path.exists():
            logger.warning(f"Template {template_dir}.cls not found, using professional_resume.cls")
            template_path = self.templates_dir / "professional_resume" / "professional_resume.cls"
        
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _create_optimized_prompt(self, template_content: str, user_data: Dict[str, Any]) -> str:
        """Create AI prompt for LaTeX generation focused on quality and ATS optimization"""
        prompt = f'''
You are an expert LaTeX resume generator specializing in creating ATS-friendly, professionally formatted resumes.

TEMPLATE ANALYSIS:
Study the provided .cls template carefully and understand:
- Available commands, environments, and macros
- Intended document structure and formatting style
- Best practices for layout and typography

TEMPLATE (.cls file):
{template_content}

RESUME DATA (ALL content must be included):
{self._format_user_data_optimized(user_data)}

GENERATION REQUIREMENTS:

🎯 ATS OPTIMIZATION:
- Use clean, scannable formatting that ATS systems can parse easily
- Maintain consistent hierarchy and structure
- Use standard section headings and clear content organization
- Ensure all text is selectable and not embedded in graphics
- Optimize keyword placement naturally within content

💼 PROFESSIONAL AESTHETICS:
- Create visually appealing layout with proper spacing and alignment
- Use typography hierarchy effectively (headings, subheadings, body text)
- Maintain professional color scheme and styling
- Ensure consistent formatting throughout all sections
- Balance information density with readability

📋 COMPREHENSIVE CONTENT INCLUSION:
- Include EVERY piece of data provided - no omissions
- Create appropriate sections for ALL content areas
- For standard sections: Use template's intended formatting
- For additional/custom sections: Integrate seamlessly using template's styling patterns
- Maintain logical flow and professional section ordering

🛠️ TECHNICAL EXCELLENCE:
- Generate complete, compilable LaTeX code
- Use ONLY commands and environments defined in the template
- Follow template's structural conventions and best practices
- Ensure proper LaTeX syntax and character escaping
- Start with documentclass and end with \\end{{document}}

📈 CONTENT OPTIMIZATION:
- Present achievements and experiences with impact-focused language
- Use consistent date formatting and professional terminology
- Organize skills and competencies effectively
- Highlight key qualifications prominently
- Ensure proper grammar and professional tone

CRITICAL INSTRUCTIONS:
- Study the .cls file to understand how to use its commands properly
- Include ALL sections from the resume data (standard + additional)
- Create a resume that would impress both ATS systems and human recruiters
- Focus on clarity, professionalism, and visual appeal
- Return ONLY clean, compilable LaTeX code

🚨 ABSOLUTELY NO PLACEHOLDERS:
- DO NOT use "Professional summary goes here" or similar placeholder text
- DO NOT use "Experience details go here" or generic placeholders  
- USE THE ACTUAL DATA PROVIDED - every name, company, skill, experience
- If a section has data, populate it with that specific data
- If a section is empty, create meaningful content based on available context
- Replace ALL placeholder text with the real information from the resume data

Generate the complete resume that showcases the candidate's qualifications in the most professional and ATS-friendly manner possible.
'''
        return prompt
    
    def _create_context_aware_prompt(
        self, 
        template_content: str, 
        user_data: Dict[str, Any], 
        original_pdf_content: bytes = None,
        job_description: str = None
    ) -> str:
        """
        🧠 Create CONTEXT-AWARE AI prompt for intelligent LaTeX generation
        
        This prompt gives AI both the original PDF context AND user-edited data,
        with clear instructions on priority and intelligent decision-making.
        """
        
        # Build the context-aware prompt
        prompt_parts = []
        
        # Core instruction
        prompt_parts.append(f"""
🧠 CONTEXT-AWARE LATEX RESUME GENERATOR

You are an expert LaTeX resume generator with FULL CONTEXT AWARENESS. You have access to:

1. 📄 ORIGINAL PDF RESUME (for complete context and understanding)
2. ✏️ USER-EDITED DATA (takes absolute priority - user's final decisions)
3. 🎯 JOB DESCRIPTION (for optimization, if provided)
4. 📋 LATEX TEMPLATE (formatting structure to follow)

YOUR MISSION:
- Use USER-EDITED DATA as the source of truth for all content
- Leverage ORIGINAL PDF for context, relationships, and intelligent formatting decisions
- Create the most professional, contextually-aware LaTeX resume possible
- Handle additional/unknown sections intelligently using PDF context

PRIORITY RULES:
1. If user edited a field → Use user's version (ALWAYS)
2. If user didn't edit but PDF has content → Use PDF content intelligently  
3. Use PDF context to understand section relationships and formatting intent
4. Place additional sections contextually based on PDF structure understanding

LATEX TEMPLATE TO FOLLOW:
{template_content}

USER-EDITED DATA (ABSOLUTE PRIORITY):
{self._format_user_data_optimized(user_data)}
""")

        # Add job description if provided
        if job_description and job_description.strip():
            prompt_parts.append(f"""
🎯 JOB DESCRIPTION FOR OPTIMIZATION:
{job_description.strip()}

OPTIMIZATION INSTRUCTIONS:
- Tailor resume content to highlight relevant skills and experience
- Use keywords from job description naturally
- Emphasize achievements that match job requirements
- Structure sections to showcase most relevant qualifications first
""")

        # Add PDF context instructions
        if original_pdf_content:
            prompt_parts.append(f"""
📄 ORIGINAL PDF CONTEXT:
You have access to the original PDF resume. Use this for:
- Understanding section relationships and original structure
- Intelligent placement of additional sections (like "Relevant Coursework")
- Context for formatting decisions
- Understanding the user's intended professional presentation
- Preserving important nuances that structured data might miss

CONTEXT-AWARE DECISION MAKING:
- If PDF shows "Relevant Coursework" and user didn't edit education → Include coursework intelligently
- If PDF has unique sections not in structured data → Incorporate them appropriately
- Use PDF layout insights for professional section ordering
- Understand relationships between user's skills, experience, and additional content
""")

        # Final generation instructions
        prompt_parts.append("""
🎯 GENERATION REQUIREMENTS:

📊 ATS-FRIENDLY OPTIMIZATION:
- Create scannable, ATS-compliant formatting that passes automated screening
- Use clear section hierarchies and standard resume conventions
- Optimize keyword distribution naturally throughout content
- Ensure all content is machine-readable and properly structured

🎨 PROFESSIONAL AESTHETICS:
- Design visually striking yet professional layout
- Balance white space and content density optimally
- Use typography and formatting to guide reader's attention
- Create consistent visual hierarchy throughout document

🧠 INTELLIGENT CONTENT INTEGRATION:
- Prioritize user-edited data as the definitive source
- Leverage PDF context for enhanced understanding and formatting decisions
- Seamlessly integrate ALL sections (standard + additional) using template's natural styling
- Present information in most compelling and professional manner

💼 QUALITY EXCELLENCE:
- Generate complete, compilable LaTeX code using template's full capabilities
- Study the .cls file to understand and utilize all available features
- Ensure perfect syntax, formatting, and professional presentation
- Create resume that impresses both ATS systems and human recruiters
- NO explanations, markdown, or extra text - ONLY clean LaTeX code

CRITICAL PRIORITY: User edits = ABSOLUTE TRUTH. PDF context = ENHANCED INTELLIGENCE. ALL SECTIONS = FULLY INCLUDED. Combine for maximum impact.
""")

        return "\n".join(prompt_parts)
    
    def _extract_documentclass(self, template_content: str) -> str:
        """Extract the document class name from template content"""
        import re
        match = re.search(r'\\ProvidesClass\{([^}]+)\}', template_content)
        if match:
            return match.group(1)
        # Fallback to filename-based guess
        return "professional_resume"
    
    def _format_user_data_optimized(self, user_data: Dict[str, Any]) -> str:
        """Format user data for AI prompt with better structure"""
        formatted = "=== RESUME CONTENT ===\n\n"
        
        # Personal Info - Handle both personalInfo structure and flat structure
        personal = user_data.get("personalInfo", {})
        if not personal:
            # Handle flat structure from frontend
            personal = {
                'name': user_data.get('name', ''),
                'email': user_data.get('email', ''),
                'phone': user_data.get('phone', ''),
                'address': user_data.get('address', ''),
                'location': user_data.get('location', ''),
                'linkedin': user_data.get('linkedin', ''),
                'website': user_data.get('website', ''),
                'github': user_data.get('github', '')
            }
        
        if personal:
            formatted += "CONTACT INFORMATION:\n"
            formatted += f"Name: {personal.get('name', '')}\n"
            formatted += f"Email: {personal.get('email', '')}\n"
            formatted += f"Phone: {personal.get('phone', '')}\n"
            # Handle both address and location fields
            address = personal.get('address', '') or personal.get('location', '')
            if address:
                formatted += f"Address: {address}\n"
            formatted += f"LinkedIn: {personal.get('linkedin', '')}\n"
            formatted += f"Website: {personal.get('website', '')}\n"
            formatted += f"GitHub: {personal.get('github', '')}\n\n"
        
        # Summary - handle both summary field names
        summary = user_data.get("summary") or user_data.get("professional_summary", "")
        if summary:
            formatted += f"PROFESSIONAL SUMMARY:\n{summary}\n\n"
        
        # Experience - Enhanced formatting with better field mapping
        experience = user_data.get("experience", [])
        if experience:
            formatted += "PROFESSIONAL EXPERIENCE:\n"
            for i, exp in enumerate(experience, 1):
                company = exp.get('company', '') or exp.get('employer', '')
                position = exp.get('position', '') or exp.get('job_title', '') or exp.get('title', '')
                location = exp.get('location', '')
                
                formatted += f"\n{i}. {company} - {position}\n"
                if location:
                    formatted += f"   Location: {location}\n"
                
                # Better date formatting - handle multiple date field names
                start_date = exp.get('startDate', '') or exp.get('start_date', '') or exp.get('dates', '').split(' - ')[0] if ' - ' in exp.get('dates', '') else exp.get('dates', '')
                end_date = exp.get('endDate', '') or exp.get('end_date', '') or exp.get('dates', '').split(' - ')[1] if ' - ' in exp.get('dates', '') else ('Present' if exp.get('current') else '')
                
                if start_date or end_date:
                    formatted += f"   Duration: {start_date} to {end_date}\n"
                
                description = exp.get('description', '') or exp.get('details', '')
                if description:
                    formatted += f"   Description: {description}\n"
                
                formatted += "\n"
        
        # Education - Enhanced formatting with better field mapping
        education = user_data.get("education", [])
        if education:
            formatted += "EDUCATION:\n"
            for i, edu in enumerate(education, 1):
                # Handle multiple field name patterns
                institution = edu.get('institution', '') or edu.get('school', '') or edu.get('university', '')
                degree = edu.get('degree', '') or edu.get('degree_type', '')
                field = edu.get('field', '') or edu.get('field_of_study', '') or edu.get('major', '')
                
                formatted += f"\n{i}. {institution}\n"
                if degree and field:
                    formatted += f"   Degree: {degree} in {field}\n"
                elif degree:
                    formatted += f"   Degree: {degree}\n"
                
                location = edu.get('location', '')
                if location:
                    formatted += f"   Location: {location}\n"
                
                # Handle multiple date field patterns
                start_date = edu.get('startDate', '') or edu.get('start_date', '') or edu.get('dates', '').split(' - ')[0] if ' - ' in edu.get('dates', '') else edu.get('dates', '')
                end_date = edu.get('endDate', '') or edu.get('end_date', '') or edu.get('dates', '').split(' - ')[1] if ' - ' in edu.get('dates', '') else ''
                
                if start_date or end_date:
                    formatted += f"   Period: {start_date} to {end_date}\n"
                
                gpa = edu.get('gpa', '')
                if gpa:
                    formatted += f"   GPA: {gpa}\n"
                
                formatted += "\n"
        
        # Skills - Categorized
        skills = user_data.get("skills", [])
        if skills:
            formatted += f"SKILLS:\n{', '.join(skills)}\n\n"
        
        # Projects - Enhanced
        projects = user_data.get("projects", [])
        if projects:
            formatted += "PROJECTS:\n"
            for i, proj in enumerate(projects, 1):
                formatted += f"\n{i}. {proj.get('name', 'Project')}\n"
                
                description = proj.get('description', '')
                if description:
                    formatted += f"   Description: {description}\n"
                
                technologies = proj.get('technologies', [])
                if technologies:
                    formatted += f"   Technologies: {', '.join(technologies)}\n"
                
                url = proj.get('url', '')
                github = proj.get('github', '')
                if url:
                    formatted += f"   URL: {url}\n"
                if github:
                    formatted += f"   GitHub: {github}\n"
                
                formatted += "\n"
        
        # Awards
        awards = user_data.get("awards", [])
        if awards:
            formatted += "AWARDS & ACHIEVEMENTS:\n"
            for i, award in enumerate(awards, 1):
                title = award.get('title', '')
                description = award.get('description', '')
                date = award.get('date', '')
                
                formatted += f"{i}. {title}"
                if date:
                    formatted += f" ({date})"
                formatted += "\n"
                
                if description:
                    formatted += f"   {description}\n"
                formatted += "\n"
        
        # Certifications
        certifications = user_data.get("certifications", [])
        if certifications:
            formatted += "CERTIFICATIONS:\n"
            for i, cert in enumerate(certifications, 1):
                name = cert.get('name', '')
                issuer = cert.get('issuer', '')
                date = cert.get('date', '')
                
                formatted += f"{i}. {name}"
                if issuer:
                    formatted += f" - {issuer}"
                if date:
                    formatted += f" ({date})"
                formatted += "\n"
            formatted += "\n"
        
        # Languages
        languages = user_data.get("languages", [])
        if languages:
            formatted += f"LANGUAGES:\n{', '.join(languages)}\n\n"
        
        # Publications
        publications = user_data.get("publications", [])
        if publications:
            formatted += "PUBLICATIONS:\n"
            for i, pub in enumerate(publications, 1):
                title = pub.get('title', '')
                authors = pub.get('authors', [])
                venue = pub.get('venue', '')
                date = pub.get('date', '')
                
                formatted += f"{i}. {title}"
                if date:
                    formatted += f" ({date})"
                formatted += "\n"
                
                if authors:
                    formatted += f"   Authors: {', '.join(authors)}\n"
                if venue:
                    formatted += f"   Published in: {venue}\n"
                formatted += "\n"
        
        # Volunteering / Community Service
        volunteering = user_data.get("volunteering", [])
        if volunteering:
            formatted += "VOLUNTEERING & COMMUNITY SERVICE:\n"
            for i, vol in enumerate(volunteering, 1):
                organization = vol.get('organization', '')
                role = vol.get('role', '')
                description = vol.get('description', '')
                start_date = vol.get('startDate', '')
                end_date = vol.get('endDate', '')
                
                formatted += f"{i}. {role}"
                if organization:
                    formatted += f" at {organization}"
                if start_date or end_date:
                    formatted += f" ({start_date} to {end_date})"
                formatted += "\n"
                
                if description:
                    formatted += f"   {description}\n"
                formatted += "\n"
        
        # Speaking / Presentations
        speaking = user_data.get("speaking", [])
        if speaking:
            formatted += "SPEAKING & PRESENTATIONS:\n"
            for i, speak in enumerate(speaking, 1):
                title = speak.get('title', '')
                event = speak.get('event', '')
                date = speak.get('date', '')
                location = speak.get('location', '')
                
                formatted += f"{i}. {title}"
                if event:
                    formatted += f" at {event}"
                if date:
                    formatted += f" ({date})"
                formatted += "\n"
                
                if location:
                    formatted += f"   Location: {location}\n"
                formatted += "\n"
        
        # Military Service
        military = user_data.get("military", [])
        if military:
            formatted += "MILITARY SERVICE:\n"
            for i, mil in enumerate(military, 1):
                branch = mil.get('branch', '')
                rank = mil.get('rank', '')
                description = mil.get('description', '')
                start_date = mil.get('startDate', '')
                end_date = mil.get('endDate', '')
                
                formatted += f"{i}. {rank}"
                if branch:
                    formatted += f" - {branch}"
                if start_date or end_date:
                    formatted += f" ({start_date} to {end_date})"
                formatted += "\n"
                
                if description:
                    formatted += f"   {description}\n"
                formatted += "\n"
        
        # Hobbies / Interests
        hobbies = user_data.get("hobbies", [])
        if hobbies:
            formatted += f"INTERESTS & HOBBIES:\n{', '.join(hobbies)}\n\n"
        
        # CRITICAL: Additional Sections - Handle ALL extra content that doesn't fit standard categories
        additional_sections = user_data.get("additional_sections", [])
        if additional_sections:
            logger.info(f"🔍 PROCESSING {len(additional_sections)} additional sections for AI:")
            formatted += "ADDITIONAL SECTIONS:\n"
            for section in additional_sections:
                section_name = section.get('section_name', 'Additional Section')
                content = section.get('content', '')
                logger.info(f"   - Section: '{section_name}' ({len(content)} characters)")
                
                formatted += f"\n{section_name.upper()}:\n"
                if content:
                    formatted += f"{content}\n"
                formatted += "\n"
        else:
            logger.info("ℹ️ No additional sections found in user data")
        
        return formatted
    
    async def _generate_with_optimized_ai(self, prompt: str) -> str:
        """Generate LaTeX using AI with optimized configuration"""
        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash-preview-05-20',
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,  # Very low for precise LaTeX code
                    top_p=0.9,  # High precision with some flexibility
                    top_k=30,  # Moderate vocabulary for LaTeX commands
                    max_output_tokens=12288,  # Higher limit for comprehensive resumes
                    response_mime_type="text/plain",  # Ensure clean LaTeX output
                    system_instruction="You are a precise LaTeX resume generator. Follow all formatting and macro instructions strictly."
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"AI generation failed: {str(e)}")
            raise

    async def _generate_with_pdf_context(self, prompt: str, pdf_content: bytes) -> str:
        """
        🧠 Generate LaTeX using AI with both text prompt AND original PDF context
        
        This method leverages Gemini's multi-modal capabilities to process both:
        - Text prompt with user edits and instructions
        - Original PDF for full visual and contextual understanding
        """
        try:
            # Import types for PDF handling
            from google.genai import types
            
            # Create multi-modal content with both text and PDF
            contents = [
                types.Content(
                    parts=[
                        types.Part(text=prompt),
                        types.Part(inline_data=types.Blob(data=pdf_content, mime_type="application/pdf"))
                    ],
                    role="user"
                )
            ]
            
            # Generate with enhanced context awareness
            response = self.client.models.generate_content(
                model='gemini-2.5-flash-preview-05-20',  # Use model that supports PDF
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.05,  # Extremely low for context-aware precision
                    top_p=0.9,  # High precision for multimodal context
                    top_k=25,  # Limited vocabulary for consistent LaTeX
                    max_output_tokens=16384,  # Higher limit for comprehensive generation
                    response_mime_type="text/plain",  # Ensure clean LaTeX output
                    system_instruction="You are a context-aware LaTeX resume generator. Use the PDF for full context while prioritizing user-edited data. Generate professional, compilable LaTeX code."
                )
            )
            
            logger.info("✅ Context-aware generation with PDF successful")
            return response.text
            
        except Exception as e:
            logger.error(f"❌ PDF context generation failed: {str(e)}")
            # Fallback to text-only generation
            logger.info("🔄 Falling back to text-only generation")
            return await self._generate_with_optimized_ai(prompt)
    
    def _clean_latex_response(self, response: str) -> str:
        """Clean and validate AI response"""
        # Remove any markdown code blocks
        if "```latex" in response:
            response = response.split("```latex")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        
        # Clean up extra whitespace
        response = response.strip()
        
        # Basic validation
        if not response.startswith("\\documentclass"):
            raise ValueError("Invalid LaTeX response - missing documentclass")
        
        if not response.endswith("\\end{document}"):
            response += "\n\\end{document}"
        
        return response
    
    def _create_fallback_latex(self, user_data: Dict[str, Any]) -> str:
        """Create fallback LaTeX if AI generation fails"""
        personal = user_data.get("personalInfo", {})
        name = personal.get("name", "Your Name")
        email = personal.get("email", "your.email@example.com")
        
        return f"""\\documentclass{{professional_resume}}
\\begin{{document}}

\\name{{{name}}}
\\address{{{email}}}

\\begin{{rSection}}{{Professional Summary}}
Professional summary goes here.
\\end{{rSection}}

\\begin{{rSection}}{{Experience}}
Experience details go here.
\\end{{rSection}}

\\begin{{rSection}}{{Education}}
Education details go here.
\\end{{rSection}}

\\begin{{rSection}}{{Skills}}
Skills go here.
\\end{{rSection}}

\\end{{document}}"""

# Global instance
ai_latex_generator = AILatexGenerator() 