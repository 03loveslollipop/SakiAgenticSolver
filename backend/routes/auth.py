# Authentication API endpoints

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from services.user_manager import UserManager
from services.auth_service import AuthService
from services.email_service import EmailService
from database.mongodb import get_database

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Security scheme
security = HTTPBearer()


# Request/Response Models
class LoginRequest(BaseModel):
    """Login request with email and password"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response"""
    requires_2fa_setup: bool
    message: str
    qr_code_url: Optional[str] = None
    secret: Optional[str] = None


class TwoFAVerifyRequest(BaseModel):
    """2FA verification request"""
    email: EmailStr
    password: str
    totp_code: str


class TwoFASetupVerifyRequest(BaseModel):
    """2FA setup verification request"""
    email: EmailStr
    totp_code: str


class TokenResponse(BaseModel):
    """Token response with access and refresh tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str


# Dependency to get services
async def get_user_manager() -> UserManager:
    """Get UserManager instance"""
    db = get_database()
    return UserManager(db.client)


async def get_auth_service() -> AuthService:
    """Get AuthService instance"""
    return AuthService()


async def get_email_service() -> EmailService:
    """Get EmailService instance"""
    return EmailService()


# Dependency to get current user from token
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Validate JWT token and return current user info.
    Raises HTTPException if token is invalid.
    """
    token = credentials.credentials
    user_info = auth_service.get_current_user(token)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user_info


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    user_manager: UserManager = Depends(get_user_manager)
):
    """
    Initial login with email and password.
    Returns 2FA setup requirement or prompts for 2FA code.
    """
    try:
        # Verify password
        user = await user_manager.verify_password(request.email, request.password)
        
        if not user:
            logger.warning(f"Failed login attempt for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if 2FA is enabled
        if not user.is_2fa_enabled:
            # User needs to set up 2FA
            logger.info(f"User needs 2FA setup: {request.email}")
            
            # Generate 2FA secret and QR code
            twofa_data = await user_manager.setup_2fa(user.id)
            
            return LoginResponse(
                requires_2fa_setup=True,
                message="Please set up Two-Factor Authentication",
                qr_code_url=twofa_data["qr_code_url"],
                secret=twofa_data["secret"]
            )
        
        # User has 2FA enabled, prompt for code
        return LoginResponse(
            requires_2fa_setup=False,
            message="Please enter your 2FA code"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )


@router.post("/login/2fa", response_model=TokenResponse)
async def login_with_2fa(
    request: TwoFAVerifyRequest,
    user_manager: UserManager = Depends(get_user_manager),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Complete login with 2FA code.
    Returns access and refresh tokens.
    """
    try:
        # Verify password first
        user = await user_manager.verify_password(request.email, request.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify 2FA code
        is_valid = await user_manager.verify_2fa(user.id, request.totp_code)
        
        if not is_valid:
            logger.warning(f"Invalid 2FA code for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
        
        # Generate tokens
        access_token = auth_service.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role
        )
        refresh_token = auth_service.create_refresh_token(user_id=user.id)
        
        logger.info(f"Successful login: {request.email}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "is_2fa_enabled": user.is_2fa_enabled
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during 2FA verification"
        )


@router.post("/setup-2fa/verify", response_model=TokenResponse)
async def verify_2fa_setup(
    request: TwoFASetupVerifyRequest,
    user_manager: UserManager = Depends(get_user_manager),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Verify 2FA setup and enable 2FA for user.
    Returns access and refresh tokens.
    """
    try:
        # Get user by email
        user = await user_manager.get_user_by_email(request.email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify 2FA code
        is_valid = await user_manager.verify_2fa(user.id, request.totp_code)
        
        if not is_valid:
            logger.warning(f"Invalid 2FA setup code for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code. Please try again."
            )
        
        # Enable 2FA
        await user_manager.enable_2fa(user.id)
        
        # Generate tokens
        access_token = auth_service.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role
        )
        refresh_token = auth_service.create_refresh_token(user_id=user.id)
        
        logger.info(f"2FA setup completed: {request.email}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "is_2fa_enabled": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA setup verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during 2FA setup"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    user_manager: UserManager = Depends(get_user_manager),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh access token using refresh token.
    Returns new access token.
    """
    try:
        # Verify refresh token
        payload = auth_service.verify_token(request.refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user_id = payload.get("sub")
        
        # Get user info
        user = await user_manager.get_user_by_id(user_id)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Generate new access token
        access_token = auth_service.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role
        )
        
        logger.info(f"Token refreshed for: {user.email}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=request.refresh_token,  # Return same refresh token
            user={
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "is_2fa_enabled": user.is_2fa_enabled
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during token refresh"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user (client should discard tokens).
    Note: JWT tokens cannot be invalidated server-side without a token blacklist.
    """
    logger.info(f"User logged out: {current_user['email']}")
    
    return MessageResponse(
        message="Successfully logged out. Please discard your tokens."
    )


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information.
    """
    return current_user
