import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from utils.config import Config
from utils.prompt_composer import prompt_composer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AILatexGenerator:
    """
    Simplified AI LaTeX generator using modular prompt system
    """
    
    def __init__(self):
        self.config = Config()
        
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
        Generate LaTeX using the new modular prompt system
        """
        try:
            logger.info(f"🚀 Generating LaTeX for template: {template_name}")
            
            # Use prompt composer to build clean, modular prompt
            prompt = prompt_composer.build_generation_prompt(
                template_name=template_name,
                user_data=resume_data,
                job_description=job_description
            )
            
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