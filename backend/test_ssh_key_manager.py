# Unit tests for SSHKeyManager

import pytest
import pytest_asyncio
from services.ssh_key_manager import SSHKeyManager
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
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
async def ssh_key_manager(mongo_client):
    """Create SSHKeyManager instance for testing"""
    manager = SSHKeyManager(mongo_client, database_name=TEST_DATABASE_NAME)
    await manager.create_indexes()
    return manager


@pytest.mark.asyncio
async def test_generate_key_pair(ssh_key_manager):
    """Test SSH key pair generation"""
    session_id = "test-session-1"
    
    result = await ssh_key_manager.generate_key_pair(session_id)
    
    assert result["session_id"] == session_id
    assert "public_key" in result
    assert result["public_key"].startswith("ssh-rsa ")


@pytest.mark.asyncio
async def test_generate_key_pair_duplicate(ssh_key_manager):
    """Test that generating duplicate key pair raises error"""
    session_id = "test-session-2"
    
    await ssh_key_manager.generate_key_pair(session_id)
    
    with pytest.raises(ValueError, match="already exists"):
        await ssh_key_manager.generate_key_pair(session_id)


@pytest.mark.asyncio
async def test_get_public_key(ssh_key_manager):
    """Test retrieving public key"""
    session_id = "test-session-3"
    
    result = await ssh_key_manager.generate_key_pair(session_id)
    public_key = await ssh_key_manager.get_public_key(session_id)
    
    assert public_key == result["public_key"]
    assert public_key.startswith("ssh-rsa ")


@pytest.mark.asyncio
async def test_get_public_key_not_found(ssh_key_manager):
    """Test retrieving public key for non-existent session"""
    with pytest.raises(ValueError, match="not found"):
        await ssh_key_manager.get_public_key("non-existent-session")


@pytest.mark.asyncio
async def test_get_private_key(ssh_key_manager):
    """Test retrieving and decrypting private key"""
    session_id = "test-session-4"
    
    await ssh_key_manager.generate_key_pair(session_id)
    private_key_pem = await ssh_key_manager.get_private_key(session_id)
    
    # Verify it's a valid PEM format private key
    assert "-----BEGIN RSA PRIVATE KEY-----" in private_key_pem
    assert "-----END RSA PRIVATE KEY-----" in private_key_pem
    
    # Verify we can load it with cryptography library
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(),
        password=None,
        backend=default_backend()
    )
    assert private_key is not None


@pytest.mark.asyncio
async def test_get_private_key_not_found(ssh_key_manager):
    """Test retrieving private key for non-existent session"""
    with pytest.raises(ValueError, match="not found"):
        await ssh_key_manager.get_private_key("non-existent-session")


@pytest.mark.asyncio
async def test_delete_key_pair(ssh_key_manager):
    """Test deleting key pair"""
    session_id = "test-session-5"
    
    await ssh_key_manager.generate_key_pair(session_id)
    result = await ssh_key_manager.delete_key_pair(session_id)
    
    assert result is True
    
    # Verify key is deleted
    with pytest.raises(ValueError, match="not found"):
        await ssh_key_manager.get_public_key(session_id)


@pytest.mark.asyncio
async def test_delete_key_pair_not_found(ssh_key_manager):
    """Test deleting non-existent key pair"""
    result = await ssh_key_manager.delete_key_pair("non-existent-session")
    assert result is False


@pytest.mark.asyncio
async def test_key_encryption_decryption(ssh_key_manager):
    """Test that private key encryption/decryption works correctly"""
    session_id = "test-session-6"
    
    # Generate key pair
    await ssh_key_manager.generate_key_pair(session_id)
    
    # Get private key (this decrypts it)
    private_key_pem = await ssh_key_manager.get_private_key(session_id)
    
    # Verify the decrypted key is valid
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(),
        password=None,
        backend=default_backend()
    )
    
    # Get public key
    public_key_openssh = await ssh_key_manager.get_public_key(session_id)
    
    # Derive public key from private key and verify they match
    derived_public_key = private_key.public_key()
    derived_public_key_openssh = derived_public_key.public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH
    ).decode()
    
    assert derived_public_key_openssh == public_key_openssh


@pytest.mark.asyncio
async def test_unique_index_enforcement(ssh_key_manager):
    """Test that unique index on session_id is enforced"""
    session_id = "test-session-7"
    
    await ssh_key_manager.generate_key_pair(session_id)
    
    # Try to insert another key pair with same session_id directly
    # This should fail due to unique index
    with pytest.raises(ValueError, match="already exists"):
        await ssh_key_manager.generate_key_pair(session_id)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
