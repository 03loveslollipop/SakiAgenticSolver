# Services Package

This package contains service classes for the CTF Automation Platform backend.

## SSHKeyManager

The `SSHKeyManager` class manages SSH key pairs for VM sessions with secure MongoDB storage.

### Features

- **RSA Key Generation**: Generates 2048-bit RSA key pairs for SSH access
- **Encrypted Storage**: Private keys are encrypted at rest using AES-256-CBC encryption
- **MongoDB Integration**: Uses Motor async driver for non-blocking database operations
- **Unique Session Keys**: Enforces unique index on session_id to prevent duplicate keys
- **Key Derivation**: Uses PBKDF2-HMAC-SHA256 with 100,000 iterations for encryption key derivation

### Usage

```python
from motor.motor_asyncio import AsyncIOMotorClient
from services.ssh_key_manager import SSHKeyManager

# Initialize
mongo_client = AsyncIOMotorClient("mongodb://localhost:27017")
ssh_manager = SSHKeyManager(mongo_client, database_name="ctf_platform")

# Create indexes (call once on startup)
await ssh_manager.create_indexes()

# Generate key pair
result = await ssh_manager.generate_key_pair("session-123")
print(result["public_key"])  # ssh-rsa AAAAB3...

# Retrieve public key
public_key = await ssh_manager.get_public_key("session-123")

# Retrieve private key (internal use only)
private_key = await ssh_manager.get_private_key("session-123")

# Delete key pair
await ssh_manager.delete_key_pair("session-123")
```

### Security

- Private keys are encrypted using AES-256-CBC before storage
- Encryption key is derived from a master key using PBKDF2 with 100,000 iterations
- Each encrypted key has a unique salt and IV
- Master encryption key should be stored securely (e.g., Azure Key Vault) in production
- Set `SSH_KEY_ENCRYPTION_KEY` environment variable for the master key

### Testing

Run tests with:
```bash
python -m pytest test_ssh_key_manager.py -v
```

Tests use mongomock-motor for in-memory MongoDB simulation, so no MongoDB server is required.

### Requirements Satisfied

- **Requirement 5.10**: Generate unique SSH key pairs for each VM
- **Requirement 7.1**: Store SSH keys securely
- **Requirement 7.2**: Provide SSH public keys to authenticated users
