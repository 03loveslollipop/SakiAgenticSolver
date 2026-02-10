# Unit tests for AzureVMManager

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from services.azure_vm_manager import AzureVMManager, VMInfo
from azure.core.exceptions import AzureError
import os


@pytest.fixture
def mock_credential():
    """Create a mock Azure credential"""
    return Mock()


@pytest.fixture
def mock_azure_clients():
    """Create mock Azure SDK clients"""
    with patch('services.azure_vm_manager.ComputeManagementClient') as mock_compute, \
         patch('services.azure_vm_manager.NetworkManagementClient') as mock_network, \
         patch('services.azure_vm_manager.ResourceManagementClient') as mock_resource:
        
        yield {
            'compute': mock_compute,
            'network': mock_network,
            'resource': mock_resource
        }


@pytest.fixture
def vm_manager(mock_credential, mock_azure_clients):
    """Create AzureVMManager instance with mocked clients"""
    with patch.dict(os.environ, {'AZURE_SUBSCRIPTION_ID': 'test-subscription-id'}):
        manager = AzureVMManager(credential=mock_credential)
        return manager


def test_init_with_subscription_id(mock_credential):
    """Test initialization with explicit subscription ID"""
    manager = AzureVMManager(
        subscription_id='test-sub-123',
        credential=mock_credential
    )
    assert manager.subscription_id == 'test-sub-123'


def test_init_without_subscription_id():
    """Test initialization fails without subscription ID"""
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="Azure subscription ID must be provided"):
            AzureVMManager()


def test_init_with_env_subscription_id(mock_credential):
    """Test initialization with subscription ID from environment"""
    with patch.dict(os.environ, {'AZURE_SUBSCRIPTION_ID': 'env-sub-456'}):
        manager = AzureVMManager(credential=mock_credential)
        assert manager.subscription_id == 'env-sub-456'


@pytest.mark.asyncio
async def test_create_vm_success(vm_manager):
    """Test successful VM creation"""
    # Mock the Azure SDK responses
    mock_vm = Mock()
    mock_vm.id = 'vm-id-123'
    
    mock_public_ip = Mock()
    mock_public_ip.ip_address = '20.30.40.50'
    
    mock_nsg = Mock()
    mock_nsg.id = 'nsg-id-123'
    
    mock_vnet = Mock()
    mock_vnet.id = 'vnet-id-123'
    
    mock_subnet = Mock()
    mock_subnet.id = 'subnet-id-123'
    
    mock_nic = Mock()
    mock_nic.id = 'nic-id-123'
    
    # Setup mock pollers
    mock_nsg_poller = Mock()
    mock_nsg_poller.result.return_value = mock_nsg
    
    mock_vnet_poller = Mock()
    mock_vnet_poller.result.return_value = mock_vnet
    
    mock_subnet_poller = Mock()
    mock_subnet_poller.result.return_value = mock_subnet
    
    mock_ip_poller = Mock()
    mock_ip_poller.result.return_value = mock_public_ip
    
    mock_nic_poller = Mock()
    mock_nic_poller.result.return_value = mock_nic
    
    mock_vm_poller = Mock()
    mock_vm_poller.result.return_value = mock_vm
    
    # Configure mocks
    vm_manager.network_client.network_security_groups.begin_create_or_update.return_value = mock_nsg_poller
    vm_manager.network_client.virtual_networks.begin_create_or_update.return_value = mock_vnet_poller
    vm_manager.network_client.subnets.begin_create_or_update.return_value = mock_subnet_poller
    vm_manager.network_client.public_ip_addresses.begin_create_or_update.return_value = mock_ip_poller
    vm_manager.network_client.network_interfaces.begin_create_or_update.return_value = mock_nic_poller
    vm_manager.compute_client.virtual_machines.begin_create_or_update.return_value = mock_vm_poller
    vm_manager.network_client.public_ip_addresses.get.return_value = mock_public_ip
    
    # Call create_vm
    result = await vm_manager.create_vm(
        session_id='test-session-123',
        vm_size='Standard_B2s',
        ssh_public_key='ssh-rsa AAAAB3NzaC1yc2E...',
        resource_group='test-rg'
    )
    
    # Verify result
    assert isinstance(result, VMInfo)
    assert result.vm_name == 'ctf-vm-test-ses'
    assert result.public_ip == '20.30.40.50'
    assert result.status == 'running'
    
    # Verify resource group was created
    vm_manager.resource_client.resource_groups.create_or_update.assert_called_once()


@pytest.mark.asyncio
async def test_create_vm_azure_error(vm_manager):
    """Test VM creation with Azure error"""
    # Mock Azure error
    vm_manager.resource_client.resource_groups.create_or_update.side_effect = AzureError("Azure service error")
    
    with pytest.raises(AzureError):
        await vm_manager.create_vm(
            session_id='test-session-456',
            vm_size='Standard_B2s',
            ssh_public_key='ssh-rsa AAAAB3NzaC1yc2E...',
            resource_group='test-rg'
        )


@pytest.mark.asyncio
async def test_delete_vm_success(vm_manager):
    """Test successful VM deletion"""
    # Mock the deletion pollers
    mock_vm_poller = Mock()
    mock_vm_poller.result.return_value = None
    
    mock_nic_poller = Mock()
    mock_nic_poller.result.return_value = None
    
    mock_ip_poller = Mock()
    mock_ip_poller.result.return_value = None
    
    mock_subnet_poller = Mock()
    mock_subnet_poller.result.return_value = None
    
    mock_vnet_poller = Mock()
    mock_vnet_poller.result.return_value = None
    
    mock_nsg_poller = Mock()
    mock_nsg_poller.result.return_value = None
    
    # Configure mocks
    vm_manager.compute_client.virtual_machines.begin_delete.return_value = mock_vm_poller
    vm_manager.network_client.network_interfaces.begin_delete.return_value = mock_nic_poller
    vm_manager.network_client.public_ip_addresses.begin_delete.return_value = mock_ip_poller
    vm_manager.network_client.subnets.begin_delete.return_value = mock_subnet_poller
    vm_manager.network_client.virtual_networks.begin_delete.return_value = mock_vnet_poller
    vm_manager.network_client.network_security_groups.begin_delete.return_value = mock_nsg_poller
    
    # Call delete_vm
    result = await vm_manager.delete_vm(
        session_id='test-session-789',
        resource_group='test-rg'
    )
    
    # Verify result
    assert result is True
    
    # Verify all resources were deleted
    vm_manager.compute_client.virtual_machines.begin_delete.assert_called_once()
    vm_manager.network_client.network_interfaces.begin_delete.assert_called_once()
    vm_manager.network_client.public_ip_addresses.begin_delete.assert_called_once()


@pytest.mark.asyncio
async def test_delete_vm_partial_failure(vm_manager):
    """Test VM deletion with partial failures (should continue)"""
    # Mock some deletions to fail
    vm_manager.compute_client.virtual_machines.begin_delete.side_effect = Exception("VM not found")
    
    mock_nic_poller = Mock()
    mock_nic_poller.result.return_value = None
    vm_manager.network_client.network_interfaces.begin_delete.return_value = mock_nic_poller
    
    mock_ip_poller = Mock()
    mock_ip_poller.result.return_value = None
    vm_manager.network_client.public_ip_addresses.begin_delete.return_value = mock_ip_poller
    
    mock_subnet_poller = Mock()
    mock_subnet_poller.result.return_value = None
    vm_manager.network_client.subnets.begin_delete.return_value = mock_subnet_poller
    
    mock_vnet_poller = Mock()
    mock_vnet_poller.result.return_value = None
    vm_manager.network_client.virtual_networks.begin_delete.return_value = mock_vnet_poller
    
    mock_nsg_poller = Mock()
    mock_nsg_poller.result.return_value = None
    vm_manager.network_client.network_security_groups.begin_delete.return_value = mock_nsg_poller
    
    # Call delete_vm - should not raise exception
    result = await vm_manager.delete_vm(
        session_id='test-session-abc',
        resource_group='test-rg'
    )
    
    # Should still return True even with partial failures
    assert result is True


@pytest.mark.asyncio
async def test_get_vm_status_success(vm_manager):
    """Test getting VM status"""
    # Mock instance view
    mock_status = Mock()
    mock_status.code = 'PowerState/running'
    
    mock_instance_view = Mock()
    mock_instance_view.statuses = [mock_status]
    
    vm_manager.compute_client.virtual_machines.instance_view.return_value = mock_instance_view
    
    # Call get_vm_status
    status = await vm_manager.get_vm_status(
        session_id='test-session-def',
        resource_group='test-rg'
    )
    
    assert status == 'running'


@pytest.mark.asyncio
async def test_get_vm_status_not_found(vm_manager):
    """Test getting status for non-existent VM"""
    vm_manager.compute_client.virtual_machines.instance_view.side_effect = AzureError("ResourceNotFound")
    
    with pytest.raises(ValueError, match="VM not found"):
        await vm_manager.get_vm_status(
            session_id='test-session-ghi',
            resource_group='test-rg'
        )


@pytest.mark.asyncio
async def test_get_vm_ip_success(vm_manager):
    """Test getting VM public IP"""
    mock_public_ip = Mock()
    mock_public_ip.ip_address = '40.50.60.70'
    
    vm_manager.network_client.public_ip_addresses.get.return_value = mock_public_ip
    
    # Call get_vm_ip
    ip = await vm_manager.get_vm_ip(
        session_id='test-session-jkl',
        resource_group='test-rg'
    )
    
    assert ip == '40.50.60.70'


@pytest.mark.asyncio
async def test_get_vm_ip_not_assigned(vm_manager):
    """Test getting IP when not assigned"""
    mock_public_ip = Mock()
    mock_public_ip.ip_address = None
    
    vm_manager.network_client.public_ip_addresses.get.return_value = mock_public_ip
    
    with pytest.raises(ValueError, match="Public IP not assigned"):
        await vm_manager.get_vm_ip(
            session_id='test-session-mno',
            resource_group='test-rg'
        )


@pytest.mark.asyncio
async def test_get_vm_ip_not_found(vm_manager):
    """Test getting IP for non-existent resource"""
    vm_manager.network_client.public_ip_addresses.get.side_effect = AzureError("ResourceNotFound")
    
    with pytest.raises(ValueError, match="Public IP not found"):
        await vm_manager.get_vm_ip(
            session_id='test-session-pqr',
            resource_group='test-rg'
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
