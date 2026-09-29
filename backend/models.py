from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    TIMESTAMP
)

from .database import Base


# =========================================================
# ITEM
# =========================================================

class Item(Base):

    __tablename__ = "items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    item_type = Column(
        String(20),
        nullable=False
    )

    item_name = Column(
        String(100),
        nullable=False
    )

    category = Column(
        String(50),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    color = Column(
        String(50),
        nullable=True
    )

    brand = Column(
        String(100),
        nullable=True
    )

    location = Column(
        String(200),
        nullable=False
    )

    item_date = Column(
        Date,
        nullable=False
    )

    image_name = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        TIMESTAMP
    )


# =========================================================
# USER
# =========================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    created_at = Column(
        TIMESTAMP
    )


# =========================================================
# MESSAGE
# =========================================================

class Message(Base):

    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sender_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    receiver_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    item_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    message = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP
    )