window.BCBUtils = (() => {
  const cfg = window.APP_BCB_CONFIG;

  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === "";
  }

  function isMeaningfulRow(row) {
    return row && Object.values(row).some(v => !isBlank(v));
  }

  function objectValuesInOrder(obj) {
    return Object.keys(obj || {}).map(k => obj[k]);
  }

  function cleanHeader(header, idx) {
    const val = String(header ?? "").trim();
    if (!val || val === "null" || val === "undefined") return "";
    if (/^COL_\d+$/i.test(val)) return "";
    return val || `Campo ${idx + 1}`;
  }

  function looksLikeHeaderRow(values, expectedHeaders) {
    const normalized = values.map(v => normalizeText(v));
    const expected = (expectedHeaders || []).slice(0, 8).map(v => normalizeText(v));
    const hits = expected.filter(h => h && normalized.includes(h)).length;
    return hits >= Math.min(2, expected.length);
  }

  function normalizeTab(tabName, sheetPayload) {
    const rows = Array.isArray(sheetPayload) ? sheetPayload : (sheetPayload?.rows || []);
    const expected = cfg.headersByTab[tabName] || [];
    if (!rows.length) return [];

    const firstKeys = Object.keys(rows[0] || {});
    const alreadyNormal = expected.length
      ? expected.slice(0, 2).every(h => firstKeys.includes(h))
      : firstKeys.some(k => !/^COL_\d+$/i.test(k) && !String(k).startsWith("APP-BCB"));

    if (alreadyNormal && !String(firstKeys[0] || "").startsWith("APP-BCB")) {
      return rows.filter(isMeaningfulRow).map(row => compactRow(row));
    }

    const matrix = rows.map(row => objectValuesInOrder(row));
    let headerIndex = matrix.findIndex(values => looksLikeHeaderRow(values, expected));
    if (headerIndex === -1) {
      const keyLooksLikeTitle = firstKeys.some(k => String(k).startsWith("APP-BCB"));
      if (!keyLooksLikeTitle) return rows.filter(isMeaningfulRow).map(row => compactRow(row));
      headerIndex = 0;
    }

    let headers = (headerIndex === 0 && !String(firstKeys[0] || "").startsWith("APP-BCB"))
      ? firstKeys
      : matrix[headerIndex];

    headers = headers.map(cleanHeader).filter(Boolean);
    if (!headers.length) headers = expected;

    const start = headerIndex === 0 && !String(firstKeys[0] || "").startsWith("APP-BCB") ? 0 : headerIndex + 1;
    return matrix.slice(start)
      .map(values => {
        const obj = {};
        headers.forEach((header, idx) => { obj[header] = values[idx] ?? ""; });
        return obj;
      })
      .filter(isMeaningfulRow)
      .map(row => compactRow(row));
  }

  function compactRow(row) {
    const out = {};
    Object.entries(row || {}).forEach(([k, v]) => {
      const key = String(k || "").trim();
      if (!key || /^COL_\d+$/i.test(key)) return;
      out[key] = v ?? "";
    });
    return out;
  }

  function normalizePayload(payload) {
    const data = {};
    const rawData = payload?.data || {};
    Object.keys(cfg.headersByTab).forEach(tab => {
      data[tab] = normalizeTab(tab, rawData[tab]);
    });
    return data;
  }

  function rowSearch(row, term) {
    if (!term) return true;
    const haystack = normalizeText(Object.values(row).join(" "));
    return haystack.includes(normalizeText(term));
  }

  function getValue(row, candidates) {
    const keys = Array.isArray(candidates) ? candidates : [candidates];
    for (const key of keys) {
      if (row && Object.prototype.hasOwnProperty.call(row, key) && !isBlank(row[key])) return row[key];
    }
    return "";
  }

  function statusClass(value) {
    const v = normalizeText(value);
    if (["confirmado", "cobrado", "ejecutado", "activo", "ok", "si", "sí"].some(x => v.includes(x))) return "good";
    if (["pendiente", "cualificando", "seguimiento", "negociacion", "coordinacion", "pausado"].some(x => v.includes(x))) return "warn";
    if (["perdido", "incidencia", "no", "cancelado"].some(x => v.includes(x))) return "bad";
    return "";
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function generateId(prefix = "BCB") {
    const d = new Date();
    const stamp = d.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${rnd}`;
  }

  function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function rowsToCsv(rows) {
    if (!rows?.length) return "";
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    const lines = [headers.join(",")];
    rows.forEach(row => {
      lines.push(headers.map(h => csvCell(row[h])).join(","));
    });
    return lines.join("\n");
  }

  function csvCell(value) {
    const v = String(value ?? "");
    return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return Promise.resolve();
  }

  function showToast(message, type = "") {
    const toast = qs("#toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => toast.className = "toast", 3200);
  }

  function readableSyncDate(value) {
    if (!value) return "sin sincronización";
    try {
      return new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return String(value);
    }
  }

  return {
    qs, qsa, escapeHtml, normalizePayload, rowSearch, getValue, statusClass,
    todayIso, generateId, downloadText, rowsToCsv, copyText, showToast, readableSyncDate,
    normalizeText, isBlank
  };
})();