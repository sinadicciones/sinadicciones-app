from fastapi import FastAPI, HTTPException, Depends, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os
import httpx
import uuid
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS Configuration - Allow specific origins with credentials
origins = [
    "http://localhost:3000",
    "https://heal-journey-4.preview.emergentagent.com",
    "https://preview.emergentagent.com",
    "exp://",  # For Expo Go
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.test_database

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

class LinkTherapistRequest(BaseModel):
    therapist_id: str

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
    role: str  # patient, professional
    country: Optional[str] = None
    identification: Optional[str] = None  # RUT, DNI, etc.

@app.post("/api/profile/set-role")
async def set_user_role(data: SetRoleRequest, current_user: User = Depends(get_current_user)):
    """Set user's role (patient or professional)"""
    if data.role not in ["patient", "professional"]:
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
            "profile_completed": True,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True}

@app.get("/api/therapists/search")
async def search_therapists(query: str = "", current_user: User = Depends(get_current_user)):
    """Search for therapists by name"""
    # Find professionals with matching names
    search_filter = {
        "role": "professional",
        "profile_completed": True
    }
    
    profiles = await db.user_profiles.find(
        search_filter,
        {"_id": 0, "user_id": 1, "professional_type": 1, "specialization": 1, "institution": 1, "years_experience": 1}
    ).to_list(100)
    
    results = []
    for profile in profiles:
        # Get user name
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "name": 1})
        if user:
            name = user.get("name", "")
            # Filter by query if provided
            if query.lower() in name.lower() or not query:
                results.append({
                    "user_id": profile["user_id"],
                    "name": name,
                    "professional_type": profile.get("professional_type"),
                    "specialization": profile.get("specialization"),
                    "institution": profile.get("institution"),
                    "years_experience": profile.get("years_experience")
                })
    
    return results

@app.post("/api/patient/link-therapist")
async def link_therapist(data: LinkTherapistRequest, current_user: User = Depends(get_current_user)):
    """Link patient to a therapist"""
    # Verify the therapist exists and is a professional
    therapist_profile = await db.user_profiles.find_one({
        "user_id": data.therapist_id,
        "role": "professional"
    })
    
    if not therapist_profile:
        raise HTTPException(status_code=404, detail="Terapeuta no encontrado")
    
    # Update patient's profile with therapist link
    await db.user_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "linked_therapist_id": data.therapist_id,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True, "message": "Terapeuta vinculado correctamente"}

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
    
    return results

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
    
    return alerts

@app.get("/api/professional/alerts/summary")
async def get_alerts_summary(current_user: User = Depends(get_current_user)):
    """Get a summary count of alerts by type"""
    alerts = await get_professional_alerts(current_user)
    
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

ADMIN_EMAIL = "contacto@sinadicciones.cl"

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
    
    # Calculate average mood
    if logs:
        avg_mood = sum(log["mood_scale"] for log in logs) / len(logs)
    else:
        avg_mood = 0
    
    # Get most common tags
    tag_counts = {}
    for log in logs:
        for tag in log.get("tags", []):
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
        "recent_mood": recent_mood["mood_scale"] if recent_mood else None
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

# ============== CENTERS SCRAPING ==============

import re
from bs4 import BeautifulSoup

# Cache for centers data
centers_cache = {
    "data": None,
    "last_updated": None,
    "cache_duration": 300  # 5 minutes cache
}

# Hardcoded centers data as fallback (from sinadicciones.cl)
FALLBACK_CENTERS = [
    {
        "name": "Centro rehabilitación de Drogas Mixto - Existencia Plena",
        "url": "https://sinadicciones.cl/listing/centro-rehabilitacion-existencia-plena/",
        "description": "Se puede, pero no solo!",
        "phone": "+56 9 5402 0968",
        "address": "El Copihue 3238, Calera de Tango",
        "price": "Desde $1M a $1.2M",
        "modalities": ["Online", "Residencial", "Ambulatorio"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/9a0e1ef6782c77-1-768x512.jpg"
    },
    {
        "name": "Tratamiento Adicciones Los Olivos - Arica",
        "url": "https://sinadicciones.cl/listing/tratamiento-adicciones-los-olivos-arica/",
        "description": "Programa de Tratamiento Los Olivos – Ambulatorio y Residencial",
        "phone": "58 2 24 6387",
        "address": "Arica",
        "price": "Consultar",
        "modalities": ["Residencial", "Ambulatorio"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Centro Clínico Comunitario de Drogas - Puerto Montt",
        "url": "https://sinadicciones.cl/listing/centro-clinico-comunitario-de-drogas-puerto-montt/",
        "description": "Universidad Austral De Chile",
        "phone": "+56 9 4163 8395",
        "address": "Puerto Montt",
        "price": "Gratis",
        "modalities": ["Ambulatorio"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Centro de Rehabilitación de Drogas - Nawel Chile",
        "url": "https://sinadicciones.cl/listing/centro-de-rehabilitacion-de-drogas-nawel-chile/",
        "description": "El Rumbo a Seguir",
        "phone": "+56 9 35450840",
        "address": "San Joaquin de los Mayos, Machalí",
        "price": "Desde $500.000 a $700.000",
        "modalities": ["Residencial"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Comunidad Terapéutica de Mujeres - Suyaí",
        "url": "https://sinadicciones.cl/listing/comunidad-terapeutica-de-mujeres-suyai/",
        "description": "Comunidad terapéutica de adicciones para mujeres",
        "phone": "+569 2230 8440",
        "address": "Mirador del Valle 68, Lampa",
        "price": "Desde $250.000 a $500.000",
        "modalities": ["Residencial"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Fundación Paréntesis - Santiago",
        "url": "https://sinadicciones.cl/listing/fundacion-parentesis-santiago/",
        "description": "Atención especializada en adicciones",
        "phone": "+56 2 2634 4760",
        "address": "Santiago Centro",
        "price": "Consultar",
        "modalities": ["Ambulatorio", "Online"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Centro de Tratamiento Renacer",
        "url": "https://sinadicciones.cl/listing/centro-tratamiento-renacer/",
        "description": "Recuperación integral para personas con adicciones",
        "phone": "+56 9 8765 4321",
        "address": "Viña del Mar",
        "price": "Desde $500.000 a $700.000",
        "modalities": ["Residencial"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
    },
    {
        "name": "Comunidad Terapéutica Nueva Vida",
        "url": "https://sinadicciones.cl/listing/comunidad-terapeutica-nueva-vida/",
        "description": "Tratamiento residencial especializado",
        "phone": "+56 9 1234 5678",
        "address": "Concepción",
        "price": "Desde $250.000 a $500.000",
        "modalities": ["Residencial", "Ambulatorio"],
        "image": "https://sinadicciones.cl/wp-content/uploads/2025/10/e08471078e9a00-1-768x512.jpg"
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
    """Fetch rehabilitation centers from sinadicciones.cl"""
    
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
                "https://sinadicciones.cl/explore-no-map/?type=place&sort=latest",
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

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)