def test_list_tasks(test_client, mock_deps):
    mock_deps.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {"id": "1", "project_id": "proj-1", "agent_type": "requirements", "status": "completed", "created_at": "2024-01-01T00:00:00Z"},
        {"id": "2", "project_id": "proj-1", "agent_type": "coding", "status": "pending", "created_at": "2024-01-01T00:00:00Z"},
    ]

    response = test_client.get("/projects/proj-1/tasks")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["agent_type"] == "requirements"


def test_list_files(test_client, mock_deps):
    mock_deps.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "1", "project_id": "proj-1", "agent_type": "requirements", "status": "completed"}
    ]
    mock_deps.table.return_value.select.return_value.in_.return_value.order.return_value.execute.return_value.data = [
        {"id": "f1", "task_id": "1", "file_path": "src/main.py", "content": "print('hello')", "language": "python"}
    ]

    response = test_client.get("/projects/proj-1/files")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_path"] == "src/main.py"
