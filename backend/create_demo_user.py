"""
Script para crear un usuario de prueba con 3 meses de datos históricos
para demostración del dashboard de recuperación.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import uuid
import random
import hashlib
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.test_database

# Datos del usuario de prueba
TEST_USER = {
    "email": "demo@sinadicciones.cl",
    "password": "Demo123!",  # En producción esto sería hasheado
    "name": "Carlos Mendoza",
    "user_id": f"user_demo_{uuid.uuid4().hex[:8]}"
}

# Hábitos típicos de recuperación
HABITS_DATA = [
    {"name": "Meditación matutina", "icon": "leaf", "color": "#8B5CF6"},
    {"name": "Ejercicio físico", "icon": "fitness", "color": "#F59E0B"},
    {"name": "Llamar a mi padrino", "icon": "call", "color": "#10B981"},
    {"name": "Escribir diario", "icon": "book", "color": "#3B82F6"},
    {"name": "Reunión de grupo", "icon": "people", "color": "#EC4899"},
    {"name": "Dormir 8 horas", "icon": "moon", "color": "#6366F1"},
]

# Tags emocionales
EMOTION_TAGS = [
    "tranquilidad", "gratitud", "esperanza", "motivación",  # Positivos
    "ansiedad", "tristeza", "frustración", "craving",  # Negativos
    "neutral", "reflexivo", "cansancio"  # Neutros
]

# Triggers y factores protectores
TRIGGERS = ["Estrés laboral", "Problemas familiares", "Soledad", "Fiestas sociales", "Aburrimiento"]
PROTECTIVE_FACTORS = ["Familia", "Ejercicio", "Meditación", "Grupo de apoyo", "Terapeuta", "Hobbie: música"]

async def create_demo_user():
    print("🚀 Creando usuario de demostración...")
    
    user_id = TEST_USER["user_id"]
    now = datetime.now(timezone.utc)
    three_months_ago = now - timedelta(days=90)
    
    # 1. Crear usuario
    existing = await db.users.find_one({"email": TEST_USER["email"]})
    if existing:
        print("⚠️ Usuario ya existe, actualizando...")
        user_id = existing["user_id"]
        # Limpiar datos antiguos
        await db.habits.delete_many({"user_id": user_id})
        await db.habit_logs.delete_many({"user_id": user_id})
        await db.emotional_logs.delete_many({"user_id": user_id})
        await db.purpose_goals.delete_many({"user_id": user_id})
        await db.weekly_checkins.delete_many({"user_id": user_id})
        await db.purpose_areas.delete_many({"user_id": user_id})
    else:
        # Hash de contraseña simple (en producción usar bcrypt)
        password_hash = hashlib.sha256(TEST_USER["password"].encode()).hexdigest()
        
        await db.users.insert_one({
            "user_id": user_id,
            "email": TEST_USER["email"],
            "password_hash": password_hash,
            "name": TEST_USER["name"],
            "picture": None,
            "created_at": three_months_ago
        })
        print(f"✅ Usuario creado: {TEST_USER['email']}")
    
    # 2. Crear perfil completo
    clean_since = (now - timedelta(days=95)).strftime("%Y-%m-%d")  # 95 días limpio
    
    await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "role": "patient",
            "country": "Chile",
            "addiction_type": "Alcohol",
            "secondary_addictions": ["Tabaco"],
            "years_using": 8,
            "clean_since": clean_since,
            "dual_diagnosis": True,
            "diagnoses": ["Ansiedad generalizada", "Depresión leve"],
            "triggers": TRIGGERS,
            "protective_factors": PROTECTIVE_FACTORS,
            "addictive_beliefs": ["Solo una no me hará daño", "Puedo controlarlo"],
            "permissive_beliefs": ["Me lo merezco después de tanto trabajo", "Todos lo hacen"],
            "life_story": "Comencé a beber en la universidad. Lo que empezó como algo social se convirtió en una necesidad. Después de perder mi trabajo y casi mi familia, decidí buscar ayuda. Llevo 3 meses en recuperación y cada día es una batalla, pero estoy comprometido con mi sobriedad.",
            "my_why": "Por mis hijos, por mi esposa, y por mí mismo. Quiero ser el padre que merecen y la persona que sé que puedo ser.",
            "emergency_contacts": [
                {"name": "María Mendoza", "phone": "+56912345678", "relationship": "Esposa"},
                {"name": "Jorge (Padrino)", "phone": "+56987654321", "relationship": "Padrino AA"}
            ],
            "profile_completed": True,
            "updated_at": now
        }},
        upsert=True
    )
    print("✅ Perfil de paciente creado")
    
    # 3. Crear hábitos
    habit_ids = []
    for habit in HABITS_DATA:
        habit_id = f"habit_{uuid.uuid4().hex[:12]}"
        habit_ids.append(habit_id)
        await db.habits.insert_one({
            "habit_id": habit_id,
            "user_id": user_id,
            "name": habit["name"],
            "frequency": "daily",
            "color": habit["color"],
            "icon": habit["icon"],
            "reminder_time": "08:00",
            "created_at": three_months_ago,
            "is_active": True
        })
    print(f"✅ {len(habit_ids)} hábitos creados")
    
    # 4. Generar logs de hábitos para 90 días
    habit_logs_count = 0
    for day_offset in range(90):
        log_date = (three_months_ago + timedelta(days=day_offset)).strftime("%Y-%m-%d")
        
        for i, habit_id in enumerate(habit_ids):
            # Probabilidad de completar aumenta con el tiempo (mejora gradual)
            base_completion_rate = 0.5 + (day_offset / 180)  # 50% -> 100% en 90 días
            # Algunos hábitos más difíciles
            if i >= 4:  # Reunión de grupo y dormir 8h más difíciles
                completion_rate = base_completion_rate * 0.7
            else:
                completion_rate = base_completion_rate
            
            completed = random.random() < min(completion_rate, 0.95)
            
            await db.habit_logs.insert_one({
                "log_id": f"log_{uuid.uuid4().hex[:12]}",
                "habit_id": habit_id,
                "user_id": user_id,
                "completed": completed,
                "note": random.choice([None, "Buen día", "Costó pero lo logré", "Excelente sesión"]) if completed else None,
                "date": log_date,
                "logged_at": datetime.fromisoformat(log_date + "T10:00:00+00:00")
            })
            habit_logs_count += 1
    
    print(f"✅ {habit_logs_count} registros de hábitos creados")
    
    # 5. Generar logs emocionales para 90 días
    emotional_logs_count = 0
    for day_offset in range(90):
        log_date = (three_months_ago + timedelta(days=day_offset)).strftime("%Y-%m-%d")
        
        # El mood mejora gradualmente con algunos altibajos
        base_mood = 4 + (day_offset / 30)  # Empieza en 4, termina en ~7
        daily_variation = random.uniform(-2, 2)
        mood = max(1, min(10, int(base_mood + daily_variation)))
        
        # Tags según el mood
        if mood >= 7:
            tags = random.sample(["tranquilidad", "gratitud", "esperanza", "motivación"], k=random.randint(1, 2))
        elif mood >= 5:
            tags = random.sample(["neutral", "reflexivo", "cansancio"], k=random.randint(1, 2))
        else:
            tags = random.sample(["ansiedad", "tristeza", "frustración", "craving"], k=random.randint(1, 2))
        
        notes = [
            "Día tranquilo, me siento en paz",
            "Tuve un momento difícil pero lo superé",
            "Hablé con mi padrino, me ayudó mucho",
            "Extraño mi vida anterior pero sé que no era vida",
            "Orgulloso de otro día limpio",
            "El craving fue fuerte hoy pero no cedí",
            "Buen día en familia",
            "Sesión productiva con mi terapeuta",
            "Me siento más fuerte cada día",
            None
        ]
        
        await db.emotional_logs.insert_one({
            "log_id": f"emo_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "mood_scale": mood,
            "note": random.choice(notes),
            "tags": tags,
            "date": log_date,
            "logged_at": datetime.fromisoformat(log_date + "T20:00:00+00:00")
        })
        emotional_logs_count += 1
    
    print(f"✅ {emotional_logs_count} registros emocionales creados")
    
    # 6. Crear áreas de propósito
    purpose_areas = [
        {"area": "health", "name": "Salud", "rating": 7, "notes": "Ejercicio regular, alimentación mejorada"},
        {"area": "relationships", "name": "Relaciones", "rating": 6, "notes": "Reconstruyendo confianza con familia"},
        {"area": "work", "name": "Trabajo", "rating": 5, "notes": "Buscando empleo estable"},
        {"area": "personal", "name": "Crecimiento Personal", "rating": 8, "notes": "Terapia y autoconocimiento"},
        {"area": "spiritual", "name": "Espiritual", "rating": 7, "notes": "Meditación diaria, programa de 12 pasos"},
        {"area": "finances", "name": "Finanzas", "rating": 4, "notes": "Pagando deudas, ahorrando poco a poco"},
    ]
    
    for area in purpose_areas:
        await db.purpose_areas.insert_one({
            "area_id": f"area_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "area": area["area"],
            "name": area["name"],
            "current_rating": area["rating"],
            "target_rating": min(10, area["rating"] + 2),
            "notes": area["notes"],
            "updated_at": now
        })
    print(f"✅ {len(purpose_areas)} áreas de propósito creadas")
    
    # 7. Crear metas de propósito
    goals = [
        {
            "area": "health",
            "title": "Correr 5K",
            "description": "Completar una carrera de 5 kilómetros",
            "progress": 60,
            "status": "active",
            "steps": [
                {"step": "Caminar 30 min diarios", "completed": True},
                {"step": "Trotar 2K sin parar", "completed": True},
                {"step": "Trotar 3K sin parar", "completed": True},
                {"step": "Correr 5K completos", "completed": False}
            ]
        },
        {
            "area": "relationships",
            "title": "Cena familiar semanal",
            "description": "Establecer tradición de cena en familia cada domingo",
            "progress": 80,
            "status": "active",
            "steps": [
                {"step": "Proponer idea a la familia", "completed": True},
                {"step": "Primera cena exitosa", "completed": True},
                {"step": "Mantener por 1 mes", "completed": True},
                {"step": "Mantener por 3 meses", "completed": False}
            ]
        },
        {
            "area": "work",
            "title": "Conseguir empleo estable",
            "description": "Encontrar trabajo que respete mi recuperación",
            "progress": 40,
            "status": "active",
            "steps": [
                {"step": "Actualizar CV", "completed": True},
                {"step": "Aplicar a 10 empleos", "completed": True},
                {"step": "Obtener entrevista", "completed": False},
                {"step": "Conseguir oferta", "completed": False}
            ]
        },
        {
            "area": "personal",
            "title": "Completar los 12 pasos",
            "description": "Trabajar el programa de 12 pasos con mi padrino",
            "progress": 50,
            "status": "active",
            "steps": [
                {"step": "Pasos 1-3: Admitir, creer, decidir", "completed": True},
                {"step": "Pasos 4-6: Inventario moral", "completed": True},
                {"step": "Pasos 7-9: Enmiendas", "completed": False},
                {"step": "Pasos 10-12: Mantenimiento", "completed": False}
            ]
        }
    ]
    
    for goal in goals:
        await db.purpose_goals.insert_one({
            "goal_id": f"goal_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "area": goal["area"],
            "title": goal["title"],
            "description": goal["description"],
            "target_date": (now + timedelta(days=90)).strftime("%Y-%m-%d"),
            "status": goal["status"],
            "progress": goal["progress"],
            "steps": goal["steps"],
            "created_at": three_months_ago + timedelta(days=7),
            "updated_at": now
        })
    print(f"✅ {len(goals)} metas de propósito creadas")
    
    # 8. Crear sesión activa para el usuario
    session_token = f"demo_session_{uuid.uuid4().hex}"
    await db.user_sessions.delete_many({"user_id": user_id})  # Limpiar sesiones anteriores
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": now + timedelta(days=30),
        "created_at": now
    })
    print(f"✅ Sesión creada")
    
    print("\n" + "="*50)
    print("🎉 USUARIO DE DEMOSTRACIÓN CREADO EXITOSAMENTE")
    print("="*50)
    print(f"\n📧 Email: {TEST_USER['email']}")
    print(f"🔑 Contraseña: {TEST_USER['password']}")
    print(f"👤 Nombre: {TEST_USER['name']}")
    print(f"🆔 User ID: {user_id}")
    print(f"📅 Días limpio: 95")
    print(f"📊 Datos generados: 90 días de historial")
    print(f"\n🔗 Token de sesión: {session_token[:20]}...")
    print("="*50)
    
    return {
        "user_id": user_id,
        "email": TEST_USER["email"],
        "password": TEST_USER["password"],
        "session_token": session_token
    }

if __name__ == "__main__":
    asyncio.run(create_demo_user())
