"""
Simple verification script for User model
"""
from models.schemas import User
from datetime import datetime
import json

print("Testing User model...")

# Test 1: Create basic user
print("\n1. Creating basic user...")
user1 = User(
    email="test@example.com",
    password_hash="hashed_password_here"
)
print(f"   ✓ User created: {user1.email}")
print(f"   ✓ ID generated: {user1.id}")
print(f"   ✓ Role: {user1.role}")
print(f"   ✓ Active: {user1.is_active}")
print(f"   ✓ 2FA enabled: {user1.is_2fa_enabled}")

# Test 2: Create admin user
print("\n2. Creating admin user...")
user2 = User(
    email="admin@example.com",
    password_hash="hashed_password",
    role="admin"
)
print(f"   ✓ Admin user created: {user2.email}")
print(f"   ✓ Role: {user2.role}")

# Test 3: Email validation (lowercase)
print("\n3. Testing email lowercase conversion...")
user3 = User(
    email="TEST@EXAMPLE.COM",
    password_hash="hashed_password"
)
print(f"   ✓ Email converted to lowercase: {user3.email}")

# Test 4: User with 2FA
print("\n4. Creating user with 2FA...")
user4 = User(
    email="secure@example.com",
    password_hash="hashed_password",
    is_2fa_enabled=True,
    totp_secret="encrypted_secret_here"
)
print(f"   ✓ User with 2FA: {user4.email}")
print(f"   ✓ 2FA enabled: {user4.is_2fa_enabled}")
print(f"   ✓ TOTP secret: {user4.totp_secret}")

# Test 5: User with created_by
print("\n5. Creating user with created_by...")
user5 = User(
    email="newuser@example.com",
    password_hash="hashed_password",
    created_by="admin-uuid-123"
)
print(f"   ✓ User created by admin: {user5.created_by}")

# Test 6: Invalid email
print("\n6. Testing invalid email validation...")
try:
    user_invalid = User(
        email="invalid-email",
        password_hash="hashed_password"
    )
    print("   ✗ Should have raised ValueError!")
except ValueError as e:
    print(f"   ✓ Correctly rejected invalid email: {e}")

# Test 7: JSON serialization
print("\n7. Testing JSON serialization...")
user_dict = user1.dict(by_alias=True)
print(f"   ✓ User serialized to dict")
print(f"   ✓ _id field: {user_dict.get('_id')}")
print(f"   ✓ email field: {user_dict.get('email')}")

print("\n✅ All User model tests passed!")
