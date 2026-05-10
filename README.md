# APP-BCB v2.0 final sync · Clon funcional de la app de referencia adaptado a Breathless Cover Band

Esta versión parte de la estructura técnica completa de la app de referencia v2.2 final sync y la adapta a BCB sin mezclar datos de otra banda.

## Datos principales

- Banda: Breathless Cover Band
- Repo: APP-BCB
- PWA: instalable en móvil
- Fuente principal: Google Sheet maestro BCB
- Apps Script bridge BCB: `https://script.google.com/macros/s/AKfycbx6FfjKaqSvRu9Wc8Ym0yH1y-x4VPryt4J4qVM6EOhRDEhGBGr6RrO51xqaUF36mrD6dg/exec`
- Sheet maestro BCB: `1l_cr7pVu4Y3A2v0HPz_3brCNb1011EHIU3hm6D5a47Q`
- Admin: 1929

## Instalación

Subir todo el contenido de este ZIP a la raíz del repo `APP-BCB`.
No subir la carpeta exterior completa: `index.html` debe quedar en la raíz.

Después, en GitHub Pages:
- Source: Deploy from a branch
- Branch: main
- Folder: /root

## Apps Script recomendado

Incluye `apps-script/Code.gs` compatible con esta versión. Sustituir el Code.gs actual del proyecto APP-BCB Bridge por este archivo y crear nueva implementación.

## Limpieza de caché

Después de subir:
- PC: Ctrl + F5
- móvil: cerrar app, borrar caché o desinstalar/reinstalar PWA si sigue viendo versión antigua.
