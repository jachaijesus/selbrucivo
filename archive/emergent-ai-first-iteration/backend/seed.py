"""Seed data: clean legacy collections, create a demo user and sample artworks."""
import asyncio
import base64
import io
import os
import sys
import random
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from PIL import Image, ImageDraw, ImageFont
import bcrypt

load_dotenv(Path(__file__).parent / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def make_artwork_image(title: str, guild: str, palette: list) -> tuple:
    """Generate a portrait gradient placeholder image and return base64 + size."""
    w, h = 1080, 1920
    img = Image.new("RGB", (w, h), palette[0])
    draw = ImageDraw.Draw(img)
    # Vertical gradient
    c1 = palette[0]
    c2 = palette[1]
    for y in range(h):
        ratio = y / h
        r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
        g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
        b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    # Abstract shapes
    random.seed(title)
    for _ in range(8):
        x = random.randint(0, w)
        y = random.randint(0, h)
        radius = random.randint(80, 400)
        alpha_color = palette[2]
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], outline=alpha_color, width=4)
    # Title text
    try:
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 64)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
    except Exception:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()
    draw.text((80, h - 280), title, fill=(245, 240, 230), font=font_big)
    draw.text((80, h - 200), guild.upper() + " · SELBRUCIVO ARCHIVE", fill=(200, 195, 180), font=font_small)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode(), w, h


SAMPLE_ARTWORKS = [
    ("Cyan Memorandum", "illustrator", [(18, 26, 48), (12, 86, 116), (220, 240, 248)]),
    ("Ochre Procession", "designer", [(34, 22, 14), (148, 90, 36), (244, 220, 160)]),
    ("Quiet Cathedral", "animator", [(8, 8, 14), (60, 50, 90), (235, 220, 255)]),
    ("Solstice Folio", "illustrator", [(40, 12, 20), (162, 50, 60), (255, 226, 200)]),
    ("Concrete Hymnal", "designer", [(20, 24, 28), (90, 100, 110), (210, 215, 220)]),
    ("Drift Sequence", "animator", [(2, 18, 28), (12, 70, 90), (180, 230, 240)]),
    ("Burnt Manuscript", "designer", [(28, 16, 10), (120, 70, 30), (250, 210, 170)]),
    ("Northern Vellum", "illustrator", [(14, 20, 30), (40, 60, 90), (220, 230, 250)]),
]


async def main():
    print("Dropping legacy collections (wallpapers, classes, check_ins)...")
    for coll in ("wallpapers", "classes", "check_ins"):
        await db[coll].drop()

    # Seed demo user (Tampa, FL)
    existing = await db.users.find_one({"username": "testuser"})
    if existing:
        await db.users.delete_one({"_id": existing["_id"]})

    # Library
    slug = "tampa-fl-usa"
    await db.local_libraries.delete_many({"slug": slug})
    lib_id = str(ObjectId())
    library = {
        "_id": lib_id,
        "slug": slug,
        "city": "Tampa",
        "region": "FL",
        "country": "USA",
        "member_count": 1,
        "guild_counts": {"illustrator": 1, "animator": 0, "designer": 0},
        "is_global": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.local_libraries.insert_one(library)
    print(f"Created library: {library['city']}, {library['region']}")

    user_id = str(ObjectId())
    user = {
        "_id": user_id,
        "username": "testuser",
        "display_name": "testuser",
        "password_hash": hash_password("password123"),
        "email": None,
        "guild": "illustrator",
        "city": "Tampa",
        "region": "FL",
        "country": "USA",
        "library_id": lib_id,
        "latitude": 27.9506,
        "longitude": -82.4572,
        "onboarded": True,
        "onboarded_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    print("Seeded testuser (testuser/password123) in Tampa")

    # Wipe old artworks and seed approved ones (so feed has content)
    await db.artworks.delete_many({})
    for title, guild, palette in SAMPLE_ARTWORKS:
        b64, w, h = make_artwork_image(title, guild, palette)
        art = {
            "_id": str(ObjectId()),
            "uploader_id": user_id,
            "creator_name": "Selbrucivo Archive",
            "guild": guild,
            "library_id": lib_id,
            "city": "Tampa",
            "region": "FL",
            "country": "USA",
            "title": title,
            "description": "Curated baseline contribution to the Tampa archive.",
            "tags": ["archive", "selbrucivo", guild],
            "image_base64": b64,
            "image_mime": "image/jpeg",
            "width": w,
            "height": h,
            "status": "approved",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": "seed",
            "reject_reason": None,
        }
        await db.artworks.insert_one(art)
        print(f"  · {title} [{guild}]")

    # Seed one pending artwork for admin moderation queue
    b64, w, h = make_artwork_image("Pending Folio", "illustrator", [(20, 24, 36), (90, 70, 140), (240, 220, 255)])
    await db.artworks.insert_one({
        "_id": str(ObjectId()),
        "uploader_id": user_id,
        "creator_name": "testuser",
        "guild": "illustrator",
        "library_id": lib_id,
        "city": "Tampa",
        "region": "FL",
        "country": "USA",
        "title": "Pending Folio",
        "description": "Awaiting curator review.",
        "tags": ["pending"],
        "image_base64": b64,
        "image_mime": "image/jpeg",
        "width": w,
        "height": h,
        "status": "pending",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "reviewed_by": None,
        "reject_reason": None,
    })
    print("Seeded 1 pending artwork for moderation queue.")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
