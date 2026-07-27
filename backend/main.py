from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from api.projects import router as projects_router
from api.tasks import router as tasks_router
from orchestrator import run_orchestrator

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(run_orchestrator())
    yield
    task.cancel()

app = FastAPI(title="AI Coding Factory", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router)
app.include_router(tasks_router)

@app.get("/health")
async def health():
    return {"status": "ok"}