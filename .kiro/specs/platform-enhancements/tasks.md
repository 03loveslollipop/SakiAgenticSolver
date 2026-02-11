# Implementation Plan: CTF Automation Platform Enhancements

## Overview

This implementation plan breaks down the CTF Automation Platform enhancements into incremental coding tasks. The approach follows a modular strategy: first updating backend models and validation, then implementing new agent installations, followed by manual mode support, and finally creating the cronjob services. Each task builds on previous work to ensure continuous integration without orphaned code.

## Tasks

- [ ] 1. Update backend data models and validation
  - [ ] 1.1 Update Pydantic models to support new agent types
    - Extend VMCreationRequest model to accept 'gemini-cli', 'mistral-vibe-cli', and 'manual' as valid agent_type values
    - Update agent_model field to be Optional[str] with validation for manual mode
    - Add validator to ensure manual mode has null agent_model and AI agents have non-null agent_model
    - Update Session model with same agent_type extensions and status field additions ('deleted', 'cleanup_failed')
    - _Requirements: 5.6, 5.7, 7.1_
  
  - [ ] 1.2 Write property test for new agent type validation
    - **Property 1: New Agent Type Validation**
    - **Validates: Requirements 1.1, 1.2, 2.1, 5.1, 5.2, 5.3**
  
  - [ ] 1.3 Write property test for agent model validation rules
    - **Property 2: Agent Model Validation Rules**
    - **Validates: Requirements 1.3, 1.4, 2.2**
  
  - [ ] 1.4 Update MongoDB schemas and indexes
    - Add 'deleted_at' and 'cleanup_failed_at' fields to sessions collection
    - Add 'uploaded_to_blog' and 'uploaded_at' fields to writeups collection
    - Create index on sessions: { "status": 1, "created_at": 1 } for cleanup queries
    - Create index on writeups: { "uploaded_to_blog": 1, "completion_timestamp": 1 } for upload queries
    - Update database migration script
    - _Requirements: 3.2, 4.2_

- [ ] 2. Implement Gemini CLI agent support
  - [ ] 2.1 Create Gemini CLI installation script
    - Write bash script to install Google Generative AI Python package
    - Configure Gemini API key from environment variable
    - Set up model configuration based on selected model (gemini-pro, gemini-pro-vision, gemini-ultra)
    - Integrate with existing MCP server configuration
    - _Requirements: 1.5, 1.7_
  
  - [ ] 2.2 Update VM setup service for Gemini CLI
    - Add _install_gemini_cli() method to VMSetupService
    - Implement SSH-based installation using paramiko
    - Handle installation errors and capture output
    - Configure Gemini CLI to use same documentation standards as existing agents
    - _Requirements: 1.5, 5.8_
  
  - [ ] 2.3 Write property test for Gemini CLI installation
    - **Property 3: Agent Installation Verification (Gemini CLI)**
    - **Validates: Requirements 1.5, 1.7**
  
  - [ ] 2.4 Write unit tests for Gemini CLI installation errors
    - Test pip installation failures
    - Test API key configuration errors
    - Test error capture and reporting
    - _Requirements: 7.2_

- [ ] 3. Implement Mistral Vibe CLI agent support
  - [ ] 3.1 Create Mistral Vibe CLI installation script
    - Write bash script to install Mistral AI Python package
    - Configure Mistral API key from environment variable
    - Set up model configuration based on selected model (mistral-7b, mistral-8x7b, codestral)
    - Integrate with existing MCP server configuration
    - _Requirements: 1.6, 1.8_
  
  - [ ] 3.2 Update VM setup service for Mistral Vibe CLI
    - Add _install_mistral_vibe_cli() method to VMSetupService
    - Implement SSH-based installation using paramiko
    - Handle installation errors and capture output
    - Configure Mistral Vibe CLI to use same documentation standards as existing agents
    - _Requirements: 1.6, 5.8_
  
  - [ ] 3.3 Write property test for Mistral Vibe CLI installation
    - **Property 3: Agent Installation Verification (Mistral Vibe CLI)**
    - **Validates: Requirements 1.6, 1.8**
  
  - [ ] 3.4 Write unit tests for Mistral Vibe CLI installation errors
    - Test pip installation failures
    - Test API key configuration errors
    - Test error capture and reporting
    - _Requirements: 7.3_

- [ ] 4. Implement manual mode support
  - [ ] 4.1 Update VM setup service for manual mode
    - Modify install_agent() method to skip installation for agent_type='manual'
    - Update create_config_files() to skip BASE_PROMPT.md and AGENT.md creation for manual mode
    - Ensure all tools are still installed via Setup_Script
    - Ensure challenge files are still downloaded
    - Ensure instructions.md and TOOLS.md are created
    - Ensure MCP servers are configured
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 5.9_
  
  - [ ] 4.2 Update session creation and retrieval logic
    - Ensure sessions with agent_type='manual' are stored with agent_model=null
    - Update API responses to return agent_type='manual' and agent_model=null
    - Add validation to prevent manual mode with model specified
    - _Requirements: 5.4, 5.5_
  
  - [ ] 4.3 Write property test for manual mode configuration
    - **Property 4: Manual Mode Configuration**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**
  
  - [ ] 4.4 Write property test for manual mode terminal behavior
    - **Property 5: Manual Mode Terminal Behavior**
    - **Validates: Requirements 2.10**
  
  - [ ] 4.5 Write property test for backend model consistency
    - **Property 16: Backend Model Consistency**
    - **Validates: Requirements 5.4, 5.5, 5.6, 5.7**

- [ ] 5. Checkpoint - Test backend updates
  - Run all backend tests for new agent types and manual mode
  - Verify validation rules work correctly
  - Test VM creation with all new agent types
  - Ask the user if questions arise

- [ ] 6. Update frontend for new agent types
  - [ ] 6.1 Update TypeScript interfaces
    - Extend Session interface to support 'gemini-cli', 'mistral-vibe-cli', 'manual' as agent_type
    - Make agent_model optional in interfaces
    - Update VMCreationRequest interface with same extensions
    - _Requirements: 6.9, 6.10_
  
  - [ ] 6.2 Update VM creation form component
    - Add "Gemini CLI" and "Mistral Vibe CLI" to agent type dropdown
    - Add "Manual (No Agent)" to agent type dropdown
    - Implement dynamic model dropdown showing/hiding based on agent type
    - Populate model dropdowns with appropriate options for each agent type
    - Hide model dropdown when "Manual (No Agent)" is selected
    - Update form validation for new agent types
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 6.3 Update dashboard session display
    - Show "Manual" as agent type for manual mode sessions
    - Hide agent model information for manual mode sessions
    - _Requirements: 2.11, 2.12, 6.6_
  
  - [ ] 6.4 Update session detail component
    - Conditionally hide AGENT.md and BASE_PROMPT.md tabs for manual mode
    - Still show TOOLS.md, changelog.md, and discoveries.md tabs for manual mode if files exist
    - _Requirements: 6.7, 6.8_
  
  - [ ] 6.5 Write property test for frontend agent type display
    - **Property 14: Frontend Agent Type Display**
    - **Validates: Requirements 2.11, 2.12, 6.1, 6.2, 6.6**
  
  - [ ] 6.6 Write property test for frontend dynamic UI behavior
    - **Property 15: Frontend Dynamic UI Behavior**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.7, 6.8**
  
  - [ ] 6.7 Write unit tests for frontend updates
    - Test VM creation form with new agent types
    - Test dynamic dropdown behavior
    - Test session display for manual mode
    - Test tab visibility in session detail
    - _Requirements: 6.1-6.8_

- [ ] 7. Implement writeup upload cronjob service
  - [ ] 7.1 Create WriteupUploadService class
    - Implement find_new_writeups() method to query MongoDB for unuploaded writeups
    - Implement format_writeup_for_blog() method with YAML frontmatter generation
    - Implement upload_to_github() method using PyGithub library
    - Implement run_upload_cycle() method for complete upload process
    - Add error handling with exponential backoff retry logic
    - Implement circuit breaker pattern for GitHub API calls
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 7.4, 7.5, 7.10_
  
  - [ ] 7.2 Create writeup upload cronjob application
    - Create Dockerfile for containerized application
    - Create entry point script (writeup_upload_cron.py)
    - Configure environment variables (MONGODB_URL, GITHUB_TOKEN, REPO_OWNER, REPO_NAME)
    - Add logging configuration with timestamps and statistics
    - Implement health check endpoint
    - _Requirements: 3.1, 3.12, 7.8, 7.9_
  
  - [ ] 7.3 Write property test for writeup upload query logic
    - **Property 7: Writeup Upload Cronjob Query Logic**
    - **Validates: Requirements 3.2**
  
  - [ ] 7.4 Write property test for writeup formatting consistency
    - **Property 8: Writeup Formatting Consistency**
    - **Validates: Requirements 3.3, 3.4, 3.5**
  
  - [ ] 7.5 Write property test for writeup upload transaction
    - **Property 9: Writeup Upload Transaction**
    - **Validates: Requirements 3.8**
  
  - [ ] 7.6 Write property test for writeup upload error handling
    - **Property 10: Writeup Upload Error Handling**
    - **Validates: Requirements 3.9, 3.10, 3.11, 7.4, 7.5, 7.8**
  
  - [ ] 7.7 Write unit tests for writeup upload service
    - Test MongoDB query logic with various writeup states
    - Test formatting with different writeup metadata
    - Test GitHub API integration with mocking
    - Test error handling and retry logic
    - Test circuit breaker implementation
    - _Requirements: 3.2-3.11_

- [ ] 8. Implement VM cleanup cronjob service
  - [ ] 8.1 Create VMCleanupService class
    - Implement find_expired_sessions() method to query MongoDB for old running sessions
    - Implement cleanup_session() method to delete Azure VM and update status
    - Implement run_cleanup_cycle() method for complete cleanup process
    - Add error handling with appropriate status updates
    - Implement notification logic for authentication failures
    - Implement circuit breaker pattern for Azure API calls
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.11, 7.6, 7.7, 7.10_
  
  - [ ] 8.2 Create VM cleanup cronjob application
    - Create Dockerfile for containerized application
    - Create entry point script (vm_cleanup_cron.py)
    - Configure environment variables (MONGODB_URL, AZURE_SUBSCRIPTION_ID, MAX_VM_AGE_HOURS)
    - Add logging configuration with timestamps and statistics
    - Implement health check endpoint
    - _Requirements: 4.1, 4.10, 7.8, 7.9_
  
  - [ ] 8.3 Add manual cleanup API endpoint
    - Implement POST /api/cron/trigger-cleanup endpoint (admin only)
    - Accept optional max_age_hours parameter
    - Return cleanup statistics
    - _Requirements: 4.12, 5.10_
  
  - [ ] 8.4 Write property test for VM cleanup query logic
    - **Property 11: VM Cleanup Query Logic**
    - **Validates: Requirements 4.2**
  
  - [ ] 8.5 Write property test for VM cleanup transaction
    - **Property 12: VM Cleanup Transaction**
    - **Validates: Requirements 4.5**
  
  - [ ] 8.6 Write property test for VM cleanup error handling
    - **Property 13: VM Cleanup Error Handling**
    - **Validates: Requirements 4.6, 4.7, 4.8, 4.9, 4.11, 7.6, 7.7, 7.8, 7.10**
  
  - [ ] 8.7 Write property test for manual cleanup API endpoint
    - **Property 17: Manual Cleanup API Endpoint**
    - **Validates: Requirements 4.12, 5.10**
  
  - [ ] 8.8 Write unit tests for VM cleanup service
    - Test MongoDB query logic with various session ages and statuses
    - Test Azure VM deletion with mocking
    - Test error handling and status updates
    - Test notification logic
    - Test circuit breaker implementation
    - _Requirements: 4.2-4.11_

- [ ] 9. Checkpoint - Test cronjob services
  - Run tests for writeup upload service with mocked GitHub API
  - Run tests for VM cleanup service with mocked Azure API
  - Test manual cleanup API endpoint
  - Verify error handling and logging
  - Ask the user if questions arise

- [ ] 10. Implement agent documentation standards
  - [ ] 10.1 Update BASE_PROMPT.md template for new agents
    - Ensure Gemini CLI and Mistral Vibe CLI follow same documentation standards
    - Include instructions for maintaining changelog.md, discoveries.md, writeup.md
    - Ensure MCP server access instructions are included
    - _Requirements: 1.9, 1.10_
  
  - [ ] 10.2 Test agent documentation generation
    - Create test scenarios for Gemini CLI documentation
    - Create test scenarios for Mistral Vibe CLI documentation
    - Verify changelog.md format consistency
    - Verify discoveries.md format consistency
    - Verify writeup.md format with YAML frontmatter
    - _Requirements: 1.9, 1.10_
  
  - [ ] 10.3 Write property test for agent documentation standards
    - **Property 6: Agent Documentation Standards**
    - **Validates: Requirements 1.9, 1.10**

- [ ] 11. Implement health check endpoints
  - [ ] 11.1 Add health check endpoints for cronjobs
    - Implement GET /api/cron/health endpoint
    - Check MongoDB connectivity
    - Check external API connectivity (GitHub, Azure) for respective cronjobs
    - Return version and last run information
    - Return 200 OK when healthy, 503 when unhealthy
    - _Requirements: 7.9_
  
  - [ ] 11.2 Write property test for health check endpoints
    - **Property 18: Health Check Endpoints**
    - **Validates: Requirements 7.9**
  
  - [ ] 11.3 Write unit tests for health checks
    - Test health endpoint with various connectivity states
    - Test MongoDB connectivity check
    - Test external API connectivity checks
    - Test error responses
    - _Requirements: 7.9_

- [ ] 12. Final integration and testing
  - [ ] 12.1 Run comprehensive integration tests
    - Test complete VM creation flow with all new agent types
    - Test manual mode VM creation and terminal interaction
    - Test writeup upload cronjob integration with mocked APIs
    - Test VM cleanup cronjob integration with mocked APIs
    - Test error scenarios for all new features
    - _Requirements: All requirements_
  
  - [ ] 12.2 Write end-to-end tests with Playwright
    - Test creating VM with Gemini CLI agent
    - Test creating VM with Mistral Vibe CLI agent
    - Test creating manual mode VM
    - Test interacting with manual mode terminal
    - Test cronjob health check endpoints
    - Test error scenarios for installation failures
    - _Requirements: All requirements_
  
  - [ ] 12.3 Update documentation
    - Update API documentation for new endpoints and models
    - Update user guide for new agent types and manual mode
    - Update deployment guide for cronjob setup on Northflank
    - Update error handling documentation
    - _Requirements: All requirements_

- [ ] 13. Deployment preparation
  - [ ] 13.1 Prepare Northflank deployment configurations
    - Create Northflank project configuration for writeup upload cronjob
    - Create Northflank project configuration for VM cleanup cronjob
    - Configure environment variables for both cronjobs
    - Set up scheduled execution (every 15 minutes for upload, every hour for cleanup)
    - Configure health checks and monitoring
    - _Requirements: 3.1, 3.12, 4.1, 4.10_
  
  - [ ] 13.2 Update CI/CD pipeline
    - Add build and test steps for new components
    - Add Docker image builds for cronjob applications
    - Add deployment steps for Northflank
    - Update test coverage reporting
    - _Requirements: All requirements_
  
  - [ ] 13.3 Perform final verification
    - Verify all tests pass
    - Verify documentation is complete
    - Verify deployment configurations are correct
    - Ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- Backend updates maintain compatibility with existing Codex and Copilot agents
- New agent installations require API keys configured as environment variables on VMs
- Manual mode provides full tooling without AI agent overhead
- Cronjobs are designed for reliable scheduled execution on Northflank
- Property tests use Hypothesis (Python) and fast-check (TypeScript) with 100+ iterations
- All tests should run in CI/CD pipeline before deployment
- Health check endpoints provide monitoring capability for cronjobs
- Error handling includes comprehensive logging and user feedback