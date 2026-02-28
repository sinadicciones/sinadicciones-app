"""
Script para crear datos de prueba de 3 meses para visualizar el diseño
"""
import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import random
import uuid

async def create_demo_data():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['sinadicciones']
    
    # Crear usuario de demo o actualizar existente
    demo_email = "demo@sinadicciones.org"
    demo_user_id = "user_demo_carlos"
    
    # Fecha de inicio: hace 3 meses
    clean_since = datetime.now() - timedelta(days=90)
    
    # Actualizar o crear usuario
    demo_user = {
        "user_id": demo_user_id,
        "email": demo_email,
        "name": "Carlos Mendoza",
        "password": "demopassword",  # En producción usar hash
        "role": "active_user",
        "clean_since": clean_since.strftime("%Y-%m-%d"),
        "addiction_type": "Alcohol",
        "years_using": "8",
        "recovery_method": "12 Pasos AA",
        "best_streak": 90,
        "phone": "+56912345678",
        "emergency_contact": {
            "name": "María López",
            "phone": "+56987654321",
            "relationship": "Esposa"
        },
        "risk_factors": [
            "Estrés laboral",
            "Reuniones sociales",
            "Fines de semana"
        ],
        "protective_factors": [
            "Grupo de apoyo AA",
            "Ejercicio diario",
            "Meditación",
            "Familia"
        ],
        "triggers": [
            "Discusiones",
            "Soledad",
            "Celebraciones"
        ],
        "coping_strategies": [
            "Llamar a padrino",
            "Respiración profunda",
            "Salir a caminar"
        ],
        "created_at": clean_since.isoformat()
    }
    
    await db.users.update_one(
        {"email": demo_email},
        {"$set": demo_user},
        upsert=True
    )
    print(f"✅ Usuario {demo_email} creado/actualizado")
    
    # Crear hábitos
    habits = [
        {"name": "Meditación 10 min", "color": "#10B981", "frequency": "daily", "time_of_day": "morning"},
        {"name": "Ejercicio", "color": "#3B82F6", "frequency": "daily", "time_of_day": "morning"},
        {"name": "Lectura AA", "color": "#8B5CF6", "frequency": "daily", "time_of_day": "evening"},
        {"name": "Gratitud", "color": "#F59E0B", "frequency": "daily", "time_of_day": "evening"},
        {"name": "Llamar padrino", "color": "#EC4899", "frequency": "daily", "time_of_day": "afternoon"},
    ]
    
    # Eliminar hábitos anteriores del usuario
    await db.habits.delete_many({"user_id": demo_user_id})
    
    habit_ids = []
    for habit in habits:
        habit_id = f"habit_{uuid.uuid4().hex[:12]}"
        habit_ids.append(habit_id)
        await db.habits.insert_one({
            "habit_id": habit_id,
            "user_id": demo_user_id,
            **habit,
            "created_at": clean_since.isoformat()
        })
    print(f"✅ {len(habits)} hábitos creados")
    
    # Crear registros de hábitos para 90 días
    await db.habit_logs.delete_many({"user_id": demo_user_id})
    
    habit_logs = []
    for day in range(90):
        date = (clean_since + timedelta(days=day)).strftime("%Y-%m-%d")
        for i, habit_id in enumerate(habit_ids):
            # 70-90% de cumplimiento, mejorando con el tiempo
            completion_chance = 0.7 + (day / 90) * 0.2
            completed = random.random() < completion_chance
            habit_logs.append({
                "log_id": f"log_{uuid.uuid4().hex[:12]}",
                "habit_id": habit_id,
                "user_id": demo_user_id,
                "date": date,
                "completed": completed,
                "created_at": f"{date}T{8 + i}:00:00"
            })
    
    if habit_logs:
        await db.habit_logs.insert_many(habit_logs)
    print(f"✅ {len(habit_logs)} registros de hábitos creados")
    
    # Crear registros emocionales para 90 días
    await db.emotional_logs.delete_many({"user_id": demo_user_id})
    
    emotions = ["Calma", "Ansiedad", "Felicidad", "Tristeza", "Esperanza", "Gratitud", "Motivación"]
    emotional_logs = []
    
    for day in range(90):
        date = clean_since + timedelta(days=day)
        # Mood mejora con el tiempo (de 4-6 a 6-9)
        base_mood = 4 + (day / 90) * 3
        mood = max(1, min(10, int(base_mood + random.randint(-2, 2))))
        
        selected_emotions = random.sample(emotions, random.randint(1, 3))
        
        emotional_logs.append({
            "log_id": f"emo_{uuid.uuid4().hex[:12]}",
            "user_id": demo_user_id,
            "mood": mood,
            "emotions": selected_emotions,
            "note": "",
            "created_at": date.isoformat(),
            "date": date.strftime("%Y-%m-%d")
        })
    
    if emotional_logs:
        await db.emotional_logs.insert_many(emotional_logs)
    print(f"✅ {len(emotional_logs)} registros emocionales creados")
    
    # Crear metas/objetivos
    await db.goals.delete_many({"user_id": demo_user_id})
    
    goals = [
        {
            "goal_id": f"goal_{uuid.uuid4().hex[:12]}",
            "user_id": demo_user_id,
            "area": "recovery",
            "title": "Completar 90 días limpio",
            "description": "Mantenerme sobrio durante 90 días consecutivos",
            "target_date": (clean_since + timedelta(days=90)).strftime("%Y-%m-%d"),
            "progress": 100,
            "status": "completed",
            "created_at": clean_since.isoformat()
        },
        {
            "goal_id": f"goal_{uuid.uuid4().hex[:12]}",
            "user_id": demo_user_id,
            "area": "health",
            "title": "Ejercicio 5 veces por semana",
            "description": "Hacer ejercicio al menos 5 días a la semana",
            "target_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "progress": 75,
            "status": "in_progress",
            "created_at": clean_since.isoformat()
        },
        {
            "goal_id": f"goal_{uuid.uuid4().hex[:12]}",
            "user_id": demo_user_id,
            "area": "relationships",
            "title": "Mejorar comunicación familiar",
            "description": "Tener conversaciones significativas con mi familia semanalmente",
            "target_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
            "progress": 60,
            "status": "in_progress",
            "created_at": clean_since.isoformat()
        }
    ]
    
    for goal in goals:
        await db.goals.insert_one(goal)
    print(f"✅ {len(goals)} metas creadas")
    
    # Crear registros del propósito/rueda de vida
    await db.purpose_ratings.delete_many({"user_id": demo_user_id})
    
    areas = ["recovery", "health", "relationships", "work", "spirituality", "finances"]
    purpose_logs = []
    
    for day in range(0, 90, 7):  # Registro semanal
        date = clean_since + timedelta(days=day)
        ratings = {}
        for area in areas:
            # Mejora gradual en todas las áreas
            base = 4 + (day / 90) * 4
            ratings[area] = max(1, min(10, int(base + random.randint(-1, 2))))
        
        purpose_logs.append({
            "rating_id": f"rating_{uuid.uuid4().hex[:12]}",
            "user_id": demo_user_id,
            "ratings": ratings,
            "created_at": date.isoformat(),
            "date": date.strftime("%Y-%m-%d")
        })
    
    if purpose_logs:
        await db.purpose_ratings.insert_many(purpose_logs)
    print(f"✅ {len(purpose_logs)} registros de propósito creados")
    
    print("\n" + "="*50)
    print("CREDENCIALES DE PRUEBA:")
    print(f"Email: {demo_email}")
    print(f"Password: demopassword")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(create_demo_data())
