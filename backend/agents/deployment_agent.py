import json
import os
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

DEPLOY_SYSTEM_PROMPT = """You are a DevOps engineer. Given generated source files, produce deployment configuration.
Return ONLY valid JSON with these fields:
- platform: "vercel" | "docker" | "fly" | "manual"
- config_files: array of {file_path, content} for deployment configs (Dockerfile, vercel.json, fly.toml, etc.)
- build_steps: array of shell commands to build
- env_vars: array of {key, description, required}
- deploy_steps: array of shell commands to deploy
- health_check_url: string or null
- estimated_deploy_time_seconds: number"""


class DeploymentAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        supabase = database.get_supabase()
        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        project_id = task_data["project_id"]

        # Collect all generated files
        files_result = supabase.table("generated_files") \
            .select("*") \
            .eq("task_id", task_id) \
            .execute()
        files = files_result.data or []

        if not files:
            # Fall back to project-level files
            tasks_result = supabase.table("agent_tasks") \
                .select("id") \
                .eq("project_id", project_id) \
                .in_("agent_type", ["coding"]) \
                .execute()
            coding_task_ids = [t["id"] for t in tasks_result.data]
            if coding_task_ids:
                files_result = supabase.table("generated_files") \
                    .select("*") \
                    .in_("task_id", coding_task_ids) \
                    .execute()
                files = files_result.data or []

        file_list = [{"path": f["file_path"], "content": f["content"][:2000]} for f in files]
        prompt = json.dumps({"project_id": project_id, "files": file_list}, indent=2)

        try:
            result = await self.call_llm(DEPLOY_SYSTEM_PROMPT, prompt)
            parsed = self._parse_json(result)
            now = datetime.now(timezone.utc).isoformat()

            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"deployment": parsed},
                "completed_at": now,
            }).eq("id", task_id).execute()

            # Update project status
            supabase.table("projects").update({
                "deployment_config": parsed,
                "status": "deployable",
            }).eq("id", project_id).execute()

        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            supabase.table("agent_tasks").update({
                "status": "failed",
                "error": str(e),
                "completed_at": now,
            }).eq("id", task_id).execute()

    def _parse_json(self, raw: str) -> dict:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned)
