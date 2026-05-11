/**
 * APP-BCB Bridge — Breathless Cover Band
 * Version: APP-BCB v3.4 final sync · tonalidades BCB
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

const APP_VERSION = 'APP-BCB v3.4 final sync';
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
  ENSAYOS: ['ID','Fecha','hora_inicio','hora_fin','Lugar','estado','objetivo','todos_los_temas','temas_ids','temas_texto','Notas','asistencia_miguel','asistencia_carmen','asistencia_teo','asistencia_alvaro','asistencia_nataly','asistencia_lord_enzo','actualizado_en'],
  REPERTORIO: ['ID','Orden','Canción','Artista / referencia','Idioma','Voz principal','Duración','Tempo / Energía','Tonalidad','Estado','Bloque sugerido','Fuente','Notas','Referencia concreta','Voz asignada','Duración directo','Duración original','Estado duración','Tono visible','Tono original','Tono actual banda','Tono propuesto ensayo','Estado tonalidad','Tono Miguel','Tono Carmen','Tono Teo','Notas transporte','Cejilla / capo','BPM','Playlist Spotify','Spotify tema','YouTube','Enlace acordes/letra','Estructura','Letra/acordes/tablatura','Notas interpretación/letra','Fuente / validación','Notas internas'],
  SETLISTS: ['ID','Setlist ID','Orden','Título','Voz','Tono','Duración','Bloque','Notas'],
  MIEMBROS: ['ID','Nombre','Rol','Email','Teléfono','Estado','Notas'],
  TAREAS: ['ID','Tarea','Responsable','Fecha','Estado','Prioridad','Área','Notas','actualizado_en'],
  PLANTILLAS_DOSSIER: ['ID','Tipo','Uso','Texto','Estado'],
  CONFIG_GRUPO: ['Campo','Valor','Notas'],
  PAGOS_LOCAL: ['ID','Mes','Concepto','Importe total','Moneda','Participantes','Pagado por','Reparto por persona','Estado','Fecha vencimiento','Fecha pago','Notas','ID Miembro','Nombre','Cuota','Pagado','Última actualización'],
  DASHBOARD: ['Indicador','Valor','Notas'],
  LOG_APP_BCB: ['Fecha','Acción','Pestaña','ID','Detalle']
};

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || 'health').toLowerCase();

    if (action === 'iframe') {
      try {
        return iframeBridge_(iframePayload_(params), params);
      } catch (iframeErr) {
        return iframeBridge_({ ok: false, error: String(iframeErr && iframeErr.message ? iframeErr.message : iframeErr), version: APP_VERSION }, params);
      }
    }

    if (action === 'health') return jsonOrJsonp_(health_(), params.callback);
    if (action === 'diagnostic') return jsonOrJsonp_(diagnostic_(), params.callback);
    if (action === 'tabs') return jsonOrJsonp_(getTabs_(), params.callback);
    if (action === 'mobile') return jsonOrJsonp_(getMobilePayload_(), params.callback);
    if (action === 'rehearsals') return jsonOrJsonp_(getRehearsalsPayload_(), params.callback);
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


function iframePayload_(params) {
  const action = String(params.payloadAction || params.targetAction || params.dataAction || 'health').toLowerCase();

  if (action === 'health') return health_();
  if (action === 'diagnostic') return diagnostic_();
  if (action === 'tabs') return getTabs_();
  if (action === 'mobile') return getMobilePayload_();
  if (action === 'rehearsals') return getRehearsalsPayload_();
  if (action === 'sheet') return getSheetPayload_(params.tab, params.limit);

  if (action === 'upsertconcert') return upsertById_('CONCIERTOS', rowFromParam_(params), params.key);
  if (action === 'upsertrehearsal') return upsertById_('ENSAYOS', rowFromParam_(params), params.key);
  if (action === 'upserttask') return upsertById_('TAREAS', rowFromParam_(params), params.key);
  if (action === 'upsertlocalpayment') return upsertLocalPayment_(rowFromParam_(params), params.key);
  if (action === 'deleterow') return deleteRowByIdGet_(params.tab, params.id, params.key);

  return { ok: false, error: 'Acción iframe no reconocida: ' + action, version: APP_VERSION };
}

function iframeBridge_(payload, params) {
  const requestId = String(params && params.requestId ? params.requestId : '');
  const body = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    '(function(){' +
    'var msg={source:"APP_BCB_IFRAME",requestId:' + JSON.stringify(requestId) + ',payload:' + JSON.stringify(payload) + '};' +
    'try{window.parent.postMessage(msg,"*");}catch(e){}' +
    '})();' +
    '</' + 'script></body></html>';
  return HtmlService
    .createHtmlOutput(body)
    .setTitle('APP-BCB Bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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


function diagnostic_() {
  const ss = ss_();
  const tabs = ss.getSheets().map(s => ({ name: s.getName(), rows: s.getLastRow(), columns: s.getLastColumn(), gid: s.getSheetId() }));
  return {
    ok: true,
    band: BAND,
    version: APP_VERSION,
    sheetId: SHEET_ID,
    spreadsheetName: ss.getName(),
    tabs: tabs,
    timestamp: new Date().toISOString()
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


function getRehearsalsPayload_() {
  const tabs = ['ENSAYOS', 'MIEMBROS', 'REPERTORIO'];
  const payload = {
    ok: true,
    band: BAND,
    bandName: BAND_NAME,
    version: APP_VERSION,
    source: 'Google Sheet maestro BCB',
    mode: 'rehearsals-light',
    generatedAt: new Date().toISOString(),
    data: {},
    sheets: {}
  };

  tabs.forEach(tabName => {
    const limit = tabName === 'REPERTORIO' ? 300 : 300;
    const obj = readSheetAsObjects_(tabName, limit);
    payload.data[tabName] = obj;
    payload.sheets[tabName] = Object.assign({ key: tabName, name: tabName }, obj);
  });

  payload.rows = payload.data.ENSAYOS && payload.data.ENSAYOS.rows ? payload.data.ENSAYOS.rows : [];
  payload.data.miembros = payload.data.MIEMBROS && payload.data.MIEMBROS.rows ? payload.data.MIEMBROS.rows : [];
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
  validateTabAndData_('PAGOS_LOCAL', data);

  const month = normalizeMonthForKey_(valueForAny_(data, ['Mes','mes','month']));
  const memberId = normalizeMemberForKey_(valueForAny_(data, ['ID Miembro','id_miembro','memberId','member_id','Nombre','nombre']));
  if (!month) throw new Error('Falta Mes para PAGOS_LOCAL');
  if (!memberId) throw new Error('Falta ID Miembro para PAGOS_LOCAL');

  data.ID = data.ID || data.id || (month + '|' + memberId);
  data.Mes = data.Mes || data.mes || month;
  data['ID Miembro'] = data['ID Miembro'] || data.id_miembro || data.memberId || memberId;
  data.Nombre = data.Nombre || data.nombre || displayMemberForKey_(memberId);
  data.Cuota = data.Cuota || data.cuota || data.amount || 36.17;
  data.Pagado = data.Pagado || data.pagado || data.paid || 'NO';
  data['Última actualización'] = data['Última actualización'] || data.actualizado_en || new Date().toISOString();

  const sheet = getSheetOrCreate_('PAGOS_LOCAL');
  const info = ensureHeaderRow_(sheet, 'PAGOS_LOCAL', Object.keys(data));
  const found = findLocalPaymentRow_(sheet, info, month, memberId);
  if (found.found) {
    updateRowAt_(sheet, info, found.rowIndex, data);
    logAction_('upsertLocalPayment-update', 'PAGOS_LOCAL', data.ID);
    return { ok: true, action: 'upsertLocalPayment', mode: 'update', tab: 'PAGOS_LOCAL', id: String(data.ID), month: month, memberId: memberId, version: APP_VERSION };
  }

  const row = info.headers.map(header => valueForHeader_(data, header));
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  logAction_('upsertLocalPayment-append', 'PAGOS_LOCAL', data.ID);
  return { ok: true, action: 'upsertLocalPayment', mode: 'append', tab: 'PAGOS_LOCAL', id: String(data.ID), month: month, memberId: memberId, version: APP_VERSION };
}

function updateRowAt_(sheet, info, rowIndex, data) {
  const rowValues = sheet.getRange(rowIndex, 1, 1, info.headers.length).getValues()[0];
  info.headers.forEach((header, index) => {
    const v = valueForHeader_(data, header);
    // En pagos de local sí queremos poder limpiar Fecha pago cuando se marca pendiente.
    if (v !== '' || ['Fecha pago','fecha_pago','Pagado','pagado','Última actualización','actualizado_en'].indexOf(String(header)) !== -1) {
      rowValues[index] = v;
    }
  });
  sheet.getRange(rowIndex, 1, 1, info.headers.length).setValues([rowValues]);
}

function findLocalPaymentRow_(sheet, info, month, memberId) {
  const headers = info.headers || [];
  const mesIndex = headers.findIndex(h => ['mes','month'].indexOf(normalize_(h)) !== -1);
  const memberIndex = headers.findIndex(h => ['idmiembro','miembroid','memberid','member_id'].indexOf(normalize_(h)) !== -1);
  if (mesIndex === -1 || memberIndex === -1) return { found: false };

  const startRow = info.headerRow + 1;
  const lastRow = sheet.getLastRow();
  if (startRow > lastRow) return { found: false };

  const values = sheet.getRange(startRow, 1, lastRow - info.headerRow, Math.max(sheet.getLastColumn(), headers.length)).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    const rowMonth = normalizeMonthForKey_(values[i][mesIndex]);
    const rowMember = normalizeMemberForKey_(values[i][memberIndex]);
    if (rowMonth === month && rowMember === memberId) {
      return { found: true, rowIndex: startRow + i };
    }
  }
  return { found: false };
}

function valueForAny_(data, names) {
  const keys = Object.keys(data || {});
  for (const name of names) {
    const target = normalize_(name);
    const found = keys.find(k => normalize_(k) === target);
    if (found !== undefined) return data[found];
  }
  return '';
}

function normalizeMonthForKey_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2];
  const slash = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slash) return slash[3] + '-' + String(slash[2]).padStart(2, '0');
  const ym = raw.match(/(\d{4})\D+(\d{1,2})/);
  if (ym) return ym[1] + '-' + String(ym[2]).padStart(2, '0');
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw.slice(0, 7) : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
}

function normalizeMemberForKey_(value) {
  const s = normalize_(value).replace(/[^a-z0-9]/g, '');
  if (s.indexOf('miguel') !== -1) return 'miguel';
  if (s.indexOf('carmen') !== -1) return 'carmen';
  if (s.indexOf('teo') !== -1) return 'teo';
  if (s.indexOf('alvaro') !== -1) return 'alvaro';
  if (s.indexOf('nataly') !== -1 || s.indexOf('natalia') !== -1) return 'nataly';
  if (s.indexOf('lordenzo') !== -1 || s.indexOf('lord') !== -1 || s.indexOf('enzo') !== -1 || s.indexOf('lorenzo') !== -1) return 'lord_enzo';
  return s;
}

function displayMemberForKey_(memberId) {
  const map = { miguel: 'Miguel', carmen: 'Carmen', teo: 'Teo', alvaro: 'Álvaro', nataly: 'Nataly', lord_enzo: 'Lord Enzo' };
  return map[memberId] || memberId;
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
    'Tono original','Tono actual banda','Tono propuesto ensayo','Estado tonalidad','Tono Miguel','Tono Carmen','Tono Teo',
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
    'Tono Teo':'Tono Teo',
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
