import copy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture(autouse=True)
def restore_activities():
    """Save and restore the in-memory activities dict to keep tests isolated."""
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(original)


def test_get_activities():
    client = TestClient(app_module.app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Expect a known activity exists
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"].get("participants"), list)


def test_signup_and_unregister_flow():
    client = TestClient(app_module.app)
    activity = "Chess Club"
    email = "pytest.user@mergington.edu"

    # Ensure email not already present
    before = client.get("/activities").json()[activity]["participants"]
    assert email not in before

    # Sign up
    signup_resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert signup_resp.status_code == 200
    assert "Signed up" in signup_resp.json().get("message", "")

    # Confirm present
    after = client.get("/activities").json()[activity]["participants"]
    assert email in after

    # Signing up again should fail
    dup = client.post(f"/activities/{activity}/signup?email={email}")
    assert dup.status_code == 400

    # Unregister
    unreg = client.post(f"/activities/{activity}/unregister?email={email}")
    assert unreg.status_code == 200
    assert "Unregistered" in unreg.json().get("message", "")

    # Confirm removed
    final = client.get("/activities").json()[activity]["participants"]
    assert email not in final


def test_unregister_nonexistent():
    client = TestClient(app_module.app)
    activity = "Chess Club"
    email = "not.registered@mergington.edu"

    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 400
