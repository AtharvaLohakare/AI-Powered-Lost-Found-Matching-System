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