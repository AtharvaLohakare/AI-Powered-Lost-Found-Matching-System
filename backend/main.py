from fastapi import FastAPI, Form, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Item
import os
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder where uploaded images will be saved
UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {
        "status": "success",
        "message": "FastAPI connected to MySQL!"
    }


@app.post("/report-item")
async def report_item(
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

    # Save uploaded image
    image_path = os.path.join(UPLOAD_DIR, image.filename)

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Save item information in MySQL
    new_item = Item(
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
        "message": f"{item_type.capitalize()} item saved successfully!",
        "item_id": new_item.id,
        "image_name": image.filename
    }

@app.get("/items")
def get_items(db: Session = Depends(get_db)):

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

@app.get("/items/{item_id}")
def get_item(item_id: int, db: Session = Depends(get_db)):

    item = db.query(Item).filter(Item.id == item_id).first()

    if not item:
        return {
            "status": "error",
            "message": "Item not found"
        }

    return {
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

@app.get("/match/{item_id}")
def match_item(item_id: int, db: Session = Depends(get_db)):

    # Get the selected item
    lost_item = db.query(Item).filter(Item.id == item_id).first()

    if not lost_item:
        return {
            "status": "error",
            "message": "Item not found"
        }

    # Make sure the selected item is a lost item
    if lost_item.item_type != "lost":
        return {
            "status": "error",
            "message": "Matching should be started from a lost item."
        }

    # Get all found items
    found_items = db.query(Item).filter(
        Item.item_type == "found"
    ).all()

    matches = []

    for found_item in found_items:

        score = 0
        reasons = []

        # Category match
        if lost_item.category.lower() == found_item.category.lower():
            score += 30
            reasons.append("Category matches")

        # Color match
        if (
            lost_item.color
            and found_item.color
            and lost_item.color.lower() == found_item.color.lower()
        ):
            score += 20
            reasons.append("Color matches")

        # Brand match
        if (
            lost_item.brand
            and found_item.brand
            and lost_item.brand.lower() == found_item.brand.lower()
        ):
            score += 20
            reasons.append("Brand matches")

        # Location match
        if lost_item.location.lower() == found_item.location.lower():
            score += 20
            reasons.append("Location matches")

        # Item name match
        if lost_item.item_name.lower() == found_item.item_name.lower():
            score += 10
            reasons.append("Item name matches")

        matches.append({
            "item_id": found_item.id,
            "item_name": found_item.item_name,
            "category": found_item.category,
            "color": found_item.color,
            "brand": found_item.brand,
            "location": found_item.location,
            "image_name": found_item.image_name,
            "match_score": score,
            "reasons": reasons
        })

    # Highest score first
    matches.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return {
        "status": "success",
        "lost_item_id": lost_item.id,
        "matches": matches
    }