"""
Unit tests for UserManager service using mocking.
Tests all functionality without requiring MongoDB connection.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import pyotp

from services.user_manager import UserManager
from models.schemas import User


@pytest.fixture
def mock_mongo_client():
    """Create a mock MongoDB client"""
    client = MagicMock()
    db = MagicMock()
    users_collection = MagicMock()
    
    client.__getitem__ = MagicMock(return_value=db)
    db.__getitem__ = MagicMock(return_value=users_collection)
    
    return client, users_collection


@pytest.fixture
def user_manager(mock_mongo_client):
    """Create UserManager instance with mocked MongoDB"""
    client, _ = mock_mongo_client
    return UserManager(client, "test_db")


@pytest.mark.asyncio
async def test_create_user(user_manager, mock_mongo_client):
    """Test user creation with password generation"""
    _, users_collection = mock_mongo_client
    
    # Mock find_one to return None (user doesn't exist)
    users_collection.find_one = AsyncMock(return_value=None)
    users_collection.insert_one = AsyncMock()
    
    # Create user
    user, temp_password = await user_manager.create_user(
        email="test@example.com",
        role="user"
    )
    
    # Verify user object
    assert user.email == "test@example.com"
    assert user.role == "user"
    assert user.is_active is True
    assert user.is_2fa_enabled is False
    assert len(user.id) > 0
    
    # Verify password
    assert len(temp_password) >= 12
    assert any(c.isupper() for c in temp_password)
    assert any(c.islower() for c in temp_password)
    assert any(c.isdigit() for c in temp_password)
    assert any(c in "!@#$%^&*" for c in temp_password)
    
    # Verify insert was called
    users_collection.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_create_user_duplicate_email(user_manager, mock_mongo_client):
    """Test that duplicate email is rejected"""
    _, users_collection = mock_mongo_client
    
    # Mock find_one to return existing user
    users_collection.find_one = AsyncMock(return_value={"email": "test@example.com"})
    
    # Should raise ValueError
    with pytest.raises(ValueError, match="already exists"):
        await user_manager.create_user(email="test@example.com")


@pytest.mark.asyncio
async def test_get_user_by_email(user_manager, mock_mongo_client):
    """Test retrieving user by email"""
    _, users_collection = mock_mongo_client
    
    # Mock user document
    user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": "hashed",
        "role": "user",
        "is_2fa_enabled": False,
        "totp_secret": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=user_doc)
    
    # Get user
    user = await user_manager.get_user_by_email("test@example.com")
    
    assert user is not None
    assert user.email == "test@example.com"
    assert user.role == "user"
    
    # Verify query was made with lowercase email
    users_collection.find_one.assert_called_once_with({"email": "test@example.com"})


@pytest.mark.asyncio
async def test_get_user_by_email_not_found(user_manager, mock_mongo_client):
    """Test retrieving non-existent user"""
    _, users_collection = mock_mongo_client
    
    users_collection.find_one = AsyncMock(return_value=None)
    
    user = await user_manager.get_user_by_email("notfound@example.com")
    
    assert user is None


@pytest.mark.asyncio
async def test_verify_password_success(user_manager, mock_mongo_client):
    """Test successful password verification"""
    _, users_collection = mock_mongo_client
    
    # Create a real password hash
    from passlib.hash import bcrypt
    password = "TestPassword123!"
    password_hash = bcrypt.hash(password)
    
    user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": password_hash,
        "role": "user",
        "is_2fa_enabled": False,
        "totp_secret": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=user_doc)
    users_collection.update_one = AsyncMock()
    
    # Verify password
    user = await user_manager.verify_password("test@example.com", password)
    
    assert user is not None
    assert user.email == "test@example.com"
    
    # Verify last_login was updated
    users_collection.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_password_wrong_password(user_manager, mock_mongo_client):
    """Test password verification with wrong password"""
    _, users_collection = mock_mongo_client
    
    from passlib.hash import bcrypt
    password_hash = bcrypt.hash("CorrectPassword123!")
    
    user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": password_hash,
        "role": "user",
        "is_2fa_enabled": False,
        "totp_secret": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=user_doc)
    
    # Verify with wrong password
    user = await user_manager.verify_password("test@example.com", "WrongPassword123!")
    
    assert user is None


@pytest.mark.asyncio
async def test_verify_password_inactive_user(user_manager, mock_mongo_client):
    """Test that inactive users cannot login"""
    _, users_collection = mock_mongo_client
    
    from passlib.hash import bcrypt
    password = "TestPassword123!"
    password_hash = bcrypt.hash(password)
    
    user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": password_hash,
        "role": "user",
        "is_2fa_enabled": False,
        "totp_secret": None,
        "is_active": False,  # Inactive
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=user_doc)
    
    # Should return None for inactive user
    user = await user_manager.verify_password("test@example.com", password)
    
    assert user is None


@pytest.mark.asyncio
async def test_setup_2fa(user_manager, mock_mongo_client):
    """Test 2FA setup with QR code generation"""
    _, users_collection = mock_mongo_client
    
    user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": "hashed",
        "role": "user",
        "is_2fa_enabled": False,
        "totp_secret": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=user_doc)
    users_collection.update_one = AsyncMock()
    
    # Setup 2FA
    result = await user_manager.setup_2fa("test-id")
    
    # Verify result
    assert "secret" in result
    assert "qr_code_url" in result
    assert len(result["secret"]) == 32  # Base32 secret
    assert result["qr_code_url"].startswith("data:image/png;base64,")
    
    # Verify secret was stored (encrypted)
    users_collection.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_verify_2fa_valid_code(user_manager, mock_mongo_client):
    """Test 2FA verification with valid code"""
    _, users_collection = mock_mongo_client
    
    # Generate a real TOTP secret and code
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    
    # Encrypt the secret
    encrypted_secret = user_manager._encrypt_secret(secret)
    
    user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": "hashed",
        "role": "user",
        "is_2fa_enabled": False,
        "totp_secret": encrypted_secret,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=user_doc)
    
    # Verify code
    is_valid = await user_manager.verify_2fa("test-id", valid_code)
    
    assert is_valid is True


@pytest.mark.asyncio
async def test_verify_2fa_invalid_code(user_manager, mock_mongo_client):
    """Test 2FA verification with invalid code"""
    _, users_collection = mock_mongo_client
    
    secret = pyotp.random_base32()
    encrypted_secret = user_manager._encrypt_secret(secret)
    
    user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": "hashed",
        "role": "user",
        "is_2fa_enabled": False,
        "totp_secret": encrypted_secret,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=user_doc)
    
    # Verify with invalid code
    is_valid = await user_manager.verify_2fa("test-id", "000000")
    
    assert is_valid is False


@pytest.mark.asyncio
async def test_enable_2fa(user_manager, mock_mongo_client):
    """Test enabling 2FA after verification"""
    _, users_collection = mock_mongo_client
    
    result = MagicMock()
    result.matched_count = 1
    users_collection.update_one = AsyncMock(return_value=result)
    
    # Enable 2FA
    success = await user_manager.enable_2fa("test-id")
    
    assert success is True
    users_collection.update_one.assert_called_once_with(
        {"_id": "test-id"},
        {"$set": {"is_2fa_enabled": True}}
    )


@pytest.mark.asyncio
async def test_list_users(user_manager, mock_mongo_client):
    """Test listing all users"""
    _, users_collection = mock_mongo_client
    
    # Mock cursor
    user_docs = [
        {
            "_id": "user1",
            "email": "user1@example.com",
            "password_hash": "hashed",
            "role": "user",
            "is_2fa_enabled": False,
            "totp_secret": None,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "created_by": None
        },
        {
            "_id": "user2",
            "email": "user2@example.com",
            "password_hash": "hashed",
            "role": "admin",
            "is_2fa_enabled": True,
            "totp_secret": "encrypted",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "created_by": None
        }
    ]
    
    # Create async iterator mock
    async def async_iter():
        for doc in user_docs:
            yield doc
    
    mock_cursor = MagicMock()
    mock_cursor.__aiter__ = lambda self: async_iter()
    users_collection.find = MagicMock(return_value=mock_cursor)
    
    # List users
    users = await user_manager.list_users()
    
    assert len(users) == 2
    assert users[0].email == "user1@example.com"
    assert users[1].email == "user2@example.com"
    assert users[1].role == "admin"


@pytest.mark.asyncio
async def test_update_user(user_manager, mock_mongo_client):
    """Test updating user fields"""
    _, users_collection = mock_mongo_client
    
    result = MagicMock()
    result.matched_count = 1
    users_collection.update_one = AsyncMock(return_value=result)
    
    updated_user_doc = {
        "_id": "test-id",
        "email": "test@example.com",
        "password_hash": "hashed",
        "role": "admin",  # Updated
        "is_2fa_enabled": False,
        "totp_secret": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "created_by": None
    }
    
    users_collection.find_one = AsyncMock(return_value=updated_user_doc)
    
    # Update user
    user = await user_manager.update_user("test-id", {"role": "admin"})
    
    assert user is not None
    assert user.role == "admin"
    users_collection.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_disable_user(user_manager, mock_mongo_client):
    """Test disabling user account"""
    _, users_collection = mock_mongo_client
    
    result = MagicMock()
    result.matched_count = 1
    users_collection.update_one = AsyncMock(return_value=result)
    
    # Disable user
    success = await user_manager.disable_user("test-id")
    
    assert success is True
    users_collection.update_one.assert_called_once_with(
        {"_id": "test-id"},
        {"$set": {"is_active": False}}
    )


@pytest.mark.asyncio
async def test_update_password(user_manager, mock_mongo_client):
    """Test password update"""
    _, users_collection = mock_mongo_client
    
    result = MagicMock()
    result.matched_count = 1
    users_collection.update_one = AsyncMock(return_value=result)
    
    # Update password
    success = await user_manager.update_password("test-id", "NewPassword123!")
    
    assert success is True
    users_collection.update_one.assert_called_once()
    
    # Verify the password was hashed
    call_args = users_collection.update_one.call_args
    assert "$set" in call_args[0][1]
    assert "password_hash" in call_args[0][1]["$set"]


def test_password_generation():
    """Test password generation meets requirements"""
    user_manager = UserManager(MagicMock(), "test_db")
    
    # Generate multiple passwords
    for _ in range(10):
        password = user_manager._generate_password()
        
        # Check length
        assert len(password) >= 12
        
        # Check character types
        assert any(c.isupper() for c in password), "Missing uppercase"
        assert any(c.islower() for c in password), "Missing lowercase"
        assert any(c.isdigit() for c in password), "Missing digit"
        assert any(c in "!@#$%^&*" for c in password), "Missing special char"


def test_encryption_decryption():
    """Test 2FA secret encryption and decryption"""
    user_manager = UserManager(MagicMock(), "test_db")
    
    secret = "JBSWY3DPEHPK3PXP"
    
    # Encrypt
    encrypted = user_manager._encrypt_secret(secret)
    assert encrypted != secret
    
    # Decrypt
    decrypted = user_manager._decrypt_secret(encrypted)
    assert decrypted == secret


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
