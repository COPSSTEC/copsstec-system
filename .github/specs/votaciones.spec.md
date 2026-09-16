---
id: SPEC-009
status: IMPLEMENTED
feature: votaciones
created: 2026-09-16
updated: 2026-09-16
author: spec-generator
version: "1.1"
related-specs: ["SPEC-002", "SPEC-004", "SPEC-008"]
---

# Spec: Módulo de Votaciones (elecciones de directiva)

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Crear el módulo **Votaciones** para administrar y ejecutar la elección de la Directiva del Colegio. El administrador configura cargos, requisitos, diseño del portal de voto, calendario electoral, listas con candidatos y plan de trabajo, padrón de votantes y reportes. El miembro ve el proceso con la identidad visual configurada, consulta listas/candidatos/plan y emite un voto virtual. El calendario puede publicarse en la landing pública y descargarse.

### Requerimiento de Negocio
Nuevo módulo **Votaciones**.

**Administrador — secciones:**
1. **Listas de candidatos** — cargar listas (nombre, lema, color, logo, descripción), integrantes (cargo, foto, nombre, profesión, perfil breve) y PDF del plan de trabajo. En el listado se ven miembros y un previsualizable del plan.
2. **Calendario electoral** — configurar 9 fechas del cronograma, publicar/ocultar en la página pública y descargar el cronograma.
3. **Configuración de elecciones** — pestañas:
   - **Cargos y requisitos:** cargos con orden (peso), campos obligatorios por candidato y requisitos de inscripción (plan de trabajo, foto, aceptación de cargo, logo, color distintivo, documento de respaldo, fecha límite, tamaño máximo).
   - **Diseño y visibilidad:** logo, banner, colores, título, mensaje, frase, opciones de visibilidad y periodo de publicación. Esto se refleja en el portal de voto del miembro.
   - **Opciones de votación:** sin modalidad (siempre virtual). Sí: tipo de elección (lista completa / voto por cargos), reglas (un voto, mostrar plan, voto secreto, confirmación, voto en blanco) y autenticación (usuario/contraseña del portal; OTP y doble autenticación quedan fuera de esta entrega).
   - **Mensajes y notificaciones:** plantillas de las 6 etapas del mockup (convocatoria, inicio, recordatorio, confirmación de voto, cierre, publicación de resultados) con canales, asunto, cuerpo, variables, vista previa, envío de prueba y guardado.
4. **Votantes habilitados** — listado de usuarios miembro del sistema; el admin activa/desactiva el derecho a voto y ve si está al día con pagos (SPEC-008).
5. **Reportes de votación** — mismo diseño y funcionalidad del mockup: KPIs, gráficos, tabla de resultados, trazabilidad, exportar PDF/Excel y generar acta.

**Miembro — módulo Votaciones:**
- Página de proceso con diseño/colores/títulos definidos por el admin.
- Listas, logos, fotos, planes de trabajo y datos reales del backend.
- Detalle de lista (candidatos + plan) y acción de votar.

### Decisiones acordadas

1. **Un periodo activo a la vez, con historial.** Solo puede haber una elección `en_preparacion`, `publicada` o `en_votacion`. El admin puede **cerrar** el periodo vigente (`cerrada` / `finalizada`); al cerrarlo se conserva todo (listas, votos, padrón, reportes) y puede **iniciar un periodo nuevo**. Los periodos cerrados son de solo lectura: se consultan y se descargan sus reportes/acta/cronograma de forma independiente (`election_id`). No hay dos votaciones abiertas en paralelo.
2. **Cargos y requisitos mandan el alta de listas.** El editor de listas no inventa cargos ni campos: el selector de cargo usa solo `election_positions` activos, en el `sort_order` configurado. Foto, nombre, perfil, profesión, plan PDF, logo, color y documento de respaldo se exigen según los flags de Configuración → Cargos y requisitos. Cambiar un cargo/requisito aplica a las listas de **ese** periodo (los periodos cerrados no se alteran).
3. **Guía de inicio del módulo.** En la entrada de Votaciones el admin ve un checklist/wizard (“Por dónde empezar”) con el orden recomendado: (1) Configurar cargos y requisitos, (2) Diseño y opciones de voto, (3) Calendario, (4) Crear listas, (5) Sincronizar padrón, (6) Publicar / abrir votación, (7) Reportes y cierre de periodo. Cada paso enlaza a la sección y marca completado cuando hay datos mínimos. La guía se puede ocultar/mostrar.
4. **La votación es siempre virtual.** No se implementan modalidad presencial ni mixta.
5. **Autenticación de voto:** solo la sesión existente del portal (usuario y contraseña). No OTP ni 2FA en esta entrega.
6. **Tipo de elección por defecto:** `lista_completa`. Si se configura `voto_por_cargos`, el miembro emite un voto por cada cargo activo.
7. **Voto secreto:** el admin nunca ve quién votó por qué lista. Sí puede ver si un miembro ya votó (padrón / reportes agregados).
8. **Un voto por miembro** por periodo (o un voto por cargo si el tipo es `voto_por_cargos`). No se puede cambiar el voto una vez confirmado.
9. **Habilitación de voto:** el admin decide el flag `voting_enabled`. El estado de pago (`al_dia` / `gracia` / `vencida` / `sin_historial` de SPEC-008) es informativo. Sincronizar padrón crea filas faltantes; el default de `voting_enabled` es `true` solo si el estado de suscripción es `al_dia` o `gracia`.
10. **Calendario público:** si `calendar_public = true` en el periodo vigente, se muestra en `/calendario-electoral` (landing) y un bloque resumido en la home pública. Si es `false`, esos endpoints/secciones no revelan fechas. Periodos cerrados no se publican en la landing salvo que el admin vuelva a marcar público uno vigente.
11. **Estados de lista:** `borrador`, `activa`, `suspendida`, `retirada`. Solo `activa` es visible y votable para miembros durante el periodo de votación.
12. **Estados de elección:** `en_preparacion`, `publicada`, `en_votacion`, `cerrada`, `finalizada`. Cerrar un periodo con votos lo deja `finalizada` (reportes congelados). Cerrar sin votos puede quedar `cerrada`.
13. **Notificaciones:** se persisten plantillas y un log de envíos. El envío real usa el `EmailPort` existente (SMTP o log). “Notificación en portal” se guarda como aviso interno del módulo (bandeja simple del miembro en la página de votaciones). “Mensaje interno” se trata igual que aviso de portal en esta entrega.
14. **Archivos:** logo de lista, foto de candidato, plan de trabajo PDF, documento de respaldo PDF, logo/banner del proceso. Tamaño máximo según configuración (default 5 MB). Imágenes JPG/PNG/WEBP; planes y respaldos PDF.
15. **Pestaña Información general:** cabecera editable del periodo (título, periodo de votación, periodo de gestión, estado) más selector de periodo histórico y acciones “Cerrar periodo” / “Iniciar nuevo periodo”.
16. **Reportes por periodo.** El dashboard de reportes opera sobre el `election_id` seleccionado. Exportar PDF, Excel y generar acta son **únicos de ese periodo** (el archivo incluye título y fechas del periodo). Se puede descargar el reporte de un periodo cerrado sin reabrir la votación.
17. **No se implementan** OTP, votación presencial, dos periodos abiertos a la vez ni autenticación distinta a la del portal.

### Historias de Usuario

#### HU-01: Navegación del módulo admin

```
Como:        Administrador
Quiero:      Un módulo Votaciones en el menú con subsecciones
Para:        Gestionar todo el proceso electoral desde un solo lugar

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-002
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: menú y submódulos
  Dado que:  soy administrador autenticado
  Cuando:    abro el menú lateral y pulso "Votaciones"
  Entonces:  el grupo se expande con submódulos propios:
             Listas de candidatos (/admin/votaciones/listas),
             Calendario electoral (/admin/votaciones/calendario),
             Configuración (/admin/votaciones/configuracion),
             Votantes habilitados (/admin/votaciones/votantes),
             Reportes de votación (/admin/votaciones/reportes)
             y /admin/votaciones redirige a /admin/votaciones/listas
```

**Error Path**
```gherkin
CRITERIO-1.2: acceso denegado
  Dado que:  soy un usuario con rol miembro
  Cuando:    intento abrir /admin/votaciones o GET /api/votaciones/admin
  Entonces:  el frontend redirige a access-denied y la API responde 403
```

#### HU-02: Listas de candidatos

```
Como:        Administrador
Quiero:      Crear y editar listas con integrantes, logo, color y plan de trabajo PDF
Para:        Publicar las opciones que verán los miembros

Prioridad:   Alta
Estimación:  L
Dependencias: HU-05
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: crear lista
  Dado que:  estoy en /admin/votaciones/listas
  Cuando:    pulso "Nueva lista", completo nombre, lema, color, descripción,
             cargo/nombre/profesión/perfil/foto de al menos un candidato
             y subo el PDF del plan de trabajo
  Entonces:  se persiste la lista con integrantes y el PDF queda previsualizable
```

**Happy Path**
```gherkin
CRITERIO-2.2: listado de listas
  Dado que:  existen listas cargadas
  Cuando:    abro /admin/votaciones/listas
  Entonces:  veo cada lista con color/logo, miembros (foto + cargo + nombre)
             y un visor/enlace de previsualización del plan de trabajo
```

**Happy Path**
```gherkin
CRITERIO-2.3: editor con vista previa
  Dado que:  edito una lista
  Cuando:    cambio nombre, lema, color, logo, candidatos o plan
  Entonces:  a la derecha se actualiza la vista previa al estilo del mockup
             (header de lista, plan, candidatos y botón votar deshabilitado)
```

**Error Path**
```gherkin
CRITERIO-2.4: validación según configuración
  Dado que:  el cargo "Presidente" exige foto y profesión
  Cuando:    guardo un candidato de ese cargo sin foto o sin profesión
  Entonces:  no se persiste y la API responde 400 con el campo faltante
```

**Edge Case**
```gherkin
CRITERIO-2.5: estados de lista
  Dado que:  una lista está en borrador
  Cuando:    la paso a activa
  Entonces:  queda visible para miembros si la elección está publicada/en votación;
             suspendida y retirada no se muestran ni se pueden votar
```

#### HU-03: Calendario electoral

```
Como:        Administrador
Quiero:      Configurar las 9 fechas del cronograma, publicarlo y descargarlo
Para:        Comunicar el proceso interno y públicamente

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: nueve hitos editables
  Dado que:  estoy en /admin/votaciones/calendario
  Cuando:    edito las fechas de los 9 hitos
             (convocatoria, inscripción, revisión, publicación de listas,
              campaña, votación, escrutinio, inicio de gestión, fin de gestión)
  Entonces:  se guardan y se reflejan en la línea de tiempo y en el mini-calendario
```

**Happy Path**
```gherkin
CRITERIO-3.2: publicar / ocultar
  Dado que:  el calendario está en preparación (no público)
  Cuando:    pulso "Publicar calendario"
  Entonces:  calendar_public=true y el cronograma aparece en /calendario-electoral
  Cuando:    pulso "Ocultar calendario"
  Entonces:  deja de mostrarse en la landing
```

**Happy Path**
```gherkin
CRITERIO-3.3: descargar cronograma
  Dado que:  existen fechas configuradas
  Cuando:    pulso "Descargar cronograma"
  Entonces:  se descarga un PDF con los 9 hitos, periodos y estado
```

**Error Path**
```gherkin
CRITERIO-3.4: calendario no público
  Dado que:  calendar_public=false
  Cuando:    un anónimo pide GET /api/votaciones/public/calendar
  Entonces:  recibe 404 o un payload { "public": false } sin fechas
```

#### HU-04: Cargos y requisitos

```
Como:        Administrador
Quiero:      Definir cargos con orden/peso y qué campos son obligatorios
Para:        Que todas las listas se carguen con la misma estructura

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: CRUD de cargos
  Dado que:  estoy en Configuración → Cargos y requisitos
  Cuando:    agrego, reordeno, activo/desactivo o elimino un cargo
  Entonces:  el orden (peso) se persiste y el selector de cargo del editor
             de listas usa solo cargos activos, ordenados
```

**Happy Path**
```gherkin
CRITERIO-4.2: requisitos de inscripción
  Dado que:  activo "Plan de trabajo obligatorio", "Foto de cada integrante",
             "Color distintivo" y defino tamaño máximo 5 MB
  Cuando:    intento activar una lista sin plan, sin foto o con archivo > 5 MB
  Entonces:  la API rechaza con 400
```

**Edge Case**
```gherkin
CRITERIO-4.3: no borrar cargo en uso
  Dado que:  un candidato ya usa el cargo "Secretario"
  Cuando:    intento eliminar ese cargo
  Entonces:  recibo 409 y debo desactivarlo en su lugar
```

#### HU-05: Diseño y visibilidad del portal de voto

```
Como:        Administrador
Quiero:      Configurar logo, banner, colores, textos y visibilidad
Para:        Que el portal del miembro se vea como el mockup, con mi branding

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-05

**Happy Path**
```gherkin
CRITERIO-5.1: persistir diseño
  Dado que:  cambio logo, banner, color principal/secundario, título,
             mensaje, frase y flags de visibilidad
  Cuando:    guardo el diseño
  Entonces:  GET del portal miembro devuelve esos valores y la UI los aplica
```

**Happy Path**
```gherkin
CRITERIO-5.2: vista previa
  Dado que:  estoy en la pestaña Diseño
  Cuando:    edito título o colores
  Entonces:  el panel derecho previsualiza el hero y las tarjetas de lista
             (escritorio / móvil) sin necesidad de recargar
```

#### HU-06: Opciones de votación

```
Como:        Administrador
Quiero:      Definir tipo de elección y reglas del voto virtual
Para:        Controlar cómo votan los miembros

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-06

**Happy Path**
```gherkin
CRITERIO-6.1: reglas
  Dado que:  configuro lista completa, un voto, voto secreto,
             confirmación, voto en blanco y mostrar plan
  Cuando:    un miembro abre la boleta
  Entonces:  ve listas + opción en blanco, puede abrir el plan,
             debe confirmar antes de registrar y solo puede votar una vez
```

**Error Path**
```gherkin
CRITERIO-6.2: no cambiar reglas en votación
  Dado que:  la elección está en_votacion o cerrada/finalizada
  Cuando:    intento cambiar tipo de elección o permitir voto en blanco
  Entonces:  la API responde 409
```

#### HU-07: Mensajes y notificaciones

```
Como:        Administrador
Quiero:      Editar las 6 plantillas, previsualizarlas y enviar una prueba
Para:        Comunicar cada etapa del proceso

Prioridad:   Media
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-07

**Happy Path**
```gherkin
CRITERIO-7.1: plantillas
  Dado que:  estoy en Configuración → Mensajes
  Cuando:    edito asunto/cuerpo/canales de convocatoria, inicio, recordatorio,
             confirmación de voto, cierre y publicación de resultados
  Entonces:  se guardan con variables {nombre}, {fecha_inicio}, {fecha_fin}
```

**Happy Path**
```gherkin
CRITERIO-7.2: envío de prueba y disparo
  Dado que:  las plantillas están guardadas
  Cuando:    envío una prueba a un correo o disparo "convocatoria" / "inicio"
  Entonces:  se envía el email (o se loguea) y queda registro en el log de envíos
```

#### HU-08: Votantes habilitados

```
Como:        Administrador
Quiero:      Ver a todos los miembros, su estado de pago y activar/desactivar su voto
Para:        Controlar el padrón electoral

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-004, SPEC-008
Capa:        Ambas
```

#### Criterios de Aceptación — HU-08

**Happy Path**
```gherkin
CRITERIO-8.1: listado
  Dado que:  existen miembros en el sistema
  Cuando:    abro /admin/votaciones/votantes
  Entonces:  veo foto, nombre, nº de socio, profesión, estado de pago
             (al día / pendiente según suscripción), habilitado para votar,
             correo y último acceso, con filtros y paginación
```

**Happy Path**
```gherkin
CRITERIO-8.2: toggle de voto
  Dado que:  un miembro aparece como no habilitado
  Cuando:    el admin lo habilita
  Entonces:  voting_enabled=true y ese miembro puede votar si la elección
             está en_votacion y su lista/boleta está abierta
```

**Happy Path**
```gherkin
CRITERIO-8.3: sincronizar padrón
  Dado que:  hay miembros nuevos sin fila en election_voters
  Cuando:    pulso "Sincronizar padrón"
  Entonces:  se crean las filas faltantes y los KPIs (habilitados, no habilitados,
             pendientes de pago, total) se actualizan
```

**Happy Path**
```gherkin
CRITERIO-8.4: exportar padrón
  Dado que:  el padrón tiene filas
  Cuando:    pulso "Exportar a Excel"
  Entonces:  se descarga un CSV/XLSX con las columnas del listado
```

#### HU-09: Emitir voto (miembro)

```
Como:        Miembro habilitado
Quiero:      Ver las listas con el diseño configurado y votar
Para:        Participar en la elección de la Directiva

Prioridad:   Alta
Estimación:  L
Dependencias: HU-02, HU-05, HU-06, HU-08
Capa:        Ambas
```

#### Criterios de Aceptación — HU-09

**Happy Path**
```gherkin
CRITERIO-9.1: portal de listas
  Dado que:  soy miembro habilitado y la elección está en_votacion
  Cuando:    abro /mi-espacio/votaciones
  Entonces:  veo hero (logo, banner, título, mensaje, frase, colores),
             pasos, tarjetas de listas activas y no hay lista preseleccionada
```

**Happy Path**
```gherkin
CRITERIO-9.2: detalle de lista
  Dado que:  elijo una lista
  Cuando:    abro /mi-espacio/votaciones/listas/{id}
  Entonces:  veo candidatos (foto, cargo, nombre, profesión, perfil),
             plan de trabajo (puntos o PDF embebido) y "Votar por esta lista"
```

**Happy Path**
```gherkin
CRITERIO-9.3: votar
  Dado que:  no he votado y la confirmación está activa
  Cuando:    pulso votar y confirmo
  Entonces:  se registra un ballot anónimo, se marca que ya voté
             y recibo la plantilla de confirmación si el canal correo está activo
```

**Error Path**
```gherkin
CRITERIO-9.4: no habilitado / fuera de periodo / ya votó
  Dado que:  no estoy habilitado, o hoy está fuera del hito de votación,
             o ya emití voto
  Cuando:    intento POST /api/votaciones/me/vote
  Entonces:  recibo 403 o 409 con mensaje claro; el botón aparece bloqueado
```

#### HU-10: Reportes de votación

```
Como:        Administrador
Quiero:      Ver resultados, participación, trazabilidad y exportar acta
Para:        Cerrar el proceso con evidencia

Prioridad:   Alta
Estimación:  L
Dependencias: HU-09
Capa:        Ambas
```

#### Criterios de Aceptación — HU-10

**Happy Path**
```gherkin
CRITERIO-10.1: dashboard de reportes
  Dado que:  existen votos
  Cuando:    abro /admin/votaciones/reportes
  Entonces:  veo KPIs (habilitados, emitidos, participación, blancos, listas),
             barras por lista, dona de participación, tabla de resultados
             (candidato principal, votos, %, estado ganadora/participante)
             y la línea de trazabilidad del proceso
```

**Happy Path**
```gherkin
CRITERIO-10.2: exportaciones
  Dado que:  hay resultados
  Cuando:    pulso Exportar PDF, Exportar Excel o Generar acta
  Entonces:  se descarga el archivo correspondiente con los totales actuales
```

**Edge Case**
```gherkin
CRITERIO-10.3: voto secreto
  Dado que:  secret_vote=true
  Cuando:    consulto reportes o padrón
  Entonces:  no aparece para quién votó cada miembro; solo agregados y
             el flag "ya votó"
```

#### HU-12: Guía de inicio del módulo

```
Como:        Administrador
Quiero:      Una guía visible que me diga por dónde empezar y el orden del proceso
Para:        Configurar votaciones sin perderse entre secciones

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-12

**Happy Path**
```gherkin
CRITERIO-12.1: checklist
  Dado que:  abro /admin/votaciones por primera vez
  Cuando:    veo la guía "Por dónde empezar"
  Entonces:  aparecen 7 pasos con enlace a cada sección y estado
             pendiente/completo: cargos, diseño/opciones, calendario,
             listas, padrón, abrir votación, reportes
```

**Edge Case**
```gherkin
CRITERIO-12.2: ocultar guía
  Dado que:  ya conozco el flujo
  Cuando:    oculto la guía
  Entonces:  se recuerda en localStorage y puedo volver a mostrarla
```

#### HU-13: Cerrar periodo e historial de reportes

```
Como:        Administrador
Quiero:      Cerrar el periodo vigente, iniciar uno nuevo y descargar
             solo los reportes de cada periodo
Para:        Conservar el historial electoral sin mezclar votaciones

Prioridad:   Alta
Estimación:  M
Dependencias: HU-10
Capa:        Ambas
```

#### Criterios de Aceptación — HU-13

**Happy Path**
```gherkin
CRITERIO-13.1: cerrar e iniciar
  Dado que:  hay un periodo en_votacion o en_preparacion
  Cuando:    confirmo "Cerrar periodo" y luego "Iniciar nuevo periodo"
  Entonces:  el anterior queda finalizada/cerrada (solo lectura) y se crea
             una elección nueva en_preparacion con cargos y plantillas semilla
```

**Happy Path**
```gherkin
CRITERIO-13.2: reporte de un periodo cerrado
  Dado que:  existen dos periodos (2022 y 2026)
  Cuando:    selecciono el periodo 2022 en Reportes y exporto PDF/Excel/acta
  Entonces:  el archivo contiene únicamente votos, listas y KPIs de 2022
```

**Error Path**
```gherkin
CRITERIO-13.3: no hay dos abiertas
  Dado que:  ya existe un periodo no cerrado
  Cuando:    intento crear otro sin cerrar el actual
  Entonces:  la API responde 409
```

#### HU-11: Calendario en la landing pública

```
Como:        Visitante anónimo
Quiero:      Ver el cronograma si el admin lo publicó
Para:        Conocer las fechas del proceso electoral

Prioridad:   Media
Estimación:  S
Dependencias: HU-03
Capa:        Ambas
```

#### Criterios de Aceptación — HU-11

**Happy Path**
```gherkin
CRITERIO-11.1: página pública
  Dado que:  el calendario está público
  Cuando:    abro /calendario-electoral
  Entonces:  veo los 9 hitos, periodos y un botón para descargar el cronograma
```

### Reglas de Negocio

1. Solo el administrador gestiona listas, calendario, configuración, padrón, periodos y reportes.
2. Solo miembros con `voting_enabled=true` pueden votar durante el hito `votacion` (hoy entre `starts_on` y `ends_on` de ese evento, o el periodo de votación de la elección).
3. Una lista `activa` no puede publicarse a miembros si incumple los requisitos de Configuración → Cargos y requisitos (plan, fotos, cargos activos, color, logo, documento).
4. El alta de integrantes de una lista usa exclusivamente los cargos activos y los flags de campo (foto, nombre, perfil, profesión) definidos en esa configuración. No hay cargos libres tecleados a mano.
5. El orden de cargos define el peso y el orden visual (1 = mayor peso; el cargo 1 es el “candidato principal” en reportes).
6. Solo un periodo puede estar abierto (`en_preparacion` | `publicada` | `en_votacion`). Cerrar el vigente es obligatorio para iniciar otro. Los reportes, el acta y el cronograma se descargan por `election_id` y no mezclan periodos.
5. El voto es secreto: `election_ballots` guarda `user_id` + `voted_at` + hash; `election_votes` guarda la opción sin `user_id`.
6. Si `allow_blank_vote=false`, no existe la opción “voto en blanco”.
7. Si `confirm_vote=true`, el frontend exige un diálogo de confirmación; el backend es idempotente por `user_id`.
8. Archivos mayores al máximo configurado se rechazan con 400.
9. No se puede eliminar una lista con votos; se marca `retirada`.
10. Al finalizar la elección (`finalizada`) no se aceptan más votos ni cambios de opciones.
11. El estado de pago se lee de `member_subscriptions` (SPEC-008); no se recalcula en este módulo.
12. Las plantillas sustituyen `{nombre}`, `{fecha_inicio}`, `{fecha_fin}` al enviar.
13. El diseño (colores, textos, media) no altera el backend de listas: solo la presentación del miembro y la vista previa admin.
14. El calendario público no expone listas, votos ni padrón.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Election` | `elections` | nueva | Un periodo electoral (historial; uno abierto) |
| `ElectionPosition` | `election_positions` | nueva | Cargos de cada lista + flags de campos |
| `ElectionCalendarEvent` | `election_calendar_events` | nueva | 9 hitos con fechas |
| `ElectionList` | `election_lists` | nueva | Lista de candidatos |
| `ElectionCandidate` | `election_candidates` | nueva | Integrante de una lista |
| `ElectionVoter` | `election_voters` | nueva | Padrón (miembro × elección) |
| `ElectionBallot` | `election_ballots` | nueva | Recibo de que el miembro votó |
| `ElectionVote` | `election_votes` | nueva | Opción votada, sin user_id |
| `ElectionMessageTemplate` | `election_message_templates` | nueva | Plantillas de las 6 etapas |
| `ElectionNotice` | `election_notices` | nueva | Aviso de portal para el miembro |
| `ElectionMessageLog` | `election_message_logs` | nueva | Historial de envíos |
| `User` / `member_subscriptions` | existentes | solo lectura | Padrón y estado de pago |

#### Campos — `elections`

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | int | sí | PK | Identificador |
| `title` | varchar(180) | sí | max 180 | Título visible (ej. Elección de la Directiva 2027-2031) |
| `subtitle` | varchar(300) | no | max 300 | Mensaje principal |
| `tagline` | varchar(200) | no | max 200 | Frase institucional |
| `status` | varchar(30) | sí | enum estados | Estado del proceso |
| `voting_starts_on` | date | no | | Inicio de votación |
| `voting_ends_on` | date | no | >= start | Fin de votación |
| `term_starts_on` | date | no | | Inicio de gestión |
| `term_ends_on` | date | no | | Fin de gestión |
| `calendar_public` | bool | sí | default false | Cronograma visible en landing |
| `work_plan_required` | bool | sí | default true | Plan PDF obligatorio para activar lista |
| `photo_required` | bool | sí | default true | Foto de cada integrante |
| `accept_position_required` | bool | sí | default false | Flag de requisito (UI + validación al activar) |
| `list_logo_enabled` | bool | sí | default true | Permite logo de lista |
| `list_color_required` | bool | sí | default true | Color distintivo |
| `backing_document_required` | bool | sí | default false | PDF de respaldo |
| `registration_deadline` | date | no | | Fecha límite de inscripción |
| `max_file_mb` | int | sí | 1–20, default 5 | Tope de archivos |
| `show_work_plan` | bool | sí | default true | Mostrar/descargar plan en portal |
| `show_all_photos` | bool | sí | default true | Fotos de todos los integrantes |
| `show_process_status` | bool | sí | default true | Badge de estado |
| `members_only` | bool | sí | default true | Portal solo para socios (siempre true en práctica) |
| `auto_publish_on_vote_start` | bool | sí | default false | Al iniciar votación, status → en_votacion |
| `publish_from` | date | no | | Visibilidad portal desde |
| `publish_until` | date | no | | Visibilidad portal hasta |
| `logo_url` | varchar(500) | no | | Logo del proceso |
| `banner_url` | varchar(500) | no | | Banner principal |
| `primary_color` | varchar(9) | sí | hex, default #0D47A1 | Color principal |
| `secondary_color` | varchar(9) | sí | hex, default #1976D2 | Color secundario |
| `election_type` | varchar(30) | sí | `lista_completa` / `voto_por_cargos` | Tipo de boleta |
| `one_vote_per_member` | bool | sí | default true | Un voto (siempre true) |
| `secret_vote` | bool | sí | default true | Oculta destinatario del voto |
| `confirm_vote` | bool | sí | default true | Diálogo de confirmación |
| `allow_blank_vote` | bool | sí | default true | Permite voto en blanco |
| `created_at` / `updated_at` | timestamptz | sí | now() | Auditoría |

#### Campos — `election_positions`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | int | sí | PK |
| `election_id` | int | sí | FK |
| `name` | varchar(80) | sí | Presidente, Vicepresidente, … |
| `sort_order` | int | sí | Peso / orden visual (1 = mayor) |
| `is_active` | bool | sí | Si entra en listas y boleta |
| `photo_required` | bool | sí | Foto obligatoria en este cargo |
| `full_name_required` | bool | sí | default true |
| `short_profile_required` | bool | sí | Perfil breve |
| `profession_required` | bool | sí | Profesión |
| `visible_to_members` | bool | sí | Se muestra en portal |

#### Campos — `election_calendar_events`

Hitos fijos (`event_key`): `convocatoria`, `inscripcion_listas`, `revision_listas`, `publicacion_listas`, `campana`, `votacion`, `escrutinio`, `inicio_gestion`, `fin_gestion`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `election_id` | int | FK |
| `event_key` | varchar(40) | Clave fija única por elección |
| `title` | varchar(120) | Etiqueta visible |
| `starts_on` | date | Inicio |
| `ends_on` | date | Fin (nullable para hitos de un día) |
| `sort_order` | int | 1–9 |

#### Campos — `election_lists`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `election_id` | int | FK |
| `name` | varchar(120) | Nombre de la lista |
| `slogan` | varchar(200) | Lema |
| `color` | varchar(9) | Hex |
| `logo_url` | varchar(500) | Logo |
| `description` | text | max 900 |
| `work_plan_url` | varchar(500) | PDF plan de trabajo |
| `work_plan_summary` | text | Resumen/puntos opcionales para la preview |
| `backing_document_url` | varchar(500) | PDF respaldo |
| `status` | varchar(20) | borrador / activa / suspendida / retirada |
| `sort_order` | int | Orden de aparición |

#### Campos — `election_candidates`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `list_id` | int | FK |
| `position_id` | int | FK cargo |
| `full_name` | varchar(160) | Nombre completo |
| `profession` | varchar(160) | Profesión |
| `short_profile` | varchar(280) | Perfil breve |
| `photo_url` | varchar(500) | Foto |
| `sort_order` | int | Orden dentro de la lista |

Un cargo activo no se puede repetir en la misma lista.

#### Campos — `election_voters`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | PK |
| `election_id` | int | FK |
| `user_id` | int | FK users, único por elección |
| `voting_enabled` | bool | Flag admin |
| `notified_at` | timestamptz | Último aviso de habilitación |

El estado de pago y datos del miembro se joinean en lectura (`users` + `member_subscriptions` + ficha de miembro).

#### Campos — `election_ballots` / `election_votes`

| Tabla | Campos | Notas |
|-------|--------|-------|
| `election_ballots` | `id`, `election_id`, `user_id`, `voted_at`, `receipt_hash` | UNIQUE(election_id, user_id) |
| `election_votes` | `id`, `election_id`, `ballot_id`, `list_id` nullable, `position_id` nullable, `is_blank` bool | Sin `user_id`. Si lista completa: una fila. Si por cargos: una fila por cargo. |

#### Índices / Constraints

- `elections`: historial completo. “Vigente” = la no `cerrada`/`finalizada` más reciente. Listar todas para el selector de periodo. UNIQUE parcial no hay en PG simple: se valida en dominio que no existan dos abiertas.
- UNIQUE(`election_id`, `event_key`) en calendario.
- UNIQUE(`election_id`, `sort_order`) no estricto (se reordena en lote).
- UNIQUE(`list_id`, `position_id`) en candidatos.
- UNIQUE(`election_id`, `user_id`) en voters y ballots.
- Índices: `election_voters.user_id`, `election_lists.election_id`, `election_votes.election_id`.

Script SQL: `backend/database/votaciones.sql` (idempotente, mismo patrón que `member_subscriptions.sql`).

### API Endpoints

Prefix: `/api/votaciones`

Auth: `require_access("admin")` en `/admin/*`. `require_access("member")` en `/me/*`. Públicos sin auth.

#### GET /api/votaciones/admin/elections
- **Descripción**: Lista periodos (id, título, fechas, estado) para el selector y la guía.
- **Auth**: admin

#### GET /api/votaciones/admin/election
- **Descripción**: Obtiene (o crea) la elección vigente. Query `?election_id=` para abrir un periodo histórico (solo lectura si está cerrado).
- **Auth**: admin
- **Response 200**: `ElectionAdminResponse` + `guide` (pasos completados) + `is_readonly`

#### POST /api/votaciones/admin/election/close
- **Descripción**: Cierra el periodo vigente (`cerrada` o `finalizada` si hubo votos).
- **Auth**: admin
- **Response 200**: elección cerrada

#### POST /api/votaciones/admin/election/start
- **Descripción**: Crea un periodo nuevo en_preparacion. Exige que no exista otro abierto (409).
- **Auth**: admin
- **Response 201**: nueva elección con cargos/hitos/plantillas semilla

#### PUT /api/votaciones/admin/election
- **Descripción**: Actualiza general, requisitos, diseño, opciones (según pestaña; body parcial).
- **Auth**: admin
- **Response 200**: elección actualizada
- **Response 409**: intento de cambiar reglas con elección en votación/cerrada

#### POST /api/votaciones/admin/election/media
- **Descripción**: Sube logo o banner (`kind=logo|banner`).
- **Auth**: admin
- **Response 200**: `{ "url": "/media/votaciones/..." }`

#### CRUD cargos

- `POST /api/votaciones/admin/positions`
- `PUT /api/votaciones/admin/positions/{id}`
- `PUT /api/votaciones/admin/positions/reorder` — body `{ "ids": [1,2,3] }`
- `DELETE /api/votaciones/admin/positions/{id}` — 409 si está en uso

#### Calendario admin

- `PUT /api/votaciones/admin/calendar` — 9 hitos
- `POST /api/votaciones/admin/calendar/publish` — `{ "public": true|false }`
- `GET /api/votaciones/admin/calendar/download` — PDF

#### Listas admin

- `GET /api/votaciones/admin/lists`
- `POST /api/votaciones/admin/lists`
- `GET /api/votaciones/admin/lists/{id}`
- `PUT /api/votaciones/admin/lists/{id}`
- `DELETE /api/votaciones/admin/lists/{id}` — solo sin votos y no activa con votos
- `POST /api/votaciones/admin/lists/{id}/logo`
- `POST /api/votaciones/admin/lists/{id}/work-plan`
- `POST /api/votaciones/admin/lists/{id}/backing-document`
- `POST /api/votaciones/admin/lists/{id}/candidates` + `PUT/DELETE .../candidates/{candidate_id}`
- `POST /api/votaciones/admin/lists/{id}/candidates/{candidate_id}/photo`

#### Padrón

- `GET /api/votaciones/admin/voters?q=&payment_status=&enabled=&page=&page_size=`
- `PUT /api/votaciones/admin/voters/{user_id}` — `{ "voting_enabled": true }`
- `POST /api/votaciones/admin/voters/sync`
- `GET /api/votaciones/admin/voters/export` — CSV

#### Mensajes

- `PUT /api/votaciones/admin/messages`
- `POST /api/votaciones/admin/messages/test` — `{ "template_key", "email" }`
- `POST /api/votaciones/admin/messages/send` — `{ "template_key" }` dispara a destinatarios (habilitados o todos según key)

#### Reportes

- `GET /api/votaciones/admin/reports?election_id=`
- `GET /api/votaciones/admin/reports/export?election_id=&format=pdf|xlsx`
- `GET /api/votaciones/admin/reports/acta?election_id=` — PDF del acta de ese periodo únicamente

#### Miembro

- `GET /api/votaciones/me` — diseño + listas activas + mi estado (habilitado, ya votó, puede votar)
- `GET /api/votaciones/me/lists/{id}` — detalle
- `GET /api/votaciones/me/notices` — avisos de portal
- `POST /api/votaciones/me/vote` — `{ "list_id": number | null, "is_blank": false, "choices": [{ "position_id", "list_id" }] }`

#### Público

- `GET /api/votaciones/public/calendar`
- `GET /api/votaciones/public/calendar/download`

Errores comunes: 400 validación, 401 sin token, 403 rol, 404 no encontrado, 409 conflicto de estado.

### Diseño Frontend

Seguir mockups adjuntos (admin blanco, cards, tabs azules, preview derecha; miembro hero azul institucional). Reutilizar `DataTable`, `RoleGate`, tokens de `globals.css` (`--primary`, `--surface`, `--line`). Añadir bloque `.votaciones-*` en `globals.css` para hero, cronograma, boleta, reportes y editor de lista.

#### Páginas nuevas

| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Redirect admin | `page.tsx` | `/admin/votaciones` → `/admin/votaciones/listas` | admin |
| Listas | `admin-elections-page.tsx` | `/admin/votaciones/listas` | admin |
| Editor lista | `admin-list-editor-page.tsx` | `/admin/votaciones/listas/[id]` | admin |
| Calendario | `admin-elections-page.tsx` | `/admin/votaciones/calendario` | admin |
| Configuración | `admin-elections-page.tsx` | `/admin/votaciones/configuracion` | admin |
| Votantes | `admin-elections-page.tsx` | `/admin/votaciones/votantes` | admin |
| Reportes | `admin-elections-page.tsx` | `/admin/votaciones/reportes` | admin |
| Portal miembro | `member-elections-page.tsx` | `/mi-espacio/votaciones` | member |
| Detalle lista | `member-list-detail-page.tsx` | `/mi-espacio/votaciones/listas/[id]` | member |
| Calendario público | `public-election-calendar-page.tsx` | `/calendario-electoral` | no |

Las rutas Next son thin pages que importan el módulo. El admin usa un grupo de menú lateral con submódulos (como Administración → Listas / Padrones / Resultados), no pestañas internas para las 5 secciones. Configuración sí conserva subpestañas (general, cargos, diseño, opciones, mensajería).

Navegación (fuente: `rbac.py`):

- Admin: grupo `{ label: "Votaciones", href: "/admin/votaciones", children: [listas, calendario, configuración, votantes, reportes] }`
- Member: `{ label: "Votaciones", href: "/mi-espacio/votaciones" }`

Icono `navIconForHref`: `vote` / `checkSquare` para esas rutas.

#### Componentes nuevos

| Componente | Descripción |
|------------|-------------|
| `ElectionsSetupGuide` | Checklist “Por dónde empezar” con 7 pasos y progreso |
| `ElectionPeriodSwitcher` | Selector de periodo + cerrar / iniciar nuevo |
| `ElectionsAdminTabs` | Tabs de las 5 secciones admin + chips de periodo/estado |
| `ElectionListCard` | Card de lista en el listado admin (miembros + preview PDF) |
| `CandidateEditorTable` | Tabla de integrantes con cargo, foto, profesión, perfil |
| `ListMemberPreview` | Preview derecha del editor (mockup 1) |
| `WorkPlanPreview` | iframe/object del PDF + fallback de descarga |
| `CalendarTimeline` | 9 hitos + mini calendario + acciones publicar/descargar |
| `PositionsRequirementsPanel` | Tabla de cargos + requisitos (mockup 3) |
| `ElectionDesignPanel` | Formulario de identidad + preview desktop/móvil |
| `VotingOptionsPanel` | Tipo + reglas (sin modalidad) + preview de boleta |
| `ElectionMessagesPanel` | 6 plantillas + preview de mensaje |
| `VotersTable` | Padrón con toggle y KPIs |
| `ReportsDashboard` | KPIs, barras, dona, tabla, timeline, exports |
| `MemberElectionHero` | Hero del portal con CSS variables del diseño |
| `MemberListGrid` | Tarjetas de listas sin preselección |
| `VoteConfirmModal` | Confirmación de voto |
| `BallotPreview` | Boleta miembro / preview admin |

#### Hooks y State

| Hook | Retorna |
|------|---------|
| `useAdminElection` | elección, saveGeneral, saveRequirements, saveDesign, saveOptions, saveMessages, uploadMedia |
| `useAdminLists` | lists, create, update, remove, upload assets |
| `useAdminCalendar` | events, save, publish, download |
| `useAdminVoters` | items, kpis, toggle, sync, export, filtros |
| `useAdminReports` | snapshot, exportPdf, exportExcel, acta |
| `useMemberElection` | portal, detail, vote, notices |

#### Services

`frontend/src/modules/votaciones/infrastructure/elections-api.ts` — una función por endpoint.

### Arquitectura y Dependencias

- Paquetes nuevos backend: `reportlab` (PDF cronograma/reportes/acta) si no está; CSV con stdlib. Excel: CSV es aceptable si no existe openpyxl; si se añade, usarlo solo en infrastructure.
- Frontend: gráficos con CSS/SVG propios (barras + dona) para no añadir Chart.js salvo que ya exista. Preferir SVG ligero.
- Storage: `storage/votaciones/` montado en `/media/votaciones` en `main.py`.
- Email: reutilizar `SmtpOrLogEmailSender`.
- Suscripción: leer `member_subscriptions` vía port `ElectionPaymentsReader` (no importar el repositorio de payments). El adapter SQL hace el JOIN.
- Impacto: registrar router en `main.py`; nav en `rbac.py`; icono en `social-links.ts`; bloque calendario en landing (`public-landing-page` / overview) si `calendar_public`.

### Notas de Implementación

> Arquitectura hexagonal obligatoria: `domain` → `application` (ports + use cases) → `infrastructure` (SQL crudo + files + pdf + email) → `presentation/api`. Sin SQLAlchemy ORM.
> Sembrar la elección vigente con 7 cargos por defecto (Presidente … Tercer vocal) y los 9 hitos vacíos/fecha de hoy, más las 6 plantillas, en el use case `GetOrCreateElection`.
> El preview de diseño del admin es 100% frontend (estado local); el portal miembro lee el backend.
> Validar requisitos de lista solo al pasar a `activa`, no en cada guardado de borrador.
> Tests backend con fakes in-memory + TestClient. No hay suite frontend en el repo: implementar UI y verificar en navegador.
> Activar venv (`source .venv/bin/activate`) para pytest y scripts SQL.

---

## 3. LISTA DE TAREAS

> Checklist accionable. Marcar cada ítem (`[x]`) al completarlo.

### Backend

#### Implementación
- [ ] Crear `backend/database/votaciones.sql` con todas las tablas e índices
- [ ] Crear módulo `backend/app/modules/votaciones/` (domain, application, infrastructure, presentation)
- [ ] Entidades, value objects, excepciones y reglas de voto/padrón/requisitos
- [ ] Ports: `ElectionsRepository`, `ElectionFileStorage`, `ElectionPdfGenerator`, `ElectionNotifier`, `ElectionPaymentsReader`
- [ ] Use cases: get-or-create election, update settings, positions, calendar, lists/candidates, voters sync/toggle, vote, reports, messages, public calendar
- [ ] `SqlAlchemyElectionsRepository` con SQL crudo
- [ ] Storage local de media + PDFs (cronograma, reportes, acta)
- [ ] Router `/api/votaciones` + schemas + dependencies
- [ ] Registrar router y `/media/votaciones` en `main.py`
- [ ] Agregar ítems de navegación admin y member en `rbac.py`

#### Tests Backend
- [ ] Dominio: validar requisitos de lista, periodo de votación, un voto, voto en blanco
- [ ] Use case voto: happy path, no habilitado, fuera de periodo, doble voto
- [ ] Use case padrón: sync default según suscripción al_dia/gracia
- [ ] Use case calendario público: no filtra fechas si no es público
- [ ] Router: 403 miembro en admin, 201/200 lista, 409 reglas en votación

### Frontend

#### Implementación
- [ ] Módulo `frontend/src/modules/votaciones/` (types, api, hooks, pages, components, modals)
- [ ] Thin routes admin, member y `/calendario-electoral`
- [ ] Tabs admin + páginas de listas, editor, calendario, configuración (4 pestañas), votantes, reportes
- [ ] Portal miembro + detalle de lista + modal de voto
- [ ] Estilos `.votaciones-*` según mockups
- [ ] Icono de nav y bloque de calendario en landing si está público
- [ ] Barrel `index.ts` y `RoleGate` en cada page protegida

#### Tests Frontend
- [ ] Verificar en navegador: CRUD de lista, preview de plan, calendario publicar/ocultar, config de cargos/diseño/opciones/mensajes, toggle de votantes, voto miembro, reportes
- [ ] Verificar viewport desktop de las pantallas tocadas (los mockups son desktop)

### QA
- [ ] Cubrir criterios CRITERIO-1.1 a 11.1
- [ ] Validar reglas de negocio 1–14
- [ ] Actualizar estado spec: `status: IMPLEMENTED`
