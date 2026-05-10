/**
 * APP-BCB Bridge — Breathless Cover Band
 * Version: APP-BCB v1.1 final sync header-safe
 *
 * Fuente principal: Google Sheet maestro BCB.
 * App GitHub Pages / PWA.
 * localStorage en cliente: solo caché temporal.
 *
 * Endpoints GET:
 *   ?action=health
 *   ?action=tabs
 *   ?action=mobile
 *   ?action=sheet&tab=REPERTORIO
 *
 * Endpoints POST admin:
 *   { action:"append", tab:"CRM_GENERAL", adminKey:"...", data:{...} }
 *   { action:"update", tab:"CRM_GENERAL", adminKey:"...", id:"...", data:{...} }
 *   { action:"delete", tab:"CRM_GENERAL", adminKey:"...", id:"..." }
 *   { action:"backup", adminKey:"..." }
 *
 * No mezclar con Ñ. No usar endpoint ni Sheet de Ñ.
 */

const APP_VERSION = 'APP-BCB v1.1 final sync header-safe';
const BAND = 'BCB';
const BAND_NAME = 'Breathless Cover Band';
const SHEET_ID = '1l_cr7pVu4Y3A2v0HPz_3brCNb1011EHIU3hm6D5a47Q';
const ADMIN_KEY = '1929';

const MOBILE_TABS = [
  'CONFIG',
  'CRM_GENERAL',
  'RESPUESTAS_GMAIL',
  'CONCIERTOS',
  'ENSAYOS',
  'REPERTORIO',
  'SETLISTS',
  'MIEMBROS',
  'TAREAS',
  'PLANTILLAS_DOSSIER',
  'CONFIG_GRUPO',
  'PAGOS_LOCAL',
  'DASHBOARD'
];

const MAX_MOBILE_ROWS_BY_TAB = {
  CONFIG: 200,
  CRM_GENERAL: 500,
  RESPUESTAS_GMAIL: 200,
  CONCIERTOS: 300,
  ENSAYOS: 300,
  REPERTORIO: 500,
  SETLISTS: 500,
  MIEMBROS: 100,
  TAREAS: 500,
  PLANTILLAS_DOSSIER: 300,
  CONFIG_GRUPO: 200,
  PAGOS_LOCAL: 500,
  DASHBOARD: 200
};

const SCHEMA = {
  CONFIG: ['Clave', 'Valor', 'Notas'],
  CRM_GENERAL: ['ID', 'Fecha alta', 'Origen', 'Contacto', 'Empresa/Entidad', 'Tipo evento', 'Estado', 'Siguiente paso', 'Fecha siguiente paso', 'Fecha/ventana evento', 'Ciudad/lugar', 'Email', 'Teléfono/WhatsApp', 'Formato probable', 'Presupuesto/importe', 'Probabilidad', 'Responsable', 'Último contacto', 'Material enviado', 'Notas', 'Estado administrativo'],
  RESPUESTAS_GMAIL: ['ID', 'Tipo', 'Asunto', 'Mensaje base', 'Estado', 'Última actualización', 'Notas'],
  CONCIERTOS: ['ID', 'Estado', 'Fecha', 'Evento', 'Cliente/Entidad', 'Lugar', 'Ciudad', 'Hora montaje', 'Hora prueba', 'Hora actuación', 'Duración', 'Formato', 'Caché/importe', 'Sonido', 'Iluminación', 'Técnico/contacto', 'Pago', 'Factura', 'Siguiente paso', 'Fecha siguiente paso', 'Notas'],
  ENSAYOS: ['ID', 'Fecha', 'Hora inicio', 'Hora fin', 'Lugar', 'Objetivo', 'Asistentes', 'Repertorio trabajado', 'Tareas derivadas', 'Estado', 'Notas'],
  REPERTORIO: ['ID', 'Orden base', 'Canción', 'Artista/Referencia', 'Idioma', 'Voz principal', 'Duración', 'Tempo/Energía', 'Tonalidad', 'Estado', 'Bloque sugerido', 'Fuente', 'Observaciones'],
  SETLISTS: ['Setlist ID', 'Nombre setlist', 'Orden', 'Canción', 'Voz', 'Duración', 'Bloque/curva', 'Estado', 'Notas'],
  MIEMBROS: ['ID', 'Nombre', 'Rol artístico', 'Instrumento/voz', 'Usuario app', 'Admin', 'Activo', 'Email', 'Teléfono', 'Notas'],
  TAREAS: ['ID', 'Área', 'Tarea', 'Responsable', 'Estado', 'Prioridad', 'Fecha creación', 'Fecha vencimiento', 'Relacionado con', 'Notas'],
  PLANTILLAS_DOSSIER: ['ID', 'Tipo', 'Título', 'Texto', 'CTA', 'Estado', 'Uso recomendado'],
  CONFIG_GRUPO: ['Campo', 'Valor', 'Fuente/Notas'],
  PAGOS_LOCAL: ['ID', 'Mes', 'Concepto', 'Importe total', 'Moneda', 'Participantes', 'Pagado por', 'Reparto por persona', 'Estado', 'Fecha vencimiento', 'Fecha pago', 'Notas'],
  DASHBOARD: ['Indicador', 'Valor'],
  LOG_APP_BCB: ['Fecha/hora', 'Usuario', 'Acción', 'Módulo', 'Detalle', 'Resultado', 'Versión', 'Origen']
};

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || 'health').toLowerCase();

    if (action === 'health') return jsonResponse(health_());
    if (action === 'tabs') return jsonResponse(getTabs_());
    if (action === 'mobile') return jsonResponse(getMobilePayload_());
    if (action === 'sheet') return jsonResponse(getSheetPayload_(params.tab, params.limit));

    return jsonResponse({
      ok: false,
      error: 'Acción GET no reconocida',
      allowedActions: ['health', 'tabs', 'mobile', 'sheet'],
      version: APP_VERSION
    }, 400);
  } catch (err) {
    return errorResponse_(err);
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').toLowerCase();

    if (!body.adminKey || String(body.adminKey) !== ADMIN_KEY) {
      return jsonResponse({
        ok: false,
        error: 'Admin key incorrecta o ausente',
        version: APP_VERSION
      }, 403);
    }

    if (action === 'append') return jsonResponse(appendRow_(body.tab, body.data));
    if (action === 'update') return jsonResponse(updateRowById_(body.tab, body.id, body.data));
    if (action === 'delete') return jsonResponse(deleteRowById_(body.tab, body.id));
    if (action === 'backup') return jsonResponse(createBackup_());

    return jsonResponse({
      ok: false,
      error: 'Acción POST no reconocida',
      allowedActions: ['append', 'update', 'delete', 'backup'],
      version: APP_VERSION
    }, 400);
  } catch (err) {
    return errorResponse_(err);
  }
}

function health_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return {
    ok: true,
    band: BAND,
    bandName: BAND_NAME,
    version: APP_VERSION,
    sheetId: SHEET_ID,
    spreadsheetName: ss.getName(),
    timestamp: new Date().toISOString(),
    source: 'Google Sheet maestro BCB'
  };
}

function getTabs_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tabs = ss.getSheets().map(sh => ({
    name: sh.getName(),
    rows: Math.max(sh.getLastRow() - 1, 0),
    columns: sh.getLastColumn(),
    headerRow: detectHeaderInfo_(sh).headerRow
  }));
  return {
    ok: true,
    band: BAND,
    version: APP_VERSION,
    tabs,
    timestamp: new Date().toISOString()
  };
}

function getMobilePayload_() {
  const payload = {
    ok: true,
    band: BAND,
    bandName: BAND_NAME,
    version: APP_VERSION,
    source: 'Google Sheet maestro BCB',
    mode: 'mobile-light',
    generatedAt: new Date().toISOString(),
    data: {}
  };

  MOBILE_TABS.forEach(tabName => {
    const limit = MAX_MOBILE_ROWS_BY_TAB[tabName] || 250;
    payload.data[tabName] = readSheetAsObjects_(tabName, limit);
  });

  return payload;
}

function getSheetPayload_(tabName, limit) {
  if (!tabName) {
    return {
      ok: false,
      error: 'Falta parámetro tab',
      example: '?action=sheet&tab=REPERTORIO',
      version: APP_VERSION
    };
  }

  const safeLimit = limit ? Math.min(Number(limit), 1000) : 1000;

  return {
    ok: true,
    band: BAND,
    version: APP_VERSION,
    tab: tabName,
    rows: readSheetAsObjects_(tabName, safeLimit).rows,
    generatedAt: new Date().toISOString()
  };
}

function readSheetAsObjects_(tabName, limit) {
  const sheet = getSheet_(tabName);
  if (!sheet) {
    return { ok: false, error: 'Pestaña no encontrada: ' + tabName, rows: [] };
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return { ok: true, rows: [], totalReturned: 0, totalSheetRows: 0 };
  }

  const info = detectHeaderInfo_(sheet);
  if (!info.headers.length) {
    return { ok: true, rows: [], totalReturned: 0, totalSheetRows: 0, headerRow: info.headerRow };
  }

  const startRow = info.headerRow + 1;
  if (startRow > lastRow) {
    return { ok: true, rows: [], totalReturned: 0, totalSheetRows: 0, headerRow: info.headerRow };
  }

  const dataRowCount = Math.min(lastRow - info.headerRow, Number(limit) || 1000);
  const values = sheet.getRange(startRow, 1, dataRowCount, Math.max(info.headers.length, lastColumn)).getDisplayValues();

  const rows = values
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => rowToObject_(info.headers, row));

  return {
    ok: true,
    rows,
    totalReturned: rows.length,
    totalSheetRows: Math.max(lastRow - info.headerRow, 0),
    limited: (lastRow - info.headerRow) > rows.length,
    headerRow: info.headerRow
  };
}

function detectHeaderInfo_(sheet) {
  const tabName = sheet.getName();
  const expected = SCHEMA[tabName] || [];
  const lastRow = Math.min(sheet.getLastRow(), 10);
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) return { headerRow: 1, headers: expected };

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();

  let bestIndex = -1;
  let bestHits = -1;

  for (let r = 0; r < values.length; r++) {
    const row = values[r].map(v => String(v || '').trim());
    const hits = expected.filter(h => h && row.indexOf(h) !== -1).length;
    const hasGenericId = row.indexOf('ID') !== -1 || row.indexOf('Setlist ID') !== -1 || row.indexOf('Campo') !== -1 || row.indexOf('Indicador') !== -1;
    if (hits > bestHits || (bestIndex === -1 && hasGenericId)) {
      bestHits = hits;
      bestIndex = r;
    }
  }

  if (bestIndex === -1 || bestHits < Math.min(2, expected.length || 2)) {
    bestIndex = 0;
  }

  const rawHeaders = values[bestIndex] || [];
  const headers = rawHeaders.map((h, i) => String(h || '').trim()).filter(h => h);
  const finalHeaders = headers.length ? headers : expected;

  return {
    headerRow: bestIndex + 1,
    headers: finalHeaders
  };
}

function appendRow_(tabName, data) {
  validateTabAndData_(tabName, data);
  const sheet = getSheetOrCreate_(tabName);
  const info = ensureHeaderRow_(sheet, tabName, Object.keys(data));
  const row = info.headers.map(header => valueForHeader_(data, header));
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  logAction_('append', tabName, data.ID || data['Setlist ID'] || data.Id || data.id || '');
  return { ok: true, action: 'append', tab: tabName, version: APP_VERSION, appended: data };
}

function updateRowById_(tabName, id, data) {
  validateTabAndData_(tabName, data);
  if (!id) throw new Error('Falta id para actualizar');

  const sheet = getSheet_(tabName);
  if (!sheet) throw new Error('Pestaña no encontrada: ' + tabName);

  const info = ensureHeaderRow_(sheet, tabName, Object.keys(data));
  const found = findRowById_(sheet, info, id);
  if (!found.found) throw new Error('ID no encontrado en ' + tabName + ': ' + id);

  const rowValues = sheet.getRange(found.rowIndex, 1, 1, info.headers.length).getValues()[0];

  info.headers.forEach((header, index) => {
    if (Object.prototype.hasOwnProperty.call(data, header)) {
      rowValues[index] = data[header];
    }
  });

  sheet.getRange(found.rowIndex, 1, 1, info.headers.length).setValues([rowValues]);
  logAction_('update', tabName, String(id));

  return { ok: true, action: 'update', tab: tabName, id: String(id), updated: data, version: APP_VERSION };
}

function deleteRowById_(tabName, id) {
  if (!tabName) throw new Error('Falta tab');
  if (!id) throw new Error('Falta id para borrar');

  const sheet = getSheet_(tabName);
  if (!sheet) throw new Error('Pestaña no encontrada: ' + tabName);

  const info = detectHeaderInfo_(sheet);
  const found = findRowById_(sheet, info, id);
  if (!found.found) throw new Error('ID no encontrado en ' + tabName + ': ' + id);

  sheet.deleteRow(found.rowIndex);
  logAction_('delete', tabName, String(id));
  return { ok: true, action: 'delete', tab: tabName, id: String(id), version: APP_VERSION };
}

function ensureHeaderRow_(sheet, tabName, keys) {
  let info = detectHeaderInfo_(sheet);
  let headers = info.headers.length ? info.headers : (SCHEMA[tabName] || keys);

  const missing = keys.filter(key => headers.indexOf(key) === -1);
  if (missing.length) {
    sheet.getRange(info.headerRow, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }

  return { headerRow: info.headerRow, headers };
}

function findRowById_(sheet, info, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= info.headerRow) return { found: false };

  const idHeaderCandidates = ['ID', 'Id', 'id', 'Setlist ID'];
  let idColIndex = -1;

  for (let i = 0; i < info.headers.length; i++) {
    if (idHeaderCandidates.indexOf(info.headers[i]) !== -1) {
      idColIndex = i + 1;
      break;
    }
  }

  if (idColIndex === -1) idColIndex = 1;

  const values = sheet.getRange(info.headerRow + 1, idColIndex, lastRow - info.headerRow, 1).getDisplayValues();
  const target = String(id).trim();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === target) {
      return { found: true, rowIndex: info.headerRow + 1 + i, idColIndex };
    }
  }

  return { found: false };
}

function createBackup_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const file = DriveApp.getFileById(SHEET_ID);
  const parentFolders = file.getParents();
  const backupName = `${ss.getName()} · BACKUP · ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss')}`;
  let backupFile;

  if (parentFolders.hasNext()) {
    const folder = parentFolders.next();
    backupFile = file.makeCopy(backupName, folder);
  } else {
    backupFile = file.makeCopy(backupName);
  }

  logAction_('backup', 'SPREADSHEET', backupFile.getId());

  return { ok: true, action: 'backup', backupName, backupId: backupFile.getId(), version: APP_VERSION };
}

function getSheet_(tabName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(String(tabName));
}

function getSheetOrCreate_(tabName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(String(tabName)) || ss.insertSheet(String(tabName));
}

function logAction_(action, tab, ref) {
  try {
    const sheet = getSheetOrCreate_('LOG_APP_BCB');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(SCHEMA.LOG_APP_BCB);
    }
    sheet.appendRow([new Date(), 'Sistema', action, tab, ref, 'OK', APP_VERSION, 'Apps Script']);
  } catch (err) {
    // No bloquear operaciones por fallo de log.
  }
}

function validateTabAndData_(tabName, data) {
  if (!tabName) throw new Error('Falta tab');
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Falta data como objeto');
  }
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index] !== undefined ? row[index] : '';
  });
  return obj;
}

function valueForHeader_(data, header) {
  return Object.prototype.hasOwnProperty.call(data, header) ? data[header] : '';
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const contents = e.postData.contents;
  try {
    return JSON.parse(contents);
  } catch (err) {
    throw new Error('JSON inválido en POST');
  }
}

function jsonResponse(data, statusCode) {
  const payload = Object.assign({ statusCode: statusCode || 200 }, data);
  return ContentService
    .createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(err) {
  return jsonResponse({
    ok: false,
    error: err && err.message ? err.message : String(err),
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  }, 500);
}
