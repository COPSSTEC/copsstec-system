---
id: SPEC-023
status: IMPLEMENTED
feature: export-plantilla-cobros-miembros
created: 2026-10-12
updated: 2026-10-12
author: spec-generator
version: "1.0"
related-specs: ["SPEC-004", "SPEC-012", "SPEC-020"]
---

# Spec: Exportar plantilla de cobros desde Miembros

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
El administrador descarga desde `/admin/miembros` un Excel `.xlsx` con el diseño de la Plantilla Cobros de CASH (Cooperativa Alianza del Valle). Incluye solo a quienes tienen autorización de débito firmada y cédula subida, con la cuenta bancaria y el monto del plan de débito que registraron en el onboarding.

### Requerimiento de Negocio
Dentro del módulo de miembros, permitir descargar un Excel con todas las personas que tengan el documento firmado de débito y enviada la cédula. El archivo debe parecerse completamente a `Plantilla Cobros.xls`. Los miembros, al registrarse, guardan datos de cuenta y el monto a debitar según el plan (mensual $10, trimestral $30, semestral $60, anual $120). CONTRAPARTIDA va vacía y REFERENCIA es `MEMBRESIA COPSSTEC`.

### Historias de Usuario

#### HU-01: Descargar plantilla de cobros

```
Como:        Administrador
Quiero:      Descargar un Excel con quienes ya firmaron el débito y enviaron la cédula
Para:        Cargar los cobros en CASH con cuenta, banco y monto de cada socio

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-004, SPEC-012, SPEC-020
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: descarga con filas elegibles
  Dado que:  hay miembros con signed_authorization_path e identity_document_path no vacíos
  Cuando:    el admin pulsa "Descargar plantilla de cobros" en /admin/miembros
  Entonces:  descarga Plantilla_Cobros_COPSSTEC_YYYY-MM-DD.xlsx
             con hoja Cobros (títulos CASH, totales, 13 columnas) y hoja oculta bd
             y una fila por cada elegible desde la fila 8
```

**Error Path**
```gherkin
CRITERIO-1.2: acceso denegado a no admin
  Dado que:  un usuario autenticado no tiene rol admin
  Cuando:    llama GET /api/members/export/cobros
  Entonces:  el backend responde 403
```

**Edge Case**
```gherkin
CRITERIO-1.3: plantilla vacía
  Dado que:  ningún miembro tiene ambos documentos
  Cuando:    el admin descarga la plantilla
  Entonces:  recibe el Excel con encabezados, TOTAL REGISTROS 0 y MONTO TOTAL 0
             sin filas de datos
```

#### HU-02: Mapear datos bancarios y monto

```
Como:        Administrador
Quiero:      Que cada fila lleve banco, tipo/número de cuenta y el monto del plan
Para:        Que CASH debite el valor que el socio autorizó

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Backend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: columnas CASH pobladas
  Dado que:  un elegible tiene Banco Pichincha, Ahorros, plan monthly
  Cuando:    se genera el Excel
  Entonces:  TIPO DE IDENTIFICACIÓN es C
             IDENTIFICACIÓN es la cédula en texto
             NOMBRE es names + lastname
             INSTITUCIÓN es BANCO PICHINCHA, CÓDIGO 10
             TIPO CUENTA es AHORROS, CÓDIGO CUENTA 02
             CONTRAPARTIDA está vacía
             REFERENCIA es MEMBRESIA COPSSTEC
             MONTO es 10.00
```

**Edge Case**
```gherkin
CRITERIO-2.2: banco desconocido o plan vacío
  Dado que:  el banco no está en el catálogo CASH o no hay member_debit_plan
  Cuando:    se genera la fila
  Entonces:  se escribe el nombre de banco guardado, CÓDIGO y TIPO INSTITUCIÓN vacíos
             y MONTO es 0 si falta el plan
```

### Reglas de Negocio
1. Solo el rol `admin` puede descargar. El endpoint no respeta filtros de la grilla.
2. Inclusión: `membership_payments.signed_authorization_path` y `identity_document_path` no vacíos. No se exige solicitud ni estado HABILITADO. No se usan acuerdos de renovación.
3. Montos: monthly 10.00, quarterly 30.00, semiannual 60.00, annual 120.00; plan ausente → 0.
4. CONTRAPARTIDA vacía. REFERENCIA fija `MEMBRESIA COPSSTEC`.
5. Bancos del wizard se normalizan al nombre y código oficial CASH. Cuenta Ahorros → 02, Corriente → 01.
6. Sin migración. Los datos ya existen en `profiles` y `membership_payments`.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `MemberCobrosRow` | derivado | nueva (solo dominio) | Fila de export: identidad + cuenta + plan |
| `membership_payments` | tabla existente | ninguno | Fuente ADV, cédula, banco y plan |
| `profiles` / `users` | tablas existentes | ninguno | Nombre, cédula, correo |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `identifier` | string | sí | texto | Cédula |
| `names` | string | sí | — | Nombres |
| `lastname` | string | sí | — | Apellidos |
| `email` | string | sí | — | Correo perfil o login |
| `member_bank_name` | string | no | — | Banco del onboarding |
| `member_account_type` | string | no | Corriente / Ahorros | Tipo de cuenta |
| `member_account_number` | string | no | texto | Número de cuenta |
| `member_debit_plan` | string | no | monthly / quarterly / semiannual / annual | Plan de débito |

#### Índices / Constraints
- Sin índices nuevos. El filtro usa paths ya leídos en el listado de miembros.

### API Endpoints

#### GET /api/members/export/cobros
- **Descripción**: Genera el Excel de cobros CASH con todos los elegibles
- **Auth requerida**: sí, `require_access("admin")`
- **Request Body**: ninguno
- **Response 200**: archivo `.xlsx` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
  - `Content-Disposition: attachment; filename="Plantilla_Cobros_COPSSTEC_YYYY-MM-DD.xlsx"`
- **Response 401**: token ausente o expirado
- **Response 403**: el usuario no es admin

La ruta estática se registra **antes** de `GET /{member_id}`.

### Diseño Frontend

#### Componentes nuevos
Ninguno. Se reutiliza la cabecera de `MembersPage`.

#### Páginas nuevas
Ninguna. Se modifica `/admin/miembros`.

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| estado local | `members-page.tsx` | `isDownloadingCobros` | Loading del botón de export |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `downloadMembersCobrosExport(token)` | `members-api.ts` | `GET /api/members/export/cobros` |

### Arquitectura y Dependencias
- Paquetes nuevos: `openpyxl` en backend
- Servicios externos: ninguno
- Impacto en punto de entrada: el router `/api/members` ya está registrado

### Notas de Implementación
> Recrear el layout de `Plantilla Cobros.xls` (títulos, totales, 13 columnas, formatos, anchos, hoja `bd` oculta). No copiar macros ni las ~30k filas placeholder.
> Mapeo wizard → CASH: Pichincha 10, Guayaquil 17, Pacífico 30, Produbanco 36, Internacional 32, Bolivariano 37, Machala 25, Rumiñahui 42, Austro 35, Solidario 59, JEP 213, Policía Nacional 9997.
> El frontend no tiene runner de tests; la cobertura de mapeo y permisos va en pytest.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Crear `MemberCobrosRow` y método `list_cobros_export_rows` en puerto/repositorio
- [x] Implementar generador `cobros_excel.py` (estilos CASH, catálogo bancos, montos)
- [x] Implementar `ExportMembersCobrosUseCase`
- [x] Registrar `GET /api/members/export/cobros` (antes de `/{member_id}`)
- [x] Añadir `openpyxl` a `requirements.txt`

#### Tests Backend
- [x] `test_cobros_excel_maps_pichincha_ahorros_monthly`
- [x] `test_cobros_excel_skips_unknown_bank_and_empty_plan`
- [x] `test_export_use_case_totals_and_empty_workbook`
- [x] `test_export_cobros_forbidden_for_member`
- [x] `test_export_cobros_returns_xlsx_for_admin`

### Frontend

#### Implementación
- [x] Añadir `downloadMembersCobrosExport` en `members-api.ts`
- [x] Botón "Descargar plantilla de cobros" en la cabecera de `MembersPage`
- [x] Loading y error de descarga; no depende de filtros de tabla

#### Tests Frontend
- [x] Cubierto por tests backend del endpoint (no hay runner FE)

### QA
- [x] Revisar cobertura de tests contra criterios de aceptación
- [x] Validar que todas las reglas de negocio están cubiertas
- [x] Actualizar estado spec: `status: IMPLEMENTED`
