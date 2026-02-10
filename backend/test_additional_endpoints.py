# Test file for additional API endpoints (tasks 8.9-8.22)

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import sys
import os

# Add parent directory to path to import main
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from models.schemas import Session, Writeup


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


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
        vm_ip="192.168.1.100",
        ssh_username="ctfuser",
        ssh_port=22,
        resource_group="test-rg"
    )


@pytest.fixture
def mock_writeup():
    """Create a mock writeup object"""
    return Writeup(
        id="writeup-123",
        session_id="test-session-123",
        challenge_urls=["https://example.com/challenge.bin"],
        challenge_type="pwn",
        content="# Test Writeup\n\nThis is a test writeup.",
        completion_timestamp=datetime.utcnow(),
        agent_type="codex",
        agent_model="gpt-4"
    )


class TestSSHEndpoints:
    """Test SSH-related endpoints"""
    
    @patch('endpoints_additional.SessionManager')
    def test_get_ssh_connection_info_success(self, mock_manager_class, client, mock_session):
        """Test GET /api/sessions/{session_id}/ssh returns SSH connection info"""
        # Setup mock
        mock_manager = AsyncMock()
        mock_manager.get_session = AsyncMock(return_value=mock_session)
        mock_manager_class.return_value = mock_manager
        
        # Make request
        response = client.get("/api/sessions/test-session-123/ssh")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["hostname"] == "192.168.1.100"
        assert data["port"] == 22
        assert data["username"] == "ctfuser"
    
    @patch('endpoints_additional.SessionManager')
    def test_get_ssh_connection_info_not_found(self, mock_manager_class, client):
        """Test GET /api/sessions/{session_id}/ssh returns 404 for non-existent session"""
        # Setup mock
        mock_manager = AsyncMock()
        mock_manager.get_session = AsyncMock(return_value=None)
        mock_manager_class.return_value = mock_manager
        
        # Make request
        response = client.get("/api/sessions/nonexistent/ssh")
        
        # Verify response
        assert response.status_code == 404
    
    @patch('endpoints_additional.SSHKeyManager')
    @patch('endpoints_additional.SessionManager')
    def test_get_ssh_public_key_success(self, mock_session_manager_class, mock_key_manager_class, client, mock_session):
        """Test GET /api/sessions/{session_id}/ssh-key returns public key"""
        # Setup mocks
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager_class.return_value = mock_session_manager
        
        mock_key_manager = AsyncMock()
        mock_key_manager.get_public_key = AsyncMock(return_value="ssh-rsa AAAAB3NzaC1yc2E...")
        mock_key_manager_class.return_value = mock_key_manager
        
        # Make request
        response = client.get("/api/sessions/test-session-123/ssh-key")
        
        # Verify response
        assert response.status_code == 200
        assert "ssh-rsa" in response.text
        assert "attachment" in response.headers.get("content-disposition", "")


class TestFileEndpoints:
    """Test file reading endpoints"""
    
    @patch('paramiko.SSHClient')
    @patch('endpoints_additional.SSHKeyManager')
    @patch('endpoints_additional.SessionManager')
    def test_get_agent_md_success(self, mock_session_manager_class, mock_key_manager_class, 
                                   mock_ssh_class, client, mock_session):
        """Test GET /api/sessions/{session_id}/agent-md returns file content"""
        # Setup mocks
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager_class.return_value = mock_session_manager
        
        mock_key_manager = AsyncMock()
        mock_key_manager.get_private_key = AsyncMock(return_value="-----BEGIN RSA PRIVATE KEY-----\n...")
        mock_key_manager_class.return_value = mock_key_manager
        
        # Mock SSH client and SFTP
        mock_ssh = MagicMock()
        mock_sftp = MagicMock()
        mock_file = MagicMock()
        mock_file.read.return_value = b"# Agent Configuration\n\nTest content"
        mock_sftp.file.return_value.__enter__.return_value = mock_file
        mock_ssh.open_sftp.return_value = mock_sftp
        mock_ssh_class.return_value = mock_ssh
        
        # Make request
        response = client.get("/api/sessions/test-session-123/agent-md")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "Agent Configuration" in data["content"]
    
    @patch('paramiko.SSHClient')
    @patch('endpoints_additional.SSHKeyManager')
    @patch('endpoints_additional.SessionManager')
    def test_update_agent_md_success(self, mock_session_manager_class, mock_key_manager_class,
                                      mock_ssh_class, client, mock_session):
        """Test PUT /api/sessions/{session_id}/agent-md updates file content"""
        # Setup mocks
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager_class.return_value = mock_session_manager
        
        mock_key_manager = AsyncMock()
        mock_key_manager.get_private_key = AsyncMock(return_value="-----BEGIN RSA PRIVATE KEY-----\n...")
        mock_key_manager_class.return_value = mock_key_manager
        
        # Mock SSH client
        mock_ssh = MagicMock()
        mock_sftp = MagicMock()
        mock_file = MagicMock()
        mock_sftp.file.return_value.__enter__.return_value = mock_file
        mock_ssh.open_sftp.return_value = mock_sftp
        mock_ssh.exec_command.return_value = (MagicMock(), MagicMock(), MagicMock())
        mock_ssh_class.return_value = mock_ssh
        
        # Make request
        response = client.put(
            "/api/sessions/test-session-123/agent-md",
            json={"content": "# Updated Agent Configuration"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestWriteupEndpoints:
    """Test writeup-related endpoints"""
    
    @patch('endpoints_additional.WriteupManager')
    @patch('endpoints_additional.SessionManager')
    def test_upload_writeup_success(self, mock_session_manager_class, mock_writeup_manager_class,
                                     client, mock_session, mock_writeup):
        """Test POST /api/sessions/{session_id}/writeup uploads writeup"""
        # Setup mocks
        mock_session_manager = AsyncMock()
        mock_session_manager.get_session = AsyncMock(return_value=mock_session)
        mock_session_manager_class.return_value = mock_session_manager
        
        mock_writeup_manager = AsyncMock()
        mock_writeup_manager.create_writeup = AsyncMock(return_value=mock_writeup)
        mock_writeup_manager_class.return_value = mock_writeup_manager
        
        # Make request
        response = client.post(
            "/api/sessions/test-session-123/writeup",
            json={
                "content": "# Test Writeup\n\nThis is a test.",
                "challenge_type": "pwn"
            }
        )
        
        # Verify response
        assert response.status_code == 201
        data = response.json()
        assert "writeup_id" in data
        assert data["session_id"] == "test-session-123"
    
    @patch('endpoints_additional.WriteupManager')
    def test_list_writeups_success(self, mock_writeup_manager_class, client, mock_writeup):
        """Test GET /api/writeups returns list of writeups"""
        # Setup mock
        mock_writeup_manager = AsyncMock()
        mock_writeup_manager.list_writeups = AsyncMock(return_value=[mock_writeup])
        mock_writeup_manager_class.return_value = mock_writeup_manager
        
        # Make request
        response = client.get("/api/writeups?skip=0&limit=20")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "writeups" in data
        assert len(data["writeups"]) == 1
        assert data["count"] == 1
    
    @patch('endpoints_additional.WriteupManager')
    def test_get_writeup_by_session_success(self, mock_writeup_manager_class, client, mock_writeup):
        """Test GET /api/writeups/{session_id} returns writeup"""
        # Setup mock
        mock_writeup_manager = AsyncMock()
        mock_writeup_manager.get_writeup = AsyncMock(return_value=mock_writeup)
        mock_writeup_manager_class.return_value = mock_writeup_manager
        
        # Make request
        response = client.get("/api/writeups/test-session-123")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "test-session-123"
        assert "content" in data
    
    @patch('endpoints_additional.WriteupManager')
    def test_search_writeups_success(self, mock_writeup_manager_class, client, mock_writeup):
        """Test GET /api/writeups/search returns matching writeups"""
        # Setup mock
        mock_writeup_manager = AsyncMock()
        mock_writeup_manager.search_writeups = AsyncMock(return_value=[mock_writeup])
        mock_writeup_manager_class.return_value = mock_writeup_manager
        
        # Make request
        response = client.get("/api/writeups/search?q=buffer+overflow&challenge_type=pwn")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "writeups" in data
        assert data["query"] == "buffer overflow"
        assert data["challenge_type"] == "pwn"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
