import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from google import genai
from google.genai.types import HarmCategory, HarmBlockThreshold, GenerateContentConfig
from utils.config import Config
from utils.prompt_composer import prompt_composer
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LatexOutput(BaseModel):
    latex: str

class AILatexGenerator:
    """
    Simplified AI LaTeX generator using modular prompt system
    """
    
    def __init__(self):
        self.config = Config()
        self.model_name = self.config.get_gemini_model()
        self.generation_config = {
            'temperature': 0.3,
            'top_k': 30,
            'top_p': 0.85,
            'max_output_tokens': 12288,
        }

    def generate_latex(self, 
                      template_name: str, 
                      resume_data: Dict[str, Any], 
                      job_description: Optional[str] = None) -> str:
        """
        Generate LaTeX using the new modular prompt system
        """
        try:
            prompt_json = prompt_composer.build_generation_prompt(
                template_name=template_name,
                user_data=resume_data,
                job_description=job_description
            )
            prompt_str = json.dumps(prompt_json, ensure_ascii=False, indent=2)
            print("==== GEMINI LATEX PROMPT SENT TO AI START ====")
            print(prompt_str)
            print("==== GEMINI LATEX PROMPT SENT TO AI END ====")
            client = genai.Client(api_key=self.config.GEMINI_API_KEY)
            response = client.models.generate_content(
                model=f"models/{self.model_name}",
                contents=[prompt_str],  # Pass as a list of strings
                config=GenerateContentConfig(
                    temperature=0.3,
                    top_k=30,
                    top_p=0.85,
                    max_output_tokens=12288,
                    response_mime_type="application/json",
                    response_schema=LatexOutput,
                    system_instruction="Return only valid LaTeX in the 'latex' field. NEVER duplicate sections, NEVER nest environments incorrectly, ALWAYS match \\begin/\\end pairs, NEVER use \\item outside proper environments, NEVER put content after \\end{document}, ALWAYS use template commands (\\rSection, \\rSubsection, \\rAward, \\rCertification, \\rSkills), ALWAYS use template-specific skills formatting - check template instructions."
                )
            )
            print("==== GEMINI RAW AI RESPONSE START ====")
            print(response)
            print("==== GEMINI RAW AI RESPONSE END ====")
            usage = getattr(response, 'usage_metadata', None)
            if usage:
                print(f"GEMINI INPUT TOKEN COUNT: {usage.prompt_token_count}")
                print(f"GEMINI OUTPUT TOKEN COUNT: {usage.candidates_token_count}")
            else:
                print("GEMINI USAGE METADATA NOT AVAILABLE")
            latex_code = response.parsed.latex if hasattr(response, 'parsed') and response.parsed else ""
            print("==== GEMINI PARSED LATEX CODE START ====")
            print(latex_code)
            print("==== GEMINI PARSED LATEX CODE END ====")
            # Only validate that the result is a full LaTeX document
            if not latex_code.strip().startswith('\\documentclass'):
                logger.error("❌ AI did not return a valid LaTeX document!")
                raise ValueError("AI did not return a valid LaTeX document. Please retry.")
            if not latex_code:
                raise ValueError("No LaTeX code returned by AI.")
            return latex_code
        except Exception as e:
            logger.error(f"❌ LaTeX generation failed: {str(e)}")
            return ""  # Fallback: return empty string

# Global instance
ai_latex_generator = AILatexGenerator() 