"use strict";

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function humanizeId(value) {
  const text = String(value || "")
    .replace(/^(pnj:|recurso:|pista:)/, "")
    .replace(/^(inv|pista|flag)_/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function guidedModule(partida) {
  return partida?.mon?.guided_short_module || {};
}

function runtimeModule(partida) {
  return partida?.mon?.runtime_module || {};
}

function worldFull(partida) {
  return partida?.mon?.world_full || {};
}

function stateOf(partida) {
  return partida?.estat || {};
}

function nodesOf(partida) {
  const guided = guidedModule(partida);
  if (Array.isArray(guided.nodes)) return guided.nodes;
  return Array.isArray(partida?.mon?.nodes) ? partida.mon.nodes : [];
}

function currentNode(partida) {
  const state = stateOf(partida);
  const id = state.currentNodeId || state.node_id || state.node_actual || "";
  return nodesOf(partida).find((node) => node?.id === id) || null;
}

function labelMap(partida, key) {
  const value = guidedModule(partida)?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function playerInfo(partida) {
  const player = runtimeModule(partida).jugador || {};
  return {
    name: String(player.nom || player.nombre || "").trim(),
    role: String(player.rol || player.paper_visible || "").trim(),
  };
}

function characterIdForName(name, partida) {
  const cleanName = String(name || "").replace(/\s+[—–-]\s+.*$/, "").trim();
  const normalized = normalize(cleanName);
  if (!normalized) return null;
  if (normalized === normalize(playerInfo(partida).name)) return "jugador";
  for (const [id, label] of Object.entries(labelMap(partida, "personatges_visibles"))) {
    if (normalized === normalize(label)) return `pnj:${id}`;
  }
  return null;
}

function characterRole(name, partida) {
  const normalized = normalize(name);
  const candidates = [
    ...arr(runtimeModule(partida).pnj_clau),
    ...arr(worldFull(partida).pnj),
  ];
  const hit = candidates.find((entry) => {
    const candidateName = typeof entry === "string"
      ? entry
      : entry?.nom || entry?.nombre || entry?.nombre_visible || "";
    return normalize(candidateName) === normalized;
  });
  if (!hit || typeof hit === "string") return "";
  return String(hit.paper_visible || hit.rol || hit.papel_visible || "").trim();
}

function shortRole(role) {
  const clean = String(role || "").trim();
  if (!clean) return "";
  const first = clean.split(/[\s,;:.—–-]+/).find(Boolean) || "";
  return first.length <= 20 ? first : "";
}

function visibleCharacters(partida, node = currentNode(partida)) {
  const output = [];
  const seen = new Set();
  const player = playerInfo(partida);

  function add(name, role, id) {
    const cleanName = String(name || "").replace(/\s+[—–-]\s+.*$/, "").trim();
    const key = normalize(cleanName);
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push({
      id: id || characterIdForName(cleanName, partida),
      name: cleanName,
      role_short: shortRole(role),
      description: String(role || "").trim(),
    });
  }

  if (player.name) add(player.name, player.role, "jugador");
  for (const raw of arr(node?.personatges_visibles)) {
    const name = typeof raw === "string"
      ? raw
      : raw?.nombre_visible || raw?.nombre || raw?.nom || raw?.item || "";
    if (!name) continue;
    add(name, characterRole(name, partida), characterIdForName(name, partida));
  }
  return output.slice(0, 4);
}

function resourceIdForFocus(label, partida) {
  const text = normalize(label);
  if (!text) return null;
  const aliases = {
    inv_eslabon_repuesto: ["cadena", "grillete", "eslabon"],
    inv_cuerda_apeo_marcada: ["cuerda", "apeo"],
    inv_tablilla_reparto: ["tablilla", "reparto"],
    inv_fragmento_sello_registro: ["fragmento", "sello", "impronta"],
  };
  const directId = Object.entries(aliases).find(([, terms]) => terms.some((term) => text.includes(term)));
  if (directId) return `recurso:${directId[0]}`;
  const resource = arr(worldFull(partida).recursos).find((entry) => {
    const id = String(entry?.id || "");
    const terms = [entry?.nombre_visible, ...arr(entry?.terminos_visibles), ...(aliases[id] || [])]
      .map(normalize)
      .filter(Boolean);
    return terms.some((term) => text.includes(term) || term.includes(text));
  });
  return resource?.id ? `recurso:${resource.id}` : null;
}

function focusPoints(node = {}, partida = {}) {
  const output = arr(node.focos_consulta).map((focus, index) => {
    if (typeof focus === "string") {
      return {
        id: focus,
        label: humanizeId(focus),
        description: "",
        type: "detalle",
        order: index,
        entity_id: resourceIdForFocus(focus, partida),
      };
    }
    const label = focus?.etiqueta || focus?.titulo || focus?.item || humanizeId(focus?.id);
    return {
      id: focus?.id || `foco_${index + 1}`,
      label,
      description: focus?.descripcion || focus?.detalle || "",
      type: focus?.tipo || "detalle",
      order: index,
      entity_id: focus?.entity_id || resourceIdForFocus(label, partida),
    };
  }).filter((focus) => focus.label);
  return output.slice(0, 3);
}

function relationshipName(variable, partida) {
  const suffix = String(variable || "").replace(/^confianza_/, "");
  const labels = labelMap(partida, "personatges_visibles");
  const person = labels[suffix] || humanizeId(suffix);
  return person ? `Confianza de ${String(person).split(/\s+/)[0]}` : "Confianza";
}

function metrics(partida) {
  const guided = guidedModule(partida);
  const state = stateOf(partida);
  const variables = state.variables || {};
  const pressureMin = numberOr(guided.pressio_min, 0);
  const pressureMax = numberOr(guided.pressio_max, 8);
  const pressureValue = numberOr(
    state.pressio ?? state.presion ?? state.pressure,
    numberOr(guided.estat_inicial_guiat?.pressio_inicial, pressureMin)
  );
  const relationshipVariable = Object.prototype.hasOwnProperty.call(variables, "confianza_albert")
    ? "confianza_albert"
    : Object.keys(variables).find((key) => /^confianza_/.test(key));
  const relationshipValue = relationshipVariable ? numberOr(variables[relationshipVariable], 0) : 0;
  const relationshipLabel = relationshipValue > 0 ? "Alta" : relationshipValue < 0 ? "Baja" : "Neutra";

  return {
    pressure: {
      name: String(guided.pressio_nom_visible || "Presión").trim(),
      value: pressureValue,
      min: pressureMin,
      max: pressureMax,
      label: `${pressureValue}/${pressureMax}`,
    },
    relationship: {
      variable: relationshipVariable || null,
      name: relationshipName(relationshipVariable, partida),
      value: relationshipValue,
      min: -2,
      max: 2,
      label: relationshipLabel,
    },
  };
}

function shortLocationFallback(value) {
  const clean = String(value || "").trim();
  if (!clean) return "Inicio";
  const first = clean.split(/[,—–-]/)[0].trim();
  return first.replace(/\s+(del|de la|de los|de las)\s+.*$/i, "").trim() || first;
}

function nodeForLocation(location, partida) {
  const target = normalize(location);
  if (!target) return null;
  return nodesOf(partida).find((node) => {
    const full = normalize(node?.ubicacio || node?.ubicacion || "");
    return full === target;
  }) || null;
}

function structuredRoute(route, partida, activeNode = currentNode(partida)) {
  const rawRoute = arr(route);
  return rawRoute.map((entry, index) => {
    if (entry && typeof entry === "object") {
      return {
        node_id: entry.node_id || null,
        label: entry.label || entry.ubicacion_corta || shortLocationFallback(entry.ubicacion),
        ubicacion: entry.ubicacion || entry.label || "",
      };
    }
    const location = String(entry || "").trim();
    let node = nodeForLocation(location, partida);
    if (!node && index === rawRoute.length - 1 && activeNode) node = activeNode;
    return {
      node_id: node?.id || null,
      label: node?.ubicacion_corta || shortLocationFallback(location),
      ubicacion: location,
    };
  });
}

function optionForAction(action, node) {
  const target = normalize(action?.original_text || action?.accio_original || action?.text || "");
  if (!target) return null;
  return arr(node?.opcions).find((option) => normalize(option?.text || option?.texto || "") === target) || null;
}

function enrichActions(list, node, partida) {
  return arr(list).map((action) => {
    if (!action || typeof action !== "object") return action;
    const option = optionForAction(action, node);
    if (!option) return action;
    const destinationId = option.node_seguent || option.destino || "";
    const destination = nodesOf(partida).find((candidate) => candidate?.id === destinationId);
    return {
      ...action,
      titulo_hoja_destino: option.titulo_hoja_destino || destination?.ubicacion_corta || "",
      node_destino: destinationId || null,
      ubicacion_corta_destino: destination?.ubicacion_corta || null,
    };
  });
}

function canonicalCharacterToken(value, partida) {
  const raw = String(value || "");
  if (!raw) return null;
  if (raw === "jugador" || raw.startsWith("pnj:")) return raw;
  if (labelMap(partida, "personatges_visibles")[raw]) return `pnj:${raw}`;
  return characterIdForName(raw, partida);
}

function snapshot(partida) {
  const state = stateOf(partida);
  const node = currentNode(partida);
  const currentMetrics = metrics(partida);
  return {
    worldId: guidedModule(partida).world_id || runtimeModule(partida).id || worldFull(partida).id || "",
    nodeId: node?.id || state.currentNodeId || "",
    locationShort: node?.ubicacion_corta || "",
    inventory: new Set(arr(state.inventari_actual || state.inventario_actual || state.inventari).map(String)),
    clues: new Set(arr(state.pistes_descobertes || state.pistas_descubiertas).map(String)),
    characters: new Set(arr(state.pnj_implicats || state.pnj_implicados).map((item) => canonicalCharacterToken(item, partida)).filter(Boolean)),
    pressure: currentMetrics.pressure.value,
    relationship: currentMetrics.relationship.value,
    metrics: currentMetrics,
  };
}

function additions(before, after) {
  return [...after].filter((item) => !before.has(item));
}

function removals(before, after) {
  return [...before].filter((item) => !after.has(item));
}

function visibleLabel(token, map, prefix) {
  const id = String(token || "").replace(prefix, "");
  return map[id] || humanizeId(id);
}

function diffSnapshots(previous, next, partida) {
  if (!previous || previous.worldId !== next.worldId) return [];
  const news = [];
  const resourceLabels = labelMap(partida, "recursos_visibles");
  const clueLabels = labelMap(partida, "pistes_visibles");
  const characterLabels = labelMap(partida, "personatges_visibles");

  for (const token of additions(previous.inventory, next.inventory)) {
    const label = visibleLabel(token, resourceLabels, "recurso:");
    news.push({ id: `inventario:+:${token}:${next.nodeId}`, categoria: "inventario", titulo: "Nueva prueba", texto: `Has incorporado ${label}.` });
  }
  for (const token of removals(previous.inventory, next.inventory)) {
    const label = visibleLabel(token, resourceLabels, "recurso:");
    news.push({ id: `inventario:-:${token}:${next.nodeId}`, categoria: "inventario", titulo: "Recurso perdido", texto: `Ya no conservas ${label}.` });
  }
  for (const token of additions(previous.clues, next.clues)) {
    const label = visibleLabel(token, clueLabels, "pista:");
    news.push({ id: `deduccion:+:${token}:${next.nodeId}`, categoria: "deduccion", titulo: "Nueva deducción", texto: label });
  }
  for (const token of additions(previous.characters, next.characters)) {
    const id = String(token).replace(/^pnj:/, "");
    const label = characterLabels[id] || humanizeId(id);
    news.push({ id: `personaje:+:${token}:${next.nodeId}`, categoria: "personaje", titulo: "Nuevo personaje", texto: `${label} entra en el expediente.` });
  }
  if (previous.nodeId && next.nodeId && previous.nodeId !== next.nodeId) {
    news.push({ id: `ruta:${previous.nodeId}:${next.nodeId}`, categoria: "ruta", titulo: "La investigación avanza", texto: `Nueva localización: ${next.locationShort || "otro punto del caso"}.` });
  }
  if (previous.pressure !== next.pressure) {
    const direction = next.pressure > previous.pressure ? "avanza" : "pierde fuerza";
    news.push({ id: `presion:${previous.pressure}:${next.pressure}:${next.nodeId}`, categoria: "presion", titulo: "El peligro cambia", texto: `${next.metrics.pressure.name} ${direction}.` });
  }
  if (previous.relationship !== next.relationship) {
    const direction = next.relationship > previous.relationship ? "mejora" : "se deteriora";
    news.push({ id: `relacion:${previous.relationship}:${next.relationship}:${next.nodeId}`, categoria: "relacion", titulo: "La relación cambia", texto: `${next.metrics.relationship.name} ${direction}.` });
  }
  return news;
}

function enrichResponse(body, partida, options = {}) {
  if (!body || typeof body !== "object" || !partida) {
    return { body, snapshot: options.previousSnapshot || null };
  }
  const node = currentNode(partida);
  const currentSnapshot = snapshot(partida);
  const currentMetrics = currentSnapshot.metrics;
  const route = structuredRoute(body.ruta_reciente, partida, node);
  const characters = visibleCharacters(partida, node);
  const focuses = focusPoints(node || {}, partida);
  const path = options.path || "";

  body.ubicacion_corta = node?.ubicacion_corta || shortLocationFallback(body.ubicacio);
  body.focos_consulta = focuses;
  body.personajes_escena = characters;
  body.ruta_reciente_estructurada = route;
  body.accions_ui = enrichActions(body.accions_ui, node, partida);
  body.accions = enrichActions(body.accions, node, partida);
  body.ui_state = {
    pressure: currentMetrics.pressure,
    relationship: currentMetrics.relationship,
    location_short: body.ubicacion_corta,
    focus_points: focuses,
    visible_characters: characters,
    route,
  };
  body.novedades_caso = path === "/accio"
    ? diffSnapshots(options.previousSnapshot, currentSnapshot, partida)
    : [];

  return { body, snapshot: currentSnapshot };
}

module.exports = {
  arr,
  characterIdForName,
  currentNode,
  diffSnapshots,
  enrichActions,
  enrichResponse,
  focusPoints,
  metrics,
  normalize,
  shortLocationFallback,
  snapshot,
  structuredRoute,
  visibleCharacters,
};
