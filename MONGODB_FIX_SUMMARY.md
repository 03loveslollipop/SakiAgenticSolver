# MongoDB Connection Fix Summary

## Problem

The backend was failing to connect to MongoDB in Northflank deployment with the error:
```
No MongoDB configuration found, using localhost
Failed to connect to MongoDB: localhost:27017: [Errno 111] Connection refused
```

## Root Cause

The backend code was looking for environment variables with plain names:
- `MONGO_SRV`
- `USERNAME`
- `PASSWORD`
- `DATABASE`

But Northflank's MongoDB addon provides variables with a prefix based on the addon name:
- `NF_SAKI_DB_MONGO_SRV` (full connection string)
- `NF_SAKI_DB_HOST`
- `NF_SAKI_DB_USERNAME`
- `NF_SAKI_DB_PASSWORD`
- `NF_SAKI_DB_DATABASE`

## Solution

Updated `backend/database/mongodb.py` to:

1. **First priority**: Check for `NF_SAKI_DB_MONGO_SRV` (full connection string from Northflank)
2. **Second priority**: Try individual variables with `NF_SAKI_DB_` prefix
3. **Fallback**: Try plain variable names (for backward compatibility)
4. **Last resort**: Use localhost (for local development)

### Code Changes

```python
def get_mongodb_url() -> str:
    # 1. Local development
    mongodb_url = os.getenv("MONGODB_URL")
    if mongodb_url:
        return mongodb_url
    
    # 2. Northflank full connection string (preferred)
    nf_mongo_srv = os.getenv("NF_SAKI_DB_MONGO_SRV")
    if nf_mongo_srv:
        return nf_mongo_srv
    
    # 3. Construct from individual variables (with fallback)
    mongo_srv = os.getenv("NF_SAKI_DB_HOST") or os.getenv("MONGO_SRV")
    username = os.getenv("NF_SAKI_DB_USERNAME") or os.getenv("USERNAME")
    password = os.getenv("NF_SAKI_DB_PASSWORD") or os.getenv("PASSWORD")
    database = os.getenv("NF_SAKI_DB_DATABASE") or os.getenv("DATABASE")
    
    if mongo_srv and username and password:
        return f"mongodb+srv://{username}:{password}@{mongo_srv}/{database}"
    
    # 4. Fallback to localhost
    return "mongodb://localhost:27017"
```

## Expected Result

After redeployment, the backend should:
1. Detect `NF_SAKI_DB_MONGO_SRV` environment variable
2. Use the full connection string provided by Northflank
3. Successfully connect to MongoDB
4. Log: "Using NF_SAKI_DB_MONGO_SRV from Northflank addon"
5. Log: "Successfully connected to MongoDB at mongodb://..."

## Files Modified

1. `backend/database/mongodb.py` - Updated connection logic
2. `backend/.env.example` - Updated documentation with correct variable names
3. `MONGODB_CONFIGURATION.md` - Updated documentation with Northflank variable names

## Next Steps

1. Commit and push changes to GitHub
2. Northflank will automatically redeploy the backend
3. Check logs to verify successful MongoDB connection
4. Test API endpoints to ensure database operations work

## Verification

After deployment, check the logs for:
```
✅ "Using NF_SAKI_DB_MONGO_SRV from Northflank addon"
✅ "Successfully connected to MongoDB at mongodb://..."
✅ "Started server process"
✅ "Application startup complete"
```

Instead of:
```
❌ "No MongoDB configuration found, using localhost"
❌ "Failed to connect to MongoDB: localhost:27017"
❌ "Application startup failed"
```
