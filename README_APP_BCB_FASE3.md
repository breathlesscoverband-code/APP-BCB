# APP-BCB · Fase 3 · GitHub Pages + PWA

App interna separada para **Breathless Cover Band**.

## Estado de esta versión

- Banda activa: BCB
- Versión app: `APP-BCB v1.0 final sync`
- Google Sheet maestro BCB: `1l_cr7pVu4Y3A2v0HPz_3brCNb1011EHIU3hm6D5a47Q`
- Endpoint Apps Script BCB: incluido en `js/config.js`
- Repo sugerido: `APP-BCB`
- PWA: sí, con `manifest.json`, `sw.js` e iconos propios
- localStorage: solo caché temporal
- Modo usuario/admin: sí
- Clave admin: se introduce en sesión; el bridge valida la clave

## Archivos principales

- `index.html`
- `css/styles.css`
- `js/config.js`
- `js/state.js`
- `js/utils.js`
- `js/api.js`
- `js/modules.js`
- `js/app.js`
- `manifest.json`
- `sw.js`
- `icons/`
- `assets/`
- `apps-script/Code.gs`

## Importante sobre el bridge

Se incluye `apps-script/Code.gs` v1.1 header-safe.

Aunque el health actual ya responde OK, esta versión v1.1 detecta la fila real de encabezados del Google Sheet y evita errores al editar o añadir registros cuando la hoja tiene título en la fila 1 y encabezados en la fila 3.

## Publicación en GitHub Pages

1. Crear repositorio `APP-BCB`.
2. Subir todo el contenido de esta carpeta al repo.
3. Ir a `Settings → Pages`.
4. Source: `Deploy from a branch`.
5. Branch: `main`.
6. Folder: `/root`.
7. Guardar.
8. Abrir la URL futura: `https://[usuario-github].github.io/APP-BCB/`.

## Prueba PC

1. Abrir la URL de GitHub Pages.
2. Confirmar que aparece APP-BCB.
3. Confirmar estado: `Google Sheet BCB`.
4. Revisar módulos:
   - Panel
   - CRM
   - Seguimiento
   - Gmail
   - Conciertos
   - Ensayos
   - Local / Pagos
   - Presupuesto
   - Canciones
   - Setlist
   - Dossier
   - Plantillas
   - Tareas
5. Entrar en admin con la clave definida.
6. Probar añadir una tarea simple.
7. Revisar que aparece en el Google Sheet maestro BCB.

## Prueba móvil / PWA

1. Abrir la URL en Chrome móvil.
2. Esperar a que cargue.
3. Menú del navegador → Añadir a pantalla de inicio.
4. Abrir como app instalada.
5. Pulsar `Actualizar desde Google Sheet`.
6. Confirmar que los datos son los mismos que en PC.

## Regla operativa

No usar esta app para Ñ Mayúscula.
No conectar endpoint, Sheet, repertorio, tarifas ni materiales de Ñ.
