# Test for POST /api/sessions endpoint (Task 8.2)

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from main import app
from models.schemas import VMCreationRequest, SessionResponse
import uuid


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture
def sample_vm_creation_request():
    """Sample VM creation request data"""
    return {
        "challenge_urls": ["https://example.com/challenge1.bin", "https://example.com/challenge2.txt"],
        "instructions": "Solve this PWN challenge by finding the buffer overflow vulnerability",
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "vm_size": "medium"
    }


@pytest.fixture
def mock_session_id():
    """Generate a mock session ID"""
    return str(uuid.uuid4())


@pytest.mark.asyncio
async def test_create_session_success(client, sample_vm_creation_request, mock_session_id):
    """
    Test successful VM session creation through POST /api/sessions endpoint.
    
    This test verifies that:
    1. The endpoint accepts valid VMCreationRequest
    2. SSH key pair is generated
    3. Azure VM is created
    4. Setup is executed
    5. Session is stored in MongoDB
    6. SessionResponse is returned with correct data
    """
    
    # Mock all the services - they are imported inside the endpoint function
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('services.azure_vm_manager.AzureVMManager') as MockAzureVMManager, \
         patch('services.vm_setup_service.VMSetupService') as MockVMSetupService, \
         patch('main.uuid.uuid4') as mock_uuid, \
         patch('main.get_database') as mock_get_db, \
         patch('main.mongo_client') as mock_mongo_client:
        
        # Setup mock UUID
        mock_uuid.return_value = uuid.UUID(mock_session_id)
        
        # Setup mock database
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Setup mock SessionManager
        mock_session_manager = MockSessionManager.return_value
        mock_session_manager.create_session = AsyncMock(return_value=MagicMock(
            id=mock_session_id,
            vm_size="medium",
            agent_type="codex",
            agent_model="gpt-4",
            challenge_urls=sample_vm_creation_request["challenge_urls"],
            instructions=sample_vm_creation_request["instructions"],
            created_at="2024-01-01T00:00:00",
            status="creating",
            vm_ip=None,
            ssh_username="ctfuser",
            ssh_port=22,
            resource_group="ctf-platform-rg",
            error_message=None
        ))
        mock_session_manager.update_session = AsyncMock()
        mock_session_manager.update_session_status = AsyncMock(return_value=MagicMock(
            id=mock_session_id,
            vm_size="medium",
            agent_type="codex",
            agent_model="gpt-4",
            challenge_urls=sample_vm_creation_request["challenge_urls"],
            instructions=sample_vm_creation_request["instructions"],
            created_at="2024-01-01T00:00:00",
            status="running",
            vm_ip="20.30.40.50",
            ssh_username="ctfuser",
            ssh_port=22,
            resource_group="ctf-platform-rg",
            error_message=None
        ))
        
        # Setup mock SSHKeyManager
        mock_ssh_key_manager = MockSSHKeyManager.return_value
        mock_ssh_key_manager.generate_key_pair = AsyncMock(return_value={
            "session_id": mock_session_id,
            "public_key": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
        })
        mock_ssh_key_manager.get_private_key = AsyncMock(return_value="-----BEGIN RSA PRIVATE KEY-----\n...")
        
        # Setup mock AzureVMManager
        mock_azure_vm_manager = MockAzureVMManager.return_value
        mock_vm_info = MagicMock()
        mock_vm_info.vm_name = f"ctf-vm-{mock_session_id[:8]}"
        mock_vm_info.public_ip = "20.30.40.50"
        mock_vm_info.vm_id = "/subscriptions/xxx/resourceGroups/xxx/providers/Microsoft.Compute/virtualMachines/xxx"
        mock_vm_info.status = "running"
        mock_azure_vm_manager.create_vm = AsyncMock(return_value=mock_vm_info)
        
        # Setup mock VMSetupService
        mock_vm_setup_service = MockVMSetupService.return_value
        mock_vm_setup_service.execute_setup_script = AsyncMock(return_value=True)
        mock_vm_setup_service.install_agent = AsyncMock(return_value=True)
        mock_vm_setup_service.download_challenge_files = AsyncMock(return_value=True)
        mock_vm_setup_service.create_config_files = AsyncMock(return_value=True)
        mock_vm_setup_service.configure_mcp_servers = AsyncMock(return_value=True)
        mock_vm_setup_service.start_agent = AsyncMock(return_value=True)
        
        # Make the request
        response = client.post("/api/sessions", json=sample_vm_creation_request)
        
        # Verify response
        assert response.status_code == 201
        data = response.json()
        
        assert data["id"] == mock_session_id
        assert data["vm_size"] == "medium"
        assert data["agent_type"] == "codex"
        assert data["agent_model"] == "gpt-4"
        assert data["challenge_urls"] == sample_vm_creation_request["challenge_urls"]
        assert data["instructions"] == sample_vm_creation_request["instructions"]
        assert data["status"] == "running"
        assert data["vm_ip"] == "20.30.40.50"
        assert data["ssh_username"] == "ctfuser"
        assert data["ssh_port"] == 22
        
        # Verify all services were called
        mock_ssh_key_manager.generate_key_pair.assert_called_once()
        mock_azure_vm_manager.create_vm.assert_called_once()
        mock_vm_setup_service.execute_setup_script.assert_called_once()
        mock_vm_setup_service.install_agent.assert_called_once()
        mock_vm_setup_service.download_challenge_files.assert_called_once()
        mock_vm_setup_service.create_config_files.assert_called_once()
        mock_vm_setup_service.configure_mcp_servers.assert_called_once()
        mock_vm_setup_service.start_agent.assert_called_once()


def test_create_session_validation_error_empty_urls(client):
    """
    Test that endpoint rejects request with empty challenge URLs list.
    Validates: Requirements 1.5
    """
    request_data = {
        "challenge_urls": [],  # Empty list should be rejected
        "instructions": "Test instructions",
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "vm_size": "small"
    }
    
    response = client.post("/api/sessions", json=request_data)
    
    # Should return 422 Unprocessable Entity for validation error
    assert response.status_code == 422


def test_create_session_validation_error_invalid_agent_type(client):
    """
    Test that endpoint rejects request with invalid agent type.
    Validates: Requirements 1.6
    """
    request_data = {
        "challenge_urls": ["https://example.com/challenge.bin"],
        "instructions": "Test instructions",
        "agent_type": "invalid_agent",  # Invalid agent type
        "agent_model": "gpt-4",
        "vm_size": "small"
    }
    
    response = client.post("/api/sessions", json=request_data)
    
    # Should return 422 Unprocessable Entity for validation error
    assert response.status_code == 422


def test_create_session_validation_error_invalid_vm_size(client):
    """
    Test that endpoint rejects request with invalid VM size.
    Validates: Requirements 1.2, 1.3, 1.4
    """
    request_data = {
        "challenge_urls": ["https://example.com/challenge.bin"],
        "instructions": "Test instructions",
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "vm_size": "extra_large"  # Invalid VM size
    }
    
    response = client.post("/api/sessions", json=request_data)
    
    # Should return 422 Unprocessable Entity for validation error
    assert response.status_code == 422


def test_create_session_validation_error_empty_instructions(client):
    """
    Test that endpoint rejects request with empty instructions.
    Validates: Requirements 1.8
    """
    request_data = {
        "challenge_urls": ["https://example.com/challenge.bin"],
        "instructions": "",  # Empty instructions should be rejected
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "vm_size": "small"
    }
    
    response = client.post("/api/sessions", json=request_data)
    
    # Should return 422 Unprocessable Entity for validation error
    assert response.status_code == 422


def test_create_session_validation_error_missing_fields(client):
    """
    Test that endpoint rejects request with missing required fields.
    """
    request_data = {
        "challenge_urls": ["https://example.com/challenge.bin"],
        # Missing instructions, agent_type, agent_model, vm_size
    }
    
    response = client.post("/api/sessions", json=request_data)
    
    # Should return 422 Unprocessable Entity for validation error
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_session_ssh_key_generation_failure(client, sample_vm_creation_request):
    """
    Test that endpoint handles SSH key generation failure gracefully.
    """
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('main.get_database') as mock_get_db, \
         patch('main.mongo_client') as mock_mongo_client:
        
        # Setup mock database
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Setup mock SSHKeyManager to fail
        mock_ssh_key_manager = MockSSHKeyManager.return_value
        mock_ssh_key_manager.generate_key_pair = AsyncMock(
            side_effect=Exception("Failed to generate SSH key pair")
        )
        
        # Make the request
        response = client.post("/api/sessions", json=sample_vm_creation_request)
        
        # Should return 400 or 500 error
        assert response.status_code in [400, 500]
        assert "SSH key" in response.json()["message"] or "SSH key" in str(response.json())


@pytest.mark.asyncio
async def test_create_session_azure_vm_creation_failure(client, sample_vm_creation_request, mock_session_id):
    """
    Test that endpoint handles Azure VM creation failure and updates session status to error.
    """
    with patch('services.session_manager.SessionManager') as MockSessionManager, \
         patch('services.ssh_key_manager.SSHKeyManager') as MockSSHKeyManager, \
         patch('services.azure_vm_manager.AzureVMManager') as MockAzureVMManager, \
         patch('main.uuid.uuid4') as mock_uuid, \
         patch('main.get_database') as mock_get_db, \
         patch('main.mongo_client') as mock_mongo_client:
        
        # Setup mock UUID
        mock_uuid.return_value = uuid.UUID(mock_session_id)
        
        # Setup mock database
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Setup mock SessionManager
        mock_session_manager = MockSessionManager.return_value
        mock_session_manager.create_session = AsyncMock(return_value=MagicMock(
            id=mock_session_id,
            status="creating"
        ))
        mock_session_manager.update_session_status = AsyncMock()
        
        # Setup mock SSHKeyManager
        mock_ssh_key_manager = MockSSHKeyManager.return_value
        mock_ssh_key_manager.generate_key_pair = AsyncMock(return_value={
            "session_id": mock_session_id,
            "public_key": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
        })
        mock_ssh_key_manager.delete_key_pair = AsyncMock()
        
        # Setup mock AzureVMManager to fail
        mock_azure_vm_manager = MockAzureVMManager.return_value
        mock_azure_vm_manager.create_vm = AsyncMock(
            side_effect=Exception("Azure quota exceeded")
        )
        
        # Make the request
        response = client.post("/api/sessions", json=sample_vm_creation_request)
        
        # Should return error
        assert response.status_code in [400, 500]
        
        # Verify session status was updated to error
        mock_session_manager.update_session_status.assert_called_once()
        call_args = mock_session_manager.update_session_status.call_args
        assert call_args[0][0] == mock_session_id
        assert call_args[0][1] == "error"
        assert "Azure" in call_args[0][2] or "VM" in call_args[0][2]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
