from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password = Column(String)
    is_admin = Column(Boolean, default=False)
    role = Column(String, default="user")
    photo_path = Column(String, nullable=True)

    activities = relationship("Attendance", back_populates="user")



