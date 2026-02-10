# Unit tests for SessionManager

import pytest
import pytest_asyncio
from services.session_manager import SessionManager
from models.schemas import Session
from datetime import datetime
import os

# Mock MongoDB for testing without actual MongoDB server
try:
    from mongomock_motor import AsyncMongoMockClient
    MOCK_AVAILABLE = True
except ImportError:
    MOCK_AVAILABLE = False
    from motor.motor_asyncio import AsyncIOMotorClient

# Use a test database
TEST_DATABASE_NAME = "ctf_platform_test"
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")


@pytest_asyncio.fixture
async def mongo_client():
    """Create a MongoDB client for testing"""
    if MOCK_AVAILABLE:
        client = AsyncMongoMockClient()
    else:
        client = AsyncIOMotorClient(MONGODB_URL)
    yield client
    # Cleanup: drop test database
    if not MOCK_AVAILABLE:
        await client.drop_database(TEST_DATABASE_NAME)
    client.close()


@pytest_asyncio.fixture
async def session_manager(mongo_client):
    """Create SessionManager instance for testing"""
    manager = SessionManager(mongo_client, database_name=TEST_DATABASE_NAME)
    await manager.create_indexes()
    return manager


@pytest.mark.asyncio
async def test_create_session(session_manager):
    """Test session creation with valid data"""
    session_data = {
        "vm_size": "medium",
        "agent_type": "copilot",
        "agent_model": "gpt-4",
        "challenge_urls": ["http://example.com/challenge1.bin"],
        "instructions": "Test challenge instructions",
        "resource_group": "test-rg-001"
    }
    
    session = await session_manager.create_session(session_data)
    
    assert session is not None
    assert session.id is not None
    assert session.vm_size == "medium"
    assert session.agent_type == "copilot"
    assert session.agent_model == "gpt-4"
    assert session.status == "creating"
    assert session.ssh_username == "ctfuser"
    assert session.ssh_port == 22


@pytest.mark.asyncio
async def test_create_session_missing_required_field(session_manager):
    """Test session creation with missing required field"""
    session_data = {
        "vm_size": "medium",
        "agent_type": "copilot",
        # Missing agent_model
        "challenge_urls": ["http://example.com/challenge1.bin"],
        "instructions": "Test challenge instructions",
        "resource_group": "test-rg-001"
    }
    
    with pytest.raises(ValueError, match="Missing required field"):
        await session_manager.create_session(session_data)


@pytest.mark.asyncio
async def test_get_session(session_manager):
    """Test session retrieval by ID"""
    session_data = {
        "vm_size": "small",
        "agent_type": "codex",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge2.bin"],
        "instructions": "Another test challenge",
        "resource_group": "test-rg-002"
    }
    
    created_session = await session_manager.create_session(session_data)
    retrieved_session = await session_manager.get_session(created_session.id)
    
    assert retrieved_session is not None
    assert retrieved_session.id == created_session.id
    assert retrieved_session.vm_size == "small"
    assert retrieved_session.agent_type == "codex"


@pytest.mark.asyncio
async def test_get_session_not_found(session_manager):
    """Test retrieving non-existent session"""
    result = await session_manager.get_session("non-existent-id")
    assert result is None


@pytest.mark.asyncio
async def test_list_sessions(session_manager):
    """Test listing all sessions with sorting"""
    # Create multiple sessions
    session_data_1 = {
        "vm_size": "small",
        "agent_type": "codex",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge1.bin"],
        "instructions": "Challenge 1",
        "resource_group": "test-rg-001"
    }
    
    session_data_2 = {
        "vm_size": "medium",
        "agent_type": "copilot",
        "agent_model": "gpt-4",
        "challenge_urls": ["http://example.com/challenge2.bin"],
        "instructions": "Challenge 2",
        "resource_group": "test-rg-002"
    }
    
    session1 = await session_manager.create_session(session_data_1)
    session2 = await session_manager.create_session(session_data_2)
    
    sessions = await session_manager.list_sessions()
    
    assert len(sessions) >= 2
    # Verify both sessions are in the list
    session_ids = [s.id for s in sessions]
    assert session1.id in session_ids
    assert session2.id in session_ids
    # Verify sessions are sorted by created_at descending (newest first)
    # The most recently created should be first or equal in time
    assert sessions[0].created_at >= sessions[1].created_at


@pytest.mark.asyncio
async def test_update_session_status(session_manager):
    """Test session status update"""
    session_data = {
        "vm_size": "large",
        "agent_type": "copilot",
        "agent_model": "gpt-4",
        "challenge_urls": ["http://example.com/challenge3.bin"],
        "instructions": "Challenge 3",
        "resource_group": "test-rg-003"
    }
    
    session = await session_manager.create_session(session_data)
    assert session.status == "creating"
    
    updated_session = await session_manager.update_session_status(session.id, "running")
    
    assert updated_session is not None
    assert updated_session.status == "running"
    assert updated_session.id == session.id


@pytest.mark.asyncio
async def test_update_session_status_with_error(session_manager):
    """Test session status update with error message"""
    session_data = {
        "vm_size": "medium",
        "agent_type": "codex",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge4.bin"],
        "instructions": "Challenge 4",
        "resource_group": "test-rg-004"
    }
    
    session = await session_manager.create_session(session_data)
    
    updated_session = await session_manager.update_session_status(
        session.id, 
        "error", 
        error_message="VM creation failed"
    )
    
    assert updated_session is not None
    assert updated_session.status == "error"
    assert updated_session.error_message == "VM creation failed"


@pytest.mark.asyncio
async def test_update_session_status_invalid(session_manager):
    """Test session status update with invalid status"""
    session_data = {
        "vm_size": "small",
        "agent_type": "codex",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge5.bin"],
        "instructions": "Challenge 5",
        "resource_group": "test-rg-005"
    }
    
    session = await session_manager.create_session(session_data)
    
    with pytest.raises(ValueError, match="Invalid status"):
        await session_manager.update_session_status(session.id, "invalid_status")


@pytest.mark.asyncio
async def test_update_session_status_not_found(session_manager):
    """Test updating status for non-existent session"""
    result = await session_manager.update_session_status("non-existent-id", "running")
    assert result is None


@pytest.mark.asyncio
async def test_delete_session(session_manager):
    """Test session deletion"""
    session_data = {
        "vm_size": "medium",
        "agent_type": "copilot",
        "agent_model": "gpt-4",
        "challenge_urls": ["http://example.com/challenge6.bin"],
        "instructions": "Challenge 6",
        "resource_group": "test-rg-006"
    }
    
    session = await session_manager.create_session(session_data)
    result = await session_manager.delete_session(session.id)
    
    assert result is True
    
    # Verify session is deleted
    retrieved = await session_manager.get_session(session.id)
    assert retrieved is None


@pytest.mark.asyncio
async def test_delete_session_not_found(session_manager):
    """Test deleting non-existent session"""
    result = await session_manager.delete_session("non-existent-id")
    assert result is False


@pytest.mark.asyncio
async def test_update_session(session_manager):
    """Test updating session fields"""
    session_data = {
        "vm_size": "small",
        "agent_type": "codex",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge7.bin"],
        "instructions": "Challenge 7",
        "resource_group": "test-rg-007"
    }
    
    session = await session_manager.create_session(session_data)
    
    update_data = {
        "vm_ip": "192.168.1.100",
        "status": "running"
    }
    
    updated_session = await session_manager.update_session(session.id, update_data)
    
    assert updated_session is not None
    assert updated_session.vm_ip == "192.168.1.100"
    assert updated_session.status == "running"


@pytest.mark.asyncio
async def test_create_session_with_custom_id(session_manager):
    """Test session creation with custom ID"""
    custom_id = "custom-session-id-123"
    session_data = {
        "_id": custom_id,
        "vm_size": "large",
        "agent_type": "copilot",
        "agent_model": "gpt-4",
        "challenge_urls": ["http://example.com/challenge8.bin"],
        "instructions": "Challenge 8",
        "resource_group": "test-rg-008"
    }
    
    session = await session_manager.create_session(session_data)
    
    assert session.id == custom_id


@pytest.mark.asyncio
async def test_create_session_duplicate_id(session_manager):
    """Test that creating session with duplicate ID raises error"""
    session_data = {
        "_id": "duplicate-id",
        "vm_size": "medium",
        "agent_type": "codex",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge9.bin"],
        "instructions": "Challenge 9",
        "resource_group": "test-rg-009"
    }
    
    await session_manager.create_session(session_data)
    
    with pytest.raises(ValueError, match="already exists"):
        await session_manager.create_session(session_data)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

