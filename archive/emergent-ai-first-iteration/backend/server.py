"""
Selbrucivo — Location-aware creative library platform.
Phase 2 Restructure: Guilds, Local Libraries, Artwork archival.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import io
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from bson import ObjectId
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET', 'selbrucivo-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 14  # 14 days

app = FastAPI(title="Selbrucivo API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

GUILDS = {"illustrator", "animator", "designer"}
GLOBAL_TOTAL_THRESHOLD = 3000
GLOBAL_PER_GUILD_THRESHOLD = 1000

# Portrait validation constraints
MIN_WIDTH = 720
MIN_HEIGHT = 1280
MAX_ASPECT_RATIO = 9 / 16  # width/height must be <= ~0.5625 (portrait)
MIN_ASPECT_RATIO = 9 / 22  # don't allow absurdly tall slivers


# ============= MODELS =============

class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class OnboardingPayload(BaseModel):
    guild: str  # illustrator | animator | designer
    city: str
    region: Optional[str] = ""  # state/region
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AdminLogin(BaseModel):
    username: str
    password: str


class ArtworkUpload(BaseModel):
    title: str
    description: Optional[str] = ""
    tags: List[str] = []
    image_base64: str  # data:image/png;base64,... or raw base64
    creator_credit: Optional[str] = None  # falls back to username


class ArtworkReject(BaseModel):
    reason: str = ""


# ============= HELPERS =============

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_user(payload: dict = Depends(verify_token)) -> dict:
    if not payload.get("user_id"):
        raise HTTPException(status_code=403, detail="User token required")
    return payload


def require_admin(payload: dict = Depends(verify_token)) -> dict:
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def slugify(text: str) -> str:
    s = re.sub(r'[^a-zA-Z0-9]+', '-', text.lower()).strip('-')
    return s or "unknown"


def library_slug(city: str, region: str, country: str) -> str:
    return slugify(f"{city}-{region}-{country}")


def decode_image(image_base64: str):
    """Strip data URL prefix and return (PIL Image, mime, raw_b64)."""
    raw = image_base64
    mime = "image/png"
    if raw.startswith("data:"):
        try:
            header, raw = raw.split(",", 1)
            m = re.search(r'data:([^;]+);', header)
            if m:
                mime = m.group(1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Malformed data URL")
    try:
        binary = base64.b64decode(raw, validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")
    try:
        img = Image.open(io.BytesIO(binary))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="Unreadable image")
    return img, mime, raw


def validate_portrait(img: Image.Image):
    w, h = img.size
    if w < MIN_WIDTH or h < MIN_HEIGHT:
        raise HTTPException(
            status_code=400,
            detail=f"Resolution too low. Minimum {MIN_WIDTH}x{MIN_HEIGHT}; received {w}x{h}.",
        )
    if h <= w:
        raise HTTPException(
            status_code=400,
            detail=f"Artwork must be portrait orientation (height > width). Received {w}x{h}.",
        )
    ratio = w / h
    if ratio > MAX_ASPECT_RATIO + 0.05:
        raise HTTPException(
            status_code=400,
            detail="Artwork is not portrait enough (aspect ratio wider than 9:16).",
        )
    if ratio < MIN_ASPECT_RATIO - 0.02:
        raise HTTPException(
            status_code=400,
            detail="Artwork is too narrow/tall (beyond 9:22 ratio).",
        )
    return w, h


async def ensure_local_library(city: str, region: str, country: str) -> dict:
    slug = library_slug(city, region, country)
    existing = await db.local_libraries.find_one({"slug": slug})
    if existing:
        return {**existing, "id": existing["_id"]}
    lib = {
        "_id": str(ObjectId()),
        "slug": slug,
        "city": city.strip(),
        "region": (region or "").strip(),
        "country": country.strip(),
        "member_count": 0,
        "guild_counts": {"illustrator": 0, "animator": 0, "designer": 0},
        "is_global": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.local_libraries.insert_one(lib)
    return {**lib, "id": lib["_id"]}


def serialize_library(lib: dict) -> dict:
    return {
        "id": lib.get("id") or lib.get("_id"),
        "slug": lib["slug"],
        "city": lib["city"],
        "region": lib.get("region", ""),
        "country": lib["country"],
        "member_count": lib.get("member_count", 0),
        "guild_counts": lib.get("guild_counts", {"illustrator": 0, "animator": 0, "designer": 0}),
        "is_global": lib.get("is_global", False),
        "global_thresholds": {
            "total": GLOBAL_TOTAL_THRESHOLD,
            "per_guild": GLOBAL_PER_GUILD_THRESHOLD,
        },
    }


def serialize_artwork(a: dict) -> dict:
    return {
        "id": a["_id"],
        "title": a.get("title", ""),
        "description": a.get("description", ""),
        "tags": a.get("tags", []),
        "guild": a.get("guild"),
        "image_base64": a.get("image_base64"),
        "image_mime": a.get("image_mime", "image/jpeg"),
        "width": a.get("width"),
        "height": a.get("height"),
        "city": a.get("city"),
        "region": a.get("region", ""),
        "country": a.get("country"),
        "library_id": a.get("library_id"),
        "creator_name": a.get("creator_name"),
        "uploader_id": a.get("uploader_id"),
        "status": a.get("status"),
        "uploaded_at": a.get("uploaded_at"),
        "approved_at": a.get("approved_at"),
        "reject_reason": a.get("reject_reason"),
    }


# ============= AUTH =============

@api_router.post("/auth/register")
async def register(data: UserRegister):
    if not data.username or not data.password:
        raise HTTPException(status_code=400, detail="Username and password required")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = await db.users.find_one({"username": data.username.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = {
        "_id": str(ObjectId()),
        "username": data.username.lower(),
        "display_name": data.username,
        "password_hash": hash_password(data.password),
        "email": data.email,
        "guild": None,
        "city": None,
        "region": None,
        "country": None,
        "library_id": None,
        "latitude": None,
        "longitude": None,
        "onboarded": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_access_token({"user_id": user["_id"], "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "username": user["display_name"],
            "onboarded": False,
            "guild": None,
            "library_id": None,
        },
    }


@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"username": data.username.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"user_id": user["_id"], "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "username": user.get("display_name", user["username"]),
            "onboarded": bool(user.get("onboarded")),
            "guild": user.get("guild"),
            "library_id": user.get("library_id"),
        },
    }


@api_router.get("/auth/me")
async def me(payload: dict = Depends(require_user)):
    user = await db.users.find_one({"_id": payload["user_id"]}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    library = None
    if user.get("library_id"):
        lib = await db.local_libraries.find_one({"_id": user["library_id"]})
        if lib:
            library = serialize_library({**lib, "id": lib["_id"]})
    return {
        "id": user["_id"],
        "username": user.get("display_name", user["username"]),
        "email": user.get("email"),
        "guild": user.get("guild"),
        "city": user.get("city"),
        "region": user.get("region"),
        "country": user.get("country"),
        "library_id": user.get("library_id"),
        "library": library,
        "onboarded": bool(user.get("onboarded")),
        "created_at": user.get("created_at"),
    }


@api_router.post("/auth/onboarding")
async def onboarding(data: OnboardingPayload, payload: dict = Depends(require_user)):
    guild = data.guild.lower().strip()
    if guild not in GUILDS:
        raise HTTPException(status_code=400, detail="Invalid guild")
    if not data.city or not data.country:
        raise HTTPException(status_code=400, detail="City and country required")

    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    library = await ensure_local_library(data.city, data.region or "", data.country)
    library_id = library.get("id") or library.get("_id")

    previous_guild = user.get("guild")
    previous_library_id = user.get("library_id")
    was_counted = bool(user.get("onboarded"))

    await db.users.update_one(
        {"_id": payload["user_id"]},
        {
            "$set": {
                "guild": guild,
                "city": data.city.strip(),
                "region": (data.region or "").strip(),
                "country": data.country.strip(),
                "library_id": library_id,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "onboarded": True,
                "onboarded_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    # Decrement previous library counters if user is moving
    if was_counted and previous_library_id and previous_library_id != library_id:
        await db.local_libraries.update_one(
            {"_id": previous_library_id},
            {
                "$inc": {
                    "member_count": -1,
                    f"guild_counts.{previous_guild}": -1,
                }
            },
        )
    elif was_counted and previous_library_id == library_id and previous_guild != guild:
        # Same library, different guild
        await db.local_libraries.update_one(
            {"_id": library_id},
            {"$inc": {f"guild_counts.{previous_guild}": -1, f"guild_counts.{guild}": 1}},
        )
        await _recheck_global(library_id)
        lib = await db.local_libraries.find_one({"_id": library_id})
        return {
            "message": "Guild updated",
            "guild": guild,
            "library": serialize_library({**lib, "id": lib["_id"]}),
        }

    # Increment new library counters if new assignment or new library
    if not was_counted or (previous_library_id != library_id):
        await db.local_libraries.update_one(
            {"_id": library_id},
            {"$inc": {"member_count": 1, f"guild_counts.{guild}": 1}},
        )

    await _recheck_global(library_id)
    lib = await db.local_libraries.find_one({"_id": library_id})
    return {
        "message": f"Welcome to the {guild.title()}'s Guild of {data.city}",
        "guild": guild,
        "library": serialize_library({**lib, "id": lib["_id"]}),
    }


async def _recheck_global(library_id: str):
    lib = await db.local_libraries.find_one({"_id": library_id})
    if not lib:
        return
    counts = lib.get("guild_counts", {})
    eligible = (
        lib.get("member_count", 0) >= GLOBAL_TOTAL_THRESHOLD
        and counts.get("illustrator", 0) >= GLOBAL_PER_GUILD_THRESHOLD
        and counts.get("animator", 0) >= GLOBAL_PER_GUILD_THRESHOLD
        and counts.get("designer", 0) >= GLOBAL_PER_GUILD_THRESHOLD
    )
    if eligible and not lib.get("is_global"):
        await db.local_libraries.update_one(
            {"_id": library_id},
            {"$set": {"is_global": True, "promoted_at": datetime.now(timezone.utc).isoformat()}},
        )


# ============= ADMIN AUTH =============

@api_router.post("/admin/auth/login")
async def admin_login(data: AdminLogin):
    admin = await db.admin_users.find_one({"username": data.username.lower()})
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(
        {"admin_id": admin["_id"], "username": admin["username"], "role": "admin"}
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {"id": admin["_id"], "username": admin["username"]},
    }


# ============= ARTWORKS =============

@api_router.post("/artworks/upload")
async def upload_artwork(data: ArtworkUpload, payload: dict = Depends(require_user)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user or not user.get("onboarded"):
        raise HTTPException(status_code=400, detail="Complete onboarding before uploading")
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title required")
    if not data.image_base64:
        raise HTTPException(status_code=400, detail="Image required")

    img, mime, raw = decode_image(data.image_base64)
    w, h = validate_portrait(img)

    artwork = {
        "_id": str(ObjectId()),
        "uploader_id": user["_id"],
        "creator_name": (data.creator_credit or user.get("display_name") or user["username"]).strip(),
        "guild": user["guild"],
        "library_id": user["library_id"],
        "city": user["city"],
        "region": user.get("region", ""),
        "country": user["country"],
        "title": data.title.strip(),
        "description": (data.description or "").strip(),
        "tags": [t.strip().lower() for t in data.tags if t.strip()][:10],
        "image_base64": raw,
        "image_mime": mime,
        "width": w,
        "height": h,
        "status": "pending",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "reviewed_by": None,
        "reject_reason": None,
    }
    await db.artworks.insert_one(artwork)
    return {"message": "Submitted for archival review", "id": artwork["_id"], "status": "pending"}


@api_router.get("/artworks/feed")
async def artworks_feed(
    payload: dict = Depends(require_user),
    guild: Optional[str] = Query(None),
    scope: str = Query("local"),  # local | global
    limit: int = Query(50, ge=1, le=200),
):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user or not user.get("onboarded"):
        raise HTTPException(status_code=400, detail="Complete onboarding")

    q: dict = {"status": "approved"}
    if scope == "local":
        q["library_id"] = user["library_id"]
    elif scope == "global":
        # Show approved artworks from libraries that have achieved global status.
        global_libs = await db.local_libraries.find({"is_global": True}).to_list(1000)
        global_ids = [lib["_id"] for lib in global_libs]
        if not global_ids:
            return []
        q["library_id"] = {"$in": global_ids}
    if guild and guild.lower() in GUILDS:
        q["guild"] = guild.lower()

    artworks = await db.artworks.find(q).sort("approved_at", -1).to_list(limit)
    return [serialize_artwork(a) for a in artworks]


@api_router.get("/artworks/mine")
async def my_artworks(payload: dict = Depends(require_user)):
    artworks = await db.artworks.find(
        {"uploader_id": payload["user_id"]}
    ).sort("uploaded_at", -1).to_list(200)
    return [serialize_artwork(a) for a in artworks]


@api_router.get("/artworks/{artwork_id}")
async def get_artwork(artwork_id: str, payload: dict = Depends(require_user)):
    a = await db.artworks.find_one({"_id": artwork_id})
    if not a:
        raise HTTPException(status_code=404, detail="Artwork not found")
    if a["status"] != "approved" and a["uploader_id"] != payload["user_id"]:
        raise HTTPException(status_code=403, detail="Not visible")
    serialized = serialize_artwork(a)
    # Same Hand — up to three other approved works by the same creator in the same Local Library.
    same_hand_docs = await db.artworks.find(
        {
            "uploader_id": a["uploader_id"],
            "library_id": a.get("library_id"),
            "status": "approved",
            "_id": {"$ne": artwork_id},
        },
        {"_id": 1, "title": 1, "approved_at": 1},
    ).sort("approved_at", -1).to_list(3)
    serialized["same_hand"] = [
        {"id": d["_id"], "title": d.get("title", "")} for d in same_hand_docs
    ]
    return serialized


# ============= LIBRARIES =============

@api_router.get("/library/me")
async def my_library(payload: dict = Depends(require_user)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user or not user.get("library_id"):
        raise HTTPException(status_code=404, detail="No library assigned")
    lib = await db.local_libraries.find_one({"_id": user["library_id"]})
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")
    approved_count = await db.artworks.count_documents(
        {"library_id": lib["_id"], "status": "approved"}
    )
    return {
        **serialize_library({**lib, "id": lib["_id"]}),
        "approved_artwork_count": approved_count,
    }


@api_router.get("/libraries")
async def list_libraries(global_only: bool = Query(False)):
    q = {"is_global": True} if global_only else {}
    libs = await db.local_libraries.find(q).sort("member_count", -1).to_list(500)
    return [serialize_library({**lib, "id": lib["_id"]}) for lib in libs]


# ============= ADMIN MODERATION =============

@api_router.get("/admin/artworks/pending")
async def admin_pending(payload: dict = Depends(require_admin)):
    artworks = await db.artworks.find({"status": "pending"}).sort("uploaded_at", 1).to_list(500)
    return [serialize_artwork(a) for a in artworks]


@api_router.get("/admin/artworks")
async def admin_all_artworks(
    payload: dict = Depends(require_admin),
    status: Optional[str] = Query(None),
):
    q = {}
    if status:
        q["status"] = status
    artworks = await db.artworks.find(q).sort("uploaded_at", -1).to_list(500)
    return [serialize_artwork(a) for a in artworks]


@api_router.post("/admin/artworks/{artwork_id}/approve")
async def admin_approve(artwork_id: str, payload: dict = Depends(require_admin)):
    a = await db.artworks.find_one({"_id": artwork_id})
    if not a:
        raise HTTPException(status_code=404, detail="Artwork not found")
    if a["status"] == "approved":
        return {"message": "Already approved"}
    await db.artworks.update_one(
        {"_id": artwork_id},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": payload["admin_id"],
                "reject_reason": None,
            }
        },
    )
    return {"message": "Artwork approved", "id": artwork_id}


@api_router.post("/admin/artworks/{artwork_id}/reject")
async def admin_reject(
    artwork_id: str,
    data: ArtworkReject,
    payload: dict = Depends(require_admin),
):
    a = await db.artworks.find_one({"_id": artwork_id})
    if not a:
        raise HTTPException(status_code=404, detail="Artwork not found")
    await db.artworks.update_one(
        {"_id": artwork_id},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": payload["admin_id"],
                "reject_reason": data.reason or "Did not meet archival standards",
                "rejected_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {"message": "Artwork rejected", "id": artwork_id}


# ============= METRICS =============

@api_router.get("/metrics/global")
async def metrics_global():
    """Observational metrics — non-engagement, archival statistics only."""
    total_users = await db.users.count_documents({"onboarded": True})
    total_libraries = await db.local_libraries.count_documents({})
    global_libraries = await db.local_libraries.count_documents({"is_global": True})
    total_approved = await db.artworks.count_documents({"status": "approved"})
    total_pending = await db.artworks.count_documents({"status": "pending"})

    guild_totals = {"illustrator": 0, "animator": 0, "designer": 0}
    libs = await db.local_libraries.find({}, {"guild_counts": 1, "_id": 0}).to_list(2000)
    for lib in libs:
        for g, c in (lib.get("guild_counts") or {}).items():
            if g in guild_totals:
                guild_totals[g] += c

    return {
        "total_members": total_users,
        "total_local_libraries": total_libraries,
        "global_libraries": global_libraries,
        "approved_artworks": total_approved,
        "pending_artworks": total_pending,
        "guild_distribution": guild_totals,
        "global_thresholds": {
            "total": GLOBAL_TOTAL_THRESHOLD,
            "per_guild": GLOBAL_PER_GUILD_THRESHOLD,
        },
    }


# ============= SEED =============

@app.on_event("startup")
async def seed_admin():
    existing = await db.admin_users.find_one({"username": "admin"})
    if not existing:
        await db.admin_users.insert_one(
            {
                "_id": str(ObjectId()),
                "username": "admin",
                "password_hash": hash_password("admin123"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logging.getLogger("selbrucivo").info("Seeded default admin (admin/admin123)")


# Mount
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
