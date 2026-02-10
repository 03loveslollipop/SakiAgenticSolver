# Azure VM Manager Service

## Overview

The `AzureVMManager` service manages the complete lifecycle of Azure Virtual Machines for the CTF Challenge Automation Platform. It handles VM creation, deletion, status monitoring, and IP address retrieval using the Azure SDK for Python.

## Features

### VM Creation
- Creates complete Azure infrastructure:
  - Resource groups
  - Virtual networks and subnets
  - Network security groups (with SSH access)
  - Public IP addresses
  - Network interfaces
  - Virtual machines (Ubuntu 22.04 LTS)
- Configures SSH key-based authentication
- Supports multiple VM sizes (small, medium, large)

### VM Deletion
- Comprehensive cleanup of all associated resources:
  - Virtual machine
  - Network interface
  - Public IP address
  - Subnet
  - Virtual network
  - Network security group
- Graceful handling of partial failures

### Status Monitoring
- Retrieves current VM power state
- Handles non-existent VMs appropriately

### IP Address Retrieval
- Gets public IP address for SSH connections
- Validates IP assignment

## Usage

```python
from services.azure_vm_manager import AzureVMManager
from azure.identity import DefaultAzureCredential

# Initialize manager
credential = DefaultAzureCredential()
vm_manager = AzureVMManager(
    subscription_id="your-subscription-id",
    credential=credential
)

# Create a VM
vm_info = await vm_manager.create_vm(
    session_id="session-123",
    vm_size="Standard_B2s",
    ssh_public_key="ssh-rsa AAAAB3...",
    resource_group="ctf-rg-001"
)

print(f"VM created: {vm_info.vm_name}")
print(f"Public IP: {vm_info.public_ip}")

# Get VM status
status = await vm_manager.get_vm_status(
    session_id="session-123",
    resource_group="ctf-rg-001"
)

# Get VM IP
ip = await vm_manager.get_vm_ip(
    session_id="session-123",
    resource_group="ctf-rg-001"
)

# Delete VM and all resources
success = await vm_manager.delete_vm(
    session_id="session-123",
    resource_group="ctf-rg-001"
)
```

## Configuration

### Environment Variables

- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID (required)
- `AZURE_LOCATION`: Azure region for resources (default: "eastus")

### Azure Authentication

The service uses `DefaultAzureCredential` which supports multiple authentication methods:
- Environment variables
- Managed identity
- Azure CLI
- Visual Studio Code
- Azure PowerShell

## Error Handling

The service provides comprehensive error handling:

- **AzureError**: Raised for Azure SDK errors
- **ValueError**: Raised for invalid parameters or missing resources
- Detailed logging for all operations
- Graceful degradation for partial deletion failures

## Testing

Comprehensive unit tests are provided in `test_azure_vm_manager.py`:

- VM creation with mocked Azure SDK
- VM deletion with cleanup verification
- Status and IP retrieval
- Error handling scenarios
- Partial failure handling

Run tests:
```bash
pytest backend/test_azure_vm_manager.py -v
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **1.1**: VM creation with specified configuration
- **1.2**: Small VM size (2 cores, 2GB RAM, 30GB disk)
- **1.3**: Medium VM size (2 cores, 4GB RAM, 30GB disk)
- **1.4**: Large VM size (2 cores, 8GB RAM, 30GB disk)
- **5.9**: Azure authentication and resource management
- **9.2**: VM deletion with resource cleanup

## Architecture

The service follows a clean architecture pattern:

1. **Initialization**: Sets up Azure SDK clients
2. **Resource Creation**: Creates resources in proper order with dependencies
3. **Resource Deletion**: Deletes resources in reverse order
4. **Error Handling**: Comprehensive logging and exception handling
5. **Async Support**: All methods are async for non-blocking operations

## Future Enhancements

Potential improvements:

- VM size validation before creation
- Resource tagging for better organization
- Cost estimation before creation
- VM snapshot support
- Custom VM images
- Multiple network interface support
