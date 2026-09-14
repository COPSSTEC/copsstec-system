---
id: SPEC-005
status: IMPLEMENTED
feature: registro-afiliacion-miembros
created: 2026-09-14
updated: 2026-09-14
author: spec-generator
version: "1.1"
related-specs: ["SPEC-002", "SPEC-004"]
---

# Spec: Registro y afiliación de miembros

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Permitir que un visitante se afilie como miembro COPSSTEC desde la pantalla principal: registra sus datos en un wizard de suscripción, paga por transferencia (QR + comprobante) y recién entonces accede al dashboard. Si inicia sesión sin haber pagado, va a la página de pago. Si ya pagó y el admin aún no aprueba, ve una pantalla de aviso (sin dashboard) indicando que su pago todavía no fue aprobado. Un usuario con rol `miembro` habilitado solo puede entrar al sistema con correo `@copsstec.com`. Otros roles (admin, operaciones) no tienen esa restricción de dominio. El administrador aprueba en Miembros, asigna correo corporativo, crea el buzón en Mail-in-a-Box y genera la factura.

### Requerimiento de Negocio
En la pantalla principal debe existir un botón para querer ser miembro que lleve al registro. El proceso es el de una página de suscripción: primero datos, luego pago, y recién entonces dashboard. Si no paga e inicia sesión, siempre se le lleva a la página de pago hasta que cancele. Si ya subió el comprobante y todavía no se aprueba el pago, no entra al dashboard: ve una pantalla de aviso de que su pago aún no ha sido aprobado. Los campos son los de las pantallas actuales de registro. Debe marcar sí o sí los dos checks. La política usa el mismo contenido LOPDP. La página de pago es una sola: QR, cuenta de transferencia y subida de comprobante. Al aprobar se genera la factura. En Miembros se aprueban esas personas. Al activar se abre un modal con correo personal y corporativo editable (`nombre.apellido@copsstec.com`). Si el correo ya existe, al aprobar se muestra el mensaje. Mail-in-a-Box crea el buzón y se envían las claves. El sistema solo deja ingresar al dashboard a usuarios con rol `miembro` cuando su correo de acceso es `@copsstec.com`; esa regla no aplica a admin ni a otros roles.

### Historias de Usuario

#### HU-01: Entrar al registro desde la pantalla principal

```
Como:        Visitante público
Quiero:      Un botón visible para afiliarme como miembro
Para:        Iniciar el proceso de registro sin tener que iniciar sesión

Prioridad:   Alta
Estimación:  S
Dependencias: Ninguna
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: botón quiero ser miembro
  Dado que:  estoy en la pantalla principal `/`
  Cuando:    presiono "Quiero ser miembro"
  Entonces:  navego a `/afiliacion` y veo el wizard de registro en el paso 1
```

**Happy Path**
```gherkin
CRITERIO-1.2: se conserva el acceso de miembros existentes
  Dado que:  estoy en la pantalla principal
  Cuando:    veo las acciones del hero
  Entonces:  permanece "Soy miembro" hacia `/login` y se agrega "Quiero ser miembro" hacia `/afiliacion`
```

#### HU-02: Registrar datos de afiliación

```
Como:        Aspirante a miembro
Quiero:      Completar un wizard de 4 pasos con los mismos campos de las pantallas
Para:        Dejar mi ficha lista y continuar al pago

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: wizard de 4 pasos
  Dado que:  estoy en `/afiliacion`
  Cuando:    avanzo los pasos
  Entonces:  veo 1 Datos Personales, 2 Contacto y Ubicación, 3 Información Académica, 4 Finalizar
```

**Happy Path**
```gherkin
CRITERIO-2.2: envío válido crea usuario pendiente
  Dado que:  completé todos los campos obligatorios, subí foto, acepté ambos checks y definí contraseña
  Cuando:    confirmo el registro
  Entonces:  se crea `users` + `profiles` + rol `miembro` con `state_id = 2` (POR HABILITAR), se inicia sesión y se redirige a `/afiliacion/pago`
```

**Error Path**
```gherkin
CRITERIO-2.3: unicidad de cédula y correo personal
  Dado que:  ya existe esa cédula o ese correo
  Cuando:    envío el registro
  Entonces:  el backend responde 409 y el wizard muestra el conflicto sin crear la cuenta
```

**Error Path**
```gherkin
CRITERIO-2.4: ambos consentimientos son obligatorios
  Dado que:  dejé sin marcar notificaciones de cumpleaños o la política de datos
  Cuando:    intento finalizar
  Entonces:  no avanza y se muestra error de que debe aceptar ambos
```

#### HU-03: Pagar la afiliación por transferencia

```
Como:        Aspirante registrado
Quiero:      Ver una página de pago con QR, datos de transferencia y subir el comprobante
Para:        Completar la afiliación y dejarla en revisión administrativa

Prioridad:   Alta
Estimación:  M
Dependencias: HU-02
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: página única de pago
  Dado que:  ya registré mis datos y estoy autenticado con estado POR HABILITAR
  Cuando:    abro `/afiliacion/pago`
  Entonces:  veo QR, cuenta de transferencia, valor, botón para subir comprobante y el aviso de aprobación administrativa
```

**Happy Path**
```gherkin
CRITERIO-3.2: subir comprobante deja la solicitud en revisión
  Dado que:  adjunto un comprobante JPG/PNG/WEBP
  Cuando:    lo subo
  Entonces:  el pago queda `pending_review` y se redirige a `/afiliacion/en-revision` sin acceso al dashboard
```

**Error Path**
```gherkin
CRITERIO-3.3: comprobante inválido
  Dado que:  subo un archivo que no es imagen permitida o supera 8 MB
  Cuando:    intento enviarlo
  Entonces:  el backend responde 400 y no cambia el estado del pago
```

#### HU-04: Forzar el pago o la espera al iniciar sesión

```
Como:        Aspirante a miembro
Quiero:      Que el sistema me lleve a pago o a la pantalla de espera, según corresponda
Para:        No usar el dashboard hasta que el administrador apruebe el pago

Prioridad:   Alta
Estimación:  M
Dependencias: HU-02, HU-03
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: login sin comprobante
  Dado que:  me registré, no subí comprobante e inicio sesión con mi correo personal
  Cuando:    el login es válido
  Entonces:  se redirige a `/afiliacion/pago` y no puedo abrir `/dashboard`, `/mi-espacio` ni `/profile`
```

**Happy Path**
```gherkin
CRITERIO-4.2: login con comprobante pendiente de aprobación
  Dado que:  ya subí el comprobante y el administrador todavía no aprueba el pago
  Cuando:    inicio sesión o intento abrir una ruta del dashboard
  Entonces:  se redirige a `/afiliacion/en-revision` y no puedo entrar al dashboard
```

**Happy Path**
```gherkin
CRITERIO-4.3: miembro habilitado entra al dashboard
  Dado que:  el administrador ya aprobó mi solicitud
  Cuando:    inicio sesión con el correo corporativo `@copsstec.com` y la contraseña enviada
  Entonces:  accedo al dashboard de miembro y puedo ver/descargar mi factura
```

#### HU-04B: Pantalla de aviso mientras el pago no está aprobado

```
Como:        Aspirante que ya pagó
Quiero:      Ver una pantalla de aviso si mi pago aún no fue aprobado
Para:        Entender que debo esperar y no acceder al sistema todavía

Prioridad:   Alta
Estimación:  S
Dependencias: HU-03
Capa:        Frontend
```

#### Criterios de Aceptación — HU-04B

**Happy Path**
```gherkin
CRITERIO-4.4: aviso de pago no aprobado
  Dado que:  mi comprobante está en revisión (`pending_review`)
  Cuando:    permanezco en sesión o vuelvo a entrar
  Entonces:  veo `/afiliacion/en-revision` con un mensaje claro de que todavía no se ha aprobado el pago y que no puedo ingresar al dashboard hasta que el administrador lo confirme
```

**Happy Path**
```gherkin
CRITERIO-4.5: la pantalla de aviso no tiene navegación de miembro
  Dado que:  estoy en `/afiliacion/en-revision`
  Cuando:    intento ir a `/dashboard` o `/mi-espacio`
  Entonces:  el gate me devuelve a la pantalla de aviso
```

#### HU-04C: Login de miembros solo con dominio corporativo

```
Como:        Sistema
Quiero:      Que un usuario con rol miembro habilitado solo entre con correo @copsstec.com
Para:        Que el acceso de miembros sea exclusivamente corporativo, sin aplicar esa regla a admin u otros roles

Prioridad:   Alta
Estimación:  S
Dependencias: HU-05
Capa:        Backend
```

#### Criterios de Aceptación — HU-04C

**Happy Path**
```gherkin
CRITERIO-4.6: miembro habilitado entra con @copsstec.com
  Dado que:  el usuario tiene rol `miembro`, está HABILITADO y su `users.email` termina en `@copsstec.com`
  Cuando:    inicia sesión con ese correo y su contraseña
  Entonces:  accede al dashboard
```

**Error Path**
```gherkin
CRITERIO-4.7: miembro habilitado no entra con otro dominio
  Dado que:  el usuario tiene rol `miembro` y está HABILITADO
  Cuando:    intenta iniciar sesión con un correo que no sea `@copsstec.com`
  Entonces:  el backend responde 401 y no emite token
```

**Happy Path**
```gherkin
CRITERIO-4.8: admin y otros roles no están sujetos al dominio
  Dado que:  el usuario tiene rol `admin`, `bibliotecario` u otro distinto de solo `miembro`
  Cuando:    inicia sesión con su correo, aunque no sea `@copsstec.com`
  Entonces:  el login es válido (si credenciales y estado lo permiten)
```

**Happy Path**
```gherkin
CRITERIO-4.9: aspirante POR HABILITAR sí puede usar correo personal
  Dado que:  el usuario tiene rol `miembro` y `state_id = 2`
  Cuando:    inicia sesión con su correo personal
  Entonces:  el login es válido solo para las pantallas de afiliación (`/afiliacion/pago` o `/afiliacion/en-revision`), nunca para el dashboard
```

#### HU-05: Aprobar afiliación desde Miembros

```
Como:        Administrador
Quiero:      Aprobar a las personas pendientes en el módulo Miembros
Para:        Activar su cuenta, crear el correo corporativo y generar la factura

Prioridad:   Alta
Estimación:  L
Dependencias: HU-03, SPEC-004
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: modal de aprobación
  Dado que:  un miembro está POR HABILITAR y tiene comprobante en revisión
  Cuando:    elijo Aprobar
  Entonces:  se abre un modal con nombre, cédula, correo personal y correo corporativo editable prellenado
```

**Happy Path**
```gherkin
CRITERIO-5.2: aprobación exitosa
  Dado que:  el correo corporativo es único y Mail-in-a-Box responde OK
  Cuando:    confirmo Aprobar
  Entonces:  el usuario pasa a HABILITADO, se crea el buzón, se envían correos con la contraseña, se genera la factura y aparece en el listado como habilitado
```

**Error Path**
```gherkin
CRITERIO-5.3: correo corporativo duplicado
  Dado que:  ya existe `users.email` con ese correo
  Cuando:    presiono Aprobar
  Entonces:  el backend responde 409 y el modal muestra que ese correo corporativo ya existe
```

**Error Path**
```gherkin
CRITERIO-5.4: falla Mail-in-a-Box
  Dado que:  la API de box.copsstec.com no crea el buzón
  Cuando:    confirmo Aprobar
  Entonces:  se revierte la transacción, el miembro sigue POR HABILITAR y se muestra el error
```

#### HU-06: Factura en el acceso del miembro

```
Como:        Miembro habilitado
Quiero:      Ver la factura generada al aprobar mi pago
Para:        Conservar el comprobante oficial de afiliación

Prioridad:   Media
Estimación:  M
Dependencias: HU-05
Capa:        Ambas
```

#### Criterios de Aceptación — HU-06

**Happy Path**
```gherkin
CRITERIO-6.1: factura disponible
  Dado que:  mi afiliación fue aprobada
  Cuando:    abro Mi espacio o el apartado de factura
  Entonces:  puedo descargar el PDF de la factura de membresía
```

**Error Path**
```gherkin
CRITERIO-6.2: sin factura antes de aprobar
  Dado que:  aún no me aprueban
  Cuando:    llamo al endpoint de factura
  Entonces:  el backend responde 404
```

### Reglas de Negocio
1. El wizard público usa exactamente estos campos:
   - Paso 1: nombres, apellidos, cédula, fecha de nacimiento, tipo de sangre, género, foto de perfil (obligatoria).
   - Paso 2: correo, teléfono fijo (opcional), teléfono móvil, país fijo Ecuador (no editable), provincia, ciudad, calle principal y número de casa, calle secundaria.
   - Paso 3: título de tercer nivel, código Senescyt, título de cuarto nivel (opcional), código Senescyt de cuarto nivel (requerido solo si hay título de cuarto nivel).
   - Paso 4: check de notificaciones de cumpleaños, check de política de datos (ambos obligatorios), contraseña y confirmación (necesarias para poder iniciar sesión después si no paga en el momento).
2. Tipos de sangre: `A Rh+ (A positivo)`, `A Rh- (A negativo)`, `B Rh+ (B positivo)`, `B Rh- (B negativo)`, `O Rh+ (O positivo)`, `O Rh- (O negativo)`, `AB Rh+ (AB positivo)`, `AB Rh- (AB negativo)`.
3. Género: `Masculino`, `Femenino`.
4. El país siempre es Ecuador. Provincia y ciudad se eligen de catálogo ecuatoriano; ciudad se habilita después de provincia.
5. La foto es obligatoria, JPG/PNG/WEBP, máximo 5 MB.
6. Ambos checks del paso 4 son obligatorios. La política se abre en modal y el check solo es válido si el usuario la acepta explícitamente.
7. Tras el registro el login transitorio es el correo personal. `users.state_id = 2` (POR HABILITAR). `profiles.email` = correo personal. `users.email` = correo personal hasta la aprobación.
8. El login sigue bloqueando estados 3 y 16, y permite estado 2. El gate de membresía es:
   - `pending_payment` → `/afiliacion/pago` (sin dashboard).
   - `pending_review` → `/afiliacion/en-revision` (sin dashboard, mensaje de pago no aprobado).
   - `approved` + HABILITADO → dashboard.
9. Un usuario con rol `admin` u operaciones nunca es redirigido al pago ni a la pantalla de espera de afiliación.
10. Restricción de dominio **solo para rol miembro**:
    - Si el usuario tiene únicamente rol `miembro` (access_level `member`) y está HABILITADO (`state_id = 1`), el login exige que `users.email` termine en `@copsstec.com` (case-insensitive). Cualquier otro dominio → 401, sin token.
    - Esa regla **no aplica** a `admin`, `bibliotecario`, `congreso-consejo`, `congreso-admin` ni a combinaciones donde el access_level no sea solo `member`.
    - El aspirante `POR HABILITAR` (`state_id = 2`) sí puede autenticarse con correo personal, exclusivamente para pago o espera.
11. Datos de transferencia y valor de afiliación salen de configuración (env), no hardcodeados en UI.
12. El QR codifica el texto de pago (banco, tipo de cuenta, número, titular, valor, referencia = cédula) para que al escanearlo se lea esa información.
13. Sin comprobante el pago está `pending_payment`. Con comprobante, `pending_review`. Al aprobar, `approved`.
14. Al aprobar, el correo corporativo sugerido es `{primer_nombre}.{primer_apellido}@copsstec.com`: minúsculas, sin tildes, sin eñes (`ñ` → `n`), solo `[a-z]`. Debe terminar en `@copsstec.com`. Si el correo ya existe en `users.email`, 409. El admin puede editarlo antes de confirmar.
15. La contraseña de acceso definitiva se genera al aprobar (10 caracteres aleatorios). Se actualiza `users.email` al corporativo, `users.password`, `users.state_id = 1` y `profiles.state_id = 1`.
16. Mail-in-a-Box se llama con Basic Auth y `POST /admin/mail/users/add`. Credenciales solo por env. Si falla, rollback.
17. Correos: uno al personal (`NewEmail`) avisando el corporativo y la clave; otro al corporativo (`NewUser`) con las credenciales. En local, si no hay SMTP, se registran en log.
18. La factura se genera solo al aprobar el pago. Queda disponible en el acceso del miembro.
19. El enable/disable actual de Miembros se mantiene para miembros ya habilitados. Para `state_id = 2` con pago en revisión, la acción principal es Aprobar (modal específico), no el enable simple.
20. No hardcodear secretos de Mail-in-a-Box en el repositorio.
21. La pantalla `/afiliacion/en-revision` usa layout mínimo (logo + cerrar sesión), sin menú de miembro, y el texto debe decir de forma explícita que el pago todavía no ha sido aprobado y que no puede ingresar al dashboard hasta que el administrador lo confirme.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `User` / `Profile` | `users`, `profiles` | reutilizadas | Registro público crea ambos con estado 2; la aprobación cambia email/password/estado |
| `MembershipPayment` | `membership_payments` | nueva | Comprobante y ciclo de pago de afiliación |
| `MembershipInvoice` | `membership_invoices` | nueva | Factura PDF generada al aprobar |

#### Campos del modelo — `membership_payments`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | integer | sí | serial | Identificador |
| `user_id` | integer | sí | FK users.id unique | Un pago de afiliación por usuario |
| `profile_id` | integer | sí | FK profiles.id | Perfil asociado |
| `amount` | numeric(12,2) | sí | > 0 | Valor vigente al registrar |
| `currency` | varchar(8) | sí | default `USD` | Moneda |
| `bank_name` | varchar(120) | sí | snapshot env | Banco |
| `account_type` | varchar(40) | sí | snapshot | Ahorros / corriente |
| `account_number` | varchar(64) | sí | snapshot | Número de cuenta |
| `account_holder` | varchar(180) | sí | snapshot | Titular |
| `account_ruc` | varchar(32) | no | snapshot | RUC si aplica |
| `reference` | varchar(64) | sí | cédula | Referencia de transferencia |
| `voucher_path` | text | no | imagen | Ruta del comprobante |
| `status` | varchar(32) | sí | enum | `pending_payment`, `pending_review`, `approved` |
| `reviewed_by` | integer | no | FK users.id | Admin que aprueba |
| `reviewed_at` | timestamptz | no | | Fecha de aprobación |
| `created_at` | timestamptz | sí | UTC | Alta |
| `updated_at` | timestamptz | sí | UTC | Actualización |

#### Campos del modelo — `membership_invoices`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | integer | sí | serial | Identificador |
| `payment_id` | integer | sí | FK unique | Pago origen |
| `user_id` | integer | sí | FK users.id | Miembro |
| `number` | varchar(40) | sí | unique | Ej. `AFI-2026-0001` |
| `amount` | numeric(12,2) | sí | | Valor facturado |
| `pdf_path` | text | sí | | Ruta del PDF |
| `issued_at` | timestamptz | sí | UTC | Emisión |

#### Índices / Constraints
- `membership_payments.user_id` UNIQUE
- `membership_payments.status` index
- `membership_invoices.number` UNIQUE
- `membership_invoices.payment_id` UNIQUE

### Configuración de pago (env)
| Variable | Ejemplo | Uso |
|----------|---------|-----|
| `MEMBERSHIP_FEE` | `50.00` | Valor de afiliación |
| `MEMBERSHIP_BANK_NAME` | `Banco Pichincha` | Banco |
| `MEMBERSHIP_ACCOUNT_TYPE` | `Cuenta de ahorros` | Tipo |
| `MEMBERSHIP_ACCOUNT_NUMBER` | `XXXXXXXXXX` | Número |
| `MEMBERSHIP_ACCOUNT_HOLDER` | `COPSSTEC` | Titular |
| `MEMBERSHIP_ACCOUNT_RUC` | | RUC opcional |
| `MAILBOX_API_URL` | `https://box.copsstec.com` | Mail-in-a-Box |
| `MAILBOX_ADMIN_EMAIL` | | Basic Auth |
| `MAILBOX_ADMIN_PASSWORD` | | Basic Auth, nunca en git |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | | Envío de correos; si faltan, log |

### API Endpoints

#### POST /api/membership/register
- **Descripción**: Registro público multipart (datos + foto)
- **Auth requerida**: no
- **Request**: `multipart/form-data` con los campos del wizard, `accept_birthday_notifications=true`, `accept_data_policy=true`, `password`, `password_confirmation`, `photo`
- **Response 201**: `{ access_token, user, payment }` e inicia el ciclo de pago `pending_payment`
- **Response 400**: validación (checks, foto, senescyt de cuarto nivel, contraseñas)
- **Response 409**: cédula o correo personal duplicado

#### GET /api/membership/status
- **Descripción**: Estado de afiliación del usuario autenticado
- **Auth requerida**: sí
- **Response 200**:
  ```json
  {
    "must_complete_payment": true,
    "must_wait_approval": false,
    "gate": "payment",
    "payment_status": "pending_payment",
    "state_id": 2,
    "personal_email": "persona@gmail.com",
    "login_email": "persona@gmail.com",
    "has_invoice": false
  }
  ```
  `gate` vale `payment` | `pending_approval` | `none`. Con `pending_review`: `gate=pending_approval`, `must_wait_approval=true`, `must_complete_payment=false`.

#### GET /api/membership/payment-info
- **Descripción**: Datos de transferencia + payload del QR
- **Auth requerida**: sí (miembro pendiente o en revisión)
- **Response 200**: banco, cuenta, titular, valor, referencia, `qr_payload`

#### POST /api/membership/payment-voucher
- **Descripción**: Sube el comprobante
- **Auth requerida**: sí
- **Request**: `multipart/form-data` archivo `voucher`
- **Response 200**: pago `pending_review` + redirección esperada a `/afiliacion/en-revision`
- **Response 400**: archivo inválido
- **Response 409**: ya está aprobado

#### GET /api/membership/invoice
- **Descripción**: Descarga el PDF de la factura
- **Auth requerida**: sí (miembro habilitado dueño)
- **Response 200**: `application/pdf`
- **Response 404**: aún no existe

#### GET /api/members/{member_id}/approval-preview
- **Descripción**: Datos para el modal de aprobación
- **Auth requerida**: admin
- **Response 200**:
  ```json
  {
    "user_id": 12,
    "names": "Ana",
    "lastname": "Pérez",
    "identifier": "0102030405",
    "personal_email": "ana@gmail.com",
    "suggested_corporate_email": "ana.perez@copsstec.com",
    "payment_status": "pending_review",
    "voucher_url": "/media/membership/12/voucher.jpg"
  }
  ```
- **Response 400**: no está pendiente de habilitar o no hay comprobante

#### POST /api/members/{member_id}/approve
- **Descripción**: Aprueba afiliación, crea buzón y factura
- **Auth requerida**: admin
- **Request**: `{ "email_corp": "ana.perez@copsstec.com" }`
- **Response 200**: miembro habilitado + mensaje
- **Response 400**: email_corp inválido o dominio distinto a `copsstec.com`
- **Response 409**: correo corporativo ya existe
- **Response 502**: Mail-in-a-Box falló (rollback)

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `AffiliationWizardPage` | `modules/membership/presentation/pages/affiliation-wizard-page.tsx` | — | Wizard 4 pasos |
| `PersonalDataStep` | `modules/membership/presentation/forms/personal-data-step.tsx` | form, onChange | Paso 1 + foto |
| `ContactStep` | `modules/membership/presentation/forms/contact-step.tsx` | form, onChange | Paso 2 |
| `AcademicStep` | `modules/membership/presentation/forms/academic-step.tsx` | form, onChange | Paso 3 |
| `ConfirmationStep` | `modules/membership/presentation/forms/confirmation-step.tsx` | form, onChange | Paso 4, checks, política, password |
| `DataPolicyModal` | `modules/membership/presentation/modals/data-policy-modal.tsx` | open, onClose | Texto LOPDP |
| `MembershipPaymentPage` | `modules/membership/presentation/pages/membership-payment-page.tsx` | — | QR, cuenta, voucher |
| `MembershipPendingApprovalPage` | `modules/membership/presentation/pages/membership-pending-approval-page.tsx` | — | Aviso: pago aún no aprobado, sin dashboard |
| `PaymentQrCard` | `modules/membership/presentation/components/payment-qr-card.tsx` | payload, info | QR + datos |
| `ApproveMemberModal` | `modules/members/presentation/modals/approve-member-modal.tsx` | member, emailCorp, voucher | Modal de aprobación |
| `MembershipInvoiceCard` | `modules/membership/presentation/components/membership-invoice-card.tsx` | — | Descarga factura en Mi espacio |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Wizard afiliación | `app/(public)/afiliacion/page.tsx` | `/afiliacion` | no |
| Pago afiliación | `app/(public)/afiliacion/pago/page.tsx` | `/afiliacion/pago` | sí (sesión, layout propio sin dashboard) |
| Pago en revisión | `app/(public)/afiliacion/en-revision/page.tsx` | `/afiliacion/en-revision` | sí (sesión, layout propio sin dashboard) |

Las páginas `/afiliacion/pago` y `/afiliacion/en-revision` usan un layout mínimo (logo + cerrar sesión), no el `DashboardShell`. Copia de `/en-revision`: título “Pago en revisión” y texto del tipo “Tu comprobante fue recibido, pero todavía no se ha aprobado tu pago. No puedes ingresar al dashboard hasta que el administrador lo confirme.”

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useAffiliationWizard` | `modules/membership/presentation/hooks/use-affiliation-wizard.ts` | step, form, errors, next, submit | Estado del wizard |
| `useMembershipStatus` | `modules/membership/presentation/hooks/use-membership-status.ts` | status, loading | Gate de pago |
| `useMembershipPayment` | `modules/membership/presentation/hooks/use-membership-payment.ts` | info, upload | Pago y voucher |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `registerMember` | `modules/membership/infrastructure/membership-api.ts` | `POST /api/membership/register` |
| `getMembershipStatus` | mismo | `GET /api/membership/status` |
| `getPaymentInfo` | mismo | `GET /api/membership/payment-info` |
| `uploadPaymentVoucher` | mismo | `POST /api/membership/payment-voucher` |
| `downloadMembershipInvoice` | mismo | `GET /api/membership/invoice` |
| `getApprovalPreview` | `modules/members/infrastructure/members-api.ts` | `GET /api/members/{id}/approval-preview` |
| `approveMember` | mismo | `POST /api/members/{id}/approve` |

### Arquitectura y Dependencias
- Paquetes nuevos: `httpx` (Mail-in-a-Box), `qrcode` o generación QR en frontend (`qrcode.react`), `reportlab` o PDF mínimo existente para factura.
- Módulo backend nuevo: `app/modules/membership/` (registro público, pago, factura, status).
- Extensión de `app/modules/members/` (preview + approve).
- Ports: `MailboxPort`, `EmailPort`, `MembershipInvoiceGenerator`, `VoucherStorage`.
- Impacto: registrar router `membership` en `main.py`; montar `/media/membership`; gate en login, `DashboardShell` y `RoleGate`.
- SQL: script Alembic/SQL en `backend/database/` o migración Alembic del proyecto.

### Contenido de la política (paso 4)

```
POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES
Por favor leer esta información antes de proceder con el registro

El Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC se compromete a garantizar la privacidad y seguridad de los datos personales de sus miembros. En cumplimiento de la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP), establecemos la presente política para informar sobre la recolección, uso, almacenamiento y protección de la información personal de nuestros afiliados.

1.- Datos Personales Recopilados
El COPSSTEC recopilará para su tratamiento los siguientes datos personales de sus miembros:
• Nombres completos.
• Número de cédula de identidad.
• Fecha de nacimiento.
• Tipo de sangre.
• Correo electrónico.
• Número de teléfono fijo.
• Número de teléfono móvil.
• Dirección de domicilio.
• Profesión y datos laborales relacionados con la Seguridad y Salud en el Trabajo.
• Otros datos que sean necesarios para la gestión de membresía y actividades del Colegio.
```

### Generación del correo corporativo
Función de dominio `suggest_corporate_email(names, lastname) -> str`:
1. Quitar tildes y `ñ`.
2. Tomar primer token de nombres y primer token de apellidos.
3. Dejar solo `[a-z]`.
4. Unir con punto y sufijo `@copsstec.com`.
Ejemplo: `José María Ñúñez` + `Pérez Gómez` → `jose.nunez@copsstec.com`.

### Notas de Implementación
> El enable actual (`POST /api/members/{id}/enable`) permanece para reactivar a deshabilitados. No debe crear buzón ni cambiar el correo. Solo `approve` hace Mail-in-a-Box + factura.
> Login transitorio del aspirante: correo personal, solo pantallas de afiliación. Login del miembro habilitado: únicamente `@copsstec.com`. Admin y otros roles no tienen esa restricción de dominio.
> El gate post-login lee `status.gate`: `payment` → `/afiliacion/pago`; `pending_approval` → `/afiliacion/en-revision`; `none` → dashboard.
> La validación de dominio se hace en `LoginUseCase` cuando `access_level == "member"` y `state_id == 1`.
> No copiar las credenciales de Mail-in-a-Box al código. Van en `.env`.
> Reutilizar foto storage, DataTable y estilos públicos existentes. El wizard debe verse como las pantallas de referencia (stepper, cards, botones Anterior/Siguiente, Afiliarme).
> Si faltan datos bancarios reales al implementar, usar los valores de env y documentarlos en `.env.example`.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] Crear módulo `membership` (domain, application, infrastructure, presentation)
- [x] Crear tablas `membership_payments` y `membership_invoices` + índices
- [x] Implementar registro público con foto, checks, password y estado 2
- [x] Implementar status, payment-info y carga de voucher
- [x] Implementar `suggest_corporate_email` y preview/approve en members
- [x] Adapter Mail-in-a-Box + EmailPort + generación de factura PDF
- [x] Gate de afiliación en login/`/me` (`gate`, `must_complete_payment`, `must_wait_approval`)
- [x] Login de miembro habilitado solo con `@copsstec.com`; otros roles sin esa regla
- [x] Registrar router y static `/media/membership`
- [x] Agregar variables a `Settings` y `.env.example`

#### Tests Backend
- [ ] `test_register_creates_pending_member`
- [ ] `test_register_requires_both_consents`
- [ ] `test_register_conflict_identifier`
- [ ] `test_upload_voucher_sets_pending_review`
- [x] `test_suggest_corporate_email_strips_accents`
- [ ] `test_approve_conflict_existing_email`
- [ ] `test_approve_rolls_back_when_mailbox_fails`
- [x] `test_login_enabled_member_rejects_non_copsstec_email`
- [x] `test_login_admin_allows_non_copsstec_email`
- [x] `test_login_pending_member_rejects_until_approval`

### Frontend

#### Implementación
- [x] Botón "Quiero ser miembro" en landing
- [x] Wizard `/afiliacion` con los 4 pasos, catálogo Ecuador, política y ambos checks
- [x] Página `/afiliacion/pago` con QR, cuenta y voucher
- [x] Página `/afiliacion/en-revision` de aviso (pago no aprobado, sin dashboard)
- [x] Gate post-login: pago / espera / dashboard según `gate`
- [x] Modal Aprobar en módulo Miembros (correo personal + corporativo editable)
- [x] Card/descarga de factura en Mi espacio
- [x] Estilos alineados a las pantallas de referencia

#### Tests Frontend
- [ ] Wizard no avanza el paso 4 sin ambos checks
- [ ] Landing renderiza el botón de afiliación
- [ ] Modal de aprobación envía `email_corp`
- [ ] Login redirige a pago cuando `gate=payment`
- [ ] Login redirige a en-revisión cuando `gate=pending_approval`

### QA
- [ ] Recorrer registro → pago → pantalla de espera → login forzado a espera → aprobación → dashboard + factura
- [ ] Probar que un miembro habilitado no entra con Gmail u otro dominio
- [ ] Probar que un admin sí entra aunque su correo no sea `@copsstec.com`
- [ ] Probar correo corporativo duplicado en el modal
- [ ] Validar que un miembro ya habilitado no pasa por el gate de pago
- [x] Actualizar estado spec: `status: IMPLEMENTED`
