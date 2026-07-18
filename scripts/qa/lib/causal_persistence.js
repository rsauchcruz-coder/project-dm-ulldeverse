"use strict";

const guidedState = require("../../../lib/guided_state");
const { adaptWorldV1, isWorldV1 } = require("../../../lib/world_v1_adapter");
const {
  analyzeWorld: analyzeCounterfactual,
  enumerateReachableStates,
  stateSignature,
  summarizeState,
  transition,
  visibleOptions,
} = require("./counterfactual_agency");

const REPORT_SCHEMA = "causal_persistence_report_v1";
const MAX_STATES = 100000;

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function tokenName(raw) {
  const match = String(raw || "").trim().match(/^([A-Za-z0-9_]+)/);
  return match ? match[1] : "";
}

function requirementTokens(value) {
  return [...guidedState.positiveRequirements(value), ...guidedState.absentRequirements(value)]
    .map(tokenName)
    .filter(Boolean);
}

function changesOf(option) {
  return option?.canvis_estat || {};
}

function addedTokens(option) {
  const changes = changesOf(option);
  const flags = changes.flags_set || {};
  return [...new Set([
    ...arr(changes.inventari_afegir),
    ...arr(changes.pistes_afegir),
    ...(Array.isArray(flags) ? flags : Object.keys(flags || {})),
    ...Object.keys(changes.variables_set || {}),
    ...Object.keys(changes.set_estado || {}),
  ].map(String))];
}

function removedTokens(option) {
  return arr(changesOf(option).inventari_treure).map(String);
}

function pressureDelta(option) {
  return Number(changesOf(option).pressio_delta || 0);
}

function pressureReader(value) {
  return value?.pressio_min !== undefined || value?.pressio_max !== undefined ||
    requirementTokens(value).some((token) => /^(pressio|presion)$/i.test(token));
}

function compatibleVariants(node, state) {
  return arr(node?.variants_ordenades)
    .slice()
    .sort((a, b) => Number(a?.ordre ?? a?.orden ?? 0) - Number(b?.ordre ?? b?.orden ?? 0))
    .filter((variant) => guidedState.conditionMatches(variant, state));
}

function effectiveVariant(node, state) {
  return compatibleVariants(node, state)[0] || null;
}

function finalProfile(node, state) {
  const resolved = guidedState.resolveNodeVariant(node, state);
  const value = resolved?.qa?.perfil_desenlace;
  if (!value) return null;
  return {
    beneficios: arr(value.beneficios).map(String).sort(),
    costes: arr(value.costes).map(String).sort(),
    postura: String(value.postura || ""),
  };
}

function finalSignature(node, state) {
  const resolved = guidedState.resolveNodeVariant(node, state);
  return JSON.stringify({
    variant: String(resolved?.__variant_id || "base"),
    profile: finalProfile(node, state),
  });
}

function optionLocations(guided) {
  const result = new Map();
  for (const node of arr(guided?.nodes)) {
    for (const option of arr(node?.opcions)) result.set(String(option.id), { node, option });
  }
  return result;
}

function issue(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra };
}

function isExcepted(world, code, fields) {
  return arr(world?.qa?.excepciones_persistencia_causal).some((entry) => {
    if (String(entry?.code || "") !== code || !String(entry?.motivo || "").trim()) return false;
    return ["token", "final", "promise", "option", "variable"].every((key) =>
      entry[key] === undefined || String(entry[key]) === String(fields[key] || "")
    );
  });
}

function optionPayoffKinds(option, token, siblings) {
  if (!requirementTokens(option).includes(token)) return [];
  const kinds = new Set(["menu"]);
  const changes = changesOf(option);
  if (pressureDelta(option) !== 0 || removedTokens(option).length) kinds.add("coste");
  if (arr(changes.pistes_afegir).length) kinds.add("informacion");
  if (Object.keys(changes.variables_set || {}).length) kinds.add("relacion");
  const target = String(option.node_seguent || "");
  if (target && !siblings.some((candidate) => candidate !== option && !requirementTokens(candidate).includes(token) && String(candidate.node_seguent || "") === target)) {
    kinds.add("acceso");
  }
  return [...kinds];
}

function downstreamEvidence(guided, byId, start, token, horizon) {
  const stack = [{ nodeId: start.target, state: clone(start.state), depth: 1 }];
  const seen = new Set();
  const evidence = [];
  let terminalWithoutPayoff = 0;
  while (stack.length) {
    const current = stack.pop();
    const key = `${current.nodeId}|${stateSignature(current.state)}|${current.depth}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > MAX_STATES) break;
    const node = byId.get(current.nodeId);
    if (!node) continue;

    const variant = effectiveVariant(node, current.state);
    if (variant && requirementTokens(variant).includes(token)) {
      evidence.push({ kind: node.es_final ? "variante_final" : "texto", node: node.id, id: variant.id, depth: current.depth });
      if (node.es_final) {
        const resolvedProfile = finalProfile(node, current.state);
        const baseProfile = node?.qa?.perfil_desenlace ? {
          beneficios: arr(node.qa.perfil_desenlace.beneficios).map(String).sort(),
          costes: arr(node.qa.perfil_desenlace.costes).map(String).sort(),
          postura: String(node.qa.perfil_desenlace.postura || ""),
        } : null;
        if (resolvedProfile && JSON.stringify(resolvedProfile) !== JSON.stringify(baseProfile)) {
          evidence.push({ kind: "perfil_final", node: node.id, id: variant.id, depth: current.depth });
        }
      }
    }
    if (node.es_final) {
      if (!evidence.length) terminalWithoutPayoff += 1;
      continue;
    }
    if (current.depth > horizon) continue;

    const siblings = visibleOptions(node, current.state);
    for (const option of siblings) {
      for (const kind of optionPayoffKinds(option, token, siblings)) {
        evidence.push({ kind, node: node.id, id: option.id, depth: current.depth });
      }
      const next = transition(guided, option, current.state);
      if (next.target && byId.has(next.target)) stack.push({ nodeId: next.target, state: next.state, depth: current.depth + 1 });
    }
  }
  const unique = [...new Map(evidence.map((entry) => [`${entry.kind}|${entry.node}|${entry.id || ""}`, entry])).values()];
  return { evidence: unique, terminalWithoutPayoff, truncated: seen.size > MAX_STATES };
}

function promiseFindings(world, guided, enumeration) {
  const findings = [];
  const metrics = [];
  const locations = optionLocations(guided);
  for (const promise of arr(world?.qa?.promesas_causales)) {
    const token = String(promise?.token || "");
    const origins = arr(promise?.origenes).map(String);
    const expected = new Set(arr(promise?.cobro_minimo).map(String));
    const horizon = Number(promise?.horizonte_max || 8);
    const witnesses = [];
    for (const record of enumeration.records) {
      if (record.node.es_final) continue;
      for (const option of visibleOptions(record.node, record.state)) {
        if (!origins.includes(String(option.id))) continue;
        const start = transition(guided, option, record.state);
        const downstream = downstreamEvidence(guided, enumeration.byId, start, token, horizon);
        const material = downstream.evidence.filter((entry) => entry.kind !== "texto");
        const accepted = expected.size ? material.filter((entry) => expected.has(entry.kind)) : material;
        witnesses.push({
          origin: option.id,
          history: [...record.history, option.id],
          state: summarizeState(start.state),
          evidence: downstream.evidence,
          accepted,
        });
      }
    }
    const missingOrigins = origins.filter((id) => !locations.has(id));
    const unpaid = witnesses.filter((entry) => !entry.accepted.length);
    metrics.push({ id: promise.id, token, witnesses: witnesses.length, paid: witnesses.length - unpaid.length, unpaid: unpaid.length });
    if (missingOrigins.length || !witnesses.length) {
      findings.push(issue("blocker", "PROMESA_SIN_ORIGEN_REAL", `La promesa ${promise.id} no tiene un origen alcanzable.`, { promise: promise.id, token, origins, missingOrigins }));
    } else if (unpaid.length === witnesses.length) {
      findings.push(issue("blocker", "PROMESA_NEUTRALIZADA", `La promesa ${promise.id} no conserva ningun cobro material dentro de H${horizon}.`, { promise: promise.id, token, witness: unpaid[0] }));
    } else if (unpaid.length) {
      findings.push(issue("warning", "PROMESA_COBRO_PARCIAL", `${unpaid.length} de ${witnesses.length} postestados de ${promise.id} llegan sin el cobro minimo declarado.`, { promise: promise.id, token, witness: unpaid[0] }));
    }

    const writers = [...locations.values()].filter(({ option }) => addedTokens(option).includes(token));
    const originDepths = enumeration.records.filter((record) => visibleOptions(record.node, record.state).some((option) => origins.includes(String(option.id)))).map((record) => record.depth);
    const firstOrigin = originDepths.length ? Math.min(...originDepths) : Infinity;
    for (const { node, option } of writers.filter(({ option }) => !origins.includes(String(option.id)))) {
      const depths = enumeration.records.filter((record) => record.node.id === node.id && visibleOptions(record.node, record.state).some((entry) => entry.id === option.id)).map((record) => record.depth);
      if (!depths.length || Math.min(...depths) <= firstOrigin) continue;
      const policy = String(promise?.sustitucion_tardia || "permitida");
      const cost = Math.max(0, pressureDelta(option)) + removedTokens(option).length;
      if (policy === "prohibida" || (policy === "solo_con_coste" && cost === 0)) {
        const fields = { promise: promise.id, token, option: option.id };
        if (!isExcepted(world, "SUSTITUCION_TARDIA_GRATUITA", fields)) {
          findings.push(issue("blocker", "SUSTITUCION_TARDIA_GRATUITA", `${option.id} entrega mas tarde ${token} sin el coste exigido por ${promise.id}.`, { ...fields, node: node.id, depth: Math.min(...depths) }));
        }
      }
    }
  }
  return { findings, metrics };
}

function sensitiveFinalFindings(world, guided, enumeration) {
  const findings = [];
  const promisedSensitive = new Set(
    arr(world?.qa?.promesas_causales).filter((promise) => promise?.estado_sensible_final).map((promise) => String(promise.token))
  );
  const declared = new Set([
    ...arr(world?.qa?.estados_sensibles_final),
    ...promisedSensitive,
  ].map(String));
  for (const token of declared) {
    const byFinal = new Map();
    for (const record of enumeration.records.filter((entry) => entry.node.es_final)) {
      if (!byFinal.has(record.node.id)) byFinal.set(record.node.id, []);
      byFinal.get(record.node.id).push(record);
    }
    for (const [finalId, records] of byFinal) {
      const present = records.filter((record) =>
        guidedState.tokenPresent(token, record.state) &&
        (!promisedSensitive.has(token) || !historyReadsToken(guided, enumeration.byId, enumeration.records[0], record, token))
      );
      const absent = records.filter((record) => !guidedState.tokenPresent(token, record.state));
      if (!present.length || !absent.length) continue;
      const presentSignatures = new Set(present.map((record) => finalSignature(record.node, record.state)));
      const absentSignatures = new Set(absent.map((record) => finalSignature(record.node, record.state)));
      const overlap = [...presentSignatures].filter((signature) => absentSignatures.has(signature));
      if (!overlap.length) continue;
      const fields = { token, final: finalId };
      if (isExcepted(world, "FINAL_IGNORA_ESTADO_SENSIBLE", fields)) continue;
      findings.push(issue("blocker", "FINAL_IGNORA_ESTADO_SENSIBLE", `${finalId} recibe ${token} presente y ausente con la misma variante y perfil.`, {
        ...fields,
        withToken: { history: present[0].history, state: summarizeState(present[0].state) },
        withoutToken: { history: absent[0].history, state: summarizeState(absent[0].state) },
      }));
    }
  }
  return findings;
}

function historyReadsToken(guided, byId, initialRecord, finalRecord, token) {
  if (!initialRecord) return false;
  let node = byId.get(initialRecord.node.id);
  let state = clone(initialRecord.state);
  for (const optionId of arr(finalRecord?.history)) {
    if (!node || node.es_final) break;
    const variant = effectiveVariant(node, state);
    if (variant && requirementTokens(variant).includes(token)) return true;
    const option = visibleOptions(node, state).find((entry) => String(entry.id) === String(optionId));
    if (!option) return false;
    if (requirementTokens(option).includes(token)) return true;
    const next = transition(guided, option, state);
    node = byId.get(next.target);
    state = next.state;
  }
  return false;
}

function shadowedVariantFindings(world, enumeration) {
  const findings = [];
  const keys = new Set([
    ...arr(world?.qa?.estados_sensibles_final),
    ...arr(world?.qa?.promesas_causales).map((promise) => promise.token),
    ...arr(world?.qa?.variables_relacionales).map((entry) => entry.variable),
  ].map(String));
  const effective = new Set();
  const shadowed = new Map();
  for (const record of enumeration.records) {
    const compatibles = compatibleVariants(record.node, record.state);
    if (!compatibles.length) continue;
    effective.add(`${record.node.id}|${compatibles[0].id}`);
    for (const variant of compatibles.slice(1)) {
      const reads = requirementTokens(variant).filter((token) => keys.has(token));
      if (!reads.length) continue;
      shadowed.set(`${record.node.id}|${variant.id}`, { node: record.node.id, variant: variant.id, tokens: reads, effective: compatibles[0].id, history: record.history });
    }
  }
  for (const [key, entry] of shadowed) {
    findings.push(issue(effective.has(key) ? "warning" : "blocker", "VARIANTE_SOMBREADA_CLAVE", `${entry.variant} queda tapada por ${entry.effective}${effective.has(key) ? " en parte de sus estados" : " en todos sus estados"}.`, entry));
  }
  return findings;
}

function findPressureReader(guided, enumeration, record, option) {
  const start = transition(guided, option, record.state);
  const stack = [{ nodeId: start.target, state: start.state, depth: 1 }];
  const visited = new Set();
  while (stack.length) {
    const current = stack.pop();
    const stateKey = `${current.nodeId}|${stateSignature(current.state)}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);
    const node = enumeration.byId.get(current.nodeId);
    if (!node) continue;
    const variant = effectiveVariant(node, current.state);
    if (variant && pressureReader(variant)) return { node: node.id, depth: current.depth, kind: "variant" };
    if (node.es_final) continue;
    for (const nextOption of visibleOptions(node, current.state)) {
      if (pressureReader(nextOption)) return { node: node.id, option: nextOption.id, depth: current.depth, kind: "option" };
      const next = transition(guided, nextOption, current.state);
      if (next.target) stack.push({ nodeId: next.target, state: next.state, depth: current.depth + 1 });
    }
  }
  return null;
}

function pressureFindings(world, guided, enumeration) {
  const findings = [];
  const groups = new Map();
  const declaredFinal = new Set(arr(world?.qa?.cobros_presion_final).map(String));
  for (const record of enumeration.records) {
    if (record.node.es_final) continue;
    for (const option of visibleOptions(record.node, record.state)) {
      if (!pressureDelta(option)) continue;
      const key = `${record.node.id}|${option.id}`;
      if (!groups.has(key)) groups.set(key, { node: record.node.id, option: option.id, records: [] });
      const group = groups.get(key);
      const stateKey = stateSignature(record.state);
      if (!group.records.some((entry) => entry.stateKey === stateKey)) group.records.push({ record, option, stateKey });
    }
  }

  let paid = 0;
  let partial = 0;
  for (const group of groups.values()) {
    const witnesses = group.records.map(({ record, option }) => ({ record, reader: findPressureReader(guided, enumeration, record, option) }));
    const paidStates = declaredFinal.has(String(group.option)) ? witnesses.length : witnesses.filter((entry) => entry.reader).length;
    if (paidStates === witnesses.length) {
      paid += 1;
      continue;
    }
    const severity = world?.qa?.presion_estricta ? "blocker" : "warning";
    const sample = witnesses.find((entry) => !entry.reader)?.record;
    if (paidStates) {
      partial += 1;
      findings.push(issue(severity, "DELTA_PRESION_COBRO_PARCIAL", `${group.node}/${group.option} cambia presion: se cobra en ${paidStates} de ${witnesses.length} postestados.`, {
        node: group.node, option: group.option, paidStates, totalStates: witnesses.length, history: sample?.history,
      }));
    } else {
      findings.push(issue(severity, "DELTA_PRESION_SIN_LECTOR_POSTERIOR", `${group.node}/${group.option} cambia presion, pero ningun estado posterior la consulta.`, {
        node: group.node, option: group.option, paidStates: 0, totalStates: witnesses.length, history: sample?.history,
      }));
    }
  }
  return { findings, metrics: { total: groups.size, paid, partial, unpaid: groups.size - paid - partial } };
}

function bandFor(value, bands) {
  return bands.find((band) => (band.min === undefined || value >= Number(band.min)) && (band.max === undefined || value <= Number(band.max))) || null;
}

function relationshipFindings(world, enumeration) {
  const findings = [];
  const metrics = [];
  for (const declaration of arr(world?.qa?.variables_relacionales)) {
    const variable = String(declaration?.variable || "");
    const perBand = new Map(arr(declaration?.bandas).map((band) => [String(band.id), { band, states: 0, options: new Set(), variants: new Set(), profiles: new Set() }]));
    for (const record of enumeration.records) {
      const value = Number(record.state?.variables?.[variable]);
      if (!Number.isFinite(value)) continue;
      const band = bandFor(value, arr(declaration?.bandas));
      if (!band) continue;
      const bucket = perBand.get(String(band.id));
      bucket.states += 1;
      for (const option of visibleOptions(record.node, record.state)) {
        if (requirementTokens(option).includes(variable)) bucket.options.add(option.id);
      }
      const variant = effectiveVariant(record.node, record.state);
      if (variant && requirementTokens(variant).includes(variable)) bucket.variants.add(`${record.node.id}:${variant.id}`);
      if (record.node.es_final) {
        const profile = finalProfile(record.node, record.state);
        if (profile) bucket.profiles.add(JSON.stringify(profile));
      }
    }
    const profileSignatures = new Set(
      [...perBand.values()].filter((bucket) => bucket.states).map((bucket) => JSON.stringify([...bucket.profiles].sort()))
    );
    const profilesAreDifferential = profileSignatures.size > 1;
    for (const [bandId, bucket] of perBand) {
      if (!bucket.states) continue;
      const differentialProfiles = profilesAreDifferential ? bucket.profiles.size : 0;
      const cashes = bucket.options.size + bucket.variants.size + differentialProfiles;
      const required = Number(declaration?.cobros_minimos_por_banda || 1);
      metrics.push({ variable, band: bandId, states: bucket.states, options: bucket.options.size, variants: bucket.variants.size, profiles: differentialProfiles });
      if (cashes < required) findings.push(issue("warning", "BANDA_RELACIONAL_SIN_COBRO", `${variable}/${bandId} es alcanzable, pero no tiene un cobro diferencial declarado.`, { variable, band: bandId, states: bucket.states }));
    }
  }
  return { findings, metrics };
}

function marginalResourceFindings(world) {
  const findings = [];
  const explicit = new Set(arr(world?.qa?.recursos_valor_marginal).map(String));
  const resources = new Set([...arr(world?.recursos).map((resource) => resource.id), ...explicit].map(String));
  if (!resources.size) return findings;
  const report = analyzeCounterfactual(world, { mode: "report", horizon: Number(world?.qa?.horizonte_valor_marginal || 3) });
  const sourceOptions = new Map(arr(world?.nodos).flatMap((node) => arr(node?.opciones).map((option) => [String(option.id), option])));
  const seen = new Set();
  for (const finding of report.findings.filter((entry) => entry.code === "ELECCION_FALSA" || entry.code === "EQUIVALENCIA_SUAVE")) {
    const [left, right] = finding.options.map((id) => sourceOptions.get(String(id)));
    if (!left || !right) continue;
    for (const resource of resources) {
      const a = requirementTokens(left).includes(resource);
      const b = requirementTokens(right).includes(resource);
      if (a === b) continue;
      const option = a ? left.id : right.id;
      const key = `${finding.node}|${resource}|${option}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(issue(explicit.has(resource) ? "blocker" : "warning", "RECURSO_SIN_VALOR_MARGINAL", `${option} usa ${resource}, pero frente a su alternativa solo conserva ${finding.code === "ELECCION_FALSA" ? "una diferencia muerta" : "una diferencia textual"}.`, {
        node: finding.node,
        option,
        resource,
        counterpart: a ? right.id : left.id,
        counterfactual: finding.code,
      }));
    }
  }
  return findings;
}

function finalProfileCoverageFindings(world) {
  const enabled = arr(world?.qa?.promesas_causales).length ||
    arr(world?.qa?.variables_relacionales).length ||
    arr(world?.qa?.estados_sensibles_final).length ||
    world?.qa?.perfiles_desenlace_estrictos;
  if (!enabled) return [];
  return arr(world?.finales)
    .filter((final) => !final?.qa?.perfil_desenlace)
    .map((final) => issue("blocker", "FINAL_SIN_PERFIL_DESENLACE", `${final.id} no declara beneficios, costes y postura verificables.`, { final: final.id }));
}

function inaccessibleOptionFindings(guided, enumeration) {
  const declared = new Map();
  for (const node of arr(guided?.nodes)) {
    if (node.es_final) continue;
    for (const option of arr(node?.opcions)) declared.set(String(option.id), node.id);
  }
  const visible = new Set();
  for (const record of enumeration.records) {
    for (const option of visibleOptions(record.node, record.state)) visible.add(String(option.id));
  }
  return [...declared.entries()]
    .filter(([id]) => !visible.has(id))
    .map(([option, node]) => issue("blocker", "OPCION_INALCANZABLE", `${option} no aparece en ningun estado legal del runtime.`, { node, option }));
}

function analyzeWorld(world, options = {}) {
  if (!isWorldV1(world)) throw new Error("qa:causal solo analiza world_v1.");
  const before = JSON.stringify(world);
  const guided = adaptWorldV1(world).guided_short_module;
  const enumeration = enumerateReachableStates(world, guided);
  const promises = promiseFindings(world, guided, enumeration);
  const pressure = pressureFindings(world, guided, enumeration);
  const relationships = relationshipFindings(world, enumeration);
  const findings = [
    ...inaccessibleOptionFindings(guided, enumeration),
    ...promises.findings,
    ...sensitiveFinalFindings(world, guided, enumeration),
    ...shadowedVariantFindings(world, enumeration),
    ...pressure.findings,
    ...marginalResourceFindings(world),
    ...relationships.findings,
    ...finalProfileCoverageFindings(world),
  ].filter((entry) => !isExcepted(world, entry.code, entry));
  if (JSON.stringify(world) !== before) throw new Error("El analisis causal ha mutado el mundo fuente.");
  const blockers = findings.filter((entry) => entry.severity === "blocker").length;
  const warnings = findings.filter((entry) => entry.severity === "warning").length;
  return {
    schema: REPORT_SCHEMA,
    world: world.id,
    mode: options.mode || "report",
    summary: { blockers, warnings, states: enumeration.records.length, promises: promises.metrics.length },
    metrics: { promises: promises.metrics, pressure: pressure.metrics, relationships: relationships.metrics },
    findings,
  };
}

module.exports = { REPORT_SCHEMA, analyzeWorld };
