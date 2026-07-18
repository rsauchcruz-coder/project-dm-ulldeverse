"use strict";

const guidedState = require("../../../lib/guided_state");
const { adaptWorldV1, isWorldV1 } = require("../../../lib/world_v1_adapter");
const { enumerateReachableStates, summarizeState } = require("./counterfactual_agency");

const REPORT_SCHEMA = "resource_economy_report_v1";
const MAX_DOWNSTREAM_STATES = 20000;

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function stableString(value) {
  return JSON.stringify(stableObject(value));
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function tokenName(raw) {
  const match = String(raw || "").trim().match(/^([A-Za-z0-9_]+)/);
  return match ? match[1] : "";
}

function positiveTokens(value) {
  const tokens = new Set(guidedState.positiveRequirements(value).map(tokenName).filter(Boolean));
  for (const alternative of arr(value?.requisitos_alternativos)) {
    for (const token of guidedState.positiveRequirements(alternative?.requisitos || alternative?.requereix || alternative)) {
      if (tokenName(token)) tokens.add(tokenName(token));
    }
  }
  for (const rule of arr(value?.resolucio_ordenada || value?.resolucion_ordenada)) {
    for (const token of guidedState.requirementsToTokens(rule?.si || [])) {
      if (tokenName(token)) tokens.add(tokenName(token));
    }
  }
  return [...tokens];
}

function absentTokens(value) {
  return unique(guidedState.absentRequirements(value).map(tokenName));
}

function visibleOptions(node, state) {
  return arr(node?.opcions).filter((option) => guidedState.optionVisible(option, state));
}

function requirementsAbsentMatch(value, state) {
  return guidedState.requirementsToTokens(value).every((token) => !guidedState.tokenPresent(token, state));
}

function targetForOption(option, state) {
  const rules = arr(option?.resolucio_ordenada || option?.resolucion_ordenada)
    .slice()
    .sort((a, b) => Number(a?.orden || 0) - Number(b?.orden || 0));
  const rule = rules.find((entry) => guidedState.conditionMatches(entry?.si || [], state) && requirementsAbsentMatch(entry?.si_no || [], state));
  return String(rule?.hacia || rule?.node_seguent || rule?.destino || option?.node_seguent || "");
}

function transition(guided, option, state) {
  const next = clone(state);
  guidedState.applyChanges(next, option?.canvis_estat || {}, {
    min: Number(guided?.pressio_min ?? 0),
    max: Number(guided?.pressio_max ?? 10),
  });
  return { target: targetForOption(option, state), state: next };
}

function stateSignature(state) {
  return stableString(summarizeState(state));
}

function writtenTokens(option) {
  const changes = option?.canvis_estat || {};
  const flags = changes.flags_set || {};
  const variables = changes.variables_set || changes.set_estado || {};
  return unique([
    ...arr(changes.inventari_afegir),
    ...arr(changes.pistes_afegir),
    ...(Array.isArray(flags) ? flags : Object.keys(flags)),
    ...Object.keys(variables || {}),
  ]);
}

function allGlobalReads(guided) {
  const reads = new Set();
  for (const node of arr(guided?.nodes)) {
    for (const option of arr(node?.opcions)) positiveTokens(option).forEach((token) => reads.add(token));
    for (const variant of arr(node?.variants_ordenades)) positiveTokens(variant).forEach((token) => reads.add(token));
  }
  return reads;
}

function downstreamPayoff(token, start, guided, byId) {
  const stack = [{ nodeId: start.target, state: clone(start.state), depth: 0 }];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    const key = `${current.nodeId}|${stateSignature(current.state)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > MAX_DOWNSTREAM_STATES) return { found: false, truncated: true };
    const node = byId.get(current.nodeId);
    if (!node) continue;

    for (const variant of arr(node?.variants_ordenades)) {
      if (positiveTokens(variant).includes(token) && guidedState.optionVisible(variant, current.state)) {
        return { found: true, kind: "variante", id: variant.id || current.nodeId, depth: current.depth };
      }
    }
    if (node.es_final) continue;

    for (const option of visibleOptions(node, current.state)) {
      if (positiveTokens(option).includes(token)) {
        return { found: true, kind: "opcion", id: option.id, depth: current.depth + 1 };
      }
      const next = transition(guided, option, current.state);
      if (next.target && byId.has(next.target)) stack.push({ nodeId: next.target, state: next.state, depth: current.depth + 1 });
    }
  }
  return { found: false, truncated: false };
}

function pressureDelta(option) {
  return Number(option?.canvis_estat?.pressio_delta || 0);
}

function comparableChanges(option) {
  const changes = clone(option?.canvis_estat || {});
  delete changes.pressio_delta;
  return stableString(changes);
}

function subset(left, right) {
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function dominance(left, right, state) {
  if (targetForOption(left, state) !== targetForOption(right, state)) return null;
  if (comparableChanges(left) !== comparableChanges(right)) return null;
  const leftPositive = positiveTokens(left);
  const rightPositive = positiveTokens(right);
  const leftAbsent = absentTokens(left);
  const rightAbsent = absentTokens(right);
  const leftEasier = subset(leftPositive, rightPositive) && subset(leftAbsent, rightAbsent);
  const rightEasier = subset(rightPositive, leftPositive) && subset(rightAbsent, leftAbsent);
  const leftPressure = pressureDelta(left);
  const rightPressure = pressureDelta(right);

  if (leftEasier && leftPressure <= rightPressure && (leftPositive.length < rightPositive.length || leftAbsent.length < rightAbsent.length || leftPressure < rightPressure)) {
    return { winner: left, dominated: right, pressure: [leftPressure, rightPressure] };
  }
  if (rightEasier && rightPressure <= leftPressure && (rightPositive.length < leftPositive.length || rightAbsent.length < leftAbsent.length || rightPressure < leftPressure)) {
    return { winner: right, dominated: left, pressure: [rightPressure, leftPressure] };
  }
  return null;
}

function sourceNodes(world) {
  return [...arr(world?.nodos), ...arr(world?.finales)];
}

function canonicalRequirementTokens(option) {
  const values = arr(option?.requisitos);
  if (Array.isArray(option?.requisitos)) return unique(option.requisitos);
  return unique([
    ...arr(option?.requisitos?.inventario),
    ...arr(option?.requisitos?.pistas),
    ...arr(option?.requisitos?.flags),
  ]);
}

function resourceTerms(resource) {
  const name = normalize(resource?.nombre_visible || resource?.nombre || "");
  const explicit = arr(resource?.terminos_visibles).map(normalize);
  const first = name.split(/\s+/)[0] || "";
  return unique([name, ...explicit, first.length >= 4 && first !== "llave" ? first : ""]);
}

const USE_VERB = /\b(usar|usa|utiliza|utilizar|emplea|emplear|coloca|colocar|encaja|encajar|abre|abrir|enciende|encender|prende|prender|quema|quemar|corta|cortar|rompe|romper|muestra|mostrar|entrega|entregar|toca|tocar|golpea|golpear|apoya|apoyar|sujeta|sujetar|levanta|levantar|activa|activar|hace sonar|da dos toques|da un toque)\b/;

function optionUsesTerm(option, terms) {
  const text = normalize([option?.texto, option?.consecuencia].filter(Boolean).join(" "));
  return text.split(/[.!?\n]+/).some((sentence) => USE_VERB.test(sentence) && terms.some((term) => term && sentence.includes(term)));
}

function declaredNodeResources(node) {
  const result = new Set(arr(node?.recursos_escena));
  const byNpc = node?.recursos_pnj || {};
  for (const value of Object.values(byNpc)) arr(value).forEach((token) => result.add(String(token)));
  return result;
}

function exceptionFor(world, code, ids) {
  return arr(world?.qa?.excepciones_justificadas).find((entry) => {
    if (!entry || typeof entry !== "object" || String(entry.codigo || "") !== code) return false;
    const elements = new Set(arr(entry.elementos || entry.ids).map(String));
    return ids.every((id) => elements.has(String(id)));
  }) || null;
}

function finding(world, code, ids, payload) {
  const exception = exceptionFor(world, code, ids);
  return {
    code,
    severity: exception ? "aviso" : payload.severity || "bloqueo",
    justified: Boolean(exception),
    justification: exception?.motivo || "",
    ...payload,
  };
}

function finalFamily(node) {
  return String(node?.estado_resultante?.familia || node?.tipo || node?.tipus || node?.id || "final");
}

function resourceBreadth(world, enumeration, guided) {
  const optionResources = new Map();
  for (const node of arr(guided?.nodes)) {
    for (const option of arr(node?.opcions)) {
      optionResources.set(option.id, positiveTokens(option).filter((token) => token.startsWith("inv_")));
    }
  }
  const details = new Map(arr(world?.recursos).map((resource) => [String(resource.id), {
    resource: String(resource.id), uses: new Set(), families: new Set(), routes: new Set(),
  }]));
  for (const record of enumeration.records.filter((entry) => entry.node?.es_final)) {
    const used = new Set();
    for (const optionId of record.history) {
      for (const resource of optionResources.get(optionId) || []) {
        used.add(resource);
        details.get(resource)?.uses.add(optionId);
      }
    }
    for (const resource of used) {
      const entry = details.get(resource);
      if (!entry) continue;
      entry.families.add(finalFamily(record.node));
      if (record.route) entry.routes.add(record.route);
    }
  }
  return [...details.values()].map((entry) => ({
    resource: entry.resource,
    uses: [...entry.uses].sort(),
    final_families: [...entry.families].sort(),
    routes: [...entry.routes].sort(),
  }));
}

function analyzeWorld(world, options = {}) {
  if (!isWorldV1(world)) throw new Error("El control solo acepta schema_version world_v1.");
  const before = JSON.stringify(world);
  const mode = options.mode || "report";
  if (!["report", "gate"].includes(mode)) throw new Error("Modo valido: report o gate.");
  const guided = adaptWorldV1(world).guided_short_module;
  const enumeration = enumerateReachableStates(world, guided, options);
  const byId = enumeration.byId;
  const findings = [];
  const globalReads = allGlobalReads(guided);
  const declaredPreparations = new Set([
    ...arr(world?.qa?.estados_clave),
    ...arr(world?.qa?.preparaciones_clave),
  ].map(String));
  const dominanceSeen = new Set();
  const payoffSeen = new Set();

  for (const record of enumeration.records) {
    if (record.node?.es_final) continue;
    const optionsVisible = visibleOptions(record.node, record.state);
    for (let left = 0; left < optionsVisible.length; left += 1) {
      for (let right = left + 1; right < optionsVisible.length; right += 1) {
        const result = dominance(optionsVisible[left], optionsVisible[right], record.state);
        if (!result) continue;
        const key = `${record.node.id}|${result.winner.id}|${result.dominated.id}`;
        if (dominanceSeen.has(key)) continue;
        dominanceSeen.add(key);
        findings.push(finding(world, "OPCION_DOMINADA_MECANICAMENTE", [result.winner.id, result.dominated.id], {
          node: record.node.id,
          options: [result.winner.id, result.dominated.id],
          evidence: `${result.dominated.id} exige igual o mas, aumenta la presion ${result.pressure[1]} frente a ${result.pressure[0]} y conserva el mismo destino y cambios observables.`,
          witness_history: record.history,
        }));
      }
    }

    for (const option of optionsVisible) {
      const next = transition(guided, option, record.state);
      for (const token of writtenTokens(option).filter((entry) =>
        globalReads.has(entry) && (!entry.startsWith("pista_") || declaredPreparations.has(entry)))) {
        const key = `${option.id}|${token}|${stateSignature(next.state)}`;
        if (payoffSeen.has(key)) continue;
        payoffSeen.add(key);
        const payoff = downstreamPayoff(token, next, guided, byId);
        if (!payoff.found && !payoff.truncated) {
          findings.push(finding(world, "PREPARACION_INCOBRABLE", [option.id, token], {
            node: record.node.id,
            option: option.id,
            token,
            evidence: `${token} se prepara aqui y se consulta en el mundo, pero ninguna continuacion alcanzable desde este estado puede cobrarlo.`,
            witness_history: record.history,
            witness_state: summarizeState(record.state),
          }));
        }
      }
    }
  }

  const initialInventory = new Set(arr(world?.estado_inicial?.inventario).map(String));
  for (const resource of arr(world?.recursos)) {
    const custody = String(resource?.custodia_inicial || "");
    if (!custody) {
      findings.push(finding(world, "CUSTODIA_NO_DECLARADA", [resource.id], {
        severity: mode === "gate" ? "bloqueo" : "aviso",
        resource: resource.id,
        evidence: "El recurso no declara si empieza bajo control del jugador, en escena, en manos de un PNJ o fuera de escena.",
      }));
    } else if ((custody === "jugador") !== initialInventory.has(String(resource.id))) {
      findings.push(finding(world, "CUSTODIA_INICIAL_INCONSISTENTE", [resource.id], {
        resource: resource.id,
        evidence: `${resource.id} declara custodia ${custody}, pero el inventario inicial ${initialInventory.has(String(resource.id)) ? "si" : "no"} lo contiene.`,
      }));
    }
  }

  for (const node of sourceNodes(world)) {
    const available = declaredNodeResources(node);
    for (const option of arr(node?.opciones)) {
      const required = new Set(canonicalRequirementTokens(option));
      const acquired = new Set(arr(option?.cambios_estado?.inventario_agregar).map(String));
      const sources = option?.fuentes_recursos || {};
      for (const resource of arr(world?.recursos)) {
        if (!optionUsesTerm(option, resourceTerms(resource))) continue;
        const token = String(resource.id);
        if (required.has(token) || acquired.has(token) || available.has(token) || Object.prototype.hasOwnProperty.call(sources, token)) continue;
        findings.push(finding(world, "CUSTODIA_AMBIGUA_EN_ACCION", [option.id, token], {
          node: node.id,
          option: option.id,
          resource: token,
          evidence: `La accion usa ${resource.nombre_visible || token}, pero no exige su inventario ni declara una fuente de escena o PNJ.`,
        }));
      }
    }
  }

  const breadth = resourceBreadth(world, enumeration, guided);
  const activeBreadth = breadth.filter((entry) => entry.uses.length && entry.final_families.length);
  if (activeBreadth.length >= 3) {
    const min = Math.min(...activeBreadth.map((entry) => entry.final_families.length));
    const max = Math.max(...activeBreadth.map((entry) => entry.final_families.length));
    if (max >= 2 && min <= 1) {
      findings.push({
        code: "FLEXIBILIDAD_DESIGUAL_DE_RECURSOS",
        severity: "aviso",
        evidence: `La amplitud de familias finales por recurso oscila entre ${min} y ${max}. El Director debe confirmar que la asimetria compensa profundidad, coste o riesgo.`,
      });
    }
  }

  const deduped = [...new Map(findings.map((entry) => [stableString({ code: entry.code, node: entry.node, option: entry.option, options: entry.options, token: entry.token, resource: entry.resource }), entry])).values()];
  const summary = {
    reachable_states: enumeration.records.length,
    blockers: deduped.filter((entry) => entry.severity === "bloqueo").length,
    warnings: deduped.filter((entry) => entry.severity === "aviso").length,
    dominated_options: deduped.filter((entry) => entry.code === "OPCION_DOMINADA_MECANICAMENTE" && !entry.justified).length,
    stranded_preparations: deduped.filter((entry) => entry.code === "PREPARACION_INCOBRABLE" && !entry.justified).length,
    custody_findings: deduped.filter((entry) => entry.code.startsWith("CUSTODIA_") && !entry.justified).length,
  };
  if (JSON.stringify(world) !== before) throw new Error("El analisis ha mutado el mundo fuente.");
  return { schema: REPORT_SCHEMA, world: world.id, mode, summary, resource_breadth: breadth, findings: deduped };
}

module.exports = { REPORT_SCHEMA, analyzeWorld };
