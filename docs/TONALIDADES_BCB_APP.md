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
