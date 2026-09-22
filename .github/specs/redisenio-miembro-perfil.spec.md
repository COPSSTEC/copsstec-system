---
id: SPEC-016
status: IMPLEMENTED
feature: redisenio-miembro-perfil
created: 2026-09-22
updated: 2026-09-22
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-006", "SPEC-008"]
---

# Spec: Rediseño de Mi perfil, documentos y verificación pública

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Rediseñar `/profile` para que el miembro vea su ficha, una preview de la credencial y pueda descargar el carnet y el certificado de afiliación. Ambos PDFs usan plantillas oficiales, incluyen un QR y, al escanearlo, abren una página pública con la foto y los datos del miembro.

### Requerimiento de Negocio
En Mi perfil el miembro descarga su carnet y su certificado de afiliación, y puede editar su perfil. El certificado usa de fondo `certificado.png`. El carnet usa la plantilla azul. El QR de ambos documentos lleva a una página pública del sistema con la foto y los datos del perfil.

### Historias de Usuario

#### HU-01: Workspace de Mi perfil

```
Como:        Miembro
Quiero:      Ver mi ficha, credencial y documentos en /profile
Para:        Consultar y actualizar mis datos sin salir del espacio de miembro
```

```gherkin
CRITERIO-1.1: ficha
  Dado que:  tengo perfil asociado
  Cuando:    abro /profile
  Entonces:  veo foto, nombre, estado, número, fecha de ingreso,
             preview de credencial, descargas y las secciones
             personal, contacto y académica
```

```gherkin
CRITERIO-1.2: edición
  Dado que:  estoy en /profile
  Cuando:    edito una sección o cambio la foto
  Entonces:  se guardan solo mis datos de perfil y recargo la ficha
```

#### HU-02: Documentos con plantilla y QR

```
Como:        Miembro
Quiero:      Descargar certificado y carnet con mis datos y un QR
Para:        Acreditar mi afiliación y que cualquiera pueda verificarla
```

```gherkin
CRITERIO-2.1: certificado
  Dado que:  descargo el certificado de afiliación
  Cuando:    abro el PDF
  Entonces:  el fondo es certificado.png y aparecen nombre,
             cédula, fecha de registro, código 2842018-{cod} y QR
```

```gherkin
CRITERIO-2.2: carnet
  Dado que:  descargo el carnet
  Cuando:    abro el PDF
  Entonces:  usa la plantilla azul y muestra foto, nombre,
             tipo de sangre, estado, código y el mismo QR
```

```gherkin
CRITERIO-2.3: verificación pública
  Dado que:  alguien escanea el QR
  Cuando:    abre /perfil/{profile_id}
  Entonces:  ve la plantilla pública con foto, nombre, cédula,
             título, teléfono, correo, provincia y estado
```

### Reglas de Negocio
1. El QR apunta a `{FRONTEND_ORIGIN}/perfil/{profile_id}`.
2. La página pública no pide login y solo expone datos de verificación.
3. El miembro edita su propio perfil; no cambia correo de login ni estado.
4. Admin sigue descargando los mismos PDFs reales desde Miembros.
5. Código impreso: `2842018-{profiles.cod}`.

---

## 2. DISEÑO

### API
| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| PATCH | `/api/profile/me` | sí | Actualizar perfil propio |
| POST | `/api/profile/me/photo` | sí | Foto de perfil |
| GET | `/api/profile/me/certificate` | sí | Certificado propio |
| GET | `/api/profile/me/carnet` | sí | Carnet propio |
| GET | `/api/members/{id}/certificate` | admin | Certificado admin |
| GET | `/api/members/{id}/download` | admin | Carnet admin |
| GET | `/api/public/members/{profile_id}` | no | Datos de verificación |
| GET | `/api/public/members/{profile_id}/qr` | no | PNG del QR |

### Frontend
- `/profile` — rediseño de Mi perfil
- `/perfil/[profile_id]` — verificación pública
- Componentes: hero, credencial, documentos, secciones editables, diálogo de edición

### Assets
- `certificado.png` — fondo del certificado
- `carnet.png` — fondo azul del carnet
- `verificacion.png` — fondo de la página pública
- `Cookie-Regular.ttf` — nombre en el certificado

---

## 3. LISTA DE TAREAS

### Backend
- [x] Plantillas y generador PDF (certificado + carnet + QR)
- [x] Endpoints de perfil propio y públicos
- [x] Completar descarga admin de certificado
- [x] Tests de PDF y perfil público

### Frontend
- [x] Rediseño de `/profile` con edición y descargas
- [x] Página pública `/perfil/[profile_id]`
- [x] Estilos alineados al resto del espacio de miembro
