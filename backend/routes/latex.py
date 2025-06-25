from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import os
import subprocess
import tempfile
import uuid
import json
import re

from database import get_db, User
from routes.auth import get_current_user

router = APIRouter()

class LaTeXCompileRequest(BaseModel):
    latex_content: str
    compiler: Optional[str] = "pdflatex"  # pdflatex, xelatex, lualatex
    resume_title: Optional[str] = None  # User's resume title for filename

class LaTeXCompileResponse(BaseModel):
    success: bool
    pdf_url: Optional[str] = None
    log_output: str
    errors: Optional[str] = None

# Ensure static directory exists
os.makedirs("static/pdfs", exist_ok=True)
os.makedirs("static/logs", exist_ok=True)

@router.post("/compile", response_model=LaTeXCompileResponse)
async def compile_latex(
    request: LaTeXCompileRequest,
    current_user: User = Depends(get_current_user)
):
    """Compile LaTeX content to PDF"""
    
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
                # Use resume title for meaningful filename
                meaningful_filename = create_pdf_filename_from_title(request.resume_title) if request.resume_title else "resume"
                
                # Copy PDF to static directory
                static_pdf_path = f"static/pdfs/{file_id}.pdf"
                with open(pdf_file, 'rb') as src:
                    with open(static_pdf_path, 'wb') as dst:
                        dst.write(src.read())
                
                # Save log with additional metadata
                log_path = f"static/logs/{file_id}.log"
                with open(log_path, 'w', encoding='utf-8') as f:
                    f.write(log_output)
                
                # Store filename mapping for the get_pdf endpoint
                metadata_path = f"static/logs/{file_id}.meta"
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    f.write(json.dumps({
                        "resume_title": request.resume_title,
                        "filename": meaningful_filename,
                        "original_file_id": file_id
                    }))
                
                return LaTeXCompileResponse(
                    success=True,
                    pdf_url=f"/api/latex/pdf/{file_id}",
                    log_output=log_output
                )
            else:
                return LaTeXCompileResponse(
                    success=False,
                    log_output=log_output,
                    errors="PDF generation failed. Check the log for errors."
                )
                
        except subprocess.TimeoutExpired:
            return LaTeXCompileResponse(
                success=False,
                log_output="",
                errors="Compilation timed out after 30 seconds"
            )
        except Exception as e:
            return LaTeXCompileResponse(
                success=False,
                log_output="",
                errors=f"Compilation error: {str(e)}"
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

@router.get("/pdf/{file_id}")
async def get_pdf(file_id: str):
    """Serve compiled PDF file with meaningful filename"""
    pdf_path = f"static/pdfs/{file_id}.pdf"
    if os.path.exists(pdf_path):
        meaningful_filename = "resume"
        
        # Try to load filename from metadata
        metadata_path = f"static/logs/{file_id}.meta"
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.loads(f.read())
                    meaningful_filename = metadata.get("filename", "resume")
                print(f"✅ PDF Download: Serving {file_id} as '{meaningful_filename}.pdf'")
            except Exception as e:
                # If metadata fails to load, fall back to default
                print(f"Warning: Could not load metadata for {file_id}: {e}")
                pass
        else:
            print(f"⚠️ PDF Download: No metadata found for {file_id}, using default filename")
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"{meaningful_filename}.pdf",
            headers={
                "Content-Disposition": f"inline; filename=\"{meaningful_filename}.pdf\""
            }
        )
    else:
        raise HTTPException(status_code=404, detail="PDF not found")

@router.get("/log/{file_id}")
async def get_compile_log(file_id: str):
    """Get compilation log for debugging"""
    log_path = f"static/logs/{file_id}.log"
    if os.path.exists(log_path):
        with open(log_path, 'r', encoding='utf-8') as f:
            return {"log": f.read()}
    else:
        raise HTTPException(status_code=404, detail="Log not found")

@router.post("/compile-for-analysis", response_model=dict)
async def compile_latex_for_analysis(
    request: LaTeXCompileRequest,
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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