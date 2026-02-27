"""
Script para crear un usuario profesional de demostración vinculado al paciente demo
"""
import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import bcrypt
import uuid

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

async def create_professional_demo():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.test_database
    
    # IDs
    professional_id = "user_pro_demo_" + uuid.uuid4().hex[:8]
    demo_patient_id = "user_demo_bf398325"  # El ID del usuario demo Carlos
    
    print("🚀 Creando usuario profesional de demostración...")
    
    # 1. Verificar que el paciente demo existe
    demo_patient = await db.users.find_one({"user_id": demo_patient_id})
    if not demo_patient:
        print("❌ Error: El usuario demo no existe. Ejecuta primero create_demo_user.py")
        return
    
    demo_profile = await db.user_profiles.find_one({"user_id": demo_patient_id})
    print(f"✅ Paciente demo encontrado: {demo_patient.get('name')}")
    
    # 2. Crear el usuario profesional
    password_hash = bcrypt.hashpw("Terapeuta123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    professional_user = {
        "user_id": professional_id,
        "email": "terapeuta@sinadicciones.org",
        "password_hash": password_hash,
        "name": "Dra. María González",
        "created_at": datetime.utcnow().isoformat(),
        "last_login": datetime.utcnow().isoformat(),
        "provider": "email"
    }
    
    # Eliminar si existe
    await db.users.delete_many({"email": "terapeuta@sinadicciones.org"})
    await db.users.insert_one(professional_user)
    print(f"✅ Usuario profesional creado: {professional_user['email']}")
    
    # 3. Crear perfil profesional completo
    professional_profile = {
        "user_id": professional_id,
        "role": "professional",
        "profile_completed": True,
        "name": "Dra. María González",
        "specialization": "Adicciones y Salud Mental",
        "institution": "Centro de Rehabilitación Esperanza",
        "years_experience": 12,
        "license_number": "PSI-2013-45678",
        "bio": "Psicóloga clínica especializada en adicciones con más de 12 años de experiencia. Trabajo con enfoque cognitivo-conductual y entrevista motivacional. Mi objetivo es acompañar a cada paciente en su camino hacia la recuperación.",
        "accepts_patients": True,
        "consultation_fee": "Desde $40.000 CLP",
        "linked_patients": [demo_patient_id],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    await db.user_profiles.delete_many({"user_id": professional_id})
    await db.user_profiles.insert_one(professional_profile)
    print("✅ Perfil profesional creado")
    
    # 4. Vincular el paciente demo al profesional
    await db.user_profiles.update_one(
        {"user_id": demo_patient_id},
        {"$set": {
            "linked_therapist_id": professional_id,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    print(f"✅ Paciente {demo_patient.get('name')} vinculado a la Dra. María González")
    
    # 5. Crear tareas del terapeuta para el paciente
    tasks = [
        {
            "task_id": "task_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "therapist_name": "Dra. María González",
            "patient_id": demo_patient_id,
            "title": "Escribir carta a tu yo del futuro",
            "description": "Escribe una carta a tu yo de dentro de 1 año, describiendo cómo te imaginas tu vida en sobriedad. Incluye tus metas, sueños y cómo te sentirás.",
            "category": "reflexion",
            "priority": "high",
            "status": "pending",
            "due_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "patient_notes": None
        },
        {
            "task_id": "task_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "therapist_name": "Dra. María González",
            "patient_id": demo_patient_id,
            "title": "Practicar técnica de respiración 4-7-8",
            "description": "Practica la técnica de respiración 4-7-8 al menos 3 veces al día: inhala 4 segundos, retén 7 segundos, exhala 8 segundos. Registra cómo te sientes después.",
            "category": "mindfulness",
            "priority": "medium",
            "status": "in_progress",
            "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
            "patient_notes": "He practicado 2 veces ayer, me ayudó a calmar la ansiedad"
        },
        {
            "task_id": "task_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "therapist_name": "Dra. María González",
            "patient_id": demo_patient_id,
            "title": "Identificar 3 gatillos esta semana",
            "description": "Durante esta semana, identifica al menos 3 situaciones que te generaron deseo de consumir. Anota: la situación, qué sentiste, qué pensaste, y qué hiciste para manejarlo.",
            "category": "autoconocimiento",
            "priority": "high",
            "status": "completed",
            "due_date": (datetime.utcnow() - timedelta(days=2)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "completed_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
            "patient_notes": "Identifiqué: 1) Discusión con mi pareja, 2) Reunión social con amigos que consumen, 3) Estrés laboral el viernes"
        },
        {
            "task_id": "task_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "therapist_name": "Dra. María González",
            "patient_id": demo_patient_id,
            "title": "Asistir a reunión de AA/NA",
            "description": "Asiste a al menos una reunión de Alcohólicos Anónimos o Narcóticos Anónimos esta semana. Puedes buscar grupos en la app o en aa.org",
            "category": "apoyo_social",
            "priority": "medium",
            "status": "completed",
            "due_date": (datetime.utcnow() - timedelta(days=5)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(days=12)).isoformat(),
            "completed_at": (datetime.utcnow() - timedelta(days=6)).isoformat(),
            "patient_notes": "Fui a la reunión del martes. Me sentí acogido, conocí a Juan que tiene 2 años limpio"
        },
        {
            "task_id": "task_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "therapist_name": "Dra. María González",
            "patient_id": demo_patient_id,
            "title": "Llamar a tu contacto de emergencia",
            "description": "Practica llamar a tu contacto de emergencia (tu padrino o familiar de confianza) sin estar en crisis. Esto fortalece la red de apoyo.",
            "category": "apoyo_social",
            "priority": "low",
            "status": "pending",
            "due_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "patient_notes": None
        }
    ]
    
    await db.therapist_tasks.delete_many({"patient_id": demo_patient_id})
    await db.therapist_tasks.insert_many(tasks)
    print(f"✅ {len(tasks)} tareas creadas para el paciente")
    
    # 6. Crear notas clínicas del terapeuta sobre el paciente
    clinical_notes = [
        {
            "note_id": "note_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "patient_id": demo_patient_id,
            "type": "session",
            "title": "Sesión inicial - Evaluación",
            "content": """
            **Motivo de consulta:** Paciente de 35 años, busca apoyo para mantener sobriedad de alcohol. Lleva 95 días limpio.
            
            **Historia:** Consumo problemático desde los 22 años. Múltiples intentos de dejarlo. Esta vez motivado por su familia.
            
            **Fortalezas identificadas:**
            - Alta motivación
            - Apoyo familiar sólido
            - Ya tiene experiencia en AA
            
            **Plan de tratamiento:**
            1. Sesiones semanales de terapia individual
            2. Identificación de gatillos
            3. Desarrollo de estrategias de afrontamiento
            4. Fortalecer red de apoyo
            """,
            "mood_assessment": 7,
            "risk_level": "low",
            "created_at": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "is_private": True
        },
        {
            "note_id": "note_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "patient_id": demo_patient_id,
            "type": "session",
            "title": "Sesión 4 - Trabajo con gatillos",
            "content": """
            **Resumen:** Paciente reporta semana difícil. Tuvo evento social donde había alcohol.
            
            **Logros:**
            - No consumió a pesar de la presión social
            - Usó técnica de salida temprana
            - Llamó a su padrino después del evento
            
            **Trabajo realizado:**
            - Revisamos la situación con técnica ABC
            - Identificamos pensamientos automáticos
            - Practicamos reestructuración cognitiva
            
            **Próxima sesión:**
            - Revisar tarea de carta al yo futuro
            - Continuar con prevención de recaídas
            """,
            "mood_assessment": 6,
            "risk_level": "medium",
            "created_at": (datetime.utcnow() - timedelta(days=14)).isoformat(),
            "is_private": True
        },
        {
            "note_id": "note_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "patient_id": demo_patient_id,
            "type": "progress",
            "title": "Nota de progreso mensual",
            "content": """
            **Evaluación del mes:**
            
            Carlos ha mostrado un progreso significativo este mes. Ha mantenido su sobriedad a pesar de enfrentar situaciones de alto riesgo.
            
            **Indicadores positivos:**
            - Cumplimiento de hábitos: 85%
            - Asistencia a sesiones: 100%
            - Uso consistente de la app
            - Mejora en regulación emocional
            
            **Áreas de trabajo:**
            - Manejo del estrés laboral
            - Comunicación con la pareja
            
            **Recomendación:** Continuar con plan actual. Considerar reducir frecuencia de sesiones a quincenal en próximo mes si mantiene progreso.
            """,
            "mood_assessment": 8,
            "risk_level": "low",
            "created_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
            "is_private": True
        }
    ]
    
    await db.clinical_notes.delete_many({"patient_id": demo_patient_id})
    await db.clinical_notes.insert_many(clinical_notes)
    print(f"✅ {len(clinical_notes)} notas clínicas creadas")
    
    # 7. Crear alertas del sistema para el profesional
    alerts = [
        {
            "alert_id": "alert_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "patient_id": demo_patient_id,
            "patient_name": "Carlos Mendoza",
            "type": "mood_drop",
            "severity": "warning",
            "title": "Bajada de ánimo detectada",
            "message": "Carlos registró ánimo 4/10 ayer, comparado con promedio de 7/10 la semana anterior",
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
            "read": False,
            "action_taken": None
        },
        {
            "alert_id": "alert_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "patient_id": demo_patient_id,
            "patient_name": "Carlos Mendoza",
            "type": "task_completed",
            "severity": "info",
            "title": "Tarea completada",
            "message": "Carlos completó la tarea 'Identificar 3 gatillos esta semana'",
            "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
            "read": True,
            "action_taken": "reviewed"
        },
        {
            "alert_id": "alert_" + uuid.uuid4().hex[:8],
            "therapist_id": professional_id,
            "patient_id": demo_patient_id,
            "patient_name": "Carlos Mendoza",
            "type": "milestone",
            "severity": "positive",
            "title": "¡Hito alcanzado!",
            "message": "Carlos alcanzó 90 días de sobriedad",
            "created_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
            "read": True,
            "action_taken": "sent_congratulations"
        }
    ]
    
    await db.therapist_alerts.delete_many({"patient_id": demo_patient_id})
    await db.therapist_alerts.insert_many(alerts)
    print(f"✅ {len(alerts)} alertas creadas para el profesional")
    
    # 8. Crear mensajes entre terapeuta y paciente
    messages = [
        {
            "message_id": "msg_" + uuid.uuid4().hex[:8],
            "from_user_id": professional_id,
            "to_user_id": demo_patient_id,
            "from_name": "Dra. María González",
            "to_name": "Carlos Mendoza",
            "content": "Hola Carlos, ¿cómo te has sentido esta semana? Vi que tu ánimo bajó un poco. Recuerda que estoy aquí si necesitas hablar.",
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
            "read": True
        },
        {
            "message_id": "msg_" + uuid.uuid4().hex[:8],
            "from_user_id": demo_patient_id,
            "to_user_id": professional_id,
            "from_name": "Carlos Mendoza",
            "to_name": "Dra. María González",
            "content": "Hola Dra. María. Sí, tuve unos días difíciles por estrés en el trabajo. Pero usé las técnicas de respiración y me ayudaron. Gracias por preguntar.",
            "created_at": (datetime.utcnow() - timedelta(days=2, hours=5)).isoformat(),
            "read": True
        },
        {
            "message_id": "msg_" + uuid.uuid4().hex[:8],
            "from_user_id": professional_id,
            "to_user_id": demo_patient_id,
            "from_name": "Dra. María González",
            "to_name": "Carlos Mendoza",
            "content": "Me alegra que hayas usado las herramientas. Eso demuestra tu compromiso. Nos vemos en la sesión del jueves. ¡Sigue así! 💪",
            "created_at": (datetime.utcnow() - timedelta(days=1, hours=20)).isoformat(),
            "read": True
        },
        {
            "message_id": "msg_" + uuid.uuid4().hex[:8],
            "from_user_id": professional_id,
            "to_user_id": demo_patient_id,
            "from_name": "Dra. María González",
            "to_name": "Carlos Mendoza",
            "content": "¡Felicidades por tus 90 días de sobriedad, Carlos! Es un logro enorme. Estoy muy orgullosa de tu progreso. 🎉",
            "created_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
            "read": True
        }
    ]
    
    await db.messages.delete_many({
        "$or": [
            {"from_user_id": professional_id},
            {"to_user_id": professional_id}
        ]
    })
    await db.messages.insert_many(messages)
    print(f"✅ {len(messages)} mensajes de interacción creados")
    
    # 9. Crear sesión para el profesional
    session = {
        "session_token": "sess_pro_demo_" + uuid.uuid4().hex[:16],
        "user_id": professional_id,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }
    await db.sessions.delete_many({"user_id": professional_id})
    await db.sessions.insert_one(session)
    print("✅ Sesión profesional creada")
    
    # Resumen final
    print("\n" + "="*60)
    print("🎉 PROFESIONAL DE DEMOSTRACIÓN CREADO EXITOSAMENTE")
    print("="*60)
    print(f"\n📧 Email: terapeuta@sinadicciones.org")
    print(f"🔑 Contraseña: Terapeuta123!")
    print(f"👩‍⚕️ Nombre: Dra. María González")
    print(f"🆔 User ID: {professional_id}")
    print(f"🏥 Institución: Centro de Rehabilitación Esperanza")
    print(f"\n📋 Paciente vinculado: Carlos Mendoza (demo@sinadicciones.org)")
    print(f"\n📊 Datos de interacción creados:")
    print(f"   - {len(tasks)} tareas asignadas al paciente")
    print(f"   - {len(clinical_notes)} notas clínicas")
    print(f"   - {len(alerts)} alertas del sistema")
    print(f"   - {len(messages)} mensajes de comunicación")
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_professional_demo())
