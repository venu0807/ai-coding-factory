import asyncio
from datetime import datetime, timezone
from config import settings
import database
from agents.requirements_agent import RequirementsAgent
from agents.architecture_agent import ArchitectureAgent
from agents.coding_agent import CodingAgent
from agents.deployment_agent import DeploymentAgent

AGENT_MAP = {
    "requirements": RequirementsAgent(),
    "architecture": ArchitectureAgent(),
    "coding": CodingAgent(),
    "deployment": DeploymentAgent(),
}

ACTIVE_TASKS: set[str] = set()


def _claim_pending(supabase):
    """Atomically claim pending tasks via UPDATE ... WHERE status='pending' RETURNING *."""
    result = supabase.table("agent_tasks") \
        .update({"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}) \
        .eq("status", "pending") \
        .execute()
    return result.data if result.data else []


def _mark_failed(task_id: str, error: str):
    supabase = database.get_supabase()
    supabase.table("agent_tasks").update({
        "status": "failed",
        "error": error,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", task_id).execute()


async def run_orchestrator():
    while True:
        try:
            supabase = database.get_supabase()
            tasks = _claim_pending(supabase)

            for task in tasks:
                tid = task["id"]
                if tid in ACTIVE_TASKS:
                    continue
                agent = AGENT_MAP.get(task["agent_type"])
                if agent:
                    ACTIVE_TASKS.add(tid)
                    asyncio.create_task(_run_and_cleanup(agent, tid))

        except Exception:
            pass

        await asyncio.sleep(settings.poll_interval_seconds)


async def _run_and_cleanup(agent, task_id: str):
    try:
        await agent.execute(task_id)
    except Exception as e:
        _mark_failed(task_id, str(e))
    finally:
        ACTIVE_TASKS.discard(task_id)