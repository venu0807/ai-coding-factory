from abc import ABC, abstractmethod
from config import settings
import httpx

OMNIROUTER_MODEL = "deepseek-v4-flash-free"

class BaseAgent(ABC):
    @abstractmethod
    async def execute(self, task_id: str) -> None:
        ...

    async def call_llm(self, system_prompt: str, user_prompt: str) -> str:
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