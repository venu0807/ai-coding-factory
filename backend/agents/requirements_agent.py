from datetime import datetime, timezone
from agents.base import BaseAgent
from database import get_supabase

SYSTEM_PROMPT = """You are a technical product manager. Given a user's project idea, produce a structured specification.
Return ONLY valid JSON with these fields:
- name: project name
- description: one-line summary
- tech_stack: array of technologies
- features: array of feature objects with {name, description}
- file_structure: array of suggested file paths
- data_models: array of model objects with {name, fields}
- api_endpoints: array of endpoint objects with {method, path, description}
- implementation_steps: array of step objects with {step, details}"""

class RequirementsAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        supabase = get_supabase()
        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        prompt = task_data["input_data"].get("prompt", "")

        supabase.table("agent_tasks").update({"status": "running"}).eq("id", task_id).execute()

        try:
            result = await self.call_llm(SYSTEM_PROMPT, prompt)
            now = datetime.now(timezone.utc).isoformat()
            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"spec": result},
                "completed_at": now,
            }).eq("id", task_id).execute()

            supabase.table("agent_tasks").insert({
                "project_id": task_data["project_id"],
                "agent_type": "coding",
                "status": "pending",
                "input_data": {"spec": result},
            }).execute()

        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            supabase.table("agent_tasks").update({
                "status": "failed",
                "error": str(e),
                "completed_at": now,
            }).eq("id", task_id).execute()