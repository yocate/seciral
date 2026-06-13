from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Strategy Intelligence Platform (SIP) API"}

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_run_diagnostic():
    response = client.post("/api/diagnostic", json={"user_input": "テスト"})
    assert response.status_code == 200
    assert "テスト" in response.json()["reply"]
