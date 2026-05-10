window.AppState = {
  config: window.APP_BCB_CONFIG,
  rawPayload: null,
  data: {},
  currentModule: "panel",
  loadedFromCache: false,
  lastSync: null,
  adminKey: sessionStorage.getItem(window.APP_BCB_CONFIG.sessionAdminKey) || "",
  pendingInstallPrompt: null,
  search: "",
  isAdmin() {
    return Boolean(this.adminKey);
  },
  setAdminKey(key) {
    this.adminKey = String(key || "").trim();
    if (this.adminKey) {
      sessionStorage.setItem(this.config.sessionAdminKey, this.adminKey);
    } else {
      sessionStorage.removeItem(this.config.sessionAdminKey);
    }
  }
};