import json
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior software architect with 15+ years of experience. Given a product specification, produce a detailed, production-ready architecture plan.

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no extra text, no commentary. Just the raw JSON object.

Required JSON schema:
{
  "tech_stack": [{"technology": "React", "version": "19", "purpose": "UI rendering", "rationale": "Why chosen"}],
  "data_model": [{"name": "TableName", "fields": [{"name": "id", "type": "uuid", "constraints": "PK", "description": "Primary key"}], "relationships": [{"type": "foreign_key", "target": "other_table", "key": "id"}]}],
  "api_contracts": [{"method": "GET", "path": "/resource", "request_body": null, "response_shape": "array", "auth_required": true, "rate_limit": 100}],
  "component_tree": [{"name": "Component", "path": "src/Component.tsx", "responsibilities": "What it does", "dependencies": [], "interface": "Props type"}],
  "file_structure": [{"path": "src/file.ts", "purpose": "Purpose", "depends_on": []}],
  "implementation_order": [{"phase": "1", "files": ["src/file.ts"], "description": "What this phase builds", "estimated_effort": "2h"}],
  "key_design_decisions": [{"decision": "Technology choice", "rationale": "Why", "alternatives_considered": ["Option A", "Option B"], "chosen_approach": "Best option"}],
  "error_handling": {"strategy": "try/catch with fallback", "retry_policy": "3 retries with backoff", "error_response_format": "{error: string, code: string}"},
  "security_considerations": [{"concern": "Risk", "mitigation": "Solution"}]
}

Rules:
- Make concrete technology choices with specific versions.
- Include error handling and security from the start.
- Consider scaling and performance.
- Do NOT wrap in markdown. No code fences. No extra text."""


class ArchitectureAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        self._current_task_id = task_id
        supabase = database.get_supabase()
        await self.log("Starting architecture design...")
        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        spec = task_data["input_data"].get("spec", "")

        try:
            await self.log("Analyzing specification and designing system architecture...")
            result = await self.call_llm(SYSTEM_PROMPT, spec)
            parsed = self.parse_json(result)
            now = datetime.now(timezone.utc).isoformat()
            await self.log("Architecture complete, chaining to Coding Agent")

            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"architecture": parsed},
                "completed_at": now,
            }).eq("id", task_id).execute()

            enriched_spec = json.dumps({
                "original_spec": spec,
                "architecture": parsed,
            })
            supabase.table("agent_tasks").insert({
                "project_id": task_data["project_id"],
                "agent_type": "coding",
                "status": "pending",
                "input_data": {"spec": enriched_spec},
            }).execute()

        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            await self.log(f"Failed: {str(e)}")
            supabase.table("agent_tasks").update({
                "status": "failed",
                "error": str(e),
                "completed_at": now,
            }).eq("id", task_id).execute()

