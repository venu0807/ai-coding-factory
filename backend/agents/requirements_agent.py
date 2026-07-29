from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior technical product manager. Given a user's project idea, produce a precise, actionable specification.

Return ONLY valid JSON with these fields:
- name: project name (short, descriptive)
- description: one-line summary
- tech_stack: array of specific technologies with versions (be opinionated — pick best for job)
- features: array of feature objects with {name, description, priority (P0/P1/P2)}
- user_flows: array of flow objects with {actor, action, expected_outcome}
- data_models: array of model objects with {name, fields: [{name, type, constraints}]}
- api_endpoints: array of endpoint objects with {method, path, description, auth_required}
- file_structure: array of suggested file paths with brief purpose
- implementation_steps: array of step objects with {step, details, dependencies}
- acceptance_criteria: array of strings that define "done"

Rules:
- Be specific about tech choices. No "it depends" — pick the best stack.
- Prioritize features (P0 = must have for MVP).
- Keep api_endpoints and data_models focused on what's needed for MVP.
- output must be parseable JSON — no markdown fences, no extra text."""

class RequirementsAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        self._current_task_id = task_id
        supabase = database.get_supabase()
        await self.log("Starting requirements analysis...")
        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        prompt = task_data["input_data"].get("prompt", "")

        try:
            await self.log("Analyzing request and generating specification...")
            result = await self.call_llm(SYSTEM_PROMPT, prompt)
            now = datetime.now(timezone.utc).isoformat()
            await self.log("Specification complete, chaining to Architecture Agent")
            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"spec": result},
                "completed_at": now,
            }).eq("id", task_id).execute()

            supabase.table("agent_tasks").insert({
                "project_id": task_data["project_id"],
                "agent_type": "architecture",
                "status": "pending",
                "input_data": {"spec": result},
            }).execute()

        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            await self.log(f"Failed: {str(e)}")
            supabase.table("agent_tasks").update({
                "status": "failed",
                "error": str(e),
                "completed_at": now,
            }).eq("id", task_id).execute()