"""
Prompt Composer - Builds clean, modular prompts for AI interactions
Replaces the scattered prompt logic throughout the codebase
"""

from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class PromptComposer:
    def __init__(self):
        self.prompts_dir = Path(__file__).parent.parent / "prompts"
        self.templates_dir = Path(__file__).parent.parent / "templates"
    
    def read_prompt_file(self, filename: str) -> str:
        """Read a prompt file from the prompts directory"""
        try:
            file_path = self.prompts_dir / filename
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                logger.info(f"✅ Loaded prompt: {filename}")
                return content
            else:
                logger.warning(f"⚠️ Prompt file not found: {filename}")
                return ""
        except Exception as e:
            logger.error(f"❌ Error reading prompt file {filename}: {str(e)}")
            return ""
    
    def read_template_instructions(self, template_name: str) -> str:
        """Read template-specific instructions"""
        try:
            instructions_file = self.templates_dir / template_name / "instructions.txt"
            if instructions_file.exists():
                with open(instructions_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                logger.info(f"✅ Loaded template instructions: {template_name}")
                return content
            else:
                logger.warning(f"⚠️ Template instructions not found: {template_name}")
                return f"Template: {template_name}\nUse appropriate template commands."
        except Exception as e:
            logger.error(f"❌ Error reading template instructions {template_name}: {str(e)}")
            return f"Template: {template_name}\nUse appropriate template commands."
    
    def read_template_content(self, template_name: str) -> str:
        """Read the actual template .cls file content"""
        try:
            template_file = self.templates_dir / template_name / f"{template_name}.cls"
            if template_file.exists():
                with open(template_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                logger.info(f"✅ Loaded template content: {template_name}")
                return content
            else:
                logger.warning(f"⚠️ Template file not found: {template_name}.cls")
                return f"% Template {template_name} not found"
        except Exception as e:
            logger.error(f"❌ Error reading template content {template_name}: {str(e)}")
            return f"% Error loading template {template_name}: {str(e)}"
    
    def build_generation_prompt(self, template_name: str, user_data: dict, 
                               job_description: Optional[str] = None) -> str:
        """Build prompt for initial LaTeX generation"""
        base_system = self.read_prompt_file("base_system.md")
        latex_core = self.read_prompt_file("latex_core.md")
        template_instructions = self.read_template_instructions(template_name)
        template_content = self.read_template_content(template_name)  # Add template content
        
        prompt_parts = [
            base_system,
            "",
            latex_core,
            "",
            "# Current Template Instructions",
            template_instructions,
            "",
            "# Current Template Commands (ONLY USE THESE)",
            f"```latex\n{template_content}\n```",
            f"YOU MUST USE \\documentclass{{{template_name}}} - NEVER change this!",
            "Use these template commands as your foundation, but be smart and flexible.",
            "Make reasonable modifications when they improve the user experience or visual appeal.",
            "Think about how the final resume will look - prioritize readability and professionalism.",
            "",
            "# User Data",
            f"```json\n{user_data}\n```"
        ]
        
        if job_description:
            prompt_parts.extend([
                "",
                "# Job Description",
                job_description,
                "",
                "# Tailoring Instructions",
                "Tailor the resume content for the job above using professional resume writing principles.",
                "Write compelling, natural content that showcases relevant qualifications.",
                "Don't just insert keywords - create content that tells a cohesive story."
            ])
            
        prompt_parts.extend([
            "",
            "# Task",
            f"Generate a complete, compilable LaTeX document using \\documentclass{{{template_name}}}.",
            "Use the template commands as your foundation, but be flexible and smart about modifications.",
            "Think visually about how this will look on the final resume.",
            "Prioritize: User request > Visual appeal > Template purity.",
            "",
            "# Critical Structure Requirements",
            "- Wrap ALL content in proper section environments using the template's section commands",
            "- Ensure every \\begin has a matching \\end",
            "- Never leave content floating outside section environments",
            "- Follow logical section order and group similar content together",
            "",
            "Output only clean LaTeX code, no explanations or markdown formatting."
        ])
        
        return "\n".join(prompt_parts)
    
    def build_conversation_prompt(self, template_name: str) -> str:
        """Build prompt for chat/editing interactions"""
        base_system = self.read_prompt_file("base_system.md")
        latex_core = self.read_prompt_file("latex_core.md")
        conversation = self.read_prompt_file("conversation.md")
        template_instructions = self.read_template_instructions(template_name)
        template_content = self.read_template_content(template_name)  # Add template content
        
        prompt_parts = [
            base_system,
            "",
            conversation,
            "",
            latex_core,
            "",
            "# Current Template Context",
            template_instructions,
            "",
            "# Current Template Commands (ONLY USE THESE)",
            f"Current template: {template_name}",
            f"Available commands from the current template:",
            f"```latex\n{template_content}\n```",
            f"CRITICAL: You MUST use \\documentclass{{{template_name}}} - NEVER change this!",
            "Use these as your foundation, but be smart and flexible with modifications.",
            "Think about visual appearance - how will this look on the final resume?",
            "Solve the user's request intelligently within the current template's capabilities.",
            "",
            "# Structure Validation Reminder",
            "- Always wrap content in proper section environments using current template commands",
            "- Ensure every \\begin has a matching \\end",
            "- Keep related content grouped in the same section",
            "",
            "Remember: Always respond in JSON patch format with operations and message fields."
        ]
        
        return "\n".join(prompt_parts)

# Global instance
prompt_composer = PromptComposer()