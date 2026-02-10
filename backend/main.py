# CTF Challenge Automation Platform - Backend
# FastAPI application entry point

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from database import connect_to_mongo, close_mongo_connection, create_indexes, check_connection
from models.schemas import VMCreationRequest
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - runs on startup and shutdown"""
    # Startup: Initialize MongoDB connection
    logger.info("Starting up application...")
    try:
        await connect_to_mongo()
        await create_indexes()
        logger.info("MongoDB initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown: Close MongoDB connection
    logger.info("Shutting down application...")
    await close_mongo_connection()


app = FastAPI(
    title="CTF Challenge Automation Platform",
    description="Backend API for managing Azure VMs for CTF challenge solving",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS middleware for frontend access
import os

# Get CORS origins from environment variable or use defaults
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:5174")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


# Exception handlers for common errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Invalid request data"
        }
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueError exceptions"""
    logger.error(f"ValueError on {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": str(exc),
            "message": "Invalid value provided"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    logger.error(f"Unhandled exception on {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred",
            "message": str(exc)
        }
    )


@app.get("/")
async def root():
    return {"message": "CTF Challenge Automation Platform API"}


@app.get("/health")
async def health_check():
    """Health check endpoint that verifies MongoDB connection"""
    mongo_healthy = await check_connection()
    
    if mongo_healthy:
        return {
            "status": "healthy",
            "database": "connected"
        }
    else:
        return {
            "status": "unhealthy",
            "database": "disconnected"
        }


@app.post("/api/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(request: VMCreationRequest):
    """
    Create a new VM session for CTF challenge solving.
    
    This endpoint:
    1. Validates input using Pydantic
    2. Generates SSH key pair and stores in MongoDB
    3. Creates Azure VM using AzureVMManager
    4. Executes setup using VMSetupService
    5. Stores session in MongoDB using SessionManager
    6. Returns session details or error
    
    Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 5.1, 5.12
    """
    from database import get_database
    from services.session_manager import SessionManager
    from services.ssh_key_manager import SSHKeyManager
    from services.azure_vm_manager import AzureVMManager
    from services.vm_setup_service import VMSetupService
    from models.schemas import Session, VMConfig, SessionResponse
    import uuid
    import os
    
    session_id = None
    
    try:
        # Get MongoDB database
        db = get_database()
        
        # Initialize services
        from database.mongodb import mongo_client
        session_manager = SessionManager(mongo_client)
        ssh_key_manager = SSHKeyManager(mongo_client)
        
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        resource_group = os.getenv("AZURE_RESOURCE_GROUP", "ctf-platform-rg")
        
        logger.info(f"Creating new session {session_id}")
        
        # Step 1: Generate SSH key pair and store in MongoDB
        logger.info(f"Generating SSH key pair for session {session_id}")
        try:
            key_pair = await ssh_key_manager.generate_key_pair(session_id)
            public_key = key_pair["public_key"]
            logger.info(f"SSH key pair generated for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to generate SSH key pair: {e}")
            raise ValueError(f"Failed to generate SSH key pair: {str(e)}")
        
        # Step 2: Get VM configuration
        try:
            vm_config = VMConfig.from_size(request.vm_size)
            logger.info(f"VM configuration: {vm_config.azure_vm_size}")
        except ValueError as e:
            logger.error(f"Invalid VM size: {e}")
            raise
        
        # Step 3: Create session document in MongoDB with 'creating' status
        session_data = {
            "_id": session_id,
            "vm_size": request.vm_size,
            "agent_type": request.agent_type,
            "agent_model": request.agent_model,
            "challenge_urls": request.challenge_urls,
            "instructions": request.instructions,
            "status": "creating",
            "resource_group": resource_group,
            "ssh_username": "ctfuser",
            "ssh_port": 22
        }
        
        try:
            session = await session_manager.create_session(session_data)
            logger.info(f"Session {session_id} created in database")
        except Exception as e:
            logger.error(f"Failed to create session in database: {e}")
            # Clean up SSH key if session creation fails
            await ssh_key_manager.delete_key_pair(session_id)
            raise ValueError(f"Failed to create session: {str(e)}")
        
        # Step 4: Create Azure VM using AzureVMManager
        logger.info(f"Creating Azure VM for session {session_id}")
        try:
            azure_vm_manager = AzureVMManager()
            vm_info = await azure_vm_manager.create_vm(
                session_id=session_id,
                vm_size=vm_config.azure_vm_size,
                ssh_public_key=public_key,
                resource_group=resource_group
            )
            logger.info(f"Azure VM created: {vm_info.vm_name} at {vm_info.public_ip}")
            
            # Update session with VM IP
            await session_manager.update_session(session_id, {"vm_ip": vm_info.public_ip})
            
        except Exception as e:
            logger.error(f"Failed to create Azure VM: {e}")
            # Update session status to error
            await session_manager.update_session_status(
                session_id,
                "error",
                f"Failed to create VM: {str(e)}"
            )
            raise ValueError(f"Failed to create Azure VM: {str(e)}")
        
        # Step 5: Execute setup using VMSetupService
        logger.info(f"Setting up VM for session {session_id}")
        try:
            vm_setup_service = VMSetupService()
            
            # Get private key for SSH connection
            private_key = await ssh_key_manager.get_private_key(session_id)
            
            # Execute setup script to install tools
            logger.info("Executing setup script...")
            setup_success = await vm_setup_service.execute_setup_script(
                vm_ip=vm_info.public_ip,
                ssh_private_key=private_key
            )
            
            if not setup_success:
                raise Exception("Setup script execution failed")
            
            # Install agent
            logger.info("Installing agent...")
            agent_success = await vm_setup_service.install_agent(
                vm_ip=vm_info.public_ip,
                agent_type=request.agent_type,
                agent_model=request.agent_model,
                ssh_private_key=private_key
            )
            
            if not agent_success:
                raise Exception("Agent installation failed")
            
            # Download challenge files
            logger.info("Downloading challenge files...")
            download_success = await vm_setup_service.download_challenge_files(
                vm_ip=vm_info.public_ip,
                challenge_urls=request.challenge_urls,
                ssh_private_key=private_key
            )
            
            if not download_success:
                raise Exception("Challenge file download failed")
            
            # Create configuration files
            logger.info("Creating configuration files...")
            config_success = await vm_setup_service.create_config_files(
                vm_ip=vm_info.public_ip,
                instructions=request.instructions,
                ssh_private_key=private_key
            )
            
            if not config_success:
                raise Exception("Configuration file creation failed")
            
            # Configure MCP servers
            logger.info("Configuring MCP servers...")
            mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
            mcp_success = await vm_setup_service.configure_mcp_servers(
                vm_ip=vm_info.public_ip,
                mongo_connection_string=mongo_url,
                ssh_private_key=private_key
            )
            
            if not mcp_success:
                logger.warning("MCP server configuration failed, but continuing...")
            
            # Start agent
            logger.info("Starting agent...")
            agent_start_success = await vm_setup_service.start_agent(
                vm_ip=vm_info.public_ip,
                ssh_private_key=private_key
            )
            
            if not agent_start_success:
                raise Exception("Agent start failed")
            
            logger.info(f"VM setup completed successfully for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to setup VM: {e}")
            # Update session status to error
            await session_manager.update_session_status(
                session_id,
                "error",
                f"Failed to setup VM: {str(e)}"
            )
            raise ValueError(f"Failed to setup VM: {str(e)}")
        
        # Step 6: Update session status to 'running'
        logger.info(f"Updating session {session_id} status to running")
        updated_session = await session_manager.update_session_status(session_id, "running")
        
        if not updated_session:
            raise Exception(f"Failed to update session status: session {session_id} not found")
        
        session = updated_session
        
        # Step 7: Return session details
        logger.info(f"Session {session_id} created successfully")
        
        return SessionResponse(
            id=session.id,
            vm_size=session.vm_size,
            agent_type=session.agent_type,
            agent_model=session.agent_model,
            challenge_urls=session.challenge_urls,
            instructions=session.instructions,
            created_at=session.created_at,
            status=session.status,
            vm_ip=session.vm_ip,
            ssh_username=session.ssh_username,
            ssh_port=session.ssh_port,
            resource_group=session.resource_group,
            error_message=session.error_message
        )
        
    except ValueError as e:
        # Client errors (validation, etc.)
        logger.error(f"Validation error creating session: {e}")
        raise
    except Exception as e:
        # Server errors
        logger.error(f"Unexpected error creating session: {e}", exc_info=True)
        
        # Try to clean up if we have a session_id
        if session_id:
            try:
                from database.mongodb import mongo_client
                session_manager = SessionManager(mongo_client)
                await session_manager.update_session_status(
                    session_id,
                    "error",
                    f"Unexpected error: {str(e)}"
                )
            except:
                pass
        
        raise Exception(f"Failed to create VM session: {str(e)}")


@app.get("/api/sessions")
async def list_sessions():
    """
    List all VM sessions sorted by creation time (newest first).
    
    This endpoint:
    1. Queries all sessions from MongoDB using SessionManager
    2. Returns list of session summaries sorted by created_at descending
    
    Requirements: 3.1, 5.2
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from models.schemas import SessionListResponse, SessionResponse
    
    try:
        # Initialize SessionManager
        session_manager = SessionManager(mongo_client)
        
        # Query all sessions sorted by created_at descending
        logger.info("Retrieving all sessions")
        sessions = await session_manager.list_sessions()
        
        # Convert Session objects to SessionResponse objects
        session_responses = [
            SessionResponse(
                id=session.id,
                vm_size=session.vm_size,
                agent_type=session.agent_type,
                agent_model=session.agent_model,
                challenge_urls=session.challenge_urls,
                instructions=session.instructions,
                created_at=session.created_at,
                status=session.status,
                vm_ip=session.vm_ip,
                ssh_username=session.ssh_username,
                ssh_port=session.ssh_port,
                resource_group=session.resource_group,
                error_message=session.error_message
            )
            for session in sessions
        ]
        
        logger.info(f"Retrieved {len(session_responses)} sessions")
        
        return SessionListResponse(sessions=session_responses)
        
    except Exception as e:
        logger.error(f"Error listing sessions: {e}", exc_info=True)
        raise Exception(f"Failed to list sessions: {str(e)}")


@app.get("/api/sessions/{session_id}")
async def get_session_details(session_id: str):
    """
    Get details for a specific VM session by ID.
    
    This endpoint:
    1. Queries session by ID from MongoDB
    2. Returns 404 if not found
    3. Returns full session details
    
    Requirements: 5.3
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from models.schemas import SessionResponse
    from fastapi import HTTPException
    
    try:
        # Initialize SessionManager
        session_manager = SessionManager(mongo_client)
        
        # Query session by ID
        logger.info(f"Retrieving session {session_id}")
        session = await session_manager.get_session(session_id)
        
        # Return 404 if not found
        if not session:
            logger.warning(f"Session {session_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        # Convert Session object to SessionResponse
        session_response = SessionResponse(
            id=session.id,
            vm_size=session.vm_size,
            agent_type=session.agent_type,
            agent_model=session.agent_model,
            challenge_urls=session.challenge_urls,
            instructions=session.instructions,
            created_at=session.created_at,
            status=session.status,
            vm_ip=session.vm_ip,
            ssh_username=session.ssh_username,
            ssh_port=session.ssh_port,
            resource_group=session.resource_group,
            error_message=session.error_message
        )
        
        logger.info(f"Retrieved session {session_id} successfully")
        
        return session_response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error retrieving session {session_id}: {e}", exc_info=True)
        raise Exception(f"Failed to retrieve session: {str(e)}")


@app.delete("/api/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(session_id: str):
    """
    Delete a VM session and all associated resources.
    
    This endpoint:
    1. Deletes Azure VM using AzureVMManager
    2. Deletes SSH key pair from MongoDB
    3. Deletes session from MongoDB
    4. Handles deletion errors gracefully
    
    Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
    """
    from database.mongodb import mongo_client
    from services.session_manager import SessionManager
    from services.ssh_key_manager import SSHKeyManager
    from services.azure_vm_manager import AzureVMManager
    from fastapi import HTTPException
    
    try:
        # Initialize services
        session_manager = SessionManager(mongo_client)
        ssh_key_manager = SSHKeyManager(mongo_client)
        
        # Step 1: Verify session exists
        logger.info(f"Deleting session {session_id}")
        session = await session_manager.get_session(session_id)
        
        if not session:
            logger.warning(f"Session {session_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        # Track deletion errors but continue with cleanup
        deletion_errors = []
        
        # Step 2: Delete Azure VM and associated resources
        try:
            logger.info(f"Deleting Azure VM for session {session_id}")
            azure_vm_manager = AzureVMManager()
            vm_deleted = await azure_vm_manager.delete_vm(
                session_id=session_id,
                resource_group=session.resource_group
            )
            
            if vm_deleted:
                logger.info(f"Azure VM deleted successfully for session {session_id}")
            else:
                logger.warning(f"Azure VM deletion returned False for session {session_id}")
                
        except Exception as e:
            error_msg = f"Failed to delete Azure VM: {str(e)}"
            logger.error(f"Error deleting Azure VM for session {session_id}: {e}")
            deletion_errors.append(error_msg)
            # Continue with cleanup even if VM deletion fails
        
        # Step 3: Delete SSH key pair from MongoDB
        try:
            logger.info(f"Deleting SSH key pair for session {session_id}")
            key_deleted = await ssh_key_manager.delete_key_pair(session_id)
            
            if key_deleted:
                logger.info(f"SSH key pair deleted successfully for session {session_id}")
            else:
                logger.warning(f"SSH key pair not found for session {session_id}")
                
        except Exception as e:
            error_msg = f"Failed to delete SSH key pair: {str(e)}"
            logger.error(f"Error deleting SSH key pair for session {session_id}: {e}")
            deletion_errors.append(error_msg)
            # Continue with cleanup even if key deletion fails
        
        # Step 4: Delete session from MongoDB
        try:
            logger.info(f"Deleting session document for session {session_id}")
            session_deleted = await session_manager.delete_session(session_id)
            
            if session_deleted:
                logger.info(f"Session document deleted successfully for session {session_id}")
            else:
                logger.warning(f"Session document not found for session {session_id}")
                
        except Exception as e:
            error_msg = f"Failed to delete session document: {str(e)}"
            logger.error(f"Error deleting session document for session {session_id}: {e}")
            deletion_errors.append(error_msg)
            # This is a critical error, but we've already cleaned up other resources
        
        # Step 5: Return response with any errors encountered
        if deletion_errors:
            logger.warning(f"Session {session_id} deleted with errors: {deletion_errors}")
            return {
                "message": f"Session {session_id} deleted with some errors",
                "session_id": session_id,
                "status": "partial_success",
                "errors": deletion_errors
            }
        else:
            logger.info(f"Session {session_id} deleted successfully")
            return {
                "message": f"Session {session_id} deleted successfully",
                "session_id": session_id,
                "status": "success"
            }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"Unexpected error deleting session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )


# Include additional endpoints router
from endpoints_additional import router as additional_router
app.include_router(additional_router)

# Include authentication routes
from routes.auth import router as auth_router
app.include_router(auth_router)

# Include user management routes
from routes.users import router as users_router
app.include_router(users_router)
