# CTF Challenge Automation Platform - Backend
# FastAPI application entry point

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from database import connect_to_mongo, close_mongo_connection, create_indexes, check_connection, get_database
from database.mongodb import mongo_client
from models.schemas import VMCreationRequest
import logging
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
background_worker = None


# Helper functions to get service instances with correct database name
def get_session_manager():
    """Get SessionManager instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.session_manager import SessionManager
    return SessionManager(mongo_client, DATABASE_NAME)


def get_ssh_key_manager():
    """Get SSHKeyManager instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.ssh_key_manager import SSHKeyManager
    return SSHKeyManager(mongo_client, DATABASE_NAME)


def get_writeup_manager():
    """Get WriteupManager instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.writeup_manager import WriteupManager
    return WriteupManager(mongo_client, DATABASE_NAME)


def get_task_queue_service():
    """Get TaskQueueService instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.task_queue_service import TaskQueueService
    return TaskQueueService(mongo_client, DATABASE_NAME)


def get_status_tracking_service():
    """Get StatusTrackingService instance with correct database name"""
    from database.mongodb import mongo_client, DATABASE_NAME
    from services.status_tracking_service import StatusTrackingService
    return StatusTrackingService(mongo_client, DATABASE_NAME)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - runs on startup and shutdown"""
    global background_worker

    # Startup: Initialize MongoDB connection
    logger.info("Starting up application...")
    try:
        await connect_to_mongo()
        await create_indexes()

        # Initialize and start async deployment worker.
        try:
            from database.mongodb import mongo_client
            from services.background_worker import BackgroundWorker
            from services.deployment_orchestrator import DeploymentOrchestrator

            if mongo_client is not None:
                session_manager = get_session_manager()
                ssh_key_manager = get_ssh_key_manager()
                task_queue_service = get_task_queue_service()
                status_tracking_service = get_status_tracking_service()

                orchestrator = DeploymentOrchestrator(
                    session_manager=session_manager,
                    ssh_key_manager=ssh_key_manager,
                    task_queue_service=task_queue_service,
                    status_tracking_service=status_tracking_service,
                )
                background_worker = BackgroundWorker(
                    task_queue_service=task_queue_service,
                    deployment_orchestrator=orchestrator,
                )
                await background_worker.start()
                app.state.background_worker = background_worker
            else:
                logger.warning("Skipping background worker startup because MongoDB client is not initialized")
        except Exception as worker_exc:
            background_worker = None
            logger.error("Failed to initialize background worker: %s", worker_exc)

        logger.info("MongoDB initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown: Close MongoDB connection
    logger.info("Shutting down application...")
    if background_worker is not None:
        await background_worker.stop()
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


def _format_remaining_time(estimated_completion: datetime | None) -> str | None:
    """Format remaining duration as ISO-8601-ish PTxxMxxS for API responses."""
    if not estimated_completion:
        return None

    delta = estimated_completion - datetime.utcnow()
    total_seconds = int(max(0, delta.total_seconds()))
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)

    if hours > 0:
        return f"PT{hours}H{minutes}M{seconds}S"
    if minutes > 0:
        return f"PT{minutes}M{seconds}S"
    return f"PT{seconds}S"


def _as_setup_mode(value: object) -> str:
    if value in {"manual", "gemini"}:
        return str(value)
    return "manual"


def _as_optional_str(value: object) -> str | None:
    return value if isinstance(value, str) else None


def _as_optional_int(value: object, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    return default


def _as_optional_datetime(value: object) -> datetime | None:
    return value if isinstance(value, datetime) else None


@app.get("/health")
async def health_check():
    """Health check endpoint that verifies MongoDB connection"""
    from database.mongodb import DATABASE_NAME, MONGODB_URL
    mongo_healthy = await check_connection()
    
    # Get MongoDB URL (masked for security)
    masked_url = MONGODB_URL
    if '@' in masked_url:
        # Mask password in URL
        parts = masked_url.split('@')
        credentials = parts[0].split('://')[-1]
        if ':' in credentials:
            username = credentials.split(':')[0]
            masked_url = masked_url.replace(credentials, f"{username}:***")
    
    if mongo_healthy:
        return {
            "status": "healthy",
            "database": "connected",
            "database_name": DATABASE_NAME,
            "mongodb_url": masked_url
        }
    else:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "database_name": DATABASE_NAME,
            "mongodb_url": masked_url
        }


@app.get("/debug/mongodb-config")
async def debug_mongodb_config():
    """Debug endpoint to check MongoDB configuration (REMOVE IN PRODUCTION)"""
    import os
    from database.mongodb import DATABASE_NAME, MONGODB_URL
    
    # Check which environment variables are set
    env_vars = {
        "MONGODB_URL": "SET" if os.getenv("MONGODB_URL") else "NOT SET",
        "NF_SAKI_DB_MONGO_SRV": "SET" if os.getenv("NF_SAKI_DB_MONGO_SRV") else "NOT SET",
        "NF_SAKI_DB_DATABASE": os.getenv("NF_SAKI_DB_DATABASE", "NOT SET"),
        "NF_SAKI_DB_HOST": "SET" if os.getenv("NF_SAKI_DB_HOST") else "NOT SET",
        "NF_SAKI_DB_USERNAME": "SET" if os.getenv("NF_SAKI_DB_USERNAME") else "NOT SET",
        "NF_SAKI_DB_PASSWORD": "SET" if os.getenv("NF_SAKI_DB_PASSWORD") else "NOT SET",
        "DATABASE": os.getenv("DATABASE", "NOT SET"),
        "DATABASE_NAME": os.getenv("DATABASE_NAME", "NOT SET"),
    }
    
    # Mask the MongoDB URL
    masked_url = MONGODB_URL
    if '@' in masked_url:
        parts = masked_url.split('@')
        credentials = parts[0].split('://')[-1]
        if ':' in credentials:
            username = credentials.split(':')[0]
            masked_url = masked_url.replace(credentials, f"{username}:***")
    
    return {
        "detected_database_name": DATABASE_NAME,
        "mongodb_url_masked": masked_url,
        "environment_variables": env_vars
    }


@app.post("/debug/send-test-email")
async def send_test_email(email: str = "quizgamer234@gmail.com"):
    """
    Debug endpoint to send a test email.
    REMOVE IN PRODUCTION - This is for testing email functionality only.
    
    Query parameter:
      email: Email address to send test email to (default: quizgamer234@gmail.com)
    """
    import os
    from services.email_service import EmailService
    
    logger.info(f"Sending test email to: {email}")
    
    # Check if SMTP is configured
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        return {
            "status": "error",
            "message": "SMTP credentials not configured",
            "details": {
                "SMTP_USER": "SET" if smtp_user else "NOT SET",
                "SMTP_PASSWORD": "SET" if smtp_password else "NOT SET"
            }
        }
    
    try:
        # Initialize email service
        email_service = EmailService()
        
        # Send welcome email with default English locale
        success = await email_service.send_welcome_email(
            to_email=email,
            username=email,
            temporary_password="TempPass123!@#",
            locale="en"
        )
        
        if success:
            logger.info(f"Test email sent successfully to: {email}")
            return {
                "status": "success",
                "message": f"Test email sent to {email}",
                "details": {
                    "to_email": email,
                    "username": email,
                    "temporary_password": "TempPass123!@#",
                    "from": f"{email_service.smtp_from_name} <{email_service.smtp_from}>"
                }
            }
        else:
            logger.error(f"Failed to send test email to: {email}")
            return {
                "status": "error",
                "message": f"Failed to send email to {email}",
                "details": "Check logs for error details"
            }
            
    except Exception as e:
        logger.error(f"Error sending test email: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error sending email: {str(e)}",
            "details": str(e)
        }


@app.post("/api/sessions/async", status_code=status.HTTP_202_ACCEPTED)
async def create_session_async(request: VMCreationRequest):
    """
    Create a VM session asynchronously and return immediately with task/session IDs.
    """
    from models.schemas import AsyncSessionCreateResponse
    import os
    import uuid

    session_manager = get_session_manager()
    ssh_key_manager = get_ssh_key_manager()
    task_queue_service = get_task_queue_service()
    status_tracking_service = get_status_tracking_service()

    session_id = str(uuid.uuid4())
    resource_group = os.getenv("AZURE_RESOURCE_GROUP", "ctf-platform-rg")
    deploy_agent = True if getattr(request, "deploy_agent", None) is None else bool(request.deploy_agent)
    estimated_completion = datetime.utcnow() + timedelta(minutes=12)

    key_pair_created = False

    try:
        # Generate and persist SSH keys before queueing deployment work.
        key_pair = await ssh_key_manager.generate_key_pair(session_id)
        key_pair_created = True
        public_key = key_pair["public_key"]

        session_data = {
            "_id": session_id,
            "vm_size": request.vm_size,
            "agent_type": request.agent_type,
            "agent_model": request.agent_model,
            "setup_mode": getattr(request, "setup_mode", "manual"),
            "deploy_agent": deploy_agent,
            "challenge_urls": request.challenge_urls,
            "instructions": request.instructions,
            "status": "creating",
            "resource_group": resource_group,
            "ssh_username": "ctfuser",
            "ssh_port": 22,
            "deployment_progress": 0,
            "current_step": "queued",
            "estimated_completion": estimated_completion,
            "last_status_update": datetime.utcnow(),
        }

        await session_manager.create_session(session_data)

        task_payload = {
            "session_id": session_id,
            "vm_size": request.vm_size,
            "agent_type": request.agent_type,
            "agent_model": request.agent_model,
            "challenge_urls": request.challenge_urls,
            "instructions": request.instructions,
            "resource_group": resource_group,
            "setup_mode": getattr(request, "setup_mode", "manual"),
            "deploy_agent": deploy_agent,
            "ssh_public_key": public_key,
            "mongo_connection_string": os.getenv("MONGODB_URL", "mongodb://localhost:27017"),
            "disable_retry": True,
        }

        task = await task_queue_service.enqueue_task(
            task_type="vm_deployment",
            session_id=session_id,
            task_data=task_payload,
            max_retries=0,
            priority=100,
            estimated_completion=estimated_completion,
        )
        task_id = task["task_id"]

        await session_manager.update_session(session_id, {"task_id": task_id})
        await status_tracking_service.initialize_status(
            session_id=session_id,
            task_id=task_id,
            status="queued",
            progress=0,
            current_step="queued",
            estimated_completion=estimated_completion,
        )

        return AsyncSessionCreateResponse(
            task_id=task_id,
            session_id=session_id,
            status="queued",
            estimated_completion_time=estimated_completion,
            status_url=f"/api/tasks/{task_id}/status",
        )
    except Exception as exc:
        logger.error("Failed to create async session %s: %s", session_id, exc, exc_info=True)
        if key_pair_created:
            try:
                await ssh_key_manager.delete_key_pair(session_id)
            except Exception as cleanup_exc:
                logger.warning("Failed to cleanup SSH keys for %s: %s", session_id, cleanup_exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue session deployment: {str(exc)}",
        )


@app.get("/api/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """Get current background task status and progress."""
    from models.schemas import TaskStatusResponse

    task_queue_service = get_task_queue_service()
    task = await task_queue_service.get_task_status(task_id)

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")

    return TaskStatusResponse(
        task_id=task["task_id"],
        session_id=task["session_id"],
        status=task["status"],
        progress=int(task.get("progress", 0)),
        current_step=task.get("current_step"),
        error_message=task.get("error_message"),
        result=task.get("result"),
        retry_count=int(task.get("retry_count", 0)),
        max_retries=int(task.get("max_retries", 0)),
        started_at=task.get("started_at"),
        updated_at=task.get("updated_at"),
        completed_at=task.get("completed_at"),
        estimated_remaining_time=_format_remaining_time(task.get("estimated_completion")),
    )


@app.get("/api/sessions/{session_id}/status")
async def get_session_status(session_id: str):
    """Polling endpoint for deployment status updates during async VM creation."""
    from models.schemas import DeploymentStatusResponse

    session_manager = get_session_manager()
    status_tracking_service = get_status_tracking_service()

    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")

    status_doc = await status_tracking_service.get_status(session_id)
    if status_doc:
        return DeploymentStatusResponse(
            session_id=session_id,
            task_id=status_doc.get("task_id"),
            status=status_doc.get("status", session.status),
            progress=int(status_doc.get("progress", 0)),
            current_step=status_doc.get("current_step"),
            vm_ip=status_doc.get("vm_ip") or session.vm_ip,
            estimated_completion=status_doc.get("estimated_completion"),
            estimated_remaining_time=_format_remaining_time(status_doc.get("estimated_completion")),
            error_details=status_doc.get("error_details"),
            last_updated=status_doc.get("last_updated"),
        )

    # Fallback for sessions created before deployment_status tracking was introduced.
    return DeploymentStatusResponse(
        session_id=session_id,
        task_id=getattr(session, "task_id", None),
        status=session.status,
        progress=int(getattr(session, "deployment_progress", 0) or 0),
        current_step=getattr(session, "current_step", None),
        vm_ip=session.vm_ip,
        estimated_completion=getattr(session, "estimated_completion", None),
        estimated_remaining_time=_format_remaining_time(getattr(session, "estimated_completion", None)),
        error_details={"message": session.error_message} if session.error_message else None,
        last_updated=getattr(session, "last_status_update", None),
    )


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
    from services.azure_vm_manager import AzureVMManager
    from services.vm_setup_service import VMSetupService
    from models.schemas import VMConfig, SessionResponse
    import os
    
    session_id = None
    
    try:
        # Get MongoDB database
        db = get_database()
        
        # Initialize services
        session_manager = get_session_manager()
        ssh_key_manager = get_ssh_key_manager()
        
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
        deploy_agent = True if getattr(request, "deploy_agent", None) is None else bool(request.deploy_agent)
        session_data = {
            "_id": session_id,
            "vm_size": request.vm_size,
            "agent_type": request.agent_type,
            "agent_model": request.agent_model,
            "setup_mode": getattr(request, 'setup_mode', 'manual'),
            "deploy_agent": deploy_agent,
            "challenge_urls": request.challenge_urls,
            "instructions": request.instructions,
            "status": "creating",
            "resource_group": resource_group,
            "ssh_username": "ctfuser",
            "ssh_port": 22,
            "deployment_progress": 0,
            "current_step": "creating_vm",
            "last_status_update": datetime.utcnow(),
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
            agent_install_succeeded = False
            
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
            
            if deploy_agent:
                # Install agent
                logger.info("Installing agent...")
                try:
                    agent_success = await vm_setup_service.install_agent(
                        vm_ip=vm_info.public_ip,
                        agent_type=request.agent_type,
                        agent_model=request.agent_model,
                        ssh_private_key=private_key
                    )
                    
                    if not agent_success:
                        raise Exception("Agent installation failed")
                    agent_install_succeeded = True
                except Exception as agent_install_exc:
                    logger.warning(
                        "Agent installation failed for session %s, continuing without auto-start: %s",
                        session_id,
                        vm_setup_service.last_error or str(agent_install_exc),
                    )
            
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
            
            if deploy_agent:
                # Write agent bootstrap script (for manual re-runs / interactive auth)
                logger.info("Writing agent bootstrap script...")
                try:
                    bootstrap_success = await vm_setup_service.write_agent_bootstrap_script(
                        vm_ip=vm_info.public_ip,
                        agent_type=request.agent_type,
                        agent_model=request.agent_model,
                        ssh_private_key=private_key
                    )
                    if not bootstrap_success:
                        logger.warning("Agent bootstrap script creation failed, but continuing...")
                except Exception as bootstrap_exc:
                    logger.warning(
                        "Agent bootstrap script creation failed for session %s, continuing: %s",
                        session_id,
                        bootstrap_exc,
                    )

                if agent_install_succeeded:
                    # Configure MCP servers
                    logger.info("Configuring MCP servers...")
                    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
                    try:
                        mcp_success = await vm_setup_service.configure_mcp_servers(
                            vm_ip=vm_info.public_ip,
                            mongo_connection_string=mongo_url,
                            ssh_private_key=private_key
                        )
                        
                        if not mcp_success:
                            logger.warning("MCP server configuration failed, but continuing...")
                    except Exception as mcp_exc:
                        logger.warning(
                            "MCP server configuration failed for session %s, continuing: %s",
                            session_id,
                            mcp_exc,
                        )
                    
                    # Start agent
                    logger.info("Starting agent...")
                    try:
                        agent_start_success = await vm_setup_service.start_agent(
                            vm_ip=vm_info.public_ip,
                            agent_type=request.agent_type,
                            agent_model=request.agent_model,
                            ssh_private_key=private_key
                        )
                        
                        if not agent_start_success:
                            logger.warning("Agent start failed for %s, VM remains available", session_id)
                    except Exception as agent_start_exc:
                        logger.warning(
                            "Agent start failed for %s, VM remains available: %s",
                            session_id,
                            vm_setup_service.last_error or str(agent_start_exc),
                        )
                else:
                    logger.warning(
                        "Skipping MCP configuration and agent start for %s because agent install failed",
                        session_id,
                    )
            
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
            setup_mode=_as_setup_mode(getattr(session, 'setup_mode', 'manual')),
            deploy_agent=bool(getattr(session, 'deploy_agent', deploy_agent)),
            challenge_urls=session.challenge_urls,
            instructions=session.instructions,
            created_at=session.created_at,
            status=session.status,
            vm_ip=session.vm_ip,
            ssh_username=session.ssh_username,
            ssh_port=session.ssh_port,
            resource_group=session.resource_group,
            error_message=session.error_message,
            task_id=_as_optional_str(getattr(session, "task_id", None)),
            deployment_progress=_as_optional_int(getattr(session, "deployment_progress", 0), 0),
            current_step=_as_optional_str(getattr(session, "current_step", None)),
            estimated_completion=_as_optional_datetime(getattr(session, "estimated_completion", None)),
            last_status_update=_as_optional_datetime(getattr(session, "last_status_update", None)),
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
                session_manager = get_session_manager()
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
        session_manager = get_session_manager()
        
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
                setup_mode=_as_setup_mode(getattr(session, 'setup_mode', 'manual')),
                deploy_agent=bool(getattr(session, 'deploy_agent', True)),
                challenge_urls=session.challenge_urls,
                instructions=session.instructions,
                created_at=session.created_at,
                status=session.status,
                vm_ip=session.vm_ip,
                ssh_username=session.ssh_username,
                ssh_port=session.ssh_port,
                resource_group=session.resource_group,
                error_message=session.error_message,
                task_id=_as_optional_str(getattr(session, "task_id", None)),
                deployment_progress=_as_optional_int(getattr(session, "deployment_progress", 0), 0),
                current_step=_as_optional_str(getattr(session, "current_step", None)),
                estimated_completion=_as_optional_datetime(getattr(session, "estimated_completion", None)),
                last_status_update=_as_optional_datetime(getattr(session, "last_status_update", None)),
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
        session_manager = get_session_manager()
        
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
            setup_mode=_as_setup_mode(getattr(session, 'setup_mode', 'manual')),
            deploy_agent=bool(getattr(session, 'deploy_agent', True)),
            challenge_urls=session.challenge_urls,
            instructions=session.instructions,
            created_at=session.created_at,
            status=session.status,
            vm_ip=session.vm_ip,
            ssh_username=session.ssh_username,
            ssh_port=session.ssh_port,
            resource_group=session.resource_group,
            error_message=session.error_message,
            task_id=_as_optional_str(getattr(session, "task_id", None)),
            deployment_progress=_as_optional_int(getattr(session, "deployment_progress", 0), 0),
            current_step=_as_optional_str(getattr(session, "current_step", None)),
            estimated_completion=_as_optional_datetime(getattr(session, "estimated_completion", None)),
            last_status_update=_as_optional_datetime(getattr(session, "last_status_update", None)),
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
        session_manager = get_session_manager()
        ssh_key_manager = get_ssh_key_manager()
        
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
