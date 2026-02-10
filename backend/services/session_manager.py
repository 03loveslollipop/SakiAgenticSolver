# Session Manager Service for managing session metadata and persistence

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, PyMongoError
from datetime import datetime
from typing import List, Optional
import logging
import uuid

from models.schemas import Session, VMCreationRequest

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages session metadata and persistence using MongoDB.
    Provides CRUD operations for session documents with async Motor driver.
    """
    
    def __init__(self, mongo_client: AsyncIOMotorClient, database_name: str = "ctf_platform"):
        """
        Initialize SessionManager with MongoDB client.
        
        Args:
            mongo_client: AsyncIOMotorClient instance
            database_name: Name of the MongoDB database
        """
        self.db = mongo_client[database_name]
        self.sessions_collection = self.db["sessions"]
    
    async def create_indexes(self):
        """
        Create indexes on created_at and status fields for performance.
        Should be called on application startup.
        """
        await self.sessions_collection.create_index([("created_at", -1)], name="idx_created_at_desc")
        await self.sessions_collection.create_index("status", name="idx_status")
        logger.info("Created indexes for sessions collection")
    
    async def create_session(self, session_data: dict) -> Session:
        """
        Create a new session document in MongoDB.
        
        Args:
            session_data: Dictionary containing session fields
            
        Returns:
            Session object with the created session data
            
        Raises:
            ValueError: If session data is invalid
            DuplicateKeyError: If session with same ID already exists
            PyMongoError: For other MongoDB errors
        """
        try:
            # Generate session ID if not provided
            if "_id" not in session_data and "id" not in session_data:
                session_data["_id"] = str(uuid.uuid4())
            elif "id" in session_data and "_id" not in session_data:
                session_data["_id"] = session_data["id"]
            
            # Set default values if not provided
            if "created_at" not in session_data:
                session_data["created_at"] = datetime.utcnow()
            if "status" not in session_data:
                session_data["status"] = "creating"
            if "ssh_username" not in session_data:
                session_data["ssh_username"] = "ctfuser"
            if "ssh_port" not in session_data:
                session_data["ssh_port"] = 22
            
            # Validate required fields
            required_fields = ["vm_size", "agent_type", "agent_model", "challenge_urls", "instructions", "resource_group"]
            for field in required_fields:
                if field not in session_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Insert into MongoDB
            result = await self.sessions_collection.insert_one(session_data)
            
            # Retrieve the inserted document
            inserted_doc = await self.sessions_collection.find_one({"_id": result.inserted_id})
            
            logger.info(f"Created session {result.inserted_id}")
            
            # Convert MongoDB document to Session object
            return self._document_to_session(inserted_doc)
            
        except DuplicateKeyError as e:
            logger.error(f"Session with ID {session_data.get('_id')} already exists")
            raise ValueError(f"Session with ID {session_data.get('_id')} already exists") from e
        except PyMongoError as e:
            logger.error(f"MongoDB error creating session: {e}")
            raise
    
    async def get_session(self, session_id: str) -> Optional[Session]:
        """
        Retrieve session document by ID from MongoDB.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Session object if found, None otherwise
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            session_doc = await self.sessions_collection.find_one({"_id": session_id})
            
            if not session_doc:
                logger.warning(f"Session {session_id} not found")
                return None
            
            return self._document_to_session(session_doc)
            
        except PyMongoError as e:
            logger.error(f"MongoDB error retrieving session {session_id}: {e}")
            raise
    
    async def list_sessions(self) -> List[Session]:
        """
        List all session documents sorted by created_at descending.
        
        Returns:
            List of Session objects sorted by creation time (newest first)
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            cursor = self.sessions_collection.find().sort("created_at", -1)
            sessions = []
            
            async for session_doc in cursor:
                sessions.append(self._document_to_session(session_doc))
            
            logger.info(f"Retrieved {len(sessions)} sessions")
            return sessions
            
        except PyMongoError as e:
            logger.error(f"MongoDB error listing sessions: {e}")
            raise
    
    async def update_session_status(self, session_id: str, status: str, error_message: Optional[str] = None) -> Optional[Session]:
        """
        Update session status field in MongoDB.
        
        Args:
            session_id: Unique session identifier
            status: New status value (creating, running, stopped, error)
            error_message: Optional error message if status is 'error'
            
        Returns:
            Updated Session object if found, None otherwise
            
        Raises:
            ValueError: If status is invalid
            PyMongoError: For MongoDB errors
        """
        # Validate status
        valid_statuses = ['creating', 'running', 'stopped', 'error']
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}. Must be one of: {', '.join(valid_statuses)}")
        
        try:
            update_data = {"status": status}
            if error_message is not None:
                update_data["error_message"] = error_message
            
            result = await self.sessions_collection.find_one_and_update(
                {"_id": session_id},
                {"$set": update_data},
                return_document=True  # Return the updated document
            )
            
            if not result:
                logger.warning(f"Session {session_id} not found for status update")
                return None
            
            logger.info(f"Updated session {session_id} status to {status}")
            return self._document_to_session(result)
            
        except PyMongoError as e:
            logger.error(f"MongoDB error updating session {session_id} status: {e}")
            raise
    
    async def update_session(self, session_id: str, update_data: dict) -> Optional[Session]:
        """
        Update session fields in MongoDB.
        
        Args:
            session_id: Unique session identifier
            update_data: Dictionary of fields to update
            
        Returns:
            Updated Session object if found, None otherwise
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            result = await self.sessions_collection.find_one_and_update(
                {"_id": session_id},
                {"$set": update_data},
                return_document=True  # Return the updated document
            )
            
            if not result:
                logger.warning(f"Session {session_id} not found for update")
                return None
            
            logger.info(f"Updated session {session_id}")
            return self._document_to_session(result)
            
        except PyMongoError as e:
            logger.error(f"MongoDB error updating session {session_id}: {e}")
            raise
    
    async def delete_session(self, session_id: str) -> bool:
        """
        Delete session document from MongoDB.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            result = await self.sessions_collection.delete_one({"_id": session_id})
            
            if result.deleted_count > 0:
                logger.info(f"Deleted session {session_id}")
                return True
            else:
                logger.warning(f"Session {session_id} not found for deletion")
                return False
                
        except PyMongoError as e:
            logger.error(f"MongoDB error deleting session {session_id}: {e}")
            raise
    
    def _document_to_session(self, doc: dict) -> Session:
        """
        Convert MongoDB document to Session object.
        
        Args:
            doc: MongoDB document dictionary
            
        Returns:
            Session object
        """
        # MongoDB uses _id, but our Session model uses id
        if "_id" in doc:
            doc["id"] = doc["_id"]
        
        return Session(**doc)
