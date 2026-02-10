"""
Unit tests for TerminalWebSocketHandler

This module tests the WebSocket terminal handler functionality including:
- SSH connection establishment
- Bidirectional forwarding between WebSocket and SSH
- Heartbeat monitoring
- Connection cleanup

Requirements: 4.1, 4.2, 4.3, 5.4
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, MagicMock, patch
from services.terminal_websocket_handler import TerminalWebSocketHandler


class TestTerminalWebSocketHandler:
    """Test suite for TerminalWebSocketHandler class"""
    
    def test_handler_initialization(self):
        """Test that handler initializes with correct default values"""
        handler = TerminalWebSocketHandler()
        
        assert handler.heartbeat_interval == 30
        assert handler.ssh_client is None
        assert handler.ssh_channel is None
    
    def test_handler_custom_heartbeat(self):
        """Test that handler accepts custom heartbeat interval"""
        handler = TerminalWebSocketHandler(heartbeat_interval=60)
        
        assert handler.heartbeat_interval == 60
    
    @pytest.mark.asyncio
    async def test_connect_ssh_success(self):
        """Test successful SSH connection establishment"""
        handler = TerminalWebSocketHandler()
        
        # Mock paramiko SSHClient
        with patch('services.terminal_websocket_handler.paramiko.SSHClient') as mock_ssh_class, \
             patch('services.terminal_websocket_handler.paramiko.RSAKey') as mock_rsa_key:
            
            mock_ssh_client = MagicMock()
            mock_ssh_class.return_value = mock_ssh_client
            
            mock_key = MagicMock()
            mock_rsa_key.from_private_key.return_value = mock_key
            
            # Mock the connect method to not raise exceptions
            mock_ssh_client.connect = MagicMock()
            
            # Test connection
            result = await handler._connect_ssh(
                vm_ip="192.168.1.100",
                username="testuser",
                private_key="-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
                port=22,
                timeout=10,
                retries=1
            )
            
            assert result is True
            assert handler.ssh_client is not None
            mock_ssh_client.set_missing_host_key_policy.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_connect_ssh_failure_with_retries(self):
        """Test SSH connection failure with retry logic"""
        handler = TerminalWebSocketHandler()
        
        # Mock paramiko SSHClient to always fail
        with patch('services.terminal_websocket_handler.paramiko.SSHClient') as mock_ssh_class, \
             patch('services.terminal_websocket_handler.paramiko.RSAKey') as mock_rsa_key:
            
            mock_ssh_client = MagicMock()
            mock_ssh_class.return_value = mock_ssh_client
            
            mock_key = MagicMock()
            mock_rsa_key.from_private_key.return_value = mock_key
            
            # Mock the connect method to raise exception
            mock_ssh_client.connect = MagicMock(side_effect=Exception("Connection refused"))
            
            # Test connection with 2 retries
            result = await handler._connect_ssh(
                vm_ip="192.168.1.100",
                username="testuser",
                private_key="-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
                port=22,
                timeout=10,
                retries=2
            )
            
            assert result is False
            # Should have tried 2 times
            assert mock_ssh_client.connect.call_count == 2
    
    @pytest.mark.asyncio
    async def test_forward_to_ssh(self):
        """Test forwarding WebSocket messages to SSH channel"""
        handler = TerminalWebSocketHandler()
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        mock_websocket.receive_text = AsyncMock(side_effect=["ls\n", "pwd\n", Exception("Disconnect")])
        
        # Mock SSH channel
        mock_channel = MagicMock()
        mock_channel.closed = False
        mock_channel.send = MagicMock()
        handler.ssh_channel = mock_channel
        
        # Test forwarding
        try:
            await handler._forward_to_ssh(mock_websocket)
        except Exception:
            pass  # Expected to raise exception on disconnect
        
        # Verify data was sent to SSH channel
        assert mock_channel.send.call_count == 2
        mock_channel.send.assert_any_call("ls\n")
        mock_channel.send.assert_any_call("pwd\n")
    
    @pytest.mark.asyncio
    async def test_forward_from_ssh(self):
        """Test forwarding SSH output to WebSocket"""
        handler = TerminalWebSocketHandler()
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        
        # Mock SSH channel
        mock_channel = MagicMock()
        mock_channel.closed = False
        mock_channel.recv_ready = MagicMock(side_effect=[True, True, False])
        mock_channel.recv = MagicMock(side_effect=[b"output1\n", b"output2\n"])
        mock_channel.exit_status_ready = MagicMock(side_effect=[False, False, True])
        handler.ssh_channel = mock_channel
        
        # Test forwarding
        await handler._forward_from_ssh(mock_websocket)
        
        # Verify data was sent to WebSocket
        assert mock_websocket.send_text.call_count >= 2
        # Check that output was sent
        calls = [call.args[0] for call in mock_websocket.send_text.call_args_list]
        assert "output1\n" in calls
        assert "output2\n" in calls
    
    @pytest.mark.asyncio
    async def test_heartbeat(self):
        """Test heartbeat ping/pong mechanism"""
        handler = TerminalWebSocketHandler(heartbeat_interval=0.1)
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        # Create heartbeat task
        heartbeat_task = asyncio.create_task(handler._heartbeat(mock_websocket))
        
        # Wait for a couple heartbeats
        await asyncio.sleep(0.25)
        
        # Cancel the task
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass
        
        # Verify at least one ping was sent
        assert mock_websocket.send_json.call_count >= 1
        # Check that ping message was sent
        call_args = mock_websocket.send_json.call_args_list[0][0][0]
        assert call_args["type"] == "ping"
        assert "timestamp" in call_args
    
    @pytest.mark.asyncio
    async def test_cleanup(self):
        """Test resource cleanup on disconnect"""
        handler = TerminalWebSocketHandler()
        
        # Mock SSH channel and client
        mock_channel = MagicMock()
        mock_channel.close = MagicMock()
        handler.ssh_channel = mock_channel
        
        mock_client = MagicMock()
        mock_client.close = MagicMock()
        handler.ssh_client = mock_client
        
        # Test cleanup
        await handler._cleanup()
        
        # Verify resources were cleaned up
        mock_channel.close.assert_called_once()
        mock_client.close.assert_called_once()
        assert handler.ssh_channel is None
        assert handler.ssh_client is None
    
    @pytest.mark.asyncio
    async def test_handle_connection_session_not_found(self):
        """Test WebSocket handler when SSH connection fails"""
        handler = TerminalWebSocketHandler()
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        mock_websocket.close = AsyncMock()
        
        # Mock failed SSH connection
        with patch.object(handler, '_connect_ssh', return_value=False):
            await handler.handle_connection(
                websocket=mock_websocket,
                vm_ip="192.168.1.100",
                ssh_username="testuser",
                ssh_private_key="test_key",
                ssh_port=22
            )
        
        # Verify WebSocket was accepted and error message sent
        mock_websocket.accept.assert_called_once()
        mock_websocket.send_text.assert_called()
        mock_websocket.close.assert_called_once()
        
        # Check error message contains SSH connection failure
        error_call = mock_websocket.send_text.call_args_list[0][0][0]
        assert "Failed to connect to VM via SSH" in error_call


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
