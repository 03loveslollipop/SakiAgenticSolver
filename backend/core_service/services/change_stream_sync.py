"""Core projections fed by control-plane MongoDB change streams."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
import hashlib
import logging
from typing import Any, Dict, Iterable, Optional

from bson import BSON
from bson.json_util import dumps as bson_dumps
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import OperationFailure, PyMongoError

logger = logging.getLogger(__name__)


class ControlPlaneChangeStreamSync:
    """
    Consume control-plane collection changes and project them into:
    - session_event_audit
    - dashboard_metrics_projection
    while persisting resume tokens in service_stream_offsets.
    """

    def __init__(
        self,
        mongo_client: AsyncIOMotorClient,
        database_name: str,
        watched_collections: Optional[Iterable[str]] = None,
    ):
        self.db: AsyncIOMotorDatabase = mongo_client[database_name]
        self.watched_collections = list(
            watched_collections or ("sessions", "background_tasks", "deployment_status")
        )
        self.audit_collection = self.db["session_event_audit"]
        self.metrics_collection = self.db["dashboard_metrics_projection"]
        self.offsets_collection = self.db["service_stream_offsets"]
        self._stop_event = asyncio.Event()
        self._tasks: list[asyncio.Task] = []

    async def start(self) -> None:
        if self._tasks:
            return

        self._stop_event.clear()
        for collection_name in self.watched_collections:
            task = asyncio.create_task(
                self._consume_collection(collection_name),
                name=f"core-stream-{collection_name}",
            )
            self._tasks.append(task)
        logger.info("Started %d change stream consumers", len(self._tasks))

    async def stop(self) -> None:
        self._stop_event.set()
        if not self._tasks:
            return

        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks = []
        logger.info("Stopped change stream consumers")

    async def _consume_collection(self, collection_name: str) -> None:
        collection = self.db[collection_name]
        retry_delay = 1.0

        while not self._stop_event.is_set():
            try:
                resume_token = await self._get_resume_token(collection_name)
                watch_kwargs: Dict[str, Any] = {
                    "full_document": "updateLookup",
                    "max_await_time_ms": 1000,
                }
                if resume_token is not None:
                    watch_kwargs["resume_after"] = resume_token

                logger.info(
                    "Opening change stream for %s (resume token present: %s)",
                    collection_name,
                    resume_token is not None,
                )

                async with collection.watch(**watch_kwargs) as stream:
                    async for change in stream:
                        if self._stop_event.is_set():
                            return

                        await self._process_stream_event(collection_name, change)
                        await self._save_resume_token(collection_name, change.get("_id"))

                retry_delay = 1.0
            except asyncio.CancelledError:
                return
            except OperationFailure as exc:
                logger.error(
                    "Change stream unavailable for %s (requires replica set/sharded MongoDB): %s",
                    collection_name,
                    exc,
                )
                await asyncio.sleep(min(retry_delay, 30.0))
                retry_delay = min(retry_delay * 2, 30.0)
            except PyMongoError as exc:
                logger.error("Mongo stream error for %s: %s", collection_name, exc, exc_info=True)
                await asyncio.sleep(min(retry_delay, 30.0))
                retry_delay = min(retry_delay * 2, 30.0)
            except Exception as exc:
                logger.error("Unexpected stream error for %s: %s", collection_name, exc, exc_info=True)
                await asyncio.sleep(min(retry_delay, 30.0))
                retry_delay = min(retry_delay * 2, 30.0)

    async def _get_resume_token(self, stream_name: str) -> Optional[dict]:
        offset_doc = await self.offsets_collection.find_one({"stream_name": stream_name})
        if not offset_doc:
            return None
        return offset_doc.get("resume_token")

    async def _save_resume_token(self, stream_name: str, resume_token: Any) -> None:
        if resume_token is None:
            return

        await self.offsets_collection.update_one(
            {"stream_name": stream_name},
            {
                "$set": {
                    "stream_name": stream_name,
                    "resume_token": resume_token,
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

    async def _process_stream_event(self, collection_name: str, change: dict) -> None:
        normalized = self._normalize_event(collection_name, change)
        await self.audit_collection.update_one(
            {"event_id": normalized["event_id"]},
            {"$setOnInsert": normalized},
            upsert=True,
        )
        await self._update_metrics_projection()

    def _normalize_event(self, collection_name: str, change: dict) -> dict:
        resume_token = change.get("_id")
        full_document = change.get("fullDocument") or {}
        operation_type = change.get("operationType")
        document_key = change.get("documentKey") or {}

        session_id = self._extract_session_id(collection_name, full_document, document_key)
        task_id = self._extract_task_id(collection_name, full_document, document_key)

        status = full_document.get("status")
        progress = full_document.get("progress")
        if progress is None:
            progress = full_document.get("deployment_progress")

        timestamp = (
            full_document.get("updated_at")
            or full_document.get("last_updated")
            or full_document.get("created_at")
            or datetime.utcnow()
        )

        raw_summary = {
            "document_key": document_key,
            "updated_fields": list((change.get("updateDescription") or {}).get("updatedFields", {}).keys()),
            "removed_fields": (change.get("updateDescription") or {}).get("removedFields", []),
        }

        return {
            "event_id": self._derive_event_id(collection_name, resume_token),
            "source_collection": collection_name,
            "operation_type": operation_type,
            "session_id": session_id,
            "task_id": task_id,
            "status": status,
            "progress": progress,
            "timestamp": timestamp,
            "raw_summary": raw_summary,
        }

    def _derive_event_id(self, collection_name: str, resume_token: Any) -> str:
        try:
            payload = BSON.encode(
                {
                    "collection": collection_name,
                    "resume_token": resume_token,
                }
            )
        except Exception:
            payload = f"{collection_name}:{bson_dumps(resume_token)}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def _extract_session_id(self, collection_name: str, full_document: dict, document_key: dict) -> Optional[str]:
        if collection_name == "sessions":
            return str(full_document.get("_id") or document_key.get("_id")) if (full_document or document_key) else None
        return full_document.get("session_id")

    def _extract_task_id(self, collection_name: str, full_document: dict, document_key: dict) -> Optional[str]:
        if collection_name == "background_tasks":
            return full_document.get("task_id")
        if collection_name == "deployment_status":
            return full_document.get("task_id")
        if collection_name == "sessions":
            return full_document.get("task_id")
        if document_key.get("_id"):
            return str(document_key["_id"])
        return None

    async def _update_metrics_projection(self) -> None:
        sessions_by_status = await self._count_by_status("sessions")
        tasks_by_status = await self._count_by_status("background_tasks")

        cutoff = datetime.utcnow() - timedelta(hours=24)
        failed_deployments_24h = await self.db["background_tasks"].count_documents(
            {
                "type": "vm_deployment",
                "status": "failed",
                "updated_at": {"$gte": cutoff},
            }
        )

        avg_pipeline = [
            {
                "$match": {
                    "type": "vm_deployment",
                    "status": "completed",
                    "completed_at": {"$gte": cutoff},
                    "created_at": {"$ne": None},
                }
            },
            {
                "$project": {
                    "duration_seconds": {
                        "$divide": [{"$subtract": ["$completed_at", "$created_at"]}, 1000]
                    }
                }
            },
            {
                "$group": {
                    "_id": None,
                    "avg_duration_seconds": {"$avg": "$duration_seconds"},
                }
            },
        ]
        try:
            avg_result = await self.db["background_tasks"].aggregate(avg_pipeline).to_list(length=1)
            avg_deploy_duration_24h = (
                float(avg_result[0]["avg_duration_seconds"]) if avg_result else None
            )
        except Exception:
            # mongomock and some older Mongo setups may not support date subtraction in aggregation.
            docs = await self.db["background_tasks"].find(
                {
                    "type": "vm_deployment",
                    "status": "completed",
                    "completed_at": {"$gte": cutoff},
                }
            ).to_list(length=None)
            durations = [
                (doc["completed_at"] - doc["created_at"]).total_seconds()
                for doc in docs
                if doc.get("created_at") is not None and doc.get("completed_at") is not None
            ]
            avg_deploy_duration_24h = (
                float(sum(durations) / len(durations)) if durations else None
            )

        await self.metrics_collection.update_one(
            {"_id": "global"},
            {
                "$set": {
                    "sessions_by_status": sessions_by_status,
                    "tasks_by_status": tasks_by_status,
                    "failed_deployments_24h": failed_deployments_24h,
                    "avg_deploy_duration_24h": avg_deploy_duration_24h,
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

    async def _count_by_status(self, collection_name: str) -> dict[str, int]:
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        result = await self.db[collection_name].aggregate(pipeline).to_list(length=None)
        return {str(row["_id"]): int(row["count"]) for row in result if row.get("_id") is not None}
