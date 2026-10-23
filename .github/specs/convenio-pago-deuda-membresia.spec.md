---
id: SPEC-025
status: IN_PROGRESS
feature: convenio-pago-deuda-membresia
created: 2026-10-22
updated: 2026-10-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-008", "SPEC-015", "SPEC-017", "SPEC-023"]
---

# Spec: Convenio de pago de deuda de membresía

> **Estado:** `IN_PROGRESS` (plan aprobado por el usuario el 2026-10-22)
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
El administrador crea, desde el panel del miembro en **Pagos → Membresía**, un convenio que congela la deuda de membresía y la reparte en débitos mensuales: cuota de USD 10 del mes en curso más un abono fijo (USD 20 o USD 30) hasta saldar la deuda. Al crear el convenio se envía un correo con el detalle. Cada mes el admin confirma en lote los débitos realizados por el banco; la plantilla CASH usa el monto del mes. El miembro ve su convenio y calendario en **Mis pagos**.

### Requerimiento de Negocio
Mensaje modelo enviado a un miembro:

> De acuerdo con el saldo pendiente de su membresía, correspondiente al período de octubre de 2025 a octubre de 2026, la deuda acumulada es de $130. A partir de noviembre de 2026, se realizará un débito mensual de $30 durante los primeros cinco días de cada mes: $10 aporte del mes en curso y $20 abono a la deuda pendiente. Este esquema se mantendrá hasta abril de 2027. En mayo de 2027 se debitarán $20, correspondientes a los últimos $10 de deuda y los $10 del aporte mensual. A partir de junio de 2027, el débito será únicamente de $10 mensuales.

### Decisiones aprobadas
1. **Conteo de deuda con el mes en curso.** La cuota se cobra al inicio del mes; la deuda cuenta meses calendario desde el mes de la primera renovación hasta el mes actual, ambos incluidos. El ejemplo de SPEC-017 (inscrito 05/01/2023, consulta 06/01/2026) pasa de USD 240 a **USD 250**.
2. **Creación manual por el admin**: abono USD 20 o USD 30, mes de inicio y datos bancarios (prellenados desde el onboarding).
3. **Confirmación en lote** de los débitos del mes (debitado o fallido). Al confirmar se registran dos pagos: cuota (da cobertura) y abono (solo reduce deuda).
4. **Incluye**: correo al crear el convenio, plantilla CASH con el monto del mes, tarjeta del convenio en Mis pagos.

### Historias de Usuario

#### HU-01: Crear convenio
```
Como:        Administrador
Quiero:      Crear un convenio de pago para un miembro con deuda
Para:        Cobrar la deuda en cuotas fijas junto con la cuota mensual
Prioridad:   Alta
Capa:        Ambas
```

```gherkin
CRITERIO-1.1: calendario del caso Pavel
  Dado que:  la primera renovación del miembro fue en octubre de 2025 y no ha pagado renovaciones
  Cuando:    el 21/10/2026 crea un convenio con abono 20 e inicio noviembre de 2026
  Entonces:  la deuda congelada es 130.00
  Y:         el calendario tiene 6 débitos de 30.00 (nov 2026 – abr 2027) y 1 de 20.00 (may 2027)
  Y:         el convenio termina en mayo de 2027

CRITERIO-1.2: validaciones
  Dado que:  el miembro no tiene deuda, no está habilitado, ya tiene convenio activo,
             el abono no es 20/30 o el mes de inicio es anterior al actual o posterior a 3 meses
  Cuando:    se intenta crear el convenio
  Entonces:  responde 400/409 y no se crea nada

CRITERIO-1.3: correo
  Dado que:  se crea el convenio
  Entonces:  se envía el correo payment_plan_agreement con periodo, deuda, débito, fin y monto regular
  Y:         si el SMTP falla el convenio queda creado
```

#### HU-02: Confirmar débitos del mes
```gherkin
CRITERIO-2.1: débito confirmado
  Dado que:  hay cuotas pendientes del periodo 2026-11
  Cuando:    el admin las marca como Debitado
  Entonces:  se crean pagos aprobados de 10.00 (cuota, fecha 01/11/2026) y 20.00 (abono, applies_to_debt)
  Y:         la cobertura avanza un mes y la deuda baja 20.00

CRITERIO-2.2: débito fallido
  Dado que:  una cuota pendiente falla
  Cuando:    el admin la marca como Fallido
  Entonces:  no se crea pago, la cuota del mes pasa a deuda y las cuotas siguientes se recalculan

CRITERIO-2.3: fin del convenio
  Dado que:  se confirma la última cuota con abono
  Entonces:  el convenio pasa a completed y desde el mes siguiente el débito es 10.00
```

#### HU-03: Plantilla CASH
```gherkin
CRITERIO-3.1: monto por periodo
  Dado que:  un miembro tiene convenio
  Cuando:    se descarga la plantilla del periodo 2026-11 / 2027-05 / 2027-06
  Entonces:  MONTO es 30.00 / 20.00 / 10.00 con los datos bancarios del convenio
```

#### HU-04: Vista del miembro
```gherkin
CRITERIO-4.1: tarjeta del convenio
  Dado que:  tengo convenio activo
  Cuando:    abro /mi-espacio/pagos
  Entonces:  veo deuda, próximo débito (1–5 del mes) con su desglose, saldo restante, fin y calendario
```

### Reglas de Negocio
1. `pending_balance = max(0, meses_calendario_incluidos × 10 − pagos de membresía aprobados desde la primera renovación)`. Los abonos cuentan como pagados.
2. Los abonos (`payments.applies_to_debt = true`) **no** extienden la cobertura (`replay` los ignora).
3. Un convenio `active` por miembro. Solo con `pending_balance > 0` y `state_id = 1`.
4. Deuda congelada = saldo calculado al último día del mes anterior al inicio (evita contar dos veces la cuota del primer mes).
5. Inicio permitido: mes actual hasta mes actual + 3.
6. Débito fallido: la cuota no cobrada se suma a la deuda restante; las cuotas pendientes posteriores se regeneran.
7. Un convenio `active` levanta el bloqueo `subscription_due`.
8. Convenio `completed`: sigue como autorización de débito de USD 10 mensuales (se generan cuotas de solo-cuota por periodo).
9. Cancelar elimina las cuotas pendientes; lo ya debitado se conserva.
10. Fecha de los pagos confirmados: día 1 del periodo.

---

## 2. DISEÑO

### Modelos de Datos
`backend/database/membership_payment_plans.sql`

| Tabla | Campos |
|-------|--------|
| `membership_payment_plans` | `id`, `user_id`, `debit_agreement_id`, `debt_total`, `monthly_fee`, `installment_amount`, `start_period`, `end_period`, `debt_from_period`, `debt_to_period`, `status` (active/completed/cancelled), `bank_name`, `account_type`, `account_number`, `created_by`, `created_at`, `updated_at`, `cancelled_at`, `completed_at` |
| `membership_plan_installments` | `id`, `plan_id`, `period`, `fee_amount`, `debt_amount`, `total_amount`, `status` (pending/debited/failed), `fee_payment_id`, `debt_payment_id`, `confirmed_by`, `confirmed_at`, `created_at`, `updated_at` |
| `payments` | `applies_to_debt BOOLEAN NOT NULL DEFAULT false` |

Índices: único parcial `(user_id) WHERE status = 'active'`; único `(plan_id, period)`; índice `(period)`.

### API Endpoints (prefijo `/api/payments`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/members/{id}/payment-plan/preview?installment=20&start_period=2026-11` | Calendario sin guardar + datos bancarios sugeridos |
| GET | `/admin/members/{id}/payment-plan` | Convenio vigente (active/completed) o `null` |
| POST | `/admin/members/{id}/payment-plan` | Crea y envía el correo |
| POST | `/admin/payment-plans/{plan_id}/cancel` | Cancela |
| GET | `/admin/payment-plans/installments?period=2026-11` | Cuotas del periodo |
| POST | `/admin/payment-plans/installments/confirm` | `{ installment_ids, status: debited/failed }` |
| GET | `/me` | Agrega `payment_plan` |
| GET | `/admin/membership` | Agrega `payment_plan_status` por fila y filtro `payment_plan_status` |

`GET /api/members/export/cobros?period=YYYY-MM` (por defecto: mes actual si hoy es día 1–5, si no el siguiente).

### Frontend
- `create-payment-plan-modal.tsx`, `confirm-plan-debits-modal.tsx`, `payment-plan-block.tsx` (admin), `member-payment-plan-card.tsx` (miembro).
- Cambios: `admin-member-payment-panel.tsx`, `admin-payments-page.tsx`, `membership-payments-panel.tsx`, `member-payments-page.tsx`, `types.ts`, `payments-api.ts`.

---

## 3. LISTA DE TAREAS

### Backend
- [ ] SQL + aplicar en DB local
- [ ] Dominio: conteo inclusivo, `build_plan_schedule`, `replay` sin abonos, gate con convenio
- [ ] Repositorio, casos de uso y endpoints
- [ ] Correo `payment_plan_agreement`
- [ ] Plantilla CASH por periodo

### Frontend
- [ ] Bloque y modal de convenio en el panel admin
- [ ] Modal Débitos del mes
- [ ] Badge y filtro Convenio
- [ ] Tarjeta del convenio en Mis pagos

### Tests
- [ ] Calendario Pavel (6×30 + 20)
- [ ] Deuda inclusiva (130 / 250)
- [ ] Abono no extiende cobertura
- [ ] Débito fallido regenera cuotas
- [ ] CASH 30 / 20 / 10
- [ ] Validaciones de creación
