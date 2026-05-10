# INSTALACIÓN APP-BCB

## Paso 1 — Actualizar Apps Script recomendado

1. Abre el proyecto `APP-BCB Bridge`.
2. Sustituye el contenido de `Code.gs` por el archivo incluido en `apps-script/Code.gs`.
3. Guarda.
4. Implementa una nueva versión como aplicación web.
5. Mantén:
   - Ejecutar como: Tú
   - Acceso: Cualquiera
6. Copia la nueva URL `/exec` si Google la cambia.
7. Si cambia la URL, actualiza `js/config.js` → `endpointUrl`.

## Paso 2 — GitHub

1. Crear repo `APP-BCB`.
2. Subir todos los archivos y carpetas.
3. Activar GitHub Pages.

## Paso 3 — Validación

1. Abrir app en PC.
2. Actualizar desde Google Sheet.
3. Entrar en admin.
4. Crear una tarea de prueba.
5. Confirmar que aparece en Google Sheet.
6. Abrir móvil y actualizar.
7. Instalar como PWA.

## Nota de seguridad

La clave admin en una PWA estática separa interfaz usuario/admin, pero no es seguridad fuerte. La protección real depende de permisos del Google Sheet, Apps Script y cuenta Google.
