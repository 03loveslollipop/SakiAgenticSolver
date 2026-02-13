"""Background worker that pulls queued deployment tasks and executes them."""

from __future__ import annotations

import asyncio
import logging
from typing import Set

from services.deployment_orchestrator import DeploymentOrchestrator
from services.task_queue_service import TaskQueueService

logger = logging.getLogger(__name__)


class BackgroundWorker:
    """Simple in-process worker loop for async VM deployment tasks."""

    def __init__(
        self,
        task_queue_service: TaskQueueService,
        deployment_orchestrator: DeploymentOrchestrator,
        *,
        poll_interval_seconds: float = 2.0,
        max_concurrent_tasks: int = 2,
    ):
        self.task_queue_service = task_queue_service
        self.deployment_orchestrator = deployment_orchestrator
        self.poll_interval_seconds = poll_interval_seconds
        self.max_concurrent_tasks = max_concurrent_tasks
        self._stop_event = asyncio.Event()
        self._runner_task: asyncio.Task | None = None
        self._active_tasks: Set[asyncio.Task] = set()

    async def start(self) -> None:
        """Start worker loop if not already running."""
        if self._runner_task and not self._runner_task.done():
            return

        self._stop_event.clear()
        self._runner_task = asyncio.create_task(self._run_loop(), name="background-worker")
        logger.info("Background worker started")

    async def stop(self) -> None:
        """Gracefully stop the worker loop and running task executions."""
        self._stop_event.set()

        if self._runner_task:
            self._runner_task.cancel()
            try:
                await self._runner_task
            except asyncio.CancelledError:
                pass
            self._runner_task = None

        if self._active_tasks:
            done, pending = await asyncio.wait(self._active_tasks, timeout=5)
            for pending_task in pending:
                pending_task.cancel()
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)
            self._active_tasks = set(done)

        logger.info("Background worker stopped")

    async def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                await self._cleanup_finished_tasks()

                # Keep claiming tasks while capacity exists.
                while len(self._active_tasks) < self.max_concurrent_tasks:
                    task_doc = await self.task_queue_service.claim_next_task(task_type="vm_deployment")
                    if not task_doc:
                        break

                    deployment_task = asyncio.create_task(
                        self._process_task(task_doc),
                        name=f"deploy-{task_doc['task_id']}",
                    )
                    self._active_tasks.add(deployment_task)

                await asyncio.sleep(self.poll_interval_seconds)
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Background worker loop error")
                await asyncio.sleep(self.poll_interval_seconds)

    async def _cleanup_finished_tasks(self) -> None:
        finished = {task for task in self._active_tasks if task.done()}
        for task in finished:
            self._active_tasks.discard(task)
            try:
                await task
            except asyncio.CancelledError:
                pass
            except Exception:
                logger.exception("Worker task finished with error")

    async def _process_task(self, task_doc: dict) -> None:
        task_id = task_doc["task_id"]
        try:
            await self.deployment_orchestrator.deploy_vm_task(task_doc)
        except Exception as exc:
            current_task = await self.task_queue_service.get_task_status(task_id)
            if not current_task:
                return

            task_data = current_task.get("task_data") or {}
            task_result = current_task.get("result")
            retry_disabled = bool(task_data.get("disable_retry", False))
            retry_eligible = True
            failed_stage = current_task.get("current_step")
            if isinstance(task_result, dict):
                retry_eligible = bool(task_result.get("retry_eligible", True))
                failed_stage = task_result.get("failed_stage", failed_stage)
            error_message = current_task.get("error_message") or str(exc)

            if retry_disabled or not retry_eligible:
                logger.warning(
                    "Task %s will not be retried (stage=%s, retry_disabled=%s, retry_eligible=%s): %s",
                    task_id,
                    failed_stage,
                    retry_disabled,
                    retry_eligible,
                    error_message,
                )
                return

            retry_count = int(current_task.get("retry_count", 0))
            max_retries = int(current_task.get("max_retries", 0))
            if retry_count < max_retries:
                backoff_seconds = min(300, (2 ** retry_count) * 30)
                await self.task_queue_service.requeue_task_with_backoff(
                    task_id,
                    error_message=str(exc),
                    backoff_seconds=backoff_seconds,
                )
            else:
                logger.error("Task %s failed after exhausting retries", task_id)
