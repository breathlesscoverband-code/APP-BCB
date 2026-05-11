# APP-BCB v2.0 final sync · Clon funcional de la app de referencia adaptado a Breathless Cover Band

Esta versión parte de la estructura técnica completa de la app de referencia v2.2 final sync y la adapta a BCB sin mezclar datos de otra banda.

## Datos principales

- Banda: Breathless Cover Band
- Repo: APP-BCB
- PWA: instalable en móvil
- Fuente principal: Google Sheet maestro BCB
- Apps Script bridge BCB: `https://script.google.com/macros/s/AKfycbzbddqoQzAwtxY9zpZNjRnWhziFjw6J0oEYqbDEQYpqe37TkTw3f6T6J4kwxokMKBhycg/exec`
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


## APP-BCB v2.1 final sync · corrección operativa

Cambios:
- Panel administrador cerrado por defecto tras entrar con clave para no tapar botones ni tablas.
- Panel administrador con botón de cierre.
- Borrado real contra Google Sheet maestro mediante `?action=deleteRow`.
- Ensayos de plantilla eliminados de datos iniciales para evitar registros fantasma.
- Cache PWA subida a v2.1 para forzar actualización en GitHub Pages y móvil.

Después de subir esta versión, sustituir también `apps-script/Code.gs` en Apps Script y crear nueva implementación.


## APP-BCB v2.3 final sync · playlist Spotify

Cambios:
- Playlist Spotify general de BCB cargada:
  https://open.spotify.com/playlist/11xiOaJiHUa7uHxNPxe1OF?si=a73453abe34b4675
- Visible en el módulo Canciones/Repertorio.
- Botón para abrir playlist y copiar URL.
- Campo Playlist Spotify general precargado al crear o editar canciones.
- Cache PWA subida a v2.2 para forzar actualización.

Subir todo el contenido del ZIP al repo `APP-BCB` y hacer Ctrl+F5. En móvil, si mantiene versión anterior, desinstalar/reinstalar la PWA.


## v2.3 · Corrección móvil ensayos

- Nuevo endpoint Apps Script `?action=rehearsals` para cargar ENSAYOS de forma ligera en móvil.
- Botón `Actualizar ensayos` en el módulo Ensayos.
- Normalización de fechas y horas procedentes de Google Sheets.
- Cache PWA renovada para forzar actualización.


## APP-BCB v2.4 final sync · admin guard móvil

Corrección de uso móvil:
- El aviso de modo usuario ya no aparece como ventana emergente repetida.
- Se sustituye por aviso inferior no intrusivo y limitado por tiempo.
- La caché local puede actualizarse en modo usuario para permitir lectura estable en móvil.
- Las acciones de administración siguen protegidas: editar, borrar, importar, exportar y backup.


# APP-BCB v3.4 final sync · tonalidades BCB

Esta versión añade a APP-BCB el documento de tonalidades y setlist de Breathless Cover Band basado en la plantilla usada para Ñ, pero con datos propios de BCB.

## Incluye

- `assets/BCB_Tonalidades_Setlist_v2_SOLO_MIGUEL_CARMEN.xlsx`
- `docs/BCB_Tonalidades_Setlist_v2_SOLO_MIGUEL_CARMEN.xlsx`
- Repertorio inicial de la app actualizado con:
  - Tono original orientativo
  - Tono BCB recomendado
  - Tono propuesto para ensayo
  - Estado de tonalidad
  - Tono por voz/Miguel/Carmen/Teo cuando aplica
  - Notas de transporte y criterio de ensayo

## Importar al Google Sheet maestro BCB

1. Abrir `BCB_Tonalidades_Setlist_v2_SOLO_MIGUEL_CARMEN.xlsx`.
2. Copiar la hoja `IMPORT_REPERTORIO_TONALIDADES_BCB`.
3. Pegarla en el Google Sheet maestro BCB como pestaña nueva con el mismo nombre.
4. En Apps Script, usar el `Code.gs` incluido o añadir `IMPORTAR_TONALIDADES_BCB.gs`.
5. Ejecutar primero `previewTonalidadesBCB`.
6. Si el resultado es correcto, ejecutar `aplicarTonalidadesBCB`.

El script crea backup de `REPERTORIO` antes de escribir.

## Nota de trabajo

Las tonalidades son una propuesta de trabajo para ensayo. No deben comunicarse como definitivas hasta validarlas con la banda en local.


## Corrección v3.5

Voces válidas BCB: Miguel, Carmen, Ambos o Por decidir. Teo no canta; se mantiene como guitarra solista.
