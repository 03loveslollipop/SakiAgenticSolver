#!/usr/bin/env python3
"""
MongoDB initialization script for CTF Challenge Automation Platform.
Run this script to verify MongoDB connection and create indexes.
"""

import asyncio
from database import connect_to_mongo, create_indexes, close_mongo_connection, check_connection


async def main():
    """Initialize MongoDB connection and create indexes"""
    print("Initializing MongoDB connection...")
    
    try:
        # Connect to MongoDB
        await connect_to_mongo()
        print("✓ Successfully connected to MongoDB")
        
        # Check connection health
        is_healthy = await check_connection()
        if is_healthy:
            print("✓ MongoDB connection is healthy")
        else:
            print("✗ MongoDB connection health check failed")
            return
        
        # Create indexes
        print("\nCreating indexes...")
        await create_indexes()
        print("✓ Indexes created successfully")
        
        print("\n" + "=" * 50)
        print("MongoDB initialization completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n✗ Error during initialization: {e}")
        raise
    finally:
        # Close connection
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
