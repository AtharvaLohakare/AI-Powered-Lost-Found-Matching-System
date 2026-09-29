from fastapi import FastAPI, Form, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import os
import shutil
import bcrypt

from .database import SessionLocal
from .models import Item, User, Message

from .text_matcher import calculate_text_similarity
from .image_matcher import calculate_image_similarity


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# UPLOAD FOLDER
# =========================================================

UPLOAD_DIR = "backend/uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

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
# HOME / HEALTH CHECK
# =========================================================

@app.get("/")
def home():

    return {
        "status": "success",
        "message": "FastAPI connected to MySQL!"
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

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
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

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

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

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_match = bcrypt.checkpw(
        password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    )

    if not password_match:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
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
    # SAVE IMAGE
    # -----------------------------------------------------

    image_path = os.path.join(
        UPLOAD_DIR,
        image.filename
    )

    with open(image_path, "wb") as buffer:

        shutil.copyfileobj(
            image.file,
            buffer
        )


    # -----------------------------------------------------
    # SAVE ITEM TO DATABASE
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

        item_date=date,

        image_name=image.filename

    )

    db.add(new_item)

    db.commit()

    db.refresh(new_item)


    return {

        "status": "success",

        "message":
            f"{item_type.capitalize()} item saved successfully!",

        "item_id": new_item.id,

        "image_name": image.filename

    }


# =========================================================
# GET ALL ITEMS
# =========================================================

@app.get("/items")
def get_items(

    db: Session = Depends(get_db)

):

    items = db.query(Item).all()


    return [

        {

            "id": item.id,

            "item_type": item.item_type,

            "item_name": item.item_name,

            "category": item.category,

            "description": item.description,

            "color": item.color,

            "brand": item.brand,

            "location": item.location,

            "item_date": str(item.item_date),

            "image_name": item.image_name

        }

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

    return items


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

        return {

            "status": "error",

            "message": "Item not found"

        }


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

        "item_date": str(item.item_date),

        "image_name": item.image_name

    }


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

        return {

            "status": "error",

            "message": "Item not found"

        }


    # -----------------------------------------------------
    # CHECK ITEM TYPE
    # -----------------------------------------------------

    if lost_item.item_type != "lost":

        return {

            "status": "error",

            "message":
                "Matching should be started from a lost item."

        }


    # -----------------------------------------------------
    # GET ALL FOUND ITEMS
    # -----------------------------------------------------

    found_items = (

        db.query(Item)

        .filter(
            Item.item_type == "found"
        )

        .all()

    )


    matches = []


    # =====================================================
    # COMPARE EACH FOUND ITEM
    # =====================================================

    for found_item in found_items:


        # -------------------------------------------------
        # 1. TEXT SIMILARITY
        # -------------------------------------------------

        lost_text = (

            f"{lost_item.item_name}. "

            f"{lost_item.description}"

        )


        found_text = (

            f"{found_item.item_name}. "

            f"{found_item.description}"

        )


        text_similarity = (

            calculate_text_similarity(

                lost_text,

                found_text

            )

        )


        text_score = round(

            text_similarity * 100,

            2

        )


        # -------------------------------------------------
        # 2. IMAGE SIMILARITY
        # -------------------------------------------------

        image_score = 0


        lost_image_path = os.path.join(

            UPLOAD_DIR,

            lost_item.image_name

        )


        found_image_path = os.path.join(

            UPLOAD_DIR,

            found_item.image_name

        )


        if (

            lost_item.image_name

            and found_item.image_name

            and os.path.exists(
                lost_image_path
            )

            and os.path.exists(
                found_image_path
            )

        ):

            image_similarity = (

                calculate_image_similarity(

                    lost_image_path,

                    found_image_path

                )

            )


            image_score = round(

                image_similarity * 100,

                2

            )


        # -------------------------------------------------
        # 3. METADATA MATCHING
        # -------------------------------------------------

        metadata_score = 0

        reasons = []


        # Category

        if (

            lost_item.category

            and found_item.category

            and

            lost_item.category.lower()

            ==

            found_item.category.lower()

        ):

            metadata_score += 30

            reasons.append(
                "Category matches"
            )


        # Color

        if (

            lost_item.color

            and found_item.color

            and

            lost_item.color.lower()

            ==

            found_item.color.lower()

        ):

            metadata_score += 20

            reasons.append(
                "Color matches"
            )


        # Brand

        if (

            lost_item.brand

            and found_item.brand

            and

            lost_item.brand.lower()

            ==

            found_item.brand.lower()

        ):

            metadata_score += 20

            reasons.append(
                "Brand matches"
            )


        # Location

        if (

            lost_item.location

            and found_item.location

            and

            lost_item.location.lower()

            ==

            found_item.location.lower()

        ):

            metadata_score += 20

            reasons.append(
                "Location matches"
            )


        # Item name

        if (

            lost_item.item_name

            and found_item.item_name

            and

            lost_item.item_name.lower()

            ==

            found_item.item_name.lower()

        ):

            metadata_score += 10

            reasons.append(
                "Item name matches"
            )


        # -------------------------------------------------
        # 4. COMBINED AI SCORE
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
        # 5. EXPLAINABLE AI REASONS
        # -------------------------------------------------

        if image_score >= 75:

            reasons.append(
                "✓ Strong image similarity"
            )

        elif image_score >= 50:

            reasons.append(
                "✓ Moderate image similarity"
            )

        else:

            reasons.append(
                "⚠ Low image similarity"
            )


        if text_score >= 75:

            reasons.append(
                "✓ Strong description similarity"
            )

        elif text_score >= 50:

            reasons.append(
                "✓ Moderate description similarity"
            )

        else:

            reasons.append(
                "⚠ Low description similarity"
            )


        if metadata_score >= 75:

            reasons.append(
                "✓ Strong metadata match"
            )

        elif metadata_score >= 50:

            reasons.append(
                "✓ Moderate metadata match"
            )

        else:

            reasons.append(
                "⚠ Limited metadata match"
            )


        # -------------------------------------------------
        # 6. STORE MATCH RESULT
        # -------------------------------------------------

        matches.append({

            "item_id":
                found_item.id,

            "item_name":
                found_item.item_name,

            "category":
                found_item.category,

            "color":
                found_item.color,

            "brand":
                found_item.brand,

            "location":
                found_item.location,

            "image_name":
                found_item.image_name,

            "image_similarity":
                image_score,

            "text_similarity":
                text_score,

            "metadata_score":
                metadata_score,

            "match_score":
                final_score,

            "reasons":
                reasons

        })


    # =====================================================
    # SORT BY HIGHEST SCORE
    # =====================================================

    matches.sort(

        key=lambda x:
            x["match_score"],

        reverse=True

    )


    # =====================================================
    # FILTER STRONG MATCHES
    # =====================================================

    strong_matches = [

        match

        for match in matches

        if match["match_score"] >= 50

    ]


    # =====================================================
    # NO STRONG MATCH
    # =====================================================

    if not strong_matches:

        return {

            "status": "success",

            "lost_item_id":
                lost_item.id,

            "matches": [],

            "message":
                "No strong match found"

        }


    # =====================================================
    # RETURN MATCHES
    # =====================================================

    return {

        "status": "success",

        "lost_item_id":
            lost_item.id,

        "matches":
            strong_matches

    }


# =========================================================
# MESSAGES / COMMUNICATION
# =========================================================

@app.post("/messages/send")
def send_message(

    sender_id: int = Form(...),

    item_id: int = Form(...),

    message: str = Form(...),

    db: Session = Depends(get_db)

):

    # -----------------------------------------------------
    # VALIDATE MESSAGE
    # -----------------------------------------------------

    message = message.strip()


    if not message:

        raise HTTPException(

            status_code=400,

            detail="Message cannot be empty."

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
    # FIND REPORTER
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


    db.add(new_message)

    db.commit()

    db.refresh(new_message)


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
            str(
                new_message.created_at
            )

    }


# =========================================================
# GET MESSAGES FOR A USER + ITEM
# =========================================================

@app.get("/messages/{user_id}/{item_id}")
def get_messages(

    user_id: int,

    item_id: int,

    db: Session = Depends(get_db)

):

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
                sender.name
                if sender
                else "Unknown User",

            "receiver_id":
                msg.receiver_id,

            "receiver_name":
                receiver.name
                if receiver
                else "Unknown User",

            "item_id":
                msg.item_id,

            "message":
                msg.message,

            "created_at":
                str(
                    msg.created_at
                )

        })


    return {

        "status": "success",

        "messages":
            result

    }