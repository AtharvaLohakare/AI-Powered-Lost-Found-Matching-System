from fastapi import (
    FastAPI,
    Form,
    UploadFile,
    File,
    Depends,
    HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy.orm import Session

import os
import shutil
import uuid
from datetime import datetime

import bcrypt

from .database import SessionLocal
from .models import Item, User, Message
from .text_matcher import calculate_text_similarity
from .image_matcher import calculate_image_similarity


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


# Serve uploaded images
app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)


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
    Returns the API-relative URL for an uploaded image.
    """
    if not filename:
        return None

    return f"/uploads/{filename}"


def image_exists(filename):
    """
    Checks whether an image physically exists on the
    current server.
    """
    if not filename:
        return False

    path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    return os.path.isfile(path)


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
        )
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
# AI MATCHING
# =========================================================

@app.get("/match/{item_id}")
def match_item(
    item_id: int,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # FIND LOST ITEM
    # -----------------------------------------------------

    lost_item = (
        db.query(Item)
        .filter(
            Item.id == item_id
        )
        .first()
    )

    if not lost_item:

        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    # -----------------------------------------------------
    # ONLY LOST ITEMS CAN START MATCHING
    # -----------------------------------------------------

    if normalize_text(
        lost_item.item_type
    ) != "lost":

        raise HTTPException(
            status_code=400,
            detail=(
                "Matching should be started "
                "from a lost item."
            )
        )

    # -----------------------------------------------------
    # GET FOUND ITEMS
    # -----------------------------------------------------

    found_items = (
        db.query(Item)
        .filter(
            Item.item_type == "found"
        )
        .all()
    )

    matches = []

    # -----------------------------------------------------
    # LOST TEXT
    # -----------------------------------------------------

    lost_text = " ".join([
        lost_item.item_name or "",
        lost_item.description or "",
        lost_item.color or "",
        lost_item.brand or ""
    ])

    # =====================================================
    # COMPARE FOUND ITEMS
    # =====================================================

    for found_item in found_items:

        # -------------------------------------------------
        # 1. TEXT SIMILARITY
        # -------------------------------------------------

        found_text = " ".join([
            found_item.item_name or "",
            found_item.description or "",
            found_item.color or "",
            found_item.brand or ""
        ])

        try:

            text_similarity = (
                calculate_text_similarity(
                    lost_text,
                    found_text
                )
            )

        except Exception:

            text_similarity = 0.0

        text_score = round(
            max(
                0.0,
                min(
                    1.0,
                    text_similarity
                )
            ) * 100,
            2
        )

        # -------------------------------------------------
        # 2. IMAGE SIMILARITY
        # -------------------------------------------------

        image_score = 0.0

        lost_image_path = None
        found_image_path = None

        if lost_item.image_name:

            lost_image_path = os.path.join(
                UPLOAD_DIR,
                lost_item.image_name
            )

        if found_item.image_name:

            found_image_path = os.path.join(
                UPLOAD_DIR,
                found_item.image_name
            )

        image_available = (
            bool(
                lost_image_path
                and found_image_path
                and os.path.isfile(
                    lost_image_path
                )
                and os.path.isfile(
                    found_image_path
                )
            )
        )

        if image_available:

            try:

                image_similarity = (
                    calculate_image_similarity(
                        lost_image_path,
                        found_image_path
                    )
                )

                image_score = round(
                    max(
                        0.0,
                        min(
                            1.0,
                            image_similarity
                        )
                    ) * 100,
                    2
                )

            except Exception:

                image_score = 0.0

        # -------------------------------------------------
        # 3. METADATA MATCHING
        # -------------------------------------------------

        metadata_score = 0.0

        reasons = []

        # Category = 25
        if (
            normalize_text(
                lost_item.category
            )
            and
            normalize_text(
                lost_item.category
            )
            ==
            normalize_text(
                found_item.category
            )
        ):

            metadata_score += 25

            reasons.append(
                "Category matches"
            )

        # Color = 20
        if (
            normalize_text(
                lost_item.color
            )
            and
            normalize_text(
                lost_item.color
            )
            ==
            normalize_text(
                found_item.color
            )
        ):

            metadata_score += 20

            reasons.append(
                "Color matches"
            )

        # Brand = 20
        if (
            normalize_text(
                lost_item.brand
            )
            and
            normalize_text(
                lost_item.brand
            )
            ==
            normalize_text(
                found_item.brand
            )
        ):

            metadata_score += 20

            reasons.append(
                "Brand matches"
            )

        # Location = 20
        if (
            normalize_text(
                lost_item.location
            )
            and
            normalize_text(
                lost_item.location
            )
            ==
            normalize_text(
                found_item.location
            )
        ):

            metadata_score += 20

            reasons.append(
                "Location matches"
            )

        # Item name = 15
        if (
            normalize_text(
                lost_item.item_name
            )
            and
            normalize_text(
                lost_item.item_name
            )
            ==
            normalize_text(
                found_item.item_name
            )
        ):

            metadata_score += 15

            reasons.append(
                "Item name matches"
            )

        metadata_score = min(
            metadata_score,
            100
        )

        # -------------------------------------------------
        # 4. IMAGE REASON
        # -------------------------------------------------

        if image_score >= 95:

            reasons.append(
                "✓ Very strong image similarity"
            )

        elif image_score >= 80:

            reasons.append(
                "✓ Strong image similarity"
            )

        elif image_score >= 60:

            reasons.append(
                "✓ Moderate image similarity"
            )

        elif image_score > 0:

            reasons.append(
                "⚠ Low image similarity"
            )

        else:

            reasons.append(
                "⚠ Image unavailable for comparison"
            )

        # -------------------------------------------------
        # 5. TEXT REASON
        # -------------------------------------------------

        if text_score >= 75:

            reasons.append(
                "✓ Strong description similarity"
            )

        elif text_score >= 50:

            reasons.append(
                "✓ Moderate description similarity"
            )

        elif text_score > 0:

            reasons.append(
                "⚠ Low description similarity"
            )

        else:

            reasons.append(
                "⚠ Limited description similarity"
            )

        # -------------------------------------------------
        # 6. METADATA REASON
        # -------------------------------------------------

        if metadata_score >= 75:

            reasons.append(
                "✓ Strong metadata match"
            )

        elif metadata_score >= 50:

            reasons.append(
                "✓ Moderate metadata match"
            )

        elif metadata_score > 0:

            reasons.append(
                "⚠ Partial metadata match"
            )

        else:

            reasons.append(
                "⚠ Limited metadata match"
            )

        # -------------------------------------------------
        # 7. FINAL SCORE
        # -------------------------------------------------

        final_score = (
            (image_score * 0.40)
            +
            (text_score * 0.30)
            +
            (metadata_score * 0.30)
        )

        final_score = round(
            final_score,
            2
        )

        # -------------------------------------------------
        # 8. STORE MATCH
        # -------------------------------------------------

        matches.append({

            "item_id":
                found_item.id,

            "user_id":
                found_item.user_id,

            "item_name":
                found_item.item_name,

            "item_type":
                found_item.item_type,

            "category":
                found_item.category,

            "description":
                found_item.description,

            "color":
                found_item.color,

            "brand":
                found_item.brand,

            "location":
                found_item.location,

            "item_date":
                (
                    str(found_item.item_date)
                    if found_item.item_date
                    else None
                ),

            "image_name":
                found_item.image_name,

            "image_url":
                image_url(
                    found_item.image_name
                ),

            "image_similarity":
                image_score,

            "text_similarity":
                text_score,

            "metadata_score":
                metadata_score,

            "match_score":
                final_score,

            "image_available":
                image_available,

            "reasons":
                reasons
        })

    # =====================================================
    # SORT
    # =====================================================

    matches.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    # =====================================================
    # FILTER
    # =====================================================

    strong_matches = [
        match
        for match in matches
        if match["match_score"] >= 50
    ]

    # =====================================================
    # NO MATCH
    # =====================================================

    if not strong_matches:

        return {
            "status": "success",
            "lost_item_id": lost_item.id,
            "matches": [],
            "message": "No strong match found."
        }

    # =====================================================
    # RETURN
    # =====================================================

    return {
        "status": "success",
        "lost_item_id": lost_item.id,
        "matches": strong_matches
    }


# =========================================================
# SEND MESSAGE
# =========================================================

@app.post("/messages/send")
def send_message(
    sender_id: int = Form(...),
    item_id: int = Form(...),
    message: str = Form(...),
    db: Session = Depends(get_db)
):

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
    # GET REPORTER
    # -----------------------------------------------------

    receiver_id = item.user_id

    if not receiver_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Reporter information "
                "is not available."
            )
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

    return {
        "status": "success",
        "message": "Message sent successfully.",
        "message_id": new_message.id,
        "item_id": item_id,
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "created_at": (
            str(new_message.created_at)
            if new_message.created_at
            else None
        )
    }


# =========================================================
# GET MESSAGES
# =========================================================

@app.get("/messages/{user_id}/{item_id}")
def get_messages(
    user_id: int,
    item_id: int,
    db: Session = Depends(get_db)
):

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
    # GET MESSAGES
    # -----------------------------------------------------

    messages = (
        db.query(Message)
        .filter(
            Message.item_id == item_id,
            (
                (Message.sender_id == user_id)
                |
                (Message.receiver_id == user_id)
            )
        )
        .order_by(
            Message.id.asc()
        )
        .all()
    )

    result = []

    for msg in messages:

        sender = (
            db.query(User)
            .filter(
                User.id == msg.sender_id
            )
            .first()
        )

        receiver = (
            db.query(User)
            .filter(
                User.id == msg.receiver_id
            )
            .first()
        )

        result.append({

            "id":
                msg.id,

            "sender_id":
                msg.sender_id,

            "sender_name":
                (
                    sender.name
                    if sender
                    else "Unknown User"
                ),

            "receiver_id":
                msg.receiver_id,

            "receiver_name":
                (
                    receiver.name
                    if receiver
                    else "Unknown User"
                ),

            "item_id":
                msg.item_id,

            "message":
                msg.message,

            "created_at":
                (
                    str(msg.created_at)
                    if msg.created_at
                    else None
                )
        })

    return {
        "status": "success",
        "messages": result
    }