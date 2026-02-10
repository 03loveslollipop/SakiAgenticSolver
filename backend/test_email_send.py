#!/usr/bin/env python3
"""
Test script to send an example email using the EmailService.
This demonstrates the email sending functionality.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from services.email_service import EmailService


async def main():
    """Send a test email"""
    
    # Initialize email service
    email_service = EmailService()
    
    # Check if SMTP is configured
    if not email_service.smtp_user or not email_service.smtp_password:
        print("❌ SMTP credentials not configured!")
        print("Please set SMTP_USER and SMTP_PASSWORD environment variables")
        return False
    
    print("📧 Email Service Test")
    print("=" * 60)
    print(f"SMTP Host: {email_service.smtp_host}")
    print(f"SMTP Port: {email_service.smtp_port}")
    print(f"SMTP User: {email_service.smtp_user}")
    print(f"From: {email_service.smtp_from_name} <{email_service.smtp_from}>")
    print("=" * 60)
    
    # Send welcome email
    print("\n📨 Sending welcome email...")
    to_email = "quizgamer234@gmail.com"
    username = "quizgamer234@gmail.com"
    temporary_password = "TempPass123!@#"
    
    success = await email_service.send_welcome_email(
        to_email=to_email,
        username=username,
        temporary_password=temporary_password
    )
    
    if success:
        print(f"✅ Email sent successfully to {to_email}")
        print(f"   Username: {username}")
        print(f"   Temporary Password: {temporary_password}")
        return True
    else:
        print(f"❌ Failed to send email to {to_email}")
        return False


if __name__ == "__main__":
    # Load environment variables from .env
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the test
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
