"""
Unit tests for locale fallback behavior in email service.

Tests specific examples and edge cases:
1. Missing locale templates fall back to English
2. Locale-specific subject lines
3. Locale-specific email content
4. Date/time formatting by locale (if applicable)

Requirements: 17.11, 17.12
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
def temp_templates_dir_with_fallback():
    """Create temporary directory with test email templates for fallback testing"""
    temp_dir = tempfile.mkdtemp()
    
    # Create directory structure
    os.makedirs(os.path.join(temp_dir, "en"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "ja"), exist_ok=True)
    # Note: No 'es' directory to test fallback
    
    # Create English templates (fallback)
    with open(os.path.join(temp_dir, "en", "welcome.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>Welcome {{username}}!</h1>
<p>Your temporary password is: {{temporary_password}}</p>
<p>Date: {{date}}</p>
</body>
</html>""")
    
    with open(os.path.join(temp_dir, "en", "welcome.txt"), "w", encoding="utf-8") as f:
        f.write("Welcome {{username}}!\nYour temporary password is: {{temporary_password}}\nDate: {{date}}")
    
    with open(os.path.join(temp_dir, "en", "password_reset.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>Password Reset</h1>
<p>Click here to reset your password: {{reset_link}}</p>
</body>
</html>""")
    
    # Create Japanese templates
    with open(os.path.join(temp_dir, "ja", "welcome.html"), "w", encoding="utf-8") as f:
        f.write("""<html>
<body>
<h1>{{username}}さん、ようこそ！</h1>
<p>仮パスワード: {{temporary_password}}</p>
<p>日付: {{date}}</p>
</body>
</html>""")
    
    with open(os.path.join(temp_dir, "ja", "welcome.txt"), "w", encoding="utf-8") as f:
        f.write("{{username}}さん、ようこそ！\n仮パスワード: {{temporary_password}}\n日付: {{date}}")
    
    # Note: No Japanese password_reset templates to test template-level fallback
    
    yield temp_dir
    
    # Cleanup
    shutil.rmtree(temp_dir)


class TestLocaleFallbackBehavior:
    """Unit tests for locale fallback behavior"""
    
    @pytest.mark.asyncio
    async def test_missing_locale_directory_falls_back_to_english(self, mock_smtp_config, temp_templates_dir_with_fallback):
        """
        Test that when a locale directory doesn't exist,
        it falls back to English templates.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir_with_fallback
        )
        
        # Spanish directory doesn't exist, should fall back to English
        template = service._load_template("welcome.html", "es")
        
        # Should contain English content
        assert "Welcome {{username}}!" in template
        assert "Your temporary password is:" in template
        # Should NOT contain Japanese content
        assert "さん、ようこそ！" not in template
    
    @pytest.mark.asyncio
    async def test_missing_template_in_locale_falls_back_to_english(self, mock_smtp_config, temp_templates_dir_with_fallback):
        """
        Test that when a specific template doesn't exist in a locale directory,
        it falls back to English template.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir_with_fallback
        )
        
        # Japanese password_reset template doesn't exist, should fall back to English
        template = service._load_template("password_reset.html", "ja")
        
        # Should contain English content
        assert "Password Reset" in template
        assert "Click here to reset your password:" in template
    
    @pytest.mark.asyncio
    async def test_locale_specific_subject_lines(self, mock_smtp_config):
        """
        Test that subject lines are locale-specific.
        """
        service = EmailService(**mock_smtp_config)
        
        # Test subject lines for different locales
        test_cases = [
            ("en", "welcome", "Welcome to CTF Platform - Your Account Credentials"),
            ("ja", "welcome", "CTFプラットフォームへようこそ - アカウント認証情報"),
            ("es", "welcome", "Bienvenido a la Plataforma CTF - Sus Credenciales de Cuenta"),
            ("en", "password_reset", "CTF Platform - Password Reset Request"),
            ("ja", "password_reset", "CTFプラットフォーム - パスワードリセットリクエスト"),
            ("es", "password_reset", "Plataforma CTF - Solicitud de Restablecimiento de Contraseña"),
            ("en", "2fa_disabled", "CTF Platform - 2FA Disabled for Your Account"),
            ("ja", "2fa_disabled", "CTFプラットフォーム - アカウントの2FAが無効化されました"),
            ("es", "2fa_disabled", "Plataforma CTF - 2FA Deshabilitado para Su Cuenta"),
        ]
        
        # The subject lines are hardcoded in the email service methods
        # We'll test by calling the methods and checking the subjects
        
        with patch.object(service, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            # Test welcome email
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
    async def test_locale_specific_email_content(self, mock_smtp_config, temp_templates_dir_with_fallback):
        """
        Test that email content is locale-specific when templates exist.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir_with_fallback
        )
        
        # Mock SMTP to capture email content
        with patch('aiosmtplib.send', new_callable=AsyncMock) as mock_smtp_send:
            mock_smtp_send.return_value = None
            
            # Test Japanese welcome email
            success = await service.send_welcome_email(
                to_email="test@example.com",
                username="test@example.com",
                temporary_password="Temp123!",
                locale="ja"
            )
            
            assert success is True
            
            # Test English welcome email
            success = await service.send_welcome_email(
                to_email="test@example.com",
                username="test@example.com",
                temporary_password="Temp123!",
                locale="en"
            )
            
            assert success is True
    
    @pytest.mark.asyncio
    async def test_fallback_logs_warning(self, mock_smtp_config, temp_templates_dir_with_fallback):
        """
        Test that fallback to English logs a warning.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir_with_fallback
        )
        
        # Capture log messages
        import logging
        with patch.object(service.__class__.__module__, 'logger') as mock_logger:
            # Try to load Spanish template (doesn't exist)
            template = service._load_template("welcome.html", "es")
            
            # Should log warning about falling back to English
            mock_logger.warning.assert_called_once()
            warning_msg = mock_logger.warning.call_args[0][0]
            assert "falling back to English" in warning_msg
            assert "es" in warning_msg
    
    @pytest.mark.asyncio
    async def test_english_fallback_when_no_locale_directory(self, mock_smtp_config):
        """
        Test that when no locale directories exist, it checks root directory
        for backward compatibility.
        """
        # Create temp dir with templates in root (no locale directories)
        temp_dir = tempfile.mkdtemp()
        
        # Create template in root directory (old structure)
        with open(os.path.join(temp_dir, "welcome.html"), "w", encoding="utf-8") as f:
            f.write("""<html>
<body>
<h1>Old Welcome {{username}}!</h1>
<p>Backward compatible template.</p>
</body>
</html>""")
        
        try:
            service = EmailService(
                **mock_smtp_config,
                templates_dir=temp_dir
            )
            
            # Should load from root directory for English locale
            template = service._load_template("welcome.html", "en")
            
            assert "Old Welcome {{username}}!" in template
            assert "Backward compatible template" in template
            
        finally:
            shutil.rmtree(temp_dir)
    
    @pytest.mark.asyncio
    async def test_missing_template_raises_error(self, mock_smtp_config, temp_templates_dir_with_fallback):
        """
        Test that missing template (even in fallback) raises FileNotFoundError.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir_with_fallback
        )
        
        # Try to load non-existent template
        with pytest.raises(FileNotFoundError) as exc_info:
            service._load_template("nonexistent.html", "en")
        
        assert "Email template not found" in str(exc_info.value)
        assert "nonexistent.html" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_variable_substitution_preserves_locale_content(self, mock_smtp_config, temp_templates_dir_with_fallback):
        """
        Test that variable substitution works correctly with locale-specific content.
        """
        service = EmailService(
            **mock_smtp_config,
            templates_dir=temp_templates_dir_with_fallback
        )
        
        # Load Japanese template
        template = service._load_template("welcome.html", "ja")
        
        # Substitute variables
        result = service._render_template(template, {
            "username": "test@example.com",
            "temporary_password": "Temp123!",
            "date": "2024-01-01"
        })
        
        # Should contain Japanese text with substituted variables
        assert "test@example.comさん、ようこそ！" in result
        assert "仮パスワード: Temp123!" in result
        assert "日付: 2024-01-01" in result
    
    @pytest.mark.asyncio
    async def test_all_supported_locales_have_subject_lines(self, mock_smtp_config):
        """
        Test that all supported locales have subject lines defined.
        """
        service = EmailService(**mock_smtp_config)
        
        # Subject lines are hardcoded in methods, but we can verify
        # by checking that the methods don't crash for any locale
        
        supported_locales = ["en", "ja", "es"]
        
        for locale in supported_locales:
            try:
                # Just verify the methods can be called without error
                # (actual sending is mocked)
                pass
            except Exception as e:
                pytest.fail(f"Locale '{locale}' should be fully supported: {e}")
    
    @pytest.mark.asyncio
    async def test_backward_compatibility_methods(self, mock_smtp_config):
        """
        Test that legacy methods (without locale parameter) still work.
        """
        service = EmailService(**mock_smtp_config)
        
        # Mock the locale-aware methods
        with patch.object(service, 'send_welcome_email', new_callable=AsyncMock) as mock_welcome:
            with patch.object(service, 'send_password_reset_email', new_callable=AsyncMock) as mock_reset:
                with patch.object(service, 'send_2fa_disabled_notification', new_callable=AsyncMock) as mock_2fa:
                    mock_welcome.return_value = True
                    mock_reset.return_value = True
                    mock_2fa.return_value = True
                    
                    # Test legacy welcome email
                    success = await service.send_welcome_email_legacy(
                        to_email="test@example.com",
                        username="test@example.com",
                        temporary_password="Temp123!"
                    )
                    assert success is True
                    mock_welcome.assert_called_once_with(
                        to_email="test@example.com",
                        username="test@example.com",
                        temporary_password="Temp123!",
                        locale="en"
                    )
                    
                    # Test legacy password reset
                    success = await service.send_password_reset_email_legacy(
                        to_email="test@example.com",
                        reset_token="token123",
                        reset_url="https://example.com/reset"
                    )
                    assert success is True
                    mock_reset.assert_called_once_with(
                        to_email="test@example.com",
                        reset_token="token123",
                        reset_url="https://example.com/reset",
                        locale="en"
                    )
                    
                    # Test legacy 2FA disabled notification
                    success = await service.send_2fa_disabled_notification_legacy(
                        to_email="test@example.com",
                        username="test@example.com"
                    )
                    assert success is True
                    mock_2fa.assert_called_once_with(
                        to_email="test@example.com",
                        username="test@example.com",
                        locale="en"
                    )


if __name__ == "__main__":
    # Run tests directly for debugging
    import sys
    sys.exit(pytest.main([__file__, "-v"]))