# VM Setup Service for configuring VMs with SSH-based operations

import logging
import paramiko
import asyncio
from io import StringIO
from typing import Dict, List, Optional, Tuple
import time
import os
import shlex

logger = logging.getLogger(__name__)


class VMSetupService:
    """
    Manages VM setup operations via SSH.
    Executes setup scripts, installs agents, downloads challenge files,
    creates configuration files, and starts the agent.
    """
    
    def __init__(self):
        """Initialize VMSetupService."""
        self.last_error: Optional[str] = None
    
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
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
export NEEDRESTART_SUSPEND=1
export APT_LISTCHANGES_FRONTEND=none

echo "Starting CTF tools installation..."

apt_update() {
  sudo -E env DEBIAN_FRONTEND="$DEBIAN_FRONTEND" NEEDRESTART_MODE="$NEEDRESTART_MODE" NEEDRESTART_SUSPEND="$NEEDRESTART_SUSPEND" APT_LISTCHANGES_FRONTEND="$APT_LISTCHANGES_FRONTEND" \
    apt-get -o Acquire::Retries=3 -o Acquire::Progress=false -o APT::Get::Show-Progress=false -o APT::Color=0 -o Dpkg::Use-Pty=0 -o DPkg::Lock::Timeout=120 update
}

apt_install() {
  sudo -E env DEBIAN_FRONTEND="$DEBIAN_FRONTEND" NEEDRESTART_MODE="$NEEDRESTART_MODE" NEEDRESTART_SUSPEND="$NEEDRESTART_SUSPEND" APT_LISTCHANGES_FRONTEND="$APT_LISTCHANGES_FRONTEND" \
    apt-get -y -o Acquire::Progress=false -o APT::Get::Show-Progress=false -o APT::Color=0 -o Dpkg::Use-Pty=0 -o DPkg::Lock::Timeout=120 -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install "$@"
}

apt_install_optional() {
  if apt_install "$@"; then
    return 0
  fi
  echo "Optional package install failed: $* (continuing)"
  return 0
}

# Ensure needrestart never prompts for interactive confirmation.
sudo mkdir -p /etc/needrestart/conf.d || true
cat <<'EOF' | sudo tee /etc/needrestart/conf.d/99-auto-restart.conf >/dev/null || true
$nrconf{restart} = 'a';
$nrconf{kernelhints} = -1;
EOF

# Update package lists
apt_update

# Install z3 theorem prover
echo "Installing z3..."
if ! apt_install z3; then
  echo "z3 package unavailable; trying alternative packages..."
  if apt_install python3-z3; then
    echo "Installed python3-z3 as fallback."
  else
    echo "python3-z3 unavailable; continuing with pip z3-solver fallback."
  fi
fi

# Install cryptographic utilities
echo "Installing cryptographic utilities..."
apt_install openssl hashcat john

# Install decompilers
echo "Installing decompilers..."
if ! apt_install radare2; then
  echo "radare2 is unavailable in current apt repositories; trying rizin fallback..."
  apt_install_optional rizin
fi

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
        Install the target-specific agent runtime on the VM (Codex, Copilot, Gemini, or Mistral).
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
        Install the target-specific agent runtime on the VM (Codex, Copilot, Gemini, or Mistral).
        
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
        self.last_error = None
        target = self._resolve_agent_target(agent_type, agent_model)
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)

            logger.info(
                "Installing agent runtime target=%s (agent_type=%s, agent_model=%s)",
                target,
                agent_type,
                agent_model,
            )

            apt_env = (
                "sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1 "
                "APT_LISTCHANGES_FRONTEND=none"
            )
            apt_update = f"{apt_env} apt-get -o Acquire::Retries=3 -o Dpkg::Use-Pty=0 -o DPkg::Lock::Timeout=120 update"
            apt_install = (
                f"{apt_env} apt-get install -y -o Dpkg::Use-Pty=0 -o DPkg::Lock::Timeout=120 "
                "-o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold"
            )

            node_setup = (
                "curl -fsSL https://deb.nodesource.com/setup_20.x | "
                "sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1 "
                "APT_LISTCHANGES_FRONTEND=none bash -"
            )
            node_install = f"{apt_install} nodejs"

            install_commands: List[str] = []

            if target in {"codex", "gemini"}:
                install_commands.extend([node_setup, apt_update, node_install])

                if target == "codex":
                    install_cmd = (os.getenv("CODEX_INSTALL_COMMAND") or "sudo npm install -g @openai/codex").strip()
                    verify_cmd = "codex --version"
                else:
                    install_cmd = (os.getenv("GEMINI_INSTALL_COMMAND") or "sudo npm install -g @google/gemini-cli").strip()
                    verify_cmd = "gemini --version"

                if not install_cmd:
                    self.last_error = f"Empty install command for target={target}"
                    logger.error(self.last_error)
                    return False

                install_commands.extend([install_cmd, verify_cmd])

            elif target == "copilot":
                # Best-effort: GitHub Copilot CLI via gh extension. Note that it may still require interactive OAuth.
                install_cmd_override = (os.getenv("COPILOT_INSTALL_COMMAND") or "").strip()
                if install_cmd_override:
                    install_commands.append(f"bash -lc {shlex.quote(install_cmd_override)}")
                else:
                    install_commands.extend(
                        [
                            apt_update,
                            f"{apt_install} gh",
                            "gh extension install github/gh-copilot --force || gh extension upgrade gh-copilot || true",
                            "gh --version",
                            "gh copilot --help",
                        ]
                    )

            elif target == "mistral":
                mistral_install_cmd = (
                    os.getenv("MISTRAL_INSTALL_COMMAND") or "python3 -m pip install --user --upgrade mistralai"
                ).strip()
                if not mistral_install_cmd:
                    self.last_error = "Empty MISTRAL_INSTALL_COMMAND"
                    logger.error(self.last_error)
                    return False

                install_commands.extend(
                    [
                        apt_update,
                        f"{apt_install} python3-pip",
                        mistral_install_cmd,
                        'python3 -c "import mistralai; print(getattr(mistralai, \'__version__\', \'unknown\'))"',
                    ]
                )

            else:
                self.last_error = f"Unsupported agent target: {target}"
                logger.error(self.last_error)
                return False

            for cmd in install_commands:
                logger.info("Executing: %s", self._redact_secrets(cmd))
                stdin, stdout, stderr = ssh_client.exec_command(cmd, get_pty=True)
                stdout_tail: List[str] = []

                for line in stdout:
                    stripped_line = line.strip()
                    if stripped_line:
                        stdout_tail.append(stripped_line)
                        if len(stdout_tail) > 40:
                            stdout_tail.pop(0)
                    logger.info("Agent install: %s", self._redact_secrets(stripped_line))

                exit_status = stdout.channel.recv_exit_status()
                if exit_status != 0:
                    error_output = stderr.read().decode(errors="ignore").strip()
                    output_fallback = "\n".join(stdout_tail[-20:]).strip()
                    failure_details = error_output or output_fallback or f"Command exited with status {exit_status}"
                    failure_details = self._redact_secrets(failure_details)
                    if len(failure_details) > 2000:
                        failure_details = f"...{failure_details[-2000:]}"
                    self.last_error = (
                        f"Agent install command failed (exit={exit_status}) target={target}: {self._redact_secrets(cmd)}. "
                        f"Details: {failure_details}"
                    )
                    logger.error(self.last_error)
                    return False

            # Best-effort: seed agent.env if server has credentials configured.
            exports, missing = self._collect_token_exports_for_target(target)
            if exports and not missing:
                try:
                    self._persist_agent_env_to_vm(ssh_client, ssh_username=ssh_username, exports=exports)
                except Exception as env_exc:
                    logger.warning("Failed to persist agent.env (continuing): %s", env_exc)
            elif missing:
                logger.warning("Missing server env vars for target %s (will prevent auto-start): %s", target, ", ".join(missing))

            logger.info("Agent runtime target=%s installed successfully", target)
            return True

        except Exception as e:
            if self.last_error is None:
                self.last_error = self._redact_secrets(str(e))
            logger.error("Error installing agent: %s", self._redact_secrets(str(e)))
            return False
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

        This script is intentionally **non-interactive**: it will read credentials
        from `~/.config/saki/agent.env` and fail with a clear message if missing.

        The script:
        - Installs the selected target CLI/SDK (idempotent-ish)
        - Builds SESSION_PROMPT.md from BASE_PROMPT.md + instructions.md
        - Launches a one-shot run in the background (logs to ~/agent.log)
        """
        ssh_client = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)

            target = self._resolve_agent_target(agent_type, agent_model)
            model = self._normalize_model_for_target(target, agent_model)

            codex_install_cmd = (os.getenv("CODEX_INSTALL_COMMAND") or "sudo npm install -g @openai/codex").strip()
            gemini_install_cmd = (os.getenv("GEMINI_INSTALL_COMMAND") or "sudo npm install -g @google/gemini-cli").strip()
            mistral_install_cmd = (
                os.getenv("MISTRAL_INSTALL_COMMAND") or "python3 -m pip install --user --upgrade mistralai"
            ).strip()
            copilot_install_cmd = (os.getenv("COPILOT_INSTALL_COMMAND") or "").strip()

            script = f"""#!/usr/bin/env bash
set -euo pipefail

TARGET={shlex.quote(target)}
MODEL={shlex.quote(model)}

CODEX_INSTALL_CMD={shlex.quote(codex_install_cmd)}
GEMINI_INSTALL_CMD={shlex.quote(gemini_install_cmd)}
MISTRAL_INSTALL_CMD={shlex.quote(mistral_install_cmd)}
COPILOT_INSTALL_CMD={shlex.quote(copilot_install_cmd)}

ENV_DIR="$HOME/.config/saki"
ENV_FILE="$ENV_DIR/agent.env"
LOG_FILE="$HOME/agent.log"
PID_FILE="$HOME/agent.pid"

agent_running() {{
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "Agent already running (pid=$pid). Logs: $LOG_FILE"
      return 0
    fi
  fi
  return 1
}}

APT_ENV="sudo -E env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1 APT_LISTCHANGES_FRONTEND=none"

apt_update() {{
  $APT_ENV apt-get -o Acquire::Retries=3 -o Dpkg::Use-Pty=0 -o DPkg::Lock::Timeout=120 update
}}

apt_install() {{
  $APT_ENV apt-get install -y -o Dpkg::Use-Pty=0 -o DPkg::Lock::Timeout=120 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold "$@"
}}

ensure_cmd() {{
  command -v "$1" >/dev/null 2>&1
}}

load_env() {{
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi
}}

require_any_env() {{
  for v in "$@"; do
    if [ -n "${{!v:-}}" ]; then
      return 0
    fi
  done
  echo "Missing required credentials. Provide one of: $*" >&2
  echo "Expected to be exported in: $ENV_FILE" >&2
  return 1
}}

install_node() {{
  if ensure_cmd node && ensure_cmd npm; then
    return 0
  fi
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | $APT_ENV bash -
  apt_update
  apt_install nodejs
}}

install_codex() {{
  install_node
  if ensure_cmd codex; then
    return 0
  fi
  echo "Installing Codex CLI..."
  bash -lc "$CODEX_INSTALL_CMD"
}}

install_gemini() {{
  install_node
  if ensure_cmd gemini; then
    return 0
  fi
  echo "Installing Gemini CLI..."
  bash -lc "$GEMINI_INSTALL_CMD"
}}

install_copilot() {{
  if ! ensure_cmd gh; then
    echo "Installing GitHub CLI..."
    apt_update
    apt_install gh
  fi

  if gh copilot --help >/dev/null 2>&1; then
    return 0
  fi

  if [ -n "$COPILOT_INSTALL_CMD" ]; then
    echo "Installing Copilot CLI via override..."
    bash -lc "$COPILOT_INSTALL_CMD"
  else
    echo "Installing gh-copilot extension (best-effort; may require interactive OAuth to use)..."
    gh extension install github/gh-copilot --force || gh extension upgrade gh-copilot || true
  fi
}}

install_mistral() {{
  echo "Installing Mistral Python SDK..."
  apt_update
  apt_install python3-pip
  bash -lc "$MISTRAL_INSTALL_CMD"
}}

build_session_prompt() {{
  local base="$HOME/BASE_PROMPT.md"
  local instr="$HOME/instructions.md"
  local out="$HOME/SESSION_PROMPT.md"

  if [ ! -f "$base" ] || [ ! -f "$instr" ]; then
    echo "Missing $base or $instr; cannot build session prompt." >&2
    return 1
  fi

  cat "$base" > "$out"
  printf '\\n\\n# Session Instructions\\n\\n' >> "$out"
  cat "$instr" >> "$out"
}}

start_codex() {{
  load_env
  if [ -z "${{CODEX_API_KEY:-}}" ] && [ -n "${{OPENAI_API_KEY:-}}" ]; then
    export CODEX_API_KEY="$OPENAI_API_KEY"
  fi
  require_any_env CODEX_API_KEY OPENAI_API_KEY

  build_session_prompt

  local args=(exec --full-auto --sandbox danger-full-access)
  if [ -n "$MODEL" ]; then
    args+=(--model "$MODEL")
  fi

  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  nohup codex "${{args[@]}}" - < "$HOME/SESSION_PROMPT.md" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

start_gemini() {{
  load_env
  require_any_env GEMINI_API_KEY

  build_session_prompt

  local args=()
  if [ -n "$MODEL" ]; then
    args=(-m "$MODEL")
  fi

  local prompt
  prompt="$(cat "$HOME/SESSION_PROMPT.md")"
  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  nohup gemini "${{args[@]}}" -p "$prompt" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

start_mistral() {{
  load_env
  require_any_env MISTRAL_API_KEY

  build_session_prompt

  local model="$MODEL"
  if [ -z "$model" ]; then
    model="mistral-medium-latest"
  fi

  cat > /tmp/saki_mistral_one_shot.py <<'PY'
import os
import sys
from pathlib import Path


def main() -> int:
    api_key = os.environ.get("MISTRAL_API_KEY", "").strip()
    if not api_key:
        print("Missing MISTRAL_API_KEY", file=sys.stderr)
        return 2

    model = sys.argv[1] if len(sys.argv) > 1 else "mistral-medium-latest"
    prompt_path = sys.argv[2] if len(sys.argv) > 2 else str(Path.home() / "SESSION_PROMPT.md")
    prompt = Path(prompt_path).read_text(encoding="utf-8", errors="ignore")

    from mistralai import Mistral

    client = Mistral(api_key=api_key)
    resp = client.chat.complete(model=model, messages=[{{"role": "user", "content": prompt}}])

    try:
        print(resp.choices[0].message.content)
    except Exception:
        print(resp)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
PY

  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  nohup python3 /tmp/saki_mistral_one_shot.py "$model" "$HOME/SESSION_PROMPT.md" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

start_copilot() {{
  load_env
  require_any_env GH_TOKEN GITHUB_TOKEN

  build_session_prompt

  local prompt
  prompt="$(head -c 8000 "$HOME/SESSION_PROMPT.md" || true)"
  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  nohup gh copilot suggest -t shell "$prompt" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

main() {{
  echo "SAKI agent bootstrap"
  echo "Target: $TARGET"
  echo "Model: $MODEL"

  mkdir -p "$ENV_DIR"
  chmod 700 "$ENV_DIR" || true

  if agent_running; then
    exit 0
  fi

  case "$TARGET" in
    codex)
      install_codex
      start_codex
      ;;
    gemini)
      install_gemini
      start_gemini
      ;;
    mistral)
      install_mistral
      start_mistral
      ;;
    copilot)
      install_copilot
      start_copilot
      ;;
    *)
      echo "Unknown TARGET: $TARGET" >&2
      exit 1
      ;;
  esac

  echo "Launched $TARGET; logs: $LOG_FILE"
}}

main "$@"
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
            logger.error("Error writing agent bootstrap script: %s", self._redact_secrets(str(e)))
            return False
        finally:
            if ssh_client:
                ssh_client.close()

    def _resolve_agent_target(self, agent_type: str, agent_model: str) -> str:
        """
        Resolve the agent runtime target based on (agent_type, agent_model).

        Targets:
        - codex: OpenAI Codex CLI (npm @openai/codex)
        - copilot: GitHub CLI + Copilot extension (best-effort; may require interactive OAuth)
        - gemini: Google Gemini CLI (npm @google/gemini-cli)
        - mistral: Mistral API via Python SDK (pip mistralai)
        """
        agent_type_l = (agent_type or "").strip().lower()
        agent_model_l = (agent_model or "").strip().lower()

        if "gemini" in agent_model_l:
            return "gemini"
        if "mixtral" in agent_model_l or "mistral" in agent_model_l:
            return "mistral"
        if agent_type_l == "copilot":
            return "copilot"
        return "codex"

    def _normalize_model_for_target(self, target: str, agent_model: str) -> str:
        """Return a target-specific model string (or empty string to use tool defaults)."""
        model = (agent_model or "").strip()
        model_l = model.lower()
        target_l = (target or "").strip().lower()

        if target_l == "gemini":
            # UI uses a generic "gemini" preset; let the CLI choose its default model.
            if model_l in {"", "gemini", "gemini-cli"}:
                return ""
            return model

        if target_l == "mistral":
            if model_l in {"", "mixtral-vibe", "mixtral", "mistral"}:
                return "mistral-medium-latest"
            return model

        return model

    def _redact_secrets(self, text: str) -> str:
        """Best-effort secret redaction for logs/error tails."""
        if not text:
            return text

        redacted = text
        for env_name in (
            "OPENAI_API_KEY",
            "CODEX_API_KEY",
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
            "MISTRAL_API_KEY",
            "GH_TOKEN",
            "GITHUB_TOKEN",
        ):
            value = os.getenv(env_name)
            if value:
                redacted = redacted.replace(value, "***")
        return redacted

    def _collect_token_exports_for_target(self, target: str) -> Tuple[Dict[str, str], List[str]]:
        """
        Collect the minimal env vars to place on the VM for token-based auth.

        Returns:
        - exports: env var name -> value (never logged)
        - missing: list of missing env var names (for error messaging)
        """
        target_l = (target or "").strip().lower()
        exports: Dict[str, str] = {}
        missing: List[str] = []

        if target_l == "codex":
            api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
            if not api_key:
                missing.append("OPENAI_API_KEY")
            else:
                exports["OPENAI_API_KEY"] = api_key
                # Codex non-interactive mode supports CODEX_API_KEY for `codex exec`.
                exports["CODEX_API_KEY"] = api_key
            return exports, missing

        if target_l == "gemini":
            api_key = (os.getenv("GEMINI_API_KEY") or "").strip() or (os.getenv("GOOGLE_API_KEY") or "").strip()
            if not api_key:
                missing.append("GEMINI_API_KEY")
            else:
                exports["GEMINI_API_KEY"] = api_key
            return exports, missing

        if target_l == "mistral":
            api_key = (os.getenv("MISTRAL_API_KEY") or "").strip()
            if not api_key:
                missing.append("MISTRAL_API_KEY")
            else:
                exports["MISTRAL_API_KEY"] = api_key
            return exports, missing

        if target_l == "copilot":
            token = (os.getenv("GH_TOKEN") or "").strip() or (os.getenv("GITHUB_TOKEN") or "").strip()
            if not token:
                missing.extend(["GH_TOKEN", "GITHUB_TOKEN"])
            else:
                # Provide both names for compatibility with GH tooling.
                exports["GH_TOKEN"] = token
                exports["GITHUB_TOKEN"] = token
            return exports, missing

        return exports, missing

    def _persist_agent_env_to_vm(self, ssh_client: paramiko.SSHClient, *, ssh_username: str, exports: Dict[str, str]) -> None:
        """
        Write ~/.config/saki/agent.env on the VM with strict permissions.
        """
        if not exports:
            raise ValueError("No exports provided for agent.env")

        home_dir = f"/home/{ssh_username}"
        env_dir = f"{home_dir}/.config/saki"
        env_file = f"{env_dir}/agent.env"

        # Create directory and lock down perms before writing secrets.
        ssh_client.exec_command(f"mkdir -p {shlex.quote(env_dir)} && chmod 700 {shlex.quote(env_dir)}")

        # Write file via SFTP to avoid secrets in shell history/process args.
        content_lines = ["# Generated by Saki (VMSetupService).", "# DO NOT COMMIT."]
        for key, value in exports.items():
            content_lines.append(f"export {key}={shlex.quote(value)}")
        content = "\n".join(content_lines) + "\n"

        sftp = ssh_client.open_sftp()
        try:
            with sftp.file(env_file, "w") as f:
                f.write(content)
        finally:
            sftp.close()

        ssh_client.exec_command(f"chmod 600 {shlex.quote(env_file)}")
        logger.info("Wrote agent env file (%s vars) to %s", len(exports), env_file)
    
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
- **radare2**: Unix-like reverse engineering framework (installed when available in apt repos)
- **rizin**: Reverse engineering framework fallback when radare2 is unavailable

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
        agent_type: str,
        agent_model: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Start the selected target agent in a one-shot, non-interactive mode.
        """
        return await asyncio.to_thread(
            self._start_agent_blocking,
            vm_ip,
            agent_type,
            agent_model,
            ssh_private_key,
            ssh_username,
            ssh_port,
        )

    def _start_agent_blocking(
        self,
        vm_ip: str,
        agent_type: str,
        agent_model: str,
        ssh_private_key: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Start the selected target agent in a one-shot, non-interactive mode.
        
        The agent will:
        - Read BASE_PROMPT.md for system instructions
        - Read instructions.md for challenge details
        - Access challenge files in ~/challenges
        - Launch a background one-shot run, logging to ~/agent.log
        
        Args:
            vm_ip: VM IP address
            agent_type: API-level agent type (codex|copilot)
            agent_model: API-level model string
            ssh_private_key: SSH private key in PEM format
            ssh_username: SSH username
            ssh_port: SSH port
            
        Returns:
            True if agent started successfully, False otherwise
            
        Raises:
            Exception: If SSH connection or agent start fails
        """
        ssh_client = None
        self.last_error = None
        try:
            ssh_client = self._create_ssh_client(vm_ip, ssh_private_key, ssh_username, ssh_port)

            target = self._resolve_agent_target(agent_type, agent_model)
            model = self._normalize_model_for_target(target, agent_model)

            # Ensure credentials are present on the control service and persist them to the VM.
            exports, missing = self._collect_token_exports_for_target(target)
            if missing:
                self.last_error = (
                    f"Missing required token env var(s) for target={target}: {', '.join(missing)}"
                )
                logger.warning(self.last_error)
                return False

            try:
                self._persist_agent_env_to_vm(ssh_client, ssh_username=ssh_username, exports=exports)
            except Exception as env_exc:
                self.last_error = f"Failed to write agent.env on VM: {env_exc}"
                logger.error(self.last_error)
                return False

            logger.info("Starting agent target=%s model=%s", target, model or "<default>")

            target_q = shlex.quote(target)
            model_q = shlex.quote(model)

            # Create a startup script that builds prompt + launches a background one-shot run.
            startup_script = f"""#!/usr/bin/env bash
set -euo pipefail

TARGET={target_q}
MODEL={model_q}

ENV_FILE="$HOME/.config/saki/agent.env"
LOG_FILE="$HOME/agent.log"
PID_FILE="$HOME/agent.pid"

agent_running() {{
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "Agent already running (pid=$pid). Logs: $LOG_FILE"
      return 0
    fi
  fi
  return 1
}}

ensure_cmd() {{
  command -v "$1" >/dev/null 2>&1
}}

load_env() {{
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi
}}

require_any_env() {{
  for v in "$@"; do
    if [ -n "${{!v:-}}" ]; then
      return 0
    fi
  done
  echo "Missing required credentials. Provide one of: $*" >&2
  echo "Expected to be exported in: $ENV_FILE" >&2
  return 1
}}

build_session_prompt() {{
  local base="$HOME/BASE_PROMPT.md"
  local instr="$HOME/instructions.md"
  local out="$HOME/SESSION_PROMPT.md"

  if [ ! -f "$base" ] || [ ! -f "$instr" ]; then
    echo "Missing $base or $instr; cannot build session prompt." >&2
    return 1
  fi

  cat "$base" > "$out"
  printf '\\n\\n# Session Instructions\\n\\n' >> "$out"
  cat "$instr" >> "$out"
}}

start_codex() {{
  if ! ensure_cmd codex; then
    echo "Codex CLI is not installed (missing 'codex')." >&2
    return 1
  fi

  load_env
  if [ -z "${{CODEX_API_KEY:-}}" ] && [ -n "${{OPENAI_API_KEY:-}}" ]; then
    export CODEX_API_KEY="$OPENAI_API_KEY"
  fi
  require_any_env CODEX_API_KEY OPENAI_API_KEY

  build_session_prompt

  local args=(exec --full-auto --sandbox danger-full-access)
  if [ -n "$MODEL" ]; then
    args+=(--model "$MODEL")
  fi

  nohup codex "${{args[@]}}" - < "$HOME/SESSION_PROMPT.md" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

start_gemini() {{
  if ! ensure_cmd gemini; then
    echo "Gemini CLI is not installed (missing 'gemini')." >&2
    return 1
  fi

  load_env
  require_any_env GEMINI_API_KEY

  build_session_prompt

  local args=()
  if [ -n "$MODEL" ]; then
    args=(-m "$MODEL")
  fi

  local prompt
  prompt="$(cat "$HOME/SESSION_PROMPT.md")"
  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  nohup gemini "${{args[@]}}" -p "$prompt" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

start_mistral() {{
  load_env
  require_any_env MISTRAL_API_KEY

  build_session_prompt

  local model="$MODEL"
  if [ -z "$model" ]; then
    model="mistral-medium-latest"
  fi

  cat > /tmp/saki_mistral_one_shot.py <<'PY'
import os
import sys
from pathlib import Path


def main() -> int:
    api_key = os.environ.get("MISTRAL_API_KEY", "").strip()
    if not api_key:
        print("Missing MISTRAL_API_KEY", file=sys.stderr)
        return 2

    model = sys.argv[1] if len(sys.argv) > 1 else "mistral-medium-latest"
    prompt_path = sys.argv[2] if len(sys.argv) > 2 else str(Path.home() / "SESSION_PROMPT.md")
    prompt = Path(prompt_path).read_text(encoding="utf-8", errors="ignore")

    from mistralai import Mistral

    client = Mistral(api_key=api_key)
    resp = client.chat.complete(model=model, messages=[{{"role": "user", "content": prompt}}])

    try:
        print(resp.choices[0].message.content)
    except Exception:
        print(resp)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
PY

  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  nohup python3 /tmp/saki_mistral_one_shot.py "$model" "$HOME/SESSION_PROMPT.md" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

start_copilot() {{
  if ! ensure_cmd gh; then
    echo "GitHub CLI is not installed (missing 'gh')." >&2
    return 1
  fi

  # Best-effort: gh-copilot may still require interactive OAuth. This will fail fast if unavailable.
  if ! gh copilot --help >/dev/null 2>&1; then
    echo "GitHub Copilot CLI extension is not installed (missing 'gh copilot')." >&2
    return 1
  fi

  load_env
  require_any_env GH_TOKEN GITHUB_TOKEN

  build_session_prompt

  local prompt
  prompt="$(head -c 8000 "$HOME/SESSION_PROMPT.md" || true)"
  cd "$HOME/challenges" 2>/dev/null || cd "$HOME"
  nohup gh copilot suggest -t shell "$prompt" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}}

main() {{
  if agent_running; then
    exit 0
  fi

  case "$TARGET" in
    codex) start_codex ;;
    gemini) start_gemini ;;
    mistral) start_mistral ;;
    copilot) start_copilot ;;
    *) echo "Unknown TARGET: $TARGET" >&2; exit 1 ;;
  esac
  echo "Agent launched ($TARGET). Logs: $LOG_FILE"
}}

main "$@"
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
            logger.info("Agent startup output: %s", self._redact_secrets(output.strip()))
            
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error_output = stderr.read().decode()
                self.last_error = self._redact_secrets(
                    error_output.strip() or output.strip() or "Agent start script failed"
                )
                if len(self.last_error) > 2000:
                    self.last_error = f"...{self.last_error[-2000:]}"
                logger.error("Failed to start agent: %s", self.last_error)
                return False
            
            logger.info("Agent started successfully")
            return True
            
        except Exception as e:
            if self.last_error is None:
                self.last_error = self._redact_secrets(str(e))
            logger.error("Error starting agent: %s", self._redact_secrets(str(e)))
            return False
        finally:
            if ssh_client:
                ssh_client.close()
