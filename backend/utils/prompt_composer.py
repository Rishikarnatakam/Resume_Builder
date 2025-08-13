"""
Prompt Composer - Simplified trust-based prompts for AI interactions
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

    def read_ats_guidelines(self) -> str:
        """Read ATS guidelines for content optimization."""
        try:
            guidelines_file = Path(__file__).parent / "ats_guidelines.txt"
            if guidelines_file.exists():
                with open(guidelines_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                logger.info("✅ Loaded ATS guidelines")
                return content
            else:
                logger.warning("⚠️ ATS guidelines not found")
                return ""
        except Exception as e:
            logger.error(f"❌ Error reading ATS guidelines: {str(e)}")
            return ""

    def read_job_tailoring_guidelines(self) -> str:
        """Read job-specific tailoring guidelines."""
        try:
            guidelines_file = Path(__file__).parent / "job_tailoring_guidelines.txt"
            if guidelines_file.exists():
                with open(guidelines_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                logger.info("✅ Loaded job tailoring guidelines")
                return content
            else:
                logger.warning("⚠️ Job tailoring guidelines not found")
                return ""
        except Exception as e:
            logger.error(f"❌ Error reading job tailoring guidelines: {str(e)}")
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
        """Build generation prompt - simplified for initial resume creation"""
        template_content = self.read_template_content(template_name)
        instructions = self.read_template_instructions(template_name)
        ats_guidelines = self.read_ats_guidelines()
        #job_tailoring = self.read_job_tailoring_guidelines()
        
        prompt = f"""You are a professional ATS-optimized LaTeX resume expert.

TEMPLATE CODE:
```latex
{template_content}
```

USER DATA:
{json.dumps(user_data, indent=2)}

TEMPLATE INSTRUCTIONS:
{instructions}

ATS GUIDELINES:
{ats_guidelines}"""

        if job_description:
            prompt += f"\n\nJOB DESCRIPTION:\n{job_description}"

        prompt += """

TASK: Create a complete LaTeX .tex document using the template and user data.

RULES:
- Start with \\documentclass{{{template_name}}}
- Use template commands and environments
- Follow template instructions exactly
- Apply ATS guidelines for optimization
- Use job tailoring guidelines when job description provided
- Include only sections with actual data
- Make URLs clickable with \\href
        - Return complete LaTeX from \\documentclass to \\end{document}
        - Do not edit it as third person

CONSTRAINTS:
- Do NOT fabricate content. Use ONLY information present in USER DATA; do not invent projects, roles, dates, employers, or achievements.
- SKILLS: Must be a subset of USER DATA skills. You may reorder/group, but do NOT add skills just because the job description mentions them.
- EXPERIENCE: You may rephrase existing bullets to emphasize JD-relevant strengths, but DO NOT introduce tools/technologies not found in USER DATA.
- JOB DESCRIPTION is ONLY for prioritization and wording. You MAY include the job title from JD in summaries, but do NOT copy other JD text or include requirements that the user does not have.
- Avoid meta phrases like “demonstrating …”, “showcasing …”. Write natural resume bullets with action verbs and measurable impact when available.
- If the JD highlights missing skills, DO NOT insert them into the LaTeX. Keep the resume truthful.

MESSAGE LENGTH:
- Keep the explanation in MESSAGE concise when you respond as an assistant: maximum 5–6 sentences and under ~100 words. Be brief and direct.
"""

        return prompt

    def build_improved_conversation_prompt(self, template_name: str, user_data: Optional[dict] = None, job_description: Optional[str] = None) -> str:
        """Build conversation prompt for session initialization - simplified and trust-based"""
        template_content = self.read_template_content(template_name)
        instructions = self.read_template_instructions(template_name)
        ats_guidelines = self.read_ats_guidelines()
        #job_tailoring = self.read_job_tailoring_guidelines()
        
        prompt = f"""You are a professional ATS-optimized LaTeX resume expert. I'm giving you all the knowledge you need upfront - read, understand, and use these guidelines throughout our conversation.

TEMPLATE CODE:
```latex
{template_content}
```

TEMPLATE INSTRUCTIONS:
{instructions}

ATS GUIDELINES:
{ats_guidelines}"""

        if user_data:
            prompt += f"\n\nCURRENT USER DATA:\n{json.dumps(user_data, indent=2)}"

        if job_description:
            prompt += f"\n\nJOB DESCRIPTION:\n{job_description}"

        prompt += """

YOUR ROLE: You are a professional resume writer and LaTeX expert. You understand:
- The template structure and commands
- ATS optimization principles
- Job tailoring techniques
- LaTeX best practices
- Do not edit it as third person

CRITICAL: You MUST use proper LaTeX syntax with backslashes and curly braces. Use \\begin{} and \\end{} commands, NOT HTML-style tags like <>. All LaTeX commands must start with backslash and use curly braces.

WHAT YOU CAN DO:
- Edit user's .tex files (create/modify resumes)
- Apply template instructions automatically
- Use ATS guidelines for optimization
- Apply job tailoring when relevant
- Maintain user preferences and customizations
- Make intelligent formatting decisions

CONSTRAINTS:
- Do NOT fabricate content. Use ONLY information present in CURRENT USER DATA and LaTeX.
- SKILLS: Must remain a subset of the user's current skills; do NOT add skills because the JD mentions them.
- EXPERIENCE: Rephrase for emphasis, but DO NOT introduce tools/tech not already present.
- JD is for prioritization and wording only; you MAY include the job title from JD in summaries, but do NOT copy other JD text or inject missing requirements.
- If a user asks to add a new skill not present, respond with a friendly suggestion in MESSAGE, but do NOT inject it into LaTeX unless explicitly provided by the user.

BE CONVERSATIONAL: Be friendly and human-like in your responses. You are helping the user edit their own resume - write as if you're helping you build your own resume.

You have all the knowledge needed. Use these guidelines appropriately without being asked. Think like a professional resume writer who knows exactly what to do.

CRITICAL VERIFICATION: When making changes to LaTeX code, always verify that your output actually contains the requested modifications. Compare before/after code to ensure changes were implemented. Never claim changes were made if the LaTeX code is identical.

IMPLEMENTATION REQUIREMENT: When you plan a change, you MUST also implement it in the LaTeX code. Do not just describe what you plan to do - actually do it and show the updated LaTeX. Your response should contain BOTH the explanation AND the modified code.


Ready to help you edit your resume!"""

        return prompt

# Global instance
prompt_composer = PromptComposer()