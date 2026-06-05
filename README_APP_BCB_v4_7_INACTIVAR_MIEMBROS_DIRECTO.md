# APP-BCB v4.7 FINAL SYNC — Inactivar miembros directo

## Cambio principal
El botón **Inactivar/Reactivar** de Miembros ya no usa JSONP ni iframe para escribir en Google Sheet.

La escritura ahora va por una URL GET mínima:
- `action=memberSimple`
- `id`
- `active`
- `payLocal`
- `showInRehearsals`
- `inactiveDate`

Después la app lee `MIEMBROS` desde el Google Sheet publicado y solo cambia la vista si el Sheet confirma el cambio.

## Instalación
1. Subir todo el ZIP al repo `APP-BCB`, sobrescribiendo.
2. Commit: `APP-BCB v4.7 inactivar miembros directo`
3. En Apps Script, sustituir `Code.gs` por `apps-script/Code.gs`.
4. Guardar.
5. Gestionar implementaciones → Editar → Nueva versión → Guardar.
6. Abrir: `https://breathlesscoverband-code.github.io/APP-BCB/?v=47`

## Prueba única
Miembros → Inactivar Nataly/Teo/miembro de prueba.
Debe cambiar en la pestaña `MIEMBROS`:
- Activo = No
- Paga local = No
- Aparece ensayos = No
- Fecha inactividad = fecha actual
