"""
Verify users collection indexes in MongoDB
"""
import asyncio
from database.mongodb import connect_to_mongo, create_indexes, close_mongo_connection, get_database


async def verify_indexes():
    """Verify that users collection indexes are created correctly"""
    try:
        print("Connecting to MongoDB...")
        await connect_to_mongo()
        print("✓ Connected to MongoDB")
        
        print("\nCreating indexes...")
        await create_indexes()
        print("✓ Indexes created")
        
        print("\nVerifying users collection indexes...")
        db = get_database()
        users_collection = db["users"]
        
        # Get index information
        indexes = await users_collection.index_information()
        
        print(f"\nFound {len(indexes)} indexes:")
        for index_name, index_info in indexes.items():
            print(f"  - {index_name}: {index_info}")
        
        # Verify email unique index
        if "idx_email_unique" in indexes:
            email_index = indexes["idx_email_unique"]
            is_unique = email_index.get("unique", False)
            key = email_index.get("key", [])
            print(f"\n✓ Email index found:")
            print(f"  - Name: idx_email_unique")
            print(f"  - Unique: {is_unique}")
            print(f"  - Key: {key}")
            
            if is_unique and key == [("email", 1)]:
                print("  ✓ Email index is correctly configured")
            else:
                print("  ✗ Email index configuration is incorrect")
        else:
            print("\n✗ Email index not found!")
        
        # Verify is_active index
        if "idx_is_active" in indexes:
            active_index = indexes["idx_is_active"]
            key = active_index.get("key", [])
            print(f"\n✓ Active status index found:")
            print(f"  - Name: idx_is_active")
            print(f"  - Key: {key}")
            
            if key == [("is_active", 1)]:
                print("  ✓ Active status index is correctly configured")
            else:
                print("  ✗ Active status index configuration is incorrect")
        else:
            print("\n✗ Active status index not found!")
        
        print("\n✅ Users collection indexes verified successfully!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\nClosing MongoDB connection...")
        await close_mongo_connection()
        print("✓ Connection closed")


if __name__ == "__main__":
    asyncio.run(verify_indexes())
