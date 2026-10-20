---
id: SPEC-024
status: IMPLEMENTED
feature: calcular-sst-miembros
created: 2026-10-19
updated: 2026-10-19
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-008", "SPEC-015"]
---

# Spec: Calcular SST para miembros al día

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Integrar en el portal de miembros el cotizador local **COPSSTEC Cotiza SST** mediante la ruta `/mi-espacio/calcular-sst`, disponible exclusivamente para miembros habilitados cuyo saldo pendiente de membresía sea exactamente `0.00`. La migración conservará las seis etapas, catálogo CIIU, reglas normativas, fórmulas económicas, firma, QR, huella SHA-256, propuesta imprimible y CSV del mini-repositorio, pero adoptará los colores, tipografía, navegación y componentes visuales de `copsstec-system`.

### Requerimiento de Negocio
Migrar todo el contenido funcional del mini-repositorio `/Users/gabrieltates/Downloads/COPSSTEC_Cotiza_SST_Local_Sin_Autenticacion` al sistema `/Users/gabrieltates/Desktop/copsstec-system`. Los miembros que estén al día con sus pagos, es decir, que tengan `pending_balance = 0.00`, deben ver y poder utilizar un módulo llamado **Calcular SST** dentro del portal de miembros. El módulo debe funcionar exactamente como el cotizador local en sus seis etapas y resultados, respetando el estilo visual general del sistema COPSSTEC. No se migrarán las capacidades PWA, offline ni persistencia de cotizaciones.

### Historias de Usuario

#### HU-01: Consultar elegibilidad del miembro

```
Como:        Miembro autenticado y habilitado
Quiero:      Que el sistema valide mi saldo vigente antes de mostrar o abrir Calcular SST
Para:        Acceder al beneficio únicamente cuando esté al día con la membresía

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-002, SPEC-008
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: miembro habilitado sin saldo pendiente
  Dado que:  tengo rol miembro, state_id = 1 y el cálculo canónico de pagos devuelve pending_balance = 0.00
  Cuando:    el portal consulta GET /api/sst-calculator/access
  Entonces:  la API responde 200 con allowed = true, balance_status = "al_dia", pending_balance = "0.00" y reason = null
```

**Error Path**
```gherkin
CRITERIO-1.2: miembro con deuda
  Dado que:  tengo rol miembro y el cálculo canónico devuelve pending_balance mayor que 0.00
  Cuando:    el portal consulta GET /api/sst-calculator/access
  Entonces:  la API responde 200 con allowed = false, balance_status = "saldo_pendiente", el saldo con dos decimales y una razón que dirige a Mis pagos
```

**Error Path**
```gherkin
CRITERIO-1.3: sesión ausente o inválida
  Dado que:  no envío un token válido
  Cuando:    consulto GET /api/sst-calculator/access o GET /api/sst-calculator/catalog
  Entonces:  la API responde 401 con el contrato de autenticación vigente
```

**Edge Case**
```gherkin
CRITERIO-1.4: usuario no elegible por rol o estado
  Dado que:  estoy autenticado pero mi access_level no es exactamente member, no tengo el rol miembro o mi state_id no es 1
  Cuando:    consulto GET /api/sst-calculator/access
  Entonces:  la API responde 200 con allowed = false, pending_balance = "0.00" y una razón de acceso no habilitado, sin conceder acceso implícito a administradores
```

**Edge Case**
```gherkin
CRITERIO-1.5: miembro legado sin historial
  Dado que:  tengo rol miembro, state_id = 1 y no existe fecha de inscripción o historial suficiente para generar deuda
  Cuando:    el módulo de pagos calcula mi saldo según sus reglas canónicas
  Entonces:  el saldo se considera 0.00 y puedo acceder aunque el estado de suscripción sea sin_historial
```

#### HU-02: Navegar al módulo solo cuando corresponde

```
Como:        Miembro autenticado
Quiero:      Ver Calcular SST en la navegación solamente si estoy al día
Para:        Tener una experiencia coherente con mi elegibilidad actual

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: enlace visible para miembro elegible
  Dado que:  el shell del portal cargó la sesión y GET /api/sst-calculator/access devolvió allowed = true
  Cuando:    se construye el menú lateral
  Entonces:  se agrega el ítem "Calcular SST" con ruta /mi-espacio/calcular-sst y un icono de calculadora
```

**Error Path**
```gherkin
CRITERIO-2.2: enlace oculto para miembro no elegible
  Dado que:  la validación devuelve allowed = false o no puede completarse
  Cuando:    se muestra el menú del portal
  Entonces:  no aparece el ítem Calcular SST y no se asume acceso por un error de red
```

**Error Path**
```gherkin
CRITERIO-2.3: acceso directo bloqueado
  Dado que:  conozco la URL /mi-espacio/calcular-sst pero tengo saldo pendiente o dejé de ser elegible
  Cuando:    abro o recargo la ruta
  Entonces:  la página revalida el acceso, no carga el catálogo ni el cotizador y muestra un aviso con enlace a /mi-espacio/pagos
```

#### HU-03: Cotizar SST en seis etapas

```
Como:        Miembro elegible
Quiero:      Completar el mismo flujo guiado del cotizador local
Para:        Dimensionar y valorar una oferta externa de SST

Prioridad:   Alta
Estimación:  XL
Dependencias: HU-01, HU-02
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: empresa y actividad
  Dado que:  la API entregó el catálogo CIIU
  Cuando:    busco por código o descripción, selecciono una actividad, declaro trabajadores y centros completos
  Entonces:  la búsqueda ignora mayúsculas, minúsculas y tildes; muestra como máximo 35 coincidencias; conserva la selección hasta elegir otra; y exige que la suma de trabajadores de los centros coincida con el total
```

**Happy Path**
```gherkin
CRITERIO-3.2: exigencia normativa
  Dado que:  elegí una actividad con riesgo Bajo, Medio o Alto y declaré el número de trabajadores
  Cuando:    avanzo a la etapa 2
  Entonces:  veo responsable, dotación base, dedicación, modalidad del socio, horas mensuales y advertencias calculadas con las reglas del cotizador original
```

**Happy Path**
```gherkin
CRITERIO-3.3: equipo y costos laborales
  Dado que:  estoy en la etapa 3
  Cuando:    ingreso salarios, antigüedad, aporte patronal, fondo de reserva, SBU, vacaciones y capacidad mensual
  Entonces:  se calcula el equipo, costo por hora, remuneración asignada, décimos, vacaciones, aporte patronal, fondo de reserva y costo laboral total sin depender de React
```

**Happy Path**
```gherkin
CRITERIO-3.4: visitas, alcance y PROTEGE SST
  Dado que:  estoy en la etapa 4
  Cuando:    distribuyo visitas entre centros, activo o desactivo PROTEGE SST y selecciono actividades del alcance
  Entonces:  se respeta el mínimo de una visita por cada 8 horas para servicios no permanentes, se recalculan movilidad y planes PROTEGE, y puedo añadir actividades libres una por línea
```

**Happy Path**
```gherkin
CRITERIO-3.5: negociación y resultado
  Dado que:  completé costos y alcance
  Cuando:    elijo 12 o 24 meses, margen objetivo, descuento, margen mínimo e incremento de segundo año
  Entonces:  veo tarifa referencial, tarifa negociada, margen del primer año, descuento máximo, costo, ingreso, utilidad y margen proyectados del contrato
```

**Error Path**
```gherkin
CRITERIO-3.6: validaciones antes de avanzar
  Dado que:  falta actividad, trabajadores, centros válidos, visitas mínimas, salarios requeridos o SBU
  Cuando:    intento avanzar desde la etapa correspondiente
  Entonces:  permanezco en la etapa, recibo un mensaje claro y el campo o bloque inválido queda identificado
```

**Edge Case**
```gherkin
CRITERIO-3.7: empresa con 100 o más trabajadores
  Dado que:  el cliente tiene al menos 100 trabajadores
  Cuando:    se dimensiona el servicio
  Entonces:  el personal es permanente, las visitas mensuales quedan deshabilitadas en cero, las horas asignadas usan la capacidad mensual y la movilidad usa 50 % del costo base por cada centro
```

#### HU-04: Generar y exportar la propuesta

```
Como:        Miembro elegible que completó la cotización
Quiero:      Firmar, previsualizar, imprimir y exportar el resultado
Para:        Entregar una propuesta técnica y económica identificable al cliente

Prioridad:   Alta
Estimación:  L
Dependencias: HU-03
Capa:        Frontend
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: firma táctil o cargada
  Dado que:  completé los datos de emisión
  Cuando:    dibujo con puntero/táctil en el canvas o cargo una imagen PNG, JPEG o WebP menor o igual a 1.5 MB
  Entonces:  la firma permanece solo en memoria durante la cotización y puede borrarse o reemplazarse antes de generar la propuesta
```

**Happy Path**
```gherkin
CRITERIO-4.2: propuesta firmada con QR y huella
  Dado que:  informé nombre y cargo del firmante y existe una firma
  Cuando:    selecciono "Ver propuesta firmada"
  Entonces:  se genera localmente la vista A4 con datos del cliente, CIIU, cobertura, centros, alcance, valores, condiciones, beneficios, firma, QR informativo y huella SHA-256 del contenido relevante
```

**Happy Path**
```gherkin
CRITERIO-4.3: imprimir o guardar PDF
  Dado que:  la vista previa está abierta
  Cuando:    pulso "Guardar PDF / Imprimir"
  Entonces:  se abre el diálogo nativo mediante window.print y los estilos de impresión muestran solo la propuesta A4 sin shell, botones ni avisos internos
```

**Happy Path**
```gherkin
CRITERIO-4.4: exportar resumen CSV
  Dado que:  existe una cotización calculada
  Cuando:    selecciono "Exportar resumen CSV"
  Entonces:  descargo Cotizacion_COPSSTEC_SST.csv en UTF-8 con BOM, separador punto y coma y valores escapados, incluyendo cliente, CIIU, centros, personal, costos, tarifa, márgenes y alcance
```

**Error Path**
```gherkin
CRITERIO-4.5: propuesta incompleta
  Dado que:  falta firmante, cargo, firma, empresa, actividad, centros válidos o tarifa personalizada PROTEGE obligatoria
  Cuando:    intento abrir la propuesta
  Entonces:  la generación se bloquea y muestra la validación correspondiente sin perder los datos de la sesión
```

**Edge Case**
```gherkin
CRITERIO-4.6: margen inferior al mínimo
  Dado que:  el margen total calculado es menor que el margen mínimo configurado
  Cuando:    abro la propuesta
  Entonces:  puedo revisarla, pero veo una advertencia interna que no se imprime en el PDF
```

### Reglas de Negocio
1. El acceso requiere simultáneamente sesión válida, rol `miembro`, `access_level = member`, `state_id = 1` y `pending_balance = Decimal("0.00")`; el rol `admin` no hereda este beneficio.
2. `pending_balance` se recalcula en cada consulta mediante el motor canónico del módulo `payments`: fecha de inscripción, renovaciones de membresía aprobadas y `pending_membership_balance`. No se consulta `member_subscriptions.pending_balance` como fuente autoritativa ni se duplican fórmulas en `sst_calculator`.
3. La ausencia de fecha/historial que el módulo de pagos trata como miembro legado produce saldo `0.00`; `sin_historial` no bloquea por sí solo.
4. `GET /access` es informativo y devuelve `200` para todo usuario autenticado; `GET /catalog` aplica nuevamente la regla completa y devuelve `403` si el usuario dejó de ser elegible.
5. El catálogo migrado es el `ciiu.json` original: 1.738 elementos con `code`, `description` y `risk` (`Bajo`, `Medio`, `Alto`). La búsqueda se normaliza con Unicode NFD, elimina diacríticos, compara en minúsculas y limita la lista a 35 resultados; sin texto muestra los primeros 20.
6. Dimensionamiento original: `<10` trabajadores = 8 h/mes para riesgo Bajo/Medio y 16 h/mes para Alto; `10–49` = 16/32/48 h según riesgo Bajo/Medio/Alto; `50–99` = 32/48/64 h; `100–199` = un técnico permanente; `>=200` = `1 + floor(trabajadores / divisor)`, con divisor 100 para Alto y 200 para Bajo/Medio.
7. Hay monitor interno únicamente con menos de 50 trabajadores y riesgo distinto de Alto; la asesoría externa no sustituye su designación. Para los demás casos se presenta técnico externo.
8. En servicios por horas, las horas asignadas son `max(1, service_hours)` y las visitas mínimas son `max(1, ceil(service_hours / 8))`. En servicio permanente, las horas asignadas son `max(1, capacity)`, no se programan visitas y la movilidad es `max(1, centers) × visit_cost × 0.5`.
9. Cada centro exige nombre, ubicación y trabajadores enteros mayores o iguales a cero; la cantidad de fichas debe coincidir con `centers` y la suma debe ser exactamente `workers`. El máximo de centros que renderiza el cotizador es 150.
10. Equipo: con más de un técnico se presupuesta un líder senior y el resto junior; con uno, un técnico junior. La proporción laboral es `1` para permanentes o `min(1, assigned_hours / capacity)` para servicios por horas.
11. Costo laboral completo mensual: salario total + aporte patronal (`salary × iess%`) + décimo tercero (`salary / 12`) + décimo cuarto (`SBU / 12 × técnicos`) + vacaciones (`salary × vacation%`) + fondo de reserva. Cada componente se multiplica por la proporción asignada.
12. El fondo de reserva se activa en el mes contractual `m` cuando `seniority + m > 12` y equivale a `salary × reserve%`; se aplica la misma antigüedad a todo el equipo, igual que en el original.
13. PROTEGE SST es opcional. Tarifas mensuales/configuración: 1–49 = 100/200; 50–99 = 200/400; 100–199 = 250/500; 200–499 = 300/600; 500–699 = 500/1000; 700–999 = 800/1600; 1000–4000 = `1000 + (workers - 1000) × 0.5` / 2000; más de 4000 requiere valores manuales no negativos y mensual mayor que cero.
14. Costo mensual por mes: `(labor_total + mobility + protege_monthly + other + coordination + labor_total × admin%) × growth`; `growth = 1` durante los primeros 12 meses y `1 + increase%` desde el mes 13.
15. Precio mensual de referencia = `first_month_cost / (1 - min(margin, 89.99)%)`; tarifa negociada = precio de referencia × `(1 - discount%)`; margen real primer año = `(tarifa negociada - costo mes 1) / tarifa negociada × 100`.
16. La configuración PROTEGE es un pago único sin prorrateo: ingreso total = `tarifa negociada × meses + setup`; costo total = suma de costos mensuales + `setup`; utilidad = ingreso − costo; margen total = utilidad / ingreso × 100.
17. La viabilidad visual exige tanto margen real del primer año como margen total mayores o iguales al margen mínimo. Un margen inferior advierte, pero no impide previsualizar o imprimir.
18. Logo del emisor y firma cargada aceptan únicamente PNG, JPEG o WebP de hasta 1.5 MB. Firma, logo, formulario y cotización existen solo en memoria del navegador y se descartan al recargar o iniciar una nueva cotización.
19. El QR se genera en el navegador, sin servicios externos, y contiene referencia, cliente, firmante, fecha, tarifa, implementación y plazo. La huella usa Web Crypto SHA-256 sobre los datos de propuesta; ambos son informativos y no equivalen a firma electrónica certificada.
20. No se crea historial, tabla, migración, autosave, localStorage, sessionStorage, cookie funcional, service worker, manifiesto PWA ni modo offline. El módulo requiere conexión para revalidar elegibilidad y obtener el catálogo.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `MembershipBalanceSnapshot` | Memoria / módulo `payments` | nueva interfaz pública de lectura | Expone el saldo canónico actual y su estado sin persistir datos nuevos |
| `SstCalculatorAccess` | Memoria / módulo `sst_calculator` | nueva | Resultado de elegibilidad para un usuario autenticado |
| `CiiuActivity` | Archivo JSON versionado | nueva | Actividad económica tomada del catálogo original de 1.738 registros |
| Cotización SST | Estado React en memoria | nueva, no persistida | Datos temporales de las seis etapas, firma, logo y propuesta |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `MembershipBalanceSnapshot.pending_balance` | `Decimal` | sí | cuantizado a dos decimales, nunca negativo | Saldo calculado por `payments` |
| `MembershipBalanceSnapshot.balance_status` | `str` | sí | `al_dia` o `saldo_pendiente` | Estado derivado mediante `balance_status_from_pending` |
| `SstCalculatorAccess.allowed` | `bool` | sí | regla de rol, estado y saldo | Permite o bloquea el módulo |
| `SstCalculatorAccess.reason` | `str \| None` | sí | `None` cuando allowed | Mensaje seguro para la interfaz |
| `CiiuActivity.code` | `str` | sí | valor original | Código CIIU |
| `CiiuActivity.description` | `str` | sí | puede venir vacío en el origen | Descripción original |
| `CiiuActivity.risk` | `str` | sí | `Bajo`, `Medio` o `Alto` | Nivel de riesgo |

#### Índices / Constraints
- No se agregan tablas, índices, constraints ni migraciones Alembic.
- El catálogo se conserva como recurso de solo lectura dentro del módulo backend; se valida al cargar y puede mantenerse cacheado en memoria del proceso porque no contiene datos de usuario.
- La cotización no se envía al backend ni se almacena en el navegador.

### API Endpoints

#### GET /api/sst-calculator/access
- **Descripción**: Recalcula el saldo de membresía y devuelve la elegibilidad actual del usuario para Calcular SST.
- **Auth requerida**: sí, mediante `get_current_user`; no usar `require_access("member")` porque el endpoint debe responder `allowed = false` a otros usuarios autenticados sin herencia de admin.
- **Request Body**: ninguno.
- **Response 200 — elegible**:
  ```json
  {
    "allowed": true,
    "balance_status": "al_dia",
    "pending_balance": "0.00",
    "reason": null
  }
  ```
- **Response 200 — saldo pendiente**:
  ```json
  {
    "allowed": false,
    "balance_status": "saldo_pendiente",
    "pending_balance": "20.00",
    "reason": "Debes estar al día con tus pagos para usar Calcular SST."
  }
  ```
- **Response 200 — rol/estado no elegible**: `allowed = false`, `balance_status = "al_dia"`, `pending_balance = "0.00"` y razón de rol o portal no habilitado; no consultar pagos cuando primero falla rol/estado.
- **Response 401**: token ausente, inválido o usuario no autenticable.

#### GET /api/sst-calculator/catalog
- **Descripción**: Entrega el catálogo CIIU completo solo después de recalcular elegibilidad con la misma política de `/access`.
- **Auth requerida**: sí.
- **Request Body**: ninguno.
- **Response 200**:
  ```json
  [
    {
      "code": "A0111.11",
      "description": "Cultivo de trigo.",
      "risk": "Bajo"
    }
  ]
  ```
- **Response 401**: token ausente o inválido.
- **Response 403**: rol distinto, portal no habilitado, saldo mayor a cero o elegibilidad perdida entre la carga del shell y la apertura del módulo. Mensaje: `No tienes acceso a Calcular SST. Verifica tu estado de membresía y pagos.`
- **Response 500**: catálogo ausente o inválido; registrar el error técnico y responder un detalle genérico sin exponer rutas locales.

### Diseño Backend

#### Módulo `sst_calculator`
| Pieza | Ubicación | Responsabilidad |
|-------|-----------|-----------------|
| `SstCalculatorAccess` / excepciones | `domain/` | Representar elegibilidad sin FastAPI, SQLAlchemy ni Pydantic |
| `MembershipBalanceReader` | `application/ports.py` | Puerto que devuelve saldo/estado canónico para un `user_id` |
| `CiiuCatalogReader` | `application/ports.py` | Puerto de lectura del catálogo |
| `GetSstCalculatorAccessUseCase` | `application/use_cases.py` | Aplicar rol exacto, access level, estado habilitado y saldo cero |
| `GetAuthorizedCiiuCatalogUseCase` | `application/use_cases.py` | Reutilizar la validación y denegar el catálogo si cambia la elegibilidad |
| `PaymentsMembershipBalanceAdapter` | `infrastructure/` | Adaptar exclusivamente la API pública de `payments` al puerto del nuevo módulo |
| `JsonCiiuCatalogAdapter` | `infrastructure/` | Leer/validar `ciiu.json` migrado del mini-repo |
| router, schemas y dependencies | `presentation/api/` | Exponer `/api/sst-calculator`, mapear DTO y errores HTTP |

#### API pública del módulo `payments`
- Añadir un contrato público estable en `app/modules/payments/public.py`, sin acceso del consumidor a repositorios o modelos SQLAlchemy.
- Exponer `MembershipBalanceSnapshot` y `GetMembershipBalanceUseCase`, que reutilizan `get_agreement_member_context`, `list_approved_membership_payments`, `pending_membership_balance` y `balance_status_from_pending`.
- Cuando `enrolled_on` sea `None`, retornar `0.00 / al_dia`, preservando la regla vigente para miembros legados.
- El wiring del composition root puede construir la implementación con `SqlAlchemyPaymentsRepository`; `sst_calculator` solo importa desde `payments.public` a través de su adapter.
- Registrar el nuevo router en `backend/app/main.py`. No modificar esquemas ni ejecutar Alembic.

### Diseño Frontend

#### Tipos y funciones de dominio
| Elemento | Archivo lógico | Descripción |
|----------|----------------|-------------|
| `SstCalculatorAccessResponse`, `CiiuActivity`, `RiskLevel` | `modules/sst-calculator/domain/types.ts` | Contratos API y tipos del catálogo |
| `SstQuoteInput`, `WorkCenter`, `NormativeResult`, `LaborCost`, `QuoteResult` | `modules/sst-calculator/domain/types.ts` | Estado tipado de las seis etapas y resultados |
| reglas normativas y de visitas | `modules/sst-calculator/domain/calculations.ts` | Funciones puras para dotación, horas, visitas y movilidad |
| costos laborales y financieros | `modules/sst-calculator/domain/calculations.ts` | Funciones puras para nómina, PROTEGE, proyección 12/24 meses, márgenes y descuento máximo |
| normalización/búsqueda CIIU y CSV | `modules/sst-calculator/domain/export.ts` | Transformaciones puras sin React ni acceso directo al DOM |

#### Componentes nuevos
| Componente | Archivo lógico | Props principales | Descripción |
|------------|----------------|------------------|-------------|
| `SstCalculatorPage` | `presentation/pages/sst-calculator-page.tsx` | ninguna | Orquesta acceso, catálogo, estado temporal y las seis etapas |
| `SstAccessGate` | `presentation/components/sst-access-gate.tsx` | `access, loading, error, children` | Carga, acceso denegado y enlace a pagos |
| `SstCalculatorWizard` | `presentation/components/sst-calculator-wizard.tsx` | `catalog` | Contenedor del progreso, navegación y validaciones |
| `CompanyActivityStep` | `presentation/steps/` | estado de empresa, CIIU y centros | Etapa 1 |
| `NormativeRequirementStep` | `presentation/steps/` | entrada y resultado normativo | Etapa 2 |
| `TechnicalTeamStep` | `presentation/steps/` | salarios y parámetros laborales | Etapa 3 |
| `VisitsServicesStep` | `presentation/steps/` | visitas, PROTEGE y alcance | Etapa 4 |
| `NegotiationStep` | `presentation/steps/` | plazo, márgenes, descuento e incremento | Etapa 5 |
| `ResultProposalStep` | `presentation/steps/` | resultado, emisor, firma y exportaciones | Etapa 6 |
| `SignaturePad` | `presentation/components/signature-pad.tsx` | `onChange, onClear` | Canvas responsive con Pointer Events |
| `ProposalPreview` | `presentation/components/proposal-preview.tsx` | cotización calculada, firma y logo | Documento A4 y controles de impresión |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| `CalcularSstPage` | `app/(protected)/mi-espacio/calcular-sst/page.tsx` | `/mi-espacio/calcular-sst` | sí, sesión + elegibilidad SST |

#### Hooks y State
| Hook | Archivo lógico | Retorna | Descripción |
|------|----------------|---------|-------------|
| `useSstCalculatorAccess` | `presentation/hooks/` | `{ access, loading, error, refresh }` | Consulta elegibilidad sin asumir acceso ante errores |
| `useSstCalculator` | `presentation/hooks/` | `{ quote, step, result, actions, validation }` | Estado en memoria, navegación y recálculo del wizard |
| `useSignaturePad` | integrado en componente o `presentation/hooks/` | dibujo y limpieza | Gestiona pointer capture y exportación PNG local |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `getSstCalculatorAccess()` | `infrastructure/sst-calculator-api.ts` | `GET /api/sst-calculator/access` mediante `authorizedFetch` |
| `getCiiuCatalog()` | `infrastructure/sst-calculator-api.ts` | `GET /api/sst-calculator/catalog` mediante `authorizedFetch` |

#### Navegación y experiencia visual
- `DashboardShell` consulta elegibilidad después de cargar sesión/política y agrega de forma inmutable `{ label: "Calcular SST", href: "/mi-espacio/calcular-sst" }` solo cuando `allowed` es verdadero; el resto de roles no realiza esta consulta.
- `navIconForHref` y `SidebarIcon` incorporan un icono de calculadora coherente con el set existente.
- La página App Router permanece mínima y exporta el módulo desde `modules/sst-calculator/index.ts`.
- Los estilos quedan encapsulados bajo una raíz como `.sst-calculator` o CSS Module. Reutilizan `--primary`, `--primary-dark`, `--success`, `--surface`, `--surface-soft`, `--line`, `--muted` y la tipografía global; no recrean encabezado, sidebar ni footer general.
- Conservar la jerarquía y usabilidad del original: indicador de 6 pasos, tarjetas, avisos, campos avanzados, botones Atrás/Siguiente, vista previa modal y documento A4; adaptar colores y espaciado al sistema actual.
- Responsive: una columna en móvil, objetivos táctiles, canvas ajustado visualmente sin perder su resolución interna y tablas desplazables o condensadas. Respetar `prefers-reduced-motion`.
- Impresión: regla `@media print` específica que oculte `.app-sidebar`, `.app-header`, controles y contenido no imprimible, quite límites del shell y emita la propuesta en tamaño A4 con saltos controlados.

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: `qrcode` como dependencia de frontend y `@types/qrcode` como dependencia de desarrollo para generar data URLs localmente, sin API externa.
- Para pruebas frontend, incorporar `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` y scripts/configuración mínimos, ya que el proyecto no posee actualmente infraestructura de tests frontend.
- Recursos migrados: `ciiu.json` al backend y `logo-protege.png` a `frontend/public/media/sst-calculator/`. Reutilizar `frontend/public/media/brand/logo-long.png` o el componente institucional existente en lugar de copiar `logo-copsstec.png`.
- No trasladar `manifest.webmanifest`, `sw.js`, el registro de service worker, `catalog.js` ni `qr-local.js`; sus capacidades quedan reemplazadas por el endpoint JSON y el paquete QR local.
- Servicios externos: ninguno. Firma, QR, hash, CSV e impresión se ejecutan en el navegador.
- Impacto en puntos de entrada: registrar el router FastAPI, exportar el módulo frontend, añadir la ruta App Router y enriquecer condicionalmente la navegación del shell.

### Notas de Implementación
> La fidelidad funcional se evalúa contra `app.js`, `index.html` y `ciiu.json` del mini-repositorio. No “simplificar” fórmulas, rangos, valores predeterminados, textos legales relevantes ni campos de la propuesta durante la conversión a React.

> La autorización no puede depender solo de ocultar el menú. La ruta valida `/access` y el catálogo vuelve a ejecutar la regla; una respuesta `403` durante el uso debe cerrar el cotizador y mostrar el estado de acceso denegado sin conservar datos más allá de la memoria actual.

> Separar cálculo de presentación: las funciones de dominio reciben objetos/valores y retornan resultados deterministas; no leen inputs, `document`, `window`, canvas ni estado React. El adaptador de impresión/exportación es responsable de Web APIs.

> La referencia de propuesta conserva el patrón `COPS-YYYYMMDD-<tarifa-en-centavos-redondeada>`. La huella incluye referencia, cliente, RUC, CIIU, riesgo, trabajadores, centros, precio, implementación, plazo, fecha, firmante, presencia de logo y contenido de firma, como el original.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] Crear la API pública de lectura de saldo en `payments.public` y su caso de uso con las funciones canónicas existentes.
- [x] Crear el módulo hexagonal `sst_calculator` con entidad de acceso, excepciones y puertos `MembershipBalanceReader` / `CiiuCatalogReader`.
- [x] Implementar `PaymentsMembershipBalanceAdapter` sin importar infraestructura interna de pagos desde Application o Domain.
- [x] Migrar y validar los 1.738 registros de `ciiu.json` mediante `JsonCiiuCatalogAdapter` de solo lectura.
- [x] Implementar `GetSstCalculatorAccessUseCase` y `GetAuthorizedCiiuCatalogUseCase` con rol miembro exacto, state 1 y saldo cero.
- [x] Implementar schemas, dependencias y router para `GET /api/sst-calculator/access` y `GET /api/sst-calculator/catalog`.
- [x] Registrar el router en `backend/app/main.py` sin migración de base de datos.

#### Tests Backend
- [x] `test_access_allows_enabled_member_with_zero_balance` — respuesta elegible exacta.
- [x] `test_access_allows_enabled_legacy_member_without_enrollment_history` — regla `sin_historial`/saldo cero.
- [x] `test_access_denies_member_with_pending_balance` — saldo y razón de pago.
- [x] `test_access_denies_disabled_or_onboarding_member` — `state_id != 1`.
- [x] `test_access_denies_admin_and_non_member_even_if_balance_is_zero` — sin herencia administrativa.
- [x] `test_access_returns_401_without_valid_session` — autenticación.
- [x] `test_catalog_returns_all_original_activities_for_eligible_member` — 1.738 elementos y riesgos válidos.
- [x] `test_catalog_returns_403_when_balance_is_pending` — protección del catálogo.
- [x] `test_catalog_revalidates_access_after_payment_state_changes` — no confiar en una validación previa.
- [x] `test_balance_reader_reflects_approve_update_and_delete_payment` — recálculo canónico tras mutaciones de pagos.
- [x] `test_invalid_or_missing_catalog_is_mapped_without_exposing_path` — fallo controlado.

### Frontend

#### Implementación
- [x] Crear tipos, valores iniciales y funciones puras del dominio para normativa, visitas, equipo, costos, PROTEGE y proyección financiera.
- [x] Crear `sst-calculator-api` y hooks de acceso/catálogo usando `authorizedFetch`.
- [x] Integrar el ítem condicional Calcular SST en el shell y su icono, ocultándolo ante denegación o error.
- [x] Crear la ruta mínima `/mi-espacio/calcular-sst`, export público del módulo y gate de revalidación con enlace a `/mi-espacio/pagos`.
- [x] Migrar la etapa 1: cliente, búsqueda CIIU normalizada, riesgo, trabajadores y hasta 150 centros con validación de suma.
- [x] Migrar la etapa 2: dimensionamiento normativo, modalidad externa/asesoría, horas y advertencias.
- [x] Migrar la etapa 3: equipo, salarios, antigüedad, aporte patronal, fondos, décimos, vacaciones y capacidad.
- [x] Migrar la etapa 4: visitas, distribución por centros, movilidad, PROTEGE, alcance base y actividades adicionales.
- [x] Migrar la etapa 5: 12/24 meses, margen objetivo, descuento, piso e incremento de segundo año.
- [x] Migrar la etapa 6: resumen, desglose, datos del emisor, carga de logo/firma, canvas táctil y nueva cotización.
- [x] Implementar propuesta A4 con recursos COPSSTEC, logo PROTEGE opcional, QR local, huella SHA-256, vista previa y `window.print`.
- [x] Implementar CSV UTF-8 BOM con separador `;` y el mismo conjunto de datos del original.
- [x] Añadir estilos encapsulados responsive y de impresión usando las variables visuales existentes.
- [x] Añadir `qrcode`/tipos, copiar solo `logo-protege.png` y excluir todos los artefactos PWA/offline.

#### Tests Frontend
- [x] `normalizeCiiuQuery ignores accents and case` y `searchCiiu limits results`.
- [x] `calculateNormativeRequirement covers 1/9/10/49/50/99/100/199/200 workers for Bajo Medio Alto`.
- [x] `calculateSuggestedVisits enforces one visit per eight hours only below 100 workers`.
- [x] `distributeVisits preserves total across work centers` y validación de suma de trabajadores.
- [x] `calculateLaborCost prorates hours and activates reserve after twelve months of seniority`.
- [x] `resolveProtegePlan covers every tariff boundary and custom values above 4000`.
- [x] `calculateQuote preserves setup as one-time cost and applies growth from month 13`.
- [x] `calculateQuote reports target, negotiated, actual, total margins and max discount`.
- [x] `SstAccessGate hides calculator and links payments when denied`.
- [x] `SstCalculatorWizard validates and navigates all six stages`.
- [x] `SignaturePad supports pointer drawing and clear` y rechaza archivos inválidos o mayores a 1.5 MB.
- [x] `ProposalPreview renders QR/hash content and invokes print` usando mocks de Web Crypto, canvas, QR y `window.print`.
- [x] `downloadCsv emits BOM semicolon escaped content and expected filename`.
- [x] `DashboardShell adds navigation only when access is allowed` y la oculta ante error.

### QA
- [ ] Ejecutar skill `/gherkin-case-generator` para todos los criterios CRITERIO-1.1 a CRITERIO-4.6.
- [ ] Ejecutar skill `/risk-identifier` con foco en autorización, exactitud financiera, impresión y archivos cargados.
- [ ] Comparar casos de referencia ejecutados en el mini-repo y React con las mismas entradas; resultados monetarios y normativos deben coincidir dentro del redondeo de presentación.
- [ ] Verificar manualmente búsqueda CIIU con y sin tildes, los seis pasos, centros múltiples, límites 49/50/99/100/199/200/4000/4001 y contratos 12/24 meses.
- [ ] Verificar firma con mouse y táctil, logo/firma inválidos, QR, SHA-256, CSV y propuesta impresa/guardada en PDF A4.
- [ ] Verificar visualmente escritorio y móvil dentro del shell, sin doble encabezado y con colores/tipografía COPSSTEC.
- [x] Confirmar que no existen service worker, manifiesto PWA, almacenamiento de cotizaciones ni tráfico a servicios QR externos.
- [x] Ejecutar `source .venv/bin/activate && cd backend && pytest`.
- [x] Ejecutar tests frontend y `npm run build` desde `frontend`.
- [x] Revisar cobertura de tests contra criterios de aceptación y reglas de negocio.
- [x] Actualizar estado spec: `status: IMPLEMENTED` solo después de completar implementación y QA.
