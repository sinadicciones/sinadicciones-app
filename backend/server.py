from fastapi import FastAPI, HTTPException, Depends, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from enum import Enum
import os
import httpx
import uuid
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS Configuration - Allow all origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
print(f"Connecting to MongoDB: {MONGO_URL[:50]}...")  # Log connection (truncated for security)

# Connect to MongoDB
client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)

# Use 'sinadicciones' as database name
db = client.sinadicciones

# Emergent Auth URL
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ============== MODELS ==============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class Habit(BaseModel):
    habit_id: str
    user_id: str
    name: str
    frequency: str = "daily"  # daily, weekly, custom
    color: str = "#10B981"
    icon: Optional[str] = None
    reminder_time: Optional[str] = None
    created_at: datetime
    is_active: bool = True

class HabitLog(BaseModel):
    log_id: str
    habit_id: str
    user_id: str
    completed: bool
    note: Optional[str] = None
    date: str  # YYYY-MM-DD format
    logged_at: datetime

class EmotionalLog(BaseModel):
    log_id: str
    user_id: str
    mood_scale: int = Field(ge=1, le=10)  # 1-10 scale
    note: Optional[str] = None
    tags: List[str] = []  # ansiedad, ira, paz, etc.
    date: str  # YYYY-MM-DD format
    logged_at: datetime

class UserProfile(BaseModel):
    user_id: str
    role: str = "patient"  # patient, professional, admin
    # Common fields
    country: Optional[str] = None
    identification: Optional[str] = None  # RUT, DNI, etc.
    # Patient-specific fields
    addiction_type: Optional[str] = None
    secondary_addictions: List[str] = []
    years_using: Optional[int] = None
    clean_since: Optional[str] = None  # YYYY-MM-DD
    dual_diagnosis: bool = False
    diagnoses: List[str] = []  # depression, anxiety, ADHD, etc.
    triggers: List[str] = []  # people, places, emotions
    protective_factors: List[str] = []  # hobbies, support people
    addictive_beliefs: List[str] = []  # "just one won't hurt"
    permissive_beliefs: List[str] = []  # "I deserve it"
    life_story: Optional[str] = None
    emergency_contacts: List[dict] = []  # [{name, phone, relationship}]
    my_why: Optional[str] = None
    linked_therapist_id: Optional[str] = None  # For patients linked to a therapist
    # Professional-specific fields
    professional_type: Optional[str] = None  # psychologist, psychiatrist, therapist, counselor
    specialization: Optional[str] = None
    years_experience: Optional[int] = None
    license_number: Optional[str] = None
    institution: Optional[str] = None
    bio: Optional[str] = None
    # Common
    profile_completed: bool = False
    updated_at: datetime

class TherapistSearchResult(BaseModel):
    user_id: str
    name: str
    professional_type: Optional[str]
    specialization: Optional[str]
    institution: Optional[str]
    years_experience: Optional[int]

# Alert Models
class Alert(BaseModel):
    alert_id: str
    professional_id: str
    patient_id: str
    alert_type: str  # inactivity, negative_emotion, relapse
    severity: str  # low, medium, high, critical
    title: str
    description: str
    patient_name: str
    created_at: datetime
    is_read: bool = False
    is_resolved: bool = False

class RelapseReport(BaseModel):
    relapse_id: str
    user_id: str
    date: str
    substance: Optional[str] = None
    trigger: Optional[str] = None
    notes: Optional[str] = None
    reported_at: datetime

class ReportRelapseRequest(BaseModel):
    date: str
    substance: Optional[str] = None
    trigger: Optional[str] = None
    notes: Optional[str] = None

class PurposeTest(BaseModel):
    user_id: str
    answers: dict
    profile: dict  # Analyzed profile with values, strengths, purpose_type
    completed_at: datetime

class PurposeGoal(BaseModel):
    goal_id: str
    user_id: str
    area: str  # health, relationships, work, personal, spiritual, finances
    title: str
    description: Optional[str] = None
    target_date: Optional[str] = None
    status: str = "active"  # active, completed, paused
    progress: int = 0  # 0-100
    steps: List[dict] = []  # [{step: str, completed: bool}]
    created_at: datetime
    updated_at: datetime

class WeeklyCheckin(BaseModel):
    checkin_id: str
    user_id: str
    week_start: str  # YYYY-MM-DD
    area_ratings: dict  # {health: 7, relationships: 6, ...}
    achievements: List[str] = []
    challenges: List[str] = []
    next_week_plan: Optional[str] = None
    created_at: datetime

# ============== NOTIFICATION MODELS ==============

class NotificationSettings(BaseModel):
    motivational: bool = True
    habit_reminders: bool = True
    emotion_reminders: bool = True
    goal_reminders: bool = True
    preferred_time: str = "09:00"  # HH:MM format

class UpdateNotificationSettingsRequest(BaseModel):
    motivational: Optional[bool] = None
    habit_reminders: Optional[bool] = None
    emotion_reminders: Optional[bool] = None
    goal_reminders: Optional[bool] = None
    preferred_time: Optional[str] = None

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> Optional[User]:
    # Try to get token from cookie first, then from Authorization header
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session in database
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if session is expired (with timezone-aware comparison)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user from database
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ============== AUTH ENDPOINTS ==============

@app.post("/api/auth/session")
async def create_session(request: Request, response: Response):
    # Get session_id from header
    session_id = request.headers.get("X-Session-ID")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    
    # Exchange session_id for user data with Emergent Auth
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            auth_response.raise_for_status()
            user_data = auth_response.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to validate session: {str(e)}")
    
    # Parse response
    session_data = SessionDataResponse(**user_data)
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": session_data.email},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Create default profile
        await db.user_profiles.insert_one({
            "user_id": user_id,
            "addiction_type": None,
            "secondary_addictions": [],
            "years_using": None,
            "clean_since": None,
            "dual_diagnosis": False,
            "diagnoses": [],
            "triggers": [],
            "protective_factors": [],
            "addictive_beliefs": [],
            "permissive_beliefs": [],
            "life_story": None,
            "emergency_contacts": [],
            "my_why": None,
            "profile_completed": False,
            "updated_at": datetime.now(timezone.utc)
        })
    
    # Store session in database
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_data.session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days
        path="/"
    )
    
    return {"success": True, "user_id": user_id}

@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    
    return {"success": True}

# ============== EMAIL AUTH ENDPOINTS ==============

import hashlib

def hash_password(password: str) -> str:
    """Simple password hashing - in production use bcrypt"""
    return hashlib.sha256(password.encode()).hexdigest()

class EmailRegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = ""  # Empty by default - user must select role
    country: Optional[str] = None
    identification: Optional[str] = None  # RUT, DNI, etc.

class EmailLoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
async def register_with_email(data: EmailRegisterRequest, response: Response):
    """Register a new user with email and password"""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": data.email.lower()})
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Este email ya está registrado")
    
    # Validate email format
    if "@" not in data.email or "." not in data.email:
        raise HTTPException(status_code=400, detail="Email inválido")
    
    # Validate password length
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Create new user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    session_token = f"sess_{uuid.uuid4().hex}"
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hash_password(data.password),
        "picture": None,
        "auth_type": "email",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Create default profile with role
    await db.user_profiles.insert_one({
        "user_id": user_id,
        "role": data.role,
        "country": data.country,
        "identification": data.identification,
        "addiction_type": None,
        "secondary_addictions": [],
        "years_using": None,
        "clean_since": None,
        "dual_diagnosis": False,
        "diagnoses": [],
        "triggers": [],
        "protective_factors": [],
        "addictive_beliefs": [],
        "permissive_beliefs": [],
        "life_story": None,
        "emergency_contacts": [],
        "my_why": None,
        "linked_therapist_id": None,
        "professional_type": None,
        "specialization": None,
        "years_experience": None,
        "license_number": None,
        "institution": None,
        "bio": None,
        "profile_completed": False,
        "updated_at": datetime.now(timezone.utc)
    })
    
    # Create session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return {"success": True, "user_id": user_id, "session_token": session_token}

@app.post("/api/auth/login")
async def login_with_email(data: EmailLoginRequest, response: Response):
    """Login with email and password"""
    # Find user
    user = await db.users.find_one({"email": data.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # Check if user has password (might be Google-only user)
    if "password_hash" not in user:
        raise HTTPException(status_code=401, detail="Esta cuenta usa inicio de sesión con Google")
    
    # Verify password
    if user["password_hash"] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # Create new session
    session_token = f"sess_{uuid.uuid4().hex}"
    
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return {"success": True, "user_id": user["user_id"], "session_token": session_token}

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@app.post("/api/auth/change-password")
async def change_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    """Change user's password"""
    # Get user from database
    user = await db.users.find_one({"user_id": current_user.user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Check if user has password_hash (email user, not OAuth)
    if not user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Tu cuenta usa Google para iniciar sesión. No puedes cambiar la contraseña aquí.")
    
    # Verify current password
    if user["password_hash"] != hash_password(data.current_password):
        raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta")
    
    # Validate new password length
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
    
    # Update password
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    return {"success": True, "message": "Contraseña actualizada correctamente"}

# ============== ROLE & THERAPIST ENDPOINTS ==============

class SetRoleRequest(BaseModel):
    role: str  # patient, professional, active_user, family
    country: Optional[str] = None
    identification: Optional[str] = None  # RUT, DNI, etc.

@app.post("/api/profile/set-role")
async def set_user_role(data: SetRoleRequest, current_user: User = Depends(get_current_user)):
    """Set user's role (patient, professional, active_user, or family)"""
    if data.role not in ["patient", "professional", "active_user", "family"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    
    await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "role": data.role,
            "country": data.country,
            "identification": data.identification,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True, "role": data.role}

class ProfessionalOnboardingRequest(BaseModel):
    professional_type: str  # psychologist, psychiatrist, therapist, counselor
    specialization: Optional[str] = None
    years_experience: Optional[int] = None
    license_number: Optional[str] = None
    institution: Optional[str] = None
    bio: Optional[str] = None
    whatsapp: Optional[str] = None  # WhatsApp number for contact
    consultation_fee: Optional[str] = None  # Fee info e.g. "$50.000 CLP / sesión"
    accepts_patients: bool = True  # Whether accepting new patients

@app.post("/api/profile/professional-onboarding")
async def professional_onboarding(data: ProfessionalOnboardingRequest, current_user: User = Depends(get_current_user)):
    """Complete professional onboarding"""
    await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "professional_type": data.professional_type,
            "specialization": data.specialization,
            "years_experience": data.years_experience,
            "license_number": data.license_number,
            "institution": data.institution,
            "bio": data.bio,
            "whatsapp": data.whatsapp,
            "consultation_fee": data.consultation_fee,
            "accepts_patients": data.accepts_patients,
            "profile_completed": True,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True}

@app.get("/api/therapists/search")
async def search_therapists(query: str = "", current_user: User = Depends(get_current_user)):
    """Search for therapists by name, specialization, or institution"""
    # Find professionals with completed profiles who accept patients
    search_filter = {
        "role": "professional",
        "profile_completed": True,
        "accepts_patients": {"$ne": False}  # Include those who accept or haven't set the field
    }
    
    profiles = await db.user_profiles.find(
        search_filter,
        {"_id": 0, "user_id": 1, "professional_type": 1, "specialization": 1, 
         "institution": 1, "years_experience": 1, "bio": 1, "whatsapp": 1, 
         "consultation_fee": 1, "accepts_patients": 1}
    ).to_list(100)
    
    results = []
    for profile in profiles:
        # Get user name
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "name": 1})
        if user:
            name = user.get("name", "")
            specialization = profile.get("specialization", "")
            institution = profile.get("institution", "")
            
            # Filter by query if provided (search in name, specialization, institution)
            query_lower = query.lower()
            if not query or query_lower in name.lower() or query_lower in specialization.lower() or query_lower in institution.lower():
                results.append({
                    "user_id": profile["user_id"],
                    "name": name,
                    "professional_type": profile.get("professional_type"),
                    "specialization": specialization,
                    "institution": institution,
                    "years_experience": profile.get("years_experience"),
                    "bio": profile.get("bio"),
                    "whatsapp": profile.get("whatsapp"),
                    "consultation_fee": profile.get("consultation_fee"),
                    "accepts_patients": profile.get("accepts_patients", True)
                })
    
    return results

@app.get("/api/therapists/search-patient")
async def search_patient_by_email(email: str, current_user: User = Depends(get_current_user)):
    """Search for a patient by email (for professionals to link)"""
    # Verify current user is a professional
    prof_profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not prof_profile or prof_profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo los profesionales pueden buscar pacientes")
    
    # Find user by email
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        return {"patient": None}
    
    # Get profile
    profile = await db.user_profiles.find_one({"user_id": user["user_id"]})
    if not profile or profile.get("role") not in ["patient", "active_user"]:
        return {"patient": None, "message": "El usuario no es un paciente"}
    
    return {
        "patient": {
            "user_id": user["user_id"],
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "picture": user.get("picture"),
            "role": profile.get("role"),
            "addiction_type": profile.get("addiction_type")
        }
    }

class LinkPatientRequest(BaseModel):
    patient_id: str

@app.post("/api/professional/link-patient")
async def professional_link_patient(data: LinkPatientRequest, current_user: User = Depends(get_current_user)):
    """Professional links a patient to themselves"""
    # Verify current user is a professional
    prof_profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not prof_profile or prof_profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo los profesionales pueden vincular pacientes")
    
    # Verify patient exists and is a patient/active_user
    patient_profile = await db.user_profiles.find_one({"user_id": data.patient_id})
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Paciente no encontrado en el sistema")
    
    if patient_profile.get("role") not in ["patient", "active_user"]:
        raise HTTPException(status_code=400, detail=f"El usuario tiene rol '{patient_profile.get('role')}', no es un paciente")
    
    # Check if already linked to this professional
    if patient_profile.get("linked_therapist_id") == current_user.user_id:
        raise HTTPException(status_code=400, detail="Este paciente ya está vinculado contigo")
    
    # Check if linked to another professional
    if patient_profile.get("linked_therapist_id"):
        raise HTTPException(status_code=400, detail="Este paciente ya está vinculado con otro profesional")
    
    # Link patient to professional - update patient's profile
    await db.user_profiles.update_one(
        {"user_id": data.patient_id},
        {"$set": {
            "linked_therapist_id": current_user.user_id,
            "linked_at": datetime.now(timezone.utc)
        }}
    )
    
    # Also add patient to professional's list of patients
    await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$addToSet": {"linked_patients": data.patient_id}}
    )
    
    return {"success": True, "message": "Paciente vinculado correctamente"}

# NOTE: Patient-initiated linking has been removed. 
# Only professionals can link patients via /api/professional/link-patient

@app.get("/api/professional/patients")
async def get_professional_patients(current_user: User = Depends(get_current_user)):
    """Get all patients linked to this professional"""
    # Check if user is a professional
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden ver pacientes")
    
    # Find all patients linked to this professional
    patients = await db.user_profiles.find(
        {"linked_therapist_id": current_user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with user data
    results = []
    for patient in patients:
        user = await db.users.find_one({"user_id": patient["user_id"]}, {"_id": 0})
        if user:
            results.append({
                "user_id": patient["user_id"],
                "name": user.get("name"),
                "email": user.get("email"),
                "picture": user.get("picture"),
                "clean_since": patient.get("clean_since"),
                "addiction_type": patient.get("addiction_type"),
                "profile": patient
            })
    
    return {"patients": results}

@app.get("/api/professional/patient/{patient_id}")
async def get_patient_detail(patient_id: str, current_user: User = Depends(get_current_user)):
    """Get detailed information about a specific patient"""
    # Check if user is a professional
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden ver pacientes")
    
    # Check if patient is linked to this professional
    patient_profile = await db.user_profiles.find_one({
        "user_id": patient_id,
        "linked_therapist_id": current_user.user_id
    })
    
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Paciente no encontrado o no vinculado")
    
    # Get user data
    patient_user = await db.users.find_one({"user_id": patient_id}, {"_id": 0})
    
    # Get emotional logs (last 30)
    emotional_logs = await db.emotional_logs.find(
        {"user_id": patient_id},
        {"_id": 0}
    ).sort("date", -1).limit(30).to_list(30)
    
    # Get habits with today's completion status
    habits = await db.habits.find(
        {"user_id": patient_id, "is_active": True},
        {"_id": 0}
    ).to_list(50)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    habit_data = []
    for habit in habits:
        log = await db.habit_logs.find_one(
            {"habit_id": habit["habit_id"], "date": today},
            {"_id": 0}
        )
        # Calculate streak
        streak = 0
        check_date = datetime.now(timezone.utc)
        for _ in range(365):
            date_str = check_date.strftime("%Y-%m-%d")
            day_log = await db.habit_logs.find_one({
                "habit_id": habit["habit_id"],
                "date": date_str,
                "completed": True
            })
            if day_log:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        habit_data.append({
            "habit_id": habit["habit_id"],
            "name": habit["name"],
            "completed_today": log.get("completed", False) if log else False,
            "streak": streak
        })
    
    return {
        "patient": {
            "user_id": patient_id,
            "name": patient_user.get("name") if patient_user else "",
            "email": patient_user.get("email") if patient_user else "",
            "picture": patient_user.get("picture") if patient_user else None,
            "clean_since": patient_profile.get("clean_since"),
            "addiction_type": patient_profile.get("addiction_type"),
            "profile": patient_profile
        },
        "emotional_logs": emotional_logs,
        "habits": habit_data
    }

@app.post("/api/patient/unlink-therapist")
async def unlink_therapist(current_user: User = Depends(get_current_user)):
    """Unlink current therapist from patient"""
    await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "linked_therapist_id": None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True, "message": "Terapeuta desvinculado"}

# ============== TASK SYSTEM FOR THERAPISTS ==============

class CreateTaskRequest(BaseModel):
    patient_id: str
    title: str
    description: Optional[str] = None
    category: str = "general"  # general, mindfulness, journal, reading, exercise
    due_date: Optional[str] = None  # YYYY-MM-DD
    priority: str = "medium"  # low, medium, high

@app.post("/api/professional/tasks")
async def create_task_for_patient(data: CreateTaskRequest, current_user: User = Depends(get_current_user)):
    """Therapist creates a task for a patient"""
    # Verify professional
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden crear tareas")
    
    # Verify patient is linked
    patient_profile = await db.user_profiles.find_one({
        "user_id": data.patient_id,
        "linked_therapist_id": current_user.user_id
    })
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Paciente no encontrado o no vinculado")
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task = {
        "task_id": task_id,
        "therapist_id": current_user.user_id,
        "patient_id": data.patient_id,
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "due_date": data.due_date,
        "priority": data.priority,
        "status": "pending",  # pending, in_progress, completed
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
        "patient_notes": None
    }
    
    await db.therapist_tasks.insert_one(task)
    return {"success": True, "task_id": task_id}

@app.get("/api/professional/tasks/{patient_id}")
async def get_patient_tasks_for_therapist(patient_id: str, current_user: User = Depends(get_current_user)):
    """Get all tasks for a specific patient (therapist view)"""
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden ver tareas")
    
    tasks = await db.therapist_tasks.find(
        {"therapist_id": current_user.user_id, "patient_id": patient_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return tasks

@app.get("/api/patient/tasks")
async def get_my_tasks(current_user: User = Depends(get_current_user)):
    """Patient gets their assigned tasks"""
    tasks = await db.therapist_tasks.find(
        {"patient_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get therapist names
    for task in tasks:
        therapist = await db.users.find_one({"user_id": task["therapist_id"]})
        task["therapist_name"] = therapist.get("name", "Tu terapeuta") if therapist else "Tu terapeuta"
    
    return tasks

class UpdateTaskStatusRequest(BaseModel):
    status: str  # in_progress, completed
    patient_notes: Optional[str] = None

@app.put("/api/patient/tasks/{task_id}")
async def update_task_status(task_id: str, data: UpdateTaskStatusRequest, current_user: User = Depends(get_current_user)):
    """Patient updates their task status"""
    task = await db.therapist_tasks.find_one({
        "task_id": task_id,
        "patient_id": current_user.user_id
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    update_data = {
        "status": data.status,
        "patient_notes": data.patient_notes
    }
    
    if data.status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc)
    
    await db.therapist_tasks.update_one(
        {"task_id": task_id},
        {"$set": update_data}
    )
    
    return {"success": True}

@app.delete("/api/professional/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    """Therapist deletes a task"""
    result = await db.therapist_tasks.delete_one({
        "task_id": task_id,
        "therapist_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    return {"success": True}

# ============== THERAPIST SESSION NOTES ==============

class CreateSessionNoteRequest(BaseModel):
    patient_id: str
    session_date: str  # YYYY-MM-DD
    private_notes: str  # Only visible to therapist
    session_summary: Optional[str] = None  # Visible to patient
    goals_discussed: List[str] = []  # Visible to patient
    next_session_focus: Optional[str] = None
    mood_rating: Optional[int] = None  # 1-10, therapist observation

@app.post("/api/professional/notes")
async def create_session_note(data: CreateSessionNoteRequest, current_user: User = Depends(get_current_user)):
    """Create session notes for a patient"""
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden crear notas")
    
    # Verify patient is linked
    patient_profile = await db.user_profiles.find_one({
        "user_id": data.patient_id,
        "linked_therapist_id": current_user.user_id
    })
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Paciente no vinculado")
    
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    note = {
        "note_id": note_id,
        "therapist_id": current_user.user_id,
        "patient_id": data.patient_id,
        "session_date": data.session_date,
        "private_notes": data.private_notes,  # Confidential
        "session_summary": data.session_summary,  # Patient can see
        "goals_discussed": data.goals_discussed,  # Patient can see
        "next_session_focus": data.next_session_focus,
        "mood_rating": data.mood_rating,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.session_notes.insert_one(note)
    return {"success": True, "note_id": note_id}

@app.get("/api/professional/notes/{patient_id}")
async def get_patient_notes(patient_id: str, current_user: User = Depends(get_current_user)):
    """Get all session notes for a patient (full view for therapist)"""
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden ver notas completas")
    
    notes = await db.session_notes.find(
        {"therapist_id": current_user.user_id, "patient_id": patient_id},
        {"_id": 0}
    ).sort("session_date", -1).to_list(100)
    
    return notes

@app.get("/api/patient/session-notes")
async def get_my_session_summaries(current_user: User = Depends(get_current_user)):
    """Patient gets their session summaries (without private notes)"""
    notes = await db.session_notes.find(
        {"patient_id": current_user.user_id},
        {"_id": 0, "private_notes": 0, "mood_rating": 0}  # Exclude private fields
    ).sort("session_date", -1).to_list(100)
    
    # Get therapist name
    for note in notes:
        therapist = await db.users.find_one({"user_id": note["therapist_id"]})
        note["therapist_name"] = therapist.get("name", "Tu terapeuta") if therapist else "Tu terapeuta"
    
    return notes

@app.put("/api/professional/notes/{note_id}")
async def update_session_note(note_id: str, data: CreateSessionNoteRequest, current_user: User = Depends(get_current_user)):
    """Update a session note"""
    result = await db.session_notes.update_one(
        {"note_id": note_id, "therapist_id": current_user.user_id},
        {"$set": {
            "session_date": data.session_date,
            "private_notes": data.private_notes,
            "session_summary": data.session_summary,
            "goals_discussed": data.goals_discussed,
            "next_session_focus": data.next_session_focus,
            "mood_rating": data.mood_rating,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    
    return {"success": True}

# ============== PATIENT PROGRESS REPORTS ==============

@app.get("/api/professional/report/{patient_id}")
async def get_patient_progress_report(patient_id: str, days: int = 7, current_user: User = Depends(get_current_user)):
    """Generate a progress report for a patient"""
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden ver reportes")
    
    # Verify patient is linked
    patient_profile = await db.user_profiles.find_one({
        "user_id": patient_id,
        "linked_therapist_id": current_user.user_id
    })
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Paciente no vinculado")
    
    patient_user = await db.users.find_one({"user_id": patient_id})
    
    # Calculate date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Get emotional logs
    emotional_logs = await db.emotional_logs.find({
        "user_id": patient_id,
        "created_at": {"$gte": start_date}
    }).sort("created_at", -1).to_list(100)
    
    # Calculate mood stats
    moods = [log.get("mood", 5) for log in emotional_logs]
    avg_mood = sum(moods) / len(moods) if moods else 0
    lowest_mood = min(moods) if moods else 0
    highest_mood = max(moods) if moods else 0
    
    # Count cravings
    cravings = [log for log in emotional_logs if log.get("craving_intensity", 0) > 5]
    
    # Get habit data
    habits = await db.habits.find({"user_id": patient_id}).to_list(50)
    habit_stats = []
    
    for habit in habits:
        # Count completions in period
        completions = await db.habit_logs.count_documents({
            "habit_id": habit["habit_id"],
            "completed": True,
            "date": {"$gte": start_date.strftime("%Y-%m-%d")}
        })
        
        habit_stats.append({
            "name": habit["name"],
            "completions": completions,
            "target": days,  # One per day expected
            "completion_rate": round((completions / days) * 100, 1) if days > 0 else 0
        })
    
    # Get tasks completion
    tasks = await db.therapist_tasks.find({
        "patient_id": patient_id,
        "therapist_id": current_user.user_id
    }).to_list(100)
    
    tasks_total = len(tasks)
    tasks_completed = len([t for t in tasks if t.get("status") == "completed"])
    tasks_pending = len([t for t in tasks if t.get("status") == "pending"])
    
    # Days clean calculation
    days_clean = 0
    if patient_profile.get("clean_since"):
        try:
            clean_date = datetime.fromisoformat(patient_profile["clean_since"].replace('Z', '+00:00'))
            days_clean = (datetime.now(timezone.utc) - clean_date).days
        except:
            pass
    
    # Check for relapses (emotional logs with relapse=True)
    relapses = await db.emotional_logs.count_documents({
        "user_id": patient_id,
        "created_at": {"$gte": start_date},
        "relapse": True
    })
    
    # Build report
    report = {
        "patient": {
            "user_id": patient_id,
            "name": patient_user.get("name", "") if patient_user else "",
            "addiction_type": patient_profile.get("addiction_type"),
            "days_clean": days_clean
        },
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": days
        },
        "emotional": {
            "total_logs": len(emotional_logs),
            "average_mood": round(avg_mood, 1),
            "lowest_mood": lowest_mood,
            "highest_mood": highest_mood,
            "high_craving_episodes": len(cravings),
            "relapses": relapses,
            "mood_trend": "improving" if len(moods) >= 2 and moods[0] > moods[-1] else "stable" if len(moods) < 2 else "declining"
        },
        "habits": {
            "total_habits": len(habits),
            "details": habit_stats,
            "overall_completion_rate": round(sum(h["completion_rate"] for h in habit_stats) / len(habit_stats), 1) if habit_stats else 0
        },
        "tasks": {
            "total": tasks_total,
            "completed": tasks_completed,
            "pending": tasks_pending,
            "completion_rate": round((tasks_completed / tasks_total) * 100, 1) if tasks_total > 0 else 0
        },
        "alerts": [],
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Generate alerts based on data
    if avg_mood < 4:
        report["alerts"].append({"type": "warning", "message": "Estado emocional bajo en promedio"})
    if relapses > 0:
        report["alerts"].append({"type": "critical", "message": f"{relapses} recaída(s) reportada(s)"})
    if len(cravings) > 3:
        report["alerts"].append({"type": "warning", "message": f"{len(cravings)} episodios de craving intenso"})
    if report["habits"]["overall_completion_rate"] < 50:
        report["alerts"].append({"type": "info", "message": "Bajo cumplimiento de hábitos"})
    if len(emotional_logs) == 0:
        report["alerts"].append({"type": "info", "message": "Sin registros emocionales en el período"})
    
    return report

@app.get("/api/patient/my-progress")
async def get_my_progress_report(days: int = 7, current_user: User = Depends(get_current_user)):
    """Patient gets their own progress summary"""
    patient_profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Emotional stats
    emotional_logs = await db.emotional_logs.find({
        "user_id": current_user.user_id,
        "created_at": {"$gte": start_date}
    }).to_list(100)
    
    moods = [log.get("mood", 5) for log in emotional_logs]
    avg_mood = sum(moods) / len(moods) if moods else 0
    
    # Habits
    habits = await db.habits.find({"user_id": current_user.user_id}).to_list(50)
    total_completions = 0
    
    for habit in habits:
        completions = await db.habit_logs.count_documents({
            "habit_id": habit["habit_id"],
            "completed": True,
            "date": {"$gte": start_date.strftime("%Y-%m-%d")}
        })
        total_completions += completions
    
    # Tasks
    tasks = await db.therapist_tasks.find({"patient_id": current_user.user_id}).to_list(100)
    tasks_completed = len([t for t in tasks if t.get("status") == "completed"])
    
    # Days clean
    days_clean = 0
    if patient_profile and patient_profile.get("clean_since"):
        try:
            clean_date = datetime.fromisoformat(patient_profile["clean_since"].replace('Z', '+00:00'))
            days_clean = (datetime.now(timezone.utc) - clean_date).days
        except:
            pass
    
    return {
        "days_clean": days_clean,
        "period_days": days,
        "emotional": {
            "logs_count": len(emotional_logs),
            "average_mood": round(avg_mood, 1)
        },
        "habits": {
            "total": len(habits),
            "completions": total_completions
        },
        "tasks": {
            "total": len(tasks),
            "completed": tasks_completed
        }
    }

# ============== ALERT SYSTEM ENDPOINTS ==============

@app.get("/api/professional/alerts")
async def get_professional_alerts(current_user: User = Depends(get_current_user)):
    """Get all alerts for a professional, generating them dynamically"""
    # Verify user is a professional
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden ver alertas")
    
    alerts = []
    today = datetime.now(timezone.utc)
    three_days_ago = today - timedelta(days=3)
    
    # Get all patients linked to this professional
    patients = await db.user_profiles.find(
        {"linked_therapist_id": current_user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for patient_profile in patients:
        patient_id = patient_profile.get("user_id")
        patient_user = await db.users.find_one({"user_id": patient_id}, {"_id": 0})
        patient_name = patient_user.get("name", "Paciente") if patient_user else "Paciente"
        
        # 1. Check for RELAPSES (Critical)
        recent_relapses = await db.relapses.find(
            {"user_id": patient_id},
            {"_id": 0}
        ).sort("reported_at", -1).limit(5).to_list(5)
        
        for relapse in recent_relapses:
            reported_at = relapse.get("reported_at")
            if isinstance(reported_at, datetime):
                days_since = (today - reported_at).days
                if days_since <= 7:  # Show relapses from last 7 days
                    alerts.append({
                        "alert_id": f"relapse_{relapse.get('relapse_id', '')}",
                        "professional_id": current_user.user_id,
                        "patient_id": patient_id,
                        "patient_name": patient_name,
                        "alert_type": "relapse",
                        "severity": "critical",
                        "title": "🚨 Recaída Reportada",
                        "description": f"{patient_name} reportó una recaída el {relapse.get('date', 'fecha desconocida')}. Sustancia: {relapse.get('substance', 'No especificada')}. Trigger: {relapse.get('trigger', 'No especificado')}.",
                        "created_at": reported_at.isoformat() if isinstance(reported_at, datetime) else str(reported_at),
                        "is_read": False,
                        "is_resolved": False,
                        "data": relapse
                    })
        
        # 2. Check for INACTIVITY (3+ days without activity)
        last_emotional_log = await db.emotional_logs.find_one(
            {"user_id": patient_id},
            {"_id": 0}
        )
        
        last_habit_log = await db.habit_logs.find_one(
            {"user_id": patient_id},
            {"_id": 0}
        )
        
        # Determine last activity date
        last_activity = None
        if last_emotional_log:
            try:
                log_date = datetime.strptime(last_emotional_log.get("date", ""), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                last_activity = log_date
            except:
                pass
        
        if last_habit_log:
            try:
                habit_date = datetime.strptime(last_habit_log.get("date", ""), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if not last_activity or habit_date > last_activity:
                    last_activity = habit_date
            except:
                pass
        
        if last_activity:
            days_inactive = (today - last_activity).days
            if days_inactive >= 3:
                severity = "high" if days_inactive >= 7 else "medium"
                alerts.append({
                    "alert_id": f"inactivity_{patient_id}_{today.strftime('%Y%m%d')}",
                    "professional_id": current_user.user_id,
                    "patient_id": patient_id,
                    "patient_name": patient_name,
                    "alert_type": "inactivity",
                    "severity": severity,
                    "title": f"⚠️ {days_inactive} días sin actividad",
                    "description": f"{patient_name} no ha registrado actividad en los últimos {days_inactive} días. Última actividad: {last_activity.strftime('%d/%m/%Y')}.",
                    "created_at": today.isoformat(),
                    "is_read": False,
                    "is_resolved": False,
                    "data": {"days_inactive": days_inactive, "last_activity": last_activity.isoformat()}
                })
        
        # 3. Check for NEGATIVE EMOTIONS
        recent_emotions = await db.emotional_logs.find(
            {"user_id": patient_id},
            {"_id": 0}
        ).sort("date", -1).limit(7).to_list(7)
        
        negative_count = 0
        very_negative_found = False
        for log in recent_emotions:
            mood = log.get("mood", 5)
            anxiety = log.get("anxiety", 0)
            
            if mood <= 2:  # Very low mood
                very_negative_found = True
                negative_count += 1
            elif mood <= 3:  # Low mood
                negative_count += 1
            
            if anxiety >= 4:  # High anxiety
                negative_count += 1
        
        if very_negative_found or negative_count >= 3:
            severity = "high" if very_negative_found else "medium"
            alerts.append({
                "alert_id": f"emotion_{patient_id}_{today.strftime('%Y%m%d')}",
                "professional_id": current_user.user_id,
                "patient_id": patient_id,
                "patient_name": patient_name,
                "alert_type": "negative_emotion",
                "severity": severity,
                "title": "😔 Emociones Negativas Detectadas",
                "description": f"{patient_name} ha reportado estados emocionales negativos en los últimos días. Se recomienda seguimiento.",
                "created_at": today.isoformat(),
                "is_read": False,
                "is_resolved": False,
                "data": {"negative_count": negative_count, "very_negative": very_negative_found}
            })
    
    # Sort alerts by severity and date
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda x: (severity_order.get(x["severity"], 4), x["created_at"]), reverse=False)
    
    return {"alerts": alerts}

@app.get("/api/professional/alerts/summary")
async def get_alerts_summary(current_user: User = Depends(get_current_user)):
    """Get a summary count of alerts by type"""
    alerts_response = await get_professional_alerts(current_user)
    alerts = alerts_response.get("alerts", [])
    
    summary = {
        "total": len(alerts),
        "critical": len([a for a in alerts if a["severity"] == "critical"]),
        "high": len([a for a in alerts if a["severity"] == "high"]),
        "medium": len([a for a in alerts if a["severity"] == "medium"]),
        "by_type": {
            "relapse": len([a for a in alerts if a["alert_type"] == "relapse"]),
            "inactivity": len([a for a in alerts if a["alert_type"] == "inactivity"]),
            "negative_emotion": len([a for a in alerts if a["alert_type"] == "negative_emotion"])
        }
    }
    
    return summary

@app.post("/api/patient/report-relapse")
async def report_relapse(data: ReportRelapseRequest, current_user: User = Depends(get_current_user)):
    """Patient reports a relapse"""
    relapse_id = f"relapse_{uuid.uuid4().hex[:12]}"
    
    relapse = {
        "relapse_id": relapse_id,
        "user_id": current_user.user_id,
        "date": data.date,
        "substance": data.substance,
        "trigger": data.trigger,
        "notes": data.notes,
        "reported_at": datetime.now(timezone.utc)
    }
    
    await db.relapses.insert_one(relapse)
    
    # Optionally reset clean_since date
    await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "clean_since": data.date,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True, "relapse_id": relapse_id, "message": "Recaída registrada. Tu contador de días ha sido reiniciado."}

@app.get("/api/patient/relapses")
async def get_patient_relapses(current_user: User = Depends(get_current_user)):
    """Get patient's relapse history"""
    relapses = await db.relapses.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("reported_at", -1).to_list(50)
    
    return relapses

# ============== ADMIN ENDPOINTS ==============

ADMIN_EMAIL = "contacto@sinadicciones.org"

async def is_admin(user: User) -> bool:
    """Check if user is admin"""
    if user.email == ADMIN_EMAIL:
        return True
    profile = await db.user_profiles.find_one({"user_id": user.user_id})
    return profile and profile.get("role") == "admin"

@app.get("/api/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    """Get global platform statistics - Admin only"""
    if not await is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")
    
    today = datetime.now(timezone.utc)
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Users by role
    total_patients = await db.user_profiles.count_documents({"role": "patient"})
    total_professionals = await db.user_profiles.count_documents({"role": "professional"})
    total_admins = await db.user_profiles.count_documents({"role": "admin"})
    
    # Profiles completed
    profiles_completed = await db.user_profiles.count_documents({"profile_completed": True})
    
    # Active users (with activity in last 7 days)
    recent_emotional_logs = await db.emotional_logs.distinct("user_id")
    recent_habit_logs = await db.habit_logs.distinct("user_id")
    active_users = len(set(recent_emotional_logs) | set(recent_habit_logs))
    
    # Total habits created
    total_habits = await db.habits.count_documents({"is_active": True})
    
    # Total emotional logs
    total_emotional_logs = await db.emotional_logs.count_documents({})
    
    # Total relapses
    total_relapses = await db.relapses.count_documents({})
    
    # Linked patients (with therapist)
    linked_patients = await db.user_profiles.count_documents({
        "role": "patient",
        "linked_therapist_id": {"$ne": None}
    })
    
    # Average mood (last 7 days)
    pipeline = [
        {"$group": {"_id": None, "avg_mood": {"$avg": "$mood_scale"}}}
    ]
    mood_result = await db.emotional_logs.aggregate(pipeline).to_list(1)
    avg_mood = 0
    if mood_result and mood_result[0].get("avg_mood") is not None:
        avg_mood = round(mood_result[0]["avg_mood"], 1)
    
    # Registrations over time (last 30 days) - simplified
    # We'll estimate based on user_id patterns
    
    return {
        "users": {
            "total": total_users,
            "patients": total_patients,
            "professionals": total_professionals,
            "admins": total_admins,
            "active": active_users,
            "profiles_completed": profiles_completed
        },
        "engagement": {
            "total_habits": total_habits,
            "total_emotional_logs": total_emotional_logs,
            "total_relapses": total_relapses,
            "linked_patients": linked_patients,
            "avg_mood": avg_mood
        },
        "timestamp": today.isoformat()
    }

@app.get("/api/admin/users")
async def get_admin_users(
    current_user: User = Depends(get_current_user),
    role: str = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all users - Admin only"""
    if not await is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")
    
    # Build filter
    profile_filter = {}
    if role:
        profile_filter["role"] = role
    
    # Get profiles with filter
    profiles = await db.user_profiles.find(
        profile_filter,
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user data
    users = []
    for profile in profiles:
        user = await db.users.find_one(
            {"user_id": profile["user_id"]},
            {"_id": 0}
        )
        if user:
            # Count activity
            emotional_count = await db.emotional_logs.count_documents({"user_id": profile["user_id"]})
            habit_count = await db.habits.count_documents({"user_id": profile["user_id"], "is_active": True})
            
            users.append({
                "user_id": profile["user_id"],
                "name": user.get("name"),
                "email": user.get("email"),
                "picture": user.get("picture"),
                "role": profile.get("role", "patient"),
                "profile_completed": profile.get("profile_completed", False),
                "clean_since": profile.get("clean_since"),
                "addiction_type": profile.get("addiction_type"),
                "professional_type": profile.get("professional_type"),
                "linked_therapist_id": profile.get("linked_therapist_id"),
                "created_at": user.get("created_at"),
                "stats": {
                    "emotional_logs": emotional_count,
                    "habits": habit_count
                }
            })
    
    total = await db.user_profiles.count_documents(profile_filter)
    
    return {
        "users": users,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@app.get("/api/admin/activity")
async def get_admin_activity(current_user: User = Depends(get_current_user)):
    """Get recent platform activity - Admin only"""
    if not await is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")
    
    activity = []
    
    # Recent emotional logs
    recent_logs = await db.emotional_logs.find(
        {},
        {"_id": 0}
    ).sort("date", -1).limit(20).to_list(20)
    
    for log in recent_logs:
        user = await db.users.find_one({"user_id": log["user_id"]}, {"name": 1, "_id": 0})
        activity.append({
            "type": "emotional_log",
            "user_id": log["user_id"],
            "user_name": user.get("name") if user else "Usuario",
            "description": f"Registró estado emocional (Ánimo: {log.get('mood', 0)}/5)",
            "date": log.get("date"),
            "icon": "heart"
        })
    
    # Recent relapses
    recent_relapses = await db.relapses.find(
        {},
        {"_id": 0}
    ).sort("reported_at", -1).limit(10).to_list(10)
    
    for relapse in recent_relapses:
        user = await db.users.find_one({"user_id": relapse["user_id"]}, {"name": 1, "_id": 0})
        activity.append({
            "type": "relapse",
            "user_id": relapse["user_id"],
            "user_name": user.get("name") if user else "Usuario",
            "description": f"Reportó una recaída",
            "date": relapse.get("date"),
            "icon": "warning"
        })
    
    # Sort by date
    activity.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return activity[:30]

@app.post("/api/admin/set-role")
async def admin_set_user_role(
    user_id: str,
    new_role: str,
    current_user: User = Depends(get_current_user)
):
    """Change a user's role - Admin only"""
    if not await is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")
    
    if new_role not in ["patient", "professional", "admin"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    
    result = await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"role": new_role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"success": True, "message": f"Rol actualizado a {new_role}"}

# ============== HABIT ENDPOINTS ==============

@app.get("/api/habits")
async def get_habits(current_user: User = Depends(get_current_user)):
    habits = await db.habits.find(
        {"user_id": current_user.user_id, "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Calculate streaks for each habit
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    for habit in habits:
        # Get logs for this habit
        logs = await db.habit_logs.find(
            {"habit_id": habit["habit_id"], "completed": True},
            {"_id": 0}
        ).sort("date", -1).to_list(365)
        
        # Calculate streak
        streak = 0
        check_date = datetime.now(timezone.utc)
        
        for log in logs:
            if log["date"] == check_date.strftime("%Y-%m-%d"):
                streak += 1
                check_date = check_date - timedelta(days=1)
            else:
                break
        
        habit["streak"] = streak
        
        # Check if completed today
        today_log = await db.habit_logs.find_one(
            {"habit_id": habit["habit_id"], "date": today},
            {"_id": 0}
        )
        habit["completed_today"] = today_log["completed"] if today_log else False
    
    return habits

@app.post("/api/habits")
async def create_habit(habit_data: dict, current_user: User = Depends(get_current_user)):
    habit_id = f"habit_{uuid.uuid4().hex[:12]}"
    
    habit = {
        "habit_id": habit_id,
        "user_id": current_user.user_id,
        "name": habit_data["name"],
        "frequency": habit_data.get("frequency", "daily"),
        "color": habit_data.get("color", "#10B981"),
        "icon": habit_data.get("icon"),
        "reminder_time": habit_data.get("reminder_time"),
        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
    
    await db.habits.insert_one(habit)
    
    return {"success": True, "habit_id": habit_id}

@app.put("/api/habits/{habit_id}")
async def update_habit(habit_id: str, habit_data: dict, current_user: User = Depends(get_current_user)):
    result = await db.habits.update_one(
        {"habit_id": habit_id, "user_id": current_user.user_id},
        {"$set": habit_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    return {"success": True}

@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: str, current_user: User = Depends(get_current_user)):
    result = await db.habits.update_one(
        {"habit_id": habit_id, "user_id": current_user.user_id},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    return {"success": True}

@app.post("/api/habits/{habit_id}/log")
async def log_habit(habit_id: str, log_data: dict, current_user: User = Depends(get_current_user)):
    date = log_data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    
    # Check if log already exists for this date
    existing_log = await db.habit_logs.find_one(
        {"habit_id": habit_id, "user_id": current_user.user_id, "date": date},
        {"_id": 0}
    )
    
    if existing_log:
        # Update existing log
        await db.habit_logs.update_one(
            {"habit_id": habit_id, "user_id": current_user.user_id, "date": date},
            {"$set": {
                "completed": log_data.get("completed", True),
                "note": log_data.get("note"),
                "logged_at": datetime.now(timezone.utc)
            }}
        )
        return {"success": True, "log_id": existing_log["log_id"]}
    else:
        # Create new log
        log_id = f"log_{uuid.uuid4().hex[:12]}"
        
        await db.habit_logs.insert_one({
            "log_id": log_id,
            "habit_id": habit_id,
            "user_id": current_user.user_id,
            "completed": log_data.get("completed", True),
            "note": log_data.get("note"),
            "date": date,
            "logged_at": datetime.now(timezone.utc)
        })
        
        return {"success": True, "log_id": log_id}

@app.get("/api/habits/{habit_id}/logs")
async def get_habit_logs(habit_id: str, current_user: User = Depends(get_current_user)):
    logs = await db.habit_logs.find(
        {"habit_id": habit_id, "user_id": current_user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(365)
    
    return logs

@app.get("/api/habits/history")
async def get_habits_history(current_user: User = Depends(get_current_user)):
    """Get habit completion history by date"""
    # Get all habit logs for user
    logs = await db.habit_logs.find(
        {"user_id": current_user.user_id},
        {"_id": 0, "date": 1, "completed": 1}
    ).to_list(365)
    
    # Aggregate by date
    history_map = {}
    for log in logs:
        date = log.get("date", "")
        if date:
            if date not in history_map:
                history_map[date] = {"date": date, "completed_count": 0, "total_count": 0}
            history_map[date]["total_count"] += 1
            if log.get("completed"):
                history_map[date]["completed_count"] += 1
    
    return list(history_map.values())


# ============== EMOTIONAL LOG ENDPOINTS ==============

@app.get("/api/emotional-logs")
async def get_emotional_logs(current_user: User = Depends(get_current_user)):
    logs = await db.emotional_logs.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(365)
    
    return logs

@app.post("/api/emotional-logs")
async def create_emotional_log(log_data: dict, current_user: User = Depends(get_current_user)):
    date = log_data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    
    # Check if log already exists for today
    existing_log = await db.emotional_logs.find_one(
        {"user_id": current_user.user_id, "date": date},
        {"_id": 0}
    )
    
    if existing_log:
        # Update existing log
        await db.emotional_logs.update_one(
            {"user_id": current_user.user_id, "date": date},
            {"$set": {
                "mood_scale": log_data["mood_scale"],
                "note": log_data.get("note"),
                "tags": log_data.get("tags", []),
                "logged_at": datetime.now(timezone.utc)
            }}
        )
        return {"success": True, "log_id": existing_log["log_id"]}
    else:
        # Create new log
        log_id = f"elog_{uuid.uuid4().hex[:12]}"
        
        await db.emotional_logs.insert_one({
            "log_id": log_id,
            "user_id": current_user.user_id,
            "mood_scale": log_data["mood_scale"],
            "note": log_data.get("note"),
            "tags": log_data.get("tags", []),
            "date": date,
            "logged_at": datetime.now(timezone.utc)
        })
        
        return {"success": True, "log_id": log_id}

@app.get("/api/emotional-logs/stats")
async def get_emotional_stats(current_user: User = Depends(get_current_user)):
    # Get last 30 days of logs
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    logs = await db.emotional_logs.find(
        {"user_id": current_user.user_id, "date": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).sort("date", 1).to_list(30)
    
    # Calculate average mood - support both mood and mood_scale field names
    if logs:
        avg_mood = sum(log.get("mood_scale") or log.get("mood", 5) for log in logs) / len(logs)
    else:
        avg_mood = 0
    
    # Get most common tags - support both tags and emotions field names
    tag_counts = {}
    for log in logs:
        for tag in log.get("tags", []) or log.get("emotions", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    return {
        "average_mood": round(avg_mood, 1),
        "total_logs": len(logs),
        "common_tags": sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5],
        "recent_logs": logs[-7:]  # Last 7 days
    }

# ============== PROFILE ENDPOINTS ==============

@app.get("/api/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    profile = await db.user_profiles.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not profile:
        # Create default profile if it doesn't exist
        profile_data = {
            "user_id": current_user.user_id,
            "addiction_type": None,
            "secondary_addictions": [],
            "years_using": None,
            "clean_since": None,
            "dual_diagnosis": False,
            "diagnoses": [],
            "triggers": [],
            "protective_factors": [],
            "addictive_beliefs": [],
            "permissive_beliefs": [],
            "life_story": None,
            "emergency_contacts": [],
            "my_why": None,
            "profile_completed": False,
            "updated_at": datetime.now(timezone.utc)
        }
        await db.user_profiles.insert_one(profile_data)
        
        # Return the profile without _id
        profile = await db.user_profiles.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0}
        )
    
    return profile

@app.put("/api/profile")
async def update_profile(profile_data: dict, current_user: User = Depends(get_current_user)):
    profile_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": profile_data}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        # Profile doesn't exist, create it
        profile_data["user_id"] = current_user.user_id
        await db.user_profiles.insert_one(profile_data)
    
    return {"success": True}

class ProfilePhotoRequest(BaseModel):
    photo: str

@app.post("/api/profile/photo")
async def update_profile_photo(data: ProfilePhotoRequest, current_user: User = Depends(get_current_user)):
    """Update user's profile photo (base64 encoded)"""
    # Validate that photo is base64
    if not data.photo.startswith('data:image/'):
        raise HTTPException(status_code=400, detail="Formato de imagen no válido")
    
    # Update profile with photo
    result = await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"profile_photo": data.photo, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        # Profile doesn't exist, create it with photo
        await db.user_profiles.insert_one({
            "user_id": current_user.user_id,
            "profile_photo": data.photo,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
    
    return {"success": True, "message": "Foto de perfil actualizada"}

# ============== DASHBOARD STATS ==============

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get total habits
    total_habits = await db.habits.count_documents(
        {"user_id": current_user.user_id, "is_active": True}
    )
    
    # Get today's completion rate
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_logs = await db.habit_logs.find(
        {"user_id": current_user.user_id, "date": today, "completed": True},
        {"_id": 0}
    ).to_list(100)
    
    completion_rate = (len(today_logs) / total_habits * 100) if total_habits > 0 else 0
    
    # Get longest streak
    habits = await db.habits.find(
        {"user_id": current_user.user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    longest_streak = 0
    for habit in habits:
        logs = await db.habit_logs.find(
            {"habit_id": habit["habit_id"], "completed": True},
            {"_id": 0}
        ).sort("date", -1).to_list(365)
        
        streak = 0
        check_date = datetime.now(timezone.utc)
        
        for log in logs:
            if log["date"] == check_date.strftime("%Y-%m-%d"):
                streak += 1
                check_date = check_date - timedelta(days=1)
            else:
                break
        
        if streak > longest_streak:
            longest_streak = streak
    
    # Get recent mood
    recent_mood = await db.emotional_logs.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("date", -1).limit(1).to_list(1)
    recent_mood = recent_mood[0] if recent_mood else None
    
    return {
        "total_habits": total_habits,
        "completion_rate": round(completion_rate, 1),
        "longest_streak": longest_streak,
        "recent_mood": recent_mood.get("mood") or recent_mood.get("mood_scale") if recent_mood else None
    }

@app.get("/api/dashboard/integrated")
async def get_integrated_dashboard(current_user: User = Depends(get_current_user)):
    """Get comprehensive integrated dashboard data"""
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
    # ============== SOBRIEDAD ==============
    profile = await db.user_profiles.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    days_clean = 0
    clean_since = None
    if profile and profile.get("clean_since"):
        try:
            clean_since_str = profile["clean_since"]
            # Handle different date formats
            if "T" in clean_since_str:
                # ISO format with time
                clean_date = datetime.fromisoformat(clean_since_str.replace("Z", "+00:00"))
            else:
                # Simple date format YYYY-MM-DD
                clean_date = datetime.strptime(clean_since_str, "%Y-%m-%d")
                clean_date = clean_date.replace(tzinfo=timezone.utc)
            
            days_clean = (now - clean_date).days
            clean_since = clean_since_str
        except Exception as e:
            print(f"Error parsing clean_since: {e}")
            pass
    
    # Próximo hito
    milestones = [7, 14, 30, 60, 90, 180, 365, 500, 730, 1000, 1095, 1825]
    next_milestone = None
    days_to_milestone = None
    for m in milestones:
        if days_clean < m:
            next_milestone = m
            days_to_milestone = m - days_clean
            break
    
    # ============== HÁBITOS ==============
    habits = await db.habits.find(
        {"user_id": current_user.user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    total_habits = len(habits)
    
    # Logs de hoy
    today_logs = await db.habit_logs.find(
        {"user_id": current_user.user_id, "date": today, "completed": True},
        {"_id": 0}
    ).to_list(100)
    
    habits_completed_today = len(today_logs)
    habits_completion_rate = round((habits_completed_today / total_habits * 100) if total_habits > 0 else 0, 1)
    
    # Racha más larga y días sin registrar
    longest_streak = 0
    last_habit_date = None
    
    for habit in habits:
        logs = await db.habit_logs.find(
            {"habit_id": habit["habit_id"], "completed": True},
            {"_id": 0}
        ).sort("date", -1).to_list(365)
        
        if logs:
            log_date = logs[0]["date"]
            if not last_habit_date or log_date > last_habit_date:
                last_habit_date = log_date
        
        streak = 0
        check_date = now
        for log in logs:
            if log["date"] == check_date.strftime("%Y-%m-%d"):
                streak += 1
                check_date = check_date - timedelta(days=1)
            else:
                break
        
        if streak > longest_streak:
            longest_streak = streak
    
    # Calcular días sin registrar hábitos
    days_without_habits = 0
    if last_habit_date:
        try:
            last_date = datetime.strptime(last_habit_date, "%Y-%m-%d")
            days_without_habits = (now.replace(tzinfo=None) - last_date).days
        except:
            pass
    
    # ============== EMOCIONAL ==============
    # Últimos 7 días de ánimo
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    emotional_logs = await db.emotional_logs.find(
        {"user_id": current_user.user_id, "date": {"$gte": week_ago}},
        {"_id": 0}
    ).sort("date", 1).to_list(7)
    
    mood_data = []
    mood_sum = 0
    for log in emotional_logs:
        mood_data.append({
            "date": log["date"],
            "mood": log.get("mood_scale", 5)
        })
        mood_sum += log.get("mood_scale", 5)
    
    avg_mood = round(mood_sum / len(emotional_logs), 1) if emotional_logs else 0
    
    # Último registro emocional
    last_emotional = await db.emotional_logs.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("date", -1).limit(1).to_list(1)
    
    last_emotional_date = last_emotional[0]["date"] if last_emotional else None
    days_without_emotional = 0
    if last_emotional_date:
        try:
            last_date = datetime.strptime(last_emotional_date, "%Y-%m-%d")
            days_without_emotional = (now.replace(tzinfo=None) - last_date).days
        except:
            pass
    
    # Tendencia de ánimo (comparar últimos 3 días con 3 anteriores)
    mood_trend = "stable"
    if len(emotional_logs) >= 4:
        recent_moods = [l.get("mood_scale", 5) for l in emotional_logs[-3:]]
        older_moods = [l.get("mood_scale", 5) for l in emotional_logs[-6:-3]] if len(emotional_logs) >= 6 else [l.get("mood_scale", 5) for l in emotional_logs[:3]]
        
        recent_avg = sum(recent_moods) / len(recent_moods)
        older_avg = sum(older_moods) / len(older_moods)
        
        if recent_avg > older_avg + 0.5:
            mood_trend = "up"
        elif recent_avg < older_avg - 0.5:
            mood_trend = "down"
    
    # ============== PROPÓSITO ==============
    purpose_test = await db.purpose_tests.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("completed_at", -1).limit(1).to_list(1)
    
    purpose_profile = purpose_test[0].get("profile", {}) if purpose_test else None
    
    # Check-ins de propósito (goals)
    goals = await db.purpose_goals.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    total_goals = len(goals)
    completed_goals = len([g for g in goals if g.get("status") == "completed"])
    
    # ============== ALERTAS ==============
    alerts = []
    
    # Alerta de hábitos
    if days_without_habits >= 2:
        alerts.append({
            "type": "habits",
            "severity": "warning" if days_without_habits >= 3 else "info",
            "title": f"¡No has registrado hábitos en {days_without_habits} días!",
            "message": "Mantener la constancia es clave para tu recuperación",
            "action": "habits",
            "icon": "checkmark-circle"
        })
    
    # Alerta emocional
    if days_without_emotional >= 2:
        alerts.append({
            "type": "emotional",
            "severity": "info",
            "title": f"Llevas {days_without_emotional} días sin registrar tu estado emocional",
            "message": "Expresar tus emociones te ayuda a procesarlas",
            "action": "emotional",
            "icon": "heart"
        })
    
    # Alerta de ánimo bajo
    if mood_trend == "down":
        alerts.append({
            "type": "mood_down",
            "severity": "warning",
            "title": "Tu ánimo ha bajado esta semana",
            "message": "Revisa tu caja de herramientas para encontrar apoyo",
            "action": "profile",
            "icon": "sad"
        })
    
    # Alerta de propósito
    if not purpose_profile:
        alerts.append({
            "type": "purpose",
            "severity": "info",
            "title": "Descubre tu propósito de vida",
            "message": "Completar el test te ayudará a encontrar motivación",
            "action": "purpose",
            "icon": "compass"
        })
    
    # ============== INSIGHTS ==============
    insights = []
    
    # Insight de correlación hábitos-ánimo
    if habits_completion_rate > 70 and avg_mood >= 6:
        insights.append({
            "type": "positive",
            "message": "¡Cuando completas tus hábitos, tu ánimo mejora! Sigue así 💪"
        })
    elif habits_completion_rate < 30 and avg_mood < 5:
        insights.append({
            "type": "suggestion",
            "message": "Completar pequeños hábitos puede ayudarte a sentirte mejor"
        })
    
    # Insight de racha
    if longest_streak >= 7:
        insights.append({
            "type": "achievement",
            "message": f"¡Increíble! Llevas {longest_streak} días de racha. ¡No te detengas!"
        })
    
    # Insight de sobriedad
    if days_clean > 0 and days_clean % 7 == 0:
        weeks = days_clean // 7
        insights.append({
            "type": "milestone",
            "message": f"¡Felicidades! Completas {weeks} semana{'s' if weeks > 1 else ''} de sobriedad"
        })
    
    # ============== FRASES MOTIVACIONALES ==============
    motivational_quotes = [
        {"quote": "Un día a la vez. Un paso a la vez.", "author": "Anónimo"},
        {"quote": "El cambio es difícil al principio, caótico en el medio y hermoso al final.", "author": "Robin Sharma"},
        {"quote": "No tienes que ver toda la escalera, solo da el primer paso.", "author": "Martin Luther King Jr."},
        {"quote": "La recuperación es un proceso, no un evento.", "author": "Anne Wilson Schaef"},
        {"quote": "Cada día es una nueva oportunidad para cambiar tu vida.", "author": "Anónimo"},
        {"quote": "Tu adicción no define quién eres, tu recuperación sí.", "author": "Anónimo"},
        {"quote": "El coraje no es la ausencia del miedo, sino la decisión de que algo más es más importante.", "author": "Ambrose Redmoon"},
    ]
    
    # Seleccionar frase basada en el día
    quote_index = now.timetuple().tm_yday % len(motivational_quotes)
    daily_quote = motivational_quotes[quote_index]
    
    # ============== SCORES DE BIENESTAR ==============
    # Calcular scores para la rueda de bienestar (0-100)
    habits_score = min(100, habits_completion_rate + (longest_streak * 2))
    emotional_score = min(100, (avg_mood / 10) * 100) if avg_mood > 0 else 50
    purpose_score = 100 if purpose_profile else 30
    if total_goals > 0:
        purpose_score = min(100, 30 + (completed_goals / total_goals * 70))
    
    # Score general
    overall_score = round((habits_score + emotional_score + purpose_score) / 3, 1)
    
    return {
        "sobriety": {
            "days_clean": days_clean,
            "clean_since": clean_since,
            "next_milestone": next_milestone,
            "days_to_milestone": days_to_milestone
        },
        "habits": {
            "total": total_habits,
            "completed_today": habits_completed_today,
            "completion_rate": habits_completion_rate,
            "longest_streak": longest_streak,
            "days_without_logging": days_without_habits
        },
        "emotional": {
            "avg_mood": avg_mood,
            "mood_trend": mood_trend,
            "mood_data": mood_data,
            "days_without_logging": days_without_emotional,
            "last_mood": emotional_logs[-1].get("mood_scale") if emotional_logs else None
        },
        "purpose": {
            "has_profile": purpose_profile is not None,
            "profile_type": purpose_profile.get("type") if purpose_profile else None,
            "total_goals": total_goals,
            "completed_goals": completed_goals
        },
        "wellness_scores": {
            "habits": round(habits_score),
            "emotional": round(emotional_score),
            "purpose": round(purpose_score),
            "overall": overall_score
        },
        "alerts": alerts,
        "insights": insights,
        "daily_quote": daily_quote
    }

# ============== PURPOSE (SOBRIEDAD CON SENTIDO) ENDPOINTS ==============

@app.post("/api/purpose/areas")
async def save_life_areas(data: dict, current_user: User = Depends(get_current_user)):
    """Save user's priority life areas from onboarding"""
    areas = data.get("areas", [])
    
    # Save or update life areas
    await db.life_areas.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "user_id": current_user.user_id,
                "areas": areas,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {"success": True, "areas_count": len(areas)}

@app.get("/api/purpose/areas")
async def get_life_areas(current_user: User = Depends(get_current_user)):
    """Get user's life areas"""
    result = await db.life_areas.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    return result or {"areas": []}

@app.post("/api/purpose/test")
async def save_purpose_test(test_data: dict, current_user: User = Depends(get_current_user)):
    test_id = f"purpose_{uuid.uuid4().hex[:12]}"
    
    test_record = {
        "test_id": test_id,
        "user_id": current_user.user_id,
        "answers": test_data.get("answers", {}),
        "profile": test_data.get("profile", {}),
        "completed_at": datetime.now(timezone.utc)
    }
    
    await db.purpose_tests.insert_one(test_record)
    
    return {"success": True, "test_id": test_id}

@app.get("/api/purpose/test")
async def get_purpose_test(current_user: User = Depends(get_current_user)):
    tests = await db.purpose_tests.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(1)
    
    return tests[0] if tests else None

@app.delete("/api/purpose/test")
async def delete_purpose_test(current_user: User = Depends(get_current_user)):
    """Delete all purpose tests for the user to allow retaking the test"""
    result = await db.purpose_tests.delete_many({"user_id": current_user.user_id})
    return {"success": True, "deleted_count": result.deleted_count}

@app.get("/api/purpose/goals")
async def get_purpose_goals(current_user: User = Depends(get_current_user)):
    goals = await db.purpose_goals.find(
        {"user_id": current_user.user_id, "status": {"$ne": "deleted"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return goals

@app.post("/api/purpose/goals")
async def create_purpose_goal(goal_data: dict, current_user: User = Depends(get_current_user)):
    goal_id = f"goal_{uuid.uuid4().hex[:12]}"
    
    goal = {
        "goal_id": goal_id,
        "user_id": current_user.user_id,
        "area": goal_data["area"],
        "title": goal_data["title"],
        "description": goal_data.get("description"),
        "target_date": goal_data.get("target_date"),
        "status": "active",
        "progress": 0,
        "steps": goal_data.get("steps", []),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.purpose_goals.insert_one(goal)
    
    return {"success": True, "goal_id": goal_id}

@app.put("/api/purpose/goals/{goal_id}")
async def update_purpose_goal(goal_id: str, goal_data: dict, current_user: User = Depends(get_current_user)):
    goal_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.purpose_goals.update_one(
        {"goal_id": goal_id, "user_id": current_user.user_id},
        {"$set": goal_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return {"success": True}

@app.delete("/api/purpose/goals/{goal_id}")
async def delete_purpose_goal(goal_id: str, current_user: User = Depends(get_current_user)):
    result = await db.purpose_goals.update_one(
        {"goal_id": goal_id, "user_id": current_user.user_id},
        {"$set": {"status": "deleted", "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return {"success": True}

@app.get("/api/purpose/checkins")
async def get_weekly_checkins(current_user: User = Depends(get_current_user)):
    checkins = await db.weekly_checkins.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("week_start", -1).to_list(52)  # Last year
    
    return checkins

@app.post("/api/purpose/checkins")
async def create_weekly_checkin(checkin_data: dict, current_user: User = Depends(get_current_user)):
    checkin_id = f"checkin_{uuid.uuid4().hex[:12]}"
    
    checkin = {
        "checkin_id": checkin_id,
        "user_id": current_user.user_id,
        "week_start": checkin_data["week_start"],
        "area_ratings": checkin_data.get("area_ratings", {}),
        "achievements": checkin_data.get("achievements", []),
        "challenges": checkin_data.get("challenges", []),
        "next_week_plan": checkin_data.get("next_week_plan"),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.weekly_checkins.insert_one(checkin)
    
    return {"success": True, "checkin_id": checkin_id}

@app.get("/api/purpose/stats")
async def get_purpose_stats(current_user: User = Depends(get_current_user)):
    # Get test profile
    tests = await db.purpose_tests.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(1)
    
    test = tests[0] if tests else None
    
    # Get goals by area
    goals = await db.purpose_goals.find(
        {"user_id": current_user.user_id, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate stats
    goals_by_area = {}
    total_progress = 0
    
    for goal in goals:
        area = goal["area"]
        if area not in goals_by_area:
            goals_by_area[area] = {"count": 0, "avg_progress": 0, "total_progress": 0}
        
        goals_by_area[area]["count"] += 1
        goals_by_area[area]["total_progress"] += goal.get("progress", 0)
        total_progress += goal.get("progress", 0)
    
    for area in goals_by_area:
        if goals_by_area[area]["count"] > 0:
            goals_by_area[area]["avg_progress"] = goals_by_area[area]["total_progress"] / goals_by_area[area]["count"]
    
    # Get latest checkin
    checkins = await db.weekly_checkins.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("week_start", -1).to_list(1)
    
    latest_checkin = checkins[0] if checkins else None
    
    # Calculate days working on vision
    days_working = 0
    if test:
        completed_date = test["completed_at"]
        if completed_date.tzinfo is None:
            completed_date = completed_date.replace(tzinfo=timezone.utc)
        days_working = (datetime.now(timezone.utc) - completed_date).days
    
    return {
        "test_completed": test is not None,
        "purpose_type": test["profile"].get("purpose_type") if test else None,
        "top_values": test["profile"].get("top_values", []) if test else [],
        "goals_by_area": goals_by_area,
        "total_goals": len(goals),
        "avg_overall_progress": round(total_progress / len(goals), 1) if len(goals) > 0 else 0,
        "latest_area_ratings": latest_checkin.get("area_ratings", {}) if latest_checkin else {},
        "days_working_on_vision": days_working
    }

@app.get("/api/purpose/ai-analysis")
async def get_purpose_ai_analysis(current_user: User = Depends(get_current_user)):
    """Generate AI analysis of user's purpose test results and provide personalized recommendations"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="AI service not available")
    
    try:
        # Get test results
        tests = await db.purpose_tests.find(
            {"user_id": current_user.user_id},
            {"_id": 0}
        ).sort("completed_at", -1).to_list(1)
        
        if not tests:
            raise HTTPException(status_code=404, detail="No purpose test found. Please complete the test first.")
        
        test = tests[0]
        answers = test.get("answers", {})
        profile = test.get("profile", {})
        
        # Get user profile for context
        user_profile = await db.profiles.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0}
        )
        
        # Get goals
        goals = await db.purpose_goals.find(
            {"user_id": current_user.user_id, "status": "active"},
            {"_id": 0}
        ).to_list(50)
        
        # Build context for AI
        analysis_prompt = f"""Analiza las respuestas del test de propósito de vida de este usuario y genera un análisis profundo y personalizado.

RESPUESTAS DEL TEST:
- Valores más importantes: {answers.get('values', [])}
- Lo que le hacía feliz antes: {answers.get('happyBefore', 'No especificado')}
- Cualidades que lo definen: {answers.get('qualities', [])}
- Talentos naturales: {answers.get('strengths', [])}
- Lo que la gente le pide: {answers.get('peopleAsk', 'No especificado')}
- Lo que haría gratis: {answers.get('enjoyFree', 'No especificado')}
- Visión a 5 años: {answers.get('futureVision', 'No especificado')}
- Lo que quiere que digan de él: {answers.get('whatTheySay', 'No especificado')}
- Lo que intentaría sin miedo al fracaso: {answers.get('noFailure', 'No especificado')}
- Problema del mundo que quiere resolver: {answers.get('worldProblem', 'No especificado')}
- A quién quiere ayudar: {answers.get('helpWho', 'No especificado')}
- Su legado: {answers.get('legacy', 'No especificado')}

PERFIL DETECTADO:
- Tipo de propósito: {profile.get('purpose_type', 'No determinado')}
- Valores principales: {profile.get('top_values', [])}
- Fortalezas principales: {profile.get('top_strengths', [])}

CONTEXTO DE RECUPERACIÓN:
- Tipo de adicción: {user_profile.get('addiction_type', 'No especificado') if user_profile else 'No especificado'}
- Días limpio: {user_profile.get('days_clean', 0) if user_profile else 0}
- Su "Para Qué": {user_profile.get('my_why', 'No especificado') if user_profile else 'No especificado'}

OBJETIVOS ACTUALES: {len(goals)} objetivos activos

Genera un análisis en formato JSON con la siguiente estructura:
{{
    "purpose_statement": "Una declaración de propósito personalizada de 2-3 oraciones que resuma su misión de vida",
    "core_identity": "Descripción de quién es esta persona en su esencia (3-4 oraciones)",
    "key_insights": ["3-4 insights profundos sobre sus respuestas"],
    "how_recovery_connects": "Cómo su proceso de recuperación se conecta con su propósito (2-3 oraciones)",
    "recommended_actions": ["5 acciones específicas y prácticas que puede tomar esta semana"],
    "affirmation": "Una afirmación personalizada poderosa para repetir diariamente",
    "warning_areas": ["1-2 áreas donde debe tener cuidado de no caer en viejos patrones"],
    "growth_opportunities": ["3 oportunidades de crecimiento basadas en sus fortalezas"]
}}

IMPORTANTE: 
- Sé empático y motivador
- Relaciona todo con su proceso de recuperación
- Las acciones deben ser específicas y alcanzables
- Usa un tono cálido y esperanzador
- Responde SOLO con el JSON, sin texto adicional"""

        # Use emergentintegrations library for OpenAI
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"purpose-analysis-{current_user.user_id}",
            system_message="Eres un experto en psicología positiva y propósito de vida, especializado en ayudar a personas en recuperación de adicciones a encontrar significado y dirección. Responde SIEMPRE en formato JSON válido."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=analysis_prompt)
        ai_response = await chat.send_message(user_message)
        
        # Clean response if needed (remove markdown code blocks)
        if ai_response.startswith("```json"):
            ai_response = ai_response[7:]
        if ai_response.startswith("```"):
            ai_response = ai_response[3:]
        if ai_response.endswith("```"):
            ai_response = ai_response[:-3]
        
        analysis = json.loads(ai_response.strip())
        
        # Save analysis to database
        await db.purpose_analyses.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": {
                    "user_id": current_user.user_id,
                    "analysis": analysis,
                    "generated_at": datetime.now(timezone.utc),
                    "test_id": test.get("test_id")
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "analysis": analysis,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except json.JSONDecodeError as e:
        print(f"Error parsing AI response: {e}")
        raise HTTPException(status_code=500, detail="Error processing AI analysis")
    except Exception as e:
        print(f"Error generating purpose analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/purpose/ai-analysis/cached")
async def get_cached_purpose_analysis(current_user: User = Depends(get_current_user)):
    """Get cached AI analysis if available"""
    analysis = await db.purpose_analyses.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not analysis:
        return {"cached": False, "analysis": None}
    
    return {
        "cached": True,
        "analysis": analysis.get("analysis"),
        "generated_at": analysis.get("generated_at").isoformat() if analysis.get("generated_at") else None
    }

# ============== CENTERS SCRAPING ==============

import re
from bs4 import BeautifulSoup

# Cache for centers data
centers_cache = {
    "data": None,
    "last_updated": None,
    "cache_duration": 300  # 5 minutes cache
}

# Hardcoded centers data as fallback (from sinadicciones.org)
FALLBACK_CENTERS = [
    {
        "name": "Centro rehabilitación de Drogas Mixto - Existencia Plena",
        "url": "https://sinadicciones.org/listing/centro-rehabilitacion-existencia-plena/",
        "description": "Se puede, pero no solo!",
        "phone": "+56 9 5402 0968",
        "address": "El Copihue 3238, Calera de Tango",
        "price": "Desde $1M a $1.2M",
        "modalities": ["Online", "Residencial", "Ambulatorio"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/9a0e1ef6782c77-1-768x512.jpg"
    },
    {
        "name": "Tratamiento Adicciones Los Olivos - Arica",
        "url": "https://sinadicciones.org/listing/tratamiento-adicciones-los-olivos-arica/",
        "description": "Programa de Tratamiento Los Olivos – Ambulatorio y Residencial",
        "phone": "58 2 24 6387",
        "address": "Arica",
        "price": "Consultar",
        "modalities": ["Residencial", "Ambulatorio"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Centro Clínico Comunitario de Drogas - Puerto Montt",
        "url": "https://sinadicciones.org/listing/centro-clinico-comunitario-de-drogas-puerto-montt/",
        "description": "Universidad Austral De Chile",
        "phone": "+56 9 4163 8395",
        "address": "Puerto Montt",
        "price": "Gratis",
        "modalities": ["Ambulatorio"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Centro de Rehabilitación de Drogas - Nawel Chile",
        "url": "https://sinadicciones.org/listing/centro-de-rehabilitacion-de-drogas-nawel-chile/",
        "description": "El Rumbo a Seguir",
        "phone": "+56 9 35450840",
        "address": "San Joaquin de los Mayos, Machalí",
        "price": "Desde $500.000 a $700.000",
        "modalities": ["Residencial"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Comunidad Terapéutica de Mujeres - Suyaí",
        "url": "https://sinadicciones.org/listing/comunidad-terapeutica-de-mujeres-suyai/",
        "description": "Comunidad terapéutica de adicciones para mujeres",
        "phone": "+569 2230 8440",
        "address": "Mirador del Valle 68, Lampa",
        "price": "Desde $250.000 a $500.000",
        "modalities": ["Residencial"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Fundación Paréntesis - Santiago",
        "url": "https://sinadicciones.org/listing/fundacion-parentesis-santiago/",
        "description": "Atención especializada en adicciones",
        "phone": "+56 2 2634 4760",
        "address": "Santiago Centro",
        "price": "Consultar",
        "modalities": ["Ambulatorio", "Online"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Centro de Tratamiento Renacer",
        "url": "https://sinadicciones.org/listing/centro-tratamiento-renacer/",
        "description": "Recuperación integral para personas con adicciones",
        "phone": "+56 9 8765 4321",
        "address": "Viña del Mar",
        "price": "Desde $500.000 a $700.000",
        "modalities": ["Residencial"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Comunidad Terapéutica Nueva Vida",
        "url": "https://sinadicciones.org/listing/comunidad-terapeutica-nueva-vida/",
        "description": "Tratamiento residencial especializado",
        "phone": "+56 9 1234 5678",
        "address": "Concepción",
        "price": "Desde $250.000 a $500.000",
        "modalities": ["Residencial", "Ambulatorio"],
        "image": "https://sinadicciones.org/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    }
]

def parse_centers_from_html(html: str) -> list:
    """Parse centers from HTML content"""
    soup = BeautifulSoup(html, 'html.parser')
    centers = []
    
    # Find all listing items using the correct class
    listings = soup.find_all('div', class_='lf-item-container')
    
    for listing in listings:
        try:
            center = {}
            
            # Get name from h4.listing-preview-title
            title_elem = listing.find('h4', class_='listing-preview-title')
            if title_elem:
                # Clean the title text (remove verified icon)
                name = title_elem.get_text(strip=True)
                # Remove any trailing icon characters
                center['name'] = name.strip()
            
            # Get URL from the main link
            link = listing.find('a', href=True)
            if link:
                href = link.get('href', '')
                if 'listing/' in href:
                    center['url'] = href
            
            # Get description/tagline from h6
            tagline = listing.find('h6')
            if tagline:
                center['description'] = tagline.get_text(strip=True)[:150]
            else:
                center['description'] = ''
            
            # Get contact info from ul.lf-contact
            contact_list = listing.find('ul', class_='lf-contact')
            if contact_list:
                contact_items = contact_list.find_all('li')
                for item in contact_items:
                    text = item.get_text(strip=True)
                    # Check for phone icon
                    if item.find('i', class_='icon-phone-outgoing'):
                        center['phone'] = text
                    # Check for location icon
                    elif item.find('i', class_='icon-location-pin-add-2'):
                        center['address'] = text
                    # Check if it's a price (contains $ or Gratis)
                    elif '$' in text or 'Gratis' in text:
                        center['price'] = text
                    # If no icon and looks like phone number
                    elif not center.get('phone') and ('+' in text or text.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').isdigit()):
                        center['phone'] = text
            
            # Get modalities from lf-head div buttons
            modalities = []
            head_btns = listing.find_all('div', class_='lf-head-btn')
            for btn in head_btns:
                btn_text = btn.get_text(strip=True)
                # Skip if it's a status like CLOSED or OPEN
                if btn_text and btn_text not in ['CLOSED', 'OPEN', ''] and not btn_text.startswith('Promoted'):
                    # Split by comma for multiple modalities
                    for mod in btn_text.split(','):
                        mod = mod.strip()
                        if mod and mod not in modalities:
                            modalities.append(mod)
            
            # Also get categories from footer
            category_names = listing.find_all('span', class_='category-name')
            for cat in category_names:
                cat_text = cat.get_text(strip=True)
                if cat_text and cat_text not in modalities:
                    modalities.append(cat_text)
            
            center['modalities'] = modalities
            
            # Set defaults for missing fields
            center.setdefault('phone', '')
            center.setdefault('address', '')
            center.setdefault('price', 'Consultar')
            center.setdefault('modalities', [])
            
            # Get image URL from background style
            bg_div = listing.find('div', class_='lf-background')
            if bg_div:
                style = bg_div.get('style', '')
                match = re.search(r"url\(['\"]?([^'\"]+)['\"]?\)", style)
                if match:
                    center['image'] = match.group(1)
            
            # Only add if we have a name and URL
            if center.get('name') and center.get('url'):
                centers.append(center)
                
        except Exception as e:
            print(f"Error parsing listing: {e}")
            continue
    
    return centers

@app.get("/api/centers")
async def get_centers():
    """Fetch rehabilitation centers from sinadicciones.org"""
    
    # Check cache first
    now = datetime.now(timezone.utc)
    if (centers_cache["data"] is not None and 
        centers_cache["last_updated"] is not None and
        (now - centers_cache["last_updated"]).seconds < centers_cache["cache_duration"]):
        return {
            "centers": centers_cache["data"], 
            "cached": True, 
            "last_updated": centers_cache["last_updated"].isoformat(),
            "count": len(centers_cache["data"])
        }
    
    try:
        # Use a proper browser-like request
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(
                "https://sinadicciones.org/explore-no-map/?type=place&sort=latest",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
                    "Cache-Control": "no-cache"
                }
            )
            
            if response.status_code != 200:
                print(f"Failed to fetch centers: HTTP {response.status_code}")
                # Return fallback data
                return {
                    "centers": FALLBACK_CENTERS, 
                    "cached": False, 
                    "fallback": True,
                    "last_updated": now.isoformat(),
                    "count": len(FALLBACK_CENTERS)
                }
            
            html = response.text
            centers = parse_centers_from_html(html)
            
            # If parsing failed or got no results, use fallback
            if not centers:
                print("No centers parsed from HTML, using fallback data")
                centers = FALLBACK_CENTERS
                
                # Update cache with fallback
                centers_cache["data"] = centers
                centers_cache["last_updated"] = now
                
                return {
                    "centers": centers, 
                    "cached": False,
                    "fallback": True,
                    "last_updated": now.isoformat(),
                    "count": len(centers)
                }
            
            # Update cache with parsed data
            centers_cache["data"] = centers
            centers_cache["last_updated"] = now
            
            return {
                "centers": centers, 
                "cached": False, 
                "last_updated": now.isoformat(),
                "count": len(centers)
            }
            
    except Exception as e:
        print(f"Error fetching centers: {e}")
        # Return fallback data on any error
        return {
            "centers": FALLBACK_CENTERS, 
            "cached": False, 
            "fallback": True,
            "error": str(e),
            "last_updated": now.isoformat(),
            "count": len(FALLBACK_CENTERS)
        }

# ============== HEALTH CHECK ==============

@app.get("/health")
async def health_check_root():
    """Health check for Railway"""
    return {"status": "ok", "service": "sinadicciones-api", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============== RETO 21 DÍAS (CONSUMO ACTIVO) ==============

class StartChallengeRequest(BaseModel):
    goal: Optional[str] = None

@app.post("/api/challenge/start")
async def start_21_day_challenge(data: StartChallengeRequest, current_user: User = Depends(get_current_user)):
    """Start the 21-day challenge for active users"""
    user_id = current_user.user_id
    # Check if user already has an active challenge
    existing = await db.challenges.find_one({
        "user_id": user_id,
        "status": "active"
    })
    
    if existing:
        existing["_id"] = str(existing["_id"])
        return {"message": "Ya tienes un reto activo", "challenge": existing}
    
    challenge = {
        "challenge_id": f"challenge_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "start_date": datetime.now(timezone.utc),
        "target_days": 21,
        "current_day": 1,
        "status": "active",  # active, completed, failed, paused
        "goal": data.goal,
        "daily_logs": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.challenges.insert_one(challenge)
    challenge["_id"] = str(challenge.get("_id", ""))
    
    return {"message": "¡Reto de 21 días iniciado!", "challenge": challenge}

@app.get("/api/challenge/current")
async def get_current_challenge(current_user: User = Depends(get_current_user)):
    """Get user's current active challenge"""
    user_id = current_user.user_id
    challenge = await db.challenges.find_one({
        "user_id": user_id,
        "status": {"$in": ["active", "restart_needed"]}
    })
    
    if not challenge:
        return {"challenge": None}
    
    # Calculate current day
    start_date = challenge["start_date"]
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    
    # Ensure start_date is timezone-aware
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    
    days_passed = (datetime.now(timezone.utc) - start_date).days + 1
    challenge["current_day"] = min(days_passed, 21)
    
    # Check if completed
    if days_passed >= 21 and challenge["status"] == "active":
        await db.challenges.update_one(
            {"challenge_id": challenge["challenge_id"]},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
        )
        challenge["status"] = "completed"
    
    challenge["_id"] = str(challenge["_id"])
    return {"challenge": challenge}

class DailyLogRequest(BaseModel):
    stayed_clean: bool
    actions_completed: list = []
    habits_completed: list = []
    mood: int = 5  # 1-10
    notes: Optional[str] = None
    cravings_level: int = 5  # 1-10

@app.post("/api/challenge/log")
async def log_challenge_day(data: DailyLogRequest, current_user: User = Depends(get_current_user)):
    """Log a day in the 21-day challenge"""
    user_id = current_user.user_id
    challenge = await db.challenges.find_one({
        "user_id": user_id,
        "status": "active"
    })
    
    if not challenge:
        raise HTTPException(status_code=404, detail="No tienes un reto activo")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if already logged today
    existing_log = next((log for log in challenge.get("daily_logs", []) if log["date"] == today), None)
    
    log_entry = {
        "date": today,
        "stayed_clean": data.stayed_clean,
        "actions_completed": data.actions_completed,
        "habits_completed": data.habits_completed,
        "mood": data.mood,
        "cravings_level": data.cravings_level,
        "notes": data.notes,
        "logged_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing_log:
        # Update existing log
        await db.challenges.update_one(
            {"challenge_id": challenge["challenge_id"], "daily_logs.date": today},
            {"$set": {"daily_logs.$": log_entry}}
        )
    else:
        # Add new log
        await db.challenges.update_one(
            {"challenge_id": challenge["challenge_id"]},
            {"$push": {"daily_logs": log_entry}}
        )
    
    # If user didn't stay clean, mark challenge as needing restart
    if not data.stayed_clean:
        await db.challenges.update_one(
            {"challenge_id": challenge["challenge_id"]},
            {"$set": {"status": "restart_needed", "last_relapse": today}}
        )
        return {"message": "Registrado. No te rindas, puedes reiniciar mañana.", "restart_needed": True}
    
    return {"message": "¡Día registrado exitosamente!", "log": log_entry}

@app.post("/api/challenge/restart")
async def restart_challenge(current_user: User = Depends(get_current_user)):
    """Restart the 21-day challenge after a relapse"""
    user_id = current_user.user_id
    # Archive old challenge
    await db.challenges.update_many(
        {"user_id": user_id, "status": {"$in": ["active", "restart_needed"]}},
        {"$set": {"status": "archived", "archived_at": datetime.now(timezone.utc)}}
    )
    
    # Start new challenge
    challenge = {
        "challenge_id": f"challenge_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "start_date": datetime.now(timezone.utc),
        "target_days": 21,
        "current_day": 1,
        "status": "active",
        "attempt_number": await db.challenges.count_documents({"user_id": user_id}) + 1,
        "daily_logs": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.challenges.insert_one(challenge)
    challenge["_id"] = str(challenge.get("_id", ""))
    
    return {"message": "¡Nuevo reto iniciado! Cada intento te hace más fuerte.", "challenge": challenge}

@app.post("/api/challenge/complete")
async def complete_challenge_and_graduate(current_user: User = Depends(get_current_user)):
    """Complete challenge and transition user to 'patient' role (in recovery)"""
    user_id = current_user.user_id
    challenge = await db.challenges.find_one({
        "user_id": user_id,
        "status": "completed"
    })
    
    if not challenge:
        raise HTTPException(status_code=400, detail="Debes completar el reto de 21 días primero")
    
    # Update user role to patient
    await db.user_profiles.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "role": "patient",
                "clean_since": challenge["start_date"],
                "graduated_from_challenge": True,
                "challenge_completed_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "¡Felicidades! Has completado el reto. Ahora eres un usuario en recuperación.", "new_role": "patient"}

# ============== CONTENIDO EDUCATIVO ==============

@app.get("/api/education/content")
async def get_educational_content():
    """Get educational content about addiction and recovery"""
    content = {
        "understanding_addiction": {
            "title": "Entendiendo la Adicción",
            "sections": [
                {
                    "title": "¿Qué es la adicción?",
                    "content": "La adicción es una enfermedad crónica del cerebro que afecta el sistema de recompensa, la motivación y la memoria. No es una falta de voluntad ni un defecto moral. Tu cerebro ha sido alterado por el consumo de sustancias, creando una necesidad compulsiva de consumir a pesar de las consecuencias negativas.",
                    "icon": "brain",
                    "video_url": "https://www.youtube.com/watch?v=HUngLgGRJpo",
                    "video_title": "La adicción explicada - TED-Ed"
                },
                {
                    "title": "El papel de la dopamina",
                    "content": "La dopamina es el neurotransmisor del placer y la recompensa. Las drogas inundan tu cerebro con dopamina, creando una sensación de euforia artificial. Con el tiempo, tu cerebro reduce su producción natural de dopamina, haciendo que necesites la sustancia solo para sentirte 'normal'. Por eso las actividades cotidianas ya no te producen placer.",
                    "icon": "pulse",
                    "video_url": "https://www.youtube.com/watch?v=GgwE94KZJ7E",
                    "video_title": "Cómo la dopamina afecta tu cerebro"
                },
                {
                    "title": "El craving (antojo intenso)",
                    "content": "El craving es esa urgencia intensa e incontrolable de consumir. No es debilidad, es tu cerebro enviando señales de alarma porque cree que necesita la sustancia para sobrevivir. Los cravings son más intensos en los primeros días pero van disminuyendo con el tiempo. Cada vez que resistes un craving, tu cerebro se reprograma un poco más.",
                    "icon": "flame",
                    "video_url": "https://www.youtube.com/watch?v=l6fpQIxBUm8",
                    "video_title": "Cómo manejar los cravings"
                },
                {
                    "title": "No es tu culpa, pero sí tu responsabilidad",
                    "content": "Nadie elige volverse adicto. La genética, el ambiente, traumas y otros factores contribuyen al desarrollo de la adicción. Sin embargo, la recuperación sí es tu responsabilidad. No puedes cambiar cómo llegaste aquí, pero sí puedes decidir hacia dónde vas. Pedir ayuda no es debilidad, es el acto más valiente que puedes hacer.",
                    "icon": "heart",
                    "video_url": "https://www.youtube.com/watch?v=ao8L-0nSYzg",
                    "video_title": "La recuperación es posible"
                }
            ]
        },
        "craving_management": {
            "title": "Manejo del Craving Intenso",
            "description": "El craving es una respuesta neurológica normal en la recuperación. Aquí aprenderás a reconocerlo y superarlo.",
            "sections": [
                {
                    "title": "¿Qué es el craving?",
                    "content": "El craving es un deseo intenso y a veces abrumador de consumir una sustancia. Es una respuesta del cerebro que ha sido condicionado a asociar la sustancia con alivio o placer. Puede manifestarse como pensamientos intrusivos, sensaciones físicas (sudoración, aceleración cardíaca), o emociones intensas.",
                    "icon": "alert-circle"
                },
                {
                    "title": "Los 4 tipos de disparadores",
                    "content": "1. EMOCIONALES: Estrés, ansiedad, tristeza, aburrimiento, enojo, soledad.\n2. AMBIENTALES: Lugares, personas, objetos asociados al consumo.\n3. SOCIALES: Presión de grupo, celebraciones, conflictos.\n4. FÍSICOS: Hambre, cansancio, dolor, síndrome de abstinencia.",
                    "icon": "list"
                },
                {
                    "title": "La regla de los 15 minutos",
                    "content": "Los cravings intensos generalmente duran entre 15-30 minutos. Si puedes distraerte durante este tiempo, la intensidad bajará significativamente. Recuerda: el craving SIEMPRE pasa. No hay un craving eterno.",
                    "icon": "time"
                },
                {
                    "title": "Técnica HALT",
                    "content": "Cuando sientas un craving, pregúntate si estás:\n• H - Hambriento (Hungry)\n• A - Enojado (Angry)\n• L - Solo (Lonely)\n• T - Cansado (Tired)\n\nEstos estados aumentan la vulnerabilidad al craving. Atender estas necesidades básicas puede reducir dramáticamente la intensidad.",
                    "icon": "hand-left"
                },
                {
                    "title": "Técnica de los 5 sentidos (Grounding)",
                    "content": "Cuando el craving sea intenso, ancla tu mente al presente:\n• 5 cosas que puedes VER\n• 4 cosas que puedes TOCAR\n• 3 cosas que puedes OÍR\n• 2 cosas que puedes OLER\n• 1 cosa que puedes SABOREAR\n\nEsto interrumpe el ciclo de pensamiento obsesivo.",
                    "icon": "eye"
                },
                {
                    "title": "Surfear el craving",
                    "content": "Imagina el craving como una ola del mar. Viene, crece, llega a su pico y luego se disipa. No tienes que luchar contra la ola, solo observarla pasar. Respira profundo, observa las sensaciones sin juzgarlas, y deja que la ola pase naturalmente.",
                    "icon": "water"
                }
            ],
            "emergency_actions": [
                {"action": "Llama a tu persona de apoyo AHORA", "icon": "call", "priority": 1},
                {"action": "Sal del lugar donde estás", "icon": "walk", "priority": 2},
                {"action": "Pon hielo en tus manos o cara", "icon": "snow", "priority": 3},
                {"action": "Haz 20 respiraciones profundas", "icon": "fitness", "priority": 4},
                {"action": "Escribe lo que sientes", "icon": "create", "priority": 5},
                {"action": "Toma una ducha fría", "icon": "water", "priority": 6}
            ],
            "video_url": "https://www.youtube.com/watch?v=tTb3d5cjSFI",
            "video_title": "Técnicas para superar el craving"
        },
        "first_days": {
            "title": "Qué esperar los primeros días",
            "timeline": [
                {
                    "day_range": "Días 1-3",
                    "title": "Desintoxicación",
                    "description": "Los más difíciles. Tu cuerpo está eliminando las toxinas. Puedes experimentar ansiedad, insomnio, sudoración, irritabilidad y cravings intensos. Es NORMAL y TEMPORAL.",
                    "tips": ["Mantente hidratado", "Descansa lo más posible", "Evita estar solo", "Ten a mano tu contacto de emergencia"],
                    "color": "#EF4444"
                },
                {
                    "day_range": "Días 4-7",
                    "title": "Adaptación",
                    "description": "Los síntomas físicos empiezan a disminuir. Pueden aparecer síntomas emocionales: tristeza, vacío, aburrimiento. Tu cerebro está reaprendiendo a funcionar sin la sustancia.",
                    "tips": ["Comienza rutinas simples", "Haz ejercicio ligero", "Habla de cómo te sientes", "Celebra cada día"],
                    "color": "#F59E0B"
                },
                {
                    "day_range": "Días 8-14",
                    "title": "Estabilización",
                    "description": "Empiezas a tener más energía y claridad mental. Los cravings son menos frecuentes pero pueden aparecer de repente. Es crucial mantener las rutinas y evitar situaciones de riesgo.",
                    "tips": ["Fortalece tus nuevos hábitos", "Identifica y evita triggers", "Conecta con personas que te apoyan", "Empieza a pensar en metas"],
                    "color": "#10B981"
                },
                {
                    "day_range": "Días 15-21",
                    "title": "Consolidación",
                    "description": "Tu cerebro está creando nuevas conexiones neuronales. Te sientes más fuerte y capaz. Este es el momento de construir una base sólida para tu recuperación a largo plazo.",
                    "tips": ["Define tu propósito de vida", "Planifica tu futuro", "Considera buscar apoyo profesional continuo", "Ayuda a otros si puedes"],
                    "color": "#3B82F6"
                }
            ]
        },
        "why_21_days": {
            "title": "¿Por qué 21 días?",
            "content": "Aunque la ciencia moderna sugiere que formar un hábito puede tomar entre 18 y 254 días, los primeros 21 días son críticos. En este período:\n\n• Tu cuerpo elimina la mayoría de las toxinas\n• Los síntomas de abstinencia más intensos pasan\n• Tu cerebro comienza a reequilibrar sus químicos\n• Empiezas a crear nuevas rutinas\n• Demuestras a ti mismo que SÍ PUEDES\n\nCompletar 21 días no significa que estés 'curado', pero es una base sólida para continuar tu recuperación."
        },
        "primary_actions": {
            "title": "Acciones Primordiales",
            "description": "Estas son las acciones más importantes para proteger tu recuperación:",
            "actions": [
                {
                    "id": "no_consume",
                    "title": "No consumir hoy",
                    "description": "Solo por hoy, no consumiré. Mañana tomaré la misma decisión.",
                    "icon": "shield-checkmark",
                    "priority": 1
                },
                {
                    "id": "delete_apps",
                    "title": "Eliminar apps de riesgo",
                    "description": "Borra apps donde contactas dealers o que te exponen a tentaciones.",
                    "icon": "trash",
                    "priority": 2
                },
                {
                    "id": "block_contacts",
                    "title": "Bloquear contactos negativos",
                    "description": "Dealers, compañeros de consumo, personas que te incitan a usar.",
                    "icon": "person-remove",
                    "priority": 3
                },
                {
                    "id": "no_cash",
                    "title": "Limitar acceso al dinero",
                    "description": "Pide a alguien de confianza que administre tu dinero temporalmente.",
                    "icon": "cash",
                    "priority": 4
                },
                {
                    "id": "avoid_exposure",
                    "title": "Evitar lugares y situaciones de riesgo",
                    "description": "No vayas a lugares donde consumías o donde hay acceso a sustancias.",
                    "icon": "location",
                    "priority": 5
                },
                {
                    "id": "tell_someone",
                    "title": "Contarle a alguien de confianza",
                    "description": "No hagas esto solo. Una persona que sepa puede salvarte la vida.",
                    "icon": "people",
                    "priority": 6
                }
            ]
        },
        "positive_habits": {
            "title": "Hábitos Positivos",
            "description": "Reemplaza el tiempo y energía que dedicabas al consumo con estas actividades:",
            "habits": [
                {
                    "id": "exercise",
                    "title": "Ejercicio físico",
                    "description": "30 minutos de caminata, deporte o gym. Libera endorfinas naturales.",
                    "icon": "fitness",
                    "recommended_time": "30 min"
                },
                {
                    "id": "meditation",
                    "title": "Meditación o respiración",
                    "description": "10 minutos de calma. Aprende a estar presente sin huir.",
                    "icon": "leaf",
                    "recommended_time": "10 min"
                },
                {
                    "id": "reading",
                    "title": "Lectura",
                    "description": "Lee algo que te inspire o te eduque sobre recuperación.",
                    "icon": "book",
                    "recommended_time": "20 min"
                },
                {
                    "id": "call_support",
                    "title": "Llamar a persona de confianza",
                    "description": "Padrino, familiar, amigo. No tienes que hablar de adicción, solo conecta.",
                    "icon": "call",
                    "recommended_time": "15 min"
                },
                {
                    "id": "journal",
                    "title": "Escribir un diario",
                    "description": "Expresa tus emociones, miedos y logros. Procesa lo que sientes.",
                    "icon": "document-text",
                    "recommended_time": "10 min"
                },
                {
                    "id": "healthy_meal",
                    "title": "Comer saludable",
                    "description": "Tu cuerpo necesita nutrientes para recuperarse. Evita azúcar excesiva.",
                    "icon": "nutrition",
                    "recommended_time": ""
                },
                {
                    "id": "sleep",
                    "title": "Dormir 7-8 horas",
                    "description": "El sueño es cuando tu cerebro se repara. Priorízalo.",
                    "icon": "moon",
                    "recommended_time": "8 hrs"
                },
                {
                    "id": "gratitude",
                    "title": "Practicar gratitud",
                    "description": "Escribe 3 cosas por las que estás agradecido hoy.",
                    "icon": "heart",
                    "recommended_time": "5 min"
                }
            ]
        },
        "emergency_tips": {
            "title": "Si sientes un craving intenso",
            "tips": [
                "🕐 Espera 15 minutos - los cravings pasan",
                "📞 Llama a tu persona de confianza AHORA",
                "🚶 Sal a caminar, cambia de ambiente",
                "💧 Toma un vaso de agua fría",
                "🧊 Pon hielo en tus manos - la sensación física distrae",
                "📝 Escribe qué estás sintiendo",
                "🎵 Pon música que te calme o te anime",
                "🏃 Haz 20 sentadillas o flexiones",
                "🙏 Si eres espiritual, ora o medita",
                "🏥 Si es muy intenso, busca ayuda profesional"
            ]
        }
    }
    
    return content

# ============== FAMILY EDUCATION CONTENT ==============

@app.get("/api/family/education")
async def get_family_education_content():
    """Get educational content for family members"""
    content = {
        "understanding_addiction": {
            "title": "Entendiendo la Adicción",
            "description": "Aprende sobre la adicción desde la perspectiva familiar",
            "sections": [
                {
                    "title": "La adicción es una enfermedad",
                    "content": "La adicción no es falta de voluntad, moral débil ni un defecto de carácter. Es una enfermedad crónica del cerebro que afecta el sistema de recompensa, motivación y memoria. Tu ser querido no eligió ser adicto, así como nadie elige tener diabetes o cáncer. Entender esto es el primer paso para poder ayudar sin juzgar.",
                    "icon": "medical",
                    "video_url": "https://www.youtube.com/watch?v=HUngLgGRJpo",
                    "video_title": "La adicción explicada"
                },
                {
                    "title": "El cerebro adicto",
                    "content": "Las sustancias adictivas 'secuestran' el sistema de recompensa del cerebro. La dopamina, el químico del placer, se libera en cantidades masivas con la droga. Con el tiempo, el cerebro se adapta y necesita la sustancia solo para funcionar normalmente. Por eso tu familiar puede parecer que 'no le importa nada más' - su cerebro literalmente ha sido reprogramado.",
                    "icon": "pulse",
                    "video_url": "https://www.youtube.com/watch?v=GgwE94KZJ7E",
                    "video_title": "Cómo las drogas afectan el cerebro"
                },
                {
                    "title": "Por qué no puede 'simplemente dejarlo'",
                    "content": "Pedirle a un adicto que 'solo deje de usar' es como pedirle a alguien con depresión que 'solo sea feliz'. Los cambios en el cerebro hacen que dejar sea extremadamente difícil. Los síntomas de abstinencia pueden ser físicamente dolorosos y psicológicamente aterradores. La recuperación requiere tiempo, tratamiento profesional y mucho apoyo.",
                    "icon": "help-circle"
                },
                {
                    "title": "La genética juega un rol",
                    "content": "Estudios muestran que la genética representa entre el 40-60% del riesgo de adicción. Si hay historial de adicción en la familia, el riesgo es mayor. Esto no es excusa, pero ayuda a entender que algunos cerebros son más vulnerables que otros. Tu familiar no es 'malo' - puede tener una predisposición biológica.",
                    "icon": "people"
                }
            ]
        },
        "enabling_vs_helping": {
            "title": "Habilitar vs Ayudar",
            "description": "Aprende la diferencia crucial entre ayudar y habilitar",
            "sections": [
                {
                    "title": "¿Qué es habilitar?",
                    "content": "Habilitar es hacer cosas que permiten que la adicción continúe sin consecuencias. Es proteger al adicto de las consecuencias naturales de su comportamiento. Aunque se hace por amor, habilitar prolonga la adicción y retrasa la recuperación. Es una de las trampas más comunes para las familias.",
                    "icon": "warning",
                    "examples": [
                        "Darle dinero sabiendo que lo usará para drogas",
                        "Mentir a su jefe cuando falta al trabajo",
                        "Pagar sus deudas repetidamente",
                        "Minimizar o negar el problema",
                        "Hacer sus responsabilidades por él/ella"
                    ]
                },
                {
                    "title": "Señales de que estás habilitando",
                    "content": "Pregúntate: ¿Estoy evitando que experimente las consecuencias de su adicción? ¿Lo estoy rescatando constantemente? ¿Estoy ignorando el problema esperando que desaparezca? ¿Estoy poniendo sus necesidades siempre antes que las mías? Si respondes sí, podrías estar habilitando.",
                    "icon": "alert-circle",
                    "checklist": [
                        "Le doy dinero aunque sospecho para qué es",
                        "Pongo excusas por su comportamiento",
                        "Evito hablar del problema",
                        "Me siento responsable de su adicción",
                        "He descuidado mi propia salud o relaciones"
                    ]
                },
                {
                    "title": "Amor con límites",
                    "content": "Ayudar de verdad significa amar con límites. Es decir 'te amo, pero no voy a financiar tu destrucción'. Es ofrecer apoyo para la recuperación, no para la adicción. Puedes amar a alguien profundamente y aún así negarte a ser parte del problema.",
                    "icon": "heart",
                    "video_url": "https://www.youtube.com/watch?v=l6fpQIxBUm8",
                    "video_title": "Cómo establecer límites con amor"
                },
                {
                    "title": "Formas de ayudar sin habilitar",
                    "content": "En lugar de dar dinero, ofrece pagar directamente por comida o tratamiento. En lugar de mentir por él, dile que lo amas pero no puedes cubrir sus mentiras. Investiga opciones de tratamiento y tenlas listas. Asiste a grupos de apoyo para familias. Cuida tu propia salud mental.",
                    "icon": "checkmark-circle",
                    "actions": [
                        "Ofrecer pagar tratamiento directamente",
                        "Asistir a reuniones de Al-Anon o Nar-Anon",
                        "Establecer consecuencias claras y cumplirlas",
                        "Buscar un terapeuta familiar",
                        "Educarme sobre la adicción"
                    ]
                }
            ]
        },
        "communication": {
            "title": "Comunicación Efectiva",
            "description": "Cómo hablar con tu ser querido sobre su adicción",
            "sections": [
                {
                    "title": "Qué NO decir",
                    "content": "Evita frases que juzguen, avergüencen o culpen. Aunque salgan de la frustración, estas palabras alejan a tu familiar y lo ponen a la defensiva.",
                    "icon": "close-circle",
                    "avoid": [
                        "'¿Por qué no puedes simplemente parar?'",
                        "'Eres una vergüenza para la familia'",
                        "'Si me amaras, dejarías de usar'",
                        "'Ya estoy harto de tus mentiras'",
                        "'Vas a terminar muerto'"
                    ]
                },
                {
                    "title": "Qué SÍ decir",
                    "content": "Usa declaraciones en primera persona ('Yo siento...'). Expresa preocupación, no juicio. Enfócate en comportamientos específicos, no en la persona. Ofrece apoyo para la recuperación.",
                    "icon": "checkmark-circle",
                    "say_instead": [
                        "'Me preocupa tu salud y quiero ayudarte'",
                        "'Te amo y veo que estás sufriendo'",
                        "'Cuando usas, me siento asustado/a y triste'",
                        "'Estoy aquí para apoyarte si decides buscar ayuda'",
                        "'¿Cómo puedo ayudarte a buscar tratamiento?'"
                    ]
                },
                {
                    "title": "Escoge el momento adecuado",
                    "content": "No intentes tener conversaciones importantes cuando tu familiar está intoxicado, con resaca o en abstinencia. Escoge un momento de calma. Evita hacerlo cuando estés muy enojado/a o frustrado/a. Prepárate emocionalmente antes de la conversación.",
                    "icon": "time"
                },
                {
                    "title": "La técnica CRAFT",
                    "content": "CRAFT (Community Reinforcement and Family Training) es un enfoque probado para familias. Se basa en: reforzar positivamente comportamientos sin consumo, permitir consecuencias naturales del consumo, mejorar la calidad de vida del familiar, y sugerir tratamiento en momentos de receptividad.",
                    "icon": "school",
                    "video_url": "https://www.youtube.com/watch?v=ao8L-0nSYzg",
                    "video_title": "Método CRAFT para familias"
                }
            ]
        },
        "boundaries": {
            "title": "Establecer Límites",
            "description": "Los límites son actos de amor, no de castigo",
            "sections": [
                {
                    "title": "Por qué los límites son esenciales",
                    "content": "Los límites protegen tu bienestar y también ayudan a tu familiar. Sin límites, la adicción puede consumir toda la familia. Los límites no son castigos - son declaraciones claras de lo que tolerarás y lo que no. Son necesarios para tu salud y para que tu familiar enfrente la realidad de su adicción.",
                    "icon": "shield-checkmark"
                },
                {
                    "title": "Tipos de límites saludables",
                    "content": "Límites físicos: No permitir drogas en casa. Límites financieros: No dar dinero en efectivo. Límites emocionales: No tolerar abuso verbal. Límites de tiempo: No estar disponible 24/7 para crisis. Límites de responsabilidad: No hacer cosas que él/ella debe hacer.",
                    "icon": "list",
                    "examples": [
                        "No habrá drogas ni alcohol en mi casa",
                        "No te daré dinero en efectivo",
                        "No toleraré que me grites o insultes",
                        "No mentiré por ti a tu trabajo o familia",
                        "Sí te apoyaré si decides ir a tratamiento"
                    ]
                },
                {
                    "title": "Cómo comunicar límites",
                    "content": "Sé claro y específico. Di exactamente qué comportamiento no tolerarás y cuál será la consecuencia. No amenaces - informa. 'Si encuentro drogas en casa, llamaré a la policía' no es una amenaza, es informar de una consecuencia. Y lo más importante: cumple lo que dices.",
                    "icon": "megaphone"
                },
                {
                    "title": "Mantener los límites",
                    "content": "Esta es la parte más difícil. Tu familiar probará tus límites. Habrá manipulación, culpa, promesas de cambio. Mantenerte firme se sentirá cruel, pero es lo más amoroso que puedes hacer. Busca apoyo en grupos como Al-Anon para mantenerte fuerte.",
                    "icon": "fitness"
                }
            ]
        },
        "self_care": {
            "title": "Cuidando tu Bienestar",
            "description": "No puedes ayudar a nadie si tú te derrumbas",
            "sections": [
                {
                    "title": "El impacto en la familia",
                    "content": "La adicción de un ser querido afecta a toda la familia. Es común experimentar ansiedad, depresión, vergüenza, culpa, rabia, y agotamiento. Muchos familiares desarrollan sus propios problemas de salud. Reconocer este impacto es el primer paso para cuidarte.",
                    "icon": "heart-dislike"
                },
                {
                    "title": "Señales de burnout",
                    "content": "¿Estás constantemente preocupado/a? ¿Has descuidado tu salud, trabajo o relaciones? ¿Te sientes agotado/a física y emocionalmente? ¿Has perdido interés en cosas que antes disfrutabas? ¿Sientes que tu vida gira solo alrededor de la adicción de tu familiar? Estas son señales de que necesitas ayuda.",
                    "icon": "battery-dead",
                    "symptoms": [
                        "Insomnio o dormir demasiado",
                        "Cambios en apetito o peso",
                        "Dificultad para concentrarse",
                        "Irritabilidad constante",
                        "Aislamiento social",
                        "Descuido de responsabilidades propias"
                    ]
                },
                {
                    "title": "Grupos de apoyo para familias",
                    "content": "No estás solo/a. Millones de familias enfrentan lo mismo. Grupos como Al-Anon (para familias de alcohólicos) y Nar-Anon (para familias de adictos a drogas) ofrecen apoyo gratuito. En estos grupos encontrarás personas que entienden exactamente lo que vives, sin juicio.",
                    "icon": "people",
                    "resources": [
                        {"name": "Al-Anon", "description": "Familias de alcohólicos", "url": "https://al-anon.org"},
                        {"name": "Nar-Anon", "description": "Familias de adictos", "url": "https://nar-anon.org"},
                        {"name": "CODA", "description": "Codependientes Anónimos", "url": "https://coda.org"}
                    ]
                },
                {
                    "title": "Buscar ayuda profesional",
                    "content": "Considera buscar un terapeuta para ti. No para tu familiar - para TI. Un profesional puede ayudarte a procesar tus emociones, establecer límites saludables, y cuidar tu salud mental. No es egoísta - es necesario. Cuídate para poder seguir siendo un apoyo.",
                    "icon": "medical"
                }
            ]
        },
        "crisis_management": {
            "title": "Manejo de Crisis",
            "description": "Qué hacer en situaciones de emergencia",
            "sections": [
                {
                    "title": "Señales de recaída",
                    "content": "La recaída es parte del proceso para muchos. Señales de advertencia incluyen: cambios de humor repentinos, aislamiento, volver a contactar viejos amigos de consumo, mentiras sobre su paradero, objetos de consumo encontrados, y descuido de responsabilidades.",
                    "icon": "warning",
                    "signs": [
                        "Cambios bruscos de humor",
                        "Aislamiento y secretismo",
                        "Contacto con antiguos compañeros de consumo",
                        "Problemas de dinero inexplicables",
                        "Descuido de higiene personal",
                        "Ausencias o mentiras sobre su paradero"
                    ]
                },
                {
                    "title": "Si descubres una recaída",
                    "content": "Mantén la calma. No confrontes mientras esté intoxicado/a. No le des un sermón - ya sabe que hizo mal. Expresa preocupación, no decepción. Recuérdale que la recaída no borra el progreso anterior. Sugiere volver al tratamiento o intensificarlo.",
                    "icon": "hand-left",
                    "steps": [
                        "Respira y no reacciones impulsivamente",
                        "Espera a que esté sobrio para hablar",
                        "Usa frases como 'Vi que recaíste. ¿Cómo puedo ayudarte?'",
                        "Refuerza que una recaída no es el final",
                        "Sugiere contactar a su terapeuta o grupo de apoyo"
                    ]
                },
                {
                    "title": "Emergencia: Sobredosis",
                    "content": "Si sospechas una sobredosis, LLAMA A EMERGENCIAS INMEDIATAMENTE. Señales: respiración lenta o ausente, labios azules, no responde a estímulos, pupilas muy pequeñas (opioides) o muy grandes (estimulantes). Si tienes Naloxona (Narcan), adminístrala. Pon a la persona de lado para evitar asfixia.",
                    "icon": "alert",
                    "emergency_steps": [
                        "1. Llama a emergencias (131 en Chile)",
                        "2. Si tienes Naloxona, adminístrala",
                        "3. Pon a la persona de lado",
                        "4. No la dejes sola",
                        "5. Prepárate para dar RCP si es necesario"
                    ]
                },
                {
                    "title": "Números de emergencia",
                    "content": "Ten siempre a mano estos números. Guárdalos en tu teléfono.",
                    "icon": "call",
                    "numbers": [
                        {"name": "Emergencias Chile", "number": "131"},
                        {"name": "Fono Drogas SENDA", "number": "1412"},
                        {"name": "Salud Responde", "number": "600 360 7777"},
                        {"name": "Fono Familia", "number": "149"}
                    ]
                }
            ]
        }
    }
    
    return content

# ============== FAMILY ONBOARDING ==============

class FamilyOnboardingRequest(BaseModel):
    relationship: str  # parent, child, spouse, sibling, other
    relative_email: Optional[str] = None  # Email of the person in recovery
    knowledge_level: str  # none, basic, intermediate
    lives_with_relative: bool = False
    main_concern: str  # relapse, communication, boundaries, self_care
    country: Optional[str] = None

@app.post("/api/profile/family-onboarding")
async def complete_family_onboarding(data: FamilyOnboardingRequest, current_user: User = Depends(get_current_user)):
    """Complete onboarding for family member"""
    
    user_id = current_user.user_id
    
    update_data = {
        "role": "family",
        "relationship_to_addict": data.relationship,
        "knowledge_level": data.knowledge_level,
        "lives_with_relative": data.lives_with_relative,
        "main_concern": data.main_concern,
        "country": data.country,
        "profile_completed": True,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    # If relative email provided, try to link
    if data.relative_email:
        relative_user = await db.users.find_one({"email": data.relative_email.lower()})
        if relative_user:
            relative_profile = await db.user_profiles.find_one({"user_id": relative_user["user_id"]})
            if relative_profile and relative_profile.get("role") in ["patient", "active_user"]:
                # Create pending link request
                await db.family_link_requests.insert_one({
                    "request_id": f"flr_{uuid.uuid4().hex[:12]}",
                    "family_user_id": user_id,
                    "patient_user_id": relative_user["user_id"],
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc)
                })
    
    return {"success": True, "message": "Perfil de familiar completado"}

# ============== FAMILY LINK RELATIVE ==============

class FamilyLinkRequest(BaseModel):
    relative_email: str

@app.post("/api/family/link-relative")
async def family_link_relative(data: FamilyLinkRequest, current_user: User = Depends(get_current_user)):
    """Family member requests to link with their relative in recovery"""
    
    # Verify current user is family
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "family":
        raise HTTPException(status_code=403, detail="Solo familiares pueden vincular parientes")
    
    # Find relative by email
    relative_user = await db.users.find_one({"email": data.relative_email.lower()})
    if not relative_user:
        return {"success": False, "message": "No se encontró un usuario con ese email"}
    
    # Check if relative is patient or active_user
    relative_profile = await db.user_profiles.find_one({"user_id": relative_user["user_id"]})
    if not relative_profile or relative_profile.get("role") not in ["patient", "active_user"]:
        return {"success": False, "message": "El usuario no es un paciente en recuperación"}
    
    # Check if already linked
    if profile.get("linked_relative_id") == relative_user["user_id"]:
        return {"success": False, "message": "Ya estás vinculado con este familiar"}
    
    # Create link request (patient must approve)
    existing_request = await db.family_link_requests.find_one({
        "family_user_id": current_user.user_id,
        "patient_user_id": relative_user["user_id"],
        "status": "pending"
    })
    
    if existing_request:
        return {"success": False, "message": "Ya existe una solicitud pendiente"}
    
    await db.family_link_requests.insert_one({
        "request_id": f"flr_{uuid.uuid4().hex[:12]}",
        "family_user_id": current_user.user_id,
        "patient_user_id": relative_user["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True, 
        "message": f"Solicitud enviada a {relative_user.get('name', 'tu familiar')}. Debe aprobar la vinculación desde su app."
    }

@app.get("/api/family/relative-stats")
async def get_family_relative_stats(current_user: User = Depends(get_current_user)):
    """Get stats of linked relative for family member"""
    
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "family":
        raise HTTPException(status_code=403, detail="Solo familiares pueden ver esto")
    
    relative_id = profile.get("linked_relative_id")
    if not relative_id:
        return {"linked": False, "message": "No tienes un familiar vinculado"}
    
    # Get relative's profile
    relative_profile = await db.user_profiles.find_one({"user_id": relative_id})
    relative_user = await db.users.find_one({"user_id": relative_id})
    
    if not relative_profile or not relative_user:
        return {"linked": False, "message": "Familiar no encontrado"}
    
    # Calculate days clean
    days_clean = 0
    if relative_profile.get("clean_since"):
        try:
            clean_date = datetime.fromisoformat(relative_profile["clean_since"].replace('Z', '+00:00'))
            days_clean = (datetime.now(timezone.utc) - clean_date).days
        except:
            pass
    
    # Get challenge info if active_user
    challenge_day = 0
    if relative_profile.get("role") == "active_user":
        challenge = await db.challenges.find_one({"user_id": relative_id, "status": "active"})
        if challenge:
            start_date = challenge.get("start_date")
            if start_date:
                challenge_day = (datetime.now(timezone.utc) - start_date).days + 1
    
    # Get recent emotional state (simplified for privacy)
    recent_emotion = await db.emotional_logs.find_one(
        {"user_id": relative_id},
        sort=[("created_at", -1)]
    )
    
    emotional_state = "Sin datos"
    if recent_emotion:
        mood = recent_emotion.get("mood", 5)
        if mood >= 7:
            emotional_state = "Positivo"
        elif mood >= 4:
            emotional_state = "Neutral"
        else:
            emotional_state = "Necesita apoyo"
    
    # Get habit completion rate (today)
    today = datetime.now(timezone.utc).date()
    habits = await db.habits.find({"user_id": relative_id}).to_list(100)
    completed_today = sum(1 for h in habits if h.get("last_completed") and 
                         h["last_completed"].date() == today)
    total_habits = len(habits)
    habit_rate = int((completed_today / total_habits * 100) if total_habits > 0 else 0)
    
    return {
        "linked": True,
        "relative": {
            "name": relative_user.get("name", "Tu familiar"),
            "role": relative_profile.get("role"),
            "days_clean": days_clean,
            "challenge_day": challenge_day,
            "challenge_total": 21 if relative_profile.get("role") == "active_user" else 0,
            "emotional_state": emotional_state,
            "habit_completion": habit_rate,
            "addiction_type": relative_profile.get("addiction_type", "No especificado"),
            "last_activity": relative_profile.get("updated_at")
        }
    }

@app.get("/api/patient/link-requests")
async def get_patient_link_requests(current_user: User = Depends(get_current_user)):
    """Get pending link requests for patient (from family members)"""
    
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") not in ["patient", "active_user"]:
        raise HTTPException(status_code=403, detail="Solo pacientes pueden ver solicitudes")
    
    requests = await db.family_link_requests.find({
        "patient_user_id": current_user.user_id,
        "status": "pending"
    }).to_list(100)
    
    results = []
    for req in requests:
        family_user = await db.users.find_one({"user_id": req["family_user_id"]})
        family_profile = await db.user_profiles.find_one({"user_id": req["family_user_id"]})
        if family_user:
            results.append({
                "request_id": req["request_id"],
                "family_name": family_user.get("name", "Familiar"),
                "relationship": family_profile.get("relationship_to_addict", "familiar"),
                "created_at": req["created_at"]
            })
    
    return results

class ApproveRejectRequest(BaseModel):
    request_id: str
    approve: bool

@app.post("/api/patient/respond-link-request")
async def respond_to_link_request(data: ApproveRejectRequest, current_user: User = Depends(get_current_user)):
    """Patient approves or rejects family link request"""
    
    request = await db.family_link_requests.find_one({
        "request_id": data.request_id,
        "patient_user_id": current_user.user_id,
        "status": "pending"
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if data.approve:
        # Link the family member to patient
        await db.user_profiles.update_one(
            {"user_id": request["family_user_id"]},
            {"$set": {"linked_relative_id": current_user.user_id}}
        )
        
        # Add family to patient's family list
        await db.user_profiles.update_one(
            {"user_id": current_user.user_id},
            {"$addToSet": {"linked_family_members": request["family_user_id"]}}
        )
        
        # Update request status
        await db.family_link_requests.update_one(
            {"request_id": data.request_id},
            {"$set": {"status": "approved", "responded_at": datetime.now(timezone.utc)}}
        )
        
        return {"success": True, "message": "Familiar vinculado correctamente"}
    else:
        # Reject request
        await db.family_link_requests.update_one(
            {"request_id": data.request_id},
            {"$set": {"status": "rejected", "responded_at": datetime.now(timezone.utc)}}
        )
        
        return {"success": True, "message": "Solicitud rechazada"}

# ============== ONBOARDING ACTIVE USER ==============

class ActiveUserOnboardingRequest(BaseModel):
    substances: list = []  # List of substances
    primary_substance: str
    years_using: int
    frequency: str  # daily, weekly, monthly, occasional
    triggers: list = []
    protective_factors: list = []  # NEW: Factores protectores
    why_quit: str  # Their motivation
    support_person: Optional[dict] = None  # {name, phone, relationship}
    country: Optional[str] = None
    identification: Optional[str] = None

@app.post("/api/profile/active-onboarding")
async def complete_active_user_onboarding(data: ActiveUserOnboardingRequest, current_user: User = Depends(get_current_user)):
    """Complete onboarding for active user (wants to quit)"""
    
    user_id = current_user.user_id
    
    update_data = {
        "role": "active_user",
        "addiction_type": data.primary_substance,
        "secondary_addictions": [s for s in data.substances if s != data.primary_substance],
        "years_using": data.years_using,
        "consumption_frequency": data.frequency,
        "triggers": data.triggers,
        "protective_factors": data.protective_factors,
        "my_why": data.why_quit,
        "country": data.country,
        "identification": data.identification,
        "profile_completed": True,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if data.support_person:
        update_data["emergency_contacts"] = [data.support_person]
    
    result = await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Automatically start the 21-day challenge
    challenge = {
        "challenge_id": f"challenge_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "start_date": datetime.now(timezone.utc),
        "target_days": 21,
        "current_day": 1,
        "status": "active",
        "goal": data.why_quit,
        "daily_logs": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.challenges.insert_one(challenge)
    
    # ===== CREATE DEFAULT HABITS FOR THE CHALLENGE =====
    default_habits = [
        {"name": "No consumir hoy", "icon": "shield-checkmark", "color": "#EF4444", "frequency": "daily", "is_challenge_habit": True},
        {"name": "Ejercicio físico (30 min)", "icon": "fitness", "color": "#10B981", "frequency": "daily", "is_challenge_habit": True},
        {"name": "Meditación o respiración (10 min)", "icon": "leaf", "color": "#8B5CF6", "frequency": "daily", "is_challenge_habit": True},
        {"name": "Llamar a persona de apoyo", "icon": "call", "color": "#3B82F6", "frequency": "daily", "is_challenge_habit": True},
        {"name": "Escribir en diario", "icon": "document-text", "color": "#F59E0B", "frequency": "daily", "is_challenge_habit": True},
        {"name": "Dormir 7-8 horas", "icon": "moon", "color": "#6366F1", "frequency": "daily", "is_challenge_habit": True},
        {"name": "Comer saludable", "icon": "nutrition", "color": "#14B8A6", "frequency": "daily", "is_challenge_habit": True},
        {"name": "Practicar gratitud", "icon": "heart", "color": "#EC4899", "frequency": "daily", "is_challenge_habit": True},
    ]
    
    for habit_data in default_habits:
        habit = {
            "habit_id": f"habit_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": habit_data["name"],
            "icon": habit_data["icon"],
            "color": habit_data["color"],
            "frequency": habit_data["frequency"],
            "is_challenge_habit": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.habits.insert_one(habit)
    
    return {
        "message": "¡Perfil completado! Tu reto de 21 días ha comenzado.",
        "profile_completed": True,
        "challenge_started": True,
        "habits_created": len(default_habits)
    }


# ============== AI WELLNESS ANALYSIS ==============
from openai import AsyncOpenAI

# For production: Use OPENAI_API_KEY
# For development with Emergent: Use EMERGENT_LLM_KEY
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
print(f"OpenAI API Key configured: {'Yes' if OPENAI_API_KEY else 'No'}")

# Initialize OpenAI client
openai_client = None
if OPENAI_API_KEY:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    print("OpenAI client initialized successfully")
else:
    print("WARNING: No OpenAI API key found. AI features will be disabled.")

async def get_openai_client():
    """Get or create OpenAI client"""
    global openai_client, OPENAI_API_KEY
    if openai_client is None:
        # Try to get the key again (in case it was set after startup)
        OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
        if OPENAI_API_KEY:
            openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            print("OpenAI client initialized on demand")
    return openai_client

async def generate_ai_response(system_message: str, user_prompt: str) -> str:
    """Generate AI response using OpenAI GPT-4"""
    client = await get_openai_client()
    if not client:
        print("ERROR: OpenAI client not available")
        return '{"error": "AI no configurada. Por favor configure OPENAI_API_KEY."}'
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return f'{{"error": "Error generando análisis: {str(e)}"}}'

class AnalysisPeriod(str, Enum):
    week = "week"
    month = "month"

@app.get("/api/ai/status")
async def get_ai_status():
    """Check if AI is properly configured"""
    client = await get_openai_client()
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
    return {
        "ai_configured": client is not None,
        "api_key_present": api_key is not None,
        "api_key_prefix": api_key[:10] + "..." if api_key else None
    }


@app.get("/api/wellness/analysis/{period}")
async def get_wellness_analysis(
    period: AnalysisPeriod,
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered wellness analysis for the user"""
    try:
        user_id = current_user.user_id
        now = datetime.now(timezone.utc)
        
        if period == AnalysisPeriod.week:
            start_date = now - timedelta(days=7)
            period_name = "esta semana"
        else:
            start_date = now - timedelta(days=30)
            period_name = "este mes"
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = now.strftime("%Y-%m-%d")
        
        # Fetch habits data
        habits = await db.habits.find({"user_id": user_id, "is_active": True}).to_list(100)
        habit_ids = [h["habit_id"] for h in habits]
        habit_names = {h["habit_id"]: h["name"] for h in habits}
        
        habit_logs = await db.habit_logs.find({
            "user_id": user_id,
            "date": {"$gte": start_str, "$lte": end_str}
        }).to_list(1000)
        
        # Fetch emotional logs
        emotional_logs = await db.emotional_logs.find({
            "user_id": user_id,
            "date": {"$gte": start_str, "$lte": end_str}
        }).to_list(100)
        
        # Fetch goals
        goals = await db.purpose_goals.find({"user_id": user_id}).to_list(50)
        
        # Fetch profile
        profile = await db.user_profiles.find_one({"user_id": user_id})
        
        # Calculate statistics
        total_habit_entries = len(habit_logs)
        completed_habits = sum(1 for log in habit_logs if log.get("completed"))
        habit_completion_rate = (completed_habits / total_habit_entries * 100) if total_habit_entries > 0 else 0
        
        # Mood statistics
        moods = [log.get("mood_scale", 5) for log in emotional_logs if log.get("mood_scale")]
        avg_mood = sum(moods) / len(moods) if moods else 0
        mood_trend = "estable"
        if len(moods) >= 3:
            first_half = sum(moods[:len(moods)//2]) / (len(moods)//2)
            second_half = sum(moods[len(moods)//2:]) / (len(moods) - len(moods)//2)
            if second_half > first_half + 0.5:
                mood_trend = "mejorando"
            elif second_half < first_half - 0.5:
                mood_trend = "bajando"
        
        # Habit completion by day of week
        day_completions = {i: {"total": 0, "completed": 0} for i in range(7)}
        for log in habit_logs:
            try:
                log_date = datetime.strptime(log["date"], "%Y-%m-%d")
                day = log_date.weekday()
                day_completions[day]["total"] += 1
                if log.get("completed"):
                    day_completions[day]["completed"] += 1
            except:
                pass
        
        best_day = max(day_completions.items(), key=lambda x: x[1]["completed"] / x[1]["total"] if x[1]["total"] > 0 else 0)
        worst_day = min(day_completions.items(), key=lambda x: x[1]["completed"] / x[1]["total"] if x[1]["total"] > 0 else 1)
        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        
        # Most/least completed habits
        habit_stats = {}
        for log in habit_logs:
            hid = log.get("habit_id")
            if hid not in habit_stats:
                habit_stats[hid] = {"total": 0, "completed": 0}
            habit_stats[hid]["total"] += 1
            if log.get("completed"):
                habit_stats[hid]["completed"] += 1
        
        # Emotional tags frequency
        tag_freq = {}
        for log in emotional_logs:
            for tag in log.get("tags", []):
                tag_freq[tag] = tag_freq.get(tag, 0) + 1
        top_emotions = sorted(tag_freq.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Prepare data summary for AI
        data_summary = f"""
DATOS DEL USUARIO ({period_name}):
- Nombre: {profile.get('name', 'Usuario') if profile else 'Usuario'}
- Adicción principal: {profile.get('addiction_type', 'No especificada') if profile else 'No especificada'}
- Días limpio: {calculate_clean_days(profile.get('clean_since')) if profile and profile.get('clean_since') else 'No especificado'}

HÁBITOS:
- Total de hábitos activos: {len(habits)}
- Registros del período: {total_habit_entries}
- Completados: {completed_habits} ({habit_completion_rate:.1f}%)
- Mejor día: {day_names[best_day[0]]} ({best_day[1]['completed']}/{best_day[1]['total']} completados)
- Día más difícil: {day_names[worst_day[0]]} ({worst_day[1]['completed']}/{worst_day[1]['total']} completados)

ESTADO EMOCIONAL:
- Registros emocionales: {len(emotional_logs)}
- Ánimo promedio: {avg_mood:.1f}/10
- Tendencia: {mood_trend}
- Emociones más frecuentes: {', '.join([f"{t[0]} ({t[1]}x)" for t in top_emotions]) if top_emotions else 'Sin datos'}

METAS:
- Metas activas: {len([g for g in goals if g.get('status') == 'active'])}
- Progreso promedio: {sum(g.get('progress', 0) for g in goals) / len(goals) if goals else 0:.0f}%

TRIGGERS CONOCIDOS: {', '.join(profile.get('triggers', [])[:3]) if profile and profile.get('triggers') else 'No especificados'}
FACTORES PROTECTORES: {', '.join(profile.get('protective_factors', [])[:3]) if profile and profile.get('protective_factors') else 'No especificados'}
"""

        # Generate AI analysis using OpenAI directly
        system_message = """Eres un coach de bienestar y recuperación de adicciones compasivo y experto. 
Tu rol es analizar los datos del usuario y proporcionar insights personalizados, motivadores y prácticos.
Responde SIEMPRE en español de manera cálida y empática.
Usa emojis para hacer el mensaje más amigable.
Sé específico con los datos pero nunca crítico ni negativo.
Enfócate en el progreso y las oportunidades de mejora."""
        
        prompt = f"""Analiza estos datos de bienestar y genera un reporte personalizado:

{data_summary}

Genera un análisis JSON con esta estructura exacta (responde SOLO el JSON, sin markdown):
{{
    "resumen": "Un párrafo de 2-3 oraciones resumiendo el período",
    "logros": ["logro 1", "logro 2", "logro 3"],
    "patrones": [
        {{"patron": "descripción del patrón detectado", "tipo": "positivo|negativo|neutro"}},
        {{"patron": "otro patrón", "tipo": "positivo|negativo|neutro"}}
    ],
    "correlaciones": ["correlación 1 entre hábitos y emociones", "correlación 2"],
    "tips": [
        {{"tip": "consejo específico y accionable", "prioridad": "alta|media|baja"}},
        {{"tip": "otro consejo", "prioridad": "alta|media|baja"}}
    ],
    "frase_motivacional": "Una frase motivacional personalizada para el usuario",
    "enfoque_semana": "Un área específica para enfocarse la próxima semana"
}}"""

        ai_response_text = await generate_ai_response(system_message, prompt)
        
        # Parse AI response
        try:
            # Clean response if it has markdown
            clean_response = ai_response_text.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            analysis = json.loads(clean_response)
        except:
            # Fallback analysis if AI response parsing fails
            analysis = {
                "resumen": f"Durante {period_name}, has completado {habit_completion_rate:.0f}% de tus hábitos con un ánimo promedio de {avg_mood:.1f}/10.",
                "logros": [
                    f"Mantuviste {completed_habits} hábitos completados",
                    f"Tu mejor día fue {day_names[best_day[0]]}",
                    f"Registraste {len(emotional_logs)} entradas emocionales"
                ],
                "patrones": [
                    {"patron": f"Tu ánimo está {mood_trend}", "tipo": "positivo" if mood_trend == "mejorando" else "neutro"},
                    {"patron": f"Los {day_names[worst_day[0]]} son más difíciles para ti", "tipo": "neutro"}
                ],
                "correlaciones": [
                    "Los días que completas más hábitos tienden a tener mejor ánimo"
                ],
                "tips": [
                    {"tip": f"Prepara tus hábitos del {day_names[worst_day[0]]} la noche anterior", "prioridad": "alta"},
                    {"tip": "Celebra cada pequeño logro", "prioridad": "media"}
                ],
                "frase_motivacional": "Cada día es una nueva oportunidad para ser mejor que ayer.",
                "enfoque_semana": "Mantener la consistencia en tus hábitos de la mañana"
            }
        
        # Add statistics to response
        return {
            "period": period,
            "period_name": period_name,
            "stats": {
                "habit_completion_rate": round(habit_completion_rate, 1),
                "total_habits": len(habits),
                "completed_entries": completed_habits,
                "total_entries": total_habit_entries,
                "avg_mood": round(avg_mood, 1),
                "mood_trend": mood_trend,
                "emotional_entries": len(emotional_logs),
                "active_goals": len([g for g in goals if g.get("status") == "active"]),
                "best_day": day_names[best_day[0]],
                "worst_day": day_names[worst_day[0]],
                "top_emotions": [{"tag": t[0], "count": t[1]} for t in top_emotions],
                "daily_completion": {
                    day_names[i]: {
                        "completed": day_completions[i]["completed"],
                        "total": day_completions[i]["total"],
                        "rate": round(day_completions[i]["completed"] / day_completions[i]["total"] * 100, 1) if day_completions[i]["total"] > 0 else 0
                    } for i in range(7)
                }
            },
            "analysis": analysis,
            "generated_at": now.isoformat()
        }
        
    except Exception as e:
        print(f"Error generating wellness analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating analysis: {str(e)}")

def calculate_clean_days(clean_since: str) -> int:
    """Calculate days since clean date"""
    if not clean_since:
        return 0
    try:
        clean_date = datetime.strptime(clean_since, "%Y-%m-%d")
        now = datetime.now()
        return (now - clean_date).days
    except:
        return 0

@app.get("/api/wellness/stats/{period}")
async def get_wellness_stats(
    period: AnalysisPeriod,
    current_user: User = Depends(get_current_user)
):
    """Get detailed wellness statistics without AI analysis"""
    try:
        user_id = current_user.user_id
        now = datetime.now(timezone.utc)
        
        if period == AnalysisPeriod.week:
            start_date = now - timedelta(days=7)
            days_count = 7
        else:
            start_date = now - timedelta(days=30)
            days_count = 30
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = now.strftime("%Y-%m-%d")
        
        # Fetch all data
        habits = await db.habits.find({"user_id": user_id, "is_active": True}).to_list(100)
        habit_logs = await db.habit_logs.find({
            "user_id": user_id,
            "date": {"$gte": start_str, "$lte": end_str}
        }).to_list(1000)
        emotional_logs = await db.emotional_logs.find({
            "user_id": user_id,
            "date": {"$gte": start_str, "$lte": end_str}
        }).to_list(100)
        
        # Daily breakdown
        daily_data = {}
        for i in range(days_count):
            date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            daily_data[date] = {
                "habits_completed": 0,
                "habits_total": len(habits),
                "mood": None,
                "tags": []
            }
        
        for log in habit_logs:
            date = log.get("date")
            if date in daily_data and log.get("completed"):
                daily_data[date]["habits_completed"] += 1
        
        for log in emotional_logs:
            date = log.get("date")
            if date in daily_data:
                daily_data[date]["mood"] = log.get("mood_scale")
                daily_data[date]["tags"] = log.get("tags", [])
        
        # Habit-specific stats
        habit_stats = []
        for habit in habits:
            logs = [l for l in habit_logs if l.get("habit_id") == habit["habit_id"]]
            completed = sum(1 for l in logs if l.get("completed"))
            total = len(logs)
            habit_stats.append({
                "habit_id": habit["habit_id"],
                "name": habit["name"],
                "icon": habit.get("icon", "checkmark"),
                "color": habit.get("color", "#10B981"),
                "completed": completed,
                "total": total,
                "rate": round(completed / total * 100, 1) if total > 0 else 0
            })
        
        # Sort habits by completion rate
        habit_stats.sort(key=lambda x: x["rate"], reverse=True)
        
        return {
            "period": period,
            "days_count": days_count,
            "daily_data": daily_data,
            "habit_stats": habit_stats,
            "summary": {
                "total_entries": len(habit_logs),
                "completed_entries": sum(1 for l in habit_logs if l.get("completed")),
                "avg_mood": round(sum(l.get("mood_scale", 0) for l in emotional_logs if l.get("mood_scale")) / len(emotional_logs), 1) if emotional_logs else 0,
                "emotional_entries": len(emotional_logs)
            }
        }
    except Exception as e:
        print(f"Error getting wellness stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== HABITS SPECIFIC ANALYSIS ==============

@app.get("/api/habits/analysis/{period}")
async def get_habits_analysis(
    period: AnalysisPeriod,
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered habits analysis"""
    try:
        user_id = current_user.user_id
        now = datetime.now(timezone.utc)
        
        if period == AnalysisPeriod.week:
            start_date = now - timedelta(days=7)
            period_name = "esta semana"
            days_count = 7
        else:
            start_date = now - timedelta(days=30)
            period_name = "este mes"
            days_count = 30
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = now.strftime("%Y-%m-%d")
        
        # Fetch habits and logs
        habits = await db.habits.find({"user_id": user_id, "is_active": True}).to_list(100)
        habit_logs = await db.habit_logs.find({
            "user_id": user_id,
            "date": {"$gte": start_str, "$lte": end_str}
        }).to_list(2000)
        
        # Calculate per-habit stats
        habit_stats = []
        for habit in habits:
            logs = [l for l in habit_logs if l.get("habit_id") == habit["habit_id"]]
            completed = sum(1 for l in logs if l.get("completed"))
            total = len(logs) if logs else days_count
            
            # Daily breakdown for this habit
            daily_completion = {}
            for i in range(7):
                day_logs = [l for l in logs if datetime.strptime(l["date"], "%Y-%m-%d").weekday() == i]
                day_completed = sum(1 for l in day_logs if l.get("completed"))
                daily_completion[i] = {
                    "completed": day_completed,
                    "total": len(day_logs) if day_logs else 0
                }
            
            habit_stats.append({
                "habit_id": habit["habit_id"],
                "name": habit["name"],
                "icon": habit.get("icon", "checkmark"),
                "color": habit.get("color", "#10B981"),
                "completed": completed,
                "total": total,
                "rate": round(completed / total * 100, 1) if total > 0 else 0,
                "daily_completion": daily_completion
            })
        
        # Sort by completion rate
        habit_stats.sort(key=lambda x: x["rate"], reverse=True)
        
        # Day of week analysis
        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        day_completions = {i: {"total": 0, "completed": 0} for i in range(7)}
        for log in habit_logs:
            try:
                log_date = datetime.strptime(log["date"], "%Y-%m-%d")
                day = log_date.weekday()
                day_completions[day]["total"] += 1
                if log.get("completed"):
                    day_completions[day]["completed"] += 1
            except:
                pass
        
        best_day = max(day_completions.items(), key=lambda x: x[1]["completed"] / x[1]["total"] if x[1]["total"] > 0 else 0)
        worst_day = min(day_completions.items(), key=lambda x: x[1]["completed"] / x[1]["total"] if x[1]["total"] > 0 else 1)
        
        # Overall stats
        total_entries = len(habit_logs)
        completed_entries = sum(1 for l in habit_logs if l.get("completed"))
        completion_rate = (completed_entries / total_entries * 100) if total_entries > 0 else 0
        
        # Streaks calculation
        current_streak = 0
        max_streak = 0
        streak = 0
        dates_with_all_completed = set()
        
        for i in range(days_count):
            check_date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            day_logs = [l for l in habit_logs if l.get("date") == check_date]
            day_completed = sum(1 for l in day_logs if l.get("completed"))
            day_total = len(habits)
            
            if day_total > 0 and day_completed >= day_total * 0.8:  # 80% threshold
                streak += 1
                max_streak = max(max_streak, streak)
                dates_with_all_completed.add(check_date)
            else:
                streak = 0
        
        current_streak = streak
        
        # Prepare AI prompt
        data_summary = f"""
ANÁLISIS DE HÁBITOS ({period_name}):

RESUMEN GENERAL:
- Hábitos activos: {len(habits)}
- Total de registros: {total_entries}
- Completados: {completed_entries} ({completion_rate:.1f}%)
- Racha actual: {current_streak} días
- Racha máxima: {max_streak} días

RENDIMIENTO POR HÁBITO:
{chr(10).join([f"- {h['name']}: {h['rate']:.1f}% ({h['completed']}/{h['total']})" for h in habit_stats])}

RENDIMIENTO POR DÍA:
- Mejor día: {day_names[best_day[0]]} ({best_day[1]['completed']}/{best_day[1]['total']} = {(best_day[1]['completed']/best_day[1]['total']*100) if best_day[1]['total'] > 0 else 0:.0f}%)
- Día más difícil: {day_names[worst_day[0]]} ({worst_day[1]['completed']}/{worst_day[1]['total']} = {(worst_day[1]['completed']/worst_day[1]['total']*100) if worst_day[1]['total'] > 0 else 0:.0f}%)

HÁBITOS MÁS CONSISTENTES: {', '.join([h['name'] for h in habit_stats[:3]]) if habit_stats else 'N/A'}
HÁBITOS A MEJORAR: {', '.join([h['name'] for h in habit_stats[-3:]]) if len(habit_stats) >= 3 else 'N/A'}
"""

        # Generate AI analysis using OpenAI
        system_message_habits = """Eres un coach de hábitos experto y motivador. Analiza los datos de hábitos del usuario y proporciona insights específicos y accionables.
Responde SIEMPRE en español de manera positiva y constructiva.
Usa emojis para hacer el mensaje más amigable.
Enfócate en patrones, consistencia y mejoras prácticas."""
        
        prompt = f"""Analiza estos datos de hábitos y genera un análisis personalizado:

{data_summary}

Genera un análisis JSON con esta estructura exacta (responde SOLO el JSON, sin markdown):
{{
    "resumen": "Un párrafo de 2-3 oraciones sobre el rendimiento de hábitos",
    "logros": ["logro específico 1", "logro específico 2", "logro específico 3"],
    "patrones": [
        {{"patron": "descripción del patrón detectado", "tipo": "positivo|negativo|neutro"}},
        {{"patron": "otro patrón", "tipo": "positivo|negativo|neutro"}}
    ],
    "habito_estrella": {{"nombre": "nombre del hábito más consistente", "razon": "por qué destaca"}},
    "habito_a_mejorar": {{"nombre": "nombre del hábito a mejorar", "estrategia": "estrategia específica para mejorarlo"}},
    "tips": [
        {{"tip": "consejo específico para mejorar hábitos", "prioridad": "alta|media|baja"}},
        {{"tip": "otro consejo", "prioridad": "alta|media|baja"}}
    ],
    "frase_motivacional": "Una frase motivacional sobre hábitos y disciplina",
    "meta_proxima_semana": "Una meta específica y alcanzable para la próxima semana"
}}"""

        ai_response_text = await generate_ai_response(system_message_habits, prompt)
        
        # Parse AI response
        try:
            clean_response = ai_response_text.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            analysis = json.loads(clean_response)
        except:
            analysis = {
                "resumen": f"Durante {period_name}, has completado {completion_rate:.0f}% de tus hábitos. Tu mejor rendimiento fue los {day_names[best_day[0]]}.",
                "logros": [
                    f"Completaste {completed_entries} hábitos",
                    f"Racha máxima de {max_streak} días",
                    f"Mantuviste {len(habits)} hábitos activos"
                ],
                "patrones": [
                    {"patron": f"Tu rendimiento es mejor los {day_names[best_day[0]]}", "tipo": "positivo"},
                    {"patron": f"Los {day_names[worst_day[0]]} son más difíciles", "tipo": "neutro"}
                ],
                "habito_estrella": {"nombre": habit_stats[0]["name"] if habit_stats else "N/A", "razon": "Mayor consistencia"},
                "habito_a_mejorar": {"nombre": habit_stats[-1]["name"] if habit_stats else "N/A", "estrategia": "Vincularlo a un hábito existente"},
                "tips": [
                    {"tip": f"Prepara tus hábitos del {day_names[worst_day[0]]} la noche anterior", "prioridad": "alta"},
                    {"tip": "Celebra cada día completado", "prioridad": "media"}
                ],
                "frase_motivacional": "Los pequeños hábitos de hoy construyen la persona que serás mañana.",
                "meta_proxima_semana": f"Completar al menos 80% de hábitos los {day_names[worst_day[0]]}"
            }
        
        return {
            "period": period,
            "period_name": period_name,
            "stats": {
                "total_habits": len(habits),
                "completion_rate": round(completion_rate, 1),
                "completed_entries": completed_entries,
                "total_entries": total_entries,
                "current_streak": current_streak,
                "max_streak": max_streak,
                "best_day": day_names[best_day[0]],
                "worst_day": day_names[worst_day[0]],
                "daily_completion": {
                    day_names[i]: {
                        "completed": day_completions[i]["completed"],
                        "total": day_completions[i]["total"],
                        "rate": round(day_completions[i]["completed"] / day_completions[i]["total"] * 100, 1) if day_completions[i]["total"] > 0 else 0
                    } for i in range(7)
                }
            },
            "habit_stats": habit_stats,
            "analysis": analysis,
            "generated_at": now.isoformat()
        }
        
    except Exception as e:
        print(f"Error generating habits analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============== EMOTIONAL SPECIFIC ANALYSIS ==============

@app.get("/api/emotional/analysis/{period}")
async def get_emotional_analysis(
    period: AnalysisPeriod,
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered emotional analysis"""
    try:
        user_id = current_user.user_id
        now = datetime.now(timezone.utc)
        
        if period == AnalysisPeriod.week:
            start_date = now - timedelta(days=7)
            period_name = "esta semana"
            days_count = 7
        else:
            start_date = now - timedelta(days=30)
            period_name = "este mes"
            days_count = 30
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = now.strftime("%Y-%m-%d")
        
        # Fetch emotional logs
        emotional_logs = await db.emotional_logs.find({
            "user_id": user_id,
            "date": {"$gte": start_str, "$lte": end_str}
        }).to_list(500)
        
        # Fetch profile for context
        profile = await db.user_profiles.find_one({"user_id": user_id})
        
        if not emotional_logs:
            return {
                "period": period,
                "period_name": period_name,
                "stats": {"entries": 0},
                "analysis": {
                    "resumen": f"No hay registros emocionales para {period_name}. ¡Comienza a registrar tu estado de ánimo!",
                    "tips": [{"tip": "Registra tu ánimo al menos una vez al día", "prioridad": "alta"}]
                }
            }
        
        # Calculate mood statistics
        moods = [log.get("mood_scale", 5) for log in emotional_logs if log.get("mood_scale")]
        avg_mood = sum(moods) / len(moods) if moods else 0
        min_mood = min(moods) if moods else 0
        max_mood = max(moods) if moods else 0
        
        # Mood trend
        mood_trend = "estable"
        if len(moods) >= 3:
            first_half = sum(moods[:len(moods)//2]) / (len(moods)//2)
            second_half = sum(moods[len(moods)//2:]) / (len(moods) - len(moods)//2)
            if second_half > first_half + 0.5:
                mood_trend = "mejorando"
            elif second_half < first_half - 0.5:
                mood_trend = "bajando"
        
        # Day of week analysis
        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        day_moods = {i: [] for i in range(7)}
        for log in emotional_logs:
            try:
                log_date = datetime.strptime(log["date"], "%Y-%m-%d")
                day = log_date.weekday()
                if log.get("mood_scale"):
                    day_moods[day].append(log["mood_scale"])
            except:
                pass
        
        day_avg = {i: sum(day_moods[i])/len(day_moods[i]) if day_moods[i] else 0 for i in range(7)}
        best_day = max(day_avg.items(), key=lambda x: x[1])
        worst_day = min(day_avg.items(), key=lambda x: x[1] if x[1] > 0 else 999)
        
        # Tag frequency
        tag_freq = {}
        for log in emotional_logs:
            for tag in log.get("tags", []):
                tag_freq[tag] = tag_freq.get(tag, 0) + 1
        top_tags = sorted(tag_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Positive vs negative tags
        positive_tags = ["paz", "motivación", "orgullo", "gratitud", "esperanza", "tranquilidad", "alegría"]
        negative_tags = ["ansiedad", "ira", "vacío", "tristeza", "miedo", "frustración", "craving"]
        
        positive_count = sum(tag_freq.get(t, 0) for t in positive_tags)
        negative_count = sum(tag_freq.get(t, 0) for t in negative_tags)
        total_tags = positive_count + negative_count
        
        emotional_balance = "equilibrado"
        if total_tags > 0:
            positive_ratio = positive_count / total_tags
            if positive_ratio > 0.6:
                emotional_balance = "positivo"
            elif positive_ratio < 0.4:
                emotional_balance = "desafiante"
        
        # Daily mood data
        daily_moods = {}
        for log in emotional_logs:
            date = log.get("date")
            if date and log.get("mood_scale"):
                daily_moods[date] = {
                    "mood": log["mood_scale"],
                    "tags": log.get("tags", []),
                    "note": log.get("note", "")
                }
        
        # Prepare AI prompt
        data_summary = f"""
ANÁLISIS EMOCIONAL ({period_name}):

ESTADÍSTICAS GENERALES:
- Total de registros: {len(emotional_logs)}
- Ánimo promedio: {avg_mood:.1f}/10
- Ánimo más bajo: {min_mood}/10
- Ánimo más alto: {max_mood}/10
- Tendencia: {mood_trend}
- Balance emocional: {emotional_balance}

POR DÍA DE LA SEMANA:
{chr(10).join([f"- {day_names[i]}: {day_avg[i]:.1f}/10 promedio" for i in range(7) if day_avg[i] > 0])}
- Mejor día: {day_names[best_day[0]]} ({best_day[1]:.1f}/10)
- Día más difícil: {day_names[worst_day[0]]} ({worst_day[1]:.1f}/10)

EMOCIONES MÁS FRECUENTES:
{chr(10).join([f"- {tag}: {count} veces" for tag, count in top_tags[:5]])}

BALANCE EMOCIONAL:
- Emociones positivas: {positive_count} registros
- Emociones desafiantes: {negative_count} registros

CONTEXTO DEL USUARIO:
- En recuperación de: {profile.get('addiction_type', 'No especificado') if profile else 'No especificado'}
- Triggers conocidos: {', '.join(profile.get('triggers', [])[:3]) if profile and profile.get('triggers') else 'No especificados'}
"""

        # Generate AI analysis
        # Generate AI analysis using OpenAI
        system_message_emotional = """Eres un psicólogo especializado en bienestar emocional y recuperación de adicciones. 
Analiza los datos emocionales del usuario con empatía y proporciona insights útiles.
Responde SIEMPRE en español de manera cálida y comprensiva.
Usa emojis para hacer el mensaje más amigable.
Enfócate en validar las emociones y ofrecer estrategias de regulación emocional."""
        
        prompt = f"""Analiza estos datos emocionales y genera un análisis personalizado:

{data_summary}

Genera un análisis JSON con esta estructura exacta (responde SOLO el JSON, sin markdown):
{{
    "resumen": "Un párrafo de 2-3 oraciones sobre el estado emocional del período",
    "fortalezas_emocionales": ["fortaleza 1", "fortaleza 2"],
    "areas_atencion": ["área que necesita atención 1", "área 2"],
    "patrones": [
        {{"patron": "descripción del patrón emocional detectado", "tipo": "positivo|negativo|neutro"}},
        {{"patron": "otro patrón", "tipo": "positivo|negativo|neutro"}}
    ],
    "correlaciones": ["correlación entre emociones y días/situaciones"],
    "estrategias": [
        {{"estrategia": "técnica de regulación emocional recomendada", "cuando_usar": "situación específica"}},
        {{"estrategia": "otra técnica", "cuando_usar": "situación"}}
    ],
    "tips": [
        {{"tip": "consejo específico para el bienestar emocional", "prioridad": "alta|media|baja"}}
    ],
    "mensaje_apoyo": "Un mensaje de apoyo y validación emocional personalizado",
    "enfoque_proxima_semana": "Un área emocional específica para trabajar"
}}"""

        ai_response_text = await generate_ai_response(system_message_emotional, prompt)
        
        # Parse AI response
        try:
            clean_response = ai_response_text.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            analysis = json.loads(clean_response)
        except:
            analysis = {
                "resumen": f"Durante {period_name}, tu ánimo promedio fue {avg_mood:.1f}/10 con una tendencia {mood_trend}.",
                "fortalezas_emocionales": ["Consistencia en el registro emocional", "Autoconciencia"],
                "areas_atencion": [f"Los {day_names[worst_day[0]]} tienden a ser más difíciles"],
                "patrones": [
                    {"patron": f"Tu mejor día emocionalmente es el {day_names[best_day[0]]}", "tipo": "positivo"},
                    {"patron": f"Tendencia emocional {mood_trend}", "tipo": "positivo" if mood_trend == "mejorando" else "neutro"}
                ],
                "correlaciones": [f"Tu ánimo tiende a ser mejor los {day_names[best_day[0]]}"],
                "estrategias": [
                    {"estrategia": "Respiración profunda", "cuando_usar": "Cuando sientas ansiedad"},
                    {"estrategia": "Caminar al aire libre", "cuando_usar": "En días difíciles"}
                ],
                "tips": [
                    {"tip": "Registra tus emociones en el mismo momento del día", "prioridad": "media"}
                ],
                "mensaje_apoyo": "Reconocer y registrar tus emociones es un gran paso. Cada día es una oportunidad para conocerte mejor.",
                "enfoque_proxima_semana": f"Prestar atención especial a los {day_names[worst_day[0]]}"
            }
        
        return {
            "period": period,
            "period_name": period_name,
            "stats": {
                "entries": len(emotional_logs),
                "avg_mood": round(avg_mood, 1),
                "min_mood": min_mood,
                "max_mood": max_mood,
                "mood_trend": mood_trend,
                "emotional_balance": emotional_balance,
                "best_day": day_names[best_day[0]],
                "worst_day": day_names[worst_day[0]],
                "positive_count": positive_count,
                "negative_count": negative_count,
                "top_emotions": [{"tag": t[0], "count": t[1]} for t in top_tags],
                "daily_avg": {day_names[i]: round(day_avg[i], 1) for i in range(7)}
            },
            "daily_moods": daily_moods,
            "analysis": analysis,
            "generated_at": now.isoformat()
        }
        
    except Exception as e:
        print(f"Error generating emotional analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============== PUSH NOTIFICATIONS ==============

class RegisterPushTokenRequest(BaseModel):
    user_id: str
    push_token: str
    platform: str = "ios"

class NotificationData(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None

# Función para enviar notificación push via Expo
async def send_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """Envía una notificación push usando Expo Push API"""
    if not push_token or not push_token.startswith('ExponentPushToken'):
        print(f"Token inválido: {push_token}")
        return False
    
    message = {
        "to": push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
        "badge": 1,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                }
            )
            result = response.json()
            print(f"Push notification result: {result}")
            return response.status_code == 200
    except Exception as e:
        print(f"Error enviando push notification: {e}")
        return False

# Función helper para enviar notificación a un usuario
async def notify_user(user_id: str, title: str, body: str, notification_type: str, data: dict = None):
    """Envía notificación push y guarda en base de datos"""
    # Buscar token del usuario
    token_doc = await db.push_tokens.find_one({"user_id": user_id})
    
    # Guardar notificación en la base de datos
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": notification_type,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(notification)
    
    # Enviar push si tiene token
    if token_doc and token_doc.get("push_token"):
        await send_push_notification(
            token_doc["push_token"],
            title,
            body,
            {**data, "notification_id": notification["notification_id"]} if data else {"notification_id": notification["notification_id"]}
        )
    
    return notification["notification_id"]

@app.post("/api/notifications/register-token")
async def register_push_token(data: RegisterPushTokenRequest, current_user: User = Depends(get_current_user)):
    """Registrar token de push notification para un usuario"""
    await db.push_tokens.update_one(
        {"user_id": data.user_id},
        {
            "$set": {
                "user_id": data.user_id,
                "push_token": data.push_token,
                "platform": data.platform,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    return {"success": True, "message": "Token registrado"}

@app.post("/api/notifications/unregister-token")
async def unregister_push_token(current_user: User = Depends(get_current_user)):
    """Eliminar token de push notification (logout)"""
    await db.push_tokens.delete_one({"user_id": current_user.user_id})
    return {"success": True, "message": "Token eliminado"}

@app.get("/api/notifications/unread")
async def get_unread_notifications(current_user: User = Depends(get_current_user)):
    """Obtener notificaciones no leídas del usuario"""
    notifications = await db.notifications.find(
        {"user_id": current_user.user_id, "read": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"notifications": notifications, "count": len(notifications)}

@app.get("/api/notifications/all")
async def get_all_notifications(current_user: User = Depends(get_current_user), limit: int = 50):
    """Obtener todas las notificaciones del usuario"""
    notifications = await db.notifications.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    unread_count = await db.notifications.count_documents(
        {"user_id": current_user.user_id, "read": False}
    )
    
    return {"notifications": notifications, "unread_count": unread_count}

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    """Marcar una notificación como leída"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": current_user.user_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    return {"success": True}

@app.post("/api/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    """Marcar todas las notificaciones como leídas"""
    await db.notifications.update_many(
        {"user_id": current_user.user_id, "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
    )
    return {"success": True}


# ============== TAREAS CON NOTIFICACIONES ==============

class CreateTaskWithNotificationRequest(BaseModel):
    patient_id: str
    title: str
    description: str
    category: str = "general"
    priority: str = "medium"
    due_date: Optional[str] = None

@app.post("/api/professional/tasks/create")
async def create_task_with_notification(data: CreateTaskWithNotificationRequest, current_user: User = Depends(get_current_user)):
    """Crear tarea y notificar al paciente"""
    # Verificar que es profesional
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden crear tareas")
    
    # Verificar que el paciente está vinculado
    patient_profile = await db.user_profiles.find_one({
        "user_id": data.patient_id,
        "linked_therapist_id": current_user.user_id
    })
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Paciente no vinculado")
    
    # Obtener info del paciente
    patient = await db.users.find_one({"user_id": data.patient_id})
    
    # Crear la tarea
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task = {
        "task_id": task_id,
        "therapist_id": current_user.user_id,
        "therapist_name": current_user.name,
        "patient_id": data.patient_id,
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "priority": data.priority,
        "status": "pending",
        "due_date": data.due_date,
        "created_at": datetime.now(timezone.utc),
        "patient_notes": None
    }
    
    await db.therapist_tasks.insert_one(task)
    
    # Notificar al paciente
    await notify_user(
        user_id=data.patient_id,
        title="📋 Nueva tarea de tu terapeuta",
        body=f"{current_user.name} te asignó: {data.title}",
        notification_type="new_task",
        data={
            "task_id": task_id,
            "therapist_name": current_user.name,
            "action": "view_task"
        }
    )
    
    return {"success": True, "task_id": task_id, "message": "Tarea creada y paciente notificado"}

class CompleteTaskRequest(BaseModel):
    task_id: str
    notes: Optional[str] = None

@app.post("/api/patient/tasks/complete")
async def complete_task_with_notification(data: CompleteTaskRequest, current_user: User = Depends(get_current_user)):
    """Paciente completa tarea y notifica al profesional"""
    # Buscar la tarea
    task = await db.therapist_tasks.find_one({
        "task_id": data.task_id,
        "patient_id": current_user.user_id
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    # Actualizar la tarea
    await db.therapist_tasks.update_one(
        {"task_id": data.task_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc),
                "patient_notes": data.notes
            }
        }
    )
    
    # Notificar al profesional
    await notify_user(
        user_id=task["therapist_id"],
        title="✅ Tarea completada",
        body=f"{current_user.name} completó: {task['title']}",
        notification_type="task_completed",
        data={
            "task_id": data.task_id,
            "patient_id": current_user.user_id,
            "patient_name": current_user.name,
            "action": "view_task"
        }
    )
    
    return {"success": True, "message": "Tarea completada y terapeuta notificado"}

@app.post("/api/patient/tasks/{task_id}/progress")
async def update_task_progress(task_id: str, notes: str = "", current_user: User = Depends(get_current_user)):
    """Paciente actualiza progreso de tarea"""
    task = await db.therapist_tasks.find_one({
        "task_id": task_id,
        "patient_id": current_user.user_id
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    # Actualizar la tarea
    await db.therapist_tasks.update_one(
        {"task_id": task_id},
        {
            "$set": {
                "status": "in_progress",
                "patient_notes": notes,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Notificar al profesional
    await notify_user(
        user_id=task["therapist_id"],
        title="📝 Progreso en tarea",
        body=f"{current_user.name} actualizó: {task['title']}",
        notification_type="task_progress",
        data={
            "task_id": task_id,
            "patient_id": current_user.user_id,
            "patient_name": current_user.name,
            "action": "view_task"
        }
    )
    
    return {"success": True, "message": "Progreso actualizado"}


# ============== NOTAS CON NOTIFICACIONES ==============

@app.post("/api/professional/notes/create")
async def create_note_with_notification(data: CreateSessionNoteRequest, current_user: User = Depends(get_current_user)):
    """Crear nota de sesión y notificar al paciente"""
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    if not profile or profile.get("role") != "professional":
        raise HTTPException(status_code=403, detail="Solo profesionales pueden crear notas")
    
    # Verificar paciente vinculado
    patient_profile = await db.user_profiles.find_one({
        "user_id": data.patient_id,
        "linked_therapist_id": current_user.user_id
    })
    if not patient_profile:
        raise HTTPException(status_code=404, detail="Paciente no vinculado")
    
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    note = {
        "note_id": note_id,
        "therapist_id": current_user.user_id,
        "patient_id": data.patient_id,
        "session_date": data.session_date,
        "private_notes": data.private_notes,
        "session_summary": data.session_summary,
        "goals_discussed": data.goals_discussed,
        "next_session_focus": data.next_session_focus,
        "mood_rating": data.mood_rating,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.session_notes.insert_one(note)
    
    # Notificar al paciente (solo si hay resumen visible)
    if data.session_summary:
        await notify_user(
            user_id=data.patient_id,
            title="📝 Nueva nota de sesión",
            body=f"{current_user.name} agregó notas de tu última sesión",
            notification_type="new_note",
            data={
                "note_id": note_id,
                "therapist_name": current_user.name,
                "action": "view_notes"
            }
        )
    
    return {"success": True, "note_id": note_id, "message": "Nota creada"}


# ============== MENSAJES CON NOTIFICACIONES ==============

class SendMessageRequest(BaseModel):
    to_user_id: str
    content: str

@app.post("/api/messages/send")
async def send_message_with_notification(data: SendMessageRequest, current_user: User = Depends(get_current_user)):
    """Enviar mensaje y notificar al destinatario"""
    # Obtener info del destinatario
    recipient = await db.users.find_one({"user_id": data.to_user_id})
    if not recipient:
        raise HTTPException(status_code=404, detail="Destinatario no encontrado")
    
    # Crear el mensaje
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message = {
        "message_id": message_id,
        "from_user_id": current_user.user_id,
        "to_user_id": data.to_user_id,
        "from_name": current_user.name,
        "to_name": recipient.get("name"),
        "content": data.content,
        "created_at": datetime.now(timezone.utc),
        "read": False
    }
    
    await db.messages.insert_one(message)
    
    # Notificar al destinatario
    preview = data.content[:50] + "..." if len(data.content) > 50 else data.content
    await notify_user(
        user_id=data.to_user_id,
        title=f"💬 Mensaje de {current_user.name}",
        body=preview,
        notification_type="new_message",
        data={
            "message_id": message_id,
            "from_user_id": current_user.user_id,
            "from_name": current_user.name,
            "action": "view_messages"
        }
    )
    
    return {"success": True, "message_id": message_id}

@app.get("/api/messages/conversation/{other_user_id}")
async def get_conversation(other_user_id: str, current_user: User = Depends(get_current_user)):
    """Obtener conversación entre dos usuarios"""
    messages = await db.messages.find({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": other_user_id},
            {"from_user_id": other_user_id, "to_user_id": current_user.user_id}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # Marcar como leídos los mensajes recibidos
    await db.messages.update_many(
        {"from_user_id": other_user_id, "to_user_id": current_user.user_id, "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    return {"messages": messages}

@app.get("/api/messages/unread-count")
async def get_unread_messages_count(current_user: User = Depends(get_current_user)):
    """Obtener cantidad de mensajes no leídos"""
    count = await db.messages.count_documents({
        "to_user_id": current_user.user_id,
        "read": False
    })
    return {"unread_count": count}


# ============== RECAÍDAS CON NOTIFICACIONES ==============

@app.post("/api/patient/report-relapse-notify")
async def report_relapse_with_notification(current_user: User = Depends(get_current_user), notes: str = ""):
    """Reportar recaída y notificar al terapeuta"""
    # Obtener perfil del paciente
    profile = await db.user_profiles.find_one({"user_id": current_user.user_id})
    
    # Registrar la recaída
    relapse = {
        "relapse_id": f"relapse_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "reported_at": datetime.now(timezone.utc),
        "notes": notes
    }
    await db.relapses.insert_one(relapse)
    
    # Resetear contador de días
    await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"clean_since": datetime.now(timezone.utc).date().isoformat()}}
    )
    
    # Notificar al terapeuta si está vinculado
    if profile and profile.get("linked_therapist_id"):
        await notify_user(
            user_id=profile["linked_therapist_id"],
            title="⚠️ Alerta: Recaída reportada",
            body=f"{current_user.name} ha reportado una recaída",
            notification_type="relapse_alert",
            data={
                "patient_id": current_user.user_id,
                "patient_name": current_user.name,
                "relapse_id": relapse["relapse_id"],
                "action": "view_patient",
                "severity": "high"
            }
        )
    
    return {"success": True, "message": "Recaída registrada. Tu terapeuta ha sido notificado."}



# ============== NELSON - AI THERAPIST ==============

NELSON_SYSTEM_PROMPT = """Eres Nelson, un consejero y compañero de apoyo especializado EXCLUSIVAMENTE en adicciones y bienestar emocional. 

IDENTIDAD:
- Te llamas Nelson
- Eres cálido, empático y nunca juzgas
- Hablas en español de forma cercana pero profesional
- Usas el nombre del usuario cuando lo conoces

TIPO DE USUARIO Y CÓMO ADAPTARTE:
{role_context}

⚠️ RESTRICCIÓN CRÍTICA DE TEMAS - MUY IMPORTANTE:
SOLO puedes hablar de estos temas:
✅ Recuperación de adicciones y sobriedad
✅ Manejo de ansiedad, depresión y emociones
✅ Motivación y desarrollo personal
✅ Relaciones familiares y apoyo social
✅ Hábitos saludables (ejercicio, meditación, sueño)
✅ Espiritualidad y propósito de vida
✅ Manejo de crisis y craving
✅ Técnicas de relajación y mindfulness
✅ Autoestima y crecimiento personal

❌ NO puedes hablar de:
- Autos, tecnología, deportes (excepto como hábito saludable), política
- Noticias, entretenimiento, videojuegos
- Inversiones, criptomonedas, negocios
- Recetas de cocina, viajes turísticos
- Cualquier tema NO relacionado con bienestar emocional o recuperación

Si el usuario pregunta sobre temas NO permitidos, responde amablemente:
"Entiendo tu curiosidad, pero mi especialidad es apoyarte en tu bienestar emocional y recuperación. ¿Hay algo relacionado con cómo te sientes, tu progreso, o tu proceso de recuperación en lo que pueda ayudarte?"

LÍMITES IMPORTANTES:
- SIEMPRE recuerda que eres un apoyo complementario, NO un reemplazo de profesionales
- NO diagnostiques ni prescribas medicamentos
- NO des consejos médicos específicos
- Si detectas riesgo de vida, SIEMPRE recomienda buscar ayuda profesional inmediata

TUS CAPACIDADES:
- Tienes acceso COMPLETO a los datos del usuario en la plataforma
- PUEDES analizar patrones de hábitos y emociones
- PUEDES ver el historial completo y dar insights personalizados
- Escuchar activamente y validar emociones
- Ofrecer técnicas de manejo de crisis (respiración, grounding, distracción)
- Recordar el progreso del usuario y celebrar logros
- Educar sobre el proceso de recuperación
- Motivar y dar esperanza
- Sugerir hablar con el terapeuta vinculado cuando sea apropiado

DATOS COMPLETOS DEL USUARIO (usa esta información para personalizar y analizar):
{user_context}

REGLAS DE RESPUESTA:
1. Cuando te pidan analizar patrones, USA los datos que tienes disponibles
2. Respuestas empáticas pero informativas (puedes extenderte si es necesario para dar análisis)
3. Haz preguntas para profundizar
4. Valida las emociones antes de dar consejos
5. Si mencionan crisis, ofrece herramientas inmediatas
6. Cuando analices datos, sé específico con números y fechas
7. Relaciona los patrones de hábitos con el estado emocional cuando sea relevante

PALABRAS DE CRISIS que requieren respuesta especial:
- suicidio, matarme, morir, no quiero vivir, hacerme daño
- Si detectas estas palabras, responde con compasión, recuerda que no están solos,
  y SIEMPRE recomienda llamar a una línea de crisis o ir a urgencias.
"""

ROLE_CONTEXTS = {
    "patient": """
ROL: Usuario en Recuperación Activa de Adicción
TONO: Cálido, empático, esperanzador pero realista
ENFOQUE PRINCIPAL:
- Su progreso diario y días en recuperación
- Celebrar cada logro, por pequeño que sea
- Manejo proactivo de gatillos y situaciones de riesgo
- Fortalecer factores protectores identificados
- Conexión con su "Para Qué" (motivación personal)

CÓMO RESPONDER:
- Usa su nombre cuando lo conozcas
- Reconoce el esfuerzo que requiere cada día de sobriedad
- Ante recaídas: sin juicio, enfócate en aprender y reiniciar
- Relaciona sus emociones con su proceso de recuperación
- Sugiere estrategias prácticas basadas en sus hábitos exitosos
- Si tiene análisis de propósito, conecta su recuperación con su misión de vida
""",
    "active_user": """
ROL: Usuario en Reto de 21 Días
TONO: Motivacional, energético, de coach personal
ENFOQUE PRINCIPAL:
- Progreso hacia la meta del reto
- Construcción de nuevos hábitos
- Motivación diaria y mentalidad de crecimiento
- Superar obstáculos y excusas

CÓMO RESPONDER:
- Sé directo pero amable, como un coach de vida
- Celebra el compromiso con el reto
- Usa metáforas de deportes, crecimiento, superación
- Enfócate en el "siguiente paso" más que en el resultado final
- Recuerda por qué empezó el reto
""",
    "professional": """
ROL: Profesional de Salud Mental (Terapeuta/Psicólogo)
TONO: Profesional, colega a colega, respetuoso
ENFOQUE PRINCIPAL:
- Autocuidado del cuidador (prevención de burnout)
- Recursos y técnicas profesionales
- Apoyo emocional sin ser condescendiente

CÓMO RESPONDER:
- Puedes usar terminología técnica cuando sea apropiado
- Reconoce la carga emocional del trabajo terapéutico
- Sugiere prácticas de autocuidado basadas en evidencia
- Respeta su expertise, no des consejos básicos
- Si pregunta sobre pacientes, orienta sin dar diagnósticos
""",
    "family": """
ROL: Familiar de Persona en Recuperación
TONO: Comprensivo, educativo, validador
ENFOQUE PRINCIPAL:
- El impacto emocional de acompañar la adicción de un ser querido
- Establecer límites sanos (codependencia)
- Autocuidado del familiar
- Cómo apoyar sin habilitar

CÓMO RESPONDER:
- Valida lo difícil y agotador que es esta situación
- Educa sobre la diferencia entre ayudar y habilitar
- Refuerza que ellos también merecen cuidarse
- No culpes ni al familiar ni al adicto
- Sugiere recursos como grupos de apoyo para familias (Al-Anon, etc.)
- Recuerda que no pueden controlar la recuperación del otro
"""
}

CRISIS_KEYWORDS = [
    "suicidio", "suicidarme", "matarme", "morir", "morirme",
    "no quiero vivir", "acabar con todo", "hacerme daño",
    "cortarme", "quitarme la vida", "ya no puedo más",
    "no vale la pena", "mejor muerto"
]

class NelsonMessage(BaseModel):
    message: str

@app.post("/api/nelson/chat")
async def nelson_chat(
    request: NelsonMessage,
    current_user: User = Depends(get_current_user)
):
    """Chat with Nelson - AI therapist assistant"""
    try:
        user_message = request.message.strip()
        
        # Check for crisis keywords
        message_lower = user_message.lower()
        crisis_detected = any(keyword in message_lower for keyword in CRISIS_KEYWORDS)
        
        # Get user context (now returns tuple of context and role_context)
        user_context, role_context = await get_nelson_user_context(current_user.user_id)
        
        # Get conversation history
        conversation = await db.nelson_conversations.find_one({"user_id": current_user.user_id})
        messages_history = conversation.get("messages", [])[-10:] if conversation else []
        
        # Build messages for OpenAI
        system_prompt = NELSON_SYSTEM_PROMPT.format(user_context=user_context, role_context=role_context)
        
        openai_messages = [{"role": "system", "content": system_prompt}]
        
        for msg in messages_history:
            openai_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        openai_messages.append({"role": "user", "content": user_message})
        
        # Add crisis context if detected
        if crisis_detected:
            openai_messages.append({
                "role": "system",
                "content": """ALERTA: El usuario ha mencionado palabras relacionadas con crisis.
                Responde con máxima empatía. Valida su dolor. Recuérdale que no está solo.
                Incluye en tu respuesta:
                1. Que entiendes su dolor
                2. Que hay ayuda disponible
                3. Línea de crisis: 600 360 7777 (Chile) o el número local
                4. Que puede ir a urgencias
                5. Pregunta si puede llamar a alguien de confianza ahora mismo"""
            })
        
        # Call OpenAI
        client = await get_openai_client()
        if not client:
            return {"response": "Lo siento, estoy teniendo problemas técnicos. Si es una emergencia, por favor llama a tu línea de crisis local.", "crisis_detected": crisis_detected}
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=openai_messages,
            temperature=0.7,
            max_tokens=500
        )
        
        nelson_response = response.choices[0].message.content
        
        # Determine mode
        mode = "crisis" if crisis_detected else "normal"
        if any(word in message_lower for word in ["ansiedad", "ansioso", "nervioso", "pánico"]):
            mode = "anxiety"
        elif any(word in message_lower for word in ["ganas", "consumir", "recaer", "craving"]):
            mode = "craving"
        elif any(word in message_lower for word in ["triste", "deprimido", "solo", "vacío"]):
            mode = "sadness"
        
        # Save to conversation history
        new_messages = [
            {"role": "user", "content": user_message, "timestamp": datetime.utcnow().isoformat(), "mode": mode},
            {"role": "assistant", "content": nelson_response, "timestamp": datetime.utcnow().isoformat(), "mode": mode}
        ]
        
        await db.nelson_conversations.update_one(
            {"user_id": current_user.user_id},
            {
                "$push": {"messages": {"$each": new_messages}},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        # If crisis detected, also log it for safety
        if crisis_detected:
            await db.crisis_logs.insert_one({
                "user_id": current_user.user_id,
                "message": user_message,
                "timestamp": datetime.utcnow(),
                "response_given": nelson_response
            })
            
            # Notify linked therapist if exists
            profile = await db.profiles.find_one({"user_id": current_user.user_id})
            if profile and profile.get("linked_therapist_id"):
                await notify_user(
                    user_id=profile["linked_therapist_id"],
                    title="⚠️ Alerta de Crisis",
                    body=f"{current_user.name} puede estar en crisis. Revisa la conversación.",
                    notification_type="crisis_alert",
                    data={
                        "patient_id": current_user.user_id,
                        "patient_name": current_user.name,
                        "action": "view_patient",
                        "severity": "critical"
                    }
                )
        
        return {
            "response": nelson_response,
            "mode": mode,
            "crisis_detected": crisis_detected
        }
        
    except Exception as e:
        print(f"Error in Nelson chat: {e}")
        return {
            "response": "Lo siento, tuve un problema. ¿Puedes intentar de nuevo? Si necesitas ayuda urgente, usa el botón rojo de Crisis.",
            "mode": "error",
            "crisis_detected": False
        }

async def get_nelson_user_context(user_id: str) -> tuple[str, str]:
    """Get comprehensive user context for Nelson to personalize responses and analyze patterns"""
    try:
        # Get profile
        profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
        user_role = profile.get("role", "patient") if profile else "patient"
        
        # Get role-specific context
        role_context = ROLE_CONTEXTS.get(user_role, ROLE_CONTEXTS["patient"])
        
        # Get user info
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1})
        
        # Get ALL habits
        habits = await db.habits.find({"user_id": user_id, "is_active": True}).to_list(20)
        habit_names = [h.get("name", "Sin nombre") for h in habits]
        
        # Get habit logs for the last 30 days
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        habit_logs = await db.habit_logs.find({
            "user_id": user_id,
            "date": {"$gte": thirty_days_ago}
        }).to_list(1000)
        
        # Calculate habit statistics
        total_possible = len(habits) * 30
        total_completed = sum(1 for log in habit_logs if log.get("completed"))
        habit_completion_rate = (total_completed / total_possible * 100) if total_possible > 0 else 0
        
        # Get today's completions
        today_logs = [log for log in habit_logs if log.get("date") == today]
        completed_today = sum(1 for log in today_logs if log.get("completed"))
        
        # Analyze habit patterns by day of week
        habit_by_day = {}
        for log in habit_logs:
            if log.get("completed"):
                try:
                    log_date = datetime.strptime(log["date"], "%Y-%m-%d")
                    day_name = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][log_date.weekday()]
                    habit_by_day[day_name] = habit_by_day.get(day_name, 0) + 1
                except:
                    pass
        
        best_habit_day = max(habit_by_day, key=habit_by_day.get) if habit_by_day else "No hay datos"
        worst_habit_day = min(habit_by_day, key=habit_by_day.get) if habit_by_day else "No hay datos"
        
        # Get ALL emotional logs for the last 30 days
        emotional_logs = await db.emotional_logs.find({
            "user_id": user_id,
            "date": {"$gte": thirty_days_ago}
        }).sort("date", -1).to_list(100)
        
        # Calculate emotional statistics
        moods = [e.get("mood") or e.get("mood_scale", 5) for e in emotional_logs]
        avg_mood = sum(moods) / len(moods) if moods else 0
        max_mood = max(moods) if moods else 0
        min_mood = min(moods) if moods else 0
        
        # Analyze mood trends
        mood_trend = "estable"
        if len(moods) >= 7:
            recent_avg = sum(moods[:7]) / 7
            older_avg = sum(moods[7:14]) / 7 if len(moods) >= 14 else recent_avg
            if recent_avg > older_avg + 0.5:
                mood_trend = "mejorando"
            elif recent_avg < older_avg - 0.5:
                mood_trend = "empeorando"
        
        # Get most common emotions/tags
        all_tags = []
        for log in emotional_logs:
            tags = log.get("tags") or log.get("emotions", [])
            all_tags.extend(tags)
        
        tag_counts = {}
        for tag in all_tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        top_emotions = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Analyze mood by day of week
        mood_by_day = {}
        mood_count_by_day = {}
        for log in emotional_logs:
            try:
                log_date = datetime.strptime(log["date"], "%Y-%m-%d")
                day_name = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][log_date.weekday()]
                mood_value = log.get("mood") or log.get("mood_scale", 5)
                mood_by_day[day_name] = mood_by_day.get(day_name, 0) + mood_value
                mood_count_by_day[day_name] = mood_count_by_day.get(day_name, 0) + 1
            except:
                pass
        
        avg_mood_by_day = {day: mood_by_day[day] / mood_count_by_day[day] for day in mood_by_day}
        best_mood_day = max(avg_mood_by_day, key=avg_mood_by_day.get) if avg_mood_by_day else "No hay datos"
        worst_mood_day = min(avg_mood_by_day, key=avg_mood_by_day.get) if avg_mood_by_day else "No hay datos"
        
        # Get recent notes from emotional logs
        recent_notes = [log.get("note", "") for log in emotional_logs[:5] if log.get("note")]
        
        # Build comprehensive context
        context_parts = []
        
        # Basic info
        context_parts.append("=== INFORMACIÓN BÁSICA ===")
        if user and user.get("name"):
            context_parts.append(f"Nombre: {user['name']}")
        context_parts.append(f"Rol en la plataforma: {user_role}")
        
        # Profile info
        if profile:
            context_parts.append("\n=== PERFIL DE RECUPERACIÓN ===")
            if profile.get("addiction_type"):
                context_parts.append(f"Tipo de adicción: {profile['addiction_type']}")
            if profile.get("secondary_addictions"):
                context_parts.append(f"Adicciones secundarias: {', '.join(profile['secondary_addictions'])}")
            if profile.get("clean_date"):
                try:
                    clean_date = datetime.fromisoformat(profile["clean_date"].replace("Z", "+00:00"))
                    days_clean = (datetime.now(timezone.utc) - clean_date).days
                    if days_clean >= 0:
                        context_parts.append(f"Días en recuperación: {days_clean} días")
                except:
                    pass
            if profile.get("triggers"):
                context_parts.append(f"Gatillos identificados: {', '.join(profile['triggers'])}")
            if profile.get("protective_factors"):
                context_parts.append(f"Factores protectores: {', '.join(profile['protective_factors'])}")
            if profile.get("my_why"):
                context_parts.append(f"Su 'Para Qué' (motivación): {profile['my_why']}")
            if profile.get("life_story"):
                context_parts.append(f"Historia de vida: {profile['life_story'][:300]}...")
        
        # Habits analysis
        context_parts.append("\n=== ANÁLISIS DE HÁBITOS (últimos 30 días) ===")
        context_parts.append(f"Hábitos activos: {', '.join(habit_names) if habit_names else 'Ninguno'}")
        context_parts.append(f"Hábitos completados hoy: {completed_today} de {len(habits)}")
        context_parts.append(f"Tasa de cumplimiento (30 días): {habit_completion_rate:.1f}%")
        context_parts.append(f"Mejor día para hábitos: {best_habit_day}")
        context_parts.append(f"Día más difícil para hábitos: {worst_habit_day}")
        
        # Emotional analysis
        context_parts.append("\n=== ANÁLISIS EMOCIONAL (últimos 30 días) ===")
        context_parts.append(f"Registros emocionales: {len(emotional_logs)}")
        context_parts.append(f"Estado de ánimo promedio: {avg_mood:.1f}/10")
        context_parts.append(f"Mejor momento: {max_mood}/10")
        context_parts.append(f"Peor momento: {min_mood}/10")
        context_parts.append(f"Tendencia actual: {mood_trend}")
        context_parts.append(f"Mejor día anímicamente: {best_mood_day}")
        context_parts.append(f"Día más difícil anímicamente: {worst_mood_day}")
        if top_emotions:
            emotions_str = ", ".join([f"{e[0]} ({e[1]} veces)" for e in top_emotions])
            context_parts.append(f"Emociones más frecuentes: {emotions_str}")
        
        # Recent notes
        if recent_notes:
            context_parts.append("\n=== NOTAS RECIENTES DEL USUARIO ===")
            for i, note in enumerate(recent_notes, 1):
                context_parts.append(f"{i}. \"{note}\"")
        
        # Get purpose analysis if available
        purpose_analysis = await db.purpose_analyses.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if purpose_analysis and purpose_analysis.get("analysis"):
            analysis = purpose_analysis["analysis"]
            context_parts.append("\n=== ANÁLISIS DE PROPÓSITO DE VIDA ===")
            if analysis.get("purpose_statement"):
                context_parts.append(f"Declaración de propósito: {analysis['purpose_statement']}")
            if analysis.get("core_identity"):
                context_parts.append(f"Identidad esencial: {analysis['core_identity'][:200]}...")
            if analysis.get("affirmation"):
                context_parts.append(f"Afirmación personal: {analysis['affirmation']}")
            if analysis.get("key_insights"):
                context_parts.append("Insights clave: " + "; ".join(analysis["key_insights"][:3]))
            if analysis.get("how_recovery_connects"):
                context_parts.append(f"Conexión con recuperación: {analysis['how_recovery_connects']}")
        
        # Also get purpose test results for values/strengths
        purpose_test = await db.purpose_tests.find_one(
            {"user_id": user_id},
            {"_id": 0, "profile": 1}
        )
        
        if purpose_test and purpose_test.get("profile"):
            profile_data = purpose_test["profile"]
            if not purpose_analysis:  # Only add if we don't have full analysis
                context_parts.append("\n=== PERFIL DE PROPÓSITO ===")
            if profile_data.get("purpose_type"):
                context_parts.append(f"Tipo de propósito: {profile_data['purpose_type']}")
            if profile_data.get("top_values"):
                context_parts.append(f"Valores principales: {', '.join(profile_data['top_values'])}")
            if profile_data.get("top_strengths"):
                context_parts.append(f"Fortalezas: {', '.join(profile_data['top_strengths'])}")
        
        # Patterns and insights
        context_parts.append("\n=== PATRONES DETECTADOS ===")
        if habit_completion_rate < 30:
            context_parts.append("- Baja adherencia a hábitos, puede necesitar ajustar metas o motivación")
        elif habit_completion_rate > 70:
            context_parts.append("- Excelente adherencia a hábitos, celebrar este logro")
        
        if mood_trend == "empeorando":
            context_parts.append("- El ánimo ha bajado esta semana, preguntar qué está pasando")
        elif mood_trend == "mejorando":
            context_parts.append("- El ánimo está mejorando, reconocer el progreso")
        
        if best_habit_day == worst_mood_day:
            context_parts.append(f"- Curiosamente, {best_habit_day} es su mejor día para hábitos pero peor anímicamente")
        
        full_context = "\n".join(context_parts)
        
        return full_context, role_context
        
    except Exception as e:
        print(f"Error getting Nelson context: {e}")
        return "No se pudo obtener contexto del usuario.", ROLE_CONTEXTS["patient"]

@app.get("/api/nelson/conversation")
async def get_nelson_conversation(current_user: User = Depends(get_current_user)):
    """Get Nelson conversation history"""
    try:
        conversation = await db.nelson_conversations.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0}
        )
        
        if conversation and conversation.get("messages"):
            # Return last 50 messages
            return {"messages": conversation["messages"][-50:]}
        
        return {"messages": []}
        
    except Exception as e:
        print(f"Error getting Nelson conversation: {e}")
        return {"messages": []}

@app.delete("/api/nelson/conversation")
async def clear_nelson_conversation(current_user: User = Depends(get_current_user)):
    """Clear Nelson conversation history"""
    try:
        await db.nelson_conversations.delete_one({"user_id": current_user.user_id})
        return {"success": True}
    except Exception as e:
        print(f"Error clearing Nelson conversation: {e}")
        return {"success": False}

@app.get("/api/nelson/summary")
async def get_nelson_summary(current_user: User = Depends(get_current_user)):
    """Get AI summary of recent Nelson conversations"""
    try:
        conversation = await db.nelson_conversations.find_one({"user_id": current_user.user_id})
        
        if not conversation or not conversation.get("messages"):
            return {"summary": "No hay conversaciones recientes para resumir."}
        
        # Get last 20 messages for summary
        recent_messages = conversation["messages"][-20:]
        
        # Build conversation text
        conv_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}" 
            for msg in recent_messages
        ])
        
        client = await get_openai_client()
        if not client:
            return {"summary": "No se pudo generar el resumen."}
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Eres un asistente que resume conversaciones terapéuticas. Genera un resumen breve (3-4 oraciones) de los temas principales, el estado emocional del usuario, y cualquier progreso o preocupación notable."},
                {"role": "user", "content": f"Resume esta conversación:\n\n{conv_text}"}
            ],
            temperature=0.5,
            max_tokens=200
        )
        
        return {"summary": response.choices[0].message.content}
        
    except Exception as e:
        print(f"Error generating Nelson summary: {e}")
        return {"summary": "Error generando resumen."}


# ============== NOTIFICATIONS ENDPOINTS ==============

# Motivational messages library
MOTIVATIONAL_MESSAGES = {
    "patient": [
        "Cada día que eliges tu bienestar es una victoria. ¡Sigue así! 💪",
        "Tu recuperación inspira más de lo que imaginas. Hoy es un nuevo comienzo.",
        "Los días difíciles construyen personas fuertes. Estás más cerca de tu mejor versión.",
        "Tu 'para qué' es más fuerte que cualquier obstáculo. Recuérdalo hoy.",
        "Celebra tu progreso, por pequeño que parezca. Cada paso cuenta.",
        "Hoy tienes la oportunidad de ser mejor que ayer. ¡Aprovéchala!",
        "Tu familia y tus sueños te esperan del otro lado. Sigue adelante.",
        "El pasado no define tu futuro. Hoy escribes una nueva historia.",
    ],
    "active_user": [
        "¡Buenos días, campeón! Tu reto de 21 días te espera. ¿Listo para ganar?",
        "Cada hábito completado es un ladrillo en tu nueva vida. ¡A construir!",
        "Los ganadores se levantan cuando es difícil. Hoy es tu día.",
        "Tu mejor versión está a solo un hábito de distancia. ¡Vamos!",
        "21 días pueden cambiar tu vida. ¿Qué esperas?",
    ],
    "family": [
        "Cuidarte a ti mismo es la mejor forma de ayudar a tu ser querido.",
        "Tu amor y paciencia hacen la diferencia. No estás solo en esto.",
        "Recuerda: no puedes controlar la recuperación de otros, pero sí tu bienestar.",
        "Hoy es un buen día para establecer límites sanos con amor.",
    ],
    "professional": [
        "Tu trabajo transforma vidas. Recuerda también cuidar la tuya.",
        "El autocuidado del terapeuta es parte esencial del proceso terapéutico.",
        "Gracias por tu dedicación. El mundo necesita más personas como tú.",
    ]
}

@app.get("/api/notifications/settings")
async def get_notification_settings(current_user: User = Depends(get_current_user)):
    """Get user's notification settings"""
    settings = await db.notification_settings.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        return {
            "motivational": True,
            "habit_reminders": True,
            "emotion_reminders": True,
            "goal_reminders": True,
            "preferred_time": "09:00"
        }
    
    return {
        "motivational": settings.get("motivational", True),
        "habit_reminders": settings.get("habit_reminders", True),
        "emotion_reminders": settings.get("emotion_reminders", True),
        "goal_reminders": settings.get("goal_reminders", True),
        "preferred_time": settings.get("preferred_time", "09:00")
    }

@app.put("/api/notifications/settings")
async def update_notification_settings(
    request: UpdateNotificationSettingsRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user's notification settings"""
    update_data = {}
    
    if request.motivational is not None:
        update_data["motivational"] = request.motivational
    if request.habit_reminders is not None:
        update_data["habit_reminders"] = request.habit_reminders
    if request.emotion_reminders is not None:
        update_data["emotion_reminders"] = request.emotion_reminders
    if request.goal_reminders is not None:
        update_data["goal_reminders"] = request.goal_reminders
    if request.preferred_time is not None:
        update_data["preferred_time"] = request.preferred_time
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.notification_settings.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": update_data,
                "$setOnInsert": {"user_id": current_user.user_id, "created_at": datetime.now(timezone.utc)}
            },
            upsert=True
        )
    
    return {"success": True, "message": "Configuración actualizada"}

@app.get("/api/notifications/today")
async def get_today_notification(current_user: User = Depends(get_current_user)):
    """Get today's motivational message and pending reminders"""
    import random
    
    # Get user profile for role
    profile = await db.profiles.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0, "role": 1}
    )
    role = profile.get("role", "patient") if profile else "patient"
    
    # Get random motivational message for role
    messages = MOTIVATIONAL_MESSAGES.get(role, MOTIVATIONAL_MESSAGES["patient"])
    motivational = random.choice(messages)
    
    # Check pending habits for today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    habits = await db.habits.find(
        {"user_id": current_user.user_id, "is_active": True},
        {"_id": 0, "habit_id": 1, "name": 1}
    ).to_list(20)
    
    habit_ids = [h["habit_id"] for h in habits]
    
    completed_logs = await db.habit_logs.find({
        "user_id": current_user.user_id,
        "habit_id": {"$in": habit_ids},
        "date": today,
        "completed": True
    }).to_list(100)
    
    completed_habit_ids = {log["habit_id"] for log in completed_logs}
    pending_habits = [h for h in habits if h["habit_id"] not in completed_habit_ids]
    
    # Check if emotion logged today
    emotion_logged = await db.emotional_logs.find_one({
        "user_id": current_user.user_id,
        "date": today
    }) is not None
    
    return {
        "motivational_message": motivational,
        "pending_habits": len(pending_habits),
        "pending_habit_names": [h["name"] for h in pending_habits[:3]],
        "emotion_logged": emotion_logged,
        "date": today
    }

# Helper function to send push notification via Expo
async def send_expo_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """Send a push notification via Expo Push API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json={
                    "to": push_token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default"
                },
                headers={"Content-Type": "application/json"}
            )
            return response.json()
    except Exception as e:
        print(f"Error sending push notification: {e}")
        return None

@app.post("/api/notifications/send-test")
async def send_test_notification(current_user: User = Depends(get_current_user)):
    """Send a test notification to the current user"""
    token_doc = await db.push_tokens.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not token_doc:
        raise HTTPException(status_code=404, detail="No push token registered. Please enable notifications in the app first.")
    
    result = await send_expo_push_notification(
        push_token=token_doc["push_token"],
        title="¡Hola desde SinAdicciones! 👋",
        body="Las notificaciones están funcionando correctamente.",
        data={"type": "test"}
    )
    
    if result:
        return {"success": True, "message": "Notificación de prueba enviada"}
    else:
        raise HTTPException(status_code=500, detail="Error enviando notificación")


# ============== DEMO USER SETUP ==============

@app.post("/api/admin/setup-demo-user")
async def setup_demo_user():
    """Create or update the demo user with all necessary data. 
    This endpoint can be called to initialize demo data in any environment."""
    
    import hashlib
    
    demo_email = "demo@sinadicciones.org"
    demo_password = "demopassword"
    demo_user_id = "user_demo_carlos"
    
    # Hash password
    password_hash = hashlib.sha256(demo_password.encode()).hexdigest()
    
    # Create/update user
    await db.users.update_one(
        {"email": demo_email},
        {
            "$set": {
                "user_id": demo_user_id,
                "email": demo_email,
                "name": "Carlos Demo",
                "password_hash": password_hash,
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Create/update profile
    await db.profiles.update_one(
        {"user_id": demo_user_id},
        {
            "$set": {
                "user_id": demo_user_id,
                "name": "Carlos Demo",
                "email": demo_email,
                "role": "patient",
                "addiction_type": "Alcohol",
                "recovery_start_date": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),
                "days_clean": 45,
                "my_why": "Por mi familia, especialmente mis hijos. Quiero ser el padre que ellos merecen y estar presente en sus vidas.",
                "triggers": ["stress", "loneliness", "celebration", "boredom"],
                "protective_factors": ["family", "friends", "sports", "spirituality"],
                "support_network": ["Mi esposa María", "Padrino AA - Roberto", "Terapeuta Dr. García"],
                "onboarding_completed": True,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Create purpose test data
    await db.purpose_tests.update_one(
        {"user_id": demo_user_id},
        {
            "$set": {
                "test_id": str(uuid.uuid4()),
                "user_id": demo_user_id,
                "completed_at": datetime.now(timezone.utc),
                "answers": {
                    "values": ["Familia", "Salud", "Honestidad", "Crecimiento", "Paz interior"],
                    "happyBefore": "Me hacía feliz pasar tiempo con mi familia, jugar fútbol con mis amigos y sentir que tenía el control de mi vida.",
                    "qualities": ["Leal", "Trabajador", "Empático", "Persistente"],
                    "strengths": ["Escuchar a los demás", "Resolver problemas", "Motivar a otros"],
                    "peopleAsk": "La gente me pide consejos cuando tienen problemas personales.",
                    "enjoyFree": "Ayudaría a otras personas que están pasando por lo mismo que yo pasé.",
                    "futureVision": "Me veo sano, con mi familia unida, trabajando en algo que me apasione.",
                    "whatTheySay": "Que fui alguien que superó sus demonios y fue un buen padre.",
                    "noFailure": "Abriría un centro de rehabilitación.",
                    "worldProblem": "El estigma hacia las personas con adicciones.",
                    "helpWho": "A personas como yo, especialmente padres de familia.",
                    "legacy": "Que la recuperación es posible, que nunca es tarde para cambiar."
                },
                "profile": {
                    "purpose_type": "Sanador",
                    "top_values": ["Familia", "Salud", "Honestidad"],
                    "top_strengths": ["Escuchar a los demás", "Motivar a otros", "Resolver problemas"]
                }
            }
        },
        upsert=True
    )
    
    # Create some demo habits
    demo_habits = [
        {"habit_id": f"habit_demo_1", "name": "Meditación 10 min", "color": "#10B981", "frequency": "daily", "is_active": True},
        {"habit_id": f"habit_demo_2", "name": "Ejercicio", "color": "#EF4444", "frequency": "daily", "is_active": True},
        {"habit_id": f"habit_demo_3", "name": "Lectura AA", "color": "#3B82F6", "frequency": "daily", "is_active": True},
        {"habit_id": f"habit_demo_4", "name": "Llamar a padrino", "color": "#8B5CF6", "frequency": "daily", "is_active": True},
    ]
    
    for habit in demo_habits:
        await db.habits.update_one(
            {"user_id": demo_user_id, "habit_id": habit["habit_id"]},
            {
                "$set": {
                    "user_id": demo_user_id,
                    **habit,
                    "created_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
    
    return {
        "success": True,
        "message": "Usuario demo creado/actualizado exitosamente",
        "user_id": demo_user_id,
        "email": demo_email
    }


@app.post("/api/admin/setup-demo-professional")
async def setup_demo_professional():
    """Create or update the demo professional user with all necessary data."""
    
    import hashlib
    
    demo_email = "profesional@sinadicciones.org"
    demo_password = "demopassword"
    demo_user_id = "user_demo_profesional"
    patient_demo_id = "user_demo_carlos"
    
    # Hash password
    password_hash = hashlib.sha256(demo_password.encode()).hexdigest()
    
    # Create/update user
    await db.users.update_one(
        {"email": demo_email},
        {
            "$set": {
                "user_id": demo_user_id,
                "email": demo_email,
                "name": "Dra. María González",
                "password_hash": password_hash,
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Create/update professional profile
    await db.profiles.update_one(
        {"user_id": demo_user_id},
        {
            "$set": {
                "user_id": demo_user_id,
                "name": "Dra. María González",
                "email": demo_email,
                "role": "professional",
                "onboarding_completed": True,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Create/update user_profiles with professional details
    await db.user_profiles.update_one(
        {"user_id": demo_user_id},
        {
            "$set": {
                "user_id": demo_user_id,
                "role": "professional",
                "professional_type": "Psicóloga Clínica",
                "specialization": "Adicciones y trastornos relacionados",
                "years_experience": 12,
                "license_number": "PSI-12345-CL",
                "institution": "Centro de Rehabilitación SinAdicciones",
                "bio": "Psicóloga clínica con más de 12 años de experiencia en el tratamiento de adicciones. Mi enfoque combina terapia cognitivo-conductual con técnicas de mindfulness. Creo firmemente en que la recuperación es posible para todos.",
                "whatsapp": "+56 9 1234 5678",
                "consultation_fee": "$45.000 CLP / sesión",
                "accepts_patients": True,
                "profile_completed": True,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Link professional with patient demo
    await db.therapist_patients.update_one(
        {"therapist_id": demo_user_id, "patient_id": patient_demo_id},
        {
            "$set": {
                "therapist_id": demo_user_id,
                "patient_id": patient_demo_id,
                "status": "active",
                "linked_at": datetime.now(timezone.utc),
                "notes": "Paciente demo para demostración"
            }
        },
        upsert=True
    )
    
    # Create a sample task for the patient
    await db.therapist_tasks.update_one(
        {"therapist_id": demo_user_id, "patient_id": patient_demo_id, "title": "Completar diario de emociones"},
        {
            "$set": {
                "task_id": str(uuid.uuid4()),
                "therapist_id": demo_user_id,
                "patient_id": patient_demo_id,
                "title": "Completar diario de emociones",
                "description": "Escribir cómo te sentiste durante el día y qué situaciones te generaron emociones fuertes.",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "status": "pending",
                "priority": "medium",
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Usuario profesional demo creado/actualizado exitosamente",
        "user_id": demo_user_id,
        "email": demo_email,
        "password": demo_password,
        "linked_patient": patient_demo_id
    }




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)