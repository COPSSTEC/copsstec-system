---
id: SPEC-004
status: IMPLEMENTED
feature: gestion-miembros-admin
created: 2026-09-09
updated: 2026-09-09
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002"]
---

# Spec: Gestión administrativa de Miembros

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Crear un módulo administrativo **Miembros** exclusivo para el rol `admin`. Debe listar usuarios con rol `miembro` y su `profile` asociado, con tabla paginada, filtros, ordenamiento y visibilidad de columnas reutilizable. Incluye CRUD, descargas PDF en blanco, reenvío de credenciales y deshabilitación que impide el login.

### Requerimiento de Negocio
El administrador necesita un módulo llamado Miembros, solo accesible por el rol administrador, con una tabla paginada y filtros por nombres, apellidos, cédulas, correos, fechas de registro y fechas de cumpleaños. La tabla debe ser un componente genérico reutilizable en otros módulos, permitir filtrar y ordenar por columna, y mostrar u ocultar columnas según los datos de `profiles`. Debe existir CRUD de cada miembro (usuario + profile). Cada registro debe tener acciones: Editar, Descargar, Descargar certificado, Reenviar credenciales, Eliminar y Deshabilitar. No incluir Pagos. Las descargas generan un PDF en blanco. Deshabilitar impide que el miembro ingrese por `/login`.

### Historias de Usuario

#### HU-01: Listar miembros con tabla paginada

```
Como:        Administrador
Quiero:      Ver una tabla paginada de miembros con su perfil
Para:        Gestionar el padrón del COPSSTEC

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-002
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: listado paginado de miembros
  Dado que:  existen usuarios con rol miembro y profile asociado
  Cuando:    el admin abre /admin/miembros
  Entonces:  ve una tabla paginada con foto, nombre, cédula, contactos, cumpleaños, estado, fecha de registro y acciones
```

**Error Path**
```gherkin
CRITERIO-1.2: acceso denegado a no admin
  Dado que:  un usuario autenticado no tiene rol admin
  Cuando:    intenta abrir /admin/miembros o llamar /api/members
  Entonces:  el backend responde 403 y el frontend muestra acceso restringido
```

#### HU-02: Filtrar, ordenar y ocultar columnas

```
Como:        Administrador
Quiero:      Filtrar por columna, ordenar y mostrar u ocultar columnas del profile
Para:        Encontrar miembros y adaptar la vista a los datos que necesito

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: filtros por campos solicitados
  Dado que:  el admin está en Miembros
  Cuando:    filtra por nombres, apellidos, cédula, correo, fecha de registro o cumpleaños
  Entonces:  la tabla muestra solo los registros que coinciden, manteniendo paginación
```

**Happy Path**
```gherkin
CRITERIO-2.2: ordenamiento por columna
  Dado que:  la tabla tiene columnas ordenables
  Cuando:    el admin hace clic en el encabezado de una columna
  Entonces:  los resultados se reordenan asc/desc desde el backend
```

**Happy Path**
```gherkin
CRITERIO-2.3: visibilidad de columnas del profile
  Dado que:  el catálogo de columnas se deriva de campos de profiles y users
  Cuando:    el admin oculta o muestra columnas
  Entonces:  la tabla actualiza las columnas visibles sin recargar la página
```

#### HU-03: CRUD de miembro

```
Como:        Administrador
Quiero:      Crear, editar, consultar y eliminar un miembro
Para:        Mantener actualizado el padrón y sus credenciales de acceso

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: crear miembro con usuario y profile
  Dado que:  el admin completa el formulario de alta
  Cuando:    guarda el miembro
  Entonces:  se crea users + profiles + rol miembro y se genera una contraseña temporal
```

**Error Path**
```gherkin
CRITERIO-3.2: unicidad de email y cédula
  Dado que:  ya existe un email o identifier
  Cuando:    el admin intenta crear o editar con ese valor
  Entonces:  el backend responde 409 y el formulario muestra el conflicto
```

**Happy Path**
```gherkin
CRITERIO-3.3: eliminar miembro
  Dado que:  el admin confirma la eliminación
  Cuando:    ejecuta Eliminar
  Entonces:  el profile se marca deleted_at y el usuario queda deshabilitado
```

#### HU-04: Acciones por registro

```
Como:        Administrador
Quiero:      Ejecutar acciones sobre cada miembro
Para:        Editar, descargar documentos, reenviar acceso o bloquear el login

Prioridad:   Alta
Estimación:  M
Dependencias: HU-03
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: descargas PDF en blanco
  Dado que:  el admin elige Descargar o Descargar certificado
  Cuando:    confirma la acción
  Entonces:  el navegador descarga un PDF en blanco válido
```

**Happy Path**
```gherkin
CRITERIO-4.2: reenviar credenciales
  Dado que:  el miembro existe
  Cuando:    el admin pulsa Reenviar credenciales
  Entonces:  se genera una nueva contraseña, se actualiza users.password y se notifica/registra el envío
```

**Happy Path**
```gherkin
CRITERIO-4.3: deshabilitar impide login
  Dado que:  el miembro está habilitado
  Cuando:    el admin pulsa Deshabilitar
  Entonces:  users.state_id y profiles.state_id pasan a deshabilitado (3) y el login rechaza esas credenciales
```

### Reglas de Negocio
1. Solo el acceso `admin` puede ver o mutar el módulo.
2. Un miembro es un `users` con rol `miembro` (`model_has_roles.model_type = App\Models\User`) y su `profiles` 1:1 por `user_id`.
3. `state_id = 1` habilitado, `state_id = 3` deshabilitado, `state_id = 16` desafiliado.
4. Login y sesión autenticada deben rechazar `state_id` 3 y 16.
5. No implementar el botón Pagos.
6. Descargar y Descargar certificado generan PDF en blanco (placeholder).
7. Eliminar es soft-delete: `profiles.deleted_at` + deshabilitar usuario. No aparecen en el listado.
8. Email de acceso (`users.email`) y email de contacto (`profiles.email`) pueden ser distintos; ambos únicos.
9. `profiles.identifier` es único (cédula).
10. El componente de tabla es genérico y vive en `frontend/src/shared/components`.
11. El catálogo de columnas ocultables se deriva de campos reales de `profiles` (y datos de usuario relacionados).
12. No incluir Pagos en esta entrega.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `User` | tabla `users` | reutilizada | Credenciales, estado y email de acceso |
| `Profile` | tabla `profiles` | reutilizada | Datos personales del miembro |
| `ModelHasRole` | tabla `model_has_roles` | reutilizada | Asigna rol `miembro` |
| `Role` | tabla `roles` | reutilizada | Rol `miembro` (id 2) |
| `State` | tabla `states` | reutilizada | 1 habilitado, 3 deshabilitado |

#### Campos del modelo (alta/edición principales)
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `users.name` | string | sí | max 255 | names + lastname |
| `users.email` | string | sí | único, email | Correo de login |
| `users.password` | string | sí | bcrypt | Temporal al crear/reenviar |
| `users.state_id` | bigint | sí | 1 o 3 | Estado de acceso |
| `profiles.names` | string | sí | max 255 | Nombres |
| `profiles.lastname` | string | sí | max 255 | Apellidos |
| `profiles.identifier` | string | sí | único | Cédula |
| `profiles.email` | string | sí | único, email | Correo de contacto |
| `profiles.birtday` | string | sí | DD/MM/YYYY | Cumpleaños (typo legado) |
| `profiles.mobile_phone` | string | sí | max 255 | Celular |
| `profiles.date_register` | string | sí | DD/MM/YYYY | Fecha de registro |
| `profiles.foto_id` | text | sí | url o vacío | Foto |
| `profiles.state_id` | bigint | sí | 1 o 3 | Estado visible |

#### Índices / Constraints
- Reutilizar `users_email_unique`, `profiles_email_unique`, `profiles_identifier_unique`, `profiles_user_id_unique`.

### API Endpoints

Todas requieren auth + acceso `admin`.

#### GET /api/members
- Query: `page`, `page_size`, `q`, `names`, `lastname`, `identifier`, `email`, `date_register_from`, `date_register_to`, `birthday_from`, `birthday_to`, `state_id`, `sort_by`, `sort_dir`
- Response 200:
  ```json
  {
    "items": [],
    "page": 1,
    "page_size": 15,
    "total": 347,
    "columns": []
  }
  ```

#### GET /api/members/{member_id}
- Response 200: miembro completo
- Response 404: no encontrado

#### POST /api/members
- Request: datos de profile + `login_email` opcional
- Response 201: miembro + `temporary_password`
- Response 409: email o cédula duplicados

#### PUT /api/members/{member_id}
- Response 200: miembro actualizado
- Response 404 / 409

#### DELETE /api/members/{member_id}
- Response 204
- Soft-delete + deshabilitar

#### POST /api/members/{member_id}/disable
- Response 200: estado deshabilitado

#### POST /api/members/{member_id}/enable
- Response 200: estado habilitado

#### POST /api/members/{member_id}/resend-credentials
- Response 200: `{ "message": "...", "temporary_password": "..." }`

#### GET /api/members/{member_id}/download
- Response 200: `application/pdf` en blanco

#### GET /api/members/{member_id}/certificate
- Response 200: `application/pdf` en blanco

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `DataTable` | `frontend/src/shared/components/data-table.tsx` | Tabla genérica: sort, filter por columna, visibilidad, paginación |
| `MembersPage` | `frontend/src/modules/members/presentation/pages/members-page.tsx` | Pantalla principal |
| `MemberFormModal` | `frontend/src/modules/members/presentation/modals/member-form-modal.tsx` | Crear/editar |
| `MemberActionsMenu` | `frontend/src/modules/members/presentation/components/member-actions-menu.tsx` | Acciones por fila |
| `MemberStatusBadge` | `frontend/src/modules/members/presentation/components/member-status-badge.tsx` | Badge HABILITADO/DESHABILITADO |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| `MembersRoute` | `frontend/src/app/(protected)/admin/miembros/page.tsx` | `/admin/miembros` | admin |

### Arquitectura y Dependencias
- Módulo backend `members` con Domain / Application / Infrastructure / Presentation.
- Login existente debe rechazar estados 3 y 16.
- Navegación admin agrega "Miembros" → `/admin/miembros`.
- PDF placeholder sin librería externa (mismo enfoque que cursos).
- Reenvío de credenciales usa notifier por logs (sin SMTP real por ahora).
- No hay migración: se reutilizan tablas existentes.

### Notas de Implementación
> `birtday` y `date_register` son VARCHAR en formato DD/MM/YYYY. Los filtros de rango deben parsear solo valores que coincidan con ese patrón. El botón Pagos queda fuera de alcance.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Crear módulo `members` (domain, application, infrastructure, presentation)
- [x] Implementar listado paginado con filtros y sort
- [x] Implementar CRUD + disable/enable + resend credentials
- [x] Implementar PDFs en blanco
- [x] Registrar router en `main.py`
- [x] Bloquear login y sesión si `state_id` es 3 o 16
- [x] Agregar navegación admin a `/admin/miembros`

#### Tests Backend
- [x] Validar que un miembro deshabilitado no autentica
- [x] Validar listado admin-only responde 403

### Frontend

#### Implementación
- [x] Crear `DataTable` genérico en shared
- [x] Crear módulo `members` con listado, filtros, columnas y CRUD
- [x] Implementar menú de acciones (sin Pagos)
- [x] Registrar ruta `/admin/miembros`
- [x] Estilos de tabla, badge, menú y modal

#### Tests Frontend
- [x] Verificar build/lint disponible

### QA
- [x] Confirmar que no-admin no ve el módulo
- [x] Confirmar deshabilitar bloquea login
- [x] Actualizar estado spec: `status: IMPLEMENTED`
