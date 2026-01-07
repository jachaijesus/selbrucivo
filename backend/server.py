from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'selbrucivo-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============= MODELS =============

class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    current_timezone: str
    unlocked_timezones: List[str]
    class_id: Optional[str]
    device_info: Optional[dict]
    created_at: str

class WallpaperResponse(BaseModel):
    id: str
    image_base64: str
    creator_credit: str
    timezone: str
    date_assigned: str
    upload_date: str

class AdminRegister(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class WallpaperUpload(BaseModel):
    image_base64: str
    creator_credit: str
    timezone: str
    date_assigned: str

class ClassCreate(BaseModel):
    name: str

class ClassInvite(BaseModel):
    username: str

class CheckInRequest(BaseModel):
    latitude: float
    longitude: float
    timezone: str

class AdminApplication(BaseModel):
    name: str
    dob: str
    city: str
    state: str
    country: str
    social_links: List[str]
    portfolio_links: List[str]
    documents: List[str]  # base64 or URLs

# ============= HELPER FUNCTIONS =============

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def get_timezone_from_coords(lat: float, lon: float) -> str:
    # Simplified timezone detection - in production, use a proper library
    # For now, return a default timezone
    return "America/New_York"

# ============= USER AUTHENTICATION ROUTES =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    user = {
        "_id": str(ObjectId()),
        "username": user_data.username,
        "password_hash": hash_password(user_data.password),
        "email": user_data.email,
        "current_timezone": "America/New_York",  # Default timezone
        "unlocked_timezones": ["America/New_York"],
        "class_id": None,
        "device_info": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Create token
    token = create_access_token({"user_id": user["_id"], "username": user["username"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "username": user["username"],
            "current_timezone": user["current_timezone"]
        }
    }

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user
    user = await db.users.find_one({"username": user_data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create token
    token = create_access_token({"user_id": user["_id"], "username": user["username"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "username": user["username"],
            "current_timezone": user.get("current_timezone", "America/New_York")
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user(payload: dict = Depends(verify_token)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["_id"],
        username=user["username"],
        email=user.get("email"),
        current_timezone=user.get("current_timezone", "America/New_York"),
        unlocked_timezones=user.get("unlocked_timezones", ["America/New_York"]),
        class_id=user.get("class_id"),
        device_info=user.get("device_info"),
        created_at=user.get("created_at", "")
    )

# ============= WALLPAPER ROUTES =============

@api_router.get("/wallpapers/today")
async def get_todays_wallpaper(payload: dict = Depends(verify_token)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    timezone = user.get("current_timezone", "America/New_York")
    today = datetime.utcnow().date().isoformat()
    
    # Find today's wallpaper for user's timezone
    wallpaper = await db.wallpapers.find_one({
        "timezone": timezone,
        "date_assigned": today
    })
    
    if not wallpaper:
        # Return a placeholder or most recent wallpaper
        wallpaper = await db.wallpapers.find_one(
            {"timezone": timezone},
            sort=[("date_assigned", -1)]
        )
    
    if not wallpaper:
        raise HTTPException(status_code=404, detail="No wallpaper available for your timezone")
    
    return {
        "id": wallpaper["_id"],
        "image_base64": wallpaper["image_base64"],
        "creator_credit": wallpaper["creator_credit"],
        "timezone": wallpaper["timezone"],
        "date_assigned": wallpaper["date_assigned"]
    }

@api_router.get("/wallpapers/history")
async def get_wallpaper_history(payload: dict = Depends(verify_token)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    timezone = user.get("current_timezone", "America/New_York")
    today = datetime.utcnow().date().isoformat()
    
    # Get past wallpapers (not including today)
    wallpapers = await db.wallpapers.find({
        "timezone": timezone,
        "date_assigned": {"$lt": today}
    }).sort("date_assigned", -1).to_list(100)
    
    return [
        {
            "id": w["_id"],
            "image_base64": w["image_base64"],
            "creator_credit": w["creator_credit"],
            "timezone": w["timezone"],
            "date_assigned": w["date_assigned"]
        }
        for w in wallpapers
    ]

@api_router.get("/wallpapers/archive/{timezone:path}")
async def get_timezone_archive(timezone: str, payload: dict = Depends(verify_token)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has unlocked this timezone
    if timezone not in user.get("unlocked_timezones", []):
        raise HTTPException(status_code=403, detail="Timezone not unlocked")
    
    # Get all wallpapers for this timezone
    wallpapers = await db.wallpapers.find(
        {"timezone": timezone}
    ).sort("date_assigned", -1).to_list(1000)
    
    return [
        {
            "id": w["_id"],
            "image_base64": w["image_base64"],
            "creator_credit": w["creator_credit"],
            "timezone": w["timezone"],
            "date_assigned": w["date_assigned"]
        }
        for w in wallpapers
    ]

# REMOVED: Wallpaper reactions violate contemplative design
# Wallpapers are curriculum artifacts, not engagement content

# ============= ADMIN ROUTES =============

@api_router.post("/admin/auth/register")
async def register_admin(admin_data: AdminRegister):
    # Check if admin exists
    existing = await db.admin_users.find_one({"username": admin_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Admin username already exists")
    
    admin = {
        "_id": str(ObjectId()),
        "username": admin_data.username,
        "password_hash": hash_password(admin_data.password),
        "upload_history": [],
        "created_at": datetime.utcnow().isoformat()
    }
    await db.admin_users.insert_one(admin)
    
    token = create_access_token({"admin_id": admin["_id"], "username": admin["username"], "role": "admin"})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {"id": admin["_id"], "username": admin["username"]}
    }

@api_router.post("/admin/auth/login")
async def login_admin(admin_data: AdminLogin):
    admin = await db.admin_users.find_one({"username": admin_data.username})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(admin_data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"admin_id": admin["_id"], "username": admin["username"], "role": "admin"})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {"id": admin["_id"], "username": admin["username"]}
    }

@api_router.post("/admin/wallpapers/upload")
async def upload_wallpaper(wallpaper_data: WallpaperUpload, payload: dict = Depends(verify_token)):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    wallpaper = {
        "_id": str(ObjectId()),
        "image_base64": wallpaper_data.image_base64,
        "creator_credit": wallpaper_data.creator_credit,
        "timezone": wallpaper_data.timezone,
        "date_assigned": wallpaper_data.date_assigned,
        "upload_date": datetime.utcnow().isoformat(),
        "uploaded_by_admin_id": payload["admin_id"],
        "metrics": {"devices_sent_to": 0, "reactions": []}
    }
    
    await db.wallpapers.insert_one(wallpaper)
    
    # Update admin upload history
    await db.admin_users.update_one(
        {"_id": payload["admin_id"]},
        {"$push": {"upload_history": wallpaper["_id"]}}
    )
    
    return {"message": "Wallpaper uploaded successfully", "id": wallpaper["_id"]}

@api_router.get("/admin/wallpapers/history")
async def get_admin_upload_history(payload: dict = Depends(verify_token)):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    admin = await db.admin_users.find_one({"_id": payload["admin_id"]})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    wallpaper_ids = admin.get("upload_history", [])
    wallpapers = await db.wallpapers.find({"_id": {"$in": wallpaper_ids}}).to_list(1000)
    
    return [
        {
            "id": w["_id"],
            "creator_credit": w["creator_credit"],
            "timezone": w["timezone"],
            "date_assigned": w["date_assigned"],
            "upload_date": w["upload_date"],
            "metrics": w.get("metrics", {})
        }
        for w in wallpapers
    ]

@api_router.get("/metrics/global")
async def get_global_metrics():
    total_users = await db.users.count_documents({})
    total_wallpapers = await db.wallpapers.count_documents({})
    active_checkins = await db.check_ins.count_documents({"status": "pending"})
    completed_checkins = await db.check_ins.count_documents({"status": "completed"})
    
    # Device type counts
    users = await db.users.find({}).to_list(10000)
    device_types = {}
    for user in users:
        if user.get("device_info"):
            device_type = user["device_info"].get("type", "Unknown")
            device_types[device_type] = device_types.get(device_type, 0) + 1
    
    return {
        "total_downloads": total_users,
        "device_types": device_types,
        "active_users": total_users,
        "users_checking_in": active_checkins,
        "completed_24h_checkins": completed_checkins,
        "total_wallpapers": total_wallpapers
    }

@api_router.post("/admin/applications/submit")
async def submit_admin_application(application: AdminApplication):
    app = {
        "_id": str(ObjectId()),
        "name": application.name,
        "dob": application.dob,
        "city": application.city,
        "state": application.state,
        "country": application.country,
        "social_links": application.social_links,
        "portfolio_links": application.portfolio_links,
        "documents": application.documents,
        "status": "pending",
        "submitted_at": datetime.utcnow().isoformat(),
        "reviewed_at": None
    }
    await db.admin_applications.insert_one(app)
    return {"message": "Application submitted successfully", "application_id": app["_id"]}

@api_router.get("/admin/applications/list")
async def list_admin_applications(payload: dict = Depends(verify_token)):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    applications = await db.admin_applications.find({}).to_list(1000)
    return [
        {
            "id": app["_id"],
            "name": app["name"],
            "city": app["city"],
            "state": app["state"],
            "country": app["country"],
            "status": app["status"],
            "submitted_at": app["submitted_at"]
        }
        for app in applications
    ]

# ============= CLASS ROUTES =============

@api_router.post("/classes/create")
async def create_class(class_data: ClassCreate, payload: dict = Depends(verify_token)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("class_id"):
        raise HTTPException(status_code=400, detail="User already has a class")
    
    new_class = {
        "_id": str(ObjectId()),
        "name": class_data.name,
        "creator_id": payload["user_id"],
        "members": [payload["user_id"]],
        "pending_invites": [],
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.classes.insert_one(new_class)
    await db.users.update_one({"_id": payload["user_id"]}, {"$set": {"class_id": new_class["_id"]}})
    
    return {"message": "Class created", "class_id": new_class["_id"]}

@api_router.get("/classes/my-class")
async def get_my_class(payload: dict = Depends(verify_token)):
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user or not user.get("class_id"):
        return None
    
    class_obj = await db.classes.find_one({"_id": user["class_id"]})
    if not class_obj:
        return None
    
    # Get member details
    members = await db.users.find({"_id": {"$in": class_obj["members"]}}).to_list(100)
    
    return {
        "id": class_obj["_id"],
        "name": class_obj["name"],
        "creator_id": class_obj["creator_id"],
        "members": [{"id": m["_id"], "username": m["username"]} for m in members],
        "pending_invites": class_obj.get("pending_invites", [])
    }

# Include router
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
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
