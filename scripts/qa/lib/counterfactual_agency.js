"use strict";

const guidedState = require("../../../lib/guided_state");
const { adaptWorldV1, isWorldV1 } = require("../../../lib/world_v1_adapter");

const REPORT_SCHEMA = "counterfactual_agency_report_v2";
const DEFAULT_HORIZON = 3;
const MAX_ENUM_STATES = 100000;
const MAX_WITNESS_EXAMPLES = 5;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function sortedUnique(values) {
  return [...new Set(arr(values).filter(Boolean).map(String))].sort();
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function stableString(value) {
  return JSON.stringify(stableObject(value));
}

function initialState(guided) {
  const source = guided.estat_inicial_guiat || {};
  return {
    pressio: Number(source.pressio_inicial ?? 0),
    pressio_min: Number(guided.pressio_min ?? 0),
    pressio_max: Number(guided.pressio_max ?? 10),
    inventari_actual: clone(source.inventari_inicial || []),
    pistes_descobertes: clone(source.pistes_descobertes || []),
    recursos_actius: clone(source.recursos_actius || []),
    pnj_implicats: clone(source.pnj_implicats || []),
    variables: clone(source.variables || {}),
    flags: clone(source.flags || {}),
  };
}

function summarizeState(state) {
  return {
    inventory: sortedUnique(state.inventari_actual),
    clues: sortedUnique(state.pistes_descobertes),
    flags: stableObject(state.flags || {}),
    variables: stableObject(state.variables || {}),
    pressure: Number(state.pressio ?? 0),
  };
}

function stateSignature(state) {
  return stableString(summarizeState(state));
}

function visibleOptions(node, state) {
  return (node?.opcions || []).filter((option) => guidedState.optionVisible(option, state));
}

function requirementsAbsentMatch(value, state) {
  return guidedState.requirementsToTokens(value).every((token) => !guidedState.tokenPresent(token, state));
}

function conditionalRule(option, state) {
  const rules = arr(option?.resolucio_ordenada || option?.resolucion_ordenada)
    .slice()
    .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));
  return rules.find((rule) => guidedState.conditionMatches(rule.si || [], state) && requirementsAbsentMatch(rule.si_no || [], state)) || null;
}

function targetForOption(option, state) {
  const rule = conditionalRule(option, state);
  return String(rule?.hacia || rule?.node_seguent || rule?.destino || option?.node_seguent || "");
}

function transition(guided, option, state) {
  const target = targetForOption(option, state);
  const nextState = clone(state);
  guidedState.applyChanges(nextState, option.canvis_estat || {}, {
    min: guided.pressio_min,
    max: guided.pressio_max,
  });
  return { target, state: nextState };
}

function routeDefinitions(world) {
  const entries = world.qa?.rutas_principales || [];
  return new Map(entries.map((route) => [String(route.entrada || ""), String(route.id || "")]).filter(([entry]) => entry));
}

function enumerateReachableStates(world, guided, options = {}) {
  const byId = new Map(guided.nodes.map((node) => [node.id, node]));
  const initialNode = guided.estat_inicial_guiat.node_inicial;
  const maxDepth = Number(options.maxDepth || Math.max(20, Number(world.qa?.duracion_objetivo?.max || 0) + 5));
  const maxStates = Number(options.maxStates || MAX_ENUM_STATES);
  const routeByEntry = routeDefinitions(world);
  const stack = [{
    nodeId: initialNode,
    state: initialState(guided),
    depth: 0,
    route: "",
    history: [],
  }];
  const seen = new Set();
  const records = [];

  while (stack.length) {
    const current = stack.pop();
    const key = `${current.nodeId}|${stateSignature(current.state)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > maxStates) throw new Error(`La enumeracion supera ${maxStates} estados.`);
    const node = byId.get(current.nodeId);
    if (!node) throw new Error(`Destino inexistente: ${current.nodeId}`);
    records.push({ ...current, node });
    if (node.es_final || current.depth >= maxDepth) continue;

    for (const option of visibleOptions(node, current.state)) {
      const next = transition(guided, option, current.state);
      if (!next.target || !byId.has(next.target)) throw new Error(`Destino inexistente en ${node.id}/${option.id}: ${next.target || "(vacio)"}`);
      stack.push({
        nodeId: next.target,
        state: next.state,
        depth: current.depth + 1,
        route: current.route || routeByEntry.get(option.id) || "",
        history: [...current.history, option.id],
      });
    }
  }
  return { records, byId };
}

function pairKey(ids) {
  return ids.map(String).sort().join("|");
}

function collectPairWitnesses(records) {
  const witnesses = new Map();
  for (const record of records) {
    if (record.node.es_final) continue;
    const options = visibleOptions(record.node, record.state);
    for (let left = 0; left < options.length; left += 1) {
      for (let right = left + 1; right < options.length; right += 1) {
        const pair = [options[left].id, options[right].id];
        const key = pairKey(pair);
        if (!witnesses.has(key)) witnesses.set(key, new Map());
        const states = witnesses.get(key);
        const stateKey = stateSignature(record.state);
        if (!states.has(stateKey)) states.set(stateKey, {
          key,
          node: record.node,
          state: clone(record.state),
          route: record.route,
          history: record.history.slice(),
          options: [options[left], options[right]],
        });
      }
    }
  }
  return witnesses;
}

function allOptionLocations(guided) {
  const result = new Map();
  for (const node of guided.nodes) {
    for (const option of node.opcions || []) result.set(option.id, { node, option });
  }
  return result;
}

function tokenName(raw) {
  const match = String(raw || "").trim().match(/^([A-Za-z0-9_]+)/);
  return match ? match[1] : "";
}

function requirementTokens(value) {
  return [
    ...guidedState.positiveRequirements(value),
    ...guidedState.absentRequirements(value),
  ].map(tokenName).filter(Boolean);
}

function optionMechanicalTokens(option) {
  const tokens = new Set(requirementTokens(option));
  for (const alternative of arr(option.requisitos_alternativos)) {
    for (const token of requirementTokens(alternative)) tokens.add(token);
  }
  for (const rule of arr(option.resolucio_ordenada || option.resolucion_ordenada)) {
    for (const token of guidedState.requirementsToTokens(rule.si || [])) tokens.add(tokenName(token));
    for (const token of guidedState.requirementsToTokens(rule.si_no || [])) tokens.add(tokenName(token));
  }
  if (option.pressio_min !== undefined || option.pressio_max !== undefined) tokens.add("pressio");
  return [...tokens].filter(Boolean);
}

function variantTokens(variant) {
  const tokens = new Set(requirementTokens(variant));
  if (variant.pressio_min !== undefined || variant.pressio_max !== undefined) tokens.add("pressio");
  return [...tokens].filter(Boolean);
}

function staticTargets(node) {
  const targets = new Set();
  for (const option of node?.opcions || []) {
    if (option.node_seguent) targets.add(String(option.node_seguent));
    for (const rule of arr(option.resolucio_ordenada || option.resolucion_ordenada)) {
      const target = rule.hacia || rule.node_seguent || rule.destino;
      if (target) targets.add(String(target));
    }
  }
  return [...targets];
}

function reachableDepths(byId, startNode) {
  const depths = new Map();
  const queue = [{ id: startNode, depth: 1 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current.id || !byId.has(current.id)) continue;
    if (depths.has(current.id) && depths.get(current.id) <= current.depth) continue;
    depths.set(current.id, current.depth);
    if (current.depth > 50) continue;
    for (const target of staticTargets(byId.get(current.id))) queue.push({ id: target, depth: current.depth + 1 });
  }
  return depths;
}

function tokenUsesFrom(byId, startNodes) {
  const uses = new Map();
  function add(token, type, depth, node) {
    if (!token) return;
    const entry = uses.get(token) || { mechanical: Infinity, textual: Infinity, final: Infinity, nodes: new Set() };
    entry[type] = Math.min(entry[type], depth);
    entry.nodes.add(node);
    uses.set(token, entry);
  }

  for (const start of sortedUnique(startNodes)) {
    for (const [id, depth] of reachableDepths(byId, start)) {
      const node = byId.get(id);
      for (const option of node.opcions || []) {
        for (const token of optionMechanicalTokens(option)) add(token, "mechanical", depth, id);
      }
      for (const variant of node.variants_ordenades || []) {
        for (const token of variantTokens(variant)) add(token, node.es_final ? "final" : "textual", depth, id);
      }
      if (node.es_final && node.condiciones) {
        const raw = JSON.stringify(node.condiciones);
        for (const token of raw.match(/(?:inv|pista|flag)_[A-Za-z0-9_]+|pressio|presion/g) || []) add(tokenName(token), "final", depth, id);
      }
    }
  }
  return uses;
}

function mapDifferences(left, right, kind) {
  const result = [];
  const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  for (const key of [...keys].sort()) {
    if (stableString(left?.[key]) !== stableString(right?.[key])) {
      result.push({ field: kind, token: key, left: left?.[key], right: right?.[key] });
    }
  }
  return result;
}

function arrayDifferences(left, right, kind) {
  const a = new Set(sortedUnique(left));
  const b = new Set(sortedUnique(right));
  const tokens = new Set([...a, ...b]);
  return [...tokens].filter((token) => a.has(token) !== b.has(token)).sort().map((token) => ({
    field: kind,
    token,
    left: a.has(token),
    right: b.has(token),
  }));
}

function stateDifferences(left, right) {
  const differences = [
    ...arrayDifferences(left.inventari_actual, right.inventari_actual, "inventory"),
    ...arrayDifferences(left.pistes_descobertes, right.pistes_descobertes, "clues"),
    ...mapDifferences(left.flags, right.flags, "flags"),
    ...mapDifferences(left.variables, right.variables, "variables"),
  ];
  if (Number(left.pressio ?? 0) !== Number(right.pressio ?? 0)) {
    differences.push({ field: "pressure", token: "pressio", left: Number(left.pressio ?? 0), right: Number(right.pressio ?? 0) });
  }
  return differences;
}

function finalFamily(node) {
  return String(node?.estado_resultante?.familia || node?.tipus || node?.tipo_node || "final");
}

function frontierKey(item) {
  return `${item.nodeId}|${stateSignature(item.state)}`;
}

function levelSignature(frontier, byId) {
  const nodes = new Set();
  const sceneVariants = new Set();
  const finalVariants = new Set();
  const finals = new Set();
  const finalFamilies = new Set();
  const menus = new Map();
  const states = new Set();

  for (const item of frontier) {
    const node = byId.get(item.nodeId);
    if (!node) continue;
    nodes.add(node.id);
    states.add(stateSignature(item.state));
    const resolved = guidedState.resolveNodeVariant(node, item.state);
    if (resolved.__variant_id) {
      const label = `${node.id}:${resolved.__variant_id}`;
      if (node.es_final) finalVariants.add(label);
      else sceneVariants.add(label);
    }
    if (node.es_final) {
      finals.add(node.id);
      finalFamilies.add(finalFamily(node));
    } else {
      const ids = visibleOptions(node, item.state).map((option) => option.id).sort();
      const current = menus.get(node.id) || new Set();
      current.add(ids.join("|"));
      menus.set(node.id, current);
    }
  }

  return {
    nodes: [...nodes].sort(),
    menus: [...menus.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([node, values]) => ({ node, options: [...values].sort() })),
    variants: [...sceneVariants, ...finalVariants].sort(),
    scene_variants: [...sceneVariants].sort(),
    final_variants: [...finalVariants].sort(),
    finals: [...finals].sort(),
    final_families: [...finalFamilies].sort(),
    states: [...states].sort(),
  };
}

function expandFrontier(guided, frontier, byId) {
  const next = [];
  const seen = new Set();
  for (const item of frontier) {
    const node = byId.get(item.nodeId);
    if (!node || node.es_final) continue;
    for (const option of visibleOptions(node, item.state)) {
      const moved = transition(guided, option, item.state);
      if (!moved.target || !byId.has(moved.target)) continue;
      const entry = { nodeId: moved.target, state: moved.state };
      const key = frontierKey(entry);
      if (!seen.has(key)) {
        seen.add(key);
        next.push(entry);
      }
    }
  }
  return next;
}

function horizonSignatures(guided, byId, branch, horizon) {
  const result = {};
  let frontier = [{ nodeId: branch.target, state: branch.state }];
  for (let depth = 1; depth <= horizon; depth += 1) {
    result[`H${depth}`] = levelSignature(frontier, byId);
    frontier = expandFrontier(guided, frontier, byId);
  }
  return result;
}

function menuCapabilities(signature) {
  return sortedUnique((signature?.menus || []).flatMap((entry) => entry.options || []));
}

function levelDivergences(left, right, horizon) {
  const mechanical = [];
  const textual = [];
  for (let depth = 1; depth <= horizon; depth += 1) {
    const key = `H${depth}`;
    const a = left[key];
    const b = right[key];
    if (stableString(menuCapabilities(a)) !== stableString(menuCapabilities(b))) mechanical.push({ depth, kind: "MENU" });
    if (
      stableString(a.finals) !== stableString(b.finals) ||
      stableString(a.final_families) !== stableString(b.final_families) ||
      stableString(a.final_variants) !== stableString(b.final_variants)
    ) {
      mechanical.push({ depth, kind: "FINAL" });
    }
    if (stableString(a.scene_variants) !== stableString(b.scene_variants)) textual.push({ depth, kind: "TEXTO" });
    if (stableString(a.nodes) !== stableString(b.nodes)) textual.push({ depth, kind: "TOPOLOGIA" });
  }
  return { mechanical, textual };
}

function differenceDisposition(differences, uses) {
  const mechanical = [];
  const textual = [];
  const ignored = [];
  for (const difference of differences) {
    const usage = uses.get(difference.token);
    if (usage && (Number.isFinite(usage.mechanical) || Number.isFinite(usage.final))) {
      mechanical.push({
        ...difference,
        depth: Math.min(usage.mechanical, usage.final),
        reason: Number.isFinite(usage.final) && usage.final <= usage.mechanical ? "future_final_read" : "future_mechanical_read",
      });
    } else if (usage && Number.isFinite(usage.textual)) {
      textual.push({ ...difference, depth: usage.textual, reason: "future_text_variant" });
    } else {
      ignored.push({
        field: difference.field,
        token: difference.token,
        left: difference.left,
        right: difference.right,
        reason: difference.field === "pressure" ? "no_future_read" : "dead_state_difference",
      });
    }
  }
  return { mechanical, textual, ignored };
}

function observationalDisposition(disposition, levelDiff) {
  const hasMechanical = levelDiff.mechanical.length > 0;
  const hasTextual = levelDiff.textual.length > 0;
  const relevant = [];
  const textual = [];
  const ignored = disposition.ignored.slice();

  if (hasMechanical) {
    relevant.push(...disposition.mechanical.map((entry) => ({
      ...entry,
      syntactic_reason: entry.reason,
      reason: "observable_resolution_change",
    })));
    textual.push(...disposition.textual);
  } else if (hasTextual) {
    textual.push(...[...disposition.mechanical, ...disposition.textual].map((entry) => ({
      ...entry,
      syntactic_reason: entry.reason,
      reason: "observable_text_only",
    })));
  } else {
    ignored.push(...[...disposition.mechanical, ...disposition.textual].map((entry) => ({
      field: entry.field,
      token: entry.token,
      left: entry.left,
      right: entry.right,
      reason: "no_observable_divergence",
      syntactic_reason: entry.reason,
    })));
  }

  return { relevant, textual, ignored };
}

function candidateLabel(candidate) {
  const depth = Number(candidate.depth || 1);
  return `H${depth}_${candidate.kind || "ESTADO"}`;
}

function firstCandidate(candidates) {
  const priority = { MENU: 0, FINAL: 1, ESTADO: 2, TEXTO: 3, TOPOLOGIA: 4 };
  return candidates.slice().sort((a, b) => Number(a.depth || 1) - Number(b.depth || 1) || (priority[a.kind || "ESTADO"] ?? 9) - (priority[b.kind || "ESTADO"] ?? 9))[0] || null;
}

function signaturesPayload(branchA, branchB, levelsA, levelsB, horizon) {
  const result = {
    H0: {
      A: { target: branchA.target, state: summarizeState(branchA.state) },
      B: { target: branchB.target, state: summarizeState(branchB.state) },
    },
  };
  for (let depth = 1; depth <= horizon; depth += 1) {
    result[`H${depth}`] = { A: levelsA[`H${depth}`], B: levelsB[`H${depth}`] };
  }
  return result;
}

function evaluateWitness(world, guided, byId, witness, horizon) {
  const [optionA, optionB] = witness.options;
  const branchA = transition(guided, optionA, witness.state);
  const branchB = transition(guided, optionB, witness.state);
  const starts = [branchA.target, branchB.target];
  const uses = tokenUsesFrom(byId, starts);
  const syntacticDisposition = differenceDisposition(stateDifferences(branchA.state, branchB.state), uses);
  const levelsA = horizonSignatures(guided, byId, branchA, horizon);
  const levelsB = horizonSignatures(guided, byId, branchB, horizon);
  const levelDiff = levelDivergences(levelsA, levelsB, horizon);
  const disposition = observationalDisposition(syntacticDisposition, levelDiff);
  const mechanicalCandidates = levelDiff.mechanical;
  const textualCandidates = levelDiff.textual;

  let code;
  let severity;
  let first;
  if (mechanicalCandidates.length) {
    code = "CONVERGENCIA_LEGITIMA";
    severity = "apto";
    first = firstCandidate(mechanicalCandidates);
  } else if (textualCandidates.length) {
    code = "EQUIVALENCIA_SUAVE";
    severity = "aviso";
    first = firstCandidate(textualCandidates);
  } else {
    code = "ELECCION_FALSA";
    severity = "bloqueo";
    first = null;
  }

  return {
    code,
    severity,
    node: witness.node.id,
    route: witness.route || "",
    options: [optionA.id, optionB.id],
    option_texts: [optionA.text, optionB.text],
    witness_state: summarizeState(witness.state),
    witness_history: witness.history,
    witness_count: 1,
    routes: witness.route ? [witness.route] : [],
    witnesses: [{
      route: witness.route || "",
      state: summarizeState(witness.state),
      history: witness.history.slice(),
    }],
    first_divergence: first ? candidateLabel(first) : null,
    signatures: signaturesPayload(branchA, branchB, levelsA, levelsB, horizon),
    observable_differences: {
      mechanical: levelDiff.mechanical,
      textual: levelDiff.textual,
    },
    relevant_state_differences: disposition.relevant,
    textual_state_differences: disposition.textual,
    ignored_differences: disposition.ignored,
    evidence: code === "ELECCION_FALSA"
      ? "Las opciones aparecen juntas y no conservan diferencias relevantes en el horizonte analizado."
      : code === "EQUIVALENCIA_SUAVE"
        ? "La presentacion posterior cambia, pero no cambian menus, capacidades ni finales detectables."
        : "La decision conserva una diferencia en menus, estado util o desenlaces.",
    director_question: code === "CONVERGENCIA_LEGITIMA" ? "La diferencia detectada corresponde a la promesa de ambas opciones?" : "Que diferencia deberia sobrevivir entre estas dos posturas?",
  };
}

function behaviorSignature(finding, horizon) {
  const levels = {};
  for (let depth = 1; depth <= horizon; depth += 1) {
    const key = `H${depth}`;
    levels[key] = {
      nodes_equal: stableString(finding.signatures[key].A.nodes) === stableString(finding.signatures[key].B.nodes),
      menus_equal: stableString(finding.signatures[key].A.menus) === stableString(finding.signatures[key].B.menus),
      scene_variants_equal: stableString(finding.signatures[key].A.scene_variants) === stableString(finding.signatures[key].B.scene_variants),
      finals_equal: stableString({
        ids: finding.signatures[key].A.finals,
        families: finding.signatures[key].A.final_families,
        variants: finding.signatures[key].A.final_variants,
      }) === stableString({
        ids: finding.signatures[key].B.finals,
        families: finding.signatures[key].B.final_families,
        variants: finding.signatures[key].B.final_variants,
      }),
    };
  }
  return stableString({
    code: finding.code,
    first_divergence: finding.first_divergence,
    targets_equal: finding.signatures.H0.A.target === finding.signatures.H0.B.target,
    levels,
  });
}

function mergeFindingWitnesses(target, source) {
  const seen = new Set((target.witnesses || []).map((entry) => stableString(entry)));
  for (const witness of source.witnesses || []) {
    const key = stableString(witness);
    if (!seen.has(key) && target.witnesses.length < MAX_WITNESS_EXAMPLES) {
      seen.add(key);
      target.witnesses.push(witness);
    }
  }
  target.witness_count = Number(target.witness_count || 0) + Number(source.witness_count || 0);
  target.routes = sortedUnique([...(target.routes || []), ...(source.routes || [])]);
  return target;
}

function nonComparableFinding(pair, locations) {
  const first = locations.get(pair[0]);
  const second = locations.get(pair[1]);
  return {
    code: "NO_COMPARAR_NO_COVISIBLES",
    severity: "apto",
    node: first?.node?.id === second?.node?.id ? first.node.id : "",
    route: "",
    options: pair.slice(),
    option_texts: [first?.option?.text || "", second?.option?.text || ""],
    witness_state: null,
    witness_history: [],
    witness_count: 0,
    routes: [],
    witnesses: [],
    first_divergence: "VISIBILIDAD",
    signatures: null,
    observable_differences: { mechanical: [], textual: [] },
    relevant_state_differences: [],
    textual_state_differences: [],
    ignored_differences: [],
    evidence: "No existe ningun estado alcanzable donde ambas opciones sean visibles a la vez.",
    director_question: "Ninguna: la pareja no compite ante el jugador.",
  };
}

function requestedPairs(world) {
  return arr(world.qa?.contrafactual_expectativas)
    .map((entry) => arr(entry.pair).map(String))
    .filter((pair) => pair.length === 2);
}

function summarizeFindings(findings, reachableStates) {
  const compared = findings.filter((finding) => finding.code !== "NO_COMPARAR_NO_COVISIBLES");
  return {
    reachable_states: reachableStates,
    compared_pairs: new Set(compared.map((finding) => pairKey(finding.options))).size,
    behavior_findings: compared.length,
    witness_contexts: compared.reduce((total, finding) => total + Number(finding.witness_count || 1), 0),
    blockers: findings.filter((finding) => finding.severity === "bloqueo").length,
    warnings: findings.filter((finding) => finding.severity === "aviso").length,
    legitimate: findings.filter((finding) => finding.code === "CONVERGENCIA_LEGITIMA").length,
    not_compared: findings.filter((finding) => finding.code === "NO_COMPARAR_NO_COVISIBLES").length,
  };
}

function analyzeWorld(world, options = {}) {
  if (!isWorldV1(world)) throw new Error("El detector solo acepta schema_version world_v1.");
  const before = JSON.stringify(world);
  const horizon = Number(options.horizon || DEFAULT_HORIZON);
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 6) throw new Error("El horizonte debe ser un entero entre 1 y 6.");
  const mode = options.mode || "report";
  if (mode !== "report") throw new Error("El modo gate sigue desactivado durante la calibracion.");

  const guided = adaptWorldV1(world).guided_short_module;
  const enumeration = enumerateReachableStates(world, guided, options);
  const witnesses = collectPairWitnesses(enumeration.records);
  const locations = allOptionLocations(guided);
  const findingsByPair = new Map();

  for (const [key, states] of witnesses) {
    const behaviors = new Map();
    for (const witness of states.values()) {
      const finding = evaluateWitness(world, guided, enumeration.byId, witness, horizon);
      const signature = behaviorSignature(finding, horizon);
      if (!behaviors.has(signature)) behaviors.set(signature, finding);
      else mergeFindingWitnesses(behaviors.get(signature), finding);
    }
    findingsByPair.set(key, [...behaviors.values()]);
  }
  for (const pair of requestedPairs(world)) {
    const key = pairKey(pair);
    if (!findingsByPair.has(key)) findingsByPair.set(key, [nonComparableFinding(pair, locations)]);
  }

  const findings = [...findingsByPair.values()].flat().sort((a, b) => {
    const severity = { bloqueo: 0, aviso: 1, apto: 2 };
    return (severity[a.severity] ?? 9) - (severity[b.severity] ?? 9) || a.node.localeCompare(b.node) || pairKey(a.options).localeCompare(pairKey(b.options));
  });
  if (JSON.stringify(world) !== before) throw new Error("El analisis ha mutado el mundo fuente.");
  return {
    schema: REPORT_SCHEMA,
    world: world.id,
    mode,
    horizon,
    summary: summarizeFindings(findings, enumeration.records.length),
    findings,
  };
}

function findingForPair(report, pair) {
  const key = pairKey(pair);
  return report.findings.find((finding) => pairKey(finding.options) === key) || null;
}

module.exports = {
  DEFAULT_HORIZON,
  REPORT_SCHEMA,
  analyzeWorld,
  enumerateReachableStates,
  expandFrontier,
  findingForPair,
  levelSignature,
  pairKey,
  stateSignature,
  summarizeState,
  targetForOption,
  transition,
  visibleOptions,
};
