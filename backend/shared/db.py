"""Shared MongoDB lifecycle and health helpers."""

from __future__ import annotations

from typing import Awaitable, Callable, Iterable

from database import check_connection, close_mongo_connection, connect_to_mongo, create_indexes
from database.mongodb import DATABASE_NAME, MONGODB_URL


IndexInitializer = Callable[[], Awaitable[None]]


def mask_mongodb_url(raw_url: str) -> str:
    """Mask MongoDB credentials before returning URL in diagnostics."""
    if "@" not in raw_url:
        return raw_url

    credentials = raw_url.split("@", 1)[0].split("://", 1)[-1]
    if ":" not in credentials:
        return raw_url
    username = credentials.split(":", 1)[0]
    return raw_url.replace(credentials, f"{username}:***", 1)


async def initialize_database(extra_index_initializers: Iterable[IndexInitializer] | None = None) -> None:
    """Connect to Mongo and create base + optional service-specific indexes."""
    await connect_to_mongo()
    await create_indexes()
    if not extra_index_initializers:
        return

    for initializer in extra_index_initializers:
        await initializer()


async def shutdown_database() -> None:
    """Close Mongo connection."""
    await close_mongo_connection()


async def build_health_payload(service_name: str) -> dict:
    """Uniform health payload for service-specific health endpoints."""
    mongo_healthy = await check_connection()
    return {
        "status": "healthy" if mongo_healthy else "unhealthy",
        "service": service_name,
        "database": "connected" if mongo_healthy else "disconnected",
        "database_name": DATABASE_NAME,
        "mongodb_url": mask_mongodb_url(MONGODB_URL),
    }

