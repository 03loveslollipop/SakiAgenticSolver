"""
Terminal WebSocket Handler Service

This module provides WebSocket connection handling for real-time terminal interaction
with VMs via SSH. It bridges WebSocket connections from the frontend to SSH sessions
on the VM using paramiko.

Requirements: 4.1, 4.2, 4.3, 5.4
"""

import asyncio
import logging
import paramiko
import time
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class TerminalWebSocketHandler:
    """
    Handles WebSocket connections for terminal interaction with VMs.
    
    This class:
    - Establishes SSH connections to VMs using paramiko
    - Implements bidirectional forwarding between WebSocket and SSH channel
    - Implements ping/pong heartbeat for connection monitoring
    - Handles connection cleanup on disconnect
    
    Requirements: 4.1, 4.2, 4.3, 5.4
    """
    
    def __init__(self, heartbeat_interval: int = 30):
        """
        Initialize the terminal WebSocket handler.
        
        Args:
            heartbeat_interval: Interval in seconds for ping/pong heartbeat (default: 30)
        """
        self.heartbeat_interval = heartbeat_interval
        self.ssh_client: Optional[paramiko.SSHClient] = None
        self.ssh_channel: Optional[paramiko.Channel] = None
        
    async def handle_connection(
        self,
        websocket: WebSocket,
        vm_ip: str,
        ssh_username: str,
        ssh_private_key: str,
        ssh_port: int = 22
    ):
        """
        Handle WebSocket connection for terminal interaction.
        
        This method:
        1. Accepts the WebSocket connection
        2. Establishes SSH connection to the VM
        3. Creates an interactive shell channel
        4. Starts bidirectional forwarding tasks
        5. Implements heartbeat monitoring
        6. Cleans up resources on disconnect
        
        Args:
            websocket: FastAPI WebSocket connection
            vm_ip: IP address of the VM
            ssh_username: SSH username for VM access
            ssh_private_key: SSH private key for authentication
            ssh_port: SSH port (default: 22)
            
        Requirements: 4.1, 4.2, 4.3, 5.4
        """
        try:
            # Accept WebSocket connection
            await websocket.accept()
            logger.info(f"WebSocket connection accepted for VM {vm_ip}")
            
            # Establish SSH connection
            logger.info(f"Establishing SSH connection to {vm_ip}:{ssh_port}")
            ssh_connected = await self._connect_ssh(
                vm_ip=vm_ip,
                username=ssh_username,
                private_key=ssh_private_key,
                port=ssh_port
            )
            
            if not ssh_connected:
                await websocket.send_text("Error: Failed to connect to VM via SSH\r\n")
                await websocket.close(code=1011, reason="SSH connection failed")
                return
            
            logger.info(f"SSH connection established to {vm_ip}")
            
            # Create interactive shell channel
            self.ssh_channel = self.ssh_client.invoke_shell(
                term='xterm',
                width=80,
                height=24
            )
            self.ssh_channel.settimeout(0.1)  # Non-blocking reads
            
            logger.info("Interactive shell channel created")
            
            # Send welcome message
            await websocket.send_text(f"Connected to {vm_ip}\r\n")
            
            # Create tasks for bidirectional forwarding and heartbeat
            forward_to_ssh_task = asyncio.create_task(
                self._forward_to_ssh(websocket)
            )
            forward_from_ssh_task = asyncio.create_task(
                self._forward_from_ssh(websocket)
            )
            heartbeat_task = asyncio.create_task(
                self._heartbeat(websocket)
            )
            
            # Wait for any task to complete (usually means disconnect)
            done, pending = await asyncio.wait(
                [forward_to_ssh_task, forward_from_ssh_task, heartbeat_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            logger.info(f"WebSocket connection closed for VM {vm_ip}")
            
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for VM {vm_ip}")
        except Exception as e:
            logger.error(f"Error in WebSocket handler: {e}", exc_info=True)
            try:
                await websocket.send_text(f"Error: {str(e)}\r\n")
                await websocket.close(code=1011, reason=str(e))
            except:
                pass
        finally:
            # Clean up resources
            await self._cleanup()
    
    async def _connect_ssh(
        self,
        vm_ip: str,
        username: str,
        private_key: str,
        port: int = 22,
        timeout: int = 10,
        retries: int = 3
    ) -> bool:
        """
        Establish SSH connection to VM with retry logic.
        
        Args:
            vm_ip: IP address of the VM
            username: SSH username
            private_key: SSH private key string
            port: SSH port
            timeout: Connection timeout in seconds
            retries: Number of connection attempts
            
        Returns:
            True if connection successful, False otherwise
        """
        for attempt in range(retries):
            try:
                # Create SSH client
                self.ssh_client = paramiko.SSHClient()
                self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                # Load private key from string
                from io import StringIO
                key_file = StringIO(private_key)
                pkey = paramiko.RSAKey.from_private_key(key_file)
                
                # Connect to VM
                logger.info(f"SSH connection attempt {attempt + 1}/{retries} to {vm_ip}:{port}")
                
                # Run connection in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.ssh_client.connect(
                        hostname=vm_ip,
                        port=port,
                        username=username,
                        pkey=pkey,
                        timeout=timeout,
                        look_for_keys=False,
                        allow_agent=False
                    )
                )
                
                logger.info(f"SSH connection successful to {vm_ip}")
                return True
                
            except Exception as e:
                logger.warning(f"SSH connection attempt {attempt + 1} failed: {e}")
                if self.ssh_client:
                    self.ssh_client.close()
                    self.ssh_client = None
                
                if attempt < retries - 1:
                    # Exponential backoff
                    wait_time = 2 ** attempt
                    logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Failed to connect to VM after {retries} attempts")
                    return False
        
        return False
    
    async def _forward_to_ssh(self, websocket: WebSocket):
        """
        Forward WebSocket messages to SSH channel.
        
        This method receives input from the WebSocket (user typing in terminal)
        and sends it to the SSH channel (VM terminal).
        
        Args:
            websocket: FastAPI WebSocket connection
            
        Requirements: 4.3
        """
        try:
            while True:
                # Receive data from WebSocket
                data = await websocket.receive_text()
                
                if self.ssh_channel and not self.ssh_channel.closed:
                    # Send to SSH channel
                    self.ssh_channel.send(data)
                else:
                    logger.warning("SSH channel is closed, cannot send data")
                    break
                    
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected in forward_to_ssh")
        except Exception as e:
            logger.error(f"Error forwarding to SSH: {e}", exc_info=True)
    
    async def _forward_from_ssh(self, websocket: WebSocket):
        """
        Forward SSH output to WebSocket.
        
        This method receives output from the SSH channel (VM terminal output)
        and sends it to the WebSocket (display in frontend terminal).
        
        Args:
            websocket: FastAPI WebSocket connection
            
        Requirements: 4.2
        """
        try:
            while True:
                if self.ssh_channel and not self.ssh_channel.closed:
                    # Check if data is available
                    if self.ssh_channel.recv_ready():
                        # Receive data from SSH channel
                        data = self.ssh_channel.recv(4096)
                        
                        if data:
                            # Decode and send to WebSocket
                            text = data.decode('utf-8', errors='replace')
                            await websocket.send_text(text)
                    else:
                        # No data available, sleep briefly to avoid busy loop
                        await asyncio.sleep(0.01)
                    
                    # Check if SSH session has ended
                    if self.ssh_channel.exit_status_ready():
                        logger.info("SSH session ended")
                        await websocket.send_text("\r\nSSH session ended\r\n")
                        break
                else:
                    logger.warning("SSH channel is closed")
                    break
                    
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected in forward_from_ssh")
        except Exception as e:
            logger.error(f"Error forwarding from SSH: {e}", exc_info=True)
    
    async def _heartbeat(self, websocket: WebSocket):
        """
        Implement ping/pong heartbeat for connection monitoring.
        
        This method sends periodic ping messages to detect client disconnection.
        If the client doesn't respond, the connection is considered dead.
        
        Args:
            websocket: FastAPI WebSocket connection
            
        Requirements: 5.4
        """
        try:
            while True:
                # Wait for heartbeat interval
                await asyncio.sleep(self.heartbeat_interval)
                
                # Send ping
                try:
                    await websocket.send_json({"type": "ping", "timestamp": time.time()})
                    logger.debug("Heartbeat ping sent")
                except Exception as e:
                    logger.warning(f"Failed to send heartbeat ping: {e}")
                    break
                    
        except asyncio.CancelledError:
            logger.debug("Heartbeat task cancelled")
        except Exception as e:
            logger.error(f"Error in heartbeat: {e}", exc_info=True)
    
    async def _cleanup(self):
        """
        Clean up SSH and WebSocket resources on disconnect.
        
        This method ensures proper cleanup of:
        - SSH channel
        - SSH client connection
        
        Requirements: 5.4
        """
        try:
            # Close SSH channel
            if self.ssh_channel:
                logger.info("Closing SSH channel")
                self.ssh_channel.close()
                self.ssh_channel = None
            
            # Close SSH client
            if self.ssh_client:
                logger.info("Closing SSH client")
                self.ssh_client.close()
                self.ssh_client = None
                
            logger.info("Cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}", exc_info=True)
