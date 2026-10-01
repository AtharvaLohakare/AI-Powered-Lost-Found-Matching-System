
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
import bcrypt

from datetime import datetime
from math import radians, sin, cos, sqrt, atan2

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


# =========================================================
# SERVE UPLOADED IMAGES
# =========================================================

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
    Checks whether an image physically exists
    on the current server.
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
    Converts SQLAlchemy Item object into
    a JSON-friendly dictionary.
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
# METADATA SIMILARITY
# =========================================================

def calculate_metadata_similarity(item1, item2):
    """
    Calculates metadata similarity between two items.

    Category = 25%
    Color    = 20%
    Brand    = 20%
    Location = 20%
    Name     = 15%

    Total = 100%
    """

    score = 0.0

    # -----------------------------------------------------
    # CATEGORY
    # -----------------------------------------------------

    if (
        normalize_text(item1.category)
        and
        normalize_text(item2.category)
        and
        normalize_text(item1.category)
        ==
        normalize_text(item2.category)
    ):
        score += 25


    # -----------------------------------------------------
    # COLOR
    # -----------------------------------------------------

    if (
        normalize_text(item1.color)
        and
        normalize_text(item2.color)
        and
        normalize_text(item1.color)
        ==
        normalize_text(item2.color)
    ):
        score += 20


    # -----------------------------------------------------
    # BRAND
    # -----------------------------------------------------

    if (
        normalize_text(item1.brand)
        and
        normalize_text(item2.brand)
        and
        normalize_text(item1.brand)
        ==
        normalize_text(item2.brand)
    ):
        score += 20


    # -----------------------------------------------------
    # LOCATION
    # -----------------------------------------------------

    if (
        normalize_text(item1.location)
        and
        normalize_text(item2.location)
        and
        normalize_text(item1.location)
        ==
        normalize_text(item2.location)
    ):
        score += 20


    # -----------------------------------------------------
    # ITEM NAME
    # -----------------------------------------------------

    if (
        normalize_text(item1.item_name)
        and
        normalize_text(item2.item_name)
        and
        normalize_text(item1.item_name)
        ==
        normalize_text(item2.item_name)
    ):
        score += 15


    return score


# =========================================================
# GPS DISTANCE
# =========================================================

def calculate_distance_km(
    lat1,
    lon1,
    lat2,
    lon2
):
    """
    Calculates distance between two GPS coordinates
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
        *
        cos(lat2)
        *
        sin(dlon / 2) ** 2
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
# GET MY ITEMS
# =========================================================

@app.get("/my-items/{user_id}")
def get_my_items(
    user_id: int,
    db: Session = Depends(get_db)
):

    items = (
        db.query(Item)
        .filter(Item.user_id == user_id)
        .order_by(Item.id.desc())
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
        .filter(Item.id == item_id)
        .first()
    )

    if not item:

        raise HTTPException(
            status_code=404,
            detail="Item not found."
        )

    return serialize_item(item)


# =========================================================
# AI MATCHING + AUTOMATIC NOTIFICATIONS
# =========================================================

@app.get("/match/{item_id}")
def find_matches(
    item_id: int,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # GET CURRENT ITEM
    # -----------------------------------------------------

    current_item = (
        db.query(Item)
        .filter(Item.id == item_id)
        .first()
    )

    if not current_item:

        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )


    # -----------------------------------------------------
    # FIND OPPOSITE ITEM TYPE
    # -----------------------------------------------------

    opposite_type = (
        "found"
        if current_item.item_type == "lost"
        else "lost"
    )


    candidate_items = (
        db.query(Item)
        .filter(
            Item.item_type == opposite_type,
            Item.id != current_item.id
        )
        .all()
    )


    matches = []


    # =====================================================
    # CHECK EACH CANDIDATE
    # =====================================================

    for candidate in candidate_items:

        # -------------------------------------------------
        # IMAGE SCORE
        # -------------------------------------------------

        image_score = 0

        if (
            current_item.image_name
            and candidate.image_name
        ):

            try:

                current_image_path = os.path.join(
                    UPLOAD_DIR,
                    current_item.image_name
                )

                candidate_image_path = os.path.join(
                    UPLOAD_DIR,
                    candidate.image_name
                )

                if (
                    os.path.exists(current_image_path)
                    and
                    os.path.exists(candidate_image_path)
                ):

                    image_score = calculate_image_similarity(
                        current_image_path,
                        candidate_image_path
                    )

            except Exception as e:

                print(
                    "Image matching error:",
                    e
                )


        # -------------------------------------------------
        # TEXT SCORE
        # -------------------------------------------------

        current_text = " ".join([
            current_item.item_name or "",
            current_item.description or ""
        ])

        candidate_text = " ".join([
            candidate.item_name or "",
            candidate.description or ""
        ])

        text_score = calculate_text_similarity(
            current_text,
            candidate_text
        )


        # -------------------------------------------------
        # METADATA SCORE
        # -------------------------------------------------

        metadata_score = calculate_metadata_similarity(
            current_item,
            candidate
        )


        # -------------------------------------------------
        # GPS DISTANCE
        # -------------------------------------------------

        distance_km = None

        if (
            current_item.latitude is not None
            and current_item.longitude is not None
            and candidate.latitude is not None
            and candidate.longitude is not None
        ):

            distance_km = calculate_distance_km(
                current_item.latitude,
                current_item.longitude,
                candidate.latitude,
                candidate.longitude
            )


        # -------------------------------------------------
        # FINAL MATCH SCORE
        # -------------------------------------------------

        final_score = (
            (image_score * 0.40)
            +
            (text_score * 0.30)
            +
            (metadata_score * 0.30)
        )

        final_score = max(
            0.0,
            min(100.0, final_score)
        )

        final_score = round(
            final_score,
            2
        )


        # -------------------------------------------------
        # MATCH RESULT
        # -------------------------------------------------

        matches.append({

            "item_id": candidate.id,

            "item_type": candidate.item_type,

            "item_name": candidate.item_name,

            "category": candidate.category,

            "description": candidate.description,

            "color": candidate.color,

            "brand": candidate.brand,

            "location": candidate.location,

            "latitude": candidate.latitude,

            "longitude": candidate.longitude,

            "distance_km": (
                round(distance_km, 2)
                if distance_km is not None
                else None
            ),

            "image_score": round(
                image_score,
                2
            ),

            "text_score": round(
                text_score,
                2
            ),

            "metadata_score": round(
                metadata_score,
                2
            ),

            "match_score": final_score,

            "strong_match": (
                final_score >= 50
            )
        })


        # =================================================
        # AUTOMATIC MATCH NOTIFICATIONS
        # =================================================

        if final_score >= 50:

            # ---------------------------------------------
            # NOTIFY CURRENT ITEM OWNER
            # ---------------------------------------------

            if current_item.user_id:

                existing_current_notification = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id
                        ==
                        current_item.user_id,

                        Notification.item_id
                        ==
                        current_item.id,

                        Notification.notification_type
                        ==
                        "match",

                        Notification.message.contains(
                            f"Item #{candidate.id}"
                        )
                    )
                    .first()
                )


                if not existing_current_notification:

                    notification_current = Notification(

                        user_id=current_item.user_id,

                        item_id=current_item.id,

                        title="🔔 Possible Match Found",

                        message=(
                            f"AI found a possible match "
                            f"for your "
                            f"{current_item.item_type} item. "
                            f"Item #{candidate.id} has a "
                            f"{final_score}% match score."
                        ),

                        notification_type="match"
                    )

                    db.add(
                        notification_current
                    )

                    print(
                        f"Notification created for "
                        f"User {current_item.user_id} "
                        f"for Item #{current_item.id}"
                    )


            # ---------------------------------------------
            # NOTIFY CANDIDATE ITEM OWNER
            # ---------------------------------------------

            if (
                candidate.user_id
                and
                candidate.user_id
                !=
                current_item.user_id
            ):

                existing_candidate_notification = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id
                        ==
                        candidate.user_id,

                        Notification.item_id
                        ==
                        candidate.id,

                        Notification.notification_type
                        ==
                        "match",

                        Notification.message.contains(
                            f"Item #{current_item.id}"
                        )
                    )
                    .first()
                )


                if not existing_candidate_notification:

                    notification_candidate = Notification(

                        user_id=candidate.user_id,

                        item_id=candidate.id,

                        title="🔔 Possible Match Found",

                        message=(
                            f"AI found a possible match "
                            f"for your "
                            f"{candidate.item_type} item. "
                            f"Item #{current_item.id} has a "
                            f"{final_score}% match score."
                        ),

                        notification_type="match"
                    )

                    db.add(
                        notification_candidate
                    )

                    print(
                        f"Notification created for "
                        f"User {candidate.user_id} "
                        f"for Item #{candidate.id}"
                    )


    # =====================================================
    # SAVE NOTIFICATIONS
    # =====================================================

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            "Notification commit error:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to save match notifications: {str(e)}"
        )


    # =====================================================
    # SORT MATCHES
    # =====================================================

    matches.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )


    # =====================================================
    # RESPONSE
    # =====================================================

    return {

        "item_id": current_item.id,

        "item_type": current_item.item_type,

        "matches": matches
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
        .filter(User.id == sender_id)
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
        .filter(Item.id == item_id)
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
        .filter(User.id == receiver_id)
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
        .filter(Item.id == item_id)
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
            .filter(User.id == msg.sender_id)
            .first()
        )

        receiver = (
            db.query(User)
            .filter(User.id == msg.receiver_id)
            .first()
        )


        result.append({

            "id": msg.id,

            "sender_id": msg.sender_id,

            "sender_name": (
                sender.name
                if sender
                else "Unknown User"
            ),

            "receiver_id": msg.receiver_id,

            "receiver_name": (
                receiver.name
                if receiver
                else "Unknown User"
            ),

            "item_id": msg.item_id,

            "message": msg.message,

            "created_at": (
                str(msg.created_at)
                if msg.created_at
                else None
            )
        })


    return {

        "status": "success",

        "messages": result
    }


# =========================================================
# FEATURE 3 — NOTIFICATIONS
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


    return [

        {

            "id": notification.id,

            "user_id": notification.user_id,

            "item_id": notification.item_id,

            "title": notification.title,

            "message": notification.message,

            "notification_type":
                notification.notification_type,

            "is_read":
                bool(notification.is_read),

            "created_at":
                notification.created_at
        }

        for notification in notifications
    ]


# =========================================================
# MARK ONE NOTIFICATION AS READ
# =========================================================

@app.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db)
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )


    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )


    notification.is_read = 1

    db.commit()


    return {

        "message":
            "Notification marked as read"
    }


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

@app.put("/notifications/{user_id}/read-all")
def mark_all_notifications_read(
    user_id: int,
    db: Session = Depends(get_db)
):

    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == 0
        )
        .all()
    )


    for notification in notifications:

        notification.is_read = 1


    db.commit()


    return {

        "message":
            "All notifications marked as read",

        "count":
            len(notifications)
    }


# =========================================================
# FEATURE 4 — OWNERSHIP VERIFICATION
# =========================================================

@app.post("/verification/request")
def create_verification_request(
    item_id: int,
    claimant_id: int,
    proof: str,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # FIND ITEM
    # -----------------------------------------------------

    item = (
        db.query(Item)
        .filter(Item.id == item_id)
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )


    # -----------------------------------------------------
    # ONLY FOUND ITEMS CAN BE CLAIMED
    # -----------------------------------------------------

    if item.item_type != "found":

        raise HTTPException(
            status_code=400,
            detail="Ownership claims can only be submitted for found items."
        )


    # -----------------------------------------------------
    # CHECK ITEM REPORTER
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
        .filter(User.id == claimant_id)
        .first()
    )

    if not claimant:

        raise HTTPException(
            status_code=404,
            detail="Claimant account not found."
        )


    # -----------------------------------------------------
    # PREVENT SELF CLAIM
    # -----------------------------------------------------

    if claimant_id == item.user_id:

        raise HTTPException(
            status_code=400,
            detail="You cannot submit an ownership claim for your own found item."
        )


    # -----------------------------------------------------
    # CHECK PROOF
    # -----------------------------------------------------

    proof = proof.strip()

    if not proof:

        raise HTTPException(
            status_code=400,
            detail="Ownership proof is required."
        )


    if len(proof) < 10:

        raise HTTPException(
            status_code=400,
            detail="Please provide more detailed ownership proof."
        )


    # -----------------------------------------------------
    # PREVENT DUPLICATE PENDING REQUEST
    # -----------------------------------------------------

    existing = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.item_id == item_id,
            VerificationRequest.claimant_id == claimant_id,
            VerificationRequest.status == "pending"
        )
        .first()
    )

    if existing:

        raise HTTPException(
            status_code=400,
            detail="A verification request is already pending."
        )


    # -----------------------------------------------------
    # CREATE REQUEST
    # -----------------------------------------------------

    request = VerificationRequest(

        item_id=item_id,

        claimant_id=claimant_id,

        reporter_id=item.user_id,

        proof=proof,

        status="pending"

    )


    try:

        db.add(request)

        db.commit()

        db.refresh(request)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Unable to create verification request: {str(e)}"
        )


    # -----------------------------------------------------
    # NOTIFY FOUND-ITEM REPORTER
    # -----------------------------------------------------

    notification = Notification(

        user_id=item.user_id,

        item_id=item.id,

        title="🔐 New Ownership Claim",

        message=(
            f"{claimant.name} has submitted "
            f"ownership proof for your found item "
            f"\"{item.item_name}\"."
        ),

        notification_type="verification"

    )


    try:

        db.add(notification)

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Verification saved but notification failed: {str(e)}"
        )


    return {

        "message":
            "Ownership claim submitted successfully.",

        "request_id":
            request.id,

        "status":
            request.status

    }


# =========================================================
# GET VERIFICATION REQUESTS
# =========================================================

@app.get("/verification/user/{user_id}")
def get_verification_requests(
    user_id: int,
    db: Session = Depends(get_db)
):

    requests = (
        db.query(VerificationRequest)
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

            "id": request.id,

            "item_id": request.item_id,

            "item_name":
                item.item_name
                if item
                else None,

            "claimant_id":
                request.claimant_id,

            "claimant_name":
                claimant.name
                if claimant
                else None,

            "reporter_id":
                request.reporter_id,

            "reporter_name":
                reporter.name
                if reporter
                else None,

            "proof":
                request.proof,

            "status":
                request.status,

            "response_message":
                request.response_message,

            "created_at":
                request.created_at
        })


    return result


# =========================================================
# RESPOND TO VERIFICATION REQUEST
# =========================================================

@app.put("/verification/{request_id}/respond")
def respond_to_verification(
    request_id: int,
    reporter_id: int,
    status: str,
    response_message: str = "",
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # VALIDATE STATUS
    # -----------------------------------------------------

    if status not in [
        "approved",
        "rejected"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Status must be approved or rejected"
        )


    # -----------------------------------------------------
    # FIND REQUEST
    # -----------------------------------------------------

    request = (
        db.query(VerificationRequest)
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
            detail="Verification request not found"
        )


    # -----------------------------------------------------
    # PREVENT DOUBLE RESPONSE
    # -----------------------------------------------------

    if request.status != "pending":

        raise HTTPException(
            status_code=400,
            detail=(
                "This verification request "
                "has already been processed"
            )
        )


    # -----------------------------------------------------
    # UPDATE REQUEST
    # -----------------------------------------------------

    request.status = status

    request.response_message = response_message

    db.commit()


    # -----------------------------------------------------
    # NOTIFY CLAIMANT
    # -----------------------------------------------------

    notification = Notification(

        user_id=request.claimant_id,

        item_id=request.item_id,

        title=(
            "Ownership Verified"
            if status == "approved"
            else "Verification Rejected"
        ),

        message=(
            response_message
            if response_message.strip()
            else (
                "Your ownership verification was approved."
                if status == "approved"
                else
                "Your ownership verification was rejected."
            )
        ),

        notification_type="verification_response"
    )


    db.add(notification)

    db.commit()


    return {

        "message":
            "Verification response saved",

        "request_id":
            request.id,

        "status":
            request.status
    }

