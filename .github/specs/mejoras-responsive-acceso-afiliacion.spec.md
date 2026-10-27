---
id: SPEC-026
status: IN_PROGRESS
feature: mejoras-responsive-acceso-afiliacion
created: 2026-10-27
updated: 2026-10-27
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-005", "SPEC-006", "SPEC-019"]
---

# Spec: Mejoras responsive y navegación del acceso de afiliación

> **Estado:** `IN_PROGRESS` (aprobada por el usuario el 2026-10-27).
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Mejorar la claridad y adaptación móvil de las acciones de afiliación en el login y de la pantalla de pago de afiliación. Permitir que el usuario vuelva al landing desde el acceso mediante el logo y un botón explícito.

### Requerimiento de Negocio
En la pantalla de acceso, los botones «¡Deseo afiliarme!» y «Ya me inscribí, continuar con la afiliación» deben verse como botones independientes para que sean reconocibles y funcionar bien en móvil. La pantalla de pago también debe verse correctamente en móvil. En login, al presionar el logo se debe volver al landing y debe existir un botón para regresar al landing.

### Historias de Usuario

#### HU-01: Acciones de afiliación claras y responsive

```
Como:        Visitante o aspirante a miembro
Quiero:      Identificar y usar por separado las acciones para iniciar o continuar mi afiliación
Para que:    Pueda elegir el flujo correcto desde el login, también desde un teléfono

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-005, SPEC-019
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: Acciones de afiliación diferenciadas
  Dado que:  el visitante está en la pantalla de login
  Cuando:    observa las opciones de afiliación
  Entonces:  «¡Deseo afiliarme!» y «Ya me inscribí, continuar con la afiliación» se muestran como controles independientes, con apariencia de botón y etiquetas legibles
```

**Error Path**
```gherkin
CRITERIO-1.2: Navegación de cada acción
  Dado que:  el visitante está en la pantalla de login
  Cuando:    activa una de las dos acciones
  Entonces:  la primera navega a /afiliacion y la segunda a /continuar-afiliacion, sin intercambiar sus destinos
```

**Edge Case** *(si aplica)*
```gherkin
CRITERIO-1.3: Acciones en viewport móvil
  Dado que:  el visitante usa un viewport móvil estrecho
  Cuando:    consulta las acciones de afiliación
  Entonces:  ambas se muestran completas, en disposición adaptable, sin desbordamiento horizontal y con área táctil suficiente
```

#### HU-02: Pago de afiliación usable en móvil

```
Como:        Aspirante que debe completar el pago de afiliación
Quiero:      Consultar los datos de transferencia y subir mi comprobante desde el móvil
Para que:    Pueda completar el paso de pago sin contenido cortado o desbordado

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-005
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: Contenido de pago adaptable
  Dado que:  el aspirante abre /afiliacion/pago en un teléfono
  Cuando:    carga la pantalla con los datos de pago
  Entonces:  el encabezado, datos de transferencia, QR, selector de comprobante, errores y botón de envío caben en el viewport y se pueden recorrer verticalmente
```

**Error Path**
```gherkin
CRITERIO-2.2: Archivo y acción sin recorte
  Dado que:  el aspirante visualiza el formulario de pago en un viewport estrecho
  Cuando:    selecciona un archivo o encuentra un error de validación
  Entonces:  el nombre del archivo y el mensaje se ajustan al ancho disponible y el botón de envío permanece visible y operable
```

### Reglas de Negocio
1. La acción para iniciar afiliación conserva como destino `/afiliacion`.
2. La acción para continuar una afiliación existente conserva como destino `/continuar-afiliacion`.
3. El logo del login y el botón de regreso llevan al landing público `/`.
4. Los cambios son de presentación y navegación; no modifican la autenticación, los estados de afiliación ni el contrato de pago.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| Ninguna | N/A | Ninguno | El alcance no introduce ni modifica datos persistidos. |

#### Campos del modelo
No aplica: no se modifican entidades ni contratos de datos.

#### Índices / Constraints
No aplica: no hay cambios de persistencia.

### API Endpoints
No aplica. El alcance reutiliza rutas de frontend existentes y no agrega endpoints HTTP.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| Ninguno previsto | N/A | N/A | Ajustar los componentes existentes para evitar duplicar la UI. |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Ninguna | N/A | N/A | Se actualizan login y pago de afiliación existentes. |

#### Hooks y State
No se requiere estado ni hooks nuevos.

#### Services (llamadas API)
No se requieren servicios nuevos; los flujos y llamadas existentes se conservan.

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: ninguno.
- Servicios externos: ninguno nuevo.
- Impacto en punto de entrada de la app: ninguno; se conservan las rutas actuales.

### Notas de Implementación
> Componentes existentes identificados: `frontend/src/modules/auth/presentation/pages/login-page.tsx`, `frontend/src/modules/membership/presentation/pages/membership-payment-page.tsx`, `frontend/src/shared/components/app-logo.tsx` y estilos en `frontend/src/app/globals.css`. El `AppLogo` actual renderiza una imagen sin enlace; envolverlo con navegación al landing únicamente en el contexto de login. Añadir el botón de regreso en la pantalla de login. Mantener el responsive con estilos mobile-first, sin modificar el flujo funcional de carga ni envío del comprobante.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [ ] No aplica: cambio de presentación frontend sin cambios de backend.

#### Tests Backend
- [ ] No aplica: no se modifican endpoints ni lógica backend.

### Frontend

#### Implementación
- [x] Presentar las dos acciones de afiliación como botones independientes y claramente reconocibles en login.
- [x] Adaptar las acciones y la tarjeta de login para viewport móvil, conservando destinos y accesibilidad.
- [x] Hacer que el logo en login navegue al landing `/` y agregar un control visible para regresar al landing.
- [x] Corregir el layout móvil de pago, incluidos QR/datos, selector de archivo, errores y botón de envío, para evitar recorte y overflow horizontal.

#### Tests Frontend
- [ ] Verificar navegación de ambas acciones y del logo/botón de regreso.
- [ ] Verificar visualmente login y pago en viewport móvil estrecho y escritorio.

### QA
- [ ] Revisar criterios CRITERIO-1.1 a 1.3 y CRITERIO-2.1 a 2.2.
- [ ] Confirmar ausencia de overflow horizontal y controles recortados en móvil.
- [ ] Actualizar estado spec: `status: IMPLEMENTED` tras aprobar y completar implementación.
