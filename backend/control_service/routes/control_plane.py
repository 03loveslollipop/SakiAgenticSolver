"""Control-plane endpoints for sessions, tasks, orchestration, and SSH operations."""

from __future__ import annotations

from datetime import datetime, timedelta
from io import StringIO
import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, WebSocket, status
import paramiko

from models.schemas import (
    AsyncSessionCreateResponse,
    DeploymentStatusResponse,
    Session,
    SessionListResponse,
    SessionResponse,
    SSHConnectionInfo,
    TaskStatusResponse,
    VMConfig,
    VMCreationRequest,
)
from services.azure_vm_manager import AzureVMManager
from services.terminal_websocket_handler import TerminalWebSocketHandler
from services.vm_setup_service import VMSetupService
from shared.auth import get_current_user, get_websocket_user, is_admin
from shared.services import (
    get_session_manager,
    get_ssh_key_manager,
    get_status_tracking_service,
    get_task_queue_service,
    get_writeup_manager,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["control-plane"])


def _format_remaining_time(estimated_completion: datetime | None) -> str | None:
    if not estimated_completion:
        return None

    delta = estimated_completion - datetime.utcnow()
    total_seconds = int(max(0, delta.total_seconds()))
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)

    if hours > 0:
        return f"PT{hours}H{minutes}M{seconds}S"
    if minutes > 0:
        return f"PT{minutes}M{seconds}S"
    return f"PT{seconds}S"


def _as_setup_mode(value: object) -> str:
    if value in {"manual", "gemini"}:
        return str(value)
    return "manual"


def _as_optional_str(value: object) -> str | None:
    return value if isinstance(value, str) else None


def _as_optional_int(value: object, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    return default


def _as_optional_datetime(value: object) -> datetime | None:
    return value if isinstance(value, datetime) else None


def _assert_session_access(session: Session, current_user: dict) -> None:
    if is_admin(current_user):
        return

    owner_user_id = getattr(session, "owner_user_id", None)
    if owner_user_id != current_user.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session",
        )


def _to_session_response(session: Session, deploy_agent_default: bool = True) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        vm_size=session.vm_size,
        agent_type=session.agent_type,
        agent_model=session.agent_model,
        setup_mode=_as_setup_mode(getattr(session, "setup_mode", "manual")),
        deploy_agent=bool(getattr(session, "deploy_agent", deploy_agent_default)),
        challenge_urls=session.challenge_urls,
        instructions=session.instructions,
        created_at=session.created_at,
        status=session.status,
        vm_ip=session.vm_ip,
        ssh_username=session.ssh_username,
        ssh_port=session.ssh_port,
        resource_group=session.resource_group,
        owner_user_id=getattr(session, "owner_user_id", None),
        created_by_email=getattr(session, "created_by_email", None),
        last_updated_by=getattr(session, "last_updated_by", None),
        error_message=session.error_message,
        task_id=_as_optional_str(getattr(session, "task_id", None)),
        deployment_progress=_as_optional_int(getattr(session, "deployment_progress", 0), 0),
        current_step=_as_optional_str(getattr(session, "current_step", None)),
        estimated_completion=_as_optional_datetime(getattr(session, "estimated_completion", None)),
        last_status_update=_as_optional_datetime(getattr(session, "last_status_update", None)),
    )


async def _get_authorized_session(session_id: str, current_user: dict) -> Session:
    session_manager = get_session_manager()
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    _assert_session_access(session, current_user)
    return session


async def _read_file_via_ssh(session: Session, file_path: str) -> str:
    ssh_key_manager = get_ssh_key_manager()

    if not session.vm_ip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session.id} does not have a VM IP yet",
        )

    private_key = await ssh_key_manager.get_private_key(session.id)
    if not private_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SSH key not found for session {session.id}",
        )

    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = paramiko.RSAKey.from_private_key(StringIO(private_key))

    ssh_client.connect(
        hostname=session.vm_ip,
        port=session.ssh_port,
        username=session.ssh_username,
        pkey=pkey,
        timeout=10,
    )

    try:
        sftp = ssh_client.open_sftp()
        try:
            with sftp.file(file_path, "r") as file_pointer:
                return file_pointer.read().decode("utf-8")
        finally:
            sftp.close()
    finally:
        ssh_client.close()


@router.post("/api/sessions/async", status_code=status.HTTP_202_ACCEPTED)
async def create_session_async(
    request: VMCreationRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a VM session asynchronously and return task/session identifiers."""
    session_manager = get_session_manager()
    ssh_key_manager = get_ssh_key_manager()
    task_queue_service = get_task_queue_service()
    status_tracking_service = get_status_tracking_service()

    session_id = str(uuid.uuid4())
    resource_group = os.getenv("AZURE_RESOURCE_GROUP", "ctf-platform-rg")
    deploy_agent = True if getattr(request, "deploy_agent", None) is None else bool(request.deploy_agent)
    estimated_completion = datetime.utcnow() + timedelta(minutes=12)

    key_pair_created = False

    try:
        key_pair = await ssh_key_manager.generate_key_pair(session_id)
        key_pair_created = True
        public_key = key_pair["public_key"]

        session_data = {
            "_id": session_id,
            "vm_size": request.vm_size,
            "agent_type": request.agent_type,
            "agent_model": request.agent_model,
            "setup_mode": getattr(request, "setup_mode", "manual"),
            "deploy_agent": deploy_agent,
            "challenge_urls": request.challenge_urls,
            "instructions": request.instructions,
            "status": "creating",
            "resource_group": resource_group,
            "ssh_username": "ctfuser",
            "ssh_port": 22,
            "deployment_progress": 0,
            "current_step": "queued",
            "estimated_completion": estimated_completion,
            "last_status_update": datetime.utcnow(),
            "owner_user_id": current_user["user_id"],
            "created_by_email": current_user["email"],
            "last_updated_by": current_user["email"],
        }

        await session_manager.create_session(session_data)

        task_payload = {
            "session_id": session_id,
            "vm_size": request.vm_size,
            "agent_type": request.agent_type,
            "agent_model": request.agent_model,
            "challenge_urls": request.challenge_urls,
            "instructions": request.instructions,
            "resource_group": resource_group,
            "setup_mode": getattr(request, "setup_mode", "manual"),
            "deploy_agent": deploy_agent,
            "ssh_public_key": public_key,
            "mongo_connection_string": os.getenv("MONGODB_URL", "mongodb://localhost:27017"),
            "owner_user_id": current_user["user_id"],
            "disable_retry": True,
        }

        task = await task_queue_service.enqueue_task(
            task_type="vm_deployment",
            session_id=session_id,
            task_data=task_payload,
            max_retries=0,
            priority=100,
            estimated_completion=estimated_completion,
        )
        task_id = task["task_id"]

        await session_manager.update_session(
            session_id,
            {"task_id": task_id},
            updated_by=current_user["email"],
        )
        await status_tracking_service.initialize_status(
            session_id=session_id,
            task_id=task_id,
            status="queued",
            progress=0,
            current_step="queued",
            estimated_completion=estimated_completion,
        )

        return AsyncSessionCreateResponse(
            task_id=task_id,
            session_id=session_id,
            status="queued",
            estimated_completion_time=estimated_completion,
            status_url=f"/api/tasks/{task_id}/status",
        )
    except Exception as exc:
        logger.error("Failed to create async session %s: %s", session_id, exc, exc_info=True)
        if key_pair_created:
            try:
                await ssh_key_manager.delete_key_pair(session_id)
            except Exception as cleanup_exc:
                logger.warning("Failed to cleanup SSH keys for %s: %s", session_id, cleanup_exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue session deployment: {str(exc)}",
        )


@router.get("/api/tasks/{task_id}/status")
async def get_task_status(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get current background task status and progress."""
    task_queue_service = get_task_queue_service()
    session_manager = get_session_manager()

    task = await task_queue_service.get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")

    if not is_admin(current_user):
        session = await session_manager.get_session(task["session_id"])
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {task['session_id']} not found",
            )
        _assert_session_access(session, current_user)

    return TaskStatusResponse(
        task_id=task["task_id"],
        session_id=task["session_id"],
        status=task["status"],
        progress=int(task.get("progress", 0)),
        current_step=task.get("current_step"),
        error_message=task.get("error_message"),
        result=task.get("result"),
        retry_count=int(task.get("retry_count", 0)),
        max_retries=int(task.get("max_retries", 0)),
        started_at=task.get("started_at"),
        updated_at=task.get("updated_at"),
        completed_at=task.get("completed_at"),
        estimated_remaining_time=_format_remaining_time(task.get("estimated_completion")),
    )


@router.get("/api/tasks")
async def list_tasks(limit: int = 100, current_user: dict = Depends(get_current_user)):
    """List tasks, owner-scoped for non-admin users."""
    if limit < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be greater than 0",
        )

    task_queue_service = get_task_queue_service()
    session_manager = get_session_manager()

    if is_admin(current_user):
        tasks = await task_queue_service.list_tasks(limit=min(limit, 500))
        return {"tasks": tasks, "count": len(tasks)}

    sessions = await session_manager.list_sessions(owner_user_id=current_user["user_id"])
    session_ids = [session.id for session in sessions]
    if not session_ids:
        return {"tasks": [], "count": 0}

    tasks = await task_queue_service.list_tasks(
        filters={"session_id": {"$in": session_ids}},
        limit=min(limit, 500),
    )
    return {"tasks": tasks, "count": len(tasks)}


@router.get("/api/sessions/{session_id}/status")
async def get_session_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Polling endpoint for deployment status updates during async VM creation."""
    status_tracking_service = get_status_tracking_service()

    session = await _get_authorized_session(session_id, current_user)
    status_doc = await status_tracking_service.get_status(session_id)

    if status_doc:
        return DeploymentStatusResponse(
            session_id=session_id,
            task_id=status_doc.get("task_id"),
            status=status_doc.get("status", session.status),
            progress=int(status_doc.get("progress", 0)),
            current_step=status_doc.get("current_step"),
            vm_ip=status_doc.get("vm_ip") or session.vm_ip,
            estimated_completion=status_doc.get("estimated_completion"),
            estimated_remaining_time=_format_remaining_time(status_doc.get("estimated_completion")),
            error_details=status_doc.get("error_details"),
            last_updated=status_doc.get("last_updated"),
        )

    return DeploymentStatusResponse(
        session_id=session_id,
        task_id=getattr(session, "task_id", None),
        status=session.status,
        progress=int(getattr(session, "deployment_progress", 0) or 0),
        current_step=getattr(session, "current_step", None),
        vm_ip=session.vm_ip,
        estimated_completion=getattr(session, "estimated_completion", None),
        estimated_remaining_time=_format_remaining_time(getattr(session, "estimated_completion", None)),
        error_details={"message": session.error_message} if session.error_message else None,
        last_updated=getattr(session, "last_status_update", None),
    )


@router.post("/api/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(request: VMCreationRequest, current_user: dict = Depends(get_current_user)):
    """Synchronous VM creation endpoint retained for backward compatibility."""
    session_manager = get_session_manager()
    ssh_key_manager = get_ssh_key_manager()

    session_id: Optional[str] = None

    try:
        session_id = str(uuid.uuid4())
        resource_group = os.getenv("AZURE_RESOURCE_GROUP", "ctf-platform-rg")
        deploy_agent = True if getattr(request, "deploy_agent", None) is None else bool(request.deploy_agent)

        key_pair = await ssh_key_manager.generate_key_pair(session_id)
        public_key = key_pair["public_key"]
        vm_config = VMConfig.from_size(request.vm_size)

        session_data = {
            "_id": session_id,
            "vm_size": request.vm_size,
            "agent_type": request.agent_type,
            "agent_model": request.agent_model,
            "setup_mode": getattr(request, "setup_mode", "manual"),
            "deploy_agent": deploy_agent,
            "challenge_urls": request.challenge_urls,
            "instructions": request.instructions,
            "status": "creating",
            "resource_group": resource_group,
            "ssh_username": "ctfuser",
            "ssh_port": 22,
            "deployment_progress": 0,
            "current_step": "creating_vm",
            "last_status_update": datetime.utcnow(),
            "owner_user_id": current_user["user_id"],
            "created_by_email": current_user["email"],
            "last_updated_by": current_user["email"],
        }

        session = await session_manager.create_session(session_data)

        azure_vm_manager = AzureVMManager()
        vm_info = await azure_vm_manager.create_vm(
            session_id=session_id,
            vm_size=vm_config.azure_vm_size,
            ssh_public_key=public_key,
            resource_group=resource_group,
        )
        await session_manager.update_session(
            session_id,
            {"vm_ip": vm_info.public_ip},
            updated_by="control-worker",
        )

        vm_setup_service = VMSetupService()
        private_key = await ssh_key_manager.get_private_key(session_id)
        setup_success = await vm_setup_service.execute_setup_script(
            vm_ip=vm_info.public_ip,
            ssh_private_key=private_key,
        )
        if not setup_success:
            raise RuntimeError("Setup script execution failed")

        if deploy_agent:
            agent_success = await vm_setup_service.install_agent(
                vm_ip=vm_info.public_ip,
                agent_type=request.agent_type,
                agent_model=request.agent_model,
                ssh_private_key=private_key,
            )
            if not agent_success:
                raise RuntimeError("Agent installation failed")

        download_success = await vm_setup_service.download_challenge_files(
            vm_ip=vm_info.public_ip,
            challenge_urls=request.challenge_urls,
            ssh_private_key=private_key,
        )
        if not download_success:
            raise RuntimeError("Challenge file download failed")

        config_success = await vm_setup_service.create_config_files(
            vm_ip=vm_info.public_ip,
            instructions=request.instructions,
            ssh_private_key=private_key,
        )
        if not config_success:
            raise RuntimeError("Configuration file creation failed")

        if deploy_agent:
            bootstrap_success = await vm_setup_service.write_agent_bootstrap_script(
                vm_ip=vm_info.public_ip,
                agent_type=request.agent_type,
                agent_model=request.agent_model,
                ssh_private_key=private_key,
            )
            if not bootstrap_success:
                logger.warning("Agent bootstrap script creation failed for %s", session_id)

            mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
            await vm_setup_service.configure_mcp_servers(
                vm_ip=vm_info.public_ip,
                mongo_connection_string=mongo_url,
                ssh_private_key=private_key,
            )

            started = await vm_setup_service.start_agent(
                vm_ip=vm_info.public_ip,
                ssh_private_key=private_key,
            )
            if not started:
                raise RuntimeError("Agent start failed")

        updated_session = await session_manager.update_session_status(
            session_id,
            "running",
            updated_by="control-worker",
        )
        if not updated_session:
            raise RuntimeError(f"Failed to update session status for {session_id}")

        return _to_session_response(updated_session, deploy_agent_default=deploy_agent)

    except Exception as exc:
        logger.error("Failed to create VM session: %s", exc, exc_info=True)
        if session_id:
            try:
                await session_manager.update_session_status(
                    session_id,
                    "error",
                    str(exc),
                    updated_by="control-worker",
                )
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create VM session: {str(exc)}",
        )


@router.get("/api/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """List sessions, owner-scoped for non-admin users."""
    session_manager = get_session_manager()
    owner_filter = None if is_admin(current_user) else current_user["user_id"]
    sessions = await session_manager.list_sessions(owner_user_id=owner_filter)
    return SessionListResponse(sessions=[_to_session_response(session) for session in sessions])


@router.get("/api/sessions/{session_id}")
async def get_session_details(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single session by ID with owner/admin access enforcement."""
    session = await _get_authorized_session(session_id, current_user)
    return _to_session_response(session)


@router.delete("/api/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Delete VM resources and session metadata."""
    session_manager = get_session_manager()
    ssh_key_manager = get_ssh_key_manager()

    session = await _get_authorized_session(session_id, current_user)
    deletion_errors: list[str] = []

    try:
        azure_vm_manager = AzureVMManager()
        await azure_vm_manager.delete_vm(
            session_id=session_id,
            resource_group=session.resource_group,
        )
    except Exception as exc:
        logger.error("Error deleting Azure VM for session %s: %s", session_id, exc)
        deletion_errors.append(f"Failed to delete Azure VM: {str(exc)}")

    try:
        await ssh_key_manager.delete_key_pair(session_id)
    except Exception as exc:
        logger.error("Error deleting SSH key for session %s: %s", session_id, exc)
        deletion_errors.append(f"Failed to delete SSH key pair: {str(exc)}")

    try:
        owner_filter = None if is_admin(current_user) else current_user["user_id"]
        await session_manager.delete_session(session_id, owner_user_id=owner_filter)
    except Exception as exc:
        logger.error("Error deleting session document for %s: %s", session_id, exc)
        deletion_errors.append(f"Failed to delete session document: {str(exc)}")

    if deletion_errors:
        return {
            "message": f"Session {session_id} deleted with some errors",
            "session_id": session_id,
            "status": "partial_success",
            "errors": deletion_errors,
        }

    return {
        "message": f"Session {session_id} deleted successfully",
        "session_id": session_id,
        "status": "success",
    }


@router.get("/api/sessions/{session_id}/ssh")
async def get_ssh_connection_info(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await _get_authorized_session(session_id, current_user)
    if not session.vm_ip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} does not have a VM IP yet",
        )

    return SSHConnectionInfo(hostname=session.vm_ip, port=session.ssh_port, username=session.ssh_username)


@router.get("/api/sessions/{session_id}/ssh-key")
async def get_ssh_public_key(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await _get_authorized_session(session_id, current_user)
    ssh_key_manager = get_ssh_key_manager()

    public_key = await ssh_key_manager.get_public_key(session.id)
    if not public_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SSH key not found for session {session_id}",
        )

    return Response(
        content=public_key,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=ctf_session_{session_id}.pub"},
    )


@router.get("/api/sessions/{session_id}/agent-md")
async def get_agent_md(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await _get_authorized_session(session_id, current_user)
    content = await _read_file_via_ssh(session, "/home/ctfuser/AGENT.md")
    return {"content": content}


@router.put("/api/sessions/{session_id}/agent-md")
async def update_agent_md(
    session_id: str,
    content: dict,
    current_user: dict = Depends(get_current_user),
):
    if "content" not in content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must contain 'content' field",
        )

    session = await _get_authorized_session(session_id, current_user)
    if not session.vm_ip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} does not have a VM IP yet",
        )

    ssh_key_manager = get_ssh_key_manager()
    private_key = await ssh_key_manager.get_private_key(session_id)
    if not private_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SSH key not found for session {session_id}",
        )

    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = paramiko.RSAKey.from_private_key(StringIO(private_key))
    ssh_client.connect(
        hostname=session.vm_ip,
        port=session.ssh_port,
        username=session.ssh_username,
        pkey=pkey,
        timeout=10,
    )

    try:
        sftp = ssh_client.open_sftp()
        try:
            with sftp.file("/home/ctfuser/AGENT.md", "w") as file_pointer:
                file_pointer.write(content["content"])
        finally:
            sftp.close()

        try:
            stdin, stdout, stderr = ssh_client.exec_command("pkill -HUP -f 'kiro start' || true")
            stdout.channel.recv_exit_status()
        except Exception as exc:
            logger.warning("Failed to notify agent after AGENT.md update: %s", exc)
    finally:
        ssh_client.close()

    session_manager = get_session_manager()
    await session_manager.update_session(
        session_id,
        {"last_status_update": datetime.utcnow()},
        updated_by=current_user["email"],
    )
    return {"message": "AGENT.md updated successfully"}


@router.get("/api/sessions/{session_id}/tools-md")
async def get_tools_md(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await _get_authorized_session(session_id, current_user)
    content = await _read_file_via_ssh(session, "/home/ctfuser/TOOLS.md")
    return {"content": content}


@router.get("/api/sessions/{session_id}/base-prompt")
async def get_base_prompt(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await _get_authorized_session(session_id, current_user)
    content = await _read_file_via_ssh(session, "/home/ctfuser/BASE_PROMPT.md")
    return {"content": content, "read_only": True}


@router.get("/api/sessions/{session_id}/changelog")
async def get_changelog(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await _get_authorized_session(session_id, current_user)
    content = await _read_file_via_ssh(session, "/home/ctfuser/changelog.md")
    return {"content": content}


@router.get("/api/sessions/{session_id}/discoveries")
async def get_discoveries(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await _get_authorized_session(session_id, current_user)
    content = await _read_file_via_ssh(session, "/home/ctfuser/discoveries.md")
    return {"content": content}


@router.post("/api/sessions/{session_id}/writeup", status_code=status.HTTP_201_CREATED)
async def upload_writeup(
    session_id: str,
    writeup_data: dict,
    current_user: dict = Depends(get_current_user),
):
    if "content" not in writeup_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must contain 'content' field",
        )

    session = await _get_authorized_session(session_id, current_user)
    writeup_manager = get_writeup_manager()

    writeup = await writeup_manager.create_writeup(
        session_id=session_id,
        challenge_urls=session.challenge_urls,
        content=writeup_data["content"],
        agent_type=session.agent_type,
        agent_model=session.agent_model,
        challenge_type=writeup_data.get("challenge_type"),
    )

    return {
        "message": "Writeup uploaded successfully",
        "writeup_id": writeup.id,
        "session_id": session_id,
    }


@router.websocket("/api/sessions/{session_id}/terminal")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    current_user = get_websocket_user(websocket)
    if not current_user:
        await websocket.accept()
        await websocket.send_text("Error: Unauthorized\r\n")
        await websocket.close(code=1008, reason="Unauthorized")
        return

    session_manager = get_session_manager()
    ssh_key_manager = get_ssh_key_manager()

    session = await session_manager.get_session(session_id)
    if not session:
        await websocket.accept()
        await websocket.send_text(f"Error: Session {session_id} not found\r\n")
        await websocket.close(code=1008, reason="Session not found")
        return

    try:
        _assert_session_access(session, current_user)
    except HTTPException:
        await websocket.accept()
        await websocket.send_text("Error: Forbidden\r\n")
        await websocket.close(code=1008, reason="Forbidden")
        return

    if not session.vm_ip:
        await websocket.accept()
        await websocket.send_text(f"Error: Session {session_id} does not have a VM IP yet\r\n")
        await websocket.close(code=1008, reason="VM not ready")
        return

    private_key = await ssh_key_manager.get_private_key(session_id)
    if not private_key:
        await websocket.accept()
        await websocket.send_text(f"Error: SSH key not found for session {session_id}\r\n")
        await websocket.close(code=1008, reason="SSH key not found")
        return

    handler = TerminalWebSocketHandler(heartbeat_interval=30)
    await handler.handle_connection(
        websocket=websocket,
        vm_ip=session.vm_ip,
        ssh_username=session.ssh_username,
        ssh_private_key=private_key,
        ssh_port=session.ssh_port,
    )
