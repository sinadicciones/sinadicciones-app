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
- **NUEVO: Nelson - Terapeuta IA 24/7**
- Perfil completo con secciones expandibles
- Reportar recaídas

### Nelson - Terapeuta IA (NUEVO)
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

## Implemented Features (Mar 2026)

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

### Configuración
- [x] app.config.js para gestión de variables de entorno
- [x] OPENAI_API_KEY en Railway

## Test Credentials
- Email: demo@sinadicciones.org
- Password: demopassword

## API Endpoints - Nelson
- POST /api/nelson/chat - Enviar mensaje
- GET /api/nelson/conversation - Obtener historial
- DELETE /api/nelson/conversation - Limpiar historial
- GET /api/nelson/summary - Resumen IA de conversaciones
- GET /api/ai/status - Verificar configuración de IA

## versionCode History
- v17: Corrección de bugs: KeyboardAvoidingView en Nelson, traducciones en perfil, protección contra crash en craving
- v16: (pendiente de build)
- v14: Agregado Nelson (terapeuta IA)
- v13: Correcciones de UI y IA
- v12: Corrección de URL de fallback

## Bugs Corregidos (Mar 2026)
- [x] Teclado oculta input en Nelson - KeyboardAvoidingView implementado
- [x] Textos en inglés en Perfil - Diccionario de traducciones ampliado
- [x] Crash en "Manejo de craving" - Protección contra undefined
- [x] Menú inconsistente en Propósito - Estilo unificado
- [x] Texto ilegible en Test de propósito - Contraste mejorado

## Architecture

### File Structure
```
/app
├── backend/
│   ├── server.py          # Main FastAPI + Nelson endpoints
│   └── scripts/
├── frontend/
│   ├── app.config.js
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx    # Tab bar + Nelson
│   │   │   ├── nelson.tsx     # NUEVO: Chat con Nelson
│   │   │   ├── home.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── habits.tsx
│   │   │   └── emotional.tsx
│   │   └── purpose/
│   ├── components/
│   │   ├── CalendarView.tsx
│   │   ├── HabitsInsights.tsx
│   │   └── EmotionalInsights.tsx
│   └── utils/
│       └── api.ts
└── memory/
    └── PRD.md
```

## Build & Deploy Notes
1. "Save to GitHub" en Emergent
2. `git pull origin main`
3. `eas build --platform android`
4. Subir AAB a Google Play Console
