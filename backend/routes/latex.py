from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import Optional
import json
import os
import subprocess
import tempfile
import uuid
import re

from routes.auth import get_current_user
from pydantic import BaseModel
router = APIRouter(prefix="/latex", tags=["latex"])

class LaTeXCompileRequest(BaseModel):
    latex_content: str
    compiler: Optional[str] = "pdflatex"  # pdflatex, xelatex, lualatex
    resume_title: Optional[str] = None  # User's resume title for filename

class LaTeXCompileResponse(BaseModel):
    success: bool
    filename: Optional[str] = None  # Add filename for browser storage
    log_output: str
    errors: Optional[str] = None

# Remove static directory creation - no longer needed
# os.makedirs("static/pdfs", exist_ok=True)
# os.makedirs("static/logs", exist_ok=True)

@router.post("/compile")
async def compile_latex(
    request: LaTeXCompileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Compile LaTeX content to PDF and stream directly to browser"""
    
    print("[DEBUG] Compile endpoint called - LaTeX content length:", len(request.latex_content))
    
    try:
        # Generate unique filename for this compilation
        file_id = str(uuid.uuid4())
        
        # Create temporary directory for compilation
        with tempfile.TemporaryDirectory() as temp_dir:
            # Write LaTeX content to file
            tex_file = os.path.join(temp_dir, f"{file_id}.tex")
            with open(tex_file, 'w', encoding='utf-8') as f:
                f.write(request.latex_content)
            
            # Copy all template files to temp directory
            templates_dir = "templates"
            if os.path.exists(templates_dir):
                for template_name in os.listdir(templates_dir):
                    template_path = os.path.join(templates_dir, template_name)
                    if os.path.isdir(template_path):
                        cls_file = os.path.join(template_path, f"{template_name}.cls")
                        if os.path.exists(cls_file):
                            target_path = os.path.join(temp_dir, f"{template_name}.cls")
                            with open(cls_file, 'r', encoding='utf-8') as src:
                                with open(target_path, 'w', encoding='utf-8') as dst:
                                    dst.write(src.read())
            
            # Compile with pdflatex
            try:
                result = subprocess.run([
                    request.compiler,
                    "-interaction=nonstopmode",
                    "-output-directory", temp_dir,
                    tex_file
                ], capture_output=True, text=True, timeout=30, encoding='utf-8', errors='replace')
                
                stdout = result.stdout or ""
                stderr = result.stderr or ""
                log_output = stdout + stderr
                
                # Check if PDF was generated
                pdf_file = os.path.join(temp_dir, f"{file_id}.pdf")
                if os.path.exists(pdf_file):
                    # Create meaningful filename (clean for HTTP header)
                    meaningful_filename = create_pdf_filename_from_title(request.resume_title) if request.resume_title else "resume"
                    # Ensure filename is ASCII safe for headers
                    safe_filename = safe_ascii(meaningful_filename)
                    
                    # Read PDF content into memory
                    with open(pdf_file, 'rb') as f:
                        pdf_content = f.read()
                    
                    # Stream PDF directly to browser with safe headers
                    return StreamingResponse(
                        iter([pdf_content]),
                        media_type="application/pdf",
                        headers={
                            "Content-Disposition": f'inline; filename="{safe_filename}.pdf"',
                            "X-Filename": f"{safe_filename}.pdf",
                            "X-Success": "true"
                        }
                    )
                else:
                    # Print log output for debugging
                    print("[LaTeX Compile Error]", log_output[:1000])
                    # Return empty PDF with error status
                    return StreamingResponse(
                        iter([b""]),
                        media_type="application/pdf",
                        headers={
                            "X-Success": "false",
                            "X-Error": safe_ascii("PDF_generation_failed")
                        }
                    )
                    
            except subprocess.TimeoutExpired as e:
                print("[LaTeX Timeout]", str(e))
                return StreamingResponse(
                    iter([b""]),
                    media_type="application/pdf",
                    headers={
                        "X-Success": "false",
                        "X-Error": safe_ascii("Compilation_timeout")
                    }
                )
            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                print("[LaTeX Compile Exception]", tb)
                # Clean error message for header safety
                safe_error = safe_ascii(str(e))[:100]
                return StreamingResponse(
                    iter([b""]),
                    media_type="application/pdf",
                    headers={
                        "X-Success": "false",
                        "X-Error": f"Compilation_error_{safe_error}"
                    }
                )
    
    except Exception as e:
        # Catch-all for any exception in the entire function
        import traceback
        tb = traceback.format_exc()
        print("[Function Exception]", tb)
        safe_error = safe_ascii(str(e))[:100]
        return StreamingResponse(
            iter([b""]),
            media_type="application/pdf",
            headers={
                "X-Success": "false",
                "X-Error": f"Setup_error_{safe_error}"
            }
        )

def extract_name_from_latex(latex_content: str) -> Optional[str]:
    """Extract name from LaTeX content for filename generation"""
    import re
    
    # Try to find name in AltaCV format: \name{...}
    name_match = re.search(r'\\name\{([^}]+)\}', latex_content)
    if name_match:
        name = name_match.group(1).strip()
        # Clean up the name for filename (remove LaTeX commands, etc.)
        name = re.sub(r'\\[a-zA-Z]+\{[^}]*\}', '', name)  # Remove LaTeX commands
        name = re.sub(r'\\[a-zA-Z]+', '', name)  # Remove simple LaTeX commands
        name = re.sub(r'[{}]', '', name)  # Remove braces
        name = name.strip()
        if name:
            return name
    
    # Try to find name in Professional Resume format: look for \printname or similar
    # Professional resume uses \@name which gets set by \name command, same pattern
    
    # Try to find in personalinfo for AltaCV: \personalinfo{...}
    personalinfo_match = re.search(r'\\personalinfo\{([^}]+)\}', latex_content, re.DOTALL)
    if personalinfo_match:
        # Look for email pattern and extract name before @
        email_match = re.search(r'([a-zA-Z\s\.]+)@', personalinfo_match.group(1))
        if email_match:
            potential_name = email_match.group(1).strip()
            # Basic validation - contains letters and possibly spaces/dots
            if re.match(r'^[a-zA-Z\s\.]+$', potential_name) and len(potential_name) > 2:
                return potential_name
    
    # Try to find in header content - look for large text that might be a name
    header_patterns = [
        r'\\Huge[^{]*\{([^}]+)\}',
        r'\\LARGE[^{]*\{([^}]+)\}',
        r'\\large[^{]*\{([^}]+)\}',
        r'\\textbf\{\\Huge\s*([^}]+)\}',
        r'\\MakeUppercase\{([^}]+)\}'
    ]
    
    for pattern in header_patterns:
        match = re.search(pattern, latex_content)
        if match:
            potential_name = match.group(1).strip()
            # Clean up LaTeX commands
            potential_name = re.sub(r'\\[a-zA-Z]+\{[^}]*\}', '', potential_name)
            potential_name = re.sub(r'\\[a-zA-Z]+', '', potential_name)
            potential_name = re.sub(r'[{}]', '', potential_name)
            potential_name = potential_name.strip()
            
            # Basic validation for name-like content
            if (potential_name and 
                len(potential_name) > 2 and 
                len(potential_name) < 50 and
                re.match(r'^[a-zA-Z\s\.-]+$', potential_name)):
                return potential_name
    
    return None

def create_pdf_filename_from_title(title: str) -> str:
    """Create a clean filename from the resume title"""
    if not title or not title.strip():
        return "resume"
    
    # Clean the title for filename use
    filename = title.strip()
    
    # Replace spaces with underscores, remove special characters
    filename = re.sub(r'[^\w\s-]', '', filename)  # Keep word chars, spaces, hyphens
    filename = re.sub(r'\s+', '_', filename)       # Replace spaces with underscores
    filename = filename.strip('_')                 # Remove leading/trailing underscores
    
    # Limit length and ensure it's not empty
    if len(filename) > 50:  # Allow longer titles since users control this
        filename = filename[:50].rstrip('_')
    
    # Don't add "Resume" suffix if it's already in the title
    if not filename.lower().endswith('resume') and not filename.lower().endswith('cv'):
        filename = f"{filename}_Resume"
    
    return filename if filename else "resume"

def create_pdf_filename(name: str) -> str:
    """Create a clean filename from a person's name (legacy - for LaTeX extraction)"""
    if not name:
        return "resume"
    
    # Clean and format the name for filename use
    # Remove any remaining LaTeX commands
    filename = re.sub(r'\\[a-zA-Z]*\*?(?:\[[^\]]*\])?\{[^}]*\}', '', name)
    filename = re.sub(r'\\[a-zA-Z]*\*?', '', filename)
    
    # Replace spaces with underscores, remove special characters
    filename = re.sub(r'[^\w\s-]', '', filename)  # Keep word chars, spaces, hyphens
    filename = re.sub(r'\s+', '_', filename)       # Replace spaces with underscores
    filename = filename.strip('_')                 # Remove leading/trailing underscores
    
    # Limit length and ensure it's not empty
    if len(filename) > 30:
        filename = filename[:30].rstrip('_')
    
    # Add "Resume" suffix for clarity
    result = f"{filename}_Resume" if filename else "resume"
    
    return result

# PDF serving endpoints removed - PDFs are now streamed directly from compile endpoint

@router.post("/compile-for-analysis", response_model=dict)
async def compile_latex_for_analysis(
    request: LaTeXCompileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Compile LaTeX and return PDF as base64 for AI analysis"""
    import base64
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    
    # Create temporary directory for compilation
    with tempfile.TemporaryDirectory() as temp_dir:
        # Write LaTeX content to file
        tex_file = os.path.join(temp_dir, f"{file_id}.tex")
        with open(tex_file, 'w', encoding='utf-8') as f:
            f.write(request.latex_content)
        
        # Copy all template files to temp directory
        templates_dir = "templates"
        if os.path.exists(templates_dir):
            for template_name in os.listdir(templates_dir):
                template_path = os.path.join(templates_dir, template_name)
                if os.path.isdir(template_path):
                    cls_file = os.path.join(template_path, f"{template_name}.cls")
                    if os.path.exists(cls_file):
                        target_path = os.path.join(temp_dir, f"{template_name}.cls")
                        with open(cls_file, 'r', encoding='utf-8') as src:
                            with open(target_path, 'w', encoding='utf-8') as dst:
                                dst.write(src.read())
        
        # Compile with pdflatex
        try:
            result = subprocess.run([
                request.compiler,
                "-interaction=nonstopmode",
                "-output-directory", temp_dir,
                tex_file
            ], capture_output=True, text=True, timeout=30)
            
            log_output = result.stdout + result.stderr
            
            # Check if PDF was generated
            pdf_file = os.path.join(temp_dir, f"{file_id}.pdf")
            if os.path.exists(pdf_file):
                # Extract name for meaningful filename
                extracted_name = extract_name_from_latex(request.latex_content)
                meaningful_filename = create_pdf_filename(extracted_name) if extracted_name else "resume"
                
                # Read PDF as binary and encode to base64
                with open(pdf_file, 'rb') as f:
                    pdf_binary = f.read()
                    pdf_base64 = base64.b64encode(pdf_binary).decode('utf-8')
                
                return {
                    "success": True,
                    "pdf_base64": pdf_base64,
                    "filename": f"{meaningful_filename}.pdf",
                    "log_output": log_output
                }
            else:
                return {
                    "success": False,
                    "error": "PDF generation failed. Check the log for errors.",
                    "log_output": log_output
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Compilation timed out after 30 seconds",
                "log_output": ""
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Compilation error: {str(e)}",
                "log_output": ""
            }

@router.get("/template")
async def get_resume_template():
    """Get the professional_resume.cls template content"""
    template_path = "templates/professional_resume/professional_resume.cls"
    if os.path.exists(template_path):
        with open(template_path, 'r', encoding='utf-8') as f:
            return {"template": f.read()}
    else:
        raise HTTPException(status_code=404, detail="Template not found")

@router.post("/validate")
async def validate_latex(
    request: LaTeXCompileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Validate LaTeX syntax without full compilation"""
    # This is a simplified validation - you could use a LaTeX parser
    # For now, just check for basic syntax
    content = request.latex_content
    
    errors = []
    warnings = []
    
    # Basic validation checks
    if "\\documentclass" not in content:
        errors.append("Missing \\documentclass command")
    
    if "\\begin{document}" not in content:
        errors.append("Missing \\begin{document}")
    
    if "\\end{document}" not in content:
        errors.append("Missing \\end{document}")
    
    # Check for unmatched braces (simplified)
    open_braces = content.count('{')
    close_braces = content.count('}')
    if open_braces != close_braces:
        warnings.append(f"Unmatched braces: {open_braces} open, {close_braces} close")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    } 

def safe_ascii(s):
    return re.sub(r'[^\x00-\x7F]+', '_', s) 