---
id: SPEC-021
status: IMPLEMENTED
feature: correo-compromiso-afiliacion
created: 2026-09-28
updated: 2026-09-28
author: spec-generator
version: "1.0"
related-specs: ["SPEC-010", "SPEC-018"]
---

# Spec: Correo del compromiso de afiliación

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Cuando el aspirante termina de subir los documentos y espera la aprobación, recibe en el correo con el que se registró el PDF de compromiso de afiliación (el mismo que puede descargar en `/afiliacion/en-revision`).

### Requerimiento de Negocio
En la pantalla de espera de aprobación, además de descargar el compromiso, enviarlo adjunto al correo de registro.

### Historias de Usuario

#### HU-01: Envío del PDF al correo personal

```
Como:        Aspirante en revisión
Quiero:      Recibir el compromiso de afiliación en el correo con el que me registré
Para:        Conservarlo aunque el navegador no descargue el archivo

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-010, PDF de compromiso
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

```gherkin
CRITERIO-1.1: envío al completar documentos
  Dado que:  acabo de completar autorización, cédula, solicitud y el año
  Cuando:    el backend confirma los documentos
  Entonces:  se envía un correo HTML al email de registro con el PDF adjunto
```

```gherkin
CRITERIO-1.2: reintento al descargar
  Dado que:  el correo no se envió todavía
  Cuando:    descargo o se auto-descarga el compromiso
  Entonces:  se intenta el envío una vez
```

```gherkin
CRITERIO-1.3: sin duplicados
  Dado que:  el correo ya se envió
  Cuando:    vuelvo a descargar el PDF
  Entonces:  no se reenvía
```

```gherkin
CRITERIO-1.4: SMTP fallido
  Dado que:  Mailtrap rechaza el envío
  Cuando:    se genera el compromiso
  Entonces:  la descarga sigue; el error queda en log; se reintenta en la siguiente descarga
```

### Reglas de Negocio
1. Destinatario: `profiles.email` (correo de registro). Si falta, `users.email`.
2. El PDF es el mismo de `GET /api/membership/compromiso-pdf`.
3. El envío no bloquea la subida ni la descarga.
4. Idempotencia con un flag en storage del miembro.

---

## 2. DISEÑO

Plantilla `affiliation_commitment`. Adjunto `compromiso-afiliacion-copsstec.pdf`.
Flag `storage/membership/{user_id}/commitment-emailed.flag`.
