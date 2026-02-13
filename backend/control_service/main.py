"""FastAPI entrypoint for control-plane service."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from control_service.routes.control_plane import router as control_plane_router
from services.background_worker import BackgroundWorker
from services.deployment_orchestrator import DeploymentOrchestrator
from shared.app_setup import configure_common_middleware, register_exception_handlers
from shared.db import build_health_payload, initialize_database, shutdown_database
from shared.services import (
    get_session_manager,
    get_ssh_key_manager,
    get_status_tracking_service,
    get_task_queue_service,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    background_worker: BackgroundWorker | None = None

    logger.info("Starting control-plane service")
    await initialize_database()

    try:
        orchestrator = DeploymentOrchestrator(
            session_manager=get_session_manager(),
            ssh_key_manager=get_ssh_key_manager(),
            task_queue_service=get_task_queue_service(),
            status_tracking_service=get_status_tracking_service(),
        )
        background_worker = BackgroundWorker(
            task_queue_service=get_task_queue_service(),
            deployment_orchestrator=orchestrator,
        )
        await background_worker.start()
        app.state.background_worker = background_worker
    except Exception as exc:
        logger.error("Failed to initialize background worker: %s", exc, exc_info=True)
        app.state.background_worker = None

    try:
        yield
    finally:
        logger.info("Shutting down control-plane service")
        if background_worker is not None:
            await background_worker.stop()
        await shutdown_database()


app = FastAPI(
    title="CTF Platform Control Plane",
    description="Session/task lifecycle orchestration and SSH interaction service",
    version="2.0.0",
    lifespan=lifespan,
)

configure_common_middleware(app)
register_exception_handlers(app, logger)

app.include_router(control_plane_router)


@app.get("/")
async def root():
    return {"message": "CTF Platform Control Plane API"}


@app.get("/health/control")
async def control_health():
    return await build_health_payload("control-plane")

