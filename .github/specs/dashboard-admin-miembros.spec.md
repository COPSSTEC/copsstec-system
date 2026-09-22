---
id: SPEC-013
status: IMPLEMENTED
feature: dashboard-admin-miembros
created: 2026-09-22
updated: 2026-09-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-004", "SPEC-005", "SPEC-008"]
---

# Spec: Dashboard administrativo de miembros, pagos e ingresos

> **Estado:** `DRAFT` → aprobar con `status: APPROVED` antes de iniciar implementación.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Reemplazar el dashboard placeholder del administrador por un panel de indicadores reales: tarjetas de miembros (activos, inactivos, técnicos, médicos), estado de pagos de membresía, ingresos anuales del colegio, demografía enriquecida desde `profiles` y una gráfica de títulos de tercer y cuarto nivel. Cada bloque descarga un Excel con el detalle nominativo. El botón **Miembros** abre los registros recién afiliados pendientes de aprobación. No se implementa el envío de correos masivos.

### Requerimiento de Negocio
El usuario administrador necesita el dashboard del portal (equivalente a las capturas del sistema actual) con cards, gráficas de demografía, pendientes de pago e ingresos por año. Debe agregarse una gráfica de personas con título de tercer nivel y de cuarto nivel, y aprovechar mejor los datos de `profiles` para demografía útil. El botón Miembros muestra a quienes recién se registraron y están pendientes de aprobación. De cada gráfica se descarga un Excel con nombres, correos, cédulas y los datos de esa gráfica. El botón de correos masivos queda fuera de alcance. El estado de pagos se calcula con el motor de suscripción de SPEC-008 (`member_subscriptions.coverage_until`, gracia de 5 días, solo pagos `membresía` + `approved`).

### Decisiones acordadas

1. **Ruta:** el dashboard admin vive en `/dashboard` cuando `access_level = admin`. El dashboard de miembro/operaciones no se rediseña en esta entrega.
2. **Correos masivos:** no se crea el botón ni endpoints. Queda fuera de alcance.
3. **Estado de pago (gráfica Al día vs Pendiente):** reutilizar el motor de SPEC-008, con el mismo agrupado que votaciones:
   - **Al día** = `al_dia` o `gracia` (`coverage_until >= hoy` o dentro de los 5 días de gracia).
   - **Pendiente** = `vencida` o `sin_historial`.
   Solo cuentan usuarios con rol `miembro`, `profiles.deleted_at IS NULL` y `users.state_id = 1` (habilitados).
4. **Activos / inactivos:**
   - Activos: rol `miembro`, no eliminados, `users.state_id = 1`.
   - Inactivos: rol `miembro`, no eliminados, `users.state_id IN (3, 16)`.
   - `state_id = 2` (POR HABILITAR) no entra en activos ni inactivos; aparece solo en el modal de pendientes de aprobación.
5. **Técnicos / médicos:** clasificación por título (tercer o cuarto nivel). Es **médico** si el texto de `title_academic` o `fourth_title` coincide con palabras médicas (`médic`, `medic`, `doctor`, `medicina`, `salud ocupacional` como título médico). El resto de habilitados con título se cuenta como **técnico**. Un miembro sin título no entra en ninguna de las dos cards.
6. **Ingresos por año:** sumar montos `approved` de `payments` (centavos legado → USD) agrupados por mes del año seleccionado. Series: **Membresías** (`type` membresía/membresia), **Cursos** (`type` curso) **más** `course_payments` aprobados (`state_id` de pagado del módulo cursos), **Reservaciones** (`type` reservaciones). Tipos `carnet`, `multa` y `congreso` no se grafican en esta entrega.
7. **Excel:** CSV UTF-8 con BOM (abre en Excel), columnas mínimas `nombres`, `apellidos`, `cedula`, `correo`, más las columnas de la dimensión descargada. Sin librería nueva.
8. **Pendientes de aprobación:** usuarios con rol `miembro` y `state_id = 2`, ordenados por registro más reciente. Desde el modal se reutiliza `ApproveMemberModal` existente.

### Historias de Usuario

#### HU-01: Ver indicadores del colegio

```
Como:        Administrador
Quiero:      Ver tarjetas con totales de miembros activos, inactivos, técnicos y médicos
Para:        Tener un panorama inmediato del padrón

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-004
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: cards con datos reales
  Dado que:  soy administrador autenticado
  Cuando:    abro /dashboard
  Entonces:  veo 4 cards (activos, inactivos, técnicos, médicos) con conteos reales, porcentaje o variación y botón de descarga
```

**Error Path**
```gherkin
CRITERIO-1.2: acceso denegado
  Dado que:  soy un usuario con rol miembro
  Cuando:    llamo GET /api/dashboard/admin
  Entonces:  el backend responde 403 y /dashboard no muestra el panel admin
```

**Edge Case**
```gherkin
CRITERIO-1.3: variación mensual
  Dado que:  hay registros con date_register del mes actual y del anterior
  Cuando:    cargo las cards de activos e inactivos
  Entonces:  se muestra el porcentaje de cambio respecto al mes pasado; si el mes pasado era 0, se muestra "—"
```

#### HU-02: Ver estado de pagos de membresía

```
Como:        Administrador
Quiero:      Ver cuántos miembros habilitados están al día o pendientes
Para:        Controlar la morosidad del colegio

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-008
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: barras al día vs pendiente
  Dado que:  existen suscripciones en member_subscriptions
  Cuando:    abro el dashboard
  Entonces:  la gráfica Estado de pagos muestra Al día (al_dia + gracia) y Pendiente (vencida + sin_historial)
```

**Happy Path**
```gherkin
CRITERIO-2.2: descargas de pagos
  Dado que:  estoy en Estado de pagos
  Cuando:    pulso Descargar detalle o Descargar deudores
  Entonces:  se descarga un Excel: detalle = todos los habilitados con su estado; deudores = solo pendientes
```

**Edge Case**
```gherkin
CRITERIO-2.3: sin historial es pendiente
  Dado que:  un miembro habilitado no tiene fila en member_subscriptions
  Cuando:    se calcula la gráfica
  Entonces:  cuenta como Pendiente y aparece en Descargar deudores
```

#### HU-03: Ver ingresos anuales del colegio

```
Como:        Administrador
Quiero:      Ver ingresos mensuales de membresías, cursos y reservaciones por año
Para:        Entender el recaudo del colegio

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-008, SPEC-003
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: series por categoría
  Dado que:  hay payments approved y course_payments pagados en 2025
  Cuando:    selecciono el año 2025
  Entonces:  veo una gráfica de líneas/área con 12 meses y series Membresías, Cursos y Reservaciones en USD
```

**Happy Path**
```gherkin
CRITERIO-3.2: descarga de ingresos
  Dado que:  hay ingresos en el año seleccionado
  Cuando:    descargo el Excel de ingresos
  Entonces:  cada fila es un cobro con nombres, apellidos, cédula, correo, tipo, monto, fecha y mes
```

**Edge Case**
```gherkin
CRITERIO-3.3: año sin datos
  Dado que:  elijo un año sin pagos
  Cuando:    se renderiza la gráfica
  Entonces:  las 12 series quedan en 0 y el Excel incluye solo encabezados
```

#### HU-04: Ver demografía enriquecida y títulos

```
Como:        Administrador
Quiero:      Ver demografía del padrón y quién tiene tercer o cuarto título
Para:        Usar los datos reales de profiles, no solo género y provincia

Prioridad:   Alta
Estimación:  L
Dependencias: SPEC-004, SPEC-005
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: pestañas demográficas
  Dado que:  existen profiles con género, provincia, ciudad, cumpleaños, tipo de sangre y type_profile
  Cuando:    abro Demografía de miembros
  Entonces:  puedo cambiar entre Género, Provincia, Ciudad, Edad, Tipo de sangre y Tipo de perfil
```

**Happy Path**
```gherkin
CRITERIO-4.2: gráfica de títulos
  Dado que:  hay miembros con title_academic y/o fourth_title
  Cuando:    veo la gráfica de títulos académicos
  Entonces:  se muestran conteos de tercer nivel, cuarto nivel, ambos y sin título, más el top de títulos
```

**Happy Path**
```gherkin
CRITERIO-4.3: descarga demográfica
  Dado que:  estoy en cualquier pestaña o en títulos
  Cuando:    pulso descargar
  Entonces:  el Excel incluye nombres, apellidos, cédula, correo y la dimensión (género, provincia, título, etc.)
```

**Edge Case**
```gherkin
CRITERIO-4.4: valores vacíos
  Dado que:  un profile no tiene provincia, género o título
  Cuando:    se agrupa
  Entonces:  entra en la categoría "Sin dato"
```

#### HU-05: Revisar afiliaciones pendientes

```
Como:        Administrador
Quiero:      Abrir desde el dashboard a los miembros recién registrados pendientes de aprobación
Para:        Habilitarlos sin ir primero al módulo Miembros

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-005
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: botón Miembros
  Dado que:  hay N usuarios con state_id = 2
  Cuando:    pulso Miembros en el dashboard
  Entonces:  se abre un panel/modal con esos registros (nombre, cédula, correo, fecha) y un badge con N
```

**Happy Path**
```gherkin
CRITERIO-5.2: aprobar desde el panel
  Dado que:  el panel de pendientes está abierto
  Cuando:    elijo Aprobar en un registro
  Entonces:  se reutiliza ApproveMemberModal y al confirmar el listado se refresca
```

**Edge Case**
```gherkin
CRITERIO-5.3: sin pendientes
  Dado que:  no hay state_id = 2
  Cuando:    pulso Miembros
  Entonces:  el panel muestra un estado vacío y el badge es 0
```

### Reglas de Negocio
1. Solo `admin` consulta `/api/dashboard/admin` y descarga los Excel.
2. El dashboard de miembro y operaciones no cambia.
3. No se implementa envío de correos masivos.
4. El motor de cobertura es el de SPEC-008: `MONTHLY_FEE = 10`, `YEARLY_FEE = 120`, `GRACE_DAYS = 5`. Solo `payments` de membresía `approved` mueven cobertura. Esta spec **lee** `member_subscriptions`; no recalcula.
5. Agrupado de pagos para la gráfica: Al día = `al_dia` + `gracia`; Pendiente = `vencida` + `sin_historial`. Igual que el filtro de votantes.
6. `payments.total` está en centavos VARCHAR. Convertir con `dollars_from_cents`. `course_payments.amount` se interpreta como dólares si trae punto, o centavos si es entero sin punto (misma precaución que el legado).
7. `date_register` de `payments` y `profiles` es VARCHAR `DD/MM/YYYY`. Agrupar con `to_date` solo cuando el valor coincide con el patrón.
8. Las cards de técnicos/médicos y la demografía usan el padrón **habilitado** (`state_id = 1`), salvo la card de inactivos.
9. Clasificación médico: regex case-insensitive sobre `title_academic` y `fourth_title` con `médic|medic|doctor|medicina`. El resto con al menos un título no vacío es técnico.
10. Variación “desde el mes pasado” compara cuántos de ese universo tienen `profiles.date_register` en el mes actual vs el mes anterior.
11. Cada descarga incluye identidad: nombres, apellidos, cédula (`identifier`), correo de contacto (`profiles.email`).
12. El botón Actualizar vuelve a pedir el snapshot. No hay polling automático.
13. Soft-deleted (`profiles.deleted_at`) nunca aparecen en conteos ni Excel.
14. No se crean tablas nuevas.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Profile` / `User` | `profiles`, `users`, `roles`, `model_has_roles` | solo lectura | Padrón, demografía, pendientes |
| `MemberSubscription` | `member_subscriptions` | solo lectura | Cobertura para Al día / Pendiente |
| `Payment` | `payments` | solo lectura | Ingresos membresía/curso/reservaciones |
| `CoursePayment` | `course_payments` | solo lectura | Ingresos de cursos del módulo de capacitación |
| `AdminDashboardSnapshot` | cálculo | nuevo (no persistido) | Agregados del dashboard |

#### Campos del snapshot (dominio)
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `active_members` | int | sí | Habilitados |
| `inactive_members` | int | sí | Deshabilitados + desafiliados |
| `technical_members` | int | sí | Habilitados técnicos |
| `medical_members` | int | sí | Habilitados médicos |
| `active_mom_percent` | decimal \| null | no | Variación mes vs mes anterior |
| `inactive_mom_percent` | decimal \| null | no | Variación mes vs mes anterior |
| `payments.al_dia` | int | sí | Habilitados al día o en gracia |
| `payments.pendiente` | int | sí | Habilitados vencidos o sin historial |
| `income.year` | int | sí | Año consultado |
| `income.available_years` | int[] | sí | Años con al menos un cobro |
| `income.months[]` | `{month, memberships, courses, reservations}` | sí | 12 meses en USD |
| `demographics.gender[]` | `{label, count}` | sí | Incluye Sin dato |
| `demographics.province[]` | `{label, count}` | sí | Orden desc |
| `demographics.city[]` | `{label, count}` | sí | Top + Sin dato |
| `demographics.age_range[]` | `{label, count}` | sí | 18-29, 30-39, 40-49, 50-59, 60+, Sin dato |
| `demographics.blood_type[]` | `{label, count}` | sí | |
| `demographics.profile_type[]` | `{label, count}` | sí | miembro / fundador / directivo / Sin dato |
| `titles.third_level` | int | sí | `title_academic` no vacío |
| `titles.fourth_level` | int | sí | `fourth_title` no vacío |
| `titles.both` | int | sí | Ambos no vacíos |
| `titles.none` | int | sí | Ambos vacíos |
| `titles.top_third[]` | `{label, count}` | sí | Top 10 títulos de tercer nivel |
| `titles.top_fourth[]` | `{label, count}` | sí | Top 10 de cuarto nivel |
| `pending_approvals[]` | `{user_id, names, lastname, identifier, email, date_register}` | sí | `state_id = 2` |

#### Índices / Constraints
- Reutilizar `idx_member_subscriptions_coverage`, `idx_payments_type`, `idx_payments_status`, `idx_payments_user_id`.
- No crear índices nuevos en esta entrega.

### API Endpoints

Auth Bearer + acceso `admin` en todos.

#### GET /api/dashboard/admin
- **Descripción**: Snapshot de cards, pagos, ingresos del año, demografía, títulos y pendientes
- **Query**: `year` (int, default año actual)
- **Response 200**:
  ```json
  {
    "cards": {
      "active": 215,
      "inactive": 111,
      "technical": 175,
      "medical": 40,
      "active_mom_percent": 12.5,
      "inactive_mom_percent": null
    },
    "payments": {
      "al_dia": 135,
      "pendiente": 80
    },
    "income": {
      "year": 2025,
      "available_years": [2023, 2024, 2025],
      "months": [
        { "month": 1, "memberships": "1200.00", "courses": "350.00", "reservations": "0.00" }
      ]
    },
    "demographics": {
      "gender": [{ "label": "Masculino", "count": 213 }],
      "province": [{ "label": "Pichincha", "count": 168 }],
      "city": [{ "label": "Quito", "count": 140 }],
      "age_range": [{ "label": "30-39", "count": 80 }],
      "blood_type": [{ "label": "O+", "count": 90 }],
      "profile_type": [{ "label": "miembro", "count": 200 }]
    },
    "titles": {
      "third_level": 190,
      "fourth_level": 40,
      "both": 35,
      "none": 20,
      "top_third": [{ "label": "Ingeniero en SST", "count": 40 }],
      "top_fourth": [{ "label": "Magíster en SST", "count": 12 }]
    },
    "pending_approvals": [
      {
        "user_id": 652,
        "names": "Luis",
        "lastname": "Mora",
        "identifier": "1101",
        "email": "luis@test.com",
        "date_register": "20/09/2026"
      }
    ]
  }
  ```
- **Response 401 / 403**

#### GET /api/dashboard/admin/exports/{export_key}
- **Descripción**: Descarga Excel (CSV UTF-8 BOM) del bloque indicado
- **Query**: `year` solo para `income`
- **`export_key`**:
  | key | Filas | Columnas extra |
  |-----|-------|----------------|
  | `active` | habilitados | estado |
  | `inactive` | inactivos | estado |
  | `technical` | técnicos habilitados | titulo_tercer, titulo_cuarto |
  | `medical` | médicos habilitados | titulo_tercer, titulo_cuarto |
  | `payments` | habilitados | estado_pago, coverage_until |
  | `debtors` | habilitados pendientes | estado_pago, coverage_until |
  | `income` | cobros del año | tipo, monto, fecha, mes |
  | `gender` | habilitados | genero |
  | `province` | habilitados | provincia |
  | `city` | habilitados | ciudad |
  | `age` | habilitados | edad, rango |
  | `blood_type` | habilitados | tipo_sangre |
  | `profile_type` | habilitados | tipo_perfil |
  | `titles` | habilitados | titulo_tercer, titulo_cuarto, grupo |
- **Response 200**: `text/csv; charset=utf-8` con `Content-Disposition` attachment
- **Response 400**: `export_key` inválido
- **Response 401 / 403**

Columnas fijas de identidad en todos los exports de personas: `nombres,apellidos,cedula,correo`.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `AdminDashboardPage` | `modules/dashboard/presentation/pages/admin-dashboard-page.tsx` | — | Layout del dashboard admin |
| `DashboardKpiCard` | `modules/dashboard/presentation/components/dashboard-kpi-card.tsx` | `title, value, hint, onDownload` | Card con icono de descarga |
| `PaymentStatusChart` | `modules/dashboard/presentation/components/payment-status-chart.tsx` | `alDia, pendiente, onDownload, onDownloadDebtors` | Barras Al día / Pendiente |
| `IncomeYearChart` | `modules/dashboard/presentation/components/income-year-chart.tsx` | `year, years, months, onYearChange, onDownload` | Líneas mensuales por categoría |
| `DemographicsPanel` | `modules/dashboard/presentation/components/demographics-panel.tsx` | `demographics, onDownload` | Tabs género/provincia/ciudad/edad/sangre/tipo |
| `AcademicTitlesChart` | `modules/dashboard/presentation/components/academic-titles-chart.tsx` | `titles, onDownload` | Tercer vs cuarto nivel + top |
| `PendingMembersModal` | `modules/dashboard/presentation/modals/pending-members-modal.tsx` | `items, onApprove, onClose` | Listado state_id=2 |
| `DashboardBarChart` | `modules/dashboard/presentation/components/dashboard-bar-chart.tsx` | `items, colors` | Barras SVG reutilizables (mismo enfoque que feedback-charts, sin librería) |
| `DashboardLineChart` | `modules/dashboard/presentation/components/dashboard-line-chart.tsx` | `series` | Líneas/área SVG |

#### Páginas nuevas / modificadas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| `DashboardPage` | `modules/dashboard/presentation/pages/dashboard-page.tsx` | `/dashboard` | sí — si admin renderiza `AdminDashboardPage`; si no, el dashboard actual |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useAdminDashboard` | `modules/dashboard/presentation/hooks/use-admin-dashboard.ts` | snapshot, year, loading, error, reload, download | Carga y descargas |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `getAdminDashboard(token, year)` | `modules/dashboard/infrastructure/dashboard-api.ts` | `GET /api/dashboard/admin` |
| `downloadDashboardExport(token, key, year?)` | idem | `GET /api/dashboard/admin/exports/{key}` |

### Arquitectura y Dependencias
- Paquetes nuevos: ninguno. Gráficas en SVG como `feedback-charts.tsx`. Excel = CSV con BOM.
- Módulo backend hexagonal `app/modules/dashboard/` (domain, application, infrastructure, presentation).
- Reutilizar `dollars_from_cents`, `subscription_status_label`, `GRACE_DAYS` de `payments.domain.subscription`.
- Reutilizar `ApproveMemberModal` y `PENDING_ENABLE_STATE_ID` del módulo members.
- Registrar router en `backend/app/main.py`.
- El dashboard miembro (`ProfileSummary` + stat cards) se mantiene para no-admin.
- Estilos en `frontend/src/app/globals.css` con prefijo `.admin-dashboard-*`, alineados a las capturas: cards blancas, botones negros de acción, barras verde/rojo de pagos, líneas de ingresos, tabs Género/Provincia/etc.

### Notas de Implementación
> No inventar un segundo motor de mora. Importar `subscription_status_label` y agrupar `al_dia`+`gracia` vs el resto.
>
> Parsear `birtday` (`DD/MM/YYYY`) para edad; valores que no matcheen van a "Sin dato".
>
> `type_profile` puede ser CSV (`miembro,directivo`). En demografía, un usuario con varios tipos incrementa cada tipo.
>
> Ingresos de cursos: unir `payments` tipo curso approved **y** `course_payments` con estado pagado. Si el mismo concepto existiera en ambas tablas, no hay cruce 1:1 hoy; se suman por separado (no hay `payment_id` compartido).
>
> `course_payments.amount`: si el string contiene `.` tratarlo como dólares; si no, como centavos.
>
> El botón **Enviar correos masivos** de las capturas no se dibuja.
>
> El botón **Miembros** no navega a `/admin/miembros`; abre el modal de pendientes. Se puede incluir un enlace secundario “Ver padrón completo”.
>
> Variación mensual: contar profiles del universo (activos o inactivos) cuyo `date_register` cae en el mes calendario actual vs el anterior. No es “cuántos estaban activos el mes pasado”, porque no hay histórico de estado.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] Crear módulo hexagonal `dashboard` (domain, application, ports, repository, schemas, router)
- [x] Implementar snapshot: cards, pagos SPEC-008, ingresos, demografía, títulos, pendientes
- [x] Implementar `GET /api/dashboard/admin`
- [x] Implementar `GET /api/dashboard/admin/exports/{export_key}` (CSV UTF-8 BOM)
- [x] Registrar router en `main.py`
- [x] Reutilizar `subscription_status_label` y conversión de centavos; no recalcular cobertura

#### Tests Backend
- [x] `test_dashboard_forbidden_for_member`
- [x] `test_payment_status_groups_grace_as_al_dia`
- [x] `test_sin_historial_counts_as_pendiente`
- [x] `test_medical_keyword_classifies_as_medico`
- [x] `test_export_payments_includes_identity_columns`

### Frontend

#### Implementación
- [x] `dashboard-api.ts` + tipos de dominio del snapshot
- [x] `useAdminDashboard` con year, reload y descargas
- [x] Cards KPI, gráfica de pagos, ingresos, demografía con tabs, gráfica de títulos
- [x] Modal de pendientes de aprobación reutilizando `ApproveMemberModal`
- [x] `DashboardPage` muestra panel admin solo si `access_level === "admin"`
- [x] Estilos `.admin-dashboard-*` según capturas (sin botón de correos masivos)
- [x] Botón Actualizar recarga el snapshot

#### Tests Frontend
- [x] Verificar lint/build disponible
- [x] Admin ve cards y gráficas; miembro sigue viendo el dashboard simple

### QA
- [x] Cubrir criterios CRITERIO-1.1 a 5.3
- [x] Verificar que Al día incluye gracia de 5 días
- [x] Verificar Excel de cada bloque abre con nombres, cédulas y correos
- [x] Verificar que no aparece el botón de correos masivos
- [x] Verificar que aprobar desde el modal refresca el badge
- [x] Actualizar estado spec: `status: IMPLEMENTED`
