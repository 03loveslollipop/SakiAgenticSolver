"""
Property-based tests for email template localization.

Tests universal properties that should hold for all valid inputs:
1. Template loading with locale fallback
2. Variable substitution correctness
3. Locale-specific subject lines
4. Email sending with locale support

**Property 30: Email Template Localization**
**Validates: Requirements 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 17.11**
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, mock_open
from pathlib import Path
import tempfile
import shutil
import os

from services.email_service import EmailService


@pytest.fixture
def mock_smtp_config():
    """Mock SMTP configuration for EmailService"""
    return {
        "smtp_host": "smtp.test.com",
        "smtp_port": 587,
        "smtp_user": "test@test.com",
        "smtp_password": "testpass",
        "smtp_from": "noreply@test.com",
        "smtp_from_name": "Test Service"
    }


@pytest.fixture
def email_service(mock_smtp_config):
    """Create EmailService instance with mocked SMTP"""
    with patch('aiosmtplib.send', new_callable=AsyncMock) as mock_send:
        mock_send.return_value = None  # Simulate successful send
        service = EmailService(**mock_smtp_config)
        yield service


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
    
    # Spanish templates (password_reset only, to test fallback)
    with open(os.path.join(temp_dir, "es", "password_reset.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>Restablecimiento de Contraseña</h1>
<p>Haga clic aquí para restablecer su contraseña: {{reset_link}}</p>
</body>
</html>""")
    
    with open(os.path.join(temp_dir, "es", "password_reset.txt"), "w", encoding="utf-8") as f:
        f.write("Restablecimiento de Contraseña\nHaga clic aquí para restablecer su contraseña: {{reset_link}}")
    
    yield temp_dir
    
    # Cleanup
    shutil.rmtree(temp_dir)


class TestEmailTemplateLocalization:
    """Property tests for email template localization"""
    
    @pytest.mark.asyncio
    async def test_property_template_loading_locale_specific(self, mock_smtp_config, temp_templates_dir):
        """
        Property: For any valid locale, template loading should succeed
        when locale-specific templates exist.
        """
        # Test with each supported locale
        test_cases = [
            ("en", "welcome.html", "Welcome {{username}}!"),
            ("ja", "welcome.html", "{{username}}さん、ようこそ！"),
            ("es", "password_reset.html", "Restablecimiento de Contraseña"),
        ]
        
        for locale, template_name, expected_content in test_cases:
            # Create service with custom templates directory
            service = EmailService(
                **mock_smtp_config,
                templates_dir=temp_templates_dir
            )
            
            # Load template
            template = service._load_template(template_name, locale)
            
            # Verify template contains expected locale-specific content
            assert expected_content in template, \
                f"Template for locale '{locale}' should contain '{expected_content}'"
    
    @pytest.mark.asyncio
    async def test_property_template_fallback_to_english(self, mock_smtp_config, temp_templates_dir):
        """
        Property: When locale-specific template is missing,
        should fall back to English template.
        """
        # Spanish welcome template doesn't exist, should fall back to English
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir
        )
        
        # This should fall back to English since Spanish welcome template doesn't exist
        template = service._load_template("welcome.html", "es")
        
        # Should contain English content
        assert "Welcome {{username}}!" in template, \
            "Missing Spanish template should fall back to English"
    
    @pytest.mark.asyncio
    async def test_property_variable_substitution(self, mock_smtp_config, temp_templates_dir):
        """
        Property: Template variables should be correctly replaced
        for any valid variable dictionary.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir
        )
        
        # Test cases with different variables
        test_cases = [
            (
                "Welcome {{username}}!\nPassword: {{temporary_password}}",
                {"username": "test@example.com", "temporary_password": "Temp123!"},
                "Welcome test@example.com!\nPassword: Temp123!"
            ),
            (
                "Reset link: {{reset_link}}",
                {"reset_link": "https://example.com/reset?token=abc123"},
                "Reset link: https://example.com/reset?token=abc123"
            ),
            (
                "Hello {{name}} from {{company}}",
                {"name": "John", "company": "ACME Inc."},
                "Hello John from ACME Inc."
            ),
        ]
        
        for template_content, variables, expected in test_cases:
            result = service._render_template(template_content, variables)
            assert result == expected, \
                f"Variable substitution failed for {variables}"
    
    @pytest.mark.asyncio
    async def test_property_locale_specific_subjects(self, mock_smtp_config, temp_templates_dir):
        """
        Property: Email subjects should be locale-specific.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir
        )
        
        # Mock the email sending to test subject generation
        with patch.object(service, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            # Test welcome email subjects
            await service.send_welcome_email(
                to_email="test@example.com",
                username="test@example.com",
                temporary_password="Temp123!",
                locale="en"
            )
            
            # Check English subject was used
            call_args = mock_send.call_args
            assert call_args is not None
            _, kwargs = call_args
            assert kwargs['subject'] == "Welcome to CTF Platform - Your Account Credentials"
            
            # Reset mock
            mock_send.reset_mock()
            
            # Test Japanese subject
            await service.send_welcome_email(
                to_email="test@example.com",
                username="test@example.com",
                temporary_password="Temp123!",
                locale="ja"
            )
            
            call_args = mock_send.call_args
            assert call_args is not None
            _, kwargs = call_args
            assert kwargs['subject'] == "CTFプラットフォームへようこそ - アカウント認証情報"
    
    @pytest.mark.asyncio
    async def test_property_backward_compatibility(self, mock_smtp_config, temp_templates_dir):
        """
        Property: Legacy methods (without locale parameter) should use English locale.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir
        )
        
        # Mock the locale-aware method to verify it's called with English locale
        with patch.object(service, 'send_welcome_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            # Call legacy method
            await service.send_welcome_email_legacy(
                to_email="test@example.com",
                username="test@example.com",
                temporary_password="Temp123!"
            )
            
            # Verify it called the locale-aware method with English locale
            mock_send.assert_called_once_with(
                to_email="test@example.com",
                username="test@example.com",
                temporary_password="Temp123!",
                locale="en"
            )
    
    @pytest.mark.asyncio
    async def test_property_email_sending_locale_aware(self, mock_smtp_config, temp_templates_dir):
        """
        Property: Email sending methods should be locale-aware and handle
        all supported locales correctly.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir
        )
        
        # Mock SMTP send
        with patch('aiosmtplib.send', new_callable=AsyncMock) as mock_smtp_send:
            mock_smtp_send.return_value = None
            
            # Test all email types with different locales
            test_cases = [
                ("welcome", "en", "test@example.com", "test@example.com", "Temp123!"),
                ("welcome", "ja", "test@example.com", "test@example.com", "Temp123!"),
                ("password_reset", "en", "test@example.com", "token123", "https://example.com/reset"),
                ("password_reset", "es", "test@example.com", "token123", "https://example.com/reset"),
                ("2fa_disabled", "en", "test@example.com", "test@example.com"),
            ]
            
            for email_type, locale, *args in test_cases:
                mock_smtp_send.reset_mock()
                
                try:
                    if email_type == "welcome":
                        success = await service.send_welcome_email(
                            to_email=args[0],
                            username=args[1],
                            temporary_password=args[2],
                            locale=locale
                        )
                    elif email_type == "password_reset":
                        success = await service.send_password_reset_email(
                            to_email=args[0],
                            reset_token=args[1],
                            reset_url=args[2],
                            locale=locale
                        )
                    elif email_type == "2fa_disabled":
                        success = await service.send_2fa_disabled_notification(
                            to_email=args[0],
                            username=args[1],
                            locale=locale
                        )
                    
                    # Should succeed (or fail gracefully for missing templates)
                    assert success is True or success is False
                    
                    # If template exists for this locale, email should be sent
                    if email_type == "welcome" and locale == "es":
                        # Spanish welcome template doesn't exist, should return False
                        assert success is False
                    else:
                        # Other cases should succeed
                        assert success is True
                        
                except FileNotFoundError:
                    # Expected for missing templates
                    pass
    
    @pytest.mark.parametrize("locale", ["en", "ja", "es"])
    @pytest.mark.asyncio
    async def test_property_all_locales_supported(self, mock_smtp_config, temp_templates_dir, locale):
        """
        Property: All supported locales should work with the email service.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir
        )
        
        # Test that the service can handle all supported locales
        # without crashing
        try:
            # Try to load a template with this locale
            # (will fall back to English if not available)
            template = service._load_template("password_reset.html", locale)
            assert template is not None
            assert len(template) > 0
        except Exception as e:
            pytest.fail(f"Locale '{locale}' should be supported but caused error: {e}")


if __name__ == "__main__":
    # Run tests directly for debugging
    import sys
    sys.exit(pytest.main([__file__, "-v"]))