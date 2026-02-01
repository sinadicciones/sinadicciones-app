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

# ============== HEALTH CHECK ==============

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)