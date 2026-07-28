import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from config import settings
import database
import httpx

OMNIROUTER_MODEL = "deepseek-v4-flash-free"
MAX_RETRIES = 3
BASE_DELAY = 2.0
MAX_DELAY = 30.0


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