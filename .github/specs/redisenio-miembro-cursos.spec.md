---
id: SPEC-011
status: IMPLEMENTED
feature: redisenio-miembro-cursos
created: 2026-09-22
updated: 2026-09-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-003", "SPEC-010"]
---

# Spec: Rediseño de Mis cursos (vista miembro)

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Rediseñar `/mi-espacio/cursos` para un workspace de tarjetas + panel derecho de detalle, con filtros de inscritos/disponibles/todos, búsqueda y categoría. El detalle deja de ser un modal.

### Requerimiento de Negocio
El miembro necesita elegir un curso y ver su ficha a la derecha: datos, asistencia y certificado. Si administración marcó asistencia, puede descargar el certificado. Si no está inscrito, ve **Inscribirme**. Si ya está inscrito, ese botón no aparece.

### Historias de Usuario

#### HU-01: Workspace con panel derecho

```
Como:        Miembro
Quiero:      Ver mis cursos y los disponibles en tarjetas y abrir el detalle a la derecha
Para:        Revisar fechas, modalidad y estado sin un modal que tape el listado
```

**Happy Path**
```gherkin
CRITERIO-1.1: selección
  Dado que:  hay cursos inscritos o disponibles
  Cuando:    elijo una tarjeta o Ver detalle
  Entonces:  el panel derecho muestra portada, título, badges, fechas, horario,
             modalidad, duración, instructor, categoría y descripción
```

```gherkin
CRITERIO-1.2: filtros
  Dado que:  existen inscritos y disponibles
  Cuando:    uso Inscritos, Disponibles, Todos, buscador o categoría
  Entonces:  solo se listan los cursos que coinciden
```

#### HU-02: Certificado e inscripción según estado

```
Como:        Miembro
Quiero:      Descargar el certificado solo si el admin marcó asistencia, e inscribirme solo si aún no lo estoy
Para:        No ver acciones que no aplican
```

```gherkin
CRITERIO-2.1: certificado
  Dado que:  estoy inscrito y attended_at tiene valor
  Cuando:    abro el detalle
  Entonces:  veo asistencia validada, certificado listo y Descargar certificado
```

```gherkin
CRITERIO-2.2: sin asistencia
  Dado que:  estoy inscrito y attended_at es nulo
  Cuando:    abro el detalle
  Entonces:  no aparece Descargar certificado ni Inscribirme
```

```gherkin
CRITERIO-2.3: no inscrito
  Dado que:  el curso está disponible
  Cuando:    abro el detalle
  Entonces:  veo Inscribirme y no veo Descargar certificado
```

```gherkin
CRITERIO-2.4: ya inscrito
  Dado que:  inscription_id no es nulo
  Cuando:    veo la tarjeta o el panel
  Entonces:  no se muestra el botón Inscribirme
```

---

## 2. DISEÑO

- Referencia visual: captura de Mis cursos con panel derecho.
- Paleta e iconos stroke actuales (azul, verde, grises).
- Sin cambios de API ni de base de datos.
- Categoría derivada del título/descripción para el filtro visual.

---

## 3. ALCANCE

### Incluye
- Página miembro, tarjeta, panel, filtros, toasts.
- Acciones existentes: `enrollCurrentMember`, `downloadMyCertificate`.

### Excluye
- Cambios de backend, materiales reales o cronograma persistido.
