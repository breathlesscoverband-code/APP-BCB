# APP-BCB v3.6 FINAL SYNC · Edición real de repertorio

Versión de corrección para Breathless Cover Band.

## Problema corregido
En versiones anteriores, editar o borrar canciones desde la app podía quedarse solo en la caché local del navegador. Al volver a abrir o sincronizar, Google Sheet volvía a mandar la fila antigua y la canción reaparecía.

## Cambios
- Editar canción ahora ejecuta `upsertRepertoire` contra Apps Script.
- Borrar canción ahora usa `rowIndex` real de Google Sheet cuando está disponible.
- Se conserva `sheetRow` al leer `REPERTORIO`.
- Tras editar o borrar, la app vuelve a sincronizar solo `REPERTORIO`.
- Se corrige un fallo interno de borrado (`opts` no definido).
- Se añade limpieza de cabeceras falsas en `REPERTORIO`:
  - `previewLimpiarRepertorioBCB`
  - `limpiarRepertorioBCB`

## Prueba recomendada
1. Subir ZIP completo al repo.
2. Sustituir `Code.gs`.
3. Crear nueva versión de implementación.
4. Abrir `?v=36`.
5. Entrar como admin.
6. Cambiar una tonalidad de una canción.
7. Confirmar que cambia en Google Sheet.
8. Borrar una fila duplicada.
9. Confirmar que desaparece en Google Sheet y no vuelve tras recargar.

## Estado
Versión estable para probar edición real de repertorio contra Google Sheet.
