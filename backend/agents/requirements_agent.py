from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior technical product manager. Given a user's project idea, produce a precise, actionable specification.

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no extra text, no commentary before or after. Just the raw JSON object.

Required JSON schema:
{
  "name": "project name (short, descriptive)",
  "description": "one-line summary",
  "tech_stack": [{"name": "React", "version": "19", "purpose": "UI"}],
  "features": [{"name": "Feature name", "description": "Detail", "priority": "P0"}],
  "user_flows": [{"actor": "User", "action": "Describe action", "expected_outcome": "What happens"}],
  "data_models": [{"name": "ModelName", "fields": [{"name": "field", "type": "string", "constraints": "required"}]}],
  "api_endpoints": [{"method": "GET", "path": "/resource", "description": "Purpose", "auth_required": true}],
  "file_structure": [{"path": "src/file.ts", "purpose": "Purpose of file"}],
  "implementation_steps": [{"step": 1, "details": "What to do", "dependencies": []}],
  "acceptance_criteria": ["Criterion 1", "Criterion 2"]
}

Rules:
- Be specific about tech choices. No "it depends" — pick the best stack.
- Prioritize features (P0 = must have for MVP).
- Keep api_endpoints and data_models focused on what's needed for MVP.
- Do NOT wrap the JSON in markdown code blocks or any other formatting.
- Do NOT include any text before or after the JSON object."""

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