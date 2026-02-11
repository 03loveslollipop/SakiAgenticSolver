"""
Unit tests for AuthService.
Tests JWT token generation, verification, and user extraction.
"""

import pytest
import jwt
from datetime import datetime, timedelta
import time

from services.auth_service import AuthService


@pytest.fixture
def auth_service():
    """Create AuthService instance with test secret"""
    return AuthService(secret_key="test-secret-key-for-testing-only")


def test_create_access_token(auth_service):
    """Test access token creation"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "user"
    
    token = auth_service.create_access_token(user_id, email, role)
    
    # Verify token is a string
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Decode and verify payload
    payload = jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["role"] == role
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "iat" in payload


def test_create_refresh_token(auth_service):
    """Test refresh token creation"""
    user_id = "test-user-123"
    
    token = auth_service.create_refresh_token(user_id)
    
    # Verify token is a string
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Decode and verify payload
    payload = jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"
    assert "exp" in payload
    assert "iat" in payload


def test_verify_valid_token(auth_service):
    """Test verification of valid token"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "admin"
    
    token = auth_service.create_access_token(user_id, email, role)
    payload = auth_service.verify_token(token)
    
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["role"] == role


def test_verify_invalid_token(auth_service):
    """Test verification of invalid token"""
    invalid_token = "invalid.token.here"
    
    payload = auth_service.verify_token(invalid_token)
    
    assert payload is None


def test_verify_expired_token(auth_service):
    """Test verification of expired token"""
    # Create token that expires immediately
    auth_service_short = AuthService(
        secret_key="test-secret-key",
        access_token_expire_minutes=0  # Expires immediately
    )
    
    token = auth_service_short.create_access_token("user-123", "test@example.com", "user")
    
    # Wait a moment to ensure expiration
    time.sleep(1)
    
    payload = auth_service_short.verify_token(token)
    
    assert payload is None


def test_get_current_user_from_access_token(auth_service):
    """Test extracting user info from access token"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "user"
    
    token = auth_service.create_access_token(user_id, email, role)
    user_info = auth_service.get_current_user(token)
    
    assert user_info is not None
    assert user_info["user_id"] == user_id
    assert user_info["email"] == email
    assert user_info["role"] == role


def test_get_current_user_from_refresh_token(auth_service):
    """Test that refresh token cannot be used to get current user"""
    user_id = "test-user-123"
    
    token = auth_service.create_refresh_token(user_id)
    user_info = auth_service.get_current_user(token)
    
    # Should return None because it's not an access token
    assert user_info is None


def test_get_current_user_invalid_token(auth_service):
    """Test getting user from invalid token"""
    user_info = auth_service.get_current_user("invalid.token")
    
    assert user_info is None


def test_refresh_access_token(auth_service):
    """Test refreshing access token using refresh token"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "admin"
    
    # Create refresh token
    refresh_token = auth_service.create_refresh_token(user_id)
    
    # Use refresh token to get new access token
    new_access_token = auth_service.refresh_access_token(refresh_token, email, role)
    
    assert new_access_token is not None
    
    # Verify new access token
    payload = auth_service.verify_token(new_access_token)
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["role"] == role
    assert payload["type"] == "access"


def test_refresh_with_access_token_fails(auth_service):
    """Test that access token cannot be used to refresh"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "user"
    
    # Create access token (not refresh token)
    access_token = auth_service.create_access_token(user_id, email, role)
    
    # Try to use it as refresh token
    new_token = auth_service.refresh_access_token(access_token, email, role)
    
    # Should return None because it's not a refresh token
    assert new_token is None


def test_token_with_additional_claims(auth_service):
    """Test creating token with additional claims"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "user"
    additional_claims = {
        "custom_field": "custom_value",
        "session_id": "session-123"
    }
    
    token = auth_service.create_access_token(user_id, email, role, additional_claims)
    payload = auth_service.verify_token(token)
    
    assert payload["custom_field"] == "custom_value"
    assert payload["session_id"] == "session-123"


def test_decode_without_verification(auth_service):
    """Test decoding token without verification (for debugging)"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "user"
    
    token = auth_service.create_access_token(user_id, email, role)
    
    # Decode without verification
    payload = auth_service.decode_token_without_verification(token)
    
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email


def test_token_expiration_times(auth_service):
    """Test that tokens have correct expiration times"""
    user_id = "test-user-123"
    email = "test@example.com"
    role = "user"
    
    # Create tokens
    access_token = auth_service.create_access_token(user_id, email, role)
    refresh_token = auth_service.create_refresh_token(user_id)
    
    # Decode tokens
    access_payload = jwt.decode(access_token, "test-secret-key-for-testing-only", algorithms=["HS256"])
    refresh_payload = jwt.decode(refresh_token, "test-secret-key-for-testing-only", algorithms=["HS256"])
    
    # Check expiration times
    access_exp = datetime.fromtimestamp(access_payload["exp"])
    refresh_exp = datetime.fromtimestamp(refresh_payload["exp"])
    now = datetime.utcnow()
    
    # Access token should expire in ~60 minutes
    access_delta = (access_exp - now).total_seconds()
    assert 3500 < access_delta < 3700  # ~60 minutes (with some tolerance)
    
    # Refresh token should expire in ~7 days
    refresh_delta = (refresh_exp - now).total_seconds()
    assert 604000 < refresh_delta < 605000  # ~7 days (with some tolerance)


def test_auth_service_requires_secret_key():
    """Test that AuthService requires a secret key"""
    # Should raise ValueError if no secret key provided
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        AuthService(secret_key=None)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
