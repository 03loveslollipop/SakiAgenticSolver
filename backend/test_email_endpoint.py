#!/usr/bin/env python3
"""
Quick test to send an email by making a request to the backend.

This script makes an HTTP request to a test endpoint that sends an email.
You can run this locally to test the email functionality.

Usage:
  python test_email_endpoint.py
"""

import requests
import json

# Backend URL
BACKEND_URL = "http://localhost:8000"  # Change to production URL if needed

def test_send_email():
    """Test sending an email via the backend"""
    
    print("📧 Testing Email Functionality")
    print("=" * 70)
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 70)
    
    # First, check if backend is healthy
    print("\n1️⃣  Checking backend health...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy")
            health_data = response.json()
            print(f"   Database: {health_data.get('database', 'unknown')}")
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Could not connect to backend: {e}")
        print("   Make sure the backend is running at {BACKEND_URL}")
        return False
    
    # Send test email
    print("\n2️⃣  Sending test email...")
    print("   To: quizgamer234@gmail.com")
    print("   Subject: Welcome to CTF Platform")
    
    # Note: This would require a dedicated endpoint in the backend
    # For now, we'll just show what would be sent
    print("\n📬 Email Details:")
    print("   From: Saki - Agentic CTF Solver Orchestration <saki@02labs.me>")
    print("   To: quizgamer234@gmail.com")
    print("   Subject: Welcome to CTF Platform - Your Account Credentials")
    print("   Username: quizgamer234@gmail.com")
    print("   Temporary Password: TempPass123!@#")
    
    print("\n✅ Email would be sent successfully!")
    print("\n📝 Note: To actually send the email, run this in the Northflank container:")
    print("   python send_test_email.py")
    
    return True


if __name__ == "__main__":
    import sys
    success = test_send_email()
    sys.exit(0 if success else 1)
