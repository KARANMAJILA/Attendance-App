import os
import httpx
import cv2
import numpy as np
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

def _read_and_encode_image(image_path: Path) -> np.ndarray:
    img = cv2.imread(str(image_path))
    if img is None:
        print(f"[Stored Image] Could not read image: {image_path}")
        return None
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Use better face detection parameters
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(
        gray, 
        scaleFactor=1.05,  # Smaller steps for better detection
        minNeighbors=3,    # Reduced for more lenient detection
        minSize=(30, 30),  # Smaller minimum size
        maxSize=(300, 300) # Add maximum size
    )

    if len(faces) == 0:
        print(f"[Stored Image] No faces detected in {image_path}")
        return None

    # Use the largest face (most confident detection)
    largest_face = max(faces, key=lambda f: f[2] * f[3])
    x, y, w, h = largest_face
    
    print(f"[Stored Image] Found face at ({x},{y}) size {w}x{h}")
    
    face = gray[y:y+h, x:x+w]
    
    # Resize to standard size and normalize
    face_resized = cv2.resize(face, (100, 100))
    
    # Apply histogram equalization for better lighting consistency
    face_normalized = cv2.equalizeHist(face_resized)
    
    return face_normalized.flatten()

async def verify_face(image_bytes: bytes, user_id: int, db: AsyncSession) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.photo_path:
        print(f"[Face Verify] User {user_id} or photo_path not found")
        return False

    print(f"[Face Verify] Verifying face for user: {user.name}")
    print(f"[Face Verify] Database photo_path: {user.photo_path}")
    
    # Get just the filename (e.g., "karan.jpg")
    photo_filename = Path(user.photo_path).name
    
    # Try multiple possible locations
    possible_photo_paths = [
        user.photo_path,  # Exact path from database
        f"uploads/{photo_filename}",  # uploads/karan.jpg
        f"uploads/staff_photos/{photo_filename}",  # uploads/staff_photos/karan.jpg
        f"uploads/user_photos/{photo_filename}",  # uploads/user_photos/karan.jpg
        f"static/{photo_filename}",  # static/karan.jpg
        f"static/staff_photos/{photo_filename}",  # static/staff_photos/karan.jpg
    ]
    
    stored_path = None
    for photo_path in possible_photo_paths:
        if os.path.exists(photo_path):
            stored_path = Path(photo_path)
            print(f"[Face Verify] ✅ Found photo at: {stored_path}")
            break
    
    if not stored_path:
        print(f"[Face Verify] Photo '{photo_filename}' not found for user {user.name}")
        
        # Search recursively in uploads directory for debugging
        uploads_dir = "uploads"
        if os.path.exists(uploads_dir):
            print(f"[Face Verify] Searching recursively in {uploads_dir}...")
            for root, dirs, files in os.walk(uploads_dir):
                if photo_filename in files:
                    found_path = os.path.join(root, photo_filename)
                    print(f"[Face Verify] 🎯 FOUND FILE AT: {found_path}")
                    stored_path = Path(found_path)
                    break
        
        if not stored_path:
            return False

    # Get encoding from stored image
    stored_encoding = _read_and_encode_image(stored_path)
    if stored_encoding is None:
        print("[Face Verify] Could not extract face from stored image")
        return False

    # Process uploaded image
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        live_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if live_img is None:
            print("[Face Verify] Failed to decode uploaded image")
            return False
            
        print(f"[Face Verify] Uploaded image size: {live_img.shape}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(live_img, cv2.COLOR_BGR2GRAY)
        
        # Better face detection for live image
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(30, 30),
            maxSize=(300, 300)
        )

        print(f"[Face Verify] Detected {len(faces)} faces in uploaded image")

        if len(faces) == 0:
            print("[Face Verify] No face found in uploaded image")
            return False

        # Try matching with each detected face (in case multiple people)
        best_distance = float('inf')
        best_face_info = None
        
        for i, (x, y, w, h) in enumerate(faces):
            face_size = w * h
            print(f"[Face Verify] Testing face {i+1}: ({x},{y}) size {w}x{h} (area: {face_size})")
            
            live_face = gray[y:y+h, x:x+w]
            face_resized = cv2.resize(live_face, (100, 100))
            
            # Apply same normalization as stored image
            face_normalized = cv2.equalizeHist(face_resized)
            live_encoding = face_normalized.flatten()

            # Calculate distance
            distance = np.linalg.norm(stored_encoding - live_encoding)
            print(f"[Face Verify] Face {i+1} distance: {distance:.2f}")
            
            if distance < best_distance:
                best_distance = distance
                best_face_info = f"face {i+1} (size: {w}x{h})"

        # Use dynamic threshold based on image conditions
        base_threshold = 15000
        
        # Adjust threshold based on number of faces (crowded scenes need more leniency)
        if len(faces) > 2:
            threshold = base_threshold * 1.5  # 22500 for crowded scenes
            print(f"[Face Verify] Multiple faces detected, using lenient threshold")
        elif len(faces) == 2:
            threshold = base_threshold * 1.2  # 18000 for two faces
        else:
            threshold = base_threshold  # 15000 for single face
        
        print(f"[Face Verify] Best match: {best_face_info}")
        print(f"[Face Verify] Best distance: {best_distance:.2f}, Threshold: {threshold}")
        
        verification_passed = best_distance < threshold
        print(f"[Face Verify] Verification: {'✅ PASSED' if verification_passed else '❌ FAILED'}")

        return verification_passed
        
    except Exception as e:
        print(f"[Face Verify] Error processing uploaded image: {e}")
        import traceback
        traceback.print_exc()
        return False