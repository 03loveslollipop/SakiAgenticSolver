# SSH Key Manager Service for generating and managing SSH key pairs

from motor.motor_asyncio import AsyncIOMotorClient
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from datetime import datetime
import os
import base64
import logging

logger = logging.getLogger(__name__)


class SSHKeyManager:
    """
    Manages SSH key pairs for VM sessions with MongoDB storage.
    Generates RSA key pairs and stores them securely in MongoDB.
    Private keys are encrypted at rest using AES-256.
    """
    
    def __init__(self, mongo_client: AsyncIOMotorClient, database_name: str = "ctf_platform"):
        """
        Initialize SSHKeyManager with MongoDB client.
        
        Args:
            mongo_client: AsyncIOMotorClient instance
            database_name: Name of the MongoDB database
        """
        self.db = mongo_client[database_name]
        self.keys_collection = self.db["ssh_keys"]
        
        # Get encryption key from environment or generate one
        # In production, this should be stored securely (e.g., Azure Key Vault)
        self.encryption_key = os.getenv("SSH_KEY_ENCRYPTION_KEY", "default-key-change-in-production")
    
    async def create_indexes(self):
        """
        Create unique index on session_id in ssh_keys collection.
        Should be called on application startup.
        """
        await self.keys_collection.create_index("session_id", unique=True, name="idx_session_id_unique")
        logger.info("Created unique index on session_id for ssh_keys collection")
    
    def _derive_encryption_key(self, salt: bytes) -> bytes:
        """
        Derive a 256-bit encryption key from the master key using PBKDF2.
        
        Args:
            salt: Salt for key derivation
            
        Returns:
            32-byte encryption key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        return kdf.derive(self.encryption_key.encode())
    
    def _encrypt_private_key(self, private_key_pem: str) -> str:
        """
        Encrypt private key using AES-256-CBC.
        
        Args:
            private_key_pem: Private key in PEM format
            
        Returns:
            Base64-encoded encrypted key with salt and IV
        """
        # Generate random salt and IV
        salt = os.urandom(16)
        iv = os.urandom(16)
        
        # Derive encryption key
        key = self._derive_encryption_key(salt)
        
        # Encrypt the private key
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Pad the data to be a multiple of 16 bytes
        private_key_bytes = private_key_pem.encode()
        padding_length = 16 - (len(private_key_bytes) % 16)
        padded_data = private_key_bytes + bytes([padding_length] * padding_length)
        
        encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
        
        # Combine salt + IV + encrypted data and encode as base64
        combined = salt + iv + encrypted_data
        return base64.b64encode(combined).decode()
    
    def _decrypt_private_key(self, encrypted_key: str) -> str:
        """
        Decrypt private key using AES-256-CBC.
        
        Args:
            encrypted_key: Base64-encoded encrypted key with salt and IV
            
        Returns:
            Private key in PEM format
        """
        # Decode from base64
        combined = base64.b64decode(encrypted_key.encode())
        
        # Extract salt, IV, and encrypted data
        salt = combined[:16]
        iv = combined[16:32]
        encrypted_data = combined[32:]
        
        # Derive encryption key
        key = self._derive_encryption_key(salt)
        
        # Decrypt the private key
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(encrypted_data) + decryptor.finalize()
        
        # Remove padding
        padding_length = padded_data[-1]
        private_key_bytes = padded_data[:-padding_length]
        
        return private_key_bytes.decode()
    
    async def generate_key_pair(self, session_id: str) -> dict:
        """
        Generate a new RSA SSH key pair and store in MongoDB.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dictionary with public_key and session_id
            
        Raises:
            ValueError: If key pair already exists for session_id
        """
        # Check if key pair already exists
        existing = await self.keys_collection.find_one({"session_id": session_id})
        if existing:
            raise ValueError(f"SSH key pair already exists for session {session_id}")
        
        # Generate RSA key pair (2048 bits)
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        
        # Serialize private key to PEM format
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ).decode()
        
        # Get public key and serialize to OpenSSH format
        public_key = private_key.public_key()
        public_key_openssh = public_key.public_bytes(
            encoding=serialization.Encoding.OpenSSH,
            format=serialization.PublicFormat.OpenSSH
        ).decode()
        
        # Encrypt private key before storage
        encrypted_private_key = self._encrypt_private_key(private_key_pem)
        
        # Store in MongoDB
        key_document = {
            "session_id": session_id,
            "public_key": public_key_openssh,
            "private_key": encrypted_private_key,
            "created_at": datetime.utcnow()
        }
        
        await self.keys_collection.insert_one(key_document)
        logger.info(f"Generated and stored SSH key pair for session {session_id}")
        
        return {
            "session_id": session_id,
            "public_key": public_key_openssh
        }
    
    async def get_public_key(self, session_id: str) -> str:
        """
        Retrieve public key from MongoDB.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Public key in OpenSSH format
            
        Raises:
            ValueError: If key pair not found for session_id
        """
        key_document = await self.keys_collection.find_one({"session_id": session_id})
        
        if not key_document:
            raise ValueError(f"SSH key pair not found for session {session_id}")
        
        return key_document["public_key"]
    
    async def get_private_key(self, session_id: str) -> str:
        """
        Retrieve and decrypt private key from MongoDB.
        Internal use only - should not be exposed via API.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Private key in PEM format
            
        Raises:
            ValueError: If key pair not found for session_id
        """
        key_document = await self.keys_collection.find_one({"session_id": session_id})
        
        if not key_document:
            raise ValueError(f"SSH key pair not found for session {session_id}")
        
        # Decrypt private key
        encrypted_private_key = key_document["private_key"]
        private_key_pem = self._decrypt_private_key(encrypted_private_key)
        
        return private_key_pem
    
    async def delete_key_pair(self, session_id: str) -> bool:
        """
        Delete key pair from MongoDB.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            True if deleted, False if not found
        """
        result = await self.keys_collection.delete_one({"session_id": session_id})
        
        if result.deleted_count > 0:
            logger.info(f"Deleted SSH key pair for session {session_id}")
            return True
        else:
            logger.warning(f"SSH key pair not found for session {session_id}")
            return False
