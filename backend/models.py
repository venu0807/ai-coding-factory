from pydantic import BaseModel, field_validator
from typing import Optional, Any
from datetime import datetime
from uuid import UUID

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) > 100:
            raise ValueError("Max 100 characters")
        return stripped

    @field_validator("description")
    @classmethod
    def desc_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if len(stripped) > 500:
            raise ValueError("Max 500 characters")
        return stripped or None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if len(stripped) > 100:
            raise ValueError("Max 100 characters")
        return stripped

    @field_validator("description")
    @classmethod
    def desc_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if len(stripped) > 500:
            raise ValueError("Max 500 characters")
        return stripped or None

class Project(BaseModel):
    id: UUID
    user_id: str
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