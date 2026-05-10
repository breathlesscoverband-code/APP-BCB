window.BCBApi = (() => {
  const cfg = window.APP_BCB_CONFIG;
  const { showToast } = window.BCBUtils;

  function endpoint(action, params = {}) {
    const url = new URL(cfg.endpointUrl);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "") url.searchParams.set(key, value);
    });
    return url.toString();
  }

  async function getHealth() {
    const res = await fetch(endpoint("health"), { cache: "no-store", redirect: "follow" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Health check no OK");
    return json;
  }

  async function getMobile() {
    const res = await fetch(endpoint("mobile"), { cache: "no-store", redirect: "follow" });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error("La respuesta mobile no es JSON válido."); }
    if (!json.ok) throw new Error(json.error || "Respuesta mobile no OK");
    return json;
  }

  async function getSheet(tab) {
    const res = await fetch(endpoint("sheet", { tab }), { cache: "no-store", redirect: "follow" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || `No se pudo leer ${tab}`);
    return json;
  }

  async function postAdmin(action, payload = {}) {
    const state = window.AppState;
    if (!state.adminKey) throw new Error("Activa modo admin antes de editar.");
    const body = Object.assign({}, payload, { action, adminKey: state.adminKey });

    const res = await fetch(cfg.endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow"
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error("El bridge respondió, pero la respuesta no pudo leerse como JSON."); }
    if (!json.ok) throw new Error(json.error || `Acción admin fallida: ${action}`);
    return json;
  }

  function saveCache(payload) {
    try {
      localStorage.setItem(cfg.cacheKey, JSON.stringify({ savedAt: new Date().toISOString(), payload }));
    } catch (err) {
      console.warn("No se pudo guardar caché temporal:", err);
    }
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(cfg.cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function syncMobile({ allowCache = true } = {}) {
    try {
      const payload = await getMobile();
      saveCache(payload);
      return { payload, fromCache: false };
    } catch (err) {
      if (allowCache) {
        const cached = loadCache();
        if (cached?.payload) {
          showToast("Sin conexión con Google Sheet. Mostrando caché temporal.", "warn");
          return { payload: cached.payload, fromCache: true, savedAt: cached.savedAt, error: err };
        }
      }
      throw err;
    }
  }

  return { getHealth, getMobile, getSheet, postAdmin, syncMobile };
})();