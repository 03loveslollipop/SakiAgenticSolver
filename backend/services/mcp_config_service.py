# MCP Configuration Service for setting up MCP servers on VMs

import json
import logging
from typing import List, Dict, Any
import paramiko
from io import StringIO

logger = logging.getLogger(__name__)


class MCPConfigService:
    """
    Configures and manages MCP (Model Context Protocol) servers for agent capabilities.
    Generates MCP server configurations and deploys them to VMs via SSH.
    """
    
    def __init__(self):
        """Initialize MCPConfigService."""
        pass
    
    def generate_writeup_mcp_config(self, mongo_connection_string: str) -> Dict[str, Any]:
        """
        Generate MCP server configuration for writeup retrieval.
        
        This MCP server allows the agent to search and retrieve segments from
        previous challenge writeups stored in MongoDB.
        
        Args:
            mongo_connection_string: MongoDB connection string with authentication
            
        Returns:
            Dictionary with MCP server configuration
        """
        config = {
            "command": "python",
            "args": ["-m", "mcp_servers.writeup_retrieval"],
            "env": {
                "MONGODB_URL": mongo_connection_string,
                "MONGODB_DATABASE": "ctf_platform",
                "MONGODB_COLLECTION": "writeups"
            },
            "disabled": False,
            "autoApprove": ["search_writeups", "get_writeup_segments"]
        }
        
        logger.info("Generated writeup retrieval MCP server configuration")
        return config
    
    def generate_documentation_mcp_config(self) -> Dict[str, Any]:
        """
        Generate MCP server configuration for documentation access.
        
        This MCP server provides access to tool documentation and usage examples.
        
        Returns:
            Dictionary with MCP server configuration
        """
        config = {
            "command": "uvx",
            "args": ["mcp-server-docs@latest"],
            "env": {
                "DOCS_PATH": "/usr/local/share/docs",
                "FASTMCP_LOG_LEVEL": "ERROR"
            },
            "disabled": False,
            "autoApprove": ["get_documentation", "search_docs"]
        }
        
        logger.info("Generated documentation MCP server configuration")
        return config
    
    def generate_web_search_mcp_config(self) -> Dict[str, Any]:
        """
        Generate MCP server configuration for web search capabilities.
        
        This MCP server allows the agent to search the internet for information,
        research vulnerabilities, and find relevant resources.
        
        Returns:
            Dictionary with MCP server configuration
        """
        config = {
            "command": "uvx",
            "args": ["mcp-server-brave-search@latest"],
            "env": {
                "BRAVE_API_KEY": "${BRAVE_API_KEY}",
                "FASTMCP_LOG_LEVEL": "ERROR"
            },
            "disabled": False,
            "autoApprove": ["brave_web_search", "brave_local_search"]
        }
        
        logger.info("Generated web search MCP server configuration")
        return config
    
    def generate_full_mcp_config(self, mongo_connection_string: str) -> Dict[str, Any]:
        """
        Generate complete MCP configuration with all servers.
        
        Args:
            mongo_connection_string: MongoDB connection string with authentication
            
        Returns:
            Complete mcp.json configuration dictionary
        """
        config = {
            "mcpServers": {
                "writeup-retrieval": self.generate_writeup_mcp_config(mongo_connection_string),
                "documentation": self.generate_documentation_mcp_config(),
                "web-search": self.generate_web_search_mcp_config()
            }
        }
        
        logger.info("Generated complete MCP configuration with all servers")
        return config
    
    async def write_mcp_config_to_vm(
        self,
        vm_ip: str,
        ssh_private_key: str,
        mongo_connection_string: str,
        ssh_username: str = "ctfuser",
        ssh_port: int = 22
    ) -> bool:
        """
        Write MCP configuration files to VM via SSH.
        
        Creates the .kiro/settings directory and writes mcp.json configuration file.
        
        Args:
            vm_ip: VM IP address
            ssh_private_key: SSH private key in PEM format
            mongo_connection_string: MongoDB connection string
            ssh_username: SSH username (default: ctfuser)
            ssh_port: SSH port (default: 22)
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            Exception: If SSH connection or file write fails
        """
        ssh_client = None
        try:
            # Create SSH client
            ssh_client = paramiko.SSHClient()
            ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Load private key
            private_key = paramiko.RSAKey.from_private_key(StringIO(ssh_private_key))
            
            # Connect to VM
            logger.info(f"Connecting to VM at {vm_ip}:{ssh_port}")
            ssh_client.connect(
                hostname=vm_ip,
                port=ssh_port,
                username=ssh_username,
                pkey=private_key,
                timeout=30
            )
            
            # Generate MCP configuration
            mcp_config = self.generate_full_mcp_config(mongo_connection_string)
            mcp_config_json = json.dumps(mcp_config, indent=2)
            
            # Create .kiro/settings directory
            logger.info("Creating .kiro/settings directory on VM")
            stdin, stdout, stderr = ssh_client.exec_command("mkdir -p ~/.kiro/settings")
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                error_output = stderr.read().decode()
                logger.error(f"Failed to create .kiro/settings directory: {error_output}")
                return False
            
            # Write mcp.json file
            logger.info("Writing mcp.json configuration to VM")
            sftp = ssh_client.open_sftp()
            try:
                with sftp.file("/home/ctfuser/.kiro/settings/mcp.json", "w") as f:
                    f.write(mcp_config_json)
                logger.info("Successfully wrote mcp.json to VM")
            finally:
                sftp.close()
            
            # Verify file was written
            stdin, stdout, stderr = ssh_client.exec_command("cat ~/.kiro/settings/mcp.json")
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                logger.error("Failed to verify mcp.json file")
                return False
            
            file_content = stdout.read().decode()
            if not file_content:
                logger.error("mcp.json file is empty")
                return False
            
            logger.info("MCP configuration successfully deployed to VM")
            return True
            
        except paramiko.AuthenticationException as e:
            logger.error(f"SSH authentication failed: {e}")
            raise Exception(f"SSH authentication failed: {e}")
        except paramiko.SSHException as e:
            logger.error(f"SSH connection error: {e}")
            raise Exception(f"SSH connection error: {e}")
        except Exception as e:
            logger.error(f"Error writing MCP config to VM: {e}")
            raise
        finally:
            if ssh_client:
                ssh_client.close()
                logger.info("SSH connection closed")
