# SinAdicciones App - Product Requirements Document

## Overview
SinAdicciones es una aplicación móvil de apoyo a personas en recuperación de adicciones. Proporciona seguimiento de hábitos, registro emocional, análisis con IA, y herramientas para profesionales y familiares.

## Tech Stack
- **Frontend**: React Native + Expo (Expo Router)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Deployment**: Railway (producción), Expo EAS (builds móviles)
- **AI**: OpenAI GPT-4o para análisis y Nelson (terapeuta IA)

## Core Features

### Para Pacientes
- Dashboard personalizado con días limpios y estadísticas
- Registro y seguimiento de hábitos diarios
- Registro de estado emocional con escala 1-10 y etiquetas
- Análisis de IA para hábitos y emociones
- **Nelson - Terapeuta IA 24/7**
- Perfil completo con secciones expandibles
- Reportar recaídas
- **NUEVO: Metas SMART Semanales con análisis mensual**

### Nelson - Terapeuta IA
- Chat conversacional 24/7
- Personalizado con datos del usuario (hábitos, emociones, perfil)
- Modos: Normal, Crisis, Ansiedad, Craving, Tristeza
- Herramientas de crisis:
  - Respiración 4-7-8
  - Técnica Grounding 5-4-3-2-1
  - Timer de espera (10 min)
  - Contactos de emergencia
- Detección automática de palabras de crisis
- Notifica al terapeuta vinculado en caso de crisis
- Disclaimer permanente de apoyo complementario

### Para Profesionales
- Panel de gestión de pacientes
- Sistema de alertas inteligentes
- Vinculación con pacientes
- Alertas de crisis de Nelson

### Para Familiares
- Contenido educativo
- Seguimiento de familiar (con permiso)

## Test Credentials
- **Paciente Demo**: paciente@sinadicciones.org / demo123
- **Profesional Demo**: profesional@sinadicciones.org / demopassword
- **Admin**: contacto@sinadicciones.cl / Jodo1000

## Implemented Features (Mar 2026)

### Metas SMART Semanales (NUEVO - Mar 2026)
- [x] Creación de metas con `target_days` (días objetivo por semana)
- [x] Seguimiento diario con círculos L-M-X-J-V-S-D
- [x] Toggle de días completados/no completados
- [x] Progreso calculado automáticamente
- [x] Historial semanal (`week_history`)
- [x] Reset automático de semana
- [x] **Análisis mensual** con estadísticas de rendimiento
- [x] Niveles de rendimiento (excelente, bueno, regular, necesita_atención)

### UI/UX
- [x] Tema oscuro global
- [x] Menú inferior negro con acento amarillo
- [x] Headers con gradientes por sección
- [x] Secciones expandibles en perfil
- [x] KeyboardAvoidingView en modales
- [x] Contrastes de color corregidos
- [x] Nelson chat con herramientas de crisis

### Backend
- [x] Endpoints de autenticación
- [x] CRUD de hábitos con historial
- [x] CRUD de registros emocionales
- [x] Estadísticas y análisis con IA
- [x] Sistema de roles
- [x] Vinculación paciente-profesional
- [x] Nelson API con contexto de usuario
- [x] Detección de crisis y notificaciones
- [x] Endpoint /api/ai/status para verificar configuración

## API Endpoints - Metas SMART (NUEVO)
- GET /api/purpose/goals - Listar metas del usuario
- POST /api/purpose/goals - Crear nueva meta con target_days
- POST /api/purpose/goals/{goal_id}/toggle-day - Marcar/desmarcar día
- GET /api/purpose/goals/monthly-analysis - Análisis mensual de progreso
- GET /api/purpose/goals/suggested - Metas sugeridas según perfil
- PUT /api/purpose/goals/{goal_id} - Actualizar meta
- DELETE /api/purpose/goals/{goal_id} - Eliminar meta

## API Endpoints - Nelson
- POST /api/nelson/chat - Enviar mensaje
- GET /api/nelson/conversation - Obtener historial
- DELETE /api/nelson/conversation - Limpiar historial
- GET /api/nelson/summary - Resumen IA de conversaciones
- GET /api/ai/status - Verificar configuración de IA

## API Endpoints - Propósito con IA
- GET /api/purpose/ai-analysis - Genera análisis de IA del propósito
- GET /api/purpose/ai-analysis/cached - Obtiene análisis cacheado

## API Endpoints - Notificaciones
- GET /api/notifications/settings - Configuración de notificaciones
- PUT /api/notifications/settings - Actualizar configuración
- GET /api/notifications/today - Mensaje motivacional y estado del día
- POST /api/notifications/test - Enviar notificación de prueba (requiere auth)
- POST /api/notifications/send-reminders?hour=9 - Enviar recordatorios programados (para cron)
- POST /api/professional/notify-patient - Profesional envía alerta a paciente

## versionCode History
- v22: Plugin expo-notifications añadido, fix análisis IA, sistema Metas SMART semanales
- v19: Fix bugs educación (crash "Entender adicción", "Manejo craving" sin contenido)
- v18: Límites de tema para Nelson + Dashboard de Propósito con análisis de IA
- v17: Corrección de bugs: KeyboardAvoidingView en Nelson, traducciones en perfil
- v14: Agregado Nelson (terapeuta IA)

## Architecture

### File Structure
```
/app
├── backend/
│   ├── server.py          # Main FastAPI (6900+ líneas - necesita refactorización)
│   └── tests/
│       └── test_smart_goals.py
├── frontend/
│   ├── app.config.js      # versionCode = 22
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── nelson.tsx
│   │   │   ├── home.tsx
│   │   │   ├── profile.tsx (2500+ líneas - necesita refactorización)
│   │   │   ├── habits.tsx
│   │   │   └── emotional.tsx
│   │   └── purpose/
│   │       └── goals.tsx   # Metas SMART semanales + análisis mensual
│   ├── components/
│   │   ├── CalendarView.tsx
│   │   ├── BottomNavigation.tsx
│   │   ├── HabitsInsights.tsx
│   │   └── EmotionalInsights.tsx
│   └── utils/
│       └── api.ts
└── memory/
    └── PRD.md
```

## DB Schema - Goals (NUEVO)
```javascript
{
  goal_id: "goal_xxx",
  user_id: "user_xxx",
  area: "health|relationships|work|personal|spiritual|finances",
  title: "string",
  description: "string",
  status: "active|completed|deleted",
  progress: 0-100,
  frequency: "weekly",
  target_days: 1-7,  // días objetivo por semana
  current_week: "YYYY-MM-DD",
  weekly_progress: {
    mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false
  },
  week_history: [
    { week_start: "YYYY-MM-DD", completed_days: 5, target_days: 5, achieved: true }
  ],
  created_at: datetime,
  updated_at: datetime
}
```

## Pending Tasks

### P1 - Verificación Usuario
- [ ] Notificaciones Push - Usuario debe compilar v22 y probar en dispositivo físico
- [ ] Verificar fix del análisis de IA en producción (Railway)

### P2 - Refactorización
- [ ] Dividir server.py en FastAPI Routers (6900+ líneas)
- [ ] Descomponer profile.tsx en componentes (2500+ líneas)

### P3 - Futuro
- [ ] Diario de voz para Nelson
- [ ] Unificar Hábitos y Metas
- [ ] Compartir resúmenes de IA con el terapeuta

## Build & Deploy Notes
1. "Save to GitHub" en Emergent
2. `git pull origin main`
3. `eas build --platform android`
4. Subir AAB a Google Play Console
