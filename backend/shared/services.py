"""Shared service factories used by both backend service apps."""

from __future__ import annotations

from database import mongodb
from services.session_manager import SessionManager
from services.ssh_key_manager import SSHKeyManager
from services.status_tracking_service import StatusTrackingService
from services.task_queue_service import TaskQueueService
from services.user_manager import UserManager
from services.writeup_manager import WriteupManager


def get_session_manager() -> SessionManager:
    return SessionManager(mongodb.mongo_client, mongodb.DATABASE_NAME)


def get_ssh_key_manager() -> SSHKeyManager:
    return SSHKeyManager(mongodb.mongo_client, mongodb.DATABASE_NAME)


def get_writeup_manager() -> WriteupManager:
    return WriteupManager(mongodb.mongo_client, mongodb.DATABASE_NAME)


def get_task_queue_service() -> TaskQueueService:
    return TaskQueueService(mongodb.mongo_client, mongodb.DATABASE_NAME)


def get_status_tracking_service() -> StatusTrackingService:
    return StatusTrackingService(mongodb.mongo_client, mongodb.DATABASE_NAME)


def get_user_manager() -> UserManager:
    return UserManager(mongodb.mongo_client, mongodb.DATABASE_NAME)
