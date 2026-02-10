# MongoDB connection and initialization using Motor (async driver)

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import os
import logging

logger = logging.getLogger(__name__)


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
        # Format: mongodb+srv://username:password@host/database
        return f"mongodb+srv://{username}:{password}@{mongo_srv}/{database or 'ctf_platform'}"
    
    # Fallback to localhost for development
    logger.warning("No MongoDB configuration found, using localhost")
    return "mongodb://localhost:27017"


# MongoDB connection string from environment variables
MONGODB_URL = get_mongodb_url()
DATABASE_NAME = os.getenv("DATABASE", os.getenv("DATABASE_NAME", "ctf_platform"))

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
