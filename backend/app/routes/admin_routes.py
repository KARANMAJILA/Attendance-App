import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func, desc
from app.database import get_db
from app.models.user import User
from app.models.user_activity import UserActivity  # Add this import
from passlib.context import CryptContext
from app.schemas.user import UserLogin, TokenResponse
from jose import jwt, JWTError
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ✅ Fix: Make sure the tokenUrl matches your actual endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")

UPLOAD_DIR = "uploads/staff_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ✅ Make sure you have a proper SECRET_KEY
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")

# Add Pydantic models for activities
class ActivityOut(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    latitude: float
    longitude: float
    battery_level: float
    timestamp: str
    last_login: Optional[str]

    class Config:
        orm_mode = True

# 1. First define utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# 2. ✅ Enhanced auth functions with better error handling
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        print(f"🔍 Validating token: {token[:20]}...")  # Debug log
        
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=["HS256"]
        )
        email: str = payload.get("sub")
        print(f"🔍 Token payload email: {email}")  # Debug log
        
        if email is None:
            print("❌ No email in token payload")  # Debug log
            raise credentials_exception
            
    except JWTError as e:
        print(f"❌ JWT Error: {str(e)}")  # Debug log
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user is None:
        print(f"❌ User not found for email: {email}")  # Debug log
        raise credentials_exception
        
    print(f"✅ User validated: {user.email}, is_admin: {user.is_admin}")  # Debug log
    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    print(f"🔍 Checking admin status for user: {current_user.email}")  # Debug log
    
    if not current_user.is_admin:
        print(f"❌ User {current_user.email} is not admin")  # Debug log
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    print(f"✅ Admin access confirmed for: {current_user.email}")  # Debug log
    return current_user

# ✅ Alternative manual token extraction for debugging
async def get_current_user_manual(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    print(f"🔍 Raw Authorization header: '{authorization}'")  # Debug log
    
    if not authorization:
        print("❌ No Authorization header")  # Debug log
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    # ✅ More flexible header parsing
    if authorization.startswith("Bearer "):
        token = authorization[7:]  # Remove "Bearer " prefix
    elif authorization.startswith("bearer "):
        token = authorization[7:]  # Handle lowercase
    elif " " in authorization:
        # Handle malformed headers like "Bearer Bearer token" or similar
        parts = authorization.split()
        if len(parts) >= 2:
            token = parts[-1]  # Take the last part as token
        else:
            token = authorization
    else:
        # Assume the entire string is the token
        token = authorization
    
    print(f"🔍 Extracted token: '{token[:20]}...'" if len(token) > 20 else f"🔍 Extracted token: '{token}'")  # Debug log
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        print(f"🔍 Decoded email from token: {email}")  # Debug log
        
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
    except JWTError as e:
        print(f"❌ JWT decode error: {str(e)}")  # Debug log
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user is None:
        print(f"❌ User not found: {email}")  # Debug log
        raise HTTPException(status_code=401, detail="User not found")
        
    print(f"✅ Manual auth successful: {user.email}")  # Debug log
    return user

# 3. Routes
@router.post("/login", response_model=TokenResponse)
async def admin_login(user: UserLogin, db: AsyncSession = Depends(get_db)):
    """Single admin login endpoint"""
    print(f"🔍 Login attempt for: {user.email}")  # Debug log
    
    result = await db.execute(
        select(User).where(
            User.email == user.email,
            User.is_admin == True
        )
    )
    admin = result.scalar_one_or_none()

    if not admin:
        print(f"❌ Admin not found: {user.email}")  # Debug log
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )
    
    if not pwd_context.verify(user.password, admin.password):
        print(f"❌ Invalid password for: {user.email}")  # Debug log
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials"
        )

    # Update last_login timestamp
    admin.last_login = datetime.utcnow()
    await db.commit()

    token_data = {
        "sub": admin.email,
        "admin": True
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
    
    print(f"✅ Login successful for: {admin.email}")  # Debug log
    print(f"✅ Generated token: {token[:20]}...")  # Debug log

    return {
        "access_token": token,
        "token_type": "bearer"
    }

# ✅ Add the activities endpoint that your frontend is trying to access
@router.get("/activities", response_model=List[ActivityOut])
async def get_all_activities(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all activities with user details including last login"""
    print(f"🔍 Activities request from: {current_user.email}, is_admin: {current_user.is_admin}")
    
    if not current_user.is_admin:
        print(f"❌ User {current_user.email} is not admin")
        raise HTTPException(
            status_code=403, 
            detail=f"Only admin can view this data. Current user is_admin: {current_user.is_admin}"
        )

    # Join with User table to get username, email and last_login
    query = (
        select(UserActivity, User.username, User.email, User.last_login)
        .join(User, UserActivity.user_id == User.id)
        .order_by(desc(UserActivity.timestamp))
        .limit(limit)
    )
    
    result = await db.execute(query)
    activities_with_users = result.fetchall()
    
    activities = []
    for activity, username, email, last_login in activities_with_users:
        activity_out = ActivityOut(
            id=activity.id,
            user_id=activity.user_id,
            username=username,
            email=email,
            latitude=activity.latitude,
            longitude=activity.longitude,
            battery_level=activity.battery_level,
            timestamp=activity.timestamp.isoformat(),
            last_login=last_login.isoformat() if last_login else None
        )
        activities.append(activity_out)
    
    print(f"✅ Returning {len(activities)} activities")
    return activities

# ✅ Add a test endpoint to verify auth is working
@router.get("/test-auth")
async def test_auth(current_user: User = Depends(get_current_user)):
    """Test endpoint to verify authentication"""
    return {
        "message": "Authentication successful",
        "user": current_user.email,
        "is_admin": current_user.is_admin
    }

# ✅ Debug endpoint for user info
@router.get("/debug/user-info")
async def debug_user_info(
    current_user: User = Depends(get_current_user)
):
    """Debug endpoint to check current user info"""
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "is_admin": current_user.is_admin,
        "message": "Authentication successful"
    }

# ✅ Add staff endpoint that accepts token in body (workaround for header issues)
@router.post("/add-staff-with-token")
async def add_staff_with_token(
    request_data: dict,
    db: AsyncSession = Depends(get_db)
):
    print(f"🔍 Add staff request with token in body")
    print(f"🔍 Request data keys: {list(request_data.keys())}")
    
    # Extract token from request body
    token = request_data.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Token missing from request")
    
    print(f"🔍 Token from body: {token[:20]}...")
    
    # Validate token manually
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        print(f"🔍 Token payload email: {email}")
        
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
    except JWTError as e:
        print(f"❌ JWT decode error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get user from database
    result = await db.execute(select(User).where(User.email == email))
    current_admin = result.scalar_one_or_none()
    
    if current_admin is None:
        print(f"❌ User not found: {email}")
        raise HTTPException(status_code=401, detail="User not found")
        
    if not current_admin.is_admin:
        print(f"❌ User {current_admin.email} is not admin")
        raise HTTPException(status_code=403, detail="Admin access required")
    
    print(f"✅ Admin validated: {current_admin.email}")
    
    # Extract other data
    name = request_data.get("name")
    email = request_data.get("email")
    password = request_data.get("password")
    role = request_data.get("role", "user")
    image_data = request_data.get("image_data")
    
    if not all([name, email, password, image_data]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    # Save base64 image
    import base64
    filename = f"{email.replace('@', '_at_')}.jpg"
    photo_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        image_bytes = base64.b64decode(image_data)
        with open(photo_path, "wb") as f:
            f.write(image_bytes)
        print(f"✅ Photo saved: {photo_path}")
    except Exception as e:
        print(f"❌ Photo save error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save photo")

    # Create user
    new_user = User(
        name=name,
        email=email,
        password=hash_password(password),
        is_admin=False,
        role=role,
        photo_path=photo_path,
    )
    
    try:
        db.add(new_user)
        await db.commit()
        print(f"✅ Staff added successfully: {email}")
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

    return {
        "message": "Staff added successfully with token in body",
        "photo_url": f"/uploads/staff_photos/{filename}"
    }

# -----------------------------
# ✅ Add New Staff (with manual auth for debugging)
# -----------------------------
@router.post("/add-staff")
async def add_staff(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(default="user"),
    file: UploadFile = File(...),
    token: str = Form(None),  # ✅ Accept token as form field too
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user_manual)  # This will try header first
):
    try:
        # If header auth failed, try token from form
        admin = current_admin
    except HTTPException:
        if not token:
            raise HTTPException(status_code=401, detail="No valid authentication found")
        
        # Validate token from form
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            email_from_token = payload.get("sub")
            if not email_from_token:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            result = await db.execute(select(User).where(User.email == email_from_token))
            admin = result.scalar_one_or_none()
            if not admin or not admin.is_admin:
                raise HTTPException(status_code=403, detail="Admin access required")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    print(f"🔍 Add staff request from admin: {admin.email}")  # Debug log
    
    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        print(f"❌ User already exists: {email}")
        raise HTTPException(status_code=400, detail="User already exists")

    # 🔐 Save uploaded image with unique name
    filename = f"{email.replace('@', '_at_')}.jpg"
    photo_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"✅ Photo saved: {photo_path}")
    except Exception as e:
        print(f"❌ Photo save error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save photo")

    new_user = User(
        name=name,
        email=email,
        password=hash_password(password),
        is_admin=False,
        role=role,
        photo_path=photo_path,
    )
    
    try:
        db.add(new_user)
        await db.commit()
        print(f"✅ Staff added successfully: {email}")
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

    return {
        "message": "Staff added successfully",
        "photo_url": f"/uploads/staff_photos/{filename}"
    }

# -----------------------------
# 🗑 Delete Staff by Email
# -----------------------------
@router.delete("/delete-staff/{email}")
async def delete_staff(
    email: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user_manual)
):
    print(f"🗑️ Delete request for: {email} from admin: {current_admin.email}")
    
    # Double-check admin status
    if not current_admin.is_admin:
        print(f"❌ User {current_admin.email} is not admin")
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # URL decode the email in case it's encoded
    import urllib.parse
    decoded_email = urllib.parse.unquote(email)
    print(f"🔍 Decoded email: {decoded_email}")
    
    try:
        # Find the user first
        result = await db.execute(select(User).where(User.email == decoded_email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User not found: {decoded_email}")
            # Also try original email in case decoding wasn't needed
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"❌ User not found with original email either: {email}")
                raise HTTPException(status_code=404, detail="User not found")

        print(f"✅ Found user to delete: {user.name} ({user.email}) with ID: {user.id}")
        
        # Don't allow deleting admin users
        if user.is_admin:
            print(f"❌ Attempted to delete admin user: {user.email}")
            raise HTTPException(status_code=400, detail="Cannot delete admin users")

        # Store user info before deletion
        user_info = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "photo_path": user.photo_path
        }

        # 🧹 Delete associated photo if it exists
        if user.photo_path and os.path.exists(user.photo_path):
            try:
                os.remove(user.photo_path)
                print(f"✅ Deleted photo: {user.photo_path}")
            except Exception as e:
                print(f"⚠️ Could not delete photo: {str(e)}")

        # Delete the user
        await db.delete(user)
        await db.commit()
        print(f"✅ Staff deleted successfully: {user_info['email']}")
        
        return {
            "message": f"Staff with email {user_info['email']} deleted successfully.",
            "deleted_user": user_info
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"❌ Unexpected error during deletion: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# -----------------------------
# 📃 List All Staff (Non-admin)
# -----------------------------
@router.get("/list-staff")
async def list_staff(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    print(f"🔍 List staff request from: {current_admin.email}")  # Debug log
    
    result = await db.execute(select(User).where(User.is_admin == False))
    staff = result.scalars().all()
    
    print(f"✅ Found {len(staff)} staff members")  # Debug log
    return staff