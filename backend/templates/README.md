# LaTeX Resume Templates

This directory contains LaTeX templates for generating professional resumes. The AI service can analyze these templates and generate appropriate LaTeX content based on user data.

## Directory Structure

Each template is organized in its own directory containing:
- `template_name.cls` - The LaTeX class file defining the structure and design
- `preview.png` - Preview image showing the template's appearance

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

## Available Templates

### 1. Professional Resume (professional_resume.cls)
- **Type**: Class file (.cls)
- **Style**: Clean and professional layout with excellent ATS optimization
- **Category**: Professional
- **ATS Score**: 95/100
- **Key Commands**: 
  - `\name{Name}` - Set the candidate's name
  - `\address{Contact Info}` - Add contact information lines
  - `\rSection{Section Title}` - Create major resume sections
  - `\rSubsection{Company}{Dates}{Position}{Location}` - Format work experience
- **Features**:
  - ATS-optimized structure for automated screening systems
  - Clean and scannable layout
  - Hyperlinked contact information
  - Standard section organization
  - Compatible with all industries
  - Professional formatting
- **Best For**: Traditional industries, corporate positions, formal applications

### 2. Smooth CV (smooth_cv.cls)
- **Type**: Class file (.cls)
- **Style**: Modern and elegant design with smooth formatting elements
- **Category**: Modern
- **ATS Score**: 88/100
- **Key Commands**:
  - `\section{Section Title}` - Create section headers
  - `\resumeSubheading{Title}{Dates}{Subtitle}{Location}` - Format entries
  - `\resumeItem{Description}` - Add bullet points
  - `\resumeSubHeadingListStart` / `\resumeSubHeadingListEnd` - Begin/end entry lists
  - `\resumeItemListStart` / `\resumeItemListEnd` - Begin/end bullet point lists
- **Features**:
  - Modern typography with Gentium font
  - Color-coded hyperlinks (red, blue, green themes)
  - Professional header with page numbers
  - Flexible list environments
  - Academic and professional styling
  - Elegant section formatting
- **Best For**: Academic positions, modern companies, tech industry, research roles

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

## Adding New Templates

To add a new template:

1. **Create template directory**: `templates/new_template_name/`
2. **Add .cls file**: `new_template_name.cls` with LaTeX class definition
3. **Add preview image**: `preview.png` showing template appearance
4. **Update template metadata** in `routes/templates.py`:
   - Add entry to `template_metadata` dictionary
   - Include name, description, category, features, and commands
5. **Update AI mappings** in `services/ai_latex_generator.py`:
   - Add entry to `template_mapping` dictionary
6. **Test the template** with the resume generation system

## LaTeX Dependencies

Common LaTeX packages used across templates:
- `hyperref` - Links and URLs
- `geometry` - Page layout
- `array` - Advanced tables
- `ifthen` - Conditional statements
- `parskip` - Paragraph formatting
- `titlesec` - Section formatting (smooth_cv)
- `xcolor` - Colors (smooth_cv)
- `fontawesome` - Icons (smooth_cv)
- `enumitem` - List formatting (smooth_cv)

## Template Design Guidelines

When creating new templates:

1. **ATS Compatibility**: Ensure clean, scannable formatting
2. **Standard Commands**: Use consistent command naming conventions
3. **Documentation**: Provide clear command documentation
4. **Preview Image**: Include a representative preview image
5. **Flexibility**: Design for various content types and lengths
6. **Professional Appearance**: Maintain professional standards

## File Organization

- **Template Classes (.cls)**: Define document structure, commands, and styling
- **Preview Images (.png)**: Visual representation for template selection
- **Self-contained**: Each template directory contains all necessary files
- **Scalable**: Easy to add/remove templates by managing directories

Make sure your LaTeX installation includes the required packages for proper template compilation. 