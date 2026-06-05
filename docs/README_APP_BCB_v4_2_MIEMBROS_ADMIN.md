# APP-BCB v4.2 FINAL SYNC · Miembros administrables

Versión completa basada en v4.1 estable.

## Cambios principales
- Nuevo módulo **Miembros** dentro de la app.
- Alta de miembros desde la app.
- Edición de rol / instrumento / voz / admin / estado.
- Inactivación sin borrar histórico.
- Campos de fecha de alta e inactividad.
- Control de si paga local.
- Control de si aparece en ensayos.
- Histórico de pagos de local por miembro.
- Local/Pagos usa la lista de miembros activos que pagan local.
- Ensayos usan la lista de miembros activos que aparecen en ensayos.
- Teo queda como guitarra solista y no como cantante.

## Google Sheet
La app escribe en la pestaña `MIEMBROS` mediante Apps Script con acción `upsertMember`.

Columnas recomendadas:
ID, Nombre, Rol, Instrumento, Voz, Admin, Activo, Paga local, Aparece ensayos, Fecha alta, Fecha inactividad, Email, Teléfono, Notas, actualizado_en.

## Prueba mínima
1. Entrar como admin.
2. Abrir Miembros.
3. Editar Teo y confirmar `Voz = No`.
4. Crear un miembro de prueba con `Paga local = No`.
5. Verificar que aparece en Miembros.
6. Cambiarlo a inactivo.
7. Verificar que no aparece en Local/Pagos ni en asistentes de ensayos.
8. Comprobar en Google Sheet que la pestaña MIEMBROS se actualiza.
