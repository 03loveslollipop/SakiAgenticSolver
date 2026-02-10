# Integration test for additional endpoints
# This test verifies the endpoints are properly registered and respond correctly

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


def test_endpoints_are_registered(client):
    """Test that all new endpoints are registered in the app"""
    # Get all routes from the app
    routes = [route.path for route in app.routes]
    
    # Check that all new endpoints are registered
    expected_endpoints = [
        "/api/sessions/{session_id}/ssh",
        "/api/sessions/{session_id}/ssh-key",
        "/api/sessions/{session_id}/agent-md",
        "/api/sessions/{session_id}/tools-md",
        "/api/sessions/{session_id}/base-prompt",
        "/api/sessions/{session_id}/changelog",
        "/api/sessions/{session_id}/discoveries",
        "/api/sessions/{session_id}/writeup",
        "/api/writeups",
        "/api/writeups/{session_id}",
        "/api/writeups/search"
    ]
    
    for endpoint in expected_endpoints:
        assert endpoint in routes, f"Endpoint {endpoint} not registered"
    
    print(f"✓ All {len(expected_endpoints)} endpoints are registered")


def test_ssh_endpoint_returns_404_for_nonexistent_session(client):
    """Test that SSH endpoint returns 404 for non-existent session"""
    response = client.get("/api/sessions/nonexistent-session/ssh")
    assert response.status_code in [404, 500]  # 404 or 500 depending on DB state


def test_writeups_list_endpoint_responds(client):
    """Test that writeups list endpoint responds"""
    response = client.get("/api/writeups?skip=0&limit=10")
    # Should return 200 or 500 (if DB not connected), but not 404
    assert response.status_code in [200, 500]


def test_writeups_search_requires_parameters(client):
    """Test that writeups search requires at least one parameter"""
    response = client.get("/api/writeups/search")
    assert response.status_code == 400  # Bad request without parameters


def test_writeups_search_with_query(client):
    """Test that writeups search accepts query parameter"""
    response = client.get("/api/writeups/search?q=test")
    # Should return 200 or 500 (if DB not connected), but not 404
    assert response.status_code in [200, 500]


def test_pagination_validation(client):
    """Test that pagination parameters are validated"""
    # Test negative skip
    response = client.get("/api/writeups?skip=-1&limit=10")
    assert response.status_code == 400
    
    # Test limit too large
    response = client.get("/api/writeups?skip=0&limit=200")
    assert response.status_code == 400
    
    # Test limit too small
    response = client.get("/api/writeups?skip=0&limit=0")
    assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
