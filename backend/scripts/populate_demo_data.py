#!/usr/bin/env python3
"""
Script to populate demo user with 3 months of habit and emotional data
"""
import os
import sys
from datetime import datetime, timedelta
import random
import hashlib

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'sinadicciones')

def generate_id(prefix: str) -> str:
    """Generate a unique ID"""
    import uuid
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    """Simple password hash"""
    return hashlib.sha256(password.encode()).hexdigest()

def main():
    print(f"Connecting to MongoDB: {MONGO_URL}")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Demo user data
    demo_user_id = "user_demo_carlos"
    demo_email = "demo@sinadicciones.org"
    demo_password = "demopassword"
    
    # Check if user exists
    existing_user = db.users.find_one({"email": demo_email})
    if existing_user:
        print(f"Demo user already exists: {demo_email}")
        demo_user_id = existing_user.get("user_id", demo_user_id)
    else:
        # Create demo user
        user_data = {
            "user_id": demo_user_id,
            "email": demo_email,
            "password_hash": hash_password(demo_password),
            "name": "Carlos Mendoza",
            "role": "patient",
            "profile_completed": True,
            "onboarding_completed": True,
            "created_at": datetime.utcnow() - timedelta(days=90),
        }
        db.users.insert_one(user_data)
        print(f"Created demo user: {demo_email}")
    
    # Create/update profile
    profile_data = {
        "user_id": demo_user_id,
        "role": "patient",
        "profile_completed": True,
        "onboarding_completed": True,
        "addiction_type": "Alcohol",
        "secondary_addictions": ["Tabaco"],
        "clean_date": (datetime.utcnow() - timedelta(days=45)).isoformat(),
        "my_why": "Por mi familia y mi salud. Quiero estar presente para mis hijos y ser un ejemplo positivo.",
        "life_story": "Comencé a beber en la universidad y gradualmente se convirtió en un problema. Después de perder mi trabajo, decidí buscar ayuda.",
        "emergency_contacts": [
            {"name": "María (Esposa)", "phone": "+56912345678", "relationship": "Esposa"},
            {"name": "Dr. González", "phone": "+56987654321", "relationship": "Terapeuta"}
        ],
        "triggers": ["Estrés laboral", "Reuniones sociales", "Fines de semana", "Problemas financieros"],
        "protective_factors": ["Familia", "Ejercicio", "Grupo de apoyo", "Meditación"],
        "updated_at": datetime.utcnow(),
    }
    
    db.profiles.update_one(
        {"user_id": demo_user_id},
        {"$set": profile_data},
        upsert=True
    )
    print("Profile created/updated")
    
    # Create habits
    habits = [
        {"name": "Meditación 10 min", "icon": "🧘", "category": "Bienestar"},
        {"name": "Ejercicio", "icon": "🏃", "category": "Salud"},
        {"name": "Lectura AA", "icon": "📖", "category": "Recuperación"},
        {"name": "Gratitud", "icon": "🙏", "category": "Bienestar"},
        {"name": "Llamar padrino", "icon": "📞", "category": "Soporte"},
    ]
    
    # Delete existing habits for this user
    db.habits.delete_many({"user_id": demo_user_id})
    
    habit_ids = []
    for habit in habits:
        habit_id = generate_id("habit")
        habit_data = {
            "habit_id": habit_id,
            "user_id": demo_user_id,
            "name": habit["name"],
            "icon": habit["icon"],
            "category": habit.get("category", "General"),
            "frequency": "daily",
            "streak": random.randint(0, 30),
            "created_at": datetime.utcnow() - timedelta(days=90),
        }
        db.habits.insert_one(habit_data)
        habit_ids.append(habit_id)
    print(f"Created {len(habits)} habits")
    
    # Delete existing habit entries
    db.habit_entries.delete_many({"user_id": demo_user_id})
    
    # Create 90 days of habit entries
    today = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
    entries_created = 0
    
    for days_ago in range(90):
        date = today - timedelta(days=days_ago)
        date_str = date.strftime("%Y-%m-%d")
        
        # Random completion rate (higher for recent days)
        completion_rate = 0.3 + (0.5 * (1 - days_ago/90)) + random.uniform(-0.2, 0.2)
        completion_rate = max(0.1, min(0.95, completion_rate))
        
        for habit_id in habit_ids:
            completed = random.random() < completion_rate
            entry = {
                "entry_id": generate_id("entry"),
                "habit_id": habit_id,
                "user_id": demo_user_id,
                "date": date_str,
                "completed": completed,
                "created_at": date,
            }
            db.habit_entries.insert_one(entry)
            entries_created += 1
    
    print(f"Created {entries_created} habit entries")
    
    # Delete existing emotional logs
    db.emotional_logs.delete_many({"user_id": demo_user_id})
    
    # Create 90 days of emotional logs
    emotions_list = ["Ansiedad", "Gratitud", "Esperanza", "Tristeza", "Calma", "Frustración", "Alegría"]
    logs_created = 0
    
    for days_ago in range(90):
        date = today - timedelta(days=days_ago)
        date_str = date.strftime("%Y-%m-%d")
        
        # Mood generally improving over time
        base_mood = 4 + (3 * (1 - days_ago/90))
        mood = int(max(1, min(10, base_mood + random.uniform(-2, 2))))
        
        # Select 1-3 random emotions
        selected_emotions = random.sample(emotions_list, random.randint(1, 3))
        
        log = {
            "log_id": generate_id("emo"),
            "user_id": demo_user_id,
            "mood": mood,
            "mood_scale": mood,
            "emotions": selected_emotions,
            "tags": selected_emotions,
            "note": random.choice([
                "Hoy me sentí mejor que ayer",
                "Un día difícil pero lo superé",
                "Agradecido por mi familia",
                "Practicando la paciencia",
                "Pequeños pasos hacia adelante",
                "",
            ]),
            "date": date_str,
            "created_at": date,
        }
        db.emotional_logs.insert_one(log)
        logs_created += 1
    
    print(f"Created {logs_created} emotional logs")
    
    print("\n✅ Demo data populated successfully!")
    print(f"   Email: {demo_email}")
    print(f"   Password: {demo_password}")
    
    client.close()

if __name__ == "__main__":
    main()
