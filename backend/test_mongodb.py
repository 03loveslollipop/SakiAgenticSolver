#!/usr/bin/env python3
"""Test script to verify MongoDB connection and operations"""

import asyncio
from database import connect_to_mongo, close_mongo_connection, get_database, create_indexes
from models import Session, KeyPair
from datetime import datetime


async def test_connection():
    """Test MongoDB connection"""
    print("\n=== Testing MongoDB Connection ===")
    try:
        await connect_to_mongo()
        print("✓ Connected to MongoDB")
        return True
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        return False


async def test_indexes():
    """Test index creation"""
    print("\n=== Testing Index Creation ===")
    try:
        await create_indexes()
        print("✓ Indexes created successfully")
        return True
    except Exception as e:
        print(f"✗ Failed to create indexes: {e}")
        return False


async def test_session_operations():
    """Test session CRUD operations"""
    print("\n=== Testing Session Operations ===")
    
    db = get_database()
    sessions_collection = db["sessions"]
    
    # Create a session
    session = Session(
        vm_size='medium',
        agent_type='copilot',
        agent_model='gpt-4',
        challenge_urls=['http://example.com/challenge1.bin'],
        instructions='Test challenge instructions',
        resource_group='test-rg-001'
    )
    
    # Convert to dict for MongoDB (using alias for _id)
    session_dict = session.dict(by_alias=True)
    
    # Insert into MongoDB
    result = await sessions_collection.insert_one(session_dict)
    print(f"✓ Session created with ID: {result.inserted_id}")
    
    # Retrieve from MongoDB
    retrieved = await sessions_collection.find_one({"_id": result.inserted_id})
    if retrieved:
        print(f"✓ Session retrieved: {retrieved['_id']}")
        print(f"  VM Size: {retrieved['vm_size']}")
        print(f"  Agent: {retrieved['agent_type']}/{retrieved['agent_model']}")
        print(f"  Status: {retrieved['status']}")
    else:
        print("✗ Failed to retrieve session")
        return False
    
    # List all sessions
    cursor = sessions_collection.find().sort("created_at", -1)
    sessions = await cursor.to_list(length=100)
    print(f"✓ Found {len(sessions)} session(s) in database")
    
    # Update session status
    update_result = await sessions_collection.update_one(
        {"_id": result.inserted_id},
        {"$set": {"status": "running"}}
    )
    print(f"✓ Updated session status (modified: {update_result.modified_count})")
    
    # Delete session
    delete_result = await sessions_collection.delete_one({"_id": result.inserted_id})
    print(f"✓ Deleted session (deleted: {delete_result.deleted_count})")
    
    return True


async def test_keypair_operations():
    """Test SSH key pair operations"""
    print("\n=== Testing KeyPair Operations ===")
    
    db = get_database()
    keys_collection = db["ssh_keys"]
    
    # Create a key pair
    keypair = KeyPair(
        session_id="test-session-123",
        public_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...",
        private_key="-----BEGIN RSA PRIVATE KEY-----\n..."
    )
    
    # Insert into MongoDB
    keypair_dict = keypair.dict()
    result = await keys_collection.insert_one(keypair_dict)
    print(f"✓ KeyPair created for session: {keypair.session_id}")
    
    # Retrieve by session_id
    retrieved = await keys_collection.find_one({"session_id": keypair.session_id})
    if retrieved:
        print(f"✓ KeyPair retrieved for session: {retrieved['session_id']}")
    else:
        print("✗ Failed to retrieve keypair")
        return False
    
    # Delete keypair
    delete_result = await keys_collection.delete_one({"session_id": keypair.session_id})
    print(f"✓ Deleted keypair (deleted: {delete_result.deleted_count})")
    
    return True


async def main():
    """Run all tests"""
    print("Testing CTF Platform MongoDB Setup")
    print("=" * 50)
    
    try:
        # Test connection
        if not await test_connection():
            return
        
        # Test indexes
        if not await test_indexes():
            return
        
        # Test session operations
        if not await test_session_operations():
            return
        
        # Test keypair operations
        if not await test_keypair_operations():
            return
        
        print("\n" + "=" * 50)
        print("All tests completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n✗ Error during testing: {e}")
        raise
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
