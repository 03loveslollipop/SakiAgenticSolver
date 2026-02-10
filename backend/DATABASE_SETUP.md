# MongoDB Database Setup Guide

## Overview

The CTF Challenge Automation Platform uses MongoDB as its database with Motor (async driver) for asynchronous operations.

## Prerequisites

1. **MongoDB Server**: Install MongoDB Community Edition
   - Download from: https://www.mongodb.com/try/download/community
   - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`

2. **Python Dependencies**: Install required packages
   ```bash
   pip install motor pymongo mongomock
   ```

## Configuration

### Environment Variables

Set the following environment variables to configure the database connection:

```bash
# MongoDB connection string (default: mongodb://localhost:27017)
export MONGODB_URL="mongodb://localhost:27017"

# Database name (default: ctf_platform)
export DATABASE_NAME="ctf_platform"
```

For production with authentication:
```bash
export MONGODB_URL="mongodb://username:password@host:port/database?authSource=admin"
```

## Database Structure

### Collections

#### 1. sessions
Stores VM session metadata.

**Schema**:
```json
{
  "_id": "uuid-string",
  "vm_size": "small|medium|large",
  "agent_type": "codex|copilot",
  "agent_model": "string",
  "challenge_urls": ["url1", "url2"],
  "instructions": "string",
  "created_at": "ISO-8601 datetime",
  "status": "creating|running|stopped|error",
  "vm_ip": "string or null",
  "ssh_username": "ctfuser",
  "ssh_port": 22,
  "resource_group": "string",
  "error_message": "string or null"
}
```

**Indexes**:
- `_id`: Primary key (default)
- `created_at`: For sorting sessions by creation time
- `status`: For filtering sessions by status

#### 2. ssh_keys
Stores SSH key pairs for VM access.

**Schema**:
```json
{
  "_id": "auto-generated",
  "session_id": "uuid-string",
  "public_key": "string",
  "private_key": "encrypted-string",
  "created_at": "ISO-8601 datetime"
}
```

**Indexes**:
- `session_id`: Unique index for fast lookups

## Initialization

### Option 1: Using the initialization script

Run the initialization script to verify connection and create indexes:

```bash
cd backend
python init_mongodb.py
```

### Option 2: Automatic initialization on app startup

The FastAPI application automatically initializes MongoDB on startup:

```bash
cd backend
uvicorn main:app --reload
```

The application will:
1. Connect to MongoDB
2. Create required indexes
3. Verify connection health

## Testing

### Test MongoDB setup

Run the test script to verify all operations work correctly:

```bash
cd backend
python test_mongodb.py
```

This will test:
- MongoDB connection
- Index creation
- Session CRUD operations
- KeyPair CRUD operations

### Health Check Endpoint

Once the application is running, check the health endpoint:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

## Usage Examples

### Creating a Session

```python
from database import get_database
from models import Session

# Get database instance
db = get_database()
sessions_collection = db["sessions"]

# Create a session
session = Session(
    vm_size='medium',
    agent_type='copilot',
    agent_model='gpt-4',
    challenge_urls=['http://example.com/challenge.bin'],
    instructions='Solve this challenge',
    resource_group='my-resource-group'
)

# Insert into MongoDB (using alias for _id)
session_dict = session.dict(by_alias=True)
result = await sessions_collection.insert_one(session_dict)
print(f"Created session: {result.inserted_id}")
```

### Retrieving a Session

```python
# Find by ID
session = await sessions_collection.find_one({"_id": session_id})

# Find all sessions sorted by creation time
cursor = sessions_collection.find().sort("created_at", -1)
sessions = await cursor.to_list(length=100)
```

### Updating a Session

```python
# Update session status
result = await sessions_collection.update_one(
    {"_id": session_id},
    {"$set": {"status": "running", "vm_ip": "20.1.2.3"}}
)
```

### Deleting a Session

```python
# Delete session
result = await sessions_collection.delete_one({"_id": session_id})
```

## Troubleshooting

### Connection Issues

If you see connection errors:

1. **Check MongoDB is running**:
   ```bash
   # For local installation
   sudo systemctl status mongod
   
   # For Docker
   docker ps | grep mongodb
   ```

2. **Verify connection string**:
   ```bash
   mongosh "mongodb://localhost:27017"
   ```

3. **Check firewall settings**: Ensure port 27017 is accessible

### Index Creation Failures

If indexes fail to create:

1. **Check permissions**: Ensure the MongoDB user has write permissions
2. **Drop existing indexes**: If indexes exist with different specifications
   ```python
   await sessions_collection.drop_indexes()
   ```

### Performance Issues

For production deployments:

1. **Enable connection pooling**: Motor handles this automatically
2. **Monitor slow queries**: Use MongoDB profiler
3. **Add additional indexes**: Based on query patterns
4. **Consider sharding**: For large-scale deployments

## Production Considerations

### Security

1. **Enable authentication**: Always use authentication in production
2. **Use TLS/SSL**: Encrypt connections
3. **Encrypt private keys**: Use encryption at rest for SSH private keys
4. **Limit network access**: Use firewall rules

### Backup

1. **Regular backups**: Use `mongodump` for backups
   ```bash
   mongodump --uri="mongodb://localhost:27017" --db=ctf_platform --out=/backup
   ```

2. **Point-in-time recovery**: Enable oplog for replica sets

### Monitoring

1. **Connection pool metrics**: Monitor active connections
2. **Query performance**: Track slow queries
3. **Disk usage**: Monitor database size
4. **Replication lag**: For replica sets

## Migration from SQLAlchemy

If migrating from the previous SQLAlchemy implementation:

1. **Export data**: Export sessions and keys from SQLite
2. **Transform data**: Convert to MongoDB format
3. **Import data**: Use `mongoimport` or Python script
4. **Verify**: Test all operations work correctly

## Additional Resources

- [Motor Documentation](https://motor.readthedocs.io/)
- [MongoDB Python Driver](https://pymongo.readthedocs.io/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [FastAPI with MongoDB](https://www.mongodb.com/developer/languages/python/python-quickstart-fastapi/)
