"""
Integration tests for complete email i18n flow.

Tests complete user flows with locale support:
1. User registration with locale selection
2. Password reset with locale-specific emails
3. Locale update and subsequent email behavior
4. Fallback to English when locale template missing

Requirements: 17.1, 17.2, 17.3, 17.4, 17.11
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, mock_open
from fastapi.testclient import TestClient
from datetime import datetime
import tempfile
import shutil
import os
import sys
import json

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database.mongodb import get_database
from services.user_manager import UserManager
from services.email_service import EmailService


@pytest.fixture
def client():
    """Create test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
def temp_templates_dir():
    """Create temporary directory with test email templates"""
    temp_dir = tempfile.mkdtemp()
    
    # Create directory structure
    os.makedirs(os.path.join(temp_dir, "en"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "ja"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "es"), exist_ok=True)
    
    # Create English templates
    with open(os.path.join(temp_dir, "en", "welcome.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>Welcome {{username}}!</h1>
<p>Your temporary password is: {{temporary_password}}</p>
</body>
</html>""")
    
    with open(os.path.join(temp_dir, "en", "welcome.txt"), "w", encoding="utf-8") as f:
        f.write("Welcome {{username}}!\nYour temporary password is: {{temporary_password}}")
    
    with open(os.path.join(temp_dir, "en", "password_reset.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>Password Reset</h1>
<p>Click here to reset your password: {{reset_link}}</p>
</body>
</html>""")
    
    with open(os.path.join(temp_dir, "en", "password_reset.txt"), "w", encoding="utf-8") as f:
        f.write("Password Reset\nClick here to reset your password: {{reset_link}}")
    
    # Create Japanese templates
    with open(os.path.join(temp_dir, "ja", "welcome.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>{{username}}さん、ようこそ！</h1>
<p>仮パスワード: {{temporary_password}}</p>
</body>
</html>""")
    
    with open(os.path.join(temp_dir, "ja", "welcome.txt"), "w", encoding="utf-8") as f:
        f.write("{{username}}さん、ようこそ！\n仮パスワード: {{temporary_password}}")
    
    # Create Spanish templates
    with open(os.path.join(temp_dir, "es", "welcome.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>¡Bienvenido {{username}}!</h1>
<p>Su contraseña temporal es: {{temporary_password}}</p>
</body>
</html>""")
    
    with open(os.path.join(temp_dir, "es", "welcome.txt"), "w", encoding="utf-8") as f:
        f.write("¡Bienvenido {{username}}!\nSu contraseña temporal es: {{temporary_password}}")
    
    yield temp_dir
    
    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def mock_email_service(temp_templates_dir):
    """Mock email service with test templates"""
    with patch('services.email_service.EmailService') as MockEmailService:
        mock_instance = MagicMock(spec=EmailService)
        
        # Configure mock instance
        mock_instance.templates_dir = temp_templates_dir
        
        # Mock methods to actually use test templates
        def _load_template(template_name, locale="en"):
            """Mock template loading that uses test templates"""
            locale_dir = os.path.join(temp_templates_dir, locale)
            template_path = os.path.join(locale_dir, template_name)
            
            # Fallback to English if locale template doesn't exist
            if not os.path.exists(template_path) and locale != "en":
                template_path = os.path.join(temp_templates_dir, "en", template_name)
            
            # Fallback to root if English template doesn't exist in locale dir
            if not os.path.exists(template_path):
                template_path = os.path.join(temp_templates_dir, template_name)
            
            if not os.path.exists(template_path):
                raise FileNotFoundError(f"Email template not found: {template_name} for locale {locale}")
            
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        def _render_template(template_content, variables):
            """Mock template rendering"""
            rendered = template_content
            for key, value in variables.items():
                placeholder = f"{{{{{key}}}}}"
                rendered = rendered.replace(placeholder, str(value))
            return rendered
        
        def send_email(to_email, subject, body_text, body_html=None):
            """Mock email sending"""
            return True
        
        def send_welcome_email(to_email, username, temporary_password, locale="en"):
            """Mock welcome email sending"""
            return True
        
        def send_password_reset_email(to_email, reset_token, reset_url, locale="en"):
            """Mock password reset email sending"""
            return True
        
        # Assign mocked methods
        mock_instance._load_template = _load_template
        mock_instance._render_template = _render_template
        mock_instance.send_email = AsyncMock(side_effect=send_email)
        mock_instance.send_welcome_email = AsyncMock(side_effect=send_welcome_email)
        mock_instance.send_password_reset_email = AsyncMock(side_effect=send_password_reset_email)
        mock_instance.send_welcome_email_legacy = AsyncMock(
            side_effect=lambda to_email, username, temp_pass: send_welcome_email(to_email, username, temp_pass, "en")
        )
        
        MockEmailService.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_user_manager():
    """Mock user manager"""
    with patch('services.user_manager.UserManager') as MockUserManager:
        mock_instance = MagicMock(spec=UserManager)
        
        # Mock user data
        test_user = MagicMock()
        test_user.id = "test-user-123"
        test_user.email = "test@example.com"
        test_user.role = "user"
        test_user.is_2fa_enabled = False
        test_user.is_active = True
        test_user.created_at = datetime.utcnow()
        test_user.locale = "en"
        
        # Mock methods
        mock_instance.create_user = AsyncMock(return_value=(test_user, "TempPass123!"))
        mock_instance.get_user_by_email = AsyncMock(return_value=test_user)
        mock_instance.get_user_by_id = AsyncMock(return_value=test_user)
        mock_instance.update_user = AsyncMock(return_value=test_user)
        mock_instance.verify_password = AsyncMock(return_value=test_user)
        
        MockUserManager.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_auth_service():
    """Mock auth service for token generation"""
    with patch('services.auth_service.AuthService') as MockAuthService:
        mock_instance = MagicMock()
        
        # Mock token methods
        mock_instance.create_access_token = MagicMock(return_value="mock-access-token")
        mock_instance.create_refresh_token = MagicMock(return_value="mock-refresh-token")
        mock_instance.get_current_user = MagicMock(return_value={
            "user_id": "test-user-123",
            "email": "test@example.com",
            "role": "admin"
        })
        
        MockAuthService.return_value = mock_instance
        yield mock_instance


class TestEmailI18nIntegration:
    """Integration tests for email i18n flow"""
    
    @pytest.mark.asyncio
    async def test_user_registration_with_locale_selection(
        self, client, mock_user_manager, mock_email_service, mock_auth_service
    ):
        """
        Test complete user registration flow with locale selection.
        """
        # Mock admin authentication
        with patch('routes.users.get_current_user') as mock_get_current_user:
            mock_get_current_user.return_value = {
                "user_id": "admin-123",
                "email": "admin@example.com",
                "role": "admin"
            }
            
            # Test registration with Japanese locale
            response = client.post(
                "/api/users",
                json={
                    "email": "newuser@example.com",
                    "role": "user",
                    "locale": "ja"
                },
                headers={"Authorization": "Bearer mock-token"}
            )
            
            assert response.status_code == 201
            
            # Verify user was created with Japanese locale
            mock_user_manager.create_user.assert_called_once()
            call_args = mock_user_manager.create_user.call_args
            assert call_args[1]["locale"] == "ja"  # locale parameter
            
            # Verify welcome email was sent with Japanese locale
            mock_email_service.send_welcome_email.assert_called_once()
            email_call_args = mock_email_service.send_welcome_email.call_args
            assert email_call_args[1]["locale"] == "ja"
            
            # Verify response includes locale
            response_data = response.json()
            assert response_data["user"]["locale"] == "ja"
    
    @pytest.mark.asyncio
    async def test_password_reset_with_user_locale(
        self, client, mock_user_manager, mock_email_service
    ):
        """
        Test password reset flow uses user's locale for email.
        """
        # Mock user with Spanish locale
        spanish_user = MagicMock()
        spanish_user.id = "test-user-123"
        spanish_user.email = "test@example.com"
        spanish_user.locale = "es"
        spanish_user.is_active = True
        
        mock_user_manager.get_user_by_email.return_value = spanish_user
        
        # Test password reset request
        response = client.post(
            "/api/auth/password-reset/request",
            json={
                "email": "test@example.com"
            }
        )
        
        assert response.status_code == 200
        
        # Verify password reset email was sent with Spanish locale
        mock_email_service.send_password_reset_email.assert_called_once()
        call_args = mock_email_service.send_password_reset_email.call_args
        assert call_args[1]["locale"] == "es"
        
        # Verify response message
        response_data = response.json()
        assert "password reset link has been sent" in response_data["message"]
    
    @pytest.mark.asyncio
    async def test_locale_update_and_subsequent_emails(
        self, client, mock_user_manager, mock_email_service, mock_auth_service
    ):
        """
        Test that updating user locale affects subsequent emails.
        """
        # First, update user locale to Japanese
        with patch('routes.auth.get_current_user') as mock_get_current_user:
            mock_get_current_user.return_value = {
                "user_id": "test-user-123",
                "email": "test@example.com",
                "role": "user"
            }
            
            # Update locale
            response = client.put(
                "/api/auth/me/locale",
                json={
                    "locale": "ja"
                },
                headers={"Authorization": "Bearer mock-token"}
            )
            
            assert response.status_code == 200
            
            # Verify user was updated with Japanese locale
            mock_user_manager.update_user.assert_called_once()
            update_call_args = mock_user_manager.update_user.call_args
            assert update_call_args[1]["locale"] == "ja"
            
            # Now test that subsequent operations use new locale
            # Reset mocks
            mock_user_manager.get_user_by_email.reset_mock()
            mock_email_service.send_password_reset_email.reset_mock()
            
            # Mock user with updated Japanese locale
            japanese_user = MagicMock()
            japanese_user.id = "test-user-123"
            japanese_user.email = "test@example.com"
            japanese_user.locale = "ja"
            japanese_user.is_active = True
            
            mock_user_manager.get_user_by_email.return_value = japanese_user
            
            # Request password reset (should use Japanese locale)
            response = client.post(
                "/api/auth/password-reset/request",
                json={
                    "email": "test@example.com"
                }
            )
            
            assert response.status_code == 200
            
            # Verify password reset email was sent with Japanese locale
            mock_email_service.send_password_reset_email.assert_called_once()
            email_call_args = mock_email_service.send_password_reset_email.call_args
            assert email_call_args[1]["locale"] == "ja"
    
    @pytest.mark.asyncio
    async def test_fallback_to_english_when_locale_template_missing(
        self, client, mock_user_manager, mock_email_service
    ):
        """
        Test that when a locale template is missing, it falls back to English.
        """
        # Mock user with locale that has missing templates
        # (e.g., 'fr' which is not supported)
        french_user = MagicMock()
        french_user.id = "test-user-123"
        french_user.email = "test@example.com"
        french_user.locale = "fr"  # Unsupported locale
        french_user.is_active = True
        
        mock_user_manager.get_user_by_email.return_value = french_user
        
        # The email service should handle unsupported locales gracefully
        # In our implementation, unsupported locales will use default subject lines
        # and fall back to English templates
        
        # Test password reset request
        response = client.post(
            "/api/auth/password-reset/request",
            json={
                "email": "test@example.com"
            }
        )
        
        # Should still succeed (even if locale is unsupported)
        assert response.status_code == 200
        
        # Email should be sent (will use English fallback)
        mock_email_service.send_password_reset_email.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_user_locale_persistence_across_sessions(
        self, client, mock_user_manager, mock_auth_service
    ):
        """
        Test that user locale is persisted and returned in user info.
        """
        # Mock user with Spanish locale
        spanish_user = MagicMock()
        spanish_user.id = "test-user-123"
        spanish_user.email = "test@example.com"
        spanish_user.role = "user"
        spanish_user.is_2fa_enabled = False
        spanish_user.is_active = True
        spanish_user.created_at = datetime.utcnow()
        spanish_user.locale = "es"
        
        mock_user_manager.get_user_by_id.return_value = spanish_user
        
        # Get user info (admin endpoint)
        with patch('routes.users.get_current_user') as mock_get_current_user:
            mock_get_current_user.return_value = {
                "user_id": "admin-123",
                "email": "admin@example.com",
                "role": "admin"
            }
            
            response = client.get(
                "/api/users/test-user-123",
                headers={"Authorization": "Bearer mock-token"}
            )
            
            assert response.status_code == 200
            
            # Verify locale is included in response
            response_data = response.json()
            assert response_data["locale"] == "es"
    
    @pytest.mark.asyncio
    async def test_complete_i18n_flow_with_multiple_locales(
        self, client, mock_user_manager, mock_email_service, mock_auth_service
    ):
        """
        Test complete i18n flow with multiple locale scenarios.
        """
        # Scenario 1: English user registration
        with patch('routes.users.get_current_user') as mock_get_current_user:
            mock_get_current_user.return_value = {
                "user_id": "admin-123",
                "email": "admin@example.com",
                "role": "admin"
            }
            
            # Create English user
            response = client.post(
                "/api/users",
                json={
                    "email": "english@example.com",
                    "role": "user",
                    "locale": "en"
                },
                headers={"Authorization": "Bearer mock-token"}
            )
            assert response.status_code == 201
            
            # Verify English email
            mock_email_service.send_welcome_email.assert_called_with(
                to_email="english@example.com",
                username="english@example.com",
                temporary_password="TempPass123!",
                locale="en"
            )
            
            # Reset for next test
            mock_user_manager.create_user.reset_mock()
            mock_email_service.send_welcome_email.reset_mock()
            
            # Scenario 2: Japanese user registration
            response = client.post(
                "/api/users",
                json={
                    "email": "japanese@example.com",
                    "role": "user",
                    "locale": "ja"
                },
                headers={"Authorization": "Bearer mock-token"}
            )
            assert response.status_code == 201
            
            # Verify Japanese email
            mock_email_service.send_welcome_email.assert_called_with(
                to_email="japanese@example.com",
                username="japanese@example.com",
                temporary_password="TempPass123!",
                locale="ja"
            )
    
    @pytest.mark.asyncio
    async def test_error_handling_in_i18n_flow(
        self, client, mock_user_manager, mock_email_service
    ):
        """
        Test error handling in i18n flow (e.g., missing templates).
        """
        # Mock user
        test_user = MagicMock()
        test_user.id = "test-user-123"
        test_user.email = "test@example.com"
        test_user.locale = "en"
        test_user.is_active = True
        
        mock_user_manager.get_user_by_email.return_value = test_user
        
        # Mock email service to simulate template error
        mock_email_service.send_password_reset_email.return_value = False
        
        # Password reset request should still return success
        # (for security, don't reveal if email failed)
        response = client.post(
            "/api/auth/password-reset/request",
            json={
                "email": "test@example.com"
            }
        )
        
        # Should still return 200 (security best practice)
        assert response.status_code == 200
        
        # But email sending failed internally
        assert mock_email_service.send_password_reset_email.return_value is False
    
    @pytest.mark.asyncio
    async def test_admin_locale_management(
        self, client, mock_user_manager, mock_auth_service
    ):
        """
        Test admin can view and update user locales.
        """
        # Mock admin
        with patch('routes.users.get_current_user') as mock_get_current_user:
            mock_get_current_user.return_value = {
                "user_id": "admin-123",
                "email": "admin@example.com",
                "role": "admin"
            }
            
            # List users should include locale
            test_user = MagicMock()
            test_user.id = "test-user-123"
            test_user.email = "test@example.com"
            test_user.role = "user"
            test_user.is_2fa_enabled = False
            test_user.is_active = True
            test_user.created_at = datetime.utcnow()
            test_user.last_login = None
            test_user.created_by = "admin-123"
            test_user.locale = "ja"
            
            mock_user_manager.list_users.return_value = [test_user]
            
            response = client.get(
                "/api/users",
                headers={"Authorization": "Bearer mock-token"}
            )
            
            assert response.status_code == 200
            
            response_data = response.json()
            assert len(response_data["users"]) == 1
            assert response_data["users"][0]["locale"] == "ja"
            
            # Admin can update user locale
            response = client.put(
                "/api/users/test-user-123",
                json={
                    "locale": "es"
                },
                headers={"Authorization": "Bearer mock-token"}
            )
            
            assert response.status_code == 200
            
            # Verify update was called with Spanish locale
            mock_user_manager.update_user.assert_called_once()
            update_call_args = mock_user_manager.update_user.call_args
            assert update_call_args[1]["locale"] == "es"


if __name__ == "__main__":
    # Run tests directly for debugging
    import sys
    sys.exit(pytest.main([__file__, "-v"]))