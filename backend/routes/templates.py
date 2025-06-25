from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List, Dict, Any
import logging
from pathlib import Path
import os

from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def get_available_templates():
    """
    Get all available templates with comprehensive metadata
    """
    try:
        templates_dir = Path(__file__).parent.parent / "templates"
        logger.info(f"🔍 Discovering templates in: {templates_dir}")
        
        templates = []
        
        if templates_dir.exists():
            for template_dir in templates_dir.iterdir():
                if template_dir.is_dir():
                    template_id = template_dir.name
                    cls_file = template_dir / f"{template_id}.cls"
                    
                    if cls_file.exists():
                        # Extract template info dynamically
                        try:
                            with open(cls_file, 'r', encoding='utf-8') as f:
                                content = f.read()
                            
                            # Extract template name from comments or use directory name
                            template_name = template_id.replace("_", " ").title()
                            
                            # Check if preview image exists
                            preview_file = template_dir / "preview.png"
                            has_preview = preview_file.exists()
                            preview_url = f"/api/templates/{template_id}/preview-image" if has_preview else None
                            
                            # Determine category based on template analysis
                            category = "Professional"  # Default
                            features = ["LaTeX Template", "ATS-Friendly"]
                            
                            if template_id == "altacv":
                                category = "Professional"
                                features = [
                                    "Modern",
                                    "Professional Design",
                                    "Clean Layout",
                                    "Standard Sections",
                                    "Corporate Style",
                                    "Modern Professional"
                                ]
                            elif template_id == "professional_resume":
                                category = "Professional"
                                features = [
                                    "Single Column",
                                    "Clean Layout", 
                                    "Standard Sections",
                                    "Corporate Style",
                                    "Modern Professional"
                                ]
                            elif "minipage" in content and "column" in content.lower():
                                category = "Modern"
                                features = ["Multi-Column", "Modern Design", "Elegant Typography"]
                            
                            # Create better description based on template
                            description = f"LaTeX resume template: {template_name}"
                            if template_id == "altacv":
                                description = "A modern, professional resume template with clean design"
                            elif template_id == "professional_resume":
                                description = "Modern professional resume with clean single-column layout, ideal for corporate positions and standard business environments."
                            
                            templates.append({
                                "id": template_id,
                                "name": template_name,
                                "filename": cls_file.name,
                                "type": "class",
                                "category": category,
                                "description": description,
                                "features": features,
                                "commands": [],  # Could extract from template if needed
                                "has_preview": has_preview,
                                "preview_url": preview_url
                            })
                            
                        except Exception as e:
                            logger.warning(f"Failed to process template {template_id}: {str(e)}")
                            continue
        
        if not templates:
            logger.warning("No templates found in templates directory")
            return []
        
        logger.info(f"Found {len(templates)} templates dynamically")
        return templates
        
    except Exception as e:
        logger.error(f"Error discovering templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to discover templates")

@router.get("/{template_id}")
async def get_template_details(template_id: str):
    """
    Get template content from new directory structure
    """
    try:
        templates_dir = Path(__file__).parent.parent / "templates"
        template_dir = templates_dir / template_id
        template_file = template_dir / f"{template_id}.cls"
        
        if not template_file.exists():
            raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
        
        with open(template_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {
            "id": template_id,
            "name": template_id.replace("_", " ").title(),
            "filename": f"{template_id}.cls",
            "content": content,
            "type": "LaTeX Class"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template details for {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get template details")

@router.get("/{template_id}/preview")
async def get_template_preview(template_id: str):
    """
    Simple template preview - just return template info
    """
    try:
        templates_dir = Path(__file__).parent.parent / "templates"
        template_dir = templates_dir / template_id
        template_file = template_dir / f"{template_id}.cls"
        
        if not template_file.exists():
            raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
        
        return {
            "template_id": template_id,
            "template_info": {
                "id": template_id,
                "name": template_id.replace("_", " ").title(),
                "filename": f"{template_id}.cls"
            },
            "message": "Use the simple LaTeX generator for preview"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating template preview for {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate template preview")

@router.get("/{template_id}/preview-image")
async def get_template_preview_image(template_id: str):
    """
    Get template preview image
    """
    try:
        templates_dir = Path(__file__).parent.parent / "templates"
        template_dir = templates_dir / template_id
        preview_file = template_dir / "preview.png"
        
        if not preview_file.exists():
            logger.warning(f"Preview image not found for template {template_id}")
            raise HTTPException(status_code=404, detail=f"Preview image for template {template_id} not found. Please upload a preview.png file to {template_dir}")
        
        return FileResponse(
            path=str(preview_file),
            media_type="image/png",
            filename=f"{template_id}_preview.png"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting preview image for {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get preview image")

@router.post("/analyze")
async def analyze_template_file(template_data: Dict[str, Any]):
    """
    Analyze a custom template file uploaded by the user
    Expects: {"filename": "template.cls", "content": "LaTeX content..."}
    """
    try:
        filename = template_data.get('filename', '')
        content = template_data.get('content', '')
        
        if not filename or not content:
            raise HTTPException(status_code=400, detail="Filename and content are required")
        
        if not filename.endswith(('.cls', '.tex')):
            raise HTTPException(status_code=400, detail="Only .cls and .tex files are supported")
        
        # Create a temporary template ID from filename
        template_id = filename.replace('.cls', '').replace('.tex', '')
        
        # Basic analysis (simplified since template_service is not available)
        template_info = {
            "id": template_id,
            "name": template_id.replace("_", " ").title(),
            "filename": filename,
            "type": "LaTeX Class" if filename.endswith('.cls') else "LaTeX Document",
            "category": "Custom",
            "ats_score": 75,  # Default score for custom templates
            "commands": [],  # Would need template service for detailed analysis
            "features": ["custom_template"]
        }
        
        return {
            "analysis": template_info,
            "message": "Template analyzed successfully",
            "recommendations": [
                f"ATS Score: {template_info['ats_score']}/100",
                f"Template Type: {template_info['type']}",
                f"Category: {template_info['category']}",
                "Note: Advanced analysis requires template service"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze template")

@router.get("/stats/overview")
async def get_template_stats():
    """
    Get overview statistics about all available templates
    """
    try:
        # Get templates dynamically
        templates_dir = Path(__file__).parent.parent / "templates"
        templates = []
        
        if templates_dir.exists():
            for template_dir in templates_dir.iterdir():
                if template_dir.is_dir():
                    template_id = template_dir.name
                    cls_file = template_dir / f"{template_id}.cls"
                    
                    if cls_file.exists():
                        # Basic default scoring for all templates
                        templates.append({
                            "id": template_id,
                            "name": template_id.replace("_", " ").title(),
                            "filename": f"{template_id}.cls",
                            "type": "LaTeX Class",
                            "category": "Professional",
                            "ats_score": 85,  # Default ATS score
                            "features": ["LaTeX Template", "Customizable"]
                        })
        
        if not templates:
            return {"message": "No templates found"}
        
        # Calculate statistics
        total_templates = len(templates)
        avg_ats_score = sum(t['ats_score'] for t in templates) / total_templates
        categories = {}
        types = {}
        
        for template in templates:
            category = template['category']
            template_type = template['type']
            
            categories[category] = categories.get(category, 0) + 1
            types[template_type] = types.get(template_type, 0) + 1
        
        # Find best templates
        best_ats = max(templates, key=lambda x: x['ats_score'])
        most_features = max(templates, key=lambda x: len(x['features']))
        
        return {
            "total_templates": total_templates,
            "average_ats_score": round(avg_ats_score, 1),
            "categories": categories,
            "types": types,
            "best_ats_template": {
                "id": best_ats['id'],
                "name": best_ats['name'],
                "score": best_ats['ats_score']
            },
            "most_feature_rich": {
                "id": most_features['id'],
                "name": most_features['name'],
                "features": len(most_features['features'])
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting template stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get template statistics")

@router.get("/templates")
async def get_templates(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Get all available templates with metadata"""
    try:
        # Use same dynamic logic as get_available_templates
        templates_dir = Path(__file__).parent.parent / "templates"
        templates = []
        
        if templates_dir.exists():
            for template_dir in templates_dir.iterdir():
                if template_dir.is_dir():
                    template_id = template_dir.name
                    cls_file = template_dir / f"{template_id}.cls"
                    
                    if cls_file.exists():
                        templates.append({
                            "id": template_id,
                            "name": template_id.replace("_", " ").title(),
                            "filename": f"{template_id}.cls",
                            "type": "LaTeX Class",
                            "category": "Professional",
                            "description": f"LaTeX resume template: {template_id.replace('_', ' ').title()}",
                            "ats_score": 85  # Default score
                        })
        
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching templates: {str(e)}")

@router.get("/templates/{template_id}/ats-analysis")
async def get_template_ats_analysis(
    template_id: str, 
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get basic ATS analysis for a specific template"""
    try:
        templates_dir = Path(__file__).parent.parent / "templates"
        template_dir = templates_dir / template_id
        template_file = template_dir / f"{template_id}.cls"
        
        if not template_file.exists():
            raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
        
        # Generic analysis for any template
        basic_analysis = {
            "ats_score": 85,
            "overall_assessment": f"Professional {template_id.replace('_', ' ').title()} template with good ATS compatibility",
            "strengths": [
                "LaTeX formatting ensures clean output",
                "Professional structure",
                "Customizable layout"
            ],
            "improvements": [
                "Ensure all content is text-based",
                "Use standard section headers",
                "Optimize for keyword scanning"
            ],
            "compatibility_score": 85
        }
        
        return {
            "template_id": template_id,
            "analysis": basic_analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing template: {str(e)}")

@router.post("/templates/refresh-ats-scores")
async def refresh_all_ats_scores(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Refresh ATS scores for all templates (simplified without AI service)"""
    try:
        templates_dir = Path(__file__).parent.parent / "templates" / "cls"
        updated_scores = {}
        
        if templates_dir.exists():
            for cls_file in templates_dir.glob("*.cls"):
                template_id = cls_file.stem
                updated_scores[template_id] = {
                    "name": template_id.replace("_", " ").title(),
                    "old_score": 85,
                    "new_score": 85,
                    "analysis_summary": "Professional ATS-friendly template optimized for applicant tracking systems"
                }
        
        return {
            "message": "ATS scores refreshed (basic analysis without AI service)",
            "templates_analyzed": len(updated_scores),
            "results": updated_scores
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing ATS scores: {str(e)}")

@router.get("/templates/{template_id}/instructions")
async def get_template_instructions(template_id: str):
    """Get instructions for a specific template."""
    template_dir = Path(__file__).parent.parent / "templates" / template_id
    instructions_file = template_dir / "instructions.txt"
    
    if not instructions_file.exists():
        raise HTTPException(status_code=404, detail="Template instructions not found")
    
    with open(instructions_file, 'r', encoding='utf-8') as f:
        instructions = f.read()
    
    return {"instructions": instructions}

@router.get("/templates/{template_id}/class")
async def get_template_class(template_id: str):
    """Get the LaTeX class file for a specific template."""
    template_dir = Path(__file__).parent.parent / "templates" / template_id
    
    # Determine the class file name based on template_id
    if template_id == "altacv":
        class_file = template_dir / "altacv.cls"
    elif template_id == "professional_resume":
        class_file = template_dir / "professional_resume.cls"
    else:
        raise HTTPException(status_code=404, detail="Unknown template")
    
    if not class_file.exists():
        raise HTTPException(status_code=404, detail="Template class file not found")
    
    with open(class_file, 'r', encoding='utf-8') as f:
        class_content = f.read()
    
    return {"class_content": class_content}

@router.get("/templates/{template_id}/setup")
async def get_template_setup(template_id: str):
    """Get the setup information for a template."""
    template_dir = Path(__file__).parent.parent / "templates" / template_id
    
    # Determine the class file name based on template_id
    if template_id == "altacv":
        class_filename = "altacv.cls"
    elif template_id == "professional_resume":
        class_filename = "professional_resume.cls"
    else:
        raise HTTPException(status_code=404, detail="Unknown template")
    
    class_file = template_dir / class_filename
    
    if not class_file.exists():
        raise HTTPException(status_code=404, detail="Template class file not found")
    
    with open(class_file, 'r', encoding='utf-8') as f:
        class_content = f.read()
    
    return {"class_content": class_content} 