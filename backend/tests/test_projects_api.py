def test_create_project(test_client, mock_deps):
    mock_deps.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "test-id", "name": "Test Project", "description": "Test desc", "created_at": "2024-01-01T00:00:00Z"}
    ]

    response = test_client.post("/projects", json={"name": "Test Project", "description": "Test desc"})

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"


def test_list_projects(test_client, mock_deps):
    mock_deps.table.return_value.select.return_value.order.return_value.execute.return_value.data = [
        {"id": "1", "name": "Project 1", "description": "Desc 1", "created_at": "2024-01-01T00:00:00Z"},
        {"id": "2", "name": "Project 2", "description": "Desc 2", "created_at": "2024-01-01T00:00:00Z"},
    ]

    response = test_client.get("/projects")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_get_project(test_client, mock_deps):
    mock_deps.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "test-id", "name": "Test Project", "description": "Test desc", "created_at": "2024-01-01T00:00:00Z"}
    ]

    response = test_client.get("/projects/test-id")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-id"


def test_get_project_404(test_client, mock_deps):
    mock_deps.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    response = test_client.get("/projects/nonexistent")

    assert response.status_code == 404
