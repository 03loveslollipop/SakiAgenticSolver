# User management API endpoints (admin only)

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import logging

from services.user_manager import UserManager
from services.email_service import EmailService
from models.schemas import User
from database.mongodb import get_database
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/users", tags=["user-management"])


# Request/Response Models
class CreateUserRequest(BaseModel):
    """Request to create a new user"""
    email: EmailStr
    role: str = "user"


class CreateUserResponse(BaseModel):
    """Response after creating a user"""
    user: dict
    message: str


class UpdateUserRequest(BaseModel):
    """Request to update user"""
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """User information response"""
    id: str
    email: str
    role: str
    is_2fa_enabled: bool
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    created_by: Optional[str]


class UsersListResponse(BaseModel):
    """List of users response"""
    users: List[UserResponse]
    total: int


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str


# Dependency to get services
async def get_user_manager() -> UserManager:
    """Get UserManager instance"""
    db = get_database()
    return UserManager(db.client)


async def get_email_service() -> EmailService:
    """Get EmailService instance"""
    return EmailService()


# Dependency to check admin role
async def require_admin(current_user: dict = Depends(get_current_user)):
    """
    Verify that current user has admin role.
    Raises HTTPException if not admin.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


@router.post("", response_model=CreateUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: CreateUserRequest,
    current_user: dict = Depends(require_admin),
    user_manager: UserManager = Depends(get_user_manager),
    email_service: EmailService = Depends(get_email_service)
):
    """
    Create a new user (admin only).
    Generates temporary password and sends welcome email.
    """
    try:
        # Validate role
        if request.role not in ["admin", "user"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role must be 'admin' or 'user'"
            )
        
        # Create user
        user, temp_password = await user_manager.create_user(
            email=request.email,
            role=request.role,
            created_by=current_user["user_id"]
        )
        
        # Send welcome email
        email_sent = await email_service.send_welcome_email(
            to_email=user.email,
            username=user.email,
            temporary_password=temp_password
        )
        
        if not email_sent:
            logger.warning(f"Failed to send welcome email to: {user.email}")
        
        logger.info(f"User created by {current_user['email']}: {user.email}")
        
        return CreateUserResponse(
            user={
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "is_2fa_enabled": user.is_2fa_enabled,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat()
            },
            message=f"User created successfully. Welcome email sent to {user.email}"
        )
        
    except ValueError as e:
        # Duplicate email or validation error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating user"
        )


@router.get("", response_model=UsersListResponse)
async def list_users(
    current_user: dict = Depends(require_admin),
    user_manager: UserManager = Depends(get_user_manager)
):
    """
    List all users (admin only).
    """
    try:
        users = await user_manager.list_users()
        
        user_responses = [
            UserResponse(
                id=user.id,
                email=user.email,
                role=user.role,
                is_2fa_enabled=user.is_2fa_enabled,
                is_active=user.is_active,
                created_at=user.created_at,
                last_login=user.last_login,
                created_by=user.created_by
            )
            for user in users
        ]
        
        return UsersListResponse(
            users=user_responses,
            total=len(user_responses)
        )
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while listing users"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    user_manager: UserManager = Depends(get_user_manager)
):
    """
    Get user details by ID (admin only).
    """
    try:
        user = await user_manager.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            is_2fa_enabled=user.is_2fa_enabled,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login,
            created_by=user.created_by
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving user"
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: dict = Depends(require_admin),
    user_manager: UserManager = Depends(get_user_manager)
):
    """
    Update user (admin only).
    Can update role and active status.
    """
    try:
        # Build updates dict
        updates = {}
        if request.role is not None:
            if request.role not in ["admin", "user"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Role must be 'admin' or 'user'"
                )
            updates["role"] = request.role
        
        if request.is_active is not None:
            updates["is_active"] = request.is_active
        
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No updates provided"
            )
        
        # Update user
        user = await user_manager.update_user(user_id, updates)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"User updated by {current_user['email']}: {user.email}")
        
        return UserResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            is_2fa_enabled=user.is_2fa_enabled,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login,
            created_by=user.created_by
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating user"
        )


@router.delete("/{user_id}", response_model=MessageResponse)
async def disable_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    user_manager: UserManager = Depends(get_user_manager)
):
    """
    Disable user account (admin only).
    Note: This doesn't delete the user, just sets is_active to False.
    """
    try:
        # Prevent admin from disabling themselves
        if user_id == current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot disable your own account"
            )
        
        # Get user first to log email
        user = await user_manager.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Disable user
        success = await user_manager.disable_user(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"User disabled by {current_user['email']}: {user.email}")
        
        return MessageResponse(
            message=f"User {user.email} has been disabled"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while disabling user"
        )
