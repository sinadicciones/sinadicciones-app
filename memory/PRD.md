# SinAdicciones App - Product Requirements Document

## Overview
SinAdicciones es una aplicación móvil de apoyo a personas en recuperación de adicciones. Proporciona seguimiento de hábitos, registro emocional, análisis con IA, y herramientas para profesionales y familiares.

## Tech Stack
- **Frontend**: React Native + Expo (Expo Router)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Deployment**: Railway (producción), Expo EAS (builds móviles)
- **AI**: OpenAI GPT-4o para análisis

## Core Features

### Para Pacientes
- Dashboard personalizado con días limpios y estadísticas
- Registro y seguimiento de hábitos diarios
- Registro de estado emocional con escala 1-10 y etiquetas
- Análisis de IA para hábitos y emociones
- Perfil completo con secciones expandibles:
  - Información Personal
  - Mi "Para Qué"
  - Gatillos y Protectores
  - Contactos de Emergencia
  - Mi Historia
- Reportar recaídas

### Para Profesionales
- Panel de gestión de pacientes
- Sistema de alertas inteligentes
- Vinculación con pacientes

### Para Familiares
- Contenido educativo
- Seguimiento de familiar (con permiso)

## Implemented Features (Feb 2026)

### UI/UX
- [x] Tema oscuro global implementado
- [x] Menú inferior negro con acento amarillo
- [x] Headers con gradientes por sección
- [x] Secciones expandibles en perfil
- [x] KeyboardAvoidingView en modales
- [x] Placeholders visibles en inputs
- [x] Contrastes de color corregidos en toda la app
- [x] Widget "Tu Bienestar" con gráfico circular
- [x] Tarjetas de resumen (Hábitos hoy, Último ánimo, Metas)
- [x] Componente CalendarView con vista Semana/Mes
- [x] Integración de calendario en HabitsInsights y EmotionalInsights

### Backend
- [x] Endpoints de autenticación (email/password, Google OAuth)
- [x] CRUD de hábitos con historial
- [x] CRUD de registros emocionales
- [x] Estadísticas y análisis con IA
- [x] Sistema de roles (patient, professional, family, active_user)
- [x] Vinculación paciente-profesional

### Configuración
- [x] app.config.js para gestión de variables de entorno
- [x] OPENAI_API_KEY configurada en Railway
- [x] Usuario demo con 3 meses de datos

## Test Credentials
- Email: demo@sinadicciones.org
- Password: demopassword

## Known Issues Fixed (Session Feb 28, 2026)
- [x] Campo `mood` vs `mood_scale` inconsistencia - Soporta ambos
- [x] Campo `tags` vs `emotions` inconsistencia - Soporta ambos
- [x] Emojis no mostrándose en historial emocional
- [x] Error 500 en endpoint /api/emotional-logs/stats
- [x] placeholderTextColor duplicado en profile.tsx
- [x] Contraste de colores en tarjetas de alertas (AlertCard)
- [x] Texto del gráfico de bienestar no visible
- [x] Tarjetas de estadísticas con colores invertidos

## New Components Added (Feb 28, 2026)
- [x] CalendarView.tsx - Componente de calendario reutilizable con vista semana/mes
- [x] ProgressRing mejorado con SVG en HabitsInsights
- [x] Mood stats ring en EmotionalInsights

## Upcoming Tasks (P1)
- [ ] Notificaciones push en frontend
- [ ] Refinar visualización del calendario con datos reales del backend

## Future Tasks (P2-P3)
- [ ] Usuarios de prueba permanentes en producción (Railway)
- [ ] Dominio personalizado
- [ ] Más contenido educativo

## Architecture Notes

### File Structure
```
/app
├── backend/
│   ├── server.py          # Main FastAPI server
│   └── scripts/
│       └── populate_demo_data.py
├── frontend/
│   ├── app.config.js      # Expo config (reemplaza app.json)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx    # Tab bar config
│   │   │   ├── home.tsx       # Dashboard con widgets
│   │   │   ├── profile.tsx    # Perfil con secciones
│   │   │   ├── habits.tsx     # Tracking de hábitos
│   │   │   └── emotional.tsx  # Tracking emocional
│   │   └── index.tsx          # Landing/Login
│   ├── components/
│   │   ├── CalendarView.tsx   # NUEVO: Calendario semana/mes
│   │   ├── HabitsInsights.tsx # Con calendario y ring
│   │   └── EmotionalInsights.tsx # Con calendario y stats
│   └── utils/
│       └── api.ts             # authenticatedFetch
└── memory/
    └── PRD.md
```

### Environment Variables
- Frontend: `EXPO_PUBLIC_BACKEND_URL`
- Backend: `MONGO_URL`, `DB_NAME`, `OPENAI_API_KEY`

## Build & Deploy Notes
Para el usuario (flujo de trabajo):
1. "Save to GitHub" en Emergent
2. `git pull origin main` en local
3. `eas build --platform android`
4. Subir AAB a Google Play Console
