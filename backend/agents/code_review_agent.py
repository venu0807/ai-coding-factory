import json
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior code reviewer at a top tech company. Given a specification and generated code files, perform a thorough review.

Review for these dimensions (in order of priority):

1. **Correctness** — Does code implement the spec? Any logic errors, off-by-one, race conditions?
2. **Security** — SQL injection, XSS, CSRF, hardcoded secrets, missing auth checks, unsafe deserialization
3. **Error handling** — Are external calls wrapped? Meaningful error messages? No silent failures?
4. **Code quality** — Dead code, duplicated logic, overly complex functions, missing type hints
5. **Testing** — Are there tests? Do they cover edge cases? No tests that always pass?
6. **Performance** — N+1 queries, unoptimized loops, missing caching, large payloads

Return ONLY valid JSON:
{
  "summary": "one paragraph overview of code quality",
  "overall_score": "pass" | "pass_with_issues" | "fail",
  "findings": [
    {
      "file": "path/to/file",
      "line": null,
      "severity": "error" | "warning" | "info",
      "dimension": "correctness" | "security" | "error_handling" | "code_quality" | "testing" | "performance",
      "message": "clear description of the issue",
      "suggestion": "specific, actionable fix"
    }
  ]
}

Be thorough but fair. Not every minor style issue needs a finding. Focus on what matters.
If no significant issues found, return {"summary": "Code looks good", "findings": [], "overall_score": "pass"}"""


class CodeReviewAgent(BaseAgent):
    def _parse_review(self, raw: str) -> dict:
        """Parse LLM output as review JSON — returns fallback on parse failure."""
        try:
            return self.parse_json(raw)
        except (json.JSONDecodeError, TypeError):
            return {"summary": "Failed to parse review", "findings": []}

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

