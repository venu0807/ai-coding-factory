from fastapi import APIRouter, HTTPException, Depends
from models import ProjectCreate, ProjectUpdate
from api.deps import get_user_id
import database

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=dict)
async def create_project(body: ProjectCreate, user_id: str = Depends(get_user_id)):
    supabase = database.get_supabase()
    result = supabase.table("projects").insert({
        "user_id": user_id,
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

@router.get("", response_model=dict)
async def list_projects(
    user_id: str = Depends(get_user_id),
    limit: int = 50,
    offset: int = 0,
):
    supabase = database.get_supabase()
    result = supabase.table("projects").select("*", count="exact") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .offset(offset) \
        .execute()
    return {
        "data": result.data,
        "total": result.count if hasattr(result, "count") else len(result.data),
        "limit": limit,
        "offset": offset,
    }

@router.get("/{project_id}", response_model=dict)
async def get_project(project_id: str, user_id: str = Depends(get_user_id)):
    supabase = database.get_supabase()
    result = supabase.table("projects").select("*").eq("id", project_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "Project not found")
    return result.data[0]

@router.patch("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, user_id: str = Depends(get_user_id)):
    supabase = database.get_supabase()
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.description is not None:
        updates["description"] = body.description
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = supabase.table("projects").update(updates).eq("id", project_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "Project not found")
    return result.data[0]

@router.delete("/{project_id}")
async def delete_project(project_id: str, user_id: str = Depends(get_user_id)):
    supabase = database.get_supabase()
    supabase.table("agent_tasks").delete().eq("project_id", project_id).execute()
    supabase.table("generated_files").delete().eq("project_id", project_id).execute()
    supabase.table("projects").delete().eq("id", project_id).eq("user_id", user_id).execute()
    return {"ok": True}