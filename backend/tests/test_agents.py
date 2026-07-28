import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_requirements_agent_execute_success(mock_deps, mock_httpx):
    from agents.requirements_agent import RequirementsAgent

    # Set select chain data
    mock_deps.execute.return_value.data = [
        {"id": "task-1", "project_id": "proj-1", "input_data": {"prompt": "Build a todo app"}}
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": '{"name": "Todo App", "features": []}'}}]
    }
    mock_response.raise_for_status.return_value = None
    mock_httpx.post.return_value = mock_response

    agent = RequirementsAgent()
    await agent.execute("task-1")

    mock_deps.table.assert_called()
    mock_httpx.post.assert_called_once()


@pytest.mark.asyncio
async def test_requirements_agent_execute_failure(mock_deps, mock_httpx):
    from agents.requirements_agent import RequirementsAgent

    mock_deps.execute.return_value.data = [
        {"id": "task-1", "project_id": "proj-1", "input_data": {"prompt": "Build a todo app"}}
    ]

    mock_httpx.post.side_effect = Exception("API Error")

    agent = RequirementsAgent()
    await agent.execute("task-1")

    calls = mock_deps.table.return_value.update.call_args_list
    failed_call = [c for c in calls if c[0][0].get("status") == "failed"]
    assert len(failed_call) >= 1


@pytest.mark.asyncio
async def test_coding_agent_execute_success(mock_deps, mock_httpx):
    from agents.coding_agent import CodingAgent

    mock_deps.execute.return_value.data = [
        {"id": "task-2", "project_id": "proj-1", "input_data": {"spec": '{"name": "Todo App"}'}}
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": '[{"file_path": "main.py", "content": "print(1)", "language": "python"}]'}}]
    }
    mock_response.raise_for_status.return_value = None
    mock_httpx.post.return_value = mock_response

    agent = CodingAgent()
    await agent.execute("task-2")

    mock_deps.table.assert_called()
    mock_httpx.post.assert_called_once()


@pytest.mark.asyncio
async def test_coding_agent_parse_files():
    from agents.coding_agent import CodingAgent

    agent = CodingAgent()

    raw = '[{"file_path": "main.py", "content": "print(1)", "language": "python"}]'
    files = agent._parse_files(raw)
    assert len(files) == 1
    assert files[0]["file_path"] == "main.py"

    raw_with_md = '```json\n[{"file_path": "main.py", "content": "print(1)"}]\n```'
    files = agent._parse_files(raw_with_md)
    assert len(files) == 1
