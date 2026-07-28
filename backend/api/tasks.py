from fastapi import APIRouter, HTTPException
import database

router = APIRouter(prefix="/projects/{project_id}", tags=["tasks"])

@router.get("/tasks")
async def list_tasks(project_id: str):
    supabase = database.get_supabase()
    result = supabase.table("agent_tasks") \
        .select("*") \
        .eq("project_id", project_id) \
        .order("created_at") \
        .execute()
    return result.data

@router.get("/files")
async def list_files(project_id: str):
    supabase = database.get_supabase()
    tasks = supabase.table("agent_tasks") \
        .select("id") \
        .eq("project_id", project_id) \
        .execute()
    task_ids = [t["id"] for t in tasks.data]
    if not task_ids:
        return []
    result = supabase.table("generated_files") \
        .select("*") \
        .in_("task_id", task_ids) \
        .order("file_path") \
        .execute()
    return result.data