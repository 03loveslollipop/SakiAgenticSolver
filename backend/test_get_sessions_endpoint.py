# Test for GET /api/sessions endpoint
# This test verifies the SessionManager.list_sessions() method which is used by the endpoint

import pytest
import pytest_asyncio
from services.session_manager import SessionManager
from datetime import datetime, timedelta
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
async def test_list_sessions_empty(session_manager):
    """Test list_sessions returns empty list when no sessions exist"""
    # Clean up any existing sessions
    sessions = await session_manager.list_sessions()
    for session in sessions:
        await session_manager.delete_session(session.id)
    
    # Test listing sessions
    sessions = await session_manager.list_sessions()
    
    assert isinstance(sessions, list)
    assert len(sessions) == 0


@pytest.mark.asyncio
async def test_list_sessions_sorted_by_created_at(session_manager):
    """Test list_sessions returns sessions sorted by created_at descending"""
    # Clean up any existing sessions
    sessions = await session_manager.list_sessions()
    for session in sessions:
        await session_manager.delete_session(session.id)
    
    # Create test sessions with different timestamps
    now = datetime.utcnow()
    
    session1_data = {
        "_id": "test-session-1",
        "vm_size": "small",
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "challenge_urls": ["http://example.com/challenge1.bin"],
        "instructions": "Test instructions 1",
        "created_at": now - timedelta(hours=2),  # Oldest
        "status": "running",
        "resource_group": "test-rg"
    }
    
    session2_data = {
        "_id": "test-session-2",
        "vm_size": "medium",
        "agent_type": "copilot",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge2.bin"],
        "instructions": "Test instructions 2",
        "created_at": now - timedelta(hours=1),  # Middle
        "status": "creating",
        "resource_group": "test-rg"
    }
    
    session3_data = {
        "_id": "test-session-3",
        "vm_size": "large",
        "agent_type": "codex",
        "agent_model": "gpt-4-turbo",
        "challenge_urls": ["http://example.com/challenge3.bin"],
        "instructions": "Test instructions 3",
        "created_at": now,  # Newest
        "status": "stopped",
        "resource_group": "test-rg"
    }
    
    # Create sessions in MongoDB
    await session_manager.create_session(session1_data)
    await session_manager.create_session(session2_data)
    await session_manager.create_session(session3_data)
    
    try:
        # Test listing sessions
        sessions = await session_manager.list_sessions()
        
        # Verify sessions are returned
        assert len(sessions) == 3
        
        # Verify sessions are sorted by created_at descending (newest first)
        assert sessions[0].id == "test-session-3"  # Newest
        assert sessions[1].id == "test-session-2"  # Middle
        assert sessions[2].id == "test-session-1"  # Oldest
        
        # Verify all required fields are present
        for session in sessions:
            assert session.id is not None
            assert session.vm_size is not None
            assert session.agent_type is not None
            assert session.agent_model is not None
            assert session.challenge_urls is not None
            assert session.instructions is not None
            assert session.created_at is not None
            assert session.status is not None
            assert session.ssh_username is not None
            assert session.ssh_port is not None
            assert session.resource_group is not None
        
        # Verify specific session data
        assert sessions[0].vm_size == "large"
        assert sessions[0].agent_type == "codex"
        assert sessions[0].agent_model == "gpt-4-turbo"
        assert sessions[0].status == "stopped"
        
        assert sessions[1].vm_size == "medium"
        assert sessions[1].agent_type == "copilot"
        assert sessions[1].agent_model == "gpt-3.5-turbo"
        assert sessions[1].status == "creating"
        
        assert sessions[2].vm_size == "small"
        assert sessions[2].agent_type == "codex"
        assert sessions[2].agent_model == "gpt-4"
        assert sessions[2].status == "running"
        
    finally:
        # Clean up test sessions
        await session_manager.delete_session("test-session-1")
        await session_manager.delete_session("test-session-2")
        await session_manager.delete_session("test-session-3")


@pytest.mark.asyncio
async def test_list_sessions_with_error_status(session_manager):
    """Test list_sessions includes sessions with error status and error messages"""
    # Clean up any existing sessions
    sessions = await session_manager.list_sessions()
    for session in sessions:
        await session_manager.delete_session(session.id)
    
    # Create a session with error status
    session_data = {
        "_id": "test-session-error",
        "vm_size": "small",
        "agent_type": "codex",
        "agent_model": "gpt-4",
        "challenge_urls": ["http://example.com/challenge.bin"],
        "instructions": "Test instructions",
        "status": "error",
        "error_message": "Failed to create VM: Azure quota exceeded",
        "resource_group": "test-rg"
    }
    
    await session_manager.create_session(session_data)
    
    try:
        # Test listing sessions
        sessions = await session_manager.list_sessions()
        
        assert len(sessions) == 1
        session = sessions[0]
        
        assert session.id == "test-session-error"
        assert session.status == "error"
        assert session.error_message == "Failed to create VM: Azure quota exceeded"
        
    finally:
        # Clean up test session
        await session_manager.delete_session("test-session-error")


@pytest.mark.asyncio
async def test_list_sessions_with_vm_ip(session_manager):
    """Test list_sessions includes vm_ip when available"""
    # Clean up any existing sessions
    sessions = await session_manager.list_sessions()
    for session in sessions:
        await session_manager.delete_session(session.id)
    
    # Create a session with VM IP
    session_data = {
        "_id": "test-session-with-ip",
        "vm_size": "medium",
        "agent_type": "copilot",
        "agent_model": "gpt-3.5-turbo",
        "challenge_urls": ["http://example.com/challenge.bin"],
        "instructions": "Test instructions",
        "status": "running",
        "vm_ip": "20.30.40.50",
        "resource_group": "test-rg"
    }
    
    await session_manager.create_session(session_data)
    
    try:
        # Test listing sessions
        sessions = await session_manager.list_sessions()
        
        assert len(sessions) == 1
        session = sessions[0]
        
        assert session.id == "test-session-with-ip"
        assert session.vm_ip == "20.30.40.50"
        assert session.status == "running"
        
    finally:
        # Clean up test session
        await session_manager.delete_session("test-session-with-ip")


@pytest.mark.asyncio
async def test_list_sessions_multiple_statuses(session_manager):
    """Test list_sessions returns sessions with various statuses"""
    # Clean up any existing sessions
    sessions = await session_manager.list_sessions()
    for session in sessions:
        await session_manager.delete_session(session.id)
    
    # Create sessions with different statuses
    statuses = ["creating", "running", "stopped", "error"]
    session_ids = []
    
    for i, status in enumerate(statuses):
        session_data = {
            "_id": f"test-session-{status}",
            "vm_size": "small",
            "agent_type": "codex",
            "agent_model": "gpt-4",
            "challenge_urls": ["http://example.com/challenge.bin"],
            "instructions": f"Test instructions for {status}",
            "status": status,
            "resource_group": "test-rg"
        }
        await session_manager.create_session(session_data)
        session_ids.append(f"test-session-{status}")
    
    try:
        # Test listing sessions
        sessions = await session_manager.list_sessions()
        
        assert len(sessions) == 4
        
        # Verify all statuses are present
        session_statuses = [s.status for s in sessions]
        for status in statuses:
            assert status in session_statuses
        
    finally:
        # Clean up test sessions
        for session_id in session_ids:
            await session_manager.delete_session(session_id)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
