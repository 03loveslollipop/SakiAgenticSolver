"""Unit tests for TaskQueueService."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from services.task_queue_service import TaskQueueService


def _build_service():
    collection = MagicMock()
    db = MagicMock()
    client = MagicMock()
    db.__getitem__.return_value = collection
    client.__getitem__.return_value = db
    service = TaskQueueService(client, "test_db")
    return service, collection


@pytest.mark.asyncio
async def test_enqueue_task_creates_queued_task_with_defaults():
    service, collection = _build_service()
    collection.insert_one = AsyncMock(return_value=SimpleNamespace(inserted_id="x"))

    task = await service.enqueue_task(
        task_type="vm_deployment",
        session_id="session-1",
        task_data={"foo": "bar"},
    )

    assert task["status"] == "queued"
    assert task["type"] == "vm_deployment"
    assert task["session_id"] == "session-1"
    assert task["progress"] == 0
    assert "task_id" in task
    collection.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_requeue_task_with_backoff_marks_failed_when_retry_budget_exhausted():
    service, collection = _build_service()
    collection.find_one = AsyncMock(
        return_value={
            "task_id": "task-1",
            "retry_count": 2,
            "max_retries": 2,
        }
    )
    collection.find_one_and_update = AsyncMock(
        return_value={
            "task_id": "task-1",
            "status": "failed",
            "current_step": "failed",
            "updated_at": datetime.utcnow(),
        }
    )

    task = await service.requeue_task_with_backoff(
        "task-1",
        error_message="boom",
        backoff_seconds=30,
    )

    assert task is not None
    assert task["status"] == "failed"
    assert task["current_step"] == "failed"
