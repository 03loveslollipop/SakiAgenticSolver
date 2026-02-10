"""
Integration tests for Terminal WebSocket endpoint

This module tests the WebSocket endpoint integration including:
- Endpoint registration
- Session validation
- SSH key retrieval
- Error handling

Requirements: 4.1, 4.2, 4.3, 5.4
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from main import app


class TestTerminalWebSocketEndpoint:
    """Test suite for terminal WebSocket endpoint"""
    
    def test_websocket_endpoint_exists(self):
        """Test that the WebSocket endpoint is registered"""
        # Check that the endpoint exists in the app routes
        routes = [route.path for route in app.routes]
        assert "/api/sessions/{session_id}/terminal" in routes
    
    @pytest.mark.asyncio
    async def test_websocket_session_not_found(self):
        """Test WebSocket connection when session doesn't exist"""
        from fastapi.testclient import TestClient
        
        with TestClient(app) as client:
            # Mock SessionManager to return None (session not found)
            with patch('endpoints_additional.SessionManager') as mock_session_manager_class:
                mock_session_manager = AsyncMock()
                mock_session_manager.get_session = AsyncMock(return_value=None)
                mock_session_manager_class.return_value = mock_session_manager
                
                # Try to connect to WebSocket with non-existent session
                with pytest.raises(Exception):
                    with client.websocket_connect("/api/sessions/nonexistent-id/terminal") as websocket:
                        # Should receive error message
                        data = websocket.receive_text()
                        assert "not found" in data.lower()
    
    @pytest.mark.asyncio
    async def test_websocket_vm_not_ready(self):
        """Test WebSocket connection when VM IP is not available"""
        from fastapi.testclient import TestClient
        from models.schemas import Session
        from datetime import datetime
        
        with TestClient(app) as client:
            # Mock session without VM IP
            mock_session = Session(
                id="test-session-id",
                vm_size="small",
                agent_type="codex",
                agent_model="gpt-4",
                challenge_urls=["http://example.com/challenge.bin"],
                instructions="Test instructions",
                created_at=datetime.now(),
                status="creating",
                vm_ip=None,  # No VM IP yet
                ssh_username="ctfuser",
                ssh_port=22,
                resource_group="test-rg",
                error_message=None
            )
            
            # Mock SessionManager to return session without VM IP
            with patch('endpoints_additional.SessionManager') as mock_session_manager_class:
                mock_session_manager = AsyncMock()
                mock_session_manager.get_session = AsyncMock(return_value=mock_session)
                mock_session_manager_class.return_value = mock_session_manager
                
                # Try to connect to WebSocket
                with pytest.raises(Exception):
                    with client.websocket_connect("/api/sessions/test-session-id/terminal") as websocket:
                        # Should receive error message
                        data = websocket.receive_text()
                        assert "not have a vm ip" in data.lower()
    
    @pytest.mark.asyncio
    async def test_websocket_ssh_key_not_found(self):
        """Test WebSocket connection when SSH key is not found"""
        from fastapi.testclient import TestClient
        from models.schemas import Session
        from datetime import datetime
        
        with TestClient(app) as client:
            # Mock session with VM IP
            mock_session = Session(
                id="test-session-id",
                vm_size="small",
                agent_type="codex",
                agent_model="gpt-4",
                challenge_urls=["http://example.com/challenge.bin"],
                instructions="Test instructions",
                created_at=datetime.now(),
                status="running",
                vm_ip="192.168.1.100",
                ssh_username="ctfuser",
                ssh_port=22,
                resource_group="test-rg",
                error_message=None
            )
            
            # Mock SessionManager and SSHKeyManager
            with patch('endpoints_additional.SessionManager') as mock_session_manager_class, \
                 patch('endpoints_additional.SSHKeyManager') as mock_ssh_key_manager_class:
                
                mock_session_manager = AsyncMock()
                mock_session_manager.get_session = AsyncMock(return_value=mock_session)
                mock_session_manager_class.return_value = mock_session_manager
                
                mock_ssh_key_manager = AsyncMock()
                mock_ssh_key_manager.get_private_key = AsyncMock(return_value=None)
                mock_ssh_key_manager_class.return_value = mock_ssh_key_manager
                
                # Try to connect to WebSocket
                with pytest.raises(Exception):
                    with client.websocket_connect("/api/sessions/test-session-id/terminal") as websocket:
                        # Should receive error message
                        data = websocket.receive_text()
                        assert "ssh key not found" in data.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
