"""Tests for async VM deployment endpoints."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import uuid

from fastapi.testclient import TestClient

from main import app


def _sample_request() -> dict:
    return {
        "challenge_urls": ["https://example.com/challenge.bin"],
        "instructions": "Solve the challenge.",
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "vm_size": "small",
        "setup_mode": "manual",
        "deploy_agent": True,
    }


def test_create_session_async_returns_immediate_accepted_response():
    client = TestClient(app)
    task_id = str(uuid.uuid4())

    mock_session_manager = SimpleNamespace(
        create_session=AsyncMock(),
        update_session=AsyncMock(),
    )
    mock_ssh_key_manager = SimpleNamespace(
        generate_key_pair=AsyncMock(return_value={"public_key": "ssh-rsa TEST_KEY"}),
        delete_key_pair=AsyncMock(),
    )
    mock_task_queue = SimpleNamespace(
        enqueue_task=AsyncMock(return_value={"task_id": task_id}),
    )
    mock_status_tracking = SimpleNamespace(
        initialize_status=AsyncMock(),
    )

    with (
        patch("main.get_session_manager", return_value=mock_session_manager),
        patch("main.get_ssh_key_manager", return_value=mock_ssh_key_manager),
        patch("main.get_task_queue_service", return_value=mock_task_queue),
        patch("main.get_status_tracking_service", return_value=mock_status_tracking),
    ):
        response = client.post("/api/sessions/async", json=_sample_request())

    assert response.status_code == 202
    payload = response.json()
    assert isinstance(payload["session_id"], str)
    assert payload["session_id"]
    assert payload["task_id"] == task_id
    assert payload["status"] == "queued"
    assert payload["status_url"] == f"/api/tasks/{task_id}/status"

    mock_session_manager.create_session.assert_called_once()
    mock_task_queue.enqueue_task.assert_called_once()
    mock_status_tracking.initialize_status.assert_called_once()


def test_get_task_status_endpoint():
    client = TestClient(app)
    task_id = str(uuid.uuid4())
    now = datetime.utcnow()

    mock_task_queue = SimpleNamespace(
        get_task_status=AsyncMock(
            return_value={
                "task_id": task_id,
                "session_id": "session-123",
                "status": "running",
                "progress": 45,
                "current_step": "installing_agent",
                "error_message": None,
                "result": None,
                "retry_count": 0,
                "max_retries": 2,
                "started_at": now,
                "updated_at": now,
                "completed_at": None,
            }
        )
    )

    with patch("main.get_task_queue_service", return_value=mock_task_queue):
        response = client.get(f"/api/tasks/{task_id}/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["task_id"] == task_id
    assert payload["session_id"] == "session-123"
    assert payload["status"] == "running"
    assert payload["progress"] == 45
    assert payload["current_step"] == "installing_agent"


def test_get_session_status_endpoint_uses_deployment_status_document():
    client = TestClient(app)
    now = datetime.utcnow()

    mock_session_manager = SimpleNamespace(
        get_session=AsyncMock(
            return_value=SimpleNamespace(
                id="session-123",
                status="creating",
                vm_ip=None,
                error_message=None,
                task_id="task-123",
                deployment_progress=10,
                current_step="queued",
                estimated_completion=now,
                last_status_update=now,
            )
        )
    )
    mock_status_tracking = SimpleNamespace(
        get_status=AsyncMock(
            return_value={
                "task_id": "task-123",
                "status": "creating",
                "progress": 50,
                "current_step": "installing_software",
                "vm_ip": None,
                "estimated_completion": now,
                "error_details": None,
                "last_updated": now,
            }
        )
    )

    with (
        patch("main.get_session_manager", return_value=mock_session_manager),
        patch("main.get_status_tracking_service", return_value=mock_status_tracking),
    ):
        response = client.get("/api/sessions/session-123/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == "session-123"
    assert payload["task_id"] == "task-123"
    assert payload["status"] == "creating"
    assert payload["progress"] == 50
    assert payload["current_step"] == "installing_software"
