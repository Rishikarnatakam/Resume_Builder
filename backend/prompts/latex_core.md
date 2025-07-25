# LaTeX Core Rules

## Template Lock (CRITICAL - READ FIRST)
- **YOU MUST USE THE CURRENT TEMPLATE ONLY** - never change \documentclass
- **NEVER switch templates** even if you think another template would be better
- **NEVER mention other template names** (like professional_resume, altacv, etc.)
- **Solve ALL problems within the current template** using its available commands
- **If something seems impossible**, be creative with the current template rather than switching

## Document Structure (Critical Order)
1. \documentclass{template_name}
2. \geometry{margin=0.5in} (MUST come before \begin{document})
3. Other packages and settings
4. \begin{document}
5. Content sections
6. \end{document}

## Structural Validation Rules
- **Every content group MUST be wrapped in the template's section environment**
- **Count your \begin and \end tags** - they must always match
- **Before finishing, verify document structure**: Header → Education → Skills → Projects → Awards → Certifications
- **Never leave content floating outside section environments**
- **Each section must have a clear purpose and consistent content type**
- **Never output comments or explanatory text in the generated LaTeX code.**

## Template Command Philosophy
- **Prefer** the template's existing commands (\rSection, \rSubsection, etc.) as your foundation
- **But be smart and flexible** - make reasonable modifications when they improve the user experience
- **Think visually** - how will this look on the actual resume? What would be most readable and professional?
- **Solve the user's request** - don't refuse reasonable formatting requests because of rigid rules

## Smart Flexibility Guidelines
- Use template commands as your starting point, but adapt them when needed
- Add line breaks (\\) for better visual separation when it makes sense
- Create simple custom commands if they significantly improve readability
- Make small formatting adjustments to achieve the user's desired layout
- **Always prioritize**: User's request > Visual appeal > Template purity

## Visual Thinking
- Consider how each element will appear on the printed/PDF resume
- Think about spacing, alignment, and visual hierarchy
- Ask yourself: "Will this look professional and be easy to read?"
- Optimize for both ATS scanning and human readability
- Balance information density with white space

## Document Structure Self-Check
Before finalizing any LaTeX document, verify:
1. **All content is properly sectioned** - no floating subsections or content outside section environments
2. **Environment matching** - every \begin has a corresponding \end
3. **Logical section order** - Education, Skills, Projects, Awards, Certifications, etc.
4. **Consistent formatting** - similar content types use similar commands from the template
5. **Complete document structure** - proper \documentclass to \end{document}

## Skills Formatting
- Group skills logically into categories: "Programming: Python, Java | Tools: Git, Docker"
- Use category names that make sense: Programming Languages, Frameworks, Tools, Databases, Cloud
- Don't list skills randomly - organize them intelligently

## ATS Compatibility
- Use clean, scannable formatting
- Ensure proper text hierarchy
- Include relevant keywords naturally in content
- Maintain readable structure for automated parsing

## Content Organization
- Follow the template's section patterns as a guideline
- Use appropriate template commands when they fit the content
- Make intelligent modifications when the template doesn't quite fit the need
- Group related information logically
- Prioritize readability and professional appearance 