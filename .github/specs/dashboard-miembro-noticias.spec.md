---
id: SPEC-014
status: IMPLEMENTED
feature: dashboard-miembro-noticias
created: 2026-09-22
updated: 2026-09-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-003", "SPEC-007", "SPEC-013"]
---

# Spec: Dashboard de socio tipo periódico, avisos y documentos institucionales

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Reemplazar el dashboard placeholder del socio (`access_level = member`) por un panel tipo periódico: avisos del colegio con visibilidad según importancia, blogs publicados, capacitaciones vigentes y ofertas de empleo. El administrador gestiona avisos (igual que blogs, más importancia y fecha de publicación) y sube cuatro PDF institucionales siempre disponibles para descarga y para el modal de bienvenida/inducción.

### Requerimiento de Negocio
El dashboard del usuario miembro debe verse como un periódico innovador de noticias. El socio debe poder descargar la guía/manual de miembros, estatutos, charlas de seguridad y manual de marca. Debe existir una ruta administrativa para subir esos cuatro PDF; una vez subidos, se descargan desde esa misma ruta de almacenamiento y permanecen disponibles. Esos documentos también se muestran en el modal de inducción. En el panel el miembro ve blogs lanzados, capacitaciones y ofertas de empleo. Además hay un apartado de avisos que aparece en el dashboard con más o menos visibilidad según la importancia que coloca el administrador (baja, media, alta). Del lado admin se crea el módulo de avisos igual al de blogs (imagen, TinyMCE y el resto), con etiqueta de importancia y programación de cuándo se publica y se muestra a los socios.

### Decisiones de diseño

1. **Alcance de roles:** solo cambia `/dashboard` cuando `access_level = member`. El dashboard admin de SPEC-013 no se modifica. Operaciones conserva su dashboard actual.
2. **Documentos institucionales fijos (4 claves):**
   - `member_guide` — Guía / Manual de miembros
   - `statutes` — Estatutos
   - `safety_talks` — Charlas de seguridad
   - `brand_manual` — Manual de marca
   No se pueden crear tipos extra en esta entrega. El admin solo sube o reemplaza el PDF de cada clave.
3. **Ruta de subida y descarga:** admin `/admin/documentos`. Archivos en `storage/member-documents/{key}/{uuid}.pdf` y URL pública `/media/member-documents/{key}/{archivo}`. El socio descarga esa misma URL (o el endpoint de descarga que la sirve). Si un PDF aún no se subió, el botón aparece deshabilitado con texto “Pendiente de publicación”.
4. **Modal de inducción:** se muestra al entrar al dashboard del socio (una vez por pestaña, `sessionStorage`). Siempre se puede reabrir con el botón “Documentos del colegio”. Carrusel de los 4 documentos (portada + título + Descargar), igual en espíritu al modal de bienvenida actual de COPSSTEC.
5. **Avisos:** tabla nueva `notices` (no reutilizar `election_notices` ni `blogs`). CRUD admin espejo de blogs + `importance` (`baja` | `media` | `alta`) + `published_at` (datetime opcional).
6. **Visibilidad en el periódico según importancia:**
   - `alta`: hero / titular principal (ancho completo, portada grande).
   - `media`: tarjetas destacadas en la franja central.
   - `baja`: listado compacto o columna lateral “Avisos”.
7. **Programación:** si `published_at` es nulo, se publica de inmediato al quedar `state_id = 4`. Si es futura, el aviso existe en admin como “programado” y no aparece en el dashboard del socio hasta esa fecha/hora (UTC). Un aviso oculto (`state_id = 5`) no se muestra aunque la fecha ya haya pasado.
8. **Blogs y capacitaciones:** se reutilizan APIs públicas existentes (`GET /api/blogs/public`, `GET /api/courses/public`). No se duplica CRUD.
9. **Ofertas de empleo:** se leen de la tabla existente `job_centers` (`state_id = 4`, `deleted_at IS NULL`). Esta entrega no crea el módulo admin de bolsa de empleo. Si no hay ofertas, se muestra estado vacío con enlace a `/profile` omitido; solo copy informativo.
10. **Snapshot:** un endpoint autenticado `GET /api/dashboard/member` agrega avisos publicados, blogs recientes, cursos vigentes, ofertas y documentos para una sola carga del periódico.
11. **TinyMCE:** reutilizar `TextEditor` de `frontend/src/shared/components/text-editor.tsx`. No instalar otra librería de editor.

### Historias de Usuario

#### HU-01: Ver el periódico del socio

```text
Como:        Socio autenticado
Quiero:      Abrir /dashboard y ver un panel tipo periódico con avisos, blogs, capacitaciones y empleos
Para:        Enterarme de la vida del colegio sin buscar cada sección por separado

Prioridad:   Alta
Estimación:  L
Dependencias: SPEC-002, SPEC-003, SPEC-007
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: periódico en lugar del placeholder
  Dado que:  soy un usuario con access_level member
  Cuando:    abro /dashboard
  Entonces:  no veo las cards de Roles/Perfil/Accesos ni el resumen técnico de perfil
  Y:         veo cabecera de periódico, avisos, blogs, capacitaciones, empleos y barra de documentos
```

```gherkin
CRITERIO-1.2: avisos por importancia
  Dado que:  existen avisos visibles ya publicados con importancia alta, media y baja
  Cuando:    cargo el dashboard
  Entonces:  el de alta ocupa el titular principal, los de media aparecen como tarjetas y los de baja en listado compacto
```

**Error Path**
```gherkin
CRITERIO-1.3: acceso admin o sin sesión
  Dado que:  soy admin o no tengo token
  Cuando:    llamo GET /api/dashboard/member
  Entonces:  admin recibe 403 y sin token 401; /dashboard admin sigue mostrando SPEC-013
```

**Edge Case**
```gherkin
CRITERIO-1.4: feed vacío
  Dado que:  no hay avisos publicados, blogs visibles, cursos visibles ni ofertas
  Cuando:    el socio abre /dashboard
  Entonces:  ve estados vacíos informativos por sección y no un error técnico
```

#### HU-02: Descargar documentos institucionales y verlos en el modal

```text
Como:        Socio autenticado
Quiero:      Descargar la guía de miembros, estatutos, charlas de seguridad y manual de marca, y verlos en el modal de inducción
Para:        Tener siempre a mano los documentos oficiales del colegio

Prioridad:   Alta
Estimación:  M
Dependencias: HU-04
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: descarga desde el periódico
  Dado que:  el admin ya subió los 4 PDF
  Cuando:    el socio pulsa Descargar en un documento
  Entonces:  obtiene el PDF actualmente almacenado en /media/member-documents/{key}/...
```

```gherkin
CRITERIO-2.2: modal de inducción
  Dado que:  el socio entra por primera vez en la pestaña a /dashboard
  Cuando:    carga el periódico
  Entonces:  se abre el modal con carrusel de los 4 documentos, título y botón Descargar
```

```gherkin
CRITERIO-2.3: reabrir modal
  Dado que:  el socio cerró el modal
  Cuando:    pulsa “Documentos del colegio”
  Entonces:  el modal vuelve a abrirse con los mismos 4 documentos
```

**Error Path**
```gherkin
CRITERIO-2.4: PDF aún no subido
  Dado que:  un documento no tiene archivo
  Cuando:    el socio lo ve en el modal o en la barra
  Entonces:  el botón Descargar está deshabilitado y no se dispara 404 al usuario
```

**Edge Case**
```gherkin
CRITERIO-2.5: reemplazo
  Dado que:  el admin sube un PDF nuevo para la misma clave
  Cuando:    el socio descarga de nuevo
  Entonces:  recibe el archivo más reciente, no el anterior
```

#### HU-03: Ver blogs, capacitaciones y empleos en el periódico

```text
Como:        Socio autenticado
Quiero:      Ver en el dashboard los blogs publicados, las capacitaciones vigentes y las ofertas de empleo
Para:        Encontrar contenido, cursos y trabajo sin salir del inicio

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-003, SPEC-007
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: blogs lanzados
  Dado que:  hay blogs con state_id = 4 y deleted_at nulo
  Cuando:    abro el dashboard de socio
  Entonces:  veo hasta 6 blogs recientes con portada, título, extracto y enlace a /blogs/{id}
```

```gherkin
CRITERIO-3.2: capacitaciones
  Dado que:  hay cursos visibles no eliminados
  Cuando:    abro el dashboard
  Entonces:  veo hasta 6 cursos con imagen, título, fecha/modalidad y enlace a /cursos/{id}
```

```gherkin
CRITERIO-3.3: ofertas de empleo
  Dado que:  hay filas en job_centers visibles no eliminadas
  Cuando:    abro el dashboard
  Entonces:  veo hasta 6 ofertas con empresa, título, ubicación y tipo
```

**Error Path**
```gherkin
CRITERIO-3.4: contenido oculto
  Dado que:  un blog, curso u oferta está oculto o eliminado
  Cuando:    se arma el snapshot
  Entonces:  no aparece en el periódico
```

**Edge Case**
```gherkin
CRITERIO-3.5: bolsa vacía
  Dado que:  job_centers no tiene ofertas visibles
  Cuando:    el socio abre el dashboard
  Entonces:  la columna Empleo muestra estado vacío “Pronto publicaremos nuevas oportunidades”
```

#### HU-04: Administrar los 4 PDF institucionales

```text
Como:        Administrador
Quiero:      Subir o reemplazar los 4 PDF oficiales desde una ruta propia
Para:        Que los socios siempre descarguen la versión vigente

Prioridad:   Alta
Estimación:  S
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: subir PDF
  Dado que:  soy admin en /admin/documentos
  Cuando:    elijo “Manual de miembros” y subo un PDF válido
  Entonces:  se persiste en member_documents y queda descargable para socios
```

```gherkin
CRITERIO-4.2: reemplazar
  Dado que:  ya existe un PDF para statutes
  Cuando:    subo otro PDF en la misma clave
  Entonces:  se actualiza file_path, original_filename, updated_by y updated_at
```

**Error Path**
```gherkin
CRITERIO-4.3: archivo inválido
  Dado que:  el admin sube un archivo que no es PDF o supera 20 MB
  Cuando:    envía el formulario
  Entonces:  el backend responde 400 y no cambia el documento previo
```

```gherkin
CRITERIO-4.4: no admin
  Dado que:  un socio llama PUT /api/member-documents/{key}
  Cuando:    intenta subir un PDF
  Entonces:  recibe 403
```

#### HU-05: Administrar avisos (CRUD + importancia + programación)

```text
Como:        Administrador
Quiero:      Crear, editar, ocultar, mostrar y eliminar avisos con TinyMCE, portada, importancia y fecha de publicación
Para:        Comunicar al padrón con el peso visual correcto y en el momento elegido

Prioridad:   Alta
Estimación:  L
Dependencias: SPEC-007
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: crear aviso
  Dado que:  un admin está en /admin/avisos
  Cuando:    abre “Crear aviso”, completa título, cuerpo TinyMCE, portada, importancia y opcionalmente published_at, y guarda
  Entonces:  se persiste en notices y aparece en el listado admin
```

```gherkin
CRITERIO-5.2: programar
  Dado que:  creo un aviso visible con published_at en el futuro
  Cuando:    un socio carga el dashboard ahora
  Entonces:  el aviso no aparece
  Cuando:    llega published_at
  Entonces:  aparece con el tamaño de su importancia
```

```gherkin
CRITERIO-5.3: editar, ocultar, mostrar, eliminar
  Dado que:  existe un aviso no eliminado
  Cuando:    el admin edita, oculta, muestra o elimina
  Entonces:  el comportamiento es el mismo que blogs (SPEC-007) y el periódico respeta el estado
```

**Error Path**
```gherkin
CRITERIO-5.4: validación
  Dado que:  el admin guarda sin título, sin cuerpo, sin portada (alta crear) o con importancia inválida
  Cuando:    envía el formulario
  Entonces:  el backend responde 400 y no crea el registro
```

```gherkin
CRITERIO-5.5: no admin
  Dado que:  un miembro llama /api/notices/admin
  Cuando:    intenta crear o editar
  Entonces:  recibe 403
```

**Edge Case**
```gherkin
CRITERIO-5.6: editar sin nueva portada
  Dado que:  el aviso ya tiene imagen
  Cuando:    el admin cambia solo texto o importancia
  Entonces:  se conserva la imagen existente
```

```gherkin
CRITERIO-5.7: published_at nulo
  Dado que:  el aviso es visible y published_at es nulo
  Cuando:    el socio abre el dashboard
  Entonces:  el aviso se considera publicado de inmediato
```

### Reglas de Negocio
1. Solo el rol `admin` gestiona avisos y documentos institucionales.
2. El snapshot del periódico exige autenticación y `access_level = member` (admin no lo consume; tiene su propio dashboard).
3. `notices.title` obligatorio, máximo 255 caracteres.
4. `notices.description` es HTML TinyMCE obligatorio (no vacío / no solo `<p></p>`).
5. Portada obligatoria al crear el aviso; al editar es opcional si ya existe. JPG/PNG/WEBP, máximo 5 MB. Ruta `/media/notices/{id}/{archivo}`.
6. `importance` solo `baja`, `media` o `alta`.
7. `published_at` es datetime UTC naive opcional. Nulo = inmediato. Futuro = programado.
8. Visibilidad al socio: `state_id = 4`, `deleted_at IS NULL` y (`published_at IS NULL` o `published_at <= now()`).
9. Eliminación de avisos es lógica: `deleted_at`, `deleted_by`, `state_id = 5`.
10. `state_id` 4 = visible, 5 = oculto (misma convención de blogs).
11. Documentos: solo PDF, máximo 20 MB, una fila por `document_key`. Reemplazar no crea una segunda fila.
12. Las 4 claves de documento son fijas; no se aceptan otras.
13. Blogs y cursos del feed usan las mismas reglas públicas ya vigentes (visible + no eliminado).
14. Empleos: `job_centers.state_id = 4` y `deleted_at IS NULL`. No se implementa postulación en esta entrega.
15. El HTML de avisos se renderiza; no habilitar plugins TinyMCE de scripts.
16. El modal de inducción no bloquea el resto del sistema si falla la carga de documentos: se muestra el carrusel con estados pendientes.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Notice` | tabla nueva `notices` | nueva | Aviso interno del colegio con importancia y programación |
| `MemberDocument` | tabla nueva `member_documents` | nueva | Los 4 PDF institucionales (upsert por clave) |
| `Blog` | tabla `blogs` | ninguna | Feed de noticias del periódico |
| `Course` | tabla `courses` | ninguna | Feed de capacitaciones |
| `JobCenter` | tabla existente `job_centers` | ninguna | Feed de ofertas (solo lectura) |
| `State` | tabla `states` | ninguna | 4 = visible, 5 = oculto |

#### Campos del modelo — `notices`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint PK | sí | identity | Identificador |
| `state_id` | bigint FK states | sí | 4 o 5 | visible / oculto |
| `created_by` | bigint FK users | sí | usuario admin | Autor |
| `title` | varchar(255) | sí | 1–255 | Titular |
| `description` | text | sí | HTML no vacío | Cuerpo TinyMCE |
| `image` | text | sí | ruta `/media/notices/...` | Portada |
| `importance` | varchar(16) | sí | `baja` / `media` / `alta` | Peso visual en el periódico |
| `published_at` | timestamp | no | UTC naive | Inicio de publicación; nulo = inmediato |
| `deleted_at` | varchar(255) | no | ISO string | Soft delete |
| `deleted_by` | varchar(255) | no | id admin como string | Quién eliminó |
| `created_at` | timestamp | sí | UTC naive | Creación |
| `updated_at` | timestamp | sí | UTC naive | Actualización |

#### Campos del modelo — `member_documents`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint PK | sí | identity | Identificador |
| `document_key` | varchar(32) | sí | unique, una de las 4 claves | Tipo de documento |
| `title` | varchar(255) | sí | fijo por clave | Título mostrado |
| `file_path` | text | no | `/media/member-documents/...` | Vacío si aún no se sube |
| `original_filename` | varchar(255) | no | nombre original del PDF | Para la descarga |
| `updated_by` | bigint | no | FK users | Último admin que subió |
| `created_at` | timestamp | sí | UTC naive | Alta de la fila semilla |
| `updated_at` | timestamp | sí | UTC naive | Último reemplazo |

#### Índices / Constraints
- `notices_pkey` en `id`.
- FK `notices.state_id` → `states.id`, `notices.created_by` → `users.id`.
- Índice `notices_feed_idx` en `(state_id, importance, published_at DESC)` para el periódico.
- `member_documents_document_key_key` UNIQUE.
- Semilla de 4 filas (sin archivo) al crear la tabla.

Script SQL idempotente: `backend/database/member_notices_documents.sql`.

### API Endpoints

Prefijo alineado al resto del proyecto (`/api/...`, no `/api/v1`).

#### GET /api/dashboard/member
- **Descripción**: Snapshot del periódico del socio
- **Auth requerida**: sí, member
- **Response 200**:
  ```json
  {
    "notices": {
      "high": [{ "id": 1, "title": "string", "excerpt": "string", "image": "/media/notices/1/a.webp", "importance": "alta", "published_at": "iso8601" }],
      "medium": [],
      "low": []
    },
    "blogs": [{ "id": 1, "title": "string", "excerpt": "string", "image": "string", "created_at": "iso8601" }],
    "courses": [{ "id": 1, "title": "string", "image": "string", "date_course": "string", "type_modality": "string", "location": "string" }],
    "jobs": [{ "id": 1, "title": "string", "name_enterprise": "string", "location": "string", "type": "string", "logo": "string" }],
    "documents": [
      { "document_key": "member_guide", "title": "Manual de miembros", "file_path": "/media/member-documents/member_guide/x.pdf", "available": true }
    ]
  }
  ```
- Límites: avisos 12 (agrupados), blogs 6, cursos 6, jobs 6.
- **Response 401/403**: auth

#### GET /api/notices/admin
- **Descripción**: Lista avisos no eliminados (incluye programados y ocultos)
- **Auth requerida**: sí, admin
- **Response 200**: lista `AdminNoticeResponse` (incluye `state_id`, `importance`, `published_at`, `created_by`)

#### GET /api/notices/admin/{notice_id}
- **Auth requerida**: sí, admin
- **Response 200**: aviso completo con HTML
- **Response 404**: no encontrado o eliminado

#### POST /api/notices/admin
- **Auth requerida**: sí, admin
- **Request**: `multipart/form-data`
  - `title`, `description`, `importance`
  - `state_id` int opcional, default 4
  - `published_at` string ISO opcional
  - `image` file obligatorio
- **Response 201**: aviso creado
- **Response 400**: validación

#### PUT /api/notices/admin/{notice_id}
- **Auth requerida**: sí, admin
- **Request**: mismo multipart; `image` opcional
- **Response 200**: actualizado
- **Response 404**: no encontrado

#### PATCH /api/notices/admin/{notice_id}/visibility
- **Auth requerida**: sí, admin
- **Request Body**: `{ "state_id": 5 }`
- **Response 200**: actualizado

#### DELETE /api/notices/admin/{notice_id}
- **Auth requerida**: sí, admin
- **Response 204**: soft delete

#### GET /api/member-documents
- **Descripción**: Lista las 4 claves con disponibilidad
- **Auth requerida**: sí (member o admin)
- **Response 200**:
  ```json
  [
    { "document_key": "member_guide", "title": "Manual de miembros", "file_path": "...", "available": true, "updated_at": "iso8601" }
  ]
  ```

#### PUT /api/member-documents/{document_key}
- **Descripción**: Sube o reemplaza el PDF de una clave
- **Auth requerida**: sí, admin
- **Request**: `multipart/form-data` con `file` (PDF)
- **Response 200**: documento actualizado
- **Response 400**: clave inválida, no PDF o > 20 MB
- **Response 403**: no admin

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `MemberNewspaperPage` | `modules/dashboard/presentation/pages/member-newspaper-page.tsx` | ninguna | Periódico del socio |
| `NewspaperMasthead` | `modules/dashboard/presentation/components/newspaper-masthead.tsx` | `userName` | Cabecera con fecha y saludo |
| `NoticeHero` | `modules/notices/presentation/components/notice-hero.tsx` | `notice, onOpen` | Titular de importancia alta |
| `NoticeCard` | `modules/notices/presentation/components/notice-card.tsx` | `notice, onOpen` | Tarjeta media |
| `NoticeCompactList` | `modules/notices/presentation/components/notice-compact-list.tsx` | `notices, onOpen` | Columna baja |
| `NewspaperFeedColumn` | `modules/dashboard/presentation/components/newspaper-feed-column.tsx` | `title, items, empty` | Columna blogs/cursos/empleos |
| `InstitutionalDocumentsBar` | `modules/documents/presentation/components/institutional-documents-bar.tsx` | `documents, onOpenModal` | Botones de descarga + reabrir modal |
| `InductionDocumentsModal` | `modules/documents/presentation/modals/induction-documents-modal.tsx` | `documents, isOpen, onClose` | Carrusel de los 4 PDF |
| `NoticeDetailModal` | `modules/notices/presentation/modals/notice-detail-modal.tsx` | `notice, onClose` | Lee el HTML del aviso |
| `NoticeFormModal` | `modules/notices/presentation/modals/notice-form-modal.tsx` | igual blogs + importance + published_at | Crear/editar aviso |
| `NoticeCoverField` | `modules/notices/presentation/components/notice-cover-field.tsx` | igual `BlogCoverField` | Dropzone de portada |
| `NoticeImportanceBadge` | `modules/notices/presentation/components/notice-importance-badge.tsx` | `importance` | Baja / Media / Alta |
| `NoticeStatusBadge` | `modules/notices/presentation/components/notice-status-badge.tsx` | `stateId, publishedAt` | Visible / Oculto / Programado |
| `AdminNoticesPage` | `modules/notices/presentation/pages/admin-notices-page.tsx` | ninguna | CRUD espejo de blogs |
| `AdminDocumentsPage` | `modules/documents/presentation/pages/admin-documents-page.tsx` | ninguna | 4 dropzones PDF |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Dashboard socio (reemplazo) | `dashboard-page.tsx` delega en `MemberNewspaperPage` | `/dashboard` | sí, member |
| `AdminNoticesPage` | `app/(protected)/admin/avisos/page.tsx` | `/admin/avisos` | sí, admin |
| `AdminDocumentsPage` | `app/(protected)/admin/documentos/page.tsx` | `/admin/documentos` | sí, admin |

`DashboardPage` existente: si `access_level === "admin"` sigue `AdminDashboardPage`; si `member` pasa a `MemberNewspaperPage`; operaciones no cambia.

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useMemberNewspaper` | `modules/dashboard/presentation/hooks/use-member-newspaper.ts` | snapshot, loading, error, reload | Carga `GET /api/dashboard/member` |
| Estado local admin avisos/documentos | N/A | `useState` + `useEffect` | Mismo patrón que blogs |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `getMemberDashboard(token)` | `modules/dashboard/infrastructure/dashboard-api.ts` | `GET /api/dashboard/member` |
| `listAdminNotices(token)` | `modules/notices/infrastructure/notices-api.ts` | `GET /api/notices/admin` |
| `getAdminNotice(token, id)` | mismo | `GET /api/notices/admin/{id}` |
| `createNotice(token, formData)` | mismo | `POST /api/notices/admin` |
| `updateNotice(token, id, formData)` | mismo | `PUT /api/notices/admin/{id}` |
| `setNoticeVisibility(token, id, stateId)` | mismo | `PATCH /api/notices/admin/{id}/visibility` |
| `deleteNotice(token, id)` | mismo | `DELETE /api/notices/admin/{id}` |
| `listMemberDocuments(token)` | `modules/documents/infrastructure/documents-api.ts` | `GET /api/member-documents` |
| `uploadMemberDocument(token, key, file)` | mismo | `PUT /api/member-documents/{key}` |

#### UI del periódico (socio)
- Masthead: “El Boletín COPSSTEC”, fecha en español, saludo con el nombre del socio, botón “Documentos del colegio”.
- Hero de avisos `alta` (si hay varios, el más reciente).
- Fila de avisos `media`.
- Tres columnas tipo diario: **Blogs**, **Capacitaciones**, **Empleo**.
- Columna o franja inferior de avisos `baja`.
- Barra persistente de los 4 PDF.
- Paleta existente (`--primary`, superficies blancas); tipografía de titulares más editorial (tracking, serif solo en el masthead vía `Georgia` ya disponible, sin fuente nueva).
- Responsive: hero apilado, columnas a 1 eje en móvil.

#### UI admin avisos
- Clonar layout de `/admin/blogs`: grid + preview + modal sheet.
- Campos extra en el modal: select Importancia (Baja / Media / Alta) e input datetime-local “Publicar el” (vacío = ahora).
- Badge “Programado” si `state_id = 4` y `published_at` futuro.
- Confirmar eliminación con `ConfirmActionModal`.

#### UI admin documentos
- Cuatro cards (una por clave) con estado “Sin archivo” o nombre + fecha de actualización y dropzone PDF.
- No hay listado infinito ni TinyMCE.

#### Navegación y RBAC
En `NAVIGATION_BY_ACCESS["admin"]` agregar:
- `{ "label": "Avisos", "href": "/admin/avisos" }`
- `{ "label": "Documentos", "href": "/admin/documentos" }`

Iconos en `navIconForHref`: avisos → `newspaper`; documentos → `bolt` (o `certificate` si queda más claro). `RoleGate requiredAccess="admin"` en ambas páginas.

### Arquitectura y Dependencias
- Paquetes nuevos: ninguno.
- Storage local: `storage/notices`, `storage/member-documents`.
- Montar StaticFiles en `main.py`: `/media/notices`, `/media/member-documents`.
- Routers: `notices` y `member-documents`; extender `dashboard` con el snapshot member.
- El snapshot del dashboard lee blogs/cursos/job_centers/notices/documentos vía ports propios o consultas en el repositorio del módulo dashboard (no importar repositorios internos de otros módulos). Preferir ports de lectura en dashboard:
  - `MemberFeedReader` con métodos `list_published_notices`, `list_recent_blogs`, `list_open_courses`, `list_open_jobs`, `list_documents`.
  - Adapter SQL en `dashboard/infrastructure` con SQL crudo (`text()`), sin cruzar a `blogs.infrastructure`.
- SQL: `backend/database/member_notices_documents.sql` (CREATE TABLE IF NOT EXISTS + INSERT semilla de las 4 claves). No hay Alembic en el repo.
- Aplicar el SQL al implementar (mismo patrón que votaciones / membresía).

### Arquitectura hexagonal

```text
backend/app/modules/notices/
  domain/entities.py
  domain/exceptions.py
  application/ports.py
  application/use_cases.py
  infrastructure/repository.py
  infrastructure/files.py
  presentation/api/{router,schemas,dependencies}.py

backend/app/modules/documents/
  domain/entities.py
  domain/exceptions.py
  application/ports.py
  application/use_cases.py
  infrastructure/repository.py
  infrastructure/files.py
  presentation/api/{router,schemas,dependencies}.py

backend/app/modules/dashboard/
  application/use_cases.py   + GetMemberDashboardUseCase
  infrastructure/repository.py  + lecturas del feed
  presentation/api/router.py    + GET /member
```

### Notas de Implementación
> Reutilizar `ConfirmActionModal`, `RoleGate`, `resolveMediaSrc`, `TextEditor`, estilos `blog-form-sheet`, `photo-dropzone`, `actions-menu`, `status-badge`.
> `published_at` se envía como ISO; el input datetime-local se convierte a UTC naive en el cliente o se interpreta como hora local de Ecuador (UTC-5) y se guarda naive UTC. Decisión: el frontend envía ISO con offset; el backend normaliza a UTC naive.
> El modal de inducción usa `sessionStorage` key `copsstec.induction-modal.seen`.
> Detalle de aviso para el socio: modal, no ruta pública nueva.
> Empleos no tienen página de detalle en esta entrega; la tarjeta muestra datos y, si `link` es URL absoluta, un “Ver oferta” externo.
> Tests: los agentes de implementación no generan tests salvo que se pidan; el checklist de tests queda para una iteración posterior.
> Al implementar, ejecutar el SQL de `backend/database/member_notices_documents.sql` contra la base local.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend

#### Implementación
- [x] Crear SQL `backend/database/member_notices_documents.sql` (tablas `notices`, `member_documents` + semilla de 4 claves) y aplicarlo
- [x] Módulo `notices`: entidad, excepciones, ports, storage de imagen, repositorio, use cases, schemas, router `/api/notices`
- [x] Módulo `documents`: entidad, validación PDF, repositorio upsert, use cases, router `/api/member-documents`
- [x] `GetMemberDashboardUseCase` + endpoint `GET /api/dashboard/member` (avisos publicados, blogs, cursos, job_centers, documentos)
- [x] Registrar routers y montar `/media/notices` y `/media/member-documents` en `main.py`
- [x] Agregar Avisos y Documentos a `NAVIGATION_BY_ACCESS["admin"]`

#### Tests Backend
- [ ] `test_member_dashboard_requires_member`
- [ ] `test_scheduled_notice_hidden_until_published_at`
- [ ] `test_notice_importance_groups_in_snapshot`
- [ ] `test_create_notice_requires_title_html_image_importance`
- [ ] `test_upload_document_rejects_non_pdf`
- [ ] `test_replace_document_updates_path`

### Frontend

#### Implementación
- [x] Tipos + API de avisos y documentos; extender `dashboard-api` con snapshot member
- [x] `MemberNewspaperPage` + masthead, hero, columnas y barra de documentos
- [x] Modal de inducción (carrusel 4 PDF) + reopen; detalle de aviso
- [x] `AdminNoticesPage` espejo de blogs + importancia + datetime de publicación
- [x] `AdminDocumentsPage` con 4 dropzones
- [x] Rutas `/admin/avisos` y `/admin/documentos`; iconos de nav
- [x] Estilos editoriales del periódico (desktop y móvil)
- [x] `DashboardPage` enruta member → periódico (admin sin cambios)

#### Tests Frontend
- [ ] Periódico no muestra cards placeholder de Roles/Perfil/Accesos
- [ ] Modal se abre al primer visit y se reabre con el botón
- [ ] Formulario de aviso envía importancia y published_at
- [ ] Documento no disponible deja el botón deshabilitado

### QA
- [x] Validar criterios CRITERIO-1.1 a 5.7 en UI
- [x] Verificar que un aviso programado no aparece antes de hora
- [x] Verificar que alta/media/baja cambian el peso visual
- [x] Verificar reemplazo de PDF y descarga del socio
- [x] Verificar que el dashboard admin no se rompe
- [x] Actualizar estado spec: `status: IMPLEMENTED`
