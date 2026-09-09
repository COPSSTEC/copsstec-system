---
id: SPEC-003
status: IN_PROGRESS
feature: gestion-publica-cursos
created: 2026-09-09
updated: 2026-09-09
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002"]
---

# Spec: Gestión Pública y Administrativa de Cursos

> **Estado:** `IN_PROGRESS`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Crear una landing pública y una sección pública de cursos fuera del login, alimentada desde la tabla `courses`. Agregar un módulo administrativo para gestionar cursos, inscripciones, pagos, asistencia, certificados, envíos por correo, reportes y encuestas públicas de experiencia.

### Requerimiento de Negocio
El usuario necesita una página pública para mostrar los cursos que ofrece la empresa, separada del login, con landing y catálogo de cursos obtenido desde `courses`. El administrador debe tener un apartado de cursos para hacer CRUD completo con los datos existentes en BD. Debe poder inscribir usuarios del sistema con rol `miembro` sin cobro, permitir inscripción de personas externas mediante formulario público, solicitar voucher si el curso tiene precio mayor a cero, aprobar o rechazar pagos con observación, enviar notificaciones por correo, gestionar asistencia, emitir certificados PDF individual o masivamente, descargar certificados, marcar cursos finalizados, generar reportes de asistentes y crear enlaces públicos para calificar la experiencia usando datos de miembros e invitados inscritos.

### Historias de Usuario

#### HU-01: Ver landing pública y catálogo de cursos

```text
Como:        Visitante público
Quiero:      Ver una landing y una sección de cursos sin iniciar sesión
Para:        Conocer la oferta de capacitación de la empresa e inscribirme

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: listado público de cursos visibles
  Dado que:  existen cursos en courses con state_id visible y sin deleted_at
  Cuando:    un visitante entra a /cursos
  Entonces:  ve tarjetas con título, valor, modalidad, fechas, horario, ubicación, capacitador, descripción e imagen
```

**Error Path**
```gherkin
CRITERIO-1.2: curso no disponible
  Dado que:  un curso está oculto o eliminado lógicamente
  Cuando:    un visitante intenta abrir su detalle público
  Entonces:  el sistema responde 404 o muestra estado de no disponible
```

**Edge Case**
```gherkin
CRITERIO-1.3: curso gratuito
  Dado que:  un curso visible tiene value igual a 0
  Cuando:    se muestra en el catálogo
  Entonces:  aparece identificado como gratuito y no solicita voucher al inscribirse
```

#### HU-02: Administrar cursos

```text
Como:        Administrador
Quiero:      Crear, editar, listar, ocultar y eliminar cursos
Para:        Mantener actualizada la oferta pública

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: CRUD administrativo
  Dado que:  el usuario autenticado tiene access_level admin
  Cuando:    crea o edita un curso con datos válidos
  Entonces:  el backend persiste todos los campos de courses y el frontend refleja el cambio
```

**Error Path**
```gherkin
CRITERIO-2.2: acceso no autorizado
  Dado que:  un usuario no admin intenta gestionar cursos
  Cuando:    llama endpoints administrativos de cursos
  Entonces:  recibe 403 y no se modifica la información
```

**Edge Case**
```gherkin
CRITERIO-2.3: eliminación de curso con inscripciones
  Dado que:  un curso tiene inscripciones asociadas
  Cuando:    el administrador lo elimina
  Entonces:  se aplica eliminación lógica con deleted_at/deleted_by y no se pierden reportes históricos
```

#### HU-03: Inscribir miembros del sistema sin pago

```text
Como:        Administrador o Miembro autenticado
Quiero:      Registrar miembros existentes en cursos
Para:        Que los miembros puedan participar sin pagar aunque el curso tenga valor

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: inscripción de miembro gratuita
  Dado que:  existe un usuario activo con rol miembro
  Cuando:    se inscribe a un curso con value mayor que 0
  Entonces:  la inscripción queda confirmada sin pago y se envía correo de confirmación
```

**Error Path**
```gherkin
CRITERIO-3.2: inscripción duplicada
  Dado que:  el miembro ya está inscrito en el curso
  Cuando:    intenta inscribirse nuevamente
  Entonces:  el sistema rechaza la operación con 409
```

**Edge Case**
```gherkin
CRITERIO-3.3: usuario sin perfil completo
  Dado que:  un usuario miembro no tiene profile asociado
  Cuando:    intenta inscribirse
  Entonces:  el sistema solicita completar o validar los datos mínimos necesarios
```

#### HU-04: Inscribir invitados externos con voucher cuando aplica

```text
Como:        Visitante externo
Quiero:      Completar un formulario público para inscribirme a un curso
Para:        Participar aunque no tenga cuenta en el sistema

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: inscripción externa pagada pendiente de aprobación
  Dado que:  el curso tiene value mayor que 0
  Cuando:    el invitado envía sus datos y adjunta voucher de pago válido como imagen
  Entonces:  la inscripción queda en estado por aprobar y se notifica al invitado por correo
```

**Happy Path**
```gherkin
CRITERIO-4.2: inscripción externa gratuita
  Dado que:  el curso tiene value igual a 0
  Cuando:    el invitado envía sus datos obligatorios
  Entonces:  la inscripción queda confirmada sin voucher y se envía correo de confirmación
```

**Error Path**
```gherkin
CRITERIO-4.3: voucher requerido
  Dado que:  el curso tiene value mayor que 0
  Cuando:    el invitado envía el formulario sin voucher
  Entonces:  el backend responde 400 indicando que el voucher es obligatorio
```

#### HU-05: Aprobar o rechazar pagos externos

```text
Como:        Administrador
Quiero:      Revisar vouchers de invitados externos y aprobarlos o rechazarlos con observación
Para:        Controlar quién queda inscrito en cursos pagados

Prioridad:   Alta
Estimación:  M
Dependencias: HU-04
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: aprobación de pago
  Dado que:  existe una inscripción externa con voucher en estado por aprobar
  Cuando:    el administrador aprueba el pago
  Entonces:  la inscripción queda pagada/confirmada y se envía correo de aprobación
```

**Error Path**
```gherkin
CRITERIO-5.2: rechazo de pago con observación
  Dado que:  existe una inscripción externa con voucher en estado por aprobar
  Cuando:    el administrador rechaza el pago e ingresa una observación
  Entonces:  la inscripción queda rechazada y se envía correo con la observación
```

#### HU-06: Gestionar asistencia y certificados

```text
Como:        Administrador
Quiero:      Marcar asistentes, finalizar cursos y emitir certificados PDF
Para:        Entregar certificados solamente a quienes asistieron

Prioridad:   Alta
Estimación:  XL
Dependencias: HU-03, HU-04, HU-05
Capa:        Ambas
```

#### Criterios de Aceptación — HU-06

**Happy Path**
```gherkin
CRITERIO-6.1: emisión individual de certificado
  Dado que:  una persona inscrita tiene asistencia marcada
  Cuando:    el administrador genera su certificado
  Entonces:  se crea un PDF con plantilla base y queda disponible para descargar o enviar por correo
```

**Happy Path**
```gherkin
CRITERIO-6.2: envío masivo de certificados
  Dado que:  existen asistentes seleccionados sin certificado enviado
  Cuando:    el administrador selecciona varios y ejecuta enviar certificados
  Entonces:  el sistema genera/envía los PDFs y registra cuáles quedaron enviados
```

**Error Path**
```gherkin
CRITERIO-6.3: certificado sin asistencia
  Dado que:  una inscripción no tiene asistencia marcada
  Cuando:    el administrador intenta emitir certificado
  Entonces:  el sistema rechaza la emisión indicando que no asistió
```

#### HU-07: Reporte de asistentes

```text
Como:        Administrador
Quiero:      Ver y exportar un informe de asistentes por curso
Para:        Controlar participación, pagos, asistencia y certificados

Prioridad:   Media
Estimación:  M
Dependencias: HU-03, HU-04, HU-06
Capa:        Ambas
```

#### Criterios de Aceptación — HU-07

**Happy Path**
```gherkin
CRITERIO-7.1: reporte filtrable
  Dado que:  un curso tiene inscripciones de miembros e invitados
  Cuando:    el administrador abre el informe
  Entonces:  ve nombre, email, tipo de participante, estado, pago, asistencia, certificado y fecha de inscripción
```

**Edge Case**
```gherkin
CRITERIO-7.2: curso sin asistentes
  Dado que:  un curso no tiene inscritos confirmados
  Cuando:    el administrador abre el informe
  Entonces:  ve un estado vacío claro y opción de volver al listado
```

#### HU-08: Calificar experiencia del curso

```text
Como:        Asistente inscrito
Quiero:      Acceder a un link público para calificar la experiencia
Para:        Enviar retroalimentación sin iniciar sesión

Prioridad:   Media
Estimación:  L
Dependencias: HU-03, HU-04, HU-06
Capa:        Ambas
```

#### Criterios de Aceptación — HU-08

**Happy Path**
```gherkin
CRITERIO-8.1: evaluación pública con token
  Dado que:  una inscripción confirmada tiene link de evaluación generado
  Cuando:    el asistente abre el link y envía su calificación
  Entonces:  el sistema registra la evaluación asociada al curso y a la inscripción
```

**Error Path**
```gherkin
CRITERIO-8.2: link inválido o expirado
  Dado que:  el token de evaluación no existe o expiró
  Cuando:    alguien intenta enviar la encuesta
  Entonces:  el sistema responde 404 o muestra que el enlace ya no está disponible
```

### Reglas de Negocio
1. La landing y `/cursos` son públicas y no requieren token.
2. El login actual debe seguir en `/login`; la raíz `/` debe convertirse en landing pública.
3. Solo cursos con `state_id = 4` (`visible`) y `deleted_at IS NULL` aparecen públicamente.
4. El CRUD administrativo de cursos requiere acceso `admin`.
5. Los campos existentes de `courses` deben mantenerse: `state_id`, `created_by`, `title`, `value`, `location`, `capacitator`, `capacitator_about`, `date_course`, `hour_init`, `hour_final`, `about`, `image`, `date_course_final`, `type_modality`, `link`, `deleted_at`, `deleted_by`, `created_at`, `updated_at`.
6. `value` se debe tratar como monto decimal aunque la tabla actual sea `character varying`; validar que represente número mayor o igual a cero.
7. Un usuario con rol `miembro` no paga cursos, incluso si `courses.value` es mayor que cero.
8. Un invitado externo debe pagar si `courses.value` es mayor que cero y debe adjuntar voucher en formato imagen permitido.
9. Los invitados externos quedan confirmados inmediatamente solo si el curso es gratuito; si es pagado quedan `por aprobar` hasta validación administrativa.
10. No debe existir más de una inscripción activa por curso para el mismo `user_id` o el mismo email/identifier externo.
11. La aprobación de pago cambia el estado de la inscripción a `pagado` o confirmado; el rechazo cambia a `rechazado` y exige observación.
12. Toda inscripción, aprobación, rechazo y envío de certificado debe intentar notificar por correo.
13. La falla de correo no debe perder la operación principal; debe registrarse para reintento o auditoría.
14. Un certificado solo se puede generar para una inscripción confirmada con asistencia marcada.
15. El envío masivo de certificados debe ser idempotente: no debe duplicar certificados ni marcar enviados dos veces sin registro.
16. Un curso puede marcarse como finalizado solo por un administrador.
17. La encuesta pública debe usar token no predecible y asociarse a una inscripción confirmada.
18. Una inscripción solo puede responder una encuesta por token salvo que el administrador regenere el enlace.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Course` | tabla `courses` | existente / modificada lógicamente | Oferta de cursos publicada y administrada |
| `CourseInscription` | tabla `course_inscriptions` | nueva | Inscripciones de miembros e invitados |
| `CoursePayment` | tabla `course_payments` | nueva | Voucher y revisión de pago para invitados externos |
| `CourseCertificate` | tabla `course_certificates` | nueva | Certificados PDF generados y enviados |
| `CourseFeedbackToken` | tabla `course_feedback_tokens` | nueva | Links públicos seguros para evaluación |
| `CourseFeedback` | tabla `course_feedbacks` | nueva | Calificación y comentarios de experiencia |
| `User` | tabla `users` | existente | Usuarios internos del sistema |
| `Profile` | tabla `profiles` | existente | Datos personales/académicos del miembro |
| `State` | tabla `states` | existente | Estados reutilizables del sistema |

#### Campos del modelo `courses` existente
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | auto-generado | Identificador del curso |
| `state_id` | bigint | sí | FK `states.id` | Visibilidad o estado general |
| `created_by` | bigint | sí | FK `users.id` | Administrador creador |
| `title` | varchar | sí | no vacío | Nombre público del curso |
| `value` | varchar | sí | decimal >= 0 | Precio del curso |
| `location` | varchar | sí | no vacío | Lugar o país/ciudad |
| `capacitator` | varchar | sí | no vacío | Nombre del capacitador |
| `capacitator_about` | text | sí | no vacío | Biografía del capacitador |
| `date_course` | varchar | sí | formato actual `dd/mm/yyyy` | Fecha de inicio |
| `date_course_final` | varchar | sí | formato actual `dd/mm/yyyy` | Fecha final |
| `hour_init` | varchar | sí | formato hora | Hora de inicio |
| `hour_final` | varchar | sí | formato hora | Hora de fin |
| `about` | text | sí | no vacío | Descripción del curso |
| `image` | text | sí | ruta o URL | Imagen pública |
| `type_modality` | varchar | no | `Online`, `Presencial`, `Híbrido` | Modalidad |
| `link` | varchar | no | URL válida si online | Enlace del curso |
| `deleted_at` | varchar | no | timestamp/string heredado | Eliminación lógica |
| `deleted_by` | varchar | no | user id/string heredado | Usuario que eliminó |
| `created_at` | timestamp | no | automático | Fecha de creación |
| `updated_at` | timestamp | no | automático | Fecha de actualización |

#### Campos propuestos `course_inscriptions`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | auto-generado | Identificador |
| `course_id` | bigint | sí | FK `courses.id` | Curso inscrito |
| `state_id` | bigint | sí | FK `states.id` | `inscrito`, `por aprobar`, `pagado`, `rechazado`, `asistio` según flujo |
| `participant_type` | varchar | sí | `member` / `guest` | Tipo de participante |
| `user_id` | bigint | no | FK `users.id` | Usuario interno si es miembro |
| `profile_id` | bigint | no | FK `profiles.id` | Perfil capturado para miembro |
| `names` | text | sí | no vacío | Nombres completos normalizados |
| `email` | text | sí | email válido | Correo de contacto |
| `identifier` | text | sí | no vacío | Cédula/RUC/pasaporte |
| `cellphone` | varchar | no | teléfono | Teléfono |
| `country` | text | no | texto | País |
| `province` | text | no | texto | Provincia |
| `city` | text | no | texto | Ciudad |
| `organization` | varchar | no | texto | Empresa/institución |
| `attended_at` | timestamp | no | fecha válida | Marca de asistencia |
| `completed_at` | timestamp | no | fecha válida | Participación finalizada |
| `deleted_at` | varchar | no | heredado | Eliminación lógica |
| `deleted_by` | varchar | no | heredado | Usuario que elimina |
| `created_at` | timestamp | no | automático | Fecha de registro |
| `updated_at` | timestamp | no | automático | Fecha de actualización |

#### Campos propuestos `course_payments`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | auto-generado | Identificador |
| `course_id` | bigint | sí | FK `courses.id` | Curso pagado |
| `course_inscription_id` | bigint | sí | FK `course_inscriptions.id` | Inscripción asociada |
| `state_id` | bigint | sí | FK `states.id` | `por aprobar`, `pagado`, `rechazado` |
| `voucher_path` | text | sí para pagados | imagen permitida | Ruta/URL del voucher |
| `amount` | varchar | sí | decimal >= 0 | Valor reportado |
| `reference` | varchar | no | texto | Referencia bancaria si aplica |
| `admin_observation` | text | no | requerido al rechazar | Observación de rechazo |
| `reviewed_by` | bigint | no | FK `users.id` | Admin que revisa |
| `reviewed_at` | timestamp | no | fecha válida | Fecha de revisión |
| `created_at` | timestamp | no | automático | Fecha de carga |
| `updated_at` | timestamp | no | automático | Fecha de actualización |

#### Campos propuestos `course_certificates`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | auto-generado | Identificador |
| `course_id` | bigint | sí | FK `courses.id` | Curso |
| `course_inscription_id` | bigint | sí | FK `course_inscriptions.id` | Participante |
| `certificate_code` | varchar | sí | único | Código verificable |
| `pdf_path` | text | sí | ruta/URL | Archivo PDF generado |
| `sent_at` | timestamp | no | fecha válida | Fecha de envío por correo |
| `sent_by` | bigint | no | FK `users.id` | Admin que envió |
| `created_at` | timestamp | no | automático | Fecha de generación |
| `updated_at` | timestamp | no | automático | Fecha de actualización |

#### Campos propuestos `course_feedback_tokens`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | auto-generado | Identificador |
| `course_id` | bigint | sí | FK `courses.id` | Curso evaluado |
| `course_inscription_id` | bigint | sí | FK `course_inscriptions.id` | Participante |
| `token_hash` | varchar | sí | único | Hash de token público |
| `expires_at` | timestamp | no | fecha válida | Expiración opcional |
| `used_at` | timestamp | no | fecha válida | Fecha de uso |
| `created_at` | timestamp | no | automático | Fecha de generación |
| `updated_at` | timestamp | no | automático | Fecha de actualización |

#### Campos propuestos `course_feedbacks`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | auto-generado | Identificador |
| `course_id` | bigint | sí | FK `courses.id` | Curso evaluado |
| `course_inscription_id` | bigint | sí | FK `course_inscriptions.id` | Participante |
| `rating` | int | sí | 1 a 5 | Calificación general |
| `content_rating` | int | no | 1 a 5 | Calidad del contenido |
| `instructor_rating` | int | no | 1 a 5 | Calificación del capacitador |
| `platform_rating` | int | no | 1 a 5 | Logística/plataforma |
| `comments` | text | no | max razonable | Comentarios abiertos |
| `created_at` | timestamp | no | automático | Fecha de respuesta |
| `updated_at` | timestamp | no | automático | Fecha de actualización |

#### Índices / Constraints
- `course_inscriptions(course_id, user_id)` único parcial cuando `user_id IS NOT NULL AND deleted_at IS NULL`.
- `course_inscriptions(course_id, lower(email), identifier)` único lógico para invitados activos.
- `course_inscriptions(course_id, state_id)` para reportes y filtros administrativos.
- `course_payments(course_inscription_id)` índice para revisión de pagos.
- `course_certificates(course_inscription_id)` único para evitar duplicados.
- `course_certificates(certificate_code)` único para validación futura.
- `course_feedback_tokens(token_hash)` único.
- `course_feedbacks(course_inscription_id)` único para una respuesta por inscripción.

### API Endpoints

#### GET /api/courses/public
- **Descripción**: Lista cursos visibles para landing/catálogo.
- **Auth requerida**: no.
- **Response 200**:
  ```json
  [
    {
      "id": 11,
      "title": "Cálculo de la responsabilidad patronal",
      "value": "0",
      "location": "Ecuador",
      "capacitator": "string",
      "capacitator_about": "string",
      "date_course": "31/08/2026",
      "date_course_final": "31/08/2026",
      "hour_init": "string",
      "hour_final": "string",
      "about": "string",
      "image": "string",
      "type_modality": "Online",
      "link": "string"
    }
  ]
  ```

#### GET /api/courses/public/{course_id}
- **Descripción**: Obtiene detalle público de un curso visible.
- **Auth requerida**: no.
- **Response 200**: curso completo público.
- **Response 404**: curso no visible/no existe.

#### POST /api/courses/public/{course_id}/guest-inscriptions
- **Descripción**: Registra invitado externo.
- **Auth requerida**: no.
- **Request Body**: `multipart/form-data` con datos personales y `voucher` opcional/obligatorio según precio.
- **Response 201**:
  ```json
  {
    "id": 1,
    "course_id": 11,
    "state": "por aprobar",
    "message": "Inscripción recibida correctamente."
  }
  ```
- **Response 400**: datos inválidos o voucher requerido.
- **Response 404**: curso no disponible.
- **Response 409**: inscripción duplicada.

#### GET /api/courses/admin
- **Descripción**: Lista cursos para administración con filtros por estado, texto y fechas.
- **Auth requerida**: admin.
- **Response 200**: cursos con conteos de inscritos, pagos pendientes, asistentes y certificados enviados.
- **Response 401/403**: sesión ausente o sin permisos.

#### POST /api/courses/admin
- **Descripción**: Crea un curso.
- **Auth requerida**: admin.
- **Request Body**:
  ```json
  {
    "state_id": 4,
    "title": "string",
    "value": "0",
    "location": "string",
    "capacitator": "string",
    "capacitator_about": "string",
    "date_course": "dd/mm/yyyy",
    "date_course_final": "dd/mm/yyyy",
    "hour_init": "HH:mm",
    "hour_final": "HH:mm",
    "about": "string",
    "image": "string",
    "type_modality": "Online",
    "link": "https://..."
  }
  ```
- **Response 201**: curso creado.
- **Response 400**: validación fallida.

#### GET /api/courses/admin/{course_id}
- **Descripción**: Obtiene detalle administrativo del curso.
- **Auth requerida**: admin.
- **Response 200**: curso con métricas y datos administrativos.
- **Response 404**: no encontrado.

#### PUT /api/courses/admin/{course_id}
- **Descripción**: Actualiza datos del curso.
- **Auth requerida**: admin.
- **Request Body**: campos editables de `courses`.
- **Response 200**: curso actualizado.
- **Response 400**: validación fallida.
- **Response 404**: no encontrado.

#### DELETE /api/courses/admin/{course_id}
- **Descripción**: Elimina lógicamente un curso.
- **Auth requerida**: admin.
- **Response 204**: eliminado.
- **Response 404**: no encontrado.

#### POST /api/courses/admin/{course_id}/member-inscriptions
- **Descripción**: Inscribe uno o varios usuarios existentes con rol `miembro`.
- **Auth requerida**: admin.
- **Request Body**:
  ```json
  { "user_ids": [1, 2, 3] }
  ```
- **Response 201**: resumen de inscritos, omitidos y errores.
- **Response 400**: usuarios inválidos.
- **Response 409**: todos ya estaban inscritos.

#### GET /api/courses/admin/{course_id}/inscriptions
- **Descripción**: Lista inscripciones del curso.
- **Auth requerida**: admin.
- **Response 200**: miembros e invitados con pago, asistencia, certificado y feedback.

#### POST /api/courses/admin/inscriptions/{inscription_id}/approve-payment
- **Descripción**: Aprueba pago de invitado externo.
- **Auth requerida**: admin.
- **Response 200**: inscripción confirmada y pago aprobado.
- **Response 400**: inscripción no requiere pago o estado inválido.
- **Response 404**: inscripción no encontrada.

#### POST /api/courses/admin/inscriptions/{inscription_id}/reject-payment
- **Descripción**: Rechaza pago con observación.
- **Auth requerida**: admin.
- **Request Body**:
  ```json
  { "observation": "Comprobante ilegible o valor incorrecto." }
  ```
- **Response 200**: pago rechazado y correo programado/enviado.
- **Response 400**: observación faltante.

#### PATCH /api/courses/admin/inscriptions/{inscription_id}/attendance
- **Descripción**: Marca o desmarca asistencia.
- **Auth requerida**: admin.
- **Request Body**:
  ```json
  { "attended": true }
  ```
- **Response 200**: inscripción actualizada.

#### POST /api/courses/admin/{course_id}/finish
- **Descripción**: Marca curso como finalizado.
- **Auth requerida**: admin.
- **Response 200**: curso finalizado o estado administrativo equivalente.

#### POST /api/courses/admin/inscriptions/{inscription_id}/certificate
- **Descripción**: Genera certificado PDF individual.
- **Auth requerida**: admin.
- **Response 201**:
  ```json
  { "certificate_id": 1, "certificate_code": "CUR-2026-000001", "pdf_url": "string" }
  ```
- **Response 400**: sin asistencia o inscripción no confirmada.

#### POST /api/courses/admin/{course_id}/certificates/send
- **Descripción**: Genera y/o envía certificados a varias inscripciones seleccionadas.
- **Auth requerida**: admin.
- **Request Body**:
  ```json
  { "inscription_ids": [1, 2, 3] }
  ```
- **Response 200**: resumen de enviados, ya enviados y fallidos.

#### GET /api/courses/admin/{course_id}/attendees-report
- **Descripción**: Reporte de asistentes.
- **Auth requerida**: admin.
- **Query Params**: `format=json|csv`, `state_id`, `participant_type`, `attended`.
- **Response 200**: JSON o archivo CSV.

#### POST /api/courses/admin/{course_id}/feedback-links
- **Descripción**: Genera links públicos de evaluación para asistentes confirmados.
- **Auth requerida**: admin.
- **Request Body**:
  ```json
  { "inscription_ids": [1, 2, 3], "expires_at": "2026-12-31T23:59:59" }
  ```
- **Response 200**: links generados por inscripción.

#### GET /api/courses/feedback/{token}
- **Descripción**: Obtiene datos mínimos públicos para responder encuesta.
- **Auth requerida**: no.
- **Response 200**: curso y participante enmascarado.
- **Response 404**: token inválido/expirado.

#### POST /api/courses/feedback/{token}
- **Descripción**: Envía evaluación pública.
- **Auth requerida**: no.
- **Request Body**:
  ```json
  {
    "rating": 5,
    "content_rating": 5,
    "instructor_rating": 5,
    "platform_rating": 4,
    "comments": "Excelente curso."
  }
  ```
- **Response 201**: evaluación registrada.
- **Response 400**: calificación inválida o token ya usado.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `PublicLandingPage` | `modules/courses/presentation/pages/public-landing-page.tsx` | ninguno | Landing pública en `/` |
| `PublicCoursesPage` | `modules/courses/presentation/pages/public-courses-page.tsx` | ninguno | Catálogo público |
| `PublicCourseDetailPage` | `modules/courses/presentation/pages/public-course-detail-page.tsx` | `courseId` | Detalle e inscripción |
| `CourseCard` | `modules/courses/presentation/components/course-card.tsx` | `course` | Tarjeta de curso |
| `GuestInscriptionForm` | `modules/courses/presentation/forms/guest-inscription-form.tsx` | `course` | Formulario público con voucher |
| `AdminCoursesPage` | `modules/courses/presentation/pages/admin-courses-page.tsx` | ninguno | Listado y acciones admin |
| `CourseForm` | `modules/courses/presentation/forms/course-form.tsx` | `initialValues`, `onSubmit` | Alta/edición |
| `CourseInscriptionsPanel` | `modules/courses/presentation/components/course-inscriptions-panel.tsx` | `courseId` | Gestión de inscritos |
| `PaymentReviewPanel` | `modules/courses/presentation/components/payment-review-panel.tsx` | `inscription` | Aprobar/rechazar pagos |
| `AttendanceChecklist` | `modules/courses/presentation/components/attendance-checklist.tsx` | `inscriptions` | Marcar asistencia |
| `CertificateActions` | `modules/courses/presentation/components/certificate-actions.tsx` | `selectedIds` | Generar, descargar y enviar certificados |
| `FeedbackFormPage` | `modules/courses/presentation/pages/feedback-form-page.tsx` | `token` | Encuesta pública |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Landing | `src/app/page.tsx` | `/` | no |
| Login | existente | `/login` | no |
| Cursos públicos | `src/app/(public)/cursos/page.tsx` | `/cursos` | no |
| Detalle público | `src/app/(public)/cursos/[course_id]/page.tsx` | `/cursos/[course_id]` | no |
| Encuesta pública | `src/app/(public)/cursos/feedback/[token]/page.tsx` | `/cursos/feedback/[token]` | no |
| Admin cursos | `src/app/(protected)/admin/cursos/page.tsx` | `/admin/cursos` | sí, admin |
| Admin curso detalle | `src/app/(protected)/admin/cursos/[course_id]/page.tsx` | `/admin/cursos/[course_id]` | sí, admin |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `usePublicCourses` | `modules/courses/presentation/hooks/use-public-courses.ts` | `{ courses, loading, error }` | Consulta cursos públicos |
| `useAdminCourses` | `modules/courses/presentation/hooks/use-admin-courses.ts` | `{ courses, actions }` | CRUD administrativo |
| `useCourseInscriptions` | `modules/courses/presentation/hooks/use-course-inscriptions.ts` | `{ inscriptions, actions }` | Pagos, asistencia y certificados |
| `useCourseFeedback` | `modules/courses/presentation/hooks/use-course-feedback.ts` | `{ course, submit }` | Encuesta pública |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listPublicCourses()` | `modules/courses/infrastructure/courses-api.ts` | `GET /api/courses/public` |
| `getPublicCourse(courseId)` | `modules/courses/infrastructure/courses-api.ts` | `GET /api/courses/public/{course_id}` |
| `createGuestInscription(courseId, input)` | `modules/courses/infrastructure/courses-api.ts` | `POST /api/courses/public/{course_id}/guest-inscriptions` |
| `listAdminCourses(token, filters)` | `modules/courses/infrastructure/courses-api.ts` | `GET /api/courses/admin` |
| `createCourse(token, input)` | `modules/courses/infrastructure/courses-api.ts` | `POST /api/courses/admin` |
| `updateCourse(token, courseId, input)` | `modules/courses/infrastructure/courses-api.ts` | `PUT /api/courses/admin/{course_id}` |
| `deleteCourse(token, courseId)` | `modules/courses/infrastructure/courses-api.ts` | `DELETE /api/courses/admin/{course_id}` |
| `createMemberInscriptions(token, courseId, userIds)` | `modules/courses/infrastructure/courses-api.ts` | `POST /api/courses/admin/{course_id}/member-inscriptions` |
| `approveCoursePayment(token, inscriptionId)` | `modules/courses/infrastructure/courses-api.ts` | `POST /api/courses/admin/inscriptions/{id}/approve-payment` |
| `rejectCoursePayment(token, inscriptionId, observation)` | `modules/courses/infrastructure/courses-api.ts` | `POST /api/courses/admin/inscriptions/{id}/reject-payment` |
| `updateAttendance(token, inscriptionId, attended)` | `modules/courses/infrastructure/courses-api.ts` | `PATCH /api/courses/admin/inscriptions/{id}/attendance` |
| `sendCertificates(token, courseId, inscriptionIds)` | `modules/courses/infrastructure/courses-api.ts` | `POST /api/courses/admin/{course_id}/certificates/send` |
| `submitFeedback(token, input)` | `modules/courses/infrastructure/courses-api.ts` | `POST /api/courses/feedback/{token}` |

### Arquitectura y Dependencias
- Backend: crear módulo `app/modules/courses/` con `domain`, `application`, `infrastructure`, `presentation/api`.
- Frontend: crear módulo `src/modules/courses/` y exponer páginas desde `index.ts`.
- Registrar router `courses_router` en `backend/app/main.py`.
- Agregar navegación de admin hacia `/admin/cursos` en `NAVIGATION_BY_ACCESS`.
- Crear o adoptar un cliente HTTP compartido en frontend para no duplicar `fetch`.
- Crear Ports backend:
  - `CourseRepositoryPort`
  - `CourseInscriptionRepositoryPort`
  - `CoursePaymentRepositoryPort`
  - `CertificateGeneratorPort`
  - `StoragePort`
  - `NotificationPort`
  - `FeedbackTokenPort`
- Implementar adapters iniciales:
  - PostgreSQL con SQLAlchemy/text según patrón actual.
  - Almacenamiento local para vouchers y PDFs.
  - Notificación email inicial configurable; en local puede registrar en logs si no hay SMTP.
  - Generador PDF con plantilla HTML/PDF. Requiere decidir dependencia (`reportlab`, `weasyprint` u otra) antes de implementación.
- Dependencias nuevas probables:
  - Backend: `python-multipart` para upload de voucher.
  - Backend: librería PDF (`reportlab` recomendado por instalación simple).
  - Backend: librería de email opcional si no se usa `smtplib`.
- No crear pasarela de pago real en esta fase; el flujo es comprobante manual.

### Notas de Implementación
> La BD actual conserva varios montos y fechas como `character varying`. La implementación debe validar en backend sin migrar agresivamente esos campos para evitar romper datos heredados. Si se decide normalizar a tipos `numeric/date/time`, debe abrirse una spec/migración separada.

> El sistema no tiene Alembic en el repo, aunque las instrucciones lo piden. Antes de implementar tablas nuevas hay que decidir si se agrega Alembic formalmente o si se entrega un SQL de migración manual compatible con el esquema heredado.

> Las notificaciones por correo deben implementarse detrás de `NotificationPort`. En entorno local, si no hay SMTP configurado, la operación debe quedar registrada para prueba sin exponer secretos.

> Los certificados iniciales pueden usar una plantilla PDF base con logo/nombre del curso/nombre del asistente/fechas/código verificable. El diseño visual final puede ajustarse después sin cambiar el contrato.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [ ] Crear módulo `app/modules/courses/`.
- [ ] Crear entidades de dominio `Course`, `CourseInscription`, `CoursePayment`, `CourseCertificate`, `CourseFeedback`.
- [ ] Crear excepciones de dominio/aplicación: curso no encontrado, no disponible, inscripción duplicada, voucher requerido, pago inválido, asistencia requerida, token inválido.
- [ ] Crear Ports de repositorios, almacenamiento, notificaciones, certificados y tokens.
- [ ] Implementar repositorios PostgreSQL para `courses` y tablas nuevas.
- [ ] Definir migraciones o SQL para `course_inscriptions`, `course_payments`, `course_certificates`, `course_feedback_tokens`, `course_feedbacks`.
- [ ] Implementar upload local de vouchers validando extensión y tipo de contenido.
- [ ] Implementar generador PDF con plantilla base.
- [ ] Implementar adapter de correo o logger local configurable.
- [ ] Implementar use cases de listado público y detalle público.
- [ ] Implementar use cases CRUD administrativo de cursos.
- [ ] Implementar use case de inscripción de miembros sin pago.
- [ ] Implementar use case de inscripción de invitados con voucher condicional.
- [ ] Implementar use cases de aprobar/rechazar pagos con correo.
- [ ] Implementar use case de asistencia.
- [ ] Implementar use cases de generar, descargar y enviar certificados individual/masivo.
- [ ] Implementar use case de finalizar curso.
- [ ] Implementar use case de reporte de asistentes.
- [ ] Implementar generación y consumo de links públicos de feedback.
- [ ] Crear schemas Pydantic de request/response.
- [ ] Crear router `/api/courses`.
- [ ] Registrar router en `app/main.py`.
- [ ] Actualizar configuración para storage local, URL pública y SMTP/log email.

#### Tests Backend
- [ ] `test_public_courses_lists_only_visible_courses`.
- [ ] `test_admin_course_crud_requires_admin`.
- [ ] `test_member_inscription_is_free_even_when_course_has_value`.
- [ ] `test_guest_paid_course_requires_voucher`.
- [ ] `test_guest_free_course_confirms_without_voucher`.
- [ ] `test_duplicate_inscription_returns_conflict`.
- [ ] `test_approve_payment_confirms_inscription_and_notifies`.
- [ ] `test_reject_payment_requires_observation_and_notifies`.
- [ ] `test_certificate_requires_attendance`.
- [ ] `test_bulk_certificate_send_is_idempotent`.
- [ ] `test_feedback_token_allows_single_submission`.
- [ ] `test_attendees_report_contains_members_and_guests`.

### Frontend

#### Implementación
- [ ] Cambiar `src/app/page.tsx` para renderizar landing pública en lugar de redirigir a `/login`.
- [ ] Crear módulo `src/modules/courses/` con tipos de dominio y API pública.
- [ ] Crear adapter `courses-api.ts` para endpoints FastAPI.
- [ ] Crear páginas públicas `/cursos`, `/cursos/[course_id]` y `/cursos/feedback/[token]`.
- [ ] Crear formulario público de inscripción de invitados con upload de voucher condicional.
- [ ] Crear vista administrativa `/admin/cursos` con tabla/listado, filtros y acciones CRUD.
- [ ] Crear formulario administrativo para todos los campos de `courses`.
- [ ] Crear vista detalle admin con pestañas o secciones: inscritos, pagos, asistencia, certificados, reporte y feedback.
- [ ] Crear selector/buscador de miembros existentes por rol `miembro` para inscripción admin.
- [ ] Agregar navegación admin a Cursos.
- [ ] Mostrar estados claros para pendiente de pago, aprobado, rechazado, asistió y certificado enviado.
- [ ] Implementar selección múltiple para envío masivo de certificados.
- [ ] Implementar descarga de certificado cuando exista `pdf_url`.
- [ ] Crear estilos coherentes con `globals.css` actual.

#### Tests Frontend
- [ ] `PublicLandingPage` renderiza CTA hacia cursos y login.
- [ ] `PublicCoursesPage` muestra cursos visibles y estado vacío.
- [ ] `GuestInscriptionForm` exige voucher solo cuando el curso tiene precio.
- [ ] `AdminCoursesPage` bloquea usuarios no admin vía `RoleGate`.
- [ ] `CourseForm` envía todos los campos obligatorios.
- [ ] `AttendanceChecklist` marca/desmarca asistencia.
- [ ] `CertificateActions` permite selección múltiple.
- [ ] `FeedbackFormPage` valida rating y maneja token inválido.

### QA
- [ ] Verificar navegación pública: `/`, `/login`, `/cursos`, detalle y feedback.
- [ ] Validar flujo completo miembro: login admin, inscripción de miembro, asistencia, certificado, envío.
- [ ] Validar flujo completo invitado gratuito.
- [ ] Validar flujo completo invitado pagado: voucher, aprobación, asistencia, certificado y encuesta.
- [ ] Validar rechazo de voucher con observación y correo.
- [ ] Validar que cursos ocultos/eliminados no aparecen públicamente.
- [ ] Validar reporte de asistentes con miembros e invitados.
- [ ] Revisar seguridad de uploads: tamaño, tipo MIME, rutas y acceso público.
- [ ] Revisar que endpoints admin respondan 401/403 correctamente.
- [ ] Actualizar estado spec: `status: IMPLEMENTED` al completar implementación.
