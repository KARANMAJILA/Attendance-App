from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user_activity import UserActivity
from app.database import get_db
from app.utils.auth import get_current_user
from typing import List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class ActivityCreate(BaseModel):
    latitude: float
    longitude: float
    battery_level: float

class ActivityOut(BaseModel):
    id: int
    user_id: int
    latitude: float
    longitude: float
    battery_level: float
    timestamp: datetime

    class Config:
        from_attributes = True

@router.post("/activity", response_model=ActivityOut)
async def create_activity(
    activity: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    new_activity = UserActivity(
        user_id=current_user.id,
        latitude=activity.latitude,
        longitude=activity.longitude,
        battery_level=activity.battery_level
    )
    db.add(new_activity)
    await db.commit()
    await db.refresh(new_activity)
    return new_activity