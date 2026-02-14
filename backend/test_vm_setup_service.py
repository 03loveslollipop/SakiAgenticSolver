# Unit tests for VMSetupService

import pytest
from unittest.mock import Mock, MagicMock, patch, call
from services.vm_setup_service import VMSetupService
import paramiko


@pytest.fixture
def vm_setup_service():
    """Create VMSetupService instance for testing."""
    return VMSetupService()


@pytest.fixture
def mock_ssh_client():
    """Create mock SSH client."""
    client = MagicMock(spec=paramiko.SSHClient)
    
    # Mock exec_command to return successful execution
    mock_stdin = MagicMock()
    mock_stdout = MagicMock()
    mock_stderr = MagicMock()
    mock_stdout.channel.recv_exit_status.return_value = 0
    mock_stdout.read.return_value = b"Success"
    mock_stderr.read.return_value = b""
    mock_stdout.__iter__ = Mock(return_value=iter([]))
    
    client.exec_command.return_value = (mock_stdin, mock_stdout, mock_stderr)
    
    # Mock SFTP
    mock_sftp = MagicMock()
    mock_file = MagicMock()
    mock_sftp.file.return_value.__enter__ = Mock(return_value=mock_file)
    mock_sftp.file.return_value.__exit__ = Mock(return_value=False)
    client.open_sftp.return_value = mock_sftp
    
    return client


@pytest.fixture
def mock_ssh_key():
    """Mock SSH private key."""
    return """-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF3bqGvZXLLqJqKqJqKqJqKqJqKqJ
-----END RSA PRIVATE KEY-----"""


class TestVMSetupService:
    """Test suite for VMSetupService."""
    
    @pytest.mark.asyncio
    async def test_execute_setup_script_success(self, vm_setup_service, mock_ssh_client, mock_ssh_key):
        """Test successful setup script execution."""
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.execute_setup_script(
                vm_ip="192.168.1.100",
                ssh_private_key=mock_ssh_key
            )
            
            assert result is True
            mock_ssh_client.open_sftp.assert_called_once()
            mock_ssh_client.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_execute_setup_script_failure(self, vm_setup_service, mock_ssh_client, mock_ssh_key):
        """Test setup script execution failure."""
        # Mock failed execution
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 1
        mock_stdout.__iter__ = Mock(return_value=iter([]))
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b"Installation failed"
        
        mock_ssh_client.exec_command.return_value = (MagicMock(), mock_stdout, mock_stderr)
        
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.execute_setup_script(
                vm_ip="192.168.1.100",
                ssh_private_key=mock_ssh_key
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_install_agent_success(self, vm_setup_service, mock_ssh_client, mock_ssh_key):
        """Test successful agent installation."""
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.install_agent(
                vm_ip="192.168.1.100",
                agent_type="codex",
                agent_model="gpt-4",
                ssh_private_key=mock_ssh_key
            )
            
            assert result is True
            # Verify multiple commands were executed
            assert mock_ssh_client.exec_command.call_count >= 3
            mock_ssh_client.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_install_agent_failure(self, vm_setup_service, mock_ssh_client, mock_ssh_key):
        """Test agent installation failure."""
        # Mock failed execution on first command
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 1
        mock_stdout.__iter__ = Mock(return_value=iter([]))
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b"Installation failed"
        
        mock_ssh_client.exec_command.return_value = (MagicMock(), mock_stdout, mock_stderr)
        
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.install_agent(
                vm_ip="192.168.1.100",
                agent_type="codex",
                agent_model="gpt-4",
                ssh_private_key=mock_ssh_key
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_download_challenge_files_success(self, vm_setup_service, mock_ssh_client, mock_ssh_key):
        """Test successful challenge file downloads."""
        challenge_urls = [
            "https://example.com/challenge1.bin",
            "https://example.com/challenge2.txt"
        ]
        
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.download_challenge_files(
                vm_ip="192.168.1.100",
                challenge_urls=challenge_urls,
                ssh_private_key=mock_ssh_key
            )
            
            assert result is True
            # Verify mkdir and wget commands were executed
            assert mock_ssh_client.exec_command.call_count >= len(challenge_urls) + 1
            mock_ssh_client.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_download_challenge_files_partial_failure(self, vm_setup_service, mock_ssh_client, mock_ssh_key):
        """Test challenge file download with some failures."""
        challenge_urls = [
            "https://example.com/challenge1.bin",
            "https://example.com/challenge2.txt"
        ]
        
        # Mock first download success, second failure
        call_count = [0]
        
        def mock_exec_command(cmd):
            mock_stdout = MagicMock()
            mock_stderr = MagicMock()
            
            call_count[0] += 1
            if call_count[0] == 1:  # mkdir command
                mock_stdout.channel.recv_exit_status.return_value = 0
            elif call_count[0] == 2:  # first wget
                mock_stdout.channel.recv_exit_status.return_value = 0
            else:  # second wget fails
                mock_stdout.channel.recv_exit_status.return_value = 1
                mock_stderr.read.return_value = b"Download failed"
            
            return (MagicMock(), mock_stdout, mock_stderr)
        
        mock_ssh_client.exec_command.side_effect = mock_exec_command
        
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.download_challenge_files(
                vm_ip="192.168.1.100",
                challenge_urls=challenge_urls,
                ssh_private_key=mock_ssh_key
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_create_config_files_success(self, vm_setup_service, mock_ssh_client, mock_ssh_key):
        """Test successful configuration file creation."""
        instructions = "Solve this CTF challenge"
        
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.create_config_files(
                vm_ip="192.168.1.100",
                instructions=instructions,
                ssh_private_key=mock_ssh_key
            )
            
            assert result is True
            mock_ssh_client.open_sftp.assert_called_once()
            
            # Verify all 6 files were created
            mock_sftp = mock_ssh_client.open_sftp.return_value
            assert mock_sftp.file.call_count == 6
            
            # Verify file names
            file_calls = [call[0][0] for call in mock_sftp.file.call_args_list]
            assert "/home/ctfuser/instructions.md" in file_calls
            assert "/home/ctfuser/BASE_PROMPT.md" in file_calls
            assert "/home/ctfuser/AGENT.md" in file_calls
            assert "/home/ctfuser/TOOLS.md" in file_calls
            assert "/home/ctfuser/changelog.md" in file_calls
            assert "/home/ctfuser/discoveries.md" in file_calls
            
            mock_ssh_client.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_configure_mcp_servers_success(self, vm_setup_service, mock_ssh_key):
        """Test successful MCP server configuration."""
        # Create an async mock function
        async def mock_write_config(*args, **kwargs):
            return True
        
        with patch('services.mcp_config_service.MCPConfigService') as mock_mcp_service_class:
            mock_mcp_service = MagicMock()
            mock_mcp_service.write_mcp_config_to_vm = mock_write_config
            mock_mcp_service_class.return_value = mock_mcp_service
            
            result = await vm_setup_service.configure_mcp_servers(
                vm_ip="192.168.1.100",
                mongo_connection_string="mongodb://localhost:27017",
                ssh_private_key=mock_ssh_key
            )
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_start_agent_success(self, vm_setup_service, mock_ssh_client, mock_ssh_key, monkeypatch):
        """Test successful agent startup."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.start_agent(
                vm_ip="192.168.1.100",
                agent_type="codex",
                agent_model="gpt-4",
                ssh_private_key=mock_ssh_key
            )
            
            assert result is True
            assert mock_ssh_client.open_sftp.call_count >= 1
            # Verify startup script was executed
            assert mock_ssh_client.exec_command.call_count >= 2
            mock_ssh_client.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_start_agent_failure(self, vm_setup_service, mock_ssh_client, mock_ssh_key, monkeypatch):
        """Test agent startup failure."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
        # Mock failed execution
        mock_stdout = MagicMock()
        mock_stdout.channel.recv_exit_status.return_value = 1
        mock_stdout.read.return_value = b""
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b"Agent failed to start"
        
        mock_ssh_client.exec_command.return_value = (MagicMock(), mock_stdout, mock_stderr)
        
        with patch.object(vm_setup_service, '_create_ssh_client', return_value=mock_ssh_client):
            result = await vm_setup_service.start_agent(
                vm_ip="192.168.1.100",
                agent_type="codex",
                agent_model="gpt-4",
                ssh_private_key=mock_ssh_key
            )
            
            assert result is False
    
    def test_generate_base_prompt(self, vm_setup_service):
        """Test BASE_PROMPT.md generation meets all requirements."""
        base_prompt = vm_setup_service._generate_base_prompt()
        
        # Requirement 11.1: BASE_PROMPT.md is immutable
        assert "immutable" in base_prompt.lower() or "cannot be modified" in base_prompt.lower()
        
        # Requirement 11.2: Instructions for maintaining changelog.md
        assert "changelog.md" in base_prompt
        assert "timestamp" in base_prompt.lower()
        assert "command" in base_prompt.lower()
        
        # Requirement 11.3: Instructions for maintaining discoveries.md
        assert "discoveries.md" in base_prompt
        assert "findings" in base_prompt.lower() or "insights" in base_prompt.lower()
        
        # Requirement 11.4: Instructions for generating writeup.md
        assert "writeup.md" in base_prompt
        assert "challenge completion" in base_prompt.lower() or "solve the challenge" in base_prompt.lower()
        
        # Requirement 11.5: Changelog format with timestamped entries
        assert "[YYYY-MM-DD HH:MM:SS]" in base_prompt or "timestamp" in base_prompt.lower()
        
        # Requirement 11.6: Discoveries format with findings and insights
        assert "vulnerabilities" in base_prompt.lower() or "findings" in base_prompt.lower()
        assert "analysis" in base_prompt.lower() or "insights" in base_prompt.lower()
        
        # Requirement 12.7: Instructions for using MCP servers
        assert "MCP" in base_prompt
        assert "writeup" in base_prompt.lower() and "retrieval" in base_prompt.lower()
        assert "documentation" in base_prompt.lower()
        assert "web search" in base_prompt.lower() or "search" in base_prompt.lower()
        
        # Verify structure sections exist
        assert "Your Mission" in base_prompt or "Mission" in base_prompt
        assert "Documentation Requirements" in base_prompt
        assert "Available Resources" in base_prompt
        assert "Working Methodology" in base_prompt or "Methodology" in base_prompt
        
        # Verify writeup.md structure is specified
        assert "Challenge Overview" in base_prompt
        assert "Solution Steps" in base_prompt or "solution" in base_prompt.lower()
        assert "Flag" in base_prompt
        assert "Tools Used" in base_prompt
    
    def test_generate_agent_md(self, vm_setup_service):
        """Test AGENT.md generation."""
        agent_md = vm_setup_service._generate_agent_md()
        
        assert "Agent Configuration" in agent_md
        assert "modifiable" in agent_md.lower() or "edit" in agent_md.lower()
    
    def test_generate_tools_md(self, vm_setup_service):
        """Test TOOLS.md generation."""
        tools_md = vm_setup_service._generate_tools_md()
        
        assert "z3" in tools_md
        assert "ghidra" in tools_md
        assert "gdb" in tools_md
        assert "pwntools" in tools_md
        assert "MCP" in tools_md
        assert "writeup-retrieval" in tools_md

    def test_redact_secrets_hides_token_values(self, vm_setup_service, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "super-secret-token")
        monkeypatch.setenv("GEMINI_API_KEY", "another-secret")

        raw = "Using OPENAI_API_KEY=super-secret-token and GEMINI_API_KEY=another-secret"
        redacted = vm_setup_service._redact_secrets(raw)

        assert "super-secret-token" not in redacted
        assert "another-secret" not in redacted
    
    @pytest.mark.asyncio
    async def test_ssh_connection_retry(self, vm_setup_service, mock_ssh_key):
        """Test SSH connection retry logic."""
        mock_client = MagicMock(spec=paramiko.SSHClient)
        
        # Mock connection to fail twice then succeed
        call_count = [0]
        
        def mock_connect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] < 3:
                raise paramiko.SSHException("Connection failed")
        
        mock_client.connect.side_effect = mock_connect
        
        with patch('paramiko.SSHClient', return_value=mock_client):
            with patch('paramiko.RSAKey.from_private_key'):
                with patch('time.sleep'):  # Skip actual sleep
                    client = vm_setup_service._create_ssh_client(
                        vm_ip="192.168.1.100",
                        ssh_private_key=mock_ssh_key,
                        max_retries=3
                    )
                    
                    assert client is not None
                    assert call_count[0] == 3
    
    @pytest.mark.asyncio
    async def test_ssh_connection_max_retries_exceeded(self, vm_setup_service, mock_ssh_key):
        """Test SSH connection failure after max retries."""
        mock_client = MagicMock(spec=paramiko.SSHClient)
        mock_client.connect.side_effect = paramiko.SSHException("Connection failed")
        
        with patch('paramiko.SSHClient', return_value=mock_client):
            with patch('paramiko.RSAKey.from_private_key'):
                with patch('time.sleep'):  # Skip actual sleep
                    with pytest.raises(Exception, match="Failed to connect to VM via SSH"):
                        vm_setup_service._create_ssh_client(
                            vm_ip="192.168.1.100",
                            ssh_private_key=mock_ssh_key,
                            max_retries=3
                        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
