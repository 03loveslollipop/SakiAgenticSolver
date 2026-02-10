"""
Tests for main FastAPI application configuration
Tests CORS middleware and exception handlers
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


def test_root_endpoint(client):
    """Test the root endpoint returns expected message"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "CTF Challenge Automation Platform API"}


def test_cors_headers_present(client):
    """Test that CORS headers are present in responses"""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    # CORS middleware should add these headers
    assert "access-control-allow-origin" in response.headers
    assert "access-control-allow-methods" in response.headers


def test_health_check_healthy(client):
    """Test health check endpoint when MongoDB is connected"""
    with patch('main.check_connection', new_callable=AsyncMock) as mock_check:
        mock_check.return_value = True
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


def test_health_check_unhealthy(client):
    """Test health check endpoint when MongoDB is disconnected"""
    with patch('main.check_connection', new_callable=AsyncMock) as mock_check:
        mock_check.return_value = False
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"


def test_cors_allowed_origins(client):
    """Test that allowed origins are configured correctly"""
    # Test with allowed origin
    response = client.get(
        "/",
        headers={"Origin": "http://localhost:5173"}
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_app_metadata():
    """Test that FastAPI app has correct metadata"""
    assert app.title == "CTF Challenge Automation Platform"
    assert app.description == "Backend API for managing Azure VMs for CTF challenge solving"
    assert app.version == "1.0.0"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
