"""
Test User model and MongoDB users collection
"""
import pytest
import asyncio
from datetime import datetime
from models.schemas import User
from database.mongodb import connect_to_mongo, create_indexes, close_mongo_connection, get_database


@pytest.mark.asyncio
async def test_user_model_creation():
    """Test that User model can be created with all required fields"""
    user = User(
        email="test@example.com",
        password_hash="hashed_password_here",
        role="user",
        is_2fa_enabled=False,
        is_active=True
    )
    
    assert user.email == "test@example.com"
    assert user.password_hash == "hashed_password_here"
    assert user.role == "user"
    assert user.is_2fa_enabled is False
    assert user.is_active is True
    assert user.totp_secret is None
    assert user.last_login is None
    assert user.created_by is None
    assert isinstance(user.created_at, datetime)
    assert user.id is not None  # UUID should be auto-generated


@pytest.mark.asyncio
async def test_user_model_email_validation():
    """Test that User model validates email format"""
    # Valid email should work
    user = User(
        email="valid@example.com",
        password_hash="hashed_password"
    )
    assert user.email == "valid@example.com"
    
    # Invalid email should raise ValueError
    with pytest.raises(ValueError, match="Invalid email address format"):
        User(
            email="invalid-email",
            password_hash="hashed_password"
        )


@pytest.mark.asyncio
async def test_user_model_email_lowercase():
    """Test that User model converts email to lowercase"""
    user = User(
        email="TEST@EXAMPLE.COM",
        password_hash="hashed_password"
    )
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_user_model_admin_role():
    """Test that User model can be created with admin role"""
    user = User(
        email="admin@example.com",
        password_hash="hashed_password",
        role="admin"
    )
    assert user.role == "admin"


@pytest.mark.asyncio
async def test_user_model_with_2fa():
    """Test that User model can store 2FA information"""
    user = User(
        email="user@example.com",
        password_hash="hashed_password",
        is_2fa_enabled=True,
        totp_secret="encrypted_secret_here"
    )
    assert user.is_2fa_enabled is True
    assert user.totp_secret == "encrypted_secret_here"


@pytest.mark.asyncio
async def test_user_model_with_created_by():
    """Test that User model can track who created the user"""
    admin_id = "admin-uuid-123"
    user = User(
        email="user@example.com",
        password_hash="hashed_password",
        created_by=admin_id
    )
    assert user.created_by == admin_id


@pytest.mark.asyncio
async def test_mongodb_users_collection_indexes():
    """Test that users collection indexes are created correctly"""
    try:
        # Connect to MongoDB
        await connect_to_mongo()
        
        # Create indexes
        await create_indexes()
        
        # Get database and users collection
        db = get_database()
        users_collection = db["users"]
        
        # Get index information
        indexes = await users_collection.index_information()
        
        # Verify email unique index exists
        assert "idx_email_unique" in indexes
        assert indexes["idx_email_unique"]["unique"] is True
        assert indexes["idx_email_unique"]["key"] == [("email", 1)]
        
        # Verify is_active index exists
        assert "idx_is_active" in indexes
        assert indexes["idx_is_active"]["key"] == [("is_active", 1)]
        
        print("✓ Users collection indexes verified successfully")
        
    finally:
        # Clean up
        await close_mongo_connection()


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])
