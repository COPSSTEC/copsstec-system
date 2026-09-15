---
id: SPEC-007
status: IMPLEMENTED
feature: gestion-publica-blogs
created: 2026-09-15
updated: 2026-09-15
author: spec-generator
version: "1.0"
related-specs: ["SPEC-003", "SPEC-006"]
---

# Spec: Gestión pública y administrativa de Blogs

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Exponer el contenido de la tabla existente `blogs` en una sección pública (`/blogs` y detalle) y un módulo administrativo para crear, editar, ocultar, mostrar y eliminar publicaciones. El cuerpo del artículo se edita con TinyMCE (texto enriquecido) mediante un componente reutilizable compartido, y cada blog tiene una imagen de portada.

### Requerimiento de Negocio
El usuario necesita un módulo de Blogs usando la data y campos ya existentes en la tabla `blogs`. En la administración debe poder guardar el texto con un editor completo (negrillas, listas, enlaces, tablas, etc.) con TinyMCE, agregar una imagen de portada, ocultar o hacer visibles los blogs, editarlos y eliminarlos. En el detalle público y administrativo el texto enriquecido debe renderizarse como HTML. El componente TinyMCE debe ser reutilizable para otras secciones futuras. La API key de TinyMCE se lee desde `.env` y no se hardcodea.

Referencia visual: `https://www.copsstec.com/blogs` (listado público, modal de creación con editor + portada, detalle con portada + HTML + badge de visibilidad + menú Acciones).

### Historias de Usuario

#### HU-01: Ver listado y detalle público de blogs

```text
Como:        Visitante público
Quiero:      Ver los blogs visibles y abrir su detalle con el contenido enriquecido
Para:        Informarme sobre publicaciones de COPSSTEC sin iniciar sesión

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: listado público de blogs visibles
  Dado que:  existen blogs en blogs con state_id = 4 (visible) y deleted_at nulo
  Cuando:    un visitante entra a /blogs
  Entonces:  ve tarjetas con imagen de portada, título, extracto y fecha
```

```gherkin
CRITERIO-1.2: detalle público con HTML enriquecido
  Dado que:  un blog visible tiene description con HTML (negrillas, listas, enlaces)
  Cuando:    un visitante abre /blogs/{id}
  Entonces:  ve la portada, el título y el HTML renderizado (no el markup crudo)
```

**Error Path**
```gherkin
CRITERIO-1.3: blog oculto o eliminado
  Dado que:  un blog está oculto (state_id = 5) o tiene deleted_at
  Cuando:    un visitante intenta abrir su detalle público
  Entonces:  el sistema responde 404 y la página muestra estado de no disponible
```

**Edge Case**
```gherkin
CRITERIO-1.4: catálogo vacío
  Dado que:  no hay blogs visibles
  Cuando:    un visitante entra a /blogs
  Entonces:  ve un estado vacío informativo sin error técnico
```

#### HU-02: Administrar blogs (CRUD + visibilidad)

```text
Como:        Administrador
Quiero:      Crear, editar, listar, ocultar, mostrar y eliminar blogs
Para:        Mantener actualizado el contenido público

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: crear blog con editor y portada
  Dado que:  un admin está en /admin/blogs
  Cuando:    abre "Crear blog", completa título, cuerpo TinyMCE y sube una imagen, y guarda
  Entonces:  se persiste en blogs (title, description HTML, image, state_id, created_by, link slug) y aparece en el listado admin
```

```gherkin
CRITERIO-2.2: editar blog
  Dado que:  existe un blog no eliminado
  Cuando:    el admin elige Acciones → Editar, cambia título o contenido y guarda
  Entonces:  se actualizan los campos y updated_at
```

```gherkin
CRITERIO-2.3: ocultar y mostrar
  Dado que:  un blog está visible (state_id = 4)
  Cuando:    el admin elige Ocultar
  Entonces:  state_id pasa a 5 y deja de aparecer en /blogs
  Cuando:    el admin elige Mostrar
  Entonces:  state_id vuelve a 4 y reaparece en /blogs
```

```gherkin
CRITERIO-2.4: eliminar lógicamente
  Dado que:  un blog no está eliminado
  Cuando:    el admin confirma Eliminar
  Entonces:  se asignan deleted_at, deleted_by y state_id = 5, y desaparece de admin y público
```

**Error Path**
```gherkin
CRITERIO-2.5: validación de creación
  Dado que:  el admin intenta guardar sin título, sin cuerpo o sin imagen de portada
  Cuando:    envía el formulario
  Entonces:  el backend responde 400 y no se crea el registro
```

```gherkin
CRITERIO-2.6: acceso no admin
  Dado que:  un usuario con rol miembro u operaciones llama endpoints /api/blogs/admin
  Cuando:    intenta crear, editar, ocultar o eliminar
  Entonces:  recibe 403
```

**Edge Case**
```gherkin
CRITERIO-2.7: editar sin cambiar portada
  Dado que:  un blog ya tiene imagen
  Cuando:    el admin edita solo el texto y no sube archivo nuevo
  Entonces:  se conserva la imagen existente
```

#### HU-03: Editor TinyMCE reutilizable

```text
Como:        Desarrollador / administrador
Quiero:      Un componente TextEditor basado en TinyMCE, con API key desde .env
Para:        Reutilizar el enriquecedor de texto en blogs y en secciones futuras

Prioridad:   Alta
Estimación:  S
Dependencias: Ninguna
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: componente compartido
  Dado que:  el formulario de blog usa TextEditor
  Cuando:    el admin escribe negrillas, listas, enlaces o tablas
  Entonces:  el HTML se guarda en description y se muestra igual en el detalle
```

```gherkin
CRITERIO-3.2: API key desde entorno
  Dado que:  existe NEXT_PUBLIC_TINYMCE_API_KEY en el .env del frontend
  Cuando:    se monta TextEditor
  Entonces:  TinyMCE se inicializa con esa key y no hay apiKey hardcodeada en el código
```

**Error Path**
```gherkin
CRITERIO-3.3: key ausente
  Dado que:  NEXT_PUBLIC_TINYMCE_API_KEY está vacía
  Cuando:    se abre el modal de crear/editar blog
  Entonces:  se muestra un mensaje claro de configuración y no se rompe el resto del formulario
```

### Reglas de Negocio
1. Reutilizar la tabla existente `blogs`. No crear una tabla nueva ni migrar columnas.
2. `title` es obligatorio, máximo 255 caracteres.
3. `description` es HTML generado por TinyMCE y es obligatorio (no vacío / no solo `<p></p>` o espacios).
4. La imagen de portada es obligatoria al crear. Al editar es opcional si ya existe.
5. Imagen: solo JPG, PNG o WEBP, máximo 5 MB. Se guarda en almacenamiento local y la columna `image` guarda la ruta pública `/media/blogs/{id}/{archivo}`.
6. `link` es NOT NULL: el backend genera un slug único a partir del título (si colisiona, sufijo numérico). No se pide en el formulario.
7. Visibilidad: `state_id = 4` visible, `state_id = 5` oculto. Solo los visibles y no eliminados salen en la API pública.
8. Eliminación es lógica: `deleted_at`, `deleted_by` (id del admin como string) y `state_id = 5`.
9. Solo el rol `admin` puede gestionar blogs. El público no autenticado puede listar y ver detalle de visibles.
10. `created_by` es el usuario autenticado que crea el blog.
11. El contenido HTML es de autoría administrativa; se renderiza en el detalle. No incluir plugins TinyMCE de ejecución de scripts.
12. El componente `TextEditor` vive en `frontend/src/shared/components/` para reutilización futura; el módulo blogs no lo encapsula como privado.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Blog` | tabla existente `blogs` | sin migración de esquema | Artículo con título, HTML, portada y visibilidad |
| `State` | tabla `states` | ninguna | 4 = visible, 5 = oculto |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | auto-generado | Identificador |
| `state_id` | bigint FK states | sí | 4 o 5 | visible / oculto |
| `created_by` | bigint FK users | sí | usuario autenticado | Autor administrativo |
| `title` | varchar(255) | sí | 1–255 chars | Título |
| `description` | text | sí | HTML no vacío | Cuerpo TinyMCE |
| `link` | text | sí | slug único generado | Slug derivado del título |
| `image` | text | sí | ruta `/media/blogs/...` o URL absoluta heredada | Portada |
| `deleted_at` | varchar(255) | no | ISO string al borrar | Soft delete |
| `deleted_by` | varchar(255) | no | id admin como string | Quién eliminó |
| `created_at` | timestamp | no | UTC naive | Creación |
| `updated_at` | timestamp | no | UTC naive | Actualización |

#### Índices / Constraints
- PK `id` y sequence `blogs_id_seq` ya existen.
- FK `blogs_state_id_foreign` → `states.id`.
- FK `blogs_created_by_foreign` → `users.id`.
- No se agregan índices nuevos en esta iteración. El listado ordena por `id DESC`.
- Unicidad de `link`: garantizarla en aplicación al generar slug (la columna no tiene unique constraint).

### API Endpoints

Prefijo: `/api/blogs` (mismo estilo que cursos `/api/courses`, no `/api/v1`).

#### GET /api/blogs/public
- **Descripción**: Lista blogs visibles no eliminados
- **Auth requerida**: no
- **Response 200**:
  ```json
  [
    {
      "id": 1,
      "state_id": 4,
      "title": "string",
      "excerpt": "string",
      "image": "/media/blogs/1/abc.webp",
      "link": "evaluart-innovacion",
      "created_at": "2022-03-22T00:00:00",
      "updated_at": "2022-03-22T00:00:00"
    }
  ]
  ```
- `excerpt`: texto plano recortado (~220 chars) a partir de `description` sin tags HTML.

#### GET /api/blogs/public/{blog_id}
- **Descripción**: Detalle público
- **Auth requerida**: no
- **Response 200**:
  ```json
  {
    "id": 1,
    "state_id": 4,
    "title": "string",
    "description": "<p>HTML...</p>",
    "image": "/media/blogs/1/abc.webp",
    "link": "evaluart-innovacion",
    "created_at": "iso8601",
    "updated_at": "iso8601"
  }
  ```
- **Response 404**: oculto, eliminado o inexistente

#### GET /api/blogs/admin
- **Descripción**: Lista todos los no eliminados (visibles y ocultos)
- **Auth requerida**: sí, admin
- **Response 200**: lista de `AdminBlogResponse` (incluye `state_id`, `created_by`, `deleted_at`)
- **Response 401**: sin token
- **Response 403**: sin rol admin

#### GET /api/blogs/admin/{blog_id}
- **Descripción**: Detalle admin incluyendo ocultos
- **Auth requerida**: sí, admin
- **Response 200**: blog completo
- **Response 404**: no encontrado o eliminado

#### POST /api/blogs/admin
- **Descripción**: Crea blog (multipart)
- **Auth requerida**: sí, admin
- **Request**: `multipart/form-data`
  - `title` string
  - `description` string HTML
  - `state_id` int opcional, default 4
  - `image` file obligatorio
- **Response 201**: blog creado
- **Response 400**: validación (título, HTML vacío, imagen inválida o ausente)
- **Response 401/403**: auth

#### PUT /api/blogs/admin/{blog_id}
- **Descripción**: Actualiza título, HTML, visibilidad y opcionalmente portada
- **Auth requerida**: sí, admin
- **Request**: `multipart/form-data`
  - `title`, `description`, `state_id`
  - `image` file opcional
- **Response 200**: blog actualizado
- **Response 400**: validación
- **Response 404**: no encontrado

#### PATCH /api/blogs/admin/{blog_id}/visibility
- **Descripción**: Alterna o fija visibilidad
- **Auth requerida**: sí, admin
- **Request Body**:
  ```json
  { "state_id": 5 }
  ```
- `state_id` solo 4 o 5
- **Response 200**: blog actualizado
- **Response 400**: state_id inválido
- **Response 404**: no encontrado

#### DELETE /api/blogs/admin/{blog_id}
- **Descripción**: Soft delete
- **Auth requerida**: sí, admin
- **Response 204**: eliminado
- **Response 404**: no encontrado

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `TextEditor` | `frontend/src/shared/components/text-editor.tsx` | `value, onChange, disabled?` | TinyMCE reutilizable; apiKey desde env |
| `BlogCard` | `frontend/src/modules/blogs/presentation/components/blog-card.tsx` | `blog` | Tarjeta pública (portada, título, extracto) |
| `BlogCoverField` | `frontend/src/modules/blogs/presentation/components/blog-cover-field.tsx` | `currentImage, file, onFileChange` | Dropzone de portada (mismo patrón que foto de miembro) |
| `BlogFormModal` | `frontend/src/modules/blogs/presentation/modals/blog-form-modal.tsx` | `isOpen, blog, onSubmit, onClose` | Modal "Crear blog" / "Editar blog" con título, TinyMCE y portada |
| `BlogActionsMenu` | `frontend/src/modules/blogs/presentation/components/blog-actions-menu.tsx` | `blog, onEdit, onToggleVisibility, onDelete` | Menú Acciones |
| `BlogStatusBadge` | `frontend/src/modules/blogs/presentation/components/blog-status-badge.tsx` | `stateId` | VISIBLE / OCULTO |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| `PublicBlogsPage` | `modules/blogs/presentation/pages/public-blogs-page.tsx` | `/blogs` | no |
| `PublicBlogDetailPage` | `modules/blogs/presentation/pages/public-blog-detail-page.tsx` | `/blogs/[blog_id]` | no |
| `AdminBlogsPage` | `modules/blogs/presentation/pages/admin-blogs-page.tsx` | `/admin/blogs` | sí, admin |

App Router:
- `frontend/src/app/(public)/blogs/page.tsx`
- `frontend/src/app/(public)/blogs/[blog_id]/page.tsx`
- `frontend/src/app/(protected)/admin/blogs/page.tsx`

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| Estado local en páginas | N/A | `useState` + fetch en `useEffect` | Seguir el patrón de cursos/miembros; no introducir store global |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listPublicBlogs()` | `modules/blogs/infrastructure/blogs-api.ts` | `GET /api/blogs/public` |
| `getPublicBlog(id)` | mismo | `GET /api/blogs/public/{id}` |
| `listAdminBlogs(token)` | mismo | `GET /api/blogs/admin` |
| `getAdminBlog(token, id)` | mismo | `GET /api/blogs/admin/{id}` |
| `createBlog(token, formData)` | mismo | `POST /api/blogs/admin` |
| `updateBlog(token, id, formData)` | mismo | `PUT /api/blogs/admin/{id}` |
| `setBlogVisibility(token, id, stateId)` | mismo | `PATCH /api/blogs/admin/{id}/visibility` |
| `deleteBlog(token, id)` | mismo | `DELETE /api/blogs/admin/{id}` |

#### UI admin (referencia de capturas)
- Listado admin: tarjetas/lista a la izquierda; modal derecho "Crear blog".
- Modal: input "Título del blog", editor TinyMCE (menú File/Edit/View/Insert/Format/Tools/Table + toolbar undo/redo, blocks, font, size, bold/italic/underline, align, lists), zona "Archivos / Primero sube una imagen" con dropzone, botones Cancelar y Guardar.
- Detalle: portada ancha, título, badge VISIBLE/OCULTO, menú Acciones, cuerpo HTML.
- Confirmar eliminación con `ConfirmActionModal` existente.

#### UI pública
- Header público reutilizando el de cursos (añadir enlace Blogs).
- Grid de `BlogCard`.
- Detalle: portada, título, fecha, HTML en contenedor `.blog-content` con estilos tipográficos (párrafos, headings, listas, tablas, enlaces, imágenes internas del HTML).
- Resolver `image` con `resolveMediaSrc`.

#### Navegación y RBAC
- Agregar `{ "label": "Blogs", "href": "/admin/blogs" }` en `NAVIGATION_BY_ACCESS["admin"]` (`backend/app/modules/auth/application/rbac.py`).
- Icono de nav para `/admin/blogs` en `navIconForHref` (puede reutilizar `bolt` o añadir un icono de documento).
- Sitemap: incluir `/blogs`.
- `RoleGate requiredAccess="admin"` en la página admin.

### Arquitectura y Dependencias
- Paquetes nuevos: `@tinymce/tinymce-react` en `frontend`.
- Variable de entorno frontend: `NEXT_PUBLIC_TINYMCE_API_KEY` en `frontend/.env.example` y `frontend/.env.local` (gitignored). TinyMCE Cloud exige key pública de cliente; no hardcodear.
- Backend: montar `StaticFiles` en `/media/blogs` desde `storage/blogs` (mismo patrón que miembros).
- Storage adapter: `LocalBlogImageStorage` en `backend/app/modules/blogs/infrastructure/files.py`.
- Registrar router en `backend/app/main.py`.
- No hay cambios de esquema PostgreSQL. No se requiere PostgreSQL Specialist.

### Arquitectura hexagonal del módulo backend

```text
backend/app/modules/blogs/
  domain/entities.py          Blog, excepciones, VISIBLE_STATE_ID, HIDDEN_STATE_ID
  application/use_cases.py    list public/admin, get, create, update, set visibility, delete
  application/ports.py        BlogRepository protocol + BlogImageStorage protocol (si aplica)
  infrastructure/repository.py
  infrastructure/files.py
  presentation/api/router.py
  presentation/api/schemas.py
  presentation/api/dependencies.py
```

Patrón: igual a `courses` / `members`. Domain no conoce FastAPI ni SQLAlchemy. SQL crudo con SQLAlchemy `text()` como el resto del proyecto.

### Notas de Implementación
> Reutilizar `ConfirmActionModal`, `RoleGate`, `resolveMediaSrc`, estilos `modal-backdrop`, `photo-dropzone`, `actions-menu`, `status-badge`.
> TinyMCE: plugins `preview importcss autosave save autolink lists table link charmap wordcount`; toolbar `undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent`.
> El `setup` focus/blur del código legado (desactivar pointer-events de inputs) se puede omitir si el editor vive en un modal propio; si hay conflictos de foco, aplicar `onClick stopPropagation` en el wrapper como en el snippet original.
> `link` no se muestra en UI; se regenera al cambiar el título si el slug actual deriva del título anterior, o se mantiene estable si se prefiere no romper URLs. Decisión: regenerar slug al cambiar título (no hay URLs públicas por slug en esta iteración; el detalle usa `{id}`).
> Sanitización: no ejecutar scripts; TinyMCE con los plugins listados no habilita `code` ni media scripts. Renderizar con `dangerouslySetInnerHTML` solo en el contenedor de contenido.
> Tests: los agentes de implementación no generan tests; el checklist de tests queda para una iteración posterior si se solicita.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] Crear entidad `Blog`, constantes de estado y excepciones de dominio
- [x] Implementar `BlogRepository` — list public/admin, get, create, update, set_visibility, soft delete, generate unique slug
- [x] Implementar `LocalBlogImageStorage` — validar JPG/PNG/WEBP, máx 5 MB, persistir en `storage/blogs`
- [x] Implementar use cases de listado público, CRUD admin y visibilidad
- [x] Implementar schemas y router `/api/blogs`
- [x] Registrar router y mount `/media/blogs` en `main.py`

#### Tests Backend
- [ ] `test_list_public_excludes_hidden_and_deleted`
- [ ] `test_get_public_hidden_raises_not_found`
- [ ] `test_create_requires_title_html_and_image`
- [ ] `test_update_keeps_image_when_file_omitted`
- [ ] `test_soft_delete_hides_from_admin_and_public`
- [ ] `test_admin_endpoints_require_admin`

### Frontend

#### Implementación
- [x] Instalar `@tinymce/tinymce-react` y documentar `NEXT_PUBLIC_TINYMCE_API_KEY` en `.env.example`
- [x] Crear `TextEditor` reutilizable en `shared/components`
- [x] Crear `blogs-api`, tipos de dominio y páginas públicas `/blogs` y `/blogs/[blog_id]`
- [x] Crear `AdminBlogsPage` + modal crear/editar + dropzone de portada + menú Acciones + badge
- [x] Registrar ruta admin, ítem de navegación RBAC e icono
- [x] Estilos de contenido enriquecido, modal de blog y tarjetas; agregar Blogs al header público y sitemap

#### Tests Frontend
- [ ] `BlogCard` muestra título e imagen
- [ ] `BlogFormModal` envía FormData con título, HTML e imagen
- [ ] Detalle público renderiza HTML y no el markup
- [ ] Acciones ocultar/eliminar invocan las APIs correctas

### QA
- [x] Validar criterios CRITERIO-1.1 a 3.3 en UI
- [x] Verificar que un blog oculto no aparece en `/blogs`
- [x] Verificar TinyMCE (negrita, lista, enlace, tabla) persiste en detalle
- [x] Verificar API key no está hardcodeada
- [x] Actualizar estado spec: `status: IMPLEMENTED`
