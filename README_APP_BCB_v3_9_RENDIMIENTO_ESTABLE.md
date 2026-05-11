# APP-BCB v3.9 FINAL SYNC · Rendimiento estable

Corrección de estabilización tras detectar bloqueo en Windows y pantalla de Local ensayo vacía.

## Cambios críticos

- Eliminado bucle de renderizado provocado por `renderLocalPayments()` → `saveData()` → `refreshAll()` → `renderLocalPayments()`.
- `saveData()` queda protegido contra reentradas durante renderizado.
- `renderLocalPayments()` ya no fuerza render completo.
- La lectura de pestañas usa primero Google Sheet directo publicado y Apps Script solo como respaldo.
- Los timeouts de carga remota bajan de 30s a 10s para que una conexión bloqueada no congele la app.
- La sincronización por pestañas guarda snapshot sin repintar toda la app después de cada pestaña.
- Local/Pagos mantiene siempre los 6 miembros de BCB y completa el mes visible como pendientes si no hay filas reales.
- Incluye todas las reparaciones anteriores de v3.8.

## Prueba mínima

1. Abrir `https://breathlesscoverband-code.github.io/APP-BCB/?v=39`
2. Entrar en Local ensayo.
3. Deben aparecer los 6 miembros.
4. Marcar un pago.
5. Confirmar que el navegador no se bloquea y que el resto de miembros sigue visible.
6. Comprobar `PAGOS_LOCAL` en Google Sheet.
