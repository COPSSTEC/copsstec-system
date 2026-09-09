---
id: SPEC-001
status: IMPLEMENTED
feature: agendamientos-estadisticas-salud
created: 2026-04-17
updated: 2026-04-17
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: Estadísticas de Agendamientos en Salud

> **Estado:** `DRAFT` → aprobar con `status: APPROVED` antes de iniciar implementación.
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Agregar un nuevo módulo visual dentro del dashboard de estadísticas de salud para analizar los agendamientos médicos ocupacionales. Debe reutilizar el diseño de las estadísticas de aptitud médica, incluir gráficas, desglose por tipo de atención, diagnósticos frecuentes y perfil demográfico de los empleados atendidos, con descarga en PDF.

### Requerimiento de Negocio
El usuario solicita una nueva sección en estadísticas de salud sobre estadísticas de agendamientos, replicando el diseño de aptitud médica laboral y la descarga PDF con gráficas. La estadística debe mostrar tipos de atenciones realizadas, diagnósticos más comunes, tipos de empleados atendidos, género y edades, tomando la información desde CitaControl y Empleado. Además, el grid principal debe pasar a formato 3x3.

### Historias de Usuario

#### HU-01: Visualizar estadísticas de agendamientos

```text
Como:        Usuario autenticado del módulo GSO
Quiero:      Ver un panel de estadísticas de agendamientos médicos dentro de morbilidad
Para:        Analizar la atención ocupacional realizada y tomar decisiones preventivas

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: apertura del modal con datos agregados
  Dado que:  el usuario está en estadísticas de salud
  Cuando:    selecciona el nuevo módulo de agendamientos
  Entonces:  el sistema muestra un modal con indicadores, gráficas y tabla de resumen
```

**Error Path**
```gherkin
CRITERIO-1.2: manejo de respuesta vacía o error de API
  Dado que:  no existen registros o la consulta falla
  Cuando:    el modal intenta cargar la información
  Entonces:  el sistema presenta valores en cero sin romper la interfaz
```

**Edge Case**
```gherkin
CRITERIO-1.3: diagnósticos y tipos almacenados en formatos mixtos
  Dado que:  algunos registros poseen arreglos JSON incompletos o estructuras legacy
  Cuando:    se calculan diagnósticos comunes y tipos de atención
  Entonces:  el sistema normaliza los valores y omite entradas inválidas sin errores
```

### Reglas de Negocio
1. Todas las consultas deben filtrar por empresa_id para respetar el aislamiento multiempresa.
2. Solo deben considerarse atenciones médicas registradas desde CitaControl con información válida del empleado.
3. La exportación PDF debe reflejar los mismos indicadores y gráficas mostrados en pantalla.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `CitaControl` | tabla `cita_controls` | reutilizada | Fuente principal de atenciones, diagnósticos y tipos de cita |
| `Empleado` | tabla `empleados` | reutilizada | Fuente de sexo, edad y tipo de empleado |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción | Ejemplo |
|-------|------|-------------|------------|-------------|
| `empresa_id` | string | sí | requerido | Filtro multiempresa |
| `tipo_cita` | array/json | no | estructura legacy soportada | Tipo de atención realizada | ["1"] |
| `diagnostico` | array/json | no | estructura con CIE y descripción | Diagnósticos frecuentes | [{"cie_id":2572,"code":"N390","description":"Infecci\u00f3n de v\u00edas urinarias, sitio no especificado","tipo":"presuntivo","observaciones":""}] |
| `sexo` | string | no | normalizado | Género del empleado |
| `edad` | integer | no | >= 0 | Rango etario |
| `tipo` | string | no | texto libre | Tipo de empleado/contrato |

#### Índices / Constraints
- Reutilizar filtros por `empresa_id`, `created_at` y `start_time` para consultas rápidas del dashboard.

### API Endpoints

#### GET /api/agendamientos-estadisticas
- **Descripción**: Obtiene las estadísticas agregadas de agendamientos médicos por empresa
- **Auth requerida**: sí
- **Request Query**:
  ```json
  { "empresa_id": "string" }
  ```
- **Response 200**:
  ```json
  {
    "estadisticas": {"total_agendamientos": 0, "atendidos": 0, "tipos_unicos": 0, "diagnosticos_registrados": 0},
    "tipos_atencion": [],
    "diagnosticos_comunes": [],
    "por_genero": [],
    "por_edad": [],
    "por_tipo_empleado": []
  }
  ```
- **Response 400**: empresa_id faltante
- **Response 500**: error al calcular estadísticas

#### POST /gso/agendamientos-estadisticas/pdf
- **Descripción**: Genera el PDF del reporte visual del módulo
- **Auth requerida**: sí
- **Request Body**: estadísticas + imágenes base64 de gráficas
- **Response 200**: descarga de PDF

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `modal-agendamientos` | `resources/views/livewire/gso/morbilidad/modals/agendamientos-estadisticas.blade.php` | datos desde Alpine | Modal visual con tarjetas, gráficas y tabla |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| `estadisticas-morbilidad` | `resources/views/livewire/gso/morbilidad/estadisticas-morbilidad.blade.php` | `/gso/estadisticas-morbilidad` | sí |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `estadisticasModales` | vista Blade | estado de modal y datasets | Carga datos, crea gráficas y exporta PDF |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `loadAgendamientosData()` | vista Blade | `GET /api/agendamientos-estadisticas` |
| `downloadAgendamientosPDF()` | vista Blade | `POST /gso/agendamientos-estadisticas/pdf` |

### Arquitectura y Dependencias
- No requiere paquetes nuevos.
- Debe seguir el patrón existente de API controller + report controller + vista Blade modal.
- Debe usar Chart.js ya presente en el dashboard actual.

### Notas de Implementación
> Reutilizar los rangos de edad y la normalización de sexo ya existentes en el servicio de informe médico ocupacional.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.
> El Orchestrator monitorea este checklist para determinar el progreso.

### Backend

#### Implementación
- [x] Implementar controller API para estadísticas de agendamientos
- [x] Agregar ruta API para la consulta del dashboard
- [x] Implementar controller de descarga PDF
- [x] Agregar ruta web para exportación del PDF

#### Tests Backend
- [ ] Validar respuesta 200 con empresa válida
- [ ] Validar respuesta 400 sin empresa_id
- [ ] Validar que las consultas filtran por empresa_id

### Frontend

#### Implementación
- [x] Agregar tarjeta del módulo en el grid 3x3
- [x] Crear modal con diseño consistente al de aptitud médica
- [x] Implementar carga de datos y gráficas de Chart.js
- [x] Implementar descarga PDF con imágenes base64
- [x] Registrar el include del nuevo modal en la vista principal

#### Tests Frontend
- [ ] Verificar apertura del modal desde la tarjeta
- [ ] Verificar render de indicadores y tabla con datos
- [ ] Verificar que la exportación envía el payload esperado

### QA
- [x] Revisar que el grid muestre 9 módulos en 3 columnas
- [x] Validar funcionamiento del modal con y sin datos
- [x] Confirmar que el PDF refleja la información del dashboard
- [x] Actualizar estado spec: `status: IMPLEMENTED`
