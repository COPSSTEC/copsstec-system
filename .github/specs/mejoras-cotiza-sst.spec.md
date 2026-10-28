---
id: SPEC-025
status: DRAFT
feature: mejoras-cotiza-sst
created: 2026-10-28
updated: 2026-10-28
author: spec-generator
version: "1.0"
related-specs: ["SPEC-024"]
---

# Spec: Mejoras de propuesta y catálogo CIIU de Cotiza SST

> **Estado:** `DRAFT`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

## 1. OBJETIVO Y ALCANCE

Actualizar la experiencia del módulo **Cotiza SST** para que la propuesta impresa represente claramente al profesional o empresa que la emite, identifique institucionalmente a COPSSTEC en la zona inferior y presente la validación QR en lenguaje comprensible para una persona usuaria. Además, sustituir el catálogo CIIU actualmente resumido por el CSV entregado, conservando la búsqueda por código/descripción y permitiendo consultar las opciones con sus descripciones completas.

### Incluye

- Reordenar los logotipos únicamente en la propuesta imprimible/previsualizada:
  - logo cargado por el profesional o empresa en el encabezado superior;
  - logo institucional COPSSTEC en el bloque inferior donde actualmente se muestra el logo del emisor.
- Mantener la firma del emisor en su bloque actual, salvo los ajustes de composición necesarios para el nuevo encabezado/pie.
- Reemplazar la huella técnica completa (`SHA-256: <hex>`) visible en el bloque QR por un identificador genérico legible, en negrilla, y un texto explicativo sobre el escaneo del QR para validar la autenticidad del documento.
- Incorporar el archivo `/Users/gabrieltates/Downloads/c_i_u_u_s_rows.csv` como fuente del catálogo CIIU.
- Mostrar en el selector/buscador el código, riesgo y descripción completa de las coincidencias, sin truncamiento visual ni transformación que elimine información.
- Conservar la normalización de búsqueda por mayúsculas/minúsculas y tildes, la selección de una actividad y la compatibilidad del objeto `CiiuActivity` con el cálculo normativo.
- Añadir pruebas de dominio, componente y estilos de impresión que cubran estos cambios.

### Fuera de alcance

- Cambiar las fórmulas de dimensionamiento, costos, márgenes, QR, hash interno o reglas de elegibilidad.
- Convertir el QR en firma electrónica certificada o crear un servicio externo de validación.
- Crear historial, persistencia de cotizaciones, tablas nuevas o migraciones de base de datos.
- Modificar el contenido contractual o legal de la propuesta más allá del texto específico de validación QR.
- Mantener una descripción abreviada como sustituto de la descripción completa en el catálogo.

## 2. REQUERIMIENTOS FUNCIONALES

### RF-01: Logo del emisor en el encabezado

Cuando el usuario cargue un logo PNG, JPEG o WebP válido en los datos de emisión, la propuesta debe renderizar ese logo en el encabezado superior, visualmente asociado con los datos del profesional/empresa emisor. El logo no debe permanecer en el pie inferior.

Si el usuario no carga logo, el encabezado debe conservar una composición válida sin imagen vacía, sin romper la tabla ni desplazar de forma inesperada los datos de código, versión y fecha.

### RF-02: Logo institucional COPSSTEC en el bloque inferior

El bloque inferior de la propuesta debe mostrar el logo institucional de COPSSTEC en el lugar donde actualmente se muestra el logo del emisor. Debe utilizar el recurso institucional existente (`BRAND_MEDIA.logoLong` o equivalente oficial), no una copia nueva ni el logo PROTEGE SST.

El pie debe continuar mostrando el texto institucional/comercial vigente y diferenciar que COPSSTEC no es parte contratante. El logo institucional debe aparecer tanto en la vista previa como en impresión/PDF, respetando proporciones y límites de tamaño.

### RF-03: Mensaje QR legible para usuario

La sección de validación debe conservar el QR local y su contenido técnico interno, pero no debe imprimir el hash hexadecimal completo ni el prefijo técnico `SHA-256:` en el documento visible.

En su lugar, debe presentar:

- un código genérico derivado de la referencia de la propuesta, por ejemplo `Código de validación: COPS-...`, en negrilla y con contraste suficiente;
- un mensaje claro, en español, equivalente a: **“Escanea el código QR para validar la autenticidad de este documento.”**;
- una nota breve que indique que la validación QR es informativa y no constituye firma electrónica certificada, manteniendo la advertencia legal existente.

El valor completo de la huella puede seguir utilizándose internamente para construir el payload o realizar pruebas, pero no debe quedar visible en la propuesta impresa ni en texto accesible de la sección QR.

### RF-04: Catálogo CIIU completo desde CSV

El catálogo CIIU debe derivarse del CSV adjunto con estas columnas de origen:

| Campo CSV | Uso |
|---|---|
| `codigo` | `CiiuActivity.code` |
| `descripcion` | `CiiuActivity.description` |
| `nivel_riesgo` | `CiiuActivity.risk`, normalizado a `Bajo`, `Medio` o `Alto` |
| `estado` | Filtro de registros activos |
| `id` | Identidad/diagnóstico del registro; no se muestra como código CIIU |

El archivo observado contiene 6.360 filas de datos, todas con `estado = activo`, 6.360 códigos únicos, 2.235 registros `Riesgo Bajo`, 2.522 `Riesgo Medio`, 847 `Riesgo Alto` y 756 filas sin nivel de riesgo. La estrategia debe definir explícitamente cómo se tratan estas 756 filas antes de exponerlas al cálculo, sin asignar un riesgo inventado.

La descripción debe conservarse completa, incluyendo signos, paréntesis, acentos y texto largo. El catálogo no debe tomar `sector_economico`, fechas ni campos de auditoría como sustitutos de la descripción.

### RF-05: Selector/búsqueda CIIU sin truncar opciones

La búsqueda debe comparar el código y la descripción completa, ignorando mayúsculas, minúsculas, tildes y espacios extremos. El resultado debe mostrar como mínimo:

- código CIIU completo;
- nivel de riesgo cuando exista;
- descripción completa, con envoltura de línea (`wrap`) o expansión vertical.

El límite de resultados puede mantenerse para rendimiento, pero no debe confundirse con truncar el texto de cada opción. Si se conserva el límite actual de 35 coincidencias y 20 sugerencias iniciales, la interfaz debe indicarlo o proporcionar un mecanismo claro para continuar buscando. No se debe cortar una descripción con `...`, `text-overflow`, una altura fija o un `slice` de caracteres.

Las actividades sin riesgo válido deben tratarse como datos no clasificables: pueden mostrarse como `Riesgo no definido` si el flujo permite seleccionarlas sin romper las reglas, o excluirse del catálogo seleccionable con una explicación y una métrica de descarte. La decisión final debe quedar cubierta por pruebas y no convertir el vacío en `Alto`, `Medio` o `Bajo` por defecto.

## 3. CRITERIOS DE ACEPTACIÓN

### CA-01: Reubicación de logos

```gherkin
Escenario: propuesta con logo cargado por el emisor
  Dado que el usuario cargó un logo válido del profesional o empresa
  Cuando abre la vista previa de la propuesta
  Entonces el logo del emisor aparece en el encabezado superior
  Y el logo del emisor no aparece en el bloque inferior
  Y el logo institucional COPSSTEC aparece en el bloque inferior
```

```gherkin
Escenario: propuesta sin logo del emisor
  Dado que el usuario no cargó un logo del profesional o empresa
  Cuando abre o imprime la propuesta
  Entonces el encabezado no muestra una imagen rota o un espacio reservado vacío
  Y el logo institucional COPSSTEC sigue apareciendo en el bloque inferior
  Y la información del encabezado conserva una composición legible
```

```gherkin
Escenario: impresión de logos en A4
  Dado que la vista previa contiene ambos logos
  Cuando el usuario selecciona Guardar PDF / Imprimir
  Entonces el emisor se visualiza en el encabezado de la hoja
  Y COPSSTEC se visualiza en el pie/bloque inferior
  Y ninguno de los dos logos se corta, deforma o queda fuera del área imprimible
```

### CA-02: Presentación de validación QR

```gherkin
Escenario: bloque QR para una persona usuaria
  Dado que la propuesta generó un QR y una referencia
  Cuando se renderiza la sección de validación
  Entonces muestra un código genérico legible basado en la referencia
  Y el código está en negrilla
  Y muestra el mensaje "Escanea el código QR para validar la autenticidad de este documento."
  Y no muestra el hash hexadecimal completo ni el texto "SHA-256:"
```

```gherkin
Escenario: contenido QR conserva su capacidad de identificación
  Dado que la propuesta contiene empresa, firmante, fecha, tarifa, plazo y referencia
  Cuando se genera el QR
  Entonces el QR sigue siendo generado localmente
  Y su payload conserva los datos de identificación definidos por SPEC-024
  Y el cambio de texto visible no elimina el payload técnico
```

### CA-03: Importación y normalización del CSV

```gherkin
Escenario: catálogo completo cargado desde el CSV
  Dado el archivo c_i_u_u_s_rows.csv adjunto
  Cuando se importa y valida el catálogo
  Entonces se identifican 6360 registros de datos
  Y todos los registros activos tienen código único
  Y las descripciones largas se conservan completas
  Y los riesgos Bajo, Medio y Alto se normalizan sin el prefijo "Riesgo"
  Y los 756 registros con riesgo vacío no se asignan silenciosamente a un riesgo válido
```

```gherkin
Escenario: búsqueda por código y descripción completa
  Dado que el catálogo fue cargado
  Cuando el usuario busca un fragmento del código o una palabra con/sin tilde
  Entonces se encuentran coincidencias usando el código y la descripción completa
  Y cada resultado muestra el código completo
  Y cada resultado muestra la descripción completa con ajuste de línea
  Y no se trunca el texto con puntos suspensivos ni por longitud fija
```

```gherkin
Escenario: selección y cálculo de una actividad
  Dado que el usuario selecciona una opción CIIU válida con riesgo Bajo, Medio o Alto
  Cuando avanza del primer paso
  Entonces la actividad seleccionada conserva código, descripción y riesgo
  Y el cálculo normativo usa el riesgo normalizado de esa actividad
  Y la propuesta imprime la descripción completa de la actividad seleccionada
```

```gherkin
Escenario: opciones sin nivel de riesgo
  Dado que una fila del CSV tiene nivel_riesgo vacío
  Cuando el catálogo se prepara para el selector
  Entonces el sistema aplica la política documentada para datos sin clasificación
  Y no inventa un nivel de riesgo
  Y el usuario recibe una señal comprensible si la opción no puede usarse para cotizar
```

## 4. ARCHIVOS PROBABLEMENTE AFECTADOS

> Esta lista orienta la implementación; debe validarse contra el árbol actual antes de editar. Esta spec no implementa ninguno de estos cambios.

### Frontend

- `frontend/src/modules/sst-calculator/presentation/components/proposal-preview.tsx`: reordenamiento de `issuerLogo` y `BRAND_MEDIA.logoLong`; nuevo texto visible del bloque QR; ocultamiento del hash técnico.
- `frontend/src/modules/sst-calculator/presentation/sst-calculator.css`: layout del encabezado/pie, tamaños de logos, wrapping de descripciones CIIU y estilos de impresión A4.
- `frontend/src/modules/sst-calculator/presentation/components/sst-calculator-wizard.tsx`: render del selector si se requiere distinguir riesgo no definido o mejorar la altura/ayuda de opciones.
- `frontend/src/modules/sst-calculator/domain/types.ts`: confirmar si `risk` debe aceptar un estado no definido o si el catálogo filtrará filas no clasificables antes de llegar al tipo actual.
- `frontend/src/modules/sst-calculator/domain/export.ts`: conservar búsqueda sobre descripción completa; ajustar únicamente si el cambio de catálogo exige normalización adicional.
- `frontend/src/modules/sst-calculator/presentation/components/proposal-preview.test.tsx`: aserciones de posición semántica, texto QR legible y ausencia de hash visible.
- `frontend/src/modules/sst-calculator/presentation/sst-calculator-print-css.test.ts`: regresiones de impresión y orden de logos.
- `frontend/src/modules/sst-calculator/domain/export.test.ts`: búsquedas con descripción larga, código completo y tildes.

### Backend / recurso de catálogo

- Adaptador, recurso o endpoint que actualmente construye `GET /api/sst-calculator/catalog`: reemplazar el origen anterior por el CSV validado o por un artefacto derivado versionado.
- Esquema/mapper del catálogo CIIU: convertir `codigo`, `descripcion` y `nivel_riesgo` al contrato frontend existente y aplicar la política para riesgo vacío.
- Tests del catálogo SST: conteo, unicidad, normalización de riesgos, preservación de descripciones y comportamiento ante filas inválidas.
- El CSV original debe tratarse como entrada de datos y no necesariamente servirse directamente al navegador; la solución debe evitar exponer columnas de auditoría innecesarias (`created_by`, `updated_by`, etc.).

## 5. ESTRATEGIA DE DATOS

1. **Validar el archivo de entrada.** Leer el CSV como UTF-8, respetar campos entrecomillados y comas internas, verificar encabezados obligatorios y rechazar filas mal formadas sin truncar descripciones.
2. **Filtrar vigencia.** Incluir solo `estado = activo`. Registrar cantidad de filas leídas, activas, descartadas y códigos duplicados; un código duplicado debe producir error de validación o una regla explícita, nunca sobrescritura silenciosa.
3. **Normalizar riesgo.** Transformar `Riesgo Bajo`, `Riesgo Medio` y `Riesgo Alto` a los valores de dominio `Bajo`, `Medio` y `Alto`. Mantener una categoría `no_definido` fuera del cálculo o excluirla del catálogo seleccionable según la decisión aprobada, con conteo observable de los 756 casos actuales.
4. **Preservar texto.** No limitar caracteres de `descripcion`; conservar Unicode, acentos, puntuación y espacios significativos. La normalización para buscar debe ser una vista derivada y no reemplazar el valor original que se muestra y se imprime.
5. **Publicar un contrato mínimo.** El frontend debe recibir únicamente `{ code, description, risk }` y continuar usando el endpoint protegido existente. Si el backend materializa JSON, el artefacto debe incluir todos los registros válidos del CSV y una prueba de conteo contra la fuente.
6. **Buscar sin truncar.** Aplicar la normalización NFD solo a la cadena de comparación. El límite de resultados, si se conserva, debe limitar elementos devueltos, no caracteres de cada descripción. El CSS debe permitir múltiples líneas y scroll/expansión accesible.
7. **Trazabilidad.** Documentar en el commit o recurso generado la fecha de importación, el nombre de archivo y el conteo resultante. No enviar al navegador las columnas de auditoría ni datos de creación/actualización.

## 6. REQUISITOS NO FUNCIONALES Y COMPATIBILIDAD

- La propuesta debe seguir siendo imprimible en A4, responsive y usable en móvil.
- Los logos deben conservar relación de aspecto y tener `alt` descriptivo; la ausencia del logo del emisor no puede generar `img` rota.
- La sección QR debe ser entendible sin conocimientos de criptografía y mantener contraste, tamaño legible y lectura por tecnologías asistivas.
- La búsqueda debe seguir siendo case-insensitive y accent-insensitive.
- No introducir llamadas externas para generar QR ni almacenar la cotización o los archivos cargados.
- Las fórmulas, referencia de propuesta, payload QR interno y reglas de elegibilidad de SPEC-024 permanecen sin cambios, salvo el texto visible de la sección QR y la fuente del catálogo.

## 7. PLAN DE VERIFICACIÓN

- Unit tests del mapper CSV y de la política de riesgos vacíos.
- Unit tests de `searchCiiu` con códigos largos, descripciones de más de 1.000 caracteres, tildes y coincidencias fuera de las primeras 20/35.
- Test de componente que verifique que la opción renderiza la descripción completa y permite verla mediante wrapping/expansión.
- Test de `ProposalPreview` que compruebe presencia del logo del emisor en el encabezado, presencia del institucional en el pie, ausencia del hash completo y presencia del código genérico/mensaje QR.
- Test de impresión que compruebe A4, no deformación de logos y visibilidad del pie institucional.
- Validación manual con al menos una fila de cada riesgo, una fila sin riesgo y una descripción de longitud máxima observada.
- Ejecutar la suite frontend existente y la suite del catálogo/backend correspondiente sin modificar fórmulas de cotización.

## 8. LISTA DE TAREAS

### Datos y backend

- [ ] Definir y documentar la política para las 756 filas sin `nivel_riesgo`.
- [ ] Incorporar el CSV como fuente o generar un artefacto derivado validado.
- [ ] Implementar validación de encabezados, filas activas, códigos únicos y riesgos.
- [ ] Verificar que el endpoint de catálogo entrega descripciones completas y no columnas de auditoría.
- [ ] Añadir tests de conteo, unicidad, normalización y filas no clasificadas.

### Frontend

- [ ] Mover `issuerLogo` al encabezado superior de `ProposalPreview`.
- [ ] Colocar `BRAND_MEDIA.logoLong` en el bloque inferior institucional.
- [ ] Reemplazar el hash visible por código genérico en negrilla y mensaje de validación QR.
- [ ] Ajustar CSS de vista previa e impresión sin truncar logos ni texto CIIU.
- [ ] Actualizar selector para mostrar descripciones completas con wrapping/expansión accesible.
- [ ] Añadir/actualizar tests de propuesta, QR, impresión y búsqueda CIIU.

### QA

- [ ] Verificar propuesta con y sin logo del emisor en escritorio, móvil y PDF A4.
- [ ] Verificar que el QR sigue generándose y que el mensaje visible no expone la huella técnica.
- [ ] Buscar códigos y descripciones con tildes, sin tildes y con texto largo.
- [ ] Confirmar conteo del catálogo y el tratamiento visible de actividades sin riesgo.
- [ ] Actualizar el estado a `APPROVED` solo después de revisión y aprobación explícita; no implementar mientras permanezca `DRAFT`.
