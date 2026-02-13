"""Background task queue persistence for asynchronous VM deployments."""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any, Dict, List, Optional
import uuid

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class TaskQueueService:
    """MongoDB-backed queue for background deployment tasks."""

    def __init__(self, mongo_client: AsyncIOMotorClient, database_name: str = "ctf_platform"):
        self.db = mongo_client[database_name]
        self.tasks_collection = self.db["background_tasks"]

    async def create_indexes(self) -> None:
        """Create indexes used by queue operations."""
        await self.tasks_collection.create_index("task_id", unique=True, name="idx_task_id_unique")
        await self.tasks_collection.create_index(
            [("status", 1), ("priority", 1), ("created_at", 1)],
            name="idx_status_priority_created",
        )
        await self.tasks_collection.create_index("session_id", name="idx_session_id")
        await self.tasks_collection.create_index("next_retry_at", name="idx_next_retry_at")
        logger.info("Created indexes for background_tasks collection")

    async def enqueue_task(
        self,
        task_type: str,
        session_id: str,
        task_data: Dict[str, Any],
        *,
        priority: int = 100,
        max_retries: int = 2,
        estimated_completion: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Insert a queued task and return the persisted task document."""
        task_id = str(uuid.uuid4())
        now = datetime.utcnow()
        task_doc: Dict[str, Any] = {
            "task_id": task_id,
            "type": task_type,
            "status": "queued",
            "session_id": session_id,
            "created_at": now,
            "started_at": None,
            "completed_at": None,
            "updated_at": now,
            "progress": 0,
            "current_step": "queued",
            "error_message": None,
            "result": None,
            "task_data": task_data,
            "retry_count": 0,
            "max_retries": max_retries,
            "priority": priority,
            "next_retry_at": now,
            "estimated_completion": estimated_completion,
        }

        await self.tasks_collection.insert_one(task_doc)
        logger.info("Enqueued task %s for session %s", task_id, session_id)
        return self._serialize(task_doc)

    async def claim_next_task(self, *, task_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Atomically claim the highest-priority queued task that is ready to run.
        Returns None when queue is empty.
        """
        now = datetime.utcnow()
        query: Dict[str, Any] = {
            "status": "queued",
            "$or": [
                {"next_retry_at": {"$exists": False}},
                {"next_retry_at": {"$lte": now}},
            ],
        }
        if task_type:
            query["type"] = task_type

        update = {
            "$set": {
                "status": "running",
                "started_at": now,
                "updated_at": now,
            }
        }

        task_doc = await self.tasks_collection.find_one_and_update(
            query,
            update,
            sort=[("priority", 1), ("created_at", 1)],
            return_document=ReturnDocument.AFTER,
        )
        return self._serialize(task_doc)

    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a task by task_id."""
        task_doc = await self.tasks_collection.find_one({"task_id": task_id})
        return self._serialize(task_doc)

    async def update_task(
        self,
        task_id: str,
        *,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        current_step: Optional[str] = None,
        error_message: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update task fields and return updated task document."""
        now = datetime.utcnow()
        update_data: Dict[str, Any] = {"updated_at": now}

        if status is not None:
            update_data["status"] = status
            if status in {"completed", "failed", "cancelled"}:
                update_data["completed_at"] = now
        if progress is not None:
            update_data["progress"] = max(0, min(100, progress))
        if current_step is not None:
            update_data["current_step"] = current_step
        if error_message is not None:
            update_data["error_message"] = error_message
        if result is not None:
            update_data["result"] = result

        task_doc = await self.tasks_collection.find_one_and_update(
            {"task_id": task_id},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER,
        )
        return self._serialize(task_doc)

    async def requeue_task_with_backoff(
        self,
        task_id: str,
        *,
        error_message: str,
        backoff_seconds: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Requeue a failed task if retry budget remains.
        Returns updated task or None if the task does not exist.
        """
        task_doc = await self.tasks_collection.find_one({"task_id": task_id})
        if not task_doc:
            return None

        retry_count = int(task_doc.get("retry_count", 0))
        max_retries = int(task_doc.get("max_retries", 0))
        now = datetime.utcnow()

        if retry_count >= max_retries:
            return await self.update_task(
                task_id,
                status="failed",
                error_message=error_message,
                current_step="failed",
            )

        updated = await self.tasks_collection.find_one_and_update(
            {"task_id": task_id},
            {
                "$set": {
                    "status": "queued",
                    "updated_at": now,
                    "next_retry_at": now + timedelta(seconds=backoff_seconds),
                    "error_message": error_message,
                    "current_step": "retrying",
                },
                "$inc": {"retry_count": 1},
            },
            return_document=ReturnDocument.AFTER,
        )
        logger.warning("Re-queued task %s for retry #%s", task_id, retry_count + 1)
        return self._serialize(updated)

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a queued/running task."""
        task_doc = await self.update_task(
            task_id,
            status="cancelled",
            current_step="cancelled",
            error_message="Task cancelled by user",
        )
        return task_doc is not None

    async def list_tasks(self, filters: Optional[Dict[str, Any]] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List tasks using optional Mongo filters."""
        query = filters or {}
        cursor = self.tasks_collection.find(query).sort("created_at", -1).limit(limit)
        tasks: List[Dict[str, Any]] = []
        async for task_doc in cursor:
            serialized = self._serialize(task_doc)
            if serialized:
                tasks.append(serialized)
        return tasks

    def _serialize(self, task_doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not task_doc:
            return None

        task_doc = dict(task_doc)
        task_doc.pop("_id", None)
        return task_doc
