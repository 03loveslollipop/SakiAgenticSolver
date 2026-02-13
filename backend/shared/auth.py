"""Shared JWT authentication helpers for HTTP and WebSocket endpoints."""

from __future__ import annotations

from typing import Optional
import logging

from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.auth_service import AuthService

logger = logging.getLogger(__name__)

security = HTTPBearer()


def get_auth_service() -> AuthService:
    """Dependency factory for JWT auth service."""
    return AuthService()


def is_admin(current_user: dict) -> bool:
    return current_user.get("role") == "admin"


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    """
    Validate JWT bearer token and return current user claims.
    Raises HTTP 401 on invalid/expired tokens.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_info = auth_service.get_current_user(credentials.credentials)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_info


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that enforces admin role."""
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


def _extract_websocket_token(websocket: WebSocket) -> Optional[str]:
    """Read bearer token from query string or Authorization header."""
    token = websocket.query_params.get("token")
    if token:
        return token

    auth_header = websocket.headers.get("authorization")
    if not auth_header:
        return None

    parts = auth_header.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def get_websocket_user(websocket: WebSocket, auth_service: Optional[AuthService] = None) -> Optional[dict]:
    """Validate JWT for WebSocket handshake and return user claims."""
    token = _extract_websocket_token(websocket)
    if not token:
        return None

    service = auth_service or AuthService()
    user_info = service.get_current_user(token)
    if not user_info:
        logger.warning("Rejected websocket auth due to invalid token")
    return user_info
