from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from uuid import UUID

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Project(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    status: str = "idle"
    created_at: datetime

class AgentTask(BaseModel):
    id: UUID
    project_id: UUID
    agent_type: str
    status: str = "pending"
    input_data: Optional[dict[str, Any]] = None
    output_data: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class GeneratedFile(BaseModel):
    id: UUID
    task_id: UUID
    file_path: str
    content: str
    language: Optional[str] = None
    created_at: datetime