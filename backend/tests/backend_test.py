"""Backend tests for Selbrucivo Phase 2 platform."""
import base64
import io
import os
import time
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://creative-archive-10.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


def _make_portrait_b64(w=1080, h=1920, color=(80, 40, 200)):
    img = Image.new("RGB", (w, h), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()


def _make_landscape_b64(w=2400, h=1400):
    img = Image.new("RGB", (w, h), (10, 10, 10))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()


def _make_tiny_b64():
    return _make_portrait_b64(w=300, h=600)


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user_token(session):
    """Seeded testuser/password123."""
    r = session.post(f"{API}/auth/login", json={"username": "testuser", "password": "password123"})
    if r.status_code != 200:
        pytest.skip(f"Seeded testuser not available: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/admin/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def fresh_user(session):
    """Create a new register-flow user."""
    uname = f"TEST_user_{int(time.time()*1000)}"
    r = session.post(f"{API}/auth/register", json={"username": uname, "password": "secret123"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"username": uname, "password": "secret123", "token": data["access_token"], "user": data["user"]}


# ============= AUTH =============

class TestAuth:
    def test_register_returns_jwt_unonboarded(self, fresh_user):
        assert fresh_user["token"]
        assert fresh_user["user"]["onboarded"] is False
        assert fresh_user["user"]["guild"] is None

    def test_register_duplicate_rejected(self, session, fresh_user):
        r = session.post(f"{API}/auth/register", json={"username": fresh_user["username"], "password": "secret123"})
        assert r.status_code == 400

    def test_register_short_password(self, session):
        r = session.post(f"{API}/auth/register", json={"username": f"TEST_short_{int(time.time())}", "password": "abc"})
        assert r.status_code == 400

    def test_login_seeded_user(self, test_user_token):
        assert test_user_token

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"username": "nope_xyz", "password": "bad"})
        assert r.status_code == 401

    def test_me_endpoint(self, session, test_user_token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {test_user_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["onboarded"] is True
        assert data["guild"] == "illustrator"
        assert data["library"]["city"] == "Tampa"
        assert "_id" not in data
        assert data["library"].get("id")

    def test_me_no_auth(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_me_invalid_token(self, session):
        r = session.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
        assert r.status_code == 401


# ============= ONBOARDING =============

class TestOnboarding:
    def test_invalid_guild_rejected(self, session, fresh_user):
        r = session.post(
            f"{API}/auth/onboarding",
            headers={"Authorization": f"Bearer {fresh_user['token']}"},
            json={"guild": "musician", "city": "Austin", "region": "TX", "country": "USA"},
        )
        assert r.status_code == 400

    def test_onboarding_success_creates_or_joins_library(self, session):
        # use a brand new user
        uname = f"TEST_onb_{int(time.time()*1000)}"
        reg = session.post(f"{API}/auth/register", json={"username": uname, "password": "secret123"}).json()
        token = reg["access_token"]
        r = session.post(
            f"{API}/auth/onboarding",
            headers={"Authorization": f"Bearer {token}"},
            json={"guild": "animator", "city": "Austin", "region": "TX", "country": "USA"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["guild"] == "animator"
        assert body["library"]["city"] == "Austin"
        assert body["library"]["member_count"] >= 1
        assert body["library"]["guild_counts"]["animator"] >= 1
        # me reflects onboarded
        me = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
        assert me["onboarded"] is True


# ============= ADMIN AUTH =============

class TestAdminAuth:
    def test_admin_login(self, admin_token):
        assert admin_token

    def test_admin_bad(self, session):
        r = session.post(f"{API}/admin/auth/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_admin_endpoint_blocks_user(self, session, test_user_token):
        r = session.get(f"{API}/admin/artworks/pending", headers={"Authorization": f"Bearer {test_user_token}"})
        assert r.status_code == 403

    def test_admin_endpoint_allows_admin(self, session, admin_token):
        r = session.get(f"{API}/admin/artworks/pending", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============= ARTWORK UPLOAD =============

class TestArtworkUpload:
    def test_upload_landscape_rejected(self, session, test_user_token):
        r = session.post(
            f"{API}/artworks/upload",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"title": "TEST_landscape", "image_base64": _make_landscape_b64()},
        )
        assert r.status_code == 400
        assert "portrait" in r.text.lower() or "orientation" in r.text.lower()

    def test_upload_tiny_rejected(self, session, test_user_token):
        r = session.post(
            f"{API}/artworks/upload",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"title": "TEST_tiny", "image_base64": _make_tiny_b64()},
        )
        assert r.status_code == 400
        assert "resolution" in r.text.lower() or "minimum" in r.text.lower()

    def test_upload_valid_portrait_pending(self, session, test_user_token):
        r = session.post(
            f"{API}/artworks/upload",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"title": "TEST_valid_portrait", "description": "test", "image_base64": _make_portrait_b64()},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "pending"
        assert body["id"]
        # mine returns it
        mine = session.get(f"{API}/artworks/mine", headers={"Authorization": f"Bearer {test_user_token}"}).json()
        assert any(a["id"] == body["id"] and a["status"] == "pending" for a in mine)

    def test_upload_requires_onboarding(self, session, fresh_user):
        # fresh_user has registered but not onboarded
        r = session.post(
            f"{API}/artworks/upload",
            headers={"Authorization": f"Bearer {fresh_user['token']}"},
            json={"title": "TEST_no_onb", "image_base64": _make_portrait_b64()},
        )
        assert r.status_code == 400

    def test_upload_no_auth(self, session):
        r = session.post(f"{API}/artworks/upload", json={"title": "x", "image_base64": _make_portrait_b64()})
        assert r.status_code in (401, 403)


# ============= FEED =============

class TestFeed:
    def test_feed_local_returns_approved(self, session, test_user_token):
        r = session.get(f"{API}/artworks/feed?scope=local", headers={"Authorization": f"Bearer {test_user_token}"})
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        for a in items:
            assert a["status"] == "approved"

    def test_feed_global_only_global_libs(self, session, test_user_token):
        r = session.get(f"{API}/artworks/feed?scope=global", headers={"Authorization": f"Bearer {test_user_token}"})
        assert r.status_code == 200
        # seed: Tampa is not global so we expect [] unless promoted
        for a in r.json():
            assert a["status"] == "approved"

    def test_feed_guild_filter(self, session, test_user_token):
        r = session.get(
            f"{API}/artworks/feed?scope=local&guild=illustrator",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert r.status_code == 200
        for a in r.json():
            assert a["guild"] == "illustrator"

    def test_mine(self, session, test_user_token):
        r = session.get(f"{API}/artworks/mine", headers={"Authorization": f"Bearer {test_user_token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============= LIBRARY =============

class TestLibrary:
    def test_library_me(self, session, test_user_token):
        r = session.get(f"{API}/library/me", headers={"Authorization": f"Bearer {test_user_token}"})
        assert r.status_code == 200
        lib = r.json()
        assert lib["city"] == "Tampa"
        assert "approved_artwork_count" in lib
        assert lib["approved_artwork_count"] >= 1
        assert "guild_counts" in lib


# ============= ADMIN MODERATION =============

class TestModeration:
    def test_pending_then_approve_and_reject(self, session, test_user_token, admin_token):
        # upload a fresh pending
        up = session.post(
            f"{API}/artworks/upload",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"title": "TEST_mod_flow", "image_base64": _make_portrait_b64(color=(20, 50, 200))},
        ).json()
        artwork_id = up["id"]

        pending = session.get(
            f"{API}/admin/artworks/pending", headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        assert any(a["id"] == artwork_id for a in pending)

        # Approve
        appr = session.post(
            f"{API}/admin/artworks/{artwork_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert appr.status_code == 200

        # Verify status approved by re-fetch
        got = session.get(f"{API}/artworks/{artwork_id}", headers={"Authorization": f"Bearer {test_user_token}"}).json()
        assert got["status"] == "approved"
        assert got["approved_at"]

        # Upload another and reject
        up2 = session.post(
            f"{API}/artworks/upload",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"title": "TEST_reject", "image_base64": _make_portrait_b64(color=(120, 30, 50))},
        ).json()
        rej = session.post(
            f"{API}/admin/artworks/{up2['id']}/reject",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "TEST_reason"},
        )
        assert rej.status_code == 200
        got2 = session.get(f"{API}/artworks/{up2['id']}", headers={"Authorization": f"Bearer {test_user_token}"}).json()
        assert got2["status"] == "rejected"
        assert got2["reject_reason"] == "TEST_reason"


# ============= METRICS & NEGATIVE =============

class TestMetricsAndAbsence:
    def test_metrics_global(self, session):
        r = session.get(f"{API}/metrics/global")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_members", "total_local_libraries", "approved_artworks", "guild_distribution"):
            assert k in d
        # No engagement fields
        for forbidden in ("likes", "comments", "followers", "reactions"):
            assert forbidden not in d

    @pytest.mark.parametrize("path", [
        "/api/wallpapers", "/api/classes", "/api/check_ins",
        "/api/likes", "/api/comments", "/api/followers", "/api/reactions", "/api/messages",
    ])
    def test_no_engagement_endpoints(self, session, path):
        r = session.get(f"{BASE_URL}{path}")
        # Should be 404 (not registered) — anything 200 is a smell
        assert r.status_code in (404, 405, 401, 403), f"{path} returned {r.status_code}"
        if r.status_code == 200:
            pytest.fail(f"Engagement endpoint {path} unexpectedly exists")
