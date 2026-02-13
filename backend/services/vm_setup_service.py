# VM Setup Service for configuring VMs with SSH-based operations

import logging
import paramiko
import asyncio
from io import StringIO
from typing import List, Optional
import time

logger = logging.getLogger(__name__)


class VMSetupService:
    """
    Manages VM setup operations via SSH.
    Executes setup scripts, installs agents, downloads challenge files,
    creates configuration files, and starts the agent.
    """
    
    def __init__(self):
        """Initialize VMSetupService."""
        pass
    
    def _create_ssh_client(
        self,
        vm_ip: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22,
        timeout: int = 30,
        max_retries: int = 3
    ) -> paramiko.SSHClient:
        """
        Create and connect SSH client with retry logic.
        
        Args:
            vm_ip: VM IP address
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            timeout: Connection timeout in seconds
            max_retries: Maximum number of connection attempts
            
        Returns:
            Connected SSHClient instance
            
        Raises:
            Exception: If connection fails after all retries
        """
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Load private key
        private_key = paramiko.RSAKey.from_private_key(StringIO(ssh_private_key))
        
        # Retry connection with exponential backoff
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting SSH connection to {vm_ip}:{ssh_port} (attempt {attempt + 1}/{max_retries})")
                ssh_client.connect(
                    hostname=vm_ip,
                    port=ssh_port,
                    username=ssh_username,
                    pkey=private_key,
                    timeout=timeout
                )
                logger.info(f"Successfully connected to VM at {vm_ip}")
                return ssh_client
            except (paramiko.AuthenticationException, paramiko.SSHException, Exception) as e:
                logger.warning(f"SSH connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    logger.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to connect to VM after {max_retries} attempts")
                    raise Exception(f"Failed to connect to VM via SSH: {e}")
        
        raise Exception("Failed to establish SSH connection")
    
    async def execute_setup_script(
        self,
        vm_ip: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Execute setup script on VM via SSH to install required tools.
        """
        return await asyncio.to_thread(
            self._execute_setup_script_blocking,
            vm_ip,
            ssh_private_key,
            ssh_username,
            ssh_port,
        )

    def _execute_setup_script_blocking(
        self,
        vm_ip: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Execute setup script on VM via SSH to install required tools.
        
        Installs:
        - z3 theorem prover
        - Cryptographic utilities (openssl, hashcat, john)
        - Decompilers (ghidra, radare2, binary ninja)
        - Debuggers (gdb, pwndbg, lldb)
        
        Args:
            vm_ip: VM IP address
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            Exception: If SSH connection or script execution fails
        """
        ssh_client = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)
            
            # Setup script to install all required tools
            setup_script = """#!/bin/bash
set -e

echo "Starting CTF tools installation..."

apt_update() {
  sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get -o Acquire::Retries=3 -o Dpkg::Use-Pty=0 update
}

apt_install() {
  sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get -y -o Dpkg::Use-Pty=0 install "$@"
}

# Ensure needrestart never prompts for interactive confirmation.
sudo mkdir -p /etc/needrestart/conf.d || true
echo '$nrconf{restart} = "a";' | sudo tee /etc/needrestart/conf.d/99-auto-restart.conf >/dev/null || true

# Update package lists
apt_update

# Install z3 theorem prover
echo "Installing z3..."
apt_install z3

# Install cryptographic utilities
echo "Installing cryptographic utilities..."
apt_install openssl hashcat john

# Install decompilers
echo "Installing decompilers..."
apt_install radare2

# Install Ghidra (requires Java)
apt_install default-jdk wget unzip
cd /opt
sudo wget -q https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_10.4_build/ghidra_10.4_PUBLIC_20230928.zip -O ghidra.zip || true
sudo unzip -q ghidra.zip || true
sudo rm -f ghidra.zip
sudo ln -sf /opt/ghidra_*/ghidraRun /usr/local/bin/ghidra || true

# Install debuggers
echo "Installing debuggers..."
apt_install gdb lldb

# Install pwndbg for GDB
cd /tmp
git clone https://github.com/pwndbg/pwndbg || true
cd pwndbg
./setup.sh || true

# Install additional useful tools
echo "Installing additional tools..."
apt_install python3-pip python3-dev build-essential
apt_install binutils strace ltrace
apt_install netcat-openbsd socat nmap
apt_install vim tmux curl wget

# Install Python packages for CTF
sudo pip3 install pwntools pycryptodome z3-solver

echo "CTF tools installation complete!"
"""
            
            logger.info("Executing setup script on VM")
            
            # Write setup script to VM
            sftp = ssh_client.open_sftp()
            try:
                with sftp.file("/tmp/setup_ctf_tools.sh", "w") as f:
                    f.write(setup_script)
                logger.info("Setup script uploaded to VM")
            finally:
                sftp.close()
            
            # Make script executable
            stdin, stdout, stderr = ssh_client.exec_command("chmod +x /tmp/setup_ctf_tools.sh")
            stdout.channel.recv_exit_status()
            
            # Execute setup script (this may take several minutes)
            logger.info("Running setup script (this may take several minutes)...")
            stdin, stdout, stderr = ssh_client.exec_command(
                "bash -lc 'if command -v timeout >/dev/null 2>&1; then timeout --foreground 45m /tmp/setup_ctf_tools.sh; else /tmp/setup_ctf_tools.sh; fi'",
                get_pty=True
            )
            
            # Stream output
            for line in stdout:
                logger.info(f"Setup: {line.strip()}")
            
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error_output = stderr.read().decode()
                logger.error(f"Setup script failed with exit code {exit_status}: {error_output}")
                return False
            
            logger.info("Setup script executed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error executing setup script: {e}")
            raise
        finally:
            if ssh_client:
                ssh_client.close()
    
    async def install_agent(
        self,
        vm_ip: str,
        agent_type: str,
        agent_model: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Install and configure AI agent (Codex or Copilot) on VM.
        """
        return await asyncio.to_thread(
            self._install_agent_blocking,
            vm_ip,
            agent_type,
            agent_model,
            ssh_private_key,
            ssh_username,
            ssh_port,
        )

    def _install_agent_blocking(
        self,
        vm_ip: str,
        agent_type: str,
        agent_model: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Install and configure AI agent (Codex or Copilot) on VM.
        
        Args:
            vm_ip: VM IP address
            agent_type: Type of agent ('codex' or 'copilot')
            agent_model: Model name for the agent
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            Exception: If SSH connection or installation fails
        """
        ssh_client = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)
            
            logger.info(f"Installing {agent_type} agent with model {agent_model}")
            
            # Install Kiro (the agent platform)
            install_commands = [
                # Install Node.js and npm if not present
                "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a bash -",
                "sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get install -y -o Dpkg::Use-Pty=0 nodejs",
                
                # Install Kiro globally
                "sudo npm install -g @kiro-ai/kiro",
                
                # Verify installation
                "kiro --version"
            ]
            
            for cmd in install_commands:
                logger.info(f"Executing: {cmd}")
                stdin, stdout, stderr = ssh_client.exec_command(cmd, get_pty=True)
                
                # Stream output
                for line in stdout:
                    logger.info(f"Agent install: {line.strip()}")
                
                exit_status = stdout.channel.recv_exit_status()
                if exit_status != 0:
                    error_output = stderr.read().decode()
                    logger.error(f"Command failed: {cmd}\nError: {error_output}")
                    return False
            
            # Configure agent with selected model
            config_cmd = f"kiro config set model {agent_model}"
            logger.info(f"Configuring agent: {config_cmd}")
            stdin, stdout, stderr = ssh_client.exec_command(config_cmd)
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error_output = stderr.read().decode()
                logger.warning(f"Agent configuration warning: {error_output}")
            
            logger.info(f"Agent {agent_type} installed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error installing agent: {e}")
            raise
        finally:
            if ssh_client:
                ssh_client.close()

    async def write_agent_bootstrap_script(
        self,
        vm_ip: str,
        agent_type: str,
        agent_model: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Write a bootstrap script onto the VM to (re)install and start the agent.
        """
        return await asyncio.to_thread(
            self._write_agent_bootstrap_script_blocking,
            vm_ip,
            agent_type,
            agent_model,
            ssh_private_key,
            ssh_username,
            ssh_port,
        )

    def _write_agent_bootstrap_script_blocking(
        self,
        vm_ip: str,
        agent_type: str,
        agent_model: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Write a bootstrap script onto the VM to (re)install and start the agent.

        This is intentionally designed for interactive use, since authenticating
        to commercial LLM providers typically requires user-provided credentials.

        The script:
        - Installs prerequisites and the `kiro` CLI (idempotent-ish)
        - Prompts for common API keys if missing (stores them in ~/.config/saki/agent.env)
        - Builds a session prompt by concatenating BASE_PROMPT.md + instructions.md
        - Starts the agent and writes logs to ~/agent.log
        """
        import shlex

        ssh_client = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)

            agent_type_q = shlex.quote(agent_type)
            agent_model_q = shlex.quote(agent_model)

            script = f"""#!/usr/bin/env bash
set -euo pipefail

AGENT_TYPE={agent_type_q}
AGENT_MODEL={agent_model_q}

ENV_DIR="$HOME/.config/saki"
ENV_FILE="$ENV_DIR/agent.env"

ensure_cmd() {{
  command -v "$1" >/dev/null 2>&1
}}

source_env() {{
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi
}}

persist_env() {{
  local var="$1"
  local val="$2"
  mkdir -p "$ENV_DIR"
  touch "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  # Append (do not overwrite) so users can keep multiple exports.
  printf 'export %s=%q\\n' "$var" "$val" >> "$ENV_FILE"
  export "$var=$val"
}}

ensure_any_env() {{
  # Usage: ensure_any_env VAR1 VAR2 ...
  for v in "$@"; do
    if [ -n "${{!v:-}}" ]; then
      return 0
    fi
  done

  if [ ! -t 0 ]; then
    echo "Missing required credentials and no interactive TTY. Export the required env var(s) and rerun:" >&2
    echo "  $*" >&2
    return 1
  fi

  local first="$1"
  read -r -s -p "Enter $first: " val
  echo
  persist_env "$first" "$val"
}}

install_node() {{
  if ensure_cmd node && ensure_cmd npm; then
    return 0
  fi
  echo "Installing Node.js (required for kiro)..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a bash -
  sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get install -y -o Dpkg::Use-Pty=0 nodejs
}}

install_kiro() {{
  if ensure_cmd kiro; then
    return 0
  fi
  echo "Installing kiro..."
  sudo npm install -g @kiro-ai/kiro
}}

build_session_prompt() {{
  local base="/home/ctfuser/BASE_PROMPT.md"
  local instr="/home/ctfuser/instructions.md"
  local out="/home/ctfuser/SESSION_PROMPT.md"

  if [ ! -f "$base" ] || [ ! -f "$instr" ]; then
    echo "Missing $base or $instr; cannot build session prompt." >&2
    return 1
  fi

  cat "$base" > "$out"
  printf '\\n\\n# Session Instructions\\n\\n' >> "$out"
  cat "$instr" >> "$out"
}}

ensure_auth() {{
  # Heuristic mapping: adjust env vars to your provider of choice.
  if [[ "$AGENT_MODEL" == *\"gemini\"* ]]; then
    ensure_any_env GOOGLE_API_KEY GEMINI_API_KEY
    return
  fi
  if [[ "$AGENT_MODEL" == *\"mixtral\"* ]] || [[ "$AGENT_MODEL" == *\"mistral\"* ]]; then
    ensure_any_env MISTRAL_API_KEY
    return
  fi
  if [[ "$AGENT_TYPE" == \"copilot\" ]]; then
    ensure_any_env GH_TOKEN GITHUB_TOKEN
    return
  fi
  ensure_any_env OPENAI_API_KEY
}}

start_agent() {{
  if pgrep -f \"kiro start\" >/dev/null 2>&1; then
    echo \"Agent already running (kiro start).\"
    return 0
  fi

  build_session_prompt

  echo \"Configuring model: $AGENT_MODEL\"
  kiro config set model \"$AGENT_MODEL\" || true

  echo \"Starting agent... (logs: $HOME/agent.log)\"
  nohup sudo -E kiro start --prompt /home/ctfuser/SESSION_PROMPT.md --config /home/ctfuser/AGENT.md --workspace \"$HOME/challenges\" > \"$HOME/agent.log\" 2>&1 &
  sleep 1
  echo \"Agent started (or attempted). Tail logs with: tail -f ~/agent.log\"
}}

main() {{
  echo \"SAKI agent bootstrap\"
  echo \"Agent type: $AGENT_TYPE\"
  echo \"Agent model: $AGENT_MODEL\"

  sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get -o Acquire::Retries=3 -o Dpkg::Use-Pty=0 update
  sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get install -y -o Dpkg::Use-Pty=0 curl ca-certificates git

  install_node
  install_kiro

  source_env
  ensure_auth
  start_agent
}}

main \"$@\"
"""

            sftp = ssh_client.open_sftp()
            try:
                with sftp.file("/home/ctfuser/bootstrap_agent.sh", "w") as f:
                    f.write(script)
            finally:
                sftp.close()

            stdin, stdout, stderr = ssh_client.exec_command("chmod +x /home/ctfuser/bootstrap_agent.sh")
            stdout.channel.recv_exit_status()

            logger.info("Wrote /home/ctfuser/bootstrap_agent.sh")
            return True

        except Exception as e:
            logger.error(f"Error writing agent bootstrap script: {e}")
            return False
        finally:
            if ssh_client:
                ssh_client.close()
    
    async def download_challenge_files(
        self,
        vm_ip: str,
        challenge_urls: List[str],
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Download challenge files to VM using wget/curl.
        """
        return await asyncio.to_thread(
            self._download_challenge_files_blocking,
            vm_ip,
            challenge_urls,
            ssh_private_key,
            ssh_username,
            ssh_port,
        )

    def _download_challenge_files_blocking(
        self,
        vm_ip: str,
        challenge_urls: List[str],
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Download challenge files to VM using wget/curl.
        
        Args:
            vm_ip: VM IP address
            challenge_urls: List of URLs to download
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            
        Returns:
            True if all downloads successful, False otherwise
            
        Raises:
            Exception: If SSH connection fails
        """
        ssh_client = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)
            
            # Create challenges directory
            logger.info("Creating challenges directory")
            stdin, stdout, stderr = ssh_client.exec_command("mkdir -p ~/challenges")
            stdout.channel.recv_exit_status()
            
            # Download each challenge file
            failed_urls = []
            for url in challenge_urls:
                logger.info(f"Downloading challenge file from {url}")
                
                # Use wget with timeout and retry
                download_cmd = f"cd ~/challenges && wget --timeout=30 --tries=3 '{url}'"
                stdin, stdout, stderr = ssh_client.exec_command(download_cmd)
                exit_status = stdout.channel.recv_exit_status()
                
                if exit_status != 0:
                    error_output = stderr.read().decode()
                    logger.error(f"Failed to download {url}: {error_output}")
                    failed_urls.append(url)
                else:
                    logger.info(f"Successfully downloaded {url}")
            
            if failed_urls:
                logger.error(f"Failed to download {len(failed_urls)} file(s): {failed_urls}")
                return False
            
            logger.info("All challenge files downloaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading challenge files: {e}")
            raise
        finally:
            if ssh_client:
                ssh_client.close()
    
    async def create_config_files(
        self,
        vm_ip: str,
        instructions: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Create configuration files on VM.
        """
        return await asyncio.to_thread(
            self._create_config_files_blocking,
            vm_ip,
            instructions,
            ssh_private_key,
            ssh_username,
            ssh_port,
        )

    def _create_config_files_blocking(
        self,
        vm_ip: str,
        instructions: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Create configuration files on VM:
        - instructions.md: User-provided challenge instructions
        - BASE_PROMPT.md: Immutable system instructions for agent
        - AGENT.md: User-modifiable rules for agent
        - TOOLS.md: Documentation of installed tools
        - changelog.md: Empty file for agent to maintain
        - discoveries.md: Empty file for agent to maintain
        
        Args:
            vm_ip: VM IP address
            instructions: User-provided challenge instructions
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            Exception: If SSH connection or file creation fails
        """
        ssh_client = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)
            
            sftp = ssh_client.open_sftp()
            try:
                # Create instructions.md
                logger.info("Creating instructions.md")
                with sftp.file("/home/ctfuser/instructions.md", "w") as f:
                    f.write(instructions)
                
                # Create BASE_PROMPT.md (immutable system instructions)
                logger.info("Creating BASE_PROMPT.md")
                base_prompt = self._generate_base_prompt()
                with sftp.file("/home/ctfuser/BASE_PROMPT.md", "w") as f:
                    f.write(base_prompt)
                
                # Create AGENT.md (user-modifiable rules)
                logger.info("Creating AGENT.md")
                agent_md = self._generate_agent_md()
                with sftp.file("/home/ctfuser/AGENT.md", "w") as f:
                    f.write(agent_md)
                
                # Create TOOLS.md (documentation of installed tools)
                logger.info("Creating TOOLS.md")
                tools_md = self._generate_tools_md()
                with sftp.file("/home/ctfuser/TOOLS.md", "w") as f:
                    f.write(tools_md)
                
                # Create empty changelog.md
                logger.info("Creating changelog.md")
                with sftp.file("/home/ctfuser/changelog.md", "w") as f:
                    f.write("# Changelog\n\nThis file will be maintained by the agent.\n\n")
                
                # Create empty discoveries.md
                logger.info("Creating discoveries.md")
                with sftp.file("/home/ctfuser/discoveries.md", "w") as f:
                    f.write("# Discoveries\n\nThis file will be maintained by the agent.\n\n")
                
                logger.info("All configuration files created successfully")
                return True
                
            finally:
                sftp.close()
            
        except Exception as e:
            logger.error(f"Error creating configuration files: {e}")
            raise
        finally:
            if ssh_client:
                ssh_client.close()
    
    def _generate_base_prompt(self) -> str:
        """
        Generate BASE_PROMPT.md content with immutable system instructions.
        
        Returns:
            BASE_PROMPT.md content as string
        """
        return """# CTF Challenge Agent - System Instructions

**IMPORTANT: This file contains core system instructions and cannot be modified.**

## Your Mission

You are an AI agent specialized in solving CTF (Capture The Flag) challenges. Your goal is to analyze the provided challenge files, apply your knowledge of security concepts, and systematically work towards finding the flag.

## Documentation Requirements

You MUST maintain the following documentation files throughout your work:

### 1. changelog.md
- Record EVERY command you execute with a timestamp
- Format: `[YYYY-MM-DD HH:MM:SS] <command>`
- Include the output or result of each command
- This creates an audit trail of your actions

### 2. discoveries.md
- Document all findings, insights, and analysis
- Include:
  - Vulnerabilities discovered
  - Patterns identified in binaries or encrypted data
  - Hypotheses about the challenge approach
  - Dead ends and why they didn't work
  - Breakthrough moments
- Use clear headings and structured markdown

### 3. writeup.md
- Generate this file when you successfully solve the challenge OR when you've exhausted your approaches
- Structure:
  - **Challenge Overview**: Brief description of the challenge
  - **Initial Analysis**: What you discovered in your first examination
  - **Approach**: The methodology you used
  - **Key Findings**: Critical discoveries that led to the solution
  - **Solution Steps**: Step-by-step explanation of how you solved it
  - **Flag**: The final flag (if found)
  - **Tools Used**: List of tools that were essential
  - **Lessons Learned**: What you learned from this challenge
  - **References**: Any external resources you consulted

## Available Resources

### MCP Servers
You have access to the following MCP (Model Context Protocol) servers:

1. **Writeup Retrieval Server**: Search and retrieve segments from previous CTF challenge writeups
   - Use this to learn from similar challenges solved in the past
   - Search by keywords, challenge type, or techniques

2. **Documentation Server**: Access documentation for installed tools
   - Get usage examples and command syntax
   - Understand tool capabilities

3. **Web Search Server**: Search the internet for information
   - Research vulnerabilities, techniques, and tools
   - Find relevant blog posts and tutorials

### Installed Tools
Refer to TOOLS.md for a complete list of installed tools and their versions.

### User Instructions
Refer to instructions.md for specific challenge instructions and context provided by the user.

### User-Modifiable Rules
Refer to AGENT.md for additional rules and preferences set by the user. These can be modified during your execution.

## Working Methodology

1. **Analyze First**: Before executing commands, analyze the challenge files and plan your approach
2. **Document Everything**: Update changelog.md and discoveries.md as you work
3. **Learn from History**: Use the writeup retrieval MCP server to see how similar challenges were solved
4. **Be Systematic**: Try approaches methodically, document what works and what doesn't
5. **Explain Your Thinking**: In discoveries.md, explain WHY you're trying each approach
6. **Generate Writeup**: When done (success or exhaustion), create a comprehensive writeup.md

## Important Notes

- You have root privileges - use them responsibly
- All challenge files are in the ~/challenges directory
- Update documentation files frequently, not just at the end
- If stuck, consult previous writeups via MCP server for inspiration
- The writeup.md will be uploaded to the database to help future agents

## Success Criteria

You are successful when:
1. You find the flag and document the solution in writeup.md
2. OR you've thoroughly explored all reasonable approaches and documented your attempts

Remember: Even unsuccessful attempts are valuable if well-documented!
"""
    
    def _generate_agent_md(self) -> str:
        """
        Generate AGENT.md content with user-modifiable rules.
        
        Returns:
            AGENT.md content as string
        """
        return """# Agent Configuration

This file contains user-modifiable rules and preferences for the agent.
You can edit this file through the dashboard to adjust the agent's behavior.

## General Rules

- Be thorough in your analysis
- Document your reasoning clearly
- Don't give up too easily on promising approaches
- Ask for help if you're truly stuck

## Preferences

- Preferred tools: (specify any tool preferences here)
- Time limits: (specify any time constraints)
- Focus areas: (specify if you want the agent to focus on specific aspects)

## Custom Instructions

(Add any custom instructions or constraints here)
"""
    
    def _generate_tools_md(self) -> str:
        """
        Generate TOOLS.md content documenting installed tools.
        
        Returns:
            TOOLS.md content as string
        """
        return """# Installed Tools and Versions

This document lists all tools installed on this VM for CTF challenge solving.

## Theorem Provers
- **z3**: Z3 Theorem Prover for constraint solving

## Cryptographic Utilities
- **openssl**: OpenSSL cryptographic library and tools
- **hashcat**: Advanced password recovery tool
- **john**: John the Ripper password cracker

## Decompilers
- **ghidra**: NSA's reverse engineering framework (version 10.4)
- **radare2**: Unix-like reverse engineering framework

## Debuggers
- **gdb**: GNU Debugger with pwndbg extensions
- **lldb**: LLVM Debugger
- **pwndbg**: GDB plugin for exploit development

## Binary Analysis Tools
- **binutils**: Collection of binary tools (objdump, strings, etc.)
- **strace**: System call tracer
- **ltrace**: Library call tracer

## Networking Tools
- **netcat**: TCP/IP swiss army knife
- **socat**: Multipurpose relay tool
- **nmap**: Network scanner

## Python Libraries
- **pwntools**: CTF framework and exploit development library
- **pycryptodome**: Cryptographic library for Python
- **z3-solver**: Python bindings for Z3

## General Utilities
- **vim**: Text editor
- **tmux**: Terminal multiplexer
- **curl**: Command-line HTTP client
- **wget**: File downloader

## MCP Servers

The following MCP servers are configured and available:

1. **writeup-retrieval**: Access previous CTF challenge writeups
   - Search by keywords or challenge type
   - Retrieve relevant solution segments

2. **documentation**: Access tool documentation
   - Get usage examples
   - Look up command syntax

3. **web-search**: Search the internet
   - Research vulnerabilities
   - Find tutorials and resources

## Usage Notes

- All tools are accessible from the command line
- Python libraries can be imported in Python scripts
- MCP servers are automatically available to the agent
- Refer to BASE_PROMPT.md for guidance on using these tools effectively
"""
    
    async def configure_mcp_servers(
        self,
        vm_ip: str,
        mongo_connection_string: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Configure MCP servers on VM for agent capabilities.
        
        Sets up:
        - Writeup retrieval MCP server
        - Documentation MCP server
        - Web search MCP server
        
        Args:
            vm_ip: VM IP address
            mongo_connection_string: MongoDB connection string
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            Exception: If SSH connection or configuration fails
        """
        # Import here to avoid circular dependency
        from .mcp_config_service import MCPConfigService
        
        try:
            logger.info("Configuring MCP servers on VM")
            mcp_service = MCPConfigService()
            
            success = await mcp_service.write_mcp_config_to_vm(
                vm_ip=vm_ip,
                ssh_private_key=ssh_private_key,
                mongo_connection_string=mongo_connection_string,
                ssh_username=ssh_username,
                ssh_port=ssh_port
            )
            
            if success:
                logger.info("MCP servers configured successfully")
            else:
                logger.error("Failed to configure MCP servers")
            
            return success
            
        except Exception as e:
            logger.error(f"Error configuring MCP servers: {e}")
            raise
    
    async def start_agent(
        self,
        vm_ip: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Start AI agent with root privileges on VM.
        """
        return await asyncio.to_thread(
            self._start_agent_blocking,
            vm_ip,
            ssh_private_key,
            ssh_username,
            ssh_port,
        )

    def _start_agent_blocking(
        self,
        vm_ip: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Start AI agent with root privileges on VM.
        
        The agent will:
        - Read BASE_PROMPT.md for system instructions
        - Read AGENT.md for user preferences
        - Read instructions.md for challenge details
        - Access challenge files in ~/challenges
        - Maintain changelog.md and discoveries.md
        - Generate writeup.md upon completion
        
        Args:
            vm_ip: VM IP address
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            
        Returns:
            True if agent started successfully, False otherwise
            
        Raises:
            Exception: If SSH connection or agent start fails
        """
        ssh_client = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)
            
            logger.info("Starting AI agent with root privileges")
            
            # Create a startup script that runs the agent
            startup_script = """#!/bin/bash
set -e
cd /home/ctfuser

# Build a per-session prompt by combining the system prompt + user instructions.
cat BASE_PROMPT.md > SESSION_PROMPT.md
echo -e "\\n\\n# Session Instructions\\n" >> SESSION_PROMPT.md
cat instructions.md >> SESSION_PROMPT.md

# Start the agent with access to all configuration files
# The agent will run in the background and maintain documentation
sudo -E kiro start --prompt SESSION_PROMPT.md --config AGENT.md --workspace ~/challenges &

echo "Agent started successfully"
"""
            
            # Write startup script
            sftp = ssh_client.open_sftp()
            try:
                with sftp.file("/tmp/start_agent.sh", "w") as f:
                    f.write(startup_script)
            finally:
                sftp.close()
            
            # Make script executable
            stdin, stdout, stderr = ssh_client.exec_command("chmod +x /tmp/start_agent.sh")
            stdout.channel.recv_exit_status()
            
            # Execute startup script
            logger.info("Executing agent startup script")
            stdin, stdout, stderr = ssh_client.exec_command("/tmp/start_agent.sh", get_pty=True)
            
            # Read output
            output = stdout.read().decode()
            logger.info(f"Agent startup output: {output}")
            
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error_output = stderr.read().decode()
                logger.error(f"Failed to start agent: {error_output}")
                return False
            
            logger.info("Agent started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error starting agent: {e}")
            raise
        finally:
            if ssh_client:
                ssh_client.close()
