# Implementation Plan: CTF Challenge Automation Platform

## Overview

This implementation plan breaks down the CTF Challenge Automation Platform into incremental coding tasks. The approach follows a bottom-up strategy: first establishing core backend services and data models, then building API endpoints, followed by frontend components, and finally integrating real-time terminal functionality. Each task builds on previous work to ensure continuous integration without orphaned code.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create backend directory with FastAPI project structure
  - Create frontend directory with React/TypeScript project
  - Set up Python virtual environment and install dependencies (fastapi, uvicorn, azure-identity, azure-mgmt-compute, azure-mgmt-network, azure-mgmt-resource, paramiko, pydantic, motor, pymongo, pytest, hypothesis, mongomock, passlib, pyotp, pyjwt, cryptography, aiosmtplib)
  - Set up Node.js project and install dependencies (react, typescript, xterm, axios, @testing-library/react, jest, fast-check, qrcode.react)
  - Create .gitignore files for both projects
  - Set up MongoDB connection configuration with environment variables
  - _Requirements: All requirements (foundational setup)_

- [ ] 1.5. Implement authentication and user management
  - [x] 1.5.1 Create User data model and MongoDB collection
    - Define User Pydantic model with all required fields (id, email, password_hash, role, is_2fa_enabled, totp_secret, is_active, created_at, last_login, created_by)
    - Create users collection in MongoDB with indexes on email (unique) and is_active
    - _Requirements: 0.1, 0.14, 0.15, 0.18, 0.19_
  
  - [ ] 1.5.2 Implement UserManager service
    - Create UserManager class with MongoDB operations
    - Implement create_user() with password generation and bcrypt hashing
    - Implement get_user_by_email() and get_user_by_id() methods
    - Implement list_users() for admin user management
    - Implement update_user() and disable_user() methods
    - Implement verify_password() using bcrypt
    - Implement setup_2fa() to generate TOTP secret and QR code
    - Implement verify_2fa() to validate TOTP codes
    - Implement enable_2fa() to mark 2FA as enabled
    - Use Motor async driver for all MongoDB operations
    - _Requirements: 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20_
  
  - [ ] 1.5.3 Implement AuthService for JWT token management
    - Create AuthService class for JWT operations
    - Implement create_access_token() with 1-hour expiration
    - Implement create_refresh_token() with 7-day expiration
    - Implement verify_token() to validate and decode JWT
    - Implement get_current_user() to extract user info from token
    - Use environment variable for JWT secret key
    - _Requirements: 0.10, 0.11, 0.12_
  
  - [ ] 1.5.4 Implement EmailService for user notifications
    - Create EmailService class with SMTP configuration
    - Implement send_welcome_email() with username and temporary password
    - Configure SMTP settings from environment variables
    - Use aiosmtplib for async email sending
    - _Requirements: 0.2_
  
  - [ ] 1.5.5 Implement authentication API endpoints
    - Implement POST /api/auth/login endpoint for username/password authentication
    - Implement POST /api/auth/login/2fa endpoint for TOTP verification
    - Implement POST /api/auth/setup-2fa endpoint for first-time 2FA setup
    - Implement POST /api/auth/verify-2fa-setup endpoint to complete 2FA setup
    - Implement POST /api/auth/refresh endpoint for token refresh
    - Implement POST /api/auth/logout endpoint to invalidate tokens
    - Return JWT tokens on successful authentication
    - _Requirements: 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.10_
  
  - [ ] 1.5.6 Implement user management API endpoints (admin only)
    - Implement POST /api/users endpoint to create new users
    - Implement GET /api/users endpoint to list all users
    - Implement GET /api/users/{user_id} endpoint to get user details
    - Implement PUT /api/users/{user_id} endpoint to update user
    - Implement DELETE /api/users/{user_id} endpoint to disable user
    - Require admin role for all user management endpoints
    - Send welcome email when creating new users
    - _Requirements: 0.1, 0.2, 0.13, 0.14, 0.15, 0.16, 0.17_
  
  - [ ] 1.5.7 Implement authentication middleware
    - Create JWT authentication dependency for FastAPI
    - Implement token validation on all protected endpoints
    - Implement role-based access control (admin vs user)
    - Return 401 for invalid/expired tokens
    - Return 403 for insufficient permissions
    - _Requirements: 0.11, 0.12_
    - **STATUS**: Partially complete (implemented via FastAPI dependencies in routes/auth.py and routes/users.py)
  
  - [x] 1.5.8 Implement frontend Login component
    - Create Login component with username/password form
    - Implement 2FA code input for users with 2FA enabled
    - Implement first-time 2FA setup flow with QR code display
    - Store JWT token in localStorage or secure cookie
    - Redirect to dashboard on successful login
    - Display error messages for failed authentication
    - _Requirements: 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9_
  
  - [x] 1.5.9 Implement frontend User Management component (admin only)
    - Create UserManagement component for admin users
    - Display list of all users with email, role, 2FA status, and active status
    - Implement create user form with email and role selection
    - Implement disable user functionality
    - Show success/error messages for user operations
    - _Requirements: 0.13, 0.14, 0.15, 0.16, 0.17_
  
  - [x] 1.5.10 Implement authentication guards and routing
    - Create PrivateRoute component to protect authenticated routes
    - Create AdminRoute component to protect admin-only routes
    - Create PublicRoute component to redirect authenticated users
    - Redirect unauthenticated users to login page
    - Redirect authenticated users away from login page
    - Implement token refresh logic in AuthContext
    - _Requirements: 0.11, 0.12, 0.13_
  
  - [x] 1.5.11 Write unit tests for authentication services
    - Test UserManager CRUD operations
    - Test password hashing and verification
    - Test 2FA setup and verification
    - Test JWT token generation and validation
    - Test email template rendering
    - _Requirements: 0.1-0.20_
  
  - [x] 1.5.12 Write integration tests for authentication endpoints
    - Test login flow with valid/invalid credentials
    - Test 2FA setup and verification flow
    - Test token refresh flow
    - Test user creation and management (admin)
    - Test authentication middleware on protected endpoints
    - _Requirements: 0.1-0.20_

- [x] 2. Implement backend data models and database setup
  - [x] 2.1 Create Pydantic models for Session, VMConfig, KeyPair, and API request/response schemas
    - Define Session model with all required fields (id, vm_size, agent_type, agent_model, challenge_urls, instructions, created_at, status, vm_ip, ssh_username, ssh_port, resource_group, error_message)
    - Define VMConfig model with from_size() static method
    - Define KeyPair model for SSH key storage
    - Define API request models (VMCreationRequest) and response models
    - Configure Pydantic models for MongoDB compatibility (datetime serialization)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 2.2 Write property test for VMConfig size mapping
    - **Property 1: VM Size Configuration Mapping**
    - **Validates: Requirements 1.2, 1.3, 1.4**
  
  - [x] 2.3 Set up MongoDB connection and initialize collections
    - Create MongoDB client initialization with Motor (async driver)
    - Configure connection string from environment variables
    - Create database initialization script for collections (sessions, ssh_keys)
    - Implement index creation for performance (session_id, created_at, status)
    - Add connection health check endpoint
    - _Requirements: 5.11, 5.13, 5.14_
  
  - [ ]* 2.4 Write property test for session persistence round-trip
    - **Property 9: Session Persistence Round-Trip**
    - **Validates: Requirements 5.11**

- [x] 3. Implement SSH key management service
  - [x] 3.1 Create SSHKeyManager class with key generation and MongoDB storage
    - Implement generate_key_pair() using cryptography library
    - Implement get_public_key() and get_private_key() methods with MongoDB queries
    - Implement delete_key_pair() method to remove from MongoDB
    - Store private keys encrypted at rest in MongoDB
    - Use Motor async driver for all MongoDB operations
    - Create unique index on session_id in ssh_keys collection
    - _Requirements: 5.10, 7.1, 7.2_
  
  - [ ]* 3.2 Write property test for SSH key uniqueness
    - **Property 8: SSH Key Uniqueness**
    - **Validates: Requirements 5.10, 7.1**
  
  - [ ]* 3.3 Write property test for SSH key format validity
    - **Property 10: SSH Key Format Validity**
    - **Validates: Requirements 7.4**

- [x] 4. Implement session manager service
  - [x] 4.1 Create SessionManager class with MongoDB CRUD operations
    - Implement create_session() method to insert session document
    - Implement get_session() method to query by _id
    - Implement list_sessions() method to return all sessions sorted by created_at
    - Implement update_session_status() method to update status field
    - Implement delete_session() method to remove document
    - Use Motor async driver for all MongoDB operations
    - Create indexes on created_at and status fields
    - Handle MongoDB exceptions and convert to appropriate HTTP errors
    - _Requirements: 3.1, 5.2, 5.3, 9.4_
  
  - [ ]* 4.2 Write unit tests for session CRUD operations with MongoDB
    - Test session creation with valid data using mongomock
    - Test session retrieval by ID
    - Test listing all sessions with sorting
    - Test session status updates
    - Test session deletion
    - Test error handling for non-existent sessions
    - _Requirements: 3.1, 5.2, 5.3_

- [x] 5. Implement Azure VM manager service
  - [x] 5.1 Create AzureVMManager class with Azure SDK integration
    - Initialize Azure clients (ComputeManagementClient, NetworkManagementClient, ResourceManagementClient)
    - Implement create_vm() method with resource group, network, and VM creation
    - Implement delete_vm() method with cleanup of all associated resources
    - Implement get_vm_status() method
    - Implement get_vm_ip() method
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.9, 9.2_
  
  - [ ]* 5.2 Write property test for input validation before Azure operations
    - **Property 11: Input Validation Before Azure Operations**
    - **Validates: Requirements 7.5**
  
  - [ ]* 5.3 Write unit tests for Azure VM operations (with mocked Azure SDK)
    - Test VM creation with different sizes
    - Test VM deletion
    - Test error handling for Azure API failures
    - _Requirements: 1.1, 9.2_

- [x] 6. Checkpoint - Ensure all tests pass
  - Run pytest for all backend tests
  - Verify all core services are working
  - Ask the user if questions arise

- [x] 6.5 Implement writeup manager service
  - [x] 6.5.1 Create WriteupManager class with MongoDB operations
    - Implement create_writeup() method to store writeup documents with category and technologies metadata
    - Implement get_writeup() method to retrieve by session_id
    - Implement list_writeups() method with pagination and optional category filter
    - Implement search_writeups() method using MongoDB text search with category and technologies filters
    - Implement get_writeup_segments() method for MCP server integration with metadata filtering
    - Create text index on content field and indexes on category and technologies fields
    - Use Motor async driver for all MongoDB operations
    - _Requirements: 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 12.3, 12.4_
  
  - [ ]* 6.5.2 Write property test for writeup storage completeness
    - **Property 21: Writeup Storage Completeness**
    - **Validates: Requirements 11.9, 11.10**
  
  - [ ]* 6.5.3 Write unit tests for writeup operations
    - Test writeup creation with all metadata (category, technologies)
    - Test writeup retrieval by session_id
    - Test writeup listing with pagination and category filter
    - Test writeup search by keywords, category, and technologies
    - Test segment extraction for MCP server with metadata filtering
    - _Requirements: 11.9, 11.11, 11.12, 11.13_

- [x] 6.6 Implement MCP configuration service
  - [x] 6.6.1 Create MCPConfigService class for MCP server setup
    - Implement generate_writeup_mcp_config() for writeup retrieval server
    - Implement generate_documentation_mcp_config() for documentation access
    - Implement generate_web_search_mcp_config() for web search capabilities
    - Implement write_mcp_config_to_vm() to deploy configs via SSH
    - Generate mcp.json configuration file with all server definitions
    - _Requirements: 12.1, 12.2, 12.5, 12.6_
  
  - [ ]* 6.6.2 Write property test for MCP server configuration presence
    - **Property 22: MCP Server Configuration Presence**
    - **Validates: Requirements 12.8**
  
  - [ ]* 6.6.3 Write unit tests for MCP configuration generation
    - Test writeup MCP config generation with MongoDB connection
    - Test documentation MCP config generation
    - Test web search MCP config generation
    - Test config file writing to VM via SSH
    - _Requirements: 12.1, 12.2, 12.5, 12.6_

- [x] 7. Implement VM setup service
  - [x] 7.1 Create VMSetupService class with SSH-based setup operations
    - Implement execute_setup_script() using paramiko for SSH connections
    - Implement install_agent() method for Codex and Copilot installation
    - Implement download_challenge_files() method using wget/curl on VM
    - Implement create_config_files() method to create instructions.md, BASE_PROMPT.md, AGENT.md, TOOLS.md, changelog.md, and discoveries.md
    - Implement configure_mcp_servers() method to set up MCP server configurations
    - Implement start_agent() method to launch agent with root privileges
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 12.1, 12.2, 12.5, 12.6, 12.7_
  
  - [x] 7.2 Generate BASE_PROMPT.md content with agent instructions
    - Create template for BASE_PROMPT.md with immutable system instructions
    - Include instructions for maintaining changelog.md with timestamped command entries
    - Include instructions for maintaining discoveries.md with findings and insights
    - Include instructions for generating writeup.md upon challenge completion with YAML frontmatter (category, technologies)
    - Include instructions for using MCP servers (writeup retrieval, documentation, web search)
    - Specify markdown format and structure requirements for all documentation files
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.8, 12.7_
  
  - [ ]* 7.3 Write property test for challenge file download completeness
    - **Property 5: Challenge File Download Completeness**
    - **Validates: Requirements 2.7**
  
  - [ ]* 7.4 Write property test for configuration file creation sequence
    - **Property 6: Configuration File Creation Sequence**
    - **Validates: Requirements 2.8, 2.9, 2.10, 2.11, 2.12**
  
  - [ ]* 7.5 Write unit tests for setup error handling
    - Test SSH connection retry logic
    - Test tool installation failure capture
    - Test challenge file download partial failures
    - _Requirements: 10.2, 10.4_

- [x] 8. Implement FastAPI REST endpoints
  - [x] 8.1 Create main FastAPI application and configure CORS
    - Initialize FastAPI app with metadata
    - Configure CORS middleware for frontend access
    - Set up exception handlers for common errors
    - Initialize MongoDB client with Motor on startup
    - Create database indexes on startup
    - Close MongoDB connection on shutdown
    - Add health check endpoint for MongoDB connection
    - _Requirements: 5.1, 5.13, 5.14_
  
  - [x] 8.2 Implement POST /api/sessions endpoint for VM creation
    - Accept VMCreationRequest body
    - Validate input using Pydantic
    - Generate SSH key pair and store in MongoDB
    - Create Azure VM using AzureVMManager
    - Execute setup using VMSetupService
    - Store session in MongoDB using SessionManager
    - Return session details or error
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 5.1, 5.12_
  
  - [ ]* 8.3 Write property test for challenge URL list validation
    - **Property 2: Challenge URL List Validation**
    - **Validates: Requirements 1.5**
  
  - [ ]* 8.4 Write property test for agent type validation
    - **Property 3: Agent Type Validation**
    - **Validates: Requirements 1.6**
  
  - [x] 8.5 Implement GET /api/sessions endpoint for listing sessions
    - Query all sessions from MongoDB using SessionManager
    - Return list of session summaries sorted by created_at descending
    - _Requirements: 3.1, 5.2_
  
  - [x] 8.6 Implement GET /api/sessions/{session_id} endpoint for session details
    - Query session by ID from MongoDB
    - Return 404 if not found
    - Return full session details
    - _Requirements: 5.3_
  
  - [x] 8.7 Implement DELETE /api/sessions/{session_id} endpoint
    - Delete Azure VM using AzureVMManager
    - Delete SSH key pair from MongoDB
    - Delete session from MongoDB
    - Handle deletion errors gracefully
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 8.8 Write property test for session deletion cleanup
    - **Property 15: Session Deletion Cleanup**
    - **Validates: Requirements 9.2, 9.3, 9.4**
  
  - [x] 8.9 Implement GET /api/sessions/{session_id}/ssh endpoint
    - Return SSH connection details (hostname, port, username)
    - _Requirements: 4.4, 4.5_
  
  - [x] 8.10 Implement GET /api/sessions/{session_id}/ssh-key endpoint
    - Return SSH public key for download
    - Set appropriate content-type and headers
    - _Requirements: 4.6, 5.5_
  
  - [x] 8.11 Implement GET /api/sessions/{session_id}/agent-md endpoint
    - Connect to VM via SSH
    - Read AGENT.md file content
    - Return file content
    - _Requirements: 4.7, 5.6_
  
  - [x] 8.12 Implement PUT /api/sessions/{session_id}/agent-md endpoint
    - Accept new AGENT.md content in request body
    - Connect to VM via SSH
    - Write updated content to AGENT.md
    - Notify agent of configuration change (send SIGHUP or similar)
    - _Requirements: 4.9, 4.10, 5.7_
  
  - [ ]* 8.13 Write property test for AGENT.md update round-trip
    - **Property 7: AGENT.md Update Round-Trip**
    - **Validates: Requirements 4.9**
  
  - [x] 8.14 Implement GET /api/sessions/{session_id}/tools-md endpoint
    - Connect to VM via SSH
    - Read TOOLS.md file content
    - Return file content
    - _Requirements: 4.11, 5.8_
  
  - [x] 8.15 Implement GET /api/sessions/{session_id}/base-prompt endpoint
    - Connect to VM via SSH
    - Read BASE_PROMPT.md file content
    - Return file content (read-only, no PUT endpoint)
    - _Requirements: 11.1_
  
  - [ ]* 8.16 Write property test for BASE_PROMPT immutability
    - **Property 20: BASE_PROMPT Immutability**
    - **Validates: Requirements 11.1**
  
  - [x] 8.17 Implement GET /api/sessions/{session_id}/changelog endpoint
    - Connect to VM via SSH
    - Read changelog.md file content
    - Return file content
    - _Requirements: 11.2, 11.5_
  
  - [x] 8.18 Implement GET /api/sessions/{session_id}/discoveries endpoint
    - Connect to VM via SSH
    - Read discoveries.md file content
    - Return file content
    - _Requirements: 11.3, 11.6_
  
  - [x] 8.19 Implement POST /api/sessions/{session_id}/writeup endpoint
    - Accept writeup content in request body with category and technologies metadata
    - Parse YAML frontmatter from writeup content to extract category and technologies
    - Extract session metadata (challenge_urls, agent_type, agent_model)
    - Store writeup in MongoDB using WriteupManager with all metadata
    - Return writeup ID and confirmation
    - _Requirements: 11.7, 11.8, 11.9_
  
  - [x] 8.20 Implement GET /api/writeups endpoint
    - Accept pagination parameters (skip, limit) and optional category filter
    - Query writeups from MongoDB using WriteupManager
    - Return paginated list of writeups with metadata (category, technologies)
    - _Requirements: 11.12_
  
  - [x] 8.21 Implement GET /api/writeups/{session_id} endpoint
    - Query writeup by session_id from MongoDB
    - Return 404 if not found
    - Return full writeup with all metadata (category, technologies)
    - _Requirements: 11.11_
  
  - [x] 8.22 Implement GET /api/writeups/search endpoint
    - Accept query parameters (keywords, category, technologies)
    - Use MongoDB text search and field filters to find relevant writeups
    - Return list of matching writeups with relevance scores and metadata
    - _Requirements: 11.13, 12.3_

- [x] 9. Checkpoint - Test all API endpoints
  - Run integration tests for all endpoints
  - Verify error handling works correctly
  - Ask the user if questions arise

- [x] 10. Implement WebSocket terminal handler
  - [x] 10.1 Create TerminalWebSocketHandler class
    - Implement WebSocket connection handler
    - Establish SSH connection to VM using paramiko
    - Implement bidirectional forwarding between WebSocket and SSH channel
    - Implement ping/pong heartbeat for connection monitoring
    - Handle connection cleanup on disconnect
    - _Requirements: 4.1, 4.2, 4.3, 5.4_
  
  - [ ]* 10.2 Write property test for terminal input execution
    - **Property 14: Terminal Input Execution**
    - **Validates: Requirements 4.3**
  
  - [ ]* 10.3 Write unit tests for WebSocket error handling
    - Test SSH connection failures
    - Test network interruption handling
    - Test cleanup on disconnect
    - _Requirements: Error handling for WebSocket_

- [x] 11. Implement error logging system
  - [x] 11.1 Set up structured logging with Python logging module
    - Configure log format with timestamps
    - Set up file and console handlers
    - Create logger instances for each service
    - _Requirements: 10.1, 10.5_
  
  - [ ]* 11.2 Write property test for error logging completeness
    - **Property 16: Error Logging Completeness**
    - **Validates: Requirements 10.1**
  
  - [ ]* 11.3 Write property test for setup error capture
    - **Property 17: Setup Error Capture**
    - **Validates: Requirements 10.2, 10.3**

- [x] 12. Checkpoint - Backend complete
  - Run all backend tests (unit, property, integration)
  - Verify all API endpoints work correctly
  - Test WebSocket terminal connection
  - Ask the user if questions arise

- [x] 13. Implement React frontend project structure
  - [x] 13.1 Set up React Router for navigation
    - Configure routes for dashboard, create VM, and session detail views
    - _Requirements: 3.6_
  
  - [x] 13.2 Create API client service for backend communication
    - Implement axios-based API client with all endpoint methods
    - Configure base URL and error handling
    - _Requirements: All frontend-backend communication_
  
  - [x] 13.3 Create shared TypeScript interfaces matching backend models
    - Define Session, VMCreationRequest, SSHConnectionInfo interfaces
    - _Requirements: All frontend requirements_

- [x] 14. Implement Dashboard component
  - [x] 14.1 Create Dashboard component with session list
    - Fetch sessions from API on mount
    - Display sessions in a table or card layout
    - Show VM size, agent type/model, creation time, and status for each session
    - Implement loading and error states
    - Add "Create New VM" button
    - Handle session selection to navigate to detail view
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 14.2 Write property test for session display completeness
    - **Property 18: Session Display Completeness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
  
  - [ ]* 14.3 Write unit tests for Dashboard component
    - Test rendering with empty session list
    - Test rendering with multiple sessions
    - Test loading state
    - Test error state
    - Test navigation on session click
    - _Requirements: 3.1_

- [x] 15. Implement VM Creation Form component
  - [x] 15.1 Create VMCreationForm component with all input fields
    - Create form with fields for challenge URLs (dynamic list), instructions (textarea), agent type (select), agent model (select), VM size (radio buttons)
    - Implement form validation (all fields required, at least one URL)
    - Show validation errors inline
    - Implement form submission with loading state
    - Handle success (navigate to session detail) and error (display message)
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [ ]* 15.2 Write property test for frontend form validation
    - **Property 19: Frontend Form Validation**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
  
  - [ ]* 15.3 Write unit tests for form validation logic
    - Test validation with missing fields
    - Test validation with empty URL list
    - Test validation with valid input
    - Test submission handling
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 16. Implement Session Detail component
  - [x] 16.1 Create SessionDetail component layout
    - Fetch session details from API
    - Display session information (VM size, agent, status, creation time)
    - Create tabs or sections for: Terminal, AGENT.md, BASE_PROMPT.md, TOOLS.md, Changelog, Discoveries, Writeup, SSH Info
    - _Requirements: 4.1, 4.4, 4.5, 4.7, 4.11, 11.1, 11.2, 11.3, 11.7_
  
  - [x] 16.2 Implement SSH connection info display
    - Show hostname, port, username
    - Add "Download SSH Key" button that triggers key download
    - _Requirements: 4.4, 4.5, 4.6_
  
  - [x] 16.3 Implement AGENT.md viewer/editor
    - Fetch AGENT.md content from API
    - Display in read-only mode initially
    - Add "Edit" button to switch to edit mode
    - Provide textarea for editing
    - Add "Save" and "Cancel" buttons in edit mode
    - Call API to update AGENT.md on save
    - _Requirements: 4.7, 4.8, 4.9, 4.10_
  
  - [x] 16.4 Implement BASE_PROMPT.md viewer
    - Fetch BASE_PROMPT.md content from API
    - Display in read-only mode (no edit capability)
    - Show indicator that this is an immutable system prompt
    - _Requirements: 11.1_
  
  - [x] 16.5 Implement TOOLS.md viewer
    - Fetch TOOLS.md content from API
    - Display in read-only mode (no edit capability)
    - _Requirements: 4.11, 4.12, 12.8_
  
  - [x] 16.6 Implement Changelog viewer
    - Fetch changelog.md content from API
    - Display in read-only mode with auto-refresh option
    - Show timestamped entries in reverse chronological order
    - _Requirements: 11.2, 11.5_
  
  - [x] 16.7 Implement Discoveries viewer
    - Fetch discoveries.md content from API
    - Display in read-only mode with auto-refresh option
    - Highlight key findings and insights
    - _Requirements: 11.3, 11.6_
  
  - [x] 16.8 Implement Writeup viewer/uploader
    - Fetch writeup.md content from VM if exists
    - Parse YAML frontmatter to extract category and technologies
    - Display writeup content with metadata
    - Add "Upload to Database" button to store in MongoDB with metadata
    - Show confirmation when writeup is successfully uploaded
    - _Requirements: 11.7, 11.8, 11.9_
  
  - [ ]* 16.9 Write unit tests for SessionDetail component
    - Test rendering with session data
    - Test SSH info display
    - Test AGENT.md edit mode toggle
    - Test BASE_PROMPT.md read-only display
    - Test TOOLS.md read-only display
    - Test changelog and discoveries display
    - Test writeup upload functionality
    - _Requirements: 4.1, 4.7, 4.11, 4.12, 11.1_

- [x] 17. Implement Terminal component with xterm.js
  - [x] 17.1 Create Terminal component with xterm.js integration
    - Initialize xterm.js terminal instance
    - Configure terminal appearance and addons (fit, web-links)
    - Establish WebSocket connection to backend terminal endpoint
    - Forward terminal input to WebSocket
    - Display WebSocket messages in terminal
    - Handle WebSocket connection errors and reconnection
    - Clean up terminal and WebSocket on unmount
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 17.2 Write integration tests for terminal WebSocket communication
    - Test WebSocket connection establishment
    - Test sending input through WebSocket
    - Test receiving output from WebSocket
    - Test connection error handling
    - _Requirements: 4.2, 4.3_

- [x] 17.5 Implement Writeups Browser component
  - [x] 17.5.1 Create WriteupsBrowser component for viewing all writeups
    - Fetch writeups list from API with pagination
    - Display writeups in a table or card layout
    - Show category, technologies, completion date, agent type for each writeup
    - Implement search functionality by keywords
    - Add filter by category and technologies
    - Handle navigation to individual writeup detail view
    - _Requirements: 11.11, 11.12, 11.13, 12.3_
  
  - [x] 17.5.2 Create WriteupDetail component for viewing individual writeups
    - Fetch writeup by session_id from API
    - Display full writeup content with markdown rendering
    - Show metadata (category, technologies, challenge URLs, completion timestamp, agent info)
    - Add "View Session" button to navigate to original session
    - _Requirements: 11.11_
  
  - [ ]* 17.5.3 Write unit tests for Writeups components
    - Test WriteupsBrowser rendering with writeup list including metadata
    - Test pagination controls
    - Test search functionality with category and technologies filters
    - Test WriteupDetail rendering with metadata display
    - Test navigation between components
    - _Requirements: 11.11, 11.12, 11.13_

- [x] 18. Implement frontend styling and responsive design
  - [x] 18.1 Add CSS/styling framework (e.g., Tailwind CSS or Material-UI)
    - Install and configure styling framework
    - Style Dashboard component
    - Style VM Creation Form
    - Style Session Detail component
    - Style Terminal component
    - Ensure responsive design for mobile and desktop
    - _Requirements: 6.1 (user-friendly interface)_

- [x] 19. Final integration and end-to-end testing
  - [x] 19.1 Set up end-to-end tests with Playwright
    - Write E2E test for creating a VM
    - Write E2E test for viewing session list
    - Write E2E test for interacting with terminal
    - Write E2E test for editing AGENT.md
    - Write E2E test for deleting a session
    - _Requirements: All requirements (validation)_
  
  - [ ]* 19.2 Run all tests (unit, property, integration, E2E)
    - Execute pytest for backend
    - Execute jest for frontend
    - Execute Playwright for E2E
    - Verify all tests pass
    - _Requirements: All requirements_

- [x] 20. Final checkpoint - Complete system verification
  - Verify all features work end-to-end
  - Test with actual Azure subscription (if available)
  - Review error handling and logging
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Backend uses Python with FastAPI, Azure SDK, paramiko, Motor (MongoDB async driver)
- Frontend uses React with TypeScript, xterm.js, axios
- Property tests use Hypothesis (Python) and fast-check (TypeScript)
- Integration tests use pytest and Jest
- E2E tests use Playwright
- All tests should run in CI/CD pipeline
- BASE_PROMPT.md is immutable and contains core agent instructions
- Agent maintains changelog.md and discoveries.md during execution
- Writeups are stored in MongoDB for retrieval by future agents via MCP server
- MCP servers provide: writeup retrieval, documentation access, and web search capabilities
