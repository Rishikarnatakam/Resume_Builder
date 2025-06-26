import os
from typing import Dict, Any, Optional, List
from docx import Document
import pdfplumber
import PyPDF2
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types
import json
import io
import logging

load_dotenv()

# Import config
from utils.config import get_gemini_model, get_gemini_api_key

logger = logging.getLogger(__name__)

class CVParser:
    def __init__(self):
        self.api_key = get_gemini_api_key()
        
        # Use modern google-genai client
        self.client = genai.Client(api_key=self.api_key)

def extract_resume_data(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Enhanced resume data extraction with AI-first approach
    PRIMARY: PDF → AI direct processing → Auto-fills form
    FALLBACK: PDF → Text → AI extraction → Auto-fills form
    """
    try:
        file_extension = filename.lower().split('.')[-1]
        
        if file_extension == 'pdf':
            # Primary approach: Send PDF directly to AI
            print("🤖 Attempting direct PDF-to-AI extraction...")
            ai_result = extract_resume_data_from_pdf_ai_primary(file_content, filename)
            
            if ai_result and _validate_extraction_quality(ai_result):
                print("✅ Direct PDF-to-AI extraction successful!")
                return ai_result
            else:
                print("⚠️ Direct PDF-to-AI failed or low quality, falling back to text-based approach...")
                # Fallback to existing text-based approach
                text = extract_text_from_pdf(file_content)
                return parse_resume_text(text)
                
        elif file_extension in ['docx', 'doc']:
            text = extract_text_from_docx(file_content)
            return parse_resume_text(text)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
        
    except Exception as e:
        logger.error(f"Error extracting resume data: {str(e)}")
        raise

def extract_resume_data_from_pdf_ai_primary(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    PRIMARY AI EXTRACTOR: Send PDF directly to Gemini AI for comprehensive analysis.
    This approach allows AI to:
    1. Handle ANY section type (including unseen/custom sections)
    2. Maintain visual layout understanding
    3. Process complex formatting and graphics
    4. Categorize unknown content intelligently
    """
    try:
        print(f"🚀 AI-First PDF Analysis: Processing {len(file_content)} bytes...")
        
        parser = CVParser()

        # Enhanced comprehensive prompt for direct PDF processing with intelligent mapping
        prompt = f"""You are an expert AI resume parser with INTELLIGENT SECTION MAPPING capabilities. Your task is to extract ALL information from this PDF resume and intelligently map it to a standardized structure, regardless of how sections are named.

CRITICAL INSTRUCTIONS:
1. INTELLIGENT MAPPING: Different resumes use different names for the same content. Map intelligently:
   - "Achievements" = "Awards" = "Honors" = "Recognitions" = "Accomplishments" → map to "awards"
   - "Experience" = "Work History" = "Employment" = "Professional Experience" = "Career" → map to "experience"  
   - "Skills" = "Competencies" = "Technical Skills" = "Proficiencies" = "Expertise" → map to "skills"
   - "Projects" = "Portfolio" = "Work Samples" = "Personal Projects" = "Side Projects" → map to "projects"
   - "Education" = "Academic Background" = "Qualifications" = "Learning" → map to "education"
   - "Certifications" = "Licenses" = "Credentials" = "Professional Certifications" → map to "certifications"
   - "Languages" = "Language Skills" = "Linguistic Abilities" → map to "languages"
   - "Publications" = "Research" = "Papers" = "Articles" = "Books" → map to "publications"
   - "Volunteering" = "Community Service" = "Volunteer Work" = "Social Impact" → map to "volunteering"
   - "Speaking" = "Presentations" = "Talks" = "Conferences" = "Public Speaking" → map to "speaking"
   - "Military" = "Military Service" = "Armed Forces" = "Military Experience" → map to "military"
   - "References" = "Professional References" = "Recommendations" → map to "references"
   - "Interests" = "Hobbies" = "Personal Interests" = "Activities" → map to "hobbies"

2. COMPREHENSIVE EXTRACTION: Extract ALL content regardless of section names
3. FLEXIBLE CATEGORIZATION: If content doesn't fit standard categories, put it in additional_sections with EXACT section name
4. PRESERVE CONTENT: Extract actual text - don't create or paraphrase  
5. COMPREHENSIVE CAPTURE: ANY section not in standard list goes to additional_sections
6. STRUCTURED OUTPUT: Return exact JSON structure for frontend compatibility

Return EXACTLY this JSON structure (populate ALL fields you can find, use empty string "" or empty array [] if not found):

{{
    "personalInfo": {{
        "name": "Full name of person",
        "email": "Email address", 
        "phone": "Phone number",
        "address": "Full address/location",
        "linkedin": "LinkedIn URL or username",
        "website": "Personal website URL",
        "github": "GitHub URL or username",
        "portfolio": "Portfolio website URL",
        "title": "Professional title or current role"
    }},
    "summary": "Professional summary/objective (extract actual text, don't create)",
    "experience": [
        {{
            "company": "Company name",
            "position": "Job title", 
            "location": "Work location",
            "startDate": "Start date",
            "endDate": "End date or Present",
            "current": true/false,
            "description": "Detailed job description and achievements",
            "employmentType": "Full-time/Part-time/Contract/Internship"
        }}
    ],
    "education": [
        {{
            "institution": "School/University name",
            "degree": "Degree type",
            "field": "Field of study/Major",
            "location": "School location", 
            "startDate": "Start date",
            "endDate": "End date",
            "gpa": "GPA if mentioned",
            "honors": "Academic honors or distinctions",
            "coursework": ["Relevant coursework if mentioned"]
        }}
    ],
    "skills": ["skill1", "skill2", "skill3", "skill4"],
    "projects": [
        {{
            "name": "Project name",
            "description": "Project description",
            "technologies": ["tech1", "tech2"],
            "url": "Project URL if available",
            "github": "GitHub URL if available",
            "startDate": "Start date if available",
            "endDate": "End date if available",
            "role": "Your role in the project",
            "teamSize": "Team size if mentioned"
        }}
    ],
    "awards": [
        {{
            "title": "Award title",
            "description": "Award description", 
            "date": "Date received",
            "issuer": "Issuing organization"
        }}
    ],
    "certifications": [
        {{
            "name": "Certification name",
            "issuer": "Issuing organization",
            "date": "Date received",
            "expiryDate": "Expiry date if applicable",
            "credentialId": "Credential ID if mentioned"
        }}
    ],
    "publications": [
        {{
            "title": "Publication title",
            "authors": ["Author names"],
            "venue": "Publication venue/journal/conference",
            "date": "Publication date",
            "url": "URL if available",
            "description": "Brief description if available"
        }}
    ],
    "volunteering": [
        {{
            "organization": "Organization name",
            "role": "Volunteer role/position",
            "description": "Description of activities and impact",
            "startDate": "Start date",
            "endDate": "End date",
            "location": "Location if mentioned"
        }}
    ],
    "speaking": [
        {{
            "title": "Talk/presentation title",
            "event": "Event or conference name",
            "date": "Date of presentation",
            "location": "Location or virtual",
            "description": "Brief description of topic",
            "url": "Recording or slides URL if available"
        }}
    ],
    "military": [
        {{
            "branch": "Military branch",
            "rank": "Rank achieved",
            "startDate": "Start date",
            "endDate": "End date",
            "description": "Description of service and responsibilities",
            "location": "Location of service"
        }}
    ],
    "references": "References information if mentioned (or 'Available upon request')",
    "hobbies": ["Interest1", "Interest2", "Interest3"],
    "languages": ["Language1", "Language2"],
    "additional_sections": [
        {{
            "section_name": "Name of any additional/unknown section",
            "content": "Complete content of that section",
            "type": "text"
        }}
    ]
}}

HYBRID APPROACH INSTRUCTIONS:
- STANDARD SECTIONS: Map known content to structured fields above
- ADDITIONAL SECTIONS: Capture ANY other content in additional_sections array
- Examples of additional sections: ANY section not in standard categories - "Relevant Coursework", "Thesis Work", "Research Interests", "Leadership Experience", "Position of Responsibility", "Extracurricular Activities", "Open Source Contributions", "Professional Memberships", "Patents", "Teaching Experience", etc.
- If you find content that doesn't fit standard categories, add it to additional_sections
- Preserve section names exactly as they appear in the resume
- Capture complete content - don't summarize or truncate

INTELLIGENT MAPPING EXAMPLES:
- If you see "Accomplishments" section → extract items and map to "awards"
- If you see "Tech Stack" → extract skills and map to "skills" array
- If you see "Portfolio Projects" → extract and map to "projects"
- If you see "Academic Background" → extract and map to "education"
- If you see "Professional Development" → map relevant items to "certifications"
- If you see "Research Papers" → extract and map to "publications"
- If you see "Community Involvement" → extract and map to "volunteering"
- If you see "Conference Talks" → extract and map to "speaking"
- If you see "Relevant Coursework" → add to additional_sections  
- If you see "Thesis Work" → add to additional_sections
- If you see "Leadership Experience" → add to additional_sections
- If content doesn't fit standard categories, add to additional_sections with EXACT section name
- For ANY unknown section, preserve the exact section name and complete content

SKILLS PROCESSING:
- Combine ALL skill-related content into one flat array
- Include: technical skills, programming languages, tools, software, frameworks
- Format as simple array: ["JavaScript", "Python", "React", "AWS", "Docker"]
- Don't create nested categories - flatten everything

EDUCATION SMART SEPARATION:
- Use your intelligence to separate degree and field properly
- Examples: "B. Tech AI & ML" → degree="B. Tech", field="AI & ML" 
- Examples: "Bachelor of Technology in Computer Science" → degree="Bachelor of Technology", field="Computer Science"
- Examples: "Master of Science Computer Science" → degree="Master of Science", field="Computer Science"
- Examples: "Ph.D. Machine Learning" → degree="Ph.D.", field="Machine Learning"
- Don't use rigid patterns - understand context and meaning
- If degree text contains both degree type and subject, intelligently separate them

PROCESSING RULES:
- Extract EVERYTHING - don't miss any content
- Be comprehensive - include ALL skills, projects, achievements, publications, volunteering
- Map intelligently - understand context over labels
- Preserve actual resume text - don't paraphrase
- Return ONLY valid JSON, no explanations
- If a field has no data, use empty string "" or empty array []
- Always prioritize content over section names
- Look for hidden sections like research, volunteering, speaking in unexpected places
- INTELLIGENTLY separate education degree and field - don't rely on keywords, use understanding
- CAPTURE EVERYTHING: If it doesn't fit standard sections, put it in additional_sections

CRITICAL INSTRUCTIONS:
1. Extract EVERYTHING - don't miss any sections, skills, projects, awards, or certifications
2. Map intelligently - understand context over labels (e.g., "Accomplishments" → "awards")
3. Preserve actual text from resume - don't paraphrase or create content
4. Be comprehensive - include ALL skills as a flat array: ["JavaScript", "Python", "React", "AWS"]
5. Look for content in unexpected places - sometimes projects/awards are mixed in other sections
6. Format dates consistently 
7. Return ONLY valid JSON, no explanations or markdown
8. If a field has no data, use empty string "" or empty array []
9. Always prioritize content over section names"""

        # Prepare the contents: prompt as text, PDF as binary data
        contents = [
            types.Content(
                parts=[
                    types.Part(text=prompt),
                    types.Part(inline_data=types.Blob(data=file_content, mime_type="application/pdf"))
                ],
                role="user"
            )
        ]

        # Call Gemini with the most capable model for PDF processing
        response = parser.client.models.generate_content(
            model=f'models/{get_gemini_model()}',  # Use environment model
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.0,  # Deterministic for consistent parsing
                top_p=0.95,  # High precision for structured data
                top_k=20,  # Limited vocabulary for JSON consistency
                max_output_tokens=16384,  # Higher limit for comprehensive extraction
                response_mime_type="application/json",  # Ensure JSON output
                system_instruction="You are a comprehensive ATS-friendly resume parser. Extract ALL information from PDFs with complete accuracy and intelligent categorization for optimal ATS compatibility. Return only valid JSON."
            )
        )
        
        response_text = response.text.strip()
        print(f"✅ AI PDF processing complete. Response length: {len(response_text)} characters")
        
        # Clean and parse JSON response
        json_data = _extract_and_validate_json(response_text)
        
        if json_data:
            print("🎉 Successfully parsed PDF directly with AI!")
            _log_comprehensive_extraction_summary(json_data)
            return json_data
        else:
            print("❌ AI PDF JSON parsing failed")
            return None
            
    except Exception as e:
        print(f"❌ AI PDF processing failed: {str(e)}")
        logger.error(f"AI PDF processing error: {str(e)}")
        return None

def _validate_extraction_quality(data: Dict[str, Any]) -> bool:
    """
    Validate if the AI extraction is of sufficient quality
    """
    try:
        personal = data.get("personalInfo", {})
        
        # Basic quality checks
        has_name = bool(personal.get('name', '').strip())
        has_contact = bool(personal.get('email', '').strip() or personal.get('phone', '').strip())
        has_content = bool(
            data.get('experience', []) or 
            data.get('education', []) or 
            data.get('skills', {}).get('technical', []) or
            data.get('summary', '').strip()
        )
        
        # Require at least name and some content
        quality_score = has_name and (has_contact or has_content)
        
        print(f"📊 Quality validation: name={has_name}, contact={has_contact}, content={has_content}, overall={quality_score}")
        return quality_score
        
    except Exception as e:
        print(f"❌ Quality validation failed: {str(e)}")
        return False

def _log_comprehensive_extraction_summary(data: Dict[str, Any]) -> None:
    """Log comprehensive summary of extracted data"""
    personal = data.get("personalInfo", {})
    
    print(f"📋 Comprehensive Extraction Summary:")
    print(f"   👤 Personal: name={bool(personal.get('name'))}, email={bool(personal.get('email'))}, phone={bool(personal.get('phone'))}")
    print(f"   💼 Experience: {len(data.get('experience', []))} entries")
    print(f"   🎓 Education: {len(data.get('education', []))} entries") 
    print(f"   🛠️ Skills: {len(data.get('skills', []))} items")
    print(f"   🚀 Projects: {len(data.get('projects', []))} items")
    print(f"   🏆 Awards: {len(data.get('awards', []))} items")
    print(f"   📜 Certifications: {len(data.get('certifications', []))} items")
    print(f"   🌍 Languages: {len(data.get('languages', []))} items")
    print(f"   📚 Publications: {len(data.get('publications', []))} items")
    print(f"   🤝 Volunteering: {len(data.get('volunteering', []))} items")
    print(f"   🎤 Speaking: {len(data.get('speaking', []))} items")
    print(f"   🪖 Military: {len(data.get('military', []))} items")
    print(f"   🎯 Hobbies: {len(data.get('hobbies', []))} items")
    print(f"   ➕ Additional Sections: {len(data.get('additional_sections', []))} sections")
    
    # Log additional sections details - THIS IS CRITICAL
    additional_sections = data.get('additional_sections', [])
    if additional_sections:
        print(f"   🔍 Additional sections found:")
        for section in additional_sections:
            section_name = section.get('section_name', 'Unknown')
            content_length = len(section.get('content', ''))
            print(f"      - {section_name} ({content_length} characters)")
    
    # Log skills details
    skills = data.get('skills', [])
    if skills:
        print(f"   📝 Skills found: {', '.join(skills[:5])}{'...' if len(skills) > 5 else ''}")
    
    # Log awards details  
    awards = data.get('awards', [])
    if awards:
        print(f"   🏆 Awards found: {', '.join([award.get('title', 'Unknown') for award in awards[:3]])}{'...' if len(awards) > 3 else ''}")

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file - handles multi-page documents"""
    text = ""
    
    try:
        # Primary extraction with pdfplumber (best for layout preservation)
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            print(f"📄 Processing PDF with {len(pdf.pages)} pages")
            for page_num, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- PAGE {page_num + 1} ---\n"
                    text += page_text + "\n"
                    print(f"✅ Extracted text from page {page_num + 1}: {len(page_text)} characters")
        
        # Fallback to PyPDF2 if pdfplumber didn't get enough content
        if len(text.strip()) < 100:
            print("🔄 Trying PyPDF2 as fallback...")
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- PAGE {page_num + 1} ---\n"
                    text += page_text + "\n"
                
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise
    
    print(f"📋 Total extracted text: {len(text)} characters from PDF")
    return text.strip()

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    if not Document:
        raise ImportError("python-docx is required for DOCX file parsing")
    
    try:
        doc = Document(io.BytesIO(file_content))
        text = ""
        
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
            
        return text.strip()
        
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {str(e)}")
        raise

def parse_resume_text(text: str) -> Dict[str, Any]:
    """
    SIMPLIFIED AI-POWERED CV PARSING
    Send entire PDF content directly to AI for complete extraction and form auto-filling
    """
    try:
        print(f"🤖 AI CV Parser: Processing {len(text)} characters...")
        
        # Initialize CV parser
        parser = CVParser()

        # Create comprehensive AI prompt for direct extraction and form filling with intelligent mapping
        prompt = f"""You are an expert ATS-friendly resume parser with INTELLIGENT SECTION MAPPING capabilities. Extract ALL information from this resume and map it to standardized structure optimized for ATS compatibility, regardless of how sections are named.

RESUME CONTENT:
        {text}

ATS-FRIENDLY EXTRACTION PRINCIPLES:
1. Parse content to maximize ATS compatibility and searchability
2. Extract keywords and skills that ATS systems prioritize
3. Maintain professional terminology and industry-standard language
4. Preserve technical skills, certifications, and quantifiable achievements
5. Structure data for optimal ATS parsing and keyword matching

INTELLIGENT MAPPING RULES:
1. Different resumes use different names for the same content. Map intelligently:
   - "Achievements" = "Awards" = "Honors" = "Recognitions" = "Accomplishments" → map to "awards"
   - "Experience" = "Work History" = "Employment" = "Professional Experience" = "Career" → map to "experience"  
   - "Skills" = "Competencies" = "Technical Skills" = "Proficiencies" = "Expertise" → map to "skills"
   - "Projects" = "Portfolio" = "Work Samples" = "Personal Projects" = "Side Projects" → map to "projects"
   - "Education" = "Academic Background" = "Qualifications" = "Learning" → map to "education"
   - "Certifications" = "Licenses" = "Credentials" = "Professional Certifications" → map to "certifications"
   - "Languages" = "Language Skills" = "Linguistic Abilities" → map to "languages"

2. COMPREHENSIVE EXTRACTION: Extract ALL content regardless of section names
3. FLEXIBLE CATEGORIZATION: If content doesn't fit standard categories, intelligently assign to closest match
4. PRESERVE CONTENT: Extract actual text - don't create or paraphrase

Return EXACTLY this JSON structure (fill all available fields, use empty string "" or empty array [] if not found):

{{
    "personalInfo": {{
        "name": "Full name of person",
        "email": "Email address", 
        "phone": "Phone number",
        "address": "Full address/location",
        "linkedin": "LinkedIn URL or username",
        "website": "Personal website URL",
        "github": "GitHub URL or username"
    }},
    "summary": "Professional summary/objective (extract actual text, don't create)",
    "experience": [
        {{
            "company": "Company name",
            "position": "Job title", 
            "location": "Work location",
            "startDate": "Start date",
            "endDate": "End date or Present",
            "current": true/false,
            "description": "Detailed job description and achievements"
        }}
    ],
    "education": [
        {{
            "institution": "School/University name",
            "degree": "Degree type",
            "field": "Field of study/Major",
            "location": "School location", 
            "startDate": "Start date",
            "endDate": "End date",
            "gpa": "GPA if mentioned"
        }}
    ],
    "skills": ["skill1", "skill2", "skill3"],
    "projects": [
        {{
            "name": "Project name",
            "description": "Project description",
            "technologies": ["tech1", "tech2"],
            "url": "Project URL if available",
            "github": "GitHub URL if available",
            "startDate": "Start date if available",
            "endDate": "End date if available"
        }}
    ],
    "awards": [
        {{
            "title": "Award title",
            "description": "Award description", 
            "date": "Date received"
        }}
    ],
    "certifications": [
        {{
            "name": "Certification name",
            "issuer": "Issuing organization",
            "date": "Date received",
            "expiryDate": "Expiry date if applicable"
        }}
    ],
    "languages": ["Language1", "Language2"]
}}

CRITICAL ATS-FRIENDLY INSTRUCTIONS:
1. Extract EVERYTHING - don't miss any sections, skills, projects, awards, or certifications
2. Map intelligently - understand context over labels (e.g., "Accomplishments" → "awards")
3. Preserve actual text from resume - don't paraphrase or create content
4. Be comprehensive - include ALL skills as a flat array: ["JavaScript", "Python", "React", "AWS"]
5. Look for content in unexpected places - sometimes projects/awards are mixed in other sections
6. Format dates consistently for ATS parsing
7. Extract quantifiable achievements and metrics for ATS optimization
8. Preserve technical terminology and industry keywords
9. Return ONLY valid JSON, no explanations or markdown
10. If a field has no data, use empty string "" or empty array []
11. Always prioritize content over section names for maximum ATS compatibility"""

        # Use AI with optimal settings for comprehensive extraction
        response = parser.client.models.generate_content(
            model=f'models/{get_gemini_model()}',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,  # Deterministic for text parsing
                top_p=0.95,  # High precision for structured data
                top_k=20,  # Limited vocabulary for JSON consistency
                max_output_tokens=12288,  # Higher limit for comprehensive data
                response_mime_type="application/json",  # Ensure JSON output
                system_instruction="You are a precise ATS-friendly resume parser. Extract ALL information comprehensively with ATS optimization in mind and return only valid JSON for form auto-filling."
            )
        )
        
        response_text = response.text.strip()
        print(f"✅ AI processing complete. Response length: {len(response_text)} characters")
        
        # Clean and parse JSON response
        json_data = _extract_and_validate_json(response_text)
        
        if json_data:
            print("🎉 Successfully parsed resume with AI!")
            _log_extraction_summary(json_data)
            return json_data
        else:
            print("❌ AI JSON parsing failed, using fallback")
            return _create_basic_fallback(text)
            
    except Exception as e:
        print(f"❌ AI parsing failed: {str(e)}")
        return _create_basic_fallback(text)

def _extract_and_validate_json(response_text: str) -> Dict[str, Any]:
    """Extract and validate JSON from AI response"""
    try:
        # Remove markdown code blocks if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        # Find JSON boundaries
        response_text = response_text.strip()
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            json_str = response_text[start_idx:end_idx+1]
            return json.loads(json_str)
        return None
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {str(e)}")
        return None

def _log_extraction_summary(data: Dict[str, Any]) -> None:
    """Log summary of extracted data"""
    personal = data.get("personalInfo", {})
    print(f"📋 Extraction Summary:")
    print(f"   👤 Personal: name={bool(personal.get('name'))}, email={bool(personal.get('email'))}")
    print(f"   💼 Experience: {len(data.get('experience', []))} entries")
    print(f"   🎓 Education: {len(data.get('education', []))} entries") 
    print(f"   🛠️ Skills: {len(data.get('skills', []))} items")
    print(f"   🚀 Projects: {len(data.get('projects', []))} items")
    print(f"   🏆 Awards: {len(data.get('awards', []))} items")
    print(f"   📜 Certifications: {len(data.get('certifications', []))} items")

def _create_basic_fallback(text: str) -> Dict[str, Any]:
    """Create basic fallback structure if AI fails"""
    print("🔄 Creating basic fallback structure...")
    
    # Extract basic info with regex
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, text)
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    name = lines[0] if lines else ""
    
    return {
        "personalInfo": {
            "name": name,
            "email": email_match.group(0) if email_match else "",
        "phone": "",
            "address": "",
            "linkedin": "",
            "website": "",
            "github": ""
        },
        "summary": "Professional summary from uploaded resume",
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "awards": [],
        "certifications": [],
        "languages": [],
        "additional_sections": []
    }

def extract_resume_data_from_pdf_ai(file_content: bytes, filename: str) -> dict:
    """
    BACKUP FUNCTION: Extract resume data by sending the entire PDF file to Gemini AI for parsing.
    This is the original implementation kept as backup.
    """
    try:
        parser = CVParser()  # Uses your existing Gemini client

        # Compose the prompt with intelligent mapping
        prompt = (
            "You are an expert resume parser with INTELLIGENT SECTION MAPPING capabilities. Extract ALL information from this resume PDF and map it to standardized structure, regardless of how sections are named.\n\n"
            "INTELLIGENT MAPPING RULES:\n"
            "1. Different resumes use different names for the same content. Map intelligently:\n"
            "   - \"Achievements\" = \"Awards\" = \"Honors\" = \"Recognitions\" = \"Accomplishments\" → map to \"awards\"\n"
            "   - \"Experience\" = \"Work History\" = \"Employment\" = \"Professional Experience\" = \"Career\" → map to \"experience\"\n"
            "   - \"Skills\" = \"Competencies\" = \"Technical Skills\" = \"Proficiencies\" = \"Expertise\" → map to \"skills\"\n"
            "   - \"Projects\" = \"Portfolio\" = \"Work Samples\" = \"Personal Projects\" = \"Side Projects\" → map to \"projects\"\n"
            "   - \"Education\" = \"Academic Background\" = \"Qualifications\" = \"Learning\" → map to \"education\"\n"
            "   - \"Certifications\" = \"Licenses\" = \"Credentials\" = \"Professional Certifications\" → map to \"certifications\"\n"
            "   - \"Languages\" = \"Language Skills\" = \"Linguistic Abilities\" → map to \"languages\"\n\n"
            "2. COMPREHENSIVE EXTRACTION: Extract ALL content regardless of section names\n"
            "3. FLEXIBLE CATEGORIZATION: If content doesn't fit standard categories, intelligently assign to closest match\n"
            "4. PRESERVE CONTENT: Extract actual text - don't create or paraphrase\n\n"
            "Return EXACTLY this JSON structure (fill all available fields, use empty string \"\" or empty array [] if not found):\n"
            "{\n"
            "    \"personalInfo\": {\n"
            "        \"name\": \"Full name of person\",\n"
            "        \"email\": \"Email address\", \n"
            "        \"phone\": \"Phone number\",\n"
            "        \"address\": \"Full address/location\",\n"
            "        \"linkedin\": \"LinkedIn URL or username\",\n"
            "        \"website\": \"Personal website URL\",\n"
            "        \"github\": \"GitHub URL or username\"\n"
            "    },\n"
            "    \"summary\": \"Professional summary/objective (extract actual text, don't create)\",\n"
            "    \"experience\": [\n"
            "        {\n"
            "            \"company\": \"Company name\",\n"
            "            \"position\": \"Job title\", \n"
            "            \"location\": \"Work location\",\n"
            "            \"startDate\": \"Start date\",\n"
            "            \"endDate\": \"End date or Present\",\n"
            "            \"current\": true/false,\n"
            "            \"description\": \"Detailed job description and achievements\"\n"
            "        }\n"
            "    ],\n"
            "    \"education\": [\n"
            "        {\n"
            "            \"institution\": \"School/University name\",\n"
            "            \"degree\": \"Degree type\",\n"
            "            \"field\": \"Field of study/Major\",\n"
            "            \"location\": \"School location\", \n"
            "            \"startDate\": \"Start date\",\n"
            "            \"endDate\": \"End date\",\n"
            "            \"gpa\": \"GPA if mentioned\"\n"
            "        }\n"
            "    ],\n"
            "    \"skills\": [\"skill1\", \"skill2\", \"skill3\"],\n"
            "    \"projects\": [\n"
            "        {\n"
            "            \"name\": \"Project name\",\n"
            "            \"description\": \"Project description\",\n"
            "            \"technologies\": [\"tech1\", \"tech2\"],\n"
            "            \"url\": \"Project URL if available\",\n"
            "            \"github\": \"GitHub URL if available\",\n"
            "            \"startDate\": \"Start date if available\",\n"
            "            \"endDate\": \"End date if available\"\n"
            "        }\n"
            "    ],\n"
            "    \"awards\": [\n"
            "        {\n"
            "            \"title\": \"Award title\",\n"
            "            \"description\": \"Award description\", \n"
            "            \"date\": \"Date received\"\n"
            "        }\n"
            "    ],\n"
            "    \"certifications\": [\n"
            "        {\n"
            "            \"name\": \"Certification name\",\n"
            "            \"issuer\": \"Issuing organization\",\n"
            "            \"date\": \"Date received\",\n"
            "            \"expiryDate\": \"Expiry date if applicable\"\n"
            "        }\n"
            "    ],\n"
            "    \"languages\": [\"Language1\", \"Language2\"]\n"
            "}\n"
            "CRITICAL: Map intelligently - understand context over labels. Extract ALL content. Skills as flat array. Return ONLY valid JSON, no explanations or markdown."
        )

        # Prepare the contents: prompt as text, PDF as binary data
        contents = [
            types.Content(
                parts=[
                    types.Part(text=prompt),
                    types.Part(inline_data=types.Blob(data=file_content, mime_type="application/pdf"))
                ],
                role="user"
            )
        ]

        # Call Gemini (use a model that supports PDF input)
        response = parser.client.models.generate_content(
            model=f'models/{get_gemini_model()}',  # Use environment model
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.0,  # Deterministic for PDF parsing
                top_p=0.95,  # High precision for structured data extraction
                top_k=20,  # Limited vocabulary for JSON consistency
                max_output_tokens=16384,  # Higher limit for PDF content
                response_mime_type="application/json",  # Ensure JSON output
                system_instruction="You are a precise resume parser. Extract ALL information comprehensively and return only valid JSON for form auto-filling."
            )
        )

        response_text = response.text.strip()
        # Use your existing _extract_and_validate_json() to parse the result
        json_data = _extract_and_validate_json(response_text)
        if json_data:
            print("🎉 Successfully parsed resume PDF with AI!")
            _log_extraction_summary(json_data)
            return json_data
        else:
            print("❌ AI JSON parsing failed for PDF, using fallback")
            return _create_basic_fallback("")

    except Exception as e:
        print(f"❌ AI PDF parsing failed: {str(e)}")
        return _create_basic_fallback("")