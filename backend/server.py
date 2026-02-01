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

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    profile_completed: bool = False
    updated_at: datetime

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

# ============== PURPOSE (SOBRIEDAD CON SENTIDO) ENDPOINTS ==============

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

@app.get("/api/centers")
async def get_centers():
    """Fetch rehabilitation centers from sinadicciones.cl"""
    
    # Check cache
    now = datetime.now(timezone.utc)
    if (centers_cache["data"] is not None and 
        centers_cache["last_updated"] is not None and
        (now - centers_cache["last_updated"]).seconds < centers_cache["cache_duration"]):
        return {"centers": centers_cache["data"], "cached": True, "last_updated": centers_cache["last_updated"].isoformat()}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://sinadicciones.cl/explore-no-map/?type=place&sort=latest",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Error fetching centers")
            
            html = response.text
            soup = BeautifulSoup(html, 'html.parser')
            
            centers = []
            
            # Find all listing items
            listings = soup.find_all('div', class_='listing-preview')
            
            for listing in listings:
                try:
                    center = {}
                    
                    # Get name and URL
                    title_elem = listing.find('h2', class_='listing-title') or listing.find('h3', class_='listing-title')
                    if title_elem:
                        link = title_elem.find('a')
                        if link:
                            center['name'] = link.get_text(strip=True)
                            center['url'] = link.get('href', '')
                    
                    # Get description/tagline
                    tagline = listing.find('div', class_='listing-tagline') or listing.find('p', class_='listing-tagline')
                    if tagline:
                        center['description'] = tagline.get_text(strip=True)
                    else:
                        center['description'] = ''
                    
                    # Get address
                    address_elem = listing.find('li', class_='address') or listing.find('span', class_='address')
                    if address_elem:
                        center['address'] = address_elem.get_text(strip=True)
                    else:
                        center['address'] = ''
                    
                    # Get phone
                    phone_elem = listing.find('li', class_='phone') or listing.find('a', href=re.compile(r'^tel:'))
                    if phone_elem:
                        phone_text = phone_elem.get_text(strip=True)
                        center['phone'] = phone_text
                    else:
                        center['phone'] = ''
                    
                    # Get image
                    img_elem = listing.find('img')
                    if img_elem:
                        center['image'] = img_elem.get('src', '') or img_elem.get('data-src', '')
                    else:
                        center['image'] = ''
                    
                    # Get categories/modalities
                    categories = listing.find_all('span', class_='category-name') or listing.find_all('a', class_='listing-category')
                    center['modalities'] = [cat.get_text(strip=True) for cat in categories if cat.get_text(strip=True)]
                    
                    # Get price if available
                    price_elem = listing.find('span', class_='price') or listing.find('div', class_='listing-price')
                    if price_elem:
                        center['price'] = price_elem.get_text(strip=True)
                    else:
                        center['price'] = 'Consultar'
                    
                    # Only add if we have a name
                    if center.get('name'):
                        centers.append(center)
                        
                except Exception as e:
                    print(f"Error parsing listing: {e}")
                    continue
            
            # If we couldn't parse any listings, try alternative parsing
            if not centers:
                # Try finding article elements
                articles = soup.find_all('article')
                for article in articles:
                    try:
                        center = {}
                        title = article.find(['h2', 'h3', 'h4'])
                        if title:
                            link = title.find('a') or article.find('a')
                            if link:
                                center['name'] = title.get_text(strip=True)
                                center['url'] = link.get('href', '')
                                center['description'] = ''
                                center['address'] = ''
                                center['phone'] = ''
                                center['modalities'] = []
                                center['price'] = 'Consultar'
                                if center.get('name') and center.get('url'):
                                    centers.append(center)
                    except:
                        continue
            
            # Update cache
            centers_cache["data"] = centers
            centers_cache["last_updated"] = now
            
            return {
                "centers": centers, 
                "cached": False, 
                "last_updated": now.isoformat(),
                "count": len(centers)
            }
            
    except httpx.RequestError as e:
        print(f"Request error: {e}")
        # Return cached data if available
        if centers_cache["data"]:
            return {
                "centers": centers_cache["data"], 
                "cached": True, 
                "error": "Using cached data due to connection error",
                "last_updated": centers_cache["last_updated"].isoformat() if centers_cache["last_updated"] else None
            }
        raise HTTPException(status_code=502, detail="Error connecting to sinadicciones.cl")

# ============== HEALTH CHECK ==============

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)