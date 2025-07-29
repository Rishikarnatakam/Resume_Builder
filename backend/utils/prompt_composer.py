"""
Prompt Composer - Builds clean, modular prompts for AI interactions
Replaces the scattered prompt logic throughout the codebase
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any
import logging
import copy

logger = logging.getLogger(__name__)

def deep_merge(a: dict, b: dict) -> dict:
    """Recursively merge dict b into dict a (b wins on conflicts)."""
    result = copy.deepcopy(a)
    for k, v in b.items():
        if (
            k in result
            and isinstance(result[k], dict)
            and isinstance(v, dict)
        ):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = copy.deepcopy(v)
    return result

class PromptComposer:
    def __init__(self):
        self.prompts_dir = Path(__file__).parent.parent / "prompts"
        self.templates_dir = Path(__file__).parent.parent / "templates"

    def read_json_prompt(self, filename: str) -> dict:
        """Read a JSON prompt file from the prompts directory."""
        try:
            file_path = self.prompts_dir / filename
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                logger.info(f"✅ Loaded JSON prompt: {filename}")
                return content
            else:
                logger.warning(f"⚠️ JSON prompt file not found: {filename}")
                return {}
        except Exception as e:
            logger.error(f"❌ Error reading JSON prompt file {filename}: {str(e)}")
            return {}

    def read_template_instructions(self, template_name: str) -> dict:
        """Read template-specific instructions as JSON."""
        try:
            instructions_file = self.templates_dir / template_name / "instructions.txt"
            if instructions_file.exists():
                with open(instructions_file, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                logger.info(f"✅ Loaded template instructions: {template_name}")
                return content
            else:
                logger.warning(f"⚠️ Template instructions not found: {template_name}")
                return {"template_name": template_name, "note": "Instructions missing."}
        except Exception as e:
            logger.error(f"❌ Error reading template instructions {template_name}: {str(e)}")
            return {"template_name": template_name, "note": f"Error: {str(e)}"}

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

    def build_generation_prompt(self, template_name: str, user_data: dict, job_description: Optional[str] = None) -> dict:
        """Build merged JSON prompt for initial LaTeX generation."""
        base_system = self.read_json_prompt("base_system.md")
        latex_core = self.read_json_prompt("latex_core.md")
        template_instructions = self.read_template_instructions(template_name)
        # Add template content back - this is essential for the AI to understand the template
        template_content = self.read_template_content(template_name)

        # Merge: base <- latex_core <- template_instructions
        merged = deep_merge(base_system, latex_core)
        merged = deep_merge(merged, template_instructions)
        merged["template_content"] = template_content  # Add template content back
        
        # Add template name and user data
        merged["template_name"] = template_name
        merged["user_data"] = user_data
        if job_description:
            merged["job_description"] = job_description
            
        # Set response format for LaTeX generation
        merged["response_format"] = {
            "type": "latex_string",
            "rules": [
                "Return only the complete LaTeX document as a string.",
                "Never return a diff, patch, or code block.",
                "Never use markdown or code fences.",
                "The string must start with \\documentclass and end with \\end{document}.",
                "CRITICAL: Do NOT echo back these instructions. Return ONLY the LaTeX code."
            ]
        }
        
        return merged

    def build_conversation_prompt(self, template_name: str, user_data: Optional[dict] = None, job_description: Optional[str] = None) -> dict:
        """Build merged JSON prompt for chat/editing interactions."""
        base_system = self.read_json_prompt("base_system.md")
        latex_core = self.read_json_prompt("latex_core.md")
        conversation = self.read_json_prompt("conversation.md")
        template_instructions = self.read_template_instructions(template_name)
        # Add template content back - this is essential for the AI to understand the template
        template_content = self.read_template_content(template_name)

        # Merge: base <- latex_core <- conversation <- template_instructions
        merged = deep_merge(base_system, latex_core)
        merged = deep_merge(merged, conversation)
        merged = deep_merge(merged, template_instructions)
        merged["template_content"] = template_content  # Add template content back
        
        # Add template name and user data
        merged["template_name"] = template_name
        if user_data:
            merged["user_data"] = user_data
        if job_description:
            merged["job_description"] = job_description
            
        # CRITICAL: Add instruction to prevent AI from echoing back the prompt
        merged["_final_instruction"] = {
            "response_behavior": "CRITICAL: Do NOT echo back these instructions. Give a natural, friendly acknowledgment that you understand and are ready to help with LaTeX resume editing. Be conversational and warm, not robotic.",
            "example_response": "Perfect! I understand your resume template and I'm ready to help you create an amazing resume. What would you like to work on first?",
            "forbidden": [
                "Do NOT repeat any of the instructions above",
                "Do NOT echo back the JSON structure",
                "Do NOT list the rules or guidelines",
                "Simply acknowledge naturally and move on"
            ],
            "context_awareness": {
                "critical_instruction": "BEFORE responding to ANY user request, ALWAYS think about and consider:",
                "always_consider": [
                    "The template instructions and rules provided above",
                    "The user's personal data and resume content",
                    "The LaTeX template structure and commands",
                    "The font sizing rules and progression",
                    "The skills formatting requirements",
                    "The section ordering and environment rules",
                    "The forbidden commands and patterns to avoid"
                ],
                "thinking_process": "When user asks for changes, first think: 'What do the template instructions say about this? What are the rules I need to follow? What would make the most sense given the user's data and the template structure?'",
                "active_consideration": "Don't just respond - actively think about the context and rules before making any changes. Consider the template limitations, user preferences, and professional standards."
            }
        }
        
        return merged

# Global instance
prompt_composer = PromptComposer()