from sqlalchemy.orm import relationship
from app.models.user import User
from app.models.user_activity import UserActivity

# Add relationships after both models are defined
User.activities = relationship("UserActivity", back_populates="user")