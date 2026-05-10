window.App = (() => {
  const state = window.AppState;
  const cfg = state.config;
  const U = window.BCBUtils;
  const Api = window.BCBApi;
  const Modules = window.BCBModules;

  async function init() {
    bindEvents();
    buildNav();
    setAdminUi();
    await syncAndRender();
    registerServiceWorker();
    setupInstall();
  }

  function bindEvents() {
    U.qs("#menuBtn").addEventListener("click", () => document.body.classList.toggle("menu-open"));
    U.qs("#refreshBtn").addEventListener("click", () => syncAndRender({ force: true }));
    U.qs("#toggleAdminBtn").addEventListener("click", onAdminToggle);
    U.qs("#cancelAdminBtn").addEventListener("click", () => U.qs("#adminDialog").close());
    U.qs("#cancelRowBtn").addEventListener("click", () => U.qs("#rowDialog").close());
    U.qs("#adminForm").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const key = U.qs("#adminKeyInput").value;
      if (!key.trim()) return U.showToast("Introduce la clave admin.", "warn");
      state.setAdminKey(key);
      U.qs("#adminDialog").close();
      setAdminUi();
      buildNav();
      renderWorkspace();
      U.showToast("Modo admin activado para esta sesión.", "good");
    });
    U.qs("#backupBtn").addEventListener("click", () => window.BCBModules.backupSheet());
    document.addEventListener("click", (ev) => {
      if (ev.target.closest(".nav button")) document.body.classList.remove("menu-open");
    });
  }

  function onAdminToggle() {
    if (state.isAdmin()) {
      state.setAdminKey("");
      setAdminUi();
      buildNav();
      renderWorkspace();
      U.showToast("Modo usuario activado.", "good");
      return;
    }
    U.qs("#adminKeyInput").value = "";
    U.qs("#adminDialog").showModal();
  }

  function setAdminUi() {
    document.body.classList.toggle("admin", state.isAdmin());
    U.qs("#modeLabel").textContent = state.isAdmin() ? "Admin" : "Usuario";
    U.qs("#toggleAdminBtn").textContent = state.isAdmin() ? "Salir admin" : "Entrar admin";
  }

  function buildNav() {
    const nav = U.qs("#mainNav");
    nav.innerHTML = cfg.modules
      .filter(item => !item.adminOnly || state.isAdmin())
      .map(item => {
        const count = item.tab && state.data?.[item.tab] ? state.data[item.tab].length : "";
        return `<button type="button" class="${state.currentModule === item.id ? "active" : ""}" data-module="${item.id}">
          <span>${U.escapeHtml(item.label)}</span>
          ${count !== "" ? `<span class="badge">${count}</span>` : ""}
        </button>`;
      }).join("");

    U.qsa("[data-module]", nav).forEach(btn => btn.addEventListener("click", () => {
      state.currentModule = btn.dataset.module;
      renderWorkspace();
      buildNav();
    }));
  }

  async function syncAndRender() {
    U.qs("#syncStatus").textContent = "Sincronizando con Google Sheet BCB…";
    try {
      const result = await Api.syncMobile({ allowCache: true });
      state.rawPayload = result.payload;
      state.data = U.normalizePayload(result.payload);
      state.loadedFromCache = result.fromCache;
      state.lastSync = result.payload.generatedAt || result.savedAt || new Date().toISOString();
      U.qs("#syncStatus").textContent = `${state.loadedFromCache ? "Caché temporal" : "Google Sheet BCB"} · ${U.readableSyncDate(state.lastSync)}`;
    } catch (err) {
      U.qs("#syncStatus").textContent = "Error de sincronización";
      U.showToast(err.message || String(err), "bad");
    }
    buildNav();
    renderWorkspace();
  }

  function renderWorkspace(resetSearch = true) {
    if (resetSearch) state.search = "";
    const module = cfg.modules.find(m => m.id === state.currentModule) || cfg.modules[0];
    U.qs("#currentModuleLabel").textContent = module.label;
    U.qs("#workspace").innerHTML = Modules.renderModule(module.id);
    setAdminUi();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW no registrado:", err));
    });
  }

  function setupInstall() {
    const installBtn = U.qs("#installBtn");
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.pendingInstallPrompt = event;
      installBtn.hidden = false;
    });

    installBtn.addEventListener("click", async () => {
      if (!state.pendingInstallPrompt) return;
      state.pendingInstallPrompt.prompt();
      await state.pendingInstallPrompt.userChoice;
      state.pendingInstallPrompt = null;
      installBtn.hidden = true;
    });
  }

  return { init, syncAndRender, renderWorkspace };
})();

document.addEventListener("DOMContentLoaded", () => window.App.init());