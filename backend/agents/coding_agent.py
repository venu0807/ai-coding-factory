import json
from datetime import datetime, timezone
from agents.base import BaseAgent
from database import get_supabase

SYSTEM_PROMPT = """You are a senior software engineer. Given a specification, generate complete code files.
Return ONLY valid JSON — an array of objects with:
- file_path: relative path (e.g. "src/index.ts")
- content: full file content
- language: programming language

Generate real, working code. Include package.json, configs, all source files.
Use modern best practices for each language."""

class CodingAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        supabase = get_supabase()
        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        spec = task_data["input_data"].get("spec", "")

        supabase.table("agent_tasks").update({"status": "running"}).eq("id", task_id).execute()

        try:
            result = await self.call_llm(SYSTEM_PROMPT, spec)
            files = self._parse_files(result)

            for f in files:
                supabase.table("generated_files").insert({
                    "task_id": task_id,
                    "file_path": f["file_path"],
                    "content": f["content"],
                    "language": f.get("language"),
                }).execute()

            now = datetime.now(timezone.utc).isoformat()
            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"file_count": len(files)},
                "completed_at": now,
            }).eq("id", task_id).execute()

        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            supabase.table("agent_tasks").update({
                "status": "failed",
                "error": str(e),
                "completed_at": now,
            }).eq("id", task_id).execute()

    def _parse_files(self, raw: str) -> list[dict]:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "files" in parsed:
            return parsed["files"]
        return parsed if isinstance(parsed, list) else []