# Test for DELETE /api/sessions/{session_id} endpoint
# Task 8.7: Implement DELETE /api/sessions/{session_id} endpoint

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from models.schemas import Session


@pytest.fixture
def mock_session():
    """Create a mock session object"""
    return Session(
        id="test-session-123",
        vm_size="small",
        agent_type="codex",
        agent_model="gpt-4",
        challenge_urls=["https://example.com/challenge.bin"],
        instructions="Test challenge",
        created_at=datetime.utcnow(),
        status="running",
        vm_ip="1.2.3.4",
        ssh_username="ctfuser",
        ssh_port=22,
        resource_group="test-rg",
        error_message=None
    )


@pytest.mark.asyncio
async def test_delete_session_success(mock_session):
    """Test successful session deletion"""
    
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('services.azure_vm_manager.AzureVMManager') as MockAzureVMManager:
        
        # Mock SessionManager
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager.delete_session = AsyncMock(return_value=True)
        MockSessionManager.return_value = mock_session_manager
        
        # Mock SSHKeyManager
        mock_ssh_key_manager = AsyncMock()
        mock_ssh_key_manager.delete_key_pair = AsyncMock(return_value=True)
        MockSSHKeyManager.return_value = mock_ssh_key_manager
        
        # Mock AzureVMManager
        mock_azure_vm_manager = AsyncMock()
        mock_azure_vm_manager.delete_vm = AsyncMock(return_value=True)
        MockAzureVMManager.return_value = mock_azure_vm_manager
        
        # Create test client
        client = TestClient(app)
        
        # Make DELETE request
        response = client.delete("/api/sessions/test-session-123")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["session_id"] == "test-session-123"
        assert "deleted successfully" in data["message"]
        
        # Verify all deletion methods were called
        mock_session_manager.get_session.assert_called_once_with("test-session-123")
        mock_azure_vm_manager.delete_vm.assert_called_once()
        mock_ssh_key_manager.delete_key_pair.assert_called_once_with("test-session-123")
        mock_session_manager.delete_session.assert_called_once_with("test-session-123")


@pytest.mark.asyncio
async def test_delete_session_not_found():
    """Test deletion of non-existent session"""
    
    with patch('database.mongodb.mongo_client') as mock_mongo_client, \
         patch('services.session_manager.SessionManager') as MockSessionManager:
        
        # Mock SessionManager to return None (session not found)
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=None)
        MockSessionManager.return_value = mock_session_manager
        
        # Create test client
        client = TestClient(app)
        
        # Make DELETE request
        response = client.delete("/api/sessions/nonexistent-session")
        
        # Verify 404 response
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_delete_session_vm_deletion_fails(mock_session):
    """Test session deletion when VM deletion fails"""
    
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('services.azure_vm_manager.AzureVMManager') as MockAzureVMManager:
        
        # Mock SessionManager
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager.delete_session = AsyncMock(return_value=True)
        MockSessionManager.return_value = mock_session_manager
        
        # Mock SSHKeyManager
        mock_ssh_key_manager = AsyncMock()
        mock_ssh_key_manager.delete_key_pair = AsyncMock(return_value=True)
        MockSSHKeyManager.return_value = mock_ssh_key_manager
        
        # Mock AzureVMManager to raise exception
        mock_azure_vm_manager = AsyncMock()
        mock_azure_vm_manager.delete_vm = AsyncMock(side_effect=Exception("Azure API error"))
        MockAzureVMManager.return_value = mock_azure_vm_manager
        
        # Create test client
        client = TestClient(app)
        
        # Make DELETE request
        response = client.delete("/api/sessions/test-session-123")
        
        # Verify response indicates partial success
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "partial_success"
        assert data["session_id"] == "test-session-123"
        assert len(data["errors"]) > 0
        assert "Azure VM" in data["errors"][0]
        
        # Verify cleanup continued despite VM deletion failure
        mock_ssh_key_manager.delete_key_pair.assert_called_once_with("test-session-123")
        mock_session_manager.delete_session.assert_called_once_with("test-session-123")


@pytest.mark.asyncio
async def test_delete_session_ssh_key_deletion_fails(mock_session):
    """Test session deletion when SSH key deletion fails"""
    
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('services.azure_vm_manager.AzureVMManager') as MockAzureVMManager:
        
        # Mock SessionManager
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager.delete_session = AsyncMock(return_value=True)
        MockSessionManager.return_value = mock_session_manager
        
        # Mock SSHKeyManager to raise exception
        mock_ssh_key_manager = AsyncMock()
        mock_ssh_key_manager.delete_key_pair = AsyncMock(side_effect=Exception("MongoDB error"))
        MockSSHKeyManager.return_value = mock_ssh_key_manager
        
        # Mock AzureVMManager
        mock_azure_vm_manager = AsyncMock()
        mock_azure_vm_manager.delete_vm = AsyncMock(return_value=True)
        MockAzureVMManager.return_value = mock_azure_vm_manager
        
        # Create test client
        client = TestClient(app)
        
        # Make DELETE request
        response = client.delete("/api/sessions/test-session-123")
        
        # Verify response indicates partial success
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "partial_success"
        assert len(data["errors"]) > 0
        assert "SSH key" in data["errors"][0]
        
        # Verify cleanup continued despite SSH key deletion failure
        mock_session_manager.delete_session.assert_called_once_with("test-session-123")


@pytest.mark.asyncio
async def test_delete_session_all_deletions_fail(mock_session):
    """Test session deletion when all deletion operations fail"""
    
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('services.azure_vm_manager.AzureVMManager') as MockAzureVMManager:
        
        # Mock SessionManager
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager.delete_session = AsyncMock(side_effect=Exception("DB error"))
        MockSessionManager.return_value = mock_session_manager
        
        # Mock SSHKeyManager to raise exception
        mock_ssh_key_manager = AsyncMock()
        mock_ssh_key_manager.delete_key_pair = AsyncMock(side_effect=Exception("Key error"))
        MockSSHKeyManager.return_value = mock_ssh_key_manager
        
        # Mock AzureVMManager to raise exception
        mock_azure_vm_manager = AsyncMock()
        mock_azure_vm_manager.delete_vm = AsyncMock(side_effect=Exception("VM error"))
        MockAzureVMManager.return_value = mock_azure_vm_manager
        
        # Create test client
        client = TestClient(app)
        
        # Make DELETE request
        response = client.delete("/api/sessions/test-session-123")
        
        # Verify response indicates partial success with multiple errors
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "partial_success"
        assert len(data["errors"]) == 3  # All three deletions failed
        
        # Verify all deletion methods were attempted
        mock_azure_vm_manager.delete_vm.assert_called_once()
        mock_ssh_key_manager.delete_key_pair.assert_called_once()
        mock_session_manager.delete_session.assert_called_once()


@pytest.mark.asyncio
async def test_delete_session_graceful_error_handling(mock_session):
    """Test that deletion continues even when individual steps fail"""
    
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('services.azure_vm_manager.AzureVMManager') as MockAzureVMManager:
        
        # Mock SessionManager
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager.delete_session = AsyncMock(return_value=True)
        MockSessionManager.return_value = mock_session_manager
        
        # Mock SSHKeyManager - succeeds
        mock_ssh_key_manager = AsyncMock()
        mock_ssh_key_manager.delete_key_pair = AsyncMock(return_value=True)
        MockSSHKeyManager.return_value = mock_ssh_key_manager
        
        # Mock AzureVMManager - fails
        mock_azure_vm_manager = AsyncMock()
        mock_azure_vm_manager.delete_vm = AsyncMock(side_effect=Exception("Network timeout"))
        MockAzureVMManager.return_value = mock_azure_vm_manager
        
        # Create test client
        client = TestClient(app)
        
        # Make DELETE request
        response = client.delete("/api/sessions/test-session-123")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "partial_success"
        assert len(data["errors"]) == 1
        assert "Azure VM" in data["errors"][0]
        
        # Verify that despite VM deletion failure, other cleanups were performed
        mock_ssh_key_manager.delete_key_pair.assert_called_once()
        mock_session_manager.delete_session.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
