(function () {
  "use strict";

  const WORLD_ID = "aventura_el_testigo_de_ulldecona_001";
  const AUTOSTART_LIMIT_MS = 9000;
  let decisionObserver = null;

  function byId(id) { return document.getElementById(id); }

  function removeLegacyEditorialTools() {
    ["textBtn", "exportTextBtn"].forEach(function (id) {
      const element = byId(id);
      if (element) element.remove();
    });
  }

  function exposeManualStart(message) {
    document.body.classList.add("prototype-autostart-failed");
    const title = document.querySelector(".prototype-loader .library-title");
    const subtitle = document.querySelector(".prototype-loader .subtitle");
    if (title) title.textContent = "Expediente preparado";
    if (subtitle) subtitle.textContent = message || "Selecciona el mundo y abre el expediente.";
  }

  function installImageFallbacks() {
    const scene = byId("sceneImage");
    const wrap = byId("photoWrap");
    const placeholder = byId("photoPlaceholder");

    if (scene && wrap) {
      scene.addEventListener("error", function () {
        scene.removeAttribute("src");
        wrap.classList.add("no-image");
        if (placeholder && !placeholder.textContent.trim()) placeholder.textContent = "Escena sin imagen disponible";
      });
      scene.addEventListener("load", function () {
        if (scene.naturalWidth > 0) wrap.classList.remove("no-image");
      });
    }

    const characters = byId("characters");
    if (!characters) return;

    function attachPortraitFallback(image) {
      if (image.dataset.fallbackReady) return;
      image.dataset.fallbackReady = "true";
      image.addEventListener("error", function () {
        const card = image.closest(".char-card");
        const name = card && card.querySelector("strong") ? card.querySelector("strong").textContent.trim() : "Personaje";
        const initials = name.split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join("").toUpperCase();
        const monogram = document.createElement("span");
        monogram.className = "monogram";
        monogram.textContent = initials || "?";
        image.replaceWith(monogram);
      }, { once: true });
    }

    const observer = new MutationObserver(function () {
      characters.querySelectorAll("img").forEach(attachPortraitFallback);
    });
    observer.observe(characters, { childList: true, subtree: true });
    characters.querySelectorAll("img").forEach(attachPortraitFallback);
  }

  function installDecisionObserver() {
    const target = byId("decisionCard");
    const jump = byId("jumpDecisions");
    if (!target || !jump || decisionObserver) return;
    decisionObserver = new IntersectionObserver(function (entries) {
      const entry = entries[0];
      jump.classList.toggle("show", !target.hidden && !entry.isIntersecting);
    }, { threshold: 0.12 });
    decisionObserver.observe(target);
  }

  function installWorldLabels() {
    const title = byId("worldTitle");
    const pressure = byId("pressureName");
    const trust = byId("trustName");
    if (!title || (!pressure && !trust)) return;

    function refresh() {
      const isUlldecona = /ulldecona/i.test(title.textContent || "");
      if (pressure) pressure.textContent = isUlldecona ? "Cerco del castillo" : "Presión";
      if (trust) trust.textContent = isUlldecona ? "Confianza de Mateu" : "Confianza";
    }

    new MutationObserver(refresh).observe(title, { childList: true, subtree: true, characterData: true });
    refresh();
  }

  function autostart() {
    const genre = byId("genere");
    const world = byId("worldSelect");
    const mode = byId("mode");
    const start = byId("startBtn");
    const error = byId("homeError");
    if (!genre || !world || !mode || !start) return;

    genre.value = "Aventura";
    mode.value = "CURT GUIAT";

    const startedAt = Date.now();
    let submitted = false;
    const timer = window.setInterval(function () {
      if (byId("gameScreen") && byId("gameScreen").classList.contains("active")) {
        installDecisionObserver();
        window.clearInterval(timer);
        return;
      }

      const option = Array.from(world.options).find(function (item) { return item.value === WORLD_ID; });
      if (option && !submitted) {
        submitted = true;
        world.value = WORLD_ID;
        world.dispatchEvent(new Event("change", { bubbles: true }));
        start.click();
      }

      if (error && error.textContent.trim()) {
        window.clearInterval(timer);
        exposeManualStart("No se ha podido abrir automáticamente. Puedes iniciarlo manualmente sin perder el fallback textual.");
      } else if (Date.now() - startedAt > AUTOSTART_LIMIT_MS) {
        window.clearInterval(timer);
        exposeManualStart("El servidor todavía no ha entregado la biblioteca. Puedes reintentar desde aquí.");
      }
    }, 120);
  }

  const characterRoster = [
    { name: "Arnau Cervera", id: "jugador", description: "Escribano auxiliar del traslado y custodio improvisado de Mateu." },
    { name: "Mateu Rius", id: "pnj:albert", description: "Cantero acusado de matar al oficial del reparto." },
    { name: "Sibila Rius", id: "pnj:sibila", description: "Hermana de Mateu, ocupada en desmontar la casa familiar." },
    { name: "Bernat Llorca", id: "pnj:bernat", description: "Encargado de guardias y transportes durante el traslado." },
    { name: "Miquel Sabater", id: "pnj:miquel", description: "Auxiliar del oficial muerto y copista de la lista provisional." },
    { name: "Fray Pere de Cardona", id: "pnj:fray_pere", description: "Hospitalario encargado de recibir las reclamaciones del asentamiento." },
    { name: "Guillem Miró", id: "pnj:guillem", description: "Oficial del reparto hallado muerto en la cisterna." },
  ];

  function visibleName(value) {
    return String(value || "").split(/\s+[—–-]\s+/)[0].trim();
  }

  function characterId(name, fallback) {
    const key = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const person of characterRoster) {
      const normalizedCandidate = person.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (key === normalizedCandidate) return person.id;
    }
    return fallback || null;
  }

  function characterDirectoryEntries() {
    const currentEntries = typeof panel === "function" ? panel("personajes").map(function (entry) {
      const raw = entry && typeof entry === "object" ? entry : { item: entry };
      const parts = String(raw.item || "").split(/\s+[—–-]\s+/);
      const name = visibleName(raw.item);
      return {
        id: characterId(name, raw.id),
        name: name || "Personaje",
        description: raw.descripcion || parts.slice(1).join(" — ").trim(),
      };
    }) : [];
    return characterRoster.map(function (person) {
      const current = currentEntries.find(function (entry) { return entry.id === person.id || entry.name === person.name; });
      return current ? { ...person, description: current.description || person.description } : { ...person };
    });
  }

  function openCharacterDirectory() {
    const entries = characterDirectoryEntries();
    const list = byId("sheetList");
    if (!list) return;
    byId("sheetKind").textContent = "Expediente";
    byId("sheetTitle").textContent = "Personajes";
    list.className = "sheet-list character-directory";
    list.innerHTML = entries.map(function (person) {
      const visual = typeof resolveEntityAsset === "function"
        ? resolveEntityAsset(person.id, "character")
        : null;
      const portrait = visual
        ? `<img src="${esc(visual.src)}" alt="${esc(visual.alt || person.name)}">`
        : `<span class="monogram">${esc(person.name.split(/\s+/).slice(0, 2).map(function (part) { return part[0]; }).join("").toUpperCase())}</span>`;
      return `<article class="sheet-item character-profile-card">${portrait}<div><strong>${esc(person.name)}</strong>${person.description ? `<p>${esc(person.description)}</p>` : ""}</div></article>`;
    }).join("");
    byId("sheetback").classList.add("active");
    if (typeof closeDrawer === "function") closeDrawer();
  }

  function installCharacterDirectory() {
    const button = document.querySelector('.side-tabs button[data-panel="personajes"]');
    if (button) button.onclick = openCharacterDirectory;
  }

  function installDecisionFlow() {
    if (typeof renderChoices === "function") {
      const renderChoicesBeforeCompetition = renderChoices;
      renderChoices = function competitionRenderChoices() {
        const result = renderChoicesBeforeCompetition();
        document.querySelectorAll("#actionsList .choice small").forEach(function (metadata) {
          metadata.remove();
        });
        return result;
      };
    }

    if (typeof selectAction === "function") {
      selectAction = function competitionSelectAction(action) {
        const detail = byId("detailCard");
        detail.hidden = false;
        detail.innerHTML = '<div class="detail-actions"><button id="execAction" type="button">Ejecutar</button><button id="cancelAction" type="button">Cancelar</button></div>';
        byId("execAction").onclick = function () {
          detail.hidden = true;
          detail.innerHTML = "";
          execute(action);
        };
        byId("cancelAction").onclick = function () {
          detail.hidden = true;
          detail.innerHTML = "";
        };
        detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
    }
  }

  function installRestart() {
    const restart = byId("restartBtn");
    if (!restart) return;
    restart.onclick = async function () {
      if (!window.confirm("¿Reiniciar la aventura desde el principio?")) return;
      restart.disabled = true;
      if (typeof closeDrawer === "function") closeDrawer();
      try {
        if (typeof start === "function") await start();
      } finally {
        restart.disabled = false;
      }
    };
  }

  installDecisionFlow();

  document.addEventListener("DOMContentLoaded", function () {
    removeLegacyEditorialTools();
    installImageFallbacks();
    installWorldLabels();
    installCharacterDirectory();
    installRestart();
    if (document.body.dataset.premiumAutostart === "true") autostart();

    const exit = byId("exitBtn");
    if (exit) exit.addEventListener("click", function () {
      exposeManualStart("Elige si quieres abrir de nuevo el expediente o recuperar una partida.");
    });
  });
}());
