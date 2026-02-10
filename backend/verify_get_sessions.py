#!/usr/bin/env python3
"""
Manual verification script for GET /api/sessions endpoint.
This script verifies that the endpoint implementation is correct by testing the SessionManager directly.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from services.session_manager import SessionManager
from datetime import datetime, timedelta
import os

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
TEST_DATABASE_NAME = "ctf_platform_test_verify"


async def main():
    print("=" * 60)
    print("Verifying GET /api/sessions endpoint implementation")
    print("=" * 60)
    
    # Connect to MongoDB
    print("\n1. Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URL)
    session_manager = SessionManager(client, database_name=TEST_DATABASE_NAME)
    await session_manager.create_indexes()
    print("✓ Connected to MongoDB")
    
    try:
        # Clean up any existing test sessions
        print("\n2. Cleaning up existing test sessions...")
        sessions = await session_manager.list_sessions()
        for session in sessions:
            await session_manager.delete_session(session.id)
        print(f"✓ Cleaned up {len(sessions)} existing sessions")
        
        # Test 1: Empty list
        print("\n3. Test: list_sessions() with empty database")
        sessions = await session_manager.list_sessions()
        assert isinstance(sessions, list), "Result should be a list"
        assert len(sessions) == 0, "Should return empty list"
        print("✓ Returns empty list when no sessions exist")
        
        # Test 2: Create sessions and verify sorting
        print("\n4. Test: list_sessions() with multiple sessions (sorted by created_at)")
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
        
        await session_manager.create_session(session1_data)
        await session_manager.create_session(session2_data)
        await session_manager.create_session(session3_data)
        print("✓ Created 3 test sessions")
        
        # List sessions and verify sorting
        sessions = await session_manager.list_sessions()
        assert len(sessions) == 3, f"Should return 3 sessions, got {len(sessions)}"
        assert sessions[0].id == "test-session-3", "First session should be newest"
        assert sessions[1].id == "test-session-2", "Second session should be middle"
        assert sessions[2].id == "test-session-1", "Third session should be oldest"
        print("✓ Sessions are sorted by created_at descending (newest first)")
        
        # Verify all fields are present
        print("\n5. Test: Verify all required fields are present")
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
        print("✓ All required fields are present in session objects")
        
        # Test 3: Session with error status
        print("\n6. Test: Session with error status and error message")
        error_session_data = {
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
        await session_manager.create_session(error_session_data)
        
        sessions = await session_manager.list_sessions()
        error_session = next((s for s in sessions if s.id == "test-session-error"), None)
        assert error_session is not None, "Error session should be in list"
        assert error_session.status == "error", "Status should be 'error'"
        assert error_session.error_message == "Failed to create VM: Azure quota exceeded"
        print("✓ Sessions with error status include error messages")
        
        # Test 4: Session with VM IP
        print("\n7. Test: Session with VM IP")
        ip_session_data = {
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
        await session_manager.create_session(ip_session_data)
        
        sessions = await session_manager.list_sessions()
        ip_session = next((s for s in sessions if s.id == "test-session-with-ip"), None)
        assert ip_session is not None, "IP session should be in list"
        assert ip_session.vm_ip == "20.30.40.50", "VM IP should be present"
        print("✓ Sessions with VM IP include the IP address")
        
        # Clean up
        print("\n8. Cleaning up test sessions...")
        await session_manager.delete_session("test-session-1")
        await session_manager.delete_session("test-session-2")
        await session_manager.delete_session("test-session-3")
        await session_manager.delete_session("test-session-error")
        await session_manager.delete_session("test-session-with-ip")
        print("✓ Cleaned up all test sessions")
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nThe GET /api/sessions endpoint implementation is correct.")
        print("It uses SessionManager.list_sessions() which:")
        print("  - Returns all sessions from MongoDB")
        print("  - Sorts by created_at descending (newest first)")
        print("  - Includes all required fields")
        print("  - Handles error status and error messages")
        print("  - Includes VM IP when available")
        
    finally:
        # Drop test database and close connection
        await client.drop_database(TEST_DATABASE_NAME)
        client.close()
        print("\n✓ Closed MongoDB connection")


if __name__ == "__main__":
    asyncio.run(main())
