#!/usr/bin/env python3
"""
Script to create admin user directly in MongoDB without using UserManager.
This is useful if you want to create a user with a specific password.

Usage:
    python create_admin_direct.py [email] [password]

Examples:
    python create_admin_direct.py admin@02labs.me MySecurePassword123!  # Direct mode
    python create_admin_direct.py                                        # Interactive mode

If no arguments are provided, the script will prompt for them interactively.
"""

import sys
import asyncio
from datetime import datetime
import bcrypt
import getpass
from database.mongodb import connect_to_mongo, close_mongo_connection


async def create_admin_direct(email: str, password: str):
    """Create admin user directly in MongoDB"""
    
    print()
    print(f"🔧 Creating admin user: {email}")
    print("=" * 60)
    
    try:
        # Connect to MongoDB
        print("📡 Connecting to MongoDB...")
        db = await connect_to_mongo()
        users_collection = db.client["ctf_platform"]["users"]
        print("✅ Connected to MongoDB")
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": email.lower()})
        if existing_user:
            print(f"❌ User with email {email} already exists!")
            return
        
        # Hash password with bcrypt
        print("🔐 Hashing password...")
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        # Create user document
        user_doc = {
            "_id": f"user_{datetime.utcnow().timestamp()}",
            "email": email.lower(),
            "password_hash": password_hash,
            "role": "admin",
            "is_active": True,
            "is_2fa_enabled": False,
            "totp_secret": None,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "created_by": "system"
        }
        
        # Insert user
        print("💾 Inserting user into database...")
        await users_collection.insert_one(user_doc)
        
        print()
        print("=" * 60)
        print("✅ ADMIN USER CREATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Email:    {email}")
        print(f"Password: {password}")
        print(f"Role:     admin")
        print(f"User ID:  {user_doc['_id']}")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Go to https://saki.02labs.me")
        print("2. Login with the email and password")
        print("3. Set up 2FA by scanning the QR code")
        print("4. You're ready to go!")
        print()
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Close MongoDB connection
        await close_mongo_connection()
        print("📡 MongoDB connection closed")


def main():
    """Main entry point"""
    
    # Check if arguments were provided
    if len(sys.argv) > 3:
        print("Usage: python create_admin_direct.py [email] [password]")
        print()
        print("Examples:")
        print("  python create_admin_direct.py admin@02labs.me MyPass123!  # Direct mode")
        print("  python create_admin_direct.py                              # Interactive mode")
        sys.exit(1)
    
    # Get email and password from arguments or prompt interactively
    if len(sys.argv) == 3:
        # Direct mode with both arguments
        email = sys.argv[1]
        password = sys.argv[2]
    else:
        # Interactive mode
        print()
        print("=" * 60)
        print("🎯 CREATE ADMIN USER WITH CUSTOM PASSWORD")
        print("=" * 60)
        print()
        print("This script will create an admin user with a password")
        print("that you specify (no email will be sent).")
        print()
        
        # Prompt for email
        while True:
            email = input("Enter admin email address: ").strip()
            
            if not email:
                print("❌ Email cannot be empty. Please try again.")
                continue
            
            # Validate email format
            if "@" not in email or "." not in email.split("@")[-1]:
                print(f"❌ Invalid email format: {email}")
                print("   Please enter a valid email address.")
                continue
            
            break
        
        print()
        
        # Prompt for password (hidden input)
        while True:
            password = getpass.getpass("Enter password (min 8 characters): ").strip()
            
            if not password:
                print("❌ Password cannot be empty. Please try again.")
                continue
            
            if len(password) < 8:
                print("❌ Password must be at least 8 characters long.")
                continue
            
            # Confirm password
            password_confirm = getpass.getpass("Confirm password: ").strip()
            
            if password != password_confirm:
                print("❌ Passwords do not match. Please try again.")
                print()
                continue
            
            break
        
        print()
        
        # Confirm creation
        confirm = input(f"Create admin user for '{email}'? (yes/no): ").strip().lower()
        
        if confirm not in ['yes', 'y']:
            print("❌ Cancelled by user.")
            sys.exit(0)
    
    # Validate email format (for direct mode)
    if "@" not in email or "." not in email.split("@")[-1]:
        print(f"❌ Invalid email format: {email}")
        sys.exit(1)
    
    # Validate password length (for direct mode)
    if len(password) < 8:
        print(f"❌ Password must be at least 8 characters long")
        sys.exit(1)
    
    # Run async function
    asyncio.run(create_admin_direct(email, password))


if __name__ == "__main__":
    main()
