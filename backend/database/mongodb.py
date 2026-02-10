# MongoDB connection and initialization using Motor (async driver)

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import os
import logging

logger = logging.getLogger(__name__)


def get_mongodb_url() -> str:
    """
    Get MongoDB connection URL from environment variables.
    Supports three modes:
    1. Simple: MONGODB_URL (for local development)
    2. Northflank: Full connection string from NF_SAKI_DB_MONGO_SRV
    3. Northflank: Individual variables (for custom construction)
    """
    # Check if simple MONGODB_URL is provided (local development)
    mongodb_url = os.getenv("MONGODB_URL")
    if mongodb_url:
        logger.info("Using MONGODB_URL from environment")
        return mongodb_url
    
    # Check for Northflank full connection string (preferred)
    nf_mongo_srv = os.getenv("NF_SAKI_DB_MONGO_SRV")
    if nf_mongo_srv:
        logger.info("Using NF_SAKI_DB_MONGO_SRV from Northflank addon")
        return nf_mongo_srv
    
    # Otherwise, construct from Northflank-provided individual variables
    # Try with NF_SAKI_DB_ prefix first (Northflank addon naming)
    mongo_srv = os.getenv("NF_SAKI_DB_HOST") or os.getenv("MONGO_SRV")
    username = os.getenv("NF_SAKI_DB_USERNAME") or os.getenv("USERNAME")
    password = os.getenv("NF_SAKI_DB_PASSWORD") or os.getenv("PASSWORD")
    database = os.getenv("NF_SAKI_DB_DATABASE") or os.getenv("DATABASE")
    
    if mongo_srv and username and password:
        # Construct MongoDB connection string
        # Format: mongodb+srv://username:password@host/database
        # IMPORTANT: Must include database name for proper authentication
        db_name = database or 'ctf_platform'
        logger.info(f"Constructing MongoDB URL from individual variables (host: {mongo_srv}, database: {db_name})")
        return f"mongodb+srv://{username}:{password}@{mongo_srv}/{db_name}"
    
    # Fallback to localhost for development
    logger.warning("No MongoDB configuration found, using localhost")
    return "mongodb://localhost:27017"


# MongoDB connection string from environment variables
MONGODB_URL = get_mongodb_url()

# Get database name - prioritize environment variables, fallback to parsing from URL
def get_database_name() -> str:
    """Get the database name from environment or MongoDB URL"""
    # Try environment variables first (Northflank provides this)
    db_name = os.getenv("NF_SAKI_DB_DATABASE") or os.getenv("DATABASE") or os.getenv("DATABASE_NAME")
    if db_name:
        logger.info(f"Database name from environment: {db_name}")
        return db_name
    
    # Try to parse from MongoDB URL
    if MONGODB_URL:
        # MongoDB URL format: mongodb://host:port/database or mongodb+srv://user:pass@host/database
        try:
            # Split by '/' and get the last part (database name)
            parts = MONGODB_URL.split('/')
            if len(parts) > 3:
                # Remove query parameters if any
                db_from_url = parts[-1].split('?')[0]
                if db_from_url and db_from_url not in ['', 'admin', 'test']:
                    logger.info(f"Database name from URL: {db_from_url}")
                    return db_from_url
        except Exception as e:
            logger.warning(f"Failed to parse database name from URL: {e}")
    
    # Default fallback (only for local development)
    logger.warning("No database name found in environment or URL, using default: ctf_platform")
    return "ctf_platform"

DATABASE_NAME = get_database_name()
logger.info(f"Using database: {DATABASE_NAME}")

# Global MongoDB client instance
mongo_client: AsyncIOMotorClient = None


async def connect_to_mongo():
    """
    Connect to MongoDB and verify connection.
    Should be called on application startup.
    """
    global mongo_client
    try:
        mongo_client = AsyncIOMotorClient(MONGODB_URL)
        # Verify connection
        await mongo_client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB at {MONGODB_URL}")
        return mongo_client
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """
    Close MongoDB connection.
    Should be called on application shutdown.
    """
    global mongo_client
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed")


def get_database():
    """
    Get the MongoDB database instance.
    Returns the database object for the configured database name.
    """
    if mongo_client is None:
        raise RuntimeError("MongoDB client not initialized. Call connect_to_mongo() first.")
    return mongo_client[DATABASE_NAME]


async def create_indexes():
    """
    Create indexes for MongoDB collections.
    Should be called on application startup after connecting to MongoDB.
    """
    db = get_database()
    
    # Users collection indexes
    users_collection = db["users"]
    await users_collection.create_index("email", unique=True, name="idx_email_unique")
    await users_collection.create_index("is_active", name="idx_is_active")
    logger.info("Created indexes for users collection")
    
    # Sessions collection indexes
    sessions_collection = db["sessions"]
    await sessions_collection.create_index("created_at", name="idx_created_at")
    await sessions_collection.create_index("status", name="idx_status")
    logger.info("Created indexes for sessions collection")
    
    # SSH keys collection indexes
    keys_collection = db["ssh_keys"]
    await keys_collection.create_index("session_id", unique=True, name="idx_session_id_unique")
    logger.info("Created indexes for ssh_keys collection")


async def check_connection() -> bool:
    """
    Check if MongoDB connection is healthy.
    Returns True if connection is healthy, False otherwise.
    """
    try:
        if mongo_client is None:
            return False
        await mongo_client.admin.command('ping')
        return True
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        return False
