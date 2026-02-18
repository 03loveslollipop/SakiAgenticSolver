"""Terminal websocket endpoint mirrored on core service.

This avoids 404s when websocket traffic is routed to the core host.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, WebSocket

from services.terminal_websocket_handler import TerminalWebSocketHandler
from shared.auth import get_websocket_user, is_admin
from shared.services import get_session_manager, get_ssh_key_manager

router = APIRouter(tags=["terminal"])


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

    if not is_admin(current_user):
        owner_user_id = getattr(session, "owner_user_id", None)
        if owner_user_id != current_user.get("user_id"):
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

