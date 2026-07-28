import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
import asyncio


@pytest.mark.asyncio
async def test_orchestrator_polls_pending_tasks(mock_deps):
    from orchestrator import run_orchestrator

    with patch("orchestrator._claim_pending", return_value=[
        {"id": "task-1", "agent_type": "requirements"},
    ]) as mock_claim, \
         patch("orchestrator.asyncio.create_task", wraps=asyncio.create_task) as mock_ct, \
         patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:

        mock_sleep.side_effect = [None, asyncio.CancelledError()]

        try:
            await run_orchestrator()
        except asyncio.CancelledError:
            pass

        assert mock_claim.call_count >= 1
        assert mock_ct.call_count >= 1


@pytest.mark.asyncio
async def test_orchestrator_handles_empty_queue(mock_deps):
    from orchestrator import run_orchestrator

    with patch("orchestrator._claim_pending", return_value=[]), \
         patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:

        mock_sleep.side_effect = [None, asyncio.CancelledError()]

        try:
            await run_orchestrator()
        except asyncio.CancelledError:
            pass

        assert mock_sleep.call_count == 2
