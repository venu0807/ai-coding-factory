import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
import json
from datetime import datetime, timezone


MOCK_SPEC = '{"name": "Todo App", "features": [{"name": "CRUD"}]}'
MOCK_ARCH = '{"tech_stack": ["FastAPI"], "data_model": [], "api_contracts": []}'
MOCK_DEPLOY = '{"platform": "docker", "config_files": [], "build_steps": ["docker build ."]}'


def _make_mock_response(content: str):
    m = MagicMock()
    m.json.return_value = {"choices": [{"message": {"content": content}}]}
    m.raise_for_status.return_value = None
    return m


@pytest.mark.asyncio
async def test_requirements_agent_creates_architecture_task(mock_deps, mock_httpx):
    """Requirements completes → creates architecture agent task."""
    project_id = "proj-pipe-1"

    mock_deps.execute.return_value.data = [
        {"id": "req-1", "project_id": project_id, "input_data": {"prompt": "Build todo app"}}
    ]

    mock_httpx.post.return_value = _make_mock_response(MOCK_SPEC)

    from agents.requirements_agent import RequirementsAgent
    agent = RequirementsAgent()
    await agent.execute("req-1")

    mock_httpx.post.assert_called()
    # Verify it chained to architecture (not coding directly)
    insert_calls = mock_deps.table.return_value.insert.call_args_list
    chain_inserts = [c for c in insert_calls if c[0][0].get("agent_type") == "architecture"]
    assert len(chain_inserts) >= 1


@pytest.mark.asyncio
async def test_architecture_agent_creates_coding_task(mock_deps, mock_httpx):
    """Architecture completes → creates coding agent task."""

    mock_deps.execute.return_value.data = [
        {"id": "arch-1", "project_id": "proj-1", "input_data": {"spec": MOCK_SPEC}}
    ]

    mock_httpx.post.return_value = _make_mock_response(MOCK_ARCH)

    from agents.architecture_agent import ArchitectureAgent
    agent = ArchitectureAgent()
    await agent.execute("arch-1")

    mock_httpx.post.assert_called()
    insert_calls = mock_deps.table.return_value.insert.call_args_list
    coding_inserts = [c for c in insert_calls if c[0][0].get("agent_type") == "coding"]
    assert len(coding_inserts) >= 1


@pytest.mark.asyncio
async def test_coding_agent_creates_deployment_task(mock_deps, mock_httpx):
    """Coding completes → creates deployment agent task."""

    mock_deps.execute.return_value.data = [
        {"id": "code-1", "project_id": "proj-1", "input_data": {"spec": MOCK_SPEC}}
    ]

    mock_httpx.post.return_value = _make_mock_response(
        '[{"file_path": "main.py", "content": "print(1)", "language": "python"}]'
    )

    from agents.coding_agent import CodingAgent
    agent = CodingAgent()
    await agent.execute("code-1")

    mock_httpx.post.assert_called()
    insert_calls = mock_deps.table.return_value.insert.call_args_list
    deploy_inserts = [c for c in insert_calls if c[0][0].get("agent_type") == "deployment"]
    assert len(deploy_inserts) >= 1


@pytest.mark.asyncio
async def test_retry_on_llm_failure(mock_deps, mock_httpx):
    """Base agent retries on 5xx then succeeds."""
    from agents.requirements_agent import RequirementsAgent

    mock_deps.execute.return_value.data = [
        {"id": "retry-1", "project_id": "proj-1", "input_data": {"prompt": "test"}}
    ]

    error_resp = MagicMock(status_code=502)
    error_resp.raise_for_status.side_effect = __import__("httpx").HTTPStatusError(
        "Bad Gateway", request=MagicMock(), response=error_resp
    )
    mock_httpx.post.side_effect = [
        error_resp,
        error_resp,
        _make_mock_response(MOCK_SPEC),
    ]

    agent = RequirementsAgent()
    await agent.execute("retry-1")

    assert mock_httpx.post.call_count == 3
