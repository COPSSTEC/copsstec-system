---
name: asdd-orchestrate
description: Orquesta el flujo ASDD completo. Fase 1 (Spec) → Fase 2 (Backend ∥ Frontend) → Fase 3 (Tests ∥) → Fase 4 (QA).
argument-hint: "<nombre-feature> | status"
---

# ASDD Orchestrate

## Flujo

```
[FASE 1 — SECUENCIAL]
  spec-generator → .github/specs/<feature>.spec.md  (DRAFT → APPROVED)

[FASE 2 — PARALELO ∥]
  backend-developer  ∥  frontend-developer  ∥  database-agent (si hay modelos nuevos)

```

## Proceso
1. Busca `.github/specs/<feature>.spec.md`
   - No existe → ejecuta `/generate-spec` y espera
   - `DRAFT` → pide aprobación al usuario
   - `APPROVED` → actualiza a `IN_PROGRESS` y continúa
2. Lanza Fase 2 en paralelo (Task backend + Task frontend + Task database si aplica)
5. Actualiza spec a `IMPLEMENTED` y reporta estado final

## Comando status
Al recibir `status`: lista specs en `.github/specs/` con su estado y próxima acción pendiente.

## Reglas
- Sin spec `APPROVED` → no hay código — sin excepciones
- No implementar directamente — solo coordinar y delegar
- Si una fase falla → detener el flujo y notificar al usuario con contexto
- Fase 5 (doc) solo si el usuario la solicita explícitamente
