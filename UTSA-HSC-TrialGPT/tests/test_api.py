"""
tests/test_api.py — Tests for the FastAPI Backend
=================================================
Validates the REST endpoints and integration with the SQLite database.
"""

from fastapi.testclient import TestClient
from api.main import app
import pytest

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "UTSA-HSC TrialGPT Platform" in response.text

def test_api_summary():
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.json()
    assert "funnel" in data
    assert "demographics" in data
    assert "initial_pool" in data["funnel"]

def test_api_simulation_status_not_found():
    response = client.get("/api/trials/TRIAL123/simulation/FAKE_RUN/status")
    assert response.status_code == 404

def test_api_explain_mock():
    # Test explain without setting GEMINI_API_KEY
    payload = {
        "action": "HALT_PATIENT",
        "rationale": "Test Grade 3 Plt Drop",
        "belief_state": {"platelets": 45000}
    }
    response = client.post("/api/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "[MOCK GENAI]" in data["report"]

def test_api_pi_form():
    # Requires a valid patient in the DB.
    # In test mode we might get "Error: Patient not found." if DB is empty,
    # but the endpoint itself should not 500.
    response = client.get("/api/documents/pi_form?patient_id=P-001")
    assert response.status_code == 200
    assert "markdown" in response.json()

def test_api_sms():
    response = client.get("/api/documents/sms?patient_id=P-001")
    assert response.status_code == 200
    assert "text" in response.json()
    assert "URGENT" in response.json()["text"]
