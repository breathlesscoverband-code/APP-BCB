# APP-BCB v4.5 · Miembros escritura estable JSONP

Correcciones:
- El botón Editar vuelve a mostrarse en Miembros.
- Inactivar/reactivar y editar miembros escriben primero por JSONP GET, no por POST iframe.
- POST iframe queda solo como respaldo.
- Si Google Sheet no confirma, la app no modifica la vista local.
- Miguel y Carmen son las únicas voces.
- Teo queda forzado como guitarra solista / no cantante.
- Se reduce timeout de POST para evitar bloqueos largos.

Prueba mínima:
1. Abrir https://breathlesscoverband-code.github.io/APP-BCB/?v=45
2. Entrar como admin.
3. Ir a Miembros.
4. Ver botón Editar.
5. Editar una nota de Carmen y guardar.
6. Confirmar que cambia en Google Sheet > MIEMBROS.
7. Inactivar un miembro de prueba y confirmar cambio en Google Sheet.
