from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
import json
import logging
from datetime import datetime

from database import get_db, User, Resume
from routes.auth import get_current_user
from services.cv_parser import extract_resume_data
from services.ai_latex_generator import ai_latex_generator

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class PersonalInfo(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    linkedin: str = ""
    website: str = ""
    github: str = ""

class Experience(BaseModel):
    id: str
    company: str
    position: str
    startDate: str
    endDate: str
    location: str
    description: str
    current: bool = False

class Education(BaseModel):
    id: str
    institution: str
    degree: str
    field: str
    startDate: str
    endDate: str
    location: str
    gpa: str = ""

class Project(BaseModel):
    id: str
    name: str
    description: str
    technologies: List[str]
    startDate: str = ""
    endDate: str = ""
    url: str = ""
    github: str = ""

class Award(BaseModel):
    id: str
    title: str
    description: str
    date: Optional[str] = ""

class Certification(BaseModel):
    id: str
    name: str
    issuer: str
    date: str

class ResumeData(BaseModel):
    personalInfo: PersonalInfo
    summary: str
    experience: List[Experience]
    education: List[Education]
    skills: List[str]
    projects: List[Project]
    awards: List[Award]
    certifications: List[Certification]
    languages: List[str]
    publications: List[dict] = []
    volunteering: List[dict] = []
    speaking: List[dict] = []
    military: List[dict] = []
    references: str = ""
    hobbies: List[str] = []
    additional_sections: List[dict] = []

class ResumeCreateRequest(BaseModel):
    title: str
    template_name: str = "professional_resume"
    resume_data: ResumeData
    job_description: Optional[str] = None

class ResumeResponse(BaseModel):
    id: int
    title: str
    template_name: str
    latex_content: str
    job_description: Optional[str]
    resume_data: dict
    pdf_path: Optional[str]
    is_public: bool
    created_at: datetime
    updated_at: datetime

class AIGenerateRequest(BaseModel):
    resume_data: ResumeData
    job_description: str
    template_name: str = "professional_resume"

class ResumeUpdateRequest(BaseModel):
    title: Optional[str] = None
    latex_content: Optional[str] = None
    job_description: Optional[str] = None

@router.post("/generate-ai", response_model=dict)
async def generate_ai_resume(
    request: AIGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate LaTeX resume using AI based on resume data and job description"""
    try:
        logger.info(f"📝 RESUMES: Generating LaTeX with AI for template: {request.template_name}")
        
        # Use simple AI generation
        latex_content = ai_latex_generator.generate_latex(
            template_name=request.template_name,
            resume_data=request.resume_data.dict(),
            job_description=request.job_description
        )
        logger.info("🧠 Used AI LaTeX generation")
        
        return {
            "success": True,
            "latex_content": latex_content,
            "message": "Resume generated successfully with AI"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate resume: {str(e)}"
        )

@router.post("/parse-upload")
async def parse_uploaded_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Parse uploaded resume (PDF/DOCX) and extract data"""
    try:
        # Read file content
        content = await file.read()
        
        # Extract resume data
        resume_data = extract_resume_data(content, file.filename)
        
        return {
            "success": True,
            "resume_data": resume_data,
            "message": "Resume parsed successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse resume: {str(e)}"
        )

def analyze_detected_sections(raw_data: dict) -> dict:
    """
    Analyze what sections have meaningful data for adaptive form display
    Returns a dict indicating which optional sections should be shown
    """
    detected = {
        # Core sections are always shown, so we don't need to detect them
        "publications": len(raw_data.get("publications", [])) > 0,
        "volunteering": len(raw_data.get("volunteering", [])) > 0,
        "speaking": len(raw_data.get("speaking", [])) > 0,
        "military": len(raw_data.get("military", [])) > 0,
        "references": bool(raw_data.get("references", "").strip()),
        "hobbies": len(raw_data.get("hobbies", [])) > 0,
        
        # Enhanced fields in existing sections
        "portfolio": bool(raw_data.get("personalInfo", {}).get("portfolio", "").strip()),
        "professional_title": bool(raw_data.get("personalInfo", {}).get("title", "").strip()),
        "academic_honors": any(edu.get("honors", "") or edu.get("coursework", []) for edu in raw_data.get("education", [])),
        "enhanced_projects": any(proj.get("role", "") or proj.get("teamSize", "") for proj in raw_data.get("projects", [])),
        "enhanced_certifications": any(cert.get("credentialId", "") for cert in raw_data.get("certifications", []) if isinstance(cert, dict)),
        "additional_sections": len(raw_data.get("additional_sections", [])) > 0
    }
    
    return detected

@router.post("/extract-pdf")
async def extract_pdf_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Extract resume data from uploaded PDF"""
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported"
            )
        
        # Read file content
        content = await file.read()
        
        # Extract resume data using the existing service
        raw_data = extract_resume_data(content, file.filename)
        
        # Transform the data to match frontend expectations
        personal_info = raw_data.get("personalInfo", {})
        
        resume_data = {
            "personalInfo": {
                "name": personal_info.get("name", ""),
                "email": personal_info.get("email", ""),
                "phone": personal_info.get("phone", ""),
                "address": personal_info.get("address", ""),
                "linkedin": personal_info.get("linkedin", ""),
                "website": personal_info.get("website", ""),
                "github": personal_info.get("github", ""),
                "portfolio": personal_info.get("portfolio", ""),
                "title": personal_info.get("title", "")
            },
            "summary": raw_data.get("summary", ""),
            "experience": [],
            "education": [],
            "skills": raw_data.get("skills", []),
            "projects": [],
            "awards": [],
            "certifications": [],
            "publications": [],
            "volunteering": [],
            "speaking": [],
            "military": [],
            "references": raw_data.get("references", ""),
            "hobbies": raw_data.get("hobbies", []),
            "languages": raw_data.get("languages", [])
        }
        
        # Transform experience data
        for i, exp in enumerate(raw_data.get("experience", [])):
            resume_data["experience"].append({
                "id": str(i + 1),
                "company": exp.get("company", ""),
                "position": exp.get("position", ""),
                "startDate": exp.get("startDate", ""),
                "endDate": exp.get("endDate", ""),
                "location": exp.get("location", ""),
                "description": exp.get("description", ""),
                "current": exp.get("current", False),
                "employmentType": exp.get("employmentType", "")
            })
        
        # Transform education data
        for i, edu in enumerate(raw_data.get("education", [])):
            resume_data["education"].append({
                "id": str(i + 1),
                "institution": edu.get("institution", ""),
                "degree": edu.get("degree", ""),
                "field": edu.get("field", ""),
                "startDate": edu.get("startDate", ""),
                "endDate": edu.get("endDate", ""),
                "location": edu.get("location", ""),
                "gpa": edu.get("gpa", ""),
                "honors": edu.get("honors", ""),
                "coursework": edu.get("coursework", []) if isinstance(edu.get("coursework"), list) else []
            })
        
        # Transform projects data if available
        for i, proj in enumerate(raw_data.get("projects", [])):
            resume_data["projects"].append({
                "id": str(i + 1),
                "name": proj.get("name", ""),
                "description": proj.get("description", ""),
                "technologies": proj.get("technologies", []) if isinstance(proj.get("technologies"), list) else [],
                "startDate": proj.get("startDate", ""),
                "endDate": proj.get("endDate", ""),
                "url": proj.get("url", ""),
                "github": proj.get("github", ""),
                "role": proj.get("role", ""),
                "teamSize": proj.get("teamSize", "")
            })
        
        # Transform awards data
        for i, award in enumerate(raw_data.get("awards", [])):
            if isinstance(award, str):
                resume_data["awards"].append({
                    "id": str(i + 1),
                    "title": award,
                    "description": "",
                    "date": "",
                    "issuer": ""
                })
            elif isinstance(award, dict):
                resume_data["awards"].append({
                    "id": str(i + 1),
                    "title": award.get("title", award.get("name", "Award")),
                    "description": award.get("description", ""),
                    "date": award.get("date", ""),
                    "issuer": award.get("issuer", "")
                })
        
        # Transform certifications data
        for i, cert in enumerate(raw_data.get("certifications", [])):
            if isinstance(cert, str):
                resume_data["certifications"].append({
                    "id": str(i + 1),
                    "name": cert,
                    "issuer": "",
                    "date": "",
                    "expiryDate": "",
                    "credentialId": ""
                })
            elif isinstance(cert, dict):
                resume_data["certifications"].append({
                    "id": str(i + 1),
                    "name": cert.get("name", cert.get("title", "Certification")),
                    "issuer": cert.get("issuer", cert.get("organization", "")),
                    "date": cert.get("date", ""),
                    "expiryDate": cert.get("expiryDate", ""),
                    "credentialId": cert.get("credentialId", "")
                })
        
        # Transform publications data
        for i, pub in enumerate(raw_data.get("publications", [])):
            resume_data["publications"].append({
                "id": str(i + 1),
                "title": pub.get("title", ""),
                "authors": pub.get("authors", []) if isinstance(pub.get("authors"), list) else [],
                "venue": pub.get("venue", ""),
                "date": pub.get("date", ""),
                "url": pub.get("url", ""),
                "description": pub.get("description", "")
            })
        
        # Transform volunteering data
        for i, vol in enumerate(raw_data.get("volunteering", [])):
            resume_data["volunteering"].append({
                "id": str(i + 1),
                "organization": vol.get("organization", ""),
                "role": vol.get("role", ""),
                "description": vol.get("description", ""),
                "startDate": vol.get("startDate", ""),
                "endDate": vol.get("endDate", ""),
                "location": vol.get("location", "")
            })
        
        # Transform speaking data
        for i, speak in enumerate(raw_data.get("speaking", [])):
            resume_data["speaking"].append({
                "id": str(i + 1),
                "title": speak.get("title", ""),
                "event": speak.get("event", ""),
                "date": speak.get("date", ""),
                "location": speak.get("location", ""),
                "description": speak.get("description", ""),
                "url": speak.get("url", "")
            })
        
        # Transform military data
        for i, mil in enumerate(raw_data.get("military", [])):
            resume_data["military"].append({
                "id": str(i + 1),
                "branch": mil.get("branch", ""),
                "rank": mil.get("rank", ""),
                "startDate": mil.get("startDate", ""),
                "endDate": mil.get("endDate", ""),
                "description": mil.get("description", ""),
                "location": mil.get("location", "")
            })
        
        # Transform additional sections (dynamic content)
        additional_sections = raw_data.get("additional_sections", [])
        resume_data["additional_sections"] = []
        
        for i, section in enumerate(additional_sections):
            if isinstance(section, dict):
                resume_data["additional_sections"].append({
                    "id": str(i + 1),
                    "section_name": section.get("section_name", f"Additional Section {i + 1}"),
                    "content": section.get("content", ""),
                    "type": section.get("type", "text")
                })
        
        # Update section detection to include additional sections
        additional_sections_detected = len(resume_data["additional_sections"]) > 0
        
        # Analyze what sections were detected for adaptive form
        detected_sections = analyze_detected_sections(raw_data)
        
        return {
            "resume_data": resume_data,
            "detected_sections": detected_sections,
            "extraction_summary": {
                "total_sections": len([k for k, v in detected_sections.items() if v]),
                "core_sections": 4,  # personal, experience, education, skills always shown
                "optional_sections": len([k for k, v in detected_sections.items() if v and k in ["publications", "volunteering", "speaking", "military", "references", "hobbies"]]),
                "additional_sections": len(resume_data["additional_sections"])
            },

        }
        
    except Exception as e:
        logger.error(f"Failed to extract PDF data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract PDF data: {str(e)}"
        )

@router.post("/", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(
    request: ResumeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new resume using AI-generated LaTeX"""
    
    # Generate LaTeX content using AI
    logger.info(f"📝 RESUMES: Generating LaTeX for template: {request.template_name}")
    
    latex_content = ai_latex_generator.generate_latex(
        template_name=request.template_name,
        resume_data=request.resume_data.dict(),
        job_description=request.job_description
    )
    logger.info("🧠 Used AI LaTeX generation")
    

    
    # Create resume in database
    db_resume = Resume(
        user_id=current_user.id,
        title=request.title,
        template_name=request.template_name,
        latex_content=latex_content,
        job_description=request.job_description,
        resume_data=json.dumps(request.resume_data.dict())
    )
    
    db.add(db_resume)
    await db.commit()
    await db.refresh(db_resume)
    
    logger.info(f"💾 Saved AI-generated resume to database with {len(latex_content)} characters")
    
    return ResumeResponse(
        id=db_resume.id,
        title=db_resume.title,
        template_name=db_resume.template_name,
        latex_content=db_resume.latex_content,
        job_description=db_resume.job_description,
        resume_data=json.loads(db_resume.resume_data),
        pdf_path=db_resume.pdf_path,
        is_public=db_resume.is_public,
        created_at=db_resume.created_at,
        updated_at=db_resume.updated_at
    )

@router.get("/", response_model=List[ResumeResponse])
async def get_user_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all resumes for current user"""
    result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.updated_at.desc())
    )
    resumes = result.scalars().all()
    
    return [
        ResumeResponse(
            id=resume.id,
            title=resume.title,
            template_name=resume.template_name,
            latex_content=resume.latex_content,
            job_description=resume.job_description,
            resume_data=json.loads(resume.resume_data),
            pdf_path=resume.pdf_path,
            is_public=resume.is_public,
            created_at=resume.created_at,
            updated_at=resume.updated_at
        )
        for resume in resumes
    ]

@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific resume"""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        template_name=resume.template_name,
        latex_content=resume.latex_content,
        job_description=resume.job_description,
        resume_data=json.loads(resume.resume_data),
        pdf_path=resume.pdf_path,
        is_public=resume.is_public,
        created_at=resume.created_at,
        updated_at=resume.updated_at
    )

@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: int,
    request: ResumeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update resume content"""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Update fields if provided
    if request.title is not None:
        resume.title = request.title
    if request.latex_content is not None:
        resume.latex_content = request.latex_content
    if request.job_description is not None:
        resume.job_description = request.job_description
    
    resume.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(resume)
    
    logger.info(f"💾 Updated resume {resume_id} - Title: {resume.title}, LaTeX length: {len(resume.latex_content) if resume.latex_content else 0}")
    
    return ResumeResponse(
        id=resume.id,
        title=resume.title,
        template_name=resume.template_name,
        latex_content=resume.latex_content,
        job_description=resume.job_description,
        resume_data=json.loads(resume.resume_data),
        pdf_path=resume.pdf_path,
        is_public=resume.is_public,
        created_at=resume.created_at,
        updated_at=resume.updated_at
    )

@router.put("/{resume_id}/title")
async def update_resume_title(
    resume_id: int,
    new_title: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update resume title"""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    resume.title = new_title
    resume.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(resume)
    
    return {"message": "Resume title updated successfully", "title": resume.title}

@router.get("/{resume_id}/preview")
async def get_resume_preview(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get resume preview (LaTeX content for viewing)"""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    return {
        "id": resume.id,
        "title": resume.title,
        "template_name": resume.template_name,
        "latex_content": resume.latex_content,
        "created_at": resume.created_at,
        "updated_at": resume.updated_at
    }

@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete resume"""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    await db.delete(resume)
    await db.commit()
    
    return {"message": "Resume deleted successfully"} 