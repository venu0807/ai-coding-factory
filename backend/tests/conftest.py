import os
os.environ["OMNIROUTER_API_KEY"] = "test-key"
os.environ["OMNIROUTER_BASE_URL"] = "https://api.omnirouter.ai/v1"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_KEY"] = "test-key"
os.environ["POLL_INTERVAL_SECONDS"] = "2"

from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
import pytest
import importlib


@pytest.fixture
def mock_deps():
    client = MagicMock()
    client.table.return_value = client
    client.select.return_value = client
    client.eq.return_value = client
    client.order.return_value = client
    client.limit.return_value = client
    client.in_.return_value = client
    client.insert.return_value = client
    client.execute.return_value = MagicMock(data=[])
    with patch("database.get_supabase", return_value=client) as m:
        yield client


@pytest.fixture
def mock_httpx():
    with patch("httpx.AsyncClient") as mock:
        client = AsyncMock()
        mock.return_value.__aenter__.return_value = client
        yield client


@pytest.fixture
def test_client(mock_deps):
    from main import app
    return TestClient(app)


@pytest.fixture
async def async_client(mock_deps):
    from main import app
    from httpx import AsyncClient as AC
    async with AC(app=app, base_url="http://test") as client:
        yield client
