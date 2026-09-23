---
id: SPEC-017
status: IMPLEMENTED
feature: acuerdos-debito-membresias
created: 2026-09-22
updated: 2026-09-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-004", "SPEC-008", "SPEC-010", "SPEC-012"]
---

# Spec: Acuerdos de débito y saldo pendiente en membresías

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
En **Pagos → Membresía** el administrador ve a todos los miembros registrados, con saldo al día o pendiente ($10 por mes desde el primer aniversario), acciones para registrar un pago y ver el historial, y un botón **Enviar acuerdo** solo a quienes deben. El correo lleva un enlace público para descargar el formato ADV prellenado, firmarlo y subir autorización + cédula (como el flujo de nuevos miembros). El admin descarga esos archivos desde **Miembros** y en Pagos identifica quién ya recibió el enlace y quién ya subió los documentos.

### Requerimiento de Negocio
Dentro del módulo de pagos, en el apartado de membresías, deben listarse los miembros registrados. Cada uno tiene un botón para registrarle pagos, otro para verle el historial, y se debe ver quién está al día y quién tiene saldo pendiente (debe). Ejemplo: si el miembro se inscribió el 5 de enero de 2023, el 6 de enero de 2024 debía renovar; a 2026, si no pagó renovaciones, debe USD 240 porque es USD 10 por mes. A quienes tienen saldo pendiente, un botón **Enviar acuerdo** manda al correo un link donde descargan un archivo ya lleno con sus datos (clon del `FORMATO DE AUTORIZACION DE DEBITO ADV.docx`), suben los documentos como en el flujo nuevo de suscripción, y el administrador descarga esos documentos desde el módulo de miembros. En Pagos → Membresía se identifica quién ya tiene el acuerdo enviado y quién ya subió los documentos.

### Decisiones de esta spec

1. **El listado ya existe** (`GET /api/payments/admin/membership` → bloque Suscripciones). Se **enriquece**, no se crea otra tabla de miembros. Sigue mostrando a todos los usuarios con rol `miembro` y `profiles.deleted_at IS NULL`.
2. **Saldo pendiente ≠ cobertura de SPEC-008.** `coverage_until` / `al_dia` / `gracia` / `vencida` se mantienen para el gate de acceso. Esta spec agrega un **libro de deuda** visible al admin:
   - Fecha de inscripción = `profiles.date_register` (`DD/MM/YYYY`). Si falta o no parsea, `users.created_at::date`.
   - El **primer año está cubierto** por la inscripción.
   - Primera renovación = inscripción + 1 año + 1 día (05/01/2023 → 06/01/2024).
   - Meses adeudados = meses calendarios completos desde esa fecha hasta hoy.
   - Pagado = suma de `payments` tipo membresía con `status = approved` y fecha de registro **≥ primera renovación**.
   - `pending_balance = max(0, meses_adeudados × 10.00 − pagado)`.
   - Ejemplo del usuario: inscrito 05/01/2023, sin pagos de renovación, el **06/01/2026** debe **USD 240.00** (24 meses). El **22/09/2026** debe **USD 320.00** (32 meses). El monto crece cada mes.
   - La afiliación inicial (`membership_payments` o el `payments` creado al aprobar, fechado en el año 1) **no** reduce esta deuda.
3. **Estados de saldo** (columna nueva, independiente de `subscription.status`):
   - `al_dia` si `pending_balance == 0`
   - `saldo_pendiente` si `pending_balance > 0`
4. **Botones por fila:**
   - **Registrar** → modal de pagos existente (formulario + lista).
   - **Historial** → el mismo modal, abierto en modo lectura (lista + KPIs, sin foco en el alta).
   - **Enviar acuerdo** → solo si `pending_balance > 0` y el miembro está habilitado (`state_id = 1`).
5. **El acuerdo ADV es distinto de SPEC-012.** Los PDFs de nuevos miembros viven en `membership_payments`. Este flujo es para **miembros ya habilitados con deuda**. Tabla nueva `membership_debit_agreements`. El PDF clona el Word ADV (incluye bloque *MIEMBROS CON DEUDA PENDIENTE*), no el de nuevos miembros.
6. **Enlace público con token**, sin login (mismo patrón que `/cursos/feedback/{token}`). Token en URL, hash SHA-256 en DB, vigencia **30 días**. Reenviar invalida el token anterior.
7. **Correo** al email personal (`profiles.email`); si está vacío, `users.email` / `login_email`. Plantilla nueva `debit_agreement` (SPEC-010). El fallo SMTP no bloquea: se persiste el acuerdo y se avisa al admin.
8. **Documentos a subir** (igual que SPEC-012): PDF firmado + PDF de cédula, `application/pdf`, máximo 8 MB, magic bytes `%PDF`.
9. **Admin descarga desde Miembros** (acciones nuevas). En Pagos se ve el estado del acuerdo: no enviado / enviado / parcial / subido.

### Historias de Usuario

#### HU-01: Listar miembros con saldo e historial

```
Como:        Administrador
Quiero:      Ver en Pagos → Membresía a cada miembro, si está al día o debe, y abrir historial o registrar pago
Para:        Controlar cuotas y cobrar a quien tiene saldo pendiente

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-008
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: listado con saldo
  Dado que:  hay miembros habilitados con distintas fechas de inscripción
  Cuando:    abro /admin/pagos pestaña Membresía
  Entonces:  cada fila muestra nombre, cédula, fecha de inscripción, saldo pendiente en USD, estado "Al día" o "Saldo pendiente", y botones Registrar e Historial
```

**Happy Path**
```gherkin
CRITERIO-1.2: deuda del ejemplo
  Dado que:  un miembro se inscribió el 05/01/2023 y no tiene payments de membresía aprobados desde el 06/01/2024
  Cuando:    el sistema calcula el saldo el 06/01/2026
  Entonces:  pending_balance es 240.00 y el estado de saldo es saldo_pendiente
```

**Happy Path**
```gherkin
CRITERIO-1.3: historial y registro
  Dado que:  estoy en la fila de un miembro
  Cuando:    pulso Historial
  Entonces:  se abre el modal de pagos con su lista y KPIs
  Y cuando:  pulso Registrar
  Entonces:  se abre el mismo modal listo para cargar un pago
```

**Error Path**
```gherkin
CRITERIO-1.4: acceso denegado
  Dado que:  soy un usuario con rol miembro
  Cuando:    llamo GET /api/payments/admin/membership
  Entonces:  la API responde 403
```

**Edge Case**
```gherkin
CRITERIO-1.5: pago de renovación reduce deuda
  Dado que:  el miembro del ejemplo debía 240.00
  Cuando:    el admin registra un pago de membresía aprobado de 120.00 con fecha ≥ 06/01/2024
  Entonces:  pending_balance pasa a 120.00
```

#### HU-02: Enviar acuerdo de débito por correo

```
Como:        Administrador
Quiero:      Enviar un acuerdo solo a quien tiene saldo pendiente
Para:        Que firme la autorización ADV y regularice el débito

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01, SPEC-010
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: botón solo con deuda
  Dado que:  un miembro tiene pending_balance > 0 y está habilitado
  Cuando:    veo su fila
  Entonces:  aparece el botón "Enviar acuerdo"
  Y dado que: otro miembro tiene pending_balance = 0
  Entonces:  no aparece ese botón
```

**Happy Path**
```gherkin
CRITERIO-2.2: correo con link
  Dado que:  confirmo Enviar acuerdo para un miembro con deuda
  Cuando:    el backend crea el token y envía el correo
  Entonces:  llega un HTML institucional con el monto adeudado y un CTA al link /acuerdo-debito/{token}
  Y:         en la tabla el estado del acuerdo pasa a "Enviado"
```

**Error Path**
```gherkin
CRITERIO-2.3: no se envía sin deuda o sin email
  Dado que:  el miembro está al día, o no está habilitado, o no tiene email
  Cuando:    llamo POST /api/payments/admin/members/{id}/send-agreement
  Entonces:  responde 400 con mensaje claro y no se crea token
```

**Edge Case**
```gherkin
CRITERIO-2.4: reenvío
  Dado que:  ya se envió un acuerdo vigente
  Cuando:    el admin vuelve a enviar
  Entonces:  se invalida el token anterior, se genera uno nuevo de 30 días y se reenvía el correo
```

#### HU-03: El miembro descarga el PDF ADV y sube documentos

```
Como:        Miembro con deuda
Quiero:      Abrir el link del correo, descargar el formato con mis datos y subir la autorización firmada más la cédula
Para:        Autorizar el débito sin tener que iniciar sesión

Prioridad:   Alta
Estimación:  L
Dependencias: HU-02, SPEC-012
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: PDF prellenado
  Dado que:  abro /acuerdo-debito/{token} con un token vigente
  Cuando:    descargo la autorización
  Entonces:  el PDF se titula "AUTORIZACIÓN DE DÉBITO", clona el Word ADV (incluye bloque de deuda pendiente) y muestra ciudad, fecha del día, "Yo {nombres} {apellidos} con Cédula de identidad Número {cedula}"
```

**Happy Path**
```gherkin
CRITERIO-3.2: subida de ambos PDFs
  Dado que:  estoy en el link vigente
  Cuando:    subo el PDF firmado y el PDF de la cédula
  Entonces:  se guardan las rutas, documents_uploaded_at se setea y el estado del acuerdo pasa a uploaded
```

**Error Path**
```gherkin
CRITERIO-3.3: token inválido o vencido
  Dado que:  el token no existe, ya se reemplazó o pasaron 30 días
  Cuando:    pido el PDF o subo archivos
  Entonces:  el backend responde 404 y la página pública muestra que el enlace no es válido
```

**Error Path**
```gherkin
CRITERIO-3.4: archivo inválido
  Dado que:  subo un JPG, un archivo > 8 MB o solo uno de los dos PDFs en el primer envío
  Cuando:    intento enviar
  Entonces:  responde 400 y no marca el acuerdo como uploaded
```

#### HU-04: Admin identifica y descarga los documentos

```
Como:        Administrador
Quiero:      Ver en Pagos quién ya tiene el acuerdo y descargar los PDFs desde Miembros
Para:        Archivar la autorización y la cédula de quien ya respondió

Prioridad:   Alta
Estimación:  M
Dependencias: HU-03, SPEC-004
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: estados visibles en Pagos
  Dado que:  hay miembros sin envío, con envío pendiente de carga y con ambos PDFs
  Cuando:    abro Pagos → Membresía
  Entonces:  veo el estado del acuerdo: "Sin enviar", "Enviado", "Parcial" o "Subido"
```

**Happy Path**
```gherkin
CRITERIO-4.2: descarga en Miembros
  Dado que:  el miembro ya subió autorización y cédula
  Cuando:    en Acciones de /admin/miembros elijo Descargar autorización ADV o Descargar cédula
  Entonces:  se descargan los PDFs guardados
```

**Error Path**
```gherkin
CRITERIO-4.3: sin documentos
  Dado que:  el miembro no ha subido los PDFs
  Cuando:    el admin pide la descarga
  Entonces:  responde 404 y esas acciones no aparecen o quedan deshabilitadas
```

**Edge Case**
```gherkin
CRITERIO-4.4: filtro por estado de acuerdo
  Dado que:  hay varios estados de acuerdo
  Cuando:    filtro por "Subido" o "Saldo pendiente"
  Entonces:  la tabla de suscripciones solo muestra coincidencias
```

### Reglas de Negocio
1. El primer año de membresía no genera deuda; la deuda empieza el día siguiente al primer aniversario.
2. La cuota usada para el libro de deuda es **USD 10.00 por mes**. Un pago anual de 120.00 aprobado después de la primera renovación cubre 12 meses de esa deuda.
3. **Enviar acuerdo** solo si `pending_balance > 0` y `state_id = 1`.
4. El PDF ADV se genera en cada descarga (no se persiste el template). Sí se persisten los dos PDFs subidos.
5. Autorización firmada y cédula: solo PDF, máximo 8 MB, magic `%PDF`.
6. Un token vigente por miembro; reenviar reemplaza el anterior.
7. El link público no exige sesión. El token en claro no se guarda; se guarda `sha256`.
8. El correo usa el email personal; si falta, el de login. Sin ningún email → 400.
9. Los documentos ADV no se mezclan con `signed_authorization_path` de SPEC-012.
10. Admin y no-miembros no reciben este correo ni ven `/acuerdo-debito/{token}` como flujo propio.
11. Registrar un pago de membresía aprobado recalcula `pending_balance` al recargar el listado.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `MemberSubscription` | derivado | modificada | Agrega inscripción, deuda y estado de acuerdo |
| `DebitAgreement` | tabla `membership_debit_agreements` | nueva | Token, envío y PDFs del acuerdo ADV |
| `AdvAuthorizationPdf` | generado | nueva | PDF clon del Word ADV, no se persiste |

#### Campos del modelo

`membership_debit_agreements` (1 vigente por `user_id` vía `revoked_at IS NULL`):

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | SERIAL PK | sí | auto | Identificador |
| `user_id` | INT FK users | sí | miembro habilitado | Dueño del acuerdo |
| `token_hash` | TEXT | sí | sha256 hex único | Hash del token público |
| `pending_balance_snapshot` | NUMERIC(12,2) | sí | ≥ 0 | Deuda al momento del envío |
| `status` | TEXT | sí | `sent` / `partial` / `uploaded` | Estado de documentos |
| `sent_at` | TIMESTAMP | sí | UTC | Envío del correo |
| `expires_at` | TIMESTAMP | sí | `sent_at + 30 days` | Caducidad del link |
| `revoked_at` | TIMESTAMP | no | se setea al reenviar | Token anterior inválido |
| `signed_authorization_path` | TEXT | no | `/media/agreements/{user_id}/authorization/...` | PDF firmado |
| `identity_document_path` | TEXT | no | `/media/agreements/{user_id}/identity/...` | PDF cédula |
| `documents_uploaded_at` | TIMESTAMP | no | ambos paths | Cierre de carga |
| `created_at` | TIMESTAMP | sí | UTC | Alta |
| `updated_at` | TIMESTAMP | sí | UTC | Última mutación |

Campos nuevos en `MemberSubscription` (derivados, no columnas de `member_subscriptions`):

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `enrolled_on` | date \| null | no | parse de `date_register` | Inscripción |
| `first_renewal_on` | date \| null | no | inscripción + 1 año + 1 día | Inicio de deuda |
| `pending_balance` | Decimal | sí | ≥ 0 | Deuda actual |
| `balance_status` | str | sí | `al_dia` \| `saldo_pendiente` | Semáforo de deuda |
| `agreement_status` | str | sí | `none` \| `sent` \| `partial` \| `uploaded` | Estado del acuerdo vigente |
| `agreement_sent_at` | datetime \| null | no | | Último envío |
| `has_signed_authorization` | bool | sí | path no vacío | ADV firmada |
| `has_identity_document` | bool | sí | path no vacío | Cédula |
| `email` | str | sí | para confirmar envío | Destino del correo |

#### Índices / Constraints
- `UNIQUE (token_hash)`
- Índice `(user_id)` y índice parcial `(user_id) WHERE revoked_at IS NULL` para el vigente.
- Un documento está `uploaded` solo si **ambos** paths tienen valor.

#### SQL
Archivo `backend/database/membership_debit_agreements.sql` con `CREATE TABLE IF NOT EXISTS` + índices. No hay carpeta Alembic; se sigue el patrón de `backend/database/`.

### API Endpoints

Prefijos existentes: `/api/payments` y `/api/members` (no `/api/v1`).

#### GET /api/payments/admin/membership
- **Cambio**: cada ítem de `subscriptions` incluye los campos nuevos de deuda y acuerdo. Query extra `balance_status` y `agreement_status`.
- **Auth requerida**: sí (admin)
- **Response 200** (campos extra por ítem):
  ```json
  {
    "user_id": 100,
    "member_name": "Ana Pérez",
    "identifier": "1712345678",
    "enrolled_on": "2023-01-05",
    "first_renewal_on": "2024-01-06",
    "pending_balance": "240.00",
    "balance_status": "saldo_pendiente",
    "agreement_status": "sent",
    "agreement_sent_at": "2026-09-22T15:00:00",
    "has_signed_authorization": false,
    "has_identity_document": false,
    "email": "ana@gmail.com",
    "coverage_until": "2024-01-05",
    "status": "vencida"
  }
  ```

#### POST /api/payments/admin/members/{member_id}/send-agreement
- **Descripción**: Crea/reemplaza token y envía el correo
- **Auth requerida**: sí (admin)
- **Response 200**:
  ```json
  {
    "user_id": 100,
    "email": "ana@gmail.com",
    "pending_balance": "240.00",
    "agreement_status": "sent",
    "expires_at": "2026-10-22T15:00:00",
    "message": "Acuerdo enviado al correo del miembro."
  }
  ```
- **Response 400**: sin deuda, no habilitado, o sin email
- **Response 401**: sin token
- **Response 403**: no admin
- **Response 404**: miembro no existe

#### GET /api/payments/agreements/{token}
- **Descripción**: Contexto público del acuerdo (sin login)
- **Auth requerida**: no
- **Response 200**:
  ```json
  {
    "member_name": "Ana Pérez",
    "identifier": "1712345678",
    "pending_balance": "240.00",
    "has_signed_authorization": false,
    "has_identity_document": false,
    "status": "sent",
    "expires_at": "2026-10-22T15:00:00"
  }
  ```
- **Response 404**: token desconocido, revocado o vencido

#### GET /api/payments/agreements/{token}/pdf
- **Descripción**: PDF ADV prellenado
- **Auth requerida**: no (token vigente)
- **Response 200**: `application/pdf` (`autorizacion-debito-adv-copsstec.pdf`)
- **Response 404**: token inválido

#### POST /api/payments/agreements/{token}/documents
- **Descripción**: Sube autorización firmada y/o cédula (multipart)
- **Auth requerida**: no (token vigente)
- **Request Body** (multipart):
  - `signed_authorization`: PDF
  - `identity_document`: PDF
  - Primer envío completo: ambos obligatorios; luego se puede reemplazar uno
- **Response 200**:
  ```json
  {
    "status": "uploaded",
    "has_signed_authorization": true,
    "has_identity_document": true,
    "message": "Documentos recibidos. El administrador los revisará."
  }
  ```
- **Response 400**: no es PDF, > 8 MB, o falta archivo
- **Response 404**: token inválido

#### GET /api/members/{id}/debit-agreement/{kind}
- **Descripción**: Descarga admin del PDF (`authorization` \| `identity`)
- **Auth requerida**: sí (admin)
- **Response 200**: archivo PDF
- **Response 404**: no hay archivo o miembro

#### GET /api/members (listado)
- **Cambio opcional**: flags `has_debit_agreement_documents` para habilitar acciones. Si no se toca el listado, el menú puede consultar al descargar y ocultar si 404.

### Cálculo de deuda

```
enrollment = parse(profiles.date_register) o users.created_at.date()
first_renewal = enrollment + 1 año + 1 día
si today < first_renewal → months_due = 0
si no → months_due = meses completos (first_renewal → today)
  months = (y2-y1)*12 + (m2-m1)
  si day(today) < day(first_renewal) → months -= 1
paid = SUM(payments.amount) donde type membresía, status approved, date_register >= first_renewal
pending = max(0, months_due * 10.00 − paid)
```

### Contenido del PDF (clon del Word ADV)

Título: **AUTORIZACIÓN DE DÉBITO**

Campos variables:
- `Ciudad: {city}`
- `Fecha: {dd/mm/yyyy}` del día de generación
- `Yo {names} {lastname} con Cédula de identidad Número {identifier}.`

Texto legal (idéntico al Word ADV, tildes incluidas), incluyendo:

> Modalidad de débito:
> ☐ Mensual: $10,00
> ☐ Trimestral: $30,00
> ☐ Semestral: $60,00
> ☐ Anual: $120,00
>
> MIEMBROS CON DEUDA PENDIENTE
> En caso de mantener obligaciones económicas pendientes con COPSSTEC, autorizo adicionalmente el débito de un valor destinado al abono de mi saldo pendiente...
> ☐ USD $20,00 adicionales por período de débito
> ☐ USD $30,00 adicionales por período de débito
> ☐ No mantengo deuda pendiente

Banco, tipo de cuenta, modalidad, abono adicional y firma quedan en blanco. C.I. del pie puede ir prellenado. Reutilizar `reportlab` + DejaVu Sans de SPEC-012. **No** reutilizar `AuthorizationDebitPdfGenerator` (le falta el bloque de deuda); crear `AdvDebitAuthorizationPdfGenerator`.

### Correo `debit_agreement`

- Asunto: `Autorización de débito pendiente - {nombres}`
- Cuerpo: saludo, monto `pending_balance`, instrucción de descargar / firmar / subir, vigencia 30 días.
- CTA: **Completar autorización** → `{FRONTEND_ORIGIN}/acuerdo-debito/{token}`
- Layout: `branded_layout` de SPEC-010.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `BalanceStatusBadge` | `modules/payments/presentation/components/balance-status-badge.tsx` | `status`, `amount` | Al día / Saldo pendiente + monto |
| `AgreementStatusBadge` | `modules/payments/presentation/components/agreement-status-badge.tsx` | `status` | Sin enviar / Enviado / Parcial / Subido |
| `SendAgreementModal` | `modules/payments/presentation/modals/send-agreement-modal.tsx` | `member`, `onConfirm` | Confirma email y monto antes de enviar |
| `DebitAgreementPage` | `modules/payments/presentation/pages/debit-agreement-page.tsx` | `token` | Página pública: descarga + subida |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Acuerdo de débito | `frontend/src/app/(public)/acuerdo-debito/[token]/page.tsx` | `/acuerdo-debito/{token}` | no (token) |

#### Páginas / componentes a modificar
| Pieza | Cambio |
|-------|--------|
| `membership-payments-panel.tsx` | Columnas inscripción, saldo, acuerdo; botones Historial / Enviar acuerdo; filtros |
| `admin-payments-page.tsx` | Abre historial, confirma envío |
| `member-payments-modal.tsx` | Prop `mode: "register" \| "history"` |
| `member-actions-menu.tsx` | Descargar autorización ADV y cédula si hay docs |
| `payments/domain/types.ts` | Campos nuevos, badges, labels |
| `payments-api.ts` | send-agreement + endpoints públicos |
| `members-api.ts` | descarga ADV |
| `globals.css` | Estilos de la página pública (cáscara affiliation) |

UI de `/acuerdo-debito/{token}` (misma cáscara que `/afiliacion/documentos`: logo, card, footer; **sin** cerrar sesión):
1. Nombre, cédula y monto adeudado.
2. Instrucciones: descargar, firmar, subir PDF firmado + cédula.
3. Botón **Descargar autorización**.
4. Inputs `accept="application/pdf"`.
5. Estado de qué ya está cargado.
6. Botón **Enviar documentos**.
7. Confirmación de éxito (sin dashboard).

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| Estado local en la página pública | `debit-agreement-page.tsx` | context, files, error | Sin store global |
| Extender `useAdminPayments` | `use-admin-payments.ts` | `sendAgreement(memberId)` | Dispara el correo |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `sendDebitAgreement(token, memberId)` | `payments-api.ts` | `POST /api/payments/admin/members/{id}/send-agreement` |
| `getPublicAgreement(token)` | `payments-api.ts` | `GET /api/payments/agreements/{token}` |
| `downloadPublicAgreementPdf(token)` | `payments-api.ts` | `GET /api/payments/agreements/{token}/pdf` |
| `uploadPublicAgreementDocuments(token, files)` | `payments-api.ts` | `POST /api/payments/agreements/{token}/documents` |
| `downloadMemberDebitDocument(token, id, kind)` | `members-api.ts` | `GET /api/members/{id}/debit-agreement/{kind}` |

### Arquitectura y Dependencias
- Paquetes nuevos: ninguno (`reportlab` ya está por SPEC-012).
- Storage: mismo patrón que `LocalMembershipFileStorage`, carpeta `media/agreements/{user_id}/...`.
- Email: `MailtrapEmailSender` + `render_email("debit_agreement", ...)`.
- Impacto en entrypoint: endpoints en routers de `payments` y `members` ya montados.

### Notas de Implementación
> No tocar el wizard de afiliación ni el PDF de SPEC-012.
> Extraer `pending_balance` a una función pura en `payments/domain/subscription.py` (testeable con el ejemplo 05/01/2023 → 240.00 el 06/01/2026).
> Parsear `date_register` con el mismo helper `parse_register_date` de pagos.
> Hashear el token como en `course_feedback_tokens`.
> Ejecutar el SQL en local/prod al implementar.
> El listado puede calcular deuda en Python por página (page_size ≤ 100) para no duplicar la fórmula en SQL; si el filtro `balance_status` exige SQL, replicar meses con `AGE` / `EXTRACT`.
> Reenviar: `UPDATE ... SET revoked_at = now()` del vigente, luego INSERT.
> UI en español.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] SQL `membership_debit_agreements.sql` + aplicar en DB local
- [x] Función pura `pending_membership_balance(enrollment, today, approved_renewals)`
- [x] Extender `MemberSubscription` / listado admin con deuda y acuerdo
- [x] Entidad `DebitAgreement`, port, repository, storage de PDFs
- [x] `AdvDebitAuthorizationPdfGenerator` clon del Word ADV
- [x] Plantilla `debit_agreement` en `templates.py`
- [x] Use cases: enviar acuerdo, leer público, PDF, subir docs, descarga admin
- [x] Endpoints admin + públicos + `GET /api/members/{id}/debit-agreement/{kind}`
- [x] Filtros `balance_status` y `agreement_status`

#### Tests Backend
- [ ] `test_pending_balance_example_240_on_second_anniversary`
- [ ] `test_pending_balance_zero_before_first_renewal`
- [ ] `test_pending_balance_subtracts_approved_renewals`
- [ ] `test_send_agreement_forbidden_when_al_dia`
- [ ] `test_send_agreement_revokes_previous_token`
- [ ] `test_public_pdf_contains_member_data_and_debt_block`
- [ ] `test_upload_documents_rejects_non_pdf`
- [ ] `test_expired_token_returns_404`

### Frontend

#### Implementación
- [x] Tipos, badges y labels de saldo / acuerdo
- [x] API admin + pública + descarga en Miembros
- [x] Panel de membresía: columnas, filtros, Historial, Enviar acuerdo
- [x] Modal de confirmación de envío
- [x] Modal de pagos con modo historial
- [x] Página pública `/acuerdo-debito/[token]`
- [x] Acciones de descarga ADV en el menú de Miembros
- [x] Estilos en `globals.css`

#### Tests Frontend
- [ ] El botón Enviar acuerdo solo aparece con saldo pendiente
- [ ] Badges muestran Al día / Saldo pendiente / Subido
- [ ] La página pública exige ambos PDFs en el primer envío
- [ ] Token inválido muestra estado de enlace no válido

### QA
- [x] Recorrer listado → historial → registrar pago → recálculo de deuda
- [x] Enviar acuerdo → abrir link → descargar PDF ADV → subir ambos → ver "Subido"
- [x] Descargar PDFs desde Miembros
- [x] Verificar tildes y bloque de deuda en el PDF
- [x] Verificar que un miembro al día no ve Enviar acuerdo
- [x] Actualizar estado spec: `status: IMPLEMENTED`
