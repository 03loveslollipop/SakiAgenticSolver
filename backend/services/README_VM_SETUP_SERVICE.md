# VM Setup Service

## Overview

The `VMSetupService` class manages the complete setup and configuration of Azure VMs for CTF challenge solving. It handles SSH-based operations to install tools, configure agents, download challenge files, create configuration files, set up MCP servers, and start the AI agent.

## Features

### 1. Setup Script Execution
- Installs all required CTF tools via SSH
- Includes z3 theorem prover, cryptographic utilities, decompilers, and debuggers
- Handles installation errors and provides detailed logging

### 2. Agent Installation
- Installs a **target-specific** agent runtime (non-interactive, token-based):
  - **Codex**: OpenAI Codex CLI (`@openai/codex`)
  - **Gemini**: Google Gemini CLI (`@google/gemini-cli`)
  - **Mixtral/Mistral**: Mistral API via Python SDK (`mistralai`)
  - **Copilot**: GitHub CLI + Copilot extension (best-effort; may require interactive OAuth depending on GitHub)
- Verifies installation success with lightweight version/help checks

### 3. Challenge File Downloads
- Downloads challenge files from provided URLs using wget
- Handles partial failures gracefully
- Reports which files failed to download

### 4. Configuration File Creation
Creates six essential configuration files on the VM:

- **instructions.md**: User-provided challenge instructions
- **BASE_PROMPT.md**: Immutable system instructions for the agent
- **AGENT.md**: User-modifiable rules and preferences
- **TOOLS.md**: Documentation of all installed tools and MCP servers
- **changelog.md**: Empty file for agent to maintain command history
- **discoveries.md**: Empty file for agent to document findings

### 5. MCP Server Configuration
- Configures writeup retrieval MCP server for accessing previous solutions
- Configures documentation MCP server for tool documentation
- Configures web search MCP server for internet research
- Writes mcp.json configuration file to VM

### 6. Agent Startup
- Starts the selected target agent in **non-interactive one-shot mode**
- Builds `SESSION_PROMPT.md` from `BASE_PROMPT.md` + `instructions.md`
- Launches the run in the background and writes logs to `~/agent.log`

## Credentials / Tokens

Agent startup is non-interactive and expects credentials to be provided via the **control service** environment
(e.g. Northflank secrets). `VMSetupService` writes only the required variables to:

- `/home/ctfuser/.config/saki/agent.env` (chmod `600`)

Required env vars by target:

- **Codex**: `OPENAI_API_KEY`
- **Gemini**: `GEMINI_API_KEY`
- **Mixtral/Mistral**: `MISTRAL_API_KEY`
- **Copilot**: `GH_TOKEN` or `GITHUB_TOKEN` (best-effort)

The service does not log token values.

### Optional Install Overrides

You can override the default install commands (executed on the VM) via control-service environment variables:

- `CODEX_INSTALL_COMMAND` (default: `sudo npm install -g @openai/codex`)
- `GEMINI_INSTALL_COMMAND` (default: `sudo npm install -g @google/gemini-cli`)
- `MISTRAL_INSTALL_COMMAND` (default: `python3 -m pip install --user --upgrade mistralai`)
- `COPILOT_INSTALL_COMMAND` (default: install `gh` via apt + install `github/gh-copilot` extension)

## Usage

```python
from services.vm_setup_service import VMSetupService

# Initialize service
setup_service = VMSetupService()

# Execute setup script
await setup_service.execute_setup_script(
    vm_ip="192.168.1.100",
    ssh_private_key=private_key_pem
)

# Install agent
await setup_service.install_agent(
    vm_ip="192.168.1.100",
    agent_type="codex",
    agent_model="gpt-4",
    ssh_private_key=private_key_pem
)

# Download challenge files
await setup_service.download_challenge_files(
    vm_ip="192.168.1.100",
    challenge_urls=["https://example.com/challenge.bin"],
    ssh_private_key=private_key_pem
)

# Create configuration files
await setup_service.create_config_files(
    vm_ip="192.168.1.100",
    instructions="Solve this CTF challenge",
    ssh_private_key=private_key_pem
)

# Configure MCP servers
await setup_service.configure_mcp_servers(
    vm_ip="192.168.1.100",
    mongo_connection_string="mongodb://localhost:27017",
    ssh_private_key=private_key_pem
)

# Start agent
await setup_service.start_agent(
    vm_ip="192.168.1.100",
    agent_type="codex",
    agent_model="gpt-4",
    ssh_private_key=private_key_pem
)
```

## SSH Connection Management

The service includes robust SSH connection handling:

- **Automatic Retry**: Retries SSH connections up to 3 times with exponential backoff
- **Error Handling**: Catches and logs authentication and connection errors
- **Resource Cleanup**: Ensures SSH connections are properly closed

## Configuration Files

### BASE_PROMPT.md Structure

The BASE_PROMPT.md file contains immutable system instructions including:

- Mission statement and objectives
- Documentation requirements (changelog.md, discoveries.md, writeup.md)
- Available resources (MCP servers, tools, instructions)
- Working methodology and best practices
- Success criteria

### AGENT.md Structure

The AGENT.md file contains user-modifiable preferences:

- General rules and guidelines
- Tool preferences
- Time limits and constraints
- Custom instructions

### TOOLS.md Structure

The TOOLS.md file documents:

- Theorem provers (z3)
- Cryptographic utilities (openssl, hashcat, john)
- Decompilers (ghidra, radare2)
- Debuggers (gdb with pwndbg, lldb)
- Binary analysis tools
- Networking tools
- Python libraries (pwntools, pycryptodome)
- MCP server configurations

## Error Handling

All methods include comprehensive error handling:

- SSH connection failures trigger retries with exponential backoff
- Tool installation failures are captured and logged
- Challenge file download failures are reported individually
- All errors are logged with context for debugging

## Testing

The service includes comprehensive unit tests covering:

- Successful execution of all operations
- Failure scenarios and error handling
- SSH connection retry logic
- Configuration file generation
- MCP server configuration

Run tests with:
```bash
pytest test_vm_setup_service.py -v
```

## Requirements Validation

This service validates the following requirements:

- **2.1-2.5**: Setup script installs all required tools
- **2.6**: Agent installation with selected model
- **2.7**: Challenge file downloads
- **2.8-2.12**: Configuration file creation
- **2.13**: Agent startup in background (non-interactive)
- **12.1-12.2, 12.5-12.7**: MCP server configuration

## Dependencies

- `paramiko`: SSH client for remote command execution
- `logging`: Comprehensive logging of all operations
- `MCPConfigService`: MCP server configuration generation

## Notes

- All SSH operations use private key authentication
- Setup script execution may take several minutes
- Agent runs in background after startup
- All operations are async for non-blocking execution
- SSH connections are automatically cleaned up after use
