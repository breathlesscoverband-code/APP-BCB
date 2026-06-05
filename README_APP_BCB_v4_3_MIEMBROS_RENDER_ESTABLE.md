APP-BCB v4.3 FINAL SYNC · miembros render estable

Corrección incluida:
- El módulo Miembros no se estaba renderizando al entrar desde el menú porque setTab() no llamaba a renderMembers().
- Ahora al pulsar Miembros se pinta la tabla inmediatamente con los miembros actuales o, si el Sheet aún no ha cargado, con los miembros base de BCB.
- También se corrige Panel y Presupuesto para renderizado bajo demanda.

Instalación:
1. Subir todo el contenido al repo APP-BCB, sobrescribiendo.
2. Commit: APP-BCB v4.3 miembros render estable
3. Sustituir Code.gs en Apps Script y crear nueva versión.
4. Abrir: https://breathlesscoverband-code.github.io/APP-BCB/?v=43

Prueba:
- Entrar como admin.
- Abrir Miembros.
- Deben verse Miguel, Carmen, Teo, Álvaro, Nataly y Lord Enzo.
- Editar Teo y verificar que sigue como Guitarra solista / Canta: No.
