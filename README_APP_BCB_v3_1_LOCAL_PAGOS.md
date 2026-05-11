# APP-BCB v3.1 FINAL SYNC · Local pagos estable

Corrección específica del módulo Local ensayo / PAGOS_LOCAL.

## Cambios
- La vista del mes siempre muestra los 6 miembros de BCB aunque en Google Sheet solo exista una fila marcada.
- Al marcar Pagado/Pendiente no desaparecen los demás miembros.
- El pago se guarda en local inmediatamente y se envía a Google Sheet.
- Apps Script actualiza por clave compuesta Mes + ID Miembro, evitando duplicados por cada clic.
- Se mantiene Google Sheet como fuente principal y la app sintetiza cuotas pendientes cuando faltan filas del mes.

## Miembros controlados
- Miguel
- Carmen
- Teo
- Álvaro
- Nataly
- Lord Enzo

## Local
Locales Lady Stone · Sala Janis Joplin
