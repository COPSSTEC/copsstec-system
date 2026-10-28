# Catálogo CIIU de Cotiza SST

`ciiu.json` es un artefacto versionado generado desde
`/Users/gabrieltates/Downloads/c_i_u_u_s_rows.csv` el 28 de octubre de 2026
mediante `backend/scripts/import_ciiu_catalog.py`.

- Incluye las 6.360 filas con `estado = activo`.
- Cada registro expone únicamente `code`, `description` y `risk`.
- Los riesgos se normalizan a `Bajo`, `Medio` y `Alto`.
- Las 756 filas sin `nivel_riesgo` se conservan como `no_definido` para
  trazabilidad, pero se excluyen de `GET /api/sst-calculator/catalog` y no son
  seleccionables para cotizar.
- Las descripciones se conservan completas, incluyendo Unicode y puntuación.
