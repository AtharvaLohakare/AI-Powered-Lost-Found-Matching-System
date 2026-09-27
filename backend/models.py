from sqlalchemy import Column, Integer, String, Text, Date, TIMESTAMP
from .database import Base


class Item(Base):

    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    item_type = Column(String(20), nullable=False)

    item_name = Column(String(100), nullable=False)

    category = Column(String(50), nullable=False)

    description = Column(Text, nullable=False)

    color = Column(String(50))

    brand = Column(String(100))

    location = Column(String(200), nullable=False)

    item_date = Column(Date, nullable=False)

    image_name = Column(String(255))

    created_at = Column(TIMESTAMP)