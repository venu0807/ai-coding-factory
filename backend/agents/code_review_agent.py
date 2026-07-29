import json
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior code reviewer. Given a specification and generated code files, review for:
1. Correctness — does the code implement the spec? Any bugs?
2. Security — any vulnerabilities, injection risks, exposed secrets?
3. Code quality — dead code, poor patterns, missing error handling?

Return ONLY valid JSON:
{
  "summary": "brief overview",
  "findings": [
    {
      "file": "path/to/file",
      "line": null,
      "severity": "error" | "warning" | "info",
      "message": "description of issue",
      "suggestion": "how to fix"
    }
  ]
}
If no issues found, return {"summary": "Code looks good", "findings": []}"""


class CodeReviewAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        self._current_task_id = task_id
        supabase = database.get_supabase()
        await self.log("Starting code review...")

        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        project_id = task_data["project_id"]

        upstream_task_id = task_data["input_data"].get("task_id", "")
        files = supabase.table("generated_files").select(
            "file_path, content, language"
        ).eq("task_id", upstream_task_id).execute()

        if not files.data:
            await self.log("No files to review")
            now = datetime.now(timezone.utc).isoformat()
            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"review": {"summary": "No files to review", "findings": []}},
                "completed_at": now,
            }).eq("id", task_id).execute()
            return

        file_list = "\n".join(
            f"--- {f['file_path']} ---\n{f['content']}" for f in files.data
        )
        spec = task_data["input_data"].get("spec", "No spec provided")

        await self.log(f"Reviewing {len(files.data)} files...")
        result = await self.call_llm(
            SYSTEM_PROMPT,
            f"SPECIFICATION:\n{spec}\n\nFILES:\n{file_list}",
        )
        review = self._parse_review(result)

        error_count = sum(
            1 for f in review.get("findings", []) if f.get("severity") == "error"
        )
        warning_count = sum(
            1 for f in review.get("findings", []) if f.get("severity") == "warning"
        )

        await self.log(
            f"Review complete: {error_count} errors, {warning_count} warnings, "
            f"{len(review.get('findings', []))} total findings"
        )

        now = datetime.now(timezone.utc).isoformat()
        supabase.table("agent_tasks").update({
            "status": "completed",
            "output_data": {"review": review},
            "completed_at": now,
        }).eq("id", task_id).execute()

        supabase.table("agent_tasks").insert({
            "project_id": project_id,
            "agent_type": "deployment",
            "status": "pending",
            "input_data": {
                "task_id": upstream_task_id,
                "file_count": len(files.data),
            },
        }).execute()

    def _parse_review(self, raw: str) -> dict:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict) and "findings" in parsed:
                return parsed
        except json.JSONDecodeError:
            pass
        return {"summary": "Failed to parse review", "findings": []}
