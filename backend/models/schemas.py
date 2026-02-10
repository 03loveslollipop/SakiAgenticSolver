# Pydantic models for API request/response schemas and data validation

from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, validator
import uuid


class User(BaseModel):
    """User model for authentication and authorization"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    email: str
    password_hash: str  # bcrypt hashed password
    role: Literal['admin', 'user'] = 'user'
    is_2fa_enabled: bool = False
    totp_secret: Optional[str] = None  # Encrypted at rest
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    created_by: Optional[str] = None  # User ID of admin who created this user
    
    model_config = {
        "populate_by_name": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if not v or '@' not in v:
            raise ValueError("Invalid email address format")
        return v.lower()


class VMConfig(BaseModel):
    """VM configuration model with size specifications"""
    vm_size: Literal['small', 'medium', 'large']
    azure_vm_size: str
    cpu_cores: int
    ram_gb: int
    disk_gb: int = 30
    
    @staticmethod
    def from_size(size: str) -> 'VMConfig':
        """Create VMConfig from size string"""
        configs = {
            'small': VMConfig(
                vm_size='small',
                azure_vm_size='Standard_B2s',
                cpu_cores=2,
                ram_gb=2,
                disk_gb=30
            ),
            'medium': VMConfig(
                vm_size='medium',
                azure_vm_size='Standard_B2ms',
                cpu_cores=2,
                ram_gb=4,
                disk_gb=30
            ),
            'large': VMConfig(
                vm_size='large',
                azure_vm_size='Standard_B2ls',
                cpu_cores=2,
                ram_gb=8,
                disk_gb=30
            )
        }
        if size not in configs:
            raise ValueError(f"Invalid VM size: {size}. Must be one of: small, medium, large")
        return configs[size]


class Session(BaseModel):
    """Session model representing a VM instance"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    vm_size: Literal['small', 'medium', 'large']
    agent_type: Literal['codex', 'copilot']
    agent_model: str
    challenge_urls: List[str]
    instructions: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: Literal['creating', 'running', 'stopped', 'error'] = 'creating'
    vm_ip: Optional[str] = None
    ssh_username: str = "ctfuser"
    ssh_port: int = 22
    resource_group: str
    error_message: Optional[str] = None
    
    model_config = {
        "populate_by_name": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }
    
    @validator('challenge_urls')
    def validate_challenge_urls(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one challenge URL is required")
        return v
    
    @validator('instructions')
    def validate_instructions(cls, v):
        if not v or not v.strip():
            raise ValueError("Instructions cannot be empty")
        return v


class KeyPair(BaseModel):
    """SSH key pair model for VM access"""
    session_id: str
    public_key: str
    private_key: str  # Should be encrypted at rest
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class VMCreationRequest(BaseModel):
    """Request model for creating a new VM"""
    challenge_urls: List[str] = Field(..., min_items=1, description="List of challenge file URLs")
    instructions: str = Field(..., min_length=1, description="Challenge instructions")
    agent_type: Literal['codex', 'copilot'] = Field(..., description="AI agent type")
    agent_model: str = Field(..., min_length=1, description="AI model name")
    vm_size: Literal['small', 'medium', 'large'] = Field(..., description="VM size configuration")
    
    @validator('challenge_urls')
    def validate_challenge_urls(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one challenge URL is required")
        return v
    
    @validator('instructions')
    def validate_instructions(cls, v):
        if not v or not v.strip():
            raise ValueError("Instructions cannot be empty")
        return v
    
    @validator('agent_model')
    def validate_agent_model(cls, v):
        if not v or not v.strip():
            raise ValueError("Agent model cannot be empty")
        return v


class SessionResponse(BaseModel):
    """Response model for session details"""
    id: str
    vm_size: str
    agent_type: str
    agent_model: str
    challenge_urls: List[str]
    instructions: str
    created_at: datetime
    status: str
    vm_ip: Optional[str]
    ssh_username: str
    ssh_port: int
    resource_group: str
    error_message: Optional[str]
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class SessionListResponse(BaseModel):
    """Response model for listing sessions"""
    sessions: List[SessionResponse]


class SSHConnectionInfo(BaseModel):
    """SSH connection information for a session"""
    hostname: str
    port: int
    username: str


class Writeup(BaseModel):
    """Writeup model for challenge solutions"""
    id: Optional[str] = Field(default=None, alias="_id")
    session_id: str
    challenge_urls: List[str]
    challenge_type: Optional[Literal['pwn', 'crypto', 'reversing', 'web', 'forensics']] = None
    content: str  # Markdown content
    completion_timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent_type: Literal['codex', 'copilot']
    agent_model: str
    
    model_config = {
        "populate_by_name": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class WriteupSegment(BaseModel):
    """Segment of a writeup for MCP server retrieval"""
    session_id: str
    challenge_type: Optional[str] = None
    segment: str  # Relevant excerpt from writeup
    relevance_score: float


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None
