---
id: SPEC-002
status: IMPLEMENTED
feature: login-dashboard-auth-profile
created: 2026-09-09
updated: 2026-09-09
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: Login, Dashboard, Perfil y Roles con Backend

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT -> APPROVED -> IN_PROGRESS -> IMPLEMENTED -> DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Crear la primera experiencia de acceso real al sistema con un login conectado a PostgreSQL, logo temporal reemplazable y navegación hacia un dashboard inicial. El dashboard debe mostrar una base limpia con layout, header, componentes de estadísticas placeholder, datos reales del usuario autenticado, su perfil asociado y navegación autorizada según roles reales de la base.

### Requerimiento de Negocio
El usuario necesita hacer el login de la aplicación con datos reales desde la base `postgresql://gabrieltates@localhost:5432/copsstec`, usando la tabla `users` y su relación con `profiles`. El login debe llevar a un dashboard blanco con componentes iniciales de estadísticas, layout y header de navegación; además debe existir un apartado para ver el perfil del usuario, un flujo de olvidé contraseña conectado al backend y reconocimiento de roles desde la tabla `roles`.

### Historias de Usuario

#### HU-01: Iniciar sesión con usuario real

```text
Como:        Usuario registrado en la base de datos
Quiero:      Iniciar sesión con mi email y contraseña
Para:        Acceder al dashboard y visualizar mi información real

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: acceso exitoso con credenciales válidas
  Dado que:  existe un registro activo en users con password bcrypt
  Cuando:    el usuario envía email y contraseña válidos
  Entonces:  el backend retorna un token de sesión y el frontend navega a /dashboard
```

**Error Path**
```gherkin
CRITERIO-1.2: credenciales inválidas
  Dado que:  el usuario está en el login
  Cuando:    envía un email inexistente o una contraseña incorrecta
  Entonces:  el sistema muestra un error claro sin revelar cuál campo falló
```

**Edge Case**
```gherkin
CRITERIO-1.3: usuario sin perfil
  Dado que:  un usuario existe en users pero no tiene registro en profiles
  Cuando:    inicia sesión correctamente
  Entonces:  el dashboard carga sin romperse y muestra un estado de perfil pendiente
```

#### HU-02: Visualizar perfil del usuario

```text
Como:        Usuario autenticado
Quiero:      Ver mi información de perfil
Para:        Confirmar mis datos personales y académicos registrados

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: perfil disponible
  Dado que:  el usuario autenticado tiene relación con profiles
  Cuando:    abre /profile o revisa el resumen en dashboard
  Entonces:  el sistema muestra datos de profiles asociados al user_id autenticado
```

**Error Path**
```gherkin
CRITERIO-2.2: token ausente o inválido
  Dado que:  una petición intenta consultar el perfil sin sesión válida
  Cuando:    llama al endpoint protegido
  Entonces:  el backend responde 401 y el frontend vuelve al login
```

#### HU-03: Recuperar contraseña

```text
Como:        Usuario que olvidó su contraseña
Quiero:      Solicitar recuperación y establecer una nueva contraseña
Para:        Recuperar el acceso a mi cuenta

Prioridad:   Media
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: solicitud de recuperación
  Dado que:  existe un usuario con el email enviado
  Cuando:    solicita recuperación de contraseña
  Entonces:  el backend genera un token en password_reset_tokens y devuelve una respuesta exitosa
```

**Happy Path**
```gherkin
CRITERIO-3.2: cambio de contraseña
  Dado que:  el usuario tiene un token vigente de recuperación
  Cuando:    envía token, email y nueva contraseña válida
  Entonces:  el backend actualiza users.password y elimina el token usado
```

**Error Path**
```gherkin
CRITERIO-3.3: token inválido o expirado
  Dado que:  el token no existe o superó su tiempo de vigencia
  Cuando:    intenta restablecer contraseña
  Entonces:  el backend responde 400 con mensaje genérico
```

#### HU-04: Navegar según rol y nivel de acceso

```text
Como:        Usuario autenticado con rol asignado
Quiero:      Ver únicamente las rutas y acciones permitidas para mi rol
Para:        Usar el sistema según mi nivel de autorización

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: acceso total para admin
  Dado que:  el usuario autenticado tiene rol admin
  Cuando:    consulta el dashboard o navega el sistema
  Entonces:  puede ver todas las vistas registradas y acceder a endpoints protegidos de administración
```

**Happy Path**
```gherkin
CRITERIO-4.2: acceso privado para miembro
  Dado que:  el usuario autenticado tiene rol miembro
  Cuando:    consulta el dashboard o navega el sistema
  Entonces:  solo ve vistas privadas relacionadas con su propia información y perfil
```

**Happy Path**
```gherkin
CRITERIO-4.3: acceso operativo compartido
  Dado que:  el usuario autenticado tiene rol bibliotecario, congreso-consejo o congreso-admin
  Cuando:    consulta el dashboard o navega el sistema
  Entonces:  ve el mismo grupo de vistas operativas definido para esos roles
```

**Error Path**
```gherkin
CRITERIO-4.4: acceso no autorizado
  Dado que:  el usuario autenticado intenta acceder a una vista o endpoint no permitido
  Cuando:    realiza la petición
  Entonces:  el backend responde 403 y el frontend muestra una pantalla de acceso restringido
```

### Reglas de Negocio
1. El login debe validar contra `users.email` y `users.password`.
2. Los hashes existentes con prefijo `$2y$` deben verificarse como bcrypt compatible con Laravel.
3. Solo se debe exponer al frontend información segura del usuario; nunca retornar `password` ni `remember_token`.
4. El perfil se obtiene por `profiles.user_id = users.id`.
5. Si el usuario no tiene perfil, el endpoint debe retornar `profile: null`.
6. La recuperación de contraseña debe usar la tabla `password_reset_tokens`.
7. Los mensajes de login y recuperación no deben filtrar si un email existe o no.
8. El logo temporal debe estar aislado en un componente o recurso fácil de reemplazar.
9. Los roles deben cargarse desde `roles` mediante `model_has_roles`, con `model_type = 'App\\Models\\User'`.
10. `admin` tiene acceso total.
11. `miembro` tiene acceso privado centrado en su dashboard, perfil y funcionalidades personales.
12. `bibliotecario`, `congreso-consejo` y `congreso-admin` comparten un acceso operativo inicial.
13. La lógica de autorización debe estar centralizada en políticas/configuración, no repetida en componentes ni endpoints.
14. Debe ser sencillo agregar nuevos roles, vistas y accesos modificando principalmente un mapa de políticas o registro de navegación.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `User` | tabla `users` | reutilizada | Fuente de credenciales, identidad principal y estado |
| `Profile` | tabla `profiles` | reutilizada | Datos personales y académicos asociados al usuario |
| `PasswordResetToken` | tabla `password_reset_tokens` | reutilizada | Tokens temporales para recuperación de contraseña |
| `Role` | tabla `roles` | reutilizada | Roles existentes del sistema |
| `ModelHasRole` | tabla `model_has_roles` | reutilizada | Relación entre usuarios y roles |
| `Permission` | tabla `permissions` | preparada | Tabla existente sin registros iniciales |
| `RoleHasPermission` | tabla `role_has_permissions` | preparada | Tabla existente para permisos futuros |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `users.id` | bigint | sí | PK | Identificador del usuario |
| `users.name` | string | sí | max 255 | Nombre visible del usuario |
| `users.email` | string | sí | único | Email usado para login |
| `users.password` | string | sí | bcrypt `$2y$` | Hash de contraseña, no se expone |
| `users.state_id` | bigint | sí | FK states | Estado del usuario |
| `users.last_conexion` | timestamp | no | nullable | Último acceso registrado |
| `profiles.user_id` | bigint | sí | único, FK users | Relación uno a uno con usuario |
| `profiles.names` | string | sí | max 255 | Nombres del perfil |
| `profiles.lastname` | string | sí | max 255 | Apellidos del perfil |
| `profiles.identifier` | string | sí | único | Identificación del perfil |
| `profiles.email` | string | sí | único | Email del perfil |
| `profiles.mobile_phone` | string | sí | max 255 | Teléfono móvil |
| `profiles.title_academic` | string | sí | max 255 | Título académico |
| `profiles.level_academic` | string | sí | max 255 | Nivel académico |
| `profiles.gender` | string | no | nullable | Género |
| `password_reset_tokens.email` | string | sí | PK | Email que solicitó recuperación |
| `password_reset_tokens.token` | string | sí | token seguro/hash | Token temporal |
| `password_reset_tokens.created_at` | timestamp | no | vigencia configurable | Fecha de creación |
| `roles.id` | bigint | sí | PK | Identificador del rol |
| `roles.name` | string | sí | único por guard | Nombre del rol (`admin`, `miembro`, etc.) |
| `roles.guard_name` | string | sí | `web` | Guard heredado de Laravel |
| `model_has_roles.role_id` | bigint | sí | FK roles | Rol asignado |
| `model_has_roles.model_id` | bigint | sí | users.id | Usuario asignado al rol |
| `model_has_roles.model_type` | string | sí | `App\\Models\\User` | Tipo de modelo relacionado |

#### Índices / Constraints
- Reutilizar `users_email_unique` para búsqueda de usuario por email.
- Reutilizar `profiles_user_id_unique` para cargar perfil por usuario.
- Reutilizar `password_reset_tokens_pkey` para upsert de token por email.
- Reutilizar `roles_name_guard_name_unique` para resolver roles por nombre.
- Reutilizar `model_has_roles_model_id_model_type_index` para cargar roles del usuario.

### API Endpoints

#### POST /api/auth/login
- **Descripción**: Autentica un usuario contra la tabla `users`
- **Auth requerida**: no
- **Request Body**:
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response 200**:
  ```json
  {
    "access_token": "jwt",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "name": "string",
      "email": "string",
      "state_id": 1,
      "last_conexion": "iso8601|null",
      "roles": ["admin"],
      "access_level": "admin",
      "allowed_routes": ["/dashboard", "/profile"],
      "profile": {}
    }
  }
  ```
- **Response 401**: credenciales inválidas

#### GET /api/auth/me
- **Descripción**: Retorna el usuario autenticado y su perfil asociado
- **Auth requerida**: sí
- **Response 200**: mismo shape seguro de `user`
- **Response 401**: token ausente, inválido o expirado

#### GET /api/auth/access
- **Descripción**: Retorna el nivel de acceso, roles y navegación permitida para el usuario autenticado
- **Auth requerida**: sí
- **Response 200**:
  ```json
  {
    "roles": ["miembro"],
    "access_level": "member",
    "allowed_routes": ["/dashboard", "/profile"],
    "navigation": []
  }
  ```
- **Response 401**: token ausente, inválido o expirado

#### POST /api/auth/forgot-password
- **Descripción**: Solicita recuperación de contraseña
- **Auth requerida**: no
- **Request Body**:
  ```json
  { "email": "string" }
  ```
- **Response 200**:
  ```json
  { "message": "Si el correo existe, se generó una solicitud de recuperación." }
  ```

#### POST /api/auth/reset-password
- **Descripción**: Cambia la contraseña usando un token vigente
- **Auth requerida**: no
- **Request Body**:
  ```json
  { "email": "string", "token": "string", "password": "string", "password_confirmation": "string" }
  ```
- **Response 200**:
  ```json
  { "message": "Contraseña actualizada correctamente." }
  ```
- **Response 400**: token inválido, expirado o contraseña inválida

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `AppLogo` | `frontend/src/shared/components/app-logo.tsx` | `variant` | Logo temporal reutilizable en login y header |
| `AppHeader` | `frontend/src/shared/components/app-header.tsx` | ninguna | Header principal con navegación base |
| `DashboardShell` | `frontend/src/shared/components/dashboard-shell.tsx` | `children` | Layout visual para rutas internas |
| `LoginPage` | `frontend/src/modules/auth/presentation/pages/login-page.tsx` | ninguna | Pantalla de login real |
| `LoginForm` | `frontend/src/modules/auth/presentation/forms/login-form.tsx` | ninguna | Formulario cliente que llama al backend y navega al dashboard |
| `ForgotPasswordPage` | `frontend/src/modules/auth/presentation/pages/forgot-password-page.tsx` | ninguna | Pantalla para solicitar recuperación |
| `ResetPasswordPage` | `frontend/src/modules/auth/presentation/pages/reset-password-page.tsx` | ninguna | Pantalla para cambiar contraseña con token |
| `DashboardPage` | `frontend/src/modules/dashboard/presentation/pages/dashboard-page.tsx` | ninguna | Dashboard blanco con resumen de usuario y tarjetas de estadísticas placeholder |
| `ProfileSummary` | `frontend/src/modules/dashboard/presentation/components/profile-summary.tsx` | `user` | Resumen del perfil en dashboard |
| `StatCard` | `frontend/src/modules/dashboard/presentation/components/stat-card.tsx` | `title`, `value`, `description` | Tarjeta simple para visualizar métricas futuras |
| `ProfilePage` | `frontend/src/modules/profile/presentation/pages/profile-page.tsx` | ninguna | Página con datos completos del perfil |
| `AccessDeniedPage` | `frontend/src/modules/auth/presentation/pages/access-denied-page.tsx` | ninguna | Pantalla para accesos no autorizados |
| `RoleGate` | `frontend/src/shared/components/role-gate.tsx` | `requiredAccess`, `children` | Control visual centralizado por roles/accesos |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| `LoginRoute` | `frontend/src/app/(public)/login/page.tsx` | `/login` | no |
| `ForgotPasswordRoute` | `frontend/src/app/(public)/forgot-password/page.tsx` | `/forgot-password` | no |
| `ResetPasswordRoute` | `frontend/src/app/(public)/reset-password/page.tsx` | `/reset-password` | no |
| `HomeRedirect` | `frontend/src/app/page.tsx` | `/` | no |
| `DashboardRoute` | `frontend/src/app/(protected)/dashboard/page.tsx` | `/dashboard` | sí |
| `ProfileRoute` | `frontend/src/app/(protected)/profile/page.tsx` | `/profile` | sí |
| `AccessDeniedRoute` | `frontend/src/app/(protected)/access-denied/page.tsx` | `/access-denied` | sí |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useAuth` | `frontend/src/modules/auth/presentation/hooks/use-auth.ts` | sesión, login, logout, me | Maneja sesión cliente y llamadas al backend |
| `useAccess` | `frontend/src/modules/auth/presentation/hooks/use-access.ts` | roles, accessLevel, canAccess | Maneja autorización visual y navegación |
| `useForgotPassword` | `frontend/src/modules/auth/presentation/hooks/use-forgot-password.ts` | submit, loading, error | Solicitud de recuperación |
| `useResetPassword` | `frontend/src/modules/auth/presentation/hooks/use-reset-password.ts` | submit, loading, error | Restablecimiento de contraseña |

#### Services
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `login` | `frontend/src/modules/auth/infrastructure/auth-api.ts` | `POST /api/auth/login` |
| `getCurrentUser` | `frontend/src/modules/auth/infrastructure/auth-api.ts` | `GET /api/auth/me` |
| `getAccessPolicy` | `frontend/src/modules/auth/infrastructure/auth-api.ts` | `GET /api/auth/access` |
| `forgotPassword` | `frontend/src/modules/auth/infrastructure/auth-api.ts` | `POST /api/auth/forgot-password` |
| `resetPassword` | `frontend/src/modules/auth/infrastructure/auth-api.ts` | `POST /api/auth/reset-password` |

### Arquitectura y Dependencias
- Crear una aplicación backend FastAPI si todavía no existe.
- Crear una aplicación frontend Next.js con TypeScript en `frontend/` si todavía no existe.
- Usar `DATABASE_URL` para conectar con PostgreSQL; no hardcodear credenciales en código.
- Usar JWT para sesión del frontend.
- Usar SQLAlchemy async o sync de forma consistente para leer `users`, `profiles` y `password_reset_tokens`.
- Centralizar hashing/verificación de contraseñas compatible con bcrypt Laravel `$2y$`.
- Centralizar autorización en un módulo de políticas con tres accesos iniciales:
  - `admin`: rol `admin`, acceso total.
  - `member`: rol `miembro`, acceso privado/personal.
  - `operations`: roles `bibliotecario`, `congreso-consejo`, `congreso-admin`, acceso operativo compartido.
- Preparar la estructura para que en el futuro pueda usar `permissions` y `role_has_permissions` cuando existan datos.
- Definir navegación del frontend en un registro central con `requiredAccess`, evitando lógica repetida por vista.
- Usar App Router, route groups `(public)` y `(protected)`.
- Mantener páginas de `src/app` como composición pequeña.
- Crear módulos frontend `auth`, `dashboard` y `profile` con API pública mediante `index.ts`.
- Crear módulo backend `auth` con Domain/Application/Infrastructure/Presentation.
- No agregar librerías externas de UI para mantener el arranque simple.

### Notas de Implementación
> El token de recuperación debe generarse de forma segura. Si aún no existe integración de email, el endpoint puede guardar el token y devolver un mensaje genérico; en entorno local puede registrarse en logs para pruebas, evitando exponerlo en producción.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Crear estructura FastAPI si no existe.
- [x] Configurar `DATABASE_URL` desde entorno.
- [x] Modelar lecturas de `users`, `profiles` y `password_reset_tokens`.
- [x] Modelar lecturas de `roles` y `model_has_roles`.
- [x] Crear política RBAC central con accesos `admin`, `member` y `operations`.
- [x] Implementar verificación bcrypt compatible con hashes `$2y$`.
- [x] Implementar `POST /api/auth/login`.
- [x] Implementar `GET /api/auth/me`.
- [x] Implementar `GET /api/auth/access`.
- [x] Implementar `POST /api/auth/forgot-password`.
- [x] Implementar `POST /api/auth/reset-password`.
- [x] Proteger endpoints con dependencia reutilizable de autenticación/autorización.
- [x] Actualizar `users.last_conexion` en login exitoso.

#### Tests Backend
- [ ] Validar login correcto con usuario real de la BD.
- [ ] Validar login inválido con respuesta 401 genérica.
- [x] Validar que `/api/auth/me` no expone campos sensibles.
- [ ] Validar usuario sin perfil retorna `profile: null`.
- [x] Validar usuario `admin` obtiene acceso total.
- [x] Validar usuario `miembro` obtiene acceso privado.
- [ ] Validar roles `bibliotecario`, `congreso-consejo` y `congreso-admin` obtienen acceso operativo.
- [x] Validar endpoint protegido responde 403 cuando falta acceso.
- [ ] Validar creación de token de recuperación.
- [ ] Validar restablecimiento de contraseña con token vigente.

### Frontend

#### Implementación
- [x] Crear estructura Next.js en `frontend/` si no existe.
- [x] Crear route groups `(public)` y `(protected)`.
- [x] Implementar login visual con logo temporal y formulario conectado al backend.
- [x] Guardar token de sesión de forma centralizada.
- [x] Implementar navegación post-login hacia `/dashboard`.
- [x] Crear layout protegido con header.
- [x] Crear registro central de navegación por nivel de acceso.
- [x] Mostrar/ocultar navegación según `access_level`.
- [x] Crear guard visual reutilizable para vistas protegidas por acceso.
- [x] Crear dashboard blanco con componentes de estadísticas placeholder y resumen del perfil.
- [x] Crear página `/profile` con los datos de `profiles`.
- [x] Crear vistas placeholder diferenciadas para acceso `admin`, `member` y `operations`.
- [x] Crear páginas `/forgot-password` y `/reset-password`.
- [x] Definir estilos globales base.

#### Tests Frontend
- [x] Ejecutar validación de lint/build disponible.
- [ ] Verificar que `/login` autentica contra el backend.
- [ ] Verificar que credenciales inválidas muestran error.
- [ ] Verificar que `/dashboard` muestra header, tarjetas placeholder y resumen de perfil.
- [ ] Verificar que `/profile` muestra datos del perfil real.
- [ ] Verificar que la navegación cambia según rol.
- [ ] Verificar que una ruta no permitida muestra `/access-denied`.
- [ ] Verificar flujo visual de olvidé contraseña.

### QA
- [x] Revisar que el logo pueda reemplazarse fácilmente.
- [x] Confirmar que el layout permite agregar nuevas rutas internas.
- [x] Confirmar que no se exponen `password` ni `remember_token`.
- [x] Confirmar que el backend solo usa tablas existentes y no modifica esquema.
- [x] Confirmar que agregar un nuevo rol requiere actualizar el mapa central de políticas/navegación.
- [x] Actualizar estado spec: `status: IMPLEMENTED`.
