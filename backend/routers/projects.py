import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from knowledge.database import (
    get_all_projects, get_project as get_project_db, create_project, update_project,
    link_document_to_project, get_all_templates
)

router = APIRouter(prefix="/api", tags=["projects"])

class ProjectCreateRequest(BaseModel):
    name: str
    description: str = ""

@router.get("/projects")
def get_projects():
    return get_all_projects()

@router.get("/projects/{project_id}")
def get_project(project_id: str):
    project = get_project_db(project_id)
    if project:
        return {"status": "success", "project": project}
    return {"status": "error", "message": "Project not found"}

@router.post("/projects")
def create_new_project(request: ProjectCreateRequest):
    project_id = f"project_{uuid.uuid4().hex[:8]}"
    try:
        create_project(project_id, request.name, request.description)
        return {"status": "success", "project_id": project_id}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}

@router.put("/projects/{project_id}")
def update_project_api(project_id: str, request: ProjectCreateRequest):
    try:
        updated = update_project(project_id, request.name, request.description)
        if updated:
            return {"status": "success", "project": updated}
        return {"status": "error", "message": "Project not found"}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}

class LinkDocumentRequest(BaseModel):
    document_id: int

@router.post("/projects/{project_id}/documents")
def link_document_to_project_endpoint(project_id: str, request: LinkDocumentRequest):
    try:
        link_document_to_project(request.document_id, project_id)
        return {"status": "success"}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}

# --- Templates ---
@router.get("/templates")
def get_templates():
    return get_all_templates()
