#!/usr/bin/env python3
"""
Script to create the first admin user in the database.
Run this script after deploying the backend to production.

Usage:
    python create_admin.py [email]

Examples:
    python create_admin.py admin@02labs.me    # Direct mode
    python create_admin.py                     # Interactive mode

If no email is provided, the script will prompt for it interactively.
"""

import sys
import asyncio
from database.mongodb import connect_to_mongo, close_mongo_connection
from services.user_manager import UserManager
from services.email_service import EmailService


async def create_admin_user(email: str):
    """Create an admin user and send welcome email"""
    
    print()
    print(f"🔧 Creating admin user: {email}")
    print("=" * 60)
    
    try:
        # Connect to MongoDB
        print("📡 Connecting to MongoDB...")
        mongo_client = await connect_to_mongo()
        print("✅ Connected to MongoDB")
        
        # Get database name from environment
        from database.mongodb import DATABASE_NAME
        print(f"📊 Using database: {DATABASE_NAME}")
        
        # Initialize services
        user_manager = UserManager(mongo_client, DATABASE_NAME)
        email_service = EmailService()
        
        # Check if user already exists
        existing_user = await user_manager.get_user_by_email(email)
        if existing_user:
            print(f"❌ User with email {email} already exists!")
            print(f"   User ID: {existing_user.id}")
            print(f"   Role: {existing_user.role}")
            print(f"   Active: {existing_user.is_active}")
            return
        
        # Create admin user
        print(f"👤 Creating admin user...")
        user, temp_password = await user_manager.create_user(
            email=email,
            role="admin",
            created_by="system"
        )
        print(f"✅ Admin user created successfully!")
        print()
        print("=" * 60)
        print("📧 USER CREDENTIALS")
        print("=" * 60)
        print(f"Email:    {user.email}")
        print(f"Password: {temp_password}")
        print(f"Role:     {user.role}")
        print(f"User ID:  {user.id}")
        print("=" * 60)
        print()
        
        # Send welcome email
        print("📨 Sending welcome email...")
        try:
            await email_service.send_welcome_email(
                to_email=user.email,
                username=user.email,
                temporary_password=temp_password,
                locale="en"
            )
            print("✅ Welcome email sent successfully!")
        except Exception as e:
            print(f"⚠️  Failed to send welcome email: {e}")
            print("   (User was created successfully, but email failed)")
        
        print()
        print("=" * 60)
        print("🎉 ADMIN USER CREATED SUCCESSFULLY!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Save the password above (it won't be shown again)")
        print("2. Go to https://saki.02labs.me")
        print("3. Login with the email and password")
        print("4. Set up 2FA by scanning the QR code")
        print("5. You're ready to go!")
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
    
    # Check if email was provided as argument
    if len(sys.argv) > 2:
        print("Usage: python create_admin.py [email]")
        print()
        print("Examples:")
        print("  python create_admin.py admin@02labs.me    # Direct mode")
        print("  python create_admin.py                     # Interactive mode")
        sys.exit(1)
    
    # Get email from argument or prompt interactively
    if len(sys.argv) == 2:
        email = sys.argv[1]
    else:
        # Interactive mode
        print()
        print("=" * 60)
        print("🎯 CREATE FIRST ADMIN USER")
        print("=" * 60)
        print()
        print("This script will create an admin user with a randomly")
        print("generated password and send a welcome email.")
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
            
            # Confirm email
            print()
            confirm = input(f"Create admin user for '{email}'? (yes/no): ").strip().lower()
            
            if confirm in ['yes', 'y']:
                break
            elif confirm in ['no', 'n']:
                print("❌ Cancelled by user.")
                sys.exit(0)
            else:
                print("Please answer 'yes' or 'no'.")
    
    # Validate email format (for direct mode)
    if "@" not in email or "." not in email.split("@")[-1]:
        print(f"❌ Invalid email format: {email}")
        sys.exit(1)
    
    # Run async function
    asyncio.run(create_admin_user(email))


if __name__ == "__main__":
    main()
