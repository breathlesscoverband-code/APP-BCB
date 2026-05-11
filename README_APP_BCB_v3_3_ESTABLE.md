# APP-BCB v3.3 FINAL SYNC · Ensayos / temas estable

## Corrección principal

Se corrige el guardado de temas seleccionados en un ensayo.

Causa detectada:
- La app guardaba `temas_ids` como JSON (`[1,2,3]`).
- La lectura posterior desde Google Sheet esperaba CSV (`1,2,3`).
- Al recargar, podían perderse el primer y último tema, o parte de la selección.
- En selecciones largas, el texto de temas podía añadir peso innecesario a la escritura.

Solución:
- `temas_ids` se guarda ahora como CSV estable: `1,2,3`.
- La lectura acepta formatos antiguos y nuevos:
  - `[1,2,3]`
  - `1,2,3`
  - `1;2;3`
  - `1 | 2 | 3`
  - títulos de canciones cuando no hay IDs.
- La app reconstruye los títulos desde el repertorio.
- Se añade campo `todos_los_temas` para distinguir selección total de selección concreta.
- Se amplían los encabezados reconocidos en repertorio para leer `Canción` y `Artista / referencia`.

## Prueba mínima

1. Entrar como admin.
2. Crear o editar un ensayo.
3. Marcar 5 temas no consecutivos.
4. Guardar.
5. Recargar la app.
6. Abrir el ensayo.
7. Deben seguir apareciendo los mismos 5 temas.

## Importante

Si algún ensayo antiguo ya quedó mal guardado por versiones anteriores, abre ese ensayo, vuelve a marcar los temas correctos y guarda una vez con v3.3.
