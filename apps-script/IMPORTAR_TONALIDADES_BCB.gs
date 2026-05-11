/**
 * APP-BCB v3.4 — Importador de tonalidades BCB
 * Uso:
 * 1) Crear/pegar la pestaña IMPORT_REPERTORIO_TONALIDADES_BCB desde BCB_Tonalidades_Setlist_v1.xlsx.
 * 2) Ejecutar previewTonalidadesBCB().
 * 3) Si cuadra, ejecutar aplicarTonalidadesBCB().
 */
function previewTonalidadesBCB() {
  return importarTonalidadesBCB_(false);
}

function aplicarTonalidadesBCB() {
  return importarTonalidadesBCB_(true);
}

function importarTonalidadesBCB_(write) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const src = ss.getSheetByName('IMPORT_REPERTORIO_TONALIDADES_BCB');
  if (!src) throw new Error('No existe la pestaña IMPORT_REPERTORIO_TONALIDADES_BCB.');
  const dst = ss.getSheetByName('REPERTORIO');
  if (!dst) throw new Error('No existe la pestaña REPERTORIO.');

  const srcValues = src.getDataRange().getValues();
  if (srcValues.length < 2) throw new Error('La pestaña de importación no tiene datos.');
  const srcHeaders = srcValues[0].map(String);
  const srcRows = srcValues.slice(1).filter(r => r.some(v => String(v).trim() !== ''));

  const headersToEnsure = [
    'ID','Orden','Canción','Artista / referencia','Voz principal','Duración','Tonalidad','Estado','Bloque sugerido','Notas',
    'Referencia concreta','Voz asignada','Duración directo','Duración original','Estado duración','Tono visible',
    'Tono original','Tono actual banda','Tono propuesto ensayo','Estado tonalidad','Tono Miguel','Tono Carmen','Tono guitarra / referencia',
    'Notas transporte','Cejilla / capo','BPM','Playlist Spotify','Spotify tema','YouTube','Enlace acordes/letra',
    'Estructura','Letra/acordes/tablatura','Notas interpretación/letra','Fuente / validación','Notas internas'
  ];

  if (write) backupSheet_(ss, dst, 'BACKUP_REPERTORIO_PRE_TONALIDADES');

  let dstHeaders = dst.getRange(1,1,1,Math.max(1,dst.getLastColumn())).getValues()[0].map(String);
  headersToEnsure.forEach(h => {
    if (!dstHeaders.includes(h)) {
      dstHeaders.push(h);
      if (write) dst.getRange(1, dstHeaders.length).setValue(h);
    }
  });
  if (write) dstHeaders = dst.getRange(1,1,1,dstHeaders.length).getValues()[0].map(String);

  const dstValues = dst.getDataRange().getValues();
  const dstData = dstValues.slice(1);
  const hSrc = headerIndex_(srcHeaders);
  const hDst = headerIndex_(dstHeaders);

  const byId = {};
  const byTitle = {};
  dstData.forEach((row, idx) => {
    const sheetRow = idx + 2;
    const id = String(row[hDst['id']] || '').trim();
    const title = normBCB_(row[hDst['cancion']] || row[hDst['canción']] || row[hDst['tema']] || '');
    if (id) byId[id] = sheetRow;
    if (title) byTitle[title] = sheetRow;
  });

  let updated = 0;
  let appended = 0;
  const map = {
    'ID':'ID',
    'Orden':'Orden',
    'Tema':'Canción',
    'Artista / versión':'Artista / referencia',
    'Referencia concreta':'Referencia concreta',
    'Voz principal':'Voz principal',
    'Voz asignada':'Voz asignada',
    'Duración directo':'Duración directo',
    'Duración original':'Duración original',
    'Estado duración':'Estado duración',
    'Tono visible':'Tono visible',
    'Tono original':'Tono original',
    'Tono actual banda':'Tono actual banda',
    'Tono propuesto ensayo':'Tono propuesto ensayo',
    'Estado tonalidad':'Estado tonalidad',
    'Tono Miguel':'Tono Miguel',
    'Tono Carmen':'Tono Carmen',
    'Tono guitarra / referencia':'Tono guitarra / referencia',
    'Notas transporte':'Notas transporte',
    'Cejilla / capo':'Cejilla / capo',
    'BPM':'BPM',
    'Bloque':'Bloque sugerido',
    'Estado':'Estado',
    'Playlist Spotify':'Playlist Spotify',
    'Spotify tema':'Spotify tema',
    'YouTube':'YouTube',
    'Enlace acordes/letra':'Enlace acordes/letra',
    'Estructura':'Estructura',
    'Letra/acordes/tablatura':'Letra/acordes/tablatura',
    'Notas interpretación/letra':'Notas interpretación/letra',
    'Fuente / validación':'Fuente / validación',
    'Notas internas':'Notas internas'
  };

  srcRows.forEach(row => {
    const id = String(row[hSrc['id']] || '').trim();
    const title = String(row[hSrc['tema']] || row[hSrc['cancion']] || row[hSrc['canción']] || '').trim();
    if (!title) return;
    const targetRow = (id && byId[id]) || byTitle[normBCB_(title)];
    const out = new Array(dstHeaders.length).fill('');
    Object.keys(map).forEach(srcName => {
      const sIdx = hSrc[normBCB_(srcName)];
      const dIdx = hDst[normBCB_(map[srcName])];
      if (sIdx !== undefined && dIdx !== undefined) out[dIdx] = row[sIdx];
    });

    if (write) {
      if (targetRow) {
        dst.getRange(targetRow, 1, 1, out.length).setValues([mergeRowBCB_(dst.getRange(targetRow,1,1,out.length).getValues()[0], out)]);
        updated++;
      } else {
        dst.appendRow(out);
        appended++;
      }
    } else {
      if (targetRow) updated++; else appended++;
    }
  });

  const result = { ok: true, write: !!write, origen: 'IMPORT_REPERTORIO_TONALIDADES_BCB', destino: 'REPERTORIO', filasOrigen: srcRows.length, actualizaria: updated, anadiria: appended };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function mergeRowBCB_(oldRow, newRow) {
  return newRow.map((v, i) => String(v).trim() !== '' ? v : oldRow[i]);
}

function headerIndex_(headers) {
  const out = {};
  headers.forEach((h, i) => out[normBCB_(h)] = i);
  return out;
}

function normBCB_(v) {
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9#]+/g,' ').trim();
}

function backupSheet_(ss, sheet, baseName) {
  const name = baseName + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const copy = sheet.copyTo(ss);
  copy.setName(name);
  ss.setActiveSheet(sheet);
  return name;
}
