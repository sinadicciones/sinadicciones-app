# 📱 Arquitectura de la App SinAdicciones.cl

## 📋 Resumen del Proyecto

**SinAdicciones.cl** es una aplicación móvil de recuperación de adicciones con sistema multi-rol (Paciente, Profesional, Admin).

- **Frontend**: Expo (React Native)
- **Backend**: FastAPI (Python)
- **Base de datos**: MongoDB
- **Autenticación**: Google OAuth + Email/Password

---

## 🗄️ Estructura de Base de Datos (MongoDB)

### Colecciones Principales:

### 1. `users` - Usuarios del sistema
```javascript
{
  user_id: "user_abc123",           // ID único
  email: "usuario@email.com",       // Email (único)
  name: "Nombre Usuario",
  picture: "url_foto",              // Foto de Google o null
  password_hash: "hash...",         // Solo para usuarios email (no Google)
  auth_type: "email",               // "email" o "google"
  created_at: ISODate()
}
```

### 2. `user_profiles` - Perfiles extendidos
```javascript
{
  user_id: "user_abc123",
  role: "patient",                  // "patient", "professional", "admin"
  country: "Chile",
  identification: "12.345.678-9",   // RUT, DNI, etc.
  
  // === CAMPOS PARA PACIENTES ===
  addiction_type: "alcohol",        // Adicción principal
  secondary_addictions: ["tabaco", "juego"],
  years_using: 5,
  clean_since: "2024-01-15",        // Fecha inicio sobriedad (YYYY-MM-DD)
  dual_diagnosis: true,
  diagnoses: ["depresión", "ansiedad"],
  triggers: ["estrés", "fiestas"],
  protective_factors: ["familia", "deporte"],
  addictive_beliefs: ["solo uno no hace daño"],
  permissive_beliefs: ["me lo merezco"],
  life_story: "Mi historia...",
  emergency_contacts: [
    { name: "María", phone: "+56912345678", relationship: "esposa" }
  ],
  my_why: "Por mi familia",
  linked_therapist_id: "user_xyz789",  // Terapeuta vinculado
  profile_photo: "base64...",
  
  // === CAMPOS PARA PROFESIONALES ===
  professional_type: "psychologist", // psychologist, psychiatrist, therapist, counselor
  specialization: "adicciones",
  years_experience: 10,
  license_number: "PSI-12345",
  institution: "Centro ABC",
  bio: "Descripción profesional...",
  
  profile_completed: true,
  updated_at: ISODate()
}
```

### 3. `user_sessions` - Sesiones activas
```javascript
{
  user_id: "user_abc123",
  session_token: "sess_xyz789",
  expires_at: ISODate(),
  created_at: ISODate()
}
```

### 4. `habits` - Hábitos de usuarios
```javascript
{
  habit_id: "habit_abc123",
  user_id: "user_abc123",
  name: "Meditar 10 minutos",
  frequency: "daily",              // daily, weekly, custom
  color: "#10B981",
  icon: "leaf",
  reminder_time: "08:00",
  is_active: true,
  created_at: ISODate()
}
```

### 5. `habit_logs` - Registros de hábitos completados
```javascript
{
  log_id: "log_abc123",
  habit_id: "habit_abc123",
  user_id: "user_abc123",
  completed: true,
  note: "Me sentí bien",
  date: "2024-06-15",              // YYYY-MM-DD
  logged_at: ISODate()
}
```

### 6. `emotional_logs` - Registro emocional diario
```javascript
{
  log_id: "elog_abc123",
  user_id: "user_abc123",
  mood_scale: 7,                   // 1-10
  note: "Buen día",
  tags: ["tranquilo", "motivado"],
  date: "2024-06-15",              // YYYY-MM-DD
  logged_at: ISODate()
}
```

### 7. `relapses` - Recaídas reportadas
```javascript
{
  relapse_id: "relapse_abc123",
  user_id: "user_abc123",
  date: "2024-06-10",
  substance: "alcohol",
  trigger: "estrés laboral",
  notes: "Detalles...",
  reported_at: ISODate()
}
```

### 8. `purpose_tests` - Test de propósito de vida
```javascript
{
  user_id: "user_abc123",
  answers: { ... },
  profile: {
    type: "helper",
    values: ["familia", "servicio"],
    strengths: ["empatía", "resiliencia"]
  },
  completed_at: ISODate()
}
```

### 9. `purpose_goals` - Metas SMART
```javascript
{
  goal_id: "goal_abc123",
  user_id: "user_abc123",
  area: "health",                  // health, relationships, work, personal, spiritual, finances
  title: "Correr 5km",
  description: "...",
  target_date: "2024-12-31",
  status: "active",                // active, completed, paused
  progress: 50,                    // 0-100
  steps: [
    { step: "Caminar 1km", completed: true },
    { step: "Trotar 2km", completed: false }
  ],
  created_at: ISODate(),
  updated_at: ISODate()
}
```

---

## 🔌 API Endpoints Principales

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registro con email |
| POST | `/api/auth/login` | Login con email |
| POST | `/api/auth/session` | Login con Google |
| GET | `/api/auth/me` | Usuario actual |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/change-password` | Cambiar contraseña |

### Perfil
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/profile` | Obtener perfil |
| PUT | `/api/profile` | Actualizar perfil |
| POST | `/api/profile/set-role` | Establecer rol |
| POST | `/api/profile/professional-onboarding` | Completar onboarding profesional |
| POST | `/api/profile/photo` | Actualizar foto |

### Pacientes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/patient/link-therapist` | Vincular con terapeuta |
| POST | `/api/patient/unlink-therapist` | Desvincular terapeuta |
| POST | `/api/patient/report-relapse` | Reportar recaída |
| GET | `/api/patient/relapses` | Historial de recaídas |

### Profesionales
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/therapists/search?query=` | Buscar terapeutas |
| GET | `/api/professional/patients` | Pacientes vinculados |
| GET | `/api/professional/patient/{id}` | Detalle de paciente |
| GET | `/api/professional/alerts` | Alertas de pacientes |
| GET | `/api/professional/alerts/summary` | Resumen de alertas |

### Administrador
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Estadísticas globales |
| GET | `/api/admin/users` | Lista de usuarios |
| GET | `/api/admin/activity` | Actividad reciente |
| POST | `/api/admin/set-role` | Cambiar rol de usuario |

### Hábitos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/habits` | Listar hábitos |
| POST | `/api/habits` | Crear hábito |
| PUT | `/api/habits/{id}` | Actualizar hábito |
| DELETE | `/api/habits/{id}` | Eliminar hábito |
| POST | `/api/habits/{id}/log` | Registrar completado |

### Emocional
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/emotional-logs` | Historial emocional |
| POST | `/api/emotional-logs` | Registrar emoción |
| GET | `/api/emotional-logs/stats` | Estadísticas |

### Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Estadísticas básicas |
| GET | `/api/dashboard/integrated` | Dashboard completo |

---

## 👥 Sistema de Roles

### Paciente (`patient`)
- Registro de hábitos y emociones
- Contador de días de sobriedad
- Puede vincularse con un terapeuta
- Reportar recaídas
- Test de propósito de vida

### Profesional (`professional`)
- Dashboard con pacientes vinculados
- Ver estadísticas de pacientes
- Recibir alertas (inactividad, emociones negativas, recaídas)
- Ver historial de pacientes

### Administrador (`admin`)
- Estadísticas globales de la plataforma
- Ver todos los usuarios
- Cambiar roles de usuarios
- Actividad reciente

**Email del Admin:** `contacto@sinadicciones.cl`

---

## 🔔 Sistema de Alertas

El sistema genera alertas automáticas para profesionales:

1. **Recaída** (Crítica) - Cuando un paciente reporta una recaída
2. **Inactividad** (Media/Alta) - 3+ días sin actividad
3. **Emociones Negativas** (Media/Alta) - Múltiples registros con ánimo bajo

---

## 🔐 Autenticación

### Headers requeridos:
```
Authorization: Bearer {session_token}
```

O mediante cookie `session_token`.

### Flujo de registro:
1. Usuario se registra (Google o Email)
2. Selecciona rol (Paciente o Profesional)
3. Completa onboarding según rol
4. Accede al dashboard

---

## 📱 Pantallas de la App

### Comunes
- `index.tsx` - Login/Registro
- `role-select.tsx` - Selección de rol
- `onboarding.tsx` - Onboarding paciente
- `onboarding-professional.tsx` - Onboarding profesional

### Paciente
- `(tabs)/home.tsx` - Dashboard principal
- `(tabs)/habits.tsx` - Gestión de hábitos
- `(tabs)/progress.tsx` - Progreso y estadísticas
- `(tabs)/profile.tsx` - Perfil
- `find-therapist.tsx` - Buscar terapeuta
- `report-relapse.tsx` - Reportar recaída
- `purpose/` - Sección Propósito de vida

### Profesional
- `professional-dashboard.tsx` - Dashboard profesional
- `patient-detail.tsx` - Detalle de paciente
- `alerts.tsx` - Ver alertas

### Admin
- `admin-dashboard.tsx` - Dashboard administrador

---

## 🔗 Integración con el Sitio Web

Para integrar el sitio web con esta app:

1. **Usar la misma base de datos MongoDB**
2. **Conectar al mismo backend** o crear endpoints adicionales
3. **Respetar la estructura de colecciones** documentada arriba
4. **Usar el mismo sistema de autenticación** (session_token)

### Variables de entorno necesarias:
```
MONGO_URL=mongodb://...  # URL de MongoDB
```

---

## 📊 Datos de Prueba

### Usuario Admin:
- Email: `contacto@sinadicciones.cl`
- Rol: `admin` (asignado automáticamente)

### Roles disponibles:
- `patient` - Paciente
- `professional` - Profesional  
- `admin` - Administrador

---

## 🚀 Funcionalidades Pendientes

1. **Playlist de Recuperación** - Música/meditaciones para usuarios
2. **Mensajería Interna** - Chat entre paciente y terapeuta
3. **Tareas Asignadas** - Tareas del terapeuta al paciente
4. **Botón de Emergencia** - Contacto directo con terapeuta
5. **Diario Compartido** - Entradas de diario visibles para terapeuta
6. **Push Notifications** - Notificaciones de recordatorios

---

*Documento generado para integración con el sitio web sinadicciones.cl*
