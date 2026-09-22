---
id: SPEC-012
status: IMPLEMENTED
feature: autorizacion-debito-nuevos-miembros
created: 2026-09-22
updated: 2026-09-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-005", "SPEC-008"]
---

# Spec: Autorización de débito y cédula para nuevos miembros

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Insertar un paso obligatorio **solo para nuevos miembros** en el flujo de afiliación: después de registrar datos y pagar USD 10, el aspirante descarga un PDF de *Autorización de Débito* (clon del formato oficial, prellenado con sus datos de registro), lo firma fuera del sistema, lo vuelve a subir junto con una copia de su cédula en PDF, y recién entonces queda en espera de aprobación. Los miembros ya habilitados no ven este paso.

### Requerimiento de Negocio
Rediseñar el flujo de suscripción de un **nuevo miembro** únicamente. Tras registrar los datos se mantiene la pantalla de pago, pero el valor debe mencionarse sí o sí como **USD 10**. Después del pago, el nuevo miembro descarga un PDF que clona el diseño y el contenido del `FORMATO DE AUTORIZACION NUEVOS MIEMBROS.docx`, aumentado para mostrar los datos que registró al inicio. Debe poder descargarlo, firmarlo y volverlo a subir, junto con una copia de la cédula también en PDF. El flujo queda: registro → pago (USD 10) → documentos (PDF firmado + cédula) → revisión administrativa → dashboard al aprobar.

### Decisiones de esta spec

1. **Solo nuevos miembros.** Aplica a aspirantes `POR HABILITAR` (`state_id = 2`) con `membership_payments`. Un miembro ya habilitado (`state_id = 1`) nunca entra a `/afiliacion/documentos`, ni en renovaciones de SPEC-008.
2. **El valor de afiliación de nuevos registros es USD 10.00.** `MEMBERSHIP_FEE` pasa de `50.00` a `10.00`. La pantalla de pago lo muestra de forma destacada, no solo como un dato más de la lista. Los pagos de afiliación ya creados conservan el monto histórico.
3. **Impacto en cobertura (SPEC-008).** USD 10 de afiliación cubre **1 mes** (ya no 5). No se cambia la lógica de renovación mensual/anual.
4. **Datos prellenados en el PDF.** Del registro: nombres, apellidos, cédula y ciudad. La fecha del documento es la del día de la descarga. Tipo de cuenta, número, entidad bancaria, modalidad de débito y firma quedan en blanco para que el aspirante los complete al firmar.
5. **El dashboard no se abre al subir los PDFs.** El usuario pidió “llevarlo al dashboard” como cierre del flujo, pero el acceso de miembro habilitado sigue exigiendo aprobación admin (correo `@copsstec.com`, buzón y factura de SPEC-005). Tras los documentos el gate es `pending_approval` → `/afiliacion/en-revision`. El dashboard llega cuando el admin aprueba.
6. **El admin no puede aprobar** si faltan el PDF firmado o la cédula. El modal de aprobación muestra ambos documentos además del comprobante.

### Historias de Usuario

#### HU-01: Mostrar USD 10 en la pantalla de pago de afiliación

```
Como:        Aspirante nuevo
Quiero:      Ver de forma inequívoca que el valor a pagar es USD 10
Para:        Transferir el monto correcto de afiliación

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-005
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: valor destacado de USD 10
  Dado que:  acabo de registrarme como nuevo miembro
  Cuando:    abro `/afiliacion/pago`
  Entonces:  veo un recuadro o banner destacado con el texto "USD 10.00" / "$10" como valor de afiliación, además de QR, cuenta y subida de comprobante
```

**Happy Path**
```gherkin
CRITERIO-1.2: nuevos registros cobran 10.00
  Dado que:  un visitante completa el wizard de afiliación
  Cuando:    se crea `membership_payments`
  Entonces:  `amount` es `10.00` y `payment-info` devuelve ese valor
```

**Edge Case**
```gherkin
CRITERIO-1.3: pagos históricos no se reescriben
  Dado que:  ya existía una afiliación con amount 50.00
  Cuando:    ese aspirante vuelve a `/afiliacion/pago`
  Entonces:  se muestra el amount guardado de esa fila, no se actualiza a 10.00
```

#### HU-02: Descargar la autorización de débito prellenada

```
Como:        Aspirante que ya subió el comprobante
Quiero:      Descargar un PDF igual al formato oficial, con mis datos de registro
Para:        Firmarlo y devolverlo a COPSSTEC

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: paso de documentos después del pago
  Dado que:  subí el comprobante de afiliación
  Cuando:    el voucher queda `pending_review`
  Entonces:  navego a `/afiliacion/documentos` y no a `/afiliacion/en-revision` todavía
```

**Happy Path**
```gherkin
CRITERIO-2.2: PDF clona el formato y trae datos del registro
  Dado que:  estoy en `/afiliacion/documentos`
  Cuando:    descargo la autorización
  Entonces:  el PDF se titula "AUTORIZACIÓN DE DÉBITO", reproduce el texto legal del Word oficial y muestra ciudad, fecha del día, "Yo {nombres} {apellidos} con Cédula de identidad Número {cedula}"
```

**Error Path**
```gherkin
CRITERIO-2.3: no se descarga sin pago en revisión
  Dado que:  aún no he subido el comprobante
  Cuando:    pido GET /api/membership/authorization-pdf
  Entonces:  el backend responde 403 y no genera el archivo
```

#### HU-03: Subir PDF firmado y cédula

```
Como:        Aspirante nuevo
Quiero:      Subir la autorización firmada y una copia de mi cédula en PDF
Para:        Completar los requisitos de ingreso

Prioridad:   Alta
Estimación:  M
Dependencias: HU-02
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: ambos PDFs son obligatorios
  Dado que:  descargué la autorización y la firmé
  Cuando:    subo el PDF firmado y el PDF de la cédula
  Entonces:  se guardan las dos rutas, el gate pasa a `pending_approval` y voy a `/afiliacion/en-revision`
```

**Error Path**
```gherkin
CRITERIO-3.2: falta un archivo o no es PDF
  Dado que:  omito la cédula, o subo un JPG, o un archivo mayor a 8 MB
  Cuando:    intento enviar los documentos
  Entonces:  el backend responde 400, no cambia el gate y no se marca la carga como completa
```

**Error Path**
```gherkin
CRITERIO-3.3: no se puede saltar el paso
  Dado que:  ya pagué pero no he subido ambos PDFs
  Cuando:    intento abrir `/dashboard`, `/mi-espacio` o `/afiliacion/en-revision`
  Entonces:  el gate me devuelve a `/afiliacion/documentos`
```

#### HU-04: El admin revisa los documentos antes de aprobar

```
Como:        Administrador
Quiero:      Ver el comprobante, la autorización firmada y la cédula al aprobar
Para:        No habilitar a alguien sin respaldo legal ni identificación

Prioridad:   Alta
Estimación:  S
Dependencias: HU-03, SPEC-005
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: modal de aprobación muestra los tres archivos
  Dado que:  el aspirante subió voucher, autorización firmada y cédula
  Cuando:    abro Aprobar en Miembros
  Entonces:  veo enlaces para abrir comprobante, autorización firmada y cédula
```

**Error Path**
```gherkin
CRITERIO-4.2: no se aprueba sin documentos
  Dado que:  el miembro tiene voucher pero le falta la autorización o la cédula
  Cuando:    el admin intenta aprobar
  Entonces:  el backend responde 400 y el miembro sigue POR HABILITAR
```

#### HU-05: Miembros existentes no entran al nuevo paso

```
Como:        Miembro ya habilitado
Quiero:      Seguir usando el sistema sin este trámite
Para:        Que el rediseño aplique solo a nuevos ingresos

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-005, SPEC-008
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: habilitado no ve documentos de afiliación
  Dado que:  soy miembro habilitado
  Cuando:    inicio sesión o abro rutas de afiliación
  Entonces:  el gate no es `documents`; voy a dashboard o a suscripción vencida si aplica
```

**Happy Path**
```gherkin
CRITERIO-5.2: renovación no pide esta autorización
  Dado que:  debo renovar la cuota mensual
  Cuando:    subo el voucher de renovación
  Entonces:  no se me pide descargar ni firmar el formato de nuevos miembros
```

### Reglas de Negocio
1. Este flujo aplica **únicamente** a nuevos miembros en afiliación (`state_id = 2` + fila en `membership_payments`).
2. El valor de afiliación de **nuevos** registros es **USD 10.00** y debe verse destacado en `/afiliacion/pago`.
3. Tras el comprobante el siguiente paso obligatorio es documentos; no se puede ir a revisión ni al dashboard sin ambos PDFs.
4. El PDF generado clona el contenido legal del Word oficial y prellena ciudad, fecha, nombres, apellidos y cédula.
5. Autorización firmada y cédula se aceptan solo como `application/pdf`, máximo 8 MB cada una.
6. Se puede reemplazar cualquiera de los dos PDFs mientras el pago siga `pending_review` y el miembro no esté aprobado.
7. El administrador no aprueba sin voucher + autorización firmada + cédula.
8. Miembros habilitados, admin y otros roles nunca son redirigidos a `/afiliacion/documentos`.
9. Tras documentos completos el aspirante espera en `/afiliacion/en-revision`; el dashboard se abre solo cuando el admin aprueba (SPEC-005).

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `MembershipPayment` | tabla `membership_payments` | modificada | Guarda rutas de autorización firmada y cédula |
| `MembershipStatus` | derivado | modificada | Nuevo gate `documents` |
| `AuthorizationPdf` | generado | nueva | PDF oficial prellenado, no se persiste |

#### Campos del modelo
Columnas nuevas en `membership_payments`:

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `signed_authorization_path` | TEXT | no | URL interna `/media/membership/{id}/authorization/...` | PDF firmado subido por el aspirante |
| `identity_document_path` | TEXT | no | URL interna `/media/membership/{id}/identity/...` | PDF de la cédula |
| `documents_uploaded_at` | TIMESTAMP | no | se setea al tener ambos archivos | Marca de cierre del paso |

Campos existentes (`amount`, `voucher_path`, `status`, etc.) no cambian de semántica.

`MembershipStatus` agrega:
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `must_upload_documents` | bool | sí | `gate == documents` | El frontend redirige a documentos |
| `has_signed_authorization` | bool | sí | path no vacío | Autorización ya subida |
| `has_identity_document` | bool | sí | path no vacío | Cédula ya subida |

#### Índices / Constraints
- No se requiere índice nuevo: la fila sigue siendo 1:1 por `user_id`.
- Un documento está completo solo si **ambos** paths tienen valor.

#### SQL
Archivo `backend/database/membership_onboarding_documents.sql` con `ALTER TABLE membership_payments ADD COLUMN IF NOT EXISTS ...` para las tres columnas. No hay carpeta Alembic en el repo; se sigue el patrón de SQL en `backend/database/`.

### API Endpoints

Prefijo existente: `/api/membership` (no `/api/v1`).

#### GET /api/membership/payment-info
- **Cambio**: el `amount` de registros nuevos es `10.00`. La pantalla también puede usar un literal de UI "USD 10.00" alineado a ese valor.
- El resto del contrato no cambia.

#### GET /api/membership/status
- **Auth requerida**: sí
- **Cambio**: `gate` puede ser `"documents"`.
- **Response 200** (campos nuevos):
  ```json
  {
    "gate": "documents",
    "must_complete_payment": false,
    "must_upload_documents": true,
    "must_wait_approval": false,
    "has_signed_authorization": false,
    "has_identity_document": false,
    "payment_status": "pending_review"
  }
  ```

#### GET /api/membership/authorization-pdf
- **Descripción**: Genera y descarga el PDF de autorización prellenado
- **Auth requerida**: sí (aspirante dueño)
- **Response 200**: `application/pdf` (`autorizacion-debito-copsstec.pdf`)
- **Response 401**: token ausente o expirado
- **Response 403**: no es aspirante en `pending_review`, o es admin/miembro habilitado
- **Response 404**: no hay afiliación

#### POST /api/membership/onboarding-documents
- **Descripción**: Sube autorización firmada y/o cédula (multipart)
- **Auth requerida**: sí (aspirante dueño)
- **Request Body** (multipart):
  - `signed_authorization`: PDF (obligatorio si aún no hay uno guardado; opcional para reemplazo si el otro ya existe)
  - `identity_document`: PDF (misma regla)
  - En el primer envío completo ambos campos son obligatorios
- **Response 200**:
  ```json
  {
    "status": "pending_review",
    "has_signed_authorization": true,
    "has_identity_document": true,
    "gate": "pending_approval",
    "message": "Documentos recibidos. El administrador revisará tu solicitud."
  }
  ```
- **Response 400**: no es PDF, supera 8 MB, o falta un archivo obligatorio
- **Response 401**: sin token
- **Response 403**: pago no está en `pending_review` o ya fue aprobado
- **Response 404**: no hay afiliación

#### GET /api/members/{id}/approval-preview
- **Cambio**: incluye URLs de los nuevos documentos
- **Response 200** (campos extra):
  ```json
  {
    "voucher_url": "/media/membership/12/vouchers/...",
    "signed_authorization_url": "/media/membership/12/authorization/...",
    "identity_document_url": "/media/membership/12/identity/..."
  }
  ```
- **Response 400** al aprobar: faltan documentos de onboarding

#### POST /api/members/{id}/approve
- **Cambio**: valida `signed_authorization_path` e `identity_document_path` antes de habilitar.
- **Response 400**: "Faltan la autorización firmada y/o la copia de cédula."

### Gate de membresía

```
si state_id == 1 y payment approved → none (luego SPEC-008)
si payment == pending_review y faltan documentos → documents
si payment == pending_review y documentos completos → pending_approval
si payment == pending_payment o state_id == 2 sin voucher → payment
```

Redirect frontend:
| Gate | Ruta |
|------|------|
| `payment` | `/afiliacion/pago` |
| `documents` | `/afiliacion/documentos` |
| `pending_approval` | `/afiliacion/en-revision` |
| `subscription_due` | `/suscripcion/pendiente` |
| `none` | `/dashboard` |

### Contenido del PDF (clon del Word)

Título: **AUTORIZACIÓN DE DÉBITO**

Campos variables:
- `Ciudad: {city}`
- `Fecha: {dd/mm/yyyy}` del día de generación
- `Yo {names} {lastname} con Cédula de identidad Número {identifier}.`

Texto legal (idéntico al Word, tildes incluidas):

> Señores Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC.
>
> Autorizo a ustedes a ordenar, en mi nombre, el débito de mi cuenta  ☐ Corriente   ☐ Ahorros Número ________ que mantengo en (Entidad bancaria) ________, en adelante simplemente denominado “IFI”, por los conceptos y valores que se detallan a continuación:
>
> CUOTAS Y/O APORTES VOLUNTARIOS DE MEMBRESÍA DE COPSSTEC Autorizo el débito correspondiente a mi cuota y/o aporte voluntario de membresía de COPSSTEC, seleccionando la modalidad de débito que corresponda: (Seleccione una sola modalidad):
> ☐ Mensual: $10,00
> ☐ Trimestral: $30,00
> ☐ Semestral: $60,00
> ☐ Anual: $120,00
>
> El valor adicional autorizado será aplicado exclusivamente al pago o abono de obligaciones económicas pendientes con COPSSTEC y se debitará conjuntamente con la cuota de membresía seleccionada.
> Estos valores serán debitados y acreditados a la cuenta que el Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC designe.
>
> Me comprometo a mantener los fondos suficientes...
> (resto de párrafos del Word, incluida la mención a Cooperativa Alianza del Valle)
>
> Firma ________
> C.I. {identifier}
> Fecha: ________

El generador actual de facturas (PDF crudo Helvetica/latin-1) **no sirve**: pierde tildes. Se agrega `reportlab` y una fuente TTF con Unicode (DejaVu Sans) para clonar el formato con checkboxes, líneas de firma y márgenes de documento formal.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `AffiliationAmountBanner` | `modules/membership/presentation/components/affiliation-amount-banner.tsx` | `amount`, `currency` | Recuadro destacado del valor USD 10 |
| `AuthorizationDocumentsPage` | `modules/membership/presentation/pages/authorization-documents-page.tsx` | — | Descarga + subida de los dos PDFs |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Documentos de afiliación | `frontend/src/app/(public)/afiliacion/documentos/page.tsx` | `/afiliacion/documentos` | sesión de aspirante |

#### Páginas / componentes a modificar
| Pieza | Cambio |
|-------|--------|
| `membership-payment-page.tsx` | Banner USD 10; tras voucher → `/afiliacion/documentos` |
| `approve-member-modal.tsx` | Links a autorización y cédula; aviso si faltan |
| `membership/domain/types.ts` | Gate `documents` + flags |
| `membership-api.ts` | download PDF + upload documentos |
| `dashboard-shell.tsx` / login | El redirect ya usa `membershipRedirect` |

UI de `/afiliacion/documentos` (misma cáscara que pago: logo, cerrar sesión, card, footer):
1. Instrucciones: descargar, firmar (digital o impresa/escaneada), subir PDF firmado + PDF de cédula.
2. Botón **Descargar autorización**.
3. Inputs `accept="application/pdf"` para ambos archivos.
4. Estado de qué ya está cargado.
5. Botón **Enviar documentos**.

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| Estado local en la página | `authorization-documents-page.tsx` | status, files, error, submitting | No se crea store global |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `downloadAuthorizationPdf(token)` | `membership-api.ts` | `GET /api/membership/authorization-pdf` |
| `uploadOnboardingDocuments(token, files)` | `membership-api.ts` | `POST /api/membership/onboarding-documents` |

### Arquitectura y Dependencias
- Paquetes nuevos: `reportlab` en `backend/requirements.txt`. Fuente DejaVu embebida o referenciada desde `backend/app/shared/assets/fonts/`.
- Storage: extender `LocalMembershipFileStorage` con `save_pdf(user_id, folder, filename, content)` que acepte solo `application/pdf` y `.pdf`.
- Servicios externos: ninguno nuevo.
- Impacto en entrypoint: registrar los dos endpoints en el router de membership ya montado.

### Notas de Implementación
> No tocar el wizard de registro ni el flujo de renovación.
> El PDF se genera en cada descarga (no se guarda el template). Sí se guardan los dos PDFs subidos.
> Validar PDF por `content_type == application/pdf` y magic bytes `%PDF`.
> `membership_gate_from_payment` debe recibir si los documentos están completos; no mezclar ese gate con `subscription_due`.
> Ejecutar el SQL de columnas nuevas en el entorno local/prod al implementar.
> Tests existentes de membership/gate deben actualizarse con el nuevo estado intermedio.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] SQL `membership_onboarding_documents.sql` + aplicar columnas en `membership_payments`
- [x] Default `MEMBERSHIP_FEE=10.00` en `config.py` y `.env.example`
- [x] Extender entidad `MembershipPayment` / `MembershipStatus` y `membership_gate_from_payment` con gate `documents`
- [x] Port + storage para guardar PDFs de autorización y cédula
- [x] Generador `AuthorizationDebitPdfGenerator` que clone el Word oficial con datos del registro
- [x] Use cases: descargar PDF, subir documentos, bloquear aprobación sin documentos
- [x] Endpoints `GET /authorization-pdf` y `POST /onboarding-documents`
- [x] Ampliar `approval-preview` y `approve` con las nuevas URLs y validación
- [x] Registrar dependencias en `dependencies.py`

#### Tests Backend
- [ ] `test_register_member_amount_is_ten`
- [ ] `test_gate_documents_after_voucher_without_pdfs`
- [ ] `test_gate_pending_approval_after_both_documents`
- [ ] `test_authorization_pdf_contains_member_data`
- [ ] `test_authorization_pdf_forbidden_before_voucher`
- [ ] `test_upload_documents_rejects_non_pdf`
- [ ] `test_approve_without_documents_raises_validation`
- [ ] `test_enabled_member_gate_is_not_documents`

### Frontend

#### Implementación
- [x] Tipos: gate `documents`, flags de documentos, redirect
- [x] API: descarga de autorización y subida de PDFs
- [x] Banner destacado de USD 10 en la pantalla de pago
- [x] Tras voucher, navegar a `/afiliacion/documentos`
- [x] Página `AuthorizationDocumentsPage` + ruta pública
- [x] Modal de aprobación: links a autorización y cédula
- [x] Estilos del banner y de la página de documentos en `globals.css`

#### Tests Frontend
- [ ] `membershipRedirect` lleva `documents` a `/afiliacion/documentos`
- [ ] Banner de pago muestra USD 10
- [ ] La página de documentos exige ambos PDFs antes de enviar
- [ ] Tras envío exitoso redirige a `/afiliacion/en-revision`

### QA
- [x] Recorrer registro → pago USD 10 → descarga PDF → subida firmada + cédula → en-revisión
- [x] Verificar que un miembro habilitado no cae en documentos
- [x] Verificar que el admin no aprueba sin los dos PDFs
- [x] Validar tildes y datos variables en el PDF descargado
- [x] Actualizar estado spec: `status: IMPLEMENTED`
