---
id: SPEC-010
status: IMPLEMENTED
feature: redisenio-admin-cursos
created: 2026-09-21
updated: 2026-09-21
author: spec-generator
version: "1.0"
related-specs: ["SPEC-003"]
---

# Spec: Rediseño del módulo administrativo de cursos

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Rediseñar la administración de cursos para un workspace de tarjetas + panel de detalle a la derecha, acciones en modales, toasts flotantes reutilizables, buscador de miembros internos y una tabla de inscritos con filtros y estado de encuesta.

### Requerimiento de Negocio
El administrador necesita ver y filtrar cursos en tarjetas, seleccionar uno para ver KPIs y acciones en un panel derecho, crear/editar en modal, gestionar inscritos en modal (con iconos, botones y popover), registrar miembros con un buscador (desde 3 caracteres, chips removibles), filtrar inscritos por cédula, correo, nombres y apellidos, y saber a quién ya se envió el link de encuesta. Los avisos no deben empujar el layout: toast flotante genérico para esta y otras pantallas. Seguir la forma de las capturas de referencia y respetar la paleta e iconos stroke actuales del sistema.

### Historias de Usuario

#### HU-01: Workspace de cursos con panel derecho

```
Como:        Administrador
Quiero:      Ver cursos en tarjetas, filtrarlos y ver el detalle del seleccionado a la derecha
Para:        Administrar la oferta sin una tabla densa ni un formulario fijo a la izquierda

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-003
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: listado en tarjetas
  Dado que:  existen cursos administrativos
  Cuando:    abro /admin/cursos
  Entonces:  veo un buscador, el botón Nuevo curso y tarjetas con título, estado,
             inscritos, asistentes y acción para ver el panel
```

```gherkin
CRITERIO-1.2: panel derecho
  Dado que:  selecciono una tarjeta
  Cuando:    el curso queda activo
  Entonces:  el panel derecho muestra título, estado, KPIs (inscritos, pagos,
             asistentes, certificados), tasa de asistencia y botones de acción
```

**Error Path**
```gherkin
CRITERIO-1.3: sin selección
  Dado que:  no hay curso seleccionado
  Cuando:    cargo la pantalla
  Entonces:  el panel derecho muestra un estado vacío pidiendo seleccionar un curso
```

**Edge Case**
```gherkin
CRITERIO-1.4: filtro de cursos
  Dado que:  escribo en el buscador
  Cuando:    el texto coincide con título, lugar o capacitador
  Entonces:  solo se muestran esas tarjetas
```

#### HU-02: Acciones en modales

```
Como:        Administrador
Quiero:      Crear, editar, ver inscritos, finalizar y eliminar desde modales
Para:        No saturar el workspace ni perder el contexto del listado

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: crear y editar
  Dado que:  pulso Nuevo curso o Ver detalles
  Cuando:    se abre el modal
  Entonces:  conservo todos los campos actuales del curso y puedo guardar
```

```gherkin
CRITERIO-2.2: inscritos
  Dado que:  pulso Ver inscritos
  Cuando:    se abre el modal
  Entonces:  gestiono registro, asistencia, pagos, certificados y encuestas
             de ese curso
```

**Error Path**
```gherkin
CRITERIO-2.3: confirmar destructivas
  Dado que:  pulso Finalizar o Eliminar
  Cuando:    confirmo en el modal
  Entonces:  se ejecuta la acción; si cancelo, no cambia nada
```

#### HU-03: Toasts flotantes genéricos

```
Como:        Usuario de cualquier interfaz autenticada
Quiero:      Ver avisos flotantes que no empujen el contenido
Para:        Confirmar acciones sin el banner superior actual

Prioridad:   Alta
Estimación:  S
Dependencias: Ninguna
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: toast de éxito y error
  Dado que:  una acción de cursos termina
  Cuando:    hay mensaje de éxito o error
  Entonces:  aparece un toast flotante y desaparece solo; el layout no se desplaza
```

**Edge Case**
```gherkin
CRITERIO-3.2: reutilizable
  Dado que:  el toast vive en shared
  Cuando:    otra pantalla lo importe
  Entonces:  puede mostrar success, error o info sin acoplarse a cursos
```

#### HU-04: Buscador de miembros internos

```
Como:        Administrador
Quiero:      Buscar miembros al escribir 3 o más caracteres y elegirlos en chips
Para:        Inscribir internos sin una lista larga de checkboxes

Prioridad:   Alta
Estimación:  S
Dependencias: HU-02
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: búsqueda incremental
  Dado que:  escribo al menos 3 caracteres
  Cuando:    coinciden nombre, apellido, correo o cédula
  Entonces:  veo resultados, los selecciono y aparecen como chips removibles
```

**Error Path**
```gherkin
CRITERIO-4.2: menos de 3 caracteres
  Dado que:  el buscador tiene 0–2 caracteres
  Cuando:    espero resultados
  Entonces:  no se listan miembros ni se llama al backend con query corta
```

**Edge Case**
```gherkin
CRITERIO-4.3: ya inscrito
  Dado que:  un resultado ya está inscrito en el curso
  Cuando:    aparece en el dropdown
  Entonces:  se muestra deshabilitado como ya inscrito
```

#### HU-05: Tabla de inscritos con filtros y encuesta

```
Como:        Administrador
Quiero:      Filtrar inscritos y ver si ya se envió la encuesta
Para:        Ubicar personas y no reenviar links a ciegas

Prioridad:   Alta
Estimación:  S
Dependencias: HU-02
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: filtros
  Dado que:  hay inscritos
  Cuando:    filtro por cédula, correo, nombres o apellidos
  Entonces:  la tabla deja solo las filas que coinciden
```

```gherkin
CRITERIO-5.2: estado de encuesta
  Dado que:  existe un token de feedback para la inscripción
  Cuando:    veo la fila
  Entonces:  muestra Pendiente, Enviada o Respondida
```

**Edge Case**
```gherkin
CRITERIO-5.3: acciones compactas
  Dado que:  una fila tiene varias acciones
  Cuando:    la veo
  Entonces:  usa iconos/botones visibles y un popover para el resto
```

### Reglas de Negocio
1. No cambiar reglas de negocio de SPEC-003 (pagos, asistencia, certificados, encuestas).
2. La búsqueda de miembros exige mínimo 3 caracteres y busca nombre, apellido, correo y cédula.
3. El estado de encuesta se deriva de `course_feedback_tokens`: sin token = Pendiente; con token = Enviada; `used_at` = Respondida.
4. Los toasts no reservan espacio en el flujo de la página.
5. El panel de detalle va a la derecha. Formas de las capturas; colores e iconos stroke del sistema actual.
6. Solo el administrador accede a esta pantalla.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `CourseInscription` | `course_inscriptions` + joins | modificada | Apellido, envío y uso de encuesta |
| `AdminCourse` | `courses` + agregados | modificada | Conteo de pagos aprobados |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `lastname` | string \| null | no | desde profile o último token de `names` | Apellido para filtro |
| `feedback_sent_at` | datetime \| null | no | join tokens | Primera evidencia de envío |
| `feedback_used_at` | datetime \| null | no | `used_at` del token | Encuesta respondida |
| `paid_payments_count` | int | sí | state_id pagado | KPI de pagos del panel |

#### Índices / Constraints
- Sin índices nuevos. Se reutilizan `course_feedback_tokens` y profiles.

### API Endpoints

#### GET /api/courses/admin
- **Descripción**: Lista cursos admin. Agrega `paid_payments_count`.
- **Auth requerida**: sí (admin)
- **Response 200**: cursos con conteos existentes + `paid_payments_count`

#### GET /api/courses/admin/members?q=
- **Descripción**: Busca miembros internos.
- **Auth requerida**: sí (admin)
- **Response 200**: hasta 50 resultados si `q` tiene 3+ caracteres; `[]` si es más corto.
- Busca `users.name`, `users.email`, `profiles.names`, `profiles.lastname`, `profiles.identifier`.

#### GET /api/courses/admin/{course_id}/inscriptions
- **Descripción**: Inscritos del curso con `lastname`, `feedback_sent_at`, `feedback_used_at`.
- **Auth requerida**: sí (admin)

El resto de endpoints de SPEC-003 no cambia.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `ToastProvider` / `useToast` | `shared/components/toast-provider.tsx` | children | Toasts flotantes success/error/info |
| `AdminCourseCard` | `courses/presentation/components/admin-course-card.tsx` | course, selected, onSelect | Tarjeta del grid |
| `AdminCoursePanel` | `courses/presentation/components/admin-course-panel.tsx` | course, onAction | Panel derecho |
| `CourseStatusBadge` | `courses/presentation/components/course-status-badge.tsx` | course | Visible / Oculto / Finalizado |
| `MemberSearchPicker` | `courses/presentation/components/member-search-picker.tsx` | token, selected, inscribedIds | Buscador + chips |
| `InscriptionActionsMenu` | `courses/presentation/components/inscription-actions-menu.tsx` | inscription, handlers | Iconos + popover |
| `CourseFormModal` | `courses/presentation/modals/course-form-modal.tsx` | form, editing | Crear/editar |
| `CourseInscriptionsModal` | `courses/presentation/modals/course-inscriptions-modal.tsx` | course, inscriptions | Gestión de inscritos |
| `ConfirmCourseModal` | `courses/presentation/modals/confirm-course-modal.tsx` | title, onConfirm | Finalizar/eliminar |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| `AdminCoursesPage` (rediseñada) | `pages/admin-courses-page.tsx` | existente | sí admin |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useToast` | `shared/hooks/use-toast.ts` | `{ success, error, info }` | API del toast genérico |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listMemberOptions` (sin cambio de firma) | `courses-api.ts` | `GET /api/courses/admin/members` |
| Tipos `CourseInscription` / `AdminCourse` | `domain/types.ts` | campos nuevos |

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: ninguno
- Servicios externos: ninguno
- Impacto: `ToastProvider` en el layout raíz para que cualquier interfaz lo use

### Notas de Implementación
> Guiarse de la forma de las capturas (header + search + grid + panel + modales), no de su tema oscuro.
> Colores: `--background`, `--primary`, `--surface`, `--success`, `--danger` del sistema.
> Iconos stroke redondeados como `SidebarIcon`.
> No migrar todos los `action-alert` existentes; el toast queda listo para reutilizarse.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Extender `CourseInscription` y `CourseInscriptionResponse` con apellido y encuesta
- [x] Incluir joins de profile y `course_feedback_tokens` en list/get inscription
- [x] Exigir 3 caracteres y buscar nombres/apellidos/cédula/correo en miembros
- [x] Agregar `paid_payments_count` al listado admin

#### Tests Backend
- [ ] Cubierto por comportamiento existente de inscritos; sin suite dedicada previa

### Frontend

#### Implementación
- [x] Crear `ToastProvider` + `useToast` y montarlo en el layout
- [x] Rediseñar `AdminCoursesPage` con grid, filtro y panel derecho
- [x] Modales de curso, inscritos y confirmación
- [x] Buscador de miembros con chips
- [x] Tabla de inscritos con filtros y columna de encuesta
- [x] Acciones con iconos y popover

#### Tests Frontend
- [ ] Verificación visual/manual del flujo admin

### QA
- [x] Validar criterios 1.1–5.3 en el navegador
- [x] Actualizar estado spec: `status: IMPLEMENTED`
