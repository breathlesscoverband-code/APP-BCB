# APP-BCB v4.6 · Miembros fire-and-verify estable

Corrección específica del módulo MIEMBROS.

Problema anterior:
- La app intentaba escribir miembros y esperaba una respuesta JSONP/iframe de Apps Script.
- En algunos navegadores/entornos esa respuesta no volvía a la página, aunque el endpoint existiera.
- Resultado: timeout, aviso de error y cambios no confirmados.

Solución v4.6:
- La escritura de miembros intenta primero el sistema normal.
- Si no hay respuesta, lanza un GET de escritura a Apps Script.
- Después NO da el cambio por bueno hasta leer la pestaña MIEMBROS desde Google Sheet directo publicado y verificar que el miembro cambió.
- La app solo cambia la vista local cuando Google Sheet confirma el cambio.

Prueba recomendada:
1. Abrir https://breathlesscoverband-code.github.io/APP-BCB/?v=46
2. Entrar como admin.
3. Miembros → editar una nota de Nataly.
4. Guardar.
5. La app debe confirmar cuando el cambio aparece en Google Sheet.
6. Inactivar/reactivar un miembro de prueba.
