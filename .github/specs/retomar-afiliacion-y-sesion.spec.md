---
id: SPEC-019
status: IMPLEMENTED
feature: retomar-afiliacion-y-sesion
created: 2026-09-25
updated: 2026-09-25
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-005", "SPEC-010", "SPEC-012"]
---

# Spec: Retomar afiliación y sesión persistente

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Permitir que un aspirante que ya se inscribió retome el flujo de afiliación desde el login (correo personal + código por email), sin contraseña. Mantener la sesión de cualquier usuario con access + refresh token (vigencia efectiva de 24 horas). Si el refresh falla o el usuario cierra sesión, redirigir siempre a `/login` y no dejarlo en una página rota.

### Requerimiento de Negocio
La sesión del miembro cuando se registra no debe cerrarse, porque no hay forma de iniciar sesión hasta que haga el pago: hay quienes se salen y ya no pueden completar el flujo de pago, subir documentos y el resto. En el login debe existir una opción **“Ya me inscribí, continuar con la afiliación”**: ingresan el correo con el que se registraron, les llega un correo con el código, ingresan el código y el sistema los lleva de nuevo a la página que les corresponde (pago, documentos o en revisión). Además, si el sistema le cierra la sesión a cualquier usuario, no debe quedarse en la misma página: debe redirigir al login. El token no debe “morir” a las 8 horas sin recambio: debe haber refresh para cubrir 24 horas; si se cancela o el refresh falla, redirigir al login.

### Contexto técnico actual (problema)

1. Al registrarse (`RegisterMembershipUseCase`) se guarda una contraseña aleatoria (`token_urlsafe(24)`) que el aspirante **nunca conoce**. El login con email + password es imposible hasta que el admin aprueba y le envía el correo corporativo.
2. El JWT de acceso dura **480 minutos (8 h)** (`ACCESS_TOKEN_EXPIRE_MINUTES`). No hay refresh.
3. `AffiliationPendingError` existe en el router de login pero **nunca se lanza**.
4. `/afiliacion/pago` ante error de API solo muestra el mensaje; no redirige a login. Otras pantallas (dashboard, documentos) sí redirigen en el `catch` del primer load, pero una llamada 401 a mitad de uso deja al usuario en la misma página.

### Decisiones de esta spec

1. **Retomar afiliación es un OTP, no un login con contraseña.** Solo para `state_id = 2` (POR HABILITAR) con el correo personal del registro.
2. Tras el código, el frontend usa `membershipPathForStatus` (ya existe). Si el usuario pidió “página de subir documentos”, eso ocurre cuando el gate es `documents`; si aún no pagó va a `/afiliacion/pago`; si ya subió documentos, a `/afiliacion/en-revision`.
3. **Access token = 30 minutos. Refresh token = 24 horas.** El refresh renueva el access sin pedir login. Si el refresh está vencido, revocado o el usuario pulsa “Cerrar sesión”, se limpia todo y se va a `/login`.
4. Al **registrar** y al **retomar** se emiten ambos tokens, para que no se pierda la sesión al recargar o al pasar la media hora.
5. Login normal (admin, miembro habilitado, otros roles) también recibe refresh. Misma regla de redirección.
6. El mensaje al pedir el código es genérico tanto si el correo no existe como si el usuario ya está habilitado: no se filtra si el email está inscrito.

### Historias de Usuario

#### HU-01: Continuar afiliación desde el login

```
Como:        Aspirante que ya se inscribió
Quiero:      Una opción en el login para continuar con la afiliación usando mi correo
Para:        Retomar el pago o los documentos si se me cerró la sesión

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: enlace visible en login
  Dado que:  estoy en `/login`
  Cuando:    veo el formulario
  Entonces:  hay un enlace o botón "Ya me inscribí, continuar con la afiliación" además de "¡Deseo afiliarme!" y el login normal
```

**Happy Path**
```gherkin
CRITERIO-1.2: pido el código
  Dado que:  me registré con ana@gmail.com y sigo POR HABILITAR
  Cuando:    abro continuar afiliación, ingreso ese correo y envío
  Entonces:  recibo un correo HTML institucional con un código de 6 dígitos y veo la pantalla para ingresarlo
```

**Error Path**
```gherkin
CRITERIO-1.3: correo desconocido o ya habilitado
  Dado que:  el correo no existe, o el usuario ya está habilitado (state_id = 1)
  Cuando:    pido el código
  Entonces:  la API responde 200 con el mismo mensaje genérico y no envía correo (o no revela que no aplica)
```

#### HU-02: Validar código y volver al paso correcto

```
Como:        Aspirante con el código en el correo
Quiero:      Ingresar el código y recuperar mi sesión
Para:        Seguir en pago, documentos o en revisión según donde me quedé

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: código válido restaura sesión
  Dado que:  pedí un código vigente para mi correo de registro
  Cuando:    ingreso el código correcto
  Entonces:  recibo access_token + refresh_token, se guardan en el cliente y navego con membershipPathForStatus
```

**Happy Path**
```gherkin
CRITERIO-2.2: gate documents
  Dado que:  ya subí el comprobante y me faltan documentos
  Cuando:    valido el código
  Entonces:  llego a `/afiliacion/documentos`
```

**Error Path**
```gherkin
CRITERIO-2.3: código inválido o vencido
  Dado que:  el código es incorrecto, ya se usó o pasaron 15 minutos
  Cuando:    lo envío
  Entonces:  la API responde 400, no emite tokens y puedo pedir uno nuevo
```

#### HU-03: Sesión que no se corta a las 8 horas

```
Como:        Usuario autenticado (aspirante, miembro o admin)
Quiero:      Que mi sesión se renueve en segundo plano durante 24 horas
Para:        No perder el trabajo si dejo la pestaña abierta o vuelvo al día siguiente

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: refresh silencioso
  Dado que:  tengo un refresh_token vigente y el access_token expiró
  Cuando:    el frontend hace una llamada autenticada y recibe 401
  Entonces:  llama POST /api/auth/refresh, guarda el nuevo access_token y reintenta la llamada original una vez
```

**Happy Path**
```gherkin
CRITERIO-3.2: registro emite refresh
  Dado que:  acabo de completar el wizard de afiliación
  Cuando:    el backend responde 201
  Entonces:  incluye access_token y refresh_token; el cliente guarda ambos
```

**Error Path**
```gherkin
CRITERIO-3.3: refresh vencido o revocado
  Dado que:  el refresh_token tiene más de 24 h, fue revocado o es inválido
  Cuando:    el cliente intenta renovar
  Entonces:  se borran los tokens y se redirige a `/login`
```

#### HU-04: Expiración o cierre siempre van al login

```
Como:        Cualquier usuario del sistema
Quiero:      Que si se me cierra o cancela la sesión me lleven al login
Para:        No quedarme en una pantalla rota con errores de API

Prioridad:   Alta
Estimación:  S
Dependencias: HU-03
Capa:        Frontend
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: 401 irrecuperable → login
  Dado que:  estoy en dashboard, pago, documentos, perfil o cualquier ruta protegida
  Cuando:    una llamada autenticada recibe 401 y el refresh no puede renovar
  Entonces:  se limpia la sesión y navego a `/login` (no me quedo en la misma URL)
```

**Happy Path**
```gherkin
CRITERIO-4.2: cerrar sesión
  Dado que:  pulso "Cerrar sesión" en afiliación o en el header
  Cuando:    se completa el logout
  Entonces:  se revoca el refresh en backend si existe, se borran tokens y voy a `/login`
```

**Edge Case**
```gherkin
CRITERIO-4.3: sin token al entrar
  Dado que:  no hay access_token en localStorage
  Cuando:    abro `/afiliacion/pago`, `/afiliacion/documentos`, `/dashboard` u otra ruta autenticada
  Entonces:  voy a `/login` de inmediato
```

### Reglas de Negocio
1. Continuar afiliación solo aplica a usuarios `state_id = 2` con el **correo personal** del registro.
2. El código es numérico de 6 dígitos, vive 15 minutos, un solo uso. Máximo 5 intentos fallidos; luego se invalida.
3. Reenvío: mínimo 60 segundos entre códigos para el mismo correo.
4. Respuesta al solicitar código siempre 200 + mensaje genérico: “Si el correo está inscrito y tu afiliación sigue en proceso, te enviamos un código.”
5. Miembros habilitados, admin y otros roles no usan este flujo: entran con email + contraseña.
6. Access token: 30 minutos. Refresh token: 24 horas. Un refresh vigente emite un access nuevo y rota el refresh.
7. Logout o refresh fallido: tokens locales borrados + redirect `/login`.
8. Tras retomar, el paso lo decide el gate existente (`membershipPathForStatus`), no una ruta fija.
9. El login con contraseña de un aspirante `state_id = 2` sigue sin ser el camino oficial (no conoce la clave). No se cambia esa contraseña aleatoria.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `AffiliationResumeCode` | tabla `affiliation_resume_codes` | nueva | OTP para retomar afiliación |
| `RefreshToken` | tabla `refresh_tokens` | nueva | Refresh de sesión (todos los usuarios) |
| `AuthSession` | JWT + refresh | modificada | Access más corto + refresh 24 h |

#### Campos del modelo

`affiliation_resume_codes`:

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | SERIAL PK | sí | auto | Identificador |
| `user_id` | INTEGER FK users | sí | existe | Aspirante dueño |
| `email` | VARCHAR(255) | sí | lower(email) | Correo personal usado |
| `code_hash` | VARCHAR(64) | sí | sha256 del código | Nunca guardar el código en claro |
| `attempts` | INTEGER | sí | default 0 | Intentos fallidos |
| `expires_at` | TIMESTAMP | sí | created + 15 min | Caducidad |
| `consumed_at` | TIMESTAMP | no | se setea al usar | Un solo uso |
| `created_at` | TIMESTAMP | sí | now | Alta |

`refresh_tokens`:

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | SERIAL PK | sí | auto | Identificador |
| `user_id` | INTEGER FK users | sí | existe | Dueño |
| `token_hash` | VARCHAR(64) | sí | sha256, único | Valor opaco |
| `expires_at` | TIMESTAMP | sí | now + 24 h | Caducidad |
| `revoked_at` | TIMESTAMP | no | logout / rotación | Baja |
| `created_at` | TIMESTAMP | sí | now | Alta |

#### Índices / Constraints
- `affiliation_resume_codes(email, created_at DESC)` para el último código vigente.
- `refresh_tokens(token_hash)` UNIQUE.
- `refresh_tokens(user_id, revoked_at, expires_at)` para limpiar y validar.
- Al emitir un código nuevo para el mismo email se invalidan los anteriores no consumidos (`consumed_at = now()`).

#### SQL
Archivo `backend/database/auth_session_resume.sql`:

```sql
CREATE TABLE IF NOT EXISTS affiliation_resume_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliation_resume_codes_email
  ON affiliation_resume_codes (lower(email), created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens (user_id, revoked_at, expires_at);
```

No hay carpeta Alembic de versiones; se sigue el patrón SQL de `backend/database/`.

### API Endpoints

Prefijo existente: `/api/auth` (no `/api/v1`).

#### POST /api/auth/affiliation/resume
- **Descripción**: Solicita el código de 6 dígitos para retomar afiliación
- **Auth requerida**: no
- **Request Body**:
  ```json
  { "email": "ana@gmail.com" }
  ```
- **Response 200** (siempre, no enumerar usuarios):
  ```json
  {
    "message": "Si el correo está inscrito y tu afiliación sigue en proceso, te enviamos un código."
  }
  ```
- En `APP_ENV` local/dev se puede incluir `"debug_code": "123456"` (igual que `reset_token` en forgot-password). En prod no.
- **Response 400**: email inválido
- Efecto: si existe usuario `state_id = 2` con ese email, genera código, hashea, guarda, envía plantilla `affiliation_resume`.

#### POST /api/auth/affiliation/verify
- **Descripción**: Valida el código y emite sesión
- **Auth requerida**: no
- **Request Body**:
  ```json
  { "email": "ana@gmail.com", "code": "482193" }
  ```
- **Response 200**:
  ```json
  {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer",
    "user": { "id": 12, "email": "ana@gmail.com", "state_id": 2, "access_level": "member" }
  }
  ```
- **Response 400**: código inválido, vencido, consumido o demasiados intentos
- **Response 404**: no aplica (correo sin afiliación pendiente). Mensaje: “No pudimos validar el código. Revisa el correo o solicita uno nuevo.”

#### POST /api/auth/refresh
- **Descripción**: Rota refresh y emite access nuevo
- **Auth requerida**: no (lleva el refresh en el body)
- **Request Body**:
  ```json
  { "refresh_token": "..." }
  ```
- **Response 200**:
  ```json
  { "access_token": "...", "refresh_token": "...", "token_type": "bearer" }
  ```
- **Response 401**: refresh inválido, vencido o revocado

#### POST /api/auth/logout
- **Descripción**: Revoca el refresh actual
- **Auth requerida**: access opcional; refresh en body
- **Request Body**:
  ```json
  { "refresh_token": "..." }
  ```
- **Response 204**: siempre (idempotente)

#### POST /api/auth/login
- **Cambio**: la respuesta incluye `refresh_token` además de `access_token`.

#### POST /api/membership/register
- **Cambio**: la respuesta incluye `refresh_token` además de `access_token`.

### Correo `affiliation_resume`

Nueva clave en `RENDERERS` (SPEC-010, mismo `branded_layout`):

- Asunto: `Continúa tu afiliación a COPSSTEC`
- Cuerpo: saludo con nombres, código de 6 dígitos grande, validez 15 minutos, CTA a `/login` (o `/continuar-afiliacion`).
- Texto plano con el mismo código.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `ResumeAffiliationForm` | `modules/auth/presentation/forms/resume-affiliation-form.tsx` | — | Paso email → paso código |
| `SessionGuard` | `shared/components/session-guard.tsx` | `children` | Escucha `copsstec:session-expired` y redirige a `/login` |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Continuar afiliación | `frontend/src/app/(public)/continuar-afiliacion/page.tsx` | `/continuar-afiliacion` | no |

También se puede incrustar el formulario en el login; la ruta dedicada evita saturar la card. El login **debe** tener el enlace.

#### Páginas / componentes a modificar
| Pieza | Cambio |
|-------|--------|
| `login-page.tsx` / `login-form.tsx` | Enlace “Ya me inscribí, continuar con la afiliación” → `/continuar-afiliacion` |
| `auth-storage.ts` | Guardar `copsstec.refresh_token`; `storeSession` / `clearSession` |
| `auth-api.ts` | resume, verify, refresh, logout |
| `membership-api.ts` | Persistir `refresh_token` del register |
| `dashboard-shell.tsx` y páginas de afiliación | Logout llama `POST /logout` + `clearSession` + `/login` |
| `globals.css` | Estilos del formulario de código (misma cáscara `AuthScene`) |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| Estado local del form | `resume-affiliation-form.tsx` | step, email, code, error, loading | Sin store global |
| `authorizedFetch` | `modules/auth/infrastructure/authorized-fetch.ts` | `fetch` con retry | 401 → refresh → retry → evento |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `requestAffiliationResume(email)` | `auth-api.ts` | `POST /api/auth/affiliation/resume` |
| `verifyAffiliationResume(email, code)` | `auth-api.ts` | `POST /api/auth/affiliation/verify` |
| `refreshSession(refreshToken)` | `auth-api.ts` | `POST /api/auth/refresh` |
| `logoutSession(refreshToken)` | `auth-api.ts` | `POST /api/auth/logout` |

### Cliente HTTP autenticado

`authorizedFetch(input, init)`:

1. Agrega `Authorization: Bearer {access}`.
2. Si status 401 y hay refresh: `POST /refresh`, `storeSession`, reintenta **una** vez.
3. Si sigue 401 o no hay refresh: `clearSession()`, `window.dispatchEvent(new Event("copsstec:session-expired"))`, lanza error.
4. `SessionGuard` (layout raíz) escucha el evento y hace `router.replace("/login")`.
5. Migrar las APIs autenticadas a este helper: `auth-api`, `membership-api`, `dashboard-api`, `members-api`, `payments-api`, `profile-api`, `documents-api`, `courses-api`, `elections-api`, `notices-api`, `blogs-api` (las que mandan Bearer). Las públicas (login, resume, register) no.

`/api/auth/refresh` y `/api/auth/logout` **no** usan `authorizedFetch` (evitar bucle).

### Config

En `config.py` y `.env.example`:

| Variable | Default | Uso |
|----------|---------|-----|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` (antes 480) | JWT corto |
| `REFRESH_TOKEN_EXPIRE_HOURS` | `24` | Vigencia del refresh |
| `AFFILIATION_RESUME_EXPIRE_MINUTES` | `15` | OTP |
| `AFFILIATION_RESUME_MAX_ATTEMPTS` | `5` | Intentos |

### Arquitectura y Dependencias
- Paquetes nuevos: ninguno.
- Correo: Mailtrap / `SmtpOrLogEmailSender` existente.
- Código OTP: `secrets.randbelow` → 6 dígitos, hash SHA-256 (reutilizar `hash_reset_token`).
- Refresh: `token_urlsafe(32)`, mismo hash.
- Hexagonal: use cases en `auth/application`, repo en infrastructure, domain sin FastAPI.

### Notas de Implementación
> No exigir contraseña al aspirante. No habilitar login password para `state_id = 2`.
> Al rotar refresh, marcar el anterior `revoked_at` e insertar uno nuevo.
> Tras verify, borrar/consumir el código.
> `/afiliacion/pago` debe redirigir a login en 401, no solo mostrar error.
> Aplicar el SQL en local al implementar.
> En local, mostrar el código en UI solo si la API lo manda (`debug_code`), igual que forgot-password.
> Tests de login existentes deben aceptar `refresh_token` en la respuesta.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] SQL `auth_session_resume.sql` + aplicar tablas
- [x] Settings: access 30 min, refresh 24 h, OTP 15 min / 5 intentos
- [x] `create_refresh_token` + persistencia y rotación en `AuthRepository`
- [x] Login, register y verify emiten access + refresh
- [x] Use cases `RequestAffiliationResume` y `VerifyAffiliationResume`
- [x] Endpoints `/api/auth/affiliation/resume`, `/verify`, `/refresh`, `/logout`
- [x] Plantilla email `affiliation_resume`
- [x] Register membership incluye `refresh_token` en el schema

#### Tests Backend
- [x] Verificado por E2E API: resume solo con pendiente, email desconocido 200 genérico, verify tokens, código malo 400, refresh rota, refresh revocado 401, register incluye refresh
- [x] Plantilla `affiliation_resume` agregada a `test_email_templates.py`

### Frontend

#### Implementación
- [x] `storeSession` / `clearSession` (access + refresh)
- [x] `authorizedFetch` + evento `copsstec:session-expired`
- [x] `SessionGuard` en el layout
- [x] API resume / verify / refresh / logout
- [x] Página `/continuar-afiliacion` + enlace en login
- [x] Tras verify: `membershipPathForStatus`
- [x] Register y login guardan refresh
- [x] Logout de afiliación y header llama logout + `/login`
- [x] Migrar fetches autenticados al helper
- [x] `/afiliacion/pago` redirige a login si la sesión no se puede renovar

#### Tests Frontend
- [x] Login muestra el enlace (verificado en navegador)
- [x] Verify con gate documents navega a `/afiliacion/documentos`
- [x] 401 + refresh fallido / sin token redirige a `/login`

### QA
- [x] Continuar con correo + código → documentos
- [x] Access inválido + refresh vigente renueva y permanece en documentos
- [x] Sin tokens en documentos redirige a login
- [x] Logout / evento de sesión expirada redirige a login
- [x] Código enviado por Mailtrap (SMTP) y `debug_code` en local
- [x] Actualizar estado spec: `status: IMPLEMENTED`
