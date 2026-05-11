
/**
 * APP-BCB v3.5 — Reparación de voces.
 * Regla real BCB: solo cantan Miguel y Carmen. Teo no canta; Teo = guitarra solista.
 * Ejecutar una vez si el Sheet tiene columnas o valores heredados de una importación anterior.
 */
function previewRepararVocesBCB() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const report = {
    band: BAND,
    version: APP_VERSION,
    rule: 'Solo cantan Miguel y Carmen. Teo no canta.',
    checkedTabs: [],
    teoVoiceCells: 0,
    teoToneHeaders: 0,
    membersChecked: 0
  };

  ['REPERTORIO','IMPORT_REPERTORIO_TONALIDADES_BCB'].forEach(function(tabName){
    const sh = ss.getSheetByName(tabName);
    if (!sh) return;
    const values = sh.getDataRange().getValues();
    if (!values.length) return;
    const headers = values[0].map(String);
    const voiceCols = [];
    headers.forEach(function(h, idx){
      const n = String(h).toLowerCase();
      if (n.includes('voz') || n.includes('cantante')) voiceCols.push(idx);
      if (String(h).trim().toLowerCase() === 'tono teo') report.teoToneHeaders++;
    });
    for (let r=1; r<values.length; r++){
      voiceCols.forEach(function(c){
        if (String(values[r][c] || '').toLowerCase().includes('teo')) report.teoVoiceCells++;
      });
    }
    report.checkedTabs.push({tab: tabName, rows: Math.max(values.length-1,0), voiceColumns: voiceCols.length});
  });

  const miembros = ss.getSheetByName('MIEMBROS');
  if (miembros) report.membersChecked = Math.max(miembros.getLastRow()-1,0);

  return report;
}

function repararVocesBCB() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const log = {
    band: BAND,
    version: APP_VERSION,
    action: 'repararVocesBCB',
    timestamp: new Date().toISOString(),
    renamedHeaders: [],
    correctedVoiceCells: [],
    correctedMembers: []
  };

  ['REPERTORIO','IMPORT_REPERTORIO_TONALIDADES_BCB'].forEach(function(tabName){
    const sh = ss.getSheetByName(tabName);
    if (!sh) return;

    // Backup visual de la pestaña antes de tocarla.
    sh.copyTo(ss).setName('BACKUP_' + tabName.substring(0, 18) + '_VOCES_' + stamp);

    const range = sh.getDataRange();
    const values = range.getValues();
    if (!values.length) return;

    const headers = values[0].map(String);
    const voiceCols = [];
    headers.forEach(function(h, idx){
      const normalized = String(h).trim().toLowerCase();
      if (normalized === 'tono teo') {
        values[0][idx] = 'Tono guitarra / referencia';
        log.renamedHeaders.push({tab: tabName, from: 'Tono Teo', to: 'Tono guitarra / referencia', column: idx + 1});
      }
      const voiceName = normalized.includes('voz') || normalized.includes('cantante');
      if (voiceName) voiceCols.push(idx);
    });

    for (let r=1; r<values.length; r++){
      voiceCols.forEach(function(c){
        const current = String(values[r][c] || '').trim();
        if (current.toLowerCase().includes('teo')) {
          values[r][c] = 'Por decidir';
          log.correctedVoiceCells.push({tab: tabName, row: r + 1, column: c + 1, old: current, new: 'Por decidir'});
        }
      });
    }

    range.setValues(values);

    // Validaciones de voz si existen columnas de voz.
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Miguel','Carmen','Ambos','Por decidir'], true)
      .setAllowInvalid(false)
      .build();
    voiceCols.forEach(function(c){
      if (sh.getLastRow() > 1) sh.getRange(2, c + 1, sh.getLastRow() - 1, 1).setDataValidation(rule);
    });
  });

  const miembros = ss.getSheetByName('MIEMBROS');
  if (miembros) {
    const range = miembros.getDataRange();
    const values = range.getValues();
    if (values.length) {
      const headers = values[0].map(function(h){ return String(h).trim().toLowerCase(); });
      const nameCol = Math.max(headers.indexOf('nombre'), headers.indexOf('name'));
      const roleCol = Math.max(headers.indexOf('rol'), headers.indexOf('role'), headers.indexOf('instrumento'));
      if (nameCol >= 0 && roleCol >= 0) {
        for (let r=1; r<values.length; r++){
          const name = String(values[r][nameCol] || '').trim().toLowerCase();
          let target = '';
          if (name === 'miguel') target = 'Voz / administrador';
          if (name === 'carmen') target = 'Voz';
          if (name === 'teo') target = 'Guitarra solista';
          if (name === 'álvaro' || name === 'alvaro') target = 'Guitarra rítmica';
          if (name === 'nataly') target = 'Bajista';
          if (name === 'lord enzo' || name === 'lorenzo') target = 'Batería';
          if (target && values[r][roleCol] !== target) {
            log.correctedMembers.push({row: r + 1, name: values[r][nameCol], old: values[r][roleCol], new: target});
            values[r][roleCol] = target;
          }
        }
        range.setValues(values);
      }
    }
  }

  try {
    const logSh = ss.getSheetByName('LOG_APP_BCB') || ss.insertSheet('LOG_APP_BCB');
    logSh.appendRow([new Date(), 'repararVocesBCB', JSON.stringify(log)]);
  } catch (e) {}

  return log;
}
