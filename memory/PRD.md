# SinAdicciones App - PRD

## Overview
Aplicación de apoyo para personas en recuperación de adicciones.

## Tech Stack
- Frontend: React Native + Expo Router
- Backend: FastAPI + MongoDB
- AI: OpenAI GPT-4o via emergentintegrations

## Test Credentials
- Paciente: paciente@sinadicciones.org / demo123
- Profesional: profesional@sinadicciones.org / demopassword
- Familiar: familiar@sinadicciones.org / demo123

## Completed Features (Mar 2026)

### Backend (100% Tested)
- ✅ Autenticación (login/registro)
- ✅ Registros emocionales (CRUD + estadísticas)
- ✅ Nelson IA (chat + detección de crisis)
- ✅ Panel de Profesional (pacientes + alertas)
- ✅ Hábitos (CRUD)
- ✅ Metas SMART semanales
- ✅ Vinculación Paciente-Profesional

### Frontend
- ✅ Pantalla de inicio con modo oscuro
- ✅ Metas SMART con seguimiento diario (useFocusEffect para refresh)
- ✅ Hábitos recomendados inteligentes (filtro de existentes)
- ✅ Plan de Recuperación unificado
- ✅ CSS global inyectado para TextInput

## Fixed Issues (This Session)
1. **Caché de Metro** - Limpiado para corregir URL incorrecto de backend
2. **useFocusEffect** - Añadido a goals.tsx y [area].tsx para refresh automático
3. **CSS global** - Inyectado en _layout.tsx para normalizar inputs

## Known Limitations
- TextInput en React Native Web mantiene estilos del browser (inputs blancos)
- En la app móvil compilada, los inputs se verán correctamente

## API Endpoints Clave
```
POST /api/auth/login
GET /api/profile
GET /api/habits
POST /api/habits
GET /api/emotional-logs
POST /api/emotional-logs
POST /api/nelson/chat
GET /api/professional/patients
GET /api/professional/alerts
GET /api/therapists/search-patient?email=
POST /api/professional/link-patient
GET /api/purpose/goals
POST /api/purpose/goals
PUT /api/goals/{id}/progress
```

## Pending Tasks
- [ ] Verificar notificaciones push (v22) en dispositivo físico
- [ ] Refactorización de server.py (6900+ líneas)
- [ ] Refactorización de profile.tsx (2500+ líneas)

## Build Notes
- versionCode actual: 22
- El usuario debe compilar con `eas build --platform android` para probar cambios en móvil
