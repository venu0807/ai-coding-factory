import json
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior software engineer at a top tech company. Given a specification and architecture, generate complete, production-ready code files.

Return ONLY valid JSON — an array of objects:
[
  {
    "file_path": "src/index.ts",
    "content": "console.log('hello');",
    "language": "typescript"
  }
]

Each object has:
- file_path: relative path
- content: full file content with all imports and exports
- language: programming language

REQUIREMENTS:
1. **Every file must be complete** — no placeholders, no "// TODO", no stubs
2. **Include config files** — package.json, tsconfig, Dockerfile if needed
3. **Include tests** — at minimum one test file per module
4. **Error handling** — every external call wrapped in try/catch or Result type
5. **Input validation** — validate all user inputs, API requests
6. **Logging** — add structured logging at key decision points
7. **Type safety** — use TypeScript types, Python type hints, or equivalent
8. **Modern patterns** — async/await, proper state management, dependency injection
9. **Include README** — with setup instructions and API docs

The code will be reviewed by a senior engineer. Make it production-quality."""

class CodingAgent(BaseAgent):
    def _parse_files(self, raw: str) -> list[dict]:
        """Parse LLM output as file list — handles arrays and {files: [...]} wrappers."""
        parsed = self.parse_json(raw)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            return parsed.get("files", parsed) if isinstance(parsed.get("files"), list) else []
        return []

    async def execute(self, task_id: str) -> None:
        self._current_task_id = task_id
        supabase = database.get_supabase()
        await self.log("Starting code generation...")
        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        spec = task_data["input_data"].get("spec", "")

        try:
            await self.log("Calling LLM to generate code from specification...")
            result = await self.call_llm(SYSTEM_PROMPT, spec)
            files = self._parse_files(result)
            await self.log(f"Generated {len(files)} files")

            for i, f in enumerate(files):
                supabase.table("generated_files").insert({
                    "task_id": task_id,
                    "file_path": f["file_path"],
                    "content": f["content"],
                    "language": f.get("language"),
                }).execute()
                await self.log(f"  [{i+1}/{len(files)}] Saved {f['file_path']}")

            now = datetime.now(timezone.utc).isoformat()
            await self.log("Code generation complete, chaining to Deployment Agent")
            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"file_count": len(files)},
                "completed_at": now,
            }).eq("id", task_id).execute()

            supabase.table("agent_tasks").insert({
                "project_id": task_data["project_id"],
                "agent_type": "code_review",
                "status": "pending",
                "input_data": {"task_id": task_id, "spec": task_data["input_data"].get("spec", ""), "file_count": len(files)},
            }).execute()

        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            await self.log(f"Failed: {str(e)}")
            supabase.table("agent_tasks").update({
                "status": "failed",
                "error": str(e),
                "completed_at": now,
            }).eq("id", task_id).execute()

