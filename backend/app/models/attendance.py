from sqlalchemy import Column, Integer, DateTime, ForeignKey,String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer,  nullable=False)
    timestamp = Column(DateTime, default=func.now())

    battery_level = Column(Integer, nullable=True)
    location = Column(String, nullable=True)

   