# APP-BCB v3.5 final sync · corrección voces BCB

## Regla corregida
En Breathless Cover Band solo cantan:
- Miguel
- Carmen

Teo no canta. Teo queda registrado como guitarra solista.

## Cambios
- Retirada la columna visible `Tono Teo` de la app.
- Retirada la ficha `Propuesta Teo` del detalle de canciones.
- Los formularios de canción solo admiten como voz: Miguel, Carmen, Ambos o Por decidir.
- El mapeo de Google Sheet ignora `Tono Teo` como información vocal.
- Incluido script `repararVocesBCB()` para limpiar el Sheet maestro si quedó algún valor mal importado.

## Uso del script de reparación
En Apps Script:
1. Pegar/sustituir `Code.gs` con esta versión.
2. Ejecutar `previewRepararVocesBCB`.
3. Si confirma detección correcta, ejecutar `repararVocesBCB`.
4. Crear nueva implementación si se ha sustituido `Code.gs`.

## Importante
No tocar la pestaña de Ñ. Todo esto es exclusivo de APP-BCB.
