# Authentication service for JWT token management

import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
import os
import logging

logger = logging.getLogger(__name__)


class AuthService:
    """Service for JWT token generation and validation"""
    
    def __init__(
        self,
        secret_key: Optional[str] = None,
        algorithm: str = "HS256",
        access_token_expire_minutes: int = 60,
        refresh_token_expire_days: int = 7
    ):
        """
        Initialize AuthService with JWT configuration.
        
        Args:
            secret_key: Secret key for JWT signing (from env if not provided)
            algorithm: JWT algorithm (default: HS256)
            access_token_expire_minutes: Access token expiration in minutes (default: 60)
            refresh_token_expire_days: Refresh token expiration in days (default: 7)
        """
        self.secret_key = secret_key or os.getenv("JWT_SECRET_KEY")
        if not self.secret_key:
            raise ValueError("JWT_SECRET_KEY must be set in environment or provided")
        
        self.algorithm = algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days
    
    def create_access_token(
        self,
        user_id: str,
        email: str,
        role: str,
        additional_claims: Optional[Dict] = None
    ) -> str:
        """
        Generate JWT access token (expires in 1 hour by default).
        
        Args:
            user_id: User's unique identifier
            email: User's email address
            role: User's role (admin or user)
            additional_claims: Optional additional claims to include
            
        Returns:
            JWT access token string
        """
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": user_id,  # Subject (user ID)
            "email": email,
            "role": role,
            "type": "access",
            "exp": expire,  # Expiration time
            "iat": datetime.utcnow()  # Issued at
        }
        
        # Add any additional claims
        if additional_claims:
            payload.update(additional_claims)
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        logger.info(f"Created access token for user: {email}")
        return token
    
    def create_refresh_token(
        self,
        user_id: str,
        additional_claims: Optional[Dict] = None
    ) -> str:
        """
        Generate JWT refresh token (expires in 7 days by default).
        
        Args:
            user_id: User's unique identifier
            additional_claims: Optional additional claims to include
            
        Returns:
            JWT refresh token string
        """
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        
        payload = {
            "sub": user_id,  # Subject (user ID)
            "type": "refresh",
            "exp": expire,  # Expiration time
            "iat": datetime.utcnow()  # Issued at
        }
        
        # Add any additional claims
        if additional_claims:
            payload.update(additional_claims)
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        logger.info(f"Created refresh token for user: {user_id}")
        return token
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """
        Verify and decode JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload if valid, None if invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
    
    def get_current_user(self, token: str) -> Optional[Dict]:
        """
        Extract user information from token.
        
        Args:
            token: JWT token string
            
        Returns:
            Dict with user_id, email, role if valid access token, None otherwise
        """
        payload = self.verify_token(token)
        
        if not payload:
            return None
        
        # Verify it's an access token
        if payload.get("type") != "access":
            logger.warning("Token is not an access token")
            return None
        
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role")
        }
    
    def refresh_access_token(
        self,
        refresh_token: str,
        email: str,
        role: str
    ) -> Optional[str]:
        """
        Generate new access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            email: User's email address
            role: User's role
            
        Returns:
            New access token if refresh token is valid, None otherwise
        """
        payload = self.verify_token(refresh_token)
        
        if not payload:
            return None
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            logger.warning("Token is not a refresh token")
            return None
        
        user_id = payload.get("sub")
        
        # Create new access token
        return self.create_access_token(user_id, email, role)
    
    def decode_token_without_verification(self, token: str) -> Optional[Dict]:
        """
        Decode token without verifying signature (for debugging/inspection).
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload (unverified)
        """
        try:
            payload = jwt.decode(
                token,
                options={"verify_signature": False}
            )
            return payload
        except Exception as e:
            logger.error(f"Failed to decode token: {e}")
            return None
