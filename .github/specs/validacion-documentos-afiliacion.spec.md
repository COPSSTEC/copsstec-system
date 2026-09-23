---
id: SPEC-018
status: IMPLEMENTED
feature: validacion-documentos-afiliacion
created: 2026-09-23
updated: 2026-09-23
author: spec-generator
version: "1.0"
related-specs: ["SPEC-005", "SPEC-012", "SPEC-016"]
---

# Spec: Validación de registro y documentos de afiliación

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Reforzar el registro de nuevos miembros: validar cédula ecuatoriana, permitir saltar al paso del error, prellenar la autorización de débito con datos bancarios del aspirante, exigir también la solicitud firmada a mano y el compromiso de 1 año, y mostrar ese periodo en el perfil.

### Requerimiento de Negocio
Validar la cédula ecuatoriana. Si sale un error de miembro ya registrado por correo (u otra validación), el mensaje debe ser clicable y llevar al paso para corregirlo. Antes de descargar la autorización, el aspirante llena número de cuenta, entidad bancaria y tipo de cuenta para que el PDF salga completo y solo firme. La solicitud que ve el admin también se descarga con sus datos para que la suba firmada. No avanza si no sube autorización, cédula y solicitud (marcadas como subidas) y no da check de afiliarse 1 año. La autorización admite firma digital o manual; la solicitud solo firma a mano alzada. El 1 año se muestra en el perfil y no cambia la cobertura de pago (USD 10 / 1 mes).

### Historias de Usuario

#### HU-01: Validar cédula ecuatoriana

```
Como:        Aspirante a miembro
Quiero:      Que el sistema rechace una cédula inválida
Para:        Registrar solo identificaciones reales del Ecuador

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-005
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: cédula válida avanza
  Dado que:  estoy en el paso 1 del wizard
  Cuando:    ingreso una cédula ecuatoriana válida de 10 dígitos y el resto de datos
  Entonces:  puedo continuar al paso 2
```

**Error Path**
```gherkin
CRITERIO-1.2: cédula inválida se rechaza
  Dado que:  estoy en el paso 1 o envío el registro
  Cuando:    la cédula no cumple el algoritmo (dígitos, provincia o verificador)
  Entonces:  veo "La cédula ecuatoriana no es válida." y no se crea el miembro
```

#### HU-02: Errores clicables entre pasos

```
Como:        Aspirante
Quiero:      Hacer clic en el error y saltar al paso del campo
Para:        Corregir cédula, correo u otros datos sin adivinar dónde están

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: duplicado de correo salta al paso 2
  Dado que:  envío el registro y el correo ya existe
  Cuando:    hago clic en el mensaje de error
  Entonces:  voy al paso Contacto y Ubicación y el correo queda enfocado
```

**Happy Path**
```gherkin
CRITERIO-2.2: duplicado de cédula salta al paso 1
  Dado que:  la cédula ya está registrada
  Cuando:    hago clic en el error
  Entonces:  voy al paso Datos Personales y la cédula queda enfocada
```

#### HU-03: Datos bancarios y autorización prellenada

```
Como:        Aspirante que ya pagó
Quiero:      Llenar tipo, número y entidad de mi cuenta antes de descargar
Para:        Que la autorización salga completa y solo tenga que firmar

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-012
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: PDF con banco y anual marcado
  Dado que:  guardé tipo de cuenta, número y entidad
  Cuando:    descargo la autorización
  Entonces:  el PDF marca Corriente o Ahorros, muestra el número, la entidad y la modalidad Anual $120
```

**Error Path**
```gherkin
CRITERIO-3.2: no se descarga sin banco
  Dado que:  faltan tipo, número o entidad
  Cuando:    pido GET /api/membership/authorization-pdf
  Entonces:  el backend responde 400
```

#### HU-04: Solicitud con datos y subida a mano

```
Como:        Aspirante
Quiero:      Descargar la solicitud con mis datos y subirla firmada a mano
Para:        Completar el mismo documento que descarga el administrador

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-012
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: solicitud prellenada
  Dado que:  ya subí el comprobante
  Cuando:    descargo GET /api/membership/solicitud-pdf
  Entonces:  el PDF incluye nombre, cédula, provincia, ciudad y los opcionales solo si existen
```

**Error Path**
```gherkin
CRITERIO-4.2: no avanza sin los cuatro requisitos
  Dado que:  falta la solicitud, la cédula, la autorización o el check de 1 año
  Cuando:    intento enviar documentos
  Entonces:  el gate sigue en documents
```

#### HU-05: Check de 1 año y perfil

```
Como:        Miembro habilitado
Quiero:      Ver que mi afiliación institucional es de 1 año
Para:        Entender el compromiso que acepté al registrarme

Prioridad:   Media
Estimación:  S
Dependencias: SPEC-016
Capa:        Frontend
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: perfil muestra 1 año
  Dado que:  estoy en /profile
  Cuando:    veo el bloque de membresía
  Entonces:  aparece "Afiliación: 1 año" y la vigencia de pagos no cambia
```

### Reglas de Negocio
1. La cédula debe ser ecuatoriana válida (10 dígitos, provincia 01–24 o 30, tercer dígito &lt; 6, dígito verificador módulo 10).
2. Los errores de registro son clicables y llevan al paso/campo.
3. No se descarga la autorización sin tipo de cuenta, número y entidad bancaria del aspirante.
4. La autorización admite firma digital o a mano alzada. La solicitud solo admite firma a mano alzada.
5. El gate `documents` exige autorización + cédula + solicitud + check de 1 año.
6. El admin no aprueba sin esos documentos (más el comprobante).
7. El check de 1 año es informativo: no cambia `coverage_until` ni el cobro de USD 10.
8. En la autorización se marca Anual $120; el primer pago sigue siendo USD 10.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `MembershipPayment` | `membership_payments` | modificada | Banco del miembro, solicitud firmada y check de 1 año |
| `MembershipStatus` | derivado | modificada | Flags de solicitud, check y datos bancarios |
| `AuthorizationPdf` | generado | modificada | Recibe banco, tipo, número y marca anual |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `member_account_type` | TEXT | no | `Corriente` o `Ahorros` | Tipo de cuenta del aspirante |
| `member_account_number` | TEXT | no | no vacío al descargar | Número de cuenta |
| `member_bank_name` | TEXT | no | no vacío al descargar | Entidad bancaria |
| `signed_solicitud_path` | TEXT | no | PDF | Solicitud firmada a mano |
| `accepted_affiliation_year` | BOOLEAN | no | default false | Aceptó afiliarse 1 año |

#### Índices / Constraints
- Sigue 1:1 por `user_id`. Completo solo con 3 paths + `accepted_affiliation_year = true`.

#### SQL
`backend/database/membership_onboarding_bank_solicitud.sql`

### API Endpoints

#### PUT /api/membership/bank-details
- **Auth requerida**: sí
- **Body**: `{ "account_type": "Corriente"|"Ahorros", "account_number": "string", "bank_name": "string" }`
- **Response 200**: status con datos bancarios
- **Response 400**: campos inválidos
- **Response 403**: pago no está en `pending_review`

#### GET /api/membership/authorization-pdf
- **Cambio**: exige datos bancarios guardados y los imprime en el PDF.

#### GET /api/membership/solicitud-pdf
- **Auth requerida**: sí
- **Response 200**: PDF de solicitud con datos del perfil
- **Response 403**: sin comprobante en revisión

#### POST /api/membership/onboarding-documents
- **Cambio**: acepta `signed_solicitud` y `accepted_affiliation_year`.
- Completo solo con 3 PDFs + check.

#### GET /api/membership/status
- **Cambio**: `has_signed_solicitud`, `accepted_affiliation_year`, datos bancarios.

#### GET /api/members/{id}/approval-preview y approve
- Incluye `signed_solicitud_url`. No aprueba si falta.

#### POST /api/membership/register
- **Cambio**: 409 con `{ message, code }` (`identifier_taken` | `email_taken`). 400 si cédula inválida.

### Diseño Frontend

#### Componentes / páginas
| Componente | Archivo | Descripción |
|------------|---------|-------------|
| Wizard | `affiliation-wizard-page.tsx` | Cédula EC + errores clicables |
| Documentos | `authorization-documents-page.tsx` | Banco, 2 descargas, 3 uploads, check 1 año |
| Aprobar | `approve-member-modal.tsx` | Solicitud firmada obligatoria |
| Perfil | `profile-page.tsx` | Texto “Afiliación: 1 año” |

### Arquitectura y Dependencias
- Sin paquetes nuevos.
- Validador de cédula compartido conceptualmente en `membership/domain/cedula.py` y `frontend/.../lib/cedula.ts`.

### Notas de Implementación
- Reutilizar `MemberDocumentGenerator.generate_solicitud`.
- Opcionales vacíos en la solicitud no se imprimen como "—".
- El 409 estructurado permite no depender del copy para saltar de paso.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Validador de cédula ecuatoriana y uso en registro (y alta admin)
- [x] SQL de columnas nuevas
- [x] PUT bank-details + PDF de autorización prellenado
- [x] GET solicitud-pdf y upload de solicitud + check 1 año
- [x] Gate de 4 requisitos y aprobación admin

#### Tests Backend
- [x] `test_ecuadorian_cedula_valid_and_invalid`
- [x] `test_register_rejects_invalid_cedula`
- [x] `test_authorization_pdf_contains_bank_data`
- [x] `test_onboarding_requires_solicitud_and_year`
- [x] `test_solicitud_omits_empty_optional_fields`

### Frontend

#### Implementación
- [x] Validación de cédula y errores clicables en el wizard
- [x] Página de documentos: banco, descargas, 3 uploads, check
- [x] Modal de aprobación con solicitud
- [x] Perfil: Afiliación 1 año

#### Tests Frontend
- [ ] Cubierto por verificación en navegador del flujo de afiliación

### QA
- [x] Recorrer wizard, documentos y perfil
- [x] Actualizar estado spec: `status: IMPLEMENTED`
