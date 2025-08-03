import asyncio
import sys
import os
from sqlalchemy.future import select
from passlib.context import CryptContext

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))


from app.database import SessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_single_admin():
    async with SessionLocal() as db:
        try:
            # Check if admin exists
            result = await db.execute(
                select(User).where(User.is_admin == True)
            )
            existing_admin = result.scalar_one_or_none()
            
            if existing_admin:
                print("Admin already exists")
                return

            # Create admin user
            admin = User(
                email="admin@example.com",
                password=pwd_context.hash("admin123"),
                name="Admin",
                is_admin=True,
                role="admin"
            )
            
            db.add(admin)
            await db.commit()
            print("Admin created successfully")
        
        except Exception as e:
            print(f"Error creating admin: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(create_single_admin())
