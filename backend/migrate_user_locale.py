#!/usr/bin/env python3
"""
Migration script to add locale field to existing users.
This script updates all existing users in the database to have a locale field with default value 'en'.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from database.mongodb import connect_to_mongo, get_database, close_mongo_connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def migrate_user_locale():
    """Add locale field to all existing users with default value 'en'"""
    try:
        # Connect to MongoDB
        await connect_to_mongo()
        db = get_database()
        users_collection = db["users"]
        
        # Count users before migration
        total_users = await users_collection.count_documents({})
        logger.info(f"Found {total_users} users in database")
        
        if total_users == 0:
            logger.info("No users to migrate")
            return
        
        # Find users without locale field
        users_without_locale = users_collection.find({"locale": {"$exists": False}})
        users_to_update = []
        
        async for user in users_without_locale:
            users_to_update.append(user["_id"])
        
        if not users_to_update:
            logger.info("All users already have locale field")
            return
        
        logger.info(f"Found {len(users_to_update)} users without locale field")
        
        # Update users to add locale field with default value 'en'
        result = await users_collection.update_many(
            {"_id": {"$in": users_to_update}},
            {"$set": {"locale": "en"}}
        )
        
        logger.info(f"Successfully updated {result.modified_count} users with locale='en'")
        
        # Verify the update
        users_without_locale_after = await users_collection.count_documents({"locale": {"$exists": False}})
        if users_without_locale_after == 0:
            logger.info("Migration completed successfully - all users now have locale field")
        else:
            logger.warning(f"Migration incomplete - {users_without_locale_after} users still missing locale field")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        # Close MongoDB connection
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(migrate_user_locale())