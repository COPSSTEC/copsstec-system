---
id: SPEC-008
status: IMPLEMENTED
feature: gestion-pagos-membresia
created: 2026-09-15
updated: 2026-09-15
author: spec-generator
version: "1.1"
related-specs: ["SPEC-002", "SPEC-003", "SPEC-004", "SPEC-005"]
---

# Spec: Gestión de pagos y suscripción de membresía

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Crear el módulo administrativo **Pagos** (equivalente a `https://www.copsstec.com/payments`) y el historial de pagos por miembro. El administrador registra pagos de membresía u otros conceptos con tipo, valor, fecha y descripción, o aprueba el voucher que sube el miembro. El miembro ve sus pagos realizados y pendientes, y puede subir el comprobante de la cuota para renovar. El sistema trata la membresía como suscripción: USD 10 al mes o USD 120 al año, con saldo a favor consumido por meses de USD 10. Si la fecha de pago se vence más de 5 días, el miembro no entra al contenido y ve una pantalla para cancelar (pagar) su suscripción, con la misma subida de voucher.

### Requerimiento de Negocio
Dentro del administrador se necesita el módulo de pagos, basado en la página de pagos del sistema actual. El administrador debe poder registrar los pagos del miembro (membresía u otros) con valor, fecha y descripción, y ver por miembro los pagos que hizo. Está conectado con la tabla `payments` y también con `membership_payments` del flujo de afiliación (SPEC-005). Cada usuario es una suscripción: pagos mensuales de 10 dólares renuevan el mes siguiente; 120 dólares cubren hasta el año próximo. Quienes dan saldo a favor solo se les toma el equivalente a meses de 10 dólares. Si se pasa de 5 días la fecha de pago, no debe ingresar al sistema y se le muestra una pantalla de que su suscripción debe ser cancelada para acceder al contenido. En el módulo admin de pagos debe existir un apartado específico para los pagos de membresía. Del lado del miembro también se ven sus pagos. La afiliación de USD 50 entra a `payments`. La renovación la puede registrar el admin o el miembro subiendo el voucher del pago pendiente; el admin ve ese voucher y lo aprueba para renovar la membresía.

### Decisiones acordadas

1. **“Cancelar la suscripción”** en la pantalla de bloqueo significa **pagar / saldar** la cuota (uso latinoamericano), no desafiliar al miembro.
2. **`payments`** es el libro de pagos (histórico + altas admin + renovaciones con voucher). **`membership_payments`** sigue siendo el voucher 1:1 de afiliación (SPEC-005). No se fusionan las tablas.
3. Al **aprobar una afiliación**, además de lo ya implementado se inserta una fila en `payments` (`type = membresía`, `status = approved`) para que cuente en la cobertura.
4. El valor de afiliación actual (`MEMBERSHIP_FEE`, hoy `50.00`) entra como saldo y se convierte en meses de USD 10 (5 meses si es 50). No se cambia el fee de afiliación en esta entrega.
5. **Renovación con dos vías:**
   - El **admin** registra el pago en el modal / módulo (queda `approved` y renueva al instante).
   - El **miembro** ve pagos pendientes en su apartado, sube el voucher, el admin lo ve y lo **aprueba**; recién entonces se renueva la membresía.
6. Tipos `curso`, `congreso`, `carnet`, `multa` y `reservaciones` se guardan solo en `payments`. No escriben en `course_payments` ni `conference_payments`.
7. SPEC-004 decía “no incluir Pagos”. Esta spec **agrega** la acción Pagos en Miembros.
8. Miembros habilitados **sin** filas de membresía en `payments` (hoy 1 caso) no se bloquean hasta que exista al menos un pago de membresía o el admin registre uno.

### Historias de Usuario

#### HU-01: Módulo admin de pagos

```
Como:        Administrador
Quiero:      Un módulo Pagos con listado, filtros y un apartado de membresía
Para:        Ver y controlar todos los pagos del colegio, sobre todo las cuotas

Prioridad:   Alta
Estimación:  L
Dependencias: SPEC-002, SPEC-004
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: entrar al módulo pagos
  Dado que:  soy administrador autenticado
  Cuando:    abro /admin/pagos desde el menú lateral
  Entonces:  veo el listado paginado de payments con miembro, tipo, descripción, valor en USD, fecha de pago, estado y acciones
```

**Happy Path**
```gherkin
CRITERIO-1.2: apartado de membresía
  Dado que:  estoy en /admin/pagos
  Cuando:    abro la pestaña o sección "Membresía"
  Entonces:  veo tres bloques: (A) vouchers de renovación pendientes de aprobar; (B) suscripciones (cobertura, saldo, mora); (C) afiliaciones desde membership_payments
```

**Error Path**
```gherkin
CRITERIO-1.3: acceso denegado
  Dado que:  soy un usuario con rol miembro
  Cuando:    intento abrir /admin/pagos o GET /api/payments/admin
  Entonces:  el frontend redirige a access-denied y la API responde 403
```

**Edge Case**
```gherkin
CRITERIO-1.4: filtros del listado
  Dado que:  existen pagos de varios tipos, fechas y estados
  Cuando:    filtro por tipo, estado, rango de fecha, miembro (nombre/cédula) o texto de descripción
  Entonces:  la tabla solo muestra coincidencias y conserva paginación
```

#### HU-02: Registrar, editar y eliminar pagos por miembro

```
Como:        Administrador
Quiero:      Abrir un modal de pagos por miembro como en el sistema actual
Para:        Cargar membresía u otros pagos con valor, fecha y descripción

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: modal por miembro
  Dado que:  estoy en /admin/miembros
  Cuando:    elijo Acciones → Pagos en un miembro
  Entonces:  se abre un modal "Pagos" con el texto "Aquí encontrarás los pagos realizados y en proceso.", formulario (tipo, descripción, valor, fecha) y la lista de pagos de ese miembro con lápiz, papelera y, si hay voucher, enlace para verlo
```

**Happy Path**
```gherkin
CRITERIO-2.2: guardar pago de membresía
  Dado que:  el modal está abierto para el miembro 100
  Cuando:    elijo tipo Membresía, descripción "Pago de membresía", valor 120, fecha 17/02/2026 y pulso GUARDAR
  Entonces:  se inserta en payments (total legado 12000, last_digits any, trans_id NA, client_id NA, status approved) y se recalcula la suscripción del miembro
```

**Happy Path**
```gherkin
CRITERIO-2.3: editar y eliminar
  Dado que:  el miembro tiene pagos en la lista
  Cuando:    edito valor/fecha/descripción o elimino un pago
  Entonces:  payments se actualiza o borra y la cobertura/saldo se recalcula
```

**Error Path**
```gherkin
CRITERIO-2.4: validación del formulario
  Dado que:  falta tipo, valor <= 0, fecha inválida o descripción vacía
  Cuando:    pulso GUARDAR
  Entonces:  no se persiste y se muestra error 400 con mensaje claro
```

**Edge Case**
```gherkin
CRITERIO-2.5: tipos de pago
  Dado que:  abro el selector de tipo
  Cuando:    reviso las opciones
  Entonces:  aparecen Membresía, Curso, Carnet, Multa, Congreso y Reservaciones
```

#### HU-03: El miembro ve sus pagos y pendientes

```
Como:        Miembro habilitado
Quiero:      Ver mis pagos realizados y los pendientes, y subir el voucher del pendiente
Para:        Confirmar cuotas y renovar la membresía

Prioridad:   Alta
Estimación:  M
Dependencias: HU-02, HU-07
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: listado propio
  Dado que:  soy miembro con pagos en payments
  Cuando:    abro /mi-espacio/pagos
  Entonces:  veo (1) pagos pendientes con estado y formulario de voucher, (2) historial de pagos aprobados (tipo, descripción, valor USD, fecha) sin editar ni borrar, y el estado de cobertura / saldo a favor
```

**Error Path**
```gherkin
CRITERIO-3.2: no ve pagos ajenos
  Dado que:  pido GET /api/payments/me
  Cuando:    la sesión es de miembro
  Entonces:  la respuesta no incluye user_id distintos al mío
```

#### HU-04: Motor de suscripción 10 / 120 / saldo

```
Como:        Sistema
Quiero:      Calcular cobertura mensual, anual y saldo a favor
Para:        Saber hasta cuándo el miembro tiene derecho de acceso

Prioridad:   Alta
Estimación:  L
Dependencias: HU-02
Capa:        Backend
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: pago mensual
  Dado que:  un miembro al día recibe un pago de membresía approved de USD 10
  Cuando:    se registra o se aprueba el pago
  Entonces:  coverage_until se extiende 1 mes desde coverage_until si aún no venció, o desde date_register del pago si ya venció
```

**Happy Path**
```gherkin
CRITERIO-4.2: pago anual
  Dado que:  un miembro registra o se le aprueba USD 120 de membresía
  Cuando:    se aplica el motor
  Entonces:  la cobertura llega hasta el mismo día del año próximo (no se fracciona en 12 pagos visibles)
```

**Happy Path**
```gherkin
CRITERIO-4.3: saldo a favor
  Dado que:  un miembro paga USD 60 como abono (o cualquier monto que no sea pack anual completo)
  Cuando:    se aplica el motor
  Entonces:  se toman N = floor(monto / 10) meses y el resto (< 10) queda en credit_balance; cada mes cubierto consume 10 del saldo
```

**Edge Case**
```gherkin
CRITERIO-4.4: pack mixto
  Dado que:  el pago de membresía approved es USD 150
  Cuando:    se aplica el motor
  Entonces:  se toma 1 año (120) + 3 meses (30) y credit_balance no aumenta
```

**Edge Case**
```gherkin
CRITERIO-4.5: remanente insuficiente
  Dado que:  queda credit_balance = 5
  Cuando:    vence el mes
  Entonces:  no se extiende un mes extra; el saldo 5 se conserva hasta un nuevo pago que complete 10
```

**Edge Case**
```gherkin
CRITERIO-4.6: pendiente no cubre
  Dado que:  existe un pago de membresía pending_payment o pending_review
  Cuando:    se calcula la cobertura
  Entonces:  ese monto no se aplica hasta que status sea approved
```

#### HU-05: Bloqueo a los 5 días de mora

```
Como:        Miembro con cuota vencida
Quiero:      Ver una pantalla de que debo cancelar la suscripción y poder subir el voucher
Para:        Recuperar el acceso cuando el admin apruebe el pago

Prioridad:   Alta
Estimación:  M
Dependencias: HU-04, HU-07, SPEC-005
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: gracia de 5 días
  Dado que:  coverage_until fue ayer y hoy es día 3 de mora
  Cuando:    inicio sesión como miembro
  Entonces:  entro al dashboard con normalidad
```

**Happy Path**
```gherkin
CRITERIO-5.2: bloqueo día 6
  Dado que:  coverage_until + 5 días ya pasó y no hay crédito para un mes
  Cuando:    inicio sesión o navego a una ruta protegida de contenido
  Entonces:  soy redirigido a /suscripcion/pendiente y no veo dashboard, cursos ni perfil
```

**Error Path**
```gherkin
CRITERIO-5.3: contenido bloqueado
  Dado que:  el gate es subscription_due
  Cuando:    llamo a APIs de contenido de miembro
  Entonces:  responden 403 con detalle de suscripción pendiente de cancelar
```

**Edge Case**
```gherkin
CRITERIO-5.4: prioridad de gates
  Dado que:  el miembro aún no completa afiliación (SPEC-005)
  Cuando:    consulta /api/membership/status
  Entonces:  manda el gate payment o pending_approval, no subscription_due
```

**Edge Case**
```gherkin
CRITERIO-5.5: se restablece al aprobar o registrar
  Dado que:  el miembro está en /suscripcion/pendiente
  Cuando:    el admin registra un pago approved suficiente o aprueba el voucher de renovación
  Entonces:  el siguiente status.gate es none y puede entrar al contenido
```

**Edge Case**
```gherkin
CRITERIO-5.6: voucher en revisión no abre el contenido
  Dado que:  el miembro está en mora día 6+ y ya subió el voucher (pending_review)
  Cuando:    intenta entrar al dashboard
  Entonces:  sigue en /suscripcion/pendiente con el aviso de que el comprobante está en revisión
```

#### HU-06: Backfill de cobertura histórica

```
Como:        Administrador
Quiero:      Que los pagos ya existentes en payments alimenten la suscripción
Para:        No partir de cero con los ~986 pagos de membresía

Prioridad:   Alta
Estimación:  M
Dependencias: HU-04
Capa:        Backend
```

#### Criterios de Aceptación — HU-06

**Happy Path**
```gherkin
CRITERIO-6.1: replay cronológico
  Dado que:  un miembro tiene N pagos type membresía
  Cuando:    corre el backfill
  Entonces:  se marcan los históricos como approved, se aplican en orden de date_register parseado (DD/MM/YYYY) y queda coverage_until + credit_balance coherentes
```

#### HU-07: Miembro sube voucher de renovación

```
Como:        Miembro
Quiero:      Ver mi pago pendiente, elegir cuota mensual o anual y subir el comprobante
Para:        Renovar la membresía sin esperar a que el admin lo cargue a mano

Prioridad:   Alta
Estimación:  M
Dependencias: HU-03
Capa:        Ambas
```

#### Criterios de Aceptación — HU-07

**Happy Path**
```gherkin
CRITERIO-7.1: iniciar renovación
  Dado que:  no tengo un pago de membresía abierto (pending_payment o pending_review)
  Cuando:    en /mi-espacio/pagos elijo plan Mensual USD 10 o Anual USD 120
  Entonces:  se crea un payments type membresía en pending_payment con ese monto y descripción "Renovación de membresía"
```

**Happy Path**
```gherkin
CRITERIO-7.2: subir voucher
  Dado que:  tengo un pago pending_payment
  Cuando:    adjunto imagen JPG/PNG/WEBP del comprobante y confirmo
  Entonces:  el pago pasa a pending_review, se guarda voucher_path y el admin lo ve en el apartado de membresía
```

**Happy Path**
```gherkin
CRITERIO-7.3: mora con pago pendiente automático
  Dado que:  mi cobertura ya venció (gracia o mora) y no hay pago abierto
  Cuando:    abro /mi-espacio/pagos o /suscripcion/pendiente
  Entonces:  el sistema asegura un pending_payment mensual de USD 10, muestra QR/cuenta de transferencia y el formulario de voucher; puedo cambiarlo a anual USD 120 antes de subir
```

**Error Path**
```gherkin
CRITERIO-7.4: voucher obligatorio e inválido
  Dado que:  el archivo está vacío, supera 5 MB o no es imagen permitida
  Cuando:    intento subir
  Entonces:  responde 400 y el estado del pago no cambia
```

**Edge Case**
```gherkin
CRITERIO-7.5: un solo pendiente abierto
  Dado que:  ya existe un pending_payment o pending_review de membresía
  Cuando:    intento crear otra renovación
  Entonces:  responde 409 y se reutiliza el pendiente existente (puedo cambiar 10↔120 solo si sigue pending_payment)
```

#### HU-08: Admin aprueba o rechaza el voucher de renovación

```
Como:        Administrador
Quiero:      Ver el voucher del miembro y aprobarlo o rechazarlo
Para:        Renovar la membresía solo cuando el pago es válido

Prioridad:   Alta
Estimación:  M
Dependencias: HU-07
Capa:        Ambas
```

#### Criterios de Aceptación — HU-08

**Happy Path**
```gherkin
CRITERIO-8.1: ver voucher pendiente
  Dado que:  un miembro subió comprobante
  Cuando:    abro /admin/pagos → Membresía o el modal Pagos de ese miembro
  Entonces:  veo el pago pending_review, el monto, la fecha y un enlace/miniatura del voucher
```

**Happy Path**
```gherkin
CRITERIO-8.2: aprobar renueva
  Dado que:  el pago está pending_review
  Cuando:    pulso Aprobar
  Entonces:  status pasa a approved, date_register queda la fecha de aprobación si estaba vacía, se recalcula la suscripción y el miembro recupera acceso si estaba en mora
```

**Error Path**
```gherkin
CRITERIO-8.3: rechazar con observación
  Dado que:  el voucher no es válido
  Cuando:    pulso Rechazar con observación
  Entonces:  el pago queda rejected, se crea un nuevo pending_payment del mismo plan, el miembro ve la observación y puede volver a subir
```

**Error Path**
```gherkin
CRITERIO-8.4: no aprobar dos veces
  Dado que:  el pago ya está approved
  Cuando:    llamo otra vez a aprobar
  Entonces:  responde 409 y no se vuelve a aplicar cobertura
```

### Reglas de Negocio
1. Solo `admin` crea, edita, elimina, aprueba, rechaza y lista el módulo `/admin/pagos` y el modal de Miembros.
2. El miembro solo lee sus propios `payments`, crea renovaciones propias y sube voucher de sus pendientes.
3. Tipos canónicos de `payments.type`: `membresía`, `curso`, `carnet`, `multa`, `congreso`, `reservaciones`. Se siguen leyendo valores legado (`inscripcion`) en listados.
4. Solo `type = membresía` **con** `status = approved` mueve cobertura y saldo. Pendientes, en revisión y rechazados no cuentan.
5. `payments.total` se persiste como entero en centavos sin punto (`12000` = USD 120.00), igual que el legado. La API habla en dólares con 2 decimales.
6. `payments.date_register` es VARCHAR `DD/MM/YYYY`. `created_at` / `updated_at` son timestamps.
7. Altas admin directas: `last_digits = any`, `trans_id = NA`, `client_id = NA`, `reference` = descripción, `status = approved`.
8. Cuota mensual = USD 10. Pack anual = USD 120 → +1 año calendario desde la base de extensión.
9. Saldo a favor: remanente `< 10` tras aplicar años (120) y meses (10). El sistema solo cubre meses enteros.
10. Mora: `hoy > coverage_until + 5 días` y `credit_balance < 10` → gate `subscription_due`. El voucher en revisión **no** levanta el bloqueo.
11. Si `coverage_until >= hoy`, el nuevo pago approved de membresía extiende desde `coverage_until`. Si ya venció, extiende desde `date_register` del pago.
12. `membership_payments` no se usa como historial N pagos. Sigue UNIQUE por `user_id` para la afiliación.
13. Al aprobar afiliación se crea (si no existe equivalente) un `payments` de membresía `approved` con el `amount` de `membership_payments`.
14. Admin, operaciones y no-miembros no pasan por el gate de suscripción.
15. Deshabilitado (`state_id = 3`) o desafiliado (`16`) siguen bloqueados por login, no por esta pantalla.
16. Eliminar un pago de membresía recalcula toda la cadena de ese usuario (replay solo de `approved`), no resta a ciegas.
17. El modal y el módulo admin muestran montos como `120.00 US$`.
18. No se implementa pasarela de tarjetas. Los `last_digits` históricos de tarjeta se muestran enmascarados si no son `any`.
19. Como máximo **un** pago de membresía abierto por usuario (`pending_payment` o `pending_review`).
20. Planes de renovación del miembro: solo USD 10 o USD 120. El admin sí puede registrar otros montos (abonos / saldo a favor).
21. Datos bancarios y QR de renovación reutilizan la config de afiliación (`MEMBERSHIP_BANK_*`, `MEMBERSHIP_FEE` no aplica al plan; el monto es 10 o 120).
22. Voucher: JPG/PNG/WEBP, máximo 5 MB, ruta `storage/payments/{user_id}/`.
23. Filas históricas de `payments` se consideran `approved` en el backfill.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Payment` | tabla `payments` | columnas nuevas | Libro de pagos legado + estado/voucher de renovación |
| `MembershipPayment` | tabla `membership_payments` | reutilizada | Voucher de afiliación 1:1 (SPEC-005) |
| `MemberSubscription` | tabla `member_subscriptions` | nueva | Cobertura, saldo y mora por usuario |
| `MembershipStatus` | cálculo | modificado | Nuevo gate `subscription_due` |
| `User` / `Profile` | `users`, `profiles` | sin columnas nuevas | Se usan para mostrar el miembro |

#### Campos de `payments` (existentes + extensión)
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | bigint | sí | serial | PK |
| `user_id` | bigint | sí | FK users | Miembro dueño del pago |
| `type` | varchar(255) | sí | enum canónico | Concepto |
| `last_digits` | varchar(255) | sí | default `any` | Últimos dígitos de tarjeta o `any` |
| `total` | varchar(255) | sí | centavos enteros > 0 | Monto legado |
| `reference` | varchar(255) | sí | 1–255 | Descripción visible |
| `trans_id` | varchar(255) | sí | default `NA` | Id de transacción pasarela |
| `client_id` | varchar(255) | sí | default `NA` | Cliente pasarela |
| `date_register` | varchar(255) | sí | DD/MM/YYYY | Fecha de pago (en pending puede ir la fecha de vencimiento prevista) |
| `created_at` | timestamp | sí | auto | Alta |
| `updated_at` | timestamp | sí | auto | Edición |
| `status` | varchar(32) | sí | pending_payment / pending_review / approved / rejected | Estado del cobro. Default `approved` en filas viejas |
| `voucher_path` | text | no | | Comprobante subido por el miembro |
| `reviewed_by` | bigint | no | FK users | Admin que aprobó/rechazó |
| `reviewed_at` | timestamp | no | | Momento de revisión |
| `admin_observation` | text | no | max 500 | Motivo de rechazo |

#### Campos de `member_subscriptions` (nueva)
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `user_id` | bigint PK/FK | sí | unique users.id | Un registro por miembro |
| `coverage_until` | date | no | fecha | Fin de derecho (null = sin historial) |
| `credit_balance` | numeric(12,2) | sí | >= 0 | Saldo a favor en USD |
| `last_payment_at` | date | no | | Último pago de membresía approved |
| `updated_at` | timestamp | sí | auto | Recalculo |

```sql
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS voucher_path TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS admin_observation TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments (type);

CREATE TABLE IF NOT EXISTS member_subscriptions (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    coverage_until DATE,
    credit_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    last_payment_at DATE,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_coverage
    ON member_subscriptions (coverage_until);
```

Unicidad de pendiente abierto: no constraint SQL parcial (el legado no la tiene). Se garantiza en el caso de uso: si ya hay membresía `pending_payment` o `pending_review` para el `user_id`, no se crea otra.

#### Índices / Constraints
- Reutilizar `payments_pkey` y `payments_user_id_foreign`.
- Índice por `user_id`, `type` y `status`.
- `member_subscriptions.user_id` único.

### Motor de cobertura

Constantes de dominio:

- `MONTHLY_FEE = Decimal("10.00")`
- `YEARLY_FEE = Decimal("120.00")`
- `GRACE_DAYS = 5`

Conversión: `dollars = Decimal(total_centavos) / 100`.

Al aplicar un pago de membresía **approved** de monto `A` sobre estado `(coverage_until, credit)`:

1. `credit += A`
2. `years = floor(credit / 120)`; `credit -= years * 120`
3. `months = floor(credit / 10)`; `credit -= months * 10`
4. `base = coverage_until` si `coverage_until >= pago.fecha`, si no `pago.fecha`
5. `coverage_until = base + years years + months months`

Replay de un usuario: estado inicial `(null, 0)` y aplicar todos los `payments` con `type = membresía` **y** `status = approved` ordenados por fecha parseada, `id` como desempate.

Mora: miembro habilitado, afiliación `gate` ya `none`, existe suscripción con `coverage_until`, `today > coverage_until + 5 días` y `credit_balance < 10`.

Asegurar pendiente al entrar en gracia/mora: si no hay abierto, crear `pending_payment` mensual USD 10 con `date_register` = `coverage_until + 1 día` (fecha de pago esperada) y `reference = Renovación de membresía`.

### API Endpoints

Auth Bearer en todos. Prefijo `/api/payments`.

Estados de pago en responses: `pending_payment` | `pending_review` | `approved` | `rejected`.

#### GET /api/payments/admin
- **Descripción**: Listado admin de `payments` (módulo Pagos)
- **Auth**: admin
- **Query**: `page`, `page_size`, `q`, `type`, `status`, `user_id`, `date_from`, `date_to`, `sort_by` (`date_register`|`total`|`created_at`|`names`), `sort_dir`
- **Response 200**:
  ```json
  {
    "items": [
      {
        "id": 1020,
        "user_id": 100,
        "member_name": "Ana Pérez",
        "identifier": "1100",
        "type": "membresía",
        "description": "Pago de membresía",
        "amount": "120.00",
        "currency": "USD",
        "date_register": "17/02/2026",
        "last_digits": "any",
        "status": "approved",
        "voucher_url": null,
        "created_at": "2026-04-17T16:37:43"
      }
    ],
    "page": 1,
    "page_size": 15,
    "total": 989
  }
  ```

#### GET /api/payments/admin/membership
- **Descripción**: Apartado membresía
- **Auth**: admin
- **Query**: `page`, `page_size`, `q`, `subscription_status` (`al_dia`|`gracia`|`vencida`|`sin_historial`)
- **Response 200**:
  ```json
  {
    "pending_vouchers": [
      {
        "id": 1021,
        "user_id": 100,
        "member_name": "Ana Pérez",
        "amount": "10.00",
        "plan": "monthly",
        "status": "pending_review",
        "voucher_url": "/media/payments/100/voucher.webp",
        "date_register": "17/02/2026",
        "created_at": "2026-09-15T10:00:00"
      }
    ],
    "subscriptions": {
      "items": [
        {
          "user_id": 100,
          "member_name": "Ana Pérez",
          "identifier": "1100",
          "coverage_until": "2027-02-17",
          "credit_balance": "0.00",
          "status": "al_dia",
          "days_overdue": 0,
          "last_payment_at": "2026-02-17",
          "payments_count": 7,
          "open_payment_status": "pending_review"
        }
      ],
      "page": 1,
      "page_size": 15,
      "total": 216
    },
    "affiliations": [
      {
        "user_id": 652,
        "member_name": "Luis Mora",
        "amount": "50.00",
        "status": "pending_review",
        "voucher_url": "/media/membership/...",
        "created_at": "2026-09-14T10:00:00"
      }
    ]
  }
  ```

#### GET /api/payments/admin/members/{member_id}
- **Descripción**: Pagos de un miembro (modal)
- **Auth**: admin
- **Response 200**: `{ "member": { "user_id", "names", "lastname" }, "items": [Payment], "subscription": { ... } }`
- **Response 404**: miembro no encontrado

#### POST /api/payments/admin/members/{member_id}
- **Descripción**: Crea un pago **approved** (registro directo del admin)
- **Auth**: admin
- **Request Body**:
  ```json
  {
    "type": "membresía",
    "description": "Pago de membresía",
    "amount": "120.00",
    "date_register": "17/02/2026"
  }
  ```
- **Response 201**: pago creado + `subscription` actualizada
- **Response 400**: validación
- **Response 404**: miembro no existe

#### PUT /api/payments/admin/{payment_id}
- **Descripción**: Edita tipo, descripción, monto, fecha (si cambia un approved de membresía, replay)
- **Auth**: admin
- **Response 200**: pago + subscription
- **Response 404**: pago no encontrado

#### DELETE /api/payments/admin/{payment_id}
- **Descripción**: Elimina el pago y recalcula si era membresía approved
- **Auth**: admin
- **Response 204**
- **Response 404**

#### POST /api/payments/admin/{payment_id}/approve
- **Descripción**: Aprueba voucher de renovación
- **Auth**: admin
- **Response 200**: pago approved + subscription
- **Response 400**: no hay voucher / estado inválido
- **Response 409**: ya estaba approved
- **Response 404**

#### POST /api/payments/admin/{payment_id}/reject
- **Descripción**: Rechaza voucher
- **Auth**: admin
- **Request Body**: `{ "observation": "El comprobante no se lee" }`
- **Response 200**: pago rejected + nuevo pending_payment
- **Response 400**: observación vacía
- **Response 404**

#### GET /api/payments/me
- **Descripción**: Historial del miembro + pendiente abierto + datos de transferencia
- **Auth**: member
- **Response 200**:
  ```json
  {
    "items": [],
    "open_payment": {
      "id": 1021,
      "status": "pending_payment",
      "amount": "10.00",
      "plan": "monthly",
      "description": "Renovación de membresía",
      "date_register": "17/02/2026",
      "voucher_url": null,
      "admin_observation": null
    },
    "subscription": {
      "coverage_until": "2026-04-10",
      "credit_balance": "0.00",
      "status": "vencida",
      "grace_days": 5,
      "days_overdue": 8
    },
    "payment_info": {
      "bank_name": "Banco Pichincha",
      "account_type": "Cuenta de ahorros",
      "account_number": "XXXXXXXXXX",
      "account_holder": "COPSSTEC",
      "account_ruc": "",
      "qr_payload": "..."
    }
  }
  ```

#### POST /api/payments/me/renewals
- **Descripción**: Crea o actualiza el pendiente (solo `pending_payment`)
- **Auth**: member
- **Request Body**: `{ "plan": "monthly" }` o `{ "plan": "yearly" }`
- **Response 201/200**: `open_payment`
- **Response 409**: ya hay `pending_review` (no se puede cambiar el plan hasta que el admin rechace)

#### POST /api/payments/me/{payment_id}/voucher
- **Descripción**: Sube comprobante del pendiente propio
- **Auth**: member
- **Request**: `multipart/form-data` campo `voucher`
- **Response 200**: pago `pending_review`
- **Response 400**: archivo inválido
- **Response 403**: el pago no es del usuario o no está `pending_payment`/`rejected` reabierto
- **Response 404**

#### GET /api/payments/media/{payment_id}
- **Descripción**: Sirve el voucher. Admin cualquier pago; miembro solo el propio.
- **Auth**: admin o dueño
- **Response 200**: imagen
- **Response 403 / 404**

#### Extensión SPEC-005 — GET /api/membership/status
Agregar al response existente:

```json
{
  "gate": "subscription_due",
  "must_pay_subscription": true,
  "coverage_until": "2026-04-10",
  "credit_balance": "0.00",
  "days_overdue": 8,
  "open_payment_status": "pending_review"
}
```

`gate` pasa a: `payment` | `pending_approval` | `subscription_due` | `none`.

Orden: afiliación incompleta → `payment` / `pending_approval`; si ya está habilitado y aprobado → evaluar mora.

Al aprobar afiliación (`POST /api/members/{id}/approve`, ya existe): insertar `payments` de membresía `approved` si no hay uno con la misma fecha+monto del voucher, y ejecutar el motor.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `AdminPaymentsPage` | `modules/payments/presentation/pages/admin-payments-page.tsx` | — | Módulo `/admin/pagos`: pestañas Todos / Membresía |
| `MembershipPaymentsPanel` | `modules/payments/presentation/components/membership-payments-panel.tsx` | — | Vouchers pendientes + suscripciones + afiliaciones |
| `ApproveRenewalModal` | `modules/payments/presentation/modals/approve-renewal-modal.tsx` | `payment, onApprove, onReject` | Ver voucher, aprobar o rechazar |
| `MemberPaymentsModal` | `modules/payments/presentation/modals/member-payments-modal.tsx` | `member, open, onClose` | Modal de las capturas + voucher/aprobar |
| `PaymentTypeSelect` | `modules/payments/presentation/components/payment-type-select.tsx` | `value, onChange` | Selector de tipo |
| `PaymentListItem` | `modules/payments/presentation/components/payment-list-item.tsx` | `payment, onEdit, onDelete, readOnly` | Fila con monto, fecha, estado, voucher |
| `SubscriptionStatusBadge` | `modules/payments/presentation/components/subscription-status-badge.tsx` | `status` | Al día / gracia / vencida / en revisión |
| `RenewalVoucherForm` | `modules/payments/presentation/components/renewal-voucher-form.tsx` | `openPayment, paymentInfo` | Plan 10/120, QR, cuenta, subida de archivo |
| `MemberPaymentsPage` | `modules/payments/presentation/pages/member-payments-page.tsx` | — | Pendientes + historial en Mi espacio |
| `SubscriptionDuePage` | `modules/payments/presentation/pages/subscription-due-page.tsx` | — | Mora > 5 días + mismo formulario de voucher |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Admin pagos | `app/(protected)/admin/pagos/page.tsx` | `/admin/pagos` | admin |
| Mis pagos | `app/(protected)/mi-espacio/pagos/page.tsx` | `/mi-espacio/pagos` | member (si gate none) |
| Suscripción pendiente | `app/(public)/suscripcion/pendiente/page.tsx` | `/suscripcion/pendiente` | autenticado, fuera del dashboard |

La pantalla de mora **no** usa `DashboardShell` (igual que `/afiliacion/pago`): logo, mensaje, cobertura vencida, días de mora, QR/cuenta, plan 10/120, subida de voucher, botón cerrar sesión.

Copy de bloqueo:

> Tu suscripción está pendiente de cancelación. Debes cancelar tu cuota para acceder al contenido.

Si `open_payment_status = pending_review`:

> Recibimos tu comprobante. Cuando el administrador lo apruebe se renovará tu membresía.

#### UI del modal admin (según capturas)

- Título **Pagos** + botón `+` (foco al formulario).
- Subtítulo: “Aquí encontrarás los pagos realizados y en proceso.”
- Fila 1: select tipo | input descripción.
- Fila 2: valor de pago | fecha de pago.
- Botones CANCELAR y GUARDAR (alta directa `approved`).
- Lista de tarjetas: título = `reference`, monto `120.00 US$`, estado, “Fecha de pago: …”, “Forma de pago: **** **** **** {last_digits}”, iconos editar y eliminar.
- Si hay `voucher_url`: miniatura + Aprobar / Rechazar cuando `pending_review`.

#### UI miembro `/mi-espacio/pagos`

- Bloque **Pendiente**: plan Mensual/Anual, datos de transferencia, QR, input file, estado.
- Bloque **Historial**: lista read-only de `approved` y `rejected`.
- Resumen de cobertura y saldo a favor.

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useAdminPayments` | `modules/payments/presentation/hooks/use-admin-payments.ts` | listado, filtros, CRUD, approve, reject | Módulo admin |
| `useMemberPayments` | `modules/payments/presentation/hooks/use-member-payments.ts` | items, openPayment, save, update, remove | Modal admin por miembro |
| `useMyPayments` | `modules/payments/presentation/hooks/use-my-payments.ts` | items, openPayment, paymentInfo, choosePlan, uploadVoucher | Vista miembro |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listAdminPayments` | `modules/payments/infrastructure/payments-api.ts` | GET `/api/payments/admin` |
| `listMembershipPaymentsAdmin` | idem | GET `/api/payments/admin/membership` |
| `listMemberPaymentsAdmin` | idem | GET `/api/payments/admin/members/{id}` |
| `createMemberPayment` | idem | POST `/api/payments/admin/members/{id}` |
| `updatePayment` | idem | PUT `/api/payments/admin/{id}` |
| `deletePayment` | idem | DELETE `/api/payments/admin/{id}` |
| `approvePayment` | idem | POST `/api/payments/admin/{id}/approve` |
| `rejectPayment` | idem | POST `/api/payments/admin/{id}/reject` |
| `listMyPayments` | idem | GET `/api/payments/me` |
| `createMyRenewal` | idem | POST `/api/payments/me/renewals` |
| `uploadMyVoucher` | idem | POST `/api/payments/me/{id}/voucher` |

### Arquitectura y Dependencias
- Paquetes nuevos: ninguno.
- Módulo backend hexagonal `app/modules/payments/` (domain, application, infrastructure, presentation).
- El gate se extiende en `app/modules/membership` porque `DashboardShell` ya consulta `/api/membership/status`.
- Navegación: `NAVIGATION_BY_ACCESS["admin"]` agrega `{ label: "Pagos", href: "/admin/pagos" }`. `NAVIGATION_BY_ACCESS["member"]` agrega `{ label: "Mis pagos", href: "/mi-espacio/pagos" }`.
- Icono sidebar: extender `navIconForHref` para `/admin/pagos` y `/mi-espacio/pagos`.
- Registrar router en `backend/app/main.py`.
- Static `/media/payments` apuntando a `storage/payments`.
- SQL incremental: `backend/database/member_subscriptions.sql` (incluye `ALTER TABLE payments`).
- Reutilizar `DataTable` en `/admin/pagos`.
- Reutilizar el patrón visual de `/afiliacion/pago` para QR + voucher.
- `course_payments` (SPEC-003) no se toca.

### Notas de Implementación
> `payments.total` es VARCHAR de centavos. Nunca escribir `120.00` en esa columna: rompería el legado (810 filas `12000`).
>
> Parsear `date_register` con día/mes/año; no ordenar esa columna como texto en SQL. Ordenar con `to_date(date_register, 'DD/MM/YYYY')` cuando el valor coincida con el patrón.
>
> `membership_gate_from_payment` debe recibir también el estado de suscripción, o un segundo paso `subscription_gate(...)` después de afiliación `none`.
>
> Backfill: `status = approved` en filas sin estado + `recalculate_all_subscriptions()` al aplicar el SQL.
>
> El alta admin directa no exige voucher. El alta del miembro sí.
>
> La URL viva `copsstec.com/payments` está detrás de login; el listado admin se alinea al `DataTable` del resto del panel y el modal se copia de las capturas aportadas.
>
> Tests del motor con montos 10, 120, 60, 150, 5 de remanente, gracia día 5 vs bloqueo día 6, pendiente que no suma cobertura, approve que sí suma, y replay tras DELETE.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [ ] Crear módulo hexagonal `payments` (domain, application, ports, repository, schemas, router)
- [ ] `ALTER TABLE payments` (status, voucher, reviewed_*) + tabla `member_subscriptions` + índices
- [ ] Implementar motor 10 / 120 / saldo / gracia 5 días + replay solo de `approved`
- [ ] Endpoints admin de listado, apartado membresía, CRUD por miembro
- [ ] Endpoints admin approve / reject de voucher
- [ ] Endpoints miembro: `GET /me`, `POST /me/renewals`, `POST /me/{id}/voucher`
- [ ] Asegurar pending_payment mensual al entrar en gracia/mora
- [ ] Servir voucher en `/api/payments/media/{id}` y static `/media/payments`
- [ ] Extender `membership/status` con `subscription_due`, cobertura, mora y `open_payment_status`
- [ ] Al aprobar afiliación, insertar `payments` approved de membresía y recalcular
- [ ] Backfill de suscripciones desde `payments` existentes
- [ ] Registrar router en `main.py` y constantes `MONTHLY_FEE` / `YEARLY_FEE` / `GRACE_DAYS`
- [ ] Agregar ítem Pagos a `NAVIGATION_BY_ACCESS`

#### Tests Backend
- [ ] `test_subscription_monthly_extends_one_month`
- [ ] `test_subscription_yearly_extends_one_year`
- [ ] `test_subscription_credit_uses_only_full_months`
- [ ] `test_subscription_mixed_150_is_year_plus_three_months`
- [ ] `test_pending_payment_does_not_extend_coverage`
- [ ] `test_approve_voucher_extends_coverage`
- [ ] `test_reject_voucher_creates_new_pending`
- [ ] `test_grace_day_5_allows_access`
- [ ] `test_overdue_day_6_sets_subscription_due`
- [ ] `test_pending_review_does_not_clear_subscription_due`
- [ ] `test_affiliation_gate_has_priority_over_subscription`
- [ ] `test_replay_after_delete_recomputes_coverage`
- [ ] `test_only_one_open_membership_payment`
- [ ] `test_router_admin_forbidden_for_member`
- [ ] `test_router_me_returns_only_own_payments`
- [ ] `test_create_payment_stores_legacy_cents`

### Frontend

#### Implementación
- [ ] `payments-api.ts` + tipos de dominio (estados, plan, voucher)
- [ ] `AdminPaymentsPage` con pestañas Todos / Membresía y `DataTable`
- [ ] Panel de vouchers pendientes con aprobar/rechazar
- [ ] Ruta `/admin/pagos` + enlace en sidebar y dashboard admin
- [ ] `MemberPaymentsModal` según capturas + voucher/aprobar + acción Pagos en `MemberActionsMenu`
- [ ] `MemberPaymentsPage` en `/mi-espacio/pagos` con pendientes + historial + `RenewalVoucherForm`
- [ ] `SubscriptionDuePage` en `/suscripcion/pendiente` con el mismo formulario
- [ ] Extender `membershipRedirect` y `DashboardShell` para `subscription_due`
- [ ] Badge de estado de suscripción y de pago (pendiente / en revisión / aprobado)

#### Tests Frontend
- [ ] Modal envía type, description, amount y date al crear
- [ ] Historial miembro no muestra botones editar/borrar
- [ ] Formulario de voucher llama a upload con el payment_id pendiente
- [ ] Redirect a `/suscripcion/pendiente` cuando `gate === subscription_due`
- [ ] Admin page renderiza pestaña membresía y lista de vouchers pendientes

### QA
- [ ] Cubrir criterios CRITERIO-1.1 a 8.4
- [ ] Validar montos legado `12000` ↔ `120.00 US$` en UI
- [ ] Verificar que un miembro en mora no entra a `/dashboard` ni `/mi-espacio/cursos` aunque haya subido voucher
- [ ] Verificar que al aprobar el voucher sí entra
- [ ] Verificar que admin y operaciones no ven la pantalla de mora
- [ ] Confirmar que `course_payments` no se altera
- [ ] Actualizar estado spec: `status: IMPLEMENTED`
