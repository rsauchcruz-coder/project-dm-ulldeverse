"use strict";

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function valuesAsTokens(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === undefined || value === null || value === "") return [];
  if (typeof value !== "object") return [String(value)];
  return Object.entries(value).map(([name, expected]) => `${name}==${expected}`);
}

function requirementsToTokens(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === undefined || value === null || value === "") return [];
  if (typeof value !== "object") return [String(value)];

  const inventory = firstDefined(value.inventari, value.inventario, value.inventory);
  const clues = firstDefined(value.pista, value.pistas, value.pistes, value.clues);
  const flags = firstDefined(value.flag, value.flags);
  const variables = value.variables;
  const tokens = [
    ...valuesAsTokens(inventory),
    ...valuesAsTokens(clues),
    ...valuesAsTokens(flags),
  ];

  if (Array.isArray(variables)) tokens.push(...variables.filter(Boolean).map(String));
  else if (variables && typeof variables === "object") {
    for (const [key, expected] of Object.entries(variables)) tokens.push(`${key}==${expected}`);
  }

  return tokens;
}

function positiveRequirements(value) {
  if (Array.isArray(value) || typeof value === "string") return requirementsToTokens(value);
  if (!value || typeof value !== "object") return [];
  const wrapped = firstDefined(
    value.requereix,
    value.requisitos,
    value.requires,
    value.present,
    value.te,
    value.tiene
  );
  return requirementsToTokens(wrapped !== undefined ? wrapped : value);
}

function absentRequirements(value) {
  if (!value || typeof value !== "object") return [];
  const absent = firstDefined(
    value.requereix_absent,
    value.requisitos_ausentes,
    value.requisitos_absentes,
    value.requereix_no,
    value.requiere_no,
    value.requires_absent,
    value.absent
  );
  return requirementsToTokens(absent);
}

function stateValue(key, state) {
  if (["pressio", "presion", "pressure", "nivel_presion"].includes(key)) return Number(state.pressio ?? state.presion ?? 0);
  if (Object.prototype.hasOwnProperty.call(state.variables || {}, key)) return state.variables[key];
  if (Object.prototype.hasOwnProperty.call(state.flags || {}, key)) return state.flags[key];
  return undefined;
}

function parsedExpected(raw) {
  const value = String(raw).trim();
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  return value;
}

function compareValues(actual, operator, expectedRaw) {
  const expected = parsedExpected(expectedRaw);
  const bothNumbers = Number.isFinite(Number(actual)) && Number.isFinite(Number(expected));
  const left = bothNumbers ? Number(actual) : actual;
  const right = bothNumbers ? Number(expected) : expected;
  if (operator === "==") return left === right;
  if (operator === "!=") return left !== right;
  if (operator === ">=") return left >= right;
  if (operator === "<=") return left <= right;
  if (operator === ">") return left > right;
  if (operator === "<") return left < right;
  return false;
}

function tokenPresent(token, state) {
  const raw = String(token || "").trim();
  if (!raw) return true;
  const comparison = raw.match(/^([A-Za-z0-9_]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparison) return compareValues(stateValue(comparison[1], state), comparison[2], comparison[3]);
  if (raw.startsWith("inv_")) return (state.inventari_actual || []).includes(raw);
  if (raw.startsWith("pista_")) return (state.pistes_descobertes || []).includes(raw);
  if (raw.startsWith("flag_")) {
    const value = (state.flags || {})[raw];
    return value !== undefined && value !== false && value !== null;
  }
  return Boolean((state.flags || {})[raw]) ||
    (state.pistes_descobertes || []).includes(raw) ||
    (state.inventari_actual || []).includes(raw) ||
    Boolean((state.variables || {})[raw]);
}

function pressureBoundsOk(value, state) {
  if (!value || typeof value !== "object") return true;
  const min = firstDefined(value.presion_min, value.pressio_min, value.pressure_min);
  const max = firstDefined(value.presion_max, value.pressio_max, value.pressure_max);
  const pressure = Number(state.pressio ?? state.presion ?? 0);
  if (min !== undefined && pressure < Number(min)) return false;
  if (max !== undefined && pressure > Number(max)) return false;
  return true;
}

function conditionMatches(value, state) {
  if (Array.isArray(value) || typeof value === "string") {
    return requirementsToTokens(value).every((token) => tokenPresent(token, state));
  }
  if (!value || typeof value !== "object") return true;
  return positiveRequirements(value).every((token) => tokenPresent(token, state)) &&
    absentRequirements(value).every((token) => !tokenPresent(token, state)) &&
    pressureBoundsOk(value, state);
}

function optionVisible(option, state) {
  if (!option || typeof option !== "object") return false;
  if (!absentRequirements(option).every((token) => !tokenPresent(token, state))) return false;
  if (!pressureBoundsOk(option, state)) return false;
  const alternatives = firstDefined(
    option.requisitos_alternativos,
    option.requereix_alternatiu,
    option.alternative_requirements
  );
  if (!arr(alternatives).length) {
    return positiveRequirements(option).every((token) => tokenPresent(token, state));
  }
  return arr(alternatives).some((alternative) => conditionMatches(alternative, state));
}

function uniquePush(base, items) {
  const output = Array.isArray(base) ? base.slice() : [];
  for (const item of arr(items)) {
    if (item !== undefined && item !== null && String(item).trim() && !output.includes(item)) output.push(item);
  }
  return output;
}

function removeItems(base, items) {
  const removed = new Set(arr(items).map(String));
  return (Array.isArray(base) ? base : []).filter((item) => !removed.has(String(item)));
}

function activatedTokenDestination(token) {
  const value = String(token || "");
  if (value.startsWith("inv_")) return "inventory";
  if (value.startsWith("pista_")) return "clues";
  return "flags";
}

function activateTokens(state, tokens) {
  for (const token of arr(tokens)) {
    const destination = activatedTokenDestination(token);
    if (destination === "inventory") state.inventari_actual = uniquePush(state.inventari_actual, [token]);
    else if (destination === "clues") state.pistes_descobertes = uniquePush(state.pistes_descobertes, [token]);
    else state.flags = Object.assign({}, state.flags || {}, { [token]: true });
  }
}

function applyChanges(state, changes = {}, pressureRange = {}) {
  const minPressure = Number(pressureRange.min ?? state.pressio_min ?? 0);
  const maxPressure = Number(pressureRange.max ?? state.pressio_max ?? 10);
  const delta = Number(firstDefined(changes.pressio_delta, changes.presion_delta, changes.pressure_delta, 0)) || 0;
  const currentPressure = Number(state.pressio ?? state.presion ?? 0) || 0;
  state.pressio = Math.max(minPressure, Math.min(maxPressure, currentPressure + delta));

  const location = firstDefined(changes.ubicacio_nova, changes.ubicacion_nueva, changes.location_new);
  const normalizedLocation = String(location || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (location && normalizedLocation !== "la ubicacion se mantiene.") state.ubicacio = location;

  state.inventari_actual = removeItems(
    state.inventari_actual,
    firstDefined(changes.inventari_treure, changes.inventario_quitar, changes.inventory_remove, [])
  );
  state.inventari_actual = uniquePush(
    state.inventari_actual,
    firstDefined(changes.inventari_afegir, changes.inventario_agregar, changes.inventory_add, [])
  );
  state.pistes_descobertes = uniquePush(
    state.pistes_descobertes,
    firstDefined(changes.pistes_afegir, changes.pistas_agregar, changes.clues_add, [])
  );
  state.recursos_actius = uniquePush(
    state.recursos_actius,
    firstDefined(changes.recursos_activar, changes.resources_activate, [])
  );
  state.pnj_implicats = uniquePush(
    state.pnj_implicats,
    firstDefined(changes.pnj_implicats_afegir, changes.pnj_implicados_agregar, changes.npcs_add, [])
  );

  const rawFlags = firstDefined(changes.flags_set, changes.flags_establecer, {});
  const flags = Array.isArray(rawFlags)
    ? Object.fromEntries(rawFlags.map((flag) => [flag, true]))
    : (rawFlags || {});
  state.flags = Object.assign({}, state.flags || {}, flags);
  state.variables = Object.assign(
    {},
    state.variables || {},
    firstDefined(changes.variables_set, changes.variables_establecer, {}) || {}
  );

  const directState = firstDefined(changes.set_estado, changes.establecer_estado);
  if (directState && typeof directState === "object") state.variables = Object.assign({}, state.variables, directState);

  for (const rule of arr(firstDefined(changes.set_estado_si, changes.establecer_estado_si, []))) {
    if (conditionMatches({ requisitos: rule.si || [] }, state) && rule.estado) {
      state.variables = Object.assign({}, state.variables, rule.estado);
    }
  }
  for (const rule of arr(firstDefined(changes.activa_si, changes.activar_si, []))) {
    if (conditionMatches({ requisitos: rule.si || [] }, state)) activateTokens(state, rule.activa || rule.activar || []);
  }

  return state;
}

function variantOverlay(variant) {
  const source = variant?.sobrescriu || variant?.sobrescribe || variant?.campos || variant || {};
  const overlay = {};
  const mappings = [
    ["ubicacio", firstDefined(source.ubicacio, source.ubicacion)],
    ["situacio_visible", firstDefined(source.situacio_visible, source.situacion_visible)],
    ["text_base", firstDefined(source.text_base, source.texto_base)],
    ["pressio_visible", firstDefined(source.pressio_visible, source.presion_visible)],
    ["personatges_visibles", firstDefined(source.personatges_visibles, source.personajes_visibles)],
    ["entorn_visible", firstDefined(source.entorn_visible, source.entorno_visible)],
  ];
  for (const [key, value] of mappings) if (value !== undefined) overlay[key] = value;
  return overlay;
}

function resolveNodeVariant(node, state) {
  if (!node || typeof node !== "object") return node;
  const variants = firstDefined(node.variants_ordenades, node.variantes_ordenadas, node.ordered_variants, []);
  if (!Array.isArray(variants) || !variants.length) return node;
  const ordered = variants.map((variant, index) => ({ variant, index }))
    .sort((a, b) => Number(a.variant.orden ?? a.variant.order ?? a.index) - Number(b.variant.orden ?? b.variant.order ?? b.index));
  const match = ordered.find(({ variant }) => optionVisible(variant, state));
  if (!match) return node;
  return {
    ...node,
    ...variantOverlay(match.variant),
    opcions: node.opcions,
    opciones: node.opciones,
    __variant_id: match.variant.id || `variant_${match.index + 1}`,
  };
}

module.exports = {
  absentRequirements,
  applyChanges,
  conditionMatches,
  optionVisible,
  positiveRequirements,
  pressureBoundsOk,
  requirementsToTokens,
  resolveNodeVariant,
  tokenPresent,
};
