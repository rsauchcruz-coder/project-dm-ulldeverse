"use strict";

(() => {
  const NEWS_KEY = "projectedm_case_news_final_v1";
  const genericCharacter = /^(?:(?:un|una|dos|tres|cuatro|\d+)\s+)?(?:guardia|guardias|soldado|soldados|hombre|hombres|gente|ronda|escolta|escoltas|sirviente|sirvientes|criado|criados|multitud|grupo|monje|monjes|vecino|vecinos|trabajador|trabajadores|patrulla|vigilante|vigilantes)(?:\s+(?:de|del|de la|de los|de las|en|con)\b.*)?$/i;
  const internalDescription = /^(?:Información visible y consolidada en el expediente\.?|Personaje presente\.?|Personaje visible en la escena actual\.?|Figura ya identificada, pero su papel todavía no está claro\.?|Figura ya identificada, pero su papel completo todavía no está claro\.?)$/i;
  const categoryPanels = {
    inventario: ["inventario"],
    deducciones: ["deduccion"],
    personajes: ["personaje", "relacion"],
    peligros: ["presion"],
    interactuable: ["ruta"],
  };

  let sequence = 0;

  function list(value) {
    return Array.isArray(value) ? value : value == null ? [] : [value];
  }

  function html(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    })[char]);
  }

  function currentData() {
    return typeof data === "function" ? data() : {};
  }

  function cleanVisibleText(value) {
    const text = String(value || "").trim();
    return !text || internalDescription.test(text) ? "" : text;
  }

  function isRelevantCanonicalPerson(person) {
    const id = String(person?.id || "");
    const name = String(person?.name || person?.item || "").trim();
    if (!name || genericCharacter.test(name)) return false;
    return id === "jugador" || id.startsWith("pnj:");
  }

  function relevantPeople() {
    const current = currentData();
    const seen = new Set();
    return list(current?.personajes_escena || current?.ui_state?.visible_characters)
      .filter(isRelevantCanonicalPerson)
      .filter((person) => {
        const key = String(person?.id || person?.name || person?.item || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }

  function loadNews() {
    try {
      return list(JSON.parse(localStorage.getItem(NEWS_KEY) || "[]"))
        .filter((item) => item && item.texto)
        .map((item, index) => ({
          ...item,
          event_id: item.event_id || `legacy:${index}`,
          read: Boolean(item.read),
        }));
    } catch {
      return [];
    }
  }

  let newsItems = loadNews();

  function saveNews() {
    newsItems = newsItems.slice(-150);
    localStorage.setItem(NEWS_KEY, JSON.stringify(newsItems));
  }

  function resetNews() {
    newsItems = [];
    saveNews();
    syncNews();
  }

  function ingestNews(batch) {
    const stamp = Date.now();
    list(batch).forEach((item, index) => {
      if (!item || !item.texto) return;
      newsItems.push({
        ...item,
        event_id: `${stamp}:${sequence++}:${index}`,
        source_id: item.id || null,
        categoria: item.categoria || "caso",
        titulo: item.titulo || "Novedad del caso",
        read: false,
      });
    });
    saveNews();
    syncNews();
  }

  function unreadNews(categories = null) {
    const allowed = categories ? new Set(categories) : null;
    return newsItems.filter((item) => !item.read && (!allowed || allowed.has(item.categoria)));
  }

  function markRead(items) {
    const ids = new Set(items.map((item) => item.event_id));
    newsItems.forEach((item) => {
      if (ids.has(item.event_id)) item.read = true;
    });
    saveNews();
    syncNews();
  }

  function ensureDot(element, className) {
    if (!element) return null;
    let dot = element.querySelector(`.${className}`);
    if (!dot) {
      dot = document.createElement("span");
      dot.className = className;
      dot.setAttribute("aria-hidden", "true");
      element.appendChild(dot);
    }
    return dot;
  }

  function bindNewsButton() {
    const original = document.getElementById("caseNewsButton");
    if (!original || original.dataset.consolidatedNews === "1") return original;
    const button = original.cloneNode(true);
    button.dataset.consolidatedNews = "1";
    original.replaceWith(button);
    button.addEventListener("click", () => {
      let shown = unreadNews();
      if (!shown.length) shown = newsItems.slice(-30);
      if (!shown.length || typeof openSheet !== "function") return;
      openSheet(
        "Actualización",
        "Novedades del caso",
        shown.map((item) => ({
          item: item.titulo || "Novedad",
          descripcion: item.texto,
        }))
      );
      markRead(shown);
    });
    return button;
  }

  function bindNewsTabs() {
    document.querySelectorAll(".side-tabs button[data-panel]").forEach((button) => {
      if (button.dataset.consolidatedNews === "1") return;
      button.dataset.consolidatedNews = "1";
      button.addEventListener("click", () => {
        const categories = categoryPanels[button.dataset.panel] || [];
        if (categories.length) markRead(unreadNews(categories));
      });
    });
  }

  function syncNews() {
    const unread = unreadNews();
    const button = bindNewsButton();
    const handle = document.getElementById("drawerHandle");
    const handleDot = ensureDot(handle, "drawer-news-dot");

    if (handleDot) handleDot.hidden = unread.length === 0;
    if (handle) handle.classList.toggle("has-news", unread.length > 0);

    if (button) {
      button.hidden = newsItems.length === 0;
      button.classList.toggle("has-news", unread.length > 0);
      const count = button.querySelector("#caseNewsCount");
      if (count) count.textContent = unread.length ? String(unread.length) : "";
    }

    bindNewsTabs();
    document.querySelectorAll(".side-tabs button[data-panel]").forEach((tab) => {
      const categories = categoryPanels[tab.dataset.panel] || [];
      const count = unreadNews(categories).length;
      const dot = ensureDot(tab, "tab-news-dot");
      if (dot) dot.hidden = count === 0;
      tab.classList.toggle("has-news", count > 0);
    });
  }

  function clearDecisionDetail() {
    const detail = document.getElementById("detailCard");
    if (!detail) return;
    detail.hidden = true;
    detail.innerHTML = "";
  }

  function revealActiveArchiveTab() {
    const tabs = document.getElementById("archiveTabs");
    if (!tabs) return;
    const activeTab = tabs.querySelector('.archive-tab[aria-selected="true"]')
      || tabs.querySelector(".archive-tab:last-child");
    if (!activeTab) return;
    requestAnimationFrame(() => {
      const targetLeft = Math.max(0, activeTab.offsetLeft + activeTab.offsetWidth - tabs.clientWidth);
      tabs.scrollTo({ left: targetLeft, behavior: "smooth" });
    });
  }

  function isAlbertRecaptured(d = currentData()) {
    return d?.node_id === "f01_albert_recapturado";
  }

  function visibleItem(value) {
    if (typeof value === "string") return value;
    return value?.item || value?.titulo || value?.nombre_visible || value?.texto || "";
  }

  function buildCaseSummary() {
    const d = currentData();
    const items = [];

    if (typeof sheets !== "undefined" && Array.isArray(sheets)) {
      sheets.forEach((sheet, index) => {
        const title = String(sheet?.title || `Paso ${index + 1}`).trim();
        const decision = String(sheet?.chosenText || "").trim();
        const location = String(
          sheet?.node?.ubicacion_corta
          || sheet?.node?.ubicacio_corta
          || sheet?.node?.ubicacion
          || sheet?.node?.ubicacio
          || ""
        ).trim();
        const description = [location, decision ? `Decisión: ${decision}` : ""]
          .filter(Boolean)
          .join(" · ");
        items.push({
          item: `${index + 1}. ${title}`,
          descripcion: description || "Escena incorporada al expediente.",
        });
      });
    }

    const inventory = list(d?.paneles?.inventario || d?.inventari_actual || d?.inventario)
      .map(visibleItem)
      .filter(Boolean);
    if (inventory.length) items.push({ item: "Inventario final", descripcion: inventory.join(" · ") });

    const deductions = list(d?.paneles?.deducciones || d?.pistes_descobertes || d?.pistas_descubiertas)
      .map(visibleItem)
      .filter(Boolean);
    if (deductions.length) items.push({ item: "Deducciones alcanzadas", descripcion: deductions.join(" · ") });

    const rawTitle = String(d.final_title || "Desenlace").replace(/^Final:\s*/i, "").trim();
    items.push({
      item: `Final: ${rawTitle}`,
      descripcion: String(d.final_attitude || d.text || "El expediente queda cerrado.").trim(),
    });
    return items;
  }

  function polishFinalView() {
    const d = currentData();
    const isFinal = Boolean(d?.is_final_real);
    const narrative = document.getElementById("narrativeCard");
    const finalCard = document.getElementById("finalCard");

    if (narrative) narrative.hidden = isFinal;
    if (!isFinal || !finalCard) return;

    const rawTitle = String(d.final_title || "Desenlace").replace(/^Final:\s*/i, "").trim();
    const fullEnding = String(d.final_attitude || d.text || "El expediente queda cerrado.").trim();
    const endingParagraphs = fullEnding
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((paragraph) => `<p>${html(paragraph)}</p>`)
      .join("");

    finalCard.innerHTML = `
      <div class="final-seal">EXPEDIENTE<br>CERRADO</div>
      <h2>${html(rawTitle)}</h2>
      <div class="final-ending-text">${endingParagraphs}</div>
      <div class="detail-actions">
        <button id="reviewFinal">Resumen de la partida</button>
        <button id="replayFinal">Volver a jugar</button>
        <button id="finalHome">Volver a la biblioteca</button>
      </div>`;

    const review = document.getElementById("reviewFinal");
    const replay = document.getElementById("replayFinal");
    const home = document.getElementById("finalHome");
    if (review) review.onclick = () => {
      if (typeof openSheet === "function") {
        openSheet("Resumen de la partida", "Todo lo ocurrido", buildCaseSummary());
      }
    };
    if (replay) replay.onclick = async () => {
      replay.disabled = true;
      try {
        if (typeof start === "function") await start();
      } finally {
        replay.disabled = false;
      }
    };
    if (home && typeof showHome === "function") home.onclick = showHome;
  }

  const previousFetch = window.fetch.bind(window);
  window.fetch = async function consolidatedFetch(input, init = {}) {
    const rawUrl = typeof input === "string" ? input : input?.url || "";
    let pathname = rawUrl;
    try { pathname = new URL(rawUrl, location.href).pathname; } catch {}
    if (pathname === "/iniciar") resetNews();
    const response = await previousFetch(input, init);
    if (pathname === "/accio" && response.ok) {
      try {
        const payload = await response.clone().json();
        if (!payload.error) ingestNews(payload.novedades_caso);
      } catch {}
    }
    return response;
  };

  if (typeof openCharacter === "function") {
    openCharacter = function consolidatedOpenCharacter(name, person) {
      if (!isRelevantCanonicalPerson(person)) return;
      const visual = resolveEntityAsset(person?.id, "character");
      const portrait = visual
        ? `<img src="${html(visual.src)}" alt="${html(visual.alt || name)}">`
        : `<span class="monogram">${html(name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase())}</span>`;
      const role = cleanVisibleText(person?.role_short);
      const description = cleanVisibleText(person?.description);
      document.getElementById("sheetKind").textContent = "Personaje";
      document.getElementById("sheetTitle").textContent = name;
      document.getElementById("sheetList").innerHTML = `<article class="sheet-item profile">${portrait}<div>${role ? `<strong>${html(role)}</strong>` : ""}${description ? `<p>${html(description)}</p>` : ""}</div></article>`;
      document.getElementById("sheetback").classList.add("active");
    };
  }

  if (typeof renderCharacters === "function") {
    renderCharacters = function consolidatedRenderCharacters() {
      const people = relevantPeople();
      const container = document.getElementById("characters");
      if (!container) return;
      container.innerHTML = people.map((person, index) => {
        const name = person?.name || person?.item || "Personaje";
        const visual = resolveEntityAsset(person?.id, "character");
        const portrait = visual
          ? `<img src="${html(visual.src)}" alt="${html(visual.alt || name)}">`
          : `<span class="monogram">${html(name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase())}</span>`;
        const role = cleanVisibleText(person?.role_short);
        return `<button class="char-card" data-consolidated-person="${index}">${portrait}<span><strong>${html(name)}</strong>${role ? `<small>${html(role)}</small>` : ""}</span></button>`;
      }).join("");
      container.querySelectorAll("[data-consolidated-person]").forEach((button) => {
        const person = people[Number(button.dataset.consolidatedPerson)];
        const name = person?.name || person?.item || "Personaje";
        button.onclick = () => openCharacter(name, person);
      });
    };
  }

  if (typeof renderMeters === "function") {
    const previousRenderMeters = renderMeters;
    renderMeters = function consolidatedRenderMeters() {
      previousRenderMeters();
      if (!isAlbertRecaptured()) return;
      const trustLabel = document.getElementById("trustLabel");
      const trustDots = document.getElementById("trustDots");
      if (trustLabel) trustLabel.textContent = "Rota";
      if (trustDots) {
        trustDots.innerHTML = [0, 1, 2, 3, 4]
          .map((_, index) => `<i class="dot ${index === 0 ? "on" : ""}"></i>`)
          .join("");
      }
    };
  }

  if (typeof renderArchive === "function") {
    const previousRenderArchive = renderArchive;
    renderArchive = function consolidatedRenderArchive() {
      const result = previousRenderArchive();
      revealActiveArchiveTab();
      return result;
    };
  }

  if (typeof selectAction === "function") {
    const previousSelectAction = selectAction;
    selectAction = function consolidatedSelectAction(action) {
      clearDecisionDetail();
      return previousSelectAction(action);
    };
  }

  if (typeof execute === "function") {
    const previousExecute = execute;
    execute = async function consolidatedExecute(action) {
      clearDecisionDetail();
      try {
        return await previousExecute(action);
      } finally {
        clearDecisionDetail();
      }
    };
  }

  if (typeof renderChoices === "function") {
    const previousRenderChoices = renderChoices;
    renderChoices = function consolidatedRenderChoices() {
      clearDecisionDetail();
      const result = previousRenderChoices();
      clearDecisionDetail();
      return result;
    };
  }

  if (typeof render === "function") {
    const previousRender = render;
    render = function consolidatedRender(resetTop = true) {
      clearDecisionDetail();
      const result = previousRender(resetTop);
      clearDecisionDetail();
      syncNews();
      polishFinalView();
      return result;
    };
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-sheet]")) revealActiveArchiveTab();
  });

  syncNews();
  polishFinalView();
  window.__PROJECTE_DM_RUNTIME__ = "consolidated-20260716m";
})();
