---
id: SPEC-020
status: IMPLEMENTED
feature: documentos-onboarding-miembros
created: 2026-09-28
updated: 2026-09-28
author: spec-generator
version: "1.1"
related-specs: ["SPEC-004", "SPEC-005", "SPEC-012", "SPEC-018"]
---

# Spec: Chips de documentos, visor y solicitud subida en Miembros

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
En el padrón de Miembros, el administrador ve con chips si cada persona ya subió autorización, solicitud y cédula. Clic en un chip subido, en un documento del modal de aprobar o en un botón “Descargar …” abre un visor en pantalla (PDF o imagen) sin forzar la descarga. El archivo de solicitud es el que el aspirante subió, no una plantilla. El modal de aprobar distingue “aún no hay comprobante” de “ya pagó y los documentos se van pintando”.

### Requerimiento de Negocio
En el módulo de Miembros, saber en columnas con chips si ya subieron los documentos de autorización, la solicitud y la cédula. La solicitud que subieron es la que se debe mostrar en Descargar solicitud. En el modal de aprobar, si el miembro todavía no ha subido el comprobante de pago, debe salir claro que no se ha subido y que por ello tampoco puede subir los otros documentos. Si ya subió el pago, mostrar la pantalla de documentos e irlos pintando. Al hacer clic sobre cada documento se ve un previsualizable sin descargar; igual en los chips de la tabla y en todo botón que diga Descargar.

### Historias de Usuario

#### HU-01: Chips de documentos en el listado

```
Como:        Administrador
Quiero:      Ver en la tabla si cada miembro subió autorización, solicitud y cédula
Para:        Saber de un vistazo quién completó el onboarding sin abrir el modal

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-004, SPEC-018
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: chips por documento en la tabla
  Dado que:  el admin está en /admin/miembros
  Cuando:    carga el listado
  Entonces:  hay una columna Documentos (visible por defecto) con tres chips: Autorización, Solicitud y Cédula
             y cada chip está verde (Subida) o gris (Pendiente) según membership_payments
             un chip Subida es clicable y abre el visor del archivo; Pendiente no abre nada
```

**Happy Path**
```gherkin
CRITERIO-1.2: filtrar por documento subido
  Dado que:  el admin filtra Autorización, Solicitud o Cédula
  Cuando:    elige Subida o Pendiente
  Entonces:  el listado solo muestra miembros que coinciden con ese archivo
```

**Edge Case**
```gherkin
CRITERIO-1.3: miembro sin fila de pago
  Dado que:  un miembro no tiene fila en membership_payments (registro legado)
  Cuando:    aparece en la tabla
  Entonces:  los tres chips quedan Pendiente
```

#### HU-02: Ver la solicitud subida

```
Como:        Administrador
Quiero:      Que Acciones → Descargar solicitud muestre el PDF que el miembro subió
Para:        Revisar la solicitud firmada real en un visor, no una plantilla ni un archivo forzado a disco

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01, HU-04
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: visor del archivo subido
  Dado que:  el miembro tiene signed_solicitud_path en membership_payments
  Cuando:    el admin pulsa Descargar solicitud
  Entonces:  se abre el visor con ese PDF (el mismo que subió en /afiliacion/documentos)
             y no se dispara una descarga automática
```

**Error Path**
```gherkin
CRITERIO-2.2: sin solicitud subida
  Dado que:  el miembro no ha subido la solicitud
  Cuando:    el admin pulsa Descargar solicitud
  Entonces:  el botón está deshabilitado o el API responde 404
             "El miembro no ha subido la solicitud firmada."
             y no se genera un PDF en blanco
```

#### HU-03: Modal de aprobar según comprobante y documentos

```
Como:        Administrador
Quiero:      Ver en Aprobar afiliación si falta el pago o cómo van los documentos
Para:        Entender por qué no se puede aprobar y qué ya está listo

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-018
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: sin comprobante de pago
  Dado que:  el miembro está POR HABILITAR y tiene membership_payments
             pero aún no subió voucher (status pending_payment)
  Cuando:    el admin abre Aprobar afiliación
  Entonces:  ve un aviso claro: no ha subido el comprobante de pago
             y por eso tampoco puede subir autorización, cédula ni solicitud
             los tres documentos aparecen bloqueados/pendientes
             y Aprobar está deshabilitado
```

**Happy Path**
```gherkin
CRITERIO-3.2: con pago, documentos se van pintando
  Dado que:  el miembro ya subió el comprobante (status pending_review)
  Cuando:    el admin abre Aprobar afiliación
  Entonces:  ve la lista de documentos (comprobante, autorización, cédula, solicitud)
             cada uno con chip Subida (verde, clic abre visor) o Pendiente (gris)
             clic en el documento o en Ver abre el previsualizable sin descargar
             y Aprobar solo se habilita cuando los tres documentos de onboarding están subidos
```

**Edge Case**
```gherkin
CRITERIO-3.3: registro legado sin membership_payments
  Dado que:  el miembro está POR HABILITAR y no tiene fila de pago
  Cuando:    el admin abre Aprobar afiliación
  Entonces:  puede aprobarlo (flujo ya existente) y no se exige voucher ni documentos
```

#### HU-04: Previsualizar sin descargar

```
Como:        Administrador
Quiero:      Ver cada documento en un visor al hacer clic, sin bajarlo al disco
Para:        Revisar autorización, solicitud, cédula, comprobante y certificado más rápido

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01, HU-02, HU-03
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: visor desde el modal de aprobar
  Dado que:  el miembro ya subió al menos un documento
  Cuando:    el admin hace clic en ese documento (chip, fila o botón Ver)
  Entonces:  se abre un modal visor con el PDF o la imagen embebida
             y no se dispara descarga automática
```

**Happy Path**
```gherkin
CRITERIO-4.2: visor desde chips de la tabla
  Dado que:  el chip Solicitud (o Autorización o Cédula) está Subida
  Cuando:    el admin hace clic en el chip
  Entonces:  se abre el mismo visor con ese archivo
```

**Happy Path**
```gherkin
CRITERIO-4.3: botones Descargar del módulo Miembros abren visor
  Dado que:  el admin está en Miembros
  Cuando:    pulsa Descargar solicitud, Descargar certificado o cualquier Ver/Descargar de documentos de onboarding
  Entonces:  se abre el visor (PDF o imagen) en lugar de forzar la descarga
             el visor puede ofrecer “Descargar archivo” como acción secundaria
```

**Error Path**
```gherkin
CRITERIO-4.4: archivo no disponible
  Dado que:  el documento no está subido o el archivo no existe en storage
  Cuando:    el admin intenta verlo
  Entonces:  el control está deshabilitado o el visor muestra el error
             sin descargar nada
```

### Reglas de Negocio
1. Autorización, solicitud y cédula se consideran subidas si el path en `membership_payments` no está vacío.
2. El comprobante se considera subido si `voucher_path` no está vacío o el status es `pending_review` / `approved`.
3. Mientras no hay comprobante, el aspirante no puede subir los otros documentos (el gate de afiliación ya lo impide); el modal de admin debe explicarlo, no mostrar solo “faltan documentos”.
4. `GET /api/members/{id}/download` deja de generar la plantilla de solicitud: sirve `signed_solicitud_path`.
5. El certificado (`/certificate`) sigue siendo el PDF institucional generado; en UI se abre en el visor, no como descarga forzada.
6. Solo el rol `admin` ve chips, filtros y visor de estos archivos.
7. Los miembros habilitados también muestran chips (documento subido en onboarding o pendiente).
8. No se exige migración de datos: registros Laravel sin `membership_payments` quedan Pendiente y se pueden aprobar como hoy.
9. Clic en documento, chip Subida o botón Descargar/Ver del módulo Miembros abre el visor. No hay descarga automática. Un botón “Descargar archivo” dentro del visor es opcional y secundario.
10. El visor muestra PDF embebido e imagen con `<img>`. Alcance: módulo Miembros (tabla, menú Acciones, modal Aprobar). No se cambian CSV, reportes ni descargas de otros módulos.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Member` | listado `users` + `profiles` + `membership_payments` | modificada | Flags de documentos en el listado |
| `MemberColumn` | catálogo en código | modificada | Columna Documentos + filtros por archivo |
| `MembershipPayment` | `membership_payments` | sin cambio de esquema | Fuente de paths de voucher, autorización, cédula y solicitud |
| `ApprovalPreview` | respuesta de preview | modificada | Etapa de onboarding para el modal |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `has_signed_authorization` | bool | sí | derivado de path | Autorización firmada subida |
| `has_signed_solicitud` | bool | sí | derivado de path | Solicitud firmada subida |
| `has_identity_document` | bool | sí | derivado de path | Cédula subida |
| `has_voucher` | bool | sí (preview) | derivado de path | Comprobante de pago subido |
| `onboarding_stage` | string | sí (preview) | enum | `legacy_no_payment` \| `awaiting_voucher` \| `awaiting_documents` \| `ready_to_approve` |

No hay tabla nueva. `membership_payments` ya tiene `signed_authorization_path`, `identity_document_path`, `signed_solicitud_path` y `voucher_path`.

#### Índices / Constraints
- Ninguno nuevo. Join 1:1 `LEFT JOIN membership_payments mp ON mp.user_id = u.id`.

### API Endpoints

#### GET /api/members
- **Descripción**: Listado paginado. Cada ítem incluye los tres flags de documentos. El catálogo `columns` agrega `documents` (visible por defecto, no ordenable) y, para el picker de columnas, las claves de filtro `has_signed_authorization`, `has_signed_solicitud`, `has_identity_document`.
- **Auth requerida**: sí (admin)
- **Query extra**: `has_signed_authorization=true|false`, `has_signed_solicitud=true|false`, `has_identity_document=true|false`
- **Response 200**: ítems con
  ```json
  {
    "user_id": 778,
    "has_signed_authorization": false,
    "has_signed_solicitud": true,
    "has_identity_document": false
  }
  ```

#### GET /api/members/{member_id}/download
- **Descripción**: Sirve la solicitud **subida** (`signed_solicitud_path`) para el visor, no la plantilla generada.
- **Auth requerida**: sí (admin)
- **Headers**: `Content-Disposition: inline; filename="..."` y `Content-Type` real (`application/pdf` o imagen). El frontend pide el blob con el token y lo muestra; no usa `<a download>`.
- **Response 200**: cuerpo del archivo
- **Response 404**: miembro inexistente o sin solicitud subida. Mensaje: `El miembro no ha subido la solicitud firmada.`
- **Response 401/403**: sin sesión o sin rol admin

#### GET /api/members/{member_id}/onboarding-documents/{kind}
- **Descripción**: `kind` = `authorization` | `identity` | `voucher` | `solicitud`. Sirve el archivo subido con `Content-Disposition: inline` para el visor (chips y modal de aprobar).
- **Response 200**: archivo
- **Response 404**: no subido o no encontrado

#### GET /api/members/{member_id}/certificate
- **Descripción**: PDF generado, `Content-Disposition: inline`, se abre en el mismo visor.

#### GET /api/members/{member_id}/approval-preview
- **Descripción**: Ya no falla con 400 cuando falta el voucher. Devuelve preview con `onboarding_stage` y flags para pintar el modal.
- **Auth requerida**: sí (admin)
- **Response 200**:
  ```json
  {
    "user_id": 778,
    "payment_status": "pending_payment",
    "onboarding_stage": "awaiting_voucher",
    "has_voucher": false,
    "has_signed_authorization": false,
    "has_identity_document": false,
    "has_signed_solicitud": false,
    "voucher_url": null,
    "signed_authorization_url": null,
    "identity_document_url": null,
    "signed_solicitud_url": null
  }
  ```
- **Response 404**: miembro no encontrado o no está POR HABILITAR

#### POST /api/members/{member_id}/approve
- **Descripción**: Sin cambio de reglas: `awaiting_voucher` y `awaiting_documents` siguen sin poder aprobar; `legacy_no_payment` y `ready_to_approve` sí.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `MemberDocumentChips` | `frontend/src/modules/members/presentation/components/member-document-chips.tsx` | `member`, `onPreview` | Tres chips; Subida abre visor |
| `OnboardingDocumentRow` | `frontend/src/modules/members/presentation/components/onboarding-document-row.tsx` | `label`, `uploaded`, `locked`, `onPreview` | Fila del modal: chip + Ver o Pendiente |
| `MemberDocumentViewerModal` | `frontend/src/modules/members/presentation/modals/member-document-viewer-modal.tsx` | `title`, `blobUrl`, `contentType`, `onClose` | Visor (PDF iframe o imagen). Cerrar con Escape / botón |

#### Páginas nuevas
Ninguna. Se modifica `/admin/miembros` y el modal existente.

#### Hooks y State
No hay store nuevo. El listado usa los flags del `GET /api/members`. El modal usa `onboarding_stage` del preview.

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listMembers` | `members-api.ts` | `GET /api/members` (query de documentos) |
| `fetchMemberDocumentBlob` | `members-api.ts` | blob autenticado (solicitud, certificado, onboarding) para el visor |
| `getApprovalPreview` | `membership-api.ts` | preview con `onboarding_stage` |

#### UI del modal Aprobar afiliación
1. **`awaiting_voucher`**: alerta destacada (no un `muted` suave): “Aún no ha subido el comprobante de pago. Mientras no complete el pago, no puede subir la autorización, la cédula ni la solicitud.” Debajo, los tres documentos en estado bloqueado/pendiente. Botón Aprobar deshabilitado.
2. **`awaiting_documents` / `ready_to_approve`**: lista de comprobante + autorización + cédula + solicitud. Chip verde + clic/Ver abre visor si está; chip gris “Pendiente” si no. Aprobar habilitado solo en `ready_to_approve`.
3. **`legacy_no_payment`**: texto actual de registro sin pago del sistema nuevo; Aprobar habilitado.

#### Visor de documentos
- Un solo modal reutilizable en la página de Miembros.
- PDF: `<iframe>` o `<embed>` con blob URL.
- Imagen: `<img>`.
- Título del documento (Autorización, Solicitud, Cédula, Comprobante, Certificado).
- Acciones: Cerrar. Opcional: “Descargar archivo” (secundario).
- Los botones del menú Acciones y del modal de aprobar dejan de usar `<a download>` / `link.click()` automático.

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: ninguno
- Servicios externos: ninguno
- Impacto: módulo `members` (listado, descarga) y `membership` (preview). Sin migración SQL.

### Notas de Implementación
> Join de `membership_payments` en `MEMBER_SELECT` y en el `COUNT` del listado. Los flags se derivan con `COALESCE(mp.signed_*_path, '') <> ''`.
> `DownloadMemberPdfUseCase` para `kind == "solicitud"` deja de llamar `generate_solicitud`. Reutilizar la resolución de archivo de `DownloadOnboardingDocumentUseCase` (storage/membership).
> `GetApprovalPreviewUseCase` no debe lanzar “El miembro aún no ha subido el comprobante de pago”: ese caso es `awaiting_voucher` en 200.
> `ApproveMembershipUseCase` sí sigue rechazando si hay fila de pago y falta voucher o documentos.
> Chips: reutilizar `.status-badge-success` (Subida) y `.status-badge-muted` (Pendiente). Chip Subida es `button`. En el modal, el aviso de falta de pago usa clase de alerta/error, no `muted`.
> Endpoints de archivo: `Content-Disposition: inline`. El visor hace `fetch` con Bearer, `blob()`, `URL.createObjectURL`, y `revokeObjectURL` al cerrar.
> No cambiar botones Descargar de otros módulos (pagos, cursos, dashboard, votaciones, perfil).
> El picker de columnas de Miembros guarda visibilidad en `localStorage`; al agregar `documents`, si el admin ya tiene un array guardado, forzar incluir `documents` la primera vez que exista en el catálogo (o documentar que puede activarla en Columnas). Preferir: si el id `documents` no está en el array guardado y es `default_visible`, insertarlo antes de `actions`.
> Tests: preview `awaiting_voucher` no 400; listado expone flags; descarga sin path → 404; fake repo de miembros con `membership_payments`.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] Añadir `has_signed_authorization`, `has_signed_solicitud`, `has_identity_document` a `Member` y al SELECT con LEFT JOIN a `membership_payments`
- [x] Añadir columnas/filtros al catálogo `MEMBER_COLUMNS` y a `MemberListQuery`
- [x] Servir esos campos en `MemberResponse`
- [x] Cambiar `GET /api/members/{id}/download` y documentos de onboarding/certificado a `Content-Disposition: inline` y solicitud subida o 404
- [x] Extender `GetApprovalPreviewUseCase` con `onboarding_stage`, `has_voucher` y flags; no fallar en `pending_payment`
- [x] Exponer los campos nuevos en `ApprovalPreviewResponse`

#### Tests Backend
- [ ] `test_member_list_includes_document_flags`
- [ ] `test_member_list_filters_by_uploaded_solicitud`
- [ ] `test_download_solicitud_returns_uploaded_file`
- [x] `test_download_solicitud_without_upload_returns_404`
- [x] `test_approval_preview_awaiting_voucher_does_not_404`
- [x] `test_approval_preview_paints_uploaded_documents`

### Frontend

#### Implementación
- [x] Extender `Member` y `ApprovalPreview` con flags y `onboarding_stage`
- [x] Renderizar chips de Autorización, Solicitud y Cédula
- [x] Filtros Subida/Pendiente en esas columnas
- [x] Deshabilitar Descargar solicitud si no hay archivo
- [x] Rehacer el modal de aprobar: alerta sin pago vs lista que se pinta
- [x] Crear `MemberDocumentViewerModal` (PDF/imagen) y abrir visor desde chips, Acciones y modal de aprobar
- [x] Sustituir descargas automáticas del módulo Miembros por el visor

#### Tests Frontend
- [ ] `MemberDocumentChips` pinta Subida/Pendiente
- [ ] Modal `awaiting_voucher` muestra el aviso y deshabilita Aprobar
- [ ] Modal `awaiting_documents` muestra pendientes y no deja aprobar
- [ ] Modal `ready_to_approve` habilita Aprobar y abre visor al clic
- [ ] Chip Subida abre visor; Pendiente no
- [ ] Botón Descargar solicitud/certificado abre visor sin descarga automática

### QA
- [ ] Ejecutar skill `/gherkin-case-generator` → criterios CRITERIO-1.1 a 4.4
- [ ] Ejecutar skill `/risk-identifier` → clasificación ASD de riesgos
- [ ] Revisar cobertura de tests contra criterios de aceptación
- [ ] Validar que todas las reglas de negocio están cubiertas
- [x] Actualizar estado spec: `status: IMPLEMENTED`
