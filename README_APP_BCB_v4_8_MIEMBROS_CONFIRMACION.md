APP-BCB v4.8 FINAL SYNC · Miembros confirmación Apps Script

Corrección específica:
- Editar, Inactivar y Reactivar miembros vuelven a usar JSONP real de Apps Script.
- La app deja de verificar contra Google Sheet publicado, que puede tener caché.
- Tras escribir, verifica leyendo MIEMBROS desde Apps Script en vivo.
- Si Apps Script no confirma, la app no cambia la vista local.

Prueba:
1. Subir ZIP completo al repo.
2. Sustituir apps-script/Code.gs en Apps Script.
3. Crear nueva versión de implementación.
4. Abrir https://breathlesscoverband-code.github.io/APP-BCB/?v=48
5. Probar editar una nota de Nataly e inactivar/reactivar un miembro.
