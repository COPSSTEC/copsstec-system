---
id: SPEC-010
status: IMPLEMENTED
feature: correos-transaccionales-mailtrap
created: 2026-09-21
updated: 2026-09-21
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-003", "SPEC-004", "SPEC-005", "SPEC-008", "SPEC-009"]
---

# Spec: Correos transaccionales con diseño y Mailtrap

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Reemplazar los envíos que hoy solo se imprimen en logs del backend por correos HTML reales, con el diseño institucional ya usado en `copsstec-web/react-emails` (logo COPSSTEC, tipografía, botón y pie de Quito). El transporte es Mailtrap SMTP. Cubre los correos de los módulos ya construidos: login/recuperación, miembros, afiliación, cursos y votaciones.

### Requerimiento de Negocio
Los apartados de correos definidos en las conversaciones de votaciones, miembros, login, afiliación, pagos, cursos y blogs deben dejar de mostrarse como logs. Deben enviarse de verdad, con diseño clonado de `/Users/gabrieltates/Documents/copsstec-web/react-emails`, usando Mailtrap. Las variables SMTP se agregan al `.env` de una vez.

### Alcance de plantillas (mapeo react-emails → sistema)

| Clave interna | Plantilla origen | Disparador actual |
|---------------|------------------|-------------------|
| `access_credentials` | `new-credentials.tsx` | Crear miembro; reenvío a buzón corporativo |
| `corporate_mailbox` | `new-email.tsx` | Aprobar afiliación / reenviar credenciales al correo personal |
| `password_reset` | `resend-code.tsx` + CTA | `POST /api/auth/forgot-password` |
| `new_member_admin` | `new-member.tsx` | Registro público de afiliación |
| `course_inscription_received` | `body-email.tsx` | Inscripción invitada (pago pendiente) |
| `course_inscription_confirmed` | `course-inscription-success.tsx` | Inscripción de miembro o pago aprobado |
| `course_payment_rejected` | `body-email.tsx` | Rechazo de voucher de curso |
| `course_certificate` | `course-certificate.tsx` | Envío de certificado (PDF adjunto) |
| `course_feedback` | `body-email.tsx` | Enlace de encuesta de curso |
| `branded_content` | `body-email.tsx` | Votaciones: prueba, convocatoria, inicio, recordatorio, confirmación, cierre, resultados |

Quedan fuera de este ciclo (no hay disparador implementado): congresos/SSOTER, newsletter semanal, cumpleaños automatizado, desafiliación, recordatorio de membresía. Esas plantillas se pueden reutilizar después.

### Historias de Usuario

#### HU-01: Transporte Mailtrap real

```
Como:        Operador del sistema
Quiero:      Que los correos salgan por Mailtrap y no por print()
Para:        Verlos en la bandeja de Mailtrap con HTML y asunto reales

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Backend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: envío SMTP
  Dado que:  SMTP_HOST/USER/PASSWORD están configurados con Mailtrap
  Cuando:    un caso de uso dispara un correo
  Entonces:  se entrega por SMTP (STARTTLS) y aparece en Mailtrap con From, To, Subject y HTML
```

**Error Path**
```gherkin
CRITERIO-1.2: falla de transporte
  Dado que:  Mailtrap rechaza la conexión
  Cuando:    se intenta enviar un correo de operación (aprobar, inscribir, votar)
  Entonces:  la operación principal no se pierde; el error queda registrado
```

**Edge Case**
```gherkin
CRITERIO-1.3: sin SMTP en tests
  Dado que:  SMTP_HOST está vacío (tests)
  Cuando:    un adaptador envía
  Entonces:  no abre socket; deja rastro en log y no rompe el caso de uso
```

#### HU-02: Diseño institucional clonado

```
Como:        Destinatario (miembro, invitado o admin)
Quiero:      Recibir el correo con logo, textos y pie de COPSSTEC
Para:        Reconocer que el mensaje es oficial y poder actuar (entrar, pagar, votar)

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Backend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: layout base
  Dado que:  se renderiza cualquier plantilla
  Cuando:    se genera el HTML
  Entonces:  incluye logo https://www.copsstec.com/assets/logos/coppstec.png,
             contenedor con borde #eaeaea, tipografía sans y pie
             "COPSSTEC WEB / Quito, Ecuador"
```

**Happy Path**
```gherkin
CRITERIO-2.2: credenciales
  Dado que:  se aprueba un miembro o se reenvían credenciales
  Cuando:    se envían los dos correos
  Entonces:  el personal usa el diseño de new-email.tsx (buzón + botón Ir a mi correo)
             y el corporativo/login usa new-credentials.tsx (acceso al portal)
```

#### HU-03: Recuperación de contraseña por correo

```
Como:        Usuario que olvidó su contraseña
Quiero:      Recibir un correo con enlace y token para restablecerla
Para:        Entrar de nuevo sin pedirle el token al administrador

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01, HU-02
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: forgot-password envía HTML
  Dado que:  existe un usuario con ese email
  Cuando:    solicita recuperación
  Entonces:  se guarda el token, se envía password_reset por Mailtrap
             con enlace {FRONTEND_ORIGIN}/reset-password?email=&token=
             y la API sigue devolviendo mensaje genérico
```

**Error Path**
```gherkin
CRITERIO-3.2: email inexistente
  Dado que:  el correo no existe
  Cuando:    solicita recuperación
  Entonces:  la API responde igual (no filtra existencia) y no envía correo
```

**Edge Case**
```gherkin
CRITERIO-3.3: entorno local
  Dado que:  APP_ENV es local
  Cuando:    la solicitud tiene éxito
  Entonces:  además del correo, la API puede devolver reset_token para pruebas
```

#### HU-04: Cursos y votaciones dejan de loguear

```
Como:        Administrador
Quiero:      Que inscripciones, certificados, encuestas y mensajes electorales lleguen diseñados
Para:        Completar los flujos de SPEC-003 y SPEC-009 sin revisar la consola del backend

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01, HU-02
Capa:        Backend
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: cursos
  Dado que:  se inscribe, aprueba, rechaza, envía certificado o encuesta
  Cuando:    el use case notifica
  Entonces:  el destinatario recibe HTML de la plantilla correspondiente;
             el certificado viaja como adjunto PDF
```

**Happy Path**
```gherkin
CRITERIO-4.2: votaciones
  Dado que:  se envía prueba o se dispara una plantilla electoral
  Cuando:    el cuerpo es HTML de TinyMCE
  Entonces:  se envía multipart (texto + HTML) envuelto en branded_content
             con logo y pie; no se imprime solo el cuerpo en consola
```

### Reglas de Negocio
1. El envío real exige `SMTP_HOST`. Si falta, se registra en log (solo tests / máquina sin Mailtrap).
2. Todo correo transaccional es multipart: texto plano + HTML.
3. El HTML clona el diseño de `react-emails`: logo, contenedor 465–500px, botón negro o azul, pie institucional.
4. Fallo de correo no revierte afiliación, inscripción, voto ni generación de certificado.
5. Recuperación de contraseña no revela si el email existe.
6. Credenciales temporales nunca se exponen en la respuesta HTTP de producción; solo viajan por correo.
7. Adjuntos se limitan a PDFs de certificado existentes en disco.
8. Variables sensibles (usuario/clave Mailtrap) viven en `.env`, no en el código.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| — | — | ninguno | No hay tablas nuevas. Se reutilizan `password_reset_tokens`, `election_message_logs` y certificados. |

#### Campos del modelo
No aplica. El contrato vive en configuración y en el catálogo de plantillas.

#### Índices / Constraints
- Ninguno.

### Configuración

| Variable | Default | Descripción |
|----------|---------|-------------|
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` | Host Mailtrap |
| `SMTP_PORT` | `587` | Puerto STARTTLS |
| `SMTP_USER` | (inbox Mailtrap del proyecto anterior) | Usuario SMTP |
| `SMTP_PASSWORD` | (inbox Mailtrap del proyecto anterior) | Clave SMTP |
| `SMTP_FROM` | `COPSSTEC <no-reply@copsstec.com>` | Remitente |
| `SMTP_USE_TLS` | `true` | STARTTLS |
| `MAIL_LOGO_URL` | `https://www.copsstec.com/assets/logos/coppstec.png` | Logo de las plantillas |
| `MAIL_SUPPORT_EMAIL` | `soporte@copsstec.com` | Enlace de contacto del pie |
| `MAIL_ADMIN_NOTIFICATIONS` | `administrator@copsstec.com` | Destino de `new_member_admin` |
| `MAILBOX_WEB_URL` | `https://box.copsstec.com/mail/` | CTA de `corporate_mailbox` |

### API Endpoints

No se agregan rutas nuevas. Se reutilizan:

| Endpoint | Cambio |
|----------|--------|
| `POST /api/auth/forgot-password` | Además de persistir token, envía `password_reset` |
| `POST /api/members` | Credenciales con HTML `access_credentials` |
| `POST /api/members/{id}/resend-credentials` | HTML `corporate_mailbox` + `access_credentials` |
| `POST /api/membership/register` | Notifica admin con `new_member_admin` |
| `POST /api/members/{id}/approve` (afiliación) | HTML `corporate_mailbox` + `access_credentials` |
| Endpoints de cursos (inscripción, pago, certificado, feedback) | HTML según clave |
| `POST /api/votaciones/admin/messages/test` y envío masivo | HTML `branded_content` |

Request/response de esos endpoints no cambian.

### Diseño Frontend

#### Componentes nuevos
Ninguno. Las plantillas se renderizan en el backend (el servidor Python no ejecuta React Email).

#### Páginas afectadas
| Página | Archivo | Cambio |
|--------|---------|--------|
| Recuperar contraseña | `forgot-password-form.tsx` | Texto: el correo se envió; el token local solo si viene |
| Restablecer | `reset-password-form.tsx` | Prefill `email` y `token` desde query string del enlace |

### Arquitectura y Dependencias
- Paquetes nuevos: ninguno (smtplib + email.message de stdlib).
- Servicio externo: Mailtrap Sandbox SMTP (`sandbox.smtp.mailtrap.io`).
- Capa compartida nueva:

```text
app/shared/infrastructure/email/
  sender.py       # MailtrapEmailSender (HTML + adjuntos)
  templates.py    # render_email(template_key, context) → subject, text, html
  messages.py     # OutgoingEmail
```

- Adaptadores de módulo (`membership/email.py`, `members/notifications.py`, `courses/notifications.py`, `votaciones/notifications.py`) delegan al sender compartido. Los use cases no conocen SMTP.
- Dirección de dependencias: infrastructure → shared; application solo ve Ports.

### Notas de Implementación
> Clonar el diseño de react-emails a HTML de tablas (clientes de correo). No montar Node ni `@react-email/components` en el backend.
> Reutilizar las credenciales Mailtrap del `.env` de `copsstec-web` (inbox sandbox).
> `SmtpOrLogEmailSender` permanece como fachada para no romper imports; implementa `send` y `send_html`.
> Tests unitarios no deben abrir SMTP: `SMTP_HOST` vacío o sender fake.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend

#### Implementación
- [x] Agregar settings Mailtrap / logo / admin notifications
- [x] Crear `app/shared/infrastructure/email` (sender + plantillas HTML)
- [x] Escribir plantillas: credenciales, buzón corporativo, reset, nuevo miembro, cursos, layout votaciones
- [x] Reemplazar `LogMemberNotifier` y `LogEmailNotifier` por envío HTML
- [x] Aprobar afiliación y reenviar credenciales con plantillas diseñadas
- [x] Notificar admin al registrar afiliación
- [x] Enviar `password_reset` desde `ForgotPasswordUseCase`
- [x] Envolver mensajes de votaciones en `branded_content`
- [x] Adjunto PDF en certificado de curso
- [x] Cargar variables en `backend/.env` y `backend/.env.example`

#### Tests Backend
- [x] `test_email_templates_include_logo_and_copy` — cada plantilla tiene logo y textos
- [x] `test_email_sender_logs_when_smtp_missing` — no abre socket
- [x] `test_forgot_password_sends_reset_template` — dispara plantilla si el usuario existe
- [x] Mantener `test_resend_credentials_*` y tests de votaciones/cursos

### Frontend

#### Implementación
- [x] Prefill de `/reset-password` con query `email` y `token`
- [x] Copy de forgot-password: aviso de correo enviado

#### Tests Frontend
- [x] No aplica (cambio de copy + query params)

### QA
- [x] Envío SMTP real a Mailtrap (`access_credentials` y `branded_content`)
- [ ] Reenviar credenciales y ver ambas plantillas en la bandeja
- [ ] Solicitar recuperación y abrir el enlace
- [ ] Inscribir/aprobar curso y ver correo
- [x] Actualizar estado spec: `status: IMPLEMENTED`
