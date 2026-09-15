---
id: SPEC-006
status: IMPLEMENTED
feature: landing-publica
created: 2026-09-15
updated: 2026-09-15
author: spec-generator
version: "1.0"
related-specs: [login-dashboard-base]
---

# Spec: Landing pública COPSSTEC

> **Estado:** `IN_PROGRESS`
> **Ciclo de vida:** DRAFT -> APPROVED -> IN_PROGRESS -> IMPLEMENTED -> DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Rediseñar `/` para que el visitante vea una secuencia de frames ligada al scroll, información institucional, servicios con video de fondo, aliados estratégicos desde `partners` y un cierre que invite al registro.

### Requerimiento de Negocio
La landing pública debe replicar el recorrido de copsstec.com con el lenguaje visual de obsidianintelligence.ai (navbar de vidrio fija), usando los logos del sistema y las URLs de medios actuales para poder reemplazarlas después.

### Historias de Usuario

#### HU-01: Recorrer el hero con scroll de frames

```text
Como:        Visitante
Quiero:      Ver el fondo avanzar frame a frame al hacer scroll
Para:        Entrar a la página con el mismo impacto que copsstec.com

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: secuencia de frames
  Dado que:  existen webp en /media/landing/frames-desktop-seq
  Cuando:    el usuario hace scroll en el hero
  Entonces:  el canvas muestra el frame correspondiente al progreso
```

#### HU-02: Conocer al colegio y sus servicios

```text
Como:        Visitante
Quiero:      Ver quiénes somos, misión, valores, visión, TV y servicios
Para:        Entender qué ofrece COPSSTEC antes de registrarme

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Frontend
```

#### HU-03: Ver aliados y registrarme

```text
Como:        Visitante
Quiero:      Ver aliados de la tabla partners y un cierre hacia afiliación
Para:        Confiar en la red y dar el siguiente paso

Prioridad:   Alta
Estimación:  M
Dependencias: HU-02
Capa:        Ambas
```

### Reglas de Negocio
1. El navbar público permanece fijo con efecto de vidrio.
2. Los aliados se leen de `partners` activos, ordenados.
3. Los servicios son contenido estático con URLs de video reemplazables.
4. El CTA final anima el título de izquierda a derecha y lleva a `/afiliacion`.

---

## 2. DISEÑO

### Modelos de Datos

| Entidad | Almacén | Cambios | Descripción |
| partners | PostgreSQL | CREATE | id, name, slogan, description, logo_url, sort_order, is_active |

### API
- `GET /api/partners` público, lista aliados activos.

### Frontend
- `PublicLandingPage` a ancho completo.
- Secuencia: hero scroll → about → servicios → aliados → CTA membresía → footer.
- Medios centralizados en `landing-media.ts`.

---

## 3. LISTA DE TAREAS

### Backend
- [ ] Tabla `partners` y seed inicial
- [ ] Endpoint público de listado

### Frontend
- [ ] Navbar glass fija
- [ ] Scroll sequence de frames
- [ ] Secciones about, servicios, aliados y CTA
