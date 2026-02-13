"""Deployment status persistence and history tracking."""

from __future__ import annotations

from datetime import datetime
import logging
from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument

logger = logging.getLogger(__name__)


class StatusTrackingService:
    """Stores per-session deployment progress in MongoDB."""

    def __init__(self, mongo_client: AsyncIOMotorClient, database_name: str = "ctf_platform"):
        self.db = mongo_client[database_name]
        self.status_collection = self.db["deployment_status"]

    async def create_indexes(self) -> None:
        await self.status_collection.create_index("session_id", unique=True, name="idx_session_id_unique")
        await self.status_collection.create_index("task_id", name="idx_task_id")
        await self.status_collection.create_index("status", name="idx_status")
        await self.status_collection.create_index("last_updated", name="idx_last_updated")
        logger.info("Created indexes for deployment_status collection")

    async def initialize_status(
        self,
        *,
        session_id: str,
        task_id: str,
        status: str = "queued",
        progress: int = 0,
        current_step: str = "queued",
        estimated_completion: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Create or replace the initial status document for a session."""
        now = datetime.utcnow()
        status_doc = {
            "session_id": session_id,
            "task_id": task_id,
            "status": status,
            "progress": max(0, min(100, progress)),
            "current_step": current_step,
            "step_progress": 0,
            "estimated_completion": estimated_completion,
            "vm_ip": None,
            "error_details": None,
            "last_updated": now,
            "history": [
                {
                    "timestamp": now,
                    "status": status,
                    "progress": max(0, min(100, progress)),
                    "message": f"Deployment {status}",
                }
            ],
        }

        await self.status_collection.replace_one(
            {"session_id": session_id},
            status_doc,
            upsert=True,
        )
        return status_doc

    async def update_status(
        self,
        *,
        session_id: str,
        status: str,
        progress: Optional[int] = None,
        current_step: Optional[str] = None,
        step_progress: Optional[int] = None,
        estimated_completion: Optional[datetime] = None,
        vm_ip: Optional[str] = None,
        error_details: Optional[Dict[str, Any]] = None,
        message: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update deployment status and append a history event."""
        now = datetime.utcnow()
        update_data: Dict[str, Any] = {
            "status": status,
            "last_updated": now,
        }

        if progress is not None:
            update_data["progress"] = max(0, min(100, progress))
        if current_step is not None:
            update_data["current_step"] = current_step
        if step_progress is not None:
            update_data["step_progress"] = max(0, min(100, step_progress))
        if estimated_completion is not None:
            update_data["estimated_completion"] = estimated_completion
        if vm_ip is not None:
            update_data["vm_ip"] = vm_ip
        if error_details is not None:
            update_data["error_details"] = error_details

        history_entry = {
            "timestamp": now,
            "status": status,
            "progress": update_data.get("progress"),
            "message": message or current_step or status,
        }

        status_doc = await self.status_collection.find_one_and_update(
            {"session_id": session_id},
            {
                "$set": update_data,
                "$push": {"history": history_entry},
            },
            return_document=ReturnDocument.AFTER,
        )
        return status_doc

    async def get_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Return current deployment status for a session."""
        return await self.status_collection.find_one({"session_id": session_id}, {"_id": 0})

