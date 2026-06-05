# APP-BCB v4.5 FINAL SYNC · Miembros escritura estable

Corrección específica:
- Gestión de miembros desde la app.
- Guardado por POST iframe a Apps Script para evitar fallos de JSONP GET.
- Inactivar/reactivar no modifica la vista local hasta que Google Sheet confirme.
- Teo queda como guitarra solista y no cantante.
- Local/Pagos y Ensayos se alimentan de miembros activos y configurados.

Prueba mínima:
1. Entrar como admin.
2. Abrir Miembros.
3. Editar Teo: Canta = No.
4. Guardar y comprobar en MIEMBROS del Google Sheet.
5. Inactivar un miembro de prueba y comprobar que queda Activo = No.
6. Reactivarlo y comprobar que queda Activo = Sí.
