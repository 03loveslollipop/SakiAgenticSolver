#!/usr/bin/env python3
"""
Verification script for UserManager service.
Tests all CRUD operations and authentication functionality.
"""

import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from services.user_manager import UserManager
from database.mongodb import get_mongodb_url, DATABASE_NAME


async def main():
    """Test UserManager functionality"""
    print("=" * 60)
    print("UserManager Service Verification")
    print("=" * 60)
    
    # Connect to MongoDB
    mongodb_url = get_mongodb_url()
    print(f"\n1. Connecting to MongoDB...")
    client = AsyncIOMotorClient(mongodb_url)
    
    try:
        # Verify connection
        await client.admin.command('ping')
        print("✓ Connected to MongoDB")
        
        # Initialize UserManager
        user_manager = UserManager(client, DATABASE_NAME)
        
        # Clean up test users if they exist
        db = client[DATABASE_NAME]
        await db.users.delete_many({"email": {"$in": ["test@example.com", "admin@example.com"]}})
        
        # Test 1: Create user
        print("\n2. Testing user creation...")
        user, temp_password = await user_manager.create_user(
            email="test@example.com",
            role="user"
        )
        print(f"✓ User created: {user.email}")
        print(f"✓ Temporary password generated: {temp_password}")
        print(f"✓ Password length: {len(temp_password)}")
        print(f"✓ User ID: {user.id}")
        print(f"✓ Role: {user.role}")
        print(f"✓ Active: {user.is_active}")
        print(f"✓ 2FA enabled: {user.is_2fa_enabled}")
        
        # Test 2: Duplicate email check
        print("\n3. Testing duplicate email prevention...")
        try:
            await user_manager.create_user(email="test@example.com")
            print("✗ Should have raised ValueError for duplicate email")
            return False
        except ValueError as e:
            print(f"✓ Correctly rejected duplicate email: {e}")
        
        # Test 3: Get user by email
        print("\n4. Testing get user by email...")
        retrieved_user = await user_manager.get_user_by_email("test@example.com")
        if retrieved_user and retrieved_user.email == "test@example.com":
            print(f"✓ Retrieved user: {retrieved_user.email}")
        else:
            print("✗ Failed to retrieve user by email")
            return False
        
        # Test 4: Get user by ID
        print("\n5. Testing get user by ID...")
        retrieved_user = await user_manager.get_user_by_id(user.id)
        if retrieved_user and retrieved_user.id == user.id:
            print(f"✓ Retrieved user by ID: {retrieved_user.id}")
        else:
            print("✗ Failed to retrieve user by ID")
            return False
        
        # Test 5: Verify password
        print("\n6. Testing password verification...")
        verified_user = await user_manager.verify_password("test@example.com", temp_password)
        if verified_user:
            print(f"✓ Password verified for: {verified_user.email}")
        else:
            print("✗ Password verification failed")
            return False
        
        # Test 6: Verify wrong password
        print("\n7. Testing wrong password rejection...")
        verified_user = await user_manager.verify_password("test@example.com", "wrongpassword")
        if not verified_user:
            print("✓ Correctly rejected wrong password")
        else:
            print("✗ Should have rejected wrong password")
            return False
        
        # Test 7: Setup 2FA
        print("\n8. Testing 2FA setup...")
        twofa_data = await user_manager.setup_2fa(user.id)
        if "secret" in twofa_data and "qr_code_url" in twofa_data:
            print(f"✓ 2FA secret generated: {twofa_data['secret'][:10]}...")
            print(f"✓ QR code URL generated (length: {len(twofa_data['qr_code_url'])})")
        else:
            print("✗ 2FA setup failed")
            return False
        
        # Test 8: Verify 2FA code
        print("\n9. Testing 2FA verification...")
        import pyotp
        totp = pyotp.TOTP(twofa_data['secret'])
        valid_code = totp.now()
        print(f"✓ Generated TOTP code: {valid_code}")
        
        is_valid = await user_manager.verify_2fa(user.id, valid_code)
        if is_valid:
            print("✓ 2FA code verified successfully")
        else:
            print("✗ 2FA verification failed")
            return False
        
        # Test 9: Enable 2FA
        print("\n10. Testing 2FA enablement...")
        enabled = await user_manager.enable_2fa(user.id)
        if enabled:
            print("✓ 2FA enabled for user")
            
            # Verify it's enabled
            user_check = await user_manager.get_user_by_id(user.id)
            if user_check.is_2fa_enabled:
                print("✓ 2FA status confirmed in database")
            else:
                print("✗ 2FA status not updated")
                return False
        else:
            print("✗ Failed to enable 2FA")
            return False
        
        # Test 10: Create admin user
        print("\n11. Testing admin user creation...")
        admin_user, admin_password = await user_manager.create_user(
            email="admin@example.com",
            role="admin",
            created_by=user.id
        )
        print(f"✓ Admin user created: {admin_user.email}")
        print(f"✓ Admin role: {admin_user.role}")
        print(f"✓ Created by: {admin_user.created_by}")
        
        # Test 11: List users
        print("\n12. Testing list users...")
        all_users = await user_manager.list_users()
        if len(all_users) >= 2:
            print(f"✓ Listed {len(all_users)} users")
            for u in all_users:
                print(f"  - {u.email} ({u.role})")
        else:
            print("✗ Failed to list users")
            return False
        
        # Test 12: Update user
        print("\n13. Testing user update...")
        updated_user = await user_manager.update_user(
            user.id,
            {"role": "admin"}
        )
        if updated_user and updated_user.role == "admin":
            print(f"✓ User role updated to: {updated_user.role}")
        else:
            print("✗ Failed to update user")
            return False
        
        # Test 13: Disable user
        print("\n14. Testing user disable...")
        disabled = await user_manager.disable_user(admin_user.id)
        if disabled:
            print(f"✓ User disabled: {admin_user.email}")
            
            # Verify disabled user can't login
            verified = await user_manager.verify_password(admin_user.email, admin_password)
            if not verified:
                print("✓ Disabled user correctly rejected at login")
            else:
                print("✗ Disabled user should not be able to login")
                return False
        else:
            print("✗ Failed to disable user")
            return False
        
        # Test 14: Update password
        print("\n15. Testing password update...")
        new_password = "NewSecurePassword123!"
        updated = await user_manager.update_password(user.id, new_password)
        if updated:
            print("✓ Password updated")
            
            # Verify new password works
            verified = await user_manager.verify_password(user.email, new_password)
            if verified:
                print("✓ New password verified successfully")
            else:
                print("✗ New password verification failed")
                return False
        else:
            print("✗ Failed to update password")
            return False
        
        print("\n" + "=" * 60)
        print("✅ All UserManager tests passed!")
        print("=" * 60)
        
        # Clean up
        await db.users.delete_many({"email": {"$in": ["test@example.com", "admin@example.com"]}})
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
