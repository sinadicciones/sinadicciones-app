# SinAdicciones App - Product Requirements Document

## Overview
SinAdicciones es una aplicación móvil de apoyo a personas en recuperación de adicciones. Proporciona seguimiento de hábitos, registro emocional, análisis con IA, y herramientas para profesionales y familiares.

## Tech Stack
- **Frontend**: React Native + Expo (Expo Router)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Deployment**: Railway (producción), Expo EAS (builds móviles)
- **AI**: OpenAI GPT-4o via emergentintegrations para Nelson (terapeuta IA)

## Core Features

### Para Pacientes
- Dashboard personalizado con días limpios y estadísticas
- Registro y seguimiento de hábitos diarios
- Registro de estado emocional con escala 1-10 y etiquetas
- Análisis de IA para hábitos y emociones
- **Nelson - Terapeuta IA 24/7**
- Perfil completo con secciones expandibles
- Reportar recaídas
- **Metas SMART Semanales con análisis mensual**

### Nelson - Terapeuta IA
- Chat conversacional 24/7
- Personalizado con datos del usuario (hábitos, emociones, perfil)
- Modos: Normal, Crisis, Ansiedad, Craving, Tristeza
- Prompts personalizados por rol (paciente, reto, profesional, familiar)
- Herramientas de crisis (respiración, grounding, timer, contactos)
- Detección automática de palabras de crisis
- Notifica al terapeuta vinculado en caso de crisis

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
- **Familiar Demo**: familiar@sinadicciones.org / demo123
- **Admin**: contacto@sinadicciones.cl / Jodo1000

## Implemented Features (Mar 2026)

### Metas SMART Semanales
- [x] Creación de metas con `target_days` (días objetivo por semana)
- [x] Seguimiento diario con círculos L-M-X-J-V-S-D
- [x] Toggle de días completados/no completados
- [x] Progreso calculado automáticamente
- [x] Historial semanal (`week_history`)
- [x] Reset automático de semana
- [x] Análisis mensual con estadísticas de rendimiento
- [x] **FIX: useFocusEffect para recargar datos al volver a la pantalla**

### UI/UX
- [x] Tema oscuro global
- [x] Menú inferior negro con acento amarillo
- [x] Headers con gradientes por sección
- [x] Secciones expandibles en perfil
- [x] KeyboardAvoidingView en modales
- [x] **CSS global inyectado en _layout.tsx para TextInput en web**
- [x] **Estilos de inputs en index.tsx actualizados para modo oscuro**
- [x] Nelson chat con herramientas de crisis

### Backend
- [x] Endpoints de autenticación (100% funcionando)
- [x] CRUD de hábitos con historial
- [x] CRUD de registros emocionales
- [x] Estadísticas y análisis con IA
- [x] Sistema de roles
- [x] Vinculación paciente-profesional
- [x] Nelson API con contexto de usuario usando emergentintegrations
- [x] Detección de crisis y notificaciones
- [x] Endpoint /api/ai/status para verificar configuración

## API Endpoints Testing (Mar 2026)
Backend testing completado: **100% (24/24 tests pasaron)**

### Endpoints Verificados
- POST /api/auth/login ✓
- GET /api/emotional-logs ✓
- POST /api/emotional-logs ✓
- POST /api/nelson/chat ✓
- GET /api/professional/patients ✓
- GET /api/professional/alerts ✓
- GET /api/habits ✓
- GET /api/profile ✓
- GET /api/purpose/goals ✓

## versionCode History
- v22: Plugin expo-notifications añadido, fix análisis IA, sistema Metas SMART semanales
- v19: Fix bugs educación
- v18: Límites de tema para Nelson + Dashboard de Propósito
- v17: Corrección de bugs
- v14: Agregado Nelson (terapeuta IA)

## Architecture

### File Structure
```
/app
├── backend/
│   ├── server.py          # Main FastAPI (6900+ líneas)
│   └── tests/
│       └── test_main_endpoints.py
├── frontend/
│   ├── app.config.js      # versionCode = 22
│   ├── app/
│   │   ├── _layout.tsx    # CSS global para modo oscuro
│   │   ├── (tabs)/
│   │   ├── index.tsx      # Pantalla login con inputs oscuros
│   │   └── purpose/
│   │       ├── goals.tsx  # Metas SMART con useFocusEffect
│   │       └── [area].tsx # Área específica con useFocusEffect
│   ├── components/
│   └── utils/
└── memory/
    └── PRD.md
```

## Pending Tasks

### P0 - Crítico
- [ ] Verificar UI modo oscuro en pantallas internas (home, habits, emotions, profile)
- [ ] Verificar notificaciones push en dispositivo físico (v22)

### P1 - Alta prioridad  
- [ ] Implementar lógica de hábitos recomendados inteligentes (no repetir existentes)
- [ ] Verificar flujo completo de vinculación Paciente-Profesional

### P2 - Refactorización
- [ ] Dividir server.py en FastAPI Routers (6900+ líneas)
- [ ] Descomponer profile.tsx en componentes (2500+ líneas)

### P3 - Futuro
- [ ] Diario de voz para Nelson
- [ ] Unificar Hábitos y Metas
- [ ] Compartir resúmenes de IA con el terapeuta

## Known Issues
- TextInput en React Native Web puede tener comportamiento inconsistente con estilos
- El CSS global inyectado ayuda pero no resuelve completamente el problema en todos los navegadores

## Build & Deploy Notes
1. "Save to GitHub" en Emergent
2. `git pull origin main`
3. `eas build --platform android`
4. Subir AAB a Google Play Console
