# User management service for authentication and authorization

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt as bcrypt_lib  # Use bcrypt directly instead of passlib
import pyotp
import qrcode
import io
import base64
import secrets
import string
from typing import Optional, List
from datetime import datetime
import logging
from cryptography.fernet import Fernet
import os

from models.schemas import User

logger = logging.getLogger(__name__)


class UserManager:
    """Service for managing user accounts, authentication, and 2FA"""
    
    def __init__(self, mongo_client: AsyncIOMotorClient, database_name: str = "ctf_platform"):
        """Initialize UserManager with MongoDB client"""
        self.db = mongo_client[database_name]
        self.users_collection = self.db["users"]
        
        # Get encryption key from environment for 2FA secrets
        encryption_key = os.getenv("ENCRYPTION_KEY")
        if not encryption_key:
            logger.warning("ENCRYPTION_KEY not set, generating temporary key (NOT FOR PRODUCTION)")
            encryption_key = Fernet.generate_key().decode()
        
        # Ensure key is bytes
        if isinstance(encryption_key, str):
            encryption_key = encryption_key.encode()
        
        self.cipher = Fernet(encryption_key)
    
    def _generate_password(self, length: int = 16) -> str:
        """Generate a secure random password"""
        # Ensure length never exceeds 72 bytes (bcrypt limitation)
        length = min(length, 70)  # Leave margin for UTF-8 encoding
        
        # Password must have: uppercase, lowercase, digits, special chars
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        
        # Ensure at least one of each required character type
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%^&*")
        ]
        
        # Fill the rest randomly
        password.extend(secrets.choice(alphabet) for _ in range(length - 4))
        
        # Shuffle to avoid predictable pattern
        secrets.SystemRandom().shuffle(password)
        
        return ''.join(password)
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        # Bcrypt has a 72-byte limit, truncate if necessary
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        # Generate salt and hash password
        salt = bcrypt_lib.gensalt()
        hashed = bcrypt_lib.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    
    def _encrypt_secret(self, secret: str) -> str:
        """Encrypt 2FA secret for storage"""
        return self.cipher.encrypt(secret.encode()).decode()
    
    def _decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt 2FA secret from storage"""
        return self.cipher.decrypt(encrypted_secret.encode()).decode()
    
    async def create_user(
        self,
        email: str,
        role: str = "user",
        created_by: Optional[str] = None,
        locale: str = "en"
    ) -> tuple[User, str]:
        """
        Create new user with generated password.
        Returns tuple of (User, temporary_password)
        """
        # Check if email already exists
        existing = await self.users_collection.find_one({"email": email.lower()})
        if existing:
            raise ValueError(f"User with email {email} already exists")
        
        # Generate secure password
        temp_password = self._generate_password()
        password_hash = self._hash_password(temp_password)
        
        # Create user document
        user = User(
            email=email.lower(),
            password_hash=password_hash,
            role=role,
            created_by=created_by,
            locale=locale
        )
        
        # Insert into MongoDB
        user_dict = user.dict(by_alias=True)
        await self.users_collection.insert_one(user_dict)
        
        logger.info(f"Created user: {email} with role: {role}")
        
        return user, temp_password
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Retrieve user by email"""
        user_doc = await self.users_collection.find_one({"email": email.lower()})
        if not user_doc:
            return None
        return User(**user_doc)
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Retrieve user by ID"""
        user_doc = await self.users_collection.find_one({"_id": user_id})
        if not user_doc:
            return None
        return User(**user_doc)
    
    async def list_users(self) -> List[User]:
        """List all users (admin only)"""
        cursor = self.users_collection.find({})
        users = []
        async for user_doc in cursor:
            users.append(User(**user_doc))
        return users
    
    async def update_user(self, user_id: str, updates: dict) -> Optional[User]:
        """Update user fields"""
        # Remove fields that shouldn't be updated directly
        protected_fields = ["_id", "id", "password_hash", "totp_secret"]
        for field in protected_fields:
            updates.pop(field, None)
        
        result = await self.users_collection.update_one(
            {"_id": user_id},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            return None
        
        return await self.get_user_by_id(user_id)
    
    async def disable_user(self, user_id: str) -> bool:
        """Disable user account"""
        result = await self.users_collection.update_one(
            {"_id": user_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count > 0:
            logger.info(f"Disabled user: {user_id}")
            return True
        return False
    
    async def verify_password(self, email: str, password: str) -> Optional[User]:
        """
        Verify user password.
        Returns User if valid, None if invalid.
        """
        user = await self.get_user_by_email(email)
        if not user:
            return None
        
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {email}")
            return None
        
        # Verify password using bcrypt directly
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        hash_bytes = user.password_hash.encode('utf-8')
        if bcrypt_lib.checkpw(password_bytes, hash_bytes):
            # Update last login
            await self.users_collection.update_one(
                {"_id": user.id},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            return user
        
        return None
    
    async def setup_2fa(self, user_id: str) -> dict:
        """
        Generate 2FA secret and QR code for user.
        Returns dict with secret and qr_code_url.
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Generate TOTP secret
        secret = pyotp.random_base32()
        
        # Create TOTP URI for QR code
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="CTF Platform"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 for embedding in response
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        qr_code_url = f"data:image/png;base64,{qr_code_base64}"
        
        # Store encrypted secret (but don't enable 2FA yet)
        encrypted_secret = self._encrypt_secret(secret)
        await self.users_collection.update_one(
            {"_id": user_id},
            {"$set": {"totp_secret": encrypted_secret}}
        )
        
        logger.info(f"Generated 2FA secret for user: {user.email}")
        
        return {
            "secret": secret,
            "qr_code_url": qr_code_url
        }
    
    async def verify_2fa(self, user_id: str, totp_code: str) -> bool:
        """Verify TOTP code for user"""
        user = await self.get_user_by_id(user_id)
        if not user or not user.totp_secret:
            return False
        
        # Decrypt secret
        secret = self._decrypt_secret(user.totp_secret)
        
        # Verify TOTP code
        totp = pyotp.TOTP(secret)
        is_valid = totp.verify(totp_code, valid_window=1)  # Allow 1 step before/after
        
        if is_valid:
            logger.info(f"Valid 2FA code for user: {user.email}")
        else:
            logger.warning(f"Invalid 2FA code for user: {user.email}")
        
        return is_valid
    
    async def enable_2fa(self, user_id: str) -> bool:
        """Mark 2FA as enabled after successful verification"""
        result = await self.users_collection.update_one(
            {"_id": user_id},
            {"$set": {"is_2fa_enabled": True}}
        )
        
        if result.matched_count > 0:
            logger.info(f"Enabled 2FA for user: {user_id}")
            return True
        return False
    
    async def update_password(self, user_id: str, new_password: str) -> bool:
        """Update user password (for password reset or change)"""
        password_hash = self._hash_password(new_password)
        
        result = await self.users_collection.update_one(
            {"_id": user_id},
            {"$set": {"password_hash": password_hash}}
        )
        
        if result.matched_count > 0:
            logger.info(f"Updated password for user: {user_id}")
            return True
        return False
    
    async def create_indexes(self):
        """Create MongoDB indexes for users collection"""
        await self.users_collection.create_index("email", unique=True, name="idx_email_unique")
        await self.users_collection.create_index("is_active", name="idx_is_active")
        logger.info("Created indexes for users collection")
