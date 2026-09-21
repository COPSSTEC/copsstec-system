---
id: SPEC-011
status: IMPLEMENTED
feature: estadisticas-encuestas-curso
created: 2026-09-21
updated: 2026-09-21
author: spec-generator
version: "1.0"
related-specs: ["SPEC-003", "SPEC-010"]
---

# Spec: Estadísticas de satisfacción del curso

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
El administrador ve en el panel derecho un botón para abrir las estadísticas agregadas de las encuestas de satisfacción. La vista no revela quién calificó: solo promedios, distribución, tasa de respuesta y comentarios anónimos, con descarga de reporte CSV o PDF.

### Requerimiento de Negocio
Falta dentro del administrador agregar un botón en el panel derecho para ver cómo fue recibido el curso por las encuestas de satisfacción. No debe decir quién calificó, sino estadísticas, y obtener un reporte de esas estadísticas.

### Historias de Usuario

#### HU-01: Ver estadísticas de satisfacción

```
Como:        Administrador
Quiero:      Abrir desde el panel derecho las estadísticas agregadas de la encuesta
Para:        Entender cómo fue recibido el curso sin identificar a quienes calificaron

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-010
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: botón en panel
  Dado que:  hay un curso seleccionado
  Cuando:    miro el panel derecho
  Entonces:  veo el botón para ver la satisfacción del curso
```

```gherkin
CRITERIO-1.2: estadísticas anónimas
  Dado que:  el curso tiene respuestas
  Cuando:    abro el modal de satisfacción
  Entonces:  veo promedios, distribución 1-5, tasa de respuesta y comentarios
             sin nombres, cédulas ni correos
```

**Error Path**
```gherkin
CRITERIO-1.3: curso inexistente
  Dado que:  el curso no existe
  Cuando:    pido las estadísticas
  Entonces:  el API responde 404
```

**Edge Case**
```gherkin
CRITERIO-1.4: sin respuestas
  Dado que:  el curso no tiene encuestas respondidas
  Cuando:    abro el modal
  Entonces:  veo un estado vacío y puedo cerrarlo
```

#### HU-02: Descargar reporte

```
Como:        Administrador
Quiero:      Descargar un reporte CSV o PDF de las estadísticas
Para:        Compartir o archivar cómo se recibió el curso

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: descarga
  Dado que:  estoy en el modal de satisfacción
  Cuando:    elijo CSV o PDF
  Entonces:  se descarga un archivo con promedios, distribución y comentarios
             anónimos, sin identidad de quienes calificaron
```

### Reglas de Negocio
1. Solo el administrador puede consultar estadísticas y reportes.
2. La respuesta no incluye `course_inscription_id`, nombres, correo ni cédula.
3. La escala es 1 (Muy mala) a 5 (Excelente).
4. La tasa de respuesta es respuestas / encuestas enviadas.
5. El índice de satisfacción es el porcentaje de calificaciones generales ≥ 4.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `course_feedbacks` | PostgreSQL | sin cambios | Fuente de promedios, distribución y comentarios |
| `course_feedback_tokens` | PostgreSQL | sin cambios | Conteo de encuestas enviadas |

### API Endpoints

#### GET /api/courses/admin/{course_id}/feedback-stats
- **Auth requerida**: sí (admin)
- **Response 200**: estadísticas agregadas y comentarios anónimos
- **Response 404**: curso no encontrado

#### GET /api/courses/admin/{course_id}/feedback-report?format=csv|pdf
- **Auth requerida**: sí (admin)
- **Response 200**: archivo CSV o PDF
- **Response 404**: curso no encontrado

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `CourseFeedbackStatsModal` | `presentation/modals/course-feedback-stats-modal.tsx` | Modal de estadísticas y descarga |

#### Services
| Función | Endpoint |
|---------|----------|
| `getFeedbackStats` | `GET /api/courses/admin/{id}/feedback-stats` |
| `downloadFeedbackReport` | `GET /api/courses/admin/{id}/feedback-report` |

### Notas de Implementación
Reutilizar el panel derecho, el modal existente y los iconos stroke. No crear tablas nuevas.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Agregar `get_feedback_stats` en el repositorio
- [x] Exponer stats y reporte en `CourseFeedbackUseCase`
- [x] Endpoints admin de stats y reporte
- [x] Generar CSV y PDF sin datos identificables

#### Tests Backend
- [ ] Cubierto por verificación manual del endpoint y el archivo

### Frontend

#### Implementación
- [x] Botón en el panel derecho
- [x] Modal de estadísticas anónimas
- [x] Descarga CSV y PDF
- [x] Estilos de barras y KPIs

### QA
- [x] Verificar en navegador el modal y que no aparezcan nombres
- [x] Actualizar estado spec: `status: IMPLEMENTED`
