# APP-BCB v2.8 · lectura móvil directa

Esta versión evita el bloqueo móvil de Apps Script para lectura.

## Qué cambia
- CRM, ensayos, conciertos, repertorio y pagos pueden leerse directamente desde el Google Sheet maestro BCB.
- La app intenta Apps Script; si falla, usa Google Sheet directo.
- Apps Script queda para acciones admin/escritura cuando funcione.

## Paso obligatorio
En el Google Sheet maestro BCB:

1. Archivo → Compartir → Publicar en la web.
2. Seleccionar: Documento completo.
3. Formato: Página web.
4. Publicar.
5. Confirmar.

Después abrir:
https://breathlesscoverband-code.github.io/APP-BCB/?reset=1

Diagnóstico:
https://breathlesscoverband-code.github.io/APP-BCB/diagnostico-movil.html?v=28

