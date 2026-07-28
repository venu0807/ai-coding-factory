from fastapi import APIRouter, HTTPException
from models import ProjectCreate
import database

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=dict)
async def create_project(body: ProjectCreate):
    supabase = database.get_supabase()
    result = supabase.table("projects").insert({
        "name": body.name,
        "description": body.description,
    }).execute()
    project = result.data[0]

    supabase.table("agent_tasks").insert({
        "project_id": project["id"],
        "agent_type": "requirements",
        "status": "pending",
        "input_data": {"prompt": body.description or body.name},
    }).execute()

    return project

@router.get("", response_model=list[dict])
async def list_projects():
    supabase = database.get_supabase()
    result = supabase.table("projects").select("*").order("created_at", desc=True).execute()
    return result.data

@router.get("/{project_id}", response_model=dict)
async def get_project(project_id: str):
    supabase = database.get_supabase()
    result = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(404, "Project not found")
    return result.data[0]