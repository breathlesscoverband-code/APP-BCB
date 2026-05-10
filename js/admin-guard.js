(function(){
  'use strict';

  const ADMIN_KEY = 'app_bcb_admin_local_unlocked_v2';
  const ADMIN_CODE = '1929';
  const NOTICE_COOLDOWN_MS = 8000;
  let lastNoticeAt = 0;

  const ADMIN_FUNCTIONS = [
    'openContactModal',
    'saveContact',
    'deleteRecord',
    'openConcertModal',
    'saveConcert',
    'openRehearsalModal',
    'saveRehearsal',
    'saveConcertAttendance',
    'markLocalPayment',
    'exportRehearsalsCSV',
    'loadConcertPosterFile',
    'createConcertFromBudget',
    'openSongModal',
    'saveSong',
    'openTaskModal',
    'saveTask',
    'resetData',
    'importJSON',
    'importCSVContacts',
    'safeImportCRMFile',
    'exportJSON',
    'exportCSV',
    'exportFilteredCRM',
    'exportSetlistCSV',
    'exportRepertoireCSV',
    'applySongLinksImport',
    'openSongLinksImportModal',
    'downloadXlsx',
    'copyBudgetText',
    'composeTemplate',
    'composeForContact'
  ];

  const ADMIN_ONCLICK_PATTERNS = ADMIN_FUNCTIONS.slice();

  function isAdmin(){
    return localStorage.getItem(ADMIN_KEY) === '1';
  }

  function ensureNoticeBox(){
    let box = document.getElementById('adminGuardNotice');
    if(box) return box;
    box = document.createElement('div');
    box.id = 'adminGuardNotice';
    box.className = 'adminGuardNotice';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
    return box;
  }

  function notifyUserMode(force){
    const now = Date.now();
    if(!force && now - lastNoticeAt < NOTICE_COOLDOWN_MS) return;
    lastNoticeAt = now;

    const box = ensureNoticeBox();
    box.textContent = 'Modo usuario: solo lectura. Para modificar datos, entra como administrador.';
    box.classList.add('show');

    clearTimeout(box.__hideTimer);
    box.__hideTimer = setTimeout(function(){
      box.classList.remove('show');
    }, 3200);
  }

  function setAdmin(value){
    if(value){
      localStorage.setItem(ADMIN_KEY, '1');
      document.body.classList.add('admin-enabled');
      document.body.classList.remove('user-readonly');
    }else{
      localStorage.removeItem(ADMIN_KEY);
      document.body.classList.remove('admin-enabled');
      document.body.classList.add('user-readonly');
    }
    updateAdminUI();
    markAdminControls();
  }

  function requestAdminAccess(){
    const code = prompt('Clave de administrador de APP-BCB:');
    if(code === null) return false;

    if(String(code).trim() === ADMIN_CODE){
      setAdmin(true);
      const panel = document.getElementById('adminPanel');
      if(panel) panel.classList.remove('open');
      return true;
    }

    alert('Clave incorrecta. Sigues en modo usuario.');
    setAdmin(false);
    return false;
  }

  function callWhenReady(fnName, args){
    if(!isAdmin()){
      notifyUserMode(true);
      return;
    }

    const fn = window[fnName];
    if(typeof fn === 'function'){
      return fn.apply(window, args || []);
    }

    alert('La función "' + fnName + '" todavía no está disponible. Recarga la página y prueba de nuevo.');
  }

  function openExportPanel(){
    if(!isAdmin()){
      notifyUserMode(true);
      return;
    }

    if(typeof window.setTab === 'function'){
      window.setTab('importExport');
    }else{
      alert('El panel de exportación todavía no está disponible. Recarga la página.');
    }
  }

  function updateAdminUI(){
    const fab = document.getElementById('adminFab');
    const panel = document.getElementById('adminPanel');
    const state = document.getElementById('adminState');
    const modeBadge = document.getElementById('adminModeBadge');
    if(!fab || !panel || !state || !modeBadge) return;

    if(isAdmin()){
      fab.textContent = 'Admin activo';
      fab.classList.remove('locked');
      state.textContent = 'Modo administrador activo';
      modeBadge.textContent = 'Administrador';
      modeBadge.classList.add('is-admin');
      modeBadge.classList.remove('is-user');
    }else{
      fab.textContent = 'Acceso admin';
      fab.classList.add('locked');
      state.textContent = 'Modo usuario: solo lectura';
      modeBadge.textContent = 'Usuario · solo lectura';
      modeBadge.classList.add('is-user');
      modeBadge.classList.remove('is-admin');
      panel.classList.remove('open');
    }
  }

  function togglePanel(){
    const panel = document.getElementById('adminPanel');
    if(!panel) return;

    if(!isAdmin()){
      requestAdminAccess();
      return;
    }

    panel.classList.toggle('open');
    updateAdminUI();
  }

  function closeAdminPanel(){
    const panel = document.getElementById('adminPanel');
    if(panel) panel.classList.remove('open');
    updateAdminUI();
  }

  function isAdminOnClick(value){
    const code = String(value || '');
    return ADMIN_ONCLICK_PATTERNS.some(pattern => code.includes(pattern));
  }

  function isAdminFileInput(el){
    if(!el || el.tagName !== 'INPUT') return false;
    if((el.getAttribute('type') || '').toLowerCase() !== 'file') return false;
    const change = el.getAttribute('onchange') || '';
    return isAdminOnClick(change) || change.includes('import');
  }

  function controlNeedsAdmin(el){
    if(!el || el.id === 'adminFab') return false;
    if(el.closest && el.closest('#adminPanel')) return false;
    if(el.closest && el.closest('.nav')) return false;

    if(el.dataset && el.dataset.adminLock === 'true') return true;

    const onclick = el.getAttribute ? el.getAttribute('onclick') : '';
    if(isAdminOnClick(onclick)) return true;

    if(isAdminFileInput(el)) return true;

    const labelText = (el.textContent || '').trim().toLowerCase();
    if((el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'LABEL') && (
      labelText.includes('exportar') ||
      labelText.includes('backup') ||
      labelText.includes('importar') ||
      labelText.includes('cargar archivo') ||
      labelText.includes('subir cartel') ||
      labelText.includes('restaurar') ||
      labelText.includes('+ contacto') ||
      labelText.includes('+ concierto') ||
      labelText.includes('+ ensayo') ||
      labelText.includes('+ tarea') ||
      labelText.includes('editar') ||
      labelText.includes('borrar') ||
      labelText.includes('abrir email') ||
      labelText.includes('preparar email') ||
      labelText.includes('copiar presupuesto') ||
      labelText.includes('crear concierto') ||
      labelText.includes('guardar confirmación') ||
      labelText.includes('exportar csv ensayos') ||
      labelText.includes('marcar todos') ||
      labelText.includes('usar setlist actual') ||
      labelText.includes('limpiar')
    )){
      return true;
    }

    return false;
  }

  function markAdminControls(){
    const selectors = [
      'button',
      'label.btn',
      'input[type="file"]',
      'a.btn'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if(controlNeedsAdmin(el)){
        el.dataset.adminLock = 'true';
        el.classList.toggle('adminLockedControl', !isAdmin());
        el.setAttribute('title', isAdmin() ? 'Disponible en modo administrador' : 'Solo administrador');
        if('disabled' in el && el.tagName === 'INPUT'){
          el.disabled = !isAdmin();
        }
      }else{
        el.classList.remove('adminLockedControl');
      }
    });
  }

  function interceptLockedClick(event){
    const target = event.target && event.target.closest ? event.target.closest('button,label,input,a') : null;
    if(!target || isAdmin()) return;

    if(controlNeedsAdmin(target)){
      event.preventDefault();
      event.stopPropagation();
      if(typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      notifyUserMode(false);
    }
  }

  function guardWindowFunctions(){
    ADMIN_FUNCTIONS.forEach(name => {
      const original = window[name];
      if(typeof original !== 'function' || original.__appBcbGuarded) return;

      const guarded = function(){
        if(!isAdmin()){
          notifyUserMode(false);
          return null;
        }
        return original.apply(this, arguments);
      };

      guarded.__appBcbGuarded = true;
      guarded.__appBcbOriginal = original;
      window[name] = guarded;
    });

    // No se bloquea saveData en modo usuario.
    // saveData solo actualiza la caché local del navegador y es necesario para que
    // móvil pueda guardar la última lectura de Google Sheet sin mostrar avisos repetidos.
  }

  function installObserver(){
    const observer = new MutationObserver(function(){
      guardWindowFunctions();
      markAdminControls();
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }

  function buildAdminUI(){
    if(document.getElementById('adminFab')) return;

    const modeBadge = document.createElement('div');
    modeBadge.id = 'adminModeBadge';
    modeBadge.className = 'adminModeBadge';
    modeBadge.textContent = 'Usuario · solo lectura';

    const fab = document.createElement('button');
    fab.id = 'adminFab';
    fab.className = 'adminFab locked';
    fab.type = 'button';
    fab.textContent = 'Acceso admin';
    fab.addEventListener('click', togglePanel);

    const panel = document.createElement('div');
    panel.id = 'adminPanel';
    panel.className = 'adminPanel';
    panel.innerHTML = `
      <div class="adminPanelTop">
        <h4>Panel administrador</h4>
        <button type="button" id="adminPanelClose" class="adminPanelClose" aria-label="Cerrar panel">×</button>
      </div>
      <span id="adminState" class="adminState">Modo usuario: solo lectura</span>
      <p>Acceso de gestión para APP-BCB. El grupo puede entrar en modo usuario y consultar datos, pero no editar ni exportar.</p>
      <div class="adminActions">
        <button type="button" id="adminOpenExport" class="primary">Abrir Exportar</button>
        <button type="button" id="adminBackup">Backup JSON</button>
        <button type="button" id="adminExportCRM">CRM CSV</button>
        <button type="button" id="adminExportFiltered">CRM filtrado</button>
        <button type="button" id="adminOpenRehearsals">Abrir Ensayos</button>
        <button type="button" id="adminLock" class="danger">Salir de admin</button>
      </div>
    `;

    document.body.appendChild(modeBadge);
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    document.getElementById('adminPanelClose').addEventListener('click', closeAdminPanel);
    document.getElementById('adminOpenExport').addEventListener('click', function(){ openExportPanel(); closeAdminPanel(); });
    document.getElementById('adminBackup').addEventListener('click', function(){ callWhenReady('exportJSON'); closeAdminPanel(); });
    document.getElementById('adminExportCRM').addEventListener('click', function(){ callWhenReady('exportCSV', ['crm']); closeAdminPanel(); });
    document.getElementById('adminExportFiltered').addEventListener('click', function(){ callWhenReady('exportFilteredCRM'); closeAdminPanel(); });
    document.getElementById('adminOpenRehearsals').addEventListener('click', function(){ if(typeof window.setTab === 'function') window.setTab('rehearsals'); closeAdminPanel(); });
    document.getElementById('adminLock').addEventListener('click', function(){ setAdmin(false); closeAdminPanel(); });

    document.addEventListener('click', interceptLockedClick, true);
    document.addEventListener('change', interceptLockedClick, true);

    if(isAdmin()){
      document.body.classList.add('admin-enabled');
      document.body.classList.remove('user-readonly');
    }else{
      document.body.classList.add('user-readonly');
      document.body.classList.remove('admin-enabled');
    }

    guardWindowFunctions();
    markAdminControls();
    updateAdminUI();
    installObserver();
  }

  window.APP_BCB_ADMIN = {
    unlock: requestAdminAccess,
    lock: function(){ setAdmin(false); },
    isAdmin: isAdmin,
    mode: function(){ return isAdmin() ? 'admin' : 'user'; }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', buildAdminUI);
  }else{
    buildAdminUI();
  }
})();
