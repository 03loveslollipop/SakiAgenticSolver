"""Unit tests for shared JWT auth helpers used by core and control services."""

from __future__ import annotations

from dataclasses import dataclass, field

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from services.auth_service import AuthService
from shared.auth import get_current_user, get_websocket_user


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret")


@dataclass
class DummyWebSocket:
    query_params: dict = field(default_factory=dict)
    headers: dict = field(default_factory=dict)


@pytest.mark.asyncio
async def test_get_current_user_valid_bearer_token():
    auth_service = AuthService(secret_key="test-secret")
    token = auth_service.create_access_token("user-1", "user@example.com", "user")

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    current_user = await get_current_user(credentials=credentials, auth_service=auth_service)

    assert current_user["user_id"] == "user-1"
    assert current_user["email"] == "user@example.com"
    assert current_user["role"] == "user"


@pytest.mark.asyncio
async def test_get_current_user_rejects_missing_credentials():
    auth_service = AuthService(secret_key="test-secret")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=None, auth_service=auth_service)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_rejects_invalid_token():
    auth_service = AuthService(secret_key="test-secret")
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=credentials, auth_service=auth_service)

    assert exc_info.value.status_code == 401


def test_get_websocket_user_supports_query_token():
    auth_service = AuthService(secret_key="test-secret")
    token = auth_service.create_access_token("owner-1", "owner@example.com", "user")
    websocket = DummyWebSocket(query_params={"token": token}, headers={})

    user_info = get_websocket_user(websocket, auth_service=auth_service)

    assert user_info is not None
    assert user_info["user_id"] == "owner-1"


def test_get_websocket_user_supports_authorization_header():
    auth_service = AuthService(secret_key="test-secret")
    token = auth_service.create_access_token("admin-1", "admin@example.com", "admin")
    websocket = DummyWebSocket(query_params={}, headers={"authorization": f"Bearer {token}"})

    user_info = get_websocket_user(websocket, auth_service=auth_service)

    assert user_info is not None
    assert user_info["role"] == "admin"


def test_get_websocket_user_returns_none_for_invalid_token():
    auth_service = AuthService(secret_key="test-secret")
    websocket = DummyWebSocket(query_params={"token": "bad.token"}, headers={})

    assert get_websocket_user(websocket, auth_service=auth_service) is None

