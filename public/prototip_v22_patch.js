"use strict";

(() => {
  const AUTO_KEY = "projectedm_autosave_v22";
  const MANUAL_KEY = "projectedm_manualsave_v22";
  const newsState = { items: [], lastBatch: [] };
  const categoryPanels = {
    inventario: ["inventario"],
    deducciones: ["deduccion"],
    personajes: ["personaje", "relacion"],
    peligros: ["presion"],
    interactuable: ["ruta"],
  };

  function list(value) {
    return Array.isArray(value) ? value : value == null ? [] : [value];
  }

  function html(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    })[char]);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readSave(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function writeNewsToSave(key) {
    const payload = readSave(key);
    if (!payload) return;
    payload.caseNews = {
      items: newsState.items.slice(-80),
      lastBatch: newsState.lastBatch.slice(-12),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }

  function persistNews() {
    writeNewsToSave(AUTO_KEY);
    writeNewsToSave(MANUAL_KEY);
  }

  function loadNewsFromSave(key) {
    const payload = readSave(key);
    const saved = payload?.caseNews;
    newsState.items = list(saved?.items).filter((item) => item && item.texto);
    newsState.lastBatch = list(saved?.lastBatch).filter(Boolean);
  }

  function resetNews() {
    newsState.items = [];
    newsState.lastBatch = [];
    renderCaseNews();
  }

  function ingestNews(incoming) {
    const batch = list(incoming).filter((item) => item && item.texto);
    if (!batch.length) {
      newsState.lastBatch = [];
      return;
    }
    const stamp = Date.now();
    const ids = [];
    batch.forEach((item, index) => {
      const id = `${item.id || item.categoria || "novedad"}:${stamp}:${index}`;
      ids.push(id);
      newsState.items.push({
        id,
        source_id: item.id || null,
        categoria: item.categoria || "caso",
        titulo: item.titulo || "Novedad del caso",
        texto: item.texto,
        read: false,
      });
    });
    newsState.items = newsState.items.slice(-80);
    newsState.lastBatch = ids;
  }

  function unreadItems(categories = null) {
    const allowed = categories ? new Set(categories) : null;
    return newsState.items.filter((item) => !item.read && (!allowed || allowed.has(item.categoria)));
  }

  function markRead(ids) {
    const selected = new Set(ids);
    newsState.items.forEach((item) => {
      if (selected.has(item.id)) item.read = true;
    });
    persistNews();
    renderCaseNews();
  }

  function markCategories(categories) {
    markRead(unreadItems(categories).map((item) => item.id));
  }

  function ensureNewsButton() {
    let button = document.getElementById("caseNewsButton");
    if (button) return button;
    const routeCard = document.getElementById("routeCard");
    if (!routeCard) return null;
    button = document.createElement("button");
    button.id = "caseNewsButton";
    button.type = "button";
    button.className = "section-card case-news-button";
    button.innerHTML = '<span class="case-news-dot" aria-hidden="true"></span><span>Novedades del caso</span><strong id="caseNewsCount"></strong>';
    routeCard.insertAdjacentElement("afterend", button);
    button.addEventListener("click", () => {
      const batch = new Set(newsState.lastBatch);
      let items = newsState.items.filter((item) => batch.has(item.id));
      if (!items.length) items = unreadItems();
      if (!items.length) items = newsState.items.slice(-8);
      openSheet(
        "Actualización",
        "Novedades del caso",
        items.map((item) => ({ item: item.titulo, descripcion: item.texto }))
      );
      markRead(items.map((item) => item.id));
    });
    return button;
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

  function bindNewsTabs() {
    document.querySelectorAll(".side-tabs button[data-panel]").forEach((button) => {
      if (button.dataset.newsBound === "1") return;
      button.dataset.newsBound = "1";
      button.addEventListener("click", () => {
        const categories = categoryPanels[button.dataset.panel] || [];
        if (categories.length) markCategories(categories);
      });
    });
  }

  function renderCaseNews() {
    const unread = unreadItems();
    const button = ensureNewsButton();
    const handle = document.getElementById("drawerHandle");
    const handleDot = ensureDot(handle, "drawer-news-dot");
    if (handleDot) handleDot.hidden = unread.length === 0;
    if (handle) handle.classList.toggle("has-news", unread.length > 0);

    if (button) {
      button.classList.toggle("has-news", unread.length > 0);
      const count = button.querySelector("#caseNewsCount");
      if (count) count.textContent = unread.length ? String(unread.length) : "";
      button.hidden = newsState.items.length === 0;
    }

    bindNewsTabs();
    document.querySelectorAll(".side-tabs button[data-panel]").forEach((tab) => {
      const categories = categoryPanels[tab.dataset.panel] || [];
      const count = unreadItems(categories).length;
      const dot = ensureDot(tab, "tab-news-dot");
      if (dot) dot.hidden = count === 0;
      tab.classList.toggle("has-news", count > 0);
    });
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init = {}) {
    const rawUrl = typeof input === "string" ? input : input?.url || "";
    let pathname = rawUrl;
    try {
      pathname = new URL(rawUrl, location.href).pathname;
    } catch {}

    if (pathname === "/iniciar") resetNews();
    if (pathname === "/cargar") {
      try {
        const body = JSON.parse(init?.body || "{}");
        loadNewsFromSave(String(body.prefer || body.slot || "manual").toLowerCase() === "auto" ? AUTO_KEY : MANUAL_KEY);
      } catch {
        loadNewsFromSave(MANUAL_KEY);
      }
    }

    const response = await nativeFetch(input, init);
    if (pathname === "/accio" && response.ok) {
      try {
        const payload = await response.clone().json();
        if (!payload.error) ingestNews(payload.novedades_caso);
      } catch {}
    }
    return response;
  };

  if (typeof saveLocal === "function") {
    const legacySaveLocal = saveLocal;
    saveLocal = function patchedSaveLocal(key) {
      legacySaveLocal(key);
      writeNewsToSave(key);
    };
  }

  if (typeof sheetTitle === "function") {
    sheetTitle = function patchedSheetTitle(action) {
      return clean(
        action?.titulo_hoja_destino
        || action?.presentation?.titulo_hoja_destino
        || action?.ubicacion_corta_destino
        || ""
      ) || "El siguiente paso";
    };
  }

  if (typeof renderMeters === "function") {
    const legacyRenderMeters = renderMeters;
    renderMeters = function patchedRenderMeters() {
      const current = data();
      const pressure = current?.ui_state?.pressure;
      const relationship = current?.ui_state?.relationship;
      if (!pressure || !relationship) {
        legacyRenderMeters();
        return;
      }

      const pressureName = document.getElementById("pressureName");
      const pressureLabel = document.getElementById("pressureLabel");
      const pressureDots = document.getElementById("pressureDots");
      const meterNames = document.querySelectorAll(".statebar .meter .metertop > span:first-child");
      const trustName = meterNames[1];
      const trustLabel = document.getElementById("trustLabel");
      const trustDots = document.getElementById("trustDots");

      pressureName.textContent = pressure.name || "Presión";
      pressureLabel.textContent = pressure.label || `${pressure.value}/${pressure.max}`;
      const pressureRange = Math.max(1, Number(pressure.max) - Number(pressure.min));
      const pressureSteps = Math.max(1, Math.round(pressureRange));
      const pressureCount = clamp(Math.round(((Number(pressure.value) - Number(pressure.min)) / pressureRange) * pressureSteps), 0, pressureSteps);
      pressureDots.innerHTML = Array.from({ length: pressureSteps }, (_, index) => `<i class="dot ${index < pressureCount ? "on" : ""}"></i>`).join("");

      if (trustName) trustName.textContent = relationship.name || "Confianza";
      trustLabel.textContent = relationship.label || "Neutra";
      const relationshipRange = Math.max(1, Number(relationship.max) - Number(relationship.min));
      const relationshipIndex = clamp(Math.round(((Number(relationship.value) - Number(relationship.min)) / relationshipRange) * 4), 0, 4);
      trustDots.innerHTML = Array.from({ length: 5 }, (_, index) => `<i class="dot ${index === relationshipIndex ? (relationship.value > 0 ? "good" : "on") : ""}"></i>`).join("");
    };
  }

  if (typeof openCharacter === "function") {
    openCharacter = function patchedOpenCharacter(name, person) {
      const visual = resolveEntityAsset(person?.id, "character");
      document.getElementById("sheetKind").textContent = "Personaje";
      document.getElementById("sheetTitle").textContent = name;
      document.getElementById("sheetList").innerHTML = `<article class="sheet-item profile">${visual
        ? `<img src="${html(visual.src)}" alt="${html(visual.alt || name)}">`
        : `<span class="monogram">${html(name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase())}</span>`}<div>${person?.role_short ? `<strong>${html(person.role_short)}</strong>` : ""}<p>${html(person?.description || "Información visible y consolidada en el expediente.")}</p></div></article>`;
      document.getElementById("sheetback").classList.add("active");
    };
  }

  if (typeof renderCharacters === "function") {
    renderCharacters = function patchedRenderCharacters() {
      const current = data();
      const people = list(current?.personajes_escena || current?.ui_state?.visible_characters).slice(0, 4);
      const container = document.getElementById("characters");
      container.innerHTML = people.map((person, index) => {
        const name = person?.name || person?.item || "Personaje";
        const visual = resolveEntityAsset(person?.id, "character");
        const portrait = visual
          ? `<img src="${html(visual.src)}" alt="${html(visual.alt || name)}">`
          : `<span class="monogram">${html(name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase())}</span>`;
        return `<button class="char-card" data-person-index="${index}">${portrait}<span><strong>${html(name)}</strong>${person?.role_short ? `<small>${html(person.role_short)}</small>` : ""}</span></button>`;
      }).join("");
      container.querySelectorAll("[data-person-index]").forEach((button) => {
        const person = people[Number(button.dataset.personIndex)];
        const name = person?.name || person?.item || "Personaje";
        button.onclick = () => openCharacter(name, person);
      });
    };
  }

  if (typeof renderScene === "function") {
    function visualGuardMatches(guard, current) {
      const state = current?.visual_state || {};
      const flags = state.flags || {};
      const pressure = Number(state.presion ?? state.pressio ?? 0);
      const matches = (rule) => {
        const text = String(rule || "").trim();
        const comparison = text.match(/^(presion|pressio|pressure)\s*(>=|<=|>|<|=)\s*(-?\d+)$/i);
        if (comparison) {
          const value = Number(comparison[3]);
          return { ">=": pressure >= value, "<=": pressure <= value, ">": pressure > value, "<": pressure < value, "=": pressure === value }[comparison[2]];
        }
        return flags[text] === true;
      };
      return list(guard?.requires).every(matches) && list(guard?.forbids).every((rule) => !matches(rule));
    }

    function resolveSceneVisual(current) {
      const binding = visualManifest?.bindings?.nodes?.[current?.node_id];
      const matched = list(binding?.scene_variants).find((variant) => visualGuardMatches(variant.guard, current));
      return resolveAsset(matched?.scene_asset || binding?.scene_asset);
    }

    async function openSceneVisual(visual, location) {
      if (!visual?.src) return;
      const viewer = document.getElementById("sceneViewer");
      const image = document.getElementById("sceneViewerImage");
      image.src = visual.src;
      image.alt = visual.alt || location || "Escena ampliada";
      viewer.hidden = false;
      viewer.classList.add("active");
      viewer.setAttribute("aria-hidden", "false");
      try {
        if (!document.fullscreenElement && viewer.requestFullscreen) await viewer.requestFullscreen();
        if (screen.orientation?.lock) await screen.orientation.lock("landscape");
      } catch (_) {
        // Algunos navegadores móviles no permiten bloquear orientación: el visor sigue siendo pantalla completa.
      }
    }

    async function closeSceneVisual() {
      const viewer = document.getElementById("sceneViewer");
      if (!viewer || viewer.hidden) return;
      viewer.classList.remove("active");
      viewer.hidden = true;
      viewer.setAttribute("aria-hidden", "true");
      try {
        if (screen.orientation?.unlock) screen.orientation.unlock();
        if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      } catch (_) {}
    }

    document.getElementById("sceneViewer")?.addEventListener("click", closeSceneVisual);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSceneVisual();
    });
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) closeSceneVisual();
    });

    renderScene = function patchedRenderScene() {
      const current = data();
      const visual = resolveSceneVisual(current);
      const wrap = document.getElementById("photoWrap");
      document.getElementById("location").textContent = clean(current.ubicacio);
      document.getElementById("visibleSituation").textContent = clean(current.situacio || "La escena queda abierta.");
      wrap.classList.toggle("no-image", !visual);
      document.getElementById("sceneImage").src = visual?.src || "";
      document.getElementById("sceneImage").alt = visual?.alt || "";
      const sceneImage = document.getElementById("sceneImage");
      sceneImage.onclick = () => openSceneVisual(visual, current.ubicacio);
      sceneImage.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSceneVisual(visual, current.ubicacio);
        }
      };
      sceneImage.style.cursor = visual?.src ? "zoom-in" : "default";
      document.getElementById("photoPlaceholder").textContent = clean(current.ubicacio || "Localización sin imagen");

      const focuses = list(current?.focos_consulta || current?.ui_state?.focus_points);
      const hotspots = [...wrap.querySelectorAll(".hotspot")];
      while (hotspots.length < focuses.length) {
        const button = document.createElement("button");
        button.className = "hotspot";
        button.type = "button";
        wrap.appendChild(button);
        hotspots.push(button);
      }
      hotspots.forEach((button, index) => {
        const focus = focuses[index];
        const declared = visualManifest?.hotspots?.[current.node_id]?.[focus?.id];
        const hasCanonicalPosition = declared && Number.isFinite(Number(declared.x)) && Number.isFinite(Number(declared.y));
        button.hidden = !focus || !visual || !hasCanonicalPosition;
        if (!focus || !visual || !hasCanonicalPosition) {
          button.onclick = null;
          return;
        }
        const position = declared;
        button.style.left = `${clamp(Number(position.x), 0.04, 0.96) * 100}%`;
        button.style.top = `${clamp(Number(position.y), 0.06, 0.94) * 100}%`;
        button.style.right = "auto";
        button.style.bottom = "auto";
        button.textContent = String(index + 1);
        button.setAttribute("aria-label", focus.label || `Punto ${index + 1}`);
        button.onclick = () => {
          localStorage.setItem(FOCUS_HINT, "1");
          document.getElementById("focusHint").hidden = true;
          openSheet("Punto de escena", focus.label || "Detalle", [{
            id: focus.entity_id || null,
            item: focus.label || "Detalle",
            descripcion: focus.description || "",
          }]);
        };
      });
      document.getElementById("focusHint").hidden = !visual || !focuses.length || localStorage.getItem(FOCUS_HINT) === "1";
      renderCharacters();
    };
  }

  if (typeof renderRoute === "function") {
    renderRoute = function patchedRenderRoute() {
      const current = data();
      const route = list(current?.ruta_reciente_estructurada || current?.ui_state?.route);
      const routeElement = document.getElementById("route");
      routeElement.innerHTML = route.map((entry, index) => `${index ? "<i></i>" : ""}<span class="${index === route.length - 1 ? "current" : ""}">${html(entry?.label || "Inicio")}</span>`).join("") || '<span class="current">Inicio</span>';
      document.getElementById("routeCard").onclick = () => {
        markCategories(["ruta"]);
        openSheet(
          "Itinerario completo",
          "Ruta de la investigación",
          route.map((entry, index) => ({
            item: `${index + 1}. ${entry?.label || "Inicio"}`,
            descripcion: entry?.ubicacion || "",
          }))
        );
      };
    };
  }

  if (typeof render === "function") {
    const legacyRender = render;
    render = function patchedRender(resetTop = true) {
      legacyRender(resetTop);
      renderCaseNews();
    };
  }

  bindNewsTabs();
  renderCaseNews();
})();
