/**
 * APP-BCB Bridge — Breathless Cover Band
 * Version: APP-BCB v2.1 final sync · admin UX + delete real
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
 *   ?action=upsertConcert&key=1929&row={...}
 *   ?action=upsertRehearsal&key=1929&row={...}
 *   ?action=upsertTask&key=1929&row={...}
 *   ?action=upsertLocalPayment&key=1929&row={...}
 *
 * No usar endpoint ni Sheet de otra banda.
 */

const APP_VERSION = 'APP-BCB v2.1 final sync';
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
  'DASHBOARD',
  'LOG_APP_BCB'
];

const MAX_MOBILE_ROWS_BY_TAB = {
  CONFIG: 200,
  CRM_GENERAL: 600,
  RESPUESTAS_GMAIL: 300,
  CONCIERTOS: 300,
  ENSAYOS: 300,
  REPERTORIO: 300,
  SETLISTS: 300,
  MIEMBROS: 50,
  TAREAS: 300,
  PLANTILLAS_DOSSIER: 200,
  CONFIG_GRUPO: 200,
  PAGOS_LOCAL: 500,
  DASHBOARD: 200,
  LOG_APP_BCB: 200
};

const SCHEMA = {
  CRM_GENERAL: ['ID','Estado','Siguiente paso','Fecha siguiente paso','Contacto','Empresa / entidad','Tipo evento','Fecha / ventana','Ciudad','Email','Teléfono','Notas','Importe o rango'],
  RESPUESTAS_GMAIL: ['ID','Fecha','Remitente','Asunto','Resumen','Estado','CRM ID','Notas'],
  CONCIERTOS: ['ID','Fecha','Hora','Sala / Evento','sala_lugar','ciudad','tipo','estado','Caché','anticipo','cobrado','sonido','contacto_id','cartel_url','cartel_thumb_url','cartel_titulo','notas_publicas','notas_produccion','asistencia_miguel','asistencia_carmen','asistencia_teo','asistencia_alvaro','asistencia_nataly','asistencia_lord_enzo','actualizado_en'],
  ENSAYOS: ['ID','Fecha','hora_inicio','hora_fin','Lugar','estado','objetivo','temas_ids','temas_texto','Notas','asistencia_miguel','asistencia_carmen','asistencia_teo','asistencia_alvaro','asistencia_nataly','asistencia_lord_enzo','actualizado_en'],
  REPERTORIO: ['ID','Orden','Canción','Artista / referencia','Idioma','Voz principal','Duración','Tempo / Energía','Tonalidad','Estado','Bloque sugerido','Fuente','Notas'],
  SETLISTS: ['ID','Setlist ID','Orden','Título','Voz','Tono','Duración','Bloque','Notas'],
  MIEMBROS: ['ID','Nombre','Rol','Email','Teléfono','Estado','Notas'],
  TAREAS: ['ID','Tarea','Responsable','Fecha','Estado','Prioridad','Área','Notas','actualizado_en'],
  PLANTILLAS_DOSSIER: ['ID','Tipo','Uso','Texto','Estado'],
  CONFIG_GRUPO: ['Campo','Valor','Notas'],
  PAGOS_LOCAL: ['ID','Mes','ID Miembro','Nombre','Cuota','Pagado','Fecha pago','Notas','Última actualización'],
  DASHBOARD: ['Indicador','Valor','Notas'],
  LOG_APP_BCB: ['Fecha','Acción','Pestaña','ID','Detalle']
};

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || 'health').toLowerCase();

    if (action === 'health') return jsonOrJsonp_(health_(), params.callback);
    if (action === 'tabs') return jsonOrJsonp_(getTabs_(), params.callback);
    if (action === 'mobile') return jsonOrJsonp_(getMobilePayload_(), params.callback);
    if (action === 'sheet') return jsonOrJsonp_(getSheetPayload_(params.tab, params.limit), params.callback);

    if (action === 'upsertconcert') return jsonOrJsonp_(upsertById_('CONCIERTOS', rowFromParam_(params), params.key), params.callback);
    if (action === 'upsertrehearsal') return jsonOrJsonp_(upsertById_('ENSAYOS', rowFromParam_(params), params.key), params.callback);
    if (action === 'upserttask') return jsonOrJsonp_(upsertById_('TAREAS', rowFromParam_(params), params.key), params.callback);
    if (action === 'upsertlocalpayment') return jsonOrJsonp_(upsertLocalPayment_(rowFromParam_(params), params.key), params.callback);
    if (action === 'deleterow') return jsonOrJsonp_(deleteRowByIdGet_(params.tab, params.id, params.key), params.callback);

    return jsonOrJsonp_({ ok: false, error: 'Acción no reconocida: ' + action, version: APP_VERSION }, params.callback);
  } catch (err) {
    return jsonOrJsonp_({ ok: false, error: String(err && err.message ? err.message : err), version: APP_VERSION }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = String(body.action || '').toLowerCase();

    if (!isAdminKey_(body.adminKey || body.key)) {
      return jsonResponse_({ ok: false, error: 'Clave admin incorrecta', version: APP_VERSION });
    }

    if (action === 'append') return jsonResponse_(appendRow_(body.tab, body.data));
    if (action === 'update') return jsonResponse_(updateRowById_(body.tab, body.id, body.data));
    if (action === 'delete') return jsonResponse_(deleteRowById_(body.tab, body.id));
    if (action === 'backup') return jsonResponse_(createBackup_());

    return jsonResponse_({ ok: false, error: 'Acción POST no reconocida: ' + action, version: APP_VERSION });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err), version: APP_VERSION });
  }
}

function rowFromParam_(params) {
  if (!params.row) throw new Error('Falta parámetro row');
  return JSON.parse(params.row);
}

function isAdminKey_(key) {
  return String(key || '') === ADMIN_KEY;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonOrJsonp_(obj, callback) {
  const text = callback ? String(callback).replace(/[^\w.$]/g, '') + '(' + JSON.stringify(obj) + ');' : JSON.stringify(obj);
  const output = ContentService.createTextOutput(text);
  output.setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  return output;
}

function ss_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function health_() {
  const ss = ss_();
  return {
    statusCode: 200,
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
  const ss = ss_();
  return {
    ok: true,
    band: BAND,
    version: APP_VERSION,
    tabs: ss.getSheets().map(s => ({ name: s.getName(), gid: s.getSheetId(), lastRow: s.getLastRow(), lastColumn: s.getLastColumn() }))
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
    data: {},
    sheets: {}
  };

  MOBILE_TABS.forEach(tabName => {
    const limit = MAX_MOBILE_ROWS_BY_TAB[tabName] || 250;
    const obj = readSheetAsObjects_(tabName, limit);
    payload.data[tabName] = obj;
    payload.sheets[tabName] = Object.assign({ key: tabName, name: tabName }, obj);
  });

  payload.data.miembros = payload.data.MIEMBROS && payload.data.MIEMBROS.rows ? payload.data.MIEMBROS.rows : [];
  payload.data.pagosLocal = payload.data.PAGOS_LOCAL && payload.data.PAGOS_LOCAL.rows ? payload.data.PAGOS_LOCAL.rows : [];

  return payload;
}

function getSheetPayload_(tabName, limit) {
  if (!tabName) return { ok: false, error: 'Falta parámetro tab', version: APP_VERSION };
  const safeLimit = limit ? Math.min(Number(limit), 1000) : 1000;
  const obj = readSheetAsObjects_(tabName, safeLimit);
  return Object.assign({ ok: true, band: BAND, version: APP_VERSION, tab: tabName, generatedAt: new Date().toISOString() }, obj);
}

function getSheet_(tabName) {
  if (!tabName) return null;
  const ss = ss_();
  const wanted = normalize_(tabName);
  return ss.getSheets().find(s => normalize_(s.getName()) === wanted) || null;
}

function getSheetOrCreate_(tabName) {
  const ss = ss_();
  let sheet = getSheet_(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
  return sheet;
}

function normalize_(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function readSheetAsObjects_(tabName, limit) {
  const sheet = getSheet_(tabName);
  if (!sheet) return { ok: false, error: 'Pestaña no encontrada: ' + tabName, rows: [] };

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) return { ok: true, rows: [], totalReturned: 0, totalSheetRows: 0 };

  const info = detectHeaderInfo_(sheet);
  if (!info.headers.length) return { ok: true, rows: [], totalReturned: 0, totalSheetRows: 0, headerRow: info.headerRow };

  const startRow = info.headerRow + 1;
  if (startRow > lastRow) return { ok: true, rows: [], totalReturned: 0, totalSheetRows: 0, headerRow: info.headerRow };

  const dataRowCount = Math.min(lastRow - info.headerRow, Number(limit) || 1000);
  const values = sheet.getRange(startRow, 1, dataRowCount, Math.max(info.headers.length, lastColumn)).getDisplayValues();

  const rows = values
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => rowToObject_(info.headers, row));

  return { ok: true, rows, totalReturned: rows.length, totalSheetRows: Math.max(lastRow - info.headerRow, 0), limited: (lastRow - info.headerRow) > rows.length, headerRow: info.headerRow, gid: sheet.getSheetId() };
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

  if (bestIndex === -1 || bestHits < Math.min(2, expected.length || 2)) bestIndex = 0;

  const rawHeaders = values[bestIndex] || [];
  const headers = rawHeaders.map(h => String(h || '').trim()).filter(h => h);
  return { headerRow: bestIndex + 1, headers: headers.length ? headers : expected };
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach((header, index) => obj[header] = row[index] == null ? '' : row[index]);
  return obj;
}

function ensureHeaderRow_(sheet, tabName, extraKeys) {
  const info = detectHeaderInfo_(sheet);
  let headers = info.headers && info.headers.length ? info.headers.slice() : (SCHEMA[tabName] || []).slice();

  (extraKeys || []).forEach(k => { if (headers.indexOf(k) === -1) headers.push(k); });

  if (!headers.length) headers = ['ID', 'Notas', 'actualizado_en'];

  if (sheet.getLastRow() < 1 || info.headerRow < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return { headerRow: 1, headers };
  }

  sheet.getRange(info.headerRow, 1, 1, headers.length).setValues([headers]);
  return { headerRow: info.headerRow, headers };
}

function valueForHeader_(data, header) {
  if (!data) return '';
  if (Object.prototype.hasOwnProperty.call(data, header)) return data[header];

  const normalizedHeader = normalize_(header);
  const found = Object.keys(data).find(k => normalize_(k) === normalizedHeader);
  return found ? data[found] : '';
}

function appendRow_(tabName, data) {
  validateTabAndData_(tabName, data);
  const sheet = getSheetOrCreate_(tabName);
  const info = ensureHeaderRow_(sheet, tabName, Object.keys(data));
  const row = info.headers.map(header => valueForHeader_(data, header));
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  logAction_('append', tabName, data.ID || data.id || '');
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
    const v = valueForHeader_(data, header);
    if (v !== '') rowValues[index] = v;
  });

  sheet.getRange(found.rowIndex, 1, 1, info.headers.length).setValues([rowValues]);
  logAction_('update', tabName, String(id));
  return { ok: true, action: 'update', tab: tabName, id: String(id), updated: data, version: APP_VERSION };
}

function upsertById_(tabName, data, key) {
  if (!isAdminKey_(key)) return { ok: false, error: 'Clave admin incorrecta', version: APP_VERSION };
  validateTabAndData_(tabName, data);
  const id = data.ID || data.id || data.Id;
  if (!id) data.ID = new Date().getTime();
  const sheet = getSheetOrCreate_(tabName);
  const info = ensureHeaderRow_(sheet, tabName, Object.keys(data));
  const found = findRowById_(sheet, info, id || data.ID);
  if (found.found) return updateRowById_(tabName, id || data.ID, data);
  return appendRow_(tabName, data);
}

function upsertLocalPayment_(data, key) {
  if (!isAdminKey_(key)) return { ok: false, error: 'Clave admin incorrecta', version: APP_VERSION };
  return upsertById_('PAGOS_LOCAL', data, key);
}

function deleteRowByIdGet_(tabName, id, key) {
  if (!isAdminKey_(key)) return { ok: false, error: 'Clave admin incorrecta', version: APP_VERSION };
  try {
    return deleteRowById_(tabName, id);
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err), tab: tabName, id: String(id || ''), version: APP_VERSION };
  }
}

function deleteRowById_(tabName, id) {
  if (!tabName) throw new Error('Falta tab');
  if (!id) throw new Error('Falta id');
  const sheet = getSheet_(tabName);
  if (!sheet) throw new Error('Pestaña no encontrada: ' + tabName);
  const info = detectHeaderInfo_(sheet);
  const found = findRowById_(sheet, info, id);
  if (!found.found) throw new Error('ID no encontrado: ' + id);
  sheet.deleteRow(found.rowIndex);
  logAction_('delete', tabName, String(id));
  return { ok: true, action: 'delete', tab: tabName, id: String(id), version: APP_VERSION };
}

function findRowById_(sheet, info, id) {
  const headers = info.headers || [];
  const idIndex = headers.findIndex(h => ['id','ID','Id','Setlist ID'].indexOf(String(h)) !== -1);
  if (idIndex === -1) return { found: false };
  const startRow = info.headerRow + 1;
  const lastRow = sheet.getLastRow();
  if (startRow > lastRow) return { found: false };
  const values = sheet.getRange(startRow, idIndex + 1, lastRow - info.headerRow, 1).getDisplayValues().flat();
  const target = String(id);
  const offset = values.findIndex(v => String(v) === target);
  return offset === -1 ? { found: false } : { found: true, rowIndex: startRow + offset };
}

function validateTabAndData_(tabName, data) {
  if (!tabName) throw new Error('Falta tab');
  if (!data || typeof data !== 'object') throw new Error('Falta data');
}

function createBackup_() {
  const ss = ss_();
  const file = DriveApp.getFileById(SHEET_ID);
  const copy = file.makeCopy('BACKUP APP-BCB ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'));
  logAction_('backup', 'ALL', copy.getId());
  return { ok: true, action: 'backup', fileId: copy.getId(), url: copy.getUrl(), version: APP_VERSION };
}

function logAction_(action, tab, id) {
  try {
    const sheet = getSheetOrCreate_('LOG_APP_BCB');
    if (sheet.getLastRow() === 0) sheet.appendRow(SCHEMA.LOG_APP_BCB);
    sheet.appendRow([new Date(), action, tab, id, APP_VERSION]);
  } catch (err) {
    // No bloquear operaciones por fallo de log.
  }
}
