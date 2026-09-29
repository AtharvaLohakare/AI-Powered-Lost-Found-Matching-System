from sqlalchemy import Column, Integer, String, Text, Date, TIMESTAMP

from .database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)

    item_type = Column(String(20), nullable=False)
    item_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)

    color = Column(String(50))
    brand = Column(String(100))
    location = Column(String(200))

    item_date = Column(Date, nullable=False)

    image_name = Column(String(255))

    created_at = Column(TIMESTAMP)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    created_at = Column(TIMESTAMP)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    sender_id = Column(Integer, nullable=False)
    receiver_id = Column(Integer, nullable=False)

    item_id = Column(Integer, nullable=False)

    message = Column(Text, nullable=False)

    created_at = Column(TIMESTAMP)