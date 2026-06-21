const APP_BCB_APP_VERSION = '6.3.0-panel-estable';
const STORE_KEY = 'app_bcb_control_pro_v63_panel_estable';
const PERSISTENT_SNAPSHOT_KEY = 'app_bcb_google_sheet_snapshot_latest_v63';
const OLD_STORE_KEYS = ['app_bcb_control_pro_v49_setlist_v11','app_bcb_control_pro_v48_final_sync_miembros_confirmacion_appscript','app_bcb_google_sheet_snapshot_latest_v48','app_bcb_google_sheet_snapshot_latest_v49','app_bcb_control_pro_v41_aprendizajes_enhe','app_bcb_google_sheet_snapshot_latest_v41','app_bcb_control_pro_v40_arranque_estable','app_bcb_google_sheet_snapshot_latest_v40','app_bcb_control_pro_v39_rendimiento_estable','app_bcb_google_sheet_snapshot_latest','app_bcb_control_pro_v38_local_mensual','app_bcb_control_pro_v37_auditoria_estable','app_bcb_control_pro_v36_edicion_repertorio','app_bcb_control_pro_v35_voces_bcb','app_bcb_control_pro_v34_tonalidades_bcb','app_bcb_control_pro_v33_rehearsal_songs_stable','app_bcb_control_pro_v32_local_payments_stable','app_bcb_control_pro_v31_local_payments','app_bcb_control_pro_v30_instant_cache','app_bcb_control_pro_v29_auto_direct','app_bcb_control_pro_v28_sheet_direct','app_bcb_control_pro_v27_iframe_fallback','app_bcb_control_pro_v26_public_endpoint','app_bcb_control_pro_v25_mobile_core','app_bcb_control_pro_v24_admin_guard','app_bcb_control_pro_v23_mobile_rehearsals','app_bcb_control_pro_v22_mobile_sheet_lite','app_bcb_control_pro_v21_mobile_sheet_lite','app_bcb_control_pro_v20_clon_enhe','app_bcb_control_pro_v12','app_bcb_control_pro_v11','app_bcb_control_pro_v10'];
const BCB_REPERTOIRE_PATCH_ID = 'bcb_setlist_v11_20260620';

let db = loadData();
let filteredCRM = [];
let rehearsalSyncRunning = false;
let rehearsalLastSync = 0;
let localPaymentLastSync = 0;
let localSelectedMonth = '';
let googleSheetDirectQueue = Promise.resolve();
let appBcbAutoSyncRunning = false;
let appBcbRendering = false;
let appBcbSaveQueued = false;
const tabs = [
  ['dashboard','Panel','●'],['crm','CRM','●'],['followup','Seguimiento','●'],['gmail','Gmail','●'],['concerts','Conciertos','●'],['rehearsals','Ensayos','●'],['local','Local ensayo','●'],['members','Miembros','●'],
  ['audioLibrary','Pistas','●'],
  ['budget','Presupuesto','●'],['repertoire','Canciones','●'],['setlist','Setlist','●'],['dossier','Dossier','●'],['templates','Plantillas','●'],['tasks','Tareas','●'],['importExport','Exportar','●']
];

const BCB_FIXED_MEMBERS = Object.freeze([
  {id:'miguel',name:'Miguel',role:'Voz / administrador', instrument:'Voz', vocal:'Sí', admin:'Sí', active:'Sí', payLocal:'Sí', showInRehearsals:'Sí', joinDate:'', inactiveDate:'', notes:'Administrador APP-BCB'},
  {id:'carmen',name:'Carmen',role:'Voz', instrument:'Voz', vocal:'Sí', admin:'No', active:'Sí', payLocal:'Sí', showInRehearsals:'Sí', joinDate:'', inactiveDate:'', notes:''},
  {id:'teo',name:'Teo',role:'Guitarra solista', instrument:'Guitarra solista', vocal:'No', admin:'No', active:'Sí', payLocal:'Sí', showInRehearsals:'Sí', joinDate:'', inactiveDate:'', notes:'No canta'},
  {id:'alvaro',name:'Álvaro',role:'Guitarra rítmica', instrument:'Guitarra rítmica', vocal:'No', admin:'No', active:'Sí', payLocal:'Sí', showInRehearsals:'Sí', joinDate:'', inactiveDate:'', notes:''},
  {id:'nataly',name:'Nataly',role:'Bajista', instrument:'Bajo', vocal:'No', admin:'No', active:'Sí', payLocal:'Sí', showInRehearsals:'Sí', joinDate:'', inactiveDate:'', notes:''},
  {id:'lord_enzo',name:'Lord Enzo',role:'Batería', instrument:'Batería', vocal:'No', admin:'No', active:'Sí', payLocal:'Sí', showInRehearsals:'Sí', joinDate:'', inactiveDate:'', notes:''}
]);
const BCB_FIXED_MEMBER_IDS = BCB_FIXED_MEMBERS.map(m=>m.id);


function clone(o){return JSON.parse(JSON.stringify(o));}
function shouldSeedReplace(v){
  if(v === undefined || v === null || v === '') return true;
  const x = String(v).toLowerCase().trim();
  return x === '—' ||
    x === 'por confirmar' ||
    x.includes('pendiente validar') ||
    x.includes('pendiente de reconstrucción') ||
    x.includes('campo preparado para recuperar') ||
    x.includes('tonalidades pendientes') ||
    x.includes('urls por tema pendientes') ||
    x.includes('provisional · revisar en ensayo');
}
function mergeRuntimeData(base, runtime){
  if(!runtime || typeof runtime !== 'object') return base;
  const keepArrays = ['crm','rehearsals','concerts','bandMembers','tasks','localPayments','gmailResponses','templates'];
  keepArrays.forEach(k=>{
    if(Array.isArray(runtime[k]) && runtime[k].length) base[k]=runtime[k];
  });
  ['sheetSync','createdFrom','metricsFromImport'].forEach(k=>{
    if(runtime[k] && typeof runtime[k] === 'object') base[k]=Object.assign({}, base[k]||{}, runtime[k]);
  });
  return base;
}
function loadData(){
  // Google Sheet sigue siendo la fuente principal.
  // La app abre al instante con snapshot local/precargado y actualiza en segundo plano.
  let data=clone(INITIAL_DATA);
  try{
    const snapshotKeys=[
      PERSISTENT_SNAPSHOT_KEY,
      'app_bcb_google_sheet_snapshot_latest_v40',
      'app_bcb_google_sheet_snapshot_latest'
    ];
    const snapshotRaw=snapshotKeys.map(k=>localStorage.getItem(k)).find(Boolean);
    if(snapshotRaw){
      const snapshot=JSON.parse(snapshotRaw);
      data=mergeRuntimeData(data, snapshot);
    }
  }catch(e){}
  try{
    const raw=localStorage.getItem(STORE_KEY);
    if(raw){
      const cached=JSON.parse(raw);
      if(cached && cached.appCacheVersion === APP_BCB_APP_VERSION){
        data=mergeRuntimeData(data, cached);
      }
    }
  }catch(e){}
  return migrateData(data);
}
function clearOldLocalCaches(){
  try{
    OLD_STORE_KEYS.forEach(k=>localStorage.removeItem(k));
    if(window.caches){
      caches.keys().then(keys=>keys.forEach(k=>{
        if(String(k).includes('app-bcb') || String(k).includes('APP-BCB')) caches.delete(k);
      })).catch(()=>{});
    }
  }catch(e){}
}
function migrateData(data){
  data.repertoire = Array.isArray(data.repertoire) ? data.repertoire : [];
  data.artistReferences = Array.isArray(data.artistReferences) ? data.artistReferences : [];
  data.bandMembers = Array.isArray(data.bandMembers) && data.bandMembers.length ? data.bandMembers : [
    {id:'miguel',name:'Miguel',role:'Voz / administrador'},
    {id:'carmen',name:'Carmen',role:'Voz'},
    {id:'teo',name:'Teo',role:'Guitarra solista'},
    {id:'alvaro',name:'Álvaro',role:'Guitarra rítmica'},
    {id:'nataly',name:'Nataly',role:'Bajista'},
    {id:'lord_enzo',name:'Lord Enzo',role:'Batería'}
  ];

  const defaultSong = {
    id: 0,
    order: '',
    title: '',
    titleCanonical: '',
    artist: '',
    versionReference: '',
    singer: '',
    leadVocal: '',
    duration: '',
    durationLive: '',
    durationOriginal: '',
    durationStatus: '',
    tone: '',
    originalKey: '',
    currentKey: '',
    rehearsalKey: '',
    keyStatus: '',
    keyMiguel: '',
    keyCarmen: '',
    transposeNotes: '',
    capo: '',
    bpm: '',
    block: 'Bloque 1',
    blockNumber: '',
    blockObjective: '',
    stageControl: '',
    status: 'Activo',
    spotifyPlaylistUrl: '',
    spotifyUrl: '',
    youtubeUrl: '',
    chordsUrl: '',
    chordsText: '',
    structure: '',
    lyricsNotes: '',
    notes: '',
    sourceNotes: ''
  };

  data.repertoire = data.repertoire.map((song,idx)=>Object.assign({}, defaultSong, {
    id: idx+1
  }, song || {}));

  // v5.8 Guardado estable:
  // INITIAL_DATA es solo semilla de arranque. No se vuelve a usar para reponer canciones borradas.
  // Si Google Sheet o el snapshot traen repertorio real, ese repertorio gana.
  if(!data.repertoire.length && Array.isArray(INITIAL_DATA.repertoire)){
    data.repertoire = clone(INITIAL_DATA.repertoire).map((song,idx)=>Object.assign({}, defaultSong, {id:idx+1}, song || {}));
  }

  data.repertoire.sort((a,b)=>(Number(a.order)||Number(a.id)||0)-(Number(b.order)||Number(b.id)||0));

  data.concerts = Array.isArray(data.concerts) ? data.concerts : [];
  data.localPayments = Array.isArray(data.localPayments) ? data.localPayments : [];
  data.localConfig = Object.assign({monthlyAmount:217, source:'CONFIG_GRUPO / Google Sheet'}, data.localConfig || {});
  try{ data.localPayments = mergeLocalPaymentRows(data.localPayments || [], completeLocalPaymentMonth(data.localPayments || [], new Date().toISOString().slice(0,7))); }catch(e){}
  const defaultConcert = {
    id: 0,
    date: '',
    time: '',
    eventName: '',
    venue: '',
    city: '',
    type: 'Sala',
    status: 'Pre-reserva',
    fee: 0,
    deposit: 0,
    paid: 0,
    sound: '',
    contactId: 0,
    posterUrl: '',
    posterThumbUrl: '',
    posterTitle: '',
    publicInfo: '',
    attendance: {},
    attendanceNotes: '',
    notes: ''
  };
  data.concerts = data.concerts.map((concert, idx)=>Object.assign({}, defaultConcert, {id: idx+1}, concert || {}));
  const seedConcerts = Array.isArray(INITIAL_DATA.concerts) ? INITIAL_DATA.concerts : [];
  seedConcerts.forEach(seedConcert=>{
    const match = data.concerts.find(concert =>
      norm(concert.date) === norm(seedConcert.date) &&
      norm(concert.eventName) === norm(seedConcert.eventName) &&
      norm(concert.venue) === norm(seedConcert.venue)
    );
    if(match){
      Object.keys(seedConcert).forEach(key=>{
        if(shouldSeedReplace(match[key])) match[key] = seedConcert[key];
      });
    }else{
      data.concerts.push(Object.assign({}, defaultConcert, seedConcert, {id: nextId(data.concerts)}));
    }
  });
  data.concerts.sort((a,b)=>String(a.date||'9999-99-99').localeCompare(String(b.date||'9999-99-99')) || String(a.time||'99:99').localeCompare(String(b.time||'99:99')));

  const defaultAttendance = {};
  data.bandMembers.forEach(m=>{ defaultAttendance[m.id] = {status:'Pendiente', notes:''}; });

  const defaultRehearsal = {
    id: 0,
    date: '',
    startTime: '',
    endTime: '',
    place: '',
    status: 'Pendiente',
    objective: '',
    allSongs: false,
    songIds: [],
    notes: '',
    attendance: clone(defaultAttendance)
  };
  data.rehearsals = Array.isArray(data.rehearsals) ? data.rehearsals : [];
  data.rehearsals = data.rehearsals.map((r,idx)=>{
    const item = Object.assign({}, defaultRehearsal, {id: idx+1}, r || {});
    item.songIds = Array.isArray(item.songIds) ? item.songIds.map(Number).filter(Boolean) : [];
    item.allSongs = item.allSongs === true || item.allSongs === 'true';
    item.attendance = Object.assign({}, clone(defaultAttendance), item.attendance || {});
    data.bandMembers.forEach(m=>{
      if(typeof item.attendance[m.id] === 'string'){
        item.attendance[m.id] = {status:item.attendance[m.id], notes:''};
      }else{
        item.attendance[m.id] = Object.assign({status:'Pendiente', notes:''}, item.attendance[m.id] || {});
      }
    });
    return item;
  });
  data.rehearsals.sort((a,b)=>String(a.date||'9999-99-99').localeCompare(String(b.date||'9999-99-99')) || String(a.startTime||'99:99').localeCompare(String(b.startTime||'99:99')));

  data.concerts.forEach(c=>{
    c.attendance = c.attendance || {};
    data.bandMembers.forEach(m=>{
      if(typeof c.attendance[m.id] === 'string'){
        c.attendance[m.id] = {status:c.attendance[m.id], notes:''};
      }else{
        c.attendance[m.id] = Object.assign({status:'Pendiente', notes:''}, c.attendance[m.id] || {});
      }
    });
  });

  return data;
}
function persistDataOnly(){
  db.appCacheVersion=APP_BCB_APP_VERSION;
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
  try{
    const snapshot={
      appCacheVersion: APP_BCB_APP_VERSION,
      updatedAt: new Date().toISOString(),
      crm: db.crm || [],
      rehearsals: db.rehearsals || [],
      concerts: db.concerts || [],
      repertoire: db.repertoire || [],
      setlists: db.setlists || [],
      bandMembers: db.bandMembers || [],
      tasks: db.tasks || [],
      localPayments: db.localPayments || [],
      gmailResponses: db.gmailResponses || [],
      templates: db.templates || [],
      sheetSync: db.sheetSync || {},
      createdFrom: db.createdFrom || {},
      metricsFromImport: db.metricsFromImport || {}
    };
    localStorage.setItem(PERSISTENT_SNAPSHOT_KEY, JSON.stringify(snapshot));
    localStorage.setItem('app_bcb_google_sheet_snapshot_latest', JSON.stringify(snapshot));
  }catch(e){}
}

function saveData(opts={}){
  persistDataOnly();
  if(opts && opts.refresh === false) return;
  if(appBcbRendering){
    appBcbSaveQueued = true;
    return;
  }
  refreshAll();
}

function upsertLocalArrayItem(arrName, item, opts={}){
  if(!item || typeof item !== 'object') return;
  const list = Array.isArray(db[arrName]) ? db[arrName].slice() : [];
  const idx = list.findIndex(x => String(x.id) === String(item.id));
  if(idx >= 0) list[idx] = Object.assign({}, list[idx], item);
  else if(opts.prepend) list.unshift(item);
  else list.push(item);
  db[arrName] = list;
}

function removeLocalArrayItem(arrName, id){
  const list = Array.isArray(db[arrName]) ? db[arrName] : [];
  db[arrName] = list.filter(x => String(x.id) !== String(id));
}

async function syncSingleSheetAfterWrite(tab, opts={}){
  const limits = {
    CRM_GENERAL: 1000,
    CONCIERTOS: 500,
    ENSAYOS: 500,
    REPERTORIO: 800,
    TAREAS: 500,
    PAGOS_LOCAL: 500,
    RESPUESTAS_GMAIL: 500,
    SETLISTS: 500,
    MIEMBROS: 100
  };
  const rows = await fetchSheetTabLive(tab, limits[tab] || 500);
  const count = applyCoreSheetRows(tab, rows);
  saveData();
  return {ok:true, tab, count};
}

function resetData(){if(confirm('¿Restaurar los datos iniciales importados del Excel? Se perderán cambios locales de esta app.')){localStorage.removeItem(STORE_KEY);db=clone(INITIAL_DATA);refreshAll();}}
function esc(v){return String(v??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function eur(n){n=Number(n||0);return n? n.toLocaleString('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}) : '—';}
function compact(v,n=95){v=String(v??'').trim(); return v.length>n ? v.slice(0,n-1)+'…' : v;}
function nextId(arr){return (arr||[]).reduce((m,x)=>Math.max(m, Number(x.id)||0),0)+1;}

function parseEuroValue(v){
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  let s=String(v??'').trim();
  if(!s) return 0;
  s=s.replace(/\s/g,'').replace(/[^\d,.\-]/g,'');
  if(s.includes(',') && s.includes('.')){
    s=s.replace(/\./g,'').replace(',','.');
  }else{
    s=s.replace(',','.');
  }
  const n=Number(s);
  return Number.isFinite(n)?n:0;
}
function money2(n){
  n=Number(n||0);
  return n.toLocaleString('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2})+' €';
}
function normalizeMonthValue(v){
  if(v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0,7);
  let raw=String(v??'').trim();
  if(!raw) return '';
  // Apps Script puede devolver "2026-05-01T09:00:00" o fechas localizadas.
  const iso=raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if(iso) return `${iso[1]}-${iso[2]}`;
  const slash=raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(slash) return `${slash[3]}-${String(slash[2]).padStart(2,'0')}`;
  const yearMonth=raw.match(/(\d{4})\D+(\d{1,2})/);
  if(yearMonth) return `${yearMonth[1]}-${String(yearMonth[2]).padStart(2,'0')}`;
  const d=new Date(raw);
  if(!isNaN(d.getTime())) return d.toISOString().slice(0,7);
  return raw.slice(0,7);
}

function normalizeSheetDateToISO(v){
  if(v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0,10);
  const raw=String(v??'').trim();
  if(!raw) return '';
  // ISO o fecha con hora: 2026-05-14 / 2026-05-14T...
  let m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Google Sheet en español: 14/05/2026 o 14-05-2026
  m=raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(m){
    const y=m[3].length===2 ? '20'+m[3] : m[3];
    return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  }
  const d=new Date(raw);
  if(!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  return raw;
}
function normalizeSheetTimeToHHMM(v){
  if(v instanceof Date && !isNaN(v.getTime())){
    return `${String(v.getHours()).padStart(2,'0')}:${String(v.getMinutes()).padStart(2,'0')}`;
  }
  const raw=String(v??'').trim();
  if(!raw) return '';
  let m=raw.match(/(\d{1,2})[:.](\d{2})/);
  if(m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
  m=raw.match(/^(\d{1,2})$/);
  if(m) return `${String(m[1]).padStart(2,'0')}:00`;
  return raw.slice(0,5);
}
function rehearsalSheetStatus(msg, type='info'){
  const el=document.getElementById('rehearsalSyncStatus');
  if(!el) return;
  el.className = 'notice ' + (type==='ok'?'ok':type==='bad'?'bad':'');
  el.innerHTML = msg;
}
function normalizeMemberKey(v){
  let s=norm(v).replace(/[^a-z0-9]+/g,'');
  if(s==='miguelvoz' || s==='miguelcantante' || s==='migueladministrador') return 'miguel';
  if(s.includes('miguel')) return 'miguel';
  if(s.includes('carmen')) return 'carmen';
  if(s.includes('teo')) return 'teo';
  if(s.includes('alvaro') || s.includes('alvaro')) return 'alvaro';
  if(s.includes('nataly') || s.includes('natalia')) return 'nataly';
  if(s.includes('lordenzo') || s.includes('lord') || s.includes('enzo') || s.includes('lorenzo')) return 'lord_enzo';
  return s;
}
function memberDisplayName(id, fallback=''){
  const key=normalizeMemberKey(id||fallback);
  const fromDb=(Array.isArray(db?.bandMembers)?db.bandMembers:[]).find(m=>normalizeMemberKey(m.id||m.name)===key);
  if(fromDb && fromDb.name) return fromDb.name;
  const map={miguel:'Miguel',carmen:'Carmen',teo:'Teo',alvaro:'Álvaro',nataly:'Nataly',lord_enzo:'Lord Enzo'};
  return map[key] || fallback || id || '';
}
function yesNo(v, def='Sí'){
  const s=norm(v);
  if(!s) return def;
  if(['no','n','false','0','inactivo','baja'].includes(s)) return 'No';
  return 'Sí';
}
function memberIsActive(m){
  const st=norm(m?.active ?? m?.Estado ?? m?.estado ?? m?.status ?? m?.EstadoMiembro ?? '');
  if(['no','inactivo','baja','inactive','false','0'].includes(st)) return false;
  return true;
}
function memberPaysLocal(m){
  if(!memberIsActive(m)) return false;
  return yesNo(m?.payLocal ?? m?.pagaLocal ?? m?.['Paga local'] ?? m?.local ?? 'Sí') === 'Sí';
}
function memberShowsInRehearsals(m){
  if(!memberIsActive(m)) return false;
  return yesNo(m?.showInRehearsals ?? m?.['Aparece ensayos'] ?? m?.ensayos ?? 'Sí') === 'Sí';
}
function normalizeMemberRecord(m, idx=0){
  m = m || {};
  const name = String(m.name || m.Nombre || m.nombre || m.Miembro || m['Usuario app'] || '').trim();
  const nameKey = normalizeMemberKey(name);
  const idRaw = m.id || m.ID || m.Id || m['App ID'] || m['ID interno'] || name || ('miembro_'+idx);
  const idKey = normalizeMemberKey(idRaw);
  const fixedId = BCB_FIXED_MEMBER_IDS.includes(nameKey) ? nameKey : (BCB_FIXED_MEMBER_IDS.includes(idKey) ? idKey : '');
  const id = fixedId || idKey || nameKey || ('miembro_'+idx);
  const role = m.role || m.Rol || m.rol || m.instrument || m.Instrumento || m['Instrumento/voz'] || '';
  const instrument = m.instrument || m.Instrumento || m.instrumento || role || '';

  let vocalRaw = m.vocal ?? m.Voz ?? m.voz ?? m.Vocal ?? m.Canta ?? m.canta ?? '';
  if(id === 'miguel') vocalRaw = 'Miguel';
  else if(id === 'carmen') vocalRaw = 'Carmen';
  else if(['teo','alvaro','nataly','lord_enzo'].includes(id)) vocalRaw = 'No';
  else if(!vocalRaw) vocalRaw = norm(role).includes('voz') ? 'Sí' : 'No';

  let vocal = 'No';
  const nv = norm(vocalRaw);
  if(nv.includes('miguel')) vocal = 'Miguel';
  else if(nv.includes('carmen')) vocal = 'Carmen';
  else if(nv.includes('ambos')) vocal = 'Ambos';
  else if(nv.includes('decidir')) vocal = 'Por decidir';
  else if(yesNo(vocalRaw,'No') === 'Sí') vocal = 'Sí';

  const active = yesNo(m.active ?? m.Activo ?? m.Estado ?? m.estado ?? 'Sí', 'Sí');
  return {
    id,
    name: name || memberDisplayName(id, String(idRaw||'')),
    role: role || instrument,
    instrument,
    vocal,
    admin: yesNo(m.admin ?? m.Admin ?? m.Administrador ?? (id==='miguel'?'Sí':'No'), id==='miguel'?'Sí':'No'),
    active,
    payLocal: yesNo(m.payLocal ?? m['Paga local'] ?? m.pagaLocal ?? m.Local ?? 'Sí', 'Sí'),
    showInRehearsals: yesNo(m.showInRehearsals ?? m['Aparece ensayos'] ?? m.Ensayos ?? m.ensayos ?? 'Sí', 'Sí'),
    joinDate: m.joinDate || m['Fecha alta'] || m.fecha_alta || '',
    inactiveDate: m.inactiveDate || m['Fecha inactividad'] || m.fecha_inactividad || '',
    email: m.email || m.Email || '',
    phone: m.phone || m.Teléfono || m.Telefono || '',
    notes: m.notes || m.Notas || m.notas || '',
    sheetRow: m.sheetRow || m.__row || m.Fila || m['Nº fila'] || '',
    raw: m.raw || m || {}
  };
}
function activeBandMembers(){
  const src=(Array.isArray(db?.bandMembers) && db.bandMembers.length ? db.bandMembers : BCB_FIXED_MEMBERS).map(normalizeMemberRecord);
  const byId=new Map();
  src.forEach(m=>{ if(m.name) byId.set(normalizeMemberKey(m.id||m.name), m); });
  return Array.from(byId.values()).filter(memberIsActive);
}
function cleanBCBLeadVocal(v){
  const s=String(v||'').trim();
  const n=norm(s);
  if(!s) return 'Por decidir';
  if(n.includes('teo')) return 'Por decidir';
  if(n.includes('miguel')&&n.includes('carmen')) return 'Ambos';
  if(n.includes('ambos')) return 'Ambos';
  if(n.includes('miguel')) return 'Miguel';
  if(n.includes('carmen')) return 'Carmen';
  return s;
}
function isPaymentPaid(v){
  const x=norm(v).replace(/\./g,'').trim();
  if(!x) return false;
  if(['no','n','false','0','pendiente','sinpagar','sin pagar','nopagado','no pagado','debe',''].includes(x)) return false;
  return ['si','sí','s','pagado','pagada','paid','true','1','ok','confirmado','cobrado'].includes(x);
}
function mergeTextNotes(a,b){
  const out=[];
  [a,b].forEach(v=>String(v??'').split('|').map(x=>x.trim()).filter(Boolean).forEach(x=>{if(!out.includes(x)) out.push(x);}));
  return out.join(' | ');
}
function localPaymentMemberDefinitions(){
  // APP-BCB v4.7:
  // El local usa la lista de MIEMBROS editable desde la app.
  // Solo entran quienes estén Activos y con Paga local = Sí.
  const source = (Array.isArray(db?.bandMembers) && db.bandMembers.length ? db.bandMembers : BCB_FIXED_MEMBERS)
    .map(normalizeMemberRecord);
  const members = source.filter(memberPaysLocal);
  return members.length ? members : BCB_FIXED_MEMBERS.map(normalizeMemberRecord);
}
function localMemberOrder(){
  const out={};
  localPaymentMemberDefinitions().forEach((m,i)=>{out[normalizeMemberKey(m.id||m.name)] = i+1;});
  return out;
}
function localTotalAmount(){
  try{
    const n=parseEuroValue(db && db.localConfig ? db.localConfig.monthlyAmount : 217);
    return n || 217;
  }catch(e){
    return 217;
  }
}
function localMemberAmount(){
  const members=localPaymentMemberDefinitions();
  const total=localTotalAmount();
  if(!members.length) return 36.17;
  return Math.round((total / members.length) * 100) / 100;
}
function currentYYYYMM(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function addMonthsToYYYYMM(month, offset){
  const m=normalizeMonthValue(month) || currentYYYYMM();
  const parts=m.match(/^(\d{4})-(\d{2})$/);
  const d=parts ? new Date(Number(parts[1]), Number(parts[2])-1 + Number(offset||0), 1) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthLabel(month){
  const m=normalizeMonthValue(month);
  const parts=m.match(/^(\d{4})-(\d{2})$/);
  if(!parts) return month || '—';
  const d=new Date(Number(parts[1]), Number(parts[2])-1, 1);
  return d.toLocaleDateString('es-ES',{month:'long', year:'numeric'});
}
function consolidateLocalPaymentRows(items){
  const allowed=localPaymentMemberDefinitions().map(m=>m.id);
  const byKey=new Map();

  (items||[]).forEach((item,idx)=>{
    const month=normalizeMonthValue(item.month || item.Mes || item.mes || item.Month);
    const memberId=normalizeMemberKey(item.memberId || item['ID Miembro'] || item.id_miembro || item.member_id || item.name || item.Nombre || item.nombre || item.Miembro);
    if(!month || !allowed.includes(memberId)) return;

    const key=month+'|'+memberId;
    const amount=parseEuroValue(item.amount ?? item.Cuota ?? item.cuota ?? item.importe ?? item.Importe);
    const paidValue=item.paid ?? item.Pagado ?? item.pagado ?? item.estado_pago ?? item['Estado pago'] ?? '';
    const clean={
      id:item.id || item.ID || key,
      month,
      memberId,
      name:memberDisplayName(memberId, item.name || item.Nombre || item.nombre || item.Miembro),
      amount: amount || localMemberAmount(),
      paid:isPaymentPaid(paidValue)?'SI':'NO',
      paidDate:item.paidDate || item['Fecha pago'] || item.fecha_pago || item.paid_date || '',
      updatedAt:item.updatedAt || item['Última actualización'] || item.actualizado_en || item.updated_at || '',
      notes:item.notes || item.Notas || item.notas || '',
      raw:item.raw || item
    };

    if(!byKey.has(key)){
      byKey.set(key, clean);
    }else{
      const prev=byKey.get(key);
      const incomingIsNewer = String(clean.updatedAt||clean.paidDate||'') >= String(prev.updatedAt||prev.paidDate||'');
      if(incomingIsNewer){
        clean.notes=mergeTextNotes(prev.notes, clean.notes);
        byKey.set(key, Object.assign({}, prev, clean));
      }else{
        prev.notes=mergeTextNotes(prev.notes, clean.notes);
        byKey.set(key, prev);
      }
    }
  });

  const order=localMemberOrder();
  return [...byKey.values()].sort((a,b)=>
    String(b.month).localeCompare(String(a.month)) || (order[a.memberId]||99)-(order[b.memberId]||99)
  );
}
function localPaymentTimestamp(row){
  const candidates=[row && row.updatedAt, row && row['Última actualización'], row && row.actualizado_en, row && row.paidDate, row && row['Fecha pago']];
  for(const c of candidates){
    const t=Date.parse(c);
    if(Number.isFinite(t)) return t;
  }
  return 0;
}

function chooseLocalPaymentRecord(existing, incoming){
  if(!existing) return incoming;
  if(!incoming) return existing;
  const a=localPaymentTimestamp(existing);
  const b=localPaymentTimestamp(incoming);
  if(b > a) return Object.assign({}, existing, incoming, {notes:mergeTextNotes(existing.notes, incoming.notes)});
  if(a > b) return Object.assign({}, incoming, existing, {notes:mergeTextNotes(existing.notes, incoming.notes)});
  const paid = (isPaymentPaid(existing.paid) || isPaymentPaid(incoming.paid)) ? 'SI' : 'NO';
  return Object.assign({}, existing, incoming, {
    paid,
    paidDate: incoming.paidDate || existing.paidDate || '',
    updatedAt: incoming.updatedAt || existing.updatedAt || '',
    notes: mergeTextNotes(existing.notes, incoming.notes)
  });
}

function mergeLocalPaymentRows(existing=[], incoming=[]){
  const byKey=new Map();
  consolidateLocalPaymentRows(existing).forEach(r=>{
    const key=normalizeMonthValue(r.month)+'|'+normalizeMemberKey(r.memberId||r.name);
    byKey.set(key, r);
  });
  consolidateLocalPaymentRows(incoming).forEach(r=>{
    const key=normalizeMonthValue(r.month)+'|'+normalizeMemberKey(r.memberId||r.name);
    byKey.set(key, chooseLocalPaymentRecord(byKey.get(key), r));
  });
  return consolidateLocalPaymentRows([...byKey.values()]);
}
function localPaymentSeedRow(month, memberId){
  const id=normalizeMemberKey(memberId);
  return {
    id: normalizeMonthValue(month)+'|'+id,
    month: normalizeMonthValue(month) || currentYYYYMM(),
    memberId:id,
    name:memberDisplayName(id),
    amount:localMemberAmount(),
    paid:'NO',
    paidDate:'',
    updatedAt:'',
    notes:'Cuota local pendiente de confirmar'
  };
}
function completeLocalPaymentMonth(items, month){
  const controlMonth=normalizeMonthValue(month) || currentYYYYMM();
  const rows=consolidateLocalPaymentRows(items).filter(r=>normalizeMonthValue(r.month)===controlMonth);
  const byMember=new Map(rows.map(r=>[normalizeMemberKey(r.memberId||r.name), r]));
  localPaymentMemberDefinitions().forEach(m=>{
    if(!byMember.has(m.id)) byMember.set(m.id, localPaymentSeedRow(controlMonth, m.id));
  });
  return consolidateLocalPaymentRows([...byMember.values()]);
}
function ensureLocalPaymentsForMonth(month){
  const controlMonth=normalizeMonthValue(month) || currentYYYYMM();
  const all=consolidateLocalPaymentRows(db.localPayments || []);
  const others=all.filter(r=>normalizeMonthValue(r.month)!==controlMonth);
  const monthRows=completeLocalPaymentMonth(all, controlMonth);
  db.localPayments=mergeLocalPaymentRows(others, monthRows);
  return monthRows;
}
function localMonthRows(month){
  return completeLocalPaymentMonth(db.localPayments || [], normalizeMonthValue(month) || currentYYYYMM());
}
function localMonthStatus(month){
  const rows=localMonthRows(month);
  const total=rows.length;
  const paidCount=rows.filter(r=>isPaymentPaid(r.paid)).length;
  const amount=localTotalAmount();
  const paidAmount=Math.min(amount, rows.filter(r=>isPaymentPaid(r.paid)).reduce((a,r)=>a+(parseEuroValue(r.amount)||0),0));
  return {
    month:normalizeMonthValue(month) || currentYYYYMM(),
    total,
    paidCount,
    pendingCount:Math.max(0,total-paidCount),
    paidAmount,
    pendingAmount:Math.max(0, amount-paidAmount),
    complete: total>0 && paidCount===total
  };
}
function isLocalMonthFullyPaid(month){
  return localMonthStatus(month).complete;
}
function localDefaultControlMonth(){
  const current=currentYYYYMM();
  // Día 1: el mes activo cambia solo porque currentYYYYMM cambia.
  // Si el mes actual ya está completo, se abre automáticamente el siguiente.
  return isLocalMonthFullyPaid(current) ? addMonthsToYYYYMM(current,1) : current;
}
function localAvailableMonths(){
  const current=currentYYYYMM();
  const set=new Set([
    addMonthsToYYYYMM(current,-2),
    addMonthsToYYYYMM(current,-1),
    current,
    addMonthsToYYYYMM(current,1),
    addMonthsToYYYYMM(current,2)
  ]);
  (db.localPayments||[]).forEach(r=>{ const m=normalizeMonthValue(r.month); if(m) set.add(m); });
  if(localSelectedMonth) set.add(normalizeMonthValue(localSelectedMonth));
  return [...set].filter(Boolean).sort().reverse();
}
function setLocalPaymentMonth(month){
  localSelectedMonth=normalizeMonthValue(month) || localDefaultControlMonth();
  ensureLocalPaymentsForMonth(localSelectedMonth);
  saveData({refresh:false});
  renderLocalPayments();
  renderShell();
}
function resetLocalPaymentMonthAuto(){
  localSelectedMonth='';
  renderLocalPayments();
}
function ensureLocalPaymentControls(section, months, controlMonth){
  let controls=document.getElementById('localMonthControls');
  if(!controls){
    controls=document.createElement('div');
    controls.id='localMonthControls';
    const kpis=document.getElementById('localKpis');
    if(kpis && kpis.parentNode) kpis.parentNode.insertBefore(controls, kpis);
    else section.prepend(controls);
  }
  const status=localMonthStatus(controlMonth);
  const autoMonth=localDefaultControlMonth();
  const calendarMonths=[...new Set([
    addMonthsToYYYYMM(controlMonth,-2),
    addMonthsToYYYYMM(controlMonth,-1),
    controlMonth,
    addMonthsToYYYYMM(controlMonth,1),
    addMonthsToYYYYMM(controlMonth,2)
  ].concat(months))].filter(Boolean).sort().slice(-8).reverse();

  controls.innerHTML=`
    <div class="card local-month-panel">
      <div class="local-month-head">
        <div>
          <h4>Calendario mensual del local</h4>
          <p class="muted">El día 1 cambia solo al mes en curso. Cuando un mes queda pagado por todos, la app abre el mes siguiente como pendiente.</p>
        </div>
        <div class="local-month-actions">
          <label>Mes visible
            <select id="localMonthSelect" onchange="setLocalPaymentMonth(this.value)">
              ${months.map(m=>`<option value="${esc(m)}" ${m===controlMonth?'selected':''}>${esc(monthLabel(m))}</option>`).join('')}
            </select>
          </label>
          <button class="mini" onclick="resetLocalPaymentMonthAuto()">Mes automático: ${esc(monthLabel(autoMonth))}</button>
        </div>
      </div>
      <div class="local-month-grid">
        ${calendarMonths.map(m=>{
          const s=localMonthStatus(m);
          const cls=s.complete?'complete':(m===controlMonth?'active':'');
          return `<button class="local-month-card ${cls}" onclick="setLocalPaymentMonth('${esc(m)}')">
            <strong>${esc(monthLabel(m))}</strong>
            <span>${s.paidCount}/${s.total} pagados</span>
            <small>${s.complete?'Cerrado':`${money2(s.pendingAmount)} pendiente`}</small>
          </button>`;
        }).join('')}
      </div>
      <div class="notice ${status.complete?'ok':''}" style="margin-top:10px">
        ${status.complete
          ? `Mes ${esc(monthLabel(controlMonth))} cerrado. La pantalla activa puede pasar al mes siguiente.`
          : `Mes ${esc(monthLabel(controlMonth))} abierto: ${status.paidCount}/${status.total} pagados · ${money2(status.pendingAmount)} pendiente.`}
      </div>
    </div>`;
}
async function pushLocalMonthToSheet(rows, opts={}){
  if(!sheetWriteEnabled()) return Promise.reject(new Error('No hay endpoint Apps Script configurado.'));
  if(!isAdminActive() && !opts.allowUser) return Promise.reject(new Error('Modo usuario: no se puede escribir en Google Sheet.'));
  const normalized=(rows||[]).map(r=>localPaymentToSheetRow(r));
  if(!normalized.length) return {ok:true, count:0};
  sheetStatus('Creando mes de local en Google Sheet…');
  try{
    const payload=await appsScriptJSONP({action:'upsertLocalMonth', key:'1929', rows:JSON.stringify(normalized)});
    if(!payload || payload.ok===false) throw new Error(payload?.error || 'No se pudo crear el mes en Google Sheet.');
    return payload;
  }catch(err){
    // Respaldo si el endpoint antiguo aún no tiene upsertLocalMonth.
    await Promise.all(rows.map(r=>pushLocalPaymentToSheet(r,{afterWrite:'none'})));
    return {ok:true, mode:'fallback-individual', count:rows.length};
  }
}
async function openNextLocalMonthAfterCompletion(closedMonth){
  const month=normalizeMonthValue(closedMonth);
  if(!month || !isLocalMonthFullyPaid(month)) return false;
  const next=addMonthsToYYYYMM(month,1);
  const rows=ensureLocalPaymentsForMonth(next);
  localSelectedMonth=next;
  saveData({refresh:false});
  renderLocalPayments();
  renderShell();

  const flag='app_bcb_local_month_opened_'+next;
  if(!localStorage.getItem(flag)){
    try{
      await pushLocalMonthToSheet(rows,{afterWrite:'none'});
      localStorage.setItem(flag,'1');
      await syncLocalPaymentsFromGoogleSheet({silent:true});
      sheetStatus(`Mes ${monthLabel(month)} cerrado. Abierto ${monthLabel(next)} con todos los miembros pendientes.`, 'ok');
    }catch(err){
      sheetStatus(`Mes ${monthLabel(month)} cerrado. ${monthLabel(next)} abierto en la app, pero no se pudo crear completo en Google Sheet: ${esc(err.message||err)}`, 'bad');
      throw err;
    }
  }else{
    sheetStatus(`Mes ${monthLabel(month)} cerrado. Mes activo: ${monthLabel(next)}.`, 'ok');
  }
  renderLocalPayments();
  return true;
}

const GOOGLE_SHEET_MASTER = {
  spreadsheetId: '1l_cr7pVu4Y3A2v0HPz_3brCNb1011EHIU3hm6D5a47Q',
  gid: '',
  userUrl: 'https://docs.google.com/spreadsheets/d/1l_cr7pVu4Y3A2v0HPz_3brCNb1011EHIU3hm6D5a47Q/edit',
  csvUrl: '',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzbddqoQzAwtxY9zpZNjRnWhziFjw6J0oEYqbDEQYpqe37TkTw3f6T6J4kwxokMKBhycg/exec'
};

function sheetStatus(msg, type='info'){
  const els=[document.getElementById('sheetSyncStatus'), document.getElementById('sheetSyncStatusExport')].filter(Boolean);
  if(!els.length) return;
  els.forEach(el=>{
    el.className = 'notice ' + (type==='ok'?'ok':type==='bad'?'bad':'');
    el.innerHTML = msg;
  });
}
function parseCSV(text){
  const rows=[]; let row=[]; let cur=''; let q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(q){
      if(c==='"' && n==='"'){cur+='"';i++;}
      else if(c==='"'){q=false;}
      else cur+=c;
    }else{
      if(c==='"') q=true;
      else if(c===','){row.push(cur);cur='';}
      else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}
      else if(c==='\r'){}
      else cur+=c;
    }
  }
  row.push(cur); rows.push(row);
  return rows.filter(r=>r.some(v=>String(v||'').trim()!==''));
}
function normalizeHeader(h){
  return norm(String(h||'').replace(/\s+/g,' '));
}
function rowObjectFromHeaders(headers,row){
  const o={};
  headers.forEach((h,i)=>{o[String(h||'').trim()]=row[i]??'';});
  return o;
}
function pick(row, names){
  const keys=Object.keys(row);
  for(const name of names){
    const target=normalizeHeader(name);
    const found=keys.find(k=>normalizeHeader(k)===target);
    if(found!==undefined) return row[found] ?? '';
  }
  return '';
}
function crmFromSheetRow(row, id, index){
  const raw = row || {};
  return {
    id: Number(pick(row,['id','ID'])) || id,
    sheetRow: Number(pick(row,['sheetRow','Fila','Nº fila','rowNumber'])) || index + 2,
    claveCRM: pick(row,['ClaveCRM','Clave CRM','claveCRM']),
    campaign: pick(row,['Campaña','campaign','origen','Origen','tipo_evento','Tipo evento']) || 'CRM Google Sheet',
    origin: pick(row,['Origen','origin','fuente','Fuente']),
    organization: pick(row,[
      'Organización / Local','Organizacion / Local','Organización','Organizacion','Local','Empresa','organization',
      'empresa_entidad','Empresa / entidad','Entidad','sala_lugar','Sala / lugar','Sala','Lugar','contacto','Contacto'
    ]),
    opportunityType: pick(row,['Tipo oportunidad','Tipo de oportunidad','opportunityType','tipo_evento','Tipo evento','Evento']),
    segment: pick(row,['Segmento','segment']),
    municipality: pick(row,['Municipio / Provincia','Municipio','Provincia','Ciudad','city','municipality','ciudad']),
    address: pick(row,['Dirección','Direccion','address','direccion']),
    email: pick(row,['Email','Correo','Correo electrónico','email']),
    emailCc: pick(row,['Email CC','CC','emailCc']),
    phone: pick(row,['Teléfono','Telefono','phone','telefono','WhatsApp']),
    web: pick(row,['Web','web']),
    sourceUrl: pick(row,['Fuente URL','URL fuente','sourceUrl']),
    priority: pick(row,['Prioridad','priority']) || 'Media',
    send: pick(row,['Enviar','send']) || 'Revisar',
    sendStatus: pick(row,['Estado envío','Estado envio','sendStatus','estado','Estado']) || 'Pendiente',
    sendDate: pick(row,['Fecha envío','Fecha envio','sendDate']),
    sendError: pick(row,['Error envío','Error envio','sendError']),
    sentSubject: pick(row,['Asunto enviado','sentSubject']),
    responseReceived: pick(row,['Respuesta recibida','responseReceived']),
    responseDate: pick(row,['Fecha respuesta','responseDate']),
    contactPerson: pick(row,['Persona contacto','Persona de contacto','contactPerson','contacto','Contacto']),
    contactPhone: pick(row,['Teléfono contacto','Telefono contacto','contactPhone']),
    interest: pick(row,['Interés','Interes','interest']),
    availability: pick(row,['Disponibilidad / fechas','Disponibilidad','Fechas','availability','fecha_evento','Fecha evento','ventana_fecha','Ventana fecha']),
    conditions: pick(row,['Condiciones','conditions']),
    budget: pick(row,['Caché / presupuesto','Cache / presupuesto','Presupuesto','budget','importe_o_rango','Importe o rango']),
    technicalRequirements: pick(row,['Requisitos técnicos','Requisitos tecnicos','technicalRequirements']),
    nextAction: pick(row,['Próxima acción','Proxima accion','nextAction','siguiente_paso','Siguiente paso']) || 'Revisar siguiente paso',
    nextActionDate: pick(row,['Fecha próxima acción','Fecha proxima accion','nextActionDate','fecha_siguiente_paso','Fecha siguiente paso']),
    followNotes: pick(row,['Notas seguimiento','followNotes','notas','Notas']),
    lastImport: pick(row,['Última importación','Ultima importacion','lastImport','actualizado_en','Actualizado en']),
    originNotes: pick(row,['Observaciones origen','originNotes']),
    lastEmailReceived: pick(row,['Último email recibido','Ultimo email recibido','lastEmailReceived','ultima_respuesta_email','Última respuesta email']),
    responseSender: pick(row,['Email remitente respuesta','responseSender']),
    sendDossier: pick(row,['Enviar dossier','sendDossier']),
    dossierSent: pick(row,['Dossier enviado','dossierSent']),
    dossierSendDate: pick(row,['Fecha envío dossier','Fecha envio dossier','dossierSendDate']),
    dossierResponseType: pick(row,['Tipo respuesta dossier','dossierResponseType']),
    dossierNotes: pick(row,['Notas dossier','dossierNotes']),
    dossierStatus: pick(row,['Estado dossier','dossierStatus']),
    raw: row
  };
}
function applyCRMFromSheetRows(rows){
  if(!rows.length) throw new Error('La hoja no contiene filas útiles.');
  const headers = rows[0].map(h=>String(h||'').trim());
  const items = rows.slice(1)
    .map((r,i)=>rowObjectFromHeaders(headers,r))
    .map((row,i)=>crmFromSheetRow(row,i+1,i))
    .filter(x=>x.organization || x.email || x.phone || x.contactPerson || x.campaign);
  if(!items.length) throw new Error('No se han detectado registros CRM útiles en la hoja.');
  db.crm = items;
  db.createdFrom.googleSheetUserUrl = GOOGLE_SHEET_MASTER.userUrl;
  db.createdFrom.lastImport = new Date().toLocaleString('es-ES') + ' · Google Sheet maestro';
  db.sheetSync = {
    source: 'Google Sheet maestro',
    spreadsheetId: GOOGLE_SHEET_MASTER.spreadsheetId,
    gid: GOOGLE_SHEET_MASTER.gid,
    records: items.length,
    updatedAt: new Date().toISOString(),
    status: 'ok'
  };
}
function appBcbEndpointUrl(params={}){
  const url = new URL(GOOGLE_SHEET_MASTER.appsScriptUrl);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k, v));
  url.searchParams.set('ts', String(Date.now()));
  return url.toString();
}

function googleSheetGvizUrl(tab){
  const url = new URL('https://docs.google.com/spreadsheets/d/'+GOOGLE_SHEET_MASTER.spreadsheetId+'/gviz/tq');
  url.searchParams.set('sheet', tab);
  url.searchParams.set('headers', '0');
  url.searchParams.set('tq', 'select *');
  url.searchParams.set('tqx', 'out:json');
  url.searchParams.set('ts', String(Date.now()));
  return url.toString();
}

function gvizCellValue(cell){
  if(!cell) return '';
  if(cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== '') return cell.f;
  if(cell.v === undefined || cell.v === null) return '';
  return cell.v;
}

function scoreHeaderCandidate(row, tab){
  const vals = (row || []).map(v=>normalizeHeader(v));
  let score = 0;
  const has = (needle)=>vals.some(v=>v.includes(normalizeHeader(needle)));
  if(has('id')) score += 3;
  if(has('estado')) score += 3;
  if(has('fecha')) score += 2;
  if(has('cancion') || has('canción')) score += 4;
  if(has('artista')) score += 2;
  if(has('local') || has('sala') || has('organizacion') || has('organización')) score += 4;
  if(has('email') || has('correo')) score += 2;
  if(has('telefono') || has('teléfono')) score += 2;
  if(has('siguiente paso')) score += 3;
  if(tab === 'CRM_GENERAL'){
    if(has('organizacion') || has('organización') || has('local') || has('empresa')) score += 6;
    if(has('email') || has('web') || has('instagram')) score += 3;
  }
  if(tab === 'ENSAYOS'){
    if(has('hora inicio') || has('hora_inicio')) score += 4;
    if(has('lugar') || has('objetivo')) score += 4;
  }
  if(tab === 'REPERTORIO'){
    if(has('cancion') || has('canción')) score += 6;
    if(has('duracion') || has('duración') || has('voz principal')) score += 3;
  }
  if(tab === 'CONCIERTOS'){
    if(has('fecha') && (has('lugar') || has('sala'))) score += 5;
  }
  if(tab === 'PAGOS_LOCAL'){
    if(has('mes') && (has('pagado') || has('cuota'))) score += 5;
  }
  return score;
}

function gvizResponseToObjects(resp, tab, limit=500){
  if(!resp) throw new Error('Google Sheet directo no devolvió respuesta.');
  if(resp.status && resp.status !== 'ok'){
    const msg = (resp.errors && resp.errors[0] && (resp.errors[0].detailed_message || resp.errors[0].message)) || resp.status;
    throw new Error('Google Sheet directo: '+msg);
  }
  const table = resp.table || {};
  const rawRows = (table.rows || []).map(r => (r.c || []).map(gvizCellValue));
  const cleanRows = rawRows.filter(r => r.some(v => String(v ?? '').trim() !== ''));
  if(!cleanRows.length) return [];

  let headerIndex = 0;
  let bestScore = -1;
  cleanRows.slice(0, 12).forEach((row, idx)=>{
    const sc = scoreHeaderCandidate(row, tab);
    if(sc > bestScore){ bestScore = sc; headerIndex = idx; }
  });

  // Si no encontramos cabecera clara, usamos etiquetas de columnas de Google.
  let headers = (cleanRows[headerIndex] || []).map((h,i)=>String(h || ('Columna '+(i+1))).trim());
  const usefulHeader = bestScore >= 4 && headers.some(h=>String(h||'').trim());
  let dataRows = usefulHeader ? cleanRows.slice(headerIndex + 1) : cleanRows;

  if(!usefulHeader){
    headers = (table.cols || []).map((c,i)=>String((c && (c.label || c.id)) || ('Columna '+(i+1))).trim());
  }

  // Normaliza cabeceras vacías.
  headers = headers.map((h,i)=>String(h || ('Columna '+(i+1))).trim());

  const out = dataRows.slice(0, Number(limit)||500).map((row, idx)=>{
    const obj = {};
    headers.forEach((h,i)=>{ obj[h] = row[i] ?? ''; });
    obj.sheetRow = (usefulHeader ? headerIndex + 2 + idx : 1 + idx);
    obj.__source = 'Google Sheet directo';
    obj.__tab = tab;
    return obj;
  }).filter(o => Object.keys(o).some(k => !k.startsWith('__') && String(o[k] ?? '').trim() !== ''));

  return out;
}

function fetchSheetTabViaGoogleSheetDirect(tab, limit=500){
  const run = () => new Promise((resolve,reject)=>{
    const previousGoogle = window.google;
    const previousVisualization = previousGoogle && previousGoogle.visualization;
    const previousQuery = previousVisualization && previousVisualization.Query;
    const previousSetResponse = previousQuery && previousQuery.setResponse;
    const script = document.createElement('script');
    let done = false;
    const timeout = setTimeout(()=>{
      cleanup();
      reject(new Error('Tiempo agotado leyendo Google Sheet directo. Publica la hoja en la web o comparte con enlace de lectura.'));
    }, 6000);

    function cleanup(){
      if(done) return;
      done = true;
      clearTimeout(timeout);
      if(script.parentNode) script.parentNode.removeChild(script);
      try{
        if(previousSetResponse && window.google && window.google.visualization && window.google.visualization.Query){
          window.google.visualization.Query.setResponse = previousSetResponse;
        }
      }catch(e){}
    }

    window.google = window.google || {};
    window.google.visualization = window.google.visualization || {};
    window.google.visualization.Query = window.google.visualization.Query || {};
    window.google.visualization.Query.setResponse = function(resp){
      try{
        const rows = gvizResponseToObjects(resp, tab, limit);
        cleanup();
        resolve(rows);
      }catch(err){
        cleanup();
        reject(err);
      }
    };

    script.onerror = function(){
      cleanup();
      reject(new Error('No se pudo cargar Google Sheet directo. Revisa publicación web/permiso de lectura del Sheet.'));
    };
    script.src = googleSheetGvizUrl(tab);
    document.head.appendChild(script);
  });

  // Google Visualization usa un callback global único. Si se lanzan varias lecturas a la vez
  // se pisan entre sí y pueden dejar la app esperando. Se serializa siempre.
  const queued = googleSheetDirectQueue.then(run, run);
  googleSheetDirectQueue = queued.catch(()=>{});
  return queued;
}

async function fetchSheetTabForRead(tab, limit=500){
  // Lectura estable: primero Google Sheet directo publicado, después Apps Script como respaldo.
  // Evita que una implementación de Apps Script lenta o bloqueada deje congelada la app.
  try{
    return await fetchSheetTabViaGoogleSheetDirect(tab, limit);
  }catch(directErr){
    try{
      return await fetchSheetTabViaAppsScript(tab, limit);
    }catch(scriptErr){
      const err = new Error('No se pudo leer '+tab+' ni por Google Sheet directo ni por Apps Script. Directo: '+(directErr.message||directErr)+' | Apps Script: '+(scriptErr.message||scriptErr));
      err.directError = directErr;
      err.scriptError = scriptErr;
      throw err;
    }
  }
}

async function fetchSheetTabLive(tab, limit=500){
  // v5.8: para confirmar guardados usamos Apps Script vivo antes que Google Sheet publicado.
  // El publicado puede ir con caché y hacía que ensayos/pagos/canciones parecieran no guardarse.
  let scriptErr = null;
  try{
    const payload = await appsScriptJsonpOnly({action:'sheet', tab, limit:String(limit)});
    if(payload && payload.ok !== false){
      let rows = Array.isArray(payload.rows) ? payload.rows : [];
      if(!rows.length){
        const sheet = findPayloadSheet(payload, [tab]);
        rows = rowsFromPayloadSheet(sheet);
      }
      if(Array.isArray(rows)) return rows;
    }
    throw new Error((payload && payload.error) || 'Apps Script no devolvió filas para '+tab);
  }catch(err){
    scriptErr = err;
    console.warn('APP-BCB v5.8: lectura viva por Apps Script falló para '+tab+'. Probando lectura normal:', err);
  }
  try{
    return await fetchSheetTabForRead(tab, limit);
  }catch(readErr){
    const err = new Error('No se pudo leer '+tab+' en vivo ni por lectura normal. Apps Script: '+(scriptErr && (scriptErr.message||scriptErr))+' | Lectura: '+(readErr.message||readErr));
    err.scriptError = scriptErr;
    err.readError = readErr;
    throw err;
  }
}

function appsScriptJsonpOnly(params={}){
  return new Promise((resolve,reject)=>{
    if(!GOOGLE_SHEET_MASTER.appsScriptUrl) return reject(new Error('No hay URL /exec de Apps Script configurada.'));
    const cb='APP_BCB_JSONP_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timeout=setTimeout(()=>{
      cleanup();
      reject(new Error('Tiempo agotado leyendo Apps Script por JSONP.'));
    }, 10000);
    function cleanup(){
      clearTimeout(timeout);
      try{delete window[cb];}catch(e){window[cb]=undefined;}
      if(script && script.parentNode) script.parentNode.removeChild(script);
    }
    window[cb]=function(payload){
      cleanup();
      resolve(payload);
    };
    script.onerror=function(){
      cleanup();
      reject(new Error('No se pudo cargar el endpoint de Apps Script por JSONP.'));
    };
    script.src=appBcbEndpointUrl(Object.assign({}, params, {callback:cb}));
    document.head.appendChild(script);
  });
}

function appsScriptIframe(params={}){
  return new Promise((resolve,reject)=>{
    if(!GOOGLE_SHEET_MASTER.appsScriptUrl) return reject(new Error('No hay URL /exec de Apps Script configurada.'));
    const requestId='APP_BCB_IFRAME_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const iframe=document.createElement('iframe');
    iframe.style.display='none';
    iframe.style.width='0';
    iframe.style.height='0';
    iframe.style.border='0';
    const timeout=setTimeout(()=>{
      cleanup();
      reject(new Error('Tiempo agotado leyendo Apps Script por iframe.'));
    }, 45000);
    function cleanup(){
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      if(iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }
    function handler(ev){
      const data=ev && ev.data;
      if(!data || data.source !== 'APP_BCB_IFRAME' || data.requestId !== requestId) return;
      cleanup();
      resolve(data.payload);
    }
    window.addEventListener('message', handler);
    const iframeParams=Object.assign({}, params);
    iframeParams.payloadAction = params.action || 'health';
    iframeParams.action = 'iframe';
    iframeParams.requestId = requestId;
    iframe.src=appBcbEndpointUrl(iframeParams);
    document.body.appendChild(iframe);
  });
}


function appsScriptFormPost(params={}){
  // Escritura estable para Google Apps Script.
  // Evita depender de JSONP GET para operaciones de admin; usa POST a iframe oculto
  // y el Apps Script responde con postMessage.
  return new Promise((resolve,reject)=>{
    if(!GOOGLE_SHEET_MASTER.appsScriptUrl) return reject(new Error('No hay URL /exec de Apps Script configurada.'));
    const requestId='APP_BCB_POST_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const iframe=document.createElement('iframe');
    const form=document.createElement('form');
    let finished=false;
    iframe.name=requestId;
    iframe.id=requestId;
    iframe.style.display='none';
    iframe.style.width='0';
    iframe.style.height='0';
    iframe.style.border='0';

    const timeout=setTimeout(()=>{
      cleanup();
      reject(new Error('Tiempo agotado escribiendo en Apps Script por POST.'));
    }, 8000);

    function cleanup(){
      if(finished) return;
      finished=true;
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      try{ if(form && form.parentNode) form.parentNode.removeChild(form); }catch(e){}
      try{ if(iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe); }catch(e){}
    }

    function handler(ev){
      const data=ev && ev.data;
      if(!data || data.source !== 'APP_BCB_IFRAME' || data.requestId !== requestId) return;
      cleanup();
      resolve(data.payload);
    }

    window.addEventListener('message', handler);

    form.method='POST';
    form.action=GOOGLE_SHEET_MASTER.appsScriptUrl;
    form.target=requestId;
    form.style.display='none';

    const postParams=Object.assign({}, params, {
      bridge:'iframePost',
      requestId:requestId,
      ts:String(Date.now())
    });

    Object.entries(postParams).forEach(([k,v])=>{
      const input=document.createElement('input');
      input.type='hidden';
      input.name=k;
      input.value=(v===undefined || v===null) ? '' : String(v);
      form.appendChild(input);
    });

    document.body.appendChild(iframe);
    document.body.appendChild(form);

    try{
      form.submit();
    }catch(err){
      cleanup();
      reject(err);
    }
  });
}

async function appsScriptWrite(params={}){
  // v4.7: escritura general; miembros usan GET mínimo directo.
  // Primero intenta JSONP/GET (suficiente para miembros, pagos, tareas y cambios cortos).
  // Si el payload es grande o JSONP falla, usa POST por iframe como respaldo.
  const rowText = String(params.row || params.rows || '');
  const preferJsonp = rowText.length <= 5500;
  const errors = [];
  async function runJsonp(){
    const payload = await appsScriptJSONP(params);
    if(!payload || payload.ok === false) throw new Error((payload && payload.error) || 'Apps Script respondió sin OK por JSONP.');
    payload._transport = payload._transport || 'jsonp';
    return payload;
  }
  async function runPost(){
    const payload = await appsScriptFormPost(params);
    if(!payload || payload.ok === false) throw new Error((payload && payload.error) || 'Apps Script respondió sin OK por POST.');
    payload._transport = payload._transport || 'post-iframe';
    return payload;
  }
  if(preferJsonp){
    try{ return await runJsonp(); }
    catch(e){ errors.push('JSONP: '+(e.message||e)); }
    try{ return await runPost(); }
    catch(e){ errors.push('POST: '+(e.message||e)); }
  }else{
    try{ return await runPost(); }
    catch(e){ errors.push('POST: '+(e.message||e)); }
    try{ return await runJsonp(); }
    catch(e){ errors.push('JSONP: '+(e.message||e)); }
  }
  throw new Error(errors.join(' | ') || 'No se pudo escribir en Apps Script.');
}


async function appsScriptJSONP(params={}){
  try{
    const payload = await appsScriptJsonpOnly(params);
    if(payload && typeof payload === 'object') payload._transport = payload._transport || 'jsonp';
    return payload;
  }catch(jsonpErr){
    console.warn('APP-BCB JSONP falló; probando iframe fallback:', jsonpErr);
    const payload = await appsScriptIframe(params);
    if(payload && typeof payload === 'object') payload._transport = payload._transport || 'iframe';
    return payload;
  }
}

function isAdminActive(){
  return document.body.classList.contains('admin-enabled') ||
    localStorage.getItem('app_bcb_admin_local_unlocked_v2') === '1';
}

function sheetWriteEnabled(){
  return !!(GOOGLE_SHEET_MASTER && GOOGLE_SHEET_MASTER.appsScriptUrl);
}

function attendanceToSheetFields(attendance){
  const out={};
  const members = bandMembers({includeInactive:true});
  const written = new Set();

  function cleanStatus(v){
    if(!v) return '';
    return typeof v === 'string' ? v : (v.status || '');
  }
  function putFor(id, name, status){
    const key = normalizeMemberKey(id || name);
    const label = String(name || id || '').trim();
    if(!key || !status) return;
    out['asistencia_'+key] = status;
    if(label){
      out[label] = status;
      out['Asistencia '+label] = status;
    }
    written.add(key);
  }

  members.forEach(m=>{
    const id = normalizeMemberKey(m.id || m.name);
    const v = attendance && (attendance[id] || attendance[m.id] || attendance[m.name]);
    putFor(id, m.name, cleanStatus(v));
  });

  // Fallback: no perder asistencias de miembros añadidos aunque todavía no estén normalizados.
  Object.keys(attendance || {}).forEach(rawId=>{
    const key = normalizeMemberKey(rawId);
    if(written.has(key)) return;
    const v = attendance[rawId];
    putFor(key, rawId, cleanStatus(v));
  });

  return out;
}


function contactToSheetRow(c){
  const notes = [c.followNotes, c.dossierNotes, c.originNotes].filter(Boolean).join(' | ');
  return {
    id: c.id,
    ID: c.id,
    sheetRow: c.sheetRow || '',
    'Estado': c.sendStatus || c.status || 'Lead nuevo',
    estado: c.sendStatus || c.status || 'Lead nuevo',
    'Siguiente paso': c.nextAction || '',
    siguiente_paso: c.nextAction || '',
    'Fecha siguiente paso': c.nextActionDate || '',
    fecha_siguiente_paso: c.nextActionDate || '',
    'Contacto': c.contactPerson || '',
    contacto: c.contactPerson || '',
    'Empresa / entidad': c.organization || '',
    empresa_entidad: c.organization || '',
    'Organización / Local': c.organization || '',
    organization: c.organization || '',
    'Tipo evento': c.opportunityType || '',
    tipo_evento: c.opportunityType || '',
    'Fecha / ventana': c.availability || '',
    ventana_fecha: c.availability || '',
    Ciudad: c.municipality || '',
    ciudad: c.municipality || '',
    'Municipio / Provincia': c.municipality || '',
    Dirección: c.address || '',
    Email: c.email || '',
    email: c.email || '',
    'Email CC': c.emailCc || '',
    Teléfono: c.phone || c.contactPhone || '',
    telefono: c.phone || c.contactPhone || '',
    Web: c.web || '',
    Campaña: c.campaign || 'CRM BCB',
    Prioridad: c.priority || 'Media',
    Enviar: c.send || '',
    'Estado envío': c.sendStatus || 'Lead nuevo',
    'Respuesta recibida': c.responseReceived || '',
    'Fecha respuesta': c.responseDate || '',
    'Persona contacto': c.contactPerson || '',
    'Teléfono contacto': c.contactPhone || '',
    Interés: c.interest || '',
    Disponibilidad: c.availability || '',
    Condiciones: c.conditions || '',
    'Caché / presupuesto': c.budget || '',
    'Importe o rango': c.budget || '',
    'Requisitos técnicos': c.technicalRequirements || '',
    'Próxima acción': c.nextAction || '',
    'Fecha próxima acción': c.nextActionDate || '',
    'Notas seguimiento': c.followNotes || '',
    Notas: notes,
    'Enviar dossier': c.sendDossier || '',
    'Estado dossier': c.dossierStatus || '',
    'Notas dossier': c.dossierNotes || '',
    actualizado_en: new Date().toISOString()
  };
}


function concertToSheetRow(c){
  return Object.assign({
    id:c.id,
    ID:c.id,
    estado:c.status || '',
    Estado:c.status || '',
    fecha:c.date || '',
    Fecha:c.date || '',
    hora:c.time || '',
    Hora:c.time || '',
    titulo:c.eventName || '',
    'Sala / Evento':c.eventName || c.venue || '',
    sala_lugar:c.venue || '',
    ciudad:c.city || '',
    direccion:c.address || '',
    entrada:c.publicInfo || '',
    cartel_url:c.posterUrl || '',
    cartel_titulo:c.posterTitle || '',
    notas_publicas:c.publicInfo || '',
    notas_produccion:c.notes || '',
    Caché:c.fee || '',
    actualizado_en:new Date().toISOString()
  }, attendanceToSheetFields(c.attendance||{}));
}

function rehearsalSongIdsForSave(r){
  if(!r || r.allSongs) return [];
  return unique((r.songIds || [])
    .map(x=>Number(x))
    .filter(n=>Number.isFinite(n) && n>0));
}

function rehearsalSongTitlesForSave(ids){
  const byId = new Map((db.repertoire || []).map(s=>[Number(s.id), s]));
  return (ids || [])
    .map(id=>byId.get(Number(id))?.title || '')
    .filter(Boolean)
    .join(' | ');
}

function rehearsalToSheetRow(r){
  const ids = rehearsalSongIdsForSave(r);
  const titles = r.allSongs ? 'Todos los temas' : rehearsalSongTitlesForSave(ids);
  return Object.assign({
    id:r.id,
    ID:r.id,
    fecha:r.date || '',
    Fecha:r.date || '',
    hora_inicio:r.startTime || '',
    hora_fin:r.endTime || '',
    Hora:[r.startTime||'',r.endTime||''].filter(Boolean).join('-'),
    lugar:r.place || '',
    Lugar:r.place || '',
    estado:r.status || '',
    Estado:r.status || '',
    objetivo:r.objective || '',
    todos_los_temas:r.allSongs ? 'SI' : 'NO',
    'Todos los temas':r.allSongs ? 'SI' : 'NO',
    // No guardar JSON tipo [1,2,3]. Google Sheet y la app lo leen más estable como CSV.
    temas_ids:r.allSongs ? 'TODOS' : ids.join(','),
    'Temas IDs':r.allSongs ? 'TODOS' : ids.join(','),
    temas_texto:titles,
    'Temas texto':titles,
    Temas:titles,
    notas:r.notes || '',
    Notas:r.notes || '',
    actualizado_en:new Date().toISOString()
  }, attendanceToSheetFields(r.attendance||{}));
}

function taskToSheetRow(t){
  return {
    id:t.id,
    ID:t.id,
    titulo:t.title || '',
    Tarea:t.title || '',
    responsable:t.owner || '',
    Responsable:t.owner || '',
    fecha:t.due || '',
    Fecha:t.due || '',
    estado:t.status || '',
    Estado:t.status || '',
    prioridad:t.priority || '',
    Prioridad:t.priority || '',
    area:t.area || '',
    Área:t.area || '',
    notas:t.notes || '',
    Notas:t.notes || '',
    actualizado_en:new Date().toISOString()
  };
}

function localPaymentToSheetRow(patch){
  const id=normalizeMemberKey(patch.memberId || patch.name);
  const name=memberDisplayName(id);
  return {
    mes:normalizeMonthValue(patch.month) || new Date().toISOString().slice(0,7),
    Mes:normalizeMonthValue(patch.month) || new Date().toISOString().slice(0,7),
    memberId:id,
    'ID Miembro':id,
    nombre:name,
    Nombre:name,
    cuota:parseEuroValue(patch.amount) || 36.17,
    Cuota:parseEuroValue(patch.amount) || 36.17,
    pagado:isPaymentPaid(patch.paid) ? 'SI' : 'NO',
    Pagado:isPaymentPaid(patch.paid) ? 'SI' : 'NO',
    fecha_pago:patch.paidDate || '',
    'Fecha pago':patch.paidDate || '',
    notas:patch.notes || '',
    Notas:patch.notes || '',
    actualizado_en:new Date().toISOString(),
    'Última actualización':new Date().toISOString()
  };
}
function memberToSheetRow(m){
  const item=normalizeMemberRecord(m);
  return {
    ID:item.id,
    Nombre:item.name,
    Rol:item.role || item.instrument || '',
    Instrumento:item.instrument || item.role || '',
    Voz:item.vocal || 'No',
    Admin:item.admin || 'No',
    Activo:item.active || 'Sí',
    'Paga local':item.payLocal || 'Sí',
    'Aparece ensayos':item.showInRehearsals || 'Sí',
    'Fecha alta':item.joinDate || '',
    'Fecha inactividad':item.inactiveDate || '',
    Email:item.email || '',
    Teléfono:item.phone || '',
    Notas:item.notes || '',
    actualizado_en:new Date().toISOString()
  };
}

function songToSheetRow(s){
  const voice = s.leadVocal || s.singer || '';
  const row = {
    id:s.id,
    ID:s.id,
    sheetRow:s.sheetRow || '',
    Orden:s.order || s.id || '',
    Canción:s.title || '',
    'Artista / referencia':s.artist || '',
    Idioma:s.language || '',
    'Voz principal':voice,
    'Voz asignada':voice,
    Duración:s.durationLive || s.duration || '',
    'Duración directo':s.durationLive || s.duration || '',
    'Duración original':s.durationOriginal || '',
    'Estado duración':s.durationStatus || '',
    Tonalidad:s.currentKey || s.tone || '',
    'Tono visible':s.currentKey || s.tone || '',
    'Tono original':s.originalKey || '',
    'Tono actual banda':s.currentKey || s.tone || '',
    'Tono propuesto ensayo':s.rehearsalKey || '',
    'Estado tonalidad':s.keyStatus || '',
    'Tono Miguel':s.keyMiguel || '',
    'Tono Carmen':s.keyCarmen || '',
    'Tono guitarra / referencia':s.guitarKey || '',
    'Notas transporte':s.transposeNotes || '',
    'Cejilla / capo':s.capo || '',
    BPM:s.bpm || '',
    Estado:s.status || '',
    'Bloque sugerido':s.block || '',
    'Referencia concreta':s.versionReference || '',
    'Playlist Spotify':s.spotifyPlaylistUrl || db.createdFrom?.spotifyPlaylistUrl || '',
    'Spotify tema':s.spotifyUrl || '',
    YouTube:s.youtubeUrl || '',
    'Enlace acordes/letra':s.chordsUrl || '',
    Estructura:s.structure || '',
    'Letra/acordes/tablatura':s.chordsText || '',
    'Notas interpretación/letra':s.lyricsNotes || '',
    'Fuente / validación':s.sourceNotes || '',
    'Notas internas':s.notes || '',
    Fuente:s.source || 'APP-BCB',
    Notas:s.notes || '',
    actualizado_en:new Date().toISOString()
  };
  return row;
}

async function syncRepertoireFromGoogleSheet(opts={}){
  const silent=!!opts.silent;
  try{
    sheetStatus('Actualizando repertorio desde Google Sheet…');
    const rows = await fetchSheetTabLive('REPERTORIO', 800);
    const count = applySongsFromSheet(rows);
    saveData();
    sheetStatus('Repertorio actualizado desde Google Sheet: '+count+' canciones.', 'ok');
    if(!silent) alert('Repertorio actualizado desde Google Sheet: '+count+' canciones.');
    return true;
  }catch(err){
    sheetStatus('No se pudo actualizar REPERTORIO desde Google Sheet: '+esc(err.message||err), 'bad');
    if(!silent) alert('No se pudo actualizar REPERTORIO: '+(err.message||err));
    return false;
  }
}

function pushSongToSheet(s, opts={}){
  return pushSheetRow('upsertRepertoire', songToSheetRow(s), Object.assign({afterWrite:'repertoire'}, opts));
}


function pushSheetRow(action,row,opts={}){
  if(!sheetWriteEnabled()) return Promise.reject(new Error('No hay endpoint Apps Script configurado.'));
  if(!isAdminActive() && !opts.allowUser) return Promise.reject(new Error('Modo usuario: no se puede escribir en Google Sheet.'));
  sheetStatus('Guardando en Google Sheet maestro…');
  return appsScriptWrite({action, key:'1929', row:JSON.stringify(row)})
    .then(payload=>{
      if(!payload || payload.ok===false) throw new Error(payload?.error || 'No se pudo guardar en Google Sheet.');
      sheetStatus('Guardado en Google Sheet maestro. Actualizando vista…','ok');
      let afterWrite;
      if(opts.afterWrite === 'local') afterWrite = syncLocalPaymentsFromGoogleSheet({silent:true, reason:'afterLocalWrite'});
      else if(opts.afterWrite === 'repertoire') afterWrite = syncRepertoireFromGoogleSheet({silent:true, reason:'afterRepertoireWrite'});
      else if(opts.afterWrite === 'crm') afterWrite = syncSingleSheetAfterWrite('CRM_GENERAL');
      else if(opts.afterWrite === 'concerts') afterWrite = syncSingleSheetAfterWrite('CONCIERTOS');
      else if(opts.afterWrite === 'rehearsals') afterWrite = syncRehearsalsFromGoogleSheet({silent:true, reason:'afterRehearsalWrite'});
      else if(opts.afterWrite === 'tasks') afterWrite = syncSingleSheetAfterWrite('TAREAS');
      else if(opts.afterWrite === 'members') afterWrite = syncSingleSheetAfterWrite('MIEMBROS');
      else if(opts.afterWrite === 'none') afterWrite = true;
      else afterWrite = syncCRMFromGoogleSheet({silent:true, afterWrite:true});
      return Promise.resolve(afterWrite).then(()=>payload);
    })
    .catch(err=>{
      sheetStatus('Guardado solo en este navegador. Falló Google Sheet: '+esc(err.message||err),'bad');
      throw err;
    });
}

function pushContactToSheet(c){
  return pushSheetRow('upsertCRM', contactToSheetRow(c), {afterWrite:'crm'});
}

function pushConcertToSheet(c){
  return pushSheetRow('upsertConcert', concertToSheetRow(c), {afterWrite:'concerts'});
}

function pushRehearsalToSheet(r){
  return pushSheetRow('upsertRehearsal', rehearsalToSheetRow(r), {afterWrite:'rehearsals'});
}

function pushTaskToSheet(t){
  return pushSheetRow('upsertTask', taskToSheetRow(t), {afterWrite:'tasks'});
}

function pushLocalPaymentToSheet(p, opts={}){
  const options = Object.assign({afterWrite:'local'}, opts || {});
  return pushSheetRow('upsertLocalPayment', localPaymentToSheetRow(p), options);
}

function verifyMemberInCurrentDb(expected){
  const key = normalizeMemberKey(expected.id || expected.name);
  const current = (db.bandMembers || []).find(m => normalizeMemberKey(m.id || m.name) === key);
  if(!current) return false;
  const exp = normalizeMemberRecord(expected);
  const sameName = norm(current.name) === norm(exp.name);
  const sameActive = yesNo(current.active,'Sí') === yesNo(exp.active,'Sí');
  const sameLocal = yesNo(current.payLocal,'Sí') === yesNo(exp.payLocal,'Sí');
  const sameRehearsals = yesNo(current.showInRehearsals,'Sí') === yesNo(exp.showInRehearsals,'Sí');
  const sameVocal = String(current.vocal || 'No') === String(exp.vocal || 'No');
  return sameName && sameActive && sameLocal && sameRehearsals && sameVocal;
}

function sleepBCB(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fireAppsScriptGet(params={}){
  // GET "fire and verify".
  // No depende de que Apps Script devuelva JSONP válido. El servidor ejecuta el GET y
  // luego confirmamos leyendo MIEMBROS desde Google Sheet publicado.
  return new Promise((resolve,reject)=>{
    if(!GOOGLE_SHEET_MASTER.appsScriptUrl) return reject(new Error('No hay URL /exec de Apps Script configurada.'));
    let done = false;
    const url = appBcbEndpointUrl(params);
    const img = new Image();
    const timeout = setTimeout(()=>{
      if(done) return;
      done = true;
      resolve({ok:true, transport:'get-timeout-assumed', url});
    }, 3500);
    function finish(kind){
      if(done) return;
      done = true;
      clearTimeout(timeout);
      resolve({ok:true, transport:kind, url});
    }
    img.onload = ()=>finish('get-image-load');
    img.onerror = ()=>finish('get-image-error'); // respuesta no-imagen esperada, pero el GET ya se ejecutó
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}

async function syncMembersFromGoogleSheetDirectOnly(){
  // Lectura directa publicada: útil para usuario, pero puede tener caché.
  const rows = await fetchSheetTabViaGoogleSheetDirect('MIEMBROS', 150);
  const count = applyCoreSheetRows('MIEMBROS', rows);
  persistDataOnly();
  return {ok:true, count};
}

async function syncMembersFromAppsScriptLive(){
  // Lectura viva desde Apps Script, sin caché de "Publicar en la web".
  // Se usa justo después de escribir para confirmar contra el Sheet real.
  const payload = await appsScriptJsonpOnly({action:'sheet', tab:'MIEMBROS', limit:150});
  if(!payload || payload.ok === false){
    throw new Error((payload && payload.error) || 'Apps Script no devolvió MIEMBROS.');
  }
  const rows = Array.isArray(payload.rows) ? payload.rows : rowsFromPayloadSheet(findPayloadSheet(payload, ['MIEMBROS']));
  const count = applyCoreSheetRows('MIEMBROS', rows || []);
  persistDataOnly();
  return {ok:true, count, payload};
}

async function waitForMemberSheetConfirmation(expected, opts={}){
  // Confirmación contra Apps Script, no contra Google Sheet publicado.
  // El Sheet publicado puede tardar en refrescar y provocaba falsos negativos.
  const attempts = Number(opts.attempts || 4);
  const delay = Number(opts.delay || 600);
  let lastError = '';
  for(let i=0; i<attempts; i++){
    try{
      await syncMembersFromAppsScriptLive();
      if(verifyMemberInCurrentDb(expected)){
        return {ok:true, attempts:i+1};
      }
      lastError = 'Apps Script leyó MIEMBROS pero el miembro no coincide todavía.';
    }catch(err){
      lastError = err && err.message ? err.message : String(err);
    }
    await sleepBCB(delay);
  }
  throw new Error('Apps Script no confirmó el cambio de miembro. Último detalle: '+lastError);
}

function memberToSimpleParams(m){
  const item=normalizeMemberRecord(m);
  return {
    action:'memberSimple',
    key:'1929',
    id:item.id || normalizeMemberKey(item.name),
    name:item.name || '',
    role:item.role || item.instrument || '',
    instrument:item.instrument || item.role || '',
    vocal:item.vocal || 'No',
    admin:item.admin || 'No',
    active:item.active || 'Sí',
    payLocal:item.payLocal || 'Sí',
    showInRehearsals:item.showInRehearsals || 'Sí',
    joinDate:item.joinDate || '',
    inactiveDate:item.inactiveDate || '',
    email:item.email || '',
    phone:item.phone || '',
    notes:item.notes || ''
  };
}

async function pushMemberToSheet(m){
  const expected = normalizeMemberRecord(m);
  const params = memberToSimpleParams(expected);

  // v4.8: escritura confirmada por respuesta JSONP real de Apps Script.
  // Ya no se usa Image ni se espera a la caché de Google Sheet publicado.
  const payload = await appsScriptJsonpOnly(params);
  if(!payload || payload.ok === false){
    throw new Error((payload && payload.error) || 'Apps Script no confirmó la escritura de MIEMBROS.');
  }

  // Confirmación inmediata leyendo la pestaña MIEMBROS desde Apps Script.
  await waitForMemberSheetConfirmation(expected, {attempts:4, delay:700});

  sheetStatus('Miembro confirmado en Google Sheet maestro.','ok');
  return Object.assign({ok:true, action:'memberSimple', transport:'jsonp-live-confirmation'}, payload || {});
}

function alertSheetWriteError(err){
  const msg=(err && err.message) ? err.message : String(err||'Error desconocido');
  alert('NO se ha guardado en Google Sheet. No he cambiado la app local para evitar datos falsos.\n\nMotivo: '+msg+'\n\nPrueba directa: abre la URL /exec?action=health y confirma que muestra APP-BCB v4.8 final sync.');
}


function sheetListFromPayload(payload){
  const out=[];
  if(payload && payload.sheets){
    Object.entries(payload.sheets).forEach(([key,value])=>out.push(Object.assign({key,name:key}, value || {})));
  }
  if(payload && payload.data){
    Object.entries(payload.data).forEach(([key,value])=>{
      if(value && Array.isArray(value.rows)) out.push(Object.assign({key,name:key}, value || {}));
      else if(Array.isArray(value)) out.push({key,name:key,rows:value});
    });
  }
  return out;
}
function sameSheetName(a,b){
  return norm(String(a||'')).replace(/[^a-z0-9]/g,'') === norm(String(b||'')).replace(/[^a-z0-9]/g,'');
}
function findPayloadSheet(payload, names=[], gid=''){
  const sheets=sheetListFromPayload(payload);
  if(gid){
    const byGid=sheets.find(s=>String(s.gid||'')===String(gid));
    if(byGid) return byGid;
  }
  for(const name of names){
    const exact=sheets.find(s=>sameSheetName(s.name||s.key, name));
    if(exact) return exact;
  }
  for(const name of names){
    const partial=sheets.find(s=>sameSheetName(s.name||s.key, name) || sameSheetName(name, s.name||s.key));
    if(partial) return partial;
  }
  return null;
}
function rowsFromPayloadSheet(sheet){
  return sheet && Array.isArray(sheet.rows) ? sheet.rows : [];
}
function rowsLookLikeCRM(rows){
  return rows.some(r=>pick(r,['Email','email','Correo','telefono','Teléfono','Empresa','Organización','empresa_entidad','Campaña','campaign','contacto']));
}
function rowsLookLikeConcerts(rows){
  return rows.some(r=>pick(r,['fecha','Fecha','titulo','Título','sala_lugar','Sala / lugar','eventName','Concierto','cartel_url']));
}
function rowsLookLikeSongs(rows){
  return rows.some(r=>pick(r,['titulo','Título','title','Tema','Canción','Cancion','artista','Artista','tono_actual_banda','tono_propuesto_miguel','voz_principal']));
}
function rowsLookLikeRehearsals(rows){
  return rows.some(r=>pick(r,['fecha','Fecha','hora_inicio','Hora inicio','temas_ids','temas_texto','objetivo','Ensayo']));
}
function firstSheetByRows(payload, predicate){
  return sheetListFromPayload(payload).find(s=>predicate(rowsFromPayloadSheet(s)));
}
function applyCRMObjectsFromSheet(rows){
  const items=rows
    .map((row,i)=>crmFromSheetRow(row,i+1,i))
    .filter(x=>x.organization || x.email || x.phone || x.contactPerson || x.campaign);
  if(items.length) db.crm=items;
  return items.length;
}
function memberAttendanceFromRow(row, prefix='asistencia_'){
  const attendance={};

  function aliasesForMember(m){
    const id = normalizeMemberKey(m.id || m.name);
    const name = String(m.name || '').trim();
    const base = [
      prefix + id,
      'asistencia_' + id,
      id,
      name,
      'Asistencia ' + name
    ].filter(Boolean);

    // Compatibilidad con cabeceras antiguas.
    const legacy = {
      miguel:['asistencia_miguel','Miguel','Asistencia Miguel'],
      carmen:['asistencia_carmen','Carmen','Asistencia Carmen'],
      teo:['asistencia_teo','Teo','Asistencia Teo'],
      alvaro:['asistencia_alvaro','Álvaro','Alvaro','Asistencia Álvaro','Asistencia Alvaro'],
      nataly:['asistencia_nataly','Nataly','Natalia','Asistencia Nataly'],
      lord_enzo:['asistencia_lord_enzo','Lord Enzo','Enzo','Asistencia Lord Enzo']
    };
    return unique(base.concat(legacy[id] || []));
  }

  bandMembers({includeInactive:true}).forEach(m=>{
    const id = normalizeMemberKey(m.id || m.name);
    const st = pick(row, aliasesForMember(m)) || 'Pendiente';
    attendance[id] = {status: st || 'Pendiente', notes:''};
  });

  return attendance;
}

function mapConcertRow(row,i){
  return {
    id: Number(pick(row,['id','ID'])) || i+1,
    date: normalizeSheetDateToISO(pick(row,['fecha','Fecha','date','Fecha evento'])),
    time: normalizeSheetTimeToHHMM(pick(row,['hora','Hora','time'])),
    eventName: pick(row,['titulo','Título','eventName','Concierto','Evento']) || 'Concierto Breathless Cover Band',
    venue: pick(row,['sala_lugar','Sala / lugar','venue','Sala','Lugar','lugar']),
    city: pick(row,['ciudad','Ciudad','city']),
    type: pick(row,['tipo','Tipo','type']) || 'Concierto',
    status: pick(row,['estado','Estado','status']) || 'Pendiente',
    fee: Number(String(pick(row,['fee','caché','Cache','Importe','importe','importe_o_rango'])||'').replace(/[^\d.,-]/g,'').replace(',','.')) || 0,
    deposit: Number(String(pick(row,['deposit','anticipo','Anticipo'])||'').replace(/[^\d.,-]/g,'').replace(',','.')) || 0,
    paid: Number(String(pick(row,['paid','cobrado','Cobrado'])||'').replace(/[^\d.,-]/g,'').replace(',','.')) || 0,
    sound: pick(row,['sound','sonido','Sonido']),
    contactId: Number(pick(row,['contactId','contacto_id'])) || 0,
    posterUrl: pick(row,['cartel_url','Cartel URL','posterUrl','poster_url']),
    posterThumbUrl: pick(row,['cartel_thumb_url','posterThumbUrl','poster_thumb_url']) || pick(row,['cartel_url','posterUrl']),
    posterTitle: pick(row,['cartel_titulo','Cartel título','posterTitle']),
    publicInfo: pick(row,['notas_publicas','Notas públicas','publicInfo','entrada','Entrada','direccion','Dirección']),
    notes: pick(row,['notas_produccion','Notas producción','notes','notas','Notas']),
    attendance: memberAttendanceFromRow(row),
    attendanceNotes: pick(row,['attendanceNotes','notas_asistencia','Notas asistencia']),
    raw: row
  };
}
function applyConcertsFromSheet(rows){
  const items=rows.map(mapConcertRow).filter(x=>x.date || x.eventName || x.venue || x.posterUrl);
  if(items.length) db.concerts=items;
  return items.length;
}
function parseSongIds(value){
  if(Array.isArray(value)){
    return unique(value.map(x=>Number(x)).filter(n=>Number.isFinite(n) && n>0));
  }
  const raw=String(value||'').trim();
  if(!raw) return [];
  if(norm(raw).includes('todos')) return [];
  // Compatibilidad con versiones anteriores que guardaban JSON: [1,2,3] o ["1","2"].
  try{
    const parsed=JSON.parse(raw);
    if(Array.isArray(parsed)){
      return unique(parsed.map(x=>Number(x)).filter(n=>Number.isFinite(n) && n>0));
    }
  }catch(e){}
  const cleaned=raw
    .replace(/[\[\]\(\){}]/g, ' ')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const ids=cleaned
    .split(/[;,|\n\t ]+/)
    .map(x=>Number(String(x).trim()))
    .filter(n=>Number.isFinite(n) && n>0);
  return unique(ids);
}

function songIdsFromTitlesText(value){
  const text=String(value||'').trim();
  if(!text || !(db.repertoire||[]).length) return [];
  const byNorm=new Map();
  (db.repertoire||[]).forEach(song=>{
    const key=norm(song.title||song.titleCanonical);
    if(key) byNorm.set(key, Number(song.id));
  });
  const parts=text
    .split(/[|;\n]+|\s+-\s+/)
    .map(x=>norm(x))
    .filter(Boolean);
  const ids=[];
  parts.forEach(part=>{
    if(byNorm.has(part)) ids.push(byNorm.get(part));
    else{
      const match=(db.repertoire||[]).find(song=>{
        const title=norm(song.title||song.titleCanonical);
        return title && (part.includes(title) || title.includes(part));
      });
      if(match) ids.push(Number(match.id));
    }
  });
  return unique(ids.filter(n=>Number.isFinite(n) && n>0));
}
function mapRehearsalRow(row,i){
  const idsRaw=pick(row,['temas_ids','Temas IDs','songIds','Temas ids','IDs temas']);
  const titlesRaw=pick(row,['temas_texto','Temas texto','Temas','songs','Canciones','Temas previstos']);
  const allSongs=norm(pick(row,['todos_los_temas','Todos los temas','allSongs'])).includes('si') || norm(idsRaw).includes('todos') || norm(titlesRaw).includes('todos los temas');
  let songIds = allSongs ? [] : parseSongIds(idsRaw);
  if(!allSongs && !songIds.length && titlesRaw){
    songIds = songIdsFromTitlesText(titlesRaw);
  }
  return {
    id: Number(pick(row,['id','ID'])) || i+1,
    date: normalizeSheetDateToISO(pick(row,['fecha','Fecha','date'])),
    startTime: normalizeSheetTimeToHHMM(pick(row,['hora_inicio','Hora inicio','startTime','Hora'])),
    endTime: normalizeSheetTimeToHHMM(pick(row,['hora_fin','Hora fin','endTime'])),
    place: pick(row,['lugar','Lugar','place','local','Local']),
    status: pick(row,['estado','Estado','status']) || 'Pendiente',
    objective: pick(row,['objetivo','Objetivo','objective']),
    notes: pick(row,['notas','Notas','notes']),
    allSongs,
    songIds,
    songTitles: titlesRaw,
    attendance: memberAttendanceFromRow(row),
    raw: row
  };
}
function applyRehearsalsFromSheet(rows){
  const items=rows.map(mapRehearsalRow).filter(x=>x.date || x.place || x.objective || x.songIds.length || x.songTitles);
  if(items.length) db.rehearsals=items;
  return items.length;
}
function mapSongRow(row,i){
  const title = pick(row,['titulo','Título','title','Tema','Canción','Cancion','cancion','Song']) || 'Tema sin título';
  const sheetRow = Number(row.sheetRow || row.__row || row.Fila || row['Nº fila'] || row['Nº Fila']) || '';
  const toneVisible = pick(row,['tono_actual_banda','Tono actual banda','Tono BCB recomendado','Tonalidad','tone','tono','Tono','Tono recomendado']);
  const originalKey = pick(row,['tono_original','Tono original','Tono original orientativo','originalKey']);
  const rehearsalKey = pick(row,['tono_propuesto_ensayo','Tono propuesto ensayo','Tono BCB recomendado','Tono recomendado','rehearsalKey']);
  const currentKey = pick(row,['tono_actual_banda','Tono actual banda','Tono BCB recomendado','Tonalidad','currentKey','tone','Tono recomendado']);
  const transposeNotes = pick(row,['notas_transporte','Notas transporte','Nota de ensayo / criterio','Criterio','transposeNotes','Ajuste']);
  return {
    id: Number(pick(row,['id','ID'])) || i+1,
    sheetRow,
    order: Number(pick(row,['orden','Orden','order','#'])) || i+1,
    title,
    titleCanonical: norm(title).toUpperCase(),
    artist: pick(row,['artista','Artista','artist','Artista / referencia','Artista / versión','Referencia','reference']),
    versionReference: pick(row,['versionReference','referencia','Referencia','Referencia concreta']),
    singer: pick(row,['voz_principal','Voz principal','voz','Voz','singer','Voz principal']),
    leadVocal: pick(row,['voz_asignada','Voz asignada','voz_principal','Voz principal','leadVocal','voz','Voz']),
    duration: pick(row,['duracion_directo','Duración directo','duration','duracion','Duración']),
    durationLive: pick(row,['duracion_directo','Duración directo','durationLive','duration','Duración directo']),
    durationOriginal: pick(row,['duracion_original','Duración original','durationOriginal']),
    durationStatus: pick(row,['durationStatus','estado_duracion','Estado duración']) || 'Google Sheet',
    tone: toneVisible,
    originalKey,
    currentKey,
    rehearsalKey,
    keyStatus: pick(row,['keyStatus','estado_tono','Estado tono','Estado tonalidad']) || 'Google Sheet',
    keyMiguel: pick(row,['tono_propuesto_miguel','Tono propuesto Miguel','Tono Miguel','keyMiguel']),
    keyCarmen: pick(row,['tono_propuesto_carmen','Tono propuesto Carmen','Tono Carmen','keyCarmen']),
    transposeNotes,
    capo: pick(row,['capo','Capo','cejilla','Cejilla','Cejilla / capo']),
    bpm: pick(row,['bpm','BPM']),
    block: pick(row,['bloque','Bloque','block']),
    status: pick(row,['estado','Estado','status']) || 'Activo',
    spotifyUrl: pick(row,['spotify_url','Spotify','spotifyUrl','Spotify tema']),
    spotifyPlaylistUrl: pick(row,['Playlist Spotify','spotifyPlaylistUrl']) || db.createdFrom?.spotifyPlaylistUrl || '',
    youtubeUrl: pick(row,['youtube_url','YouTube','youtubeUrl']),
    chordsUrl: pick(row,['acordes_url','Acordes URL','Enlace acordes/letra','chordsUrl']),
    structure: pick(row,['estructura','Estructura','structure']),
    chordsText: pick(row,['tablatura','Tabla','letra_acordes','Letra acordes','Letra/acordes/tablatura','chordsText']),
    lyricsNotes: pick(row,['notas_interpretacion','Notas interpretación','Notas interpretación/letra','lyricsNotes']),
    notes: pick(row,['notas_internas','Notas internas','notas','Notas','notes']),
    internalNotes: pick(row,['notas_internas','Notas internas','internalNotes']),
    sourceNotes: pick(row,['Fuente / validación','sourceNotes']),
    validatedAt: pick(row,['validado_en_ensayo','Validado en ensayo','validatedAt']),
    raw: row
  };
}
function mergeSongWithExisting(item){
  const sources = []
    .concat(Array.isArray(INITIAL_DATA.repertoire) ? INITIAL_DATA.repertoire : [])
    .concat(Array.isArray(db.repertoire) ? db.repertoire : []);
  const match = sources.find(s => String(s.id) === String(item.id) || norm(s.titleCanonical||s.title) === norm(item.titleCanonical||item.title));
  if(!match) return item;
  const merged = Object.assign({}, match, item);
  Object.keys(match).forEach(key=>{
    if(shouldSeedReplace(merged[key]) && !shouldSeedReplace(match[key])){
      merged[key] = match[key];
    }
  });
  return merged;
}
function songIsVisibleInApp(song){
  const st = norm(song && (song.status || song.Estado || song.estado || 'Activo'));
  if(!st) return true;
  return !(
    st.includes('borrad') ||
    st.includes('eliminad') ||
    st.includes('inactiv') ||
    st.includes('archiv') ||
    st.includes('descartad')
  );
}

function songTitleKeyForSetlist(v){
  return norm(v || '').replace(/[^a-z0-9]+/g,'');
}

function activeRepertoireTitleKeys(){
  const set = new Set();
  (db.repertoire || []).filter(songIsVisibleInApp).forEach(s=>{
    [s.title, s.titleCanonical].filter(Boolean).forEach(t=>set.add(songTitleKeyForSetlist(t)));
  });
  return set;
}

function pruneStrategicSetlistToCurrentRepertoire(st){
  if(!st || !Array.isArray(st.blocks)) return st;
  const active = activeRepertoireTitleKeys();
  if(!active.size) return st;
  const copy = clone(st);
  let order = 1;
  copy.blocks = (copy.blocks || []).map(block=>{
    const songs = (block.songs || []).filter(song=>{
      const key = songTitleKeyForSetlist(song.title || song.titleCanonical || song.Canción || song.cancion);
      return !key || active.has(key);
    }).map(song=>Object.assign({}, song, {order: order++}));
    return Object.assign({}, block, {songs});
  });
  return copy;
}

function pruneSetlistAfterRepertoireChange(){
  if(db.strategicSetlist && Array.isArray(db.strategicSetlist.blocks)){
    db.strategicSetlist = pruneStrategicSetlistToCurrentRepertoire(db.strategicSetlist);
  }else if(INITIAL_DATA.strategicSetlist && Array.isArray(INITIAL_DATA.strategicSetlist.blocks)){
    db.strategicSetlist = pruneStrategicSetlistToCurrentRepertoire(clone(INITIAL_DATA.strategicSetlist));
  }
}

function applySongsFromSheet(rows){
  const items=(rows||[]).map(mapSongRow)
    .filter(x=>{
      const t=norm(x.title||'');
      const a=norm(x.artist||'');
      if(!t || x.title==='Tema sin título') return false;
      if(['cancion','canción','tema','titulo','título','song'].includes(t)) return false;
      if(t==='insurreccion' && a==='artista referencia') return false;
      return songIsVisibleInApp(x);
    })
    .map(mergeSongWithExisting);

  if(items.length){
    db.repertoire=items;
    pruneSetlistAfterRepertoireChange();
  }
  return items.length;
}


function applySetlistFromSheet(rows){
  const items=(rows||[]).map((row,i)=>({
    order:Number(pick(row,['orden','Orden','order','#'])) || i+1,
    title:pick(row,['titulo','Título','title','Tema','Canción','Cancion']),
    vocal:pick(row,['voz','Voz','vocal','Voz principal']),
    key:pick(row,['tono','Tono','key','Tonalidad']),
    duration:pick(row,['duracion','Duración','duration','Duración directo']),
    block:pick(row,['bloque','Bloque','block','Bloque/curva']) || 'Setlist',
    notes:pick(row,['notas','Notas','notes'])
  })).filter(x=>x.title);

  if(items.length){
    const blocksByName = {};
    items.forEach(song=>{
      const blockName = song.block || 'Setlist';
      if(!blocksByName[blockName]){
        blocksByName[blockName] = {
          id:Object.keys(blocksByName).length+1,
          name:blockName,
          objective:'Orden de concierto sincronizado desde Google Sheet.',
          musicDuration:'',
          stageControl:'',
          songs:[]
        };
      }
      blocksByName[blockName].songs.push(song);
    });
    db.strategicSetlist = pruneStrategicSetlistToCurrentRepertoire({
      title:'Setlist BCB',
      subtitle:'Datos sincronizados desde Google Sheet maestro',
      musicDuration:'',
      agileDuration:'',
      extendedDuration:'',
      legend:unique(items.map(x=>x.vocal).filter(Boolean)),
      rule:'Setlist editable: si se borra una canción del repertorio no se muestra aquí.',
      finalMandatory:'',
      promoterReading:'Setlist de trabajo sincronizado desde Google Sheet.',
      blocks:Object.values(blocksByName)
    });
    return setlistRows().length;
  }

  // Si la hoja SETLISTS está vacía, mantenemos el setlist base pero filtrado por repertorio real.
  if(db.strategicSetlist || INITIAL_DATA.strategicSetlist){
    db.strategicSetlist = pruneStrategicSetlistToCurrentRepertoire(db.strategicSetlist || clone(INITIAL_DATA.strategicSetlist));
    return setlistRows().length;
  }
  return 0;
}


function mapTaskRow(row,i){
  return {
    id: Number(pick(row,['id','ID'])) || i+1,
    title: pick(row,['titulo','Título','Tarea','tarea','title']) || 'Tarea sin título',
    owner: pick(row,['responsable','Responsable','owner']),
    due: normalizeSheetDateToISO(pick(row,['fecha','Fecha','due'])),
    status: pick(row,['estado','Estado','status']) || 'Pendiente',
    priority: pick(row,['prioridad','Prioridad','priority']) || 'Media',
    area: pick(row,['area','Área','area','Modulo','Módulo']) || '',
    notes: pick(row,['notas','Notas','notes']),
    sheetRow: Number(row.sheetRow || row.__row || row.Fila || row['Nº fila']) || '',
    raw: row
  };
}

function applyTasksFromSheet(rows){
  const items=(rows||[]).map(mapTaskRow).filter(x=>x.title || x.owner || x.due);
  if(items.length) db.tasks=items;
  return items.length;
}

function mapGmailResponseRow(row,i){
  return {
    id: Number(pick(row,['id','ID'])) || i+1,
    date: normalizeSheetDateToISO(pick(row,['fecha','Fecha','date'])),
    from: pick(row,['remitente','Remitente','from','De']),
    subject: pick(row,['asunto','Asunto','subject']),
    summary: pick(row,['resumen','Resumen','summary']),
    status: pick(row,['estado','Estado','status']) || '',
    crmId: pick(row,['CRM ID','crmId','contacto_id']),
    notes: pick(row,['notas','Notas','notes']),
    sheetRow: Number(row.sheetRow || row.__row || row.Fila || row['Nº fila']) || '',
    raw: row
  };
}

function applyGmailResponsesFromSheet(rows){
  const items=(rows||[]).map(mapGmailResponseRow).filter(x=>x.from || x.subject || x.summary);
  if(items.length) db.gmailResponses=items;
  return items.length;
}

function applyCoreSheetRows(tab, rows){
  const safeRows = Array.isArray(rows) ? rows : [];
  let count = 0;
  if(tab === 'CRM_GENERAL') count = applyCRMObjectsFromSheet(safeRows);
  if(tab === 'CONCIERTOS') count = applyConcertsFromSheet(safeRows);
  if(tab === 'ENSAYOS') count = applyRehearsalsFromSheet(safeRows);
  if(tab === 'REPERTORIO') count = applySongsFromSheet(safeRows);
  if(tab === 'SETLISTS') count = applySetlistFromSheet(safeRows);
  if(tab === 'PAGOS_LOCAL') count = applyLocalPaymentsFromSheet(safeRows);
  if(tab === 'TAREAS') count = applyTasksFromSheet(safeRows);
  if(tab === 'RESPUESTAS_GMAIL') count = applyGmailResponsesFromSheet(safeRows);
  if(tab === 'MIEMBROS' && safeRows.length){
    db.bandMembers = safeRows.map((m,idx)=>normalizeMemberRecord({
      id: pick(m,['ID','id','Id']) || pick(m,['App ID','app_id','ID interno']) || '',
      name: pick(m,['Nombre','nombre','name','Miembro','Usuario app']) || '',
      role: pick(m,['Rol','rol','role','Instrumento/voz','instrumento','Instrumento']) || '',
      instrument: pick(m,['Instrumento','instrumento','Instrumento/voz','Rol']) || '',
      vocal: pick(m,['Voz','voz','Vocal','Canta']) || '',
      admin: pick(m,['Admin','Administrador','admin']) || '',
      active: pick(m,['Activo','Estado','estado','active']) || 'Sí',
      payLocal: pick(m,['Paga local','pagaLocal','payLocal','Local']) || 'Sí',
      showInRehearsals: pick(m,['Aparece ensayos','showInRehearsals','Ensayos']) || 'Sí',
      joinDate: pick(m,['Fecha alta','joinDate','fecha_alta']) || '',
      inactiveDate: pick(m,['Fecha inactividad','inactiveDate','fecha_inactividad']) || '',
      notes: pick(m,['Notas','notas','notes']) || '',
      sheetRow: Number(m.sheetRow || m.__row || m.Fila || m['Nº fila']) || '',
      raw:m
    }, idx)).filter(x=>x.name);
    count = db.bandMembers.length;
  }
  return count || 0;
}

async function syncCoreSheetsIndividually(opts={}){
  const silent = !!opts.silent;
  const fast = !!opts.fast || !!opts.startup || opts.reason === 'startup';
  const criticalTabs = [
    ['ENSAYOS', 300],
    ['CRM_GENERAL', 1000],
    ['MIEMBROS', 100],
    ['REPERTORIO', 500],
    ['PAGOS_LOCAL', 500]
  ];
  const fullTabs = [
    ['CRM_GENERAL', 1000],
    ['CONCIERTOS', 500],
    ['ENSAYOS', 500],
    ['REPERTORIO', 500],
    ['SETLISTS', 500],
    ['MIEMBROS', 100],
    ['TAREAS', 500],
    ['PAGOS_LOCAL', 500],
    ['RESPUESTAS_GMAIL', 500],
    ['PLANTILLAS_DOSSIER', 300]
  ];
  const tabsToRead = fast ? criticalTabs : fullTabs;
  const report = {crm:db.crm.length||0, concerts:(db.concerts||[]).length, rehearsals:(db.rehearsals||[]).length, songs:(db.repertoire||[]).length, setlist:(db.setlists||[]).length, miembros:(db.bandMembers||[]).length, local:(db.localPayments||[]).length, errors:[]};
  sheetStatus(fast ? 'Datos visibles. Actualizando CRM y ensayos en segundo plano…' : 'Actualizando desde Google Sheet maestro…');
  for(const [tab, limit] of tabsToRead){
    try{
      sheetStatus('Actualizando '+tab+' desde Google Sheet…');
      const liveTabs = ['ENSAYOS','REPERTORIO','SETLISTS','PAGOS_LOCAL','MIEMBROS'];
      const rows = liveTabs.includes(tab) ? await fetchSheetTabLive(tab, limit) : await fetchSheetTabForRead(tab, limit);
      const count = applyCoreSheetRows(tab, rows);
      if(tab==='CRM_GENERAL') report.crm = count || report.crm;
      if(tab==='CONCIERTOS') report.concerts = count || report.concerts;
      if(tab==='ENSAYOS') report.rehearsals = count || report.rehearsals;
      if(tab==='REPERTORIO') report.songs = count || report.songs;
      if(tab==='SETLISTS') report.setlist = count || report.setlist;
      if(tab==='MIEMBROS') report.miembros = count || report.miembros;
      if(tab==='PAGOS_LOCAL') report.local = count || report.local;
      if(tab==='TAREAS') { report.tasks = applyTasksFromSheet(rows); }
      if(tab==='RESPUESTAS_GMAIL') { report.gmail = applyGmailResponsesFromSheet(rows); }
      db.sheetSync = Object.assign({}, db.sheetSync||{}, {
        status: 'partial',
        method: fast ? 'instant-cache-fast-background-v41' : 'sheet-direct-full-v41',
        updatedAt: new Date().toISOString(),
        endpoint: GOOGLE_SHEET_MASTER.appsScriptUrl,
        directSheet: GOOGLE_SHEET_MASTER.userUrl,
        report
      });
      saveData({refresh:false}); // guarda snapshot persistente sin re-renderizar toda la app por cada pestaña
    }catch(err){
      report.errors.push(tab+': '+(err.message||err));
    }
  }
  db.sheetSync = Object.assign({}, db.sheetSync||{}, {
    status: report.errors.length ? 'partial' : 'ok',
    method: fast ? 'instant-cache-fast-background-v41' : 'sheet-direct-full-v41',
    updatedAt: new Date().toISOString(),
    endpoint: GOOGLE_SHEET_MASTER.appsScriptUrl,
    directSheet: GOOGLE_SHEET_MASTER.userUrl,
    report
  });
  persistDataOnly();
  refreshAll();
  const msg = fast
    ? `Datos actualizados en segundo plano. CRM: ${report.crm}. Ensayos: ${report.rehearsals}.`
    : `Actualización completa. CRM: ${report.crm}. Ensayos: ${report.rehearsals}. Canciones: ${report.songs}. Errores: ${report.errors.length}.`;
  sheetStatus(msg + (report.errors.length ? '<br>'+esc(report.errors.join(' | ')) : ''), report.errors.length ? 'bad' : 'ok');

  // No hacemos una sincronización completa automática al arrancar.
  // La carga completa queda para el botón manual, para no bloquear PC ni móvil.
  if(!silent) alert(msg + (report.errors.length ? '\n'+report.errors.join('\n') : ''));
  return report;
}

async function diagnosticoMovilBCB(){
  const lines = [];
  let ok = false;
  try{
    sheetStatus('Probando conexión móvil… primero Apps Script, después Google Sheet directo.', 'info');

    try{
      const health = await appsScriptJSONP({action:'health'});
      lines.push('Apps Script: OK · '+(health.version || 'sin versión')+' · transporte '+(health._transport || '—'));
    }catch(asErr){
      lines.push('Apps Script: FALLA en este móvil · '+(asErr.message || asErr));
    }

    try{
      const crm = await fetchSheetTabViaGoogleSheetDirect('CRM_GENERAL', 5);
      const ensayos = await fetchSheetTabViaGoogleSheetDirect('ENSAYOS', 5);
      lines.push('Google Sheet directo: OK');
      lines.push('CRM primeras filas: '+crm.length);
      lines.push('Ensayos primeras filas: '+ensayos.length);
      ok = true;
    }catch(gsErr){
      lines.push('Google Sheet directo: FALLA · '+(gsErr.message || gsErr));
      lines.push('Solución: en el Google Sheet BCB, Archivo → Compartir → Publicar en la web → Documento completo → Publicar. Después abre la app con ?reset=1.');
    }

    const msg = (ok ? 'Diagnóstico OK para lectura móvil.\n' : 'Diagnóstico fallido para lectura móvil.\n') + lines.join('\n');
    sheetStatus(esc(msg).replace(/\n/g,'<br>'), ok ? 'ok' : 'bad');
    alert(msg);
  }catch(err){
    const msg = 'Diagnóstico fallido: '+(err.message||err)+'.';
    sheetStatus(esc(msg), 'bad');
    alert(msg);
  }
}

async function syncCRMFromGoogleSheet(opts={}){
  const silent = !!opts.silent;
  const forceIndividual = opts.individual || (window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
  try{
    sheetStatus('Actualizando automáticamente desde Google Sheet maestro…');

    if(forceIndividual){
      return await syncCoreSheetsIndividually(opts);
    }

    let payload;
    try{
      payload=await appsScriptJSONP({action:'mobile'});
      const report=applyAllFromGoogleSheetPayload(payload);
      saveData();
      sheetStatus(`Google Sheet sincronizada. CRM: ${report.crm}. Conciertos: ${report.concerts}. Ensayos: ${report.rehearsals}. Canciones: ${report.songs}. Local: ${report.local || 0}.`, 'ok');
      if(!silent) alert(`Datos actualizados desde Google Sheet.\nCRM: ${report.crm}\nConciertos: ${report.concerts}\nEnsayos: ${report.rehearsals}\nCanciones: ${report.songs}\nLocal ensayo: ${report.local || 0}`);
      return true;
    }catch(mobileErr){
      // Si el paquete completo falla en móvil o por tamaño, se lee pestaña por pestaña.
      return await syncCoreSheetsIndividually(Object.assign({}, opts, {fallbackFromMobile:true}));
    }
  }catch(err){
    db.sheetSync = Object.assign({}, db.sheetSync||{}, {status:'error', error:String(err.message||err), updatedAt:new Date().toISOString(), endpoint: GOOGLE_SHEET_MASTER.appsScriptUrl});
    sheetStatus('SIN CONEXIÓN REAL CON GOOGLE SHEET en este dispositivo. No se debe fiar de estos datos hasta sincronizar. Motivo: '+esc(err.message||err), 'bad');
    if(!silent) alert('No se pudo sincronizar con Google Sheet: '+(err.message||err));
    return false;
  }
}

function statusClass(s){
  const x=norm(s);
  if(x.includes('enviado')||x.includes('confirmado')||x.includes('realizado')||x.includes('actualizado')) return 'status s-green';
  if(x.includes('sin email')||x.includes('revisar')||x.includes('pendiente')||x.includes('borrador')||x.includes('pre')) return 'status s-amber';
  if(x.includes('no enviar')||x.includes('descartado')||x.includes('cancelado')||x.includes('error')) return 'status s-red';
  if(x.includes('respuesta')||x.includes('negociacion')||x.includes('dossier')) return 'status s-blue';
  if(x.includes('alta')||x.includes('muy')) return 'status s-gold';
  return 'status s-gray';
}
function badge(s){return `<span class="${statusClass(s)}">${esc(s||'—')}</span>`;}
function setTab(id, opts={}){
  const section = document.getElementById(id);
  if(!section) return;
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  section.classList.add('active');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  if(id==='dashboard') renderDashboard();
  if(id==='crm') { fillFilters(); renderCRM(); }
  if(id==='gmail') renderGmail();
  if(id==='followup') renderFollowup();
  if(id==='concerts') renderConcerts();
  if(id==='rehearsals') { renderRehearsals(); setTimeout(()=>ensureRehearsalsFreshOnMobile(), 800); }
  if(id==='local') { renderLocalPayments(); setTimeout(()=>ensureLocalPaymentsFreshOnOpen(), 800); }
  if(id==='members') renderMembers();
  if(id==='budget') { renderBudgetUI(); calcBudget(); }
  if(id==='repertoire') renderRepertoire();
  if(id==='setlist') renderSetlist();
  if(id==='dossier') renderDossier();
  if(id==='templates') {renderContactOptions();renderTemplates();}
  if(id==='tasks') renderTasks();
  if(opts.updateUrl !== false){
    try{
      const url = new URL(window.location.href);
      url.searchParams.set('tab', id);
      window.history.replaceState({}, '', url);
    }catch(e){}
  }
  if(opts.scroll !== false){
    requestAnimationFrame(()=>{
      section.scrollIntoView({behavior:'smooth', block:'start'});
      section.setAttribute('tabindex','-1');
      try{ section.focus({preventScroll:true}); }catch(e){}
    });
  }
}
function renderNav(){
  const nav=document.getElementById('nav');
  nav.innerHTML=tabs.map(t=>`<button data-tab="${t[0]}" onclick="setTab('${t[0]}')"><span>${t[2]}</span>${t[1]}<small>${tabCount(t[0])}</small></button>`).join('');
}
function tabCount(id){
  if(id==='crm')return db.crm.length;
  if(id==='gmail')return db.gmailResponses.length;
  if(id==='concerts')return db.concerts.length;
  if(id==='rehearsals')return (db.rehearsals||[]).length;
  if(id==='tasks')return db.tasks.length;
  if(id==='repertoire')return db.repertoire.length;
  if(id==='setlist')return setlistRows().length;
  return '';
}

function renderSheetSyncPanel(){
  const el=document.getElementById('sheetSyncMini');
  if(!el) return;
  const sync=db.sheetSync||{};
  const status=sync.status==='ok'?'Sincronizado':'Pendiente de sincronizar';
  const updated=sync.updatedAt ? new Date(sync.updatedAt).toLocaleString('es-ES') : (db.createdFrom.lastImport || '—');
  el.innerHTML=`
    <div class="detailItem">
      <small>Fuente de datos</small>
      <strong>Google Sheet maestro</strong><br>
      <span style="color:var(--muted)">Estado: ${esc(status)} · Última lectura: ${esc(updated)} · Lectura móvil directa desde Google Sheet publicado</span>
    </div>
    <div class="notice ok" style="display:block;margin-top:10px">
      La app se actualiza sola al abrirla y al volver a primer plano. Este botón es solo de seguridad si quieres forzar una lectura manual.
    </div>
    <div class="actions" style="margin-top:10px">
      <button class="btn gold" type="button" onclick="syncCRMFromGoogleSheet()">Forzar actualización ahora</button>
      <a class="btn ghost" href="${esc(GOOGLE_SHEET_MASTER.userUrl)}" target="_blank" rel="noopener">Abrir Google Sheet</a>
    </div>
  `;
}

function currentTabId(){
  const active = document.querySelector('.tab.active');
  return active ? active.id : 'dashboard';
}

function renderShell(){
  renderNav();
  renderSheetSyncPanel();
  const side = document.getElementById('sideLoaded');
  if(side) side.innerHTML=`${(db.crm||[]).length} contactos · ${(db.gmailResponses||[]).length} respuestas Gmail<br>Última importación: ${esc(db.createdFrom.lastImport || '—')}`;
  const badges = document.getElementById('heroBadges');
  if(badges) badges.innerHTML=[
    `${(db.crm||[]).length} contactos CRM`,
    `${countBy(db.crm||[],'campaign','Salas')} salas`,
    `${countBy(db.crm||[],'campaign','Eventos/Bodas/Festejos')} eventos/bodas/festejos`,
    `${(db.gmailResponses||[]).length} respuestas Gmail`,
    `${(db.rehearsals||[]).length} ensayos`,
    `${(db.localPayments||[]).length} pagos local`,
    `${(db.bandMembers||[]).filter(memberIsActive).length} miembros activos`,
    `${(db.repertoire||[]).length} canciones`,
    `${setlistRows().length} temas setlist`,
    `${(db.templates||[]).length} plantillas`
  ].map(x=>`<span class="badge">${esc(x)}</span>`).join('');
  const openSheet = document.getElementById('openSheet');
  if(openSheet) openSheet.href=db.createdFrom.googleSheetUserUrl || '#';
  const driveDossier = document.getElementById('driveDossier');
  if(driveDossier) driveDossier.href=db.createdFrom.driveDossierUrl || '#';
}

function renderActiveTab(){
  const id = currentTabId();
  if(id==='dashboard') renderDashboard();
  else if(id==='crm') { fillFilters(); renderCRM(); }
  else if(id==='gmail') renderGmail();
  else if(id==='followup') renderFollowup();
  else if(id==='concerts') renderConcerts();
  else if(id==='rehearsals') renderRehearsals();
  else if(id==='local') renderLocalPayments();
  else if(id==='members') renderMembers();
  else if(id==='audioLibrary') { if(window.initAudioLibraryPlayers) window.initAudioLibraryPlayers(); }
  else if(id==='budget') renderBudgetUI();
  else if(id==='repertoire') renderRepertoire();
  else if(id==='setlist') renderSetlist();
  else if(id==='dossier') renderDossier();
  else if(id==='templates') { renderContactOptions(); renderTemplates(); }
  else if(id==='tasks') renderTasks();
  else if(id==='importExport') {
    // El módulo de exportación es principalmente estático; mantener cabecera y estado.
  }
}

function refreshAll(){
  if(appBcbRendering) return;
  appBcbRendering = true;
  try{
    renderShell();
    renderActiveTab();
  }finally{
    appBcbRendering = false;
    if(appBcbSaveQueued){
      appBcbSaveQueued = false;
      persistDataOnly();
    }
  }
}
function countBy(arr,key,value){return arr.filter(x=>String(x[key]||'')===value).length;}
function counts(arr,key){return arr.reduce((a,x)=>{const k=String(x[key]||'Sin dato');a[k]=(a[k]||0)+1;return a;},{});}
function fillSelect(id, values, label){
  const el=document.getElementById(id); if(!el)return;
  const cur=el.value;
  el.innerHTML=`<option value="">${label}</option>` + [...new Set(values.filter(Boolean))].sort().map(v=>`<option ${v===cur?'selected':''}>${esc(v)}</option>`).join('');
}
function fillFilters(){
  fillSelect('fCampaign', db.crm.map(x=>x.campaign), 'Campaña');
  fillSelect('fPriority', db.crm.map(x=>x.priority), 'Prioridad');
  fillSelect('fStatus', db.crm.map(x=>x.sendStatus), 'Estado envío');
  fillSelect('fSegment', db.crm.map(x=>x.segment), 'Segmento');
}
function renderDashboard(){
  const total=db.crm.length, sent=countBy(db.crm,'sendStatus','Enviado'), noEmail=db.crm.filter(x=>norm(x.sendStatus).includes('sin email')).length, responses=db.crm.filter(x=>x.responseReceived).length, dossier=db.crm.filter(x=>norm(x.sendDossier)==='si'||norm(x.sendDossier)==='sí').length;
  document.getElementById('kpis').innerHTML=[
    ['Contactos CRM', total, 'gold'],
    ['Emails enviados', sent, 'good'],
    ['Respuestas en CRM', responses, 'good'],
    ['Sin email / revisar', noEmail, 'warn'],
    ['Dossier pendiente', dossier, 'warn'],
    ['Respuestas Gmail', db.gmailResponses.length, 'gold'],
    ['Salas', countBy(db.crm,'campaign','Salas'), 'blue'],
    ['Eventos/Bodas/Festejos', countBy(db.crm,'campaign','Eventos/Bodas/Festejos'), 'blue']
  ].map(k=>`<div class="card kpi ${k[2]}"><strong>${k[1]}</strong><span>${k[0]}</span></div>`).join('');
  renderBars('sendBars', counts(db.crm,'sendStatus'));
  renderBars('priorityBars', counts(db.crm,'priority'));
  const actions = [
    {t:'Revisar contactos sin email', n:noEmail, tab:'followup'},
    {t:'Trabajar respuestas recibidas', n:responses, tab:'followup'},
    {t:'Enviar dossier / cerrar condiciones', n:dossier, tab:'followup'},
    {t:'Prioridad Muy alta + Alta', n:db.crm.filter(x=>['muy alta','alta'].includes(norm(x.priority))).length, tab:'crm'}
  ];
  document.getElementById('actionCards').innerHTML=actions.map(a=>`<div class="detailItem"><small>${esc(a.t)}</small><div style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:22px">${a.n}</strong><button class="btn small gold" onclick="setTab('${a.tab}')">Abrir</button></div></div>`).join('');
  document.getElementById('dashResponses').innerHTML=db.gmailResponses.slice(0,5).map(r=>`<div class="detailItem"><small>${esc(r.emailDate)} · ${esc(r.senderEmail)}</small><div><strong>${esc(compact(r.subject,70))}</strong><br><span style="color:var(--muted)">${esc(compact(r.summary,120))}</span></div></div>`).join('');
}
function renderBars(id, obj){
  const max=Math.max(1,...Object.values(obj));
  document.getElementById(id).innerHTML=Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="barRow"><span>${esc(k)}</span><div class="bar"><i style="width:${Math.max(3,v/max*100)}%"></i></div><strong>${v}</strong></div>`).join('');
}
function crmFiltered(){
  const q=norm(document.getElementById('q')?.value||'');
  const campaign=document.getElementById('fCampaign')?.value||'';
  const priority=document.getElementById('fPriority')?.value||'';
  const status=document.getElementById('fStatus')?.value||'';
  const segment=document.getElementById('fSegment')?.value||'';
  const special=document.getElementById('fSpecial')?.value||'';
  let rows=db.crm.filter(x=>{
    const text=norm([x.organization,x.email,x.phone,x.municipality,x.segment,x.opportunityType,x.nextAction,x.followNotes,x.lastEmailReceived,x.sourceUrl].join(' '));
    if(q && !text.includes(q)) return false;
    if(campaign && x.campaign!==campaign) return false;
    if(priority && x.priority!==priority) return false;
    if(status && x.sendStatus!==status) return false;
    if(segment && x.segment!==segment) return false;
    if(special==='responded' && !x.responseReceived) return false;
    if(special==='noemail' && !norm(x.sendStatus).includes('sin email')) return false;
    if(special==='dossier' && !['si','sí'].includes(norm(x.sendDossier)) && !x.dossierStatus) return false;
    if(special==='next' && !x.nextAction && !x.nextActionDate) return false;
    return true;
  });
  return rows;
}
function renderCRM(){
  filteredCRM=crmFiltered();
  const tbody=document.querySelector('#crmTable tbody');
  document.getElementById('crmCount').textContent=`Mostrando ${filteredCRM.length} de ${db.crm.length} contactos.`;
  tbody.innerHTML=filteredCRM.map(x=>`<tr>
    <td><strong>${esc(x.organization)}</strong><br><span style="color:var(--muted)">${esc(compact(x.opportunityType,70))}</span></td>
    <td>${esc(x.campaign)}</td><td>${esc(compact(x.segment,70))}</td><td>${esc(x.municipality)}</td>
    <td>${x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>`:'—'}<br><span style="color:var(--muted)">${esc(x.phone||x.contactPhone||'')}</span></td>
    <td>${badge(x.priority)}</td><td>${badge(x.sendStatus)}</td>
    <td>${x.responseReceived?badge('Respuesta'):'—'}${x.responseDate?`<br><small>${esc(x.responseDate)}</small>`:''}</td>
    <td>${esc(x.nextAction||'')}${x.nextActionDate?`<br><small>${esc(x.nextActionDate)}</small>`:''}</td>
    <td>${x.sendDossier||x.dossierStatus?`${badge(x.sendDossier||'—')}<br><small>${esc(x.dossierStatus||'')}</small>`:'—'}</td>
    <td><div class="actions"><button class="btn small gold" onclick="viewContact(${x.id})">Ver</button><button class="btn small dark" onclick="openContactModal(${x.id})">Editar</button>${x.email?`<button class="btn small ghost" onclick="composeForContact(${x.id})">Email</button>`:''}</div></td>
  </tr>`).join('') || `<tr><td colspan="11" class="muted">Sin resultados.</td></tr>`;
}
function viewContact(id){
  const x=db.crm.find(r=>r.id===id); if(!x)return;
  const keys=[
    ['Organización',x.organization],['Campaña',x.campaign],['Tipo oportunidad',x.opportunityType],['Segmento',x.segment],
    ['Municipio / Provincia',x.municipality],['Dirección',x.address],['Email',x.email],['Email CC',x.emailCc],['Teléfono',x.phone],
    ['Web',x.web],['Fuente URL',x.sourceUrl],['Prioridad',x.priority],['Enviar',x.send],['Estado envío',x.sendStatus],['Fecha envío',x.sendDate],
    ['Asunto enviado',x.sentSubject],['Respuesta recibida',x.responseReceived],['Fecha respuesta',x.responseDate],['Persona contacto',x.contactPerson],
    ['Interés',x.interest],['Disponibilidad / fechas',x.availability],['Condiciones',x.conditions],['Caché / presupuesto',x.budget],
    ['Requisitos técnicos',x.technicalRequirements],['Próxima acción',x.nextAction],['Fecha próxima acción',x.nextActionDate],['Notas seguimiento',x.followNotes],
    ['Último email recibido',x.lastEmailReceived],['Remitente respuesta',x.responseSender],['Enviar dossier',x.sendDossier],['Dossier enviado',x.dossierSent],
    ['Estado dossier',x.dossierStatus],['Notas dossier',x.dossierNotes]
  ];
  document.getElementById('modalTitle').textContent=x.organization || 'Contacto';
  document.getElementById('modalBody').innerHTML=`<div class="actions"><button class="btn gold" onclick="openContactModal(${x.id})">Editar</button>${x.email?`<button class="btn dark" onclick="composeForContact(${x.id})">Preparar email</button>`:''}${x.web?`<a class="btn ghost" target="_blank" rel="noopener" href="${esc(x.web)}">Abrir web</a>`:''}${x.sourceUrl?`<a class="btn ghost" target="_blank" rel="noopener" href="${esc(x.sourceUrl)}">Fuente</a>`:''}</div><div class="hr"></div><div class="detailGrid">${keys.map(([k,v])=>`<div class="detailItem ${String(v||'').length>140?'span2':''}"><small>${esc(k)}</small><div>${v?esc(v):'—'}</div></div>`).join('')}</div>`;
  openModal();
}
function contactFields(){return [
  ['organization','Organización / local','text','span2'],['campaign','Campaña','select','',unique(db.crm.map(x=>x.campaign))],['priority','Prioridad','select','',unique(db.crm.map(x=>x.priority))],
  ['opportunityType','Tipo oportunidad','text','span2'],['segment','Segmento','select','span2',unique(db.crm.map(x=>x.segment))],
  ['municipality','Municipio / provincia','text'],['address','Dirección','text'],
  ['email','Email','email'],['emailCc','Email CC','email'],['phone','Teléfono','text'],['web','Web','text'],
  ['send','Enviar','select','', ['SI','NO']],['sendStatus','Estado envío','select','',unique(db.crm.map(x=>x.sendStatus).concat(['Lead nuevo','Revisado','Cualificando','Propuesta enviada','Seguimiento pendiente','Negociación abierta','Pendiente de confirmación','Confirmado','En coordinación','Ejecutado','Factura pendiente','Cobro pendiente','Cobrado','Perdido','Pausado','Sin email / revisar','No enviar']))],
  ['responseReceived','Respuesta recibida','textarea','span2'],['responseDate','Fecha respuesta','date'],
  ['contactPerson','Persona contacto','text'],['contactPhone','Teléfono contacto','text'],['interest','Interés','select','', ['', 'Alto','Medio','Bajo','No interesa']],
  ['availability','Disponibilidad / fechas','textarea','span2'],['conditions','Condiciones','textarea','span2'],['budget','Caché / presupuesto','text'],['technicalRequirements','Requisitos técnicos','textarea','span2'],
  ['nextAction','Próxima acción','text','span2'],['nextActionDate','Fecha próxima acción','date'],['followNotes','Notas seguimiento','textarea','span4'],
  ['sendDossier','Enviar dossier','select','', ['', 'Sí','No']],['dossierStatus','Estado dossier','select','', ['', 'Borrador creado','Enviado','Pendiente','No enviar']],['dossierNotes','Notas dossier','textarea','span2']
];}
function unique(arr){return [...new Set(arr.filter(Boolean))].sort();}
function timeDropdownOptions(current=''){
  const out=[];
  for(let h=0; h<24; h++){
    for(let m=0; m<60; m+=15){
      const v=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
      out.push(`<option value="${v}" ${v===current?'selected':''}>${v}</option>`);
    }
  }
  return out.join('');
}
function renderForm(fields,obj){
  return `<div class="formGrid">${fields.map(f=>{
    const [key,label,type,cls,opts]=f, val=obj?.[key]??'';
    if(type==='select') return `<div class="field ${cls||''}"><label>${esc(label)}</label><select name="${key}">${(opts||[]).map(o=>`<option value="${esc(o)}" ${String(o)===String(val)?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
    if(type==='timeSelect') return `<div class="field ${cls||''}"><label>${esc(label)}</label><select name="${key}">${timeDropdownOptions(String(val||''))}</select></div>`;
    if(type==='textarea') return `<div class="field ${cls||''}"><label>${esc(label)}</label><textarea name="${key}">${esc(val)}</textarea></div>`;
    return `<div class="field ${cls||''}"><label>${esc(label)}</label><input type="${type}" name="${key}" value="${esc(val)}"></div>`;
  }).join('')}</div>`;
}
let modalContext=null;
function openModal(){document.getElementById('modal').classList.add('open');}
function closeModal(){document.getElementById('modal').classList.remove('open');modalContext=null;}
function readForm(fields){const root=document.getElementById('modalBody');const o={};fields.forEach(f=>{const el=root.querySelector(`[name="${f[0]}"]`);o[f[0]]=el?el.value:''});return o;}
function openContactModal(id=null){
  const item=id?db.crm.find(x=>x.id===id):{campaign:'Salas',priority:'Media',send:'SI',sendStatus:'Pendiente'};
  modalContext={type:'contact',id};
  document.getElementById('modalTitle').textContent=id?'Editar contacto':'Nuevo contacto';
  document.getElementById('modalBody').innerHTML=renderForm(contactFields(), item)+`<div class="hr"></div><div class="actions"><button class="btn gold" onclick="saveContact()">Guardar</button><button class="btn dark" onclick="closeModal()">Cancelar</button>${id?`<button class="btn red" onclick="deleteRecord('crm',${id})">Borrar</button>`:''}</div>`;
  openModal();
}
function saveContact(){
  const obj=readForm(contactFields());
  let item;
  if(modalContext.id){
    const idx=db.crm.findIndex(x=>String(x.id)===String(modalContext.id));
    if(idx === -1){ alert('No se ha encontrado el contacto en la app. Actualiza CRM y vuelve a intentarlo.'); return; }
    item=Object.assign({}, db.crm[idx], obj);
  }else{
    item=Object.assign({id:nextId(db.crm), sheetRow:'', raw:{}}, obj);
  }

  pushContactToSheet(item)
    .then(()=>{
      upsertLocalArrayItem('crm', item, {prepend:!modalContext.id});
      closeModal();
      saveData();
      sheetStatus('Contacto guardado en Google Sheet maestro.','ok');
    })
    .catch(alertSheetWriteError);
}
function sheetTabForArray(arrName){
  return {
    crm:'CRM_GENERAL',
    gmailResponses:'RESPUESTAS_GMAIL',
    concerts:'CONCIERTOS',
    rehearsals:'ENSAYOS',
    repertoire:'REPERTORIO',
    tasks:'TAREAS',
    localPayments:'PAGOS_LOCAL',
    bandMembers:'MIEMBROS'
  }[arrName] || '';
}

function pushDeleteToSheet(arrName,id,record={}){
  const tab=sheetTabForArray(arrName);
  if(!tab) return Promise.resolve({ok:true, skipped:true});
  if(!sheetWriteEnabled()) return Promise.reject(new Error('No hay endpoint Apps Script configurado.'));
  if(!isAdminActive()) return Promise.reject(new Error('Modo usuario: no se puede borrar en Google Sheet.'));
  sheetStatus('Borrando en Google Sheet maestro…');
  const params={action:'deleteRow', key:'1929', tab, id:String(id)};
  if(record && record.sheetRow) params.rowIndex=String(record.sheetRow);
  return appsScriptJSONP(params)
    .then(payload=>{
      if(payload && payload.ok===false){
        const msg=String(payload.error||'');
        if(msg.includes('ID no encontrado') || msg.includes('Fila no válida')){
          sheetStatus('El registro se quitó de esta vista, pero no se encontró en Google Sheet con esa clave. Actualiza para revisar.', 'bad');
          return payload;
        }
        throw new Error(payload.error || 'No se pudo borrar en Google Sheet.');
      }
      sheetStatus('Borrado en Google Sheet maestro. Actualizando vista…','ok');
      let afterWrite=true;
      if(arrName === 'localPayments') afterWrite = syncLocalPaymentsFromGoogleSheet({silent:true, reason:'afterLocalDelete'});
      else if(arrName === 'repertoire') afterWrite = syncRepertoireFromGoogleSheet({silent:true, reason:'afterRepertoireDelete'});
      else if(arrName === 'crm') afterWrite = syncSingleSheetAfterWrite('CRM_GENERAL');
      else if(arrName === 'concerts') afterWrite = syncSingleSheetAfterWrite('CONCIERTOS');
      else if(arrName === 'rehearsals') afterWrite = syncRehearsalsFromGoogleSheet({silent:true, reason:'afterRehearsalDelete'});
      else if(arrName === 'tasks') afterWrite = syncSingleSheetAfterWrite('TAREAS');
      else afterWrite = syncCRMFromGoogleSheet({silent:true, afterWrite:true});
      return Promise.resolve(afterWrite).then(()=>payload);
    });
}

function deleteRecord(arrName,id){
  if(!confirm('¿Borrar este registro de APP-BCB y del Google Sheet maestro?'))return;
  const list=Array.isArray(db[arrName]) ? db[arrName] : [];
  const record=list.find(x=>String(x.id)===String(id)) || {};
  if(!record || !Object.keys(record).length){
    alert('No se ha encontrado el registro en la app. Actualiza desde Google Sheet y vuelve a intentarlo.');
    return;
  }

  pushDeleteToSheet(arrName,id,record)
    .then(()=>{
      removeLocalArrayItem(arrName,id);
      if(arrName === 'repertoire'){
        pruneSetlistAfterRepertoireChange();
      }
      closeModal();
      saveData();
      sheetStatus('Registro borrado en Google Sheet maestro y retirado de la app.','ok');
    })
    .catch(err=>{
      sheetStatus('NO se ha borrado. Google Sheet no confirmó el borrado: '+esc(err.message||err),'bad');
      alert('No se ha podido borrar en Google Sheet.\n\nMotivo: '+(err.message||err)+'\n\nNo lo he quitado de la app para no dejar datos falsos.');
    });
}
function listCard(rows, empty='Sin registros.'){
  return rows.slice(0,10).map(x=>`<div class="detailItem"><small>${esc(x.campaign||x.emailDate||'')}</small><div><strong>${esc(x.organization||x.senderEmail)}</strong><br><span style="color:var(--muted)">${esc(compact(x.nextAction||x.responseReceived||x.summary||x.sendStatus||'',130))}</span></div><div class="actions" style="margin-top:8px"><button class="btn small gold" onclick="${x.organization?`viewContact(${x.id})`:`setTab('gmail')`}">Abrir</button>${x.email?`<button class="btn small dark" onclick="composeForContact(${x.id})">Email</button>`:''}</div></div>`).join('') || `<p class="muted">${empty}</p>`;
}
function renderFollowup(){
  const responded=db.crm.filter(x=>x.responseReceived);
  const dossier=db.crm.filter(x=>['si','sí'].includes(norm(x.sendDossier))||x.dossierStatus);
  const noEmail=db.crm.filter(x=>norm(x.sendStatus).includes('sin email'));
  const next=db.crm.filter(x=>x.nextAction||x.nextActionDate).sort((a,b)=>String(a.nextActionDate||'9999').localeCompare(String(b.nextActionDate||'9999')));
  document.getElementById('followResponded').innerHTML=listCard(responded);
  document.getElementById('followDossier').innerHTML=listCard(dossier);
  document.getElementById('followNoEmail').innerHTML=listCard(noEmail);
  document.getElementById('followNext').innerHTML=listCard(next);
}
function renderGmail(){
  const q=norm(document.getElementById('qGmail')?.value||'');
  const rows=db.gmailResponses.filter(r=>!q || norm([r.senderEmail,r.senderName,r.subject,r.summary,r.importStatus].join(' ')).includes(q));
  document.querySelector('#gmailTable tbody').innerHTML=rows.map(r=>{
    const crm = r.crmRow ? db.crm.find(x=>String(x.sheetRow)===String(r.crmRow)) : null;
    return `<tr><td>${esc(r.emailDate)}</td><td><strong>${esc(r.senderName||'')}</strong><br>${esc(r.senderEmail)}</td><td>${esc(r.subject)}</td><td>${badge(r.importStatus)}</td><td>${esc(compact(r.summary,260))}</td><td>${crm?`<button class="btn small gold" onclick="viewContact(${crm.id})">Ver CRM</button>`:'—'}</td></tr>`;
  }).join('')||'<tr><td colspan="6">Sin respuestas.</td></tr>';
}
function concertFields(){return [
  ['date','Fecha','date'],['time','Hora','timeSelect'],['eventName','Evento','text','span2'],['venue','Sala / lugar','text','span2'],['city','Ciudad','text'],['type','Tipo','select','', ['Sala','Boda','Fiesta privada','Ayuntamiento','Hotel','Evento corporativo','Empresa','Celebración','Otro']],['status','Estado','select','', ['Pre-reserva','Propuesta enviada','Pendiente de confirmación','Confirmado','En coordinación','Realizado','Cancelado']],['fee','Caché total','number'],['deposit','Anticipo','number'],['paid','Cobrado adicional','number'],['sound','Sonido/iluminación','text'],['contactId','ID contacto CRM','number'],['posterTitle','Título del cartel','text','span2'],['posterUrl','URL / ruta del cartel','text','span2'],['posterThumbUrl','URL / ruta miniatura','text','span2'],['publicInfo','Texto público / entrada / dirección','textarea','span4'],['notes','Notas producción','textarea','span4']
];}
function concertIsPast(concert){
  if(!concert.date) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(String(concert.date)+'T00:00:00');
  return !Number.isNaN(d.getTime()) && d < today;
}
function concertPosterSrc(concert){
  return concert.posterThumbUrl || concert.posterUrl || '';
}
function renderConcertPosters(arr){
  const box=document.getElementById('concertPosterGrid');
  if(!box) return;
  const withPoster=(arr||[]).filter(x=>concertPosterSrc(x)||x.posterUrl);
  const upcoming=withPoster.filter(x=>!concertIsPast(x));
  const past=withPoster.filter(x=>concertIsPast(x));
  const renderGroup=(title,rows)=> rows.length ? `
    <div class="posterGroup">
      <h4>${esc(title)}</h4>
      <div class="posterGrid">
        ${rows.map(x=>{
          const src=concertPosterSrc(x);
          const full=x.posterUrl||src;
          return `<article class="posterCard">
            ${src?`<a href="${esc(full)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="${esc(x.posterTitle||x.eventName||'Cartel concierto')}"></a>`:`<div class="posterEmpty">Sin cartel</div>`}
            <div class="posterInfo">
              <strong>${esc(x.posterTitle||x.eventName||'Concierto')}</strong>
              <span>${esc([x.date,x.time].filter(Boolean).join(' · '))}</span>
              <span>${esc([x.venue,x.city].filter(Boolean).join(' · '))}</span>
              ${x.publicInfo?`<p>${esc(x.publicInfo)}</p>`:''}
              <div class="actions">
                <button class="btn small gold" onclick="openConcertModal(${x.id})">Editar</button>
                ${full?`<a class="btn small dark" href="${esc(full)}" target="_blank" rel="noopener">Abrir cartel</a>`:''}
              </div>
            </div>
          </article>`;
        }).join('')}
      </div>
    </div>` : '';
  box.innerHTML = renderGroup('Próximos conciertos', upcoming) + renderGroup('Conciertos pasados', past) || `<div class="card"><p class="muted">Todavía no hay carteles cargados. Entra como admin, edita un concierto y pega una URL/ruta de cartel o usa “Subir cartel al navegador”.</p></div>`;
}
function renderConcerts(){
  const arr=db.concerts||[];
  const total=arr.reduce((s,x)=>s+Number(x.fee||0),0), deposit=arr.reduce((s,x)=>s+Number(x.deposit||0)+Number(x.paid||0),0), pending=Math.max(0,total-deposit);
  document.getElementById('concertKpis').innerHTML=[
    ['Conciertos', arr.length],['Facturación prevista', eur(total)],['Cobrado/anticipos', eur(deposit)],['Pendiente', eur(pending)]
  ].map(k=>`<div class="card kpi"><strong>${k[1]}</strong><span>${k[0]}</span></div>`).join('');
  renderConcertPosters(arr);
  document.querySelector('#concertTable tbody').innerHTML=arr.map(x=>{const paid=Number(x.deposit||0)+Number(x.paid||0), pending=Math.max(0,Number(x.fee||0)-paid);return `<tr><td>${esc(x.date)} ${esc(x.time||'')}</td><td><strong>${esc(x.eventName)}</strong><br><span style="color:var(--muted)">${esc(compact(x.notes,80))}</span></td><td>${esc(x.venue)}<br><span style="color:var(--muted)">${esc(x.city)}</span></td><td>${esc(x.type)}</td><td>${badge(x.status)}</td><td>${eur(x.fee)}</td><td>${eur(x.deposit)}</td><td>${eur(x.paid)}</td><td>${eur(pending)}</td><td><button class="btn small gold" onclick="openConcertModal(${x.id})">Editar</button> <button class="btn small red" onclick="deleteRecord('concerts',${x.id})">Borrar</button></td></tr>`}).join('')||'<tr><td colspan="10" class="muted">Todavía no hay conciertos creados. Usa “+ Concierto” o la calculadora de presupuesto.</td></tr>';
}
function posterUploadBlock(item){
  const current = item?.posterUrl || item?.posterThumbUrl || '';
  return `<div class="hr"></div>
  <div class="posterUploader">
    <h4>Cartel del concierto</h4>
    <p class="muted">Puedes pegar una ruta/URL en el campo “URL / ruta del cartel” o cargar una imagen local. La carga local se guarda en este navegador y entra en el backup JSON.</p>
    ${current?`<img class="posterPreview" src="${esc(current)}" alt="Cartel actual">`:''}
    <label class="btn dark">Subir cartel al navegador
      <input type="file" accept="image/*" style="display:none" onchange="loadConcertPosterFile(this.files[0])">
    </label>
    <div class="notice" style="margin-top:10px">Para un cartel común a toda la banda, lo más limpio es subir la imagen a <code>assets/posters/</code> en GitHub y pegar aquí la ruta.</div>
  </div>`;
}
function loadConcertPosterFile(file){
  if(!file) return;
  const maxSide = 1200;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const root=document.getElementById('modalBody');
      const poster=root.querySelector('[name="posterUrl"]');
      const thumb=root.querySelector('[name="posterThumbUrl"]');
      if(poster) poster.value=dataUrl;
      if(thumb) thumb.value=dataUrl;
      const preview=root.querySelector('.posterPreview');
      if(preview) preview.src=dataUrl;
      else {
        const uploader=root.querySelector('.posterUploader');
        if(uploader) uploader.insertAdjacentHTML('afterbegin', `<img class="posterPreview" src="${dataUrl}" alt="Cartel cargado">`);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function openConcertModal(id=null,preset=null){
  const item=id?db.concerts.find(x=>x.id===id):(preset||{status:'Pre-reserva',type:'Sala',fee:0,deposit:0,paid:0});
  modalContext={type:'concert',id};
  document.getElementById('modalTitle').textContent=id?'Editar concierto':'Nuevo concierto';
  document.getElementById('modalBody').innerHTML=renderForm(concertFields(), item)+posterUploadBlock(item)+`<div class="hr"></div><div class="actions"><button class="btn gold" onclick="saveConcert()">Guardar</button><button class="btn dark" onclick="closeModal()">Cancelar</button></div>`;
  openModal();
}
function saveConcert(){
  const obj=readForm(concertFields());
  ['fee','deposit','paid','contactId'].forEach(k=>obj[k]=Number(obj[k]||0));
  let item;
  if(modalContext.id){
    const idx=db.concerts.findIndex(x=>String(x.id)===String(modalContext.id));
    if(idx === -1){ alert('No se ha encontrado el concierto. Actualiza y vuelve a intentarlo.'); return; }
    item=Object.assign({}, db.concerts[idx], obj);
  }else{
    item=Object.assign({id:nextId(db.concerts)}, obj);
  }

  pushConcertToSheet(item)
    .then(()=>{
      upsertLocalArrayItem('concerts', item);
      closeModal();
      saveData();
      sheetStatus('Concierto guardado en Google Sheet maestro.','ok');
    })
    .catch(alertSheetWriteError);
}

function bandMembers(opts={}){
  const includeInactive=!!opts.includeInactive;
  const source=(Array.isArray(db.bandMembers) && db.bandMembers.length ? db.bandMembers : BCB_FIXED_MEMBERS).map(normalizeMemberRecord);
  const byId=new Map();
  source.forEach(m=>{ if(m.name) byId.set(normalizeMemberKey(m.id||m.name), m); });
  const items=Array.from(byId.values());
  return includeInactive ? items : items.filter(memberShowsInRehearsals);
}
function memberLabel(id){
  const m=bandMembers({includeInactive:true}).find(x=>normalizeMemberKey(x.id||x.name)===normalizeMemberKey(id));
  return m ? `${m.name} · ${m.role || m.instrument || ''}` : id;
}
function memberOptions(value=''){
  const current=normalizeMemberKey(value);
  let items=bandMembers();
  if(current && !items.some(m=>normalizeMemberKey(m.id||m.name)===current)){
    const extra=bandMembers({includeInactive:true}).find(m=>normalizeMemberKey(m.id||m.name)===current);
    if(extra) items=items.concat([extra]);
  }
  return items.map(m=>{
    const id=normalizeMemberKey(m.id||m.name);
    return `<option value="${esc(id)}" ${id===current?'selected':''}>${esc(m.name)} · ${esc(m.role||m.instrument||'')}</option>`;
  }).join('');
}
function attendanceOptions(value='Pendiente'){
  return ['Pendiente','Confirmado','Duda','No asiste','Llega tarde','Necesita revisar horario'].map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('');
}
function attendanceSummary(attendance){
  const a=attendance||{};
  const members=bandMembers();
  const confirmed=members.filter(m=>norm(a[m.id]?.status).includes('confirm')).length;
  const no=members.filter(m=>norm(a[m.id]?.status).includes('no asiste')).length;
  const doubt=members.filter(m=>['duda','necesita revisar horario','llega tarde'].some(x=>norm(a[m.id]?.status).includes(x))).length;
  const pending=Math.max(0,members.length-confirmed-no-doubt);
  return {confirmed,no,doubt,pending,total:members.length};
}
function attendancePills(attendance){
  const a=attendance||{};
  return `<div class="attendanceGrid">`+bandMembers().map(m=>{
    const item=a[m.id]||{status:'Pendiente',notes:''};
    return `<div class="attendanceChip"><strong>${esc(m.name)}</strong><small>${esc(m.role)}</small>${badge(item.status||'Pendiente')}${item.notes?`<em>${esc(compact(item.notes,60))}</em>`:''}</div>`;
  }).join('')+`</div>`;
}
function rehearsalFields(){return [
  ['date','Fecha','date'],
  ['startTime','Hora inicio','timeSelect'],
  ['endTime','Hora fin','timeSelect'],
  ['place','Lugar / local','select','span2', ['Locales Lady Stone · Sala Janis Joplin']],
  ['status','Estado','select','', ['Pendiente','Confirmado','Movido','Cancelado','Realizado']],
  ['objective','Objetivo del ensayo','select','span4', ['Ensayo general','Repaso de setlist','Montaje de temas nuevos','Voces','Tonos','Dinámicas y finales','Preparación de bolo','Grabación / contenido']],
  ['notes','Notas','textarea','span4']
];}
function rehearsalSongs(item){
  if(item?.allSongs) return db.repertoire||[];
  const ids=(item?.songIds||[]).map(Number);
  return (db.repertoire||[]).filter(s=>ids.includes(Number(s.id)));
}
function rehearsalSongChecklist(item){
  const selected=(item?.songIds||[]).map(Number);
  const allSongs = item?.allSongs === true;
  const rows=(db.repertoire||[]).map(s=>{
    const checked=allSongs || selected.includes(Number(s.id));
    return `<label class="songCheck"><input type="checkbox" data-rehearsal-song value="${esc(s.id)}" ${checked?'checked':''}> <span><strong>${esc(s.title)}</strong><small>${esc(s.artist||'')} · ${esc(s.currentKey||s.tone||'tono pendiente')} · ${esc(s.singer||s.leadVocal||'voz pendiente')}</small></span></label>`;
  }).join('');
  return `<div class="hr"></div>
    <div class="rehearsalSelector">
      <h4>Temas previstos</h4>
      <label class="songCheck all"><input type="checkbox" id="rehearsalAllSongs" ${allSongs?'checked':''}> <span><strong>Trabajar todo el repertorio</strong><small>Útil para ensayos generales o repaso completo.</small></span></label>
      <div class="actions" style="margin:10px 0">
        <button type="button" class="btn small gold" onclick="setRehearsalSongsMode('all')">Marcar todos</button>
        <button type="button" class="btn small dark" onclick="setRehearsalSongsMode('setlist')">Usar setlist actual</button>
        <button type="button" class="btn small red" onclick="setRehearsalSongsMode('clear')">Limpiar</button>
      </div>
      <div class="songCheckList">${rows || '<p class="muted">No hay canciones cargadas.</p>'}</div>
    </div>`;
}
function rehearsalAttendanceEditor(item){
  const a=item?.attendance||{};
  return `<div class="hr"></div><h4>Asistencia al ensayo</h4><div class="attendanceEditGrid">`+bandMembers().map(m=>{
    const id = normalizeMemberKey(m.id || m.name);
    const itemA = a[id] || a[m.id] || a[m.name] || {status:'Pendiente',notes:''};
    return `<div class="attendanceEditItem">
      <label>${esc(m.name)} · ${esc(m.role)}</label>
      <select data-rehearsal-attendance="${esc(id)}">${attendanceOptions(itemA.status||'Pendiente')}</select>
      <input data-rehearsal-attendance-note="${esc(id)}" placeholder="Notas" value="${esc(itemA.notes||'')}">
    </div>`;
  }).join('')+`</div>`;
}

function setRehearsalSongsMode(mode){
  const all=document.getElementById('rehearsalAllSongs');
  const checks=[...document.querySelectorAll('[data-rehearsal-song]')];
  if(mode==='all'){
    if(all) all.checked=true;
    checks.forEach(ch=>ch.checked=true);
  }
  if(mode==='clear'){
    if(all) all.checked=false;
    checks.forEach(ch=>ch.checked=false);
  }
  if(mode==='setlist'){
    if(all) all.checked=false;
    const titles=new Set(setlistRows().map(x=>norm(x.title)));
    checks.forEach(ch=>{
      const song=db.repertoire.find(s=>Number(s.id)===Number(ch.value));
      ch.checked=!!song && titles.has(norm(song.title));
    });
  }
}
function openRehearsalModal(id=null){
  const defaultAttendance={};
  bandMembers().forEach(m=>defaultAttendance[m.id]={status:'Pendiente',notes:''});
  const item=id?db.rehearsals.find(x=>x.id===id):{status:'Pendiente',startTime:'20:00',endTime:'23:00',place:'Locales Lady Stone · Sala Janis Joplin',objective:'Ensayo general',allSongs:false,songIds:[],attendance:defaultAttendance};
  modalContext={type:'rehearsal',id};
  document.getElementById('modalTitle').textContent=id?'Editar ensayo':'Nuevo ensayo';
  document.getElementById('modalBody').innerHTML=renderForm(rehearsalFields(), item)+rehearsalSongChecklist(item)+rehearsalAttendanceEditor(item)+`<div class="hr"></div><div class="actions"><button class="btn gold" onclick="saveRehearsal()">Guardar</button><button class="btn dark" onclick="closeModal()">Cancelar</button>${id?`<button class="btn red" onclick="deleteRecord('rehearsals',${id})">Borrar</button>`:''}</div>`;
  openModal();
}
function saveRehearsal(){
  const obj=readForm(rehearsalFields());
  obj.allSongs=!!document.getElementById('rehearsalAllSongs')?.checked;
  obj.songIds=obj.allSongs?[]:unique([...document.querySelectorAll('[data-rehearsal-song]:checked')].map(x=>Number(x.value)).filter(n=>Number.isFinite(n) && n>0));
  obj.songTitles=obj.allSongs?'Todos los temas':rehearsalSongTitlesForSave(obj.songIds);
  obj.attendance={};
  bandMembers().forEach(m=>{
    const id=normalizeMemberKey(m.id || m.name);
    const st=document.querySelector(`[data-rehearsal-attendance="${id}"]`)?.value||'Pendiente';
    const notes=document.querySelector(`[data-rehearsal-attendance-note="${id}"]`)?.value||'';
    obj.attendance[id]={status:st,notes};
  });
  let item;
  if(modalContext.id){
    const idx=db.rehearsals.findIndex(x=>String(x.id)===String(modalContext.id));
    if(idx === -1){ alert('No se ha encontrado el ensayo. Actualiza y vuelve a intentarlo.'); return; }
    item=Object.assign({}, db.rehearsals[idx], obj);
  }else{
    item=Object.assign({id:nextId(db.rehearsals||[])}, obj);
  }

  pushRehearsalToSheet(item)
    .then(()=>{
      upsertLocalArrayItem('rehearsals', item);
      closeModal();
      saveData();
      rehearsalSheetStatus('Ensayo guardado en Google Sheet maestro.','ok');
    })
    .catch(alertSheetWriteError);
}

function viewRehearsalModal(id){
  const r=(db.rehearsals||[]).find(x=>x.id===id);
  if(!r)return;
  const songs=rehearsalSongs(r);
  document.getElementById('modalTitle').textContent='Ensayo · '+(r.date||'sin fecha');
  document.getElementById('modalBody').innerHTML=`
    <div class="detailGrid">
      <div class="detailItem"><small>Fecha</small><div><strong>${esc(r.date||'—')}</strong></div></div>
      <div class="detailItem"><small>Horario</small><div>${esc([r.startTime,r.endTime].filter(Boolean).join(' - ')||'—')}</div></div>
      <div class="detailItem"><small>Lugar</small><div>${esc(r.place||'—')}</div></div>
      <div class="detailItem"><small>Estado</small><div>${badge(r.status||'Pendiente')}</div></div>
      <div class="detailItem span2"><small>Objetivo</small><div>${esc(r.objective||'—')}</div></div>
      <div class="detailItem span2"><small>Notas</small><div>${esc(r.notes||'—')}</div></div>
    </div>
    <div class="hr"></div>
    <h4>Temas previstos</h4>
    ${r.allSongs?'<p><strong>Todo el repertorio.</strong></p>':songs.length?`<div class="pillList">${songs.map(s=>`<span class="pill">${esc(s.title)}</span>`).join('')}</div>`:'<p class="muted">Sin temas seleccionados.</p>'}
    <div class="hr"></div>
    <h4>Asistencia al ensayo</h4>
    ${attendancePills(r.attendance)}
    <div class="hr"></div>
    <div class="actions"><button class="btn gold" onclick="openRehearsalModal(${r.id})">Editar</button><button class="btn dark" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
}
function renderRehearsals(){
  const section=document.getElementById('rehearsals');
  if(!section)return;
  db.rehearsals = Array.isArray(db.rehearsals) ? db.rehearsals : [];
  const today=new Date().toISOString().slice(0,10);
  const upcoming=db.rehearsals.filter(r=>!r.date || r.date>=today).sort((a,b)=>String(a.date||'9999-99-99').localeCompare(String(b.date||'9999-99-99')) || String(a.startTime||'99:99').localeCompare(String(b.startTime||'99:99')));
  const confirmed=db.rehearsals.filter(r=>norm(r.status).includes('confirm')).length;
  const pending=db.rehearsals.filter(r=>norm(r.status).includes('pend')).length;
  const totalSongs=(db.repertoire||[]).length;
  const kpis=document.getElementById('rehearsalKpis');
  if(kpis) kpis.innerHTML=[
    ['Ensayos', db.rehearsals.length],
    ['Próximos', upcoming.length],
    ['Confirmados', confirmed],
    ['Canciones disponibles', totalSongs],
    ['Pendientes', pending],
    ['Miembros', bandMembers().length]
  ].map(k=>`<div class="card kpi"><strong>${esc(k[1])}</strong><span>${esc(k[0])}</span></div>`).join('');
  const next=document.getElementById('nextRehearsals');
  if(next) next.innerHTML=upcoming.slice(0,5).map(r=>{
    const songs=rehearsalSongs(r);
    const sum=attendanceSummary(r.attendance);
    return `<div class="detailItem"><small>${esc(r.date||'Sin fecha')} · ${esc([r.startTime,r.endTime].filter(Boolean).join(' - ')||'sin horario')}</small><div><strong>${esc(r.place||'Lugar pendiente')}</strong><br><span style="color:var(--muted)">${esc(r.objective||'Objetivo pendiente')} · ${r.allSongs?'Todo el repertorio':songs.length+' temas'} · ${sum.confirmed}/${sum.total} confirmados</span></div><div class="actions" style="margin-top:8px"><button class="btn small dark" onclick="viewRehearsalModal(${r.id})">Ver</button><button class="btn small gold" onclick="openRehearsalModal(${r.id})">Editar</button></div></div>`;
  }).join('') || '<p class="muted">No hay ensayos creados todavía.</p>';
  const tbody=document.querySelector('#rehearsalTable tbody');
  if(tbody) tbody.innerHTML=db.rehearsals.map(r=>{
    const songs=rehearsalSongs(r);
    const sum=attendanceSummary(r.attendance);
    return `<tr>
      <td><strong>${esc(r.date||'—')}</strong></td>
      <td>${esc([r.startTime,r.endTime].filter(Boolean).join(' - ')||'—')}</td>
      <td>${esc(r.place||'—')}</td>
      <td>${esc(compact(r.objective||r.notes||'—',90))}</td>
      <td>${r.allSongs?'Todo el repertorio':(songs.length?songs.length+' temas':'—')}<br><small>${esc(songs.slice(0,3).map(s=>s.title).join(' · '))}${songs.length>3?'…':''}</small></td>
      <td>${sum.confirmed}/${sum.total} confirmados<br><small>${sum.pending} pendientes · ${sum.doubt} dudas · ${sum.no} no</small></td>
      <td>${badge(r.status||'Pendiente')}</td>
      <td><button class="btn small dark" onclick="viewRehearsalModal(${r.id})">Ver</button> <button class="btn small gold" onclick="openRehearsalModal(${r.id})">Editar</button> <button class="btn small red" onclick="deleteRecord('rehearsals',${r.id})">Borrar</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="muted">Todavía no hay ensayos creados. Entra como administrador para añadir el primero.</td></tr>';
  renderRehearsalAttendancePanel();
}


function memberPaymentHistory(memberId){
  const id=normalizeMemberKey(memberId);
  return (db.localPayments||[])
    .filter(p=>normalizeMemberKey(p.memberId||p.name)===id)
    .sort((a,b)=>String(b.month||'').localeCompare(String(a.month||'')));
}
function memberPaymentSummary(memberId){
  const rows=memberPaymentHistory(memberId);
  const paid=rows.filter(r=>isPaymentPaid(r.paid)).length;
  const pending=rows.filter(r=>!isPaymentPaid(r.paid)).length;
  const last=rows[0];
  return {rows, paid, pending, last};
}
function renderMembers(){
  const section=document.getElementById('members');
  if(!section) return;
  db.bandMembers=(Array.isArray(db.bandMembers) && db.bandMembers.length ? db.bandMembers : BCB_FIXED_MEMBERS).map(normalizeMemberRecord);
  const members=bandMembers({includeInactive:true});
  const active=members.filter(memberIsActive).length;
  const local=members.filter(memberPaysLocal).length;
  const vocals=members.filter(m=>yesNo(m.vocal,'No')==='Sí' || ['Miguel','Carmen','Ambos'].includes(String(m.vocal))).length;
  const kpis=document.getElementById('membersKpis');
  if(kpis) kpis.innerHTML=[
    ['Miembros totales', members.length],
    ['Activos', active],
    ['Pagan local', local],
    ['Voces', vocals]
  ].map(k=>`<div class="card kpi"><strong>${esc(k[1])}</strong><span>${esc(k[0])}</span></div>`).join('');
  const tbody=document.querySelector('#membersTable tbody');
  if(tbody) tbody.innerHTML=members.map(m=>{
    const id=normalizeMemberKey(m.id||m.name);
    const hist=memberPaymentSummary(id);
    const status=memberIsActive(m)?'Activo':'Inactivo';
    return `<tr>
      <td><strong>${esc(m.name)}</strong><br><small>${esc(id)}</small></td>
      <td>${esc(m.role||m.instrument||'—')}</td>
      <td>${badge(status)}</td>
      <td>${esc(m.vocal||'No')}</td>
      <td>${badge(memberPaysLocal(m)?'Sí':'No')}</td>
      <td>${badge(memberShowsInRehearsals(m)?'Sí':'No')}</td>
      <td>${esc(m.joinDate||'—')}</td>
      <td>${esc(m.inactiveDate||'—')}</td>
      <td>${hist.rows.length} meses<br><small>${hist.paid} pagados · ${hist.pending} pendientes</small></td>
      <td class="member-actions admin-only">
        <button class="mini member-edit-btn" type="button" onclick="openMemberModal('${esc(id)}')">Editar</button>
        ${memberIsActive(m)?`<button class="mini danger" type="button" onclick="deactivateMember('${esc(id)}')">Inactivar</button>`:`<button class="mini" type="button" onclick="reactivateMember('${esc(id)}')">Reactivar</button>`}
        <button class="mini" type="button" onclick="viewMemberPayments('${esc(id)}')">Pagos</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" class="muted">No hay miembros cargados.</td></tr>';
}
function memberFields(){
  return [
    ['name','Nombre','text',''],
    ['role','Rol / instrumento','select','', ['Voz / administrador','Voz','Guitarra solista','Guitarra rítmica','Bajista','Batería','Teclista','Saxofón','Percusión','Técnico','Otro']],
    ['instrument','Instrumento','select','', ['Voz','Guitarra solista','Guitarra rítmica','Bajo','Batería','Teclado','Percusión','Técnico','Otro']],
    ['vocal','Canta','select','', ['No','Miguel','Carmen','Ambos','Por decidir']],
    ['admin','Admin app','select','', ['No','Sí']],
    ['active','Activo','select','', ['Sí','No']],
    ['payLocal','Paga local','select','', ['Sí','No']],
    ['showInRehearsals','Aparece en ensayos','select','', ['Sí','No']],
    ['joinDate','Fecha alta','date',''],
    ['inactiveDate','Fecha inactividad','date',''],
    ['email','Email','text',''],
    ['phone','Teléfono','text',''],
    ['notes','Notas','textarea','span4']
  ];
}
function openMemberModal(id=null){
  const key=normalizeMemberKey(id||'');
  const item=id ? bandMembers({includeInactive:true}).find(m=>normalizeMemberKey(m.id||m.name)===key) : {
    id:'',
    name:'',
    role:'Otro',
    instrument:'Otro',
    vocal:'No',
    admin:'No',
    active:'Sí',
    payLocal:'Sí',
    showInRehearsals:'Sí',
    joinDate:new Date().toISOString().slice(0,10),
    inactiveDate:'',
    notes:''
  };
  modalContext={type:'member', id:key};
  document.getElementById('modalTitle').textContent=id?'Editar miembro':'Nuevo miembro';
  const paymentHtml = id ? `<div class="hr"></div><h4>Histórico de pagos local</h4>${memberPaymentsMiniTable(key)}` : '';
  document.getElementById('modalBody').innerHTML=renderForm(memberFields(), item)+paymentHtml+`<div class="hr"></div><div class="actions"><button class="btn gold" onclick="saveMember()">Guardar en Google Sheet</button><button class="btn dark" onclick="closeModal()">Cancelar</button></div>`;
  openModal();
}
function memberPaymentsMiniTable(id){
  const rows=memberPaymentHistory(id).slice(0,18);
  if(!rows.length) return '<p class="muted">Sin pagos registrados todavía.</p>';
  return `<div class="tableWrap"><table><thead><tr><th>Mes</th><th>Cuota</th><th>Estado</th><th>Fecha pago</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(monthLabel(r.month))}</td><td>${money2(parseEuroValue(r.amount)||0)}</td><td>${badge(isPaymentPaid(r.paid)?'Pagado':'Pendiente')}</td><td>${esc(r.paidDate||'—')}</td></tr>`).join('')}</tbody></table></div>`;
}
function saveMember(){
  const obj=readForm(memberFields());
  let id=modalContext && modalContext.id ? modalContext.id : normalizeMemberKey(obj.name);
  if(!obj.name){ alert('Falta nombre del miembro.'); return; }
  if(!id) id=normalizeMemberKey(obj.name);
  let existing=bandMembers({includeInactive:true}).find(m=>normalizeMemberKey(m.id||m.name)===id);
  const item=normalizeMemberRecord(Object.assign({}, existing||{}, obj, {id}));
  pushMemberToSheet(item)
    .then(()=>{
      const idx=(db.bandMembers||[]).findIndex(m=>normalizeMemberKey(m.id||m.name)===normalizeMemberKey(item.id||item.name));
      if(idx>=0) db.bandMembers[idx]=item;
      else {
        db.bandMembers=db.bandMembers||[];
        db.bandMembers.push(item);
      }
      ensureLocalPaymentsForMonth(localSelectedMonth || currentYYYYMM());
      closeModal();
      saveData();
      renderMembers();
      renderLocalPayments();
      sheetStatus('Miembro guardado en Google Sheet maestro.','ok');
    })
    .catch(alertSheetWriteError);
}
function deactivateMember(id){
  const key=normalizeMemberKey(id);
  const current=bandMembers({includeInactive:true}).find(m=>normalizeMemberKey(m.id||m.name)===key);
  if(!current) return alert('No se encuentra el miembro.');
  if(!confirm('Se marcará como inactivo. No se borrará su histórico. ¿Continuar?')) return;
  const item=normalizeMemberRecord(Object.assign({}, current, {
    active:'No',
    inactiveDate: current.inactiveDate || new Date().toISOString().slice(0,10),
    payLocal:'No',
    showInRehearsals:'No'
  }));
  pushMemberToSheet(item)
    .then(()=>{
      const idx=(db.bandMembers||[]).findIndex(m=>normalizeMemberKey(m.id||m.name)===normalizeMemberKey(item.id||item.name));
      if(idx>=0) db.bandMembers[idx]=item;
      saveData();
      renderMembers();
      renderLocalPayments();
      sheetStatus('Miembro inactivado en Google Sheet sin borrar histórico.','ok');
    })
    .catch(alertSheetWriteError);
}
function reactivateMember(id){
  const key=normalizeMemberKey(id);
  const current=bandMembers({includeInactive:true}).find(m=>normalizeMemberKey(m.id||m.name)===key);
  if(!current) return alert('No se encuentra el miembro.');
  const item=normalizeMemberRecord(Object.assign({}, current, {
    active:'Sí',
    inactiveDate:'',
    payLocal: current.payLocal || 'Sí',
    showInRehearsals: current.showInRehearsals || 'Sí'
  }));
  pushMemberToSheet(item)
    .then(()=>{
      const idx=(db.bandMembers||[]).findIndex(m=>normalizeMemberKey(m.id||m.name)===normalizeMemberKey(item.id||item.name));
      if(idx>=0) db.bandMembers[idx]=item;
      ensureLocalPaymentsForMonth(localSelectedMonth || currentYYYYMM());
      saveData();
      renderMembers();
      renderLocalPayments();
      sheetStatus('Miembro reactivado en Google Sheet.','ok');
    })
    .catch(alertSheetWriteError);
}
function viewMemberPayments(id){
  const key=normalizeMemberKey(id);
  const item=bandMembers({includeInactive:true}).find(m=>normalizeMemberKey(m.id||m.name)===key);
  modalContext={type:'memberPayments', id:key};
  document.getElementById('modalTitle').textContent='Pagos local · '+(item?.name || key);
  document.getElementById('modalBody').innerHTML=memberPaymentsMiniTable(key)+`<div class="hr"></div><div class="actions"><button class="btn dark" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
}

function renderLocalPayments(){
  const section=document.getElementById('local');
  if(!section)return;

  db.localPayments = consolidateLocalPaymentRows(Array.isArray(db.localPayments) ? db.localPayments : []);
  const months=localAvailableMonths();
  const autoMonth=localDefaultControlMonth();
  const controlMonth = normalizeMonthValue(localSelectedMonth) || autoMonth;
  localSelectedMonth = controlMonth;

  const baseRows = ensureLocalPaymentsForMonth(controlMonth);
  // No llamamos saveData() desde render: evitamos bucles de renderizado y bloqueos del navegador.
  persistDataOnly();

  const monthlyAmount = localTotalAmount();
  const paidRaw = baseRows.filter(r=>isPaymentPaid(r.paid)).reduce((a,r)=>a+(parseEuroValue(r.amount)||0),0);
  const paid = Math.min(monthlyAmount, paidRaw);
  const pending = Math.max(0, monthlyAmount - paid);
  const status = localMonthStatus(controlMonth);

  ensureLocalPaymentControls(section, months, controlMonth);

  const kpis=document.getElementById('localKpis');
  if(kpis) kpis.innerHTML=[
    ['Mes control', monthLabel(controlMonth)],
    ['Miembros', baseRows.length],
    ['Total local', money2(monthlyAmount)],
    ['Pagado', money2(paid)],
    ['Pendiente', money2(pending)]
  ].map(k=>`<div class="card kpi"><strong>${esc(k[1])}</strong><span>${esc(k[0])}</span></div>`).join('');

  const tbody=document.querySelector('#localTable tbody');
  if(tbody) tbody.innerHTML=baseRows.map(r=>{
    const st=isPaymentPaid(r.paid)?'Pagado':'Pendiente';
    const memberId=normalizeMemberKey(r.memberId||r.name);
    return `<tr>
      <td>${esc(monthLabel(normalizeMonthValue(r.month)||controlMonth))}<br><small>${esc(normalizeMonthValue(r.month)||controlMonth)}</small></td>
      <td><strong>${esc(normalizeMemberKey(r.memberId||r.name)==='miguel'?'Miguel':memberDisplayName(memberId)||r.name||'—')}</strong><br><small>${esc(memberId||'')}</small></td>
      <td>${esc(money2(parseEuroValue(r.amount)).replace(' €',''))} €</td>
      <td>${badge(st)}</td>
      <td>${esc(r.paidDate||'—')}</td>
      <td>${esc(compact(r.notes||'',120))}</td>
      <td class="admin-only"><button class="mini" onclick="markLocalPayment('${esc(normalizeMonthValue(r.month)||controlMonth)}','${esc(memberId)}','SI')">Pagado</button> <button class="mini danger" onclick="markLocalPayment('${esc(normalizeMonthValue(r.month)||controlMonth)}','${esc(memberId)}','NO')">Pendiente</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="muted">No hay cuotas del local cargadas.</td></tr>';

  if(status.complete && controlMonth===currentYYYYMM()){
    // No se escriben datos aquí para evitar cambios automáticos sin acción del admin.
    // El salto y creación de mes se ejecutan al marcar el último pago o al pulsar Mes automático.
  }
}

async function markLocalPayment(month, memberId, paid){
  const controlMonth=normalizeMonthValue(month)||currentYYYYMM();
  const id=normalizeMemberKey(memberId);
  ensureLocalPaymentsForMonth(controlMonth);

  let item=(db.localPayments||[]).find(r=>normalizeMonthValue(r.month)===controlMonth && normalizeMemberKey(r.memberId||r.name)===id);
  if(!item){
    item=localPaymentSeedRow(controlMonth, id);
    db.localPayments.push(item);
  }

  item.id = item.id || (controlMonth+'|'+id);
  item.month=controlMonth;
  item.memberId=id;
  item.name=memberDisplayName(id);
  item.amount=parseEuroValue(item.amount)||localMemberAmount();
  item.paid=paid==='SI'?'SI':'NO';
  item.paidDate=paid==='SI'?new Date().toISOString().slice(0,10):'';
  item.updatedAt=new Date().toISOString();
  item.notes=mergeTextNotes(item.notes, paid==='SI'?'Marcado pagado desde APP-BCB':'Marcado pendiente desde APP-BCB');

  db.localPayments=mergeLocalPaymentRows(db.localPayments||[], [item]);
  localSelectedMonth=controlMonth;
  saveData({refresh:false});
  renderLocalPayments();
  renderShell();

  try{
    await pushLocalPaymentToSheet(item,{afterWrite:'none'});
    await syncLocalPaymentsFromGoogleSheet({silent:true});
    const closed=isLocalMonthFullyPaid(controlMonth);
    if(closed && paid==='SI'){
      await openNextLocalMonthAfterCompletion(controlMonth);
    }else{
      localSelectedMonth=controlMonth;
      renderLocalPayments();
      sheetStatus('Pago local actualizado en Google Sheet. La vista mantiene todos los miembros del mes.','ok');
    }
  }catch(err){
    alertSheetWriteError(err);
  }
}


function fillSelectKeep(el, options, current){
  if(!el)return;
  el.innerHTML=options;
  if(current && [...el.options].some(o=>o.value===current)) el.value=current;
}
function renderConcertAttendancePanel(){
  const concertSelect=document.getElementById('attendanceConcertSelect');
  if(!concertSelect)return;
  const prevConcert=concertSelect.value;
  const concerts=(db.concerts||[]).slice().sort((a,b)=>String(a.date||'9999-99-99').localeCompare(String(b.date||'9999-99-99')));
  fillSelectKeep(concertSelect, concerts.map(c=>`<option value="${esc(c.id)}">${esc(c.date||'sin fecha')} · ${esc(c.eventName||c.venue||'Concierto')}</option>`).join(''), prevConcert);
  const memberSelect=document.getElementById('attendanceMemberSelect');
  const prevMember=memberSelect?.value||'';
  fillSelectKeep(memberSelect, memberOptions(prevMember), prevMember);
  const c=concerts.find(x=>Number(x.id)===Number(concertSelect.value)) || concerts[0];
  if(c && !concertSelect.value) concertSelect.value=c.id;
  const mId=memberSelect?.value || bandMembers()[0]?.id;
  const saved=c?.attendance?.[mId] || {};
  const summary=document.getElementById('concertAttendanceSummary');
  if(summary){
    summary.innerHTML=c?`
      <div class="detailItem"><small>Concierto seleccionado</small><div><strong>${esc(c.date||'sin fecha')} · ${esc(c.eventName||'Concierto')}</strong><br><span style="color:var(--muted)">${esc(c.venue||'')} ${c.city?'· '+esc(c.city):''}</span></div></div>
      <div class="hr"></div>
      <h4>Estado guardado por miembro</h4>
      ${attendancePills(c.attendance)}
      ${saved.notes?`<p class="muted">Nota guardada de ${esc(memberLabel(mId))}: ${esc(saved.notes)}</p>`:''}
    `:'<p class="muted">No hay conciertos creados todavía.</p>';
  }
}

function renderRehearsalAttendancePanel(){
  const select=document.getElementById('attendanceConcertSelect');
  if(!select)return;
  const prev=select.value;
  const rehearsals=(db.rehearsals||[]).slice().sort((a,b)=>String(a.date||'9999-99-99').localeCompare(String(b.date||'9999-99-99')) || String(a.startTime||'99:99').localeCompare(String(b.startTime||'99:99')));
  fillSelectKeep(select, rehearsals.map(r=>`<option value="${esc(r.id)}">${esc(r.date||'sin fecha')} · ${esc(r.place||'Ensayo')}</option>`).join(''), prev);
  const memberSelect=document.getElementById('attendanceMemberSelect');
  const prevMember=memberSelect?.value||'';
  fillSelectKeep(memberSelect, memberOptions(prevMember), prevMember);
  const r=rehearsals.find(x=>Number(x.id)===Number(select.value)) || rehearsals[0];
  if(r && !select.value) select.value=r.id;
  const mId=normalizeMemberKey(memberSelect?.value || bandMembers()[0]?.id);
  const saved=(r?.attendance||{})[mId] || {};
  const summary=document.getElementById('concertAttendanceSummary');
  if(summary){
    summary.innerHTML=r?`
      <div class="detailItem"><small>Ensayo seleccionado</small><div><strong>${esc(r.date||'sin fecha')} · ${esc(r.place||'Ensayo')}</strong><br><span style="color:var(--muted)">${esc([r.startTime,r.endTime].filter(Boolean).join(' - ')||'sin horario')} ${r.objective?'· '+esc(r.objective):''}</span></div></div>
      <div class="hr"></div>
      <h4>Estado guardado por miembro</h4>
      ${attendancePills(r.attendance)}
      ${saved.notes?`<p class="muted">Nota guardada de ${esc(memberLabel(mId))}: ${esc(saved.notes)}</p>`:''}
    `:'<p class="muted">No hay ensayos creados todavía.</p>';
  }
  fixRehearsalAttendanceLabels();
}

function selectedRehearsalForAttendance(){
  const id=Number(document.getElementById('attendanceConcertSelect')?.value||0);
  return (db.rehearsals||[]).find(r=>Number(r.id)===id) || (db.rehearsals||[])[0];
}

function fixRehearsalAttendanceLabels(){
  const root=document.getElementById('rehearsals');
  if(!root)return;
  root.querySelectorAll('h1,h2,h3,h4,p,small,label,button,span,option').forEach(el=>{
    el.childNodes.forEach(node=>{
      if(node.nodeType === 3){
        node.nodeValue = node.nodeValue
          .replace(/confirmar asistencia a concierto/gi,'Confirmar asistencia a ensayo')
          .replace(/asistencia a concierto/gi,'asistencia a ensayo')
          .replace(/concierto seleccionado/gi,'Ensayo seleccionado')
          .replace(/concierto:/gi,'Ensayo:')
          .replace(/\bconcierto\b/gi,'ensayo')
          .replace(/\bconciertos\b/gi,'ensayos');
      }
    });
  });
}

function selectedConcertForAttendance(){
  const id=Number(document.getElementById('attendanceConcertSelect')?.value||0);
  return (db.concerts||[]).find(c=>Number(c.id)===id) || (db.concerts||[])[0];
}
function copyConcertAttendanceMessage(){
  if(currentTabId && currentTabId()==='rehearsals'){
    const r=selectedRehearsalForAttendance();
    if(!r){alert('No hay ensayo seleccionado.');return;}
    const mId=normalizeMemberKey(document.getElementById('attendanceMemberSelect')?.value || bandMembers()[0]?.id);
    const status=document.getElementById('attendanceStatusSelect')?.value || 'Confirmo asistencia';
    const notes=document.getElementById('attendanceNotesInput')?.value || '';
    const msg=[
      'Breathless Cover Band · Confirmación de asistencia a ensayo',
      `Ensayo: ${r.date||'fecha pendiente'} · ${[r.startTime,r.endTime].filter(Boolean).join(' - ')||'sin horario'}`,
      `Lugar: ${r.place||'pendiente'}`,
      `Miembro: ${memberLabel(mId)}`,
      `Estado: ${status}`,
      notes?`Notas: ${notes}`:'Notas: —'
    ].join('\n');
    copyText(msg);
    return;
  }

  const c=selectedConcertForAttendance();
  if(!c){alert('No hay concierto seleccionado.');return;}
  const mId=document.getElementById('attendanceMemberSelect')?.value || bandMembers()[0]?.id;
  const status=document.getElementById('attendanceStatusSelect')?.value || 'Confirmo asistencia';
  const notes=document.getElementById('attendanceNotesInput')?.value || '';
  const msg=[
    'Breathless Cover Band · Confirmación de asistencia',
    `Concierto: ${c.date||'fecha pendiente'} · ${c.eventName||c.venue||'concierto'}`,
    `Lugar: ${[c.venue,c.city].filter(Boolean).join(' · ')||'pendiente'}`,
    `Miembro: ${memberLabel(mId)}`,
    `Estado: ${status}`,
    notes?`Notas: ${notes}`:'Notas: —'
  ].join('\n');
  copyText(msg);
}

function saveConcertAttendance(){
  if(currentTabId && currentTabId()==='rehearsals'){
    const r=selectedRehearsalForAttendance();
    if(!r){alert('No hay ensayo seleccionado.');return;}
    const mId=normalizeMemberKey(document.getElementById('attendanceMemberSelect')?.value || bandMembers()[0]?.id);
    const status=document.getElementById('attendanceStatusSelect')?.value || 'Pendiente';
    const notes=document.getElementById('attendanceNotesInput')?.value || '';
    r.attendance=r.attendance||{};
    r.attendance[mId]={status,notes,updatedAt:new Date().toISOString()};

    pushRehearsalToSheet(r)
      .then(()=>{
        upsertLocalArrayItem('rehearsals', r);
        saveData({refresh:false});
        return syncRehearsalsFromGoogleSheet({silent:true, reason:'afterRehearsalAttendanceWrite'});
      })
      .then(()=>{
        renderRehearsals();
        rehearsalSheetStatus('Asistencia de ensayo guardada en Google Sheet.','ok');
        alert('Asistencia de ensayo guardada en Google Sheet.');
      })
      .catch(alertSheetWriteError);
    return;
  }

  const c=selectedConcertForAttendance();
  if(!c){alert('No hay concierto seleccionado.');return;}
  const mId=document.getElementById('attendanceMemberSelect')?.value || bandMembers()[0]?.id;
  const status=document.getElementById('attendanceStatusSelect')?.value || 'Pendiente';
  const notes=document.getElementById('attendanceNotesInput')?.value || '';
  c.attendance=c.attendance||{};
  c.attendance[mId]={status,notes,updatedAt:new Date().toISOString()};
  saveData();
  pushConcertToSheet(c)
    .then(()=>alert('Confirmación guardada en Google Sheet.'))
    .catch(alertSheetWriteError);
}

function rehearsalHeaders(){return [
  {label:'ID',key:'id'},
  {label:'Fecha',key:'date'},
  {label:'Inicio',key:'startTime'},
  {label:'Fin',key:'endTime'},
  {label:'Lugar',key:'place'},
  {label:'Estado',key:'status'},
  {label:'Objetivo',key:'objective'},
  {label:'Todos los temas',key:o=>o.allSongs?'Sí':'No'},
  {label:'Temas',key:o=>o.allSongs?'Todo el repertorio':rehearsalSongs(o).map(s=>s.title).join(' | ')},
  {label:'Asistencia',key:o=>bandMembers().map(m=>`${m.name} ${m.role}: ${(o.attendance?.[m.id]?.status)||'Pendiente'}`).join(' | ')},
  {label:'Notas',key:'notes'}
];}
function exportRehearsalsCSV(){
  const rows=db.rehearsals||[];
  if(!rows.length){alert('No hay ensayos cargados.');return;}
  downloadBlob('app_bcb_ensayos.csv', new Blob([toCSV(rows,rehearsalHeaders())],{type:'text/csv;charset=utf-8'}));
}

function renderBudgetUI(){
  const box=document.getElementById('extrasBox'); if(!box)return;
  box.innerHTML=db.tariffs.extras.map(e=>`<label style="display:flex;gap:8px;align-items:center;color:var(--text);font-size:13px"><input type="checkbox" data-extra="${e.id}" onchange="calcBudget()" style="width:auto"> ${esc(e.name)} ${e.kind==='fixed'?`(+${eur(e.amount)})`:'(consultar)'}</label>`).join('');
  document.getElementById('specialDates').innerHTML=db.tariffs.specialDates.map(x=>`<div class="detailItem"><small>${esc(x.date)}</small><div><strong>${esc(x.name)}</strong> · ${eur(x.price)}</div></div>`).join('');
  document.getElementById('weddingConditions').innerHTML=db.tariffs.weddingConditions.map(x=>`<li>${esc(x)}</li>`).join('');
}
function findBaseTariff(dateStr){
  if(!dateStr)return null;
  const special=db.tariffs.specialDates.find(x=>x.date===dateStr); if(special)return {name:special.name, price:special.price, special:true};
  const d=new Date(dateStr+'T00:00:00'); const day=d.getDay();
  const row=db.tariffs.base.find(x=>dateStr>=x.from && dateStr<=x.to); if(!row)return null;
  let key=day===5?'friday':day===6?'saturday':day===0?'sunday':'weekday';
  return {name:row.name, price:Number(row[key]||0), special:false, dayKey:key};
}
function calcBudget(){
  const date=document.getElementById('budgetDate')?.value||'';
  const name=document.getElementById('budgetName')?.value||'';
  const base=findBaseTariff(date);
  let total=base?Number(base.price||0):0, lines=[];
  if(base) lines.push(`${base.name}: ${base.price?eur(base.price):'consultar / no disponible'}`); else lines.push('Selecciona fecha para calcular tarifa base.');
  document.querySelectorAll('[data-extra]:checked').forEach(ch=>{const e=db.tariffs.extras.find(x=>x.id===ch.dataset.extra); if(e){ if(e.kind==='fixed'){total+=Number(e.amount||0);lines.push(`${e.name}: +${eur(e.amount)}`);} else lines.push(`${e.name}: consultar`); }});
  const totalTxt=total?eur(total):'Consultar';
  document.getElementById('budgetTotal').textContent=totalTxt;
  document.getElementById('budgetBreakdown').innerHTML=lines.map(esc).join('<br>') + `<br><br><strong>Anticipo 50%:</strong> ${total?eur(total/2):'—'}`;
  const copy=`Presupuesto orientativo Breathless Cover Band\nFecha: ${date||'pendiente'}\nEvento: ${name||'pendiente'}\n${lines.join('\n')}\nTotal orientativo: ${totalTxt}\nReserva: 50% (${total?eur(total/2):'—'})\nPrecios sin IVA. Presupuesto final sujeto a ubicación, duración, formato y necesidades técnicas.`;
  document.getElementById('budgetCopy').textContent=copy;
  return {date,name,total,lines};
}
function copyBudgetText(){calcBudget();copyText(document.getElementById('budgetCopy').textContent);}
function createConcertFromBudget(){const b=calcBudget();openConcertModal(null,{date:b.date,eventName:b.name||'Evento pendiente',type:'Sala',status:'Propuesta enviada',fee:b.total,deposit:b.total?b.total/2:0,paid:0,notes:b.lines.join(' | ')})}


function openPosterHelp(){
  document.getElementById('modalTitle').textContent='Cómo añadir carteles';
  document.getElementById('modalBody').innerHTML=`<div class="notice">Modo recomendado: sube el cartel a <strong>assets/posters/</strong> en GitHub y pega la ruta en el concierto. Ejemplo: <code>assets/posters/cartel-cien-x-cien-2026-06-16.jpg</code>.</div><p>También puedes editar un concierto y usar “Subir cartel al navegador”. Esa imagen queda guardada en este navegador y se conserva si haces backup JSON.</p><div class="actions"><button class="btn gold" onclick="closeModal()">Entendido</button></div>`;
  openModal();
}

function setlistRows(){
  const base = db.strategicSetlist || INITIAL_DATA.strategicSetlist || {blocks:[]};
  const st = pruneStrategicSetlistToCurrentRepertoire(base) || {blocks:[]};
  if(db.strategicSetlist) db.strategicSetlist = st;
  return (st.blocks||[]).flatMap(b=>(b.songs||[]).map(song=>Object.assign({blockId:b.id,blockName:b.name,blockObjective:b.objective,stageControl:b.stageControl,blockDuration:b.musicDuration},song)));
}
function vocalClass(v){const x=norm(v); if(x.includes('miguel'))return 'vocal vocal-miguel'; if(x.includes('carmen'))return 'vocal vocal-carmen'; if(x.includes('ambos'))return 'vocal vocal-ambos'; if(x.includes('teo'))return 'vocal vocal-teo'; return 'vocal';}
function renderSetlist(){
  const st=pruneStrategicSetlistToCurrentRepertoire(db.strategicSetlist || INITIAL_DATA.strategicSetlist); if(!st)return; if(db.strategicSetlist) db.strategicSetlist=st;
  const rows=setlistRows();
  const el=id=>document.getElementById(id);
  if(!el('setlistTitle'))return;
  el('setlistTitle').textContent=st.title||'Setlist estratégico';
  el('setlistSubtitle').textContent=st.subtitle||'';
  el('setlistLegend').innerHTML=(st.legend||[]).map(v=>`<span class="${vocalClass(v)}">${esc(v)}</span>`).join('');
  el('setlistRule').innerHTML=`<strong>Regla de directo:</strong> ${esc(st.rule||'')}`;
  el('setlistFinal').innerHTML=`<strong>Final obligatorio:</strong> ${esc(st.finalMandatory||'')}`;
  el('setlistSummary').innerHTML=[['Música',st.musicDuration],['Ágil',st.agileDuration],['Amplio',st.extendedDuration]].map(x=>`<div class="detailItem"><small>${esc(x[0])}</small><div><strong>${esc(x[1])}</strong></div></div>`).join('');
  el('setlistPromoterReading').innerHTML=`<p><strong>Lectura para salas/promotores:</strong><br>${esc(st.promoterReading||'')}</p>`;
  el('setlistBlocks').innerHTML=(st.blocks||[]).map(b=>`<div class="card setlistBlock" data-no="${b.id}"><h4>${b.id} · ${esc(b.name)}</h4><p>${esc(b.objective)}</p><div class="setlistMeta"><div class="detailItem"><small>Duración música</small><div>${esc(b.musicDuration)}</div></div><div class="detailItem"><small>Control de escenario</small><div>${esc(b.stageControl)}</div></div><div class="detailItem"><small>Temas</small><div>${(b.songs||[]).length}</div></div></div><div class="setlistSongs">${(b.songs||[]).map(song=>`<div class="setlistSong"><span class="num">${song.order}</span><strong>${esc(song.title)}</strong><span class="${vocalClass(song.vocal)}">${esc(song.vocal)}</span></div>`).join('')}</div></div>`).join('');
  renderBars('setlistVocalBars', counts(rows,'vocal'));
  document.querySelector('#setlistTable tbody').innerHTML=rows.map(r=>`<tr><td><strong>${r.order}</strong></td><td>${esc(r.title)}</td><td><span class="${vocalClass(r.vocal)}">${esc(r.vocal)}</span></td><td>${r.blockId} · ${esc(r.blockName)}</td><td>${esc(r.blockObjective)}</td><td>${esc(r.stageControl)}</td></tr>`).join('');
}
function exportSetlistCSV(){const rows=setlistRows(); if(!rows.length){alert('No hay setlist cargado.');return;} const headers=[{label:'#',key:'order'},{label:'Tema',key:'title'},{label:'Voz',key:'vocal'},{label:'Bloque',key:'blockName'},{label:'Duración bloque',key:'blockDuration'},{label:'Objetivo',key:'blockObjective'},{label:'Control escenario',key:'stageControl'}]; downloadBlob('app_bcb_setlist_estrategico.csv', new Blob([toCSV(rows,headers)],{type:'text/csv;charset=utf-8'}));}
function downloadSetlistPDF(){downloadStatic(SETLIST_PDF_URL,'Setlist_N_Bloques_Estrategicos.pdf');}


function fillRepertoireFilters(){
  const fill=(id,values,label)=>{
    const el=document.getElementById(id); if(!el)return;
    const current=el.value;
    el.innerHTML=`<option value="">${label}</option>`+[...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'es')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    el.value=current;
  };
  fill('fRepBlock', db.repertoire.map(s=>s.block), 'Bloque');
  fill('fRepStatus', db.repertoire.map(s=>s.status), 'Estado');
  fill('fRepSinger', db.repertoire.map(s=>s.singer||s.leadVocal), 'Voz');
}
function repertoireFiltered(){
  const q=norm(document.getElementById('qRep')?.value||'');
  const block=document.getElementById('fRepBlock')?.value||'';
  const status=document.getElementById('fRepStatus')?.value||'';
  const singer=document.getElementById('fRepSinger')?.value||'';
  return (db.repertoire||[]).filter(s=>{
    const blob=[
      s.title,s.titleCanonical,s.artist,s.versionReference,s.singer,s.leadVocal,
      s.duration,s.durationLive,s.durationOriginal,s.durationStatus,
      s.tone,s.originalKey,s.currentKey,s.rehearsalKey,s.keyStatus,
      s.keyMiguel,s.keyCarmen,s.transposeNotes,s.capo,s.bpm,
      s.block,s.status,s.spotifyPlaylistUrl,s.spotifyUrl,s.youtubeUrl,s.chordsUrl,
      s.chordsText,s.structure,s.lyricsNotes,s.notes,s.sourceNotes
    ].join(' ');
    return (!q||norm(blob).includes(q)) && (!block||s.block===block) && (!status||s.status===status) && (!singer||(s.singer||s.leadVocal)===singer);
  });
}
function songLinkButtons(s){
  const links=[];
  if(s.spotifyUrl)links.push(`<a class="btn small dark" target="_blank" rel="noopener" href="${esc(s.spotifyUrl)}">Spotify tema</a>`);
  if(s.spotifyPlaylistUrl)links.push(`<a class="btn small dark" target="_blank" rel="noopener" href="${esc(s.spotifyPlaylistUrl)}">Playlist</a>`);
  if(s.youtubeUrl)links.push(`<a class="btn small dark" target="_blank" rel="noopener" href="${esc(s.youtubeUrl)}">YouTube</a>`);
  if(s.chordsUrl)links.push(`<a class="btn small dark" target="_blank" rel="noopener" href="${esc(s.chordsUrl)}">Acordes</a>`);
  return links.length?`<div class="songLinks">${links.join('')}</div>`:'—';
}
function renderRepertoire(){
  const artists=document.getElementById('artists');
  if(!artists)return;
  fillRepertoireFilters();

  const playlistUrl = db.createdFrom?.spotifyPlaylistUrl || db.repertoire?.find(x=>x.spotifyPlaylistUrl)?.spotifyPlaylistUrl || '';
  const playlistBox = document.getElementById('spotifyPlaylistBox');
  if(playlistBox){
    playlistBox.innerHTML = playlistUrl
      ? `<p>Playlist de referencia cargada para el repertorio de BCB.</p><div class="actions"><a class="btn gold" target="_blank" rel="noopener" href="${esc(playlistUrl)}">Abrir playlist Spotify</a><button class="btn dark" onclick="copyText('${esc(playlistUrl)}')">Copiar URL</button></div>${db.createdFrom?.spotifyEmbedUrl ? `<div class="spotifyEmbedWrap"><iframe style="border-radius:12px;margin-top:12px" src="${esc(db.createdFrom.spotifyEmbedUrl)}" width="100%" height="152" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>` : ``}`
      : `<p>No hay playlist general cargada todavía.</p>`;
  }

  artists.innerHTML=(db.artistReferences||[]).map(a=>`<span class="pill">${esc(a)}</span>`).join('');
  renderBars('repBars', counts(db.repertoire||[],'block'));
  const rows=repertoireFiltered();
  const tbody=document.querySelector('#repTable tbody');
  if(!tbody)return;
  tbody.innerHTML=rows.map(s=>`<tr>
    <td><strong>${esc(s.title)}</strong><br><small>#${esc(s.order||s.id||'—')}</small></td>
    <td>${esc(s.artist||'—')}</td>
    <td>${esc(s.singer||s.leadVocal||'—')}</td>
    <td>${esc(s.durationLive||s.duration||'—')}<br><small>${esc(s.durationStatus||'')}</small></td>
    <td>${esc(s.currentKey||s.tone||'—')}<br><small>${esc(s.keyStatus||'')}</small></td>
    <td><small>Miguel</small> ${esc(s.keyMiguel||'—')}<br><small>Carmen</small> ${esc(s.keyCarmen||'—')}</td>
    <td>${esc(s.block||'—')}</td>
    <td>${badge(s.status||'—')}</td>
    <td>${songLinkButtons(s)}</td>
    <td>${(s.chordsText||s.structure||s.lyricsNotes||s.chordsUrl)?'<span class="status s-blue">Ficha</span>':'—'}</td>
    <td>${esc(compact(s.notes||s.transposeNotes||s.lyricsNotes||'',80))}</td>
    <td>
      <button class="btn small dark" onclick="viewSongModal(${s.id})">Ver</button>
      <button class="btn small gold" onclick="openSongModal(${s.id})">Editar</button>
      <button class="btn small red" onclick="deleteRecord('repertoire',${s.id})">Borrar</button>
    </td>
  </tr>`).join('');
}
function songFields(){return [
  ['title','Tema','text','span2'],
  ['artist','Artista / versión','text','span2'],
  ['versionReference','Referencia concreta / versión','text','span2'],
  ['singer','Voz principal','text'],
  ['leadVocal','Voz asignada','select','', ['Miguel','Carmen','Ambos','Por decidir']],
  ['durationLive','Duración directo / ensayo','text'],
  ['durationOriginal','Duración original','text'],
  ['durationStatus','Estado duración','select','', ['Confirmada','Provisional · revisar en ensayo','Pendiente validar']],
  ['tone','Tono visible','text'],
  ['originalKey','Tono original','text'],
  ['currentKey','Tono actual banda','text'],
  ['rehearsalKey','Tono propuesto ensayo','text'],
  ['keyStatus','Estado tonalidad','select','', ['Confirmada','Provisional','Pendiente de reconstrucción','Pendiente validar']],
  ['keyMiguel','Tono propuesto Miguel','text'],
  ['keyCarmen','Tono propuesto Carmen','text'],
  ['transposeNotes','Notas de transporte / criterio vocal','textarea','span4'],
  ['capo','Cejilla / capo','text'],
  ['bpm','BPM','text'],
  ['block','Bloque','text','span2'],
  ['status','Estado','select','', ['Activo','Ensayo','Reserva','Descartado']],
  ['spotifyPlaylistUrl','Playlist Spotify general','url','span4'],
  ['spotifyUrl','Enlace Spotify del tema','url','span2'],
  ['youtubeUrl','Enlace YouTube / referencia','url','span2'],
  ['chordsUrl','Enlace externo acordes / letra / tabla','url','span4'],
  ['structure','Estructura del tema','textarea','span4'],
  ['chordsText','Letra / acordes / tablatura / tabla de code','textarea','span4'],
  ['lyricsNotes','Notas de interpretación / letra','textarea','span4'],
  ['sourceNotes','Fuente / validación','textarea','span4'],
  ['notes','Notas internas','textarea','span4']
];}
function openSongModal(id=null){
  const item=id?db.repertoire.find(x=>x.id===id):{block:'Bloque 1',status:'Activo',durationStatus:'Pendiente validar',keyStatus:'Pendiente validar',spotifyPlaylistUrl:db.createdFrom?.spotifyPlaylistUrl||''};
  modalContext={type:'song',id};
  document.getElementById('modalTitle').textContent=id?'Editar canción':'Nueva canción';
  document.getElementById('modalBody').innerHTML=renderForm(songFields(), item)+`<div class="hr"></div><div class="actions"><button class="btn gold" onclick="saveSong()">Guardar</button><button class="btn dark" onclick="closeModal()">Cancelar</button>${id?`<button class="btn red" onclick="deleteRecord('repertoire',${id})">Borrar</button>`:''}</div>`;
  openModal();
}
function viewSongModal(id){
  const s=db.repertoire.find(x=>x.id===id);
  if(!s)return;
  document.getElementById('modalTitle').textContent=s.title||'Ficha de canción';
  document.getElementById('modalBody').innerHTML=`
    <div class="detailGrid">
      <div class="detailItem"><small>Tema</small><div><strong>${esc(s.title||'—')}</strong></div></div>
      <div class="detailItem"><small>Artista / versión</small><div>${esc(s.artist||'—')}</div></div>
      <div class="detailItem"><small>Voz principal</small><div>${esc(s.singer||s.leadVocal||'—')}</div></div>
      <div class="detailItem"><small>Duración directo</small><div>${esc(s.durationLive||s.duration||'—')} <small>${esc(s.durationStatus||'')}</small></div></div>
      <div class="detailItem"><small>Duración original</small><div>${esc(s.durationOriginal||'—')}</div></div>
      <div class="detailItem"><small>Tono actual banda</small><div>${esc(s.currentKey||s.tone||'—')} <small>${esc(s.keyStatus||'')}</small></div></div>
      <div class="detailItem"><small>Tono original</small><div>${esc(s.originalKey||'—')}</div></div>
      <div class="detailItem"><small>Tono propuesto ensayo</small><div>${esc(s.rehearsalKey||'—')}</div></div>
      <div class="detailItem"><small>Propuesta Miguel</small><div>${esc(s.keyMiguel||'—')}</div></div>
      <div class="detailItem"><small>Propuesta Carmen</small><div>${esc(s.keyCarmen||'—')}</div></div>
      <div class="detailItem"><small>Bloque / estado</small><div>${esc(s.block||'—')} · ${esc(s.status||'—')}</div></div>
    </div>
    <div class="hr"></div>
    <div class="card light"><h4>Enlaces</h4>${songLinkButtons(s)}</div>
    <div class="hr"></div>
    <div class="detailItem"><small>Notas de transporte / criterio vocal</small><div>${esc(s.transposeNotes||'—')}</div></div>
    <div class="detailItem" style="margin-top:12px"><small>Estructura</small><div class="songCode">${esc(s.structure||'—')}</div></div>
    <div class="detailItem" style="margin-top:12px"><small>Letra / acordes / tablatura / tabla de code</small><div class="songCode">${esc(s.chordsText||'—')}</div></div>
    <div class="detailItem" style="margin-top:12px"><small>Notas de interpretación / letra</small><div>${esc(s.lyricsNotes||'—')}</div></div>
    <div class="detailItem" style="margin-top:12px"><small>Fuente / validación</small><div>${esc(s.sourceNotes||'—')}</div></div>
    <div class="detailItem" style="margin-top:12px"><small>Notas internas</small><div>${esc(s.notes||'—')}</div></div>
    <div class="hr"></div>
    <div class="actions"><button class="btn gold" onclick="openSongModal(${s.id})">Editar</button><button class="btn dark" onclick="closeModal()">Cerrar</button></div>
  `;
  openModal();
}
function saveSong(){
  const obj=readForm(songFields());
  obj.duration = obj.durationLive || obj.duration || '';
  obj.tone = obj.currentKey || obj.tone || '';
  obj.leadVocal = obj.leadVocal || obj.singer || '';
  let saved;
  if(modalContext.id){
    const idx=db.repertoire.findIndex(x=>String(x.id)===String(modalContext.id));
    if(idx === -1){ alert('No se ha encontrado la canción en la app. Actualiza el repertorio y vuelve a intentarlo.'); return; }
    saved=Object.assign({}, db.repertoire[idx], obj);
  }else{
    saved=Object.assign({id:nextId(db.repertoire), order:nextId(db.repertoire)}, obj);
  }

  pushSongToSheet(saved)
    .then(()=>{
      upsertLocalArrayItem('repertoire', saved);
      closeModal();
      saveData();
      sheetStatus('Canción guardada en Google Sheet maestro.','ok');
    })
    .catch(alertSheetWriteError);
}
function repertoireHeaders(){return [
  {label:'ID',key:'id'},
  {label:'Orden',key:'order'},
  {label:'Tema',key:'title'},
  {label:'Artista / versión',key:'artist'},
  {label:'Referencia concreta',key:'versionReference'},
  {label:'Voz principal',key:'singer'},
  {label:'Voz asignada',key:'leadVocal'},
  {label:'Duración directo',key:'durationLive'},
  {label:'Duración original',key:'durationOriginal'},
  {label:'Estado duración',key:'durationStatus'},
  {label:'Tono visible',key:'tone'},
  {label:'Tono original',key:'originalKey'},
  {label:'Tono actual banda',key:'currentKey'},
  {label:'Tono propuesto ensayo',key:'rehearsalKey'},
  {label:'Estado tonalidad',key:'keyStatus'},
  {label:'Tono Miguel',key:'keyMiguel'},
  {label:'Tono Carmen',key:'keyCarmen'},
  {label:'Notas transporte',key:'transposeNotes'},
  {label:'Cejilla / capo',key:'capo'},
  {label:'BPM',key:'bpm'},
  {label:'Bloque',key:'block'},
  {label:'Estado',key:'status'},
  {label:'Playlist Spotify',key:'spotifyPlaylistUrl'},
  {label:'Spotify tema',key:'spotifyUrl'},
  {label:'YouTube',key:'youtubeUrl'},
  {label:'Enlace acordes/letra',key:'chordsUrl'},
  {label:'Estructura',key:'structure'},
  {label:'Letra/acordes/tablatura',key:'chordsText'},
  {label:'Notas interpretación/letra',key:'lyricsNotes'},
  {label:'Fuente / validación',key:'sourceNotes'},
  {label:'Notas internas',key:'notes'}
];}
function exportRepertoireCSV(){
  const rows=repertoireFiltered().length?repertoireFiltered():(db.repertoire||[]);
  if(!rows.length){alert('No hay canciones cargadas.');return;}
  downloadBlob('app_bcb_canciones_repertorio.csv', new Blob([toCSV(rows,repertoireHeaders())],{type:'text/csv;charset=utf-8'}));
}
function openSongLinksImportModal(){
  document.getElementById('modalTitle').textContent='Cargar URLs por lote';
  document.getElementById('modalBody').innerHTML=`
    <p>Pega una línea por tema. Formato recomendado con tabuladores:</p>
    <div class="copyBox">Tema\tSpotify\tYouTube\tAcordes</div>
    <textarea id="bulkSongLinks" class="bigText" placeholder="La chica de ayer\thttps://open.spotify.com/...\thttps://youtube.com/...\thttps://..."></textarea>
    <div class="hr"></div>
    <div class="actions"><button class="btn gold" onclick="applySongLinksImport()">Aplicar URLs</button><button class="btn dark" onclick="closeModal()">Cancelar</button></div>
  `;
  openModal();
}
function splitBulkLine(line){
  if(line.includes('\t')) return line.split('\t').map(x=>x.trim());
  if(line.includes(';')) return line.split(';').map(x=>x.trim());
  return line.split(',').map(x=>x.trim());
}
function applySongLinksImport(){
  const raw=document.getElementById('bulkSongLinks')?.value||'';
  const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let updated=0, missing=[];
  lines.forEach((line,idx)=>{
    const parts=splitBulkLine(line);
    if(idx===0 && norm(parts[0]).includes('tema')) return;
    const [title,spotify,youtube,chords]=parts;
    if(!title)return;
    const song=(db.repertoire||[]).find(s=>norm(s.title)===norm(title)||norm(s.titleCanonical)===norm(title));
    if(!song){missing.push(title);return;}
    if(spotify) song.spotifyUrl=spotify;
    if(youtube) song.youtubeUrl=youtube;
    if(chords) song.chordsUrl=chords;
    updated++;
  });
  closeModal();
  saveData();
  alert(`URLs actualizadas: ${updated}${missing.length?`\nNo encontradas: ${missing.join(', ')}`:''}`);
}
function renderDossier(){
  const b=db.brand;
  document.getElementById('proposalCards').innerHTML=b.proposal.map(x=>`<div class="card light"><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p></div>`).join('');
  document.getElementById('fitList').innerHTML=b.fit.map(x=>`<li>${esc(x)}</li>`).join('');
  document.getElementById('formationList').innerHTML=b.formation.map(x=>`<li>${esc(x)}</li>`).join('');
  document.getElementById('argumentList').innerHTML=b.arguments.map(x=>`<div class="detailItem"><small>${esc(x.title)}</small><div>${esc(x.text)}</div></div>`).join('');
  document.getElementById('technicalList').innerHTML=b.technicalNeeds.map(x=>`<li>${esc(x)}</li>`).join('');
  document.getElementById('budgetNeeded').innerHTML=db.tariffs.budgetNeeded.map(x=>`<span class="pill">${esc(x)}</span>`).join('');
  document.getElementById('driveDossier').style.display=db.createdFrom.driveDossierUrl?'inline-flex':'none';
}
function renderContactOptions(){
  const q=norm(document.getElementById('templateContactSearch')?.value||'');
  const opts=db.crm.filter(x=>!q || norm([x.organization,x.email,x.municipality].join(' ')).includes(q)).slice(0,120);
  const sel=document.getElementById('templateContactSelect'); if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=`<option value="">Sin contacto concreto</option>`+opts.map(x=>`<option value="${x.id}" ${String(x.id)===cur?'selected':''}>${esc(x.organization)} ${x.email?`· ${esc(x.email)}`:''}</option>`).join('');
}
function getSelectedContact(){const id=Number(document.getElementById('templateContactSelect')?.value||0);return db.crm.find(x=>x.id===id)||null;}
function applyTemplate(t, contact){
  const dossier=db.createdFrom.driveDossierUrl || 'Dossier PDF adjunto';
  const name=contact?.contactPerson || contact?.organization || 'equipo';
  return t.text.replaceAll('{{Nombre}}', name).replaceAll('{{Dossier}}', dossier);
}
function renderTemplates(){
  const c=getSelectedContact();
  document.getElementById('bandContact').innerHTML=`<div class="detailItem"><small>Email</small><div>${esc(db.brand.contact.email)}</div></div><div class="detailItem"><small>WhatsApp</small><div>${esc(db.brand.contact.whatsapp)}</div></div><div class="detailItem"><small>Instagram / YouTube</small><div>${esc(db.brand.contact.instagram)} · ${esc(db.brand.contact.youtube)}</div></div>`;
  document.getElementById('templateCards').innerHTML=db.templates.map(t=>{const txt=applyTemplate(t,c); const id='tpl_'+t.id;return `<div class="card"><h4>${esc(t.type)}</h4><p><strong>Uso:</strong> ${esc(t.when)}</p><div id="${id}" class="copyBox">${esc(txt)}</div><br><div class="actions"><button class="btn gold" onclick="copyText(document.getElementById('${id}').textContent)">Copiar</button>${c?.email?`<button class="btn dark" onclick="composeTemplate(${t.id},${c.id})">Abrir email</button>`:''}</div></div>`}).join('');
}
function composeTemplate(tid,cid){const t=db.templates.find(x=>x.id===tid), c=db.crm.find(x=>x.id===cid);if(!t||!c||!c.email)return;const body=applyTemplate(t,c);const subj=`Breathless Cover Band · dossier comercial y disponibilidad`;location.href=`mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;}
function composeForContact(id){const c=db.crm.find(x=>x.id===id); if(!c||!c.email)return; const t=db.templates[0]; const body=applyTemplate(t,c); const subj=`Breathless Cover Band · propuesta de directo para ${c.organization||''}`; location.href=`mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;}
function taskFields(){return [['title','Tarea','text','span2'],['owner','Responsable','select','', bandMembers().map(m=>m.name)],['due','Fecha','date'],['status','Estado','select','', ['Pendiente','En curso','Completada','Cancelada']],['priority','Prioridad','select','', ['Muy alta','Alta','Media','Baja']],['area','Área','select','', ['CRM','Seguimiento','Gmail','Conciertos','Ensayos','Local / Pagos','Presupuesto','Canciones','Setlist','Dossier','Plantillas','Producción','Administración']],['notes','Notas','textarea','span4']];}
function renderTasks(){document.querySelector('#taskTable tbody').innerHTML=db.tasks.map(t=>`<tr><td><strong>${esc(t.title)}</strong></td><td>${esc(t.owner)}</td><td>${esc(t.due)}</td><td>${badge(t.status)}</td><td>${badge(t.priority)}</td><td>${esc(t.area)}</td><td>${esc(t.notes)}</td><td><button class="btn small gold" onclick="openTaskModal(${t.id})">Editar</button> <button class="btn small red" onclick="deleteRecord('tasks',${t.id})">Borrar</button></td></tr>`).join('')||'<tr><td colspan="8">Sin tareas.</td></tr>';}
function openTaskModal(id=null){const item=id?db.tasks.find(x=>x.id===id):{status:'Pendiente',priority:'Media'};modalContext={type:'task',id};document.getElementById('modalTitle').textContent=id?'Editar tarea':'Nueva tarea';document.getElementById('modalBody').innerHTML=renderForm(taskFields(), item)+`<div class="hr"></div><div class="actions"><button class="btn gold" onclick="saveTask()">Guardar</button><button class="btn dark" onclick="closeModal()">Cancelar</button></div>`;openModal();}
function saveTask(){
  const obj=readForm(taskFields());
  let item;
  if(modalContext.id){
    const idx=db.tasks.findIndex(x=>String(x.id)===String(modalContext.id));
    if(idx === -1){ alert('No se ha encontrado la tarea. Actualiza y vuelve a intentarlo.'); return; }
    item=Object.assign({}, db.tasks[idx], obj);
  }else{
    item=Object.assign({id:nextId(db.tasks)}, obj);
  }

  pushTaskToSheet(item)
    .then(()=>{
      upsertLocalArrayItem('tasks', item);
      closeModal();
      saveData();
      sheetStatus('Tarea guardada en Google Sheet maestro.','ok');
    })
    .catch(alertSheetWriteError);
}
function downloadBlob(filename, blob){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  a.rel='noopener';
  a.style.display='none';
  document.body.appendChild(a);
  try{
    a.click();
  }catch(err){
    window.open(url,'_blank');
    alert('No se ha podido iniciar la descarga automática. Se ha abierto el archivo en una pestaña nueva para guardarlo manualmente.');
  }
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
}
function downloadStatic(url, filename){const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();}
function downloadDossier(){downloadStatic(DOSSIER_PDF_URL,'DOSSIER_BCB_APP.md');}
function downloadXlsx(){downloadStatic(XLSX_URL,'APP-BCB_GoogleSheet_Maestro_v1.xlsx');}
function exportJSON(){downloadBlob('app_bcb_app_backup.json', new Blob([JSON.stringify(db,null,2)],{type:'application/json;charset=utf-8'}));}
function importJSON(file){if(!file)return; const r=new FileReader();r.onload=e=>{try{db=Object.assign(clone(INITIAL_DATA), JSON.parse(e.target.result));saveData();alert('JSON importado correctamente.')}catch(err){alert('No se pudo importar el JSON.')}};r.readAsText(file,'utf-8');}
function csvEscape(v){return `"${String(v??'').replaceAll('"','""')}"`;}
function toCSV(arr, headers){return '\ufeff'+[headers.map(h=>csvEscape(h.label)).join(';')].concat(arr.map(o=>headers.map(h=>csvEscape(typeof h.key==='function'?h.key(o):o[h.key])).join(';'))).join('\n');}
function crmHeaders(){return [
  {label:'ID',key:'id'},{label:'Fila CRM',key:'sheetRow'},{label:'Campaña',key:'campaign'},{label:'Organización / Local',key:'organization'},
  {label:'Tipo oportunidad',key:'opportunityType'},{label:'Segmento',key:'segment'},{label:'Municipio / Provincia',key:'municipality'},
  {label:'Dirección',key:'address'},{label:'Email',key:'email'},{label:'Email CC',key:'emailCc'},{label:'Teléfono',key:'phone'},{label:'Web',key:'web'},
  {label:'Fuente URL',key:'sourceUrl'},{label:'Prioridad',key:'priority'},{label:'Enviar',key:'send'},{label:'Estado envío',key:'sendStatus'},
  {label:'Fecha envío',key:'sendDate'},{label:'Respuesta recibida',key:'responseReceived'},{label:'Fecha respuesta',key:'responseDate'},
  {label:'Persona contacto',key:'contactPerson'},{label:'Teléfono contacto',key:'contactPhone'},{label:'Interés',key:'interest'},
  {label:'Disponibilidad / fechas',key:'availability'},{label:'Condiciones',key:'conditions'},{label:'Caché / presupuesto',key:'budget'},
  {label:'Requisitos técnicos',key:'technicalRequirements'},{label:'Próxima acción',key:'nextAction'},{label:'Fecha próxima acción',key:'nextActionDate'},
  {label:'Notas seguimiento',key:'followNotes'},{label:'Último email recibido',key:'lastEmailReceived'},{label:'Email remitente respuesta',key:'responseSender'},
  {label:'Enviar dossier',key:'sendDossier'},{label:'Dossier enviado',key:'dossierSent'},{label:'Estado dossier',key:'dossierStatus'},{label:'Notas dossier',key:'dossierNotes'}
];}
function genericHeaders(arr){return [...new Set(arr.flatMap(o=>Object.keys(o)).filter(k=>k!=='raw'))].map(k=>({label:k,key:k}));}
function exportCSV(kind){let arr=db[kind]||[], headers=kind==='crm'?crmHeaders():genericHeaders(arr); if(!arr.length){alert('No hay datos.');return;} downloadBlob(`app_bcb_${kind}.csv`, new Blob([toCSV(arr,headers)],{type:'text/csv;charset=utf-8'}));}
function exportFilteredCRM(){const arr=filteredCRM.length?filteredCRM:crmFiltered(); downloadBlob('app_bcb_crm_filtrado.csv', new Blob([toCSV(arr,crmHeaders())],{type:'text/csv;charset=utf-8'}));}
function parseCSV(text){const first=text.split(/\r?\n/)[0]||''; const sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';let rows=[],row=[],cur='',q=false;for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1];if(ch==='"'&&q&&nx==='"'){cur+='"';i++;}else if(ch==='"'){q=!q;}else if(ch===sep&&!q){row.push(cur);cur='';}else if((ch==='\n'||ch==='\r')&&!q){if(cur||row.length){row.push(cur);rows.push(row);row=[];cur='';} if(ch==='\r'&&nx==='\n')i++;}else cur+=ch;} if(cur||row.length){row.push(cur);rows.push(row);}return rows.filter(r=>r.some(x=>String(x).trim()));}
function mapHeader(h){const x=norm(h);const m={'organizacion':'organization','organización':'organization','organizacion / local':'organization','organización / local':'organization','sala':'organization','empresa':'organization','campana':'campaign','campaña':'campaign','tipo oportunidad':'opportunityType','segmento':'segment','municipio / provincia':'municipality','municipio':'municipality','provincia':'municipality','direccion':'address','dirección':'address','email':'email','correo':'email','email cc':'emailCc','telefono':'phone','teléfono':'phone','web':'web','fuente url':'sourceUrl','prioridad':'priority','enviar':'send','estado envio':'sendStatus','estado envío':'sendStatus','respuesta recibida':'responseReceived','fecha respuesta':'responseDate','persona contacto':'contactPerson','interes':'interest','interés':'interest','disponibilidad / fechas':'availability','condiciones':'conditions','cache / presupuesto':'budget','caché / presupuesto':'budget','requisitos tecnicos':'technicalRequirements','requisitos técnicos':'technicalRequirements','proxima accion':'nextAction','próxima acción':'nextAction','fecha proxima accion':'nextActionDate','fecha próxima acción':'nextActionDate','notas seguimiento':'followNotes','enviar dossier':'sendDossier','estado dossier':'dossierStatus','notas dossier':'dossierNotes'};return m[x]||m[x.replaceAll('_',' ')]||x.replace(/\s+/g,'');}
function importCSVContacts(){const text=document.getElementById('csvBox').value.trim();if(!text){alert('Pega primero un CSV.');return;}const rows=parseCSV(text);if(rows.length<2){alert('No detecto cabecera y filas.');return;}const headers=rows[0].map(mapHeader);let id=nextId(db.crm);const imported=rows.slice(1).map(r=>{const o={id:id++,sheetRow:'',campaign:'Salas',priority:'Media',send:'SI',sendStatus:'Pendiente'};headers.forEach((h,i)=>{if(r[i]!==undefined)o[h]=r[i];});return o;}).filter(o=>o.organization||o.email||o.phone);db.crm=imported.concat(db.crm);saveData();alert(`Importados ${imported.length} contactos.`);}

function safeCRMTodayISO(){return new Date().toISOString().slice(0,10);}
function safeCRMImportHeader(h){
  const x=norm(h);
  const extra={
    'nombre':'organization','nombre del contacto':'contactPerson','contacto':'contactPerson','cliente':'organization','local':'organization','lugar':'organization','recinto':'organization',
    'ciudad':'municipality','ciudad / lugar':'municipality','lugar / ciudad':'municipality','fecha':'availability','fecha o ventana':'availability','fecha_o_ventana':'availability',
    'tipo evento':'opportunityType','tipo de evento':'opportunityType','evento':'opportunityType','estado':'sendStatus','estado actual':'sendStatus','estado_actual':'sendStatus',
    'siguiente paso':'nextAction','siguiente_paso':'nextAction','fecha seguimiento':'nextActionDate','fecha_siguiente_paso':'nextActionDate','fecha siguiente paso':'nextActionDate',
    'notas':'followNotes','notas clave':'followNotes','notas_clave':'followNotes','importe':'budget','importe o rango':'budget','importe_o_rango':'budget','presupuesto':'budget',
    'telefono contacto':'contactPhone','teléfono contacto':'contactPhone','whatsapp':'phone'
  };
  return extra[x] || mapHeader(h);
}
function safeCRMObjectsFromJSON(text){
  const parsed=JSON.parse(text);
  if(Array.isArray(parsed)) return parsed;
  if(parsed && Array.isArray(parsed.crm)) return parsed.crm;
  if(parsed && Array.isArray(parsed.contacts)) return parsed.contacts;
  if(parsed && Array.isArray(parsed.contactos)) return parsed.contactos;
  if(parsed && Array.isArray(parsed.oportunidades)) return parsed.oportunidades;
  if(parsed && typeof parsed==='object') return [parsed];
  return [];
}
function safeCRMObjectsFromCSV(text){
  const rows=parseCSV(text);
  if(rows.length<2) throw new Error('No detecto cabecera y filas en el CSV.');
  const headers=rows[0].map(safeCRMImportHeader);
  return rows.slice(1).map(r=>{
    const raw={};
    headers.forEach((h,i)=>{if(h && h!=='id' && r[i]!==undefined) raw[h]=r[i];});
    return raw;
  });
}
function normalizeSafeCRMContact(raw,id,fileName){
  raw=raw||{};
  const o={id:id,sheetRow:'',campaign:'Importación CRM',priority:'Media',send:'Revisar',sendStatus:'Pendiente de revisión',nextAction:'Revisar contacto importado',nextActionDate:safeCRMTodayISO(),rawImport:raw,importSource:fileName||''};
  Object.keys(raw).forEach(k=>{
    const mapped=safeCRMImportHeader(k);
    if(mapped && mapped!=='id') o[mapped]=raw[k];
  });
  o.organization=o.organization||raw.organizacion||raw.organización||raw.nombre||raw.empresa||raw.sala||raw.cliente||raw.local||raw.lugar||'';
  o.contactPerson=o.contactPerson||raw.contacto||raw.persona||raw.nombreContacto||raw.nombre_contacto||'';
  o.email=o.email||raw.correo||raw.mail||'';
  o.phone=o.phone||raw.telefono||raw.teléfono||raw.whatsapp||'';
  o.municipality=o.municipality||raw.ciudad||raw.municipio||raw.lugar||'';
  o.opportunityType=o.opportunityType||raw.tipo_evento||raw.tipoEvento||raw.evento||'';
  o.availability=o.availability||raw.fecha||raw.fecha_o_ventana||raw.fechaVentana||'';
  o.budget=o.budget||raw.importe||raw.importe_o_rango||raw.presupuesto||'';
  o.followNotes=o.followNotes||raw.notas||raw.notas_clave||'';
  ['organization','campaign','priority','send','sendStatus','nextAction','nextActionDate','contactPerson','email','phone','municipality','opportunityType','availability','budget','followNotes','conditions','technicalRequirements','interest'].forEach(k=>{
    if(typeof o[k]==='string') o[k]=o[k].trim();
  });
  if(!o.campaign) o.campaign='Importación CRM';
  if(!o.priority) o.priority='Media';
  if(!o.send) o.send='Revisar';
  if(!o.sendStatus) o.sendStatus='Pendiente de revisión';
  if(!o.nextAction) o.nextAction='Revisar contacto importado';
  if(!o.nextActionDate) o.nextActionDate=safeCRMTodayISO();
  return o;
}
function safeImportCRMFile(file){
  if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const content=String(e.target.result||'').trim();
      if(!content){alert('El archivo está vacío.');return;}
      const isJSON=/\.json$/i.test(file.name)||content[0]==='{'||content[0]==='[';
      const rawItems=isJSON?safeCRMObjectsFromJSON(content):safeCRMObjectsFromCSV(content);
      let id=nextId(db.crm);
      const imported=rawItems.map(x=>normalizeSafeCRMContact(x,id++,file.name)).filter(o=>o.organization||o.email||o.phone||o.contactPerson);
      if(!imported.length){alert('No se han detectado contactos útiles. Revisa que haya organización, contacto, email o teléfono.');return;}
      if(!confirm(`Se añadirán ${imported.length} registros al CRM actual. No se borrará ni sustituirá nada. ¿Continuar?`))return;
      db.crm=imported.concat(db.crm);
      db.createdFrom.lastImport=`${new Date().toLocaleString('es-ES')} · carga segura CRM · ${file.name}`;
      saveData();
      setTab('crm');
      alert(`Carga completada: ${imported.length} registros añadidos al CRM.`);
    }catch(err){
      alert('No se pudo cargar el archivo CRM: '+err.message);
    }
  };
  r.readAsText(file,'utf-8');
}

function copyText(txt){navigator.clipboard?.writeText(txt).then(()=>alert('Copiado.')).catch(()=>{const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();alert('Copiado.');});}
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

function appBcbSelfCheck(){
  const report = {
    version: APP_BCB_APP_VERSION,
    checkedAt: new Date().toISOString(),
    modules: {},
    ok: true,
    notes: []
  };
  const requiredArrays = ['crm','gmailResponses','concerts','rehearsals','localPayments','repertoire','setlists','tasks','bandMembers'];
  requiredArrays.forEach(k=>{
    const ok = Array.isArray(db[k]);
    report.modules[k] = {ok, count: ok ? db[k].length : 0};
    if(!ok){ report.ok=false; report.notes.push(k+' no es array'); }
  });
  const fixed = localPaymentMemberDefinitions().map(m=>m.id);
  report.modules.localFixedMembers = {ok: fixed.length===6, ids: fixed};
  if(fixed.length!==6){ report.ok=false; report.notes.push('Local/Pagos no tiene 6 miembros fijos'); }
  const singers = [...new Set((db.repertoire||[]).map(s=>cleanBCBLeadVocal(s.leadVocal || s.singer || '')).filter(Boolean))];
  const badSinger = singers.find(s=>!['Miguel','Carmen','Ambos','Por decidir'].includes(s));
  report.modules.voces = {ok: !badSinger, singers};
  if(badSinger){ report.ok=false; report.notes.push('Voz no permitida detectada: '+badSinger); }
  const warning = report.ok ? 'Autochequeo APP-BCB OK' : 'Autochequeo APP-BCB con avisos';
  sheetStatus(warning+' · '+Object.entries(report.modules).map(([k,v])=>k+': '+(v.count ?? (v.ok?'ok':'error'))).join(' · '), report.ok?'ok':'bad');
  console.table(report.modules);
  return report;
}

function initialTabFromUrl(){
  try{
    const raw = new URL(window.location.href).searchParams.get('tab') || '';
    const map = {songs:'repertoire', canciones:'repertoire', repertorio:'repertoire', ensayos:'rehearsals', ensayo:'rehearsals', rehearsals:'rehearsals', export:'importExport', exportar:'importExport'};
    const id = map[raw] || raw;
    return tabs.some(t=>t[0]===id) ? id : 'dashboard';
  }catch(e){ return 'dashboard'; }
}

// BCB v5.8 · guardado estable:
 // No forzamos 32 temas en cada arranque. El Google Sheet y las acciones del admin son la fuente de verdad.
function forceBCBSetlistV11Clean32(){
  try{
    db.createdFrom = Object.assign({}, db.createdFrom||{}, {
      setlistPatch: 'v5.8: guardado estable; repertorio y setlist ya no se fuerzan desde INITIAL_DATA',
      guardadoEstablePatch: 'v5.8: ensayos, pagos, repertorio y setlist se leen en vivo desde Apps Script tras cada guardado'
    });
    persistDataOnly();
  }catch(e){ console.warn('BCB guardado estable patch warning', e); }
}


clearOldLocalCaches();
forceBCBSetlistV11Clean32();
renderShell();
setTab(initialTabFromUrl(), {scroll:false, updateUrl:false});
// v4.1: apertura primero, renderizado bajo demanda y sincronización después; se mantienen los aprendizajes de APP-ENHE.
let appBcbLastAutoSync = 0;
function appBcbAutoSync(reason){
  const now = Date.now();
  if(appBcbAutoSyncRunning) return;
  if(now - appBcbLastAutoSync < 120000 && reason !== 'startup') return;
  appBcbLastAutoSync = now;
  appBcbAutoSyncRunning = true;
  const run = () => syncCRMFromGoogleSheet({silent:true, startup:reason==='startup', individual:true, fast:true, reason})
    .catch(()=>false)
    .finally(()=>{ appBcbAutoSyncRunning=false; });
  if('requestIdleCallback' in window){
    requestIdleCallback(run, {timeout: 8000});
  }else{
    setTimeout(run, reason==='startup' ? 2500 : 1500);
  }
}
setTimeout(()=>appBcbAutoSync('startup'), 800);
window.addEventListener('focus',()=>appBcbAutoSync('focus'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden) appBcbAutoSync('visible');});



/* APP-BCB v5.9 FIX · guardado estable: pagos/ensayos/repertorio
   Parche defensivo: define funciones que v5.8 llamaba pero no tenía declaradas.
   No modifica CRM, miembros ni histórico. */
(function(){
  "use strict";

  function bcbPick(row, keys){
    if(!row) return "";
    for(var i=0;i<keys.length;i++){
      var k=keys[i];
      if(Object.prototype.hasOwnProperty.call(row,k) && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
    }
    return "";
  }

  if(typeof window.fetchSheetTabViaAppsScript !== "function"){
    window.fetchSheetTabViaAppsScript = async function(tab, limit){
      limit = limit || 500;
      if(typeof appsScriptJsonpOnly !== "function") throw new Error("appsScriptJsonpOnly no disponible.");
      var payload = await appsScriptJsonpOnly({action:"sheet", tab:tab, limit:String(limit)});
      if(!payload || payload.ok === false) throw new Error((payload && payload.error) || ("Apps Script no devolvió "+tab));
      if(Array.isArray(payload.rows)) return payload.rows;
      if(typeof findPayloadSheet === "function" && typeof rowsFromPayloadSheet === "function"){
        var sheet = findPayloadSheet(payload, [tab]);
        var rows = rowsFromPayloadSheet(sheet);
        if(Array.isArray(rows)) return rows;
      }
      return [];
    };
  }

  if(typeof window.applyLocalPaymentsFromSheet !== "function"){
    window.applyLocalPaymentsFromSheet = function(rows){
      rows = Array.isArray(rows) ? rows : [];
      var items = rows.map(function(row){
        var month = normalizeMonthValue(bcbPick(row, ["mes","Mes","month","Month","MES"]));
        var memberRaw = bcbPick(row, ["memberId","ID Miembro","id_miembro","Miembro ID","nombre","Nombre","miembro","Miembro"]);
        var memberId = normalizeMemberKey(memberRaw);
        if(!month || !memberId) return null;
        var amount = parseEuroValue(bcbPick(row, ["cuota","Cuota","importe","Importe","amount","Amount"]));
        var paidRaw = bcbPick(row, ["pagado","Pagado","estado_pago","Estado pago","paid","Paid","estado","Estado"]);
        var paid = isPaymentPaid(paidRaw) ? "SI" : "NO";
        return {
          id: bcbPick(row, ["id","ID"]) || (month+"|"+memberId),
          month: month,
          memberId: memberId,
          name: memberDisplayName(memberId, bcbPick(row, ["nombre","Nombre","miembro","Miembro"])),
          amount: amount || localMemberAmount(),
          paid: paid,
          paidDate: bcbPick(row, ["fecha_pago","Fecha pago","Fecha Pago","paidDate","paid_date"]),
          updatedAt: bcbPick(row, ["actualizado_en","Última actualización","Ultima actualizacion","updatedAt","updated_at"]),
          notes: bcbPick(row, ["notas","Notas","notes","Notes"]),
          sheetRow: row.sheetRow || row.__row || row.Fila || row["Nº fila"] || "",
          raw: row
        };
      }).filter(Boolean);

      if(items.length){
        db.localPayments = mergeLocalPaymentRows(db.localPayments || [], items);
      }
      return items.length;
    };
  }

  if(typeof window.syncLocalPaymentsFromGoogleSheet !== "function"){
    window.syncLocalPaymentsFromGoogleSheet = async function(opts){
      opts = opts || {};
      var silent = !!opts.silent;
      try{
        if(typeof sheetStatus === "function") sheetStatus("Actualizando pagos de local desde Google Sheet…");
        var rows = await fetchSheetTabLive("PAGOS_LOCAL", 800);
        var count = applyLocalPaymentsFromSheet(rows);
        if(!localSelectedMonth) localSelectedMonth = currentYYYYMM();
        if(typeof saveData === "function") saveData({refresh:false});
        if(typeof renderLocalPayments === "function") renderLocalPayments();
        if(typeof renderShell === "function") renderShell();
        if(typeof sheetStatus === "function") sheetStatus("Pagos de local actualizados: "+count+" filas leídas.", "ok");
        if(!silent) alert("Pagos de local actualizados: "+count+" filas.");
        return true;
      }catch(err){
        if(typeof sheetStatus === "function") sheetStatus("No se pudo actualizar PAGOS_LOCAL desde Google Sheet: "+esc(err.message||err), "bad");
        if(!silent) alert("No se pudo actualizar PAGOS_LOCAL:\n\n"+(err.message||err));
        return false;
      }
    };
  }

  if(typeof window.syncRehearsalsFromGoogleSheet !== "function"){
    window.syncRehearsalsFromGoogleSheet = async function(opts){
      opts = opts || {};
      var silent = !!opts.silent;
      try{
        if(typeof sheetStatus === "function") sheetStatus("Actualizando ensayos desde Google Sheet…");
        var rows = await fetchSheetTabLive("ENSAYOS", 800);
        var count = applyRehearsalsFromSheet(rows);
        if(typeof saveData === "function") saveData({refresh:false});
        if(typeof renderRehearsals === "function") renderRehearsals();
        if(typeof renderShell === "function") renderShell();
        if(typeof sheetStatus === "function") sheetStatus("Ensayos actualizados: "+count+" filas leídas.", "ok");
        if(!silent) alert("Ensayos actualizados: "+count+" filas.");
        return true;
      }catch(err){
        if(typeof sheetStatus === "function") sheetStatus("No se pudo actualizar ENSAYOS desde Google Sheet: "+esc(err.message||err), "bad");
        if(!silent) alert("No se pudo actualizar ENSAYOS:\n\n"+(err.message||err));
        return false;
      }
    };
  }

})();

