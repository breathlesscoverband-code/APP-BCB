# APP-BCB v3.8 FINAL SYNC · Local mensual estable

## Incluye todas las reparaciones anteriores no implementadas
- v3.7 auditoría estable: escritura real en CRM, repertorio, ensayos, tareas, pagos y borrados con confirmación de Google Sheet.
- v3.6 edición real de repertorio.
- v3.5 voces BCB corregidas: solo Miguel y Carmen como voces.
- v3.4 tonalidades BCB integradas.
- v3.3 selección de temas de ensayo estable.
- v3.2 local/pagos con 6 miembros fijos.

## Cambio nuevo v3.8
Local ensayo tiene calendario mensual:
- Día 1: la app cambia automáticamente al mes en curso.
- Si el mes en curso queda pagado por todos, se abre el mes siguiente.
- Al marcar el último pago de un mes, la app crea el mes siguiente con los 6 miembros pendientes.
- La pantalla permite ver historial mensual y cambiar manualmente de mes.
- Google Sheet sigue usando una fila por mes + miembro: `Mes + ID Miembro`.
- No duplica pagos: Apps Script hace upsert por `Mes + ID Miembro`.

## Instalación
1. Sustituir `apps-script/Code.gs` en Apps Script.
2. Guardar.
3. Implementar → Gestionar implementaciones → Editar → Nueva versión → Guardar.
4. Subir todo el ZIP al repo APP-BCB sobrescribiendo.
5. Commit recomendado: `APP-BCB v3.8 estable local mensual`
6. Abrir: `https://breathlesscoverband-code.github.io/APP-BCB/?v=38`

## Prueba mínima
1. Entrar como admin.
2. Ir a Local ensayo.
3. Marcar todos los miembros del mes como pagados.
4. Confirmar que la app pasa al mes siguiente y muestra los 6 miembros pendientes.
5. Revisar que `PAGOS_LOCAL` contiene filas del nuevo mes.
