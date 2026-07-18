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
      if (trust) trust.textContent = isUlldecona ? "Confianza de Albert" : "Confianza";
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

  document.addEventListener("DOMContentLoaded", function () {
    removeLegacyEditorialTools();
    installImageFallbacks();
    installWorldLabels();
    if (document.body.dataset.premiumAutostart === "true") autostart();

    const exit = byId("exitBtn");
    if (exit) exit.addEventListener("click", function () {
      exposeManualStart("Elige si quieres abrir de nuevo el expediente o recuperar una partida.");
    });
  });
}());