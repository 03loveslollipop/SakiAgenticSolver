# MongoDB Configuration Guide

## Overview

The backend supports two MongoDB configuration modes:
1. **Local Development**: Simple `MONGODB_URL` environment variable
2. **Northflank Production**: Auto-synced variables from MongoDB addon

---

## Local Development

### Configuration

Set a single environment variable in `backend/.env`:

```bash
MONGODB_URL=mongodb://localhost:27017/ctf_platform
```

### Usage

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend will use the `MONGODB_URL` directly.

---

## Northflank Production

### How It Works

When you create a MongoDB addon in Northflank and link it to your service, Northflank automatically injects these environment variables (with `NF_SAKI_DB_` prefix):

- `NF_SAKI_DB_MONGO_SRV`: Full MongoDB connection string (preferred)
- `NF_SAKI_DB_USERNAME`: MongoDB username
- `NF_SAKI_DB_PASSWORD`: MongoDB password
- `NF_SAKI_DB_DATABASE`: Database name
- `NF_SAKI_DB_HOST`: MongoDB host
- `NF_SAKI_DB_PORT`: MongoDB port
- `NF_SAKI_DB_MONGO_SRV_ADMIN`: Admin connection string
- `NF_SAKI_DB_TLS_ENABLED`: TLS enabled flag
- `NF_SAKI_DB_HOSTS_LIST`: List of hosts
- `NF_SAKI_DB_ADMIN_USERNAME`: Admin username
- `NF_SAKI_DB_ADMIN_PASSWORD`: Admin password
- `NF_SAKI_DB_MONGO_SRV_OPLOG`: Oplog connection string
- `NF_SAKI_DB_OPLOG_USERNAME`: Oplog username
- `NF_SAKI_DB_OPLOG_PASSWORD`: Oplog password

**Note**: The prefix `NF_SAKI_DB_` comes from your addon name "saki-db" in Northflank.

### Backend Behavior

The backend automatically detects these variables and uses the connection string in this priority order:

1. **MONGODB_URL** (if set - for local development)
2. **NF_SAKI_DB_MONGO_SRV** (full connection string from Northflank - preferred)
3. **Individual variables** (constructs from NF_SAKI_DB_HOST, NF_SAKI_DB_USERNAME, etc.)
4. **Fallback** (localhost - if nothing is configured)

```python
# Priority 1: If MONGODB_URL is set (local dev)
mongodb_url = os.getenv("MONGODB_URL")

# Priority 2: Use full connection string from Northflank (preferred)
nf_mongo_srv = os.getenv("NF_SAKI_DB_MONGO_SRV")

# Priority 3: Construct from individual Northflank variables
mongo_srv = os.getenv("NF_SAKI_DB_HOST")
username = os.getenv("NF_SAKI_DB_USERNAME")
password = os.getenv("NF_SAKI_DB_PASSWORD")
database = os.getenv("NF_SAKI_DB_DATABASE")
```

### Configuration in Northflank

You **don't need to set** `MONGODB_URL` or any MongoDB variables manually!

Just link the MongoDB addon to your service:

1. Go to your service in Northflank
2. Click **Addons** tab
3. Click **Link Addon**
4. Select your MongoDB addon
5. Click **Link**

The variables are automatically synced.

---

## Priority Order

The backend checks for MongoDB configuration in this order:

1. **MONGODB_URL** (if set, uses this - for local dev)
2. **Northflank variables** (MONGO_SRV, USERNAME, PASSWORD, DATABASE)
3. **Fallback** (mongodb://localhost:27017 - if nothing is configured)

This means:
- Local development: Set `MONGODB_URL` in `backend/.env`
- Northflank production: Link MongoDB addon (automatic)
- No configuration: Falls back to localhost

---

## Connection String Format

### Local Development
```
mongodb://localhost:27017/ctf_platform
```

### Northflank Production
```
mongodb+srv://username:password@cluster.mongodb.net/database
```

The `mongodb+srv://` protocol is used for MongoDB Atlas/cloud deployments and includes:
- Automatic DNS seedlist discovery
- TLS/SSL encryption by default
- Connection pooling

---

## Environment Variables Summary

### Required for Local Development
```bash
MONGODB_URL=mongodb://localhost:27017/ctf_platform
```

### Auto-synced in Northflank (from MongoDB addon)
```bash
NF_SAKI_DB_MONGO_SRV=mongodb://username:password@host:27017/database?replicaSet=rs0&authSource=database&tls=true
NF_SAKI_DB_HOST=mongo-0.saki-db--xxx.addon.code.run
NF_SAKI_DB_USERNAME=5444c8289b05d0bf
NF_SAKI_DB_PASSWORD=ed512b392003e3da2f627736a4014220
NF_SAKI_DB_DATABASE=cc7d010da6e5
# ... and 10 more variables
```

### Not Required in Northflank
```bash
# ❌ Don't set these manually in Northflank
MONGODB_URL=...  # Not needed, auto-constructed
```

---

## Testing the Configuration

### Test 1: Local Development

```bash
# Set environment variable
export MONGODB_URL=mongodb://localhost:27017/ctf_platform

# Start backend
cd backend
uvicorn main:app --reload

# Check logs
# Should see: "Successfully connected to MongoDB at mongodb://localhost:27017/ctf_platform"
```

### Test 2: Northflank Production

```bash
# In Northflank, link MongoDB addon to service
# No manual configuration needed

# Check service logs after deployment
# Should see: "Successfully connected to MongoDB at mongodb+srv://..."
```

---

## Troubleshooting

### Local Development

**Problem**: `ConnectionFailure: [Errno 111] Connection refused`

**Solution**: Make sure MongoDB is running locally:
```bash
# Check if MongoDB is running
mongosh

# If not, start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Windows: Start MongoDB service from Services
```

### Northflank Production

**Problem**: `ConnectionFailure: Authentication failed`

**Solution**: 
1. Verify MongoDB addon is linked to service
2. Check service logs for environment variables
3. Restart service to refresh environment variables

**Problem**: `No MongoDB configuration found, using localhost`

**Solution**:
1. Link MongoDB addon to service in Northflank
2. Verify addon is in "Running" state
3. Redeploy service

---

## Code Implementation

The MongoDB connection logic is in `backend/database/mongodb.py`:

```python
def get_mongodb_url() -> str:
    """
    Get MongoDB connection URL from environment variables.
    Supports two modes:
    1. Simple: MONGODB_URL (for local development)
    2. Northflank: Individual variables (MONGO_SRV, USERNAME, PASSWORD, etc.)
    """
    # Check if simple MONGODB_URL is provided (local development)
    mongodb_url = os.getenv("MONGODB_URL")
    if mongodb_url:
        return mongodb_url
    
    # Otherwise, construct from Northflank-provided variables
    mongo_srv = os.getenv("MONGO_SRV")
    username = os.getenv("USERNAME")
    password = os.getenv("PASSWORD")
    database = os.getenv("DATABASE")
    
    if mongo_srv and username and password:
        # Construct MongoDB connection string
        return f"mongodb+srv://{username}:{password}@{mongo_srv}/{database or 'ctf_platform'}"
    
    # Fallback to localhost for development
    logger.warning("No MongoDB configuration found, using localhost")
    return "mongodb://localhost:27017"
```

---

## Best Practices

### Local Development
✅ Use `MONGODB_URL` in `backend/.env`
✅ Keep `.env` in `.gitignore`
✅ Use `backend/.env.example` as template

### Northflank Production
✅ Link MongoDB addon to service
✅ Let Northflank auto-sync variables
✅ Don't set MongoDB variables manually
✅ Monitor connection in service logs

### Security
✅ Never commit `.env` files
✅ Use strong passwords for MongoDB
✅ Enable TLS/SSL in production
✅ Restrict MongoDB network access

---

## Migration Guide

### From Manual MONGODB_URL to Auto-synced

If you previously set `MONGODB_URL` manually in Northflank:

1. Remove `MONGODB_URL` from service environment variables
2. Link MongoDB addon to service
3. Redeploy service
4. Verify connection in logs

The backend will automatically detect and use the Northflank-provided variables.

---

## Summary

| Environment | Configuration | Variables |
|-------------|---------------|-----------|
| **Local Dev** | Set `MONGODB_URL` in `backend/.env` | 1 variable |
| **Northflank** | Link MongoDB addon | 14 auto-synced variables |
| **Fallback** | No configuration | Uses localhost |

**Key Point**: You don't need to manually configure MongoDB in Northflank - just link the addon!
