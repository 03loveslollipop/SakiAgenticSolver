"""Owner-scope authorization tests for control-plane session endpoints."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from control_service.routes import control_plane
from control_service.routes.control_plane import router as control_router
from models.schemas import Session
from shared.auth import get_current_user


def build_session(owner_user_id: str) -> Session:
    return Session(
        id="session-1",
        vm_size="small",
        agent_type="codex",
        agent_model="gpt-4",
        challenge_urls=["https://example.com/challenge"],
        instructions="solve",
        created_at=datetime.utcnow(),
        status="running",
        vm_ip="10.0.0.10",
        ssh_username="ctfuser",
        ssh_port=22,
        resource_group="test-rg",
        owner_user_id=owner_user_id,
        created_by_email=f"{owner_user_id}@example.com",
        last_updated_by=f"{owner_user_id}@example.com",
    )


@pytest.fixture
def app():
    application = FastAPI()
    application.include_router(control_router)
    return application


def test_list_sessions_owner_scoped_for_non_admin(app, monkeypatch):
    session_manager = AsyncMock()
    session_manager.list_sessions = AsyncMock(return_value=[build_session("user-1")])
    monkeypatch.setattr(control_plane, "get_session_manager", lambda: session_manager)

    app.dependency_overrides[get_current_user] = lambda: {
        "user_id": "user-1",
        "email": "user-1@example.com",
        "role": "user",
    }

    with TestClient(app) as client:
        response = client.get("/api/sessions")

    assert response.status_code == 200
    session_manager.list_sessions.assert_awaited_once_with(owner_user_id="user-1")


def test_list_sessions_unscoped_for_admin(app, monkeypatch):
    session_manager = AsyncMock()
    session_manager.list_sessions = AsyncMock(return_value=[build_session("user-1"), build_session("user-2")])
    monkeypatch.setattr(control_plane, "get_session_manager", lambda: session_manager)

    app.dependency_overrides[get_current_user] = lambda: {
        "user_id": "admin-1",
        "email": "admin@example.com",
        "role": "admin",
    }

    with TestClient(app) as client:
        response = client.get("/api/sessions")

    assert response.status_code == 200
    session_manager.list_sessions.assert_awaited_once_with(owner_user_id=None)


def test_get_session_forbidden_for_non_owner(app, monkeypatch):
    session_manager = AsyncMock()
    session_manager.get_session = AsyncMock(return_value=build_session("owner-a"))
    monkeypatch.setattr(control_plane, "get_session_manager", lambda: session_manager)

    app.dependency_overrides[get_current_user] = lambda: {
        "user_id": "owner-b",
        "email": "owner-b@example.com",
        "role": "user",
    }

    with TestClient(app) as client:
        response = client.get("/api/sessions/session-1")

    assert response.status_code == 403


def test_get_session_allowed_for_admin(app, monkeypatch):
    session_manager = AsyncMock()
    session_manager.get_session = AsyncMock(return_value=build_session("owner-a"))
    monkeypatch.setattr(control_plane, "get_session_manager", lambda: session_manager)

    app.dependency_overrides[get_current_user] = lambda: {
        "user_id": "admin-1",
        "email": "admin@example.com",
        "role": "admin",
    }

    with TestClient(app) as client:
        response = client.get("/api/sessions/session-1")

    assert response.status_code == 200
    assert response.json()["owner_user_id"] == "owner-a"

