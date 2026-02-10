# Test for GET /api/sessions/{session_id} endpoint

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
from models.schemas import Session

client = TestClient(app)


@pytest.fixture
def mock_session():
    """Create a mock session object"""
    # Create session with explicit _id to avoid auto-generation
    session_data = {
        "_id": "test-session-123",
        "vm_size": "medium",
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "challenge_urls": ["https://example.com/challenge1.bin"],
        "instructions": "Solve this challenge",
        "created_at": datetime(2024, 1, 15, 10, 30, 0),
        "status": "running",
        "vm_ip": "20.30.40.50",
        "ssh_username": "ctfuser",
        "ssh_port": 22,
        "resource_group": "ctf-platform-rg",
        "error_message": None
    }
    return Session(**session_data)


@pytest.mark.asyncio
async def test_get_session_by_id_success(mock_session):
    """Test successful retrieval of session by ID"""
    
    # Mock SessionManager.get_session to return our mock session
    with patch('services.session_manager.SessionManager') as MockSessionManager:
        mock_manager = AsyncMock()
        mock_manager.get_session.return_value = mock_session
        MockSessionManager.return_value = mock_manager
        
        # Make request
        response = client.get("/api/sessions/test-session-123")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields are present and correct
        assert data["id"] == "test-session-123"
        assert data["vm_size"] == "medium"
        assert data["agent_type"] == "codex"
        assert data["agent_model"] == "gpt-4"
        assert data["challenge_urls"] == ["https://example.com/challenge1.bin"]
        assert data["instructions"] == "Solve this challenge"
        assert data["status"] == "running"
        assert data["vm_ip"] == "20.30.40.50"
        assert data["ssh_username"] == "ctfuser"
        assert data["ssh_port"] == 22
        assert data["resource_group"] == "ctf-platform-rg"
        assert data["error_message"] is None
        
        # Verify SessionManager.get_session was called with correct session_id
        mock_manager.get_session.assert_called_once_with("test-session-123")


@pytest.mark.asyncio
async def test_get_session_by_id_not_found():
    """Test retrieval of non-existent session returns 404"""
    
    # Mock SessionManager.get_session to return None (not found)
    with patch('services.session_manager.SessionManager') as MockSessionManager:
        mock_manager = AsyncMock()
        mock_manager.get_session.return_value = None
        MockSessionManager.return_value = mock_manager
        
        # Make request
        response = client.get("/api/sessions/nonexistent-session-id")
        
        # Verify 404 response
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()
        
        # Verify SessionManager.get_session was called
        mock_manager.get_session.assert_called_once_with("nonexistent-session-id")


@pytest.mark.asyncio
async def test_get_session_by_id_with_error_message():
    """Test retrieval of session with error status and error message"""
    
    # Create session with error status
    error_session_data = {
        "_id": "error-session-456",
        "vm_size": "small",
        "agent_type": "copilot",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["https://example.com/challenge2.bin"],
        "instructions": "Another challenge",
        "created_at": datetime(2024, 1, 16, 14, 20, 0),
        "status": "error",
        "vm_ip": None,
        "ssh_username": "ctfuser",
        "ssh_port": 22,
        "resource_group": "ctf-platform-rg",
        "error_message": "Failed to create VM: Azure quota exceeded"
    }
    error_session = Session(**error_session_data)
    
    # Mock SessionManager.get_session to return error session
    with patch('services.session_manager.SessionManager') as MockSessionManager:
        mock_manager = AsyncMock()
        mock_manager.get_session.return_value = error_session
        MockSessionManager.return_value = mock_manager
        
        # Make request
        response = client.get("/api/sessions/error-session-456")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        
        # Verify error fields
        assert data["id"] == "error-session-456"
        assert data["status"] == "error"
        assert data["error_message"] == "Failed to create VM: Azure quota exceeded"
        assert data["vm_ip"] is None


@pytest.mark.asyncio
async def test_get_session_by_id_database_error():
    """Test handling of database errors"""
    
    # Mock SessionManager.get_session to raise an exception
    with patch('services.session_manager.SessionManager') as MockSessionManager:
        mock_manager = AsyncMock()
        mock_manager.get_session.side_effect = Exception("Database connection failed")
        MockSessionManager.return_value = mock_manager
        
        # Make request - the exception will be caught by the global exception handler
        # which returns a 500 error
        try:
            response = client.get("/api/sessions/test-session-789")
            # If we get here, check for 500 status
            assert response.status_code == 500
            data = response.json()
            assert "Failed to retrieve session" in data["message"] or "internal server error" in data["detail"].lower()
        except Exception as e:
            # The TestClient may raise the exception directly
            # In this case, we verify it's the expected error
            assert "Failed to retrieve session" in str(e) or "Database connection failed" in str(e)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
