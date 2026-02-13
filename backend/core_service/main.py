"""FastAPI entrypoint for core API service."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from core_service.routes.diagnostics import router as diagnostics_router
from core_service.routes.writeups import router as writeups_router
from core_service.services.change_stream_sync import ControlPlaneChangeStreamSync
from routes.auth import router as auth_router
from routes.users import router as users_router
from shared.app_setup import configure_common_middleware, register_exception_handlers
from shared.db import build_health_payload, initialize_database, shutdown_database
from database import mongodb

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    stream_sync: ControlPlaneChangeStreamSync | None = None

    logger.info("Starting core service")
    await initialize_database()

    try:
        if mongodb.mongo_client is not None:
            stream_sync = ControlPlaneChangeStreamSync(mongodb.mongo_client, mongodb.DATABASE_NAME)
            await stream_sync.start()
            app.state.stream_sync = stream_sync
        else:
            logger.warning("Mongo client not initialized; skipping change stream consumers")
            app.state.stream_sync = None
    except Exception as exc:
        logger.error("Failed to start stream consumers: %s", exc, exc_info=True)
        app.state.stream_sync = None

    try:
        yield
    finally:
        logger.info("Shutting down core service")
        if stream_sync is not None:
            await stream_sync.stop()
        await shutdown_database()


app = FastAPI(
    title="CTF Platform Core API",
    description="Authentication, users, writeups, and projection service",
    version="2.0.0",
    lifespan=lifespan,
)

configure_common_middleware(app)
register_exception_handlers(app, logger)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(writeups_router)
app.include_router(diagnostics_router)


@app.get("/")
async def root():
    return {"message": "CTF Platform Core API"}


@app.get("/health")
async def health():
    return await build_health_payload("core")


@app.get("/health/core")
async def health_core():
    return await build_health_payload("core")
