# Writeup Manager Service for managing challenge writeups

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, PyMongoError
from datetime import datetime
from typing import List, Optional
import logging

from models.schemas import Writeup, WriteupSegment

logger = logging.getLogger(__name__)


class WriteupManager:
    """
    Manages challenge writeups and provides retrieval capabilities.
    Stores writeups in MongoDB with text search support for MCP server integration.
    """
    
    def __init__(self, mongo_client: AsyncIOMotorClient, database_name: str = "ctf_platform"):
        """
        Initialize WriteupManager with MongoDB client.
        
        Args:
            mongo_client: AsyncIOMotorClient instance
            database_name: Name of the MongoDB database
        """
        self.db = mongo_client[database_name]
        self.writeups_collection = self.db["writeups"]
    
    async def create_indexes(self):
        """
        Create indexes for writeups collection including text index for search.
        Should be called on application startup.
        """
        # Create unique index on session_id
        await self.writeups_collection.create_index("session_id", unique=True, name="idx_session_id_unique")
        
        # Create index on completion_timestamp for sorting
        await self.writeups_collection.create_index([("completion_timestamp", -1)], name="idx_completion_timestamp_desc")
        
        # Create text index on content field for full-text search
        await self.writeups_collection.create_index([("content", "text")], name="idx_content_text")
        
        logger.info("Created indexes for writeups collection")
    
    async def create_writeup(
        self,
        session_id: str,
        challenge_urls: List[str],
        content: str,
        agent_type: str,
        agent_model: str,
        challenge_type: Optional[str] = None
    ) -> Writeup:
        """
        Store writeup in MongoDB.
        
        Args:
            session_id: Unique session identifier
            challenge_urls: List of challenge file URLs
            content: Markdown content of the writeup
            agent_type: Type of agent (codex or copilot)
            agent_model: Model name used
            challenge_type: Optional challenge type (pwn, crypto, reversing, web, forensics)
            
        Returns:
            Writeup object with the created writeup data
            
        Raises:
            ValueError: If writeup already exists for session_id or invalid data
            PyMongoError: For other MongoDB errors
        """
        try:
            # Check if writeup already exists for this session
            existing = await self.writeups_collection.find_one({"session_id": session_id})
            if existing:
                raise ValueError(f"Writeup already exists for session {session_id}")
            
            # Validate required fields
            if not session_id or not session_id.strip():
                raise ValueError("session_id is required")
            if not challenge_urls or len(challenge_urls) == 0:
                raise ValueError("At least one challenge URL is required")
            if not content or not content.strip():
                raise ValueError("Writeup content cannot be empty")
            if agent_type not in ['codex', 'copilot']:
                raise ValueError(f"Invalid agent_type: {agent_type}")
            if not agent_model or not agent_model.strip():
                raise ValueError("agent_model is required")
            
            # Validate challenge_type if provided
            if challenge_type is not None:
                valid_types = ['pwn', 'crypto', 'reversing', 'web', 'forensics']
                if challenge_type not in valid_types:
                    raise ValueError(f"Invalid challenge_type: {challenge_type}. Must be one of: {', '.join(valid_types)}")
            
            # Create writeup document
            writeup_doc = {
                "session_id": session_id,
                "challenge_urls": challenge_urls,
                "challenge_type": challenge_type,
                "content": content,
                "completion_timestamp": datetime.utcnow(),
                "agent_type": agent_type,
                "agent_model": agent_model
            }
            
            # Insert into MongoDB
            result = await self.writeups_collection.insert_one(writeup_doc)
            
            # Retrieve the inserted document
            inserted_doc = await self.writeups_collection.find_one({"_id": result.inserted_id})
            
            logger.info(f"Created writeup for session {session_id}")
            
            # Convert MongoDB document to Writeup object
            return self._document_to_writeup(inserted_doc)
            
        except DuplicateKeyError as e:
            logger.error(f"Writeup for session {session_id} already exists")
            raise ValueError(f"Writeup for session {session_id} already exists") from e
        except PyMongoError as e:
            logger.error(f"MongoDB error creating writeup: {e}")
            raise
    
    async def get_writeup(self, session_id: str) -> Optional[Writeup]:
        """
        Retrieve writeup by session ID.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Writeup object if found, None otherwise
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            writeup_doc = await self.writeups_collection.find_one({"session_id": session_id})
            
            if not writeup_doc:
                logger.warning(f"Writeup not found for session {session_id}")
                return None
            
            return self._document_to_writeup(writeup_doc)
            
        except PyMongoError as e:
            logger.error(f"MongoDB error retrieving writeup for session {session_id}: {e}")
            raise
    
    async def list_writeups(self, skip: int = 0, limit: int = 20) -> List[Writeup]:
        """
        List writeups with pagination.
        
        Args:
            skip: Number of documents to skip (for pagination)
            limit: Maximum number of documents to return
            
        Returns:
            List of Writeup objects sorted by completion_timestamp (newest first)
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            cursor = self.writeups_collection.find().sort("completion_timestamp", -1).skip(skip).limit(limit)
            writeups = []
            
            async for writeup_doc in cursor:
                writeups.append(self._document_to_writeup(writeup_doc))
            
            logger.info(f"Retrieved {len(writeups)} writeups (skip={skip}, limit={limit})")
            return writeups
            
        except PyMongoError as e:
            logger.error(f"MongoDB error listing writeups: {e}")
            raise
    
    async def search_writeups(
        self,
        query: str,
        challenge_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Writeup]:
        """
        Search writeups by keywords or challenge type using MongoDB text search.
        
        Args:
            query: Search query string (keywords)
            challenge_type: Optional filter by challenge type
            limit: Maximum number of results to return
            
        Returns:
            List of Writeup objects matching the search criteria
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            # Build search filter
            search_filter = {}
            
            # Add text search if query provided
            if query and query.strip():
                search_filter["$text"] = {"$search": query}
            
            # Add challenge_type filter if provided
            if challenge_type:
                valid_types = ['pwn', 'crypto', 'reversing', 'web', 'forensics']
                if challenge_type not in valid_types:
                    raise ValueError(f"Invalid challenge_type: {challenge_type}")
                search_filter["challenge_type"] = challenge_type
            
            # Execute search
            if "$text" in search_filter:
                # Include text score for relevance sorting
                cursor = self.writeups_collection.find(
                    search_filter,
                    {"score": {"$meta": "textScore"}}
                ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            else:
                # No text search, just filter by challenge_type and sort by timestamp
                cursor = self.writeups_collection.find(search_filter).sort("completion_timestamp", -1).limit(limit)
            
            writeups = []
            async for writeup_doc in cursor:
                writeups.append(self._document_to_writeup(writeup_doc))
            
            logger.info(f"Search returned {len(writeups)} writeups for query: {query}, type: {challenge_type}")
            return writeups
            
        except PyMongoError as e:
            logger.error(f"MongoDB error searching writeups: {e}")
            raise
    
    async def get_writeup_segments(
        self,
        query: str,
        max_segments: int = 5
    ) -> List[WriteupSegment]:
        """
        Retrieve relevant segments from writeups for MCP server integration.
        Uses text search to find relevant writeups and extracts segments.
        
        Args:
            query: Search query string
            max_segments: Maximum number of segments to return
            
        Returns:
            List of WriteupSegment objects with relevant excerpts
            
        Raises:
            PyMongoError: For MongoDB errors
        """
        try:
            if not query or not query.strip():
                return []
            
            # Search for relevant writeups using text search
            search_filter = {"$text": {"$search": query}}
            cursor = self.writeups_collection.find(
                search_filter,
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(max_segments)
            
            segments = []
            async for writeup_doc in cursor:
                # Extract relevant segment (for now, return first 500 chars of content)
                # In a more sophisticated implementation, we could use NLP to extract
                # the most relevant paragraphs based on the query
                content = writeup_doc.get("content", "")
                segment_text = content[:500] + "..." if len(content) > 500 else content
                
                segment = WriteupSegment(
                    session_id=writeup_doc["session_id"],
                    challenge_type=writeup_doc.get("challenge_type"),
                    segment=segment_text,
                    relevance_score=writeup_doc.get("score", 0.0)
                )
                segments.append(segment)
            
            logger.info(f"Retrieved {len(segments)} writeup segments for query: {query}")
            return segments
            
        except PyMongoError as e:
            logger.error(f"MongoDB error retrieving writeup segments: {e}")
            raise
    
    def _document_to_writeup(self, doc: dict) -> Writeup:
        """
        Convert MongoDB document to Writeup object.
        
        Args:
            doc: MongoDB document dictionary
            
        Returns:
            Writeup object
        """
        # MongoDB uses _id, but our Writeup model uses id
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
        
        return Writeup(**doc)
