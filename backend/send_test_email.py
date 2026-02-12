#!/usr/bin/env python3
"""
Simple script to send a test email.
Run this in the Northflank container or any environment with dependencies installed.

Usage:
  python send_test_email.py
"""

import asyncio
import os
from services.email_service import EmailService


async def main():
    """Send a test email"""
    
    print("📧 Email Service Test")
    print("=" * 70)
    
    # Initialize email service (reads from environment variables)
    email_service = EmailService()
    
    # Check if SMTP is configured
    if not email_service.smtp_user or not email_service.smtp_password:
        print("❌ SMTP credentials not configured!")
        print("Please set these environment variables:")
        print("  - SMTP_HOST (default: smtp.gmail.com)")
        print("  - SMTP_PORT (default: 587)")
        print("  - SMTP_USER (required)")
        print("  - SMTP_PASSWORD (required)")
        print("  - SMTP_FROM (default: noreply@ctfplatform.com)")
        print("  - SMTP_FROM_NAME (default: CTF Platform)")
        return False
    
    print(f"✓ SMTP Host: {email_service.smtp_host}")
    print(f"✓ SMTP Port: {email_service.smtp_port}")
    print(f"✓ SMTP User: {email_service.smtp_user}")
    print(f"✓ From: {email_service.smtp_from_name} <{email_service.smtp_from}>")
    print("=" * 70)
    
    # Send welcome email
    print("\n📨 Sending welcome email to quizgamer234@gmail.com...")
    
    to_email = "quizgamer234@gmail.com"
    username = "quizgamer234@gmail.com"
    temporary_password = "TempPass123!@#"
    
    try:
        success = await email_service.send_welcome_email(
            to_email=to_email,
            username=username,
            temporary_password=temporary_password,
            locale="en"
        )
        
        if success:
            print(f"\n✅ SUCCESS! Email sent to {to_email}")
            print(f"   Username: {username}")
            print(f"   Temporary Password: {temporary_password}")
            print("\n📬 Check your inbox for the welcome email!")
            return True
        else:
            print(f"\n❌ FAILED! Could not send email to {to_email}")
            print("Check the logs above for error details.")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import sys
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
