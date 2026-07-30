import asyncio
import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from config import settings
import database
import httpx

OMNIROUTER_MODEL = "deepseek-v4-flash-free"
MAX_RETRIES = 3
BASE_DELAY = 2.0
MAX_DELAY = 30.0


MOCK_RESPONSES: dict[str, str] = {
    "requirements": """{"name": "Todo App", "description": "A task management app", "features": [{"name": "CRUD Tasks", "priority": "P0", "description": "Create, read, update, delete tasks"}], "tech_stack": ["React", "FastAPI", "PostgreSQL"], "api_endpoints": ["GET /tasks", "POST /tasks", "PUT /tasks/:id", "DELETE /tasks/:id"], "data_models": [{"name": "Task", "fields": ["id", "title", "description", "status", "created_at"]}], "user_stories": ["As a user, I can create a task", "As a user, I can view my tasks"]}""",  # noqa: E501
    "architecture": """{"tech_stack": [{"technology": "React", "version": "19", "purpose": "UI", "rationale": "Popular"}], "data_model": [{"name": "Task", "fields": [{"name": "id", "type": "uuid", "constraints": "PK"}], "relationships": []}], "api_contracts": [{"method": "GET", "path": "/tasks", "request_body": null, "response_shape": "array", "auth_required": true, "rate_limit": 100}], "component_tree": [{"name": "App", "path": "src/App.tsx", "responsibilities": "Routing", "dependencies": [], "interface": ""}], "file_structure": [{"path": "src/App.tsx", "purpose": "Entry point", "depends_on": []}], "implementation_order": [{"phase": "1", "files": ["src/App.tsx"], "description": "Setup", "estimated_effort": "2h"}], "key_design_decisions": [{"decision": "Use React", "rationale": "Familiar", "alternatives_considered": ["Vue"], "chosen_approach": "React"}], "error_handling": {"strategy": "try/catch", "retry_policy": "3 retries", "error_response_format": "json"}, "security_considerations": [{"concern": "Auth", "mitigation": "JWT"}]}""",  # noqa: E501
    "coding": """[{"file_path": "src/index.ts", "content": "console.log('hello');", "language": "typescript"}, {"file_path": "src/tasks.ts", "content": "export interface Task { id: string; title: string; status: string; }", "language": "typescript"}]""",  # noqa: E501
    "code_review": """{"summary": "Code looks good overall. Minor issues found.", "overall_score": "pass_with_issues", "findings": [{"file": "src/index.ts", "line": 1, "severity": "info", "dimension": "code_quality", "message": "Missing error handling", "suggestion": "Add try/catch around main logic"}]}""",  # noqa: E501
    "deployment": """{"platform": "docker", "config_files": [{"path": "Dockerfile", "content": "FROM node:20-alpine\\nWORKDIR /app\\nCOPY . .\\nRUN npm install\\nCMD [\\"npm\\", \\"start\\"]"}], "build_steps": ["docker build -t app .", "docker run -p 3000:3000 app"], "health_check_url": "/health", "environment_variables": [{"key": "NODE_ENV", "value": "production"}]}""",  # noqa: E501
}


def _mock_response(agent_type: str) -> str:
    """Return a mock LLM response based on agent type."""
    # Normalize: __class__.__name__ "Codereview" → "code_review"
    key = agent_type.replace("review", "_review")
    return MOCK_RESPONSES.get(key, MOCK_RESPONSES["coding"])


class BaseAgent(ABC):
    def __init__(self):
        self._current_task_id: str | None = None

    @abstractmethod
    async def execute(self, task_id: str) -> None:
        ...

    async def log(self, message: str) -> None:
        """Append a log entry to the task's logs field (pushes to Realtime)."""
        if not self._current_task_id:
            return
        try:
            supabase = database.get_supabase()
            entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "message": message}
            task = supabase.table("agent_tasks").select("logs").eq("id", self._current_task_id).execute()
            existing = task.data[0].get("logs") or [] if task.data else []
            existing.append(entry)
            supabase.table("agent_tasks").update({"logs": existing}).eq("id", self._current_task_id).execute()
        except Exception:
            pass

    async def call_llm(
        self, system_prompt: str, user_prompt: str
    ) -> str:
        if settings.llm_mock:
            agent_type = self.__class__.__name__.replace("Agent", "").lower()
            mock = _mock_response(agent_type)
            await self.log(f"[MOCK] {agent_type}: returning mock response")
            return mock
        last_err = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post(
                        f"{settings.omnirouter_base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.omnirouter_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": OMNIROUTER_MODEL,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt},
                            ],
                            "temperature": 0.3,
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                last_err = e
                if e.response.status_code in (429, 502, 503, 504):
                    delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
                    await asyncio.sleep(delay)
                    continue
                raise
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                last_err = e
                delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
                await asyncio.sleep(delay)
                continue
        raise RuntimeError(
            f"call_llm failed after {MAX_RETRIES} retries"
        ) from last_err

    def clean_json(self, raw: str) -> str:
        """Strip markdown fences, leading/trailing whitespace, and text-wrapping from LLM output."""
        cleaned = raw.strip()
        # Strip markdown code fences
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        # Handle cases where LLM wraps JSON in "Here is the result: {...}"
        # Find first { or [ and last } or ]
        first_brace = -1
        last_brace = -1
        for i, ch in enumerate(cleaned):
            if ch in ("{", "["):
                if first_brace == -1:
                    first_brace = i
            if ch in ("}", "]"):
                last_brace = i
        if first_brace != -1 and last_brace > first_brace:
            cleaned = cleaned[first_brace : last_brace + 1]
        return cleaned.strip()

    def parse_json(self, raw: str) -> dict | list:
        """Parse LLM output as JSON after cleaning."""
        return json.loads(self.clean_json(raw))

    async def call_llm_json(
        self, system_prompt: str, user_prompt: str
    ) -> dict | list:
        """Call LLM and parse JSON result. Retries once on parse failure with format repair."""
        for attempt in range(1, 3):
            result = await self.call_llm(system_prompt, user_prompt)
            try:
                return self.parse_json(result)
            except json.JSONDecodeError as e:
                await self.log(f"JSON parse failed (attempt {attempt}): {e}")
                if attempt == 1:
                    # Ask the LLM to fix JSON formatting
                    fix_prompt = (
                        f"The following response is not valid JSON. "
                        f"Remove all markdown fences, extra text, trailing commas, "
                        f"and extra commentary. Return ONLY the raw JSON object.\n\n"
                        f"{result}"
                    )
                    result = await self.call_llm(
                        "You are a JSON repair tool. Return ONLY valid JSON. "
                        "No markdown, no explanations, no code fences.",
                        fix_prompt,
                    )
                    try:
                        return self.parse_json(result)
                    except json.JSONDecodeError:
                        pass
                # Log the raw response for debugging, then re-raise
                truncated = result[:500] if len(result) > 500 else result
                await self.log(f"Unparseable response: {truncated}")
                raise