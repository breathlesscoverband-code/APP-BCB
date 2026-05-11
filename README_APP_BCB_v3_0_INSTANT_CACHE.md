# APP-BCB v3.0 final sync · instant cache

Corrección de rendimiento móvil.

## Qué cambia

- La app abre con CRM precargado desde snapshot inicial.
- Se usa una caché persistente independiente de la versión para que futuras actualizaciones no dejen la app vacía.
- La sincronización con Google Sheet se ejecuta en segundo plano.
- En arranque se priorizan ENSAYOS, CRM_GENERAL, MIEMBROS y REPERTORIO.
- El resto de pestañas se completa después sin bloquear la apertura.
- El botón Actualizar queda solo como respaldo manual.

## Fuente principal

Google Sheet maestro BCB sigue siendo la fuente principal.
La caché local y el snapshot precargado son solo lectura inicial para que la app no arranque vacía.

## Subida

Subir todo el contenido al repo APP-BCB y hacer commit:

APP-BCB v3.0 instant cache móvil
