import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from utils.config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AILatexGenerator:
    """
    Modular AI LaTeX generator using Gemini API
    
    Architecture:
    - General instructions: Basic LaTeX generation rules (here)
    - Template-specific instructions: Detailed rules in template instructions.txt files
    - Adaptive section creation: Dynamic content organization
    - Template command learning: AI learns from template patterns
    """
    
    def __init__(self):
        self.config = Config()
        self.templates_dir = Path(__file__).parent.parent / "templates"
        
        # Configure Gemini API
        genai.configure(api_key=self.config.GEMINI_API_KEY)
        
        # Use model from environment variable
        model_name = self.config.get_gemini_model()
        self.model = genai.GenerativeModel(model_name)
        self.generation_config = {
            'temperature': 0.1,
            'top_k': 30,
            'max_output_tokens': 12288,
        }
        
        # Simple safety settings
        self.safety_settings = [
            {
                "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
                "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                "threshold": HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
        ]

    def generate_latex(self, 
        template_name: str, 
                      resume_data: Dict[str, Any], 
                      job_description: Optional[str] = None) -> str:
        """
        Simple LaTeX generation - just give AI the template and data
        """
        try:
            logger.info(f"🚀 Generating LaTeX for template: {template_name}")
            
            # Get template content and instructions
            template_content = self._read_template(template_name)
            template_instructions = self._read_template_instructions(template_name)
            
            # Create prompt with template instructions
            prompt = self._create_prompt(template_content, template_instructions, resume_data, job_description)
            
            # Generate with Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            # Clean and return the response
            latex_code = self._clean_response(response.text)
            logger.info("✅ LaTeX generation successful")
            return latex_code
            
        except Exception as e:
            logger.error(f"❌ LaTeX generation failed: {str(e)}")
            raise Exception(f"Failed to generate LaTeX: {str(e)}")

    def _read_template(self, template_name: str) -> str:
        """
        Read template file - simple and dynamic
        """
        try:
            # Try direct template name first
            template_path = self.templates_dir / template_name / f"{template_name}.cls"
            
            if template_path.exists():
                with open(template_path, 'r', encoding='utf-8') as f:
                    return f.read()
            
            # If not found, just use the first available template
            for template_dir in self.templates_dir.iterdir():
                if template_dir.is_dir():
                    cls_file = template_dir / f"{template_dir.name}.cls"
                    if cls_file.exists():
                        logger.info(f"Using fallback template: {template_dir.name}")
                        with open(cls_file, 'r', encoding='utf-8') as f:
                            return f.read()
            
            raise FileNotFoundError(f"No template found for: {template_name}")
            
        except Exception as e:
            logger.error(f"Failed to read template: {str(e)}")
            raise

    def _read_template_instructions(self, template_name: str) -> str:
        """
        Read template-specific instructions from instructions.txt file
        """
        try:
            instructions_path = self.templates_dir / template_name / "instructions.txt"
            
            if instructions_path.exists():
                with open(instructions_path, 'r', encoding='utf-8') as f:
                    instructions = f.read()
                    logger.info(f"📋 Loaded template instructions for: {template_name}")
                    return instructions
            else:
                logger.warning(f"⚠️ No instructions.txt found for template: {template_name}")
                return "No specific template instructions available. Use template commands appropriately."
                
        except Exception as e:
            logger.error(f"Failed to read template instructions: {str(e)}")
            return "No specific template instructions available. Use template commands appropriately."

    def _create_prompt(self, template_content: str, template_instructions: str, resume_data: Dict[str, Any], job_description: Optional[str]) -> str:
        """
        Create prompt with template-specific instructions
        """

        prompt = f"""You are a LaTeX resume generator. Generate a complete, compilable, ATS-friendly LaTeX document using the provided template, following the specific template instructions.

TEMPLATE INSTRUCTIONS:
{template_instructions}

TEMPLATE CONTENT:
{template_content}

USER DATA:
{json.dumps(resume_data, indent=2)}
"""

        if job_description:
            logger.info("✅ Adding job description to prompt")
            prompt += f"""
JOB DESCRIPTION:
{job_description}

🎯 PROFESSIONAL RESUME TAILORING:
You are a professional resume writer. Tailor this resume for the job above using best practices.

RESUME WRITING PRINCIPLES:
✅ Write compelling, professional descriptions that flow naturally
✅ Lead with impact and quantified achievements where possible
✅ Use action verbs and industry-appropriate language
✅ Structure content to showcase the most relevant qualifications first
✅ Ensure all text reads like it was written by a skilled professional
✅ Focus on what the employer wants to see for this specific role
✅ Make it scannable and ATS-friendly

TAILORING APPROACH:
Think like a professional resume writer - how would you naturally restructure and rewrite this content to best position this candidate for the target job? Don't just insert keywords; create compelling, natural content that tells a cohesive story.

BOUNDARIES:
❌ Don't invent new experiences, skills, or qualifications
❌ Don't add fictional achievements or fake data
❌ Suggest additional content in comments only, don't add it

Create a resume that reads professionally and naturally highlights this candidate's fit for the role.
"""
        else:
            logger.warning("⚠️ No job description provided - skipping job description section")

        prompt += """
GENERAL INSTRUCTIONS:
- Follow ALL template instructions above precisely
- Generate ONLY clean LaTeX code that will compile without errors
- Use the template's specific commands and formatting exactly as specified
- Fill in all user data appropriately according to the template's design pattern
- Make sure the document has proper \\documentclass and \\end{document}
- Use \\href{url}{display text} for all links
- Output only the LaTeX code, no explanations or markdown formatting
- Pay special attention to template-specific requirements in the instructions above

🚨 CRITICAL DATA RULE: 
- ONLY use data that actually exists in the USER DATA above
- DO NOT add placeholder, example, or fake social media links (Twitter, Instagram, etc.)
- DO NOT add placeholder email addresses or phone numbers
- DO NOT create fake GitHub/LinkedIn URLs if they're not provided
- If a field is empty or missing in USER DATA, simply don't include that command
- Example: If user has no Twitter, don't add \\twitter{} command at all

🔧 DEPENDENCY VALIDATION RULES:
- BEFORE using any custom command (like \\namefont, \\taglinefont), verify it's defined
- IF redefining template commands, include ALL required sub-command definitions
- CHECK that every \\commandname used has a corresponding \\newcommand{\\commandname}
- VALIDATE that color references (\\colorlet{name}{heading}) have defined base colors
- ENSURE self-contained code - don't assume commands exist without defining them
- EXAMPLE: If using \\namefont in \\makecvheader, include \\newcommand{\\namefont}{\\Huge\\bfseries}

⚡ GENERATION WORKFLOW:
1. Identify all \\commandname references in generated code
2. Verify each command has a \\newcommand or \\renewcommand definition  
3. Check color dependencies (\\colorlet references)
4. If missing definitions found, add them automatically
5. Maintain visual hierarchy (different font sizes for different elements)

📐 SMART MARGIN CONTROL:
- Use \\usepackage[margin=0.5in]{geometry} for tight margins
- Use \\setlength{\\footskip}{0.3in} to control footer space
- Use \\setlength{\\headsep}{0.2in} to control header separation
- When pushing content up, also compress bottom margins
- Example: \\geometry{top=0.4in, bottom=0.4in, left=0.5in, right=0.5in}
- Use \\raggedbottom to prevent awkward bottom spacing expansion

🎯 INTELLIGENT SPACING:
- If content doesn't fit, progressively reduce margins while maintaining readability
- Automatically adjust header/footer space based on content length
- Balance top/bottom spacing to prevent footer expansion
- Prioritize content space over excessive white space
- Maintain minimum readability standards (0.4in minimum margins)

🔄 SIMPLE COLUMN MANAGEMENT:
- Use \\switchcolumn only ONCE to move from left to right column
- Left column: Summary, Education, Certifications, personal sections
- Right column: Skills, Projects, Experience, technical sections
- Never duplicate sections - each section appears only once
- Balance content naturally between the two columns

📝 SKILLS AND SPACING FORMATTING:
- Skills section: Use grouped text format "Programming: Python, C++ | Tools: Git, AWS"
- Do NOT use \\cvtag{} boxes in skills section - use plain text with categories
- Project technologies: Continue using \\cvtag{} boxes for individual tech items
- Section spacing: Template automatically adds proper spacing after section headers
- Dates: Template automatically aligns dates to the right using \\hfill

🏗️ ADAPTIVE SECTION CREATION: Create complete, professional resumes by intelligently adding sections:
- ANALYZE user data to identify what sections are needed (Education, Projects, Certifications, etc.)
- LEARN from template's existing section patterns and commands
- CREATE new sections using the same formatting style as template's existing sections
- DON'T force data into wrong sections - make appropriate new ones instead
- ENSURE all user data gets properly showcased in logical, recruiter-expected sections
- MAINTAIN template's visual consistency while expanding functionality
- EXAMPLE: If template shows Work Experience but user has education → create Education section using same pattern

Generate the complete LaTeX document now:"""

        return prompt

    def _clean_response(self, response_text: str) -> str:
        """
        Clean AI response to get just the LaTeX code
        """
        if not response_text:
            raise ValueError("Empty response from AI")
        
        # Remove markdown code blocks if present
        if "```latex" in response_text:
            start = response_text.find("```latex") + 8
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        
        # Clean up the response
        latex_code = response_text.strip()
        
        return latex_code

# Global instance
ai_latex_generator = AILatexGenerator() 