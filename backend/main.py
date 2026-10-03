from fastapi import (
    FastAPI,
    Form,
    UploadFile,
    File,
    Depends,
    HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse

from sqlalchemy.orm import Session

import os
import shutil
import uuid
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from urllib.request import urlopen

import bcrypt

import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary import CloudinaryImage

from .database import SessionLocal

from .models import (
    Item,
    User,
    Message,
    Notification,
    VerificationRequest
)


from .text_matcher import calculate_text_similarity
from .image_matcher import calculate_image_similarity
from math import radians, sin, cos, sqrt, atan2



# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="AI-Powered Lost & Found Matching System"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# CLOUDINARY
# =========================================================

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "uploads"
)

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# Images are served by the explicit /uploads/{filename} route below.
# Local files are used when available; otherwise Cloudinary is used.


# =========================================================
# DATABASE
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def image_url(filename):
    """
    Keep the same API-relative URL used by the existing frontend.
    """
    if not filename:
        return None

    filename = os.path.basename(filename)

    return f"/uploads/{filename}"


def get_cloudinary_public_id(filename):
    """
    Convert the stored UUID filename into the Cloudinary public ID.
    Example:
        abc123.jpg -> lost_found/abc123
    """
    if not filename:
        return None

    filename = os.path.basename(filename)
    stem = os.path.splitext(filename)[0]

    return f"lost_found/{stem}"


def get_cloudinary_url(filename):
    """
    Build a secure Cloudinary URL from the stored filename.
    """
    public_id = get_cloudinary_public_id(filename)

    if not public_id:
        return None

    try:
        return CloudinaryImage(
            public_id
        ).build_url(
            secure=True
        )
    except Exception:
        return None


def image_exists(filename):
    """
    Check local storage first, then Cloudinary.
    """
    if not filename:
        return False

    filename = os.path.basename(filename)

    local_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    if os.path.isfile(local_path):
        return True

    public_id = get_cloudinary_public_id(filename)

    if not public_id:
        return False

    try:
        cloudinary.api.resource(
            public_id,
            resource_type="image",
            type="upload"
        )
        return True
    except Exception:
        return False


def ensure_local_image(filename):
    """
    Return a local path for image matching.

    If Render's temporary filesystem no longer contains
    the image, download it from Cloudinary and recreate
    the local cache.
    """
    if not filename:
        return None

    filename = os.path.basename(filename)

    local_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    if os.path.isfile(local_path):
        return local_path

    cloudinary_url = get_cloudinary_url(filename)

    if not cloudinary_url:
        return None

    try:
        with urlopen(
            cloudinary_url,
            timeout=20
        ) as response:
            image_data = response.read()

        if not image_data:
            return None

        with open(
            local_path,
            "wb"
        ) as file:
            file.write(image_data)

        return local_path

    except Exception as e:
        print(
            "Unable to download image from Cloudinary:",
            e
        )
        return None


@app.get("/uploads/{filename}")
def serve_upload(filename: str):
    """
    Preserve the existing /uploads/{filename} frontend URL.

    Serve the local cached image when available.
    Otherwise redirect to the permanent Cloudinary image.
    """
    filename = os.path.basename(filename)

    local_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    if os.path.isfile(local_path):
        return FileResponse(local_path)

    cloudinary_url = get_cloudinary_url(filename)

    if not cloudinary_url:
        raise HTTPException(
            status_code=404,
            detail="Image not found."
        )

    return RedirectResponse(
        url=cloudinary_url,
        status_code=307
    )



def serialize_item(item):
    """
    Converts SQLAlchemy Item object into a consistent
    JSON-friendly dictionary.
    """

    return {
        "id": item.id,
        "user_id": item.user_id,

        "item_type": item.item_type,
        "item_name": item.item_name,
        "category": item.category,
        "description": item.description,

        "color": item.color,
        "brand": item.brand,
        "location": item.location,
        "latitude": item.latitude,
        "longitude": item.longitude,

        "item_date": (
            str(item.item_date)
            if item.item_date
            else None
        ),

        "image_name": item.image_name,

        "image_url": image_url(
            item.image_name
        ),

        "image_exists": image_exists(
            item.image_name
        ),

        "item_status": item.status or "active"
    }


def normalize_text(value):
    """
    Normalizes text for comparisons.
    """

    if not value:
        return ""

    return " ".join(
        value.strip().lower().split()
    )

def calculate_distance_km(
    lat1,
    lon1,
    lat2,
    lon2
):
    """
    Calculate distance between two GPS coordinates
    using the Haversine formula.
    """

    if (
        lat1 is None
        or lon1 is None
        or lat2 is None
        or lon2 is None
    ):
        return None


    R = 6371.0

    lat1 = radians(lat1)
    lat2 = radians(lat2)

    dlat = lat2 - lat1
    dlon = radians(lon2 - lon1)


    a = (
        sin(dlat / 2) ** 2
        +
        cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )


    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )


    return R * c
# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "status": "success",
        "message": "FastAPI connected to MySQL!",
        "service": "AI-Powered Lost & Found Matching System"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "success",
        "message": "Backend is running"
    }


# =========================================================
# SIGNUP
# =========================================================

@app.post("/signup")
def signup(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):

    name = name.strip()
    email = email.strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty."
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email cannot be empty."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters."
        )

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered."
        )

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    new_user = User(
        name=name,
        email=email,
        password_hash=password_hash
    )

    try:

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Unable to create account: {str(e)}"
        )

    return {
        "status": "success",
        "message": "Account created successfully!",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email
    }


# =========================================================
# LOGIN
# =========================================================

@app.post("/login")
def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):

    email = email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    try:

        password_match = bcrypt.checkpw(
            password.encode("utf-8"),
            user.password_hash.encode("utf-8")
        )

    except Exception:

        password_match = False

    if not password_match:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    return {
        "status": "success",
        "message": "Login successful!",
        "user_id": user.id,
        "name": user.name,
        "email": user.email
    }


# =========================================================
# REPORT LOST / FOUND ITEM
# =========================================================

@app.post("/report-item")
async def report_item(
    user_id: int = Form(...),
    item_type: str = Form(...),
    item_name: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    color: str = Form(""),
    brand: str = Form(""),
    location: str = Form(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    date: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # VALIDATE USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User account not found."
        )

    # -----------------------------------------------------
    # VALIDATE ITEM TYPE
    # -----------------------------------------------------

    item_type = item_type.strip().lower()

    if item_type not in ["lost", "found"]:

        raise HTTPException(
            status_code=400,
            detail="Item type must be lost or found."
        )

    # -----------------------------------------------------
    # CLEAN TEXT
    # -----------------------------------------------------

    item_name = item_name.strip()
    category = category.strip()
    description = description.strip()
    color = color.strip()
    brand = brand.strip()
    location = location.strip()

    # -----------------------------------------------------
    # REQUIRED FIELDS
    # -----------------------------------------------------

    if not item_name:
        raise HTTPException(
            status_code=400,
            detail="Item name is required."
        )

    if not category:
        raise HTTPException(
            status_code=400,
            detail="Category is required."
        )

    if not description:
        raise HTTPException(
            status_code=400,
            detail="Description is required."
        )

    if not location:
        raise HTTPException(
            status_code=400,
            detail="Location is required."
        )

    # -----------------------------------------------------
    # VALIDATE DATE
    # -----------------------------------------------------

    try:

        item_date = datetime.strptime(
            date,
            "%Y-%m-%d"
        ).date()

    except ValueError:

        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    # -----------------------------------------------------
    # VALIDATE IMAGE
    # -----------------------------------------------------

    if not image.filename:

        raise HTTPException(
            status_code=400,
            detail="Image is required."
        )

    allowed_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    }

    original_filename = image.filename

    extension = os.path.splitext(
        original_filename
    )[1].lower()

    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only JPG, JPEG, PNG and WEBP "
                "images are allowed."
            )
        )

    # -----------------------------------------------------
    # GENERATE UNIQUE FILENAME
    # -----------------------------------------------------

    unique_filename = (
        f"{uuid.uuid4().hex}{extension}"
    )

    image_path = os.path.join(
        UPLOAD_DIR,
        unique_filename
    )

    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    try:

        with open(
            image_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                image.file,
                buffer
            )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to save image: {str(e)}"
        )

    finally:

        await image.close()

    # -----------------------------------------------------
    # UPLOAD IMAGE TO CLOUDINARY
    # -----------------------------------------------------

    try:

        cloudinary.uploader.upload(
            image_path,
            public_id=get_cloudinary_public_id(
                unique_filename
            ),
            resource_type="image",
            overwrite=True
        )

    except Exception as e:

        if os.path.exists(image_path):
            os.remove(image_path)

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to upload image to Cloudinary: "
                f"{str(e)}"
            )
        )

    # -----------------------------------------------------
    # SAVE ITEM
    # -----------------------------------------------------

    new_item = Item(
        user_id=user_id,
        item_type=item_type,
        item_name=item_name,
        category=category,
        description=description,
        color=color,
        brand=brand,
        location=location,

        latitude=latitude,
        longitude=longitude,

        item_date=item_date,
        image_name=unique_filename
    )

    try:

        db.add(new_item)

        db.commit()

        db.refresh(new_item)

    except Exception as e:

        db.rollback()

        if os.path.exists(image_path):

            os.remove(image_path)

        raise HTTPException(
            status_code=500,
            detail=f"Unable to save item: {str(e)}"
        )

    return {
        "status": "success",
        "message": (
            f"{item_type.capitalize()} "
            "item saved successfully!"
        ),
        "item_id": new_item.id,
        "user_id": new_item.user_id,
        "image_name": new_item.image_name,
        "image_url": image_url(
            new_item.image_name
        )
    }


# =========================================================
# GET ALL ITEMS
# =========================================================

@app.get("/items")
def get_items(
    db: Session = Depends(get_db)
):

    items = (
        db.query(Item)
        .order_by(Item.id.desc())
        .all()
    )

    return [
        serialize_item(item)
        for item in items
    ]


# =========================================================
# SMART SEARCH & FILTERS
# =========================================================

@app.get("/items/search")
def search_items(
    q: str = "",
    item_type: str = "",
    category: str = "",
    color: str = "",
    brand: str = "",
    location: str = "",
    latitude: float | None = None,
    longitude: float | None = None,
    max_distance_km: float | None = None,
    date_from: str = "",
    date_to: str = "",
    db: Session = Depends(get_db)
):
    """
    Real-world item search endpoint.
    Supports text, type, category, color, brand, location,
    date range and optional GPS-radius filtering.
    """

    query = db.query(Item)

    item_type = normalize_text(item_type)
    category = normalize_text(category)
    color = normalize_text(color)
    brand = normalize_text(brand)
    location = normalize_text(location)
    q = normalize_text(q)

    if item_type in ["lost", "found"]:
        query = query.filter(Item.item_type == item_type)

    if category:
        query = query.filter(Item.category.ilike(f"%{category}%"))

    if color:
        query = query.filter(Item.color.ilike(f"%{color}%"))

    if brand:
        query = query.filter(Item.brand.ilike(f"%{brand}%"))

    if location:
        query = query.filter(Item.location.ilike(f"%{location}%"))

    if date_from:
        try:
            parsed_from = datetime.strptime(date_from, "%Y-%m-%d").date()
            query = query.filter(Item.item_date >= parsed_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="date_from must use YYYY-MM-DD.")

    if date_to:
        try:
            parsed_to = datetime.strptime(date_to, "%Y-%m-%d").date()
            query = query.filter(Item.item_date <= parsed_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="date_to must use YYYY-MM-DD.")

    items = query.order_by(Item.id.desc()).all()
    results = []

    for item in items:
        if q:
            searchable = normalize_text(" ".join([
                item.item_name or "",
                item.description or "",
                item.category or "",
                item.color or "",
                item.brand or "",
                item.location or ""
            ]))
            if not all(token in searchable for token in q.split()):
                continue

        distance_km = None
        if latitude is not None and longitude is not None:
            distance_km = calculate_distance_km(
                latitude, longitude, item.latitude, item.longitude
            )
            if max_distance_km is not None:
                if distance_km is None or distance_km > max_distance_km:
                    continue

        result = serialize_item(item)
        result["distance_km"] = round(distance_km, 2) if distance_km is not None else None
        results.append(result)

    return {
        "status": "success",
        "count": len(results),
        "filters": {
            "q": q,
            "item_type": item_type or None,
            "category": category or None,
            "color": color or None,
            "brand": brand or None,
            "location": location or None,
            "latitude": latitude,
            "longitude": longitude,
            "max_distance_km": max_distance_km,
            "date_from": date_from or None,
            "date_to": date_to or None
        },
        "items": results
    }


# =========================================================
# ITEM STATUS
# =========================================================

# =========================================================
# ITEM STATUS TRACKING
# =========================================================

def get_item_status(db, item):

    if item.status == "returned":
        return "returned"

    if item.status == "ownership_verified":
        return "ownership_verified"

    latest_request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.item_id == item.id
        )
        .order_by(
            VerificationRequest.id.desc()
        )
        .first()
    )

    if latest_request:

        if latest_request.status == "pending":
            return "claim_pending"

        if latest_request.status == "approved":
            return "ownership_verified"

        if latest_request.status == "rejected":
            return item.status or "active"

    return item.status or "active"


@app.get("/items/{item_id}/status")
def get_item_status_endpoint(
    item_id: int,
    db: Session = Depends(get_db)
):

    item = (
        db.query(Item)
        .filter(Item.id == item_id)
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    current_status = get_item_status(
        db,
        item
    )

    return {
        "status": "success",
        "item_id": item.id,
        "item_type": item.item_type,
        "item_status": current_status
    }



@app.put("/items/{item_id}/returned")
def mark_item_returned(
    item_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # FIND ITEM
    # -----------------------------------------------------

    item = (
        db.query(Item)
        .filter(
            Item.id == item_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    # -----------------------------------------------------
    # ONLY REPORTER CAN MARK RETURNED
    # -----------------------------------------------------

    if item.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to update this item."
        )

    # -----------------------------------------------------
    # CHECK CURRENT STATUS
    # -----------------------------------------------------

    current_status = get_item_status(
        db,
        item
    )

    if current_status != "ownership_verified":
        raise HTTPException(
            status_code=400,
            detail=(
                "Only an ownership-verified item "
                "can be marked as returned."
            )
        )

    # -----------------------------------------------------
    # FIND APPROVED CLAIM
    # -----------------------------------------------------

    approved_request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.item_id == item.id,
            VerificationRequest.status == "approved"
        )
        .order_by(
            VerificationRequest.id.desc()
        )
        .first()
    )

    # -----------------------------------------------------
    # MARK ITEM RETURNED
    # -----------------------------------------------------

    item.status = "returned"

    db.commit()
    db.refresh(item)

    # -----------------------------------------------------
    # NOTIFY CLAIMANT
    # -----------------------------------------------------

    if approved_request:

        notification = Notification(
            user_id=approved_request.claimant_id,
            item_id=item.id,
            title="Item Returned",
            message=(
                f"Your ownership-verified item "
                f"'{item.item_name}' has been marked "
                f"as returned by the finder."
            ),
            notification_type="item_returned",
            is_read=0
        )

        try:
            db.add(notification)
            db.commit()

        except Exception:
            db.rollback()

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "status": "success",
        "message": "Item marked as returned successfully.",
        "item_id": item.id,
        "item_status": "returned"
    }
# =========================================================
# GET MY ITEMS
# =========================================================

@app.get("/my-items/{user_id}")
def get_my_items(
    user_id: int,
    db: Session = Depends(get_db)
):

    items = (
        db.query(Item)
        .filter(
            Item.user_id == user_id
        )
        .order_by(
            Item.id.desc()
        )
        .all()
    )

    return [
        serialize_item(item)
        for item in items
    ]


# =========================================================
# GET SINGLE ITEM
# =========================================================

@app.get("/items/{item_id}")
def get_item(
    item_id: int,
    db: Session = Depends(get_db)
):

    item = (
        db.query(Item)
        .filter(
            Item.id == item_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    return serialize_item(item)


# =========================================================
# =========================================================
# AI MATCHING + LOCATION-BASED MATCHING
# =========================================================

# =========================================================
# BETTER AI MATCHING
# =========================================================


def _match_tokens(value):
    """Return useful normalized words for lightweight text matching."""
    text = normalize_text(value or "")
    return {
        token for token in text.replace("-", " ").split()
        if len(token) >= 2
    }


def _field_similarity(value_a, value_b):
    """Lightweight similarity without adding another heavy ML dependency."""
    from difflib import SequenceMatcher

    a = normalize_text(value_a or "")
    b = normalize_text(value_b or "")

    if not a or not b:
        return 0.0
    if a == b:
        return 1.0

    token_a = _match_tokens(a)
    token_b = _match_tokens(b)
    token_score = (
        len(token_a & token_b) / len(token_a | token_b)
        if token_a and token_b else 0.0
    )
    sequence_score = SequenceMatcher(None, a, b).ratio()
    return max(token_score, sequence_score * 0.85)


def _combined_text_score(item_a, item_b):
    """Compare the most useful textual fields with field-specific weights."""
    fields = [
        (item_a.item_name, item_b.item_name, 0.35),
        (item_a.description, item_b.description, 0.35),
        (item_a.color, item_b.color, 0.15),
        (item_a.brand, item_b.brand, 0.15),
    ]

    total = 0.0
    weight_used = 0.0
    for value_a, value_b, weight in fields:
        if normalize_text(value_a) and normalize_text(value_b):
            total += _field_similarity(value_a, value_b) * weight
            weight_used += weight

    if weight_used == 0:
        return 0.0
    return round((total / weight_used) * 100, 2)


def _date_score(date_a, date_b):
    """Give a small boost when lost/found dates are close."""
    if not date_a or not date_b:
        return 0.0

    try:
        days = abs((date_a - date_b).days)
    except Exception:
        return 0.0

    if days == 0:
        return 100.0
    if days <= 1:
        return 90.0
    if days <= 3:
        return 75.0
    if days <= 7:
        return 55.0
    if days <= 14:
        return 30.0
    return 10.0


@app.get("/match/{item_id}")
def match_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    current_item = db.query(Item).filter(Item.id == item_id).first()
    if not current_item:
        raise HTTPException(status_code=404, detail="Item not found.")

    current_type = normalize_text(current_item.item_type)
    if current_type == "lost":
        target_type = "found"
    elif current_type == "found":
        target_type = "lost"
    else:
        raise HTTPException(status_code=400, detail="Item type must be lost or found.")

    candidate_items = (
        db.query(Item)
        .filter(Item.item_type == target_type)
        .all()
    )

    matches = []
    current_image_path = ensure_local_image(current_item.image_name)

    for candidate_item in candidate_items:
        reasons = []

        # -------------------------------------------------
        # 1. Improved text matching
        # -------------------------------------------------
        text_score = _combined_text_score(current_item, candidate_item)

        if text_score >= 85:
            reasons.append("✓ Very strong text similarity")
        elif text_score >= 65:
            reasons.append("✓ Strong text similarity")
        elif text_score >= 45:
            reasons.append("✓ Moderate text similarity")
        elif text_score > 0:
            reasons.append("⚠ Limited text similarity")

        # -------------------------------------------------
        # 2. Lightweight image matching
        # -------------------------------------------------
        image_score = 0.0
        candidate_image_path = ensure_local_image(candidate_item.image_name)
        image_available = bool(current_image_path and candidate_image_path)

        if image_available:
            try:
                image_similarity = calculate_image_similarity(
                    current_image_path,
                    candidate_image_path
                )
                image_score = round(
                    max(0.0, min(1.0, image_similarity)) * 100,
                    2
                )
            except Exception:
                image_score = 0.0

        if image_score >= 90:
            reasons.append("✓ Very strong image similarity")
        elif image_score >= 75:
            reasons.append("✓ Strong image similarity")
        elif image_score >= 55:
            reasons.append("✓ Moderate image similarity")
        elif image_score > 0:
            reasons.append("⚠ Low image similarity")
        else:
            reasons.append("⚠ Image unavailable for comparison")

        # -------------------------------------------------
        # 3. Field-by-field metadata matching
        # -------------------------------------------------
        metadata_parts = []
        metadata_weights = {
            "category": 30,
            "color": 20,
            "brand": 20,
            "location": 20,
            "item_name": 10,
        }

        field_pairs = {
            "category": (current_item.category, candidate_item.category),
            "color": (current_item.color, candidate_item.color),
            "brand": (current_item.brand, candidate_item.brand),
            "location": (current_item.location, candidate_item.location),
            "item_name": (current_item.item_name, candidate_item.item_name),
        }

        metadata_score = 0.0
        available_weight = 0.0

        for field, (value_a, value_b) in field_pairs.items():
            if not normalize_text(value_a) or not normalize_text(value_b):
                continue

            weight = metadata_weights[field]
            available_weight += weight
            similarity = _field_similarity(value_a, value_b)
            metadata_parts.append((field, similarity, weight))

        if available_weight:
            metadata_score = sum(
                similarity * weight * 100
                for _, similarity, weight in metadata_parts
            ) / available_weight
            metadata_score = round(min(100.0, metadata_score), 2)

        for field, similarity, _ in metadata_parts:
            if similarity >= 0.95:
                label = {
                    "category": "Category matches",
                    "color": "Color matches",
                    "brand": "Brand matches",
                    "location": "Location matches",
                    "item_name": "Item name matches",
                }[field]
                reasons.append(label)

        # -------------------------------------------------
        # 4. GPS location matching
        # -------------------------------------------------
        distance_km = calculate_distance_km(
            current_item.latitude,
            current_item.longitude,
            candidate_item.latitude,
            candidate_item.longitude
        )

        location_score = 0.0
        if distance_km is not None:
            if distance_km <= 0.5:
                location_score = 100.0
            elif distance_km <= 1.0:
                location_score = 80.0
            elif distance_km <= 3.0:
                location_score = 60.0
            elif distance_km <= 5.0:
                location_score = 35.0
            else:
                location_score = 0.0

            reasons.append(f"📍 {round(distance_km, 2)} km away")

        # -------------------------------------------------
        # 5. Date proximity
        # -------------------------------------------------
        date_score = _date_score(
            current_item.item_date,
            candidate_item.item_date
        )

        if date_score >= 90:
            reasons.append("✓ Very close report date")
        elif date_score >= 55:
            reasons.append("✓ Report dates are reasonably close")

        # -------------------------------------------------
        # 6. Final combined score
        # -------------------------------------------------
        # Image 30% + text 30% + metadata 25% + location 10% + date 5%
        final_score = (
            (image_score * 0.30)
            + (text_score * 0.30)
            + (metadata_score * 0.25)
            + (location_score * 0.10)
            + (date_score * 0.05)
        )
        final_score = round(max(0.0, min(100.0, final_score)), 2)

        if final_score >= 85:
            match_level = "Very High"
        elif final_score >= 70:
            match_level = "High"
        elif final_score >= 50:
            match_level = "Possible"
        else:
            match_level = "Low"

        matches.append({
            "item_id": candidate_item.id,
            "user_id": candidate_item.user_id,
            "item_name": candidate_item.item_name,
            "item_type": candidate_item.item_type,
            "category": candidate_item.category,
            "description": candidate_item.description,
            "color": candidate_item.color,
            "brand": candidate_item.brand,
            "location": candidate_item.location,
            "latitude": candidate_item.latitude,
            "longitude": candidate_item.longitude,
            "distance_km": round(distance_km, 2) if distance_km is not None else None,
            "item_date": str(candidate_item.item_date) if candidate_item.item_date else None,
            "image_name": candidate_item.image_name,
            "image_url": image_url(candidate_item.image_name),
            "image_similarity": image_score,
            "text_similarity": text_score,
            "metadata_score": metadata_score,
            "location_score": location_score,
            "date_score": date_score,
            "match_score": final_score,
            "match_level": match_level,
            "image_available": image_available,
            "item_status": get_item_status(db, candidate_item),
            "reasons": reasons,
        })

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    strong_matches = [m for m in matches if m["match_score"] >= 50]

    if not strong_matches:
        return {
            "status": "success",
            "item_id": current_item.id,
            "item_type": current_item.item_type,
            "searching_for": target_type,
            "matches": [],
            "message": f"No strong {target_type} match found."
        }

    return {
        "status": "success",
        "item_id": current_item.id,
        "item_type": current_item.item_type,
        "searching_for": target_type,
        "match_count": len(strong_matches),
        "matches": strong_matches,
    }


# FEATURE 3
# SEND MESSAGE TO ITEM REPORTER
# =========================================================

@app.post("/messages/send")
def send_message(
    sender_id: int = Form(...),
    item_id: int = Form(...),
    message: str = Form(...),
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # CLEAN MESSAGE
    # -----------------------------------------------------

    message = message.strip()

    if not message:

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    if len(message) > 2000:

        raise HTTPException(
            status_code=400,
            detail="Message is too long."
        )

    # -----------------------------------------------------
    # CHECK SENDER
    # -----------------------------------------------------

    sender = (
        db.query(User)
        .filter(
            User.id == sender_id
        )
        .first()
    )

    if not sender:

        raise HTTPException(
            status_code=404,
            detail="Sender account not found."
        )

    # -----------------------------------------------------
    # CHECK ITEM
    # -----------------------------------------------------

    item = (
        db.query(Item)
        .filter(
            Item.id == item_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    # -----------------------------------------------------
    # GET ITEM REPORTER
    # -----------------------------------------------------

    receiver_id = item.user_id

    if not receiver_id:

        raise HTTPException(
            status_code=400,
            detail="Reporter information is not available."
        )

    # -----------------------------------------------------
    # PREVENT SELF MESSAGE
    # -----------------------------------------------------

    if sender_id == receiver_id:

        raise HTTPException(
            status_code=400,
            detail="You cannot message yourself."
        )

    # -----------------------------------------------------
    # CHECK RECEIVER
    # -----------------------------------------------------

    receiver = (
        db.query(User)
        .filter(
            User.id == receiver_id
        )
        .first()
    )

    if not receiver:

        raise HTTPException(
            status_code=404,
            detail="Reporter account not found."
        )

    # -----------------------------------------------------
    # CREATE MESSAGE
    # -----------------------------------------------------

    new_message = Message(
        sender_id=sender_id,
        receiver_id=receiver_id,
        item_id=item_id,
        message=message
    )

    try:

        db.add(new_message)
        db.commit()
        db.refresh(new_message)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Unable to send message: {str(e)}"
        )

    # -----------------------------------------------------
    # CREATE NOTIFICATION FOR REPORTER
    # -----------------------------------------------------

    notification = Notification(

        user_id=receiver_id,

        item_id=item_id,

        title="New Message",

        message=(
            f"{sender.name} sent you a message "
            f"about your reported item."
        ),

        notification_type="message",

        is_read=0
    )

    try:

        db.add(notification)
        db.commit()

    except Exception:

        db.rollback()

        # Message was already successfully saved.
        # Notification failure should not delete the message.

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {

        "status": "success",

        "message":
            "Message sent successfully.",

        "message_id":
            new_message.id,

        "item_id":
            item_id,

        "sender_id":
            sender_id,

        "receiver_id":
            receiver_id,

        "created_at":
            (
                str(new_message.created_at)
                if new_message.created_at
                else None
            )
    }



# =========================================================
# GET MESSAGES
# =========================================================

# =========================================================
# GET MESSAGES - TWO USER CONVERSATION
# =========================================================

@app.get("/messages/{user_id}/{item_id}")
def get_messages(
    user_id: int,
    item_id: int,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # CHECK CURRENT ITEM
    # -----------------------------------------------------

    item = (
        db.query(Item)
        .filter(Item.id == item_id)
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    # -----------------------------------------------------
    # GET THE OTHER USER
    # -----------------------------------------------------

    other_user_id = item.user_id

    if not other_user_id:
        raise HTTPException(
            status_code=400,
            detail="Reporter information is not available."
        )

    # -----------------------------------------------------
    # GET ALL MESSAGES BETWEEN THESE TWO USERS
    # -----------------------------------------------------
    # IMPORTANT:
    # Do NOT filter only by item_id.
    # The conversation belongs to the two users.

    messages = (
        db.query(Message)
        .filter(
            (
                (
                    (Message.sender_id == user_id)
                    &
                    (Message.receiver_id == other_user_id)
                )
                |
                (
                    (Message.sender_id == other_user_id)
                    &
                    (Message.receiver_id == user_id)
                )
            )
        )
        .order_by(
            Message.id.asc()
        )
        .all()
    )

    result = []

    for message in messages:

        sender = (
            db.query(User)
            .filter(
                User.id == message.sender_id
            )
            .first()
        )

        receiver = (
            db.query(User)
            .filter(
                User.id == message.receiver_id
            )
            .first()
        )

        result.append({

            "id": message.id,

            "sender_id":
                message.sender_id,

            "sender_name":
                sender.name
                if sender
                else "Unknown",

            "receiver_id":
                message.receiver_id,

            "receiver_name":
                receiver.name
                if receiver
                else "Unknown",

            "item_id":
                message.item_id,

            "message":
                message.message,

            "created_at":
                (
                    str(message.created_at)
                    if message.created_at
                    else None
                )
        })

    return {
        "status": "success",
        "messages": result
    }

# =========================================================
# FEATURE 4
# OWNERSHIP VERIFICATION REQUEST
# =========================================================

@app.post("/verification/request")
def create_verification_request(
    item_id: int,
    claimant_id: int,
    proof: str,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # CLEAN PROOF
    # -----------------------------------------------------

    proof = proof.strip()

    if not proof:

        raise HTTPException(
            status_code=400,
            detail="Verification proof is required."
        )

    if len(proof) > 5000:

        raise HTTPException(
            status_code=400,
            detail="Verification proof is too long."
        )

    # -----------------------------------------------------
    # FIND ITEM
    # -----------------------------------------------------

    item = (
        db.query(Item)
        .filter(
            Item.id == item_id
        )
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    # -----------------------------------------------------
    # ONLY FOUND ITEMS CAN RECEIVE OWNERSHIP CLAIMS
    # -----------------------------------------------------

    if item.item_type.lower() != "found":

        raise HTTPException(
            status_code=400,
            detail=(
                "Ownership claims can only be "
                "submitted for found items."
            )
        )

    # -----------------------------------------------------
    # FOUND ITEM MUST HAVE REPORTER
    # -----------------------------------------------------

    if not item.user_id:

        raise HTTPException(
            status_code=400,
            detail="This item has no reporter account."
        )

    # -----------------------------------------------------
    # CHECK CLAIMANT
    # -----------------------------------------------------

    claimant = (
        db.query(User)
        .filter(
            User.id == claimant_id
        )
        .first()
    )

    if not claimant:

        raise HTTPException(
            status_code=404,
            detail="Claimant account not found."
        )

    # -----------------------------------------------------
    # PREVENT OWNER CLAIMING THEIR OWN FOUND ITEM
    # -----------------------------------------------------

    if claimant_id == item.user_id:

        raise HTTPException(
            status_code=400,
            detail="You cannot claim your own found item."
        )

    # -----------------------------------------------------
    # CHECK DUPLICATE PENDING REQUEST
    # -----------------------------------------------------

    existing_request = (

        db.query(
            VerificationRequest
        )

        .filter(

            VerificationRequest.item_id
            == item_id,

            VerificationRequest.claimant_id
            == claimant_id,

            VerificationRequest.status
            == "pending"

        )

        .first()
    )

    if existing_request:

        raise HTTPException(
            status_code=400,
            detail=(
                "A verification request is "
                "already pending."
            )
        )

    # -----------------------------------------------------
    # REPORTER = PERSON WHO FOUND THE ITEM
    # -----------------------------------------------------

    reporter_id = item.user_id

    # -----------------------------------------------------
    # CREATE VERIFICATION REQUEST
    # -----------------------------------------------------

    request = VerificationRequest(

        item_id=item_id,

        claimant_id=claimant_id,

        reporter_id=reporter_id,

        proof=proof,

        status="pending"
    )

    try:

        db.add(request)

        # Item is now waiting for ownership verification
        item.status = "claim_pending"

        db.commit()
        db.refresh(request)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create verification request: "
                f"{str(e)}"
            )
        )

    # -----------------------------------------------------
    # NOTIFY FOUND-ITEM REPORTER
    # -----------------------------------------------------

    notification = Notification(

        user_id=reporter_id,

        item_id=item_id,

        title="New Ownership Claim",

        message=(
            f"{claimant.name} has submitted "
            f"an ownership claim for your found item "
            f"'{item.item_name}'."
        ),

        notification_type="verification",

        is_read=0
    )

    try:

        db.add(notification)

        db.commit()

    except Exception:

        db.rollback()

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {

        "status": "success",

        "message":
            "Ownership verification request submitted.",

        "request_id":
            request.id,

        "item_id":
            request.item_id,

        "claimant_id":
            request.claimant_id,

        "reporter_id":
            request.reporter_id,

        "status":
            request.status
    }


# =========================================================
# GET VERIFICATION REQUESTS FOR USER
# =========================================================

@app.get("/verification/user/{user_id}")
def get_verification_requests(
    user_id: int,
    db: Session = Depends(get_db)
):

    requests = (

        db.query(
            VerificationRequest
        )

        .filter(

            (
                VerificationRequest.claimant_id
                == user_id
            )

            |

            (
                VerificationRequest.reporter_id
                == user_id
            )

        )

        .order_by(
            VerificationRequest.id.desc()
        )

        .all()
    )

    result = []

    for request in requests:

        item = (
            db.query(Item)
            .filter(
                Item.id == request.item_id
            )
            .first()
        )

        claimant = (
            db.query(User)
            .filter(
                User.id == request.claimant_id
            )
            .first()
        )

        reporter = (
            db.query(User)
            .filter(
                User.id == request.reporter_id
            )
            .first()
        )

        result.append({

            "id":
                request.id,

            "item_id":
                request.item_id,

            "item_name":
                (
                    item.item_name
                    if item
                    else "Unknown Item"
                ),

            "item_type":
                (
                    item.item_type
                    if item
                    else None
                ),

            "claimant_id":
                request.claimant_id,

            "claimant_name":
                (
                    claimant.name
                    if claimant
                    else "Unknown User"
                ),

            "claimant_email":
                (
                    claimant.email
                    if claimant
                    else None
                ),

            "reporter_id":
                request.reporter_id,

            "reporter_name":
                (
                    reporter.name
                    if reporter
                    else "Unknown User"
                ),

            "proof":
                request.proof,

            "status":
                request.status,

            "response_message":
                request.response_message,

            "created_at":
                (
                    str(request.created_at)
                    if request.created_at
                    else None
                )
        })

    return {

        "status": "success",

        "requests":
            result
    }


# =========================================================
# RESPOND TO OWNERSHIP CLAIM
# =========================================================

@app.put("/verification/{request_id}/respond")
def respond_to_verification(
    request_id: int,
    reporter_id: int,
    status: str,
    response_message: str = "",
    db: Session = Depends(get_db)
):

    status = status.strip().lower()

    response_message = (
        response_message.strip()
    )

    # -----------------------------------------------------
    # VALID STATUS
    # -----------------------------------------------------

    if status not in [
        "approved",
        "rejected"
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be approved "
                "or rejected."
            )
        )

    # -----------------------------------------------------
    # FIND REQUEST
    # -----------------------------------------------------

    request = (

        db.query(
            VerificationRequest
        )

        .filter(

            VerificationRequest.id
            == request_id,

            VerificationRequest.reporter_id
            == reporter_id

        )

        .first()
    )

    if not request:

        raise HTTPException(
            status_code=404,
            detail="Verification request not found."
        )

    # -----------------------------------------------------
    # ONLY PENDING REQUESTS
    # -----------------------------------------------------

    if request.status != "pending":

        raise HTTPException(
            status_code=400,
            detail=(
                "This verification request "
                "has already been processed."
            )
        )

    # -----------------------------------------------------
    # UPDATE REQUEST
    # -----------------------------------------------------

    request.status = status

    # -----------------------------------------------------
    # UPDATE ITEM STATUS
    # -----------------------------------------------------

    item = (
        db.query(Item)
        .filter(
            Item.id == request.item_id
        )
        .first()
    )

    if item:

        if status == "approved":
            item.status = "ownership_verified"

        elif status == "rejected":
            item.status = "active"

    request.response_message = (
        response_message
        if response_message
        else (
            "Your ownership verification "
            "was approved."
            if status == "approved"
            else
            "Your ownership verification "
            "was rejected."
        )
    )

    try:

        db.commit()

        db.refresh(request)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to process verification: "
                f"{str(e)}"
            )
        )

    # -----------------------------------------------------
    # NOTIFY CLAIMANT
    # -----------------------------------------------------

    notification = Notification(

        user_id=request.claimant_id,

        item_id=request.item_id,

        title=(
            "Ownership Claim Approved"
            if status == "approved"
            else
            "Ownership Claim Rejected"
        ),

        message=request.response_message,

        notification_type=
            "verification_response",

        is_read=0
    )

    try:

        db.add(notification)

        db.commit()

    except Exception:

        db.rollback()

    # -----------------------------------------------------
    # IMPORTANT:
    #
    # DO NOT CHANGE item.user_id
    #
    # The found-item reporter remains the
    # reporter/owner of the found report.
    # -----------------------------------------------------

    return {

        "status": "success",

        "message":
            "Verification response saved.",

        "request_id":
            request.id,

        "item_id":
            request.item_id,

        "claimant_id":
            request.claimant_id,

        "reporter_id":
            request.reporter_id,

        "status":
            request.status,

        "response_message":
            request.response_message
    }



# =========================================================
# GET USER NOTIFICATIONS
# =========================================================

@app.get("/notifications/{user_id}")
def get_notifications(
    user_id: int,
    db: Session = Depends(get_db)
):

    notifications = (

        db.query(Notification)

        .filter(
            Notification.user_id == user_id
        )

        .order_by(
            Notification.id.desc()
        )

        .all()
    )

    return {

        "status": "success",

        "notifications": [

            {
                "id": notification.id,

                "user_id":
                    notification.user_id,

                "item_id":
                    notification.item_id,

                "title":
                    notification.title,

                "message":
                    notification.message,

                "notification_type":
                    notification.notification_type,

                "is_read":
                    notification.is_read,

                "created_at":
                    (
                        str(notification.created_at)
                        if notification.created_at
                        else None
                    )
            }

            for notification in notifications
        ]
    }


# =========================================================
# MARK NOTIFICATION AS READ
# =========================================================

@app.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):

    notification = (

        db.query(Notification)

        .filter(

            Notification.id
            == notification_id,

            Notification.user_id
            == user_id

        )

        .first()
    )

    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Notification not found."
        )

    notification.is_read = 1

    db.commit()

    return {

        "status": "success",

        "message":
            "Notification marked as read."
    }
# =========================================================
# NOTIFICATION CENTER - BATCH 2
# =========================================================

@app.get("/notifications/{user_id}/unread-count")
def get_unread_notification_count(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Return the number of unread notifications for a user."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == 0
        )
        .count()
    )

    return {
        "status": "success",
        "user_id": user_id,
        "unread_count": count
    }


@app.put("/notifications/read-all/{user_id}")
def mark_all_notifications_read(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Mark every unread notification belonging to this user as read."""
    updated = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == 0
        )
        .update(
            {Notification.is_read: 1},
            synchronize_session=False
        )
    )

    db.commit()

    return {
        "status": "success",
        "message": "All notifications marked as read.",
        "updated_count": updated
    }


@app.post("/notifications/check-matches/{user_id}")
def create_match_notifications(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Check the user's reports against opposite item types and create
    notifications for strong matches. Existing identical match
    notifications are not duplicated.
    """
    user_items = (
        db.query(Item)
        .filter(Item.user_id == user_id)
        .order_by(Item.id.desc())
        .all()
    )

    created = []

    for item in user_items:
        try:
            result = match_item(item.id, db)
        except Exception:
            continue

        for match in result.get("matches", []):
            score = float(match.get("match_score") or 0)
            if score < 70:
                continue

            other_user_id = match.get("user_id")
            if not other_user_id or other_user_id == user_id:
                continue

            item_id = match.get("item_id")
            title = "Potential Match Found"
            message = (
                f"Your {item.item_type} report '{item.item_name}' has a "
                f"{score:.0f}% match with '{match.get('item_name', 'an item')}'."
            )

            # Notify the owner of the current report and the other report owner.
            recipients = {user_id, other_user_id}

            for recipient_id in recipients:
                duplicate = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == recipient_id,
                        Notification.item_id == item_id,
                        Notification.notification_type == "match",
                        Notification.message == message
                    )
                    .first()
                )

                if duplicate:
                    continue

                notification = Notification(
                    user_id=recipient_id,
                    item_id=item_id,
                    title=title,
                    message=message,
                    notification_type="match",
                    is_read=0
                )

                db.add(notification)
                created.append({
                    "user_id": recipient_id,
                    "item_id": item_id,
                    "match_score": score
                })

    db.commit()

    return {
        "status": "success",
        "created_count": len(created),
        "notifications": created
    }
