# APP-BCB v3.2 FINAL SYNC · Revisión operativa y local/pagos estable

## Problema corregido

En la versión anterior, la sección **Local ensayo / pagos** podía quedarse solo con los miembros que ya tenían fila real en `PAGOS_LOCAL`. El origen era doble:

1. La pestaña `MIEMBROS` del Google Sheet usa IDs tipo `M-001`, `M-002`, etc.
2. La app usaba esos IDs como si fueran IDs internos de miembro (`miguel`, `carmen`, etc.).
3. Al volver a leer Google Sheet, la vista de pagos no podía reconstruir la lista fija de 6 miembros y se quedaba con pagos parciales.

## Corrección aplicada

- La vista de Local/Pagos usa una formación fija BCB:
  - Miguel
  - Carmen
  - Teo
  - Álvaro
  - Nataly
  - Lord Enzo

- La pestaña `MIEMBROS` ya se interpreta por nombre, no por ID técnico tipo `M-001`.
- `PAGOS_LOCAL` se completa siempre a 6 miembros por mes, aunque Google Sheet solo tenga una fila real.
- Marcar un pago no elimina ni oculta los pendientes.
- Los datos más recientes prevalecen frente a lecturas antiguas del Sheet publicado.

## Pruebas realizadas

Pruebas locales automatizadas sobre `js/app.js`:

1. Cargar `MIEMBROS` con IDs `M-001` a `M-006`.
   - Resultado esperado: normalizar a `miguel,carmen,teo,alvaro,nataly,lord_enzo`.
   - Resultado: OK.

2. Cargar `PAGOS_LOCAL` con solo una fila pagada de Miguel.
   - Resultado esperado: mostrar 6 miembros, Miguel pagado y 5 pendientes.
   - Resultado: OK.

3. Marcar Carmen como pagada después de tener solo Miguel pagado.
   - Resultado esperado: mantener 6 miembros, Miguel y Carmen pagados, 4 pendientes.
   - Resultado: OK.

4. Validación de sintaxis con Node:
   - `js/app.js`: OK
   - `js/data.js`: OK
   - `js/admin-guard.js`: OK
   - `js/assets.js`: OK
   - `sw.js`: OK

## Instrucción de instalación

Subir ZIP completo al repo `APP-BCB`, sobrescribiendo todo. Después, si se usan funciones de escritura/admin, sustituir también `apps-script/Code.gs` y publicar nueva versión de implementación.
