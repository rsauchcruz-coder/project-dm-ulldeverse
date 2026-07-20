"use strict";

(function installStaticDemoRuntime() {
  if (!window.__PROJECT_DM_STATIC_DEMO__) return;

  const STORAGE_KEY = "project_dm_static_engine_v1";
  const nativeFetch = window.fetch.bind(window);
  let worldPromise = null;
  let state = null;

  function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  function normalise(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function pressureLimits(world) {
    const range = world?.sistema_presion?.rango || {};
    const min = Number(range.min ?? 0);
    const max = Number(range.max ?? 5);
    return {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) && max >= min ? max : 5,
    };
  }

  async function loadWorld() {
    if (!worldPromise) {
      worldPromise = nativeFetch("/demo-world.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("No se ha podido cargar el mundo de demostración.");
        return response.json();
      });
    }
    return worldPromise;
  }

  function persistState() {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function restoreState() {
    try {
      state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      state = null;
    }
    return state;
  }

  function initialState(world) {
    const initial = world.estado_inicial || {};
    const firstId = initial.nodo_inicial || world.nodos?.[0]?.id;
    const first = world.nodos.find((node) => node.id === firstId);
    return {
      nodeId: firstId,
      inventory: unique(initial.inventario),
      clues: unique(initial.pistas_descubiertas),
      flags: unique(Object.entries(initial.flags || {}).filter(([, value]) => value).map(([key]) => key)),
      variables: { ...(initial.variables || {}) },
      pressure: Number(initial.presion || 0),
      route: [first?.ubicacion_corta || first?.ubicacion || "Inicio"],
      recentActions: [],
      pendingConsequence: "",
      mode: "CURT GUIAT",
    };
  }

  function requirementMet(requirement) {
    const expression = String(requirement || "").trim();
    const comparison = expression.match(/^([a-z0-9_]+)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/i);
    if (comparison) {
      const actual = Number(state.variables?.[comparison[1]] || 0);
      const expected = Number(comparison[3]);
      if (comparison[2] === ">=") return actual >= expected;
      if (comparison[2] === "<=") return actual <= expected;
      if (comparison[2] === ">") return actual > expected;
      if (comparison[2] === "<") return actual < expected;
      return actual === expected;
    }
    return state.inventory.includes(expression)
      || state.clues.includes(expression)
      || state.flags.includes(expression);
  }

  function eligible(item) {
    return (item.requisitos || []).every(requirementMet)
      && (item.requisitos_ausentes || []).every((requirement) => !requirementMet(requirement));
  }

  function applyVariants(node) {
    return [...(node.variantes_ordenadas || [])]
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
      .filter(eligible)
      .reduce((current, variant) => ({ ...current, ...(variant.sobrescribe || {}) }), { ...node });
  }

  function addAll(target, values) {
    for (const value of values || []) {
      if (!target.includes(value)) target.push(value);
    }
  }

  function removeAll(target, values) {
    for (const value of values || []) {
      const index = target.indexOf(value);
      if (index >= 0) target.splice(index, 1);
    }
  }

  function applyChanges(changes = {}, world) {
    addAll(state.flags, changes.flags_set);
    removeAll(state.flags, changes.flags_unset);
    addAll(state.inventory, changes.inventario_agregar);
    removeAll(state.inventory, changes.inventario_quitar);
    addAll(state.clues, changes.pistas_agregar);
    removeAll(state.clues, changes.pistas_quitar);
    Object.assign(state.variables, changes.variables_set || {});
    for (const [key, delta] of Object.entries(changes.variables_delta || {})) {
      state.variables[key] = Number(state.variables[key] || 0) + Number(delta || 0);
    }
    const limits = pressureLimits(world);
    state.pressure = Math.max(limits.min, Math.min(limits.max, Number(state.pressure || 0) + Number(changes.presion_delta || 0)));
  }

  function panelItem(id, catalog, fallback, namespace = "") {
    const item = catalog.find((entry) => entry.id === id);
    return item
      ? {
          id: namespace ? `${namespace}:${item.id}` : item.id,
          item: item.nombre_visible || fallback || item.id,
          descripcion: item.funcion || "",
        }
      : { id, item: fallback || id, descripcion: "" };
  }

  function personItem(name, world) {
    const person = world.pnj.find((entry) => entry.nombre_visible === name);
    if (!person) return name;
    return {
      id: `pnj:${person.id}`,
      item: `${person.nombre_visible} — ${person.papel_visible}`,
      descripcion: person.quiere || "",
    };
  }

  function playerItem(world) {
    const player = world.jugador || {};
    const name = String(player.nombre || "").trim();
    if (!name) return null;
    return {
      id: "jugador",
      item: `${name} — ${player.rol || "Protagonista"}`,
      descripcion: player.motivacion || "",
    };
  }

  function playerInScene(world) {
    const player = playerItem(world);
    if (!player) return null;
    return {
      id: player.id,
      name: String(player.item).split(/\s+[—-]\s+/)[0],
      role_short: String(player.item).split(/\s+[—-]\s+/)[1] || "Protagonista",
      description: player.descripcion,
    };
  }

  const FOCUS_ENTITY_IDS = Object.freeze({
    foco_cadena_reparada: "recurso:inv_eslabon_repuesto",
    foco_cuerda_apeo: "recurso:inv_cuerda_apeo_marcada",
    foco_tablilla_provisional: "recurso:inv_tablilla_reparto",
    foco_fragmento_sello: "recurso:inv_fragmento_sello_registro",
  });

  function focusEntityId(focus) {
    return focus?.entity_id || FOCUS_ENTITY_IDS[focus?.id] || null;
  }

  function sceneFocuses(entity) {
    const declared = [
      ...(entity?.focos_consulta || []),
      ...(entity?.focos_consulta_extra || []),
    ];
    const seen = new Set();
    return declared.filter((focus) => {
      if (!focus || !focus.id || !eligible(focus) || seen.has(focus.id)) return false;
      seen.add(focus.id);
      return true;
    });
  }

  function objectiveItems(entity, world) {
    const premise = world.premisa || {};
    const general = premise.pregunta_dramatica || premise.promesa_jugable || "Resolver el expediente.";
    const immediate = entity.nucleo_escenico || entity.situacion_visible || "Decidir el siguiente paso.";
    return [
      { id: "objetivo_general", item: "Objetivo general", descripcion: general },
      { id: "objetivo_inmediato", item: "Objetivo inmediato", descripcion: immediate },
    ];
  }

  function currentEntity(world) {
    return world.nodos.find((node) => node.id === state.nodeId)
      || world.finales.find((ending) => ending.id === state.nodeId);
  }

  function buildPanels(entity, world) {
    const confidence = Number(state.variables?.confianza_albert || 0);
    const confidenceText = confidence > 0
      ? "Mateu coopera con Arnau"
      : confidence < 0
        ? "Mateu mantiene una actitud hostil"
        : "Relación con Mateu en observación";
    return {
      interactuable: sceneFocuses(entity).map((focus) => ({
        id: focusEntityId(focus) || focus.id,
        item: focus.etiqueta,
        descripcion: focus.descripcion || "",
      })),
      inventario: state.inventory.map((id) => panelItem(id, world.recursos || [], "", "recurso")),
      deducciones: [
        confidenceText,
        ...state.clues.map((id) => panelItem(id, world.pistas || []).item),
      ],
      peligros: [entity.presion_visible || `Nivel de presión: ${state.pressure}`],
      objetivo: objectiveItems(entity, world),
      personajes: [playerItem(world), ...(entity.personajes_visibles || []).map((name) => personItem(name, world))]
        .filter(Boolean),
    };
  }

  function actionForUi(option) {
    return {
      id: option.id,
      text: option.texto,
      accio_original: option.texto,
      titulo_hoja_destino: option.titulo_hoja_destino || "El siguiente paso",
      avis: option.residuo || "",
    };
  }

  function buildResponse(world) {
    const rawEntity = currentEntity(world);
    if (!rawEntity) return { error: "El estado de la partida no corresponde a ningún nodo publicado." };
    const isFinal = (world.finales || []).some((ending) => ending.id === rawEntity.id);
    const entity = isFinal ? rawEntity : applyVariants(rawEntity);
    const baseText = isFinal ? entity.texto_final : entity.texto_base;
    const text = [state.pendingConsequence, baseText].filter(Boolean).join("\n\n");
    const available = isFinal ? [] : (entity.opciones || []).filter(eligible);
    const relationshipValue = Number(state.variables?.confianza_albert || 0);
    const visibleCharacters = [playerInScene(world), ...(entity.personajes_visibles || []).map((name) => {
      const person = world.pnj.find((entry) => entry.nombre_visible === name);
      return person
        ? {
            id: `pnj:${person.id}`,
            name: person.nombre_visible,
            role_short: person.papel_visible,
            description: person.quiere || "",
          }
        : { id: null, name, role_short: "Presente", description: "" };
    })].filter(Boolean);
    const focusPoints = sceneFocuses(entity).map((focus) => ({
      id: focus.id,
      label: focus.etiqueta,
      description: focus.descripcion || "",
      entity_id: focusEntityId(focus),
    }));
    const structuredRoute = state.route.map((label) => ({ label, ubicacion: label }));
    const limits = pressureLimits(world);

    return {
      node_id: entity.id,
      world_id: world.id,
      titolMonActual: world.titulo,
      titulo_hoja_inicial: world.estado_inicial?.titulo_hoja_inicial || "Prólogo",
      presentacion: {
        titulo_hoja_inicial: world.estado_inicial?.titulo_hoja_inicial || "Prólogo",
      },
      ubicacio: entity.ubicacion,
      situacio: entity.situacion_visible,
      text,
      pressio: entity.presion_visible || (state.pressure ? `Presión ${state.pressure}` : ""),
      accions: available.map((option) => option.texto),
      accions_ui: available.map(actionForUi),
      paneles: buildPanels(entity, world),
      ruta_reciente: [...state.route],
      ruta_reciente_estructurada: structuredRoute,
      personajes_escena: visibleCharacters,
      focos_consulta: focusPoints,
      novedades_caso: state.pendingNews || [],
      ui_state: {
        pressure: {
          name: "Cerco del castillo",
          label: `${state.pressure}/${limits.max}`,
          value: state.pressure,
          min: limits.min,
          max: limits.max,
        },
        relationship: {
          name: "Confianza de Mateu",
          label: relationshipValue > 0
            ? "Favorable"
            : relationshipValue < 0
              ? "Tensa"
              : "En observación",
          value: relationshipValue,
          min: -2,
          max: 2,
        },
        visible_characters: visibleCharacters,
        focus_points: focusPoints,
        route: structuredRoute,
      },
      visual_state: {
        flags: Object.fromEntries(state.flags.map((flag) => [flag, true])),
        presion: state.pressure,
      },
      is_final_real: isFinal,
      final_title: isFinal ? entity.titulo : "",
      final_attitude: isFinal ? text : "",
      meta: { mode: state.mode },
    };
  }

  function newsForAction(option, previousEntity, nextEntity, world) {
    const changes = option.cambios_estado || {};
    const news = [];
    const previousPeople = new Set(previousEntity?.personajes_visibles || []);
    const nextPeople = (nextEntity?.personajes_visibles || []).filter((name) => !previousPeople.has(name));
    const resource = (id) => (world.recursos || []).find((item) => item.id === id);
    const clue = (id) => (world.pistas || []).find((item) => item.id === id);

    if (nextEntity?.ubicacion_corta) news.push({
      id: `ruta:${nextEntity.id}`,
      categoria: "ruta",
      titulo: `Nueva situacion: ${nextEntity.ubicacion_corta}`,
      texto: nextEntity.situacion_visible || "La investigacion cambia de escenario.",
    });
    (changes.inventario_agregar || []).forEach((id) => {
      const item = resource(id);
      news.push({ id: `inventario:${id}`, categoria: "inventario", titulo: `Prueba incorporada: ${item?.nombre_visible || id}`, texto: item?.funcion || "La prueba queda registrada en el expediente." });
    });
    (changes.pistas_agregar || []).forEach((id) => {
      const item = clue(id);
      news.push({ id: `deduccion:${id}`, categoria: "deduccion", titulo: `Deduccion actualizada: ${item?.nombre_visible || id}`, texto: item?.funcion || "La nueva informacion cambia la lectura del caso." });
    });
    nextPeople.forEach((name) => {
      const person = (world.pnj || []).find((item) => item.nombre_visible === name);
      news.push({ id: `personaje:${person?.id || name}`, categoria: "personaje", titulo: `Personaje presente: ${name}`, texto: person?.quiere || "Su papel puede alterar el curso de la investigacion." });
    });
    return news;
  }

  function chooseOption(world, actionText) {
    const entity = world.nodos.find((node) => node.id === state.nodeId);
    if (!entity) return { error: "El expediente ya está cerrado." };
    const previousEntity = applyVariants(entity);
    const option = (previousEntity.opciones || [])
      .filter(eligible)
      .find((candidate) => normalise(candidate.texto) === normalise(actionText));
    if (!option) return { error: "Esa opción no está disponible en el estado actual." };

    applyChanges(option.cambios_estado, world);
    state.nodeId = option.destino;
    state.pendingConsequence = option.consecuencia || "";
    state.recentActions.push(option.texto);
    const destination = currentEntity(world);
    state.route.push(destination?.ubicacion_corta || destination?.ubicacion || "Desenlace");
    state.pendingNews = newsForAction(option, previousEntity, applyVariants(destination), world);
    persistState();
    return buildResponse(world);
  }

  async function bodyFrom(input, init) {
    if (typeof init?.body === "string" && init.body) return JSON.parse(init.body);
    if (input instanceof Request) {
      const text = await input.clone().text();
      return text ? JSON.parse(text) : {};
    }
    return {};
  }

  window.fetch = async function staticDemoFetch(input, init = {}) {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    const path = url.pathname;
    const handled = new Set([
      "/mundos",
      "/iniciar",
      "/accio",
      "/guardar",
      "/cargar",
      "/cuaderno",
      "/mejorar-texto",
    ]);
    if (!handled.has(path)) return nativeFetch(input, init);

    try {
      const world = await loadWorld();

      if (path === "/mundos") {
        return jsonResponse({
          mundos: [{
            id: world.id,
            titulo: world.titulo,
            genero: world.genero || "Aventura",
            subgenero: "Investigación histórica",
            guided: true,
          }],
        });
      }

      if (path === "/iniciar") {
        state = initialState(world);
        persistState();
        return jsonResponse(buildResponse(world));
      }

      if (path === "/accio") {
        if (!state) restoreState();
        if (!state) return jsonResponse({ error: "Inicia primero el expediente." }, 409);
        const body = await bodyFrom(input, init);
        return jsonResponse(chooseOption(world, body.accio));
      }

      if (path === "/guardar") {
        persistState();
        return jsonResponse({ ok: true, local: true });
      }

      if (path === "/cargar") {
        if (!restoreState()) return jsonResponse({ error: "No hay una partida local guardada." }, 404);
        return jsonResponse(buildResponse(world));
      }

      if (path === "/cuaderno") {
        if (!state) restoreState();
        const entity = state ? currentEntity(world) : null;
        return jsonResponse({
          cuaderno: {
            ruta_reciente: state?.route || [],
            acciones_recientes: state?.recentActions || [],
            peligros: entity?.presion_visible ? [entity.presion_visible] : [],
          },
        });
      }

      return jsonResponse({
        error: "La edición de texto está disponible en la versión local de la fábrica.",
      }, 409);
    } catch (error) {
      return jsonResponse({ error: error?.message || "Error en la demo pública." }, 500);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const mode = document.getElementById("mode");
    if (mode) {
      mode.value = "CURT GUIAT";
      [...mode.options].forEach((option) => {
        if (option.value !== "CURT GUIAT") option.remove();
      });
    }
    const freeInput = document.querySelector(".free-input");
    if (freeInput) freeInput.hidden = true;
    document.body.dataset.publicDemo = "true";
  });
}());
