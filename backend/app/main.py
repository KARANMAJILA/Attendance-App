from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import admin_routes
from app.routes import user_routes
from app.routes import user_activity  # ✅ This was missing

app = FastAPI()

# ✅ CORS middleware (important for mobile frontend apps like React Native)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to mobile frontend origin later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Mount static files for accessing uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ Include routes
app.include_router(admin_routes.router, tags=["Admin"])
app.include_router(user_routes.router, tags=["User"])
app.include_router(user_activity.router, tags=["Activity"])
