import json
import logging
from typing import Dict, Any, Optional
from google import genai
from google.genai.types import GenerateContentConfig
from utils.config import get_gemini_model, get_gemini_api_key
from utils.prompt_composer import prompt_composer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AILatexGenerator:
    """
    AI LaTeX generator using .env configuration
    """
    
    def __init__(self):
        self.model_name = get_gemini_model()
        self.api_key = get_gemini_api_key()

    def generate_latex(self, 
                      template_name: str, 
                      resume_data: Dict[str, Any], 
                      job_description: Optional[str] = None) -> str:
        """
        Generate LaTeX using form data (not parsed data) with improved prompt
        """
        try:
            # Build improved prompt using prompt composer
            prompt = prompt_composer.build_improved_generation_prompt(
                template_name=template_name,
                user_data=resume_data,
                job_description=job_description
            )
            
            print("==== GEMINI LATEX PROMPT SENT TO AI START ====")
            print(prompt)
            print("==== GEMINI LATEX PROMPT SENT TO AI END ====")
            
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model=f"models/{self.model_name}",
                contents=[prompt],
                config=GenerateContentConfig(
                    temperature=0.9,
                    top_k=30,
                    top_p=0.85,
                    max_output_tokens=12288,
                    system_instruction="You are an expert LaTeX resume generator. Create clean, professional LaTeX code using the provided template and form data. Focus on accuracy and proper formatting."
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
            
            # Try to get LaTeX content from response
            latex_code = ""
            try:
                # Get LaTeX content directly from response text
                response_text = response.text.strip()
                print(f"Response text: {response_text[:200]}...")
                
                # Clean up the response - remove any markdown formatting
                if response_text.startswith('```latex'):
                    # Remove markdown code blocks
                    lines = response_text.split('\n')
                    start_idx = None
                    end_idx = None
                    for i, line in enumerate(lines):
                        if line.strip() == '```latex':
                            start_idx = i + 1
                        elif line.strip() == '```' and start_idx is not None:
                            end_idx = i
                            break
                    
                    if start_idx is not None and end_idx is not None:
                        latex_code = '\n'.join(lines[start_idx:end_idx]).strip()
                    else:
                        latex_code = response_text
                else:
                    latex_code = response_text
                        
            except Exception as parse_error:
                logger.error(f"❌ Error parsing AI response: {parse_error}")
                # Fallback to raw text
                latex_code = response.text.strip()
                
            print("==== GEMINI PARSED LATEX CODE START ====")
            print(latex_code)
            print("==== GEMINI PARSED LATEX CODE END ====")
            
            # Only validate that the result is a full LaTeX document
            if not latex_code.strip().startswith('\\documentclass'):
                logger.error("❌ AI did not return a valid LaTeX document!")
                logger.error(f"❌ Received content: {latex_code[:200]}...")
                raise ValueError("AI did not return a valid LaTeX document. Please retry.")
            if not latex_code:
                raise ValueError("AI returned empty LaTeX content. Please retry.")
                
            return latex_code
            
        except Exception as e:
            logger.error(f"❌ Error generating LaTeX: {str(e)}")
            raise

# Global instance
ai_latex_generator = AILatexGenerator() 