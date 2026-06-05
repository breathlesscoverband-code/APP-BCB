# APP-BCB v4.1 · Auditoría de aprendizajes APP-ENHE

Banda activa: Breathless Cover Band.

Esta versión aplica a APP-BCB las correcciones operativas que se consolidaron durante el trabajo con APP-ENHE/Ñ y durante la estabilización de BCB:

- Arranque rápido: no se renderizan todos los módulos al abrir.
- Lectura Google Sheet directa y serializada para evitar bloqueo de navegador.
- Apps Script reservado para escritura/admin y fallback.
- Guardado real contra Google Sheet en CRM, conciertos, ensayos, repertorio, tareas y local/pagos.
- Borrado con confirmación contra Google Sheet: si no confirma, no se elimina de la vista.
- Ensayos: guarda asistentes y temas seleccionados en formato estable.
- Local/Pagos: 6 miembros fijos, vista mensual completa, clave Mes + ID Miembro, sin bucles de renderizado.
- Repertorio: solo Miguel/Carmen como voces, Teo no figura como cantante.
- Caché/snapshot persistente compatible con v4.0 para no perder datos al actualizar.

Prueba mínima de aceptación:
1. Abrir app en `?v=41`.
2. Abrir Local ensayo: debe abrir sin bloquear y mostrar 6 miembros.
3. Marcar un pago: debe mantenerse la tabla completa.
4. Editar un ensayo con varios temas: recargar y comprobar que se mantienen.
5. Editar una tonalidad en Repertorio: comprobar que aparece en Google Sheet.
6. Crear y borrar una tarea de prueba: comprobar que desaparece del Google Sheet.
7. Abrir CRM y confirmar que se muestran los contactos importados.
