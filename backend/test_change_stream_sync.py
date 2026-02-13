"""Unit tests for core change-stream audit/metrics projection sync."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
import pytest_asyncio

from core_service.services.change_stream_sync import ControlPlaneChangeStreamSync

try:
    from mongomock_motor import AsyncMongoMockClient
except ImportError:  # pragma: no cover
    AsyncMongoMockClient = None


pytestmark = pytest.mark.skipif(AsyncMongoMockClient is None, reason="mongomock_motor not installed")


@pytest_asyncio.fixture
async def sync_service():
    client = AsyncMongoMockClient()
    service = ControlPlaneChangeStreamSync(client, "ctf_platform_stream_test")
    yield service
    client.close()


@pytest.mark.asyncio
async def test_resume_token_roundtrip(sync_service):
    token = {"_data": "resume-token-1"}
    await sync_service._save_resume_token("sessions", token)

    loaded = await sync_service._get_resume_token("sessions")
    assert loaded == token


@pytest.mark.asyncio
async def test_normalize_event_contains_required_fields(sync_service):
    now = datetime.utcnow()
    change_event = {
        "_id": {"_data": "token-abc"},
        "operationType": "update",
        "fullDocument": {
            "_id": "session-1",
            "task_id": "task-1",
            "status": "running",
            "deployment_progress": 42,
            "updated_at": now,
        },
        "documentKey": {"_id": "session-1"},
        "updateDescription": {"updatedFields": {"status": "running"}, "removedFields": []},
    }

    normalized = sync_service._normalize_event("sessions", change_event)

    assert normalized["event_id"]
    assert normalized["source_collection"] == "sessions"
    assert normalized["operation_type"] == "update"
    assert normalized["session_id"] == "session-1"
    assert normalized["task_id"] == "task-1"
    assert normalized["status"] == "running"
    assert normalized["progress"] == 42
    assert isinstance(normalized["raw_summary"], dict)


@pytest.mark.asyncio
async def test_process_stream_event_writes_audit_and_metrics(sync_service):
    now = datetime.utcnow()
    yesterday = now - timedelta(hours=1)
    old = now - timedelta(days=2)

    await sync_service.db["sessions"].insert_many(
        [
            {"_id": "session-1", "status": "running"},
            {"_id": "session-2", "status": "error"},
        ]
    )
    await sync_service.db["background_tasks"].insert_many(
        [
            {
                "task_id": "task-completed",
                "type": "vm_deployment",
                "status": "completed",
                "created_at": old,
                "completed_at": yesterday,
                "updated_at": yesterday,
            },
            {
                "task_id": "task-failed",
                "type": "vm_deployment",
                "status": "failed",
                "created_at": yesterday,
                "completed_at": None,
                "updated_at": now,
            },
        ]
    )

    change_event = {
        "_id": {"_data": "token-123"},
        "operationType": "update",
        "fullDocument": {
            "_id": "session-1",
            "task_id": "task-completed",
            "status": "running",
            "deployment_progress": 95,
            "updated_at": now,
        },
        "documentKey": {"_id": "session-1"},
        "updateDescription": {"updatedFields": {"deployment_progress": 95}, "removedFields": []},
    }

    await sync_service._process_stream_event("sessions", change_event)

    audit_doc = await sync_service.audit_collection.find_one({"source_collection": "sessions"})
    assert audit_doc is not None
    assert audit_doc["session_id"] == "session-1"
    assert audit_doc["task_id"] == "task-completed"

    metrics_doc = await sync_service.metrics_collection.find_one({"_id": "global"})
    assert metrics_doc is not None
    assert metrics_doc["sessions_by_status"]["running"] >= 1
    assert metrics_doc["tasks_by_status"]["failed"] >= 1
    assert metrics_doc["failed_deployments_24h"] >= 1

