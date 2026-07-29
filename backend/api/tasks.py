from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
import database
import io
import zipfile

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


@router.post("/tasks/{task_id}/retry")
async def retry_task(project_id: str, task_id: str):
    supabase = database.get_supabase()
    task = supabase.table("agent_tasks").select("*").eq("id", task_id).eq("project_id", project_id).execute()
    if not task.data:
        raise HTTPException(404, "Task not found")
    supabase.table("agent_tasks").update({
        "status": "pending",
        "error": None,
        "output_data": None,
        "logs": [],
        "completed_at": None,
        "started_at": None,
    }).eq("id", task_id).execute()
    return {"ok": True}


@router.get("/download")
async def download_project(project_id: str):
    supabase = database.get_supabase()
    tasks = supabase.table("agent_tasks") \
        .select("id") \
        .eq("project_id", project_id) \
        .execute()
    task_ids = [t["id"] for t in tasks.data]
    if not task_ids:
        raise HTTPException(404, "No files found")
    files = supabase.table("generated_files") \
        .select("*") \
        .in_("task_id", task_ids) \
        .execute()
    if not files.data:
        raise HTTPException(404, "No files found")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files.data:
            zf.writestr(f["file_path"], f["content"])
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=project-{project_id[:8]}.zip"},
    )