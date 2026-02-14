"""Orchestrates multi-step VM deployment for background tasks."""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any, Dict

from models.schemas import VMConfig
from services.azure_vm_manager import AzureVMManager
from services.session_manager import SessionManager
from services.ssh_key_manager import SSHKeyManager
from services.status_tracking_service import StatusTrackingService
from services.task_queue_service import TaskQueueService
from services.vm_setup_service import VMSetupService

logger = logging.getLogger(__name__)


class DeploymentOrchestrator:
    """Runs VM deployments and updates task/session/deployment status state."""

    def __init__(
        self,
        session_manager: SessionManager,
        ssh_key_manager: SSHKeyManager,
        task_queue_service: TaskQueueService,
        status_tracking_service: StatusTrackingService,
    ):
        self.session_manager = session_manager
        self.ssh_key_manager = ssh_key_manager
        self.task_queue_service = task_queue_service
        self.status_tracking_service = status_tracking_service

    async def deploy_vm_task(self, task: Dict[str, Any]) -> None:
        """Execute a queued VM deployment task."""
        task_id = task["task_id"]
        session_id = task["session_id"]
        task_data = task.get("task_data", {})
        retry_disabled = bool(task_data.get("disable_retry", False))
        deploy_agent = bool(task_data.get("deploy_agent", True))
        resource_group = task_data["resource_group"]
        vm_size = task_data["vm_size"]
        agent_type = task_data["agent_type"]
        agent_model = task_data["agent_model"]
        challenge_urls = task_data["challenge_urls"]
        instructions = task_data["instructions"]
        ssh_public_key = task_data["ssh_public_key"]
        estimated_completion = datetime.utcnow() + timedelta(minutes=12)

        vm_info = None
        current_stage = "queued"
        deployment_warnings: list[str] = []
        agent_install_succeeded = False

        try:
            current_stage = "preflight_check"
            await self._update_progress(
                task_id=task_id,
                session_id=session_id,
                status="creating",
                progress=5,
                current_step=current_stage,
                estimated_completion=estimated_completion,
                message="Validating VM deployment request",
            )

            vm_config = VMConfig.from_size(vm_size)

            current_stage = "creating_vm"
            await self._update_progress(
                task_id=task_id,
                session_id=session_id,
                status="creating",
                progress=20,
                current_step=current_stage,
                estimated_completion=estimated_completion,
                message="Creating Azure VM resources",
            )

            azure_vm_manager = AzureVMManager()
            vm_info = await azure_vm_manager.create_vm(
                session_id=session_id,
                vm_size=vm_config.azure_vm_size,
                ssh_public_key=ssh_public_key,
                resource_group=resource_group,
            )

            await self.session_manager.update_session(
                session_id,
                {
                    "vm_ip": vm_info.public_ip,
                },
                updated_by="control-worker",
            )

            private_key = await self.ssh_key_manager.get_private_key(session_id)
            if not private_key:
                raise RuntimeError(f"Missing SSH private key for session {session_id}")

            vm_setup_service = VMSetupService()

            current_stage = "installing_software"
            await self._update_progress(
                task_id=task_id,
                session_id=session_id,
                status="creating",
                progress=45,
                current_step=current_stage,
                estimated_completion=estimated_completion,
                message="Installing VM base tooling",
            )
            setup_success = await vm_setup_service.execute_setup_script(
                vm_ip=vm_info.public_ip,
                ssh_private_key=private_key,
            )
            if not setup_success:
                raise RuntimeError("Setup script execution failed")

            if deploy_agent:
                current_stage = "installing_agent"
                await self._update_progress(
                    task_id=task_id,
                    session_id=session_id,
                    status="creating",
                    progress=62,
                    current_step=current_stage,
                    estimated_completion=estimated_completion,
                    message="Installing AI agent",
                )
                try:
                    agent_install_success = await vm_setup_service.install_agent(
                        vm_ip=vm_info.public_ip,
                        agent_type=agent_type,
                        agent_model=agent_model,
                        ssh_private_key=private_key,
                    )
                    if not agent_install_success:
                        raise RuntimeError(vm_setup_service.last_error or "Agent installation failed")
                    agent_install_succeeded = True
                except Exception as agent_install_exc:
                    warning = (
                        f"Agent installation failed; deployment will continue without agent startup: "
                        f"{vm_setup_service.last_error or str(agent_install_exc)}"
                    )
                    deployment_warnings.append(warning)
                    logger.warning(
                        "Deployment task %s session %s warning at stage=%s: %s",
                        task_id,
                        session_id,
                        current_stage,
                        warning,
                    )

            current_stage = "downloading_challenges"
            await self._update_progress(
                task_id=task_id,
                session_id=session_id,
                status="creating",
                progress=75,
                current_step=current_stage,
                estimated_completion=estimated_completion,
                message="Downloading challenge files",
            )
            challenges_success = await vm_setup_service.download_challenge_files(
                vm_ip=vm_info.public_ip,
                challenge_urls=challenge_urls,
                ssh_private_key=private_key,
            )
            if not challenges_success:
                raise RuntimeError("Challenge file download failed")

            current_stage = "configuring_environment"
            await self._update_progress(
                task_id=task_id,
                session_id=session_id,
                status="creating",
                progress=85,
                current_step=current_stage,
                estimated_completion=estimated_completion,
                message="Writing VM configuration files",
            )
            config_success = await vm_setup_service.create_config_files(
                vm_ip=vm_info.public_ip,
                instructions=instructions,
                ssh_private_key=private_key,
            )
            if not config_success:
                raise RuntimeError("Configuration file creation failed")

            if deploy_agent:
                try:
                    bootstrap_success = await vm_setup_service.write_agent_bootstrap_script(
                        vm_ip=vm_info.public_ip,
                        agent_type=agent_type,
                        agent_model=agent_model,
                        ssh_private_key=private_key,
                    )
                    if not bootstrap_success:
                        warning = "Agent bootstrap script generation failed"
                        deployment_warnings.append(warning)
                        logger.warning("%s for session %s", warning, session_id)
                except Exception as bootstrap_exc:
                    warning = f"Agent bootstrap script generation failed: {bootstrap_exc}"
                    deployment_warnings.append(warning)
                    logger.warning(
                        "Deployment task %s session %s warning: %s",
                        task_id,
                        session_id,
                        warning,
                    )

                if agent_install_succeeded:
                    current_stage = "configuring_mcp"
                    await self._update_progress(
                        task_id=task_id,
                        session_id=session_id,
                        status="creating",
                        progress=92,
                        current_step=current_stage,
                        estimated_completion=estimated_completion,
                        message="Configuring MCP services",
                    )
                    # Preserve current behavior: MCP failure is non-fatal.
                    try:
                        await vm_setup_service.configure_mcp_servers(
                            vm_ip=vm_info.public_ip,
                            mongo_connection_string=task_data["mongo_connection_string"],
                            ssh_private_key=private_key,
                        )
                    except Exception as mcp_exc:
                        warning = f"MCP server configuration failed: {mcp_exc}"
                        deployment_warnings.append(warning)
                        logger.warning(
                            "Deployment task %s session %s warning at stage=%s: %s",
                            task_id,
                            session_id,
                            current_stage,
                            warning,
                        )

                    current_stage = "starting_agent"
                    await self._update_progress(
                        task_id=task_id,
                        session_id=session_id,
                        status="creating",
                        progress=97,
                        current_step=current_stage,
                        estimated_completion=estimated_completion,
                        message="Starting AI agent",
                    )
                    try:
                        started = await vm_setup_service.start_agent(
                            vm_ip=vm_info.public_ip,
                            agent_type=agent_type,
                            agent_model=agent_model,
                            ssh_private_key=private_key,
                        )
                        if not started:
                            raise RuntimeError("Agent start failed")
                    except Exception as agent_start_exc:
                        warning = (
                            f"Agent start failed; VM is still available for terminal access: "
                            f"{vm_setup_service.last_error or str(agent_start_exc)}"
                        )
                        deployment_warnings.append(warning)
                        logger.warning(
                            "Deployment task %s session %s warning at stage=%s: %s",
                            task_id,
                            session_id,
                            current_stage,
                            warning,
                        )
                else:
                    warning = "Skipping MCP configuration and agent start because agent installation did not succeed"
                    deployment_warnings.append(warning)
                    logger.warning(
                        "Deployment task %s session %s warning: %s",
                        task_id,
                        session_id,
                        warning,
                    )

            current_stage = "running"
            await self._update_progress(
                task_id=task_id,
                session_id=session_id,
                status="running",
                progress=100,
                current_step=current_stage,
                estimated_completion=None,
                vm_ip=vm_info.public_ip,
                message=(
                    "VM deployment completed with warnings"
                    if deployment_warnings
                    else "VM deployment completed successfully"
                ),
            )
            await self.session_manager.update_session_status(
                session_id,
                "running",
                updated_by="control-worker",
            )
            result_payload = {
                "session_id": session_id,
                "vm_ip": vm_info.public_ip,
                "status": "running",
            }
            if deployment_warnings:
                result_payload["warnings"] = deployment_warnings
            await self.task_queue_service.update_task(
                task_id,
                status="completed",
                progress=100,
                current_step="completed",
                result=result_payload,
            )
            logger.info("Deployment task %s completed for session %s", task_id, session_id)

        except Exception as exc:
            error_message = str(exc)
            retry_eligible = (not retry_disabled) and vm_info is None
            failure_context = {
                "session_id": session_id,
                "failed_stage": current_stage,
                "error_type": type(exc).__name__,
                "error_message": error_message,
                "vm_created": vm_info is not None,
                "vm_ip": vm_info.public_ip if vm_info else None,
                "resource_group": resource_group,
                "retry_eligible": retry_eligible,
                "retry_disabled": retry_disabled,
                "failed_at": datetime.utcnow(),
            }
            logger.error(
                "Deployment task %s failed at stage=%s vm_created=%s retry_eligible=%s: %s",
                task_id,
                current_stage,
                vm_info is not None,
                retry_eligible,
                error_message,
                exc_info=True,
            )

            await self.session_manager.update_session_status(
                session_id,
                "error",
                error_message,
                updated_by="control-worker",
            )
            await self._update_progress(
                task_id=task_id,
                session_id=session_id,
                status="error",
                progress=min(int(task.get("progress", 0)), 99),
                current_step="error",
                estimated_completion=None,
                vm_ip=vm_info.public_ip if vm_info else None,
                error_details={"message": error_message},
                message="VM deployment failed",
            )
            await self.task_queue_service.update_task(
                task_id,
                status="failed",
                current_step="failed",
                error_message=error_message,
                result=failure_context,
            )

            # Best-effort cleanup of partial Azure resources.
            if vm_info is not None:
                try:
                    azure_vm_manager = AzureVMManager()
                    await azure_vm_manager.delete_vm(session_id=session_id, resource_group=resource_group)
                except Exception as cleanup_exc:
                    logger.warning(
                        "Failed to cleanup partial Azure resources for %s: %s",
                        session_id,
                        cleanup_exc,
                    )
            raise

    async def _update_progress(
        self,
        *,
        task_id: str,
        session_id: str,
        status: str,
        progress: int,
        current_step: str,
        message: str,
        estimated_completion: datetime | None,
        vm_ip: str | None = None,
        error_details: Dict[str, Any] | None = None,
    ) -> None:
        """Fan-out a deployment update to task, status tracker, and session doc."""
        await self.task_queue_service.update_task(
            task_id,
            status="running" if status == "creating" else status,
            progress=progress,
            current_step=current_step,
            error_message=error_details.get("message") if error_details else None,
        )
        await self.status_tracking_service.update_status(
            session_id=session_id,
            status=status,
            progress=progress,
            current_step=current_step,
            step_progress=progress,
            estimated_completion=estimated_completion,
            vm_ip=vm_ip,
            error_details=error_details,
            message=message,
        )
        await self.session_manager.update_session(
            session_id,
            {
                "deployment_progress": progress,
                "current_step": current_step,
                "estimated_completion": estimated_completion,
                "vm_ip": vm_ip,
                "error_message": error_details.get("message") if error_details else None,
                "last_status_update": datetime.utcnow(),
            },
            updated_by="control-worker",
        )
