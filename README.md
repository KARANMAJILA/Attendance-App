# 🧑‍💼 Staff Face Recognition Attendance System

A real-time mobile-first attendance solution using **Face Recognition**, built with:

- 📱 React Native (Frontend)
- ⚡ FastAPI (Backend)
- 🧠 Face Recognition API (Opencv)
- 🗺️ Location + Battery Logging
- 🗃️ Supabase / PostgreSQL for storage

---

## 🚀 Features

- 🔐 **Facial Login** for staff (mobile camera based)
- 📍 Tracks **location** and **battery** percentage
- 🧾 Admin dashboard: **View activity** & **attendance logs**
- 📷 Admin panel to upload face images for training
- ☁️ Offline + online sync ready (can integrate later)
- 🔧 JWT-based authentication with role-based access (admin/user)

---

## 🗂️ Tech Stack

| Layer       | Tech                                |
|-------------|-------------------------------------|
| Frontend    | React Native + Expo + Tailwind      |
| Backend     | FastAPI + SQLAlchemy + JWT Auth     |
| Database    | PostgreSQL (via Supabase or local)  |
| Image API   | Opencv               |
| Auth        | JWT / Supabase Auth (optional)      |

---

## 📁 Project Structure

### Backend (`/backend`)

backend/
├── app/
│ ├── main.py
│ ├── database.py
│ ├── config.py
│ ├── routes/
│ │ ├── user_routes.py
│ │ ├── attendance.py
│ │ └── admin_routes.py
│ ├── models/
│ │ ├── user.py
│ │ ├── attendance.py
│ │ └── user_activity.py
│ ├── utils/
│ │ └── auth.py
│ └── services/
│ └── face_recognition.py
├── alembic/ (DB migrations)
└── requirements.txt


🧪 API Endpoints (FastAPI)
Method	Endpoint	Description
POST	/register	Register user
POST	/login	JWT login
POST	/activity	Track battery/location
POST	/attendance/mark	Mark attendance via face
GET	/attendance/all	Admin: all attendance logs



📸 Face Recognition
Face image upload by admin (base64 or URL)

Matching done via opencv

Training handled on server when image is uploaded

👨‍💻 Contributing
Pull requests welcome! Please open issues first to discuss.
