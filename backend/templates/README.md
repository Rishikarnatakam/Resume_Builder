# Resume Templates

This directory contains professional LaTeX resume templates optimized for ATS systems.

## Available Templates

### 1. Professional Resume (`professional_resume/`)
- **Type**: Traditional professional resume
- **Features**: ATS-optimized, clean layout, standard sections
- **Best for**: Corporate positions, traditional industries
- **Commands**: `\name`, `\address`, `\rSection`, `\rSubsection`

## Template Structure

Each template directory contains:
- `{template_name}.cls` - LaTeX class file with template formatting
- `preview.png` - Preview image for the frontend (optional)

## Adding New Templates

1. Create a new directory with the template name
2. Add the `.cls` file with the same name as the directory
3. Add a `preview.png` image (recommended: 800x1000px)
4. Update the template metadata in `routes/templates.py`

## Template Requirements

All templates must:
- Support `\href{}{}` commands for ATS-friendly links
- Include proper section organization
- Be optimized for LaTeX compilation
- Support standard resume sections (experience, education, skills, etc.)
- Follow strict spacing guidelines to prevent margin violations
- Ensure header and content are on the same page (no page breaks after header)
- Use only template's built-in spacing commands

## Recent Improvements (v2.0)

### Spacing and Layout Fixes
- **Fixed redundant spacing**: Eliminated excessive whitespace and margin violations
- **Header positioning**: Ensured headers don't leave entire pages blank
- **Two-column enforcement**: AltaCV now consistently creates proper two-column layouts
- **Margin compliance**: All text now stays within proper page margins
- **ATS optimization**: Improved compatibility with ATS scanning systems

### Template-Specific Instructions
Each template now includes comprehensive `instructions.txt` files with:
- Layout requirements and column specifications
- Spacing and margin guidelines
- Command usage examples
- ATS optimization rules
- **AI Generation Rules**: Complete prompts and instructions for AI generation
- **Template-specific formatting requirements**
- **Project organization and content structure guidelines**

### AI Generation Architecture
The AI generation system now uses a modular approach:
- **General Instructions**: Basic LaTeX generation rules in `ai_latex_generator.py`
- **Template-Specific Instructions**: Detailed template rules in each `instructions.txt`
- **Adaptive Section Creation**: Dynamic section generation based on user data
- **Template Command Learning**: AI learns from template's existing patterns

```
templates/
├── professional_resume/
│   ├── professional_resume.cls
│   └── preview.png
├── smooth_cv/
│   ├── smooth_cv.cls
│   └── preview.png
└── README.md
```

## Template Usage

### AI Service Integration

The AI service automatically:
1. Reads the template .cls file content from the appropriate directory
2. Analyzes available commands and environments
3. Generates appropriate LaTeX code using the template's structure
4. Organizes user data according to the template's style and commands

### Template Selection

Templates are identified by their directory names:
- `professional_resume` → Professional Resume template
- `smooth_cv` → Smooth CV template

### API Endpoints

- `GET /api/templates/` - List all available templates with metadata
- `GET /api/templates/{template_id}` - Get specific template details and content
- `GET /api/templates/{template_id}/preview-image` - Get template preview image
- `GET /api/templates/{template_id}/ats-analysis` - Get ATS compatibility analysis

## LaTeX Dependencies

Common LaTeX packages used across templates:
- `hyperref` - Links and URLs
- `geometry`