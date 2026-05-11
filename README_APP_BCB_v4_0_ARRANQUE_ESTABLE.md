# APP-BCB v4.0 final sync · arranque estable

Versión de estabilización de rendimiento.

Cambios principales:
- Se elimina el renderizado completo de todos los módulos al abrir la app.
- La app solo pinta el módulo activo.
- Se ignoran snapshots antiguos potencialmente corruptos de v3.8/v3.9.
- Se crea un snapshot persistente nuevo de v4.0.
- La lectura directa de Google Sheet se serializa para que no se pisen varias cargas simultáneas.
- Se elimina la sincronización completa automática diferida.
- Local/Pagos muestra la vista mensual desde caché/paquete inmediatamente y actualiza en segundo plano.
- Ensayos y Local ya no lanzan cargas remotas antes de pintar la pantalla.

Prueba mínima:
1. Abrir `?reset=1` una sola vez.
2. Abrir `?v=40`.
3. Entrar en Panel, CRM, Ensayos, Local ensayo y Repertorio.
4. Comprobar que no aparece “Página no responde”.
5. Marcar un pago de local y confirmar que siguen visibles los seis miembros.
