from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from app.database import get_db
from app.models.user import User
from app.models.attendance import Attendance
from app.schemas.user import UserLogin, TokenResponse
from app.services.face_recognition import verify_face
from app.utils.auth import get_current_user
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime
from jose import jwt
from sqlalchemy.orm import joinedload
from app.models.user import User
from app.models.attendance import Attendance
import os

router = APIRouter(tags=["User"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "mysecret")
ALGORITHM = "HS256"

# ---------- LOGIN ----------
@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    db_user = result.scalar_one_or_none()

    if not db_user or not pwd_context.verify(form_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {"sub": db_user.email}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

# ---------- MARK ATTENDANCE via FACE ----------
@router.post("/attendance/mark")
async def mark_attendance(
    file: UploadFile = File(...),
    location: str = Form(...),
    battery_level: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"[Mark Attendance] User: {current_user.name} ({current_user.email})")
        print(f"[Mark Attendance] Location: {location}")
        print(f"[Mark Attendance] Battery: {battery_level}%")
        print(f"[Mark Attendance] File: {file.filename}, Size: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        # Read image data
        image_bytes = await file.read()
        print(f"[Mark Attendance] Image bytes read: {len(image_bytes)} bytes")

        # ✅ Verify face
        print(f"[Mark Attendance] Starting face verification...")
        is_verified = await verify_face(image_bytes, current_user.id, db)
        
        if not is_verified:
            print(f"[Mark Attendance] ❌ Face verification failed for {current_user.name}")
            raise HTTPException(status_code=403, detail="Face verification failed")

        print(f"[Mark Attendance] ✅ Face verification passed for {current_user.name}")

        # ✅ Check if attendance already marked today
        today = datetime.utcnow().date()
        existing = await db.execute(
            select(Attendance).where(
                and_(
                    Attendance.user_id == current_user.id,
                    func.date(Attendance.timestamp) == today
                )
            )
        )
        already_marked = existing.scalar_one_or_none()
        if already_marked:
            print(f"[Mark Attendance] ⚠️ Attendance already marked today for {current_user.name}")
            raise HTTPException(status_code=400, detail="Attendance already marked today")

        # ✅ Save attendance
        try:
            battery_float = float(battery_level)
        except ValueError:
            battery_float = 0.0
            print(f"[Mark Attendance] Invalid battery level '{battery_level}', using 0.0")

        new_attendance = Attendance(
            user_id=current_user.id,
            location=location,
            battery_level=battery_float
        )
        db.add(new_attendance)
        await db.commit()
        await db.refresh(new_attendance)

        print(f"[Mark Attendance] ✅ Attendance saved successfully - ID: {new_attendance.id}")
        
        return {
            "message": "Attendance marked successfully", 
            "id": new_attendance.id,
            "timestamp": new_attendance.timestamp,
            "user_name": current_user.name
        }

    except HTTPException:
        # Re-raise HTTP exceptions (like face verification failed)
        raise
    except Exception as e:
        print(f"[Mark Attendance] ❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal server error during attendance marking")

# ---------- DEBUG ENDPOINT (Remove in production) ----------
@router.post("/attendance/debug-face")
async def debug_face_verification(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Debug endpoint to test face recognition without marking attendance"""
    try:
        image_bytes = await file.read()
        print(f"[Debug] Testing face verification for {current_user.name}")
        
        is_verified = await verify_face(image_bytes, current_user.id, db)
        
        return {
            "user_id": current_user.id,
            "user_name": current_user.name,
            "user_email": current_user.email,
            "photo_path": current_user.photo_path,
            "face_verified": is_verified,
            "image_size_bytes": len(image_bytes),
            "message": f"Face verification {'✅ PASSED' if is_verified else '❌ FAILED'}"
        }
    except Exception as e:
        print(f"[Debug] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "user_name": current_user.name,
            "face_verified": False
        }

# ---------- VIEW MY ATTENDANCE ----------
@router.get("/attendance/me")
async def view_my_attendance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Attendance).where(Attendance.user_id == current_user.id).order_by(Attendance.timestamp.desc())
    )
    return result.scalars().all()

# ---------- ADMIN: VIEW ALL ATTENDANCE ----------
@router.get("/attendance/all")
async def get_all_attendance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admin can access this")

    result = await db.execute(
        select(Attendance, User)
        .join(User, Attendance.user_id == User.id)
        .order_by(Attendance.timestamp.desc())
    )
    
    attendance_with_user = result.all()
    
    return [
        {
            "id": attendance.id,
            "timestamp": attendance.timestamp,
            "location": attendance.location,
            "battery_level": attendance.battery_level,
            "user_id": user.id,
            "user_name": user.name,
            "user_email": user.email,
        }
        for attendance, user in attendance_with_user
    ]