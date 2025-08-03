"""
Prompt Composer - Builds clean, modular prompts for AI interactions
"""

import json
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class PromptComposer:
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"

    def read_template_instructions(self, template_name: str) -> str:
        """Read template-specific instructions as plain text."""
        try:
            instructions_file = self.templates_dir / template_name / "instructions.txt"
            if instructions_file.exists():
                with open(instructions_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                logger.info(f"✅ Loaded template instructions: {template_name}")
                return content
            else:
                logger.warning(f"⚠️ Template instructions not found: {template_name}")
                return ""
        except Exception as e:
            logger.error(f"❌ Error reading template instructions {template_name}: {str(e)}")
            return ""

    def read_template_content(self, template_name: str) -> str:
        """Read the actual template .cls file content as a string."""
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


    def build_improved_generation_prompt(self, template_name: str, user_data: dict, job_description: Optional[str] = None) -> str:
        template_content = self.read_template_content(template_name)
        instructions = self.read_template_instructions(template_name)
        prompt = f"""TEMPLATE:\n```latex\n{template_content}\n```\n\nFORM DATA (Current user input):\n{json.dumps(user_data, indent=2)}"""
        if job_description:
            prompt += f"\n\nJOB DESCRIPTION: {job_description}"
        if instructions:
            prompt += f"\n\nTEMPLATE-SPECIFIC INSTRUCTIONS:\n{instructions}\n"
        prompt += """\n\nINSTRUCTIONS:\n
        1. Use the FORM DATA as the primary source - this is what the user has entered/edited\n
        2. Output a LaTeX .tex document that uses the template\n
        3. Start with \\documentclass{template_name} (not \\ProvidesClass)\n
        4. CRITICAL: Only include sections that have actual data in FORM DATA. If a section is empty or missing, DO NOT include it\n
        5. Use the template's custom commands and environments to format the user's data\n
        6. Double-escape backslashes in the new_latex field (use \\\\\\\\ for \\\\)\n
        7. Ensure proper JSON escaping for LaTeX commands\n\nIMPORTANT: Use the FORM DATA provided above, not parsed data. This represents the user's current input.
        """
        return prompt


    def build_improved_conversation_prompt(self, template_name: str, user_data: Optional[dict] = None, job_description: Optional[str] = None) -> str:
        template_content = self.read_template_content(template_name)
        instructions = self.read_template_instructions(template_name)
        prompt = f"""TEMPLATE:\n```latex\n{template_content}\n```\n\nFORM DATA (Current user input):\n{json.dumps(user_data, indent=2)}"""
        if job_description:
            prompt += f"\n\nJOB DESCRIPTION: {job_description}"
        if instructions:
            prompt += f"\n\nTEMPLATE-SPECIFIC INSTRUCTIONS:\n{instructions}\n"
        prompt += """\n\nINSTRUCTIONS: 
        1. You are an expert LaTeX resume editor. You have access to the template structure and the user's current form data. Help the user edit their resume by making precise LaTeX changes.\n
        2. Use the FORM DATA provided above (current user input), not parsed data.This represents what the user has actually entered/edited in the form\n
        3. Focus on accuracy and proper LaTeX formatting\n
        4. Consider the template structure and commands\n
        5. Be helpful and conversational"""
        return prompt

# Global instance
prompt_composer = PromptComposer()