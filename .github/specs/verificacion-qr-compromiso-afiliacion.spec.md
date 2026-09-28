---
id: SPEC-022
status: IMPLEMENTED
feature: verificacion-qr-compromiso-afiliacion
created: 2026-09-28
updated: 2026-09-28
author: spec-generator
version: "1.0"
related-specs: ["SPEC-018", "SPEC-021"]
---

# Spec: Verificación pública del QR del compromiso

> **Estado:** `IMPLEMENTED`

## Requerimiento
El QR del PDF de compromiso debe abrir una página pública que muestre los datos de emisión y demuestre la autenticidad del archivo.

## Comportamiento
1. El QR contiene `{FRONTEND_ORIGIN}/verificar-compromiso/{hash SHA-256}`.
2. La página pública consulta `GET /api/membership/commitment-verify/{hash}` sin sesión.
3. Si el hash existe, muestra socio, cédula, correo, teléfono, número de socio, código, fechas de emisión y período, modalidad, versión, estado y hash.
4. Si no existe, indica que el documento no es válido.
5. La primera emisión se guarda; descargas posteriores reutilizan la misma fecha y hash para que el QR siga funcionando.
