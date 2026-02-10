# Email service for user notifications

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications"""
    
    def __init__(
        self,
        smtp_host: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
        smtp_from: Optional[str] = None,
        smtp_from_name: Optional[str] = None,
        use_tls: bool = True,
        templates_dir: Optional[str] = None
    ):
        """
        Initialize EmailService with SMTP configuration.
        
        Args:
            smtp_host: SMTP server hostname (from env if not provided)
            smtp_port: SMTP server port (from env if not provided)
            smtp_user: SMTP username (from env if not provided)
            smtp_password: SMTP password (from env if not provided)
            smtp_from: From email address (from env if not provided)
            smtp_from_name: From name (from env if not provided)
            use_tls: Whether to use TLS (default: True)
            templates_dir: Directory containing email templates
        """
        self.smtp_host = smtp_host or os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = smtp_port or int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = smtp_user or os.getenv("SMTP_USER")
        self.smtp_password = smtp_password or os.getenv("SMTP_PASSWORD")
        self.smtp_from = smtp_from or os.getenv("SMTP_FROM", "noreply@ctfplatform.com")
        self.smtp_from_name = smtp_from_name or os.getenv("SMTP_FROM_NAME", "CTF Platform")
        self.use_tls = use_tls
        
        # Set templates directory
        if templates_dir:
            self.templates_dir = Path(templates_dir)
        else:
            # Default to email_templates folder in backend directory
            backend_dir = Path(__file__).parent.parent
            self.templates_dir = backend_dir / "email_templates"
        
        # Check if SMTP is configured
        if not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP credentials not configured. Email sending will fail.")
    
    def _load_template(self, template_name: str) -> str:
        """
        Load email template from file.
        
        Args:
            template_name: Name of template file (e.g., 'welcome.html')
            
        Returns:
            Template content as string
        """
        template_path = self.templates_dir / template_name
        
        if not template_path.exists():
            logger.error(f"Template not found: {template_path}")
            raise FileNotFoundError(f"Email template not found: {template_name}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _render_template(self, template_content: str, variables: Dict[str, str]) -> str:
        """
        Render template by replacing variables.
        
        Args:
            template_content: Template content with {{variable}} placeholders
            variables: Dictionary of variable names and values
            
        Returns:
            Rendered template
        """
        rendered = template_content
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            rendered = rendered.replace(placeholder, str(value))
        return rendered
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None
    ) -> bool:
        """
        Send email to recipient.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body_text: Plain text email body
            body_html: Optional HTML email body
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = f"{self.smtp_from_name} <{self.smtp_from}>"
            message["To"] = to_email
            message["Subject"] = subject
            
            # Add plain text part
            text_part = MIMEText(body_text, "plain")
            message.attach(text_part)
            
            # Add HTML part if provided
            if body_html:
                html_part = MIMEText(body_html, "html")
                message.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=self.use_tls
            )
            
            logger.info(f"Email sent successfully to: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    async def send_welcome_email(
        self,
        to_email: str,
        username: str,
        temporary_password: str
    ) -> bool:
        """
        Send welcome email with credentials to new user.
        
        Args:
            to_email: User's email address
            username: User's username (email)
            temporary_password: Temporary password for first login
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = "Welcome to CTF Platform - Your Account Credentials"
        
        # Load and render templates
        try:
            html_template = self._load_template("welcome.html")
            text_template = self._load_template("welcome.txt")
            
            variables = {
                "username": username,
                "temporary_password": temporary_password
            }
            
            body_html = self._render_template(html_template, variables)
            body_text = self._render_template(text_template, variables)
            
            return await self.send_email(to_email, subject, body_text, body_html)
            
        except FileNotFoundError as e:
            logger.error(f"Email template not found: {e}")
            return False
    
    async def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        reset_url: str
    ) -> bool:
        """
        Send password reset email with reset link.
        
        Args:
            to_email: User's email address
            reset_token: Password reset token
            reset_url: Base URL for password reset
            
        Returns:
            True if email sent successfully, False otherwise
        """
        reset_link = f"{reset_url}?token={reset_token}"
        
        subject = "CTF Platform - Password Reset Request"
        
        # Load and render templates
        try:
            html_template = self._load_template("password_reset.html")
            text_template = self._load_template("password_reset.txt")
            
            variables = {
                "reset_link": reset_link
            }
            
            body_html = self._render_template(html_template, variables)
            body_text = self._render_template(text_template, variables)
            
            return await self.send_email(to_email, subject, body_text, body_html)
            
        except FileNotFoundError as e:
            logger.error(f"Email template not found: {e}")
            return False
    
    async def send_2fa_disabled_notification(
        self,
        to_email: str,
        username: str
    ) -> bool:
        """
        Send notification when 2FA is disabled for an account.
        
        Args:
            to_email: User's email address
            username: User's username
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = "CTF Platform - 2FA Disabled for Your Account"
        
        # Load and render templates
        try:
            html_template = self._load_template("2fa_disabled.html")
            text_template = self._load_template("2fa_disabled.txt")
            
            variables = {
                "username": username
            }
            
            body_html = self._render_template(html_template, variables)
            body_text = self._render_template(text_template, variables)
            
            return await self.send_email(to_email, subject, body_text, body_html)
            
        except FileNotFoundError as e:
            logger.error(f"Email template not found: {e}")
            return False
