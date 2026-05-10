window.BCBModules = (() => {
  const state = window.AppState;
  const cfg = state.config;
  const U = window.BCBUtils;
  const Api = window.BCBApi;

  function moduleHeader(title, subtitle, actions = "") {
    return `
      <div class="module-title">
        <div>
          <h2>${U.escapeHtml(title)}</h2>
          ${subtitle ? `<p>${U.escapeHtml(subtitle)}</p>` : ""}
        </div>
        <div>${actions}</div>
      </div>`;
  }

  function renderPanel() {
    const crm = rows("CRM_GENERAL");
    const concerts = rows("CONCIERTOS");
    const songs = rows("REPERTORIO");
    const tasks = rows("TAREAS");
    const members = rows("MIEMBROS");
    const pendingFollow = crm.filter(r => U.getValue(r, ["Fecha siguiente paso", "Siguiente paso"]));
    const openTasks = tasks.filter(r => !["hecha", "cerrada", "completada"].includes(U.normalizeText(U.getValue(r, "Estado"))));
    const confirmed = concerts.filter(r => U.normalizeText(U.getValue(r, "Estado")).includes("confirmado"));

    return `
      ${moduleHeader("Panel", "Resumen operativo de Breathless Cover Band.")}
      <div class="grid cards">
        ${metricCard("CRM", crm.length, "registros comerciales")}
        ${metricCard("Seguimientos", pendingFollow.length, "con siguiente paso")}
        ${metricCard("Conciertos", confirmed.length, "confirmados")}
        ${metricCard("Canciones", songs.length, "base editable")}
      </div>
      <div class="grid two">
        <div class="card">
          <h3>Estado de trabajo</h3>
          <div class="kv-list">
            ${kv("Miembros activos", members.filter(m => U.normalizeText(U.getValue(m, "Activo")).includes("si") || U.normalizeText(U.getValue(m, "Activo")).includes("sí")).length || members.length)}
            ${kv("Tareas abiertas", openTasks.length)}
            ${kv("Origen de datos", state.loadedFromCache ? "Caché temporal" : "Google Sheet maestro BCB")}
            ${kv("Última sincronización", U.readableSyncDate(state.lastSync))}
          </div>
        </div>
        <div class="card">
          <h3>Reglas activas</h3>
          <p>Google Sheet BCB es la fuente principal. localStorage funciona solo como caché temporal para móvil.</p>
          <p>Sonido e iluminación: a consultar según aforo y formato. No se dan por incluidos sin confirmación expresa.</p>
          <p>El setlist mostrado es base editable, no setlist definitivo de evento.</p>
        </div>
      </div>
      <div class="card">
        <h3>Argumentario rápido BCB</h3>
        <p><strong>${U.escapeHtml(cfg.commercial.titular)}</strong></p>
        <p>${U.escapeHtml(cfg.commercial.descripcion)}</p>
        <button class="btn btn-small" onclick="BCBModules.copyCommercialPitch()">Copiar presentación corta</button>
      </div>`;
  }

  function metricCard(title, value, label) {
    return `<div class="card"><h3>${U.escapeHtml(title)}</h3><div class="metric">${U.escapeHtml(value)}</div><div class="metric-label">${U.escapeHtml(label)}</div></div>`;
  }

  function kv(k, v) {
    return `<div class="kv"><span>${U.escapeHtml(k)}</span><strong>${U.escapeHtml(v)}</strong></div>`;
  }

  function renderGenericTable(tabName, title, subtitle, options = {}) {
    const allRows = rows(tabName);
    const filtered = filterRows(allRows);
    const columns = options.columns || cfg.tableColumnsByTab[tabName] || cfg.headersByTab[tabName] || inferColumns(filtered);
    const addButton = state.isAdmin() && options.allowEdit !== false
      ? `<button class="btn btn-small admin-only" onclick="BCBModules.openNewRow('${tabName}')">Añadir</button>`
      : "";

    return `
      ${moduleHeader(title, subtitle, addButton)}
      ${toolbar(tabName, filtered.length, allRows.length)}
      ${table(tabName, filtered, columns, { allowEdit: options.allowEdit !== false })}`;
  }

  function toolbar(tabName, count, total) {
    return `
      <div class="toolbar">
        <input class="search-input" type="search" placeholder="Buscar en este módulo…" value="${U.escapeHtml(state.search)}" oninput="BCBModules.setSearch(this.value)">
        <span class="status-pill">${count} / ${total} registros</span>
        <span class="status-pill ${state.loadedFromCache ? "warn" : "good"}">${state.loadedFromCache ? "Caché temporal" : "Google Sheet"}</span>
      </div>`;
  }

  function table(tabName, tableRows, columns, opts = {}) {
    if (!tableRows.length) return `<div class="empty">No hay registros para mostrar.</div>`;
    const actionHead = state.isAdmin() && opts.allowEdit ? "<th>Admin</th>" : "";
    const head = columns.map(c => `<th>${U.escapeHtml(c)}</th>`).join("") + actionHead;
    const body = tableRows.map((row, idx) => {
      const rowId = U.escapeHtml(row.__rowKey || U.getValue(row, ["ID", "Setlist ID"]) || idx);
      const cells = columns.map(col => {
        const value = U.getValue(row, col);
        const cls = col.toLowerCase().includes("estado") || col.toLowerCase().includes("pago") || col.toLowerCase().includes("factura")
          ? `status-pill ${U.statusClass(value)}` : "";
        return `<td>${cls ? `<span class="${cls}">${U.escapeHtml(value || "—")}</span>` : U.escapeHtml(value || "—")}</td>`;
      }).join("");
      const actions = state.isAdmin() && opts.allowEdit
        ? `<td><button class="btn btn-small btn-outline admin-only" onclick="BCBModules.openEditRow('${tabName}','${rowId}')">Editar</button></td>`
        : "";
      return `<tr>${cells}${actions}</tr>`;
    }).join("");

    return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function inferColumns(tableRows) {
    return Array.from(new Set(tableRows.flatMap(row => Object.keys(row).filter(k => !k.startsWith("__"))))).slice(0, 10);
  }

  function filterRows(inputRows) {
    return inputRows.filter(row => U.rowSearch(row, state.search));
  }

  function rows(tabName) {
    return (state.data?.[tabName] || []).map((row, idx) => Object.assign({ __rowKey: U.getValue(row, ["ID", "Setlist ID"]) || `ROW-${idx}` }, row));
  }

  function renderSeguimiento() {
    const crm = rows("CRM_GENERAL").filter(r =>
      U.getValue(r, "Siguiente paso") ||
      U.getValue(r, "Fecha siguiente paso") ||
      ["seguimiento pendiente", "negociacion abierta", "pendiente de confirmacion", "cualificando"].includes(U.normalizeText(U.getValue(r, "Estado")))
    );
    const tasks = rows("TAREAS").filter(r => !["hecha", "cerrada", "completada"].includes(U.normalizeText(U.getValue(r, "Estado"))));
    const crmHtml = table("CRM_GENERAL", filterRows(crm), ["Estado", "Contacto", "Empresa/Entidad", "Tipo evento", "Siguiente paso", "Fecha siguiente paso", "Responsable", "Notas"]);
    const taskHtml = table("TAREAS", filterRows(tasks), ["Estado", "Prioridad", "Tarea", "Responsable", "Fecha vencimiento", "Relacionado con"], { allowEdit: true });
    return `
      ${moduleHeader("Seguimiento", "Oportunidades y tareas que necesitan siguiente acción con fecha.")}
      ${toolbar("CRM_GENERAL", filterRows(crm).length + filterRows(tasks).length, crm.length + tasks.length)}
      <div class="card"><h3>CRM con siguiente paso</h3>${crmHtml}</div>
      <div class="card"><h3>Tareas abiertas</h3>${taskHtml}</div>`;
  }

  function renderGmail() {
    const gmail = filterRows(rows("RESPUESTAS_GMAIL"));
    const cards = gmail.map((r, idx) => {
      const msg = U.getValue(r, "Mensaje base");
      const subject = U.getValue(r, "Asunto");
      return `<div class="card copy-block">
        <div class="module-title">
          <div><h3>${U.escapeHtml(U.getValue(r, "Tipo") || `Plantilla ${idx+1}`)}</h3><p>${U.escapeHtml(subject)}</p></div>
          <button class="btn btn-small" onclick="BCBModules.copyTemplate(${idx})">Copiar</button>
        </div>
        <div class="copy-text">${U.escapeHtml(msg)}</div>
      </div>`;
    }).join("");
    window.__BCB_GMAIL_FILTERED__ = gmail;
    return `
      ${moduleHeader("Gmail", "Respuestas base para adaptar a cada interlocutor. No prometer disponibilidad, precio ni técnica sin confirmar.")}
      ${toolbar("RESPUESTAS_GMAIL", gmail.length, rows("RESPUESTAS_GMAIL").length)}
      ${cards || `<div class="empty">No hay plantillas Gmail cargadas.</div>`}`;
  }

  function renderPlantillas() {
    const gmail = rows("RESPUESTAS_GMAIL");
    const dossier = rows("PLANTILLAS_DOSSIER");
    return `
      ${moduleHeader("Plantillas", "Banco de textos comerciales y operativos de BCB.")}
      <div class="grid two">
        <div class="card">
          <h3>Plantillas Gmail / WhatsApp</h3>
          ${table("RESPUESTAS_GMAIL", filterRows(gmail), ["Tipo", "Asunto", "Mensaje base", "Notas"], { allowEdit: true })}
        </div>
        <div class="card">
          <h3>Plantillas de dossier</h3>
          ${table("PLANTILLAS_DOSSIER", filterRows(dossier), ["Tipo", "Título", "Texto", "CTA"], { allowEdit: true })}
        </div>
      </div>`;
  }

  function renderSetlist() {
    const setlists = filterRows(rows("SETLISTS"));
    return `
      ${moduleHeader("Setlist", "Base editable de trabajo. No tratar como setlist definitivo de evento.")}
      <div class="setlist-grid">
        <img class="setlist-image" src="assets/bcb_setlist_base.png" alt="Setlist base Breathless Cover Band">
        <div>
          ${toolbar("SETLISTS", setlists.length, rows("SETLISTS").length)}
          ${table("SETLISTS", setlists, cfg.tableColumnsByTab.SETLISTS)}
        </div>
      </div>`;
  }

  function renderDossier() {
    const templates = filterRows(rows("PLANTILLAS_DOSSIER"));
    return `
      ${moduleHeader("Dossier", "Argumentario comercial y materiales base de Breathless Cover Band.")}
      <div class="grid two">
        <div class="card">
          <h3>Titular comercial</h3>
          <p><strong>${U.escapeHtml(cfg.commercial.titular)}</strong></p>
          <p>${U.escapeHtml(cfg.commercial.subtitulo)}</p>
          <p>${U.escapeHtml(cfg.commercial.descripcion)}</p>
          <button class="btn btn-small" onclick="BCBModules.copyCommercialPitch()">Copiar presentación</button>
        </div>
        <div class="card">
          <h3>Encaje de eventos</h3>
          <p>Bodas, fiestas privadas, eventos de empresa, celebraciones, hoteles, salas, eventos corporativos y públicos mixtos.</p>
          <p class="notice">CTA: ${U.escapeHtml(cfg.commercial.cta)}</p>
        </div>
      </div>
      <div class="card">
        <h3>Textos cargados en PLANTILLAS_DOSSIER</h3>
        ${table("PLANTILLAS_DOSSIER", templates, cfg.tableColumnsByTab.PLANTILLAS_DOSSIER, { allowEdit: true })}
      </div>`;
  }

  function renderPresupuesto() {
    const today = U.todayIso();
    const text = `BORRADOR DE PROPUESTA / PRESUPUESTO BCB

Banda: Breathless Cover Band
Fecha de emisión: ${today}
Evento: [tipo de evento]
Fecha del evento: [fecha o ventana]
Lugar: [ciudad / recinto]
Formato: [banda completa / formato a confirmar]
Duración: [por confirmar]
Importe: [por definir]
Sonido e iluminación: a consultar según aforo y formato. No incluidos salvo confirmación expresa.
Forma de pago: [por definir]
Validez de propuesta: [por definir]

Descripción:
${cfg.commercial.descripcion}

CTA:
${cfg.commercial.cta}

Datos pendientes para cerrar:
- fecha exacta
- horario
- lugar exacto
- condiciones técnicas
- persona responsable
- datos de facturación / contratación
- forma y plazo de pago`;

    return `
      ${moduleHeader("Presupuesto", "Generador de borrador. No equivale a factura ni cierre confirmado.")}
      <div class="notice warn">Separar siempre presupuesto, acuerdo, factura y cobro. No marcar como cobrado nada que no esté confirmado.</div>
      <div class="card copy-block">
        <h3>Borrador base</h3>
        <div class="copy-text">${U.escapeHtml(text)}</div>
        <button class="btn" onclick="BCBModules.copyBudget()">Copiar borrador</button>
      </div>`;
  }

  function renderExportar() {
    if (!state.isAdmin()) {
      return `${moduleHeader("Exportar", "Módulo visible solo en modo admin.")}<div class="empty">Activa modo admin para exportar, importar o hacer backup.</div>`;
    }
    const tabs = Object.keys(cfg.headersByTab).filter(t => state.data[t]);
    const buttons = tabs.map(tab => `<button class="btn btn-small btn-outline" onclick="BCBModules.exportCsv('${tab}')">${tab}.csv</button>`).join("");
    const importOptions = tabs.map(tab => `<option value="${tab}">${tab}</option>`).join("");
    return `
      ${moduleHeader("Exportar", "Herramientas admin. El Sheet sigue siendo la fuente principal.")}
      <div class="card">
        <h3>Exportar CSV</h3>
        <p>Descarga una copia CSV de los datos sincronizados en esta sesión.</p>
        <div class="toolbar">${buttons}</div>
      </div>
      <div class="card">
        <h3>Exportar JSON completo</h3>
        <p>Exporta la carga mobile normalizada de APP-BCB.</p>
        <button class="btn" onclick="BCBModules.exportJson()">Descargar JSON</button>
      </div>
      <div class="card admin-block">
        <h3>Importar JSON a una pestaña</h3>
        <p>Pega un array JSON de objetos. La app añadirá los registros al Sheet mediante el bridge BCB.</p>
        <label>Pestaña destino<select id="importTab">${importOptions}</select></label>
        <label>JSON<textarea id="importJson" placeholder='[{"ID":"CRM-001","Estado":"Lead nuevo"}]'></textarea></label>
        <button class="btn" onclick="BCBModules.importJsonToTab()">Importar registros</button>
      </div>
      <div class="card">
        <h3>Backup del Google Sheet</h3>
        <p>Crea una copia del Google Sheet maestro BCB en Drive.</p>
        <button class="btn btn-outline" onclick="BCBModules.backupSheet()">Crear backup</button>
      </div>`;
  }

  function renderModule(id) {
    switch (id) {
      case "panel": return renderPanel();
      case "crm": return renderGenericTable("CRM_GENERAL", "CRM", "Leads, oportunidades y pipeline comercial BCB.");
      case "seguimiento": return renderSeguimiento();
      case "gmail": return renderGmail();
      case "conciertos": return renderGenericTable("CONCIERTOS", "Conciertos", "Eventos, coordinación y estado administrativo.");
      case "ensayos": return renderGenericTable("ENSAYOS", "Ensayos", "Agenda y trabajo de ensayo.");
      case "local": return renderGenericTable("PAGOS_LOCAL", "Local / Pagos", "Control de local compartido y pagos de BCB.");
      case "presupuesto": return renderPresupuesto();
      case "canciones": return renderGenericTable("REPERTORIO", "Canciones", "Repertorio base editable BCB.");
      case "setlist": return renderSetlist();
      case "dossier": return renderDossier();
      case "plantillas": return renderPlantillas();
      case "tareas": return renderGenericTable("TAREAS", "Tareas", "Tareas internas de gestión, marketing, booking, producción y administración.");
      case "exportar": return renderExportar();
      default: return renderPanel();
    }
  }

  function setSearch(value) {
    state.search = value;
    window.App.renderWorkspace(false);
  }

  function openNewRow(tabName) {
    const headers = cfg.headersByTab[tabName] || [];
    const seed = {};
    const prefix = tabName.split("_").map(x => x[0]).join("").slice(0, 5) || "BCB";
    if (headers.includes("ID")) seed.ID = U.generateId(prefix);
    if (headers.includes("Setlist ID")) seed["Setlist ID"] = U.generateId("SET");
    if (headers.includes("Fecha alta")) seed["Fecha alta"] = U.todayIso();
    if (headers.includes("Fecha creación")) seed["Fecha creación"] = U.todayIso();
    if (headers.includes("Última actualización")) seed["Última actualización"] = U.todayIso();
    if (headers.includes("Estado") && tabName === "CRM_GENERAL") seed.Estado = "Lead nuevo";
    openRowDialog(tabName, seed, "append");
  }

  function openEditRow(tabName, rowKey) {
    const row = rows(tabName).find(r => String(r.__rowKey) === String(rowKey) || String(U.getValue(r, ["ID","Setlist ID"])) === String(rowKey));
    if (!row) return U.showToast("No se encontró el registro para editar.", "bad");
    openRowDialog(tabName, row, "update");
  }

  function openRowDialog(tabName, row, mode) {
    const dialog = U.qs("#rowDialog");
    const title = U.qs("#rowDialogTitle");
    const fields = U.qs("#rowFormFields");
    const headers = cfg.headersByTab[tabName] || Object.keys(row);
    title.textContent = `${mode === "append" ? "Añadir" : "Editar"} · ${tabName}`;
    fields.innerHTML = headers.map(header => {
      const value = row[header] ?? "";
      const full = ["Mensaje base", "Notas", "Texto", "Observaciones", "Tarea"].includes(header) ? " full" : "";
      const input = full
        ? `<textarea name="${U.escapeHtml(header)}">${U.escapeHtml(value)}</textarea>`
        : specialInput(tabName, header, value);
      return `<label class="${full}">${U.escapeHtml(header)}${input}</label>`;
    }).join("");

    U.qs("#rowForm").onsubmit = async (ev) => {
      ev.preventDefault();
      const formData = new FormData(ev.currentTarget);
      const data = {};
      headers.forEach(header => data[header] = formData.get(header) || "");
      try {
        if (mode === "append") {
          await Api.postAdmin("append", { tab: tabName, data });
          U.showToast("Registro añadido. Actualizando datos…", "good");
        } else {
          const id = U.getValue(row, ["ID", "Setlist ID"]);
          await Api.postAdmin("update", { tab: tabName, id, data });
          U.showToast("Registro actualizado. Actualizando datos…", "good");
        }
        dialog.close();
        await window.App.syncAndRender();
      } catch (err) {
        U.showToast(err.message || String(err), "bad");
      }
    };

    dialog.showModal();
  }

  function specialInput(tabName, header, value) {
    const escapedHeader = U.escapeHtml(header);
    const escapedValue = U.escapeHtml(value);
    if (header === "Estado" && tabName === "CRM_GENERAL") {
      return `<select name="${escapedHeader}">${cfg.pipelineStates.map(s => `<option ${String(value) === s ? "selected" : ""}>${U.escapeHtml(s)}</option>`).join("")}</select>`;
    }
    if (header.toLowerCase().includes("fecha")) {
      return `<input type="date" name="${escapedHeader}" value="${escapedValue}">`;
    }
    if (header.toLowerCase().includes("email")) {
      return `<input type="email" name="${escapedHeader}" value="${escapedValue}">`;
    }
    if (header.toLowerCase().includes("teléfono") || header.toLowerCase().includes("whatsapp")) {
      return `<input type="tel" name="${escapedHeader}" value="${escapedValue}">`;
    }
    if (["Importe total", "Participantes", "Reparto por persona", "Orden", "Orden base"].includes(header)) {
      return `<input type="text" inputmode="decimal" name="${escapedHeader}" value="${escapedValue}">`;
    }
    return `<input type="text" name="${escapedHeader}" value="${escapedValue}">`;
  }

  async function backupSheet() {
    try {
      await Api.postAdmin("backup", {});
      U.showToast("Backup solicitado correctamente en Drive.", "good");
    } catch (err) {
      U.showToast(err.message || String(err), "bad");
    }
  }

  function exportCsv(tab) {
    const csv = U.rowsToCsv(rows(tab).map(({__rowKey, ...r}) => r));
    U.downloadText(`APP-BCB_${tab}_${U.todayIso()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportJson() {
    U.downloadText(`APP-BCB_mobile_normalizado_${U.todayIso()}.json`, JSON.stringify(state.data, null, 2), "application/json;charset=utf-8");
  }

  async function importJsonToTab() {
    const tab = U.qs("#importTab").value;
    const raw = U.qs("#importJson").value;
    let arr;
    try {
      arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error("El JSON debe ser un array de objetos.");
    } catch (err) {
      return U.showToast(err.message || "JSON inválido.", "bad");
    }
    try {
      for (const item of arr) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        await Api.postAdmin("append", { tab, data: item });
      }
      U.showToast(`Importados ${arr.length} registros en ${tab}.`, "good");
      await window.App.syncAndRender();
    } catch (err) {
      U.showToast(err.message || String(err), "bad");
    }
  }

  function copyTemplate(idx) {
    const row = window.__BCB_GMAIL_FILTERED__?.[idx];
    if (!row) return;
    const subject = U.getValue(row, "Asunto");
    const msg = U.getValue(row, "Mensaje base");
    U.copyText(`Asunto: ${subject}\n\n${msg}`).then(() => U.showToast("Plantilla copiada.", "good"));
  }

  function copyCommercialPitch() {
    const text = `${cfg.commercial.titular}\n\n${cfg.commercial.descripcion}\n\n${cfg.commercial.cta}`;
    U.copyText(text).then(() => U.showToast("Presentación BCB copiada.", "good"));
  }

  function copyBudget() {
    const text = U.qs(".copy-text")?.textContent || "";
    U.copyText(text).then(() => U.showToast("Borrador copiado.", "good"));
  }

  return {
    renderModule, setSearch, openNewRow, openEditRow, backupSheet, exportCsv, exportJson,
    importJsonToTab, copyTemplate, copyCommercialPitch, copyBudget
  };
})();