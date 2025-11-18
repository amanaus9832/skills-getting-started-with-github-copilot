from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture(autouse=True)
def reset_activities():
    # Keep a snapshot of the original activities and restore before each test
    original = deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(deepcopy(original))


@pytest.fixture()
def client():
    return TestClient(app_module.app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unsubscribe_flow(client):
    email = "alice.test@mergington.edu"
    activity = "Chess Club"

    # Ensure not already present
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # Sign up
    signup = client.post(f"/activities/{activity}/signup?email={email}")
    assert signup.status_code == 200
    assert "Signed up" in signup.json().get("message", "")

    # Participant should now be present
    resp2 = client.get("/activities")
    assert email in resp2.json()[activity]["participants"]

    # Unregister
    unregister = client.post(f"/activities/{activity}/unregister?email={email}")
    assert unregister.status_code == 200
    assert "Unregistered" in unregister.json().get("message", "")

    # Participant should no longer be present
    resp3 = client.get("/activities")
    assert email not in resp3.json()[activity]["participants"]


def test_signup_duplicate_returns_400(client):
    activity = "Chess Club"
    existing = app_module.activities[activity]["participants"][0]

    resp = client.post(f"/activities/{activity}/signup?email={existing}")
    assert resp.status_code == 400


def test_unregister_not_registered_returns_400(client):
    activity = "Chess Club"
    resp = client.post(f"/activities/{activity}/unregister?email=nonexistent@mergington.edu")
    assert resp.status_code == 400


def test_activity_not_found_returns_404(client):
    resp = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert resp.status_code == 404
    resp2 = client.post("/activities/NoSuchActivity/unregister?email=a@b.com")
    assert resp2.status_code == 404
