from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import os
import subprocess
import tempfile
import uuid

from database import get_db, User
from routes.auth import get_current_user

router = APIRouter()

class LaTeXCompileRequest(BaseModel):
    latex_content: str
    compiler: Optional[str] = "pdflatex"  # pdflatex, xelatex, lualatex

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
                # Copy PDF to static directory
                static_pdf_path = f"static/pdfs/{file_id}.pdf"
                with open(pdf_file, 'rb') as src:
                    with open(static_pdf_path, 'wb') as dst:
                        dst.write(src.read())
                
                # Save log
                log_path = f"static/logs/{file_id}.log"
                with open(log_path, 'w', encoding='utf-8') as f:
                    f.write(log_output)
                
                return LaTeXCompileResponse(
                    success=True,
                    pdf_url=f"/static/pdfs/{file_id}.pdf",
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

@router.get("/pdf/{file_id}")
async def get_pdf(file_id: str):
    """Serve compiled PDF file"""
    pdf_path = f"static/pdfs/{file_id}.pdf"
    if os.path.exists(pdf_path):
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"resume_{file_id}.pdf"
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