# Additional API endpoints for CTF Challenge Automation Platform
# Tasks 8.9-8.22
# IMPORTANT: Routes with specific paths must come before routes with path parameters

from fastapi import APIRouter, HTTPException, status, Response, WebSocket
from models.schemas import SSHConnectionInfo, Writeup
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# Helper functions to get service instances with correct database name
def get_session_manager():
    """Get SessionManager instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.session_manager import SessionManager
    return SessionManager(mongo_client, DATABASE_NAME)


def get_ssh_key_manager():
    """Get SSHKeyManager instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.ssh_key_manager import SSHKeyManager
    return SSHKeyManager(mongo_client, DATABASE_NAME)


def get_writeup_manager():
    """Get WriteupManager instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.writeup_manager import WriteupManager
    return WriteupManager(mongo_client, DATABASE_NAME)


@router.get("/api/sessions/{session_id}/ssh")
async def get_ssh_connection_info(session_id: str):
    """
    Get SSH connection details for a session.
    
    Returns hostname (VM IP), port, and username for SSH access.
    
    Requirements: 4.4, 4.5
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    
    try:
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        if not session.vm_ip:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session {session_id} does not have a VM IP yet"
            )
        
        return SSHConnectionInfo(
            hostname=session.vm_ip,
            port=session.ssh_port,
            username=session.ssh_username
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting SSH info for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SSH connection info: {str(e)}"
        )



@router.get("/api/sessions/{session_id}/ssh-key")
async def get_ssh_public_key(session_id: str):
    """
    Download SSH public key for a session.
    
    Returns the public key file with appropriate headers for download.
    
    Requirements: 4.6, 5.5
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from services.ssh_key_manager import SSHKeyManager
    
    try:
        session_manager = get_session_manager()
        ssh_key_manager = get_ssh_key_manager()
        
        # Verify session exists
        session = await session_manager.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        # Get public key
        public_key = await ssh_key_manager.get_public_key(session_id)
        if not public_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"SSH key not found for session {session_id}"
            )
        
        # Return as downloadable file
        return Response(
            content=public_key,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=ctf_session_{session_id}.pub"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting SSH key for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SSH key: {str(e)}"
        )



# Helper function for reading files via SSH
async def _read_file_via_ssh(session_id: str, file_path: str) -> str:
    """Helper function to read a file from VM via SSH"""
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from services.ssh_key_manager import SSHKeyManager
    import paramiko
    from io import StringIO
    
    session_manager = get_session_manager()
    ssh_key_manager = get_ssh_key_manager()
    
    # Get session
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    if not session.vm_ip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} does not have a VM IP yet"
        )
    
    # Get private key
    private_key = await ssh_key_manager.get_private_key(session_id)
    if not private_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SSH key not found for session {session_id}"
        )
    
    # Connect via SSH and read file
    ssh_client = paramiko.SSHClient()
    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = paramiko.RSAKey.from_private_key(StringIO(private_key))
    
    ssh_client.connect(
        hostname=session.vm_ip,
        port=session.ssh_port,
        username=session.ssh_username,
        pkey=pkey,
        timeout=10
    )
    
    try:
        sftp = ssh_client.open_sftp()
        try:
            with sftp.file(file_path, "r") as f:
                content = f.read().decode('utf-8')
            return content
        finally:
            sftp.close()
    finally:
        ssh_client.close()


@router.get("/api/sessions/{session_id}/agent-md")
async def get_agent_md(session_id: str):
    """
    Read AGENT.md file content via SSH.
    
    Requirements: 4.7, 5.6
    """
    try:
        content = await _read_file_via_ssh(session_id, "/home/ctfuser/AGENT.md")
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading AGENT.md for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read AGENT.md: {str(e)}"
        )


@router.put("/api/sessions/{session_id}/agent-md")
async def update_agent_md(session_id: str, content: dict):
    """
    Update AGENT.md content via SSH.
    
    Expects JSON body with "content" field containing the new AGENT.md content.
    
    Requirements: 4.9, 4.10, 5.7
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from services.ssh_key_manager import SSHKeyManager
    import paramiko
    from io import StringIO
    
    try:
        if "content" not in content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request body must contain 'content' field"
            )
        
        new_content = content["content"]
        
        session_manager = get_session_manager()
        ssh_key_manager = get_ssh_key_manager()
        
        # Get session
        session = await session_manager.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        if not session.vm_ip:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session {session_id} does not have a VM IP yet"
            )
        
        # Get private key
        private_key = await ssh_key_manager.get_private_key(session_id)
        if not private_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"SSH key not found for session {session_id}"
            )
        
        # Connect via SSH and write file
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        pkey = paramiko.RSAKey.from_private_key(StringIO(private_key))
        
        ssh_client.connect(
            hostname=session.vm_ip,
            port=session.ssh_port,
            username=session.ssh_username,
            pkey=pkey,
            timeout=10
        )
        
        try:
            sftp = ssh_client.open_sftp()
            try:
                with sftp.file("/home/ctfuser/AGENT.md", "w") as f:
                    f.write(new_content)
                logger.info(f"Updated AGENT.md for session {session_id}")
            finally:
                sftp.close()
            
            # Notify agent of configuration change (send SIGHUP to kiro process)
            try:
                stdin, stdout, stderr = ssh_client.exec_command(
                    "pkill -HUP -f 'kiro start' || true"
                )
                stdout.channel.recv_exit_status()
                logger.info(f"Sent SIGHUP to agent for session {session_id}")
            except Exception as e:
                logger.warning(f"Failed to notify agent: {e}")
            
        finally:
            ssh_client.close()
        
        return {"message": "AGENT.md updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating AGENT.md for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update AGENT.md: {str(e)}"
        )


@router.get("/api/sessions/{session_id}/tools-md")
async def get_tools_md(session_id: str):
    """Read TOOLS.md file content via SSH. Requirements: 4.11, 5.8"""
    try:
        content = await _read_file_via_ssh(session_id, "/home/ctfuser/TOOLS.md")
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading TOOLS.md for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read TOOLS.md: {str(e)}"
        )


@router.get("/api/sessions/{session_id}/base-prompt")
async def get_base_prompt(session_id: str):
    """Read BASE_PROMPT.md file content via SSH (read-only). Requirements: 11.1"""
    try:
        content = await _read_file_via_ssh(session_id, "/home/ctfuser/BASE_PROMPT.md")
        return {"content": content, "read_only": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading BASE_PROMPT.md for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read BASE_PROMPT.md: {str(e)}"
        )


@router.get("/api/sessions/{session_id}/changelog")
async def get_changelog(session_id: str):
    """Read changelog.md file content via SSH. Requirements: 11.2, 11.5"""
    try:
        content = await _read_file_via_ssh(session_id, "/home/ctfuser/changelog.md")
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading changelog.md for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read changelog.md: {str(e)}"
        )


@router.get("/api/sessions/{session_id}/discoveries")
async def get_discoveries(session_id: str):
    """Read discoveries.md file content via SSH. Requirements: 11.3, 11.6"""
    try:
        content = await _read_file_via_ssh(session_id, "/home/ctfuser/discoveries.md")
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading discoveries.md for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read discoveries.md: {str(e)}"
        )


@router.post("/api/sessions/{session_id}/writeup", status_code=status.HTTP_201_CREATED)
async def upload_writeup(session_id: str, writeup_data: dict):
    """
    Upload writeup.md content to MongoDB.
    
    Expects JSON body with "content" field containing the writeup content.
    Optionally accepts "challenge_type" field.
    
    Requirements: 11.7, 11.8
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from services.writeup_manager import WriteupManager
    
    try:
        if "content" not in writeup_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request body must contain 'content' field"
            )
        
        content = writeup_data["content"]
        challenge_type = writeup_data.get("challenge_type")
        
        session_manager = get_session_manager()
        writeup_manager = get_writeup_manager()
        
        # Get session to extract metadata
        session = await session_manager.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        # Create writeup
        writeup = await writeup_manager.create_writeup(
            session_id=session_id,
            challenge_urls=session.challenge_urls,
            content=content,
            agent_type=session.agent_type,
            agent_model=session.agent_model,
            challenge_type=challenge_type
        )
        
        logger.info(f"Writeup created for session {session_id}")
        
        return {
            "message": "Writeup uploaded successfully",
            "writeup_id": writeup.id,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading writeup for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload writeup: {str(e)}"
        )


# IMPORTANT: /api/writeups/search must come BEFORE /api/writeups/{session_id}
# because FastAPI matches routes in order and "search" would be treated as a session_id

@router.get("/api/writeups/search")
async def search_writeups(q: Optional[str] = None, challenge_type: Optional[str] = None):
    """
    Search writeups by keywords or challenge type.
    
    Query parameters:
    - q: Search query (keywords to search in writeup content)
    - challenge_type: Filter by challenge type (pwn, crypto, reversing, web, forensics)
    
    Requirements: 12.3
    """
    from database.mongodb import mongo_client
    from services.writeup_manager import WriteupManager
    
    try:
        if not q and not challenge_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of 'q' or 'challenge_type' parameter is required"
            )
        
        writeup_manager = get_writeup_manager()
        writeups = await writeup_manager.search_writeups(
            query=q,
            challenge_type=challenge_type
        )
        
        # Convert to response format
        writeup_list = [
            {
                "id": w.id,
                "session_id": w.session_id,
                "challenge_urls": w.challenge_urls,
                "challenge_type": w.challenge_type,
                "completion_timestamp": w.completion_timestamp.isoformat(),
                "agent_type": w.agent_type,
                "agent_model": w.agent_model,
                "content_preview": w.content[:200] + "..." if len(w.content) > 200 else w.content
            }
            for w in writeups
        ]
        
        return {
            "writeups": writeup_list,
            "query": q,
            "challenge_type": challenge_type,
            "count": len(writeup_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching writeups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search writeups: {str(e)}"
        )


@router.get("/api/writeups")
async def list_writeups(skip: int = 0, limit: int = 20):
    """
    List all writeups with pagination.
    
    Query parameters:
    - skip: Number of writeups to skip (default: 0)
    - limit: Maximum number of writeups to return (default: 20, max: 100)
    
    Requirements: 11.11
    """
    from database.mongodb import mongo_client
    from services.writeup_manager import WriteupManager
    
    try:
        # Validate pagination parameters
        if skip < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="skip parameter must be non-negative"
            )
        
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="limit parameter must be between 1 and 100"
            )
        
        writeup_manager = get_writeup_manager()
        writeups = await writeup_manager.list_writeups(skip=skip, limit=limit)
        
        # Convert to response format
        writeup_list = [
            {
                "id": w.id,
                "session_id": w.session_id,
                "challenge_urls": w.challenge_urls,
                "challenge_type": w.challenge_type,
                "completion_timestamp": w.completion_timestamp.isoformat(),
                "agent_type": w.agent_type,
                "agent_model": w.agent_model,
                "content_preview": w.content[:200] + "..." if len(w.content) > 200 else w.content
            }
            for w in writeups
        ]
        
        return {
            "writeups": writeup_list,
            "skip": skip,
            "limit": limit,
            "count": len(writeup_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing writeups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list writeups: {str(e)}"
        )


@router.get("/api/writeups/{session_id}")
async def get_writeup_by_session(session_id: str):
    """
    Get writeup by session ID.
    
    Requirements: 11.10
    """
    from database.mongodb import mongo_client
    from services.writeup_manager import WriteupManager
    
    try:
        writeup_manager = get_writeup_manager()
        writeup = await writeup_manager.get_writeup(session_id)
        
        if not writeup:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Writeup not found for session {session_id}"
            )
        
        return {
            "id": writeup.id,
            "session_id": writeup.session_id,
            "challenge_urls": writeup.challenge_urls,
            "challenge_type": writeup.challenge_type,
            "content": writeup.content,
            "completion_timestamp": writeup.completion_timestamp.isoformat(),
            "agent_type": writeup.agent_type,
            "agent_model": writeup.agent_model
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting writeup for session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get writeup: {str(e)}"
        )


@router.websocket("/api/sessions/{session_id}/terminal")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time terminal interaction with VM.
    
    This endpoint:
    1. Accepts WebSocket connection
    2. Retrieves session and SSH credentials
    3. Establishes SSH connection to VM
    4. Forwards bidirectional communication between WebSocket and SSH
    5. Implements heartbeat monitoring
    6. Cleans up resources on disconnect
    
    Requirements: 4.1, 4.2, 4.3, 5.4
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from services.ssh_key_manager import SSHKeyManager
    from services.terminal_websocket_handler import TerminalWebSocketHandler
    
    try:
        # Get session details
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        if not session:
            await websocket.accept()
            await websocket.send_text(f"Error: Session {session_id} not found\r\n")
            await websocket.close(code=1008, reason="Session not found")
            return
        
        if not session.vm_ip:
            await websocket.accept()
            await websocket.send_text(f"Error: Session {session_id} does not have a VM IP yet\r\n")
            await websocket.close(code=1008, reason="VM not ready")
            return
        
        # Get SSH private key
        ssh_key_manager = get_ssh_key_manager()
        private_key = await ssh_key_manager.get_private_key(session_id)
        
        if not private_key:
            await websocket.accept()
            await websocket.send_text(f"Error: SSH key not found for session {session_id}\r\n")
            await websocket.close(code=1008, reason="SSH key not found")
            return
        
        # Create terminal handler and handle connection
        handler = TerminalWebSocketHandler(heartbeat_interval=30)
        await handler.handle_connection(
            websocket=websocket,
            vm_ip=session.vm_ip,
            ssh_username=session.ssh_username,
            ssh_private_key=private_key,
            ssh_port=session.ssh_port
        )
        
    except Exception as e:
        logger.error(f"Error in terminal WebSocket for session {session_id}: {e}", exc_info=True)
        try:
            await websocket.accept()
            await websocket.send_text(f"Error: {str(e)}\r\n")
            await websocket.close(code=1011, reason=str(e))
        except:
            pass
