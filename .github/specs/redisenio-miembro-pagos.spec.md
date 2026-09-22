---
id: SPEC-015
status: IN_PROGRESS
feature: redisenio-miembro-pagos
created: 2026-09-22
updated: 2026-09-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-008", "SPEC-011"]
---

# Spec: Rediseño de Mis pagos (vista miembro)

> **Estado:** `IN_PROGRESS`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Rediseñar `/mi-espacio/pagos` para un workspace de listado + panel derecho de detalle, con KPIs de membresía, pestañas, búsqueda y filtro por concepto. El miembro ve el detalle de cada pago y puede descargar, imprimir o compartir el comprobante.

### Requerimiento de Negocio
El miembro necesita consultar su cobertura y sus pagos con la misma lógica de SPEC-008, pero con la UI de la captura: tarjetas de estado, listado seleccionable y ficha a la derecha. Debe poder ver el detalle y descargar los comprobantes. Se conserva la renovación con voucher.

### Historias de Usuario

#### HU-01: Workspace con panel derecho

```
Como:        Miembro
Quiero:      Ver mis pagos en una lista y abrir el detalle a la derecha
Para:        Revisar monto, estado, fecha y comprobante sin un modal que tape el listado
```

```gherkin
CRITERIO-1.1: selección
  Dado que:  tengo pagos en /mi-espacio/pagos
  Cuando:    elijo una fila o Ver detalle
  Entonces:  el panel derecho muestra concepto, monto, estado, fecha,
             forma de pago, número de comprobante, periodo (si aplica)
             y observaciones
```

```gherkin
CRITERIO-1.2: filtros
  Dado que:  existen pagos en distintos estados y tipos
  Cuando:    uso Todos, Pendientes, Pagados, Historial, buscador o concepto
  Entonces:  solo se listan los pagos que coinciden
```

#### HU-02: Comprobante y renovación

```
Como:        Miembro
Quiero:      Descargar o imprimir el comprobante, y seguir pagando la cuota si debo
Para:        Conservar el recibo y renovar sin perder el flujo actual
```

```gherkin
CRITERIO-2.1: descarga
  Dado que:  el pago tiene voucher o está aprobado
  Cuando:    pulso Descargar comprobante
  Entonces:  se descarga el voucher si existe, o se genera el recibo oficial
```

```gherkin
CRITERIO-2.2: renovación
  Dado que:  debo una cuota o hay un pago abierto
  Cuando:    abro Mis pagos
  Entonces:  sigo pudiendo pagar la cuota y subir el comprobante
```

---

## 2. DISEÑO

- Referencia visual: captura de Mis pagos con KPIs, listado y panel derecho.
- Paleta e iconos stroke actuales (azul, verde, grises).
- Sin cambios de API ni de base de datos.
- Reutiliza `GET /api/payments/me`, voucher en `/media/payments` y el modal de renovación de SPEC-008.

---

## 3. ALCANCE

### Incluye
- Página miembro, KPIs, filas, panel, filtros, paginación, recibo e impresión.
- Acciones existentes: elegir plan y subir voucher.

### Excluye
- Cambios de backend, PDF server-side o rediseño del módulo admin de pagos.
