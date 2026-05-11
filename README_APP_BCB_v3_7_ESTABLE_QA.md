# APP-BCB v3.7 FINAL SYNC · Auditoría estable

Banda activa: Breathless Cover Band (BCB)

## Objetivo de esta versión
Versión de estabilización completa después de revisar la operativa de carga, guardado, modificación y borrado en los módulos principales de APP-BCB.

## Cambios principales
- CRM: crear/editar contactos ya escribe en `CRM_GENERAL` del Google Sheet maestro.
- Conciertos: crear/editar guarda en `CONCIERTOS` y sincroniza solo esa pestaña.
- Ensayos: crear/editar guarda en `ENSAYOS`, conserva asistentes y temas marcados.
- Local / pagos: mantiene siempre los 6 miembros BCB y actualiza `PAGOS_LOCAL`.
- Canciones / repertorio: crear/editar/borrar escribe en `REPERTORIO`.
- Tareas: crear/editar/borrar escribe en `TAREAS`.
- Borrados: ya no se borra solo de la caché local; primero tiene que confirmar Google Sheet.
- Lectura móvil: mantiene lectura directa desde Google Sheet publicado.
- Apps Script: añade `upsertCRM` / `upsertContact` para CRM.
- Apps Script: devuelve `sheetRow` en las lecturas para que edición/borrado sean más fiables.
- Se corrige el fallo de `taskFromSheetRow` inexistente.
- Se añaden mapeadores de `TAREAS` y `RESPUESTAS_GMAIL`.

## Pruebas realizadas
Ver `tests/qa-v3.7-report.json`.

Se comprobó:
- Sintaxis de JS principal.
- Sintaxis de Apps Script.
- Referencias onclick/change en HTML y app.
- Correspondencia guardar → pestaña correcta.
- Correspondencia borrar → Google Sheet antes que caché local.
- Versionado PWA y manifest.
- Snapshot inicial de CRM y repertorio.
- Miembros correctos de BCB.

## Instalación
1. Sustituir `apps-script/Code.gs` en el proyecto Apps Script de BCB.
2. Guardar.
3. Implementar → Gestionar implementaciones → Editar → Nueva versión → Guardar.
4. Subir todo el contenido de este ZIP al repo `APP-BCB`, sobrescribiendo.
5. Commit recomendado: `APP-BCB v3.7 auditoria estable`.
6. Abrir: `https://breathlesscoverband-code.github.io/APP-BCB/?v=37`.

## Prueba mínima final tras instalar
1. Entrar como admin.
2. Crear una tarea de prueba y comprobar que aparece en `TAREAS`.
3. Editar una tonalidad de una canción y comprobar que cambia en `REPERTORIO`.
4. Crear o editar un ensayo con varios temas y comprobar `ENSAYOS`.
5. Marcar un pago de local y comprobar `PAGOS_LOCAL`.
6. Borrar la tarea de prueba y comprobar que desaparece del Sheet.
