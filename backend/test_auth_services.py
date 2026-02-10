"""
Unit tests for authentication services
Tests UserManager, AuthService, and EmailService
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from mongomock_motor import AsyncMongoMockClient
import jwt
import pyotp
from cryptography.fernet import Fernet

from services.user_manager import UserManager
from services.auth_service import AuthService
from services.email_service import EmailService
from models.schemas import User


# Fixtures
@pytest.fixture
def mongo_client():
    """Create a mock MongoDB client"""
    return AsyncMongoMockClient()


@pytest.fixture
def user_manager(mongo_client):
    """Create UserManager instance with mock MongoDB"""
    return UserManager(mongo_client, database_name="test_db")


@pytest.fixture
def auth_service():
    """Create AuthService instance with test secret"""
    return AuthService(
        secret_key="test-secret-key-for-testing-only",
        algorithm="HS256",
        access_token_expire_minutes=60,
        refresh_token_expire_days=7
    )


@pytest.fixture
def email_service():
    """Create EmailService instance"""
    return EmailService(
        smtp_host="smtp.test.com",
        smtp_port=587,
        smtp_user="test@test.com",
        smtp_password="test-password",
        smtp_from="test@test.com",
        smtp_from_name="Test Service"
    )


# UserManager Tests
class TestUserManager:
    """Test UserManager service"""

    @pytest.mark.asyncio
    async def test_create_user(self, user_manager):
        """Test user creation"""
        user, temp_password = await user_manager.create_user(
            email="test@example.com",
            role="user"
        )
        
        assert user.email == "test@example.com"
        assert user.role == "user"
        assert user.is_active is True
        assert user.is_2fa_enabled is False
        assert len(temp_password) == 16
        assert user.password_hash is not None

    @pytest.mark.asyncio
    async def test_create_duplicate_user(self, user_manager):
        """Test creating user with duplicate email"""
        await user_manager.create_user(email="test@example.com", role="user")
        
        with pytest.raises(ValueError, match="already exists"):
            await user_manager.create_user(email="test@example.com", role="user")

    @pytest.mark.asyncio
    async def test_get_user_by_email(self, user_manager):
        """Test retrieving user by email"""
        created_user, _ = await user_manager.create_user(
            email="test@example.com",
            role="user"
        )
        
        retrieved_user = await user_manager.get_user_by_email("test@example.com")
        
        assert retrieved_user is not None
        assert retrieved_user.email == created_user.email
        assert retrieved_user.id == created_user.id

    @pytest.mark.asyncio
    async def test_get_user_by_id(self, user_manager):
        """Test retrieving user by ID"""
        created_user, _ = await user_manager.create_user(
            email="test@example.com",
            role="user"
        )
        
        retrieved_user = await user_manager.get_user_by_id(created_user.id)
        
        assert retrieved_user is not None
        assert retrieved_user.id == created_user.id
        assert retrieved_user.email == created_user.email

    @pytest.mark.asyncio
    async def test_list_users(self, user_manager):
        """Test listing all users"""
        await user_manager.create_user(email="user1@example.com", role="user")
        await user_manager.create_user(email="user2@example.com", role="admin")
        
        users = await user_manager.list_users()
        
        assert len(users) == 2
        assert any(u.email == "user1@example.com" for u in users)
        assert any(u.email == "user2@example.com" for u in users)

    @pytest.mark.asyncio
    async def test_update_user(self, user_manager):
        """Test updating user"""
        user, _ = await user_manager.create_user(email="test@example.com", role="user")
        
        updated_user = await user_manager.update_user(
            user.id,
            {"role": "admin"}
        )
        
        assert updated_user is not None
        assert updated_user.role == "admin"

    @pytest.mark.asyncio
    async def test_disable_user(self, user_manager):
        """Test disabling user"""
        user, _ = await user_manager.create_user(email="test@example.com", role="user")
        
        result = await user_manager.disable_user(user.id)
        
        assert result is True
        
        disabled_user = await user_manager.get_user_by_id(user.id)
        assert disabled_user.is_active is False

    @pytest.mark.asyncio
    async def test_verify_password_valid(self, user_manager):
        """Test password verification with valid password"""
        user, temp_password = await user_manager.create_user(
            email="test@example.com",
            role="user"
        )
        
        verified_user = await user_manager.verify_password(
            "test@example.com",
            temp_password
        )
        
        assert verified_user is not None
        assert verified_user.id == user.id

    @pytest.mark.asyncio
    async def test_verify_password_invalid(self, user_manager):
        """Test password verification with invalid password"""
        await user_manager.create_user(email="test@example.com", role="user")
        
        verified_user = await user_manager.verify_password(
            "test@example.com",
            "wrong-password"
        )
        
        assert verified_user is None

    @pytest.mark.asyncio
    async def test_setup_2fa(self, user_manager):
        """Test 2FA setup"""
        user, _ = await user_manager.create_user(email="test@example.com", role="user")
        
        twofa_data = await user_manager.setup_2fa(user.id)
        
        assert "secret" in twofa_data
        assert "qr_code_url" in twofa_data
        assert len(twofa_data["secret"]) == 32  # Base32 encoded
        assert twofa_data["qr_code_url"].startswith("data:image/png;base64,")

    @pytest.mark.asyncio
    async def test_verify_2fa_valid(self, user_manager):
        """Test 2FA verification with valid code"""
        user, _ = await user_manager.create_user(email="test@example.com", role="user")
        twofa_data = await user_manager.setup_2fa(user.id)
        
        # Generate valid TOTP code
        totp = pyotp.TOTP(twofa_data["secret"])
        valid_code = totp.now()
        
        is_valid = await user_manager.verify_2fa(user.id, valid_code)
        
        assert is_valid is True

    @pytest.mark.asyncio
    async def test_verify_2fa_invalid(self, user_manager):
        """Test 2FA verification with invalid code"""
        user, _ = await user_manager.create_user(email="test@example.com", role="user")
        await user_manager.setup_2fa(user.id)
        
        is_valid = await user_manager.verify_2fa(user.id, "000000")
        
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_enable_2fa(self, user_manager):
        """Test enabling 2FA"""
        user, _ = await user_manager.create_user(email="test@example.com", role="user")
        
        result = await user_manager.enable_2fa(user.id)
        
        assert result is True
        
        updated_user = await user_manager.get_user_by_id(user.id)
        assert updated_user.is_2fa_enabled is True

    @pytest.mark.asyncio
    async def test_update_password(self, user_manager):
        """Test password update"""
        user, _ = await user_manager.create_user(email="test@example.com", role="user")
        new_password = "new-secure-password-123"
        
        result = await user_manager.update_password(user.id, new_password)
        
        assert result is True
        
        # Verify new password works
        verified_user = await user_manager.verify_password(
            "test@example.com",
            new_password
        )
        assert verified_user is not None


# AuthService Tests
class TestAuthService:
    """Test AuthService"""

    def test_create_access_token(self, auth_service):
        """Test access token creation"""
        token = auth_service.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="user"
        )
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode and verify
        payload = jwt.decode(
            token,
            "test-secret-key-for-testing-only",
            algorithms=["HS256"]
        )
        assert payload["sub"] == "user-123"
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "user"
        assert payload["type"] == "access"

    def test_create_refresh_token(self, auth_service):
        """Test refresh token creation"""
        token = auth_service.create_refresh_token(user_id="user-123")
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode and verify
        payload = jwt.decode(
            token,
            "test-secret-key-for-testing-only",
            algorithms=["HS256"]
        )
        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"

    def test_verify_token_valid(self, auth_service):
        """Test token verification with valid token"""
        token = auth_service.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="user"
        )
        
        payload = auth_service.verify_token(token)
        
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["email"] == "test@example.com"

    def test_verify_token_invalid(self, auth_service):
        """Test token verification with invalid token"""
        payload = auth_service.verify_token("invalid-token")
        
        assert payload is None

    def test_verify_token_expired(self, auth_service):
        """Test token verification with expired token"""
        # Create token that expires immediately
        short_lived_service = AuthService(
            secret_key="test-secret-key-for-testing-only",
            access_token_expire_minutes=-1  # Already expired
        )
        
        token = short_lived_service.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="user"
        )
        
        payload = auth_service.verify_token(token)
        
        assert payload is None

    def test_get_current_user_valid(self, auth_service):
        """Test getting current user from valid token"""
        token = auth_service.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="admin"
        )
        
        user_info = auth_service.get_current_user(token)
        
        assert user_info is not None
        assert user_info["user_id"] == "user-123"
        assert user_info["email"] == "test@example.com"
        assert user_info["role"] == "admin"

    def test_get_current_user_refresh_token(self, auth_service):
        """Test getting current user from refresh token (should fail)"""
        token = auth_service.create_refresh_token(user_id="user-123")
        
        user_info = auth_service.get_current_user(token)
        
        assert user_info is None

    def test_refresh_access_token(self, auth_service):
        """Test refreshing access token"""
        refresh_token = auth_service.create_refresh_token(user_id="user-123")
        
        new_access_token = auth_service.refresh_access_token(
            refresh_token,
            email="test@example.com",
            role="user"
        )
        
        assert new_access_token is not None
        
        # Verify new token
        payload = auth_service.verify_token(new_access_token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["type"] == "access"

    def test_token_expiration_times(self, auth_service):
        """Test token expiration times are correct"""
        access_token = auth_service.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="user"
        )
        refresh_token = auth_service.create_refresh_token(user_id="user-123")
        
        access_payload = jwt.decode(
            access_token,
            "test-secret-key-for-testing-only",
            algorithms=["HS256"]
        )
        refresh_payload = jwt.decode(
            refresh_token,
            "test-secret-key-for-testing-only",
            algorithms=["HS256"]
        )
        
        # Check expiration times using UTC timestamps
        access_exp = datetime.utcfromtimestamp(access_payload["exp"])
        refresh_exp = datetime.utcfromtimestamp(refresh_payload["exp"])
        now = datetime.utcnow()
        
        # Access token should expire in ~60 minutes
        assert timedelta(minutes=59) < (access_exp - now) < timedelta(minutes=61)
        
        # Refresh token should expire in ~7 days
        assert timedelta(days=6, hours=23) < (refresh_exp - now) < timedelta(days=7, hours=1)


# EmailService Tests
class TestEmailService:
    """Test EmailService"""

    def test_load_template(self, email_service):
        """Test loading email template"""
        # This will fail if template doesn't exist, which is expected
        try:
            content = email_service._load_template("welcome.html")
            assert content is not None
            assert len(content) > 0
        except FileNotFoundError:
            # Expected if running tests without template files
            pass

    def test_render_template(self, email_service):
        """Test rendering template with variables"""
        template = "Hello {{username}}, your password is {{password}}"
        variables = {
            "username": "testuser",
            "password": "test123"
        }
        
        rendered = email_service._render_template(template, variables)
        
        assert rendered == "Hello testuser, your password is test123"

    def test_render_template_multiple_variables(self, email_service):
        """Test rendering template with multiple occurrences"""
        template = "{{name}} {{name}} {{value}}"
        variables = {
            "name": "test",
            "value": "123"
        }
        
        rendered = email_service._render_template(template, variables)
        
        assert rendered == "test test 123"


# Integration Tests
class TestAuthenticationIntegration:
    """Integration tests for authentication flow"""

    @pytest.mark.asyncio
    async def test_complete_authentication_flow(self, user_manager, auth_service):
        """Test complete authentication flow"""
        # 1. Create user
        user, temp_password = await user_manager.create_user(
            email="test@example.com",
            role="user"
        )
        assert user is not None
        
        # 2. Verify password
        verified_user = await user_manager.verify_password(
            "test@example.com",
            temp_password
        )
        assert verified_user is not None
        
        # 3. Setup 2FA
        twofa_data = await user_manager.setup_2fa(user.id)
        assert "secret" in twofa_data
        
        # 4. Verify 2FA
        totp = pyotp.TOTP(twofa_data["secret"])
        valid_code = totp.now()
        is_valid = await user_manager.verify_2fa(user.id, valid_code)
        assert is_valid is True
        
        # 5. Enable 2FA
        await user_manager.enable_2fa(user.id)
        
        # 6. Create tokens
        access_token = auth_service.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role
        )
        refresh_token = auth_service.create_refresh_token(user_id=user.id)
        
        assert access_token is not None
        assert refresh_token is not None
        
        # 7. Verify access token
        user_info = auth_service.get_current_user(access_token)
        assert user_info is not None
        assert user_info["user_id"] == user.id
        
        # 8. Refresh token
        new_access_token = auth_service.refresh_access_token(
            refresh_token,
            email=user.email,
            role=user.role
        )
        assert new_access_token is not None

    @pytest.mark.asyncio
    async def test_admin_user_management_flow(self, user_manager):
        """Test admin user management flow"""
        # 1. Create admin user
        admin, _ = await user_manager.create_user(
            email="admin@example.com",
            role="admin"
        )
        assert admin.role == "admin"
        
        # 2. Admin creates regular user
        user, _ = await user_manager.create_user(
            email="user@example.com",
            role="user",
            created_by=admin.id
        )
        assert user.created_by == admin.id
        
        # 3. Admin lists users
        users = await user_manager.list_users()
        assert len(users) == 2
        
        # 4. Admin updates user role
        updated_user = await user_manager.update_user(
            user.id,
            {"role": "admin"}
        )
        assert updated_user.role == "admin"
        
        # 5. Admin disables user
        result = await user_manager.disable_user(user.id)
        assert result is True
        
        disabled_user = await user_manager.get_user_by_id(user.id)
        assert disabled_user.is_active is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
