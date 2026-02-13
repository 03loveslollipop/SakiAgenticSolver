# Azure VM Manager Service for managing Azure VM lifecycle

from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.resource import ResourceManagementClient
from azure.core.exceptions import AzureError
from typing import Optional
import copy
import logging
import os

logger = logging.getLogger(__name__)

SMALL_VM_SIZE_CANDIDATES = (
    "Standard_B2as_v2",
    "Standard_B2ats_v2",
    "Standard_B2ps_v2",
    "Standard_B2pls_v2",
    "Standard_B2als_v2",
)
MEDIUM_VM_SIZE_CANDIDATES = (
    "Standard_B4as_v2",
    "Standard_B4ps_v2",
    "Standard_B4pls_v2",
    "Standard_B4als_v2",
)
LARGE_VM_SIZE_CANDIDATES = (
    "Standard_B8as_v2",
    "Standard_B8ps_v2",
    "Standard_B8pls_v2",
    "Standard_B8als_v2",
)


class VMInfo:
    """Information about a created VM"""
    def __init__(self, vm_id: str, vm_name: str, public_ip: str, status: str):
        self.vm_id = vm_id
        self.vm_name = vm_name
        self.public_ip = public_ip
        self.status = status


class AzureVMManager:
    """
    Manages Azure VM lifecycle using Azure SDK.
    Handles VM creation, deletion, and status queries.
    """
    
    def __init__(self, subscription_id: Optional[str] = None, credential=None):
        """
        Initialize AzureVMManager with Azure credentials.
        
        Args:
            subscription_id: Azure subscription ID (defaults to env var AZURE_SUBSCRIPTION_ID)
            credential: Azure credential object (defaults to DefaultAzureCredential)
        """
        self.subscription_id = subscription_id or os.getenv("AZURE_SUBSCRIPTION_ID")
        if not self.subscription_id:
            raise ValueError("Azure subscription ID must be provided or set in AZURE_SUBSCRIPTION_ID environment variable")
        
        self.credential = credential or DefaultAzureCredential()
        
        # Initialize Azure SDK clients
        self.compute_client = ComputeManagementClient(self.credential, self.subscription_id)
        self.network_client = NetworkManagementClient(self.credential, self.subscription_id)
        self.resource_client = ResourceManagementClient(self.credential, self.subscription_id)
        
        # Default location for resources
        self.location = os.getenv("AZURE_LOCATION", "eastus")
        
        logger.info(f"Initialized AzureVMManager for subscription {self.subscription_id}")

    @staticmethod
    def _is_sku_unavailable_error(error: Exception) -> bool:
        """Detect SKU/capacity unavailability errors that should trigger fallback."""
        error_text = str(error).lower()
        error_code = ""
        azure_error_payload = getattr(error, "error", None)
        if azure_error_payload is not None:
            error_code = str(getattr(azure_error_payload, "code", "")).lower()

        if error_code in {"skunotavailable", "operationnotallowed"}:
            return True

        return any(
            token in error_text
            for token in (
                "skunotavailable",
                "capacity restrictions",
                "not available in location",
                "notavailableforsubscription",
            )
        )

    def _resolve_vm_size_candidates(self, preferred_vm_size: str) -> list[str]:
        """Build a de-duplicated candidate list for VM provisioning retries."""
        preferred = preferred_vm_size.strip()
        lower = preferred.lower()
        if lower.startswith("standard_b2"):
            family_candidates = SMALL_VM_SIZE_CANDIDATES
        elif lower.startswith("standard_b4"):
            family_candidates = MEDIUM_VM_SIZE_CANDIDATES
        elif lower.startswith("standard_b8"):
            family_candidates = LARGE_VM_SIZE_CANDIDATES
        else:
            family_candidates = ()

        candidates: list[str] = [preferred]
        for size in family_candidates:
            if size not in candidates:
                candidates.append(size)

        env_fallbacks = os.getenv("AZURE_VM_SIZE_FALLBACKS", "")
        for raw_candidate in env_fallbacks.split(","):
            candidate = raw_candidate.strip()
            if candidate and candidate not in candidates:
                candidates.append(candidate)

        return candidates
    
    async def create_vm(
        self,
        session_id: str,
        vm_size: str,
        ssh_public_key: str,
        resource_group: str
    ) -> VMInfo:
        """
        Create a new Azure VM with specified configuration.
        
        Creates all necessary resources:
        - Resource group (if doesn't exist)
        - Virtual network and subnet
        - Public IP address
        - Network interface
        - Virtual machine with Ubuntu 22.04 LTS
        
        Args:
            session_id: Unique session identifier (used for VM naming)
            vm_size: Azure VM size (e.g., 'Standard_B2as_v2')
            ssh_public_key: SSH public key for VM access
            resource_group: Name of the resource group
            
        Returns:
            VMInfo object with VM details
            
        Raises:
            AzureError: If VM creation fails
            ValueError: If parameters are invalid
        """
        try:
            vm_name = f"ctf-vm-{session_id[:8]}"
            vnet_name = f"ctf-vnet-{session_id[:8]}"
            subnet_name = f"ctf-subnet-{session_id[:8]}"
            public_ip_name = f"ctf-ip-{session_id[:8]}"
            nic_name = f"ctf-nic-{session_id[:8]}"
            nsg_name = f"ctf-nsg-{session_id[:8]}"
            
            logger.info(f"Creating VM {vm_name} in resource group {resource_group}")
            
            # Step 1: Create or verify resource group exists
            logger.info(f"Creating resource group {resource_group}")
            self.resource_client.resource_groups.create_or_update(
                resource_group,
                {"location": self.location}
            )
            
            # Step 2: Create network security group with SSH rule
            logger.info(f"Creating network security group {nsg_name}")
            nsg_params = {
                "location": self.location,
                "security_rules": [
                    {
                        "name": "AllowSSH",
                        "protocol": "Tcp",
                        "source_port_range": "*",
                        "destination_port_range": "22",
                        "source_address_prefix": "*",
                        "destination_address_prefix": "*",
                        "access": "Allow",
                        "priority": 100,
                        "direction": "Inbound"
                    }
                ]
            }
            nsg_poller = self.network_client.network_security_groups.begin_create_or_update(
                resource_group,
                nsg_name,
                nsg_params
            )
            nsg = nsg_poller.result()
            
            # Step 3: Create virtual network
            logger.info(f"Creating virtual network {vnet_name}")
            vnet_params = {
                "location": self.location,
                "address_space": {
                    "address_prefixes": ["10.0.0.0/16"]
                }
            }
            vnet_poller = self.network_client.virtual_networks.begin_create_or_update(
                resource_group,
                vnet_name,
                vnet_params
            )
            vnet = vnet_poller.result()
            
            # Step 4: Create subnet
            logger.info(f"Creating subnet {subnet_name}")
            subnet_params = {
                "address_prefix": "10.0.0.0/24",
                "network_security_group": {"id": nsg.id}
            }
            subnet_poller = self.network_client.subnets.begin_create_or_update(
                resource_group,
                vnet_name,
                subnet_name,
                subnet_params
            )
            subnet = subnet_poller.result()
            
            # Step 5: Create public IP address
            logger.info(f"Creating public IP {public_ip_name}")
            public_ip_params = {
                "location": self.location,
                "sku": {"name": "Standard"},
                "public_ip_allocation_method": "Static",
                "public_ip_address_version": "IPv4"
            }
            public_ip_poller = self.network_client.public_ip_addresses.begin_create_or_update(
                resource_group,
                public_ip_name,
                public_ip_params
            )
            public_ip = public_ip_poller.result()
            
            # Step 6: Create network interface
            logger.info(f"Creating network interface {nic_name}")
            nic_params = {
                "location": self.location,
                "ip_configurations": [
                    {
                        "name": "ipconfig1",
                        "subnet": {"id": subnet.id},
                        "public_ip_address": {"id": public_ip.id}
                    }
                ]
            }
            nic_poller = self.network_client.network_interfaces.begin_create_or_update(
                resource_group,
                nic_name,
                nic_params
            )
            nic = nic_poller.result()
            
            # Step 7: Create virtual machine
            vm_size_candidates = self._resolve_vm_size_candidates(vm_size)
            logger.info(
                "Creating virtual machine %s (size candidates for %s: %s)",
                vm_name,
                self.location,
                vm_size_candidates,
            )
            vm_params = {
                "location": self.location,
                "hardware_profile": {
                    "vm_size": vm_size
                },
                "storage_profile": {
                    "image_reference": {
                        "publisher": "Canonical",
                        "offer": "0001-com-ubuntu-server-jammy",
                        "sku": "22_04-lts-gen2",
                        "version": "latest"
                    },
                    "os_disk": {
                        "create_option": "FromImage",
                        "managed_disk": {
                            "storage_account_type": "Standard_LRS"
                        },
                        "disk_size_gb": 30
                    }
                },
                "os_profile": {
                    "computer_name": vm_name,
                    "admin_username": "ctfuser",
                    "linux_configuration": {
                        "disable_password_authentication": True,
                        "ssh": {
                            "public_keys": [
                                {
                                    "path": "/home/ctfuser/.ssh/authorized_keys",
                                    "key_data": ssh_public_key
                                }
                            ]
                        }
                    }
                },
                "network_profile": {
                    "network_interfaces": [
                        {
                            "id": nic.id,
                            "properties": {
                                "primary": True
                            }
                        }
                    ]
                }
            }

            vm = None
            selected_vm_size = None
            last_azure_error: AzureError | None = None

            for index, candidate_vm_size in enumerate(vm_size_candidates):
                attempt_vm_params = copy.deepcopy(vm_params)
                attempt_vm_params["hardware_profile"]["vm_size"] = candidate_vm_size
                try:
                    vm_poller = self.compute_client.virtual_machines.begin_create_or_update(
                        resource_group,
                        vm_name,
                        attempt_vm_params
                    )
                    vm = vm_poller.result()
                    selected_vm_size = candidate_vm_size
                    break
                except AzureError as azure_error:
                    last_azure_error = azure_error
                    should_retry = (
                        index < len(vm_size_candidates) - 1
                        and self._is_sku_unavailable_error(azure_error)
                    )
                    if should_retry:
                        logger.warning(
                            "VM size %s unavailable in %s for session %s. Retrying with %s",
                            candidate_vm_size,
                            self.location,
                            session_id,
                            vm_size_candidates[index + 1],
                        )
                        continue
                    raise

            if vm is None:
                if last_azure_error is not None:
                    raise last_azure_error
                raise RuntimeError(f"Failed to create VM {vm_name} with all candidate sizes")
            
            logger.info(
                "Successfully created VM %s with ID %s using size %s",
                vm_name,
                vm.id,
                selected_vm_size,
            )
            
            # Get the public IP address
            public_ip_address = self.network_client.public_ip_addresses.get(
                resource_group,
                public_ip_name
            ).ip_address
            
            return VMInfo(
                vm_id=vm.id,
                vm_name=vm_name,
                public_ip=public_ip_address,
                status="running"
            )
            
        except AzureError as e:
            logger.error(f"Azure error creating VM for session {session_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating VM for session {session_id}: {e}")
            raise
    
    async def delete_vm(self, session_id: str, resource_group: str) -> bool:
        """
        Delete an Azure VM and all associated resources.
        
        Deletes in order:
        - Virtual machine
        - Network interface
        - Public IP address
        - Network security group
        - Subnet
        - Virtual network
        - (Resource group is preserved for potential reuse)
        
        Args:
            session_id: Unique session identifier
            resource_group: Name of the resource group
            
        Returns:
            True if deletion successful, False otherwise
            
        Raises:
            AzureError: If deletion fails
        """
        try:
            vm_name = f"ctf-vm-{session_id[:8]}"
            vnet_name = f"ctf-vnet-{session_id[:8]}"
            subnet_name = f"ctf-subnet-{session_id[:8]}"
            public_ip_name = f"ctf-ip-{session_id[:8]}"
            nic_name = f"ctf-nic-{session_id[:8]}"
            nsg_name = f"ctf-nsg-{session_id[:8]}"
            
            logger.info(f"Deleting VM {vm_name} and associated resources")
            
            # Delete VM
            try:
                logger.info(f"Deleting virtual machine {vm_name}")
                vm_poller = self.compute_client.virtual_machines.begin_delete(
                    resource_group,
                    vm_name
                )
                vm_poller.result()
            except Exception as e:
                logger.warning(f"Error deleting VM {vm_name}: {e}")
            
            # Delete network interface
            try:
                logger.info(f"Deleting network interface {nic_name}")
                nic_poller = self.network_client.network_interfaces.begin_delete(
                    resource_group,
                    nic_name
                )
                nic_poller.result()
            except Exception as e:
                logger.warning(f"Error deleting NIC {nic_name}: {e}")
            
            # Delete public IP
            try:
                logger.info(f"Deleting public IP {public_ip_name}")
                ip_poller = self.network_client.public_ip_addresses.begin_delete(
                    resource_group,
                    public_ip_name
                )
                ip_poller.result()
            except Exception as e:
                logger.warning(f"Error deleting public IP {public_ip_name}: {e}")
            
            # Delete subnet
            try:
                logger.info(f"Deleting subnet {subnet_name}")
                subnet_poller = self.network_client.subnets.begin_delete(
                    resource_group,
                    vnet_name,
                    subnet_name
                )
                subnet_poller.result()
            except Exception as e:
                logger.warning(f"Error deleting subnet {subnet_name}: {e}")
            
            # Delete virtual network
            try:
                logger.info(f"Deleting virtual network {vnet_name}")
                vnet_poller = self.network_client.virtual_networks.begin_delete(
                    resource_group,
                    vnet_name
                )
                vnet_poller.result()
            except Exception as e:
                logger.warning(f"Error deleting vnet {vnet_name}: {e}")
            
            # Delete network security group
            try:
                logger.info(f"Deleting network security group {nsg_name}")
                nsg_poller = self.network_client.network_security_groups.begin_delete(
                    resource_group,
                    nsg_name
                )
                nsg_poller.result()
            except Exception as e:
                logger.warning(f"Error deleting NSG {nsg_name}: {e}")
            
            logger.info(f"Successfully deleted VM {vm_name} and associated resources")
            return True
            
        except AzureError as e:
            logger.error(f"Azure error deleting VM for session {session_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error deleting VM for session {session_id}: {e}")
            raise
    
    async def get_vm_status(self, session_id: str, resource_group: str) -> str:
        """
        Get current VM status.
        
        Args:
            session_id: Unique session identifier
            resource_group: Name of the resource group
            
        Returns:
            VM status string (e.g., 'running', 'stopped', 'deallocated')
            
        Raises:
            AzureError: If status query fails
            ValueError: If VM not found
        """
        try:
            vm_name = f"ctf-vm-{session_id[:8]}"
            
            # Get instance view for power state
            instance_view = self.compute_client.virtual_machines.instance_view(
                resource_group,
                vm_name
            )
            
            # Extract power state from statuses
            for status in instance_view.statuses:
                if status.code.startswith('PowerState/'):
                    power_state = status.code.split('/')[-1]
                    logger.info(f"VM {vm_name} status: {power_state}")
                    return power_state
            
            # If no power state found, return unknown
            logger.warning(f"No power state found for VM {vm_name}")
            return "unknown"
            
        except AzureError as e:
            if "ResourceNotFound" in str(e):
                raise ValueError(f"VM not found for session {session_id}")
            logger.error(f"Azure error getting VM status for session {session_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting VM status for session {session_id}: {e}")
            raise
    
    async def get_vm_ip(self, session_id: str, resource_group: str) -> str:
        """
        Get public IP address of VM.
        
        Args:
            session_id: Unique session identifier
            resource_group: Name of the resource group
            
        Returns:
            Public IP address as string
            
        Raises:
            AzureError: If IP query fails
            ValueError: If VM or IP not found
        """
        try:
            public_ip_name = f"ctf-ip-{session_id[:8]}"
            
            # Get public IP address
            public_ip = self.network_client.public_ip_addresses.get(
                resource_group,
                public_ip_name
            )
            
            if not public_ip.ip_address:
                raise ValueError(f"Public IP not assigned for session {session_id}")
            
            logger.info(f"Retrieved IP {public_ip.ip_address} for session {session_id}")
            return public_ip.ip_address
            
        except AzureError as e:
            if "ResourceNotFound" in str(e):
                raise ValueError(f"Public IP not found for session {session_id}")
            logger.error(f"Azure error getting VM IP for session {session_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting VM IP for session {session_id}: {e}")
            raise
