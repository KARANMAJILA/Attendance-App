from app.models.base import Base
from app.models.user import User
from app.models.attendance import Attendance
from app.models.user_activity import UserActivity

# Import relationships after all models are defined
from app.models import relationships
