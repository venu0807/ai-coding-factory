import json
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior software architect with 15+ years of experience. Given a product specification, produce a detailed, production-ready architecture plan.

Return ONLY valid JSON with these fields:
- tech_stack: array of {technology, version, purpose, rationale} — be specific about versions
- data_model: array of table/model definitions with {name, fields: [{name, type, constraints, description}], relationships: [{type, target, key}]}
- api_contracts: array of endpoint definitions with {method, path, request_body, response_shape, auth_required, rate_limit}
- component_tree: array of component specs with {name, path, responsibilities, dependencies, interface}
- file_structure: array of {path, purpose, depends_on}
- implementation_order: array of phase objects with {phase, files, description, estimated_effort}
- key_design_decisions: array of {decision, rationale, alternatives_considered, chosen_approach}
- error_handling: {strategy, retry_policy, error_response_format}
- security_considerations: array of {concern, mitigation}

Rules:
- Make concrete technology choices with specific versions.
- Include error handling and security from the start.
- Consider scaling and performance.
- output must be parseable JSON — no markdown fences, no extra text."""


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
            parsed = self._parse_json(result)
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

    def _parse_json(self, raw: str) -> dict:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned)
