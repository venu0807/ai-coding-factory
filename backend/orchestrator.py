import asyncio
from config import settings
from database import get_supabase
from agents.requirements_agent import RequirementsAgent
from agents.coding_agent import CodingAgent

AGENT_MAP = {
    "requirements": RequirementsAgent(),
    "coding": CodingAgent(),
}

async def run_orchestrator():
    while True:
        try:
            supabase = get_supabase()
            result = supabase.table("agent_tasks") \
                .select("*") \
                .eq("status", "pending") \
                .order("created_at") \
                .limit(5) \
                .execute()

            for task in result.data:
                agent = AGENT_MAP.get(task["agent_type"])
                if agent:
                    asyncio.create_task(agent.execute(task["id"]))

        except Exception:
            pass

        await asyncio.sleep(settings.poll_interval_seconds)