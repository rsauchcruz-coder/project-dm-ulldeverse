"use strict";

const {
  guidedModule,
  guidedNodes,
  isFinalNode,
  loadWorld,
  makeIssue,
  nodeId,
  optionEndsGame,
  optionTarget,
  optionResolvedTargets,
  optionsOf,
  splitIssues,
  printResult,
} = require("./lib/world_utils");
const guidedState = require("../../lib/guided_state");
const { adaptWorldV1, isWorldV1 } = require("../../lib/world_v1_adapter");
const { enumerateReachableStates } = require("./lib/counterfactual_agency");

function cloneState(state) {
  return {
    inventari_actual: [...(state?.inventari_actual || [])],
    pistes_descobertes: [...(state?.pistes_descobertes || [])],
    flags: { ...(state?.flags || {}) },
    variables: { ...(state?.variables || {}) },
    pressio: Number(state?.pressio || 0),
    pressio_min: Number(state?.pressio_min ?? 0),
    pressio_max: Number(state?.pressio_max ?? 10),
  };
}

function tokenPresent(token, state) {
  const t = String(token || "").trim();
  if (!t) return true;
  const eq = t.match(/^([A-Za-z0-9_]+)\s*==\s*([A-Za-z0-9_ -]+)$/);
  if (eq) {
    const key = eq[1];
    const val = eq[2].trim();
    return String(state.variables[key] ?? state.flags[key] ?? "") === val;
  }
  if (t.startsWith("inv_")) return state.inventario.has(t);
  if (t.startsWith("pista_")) return state.pistas.has(t);
  if (t.startsWith("flag_")) return state.flags[t] !== undefined && state.flags[t] !== false && state.flags[t] !== null;
  return Boolean(state.flags[t]) || state.pistas.has(t) || state.inventario.has(t);
}

function reqTokens(req) {
  if (Array.isArray(req)) return req;
  if (!req || typeof req !== "object") return [];
  return [
    ...(Array.isArray(req.inventari) ? req.inventari : []),
    ...(Array.isArray(req.inventario) ? req.inventario : []),
    ...(Array.isArray(req.pista) ? req.pista : []),
    ...(Array.isArray(req.pistas) ? req.pistas : []),
    ...(Array.isArray(req.flag) ? req.flag : []),
    ...(Array.isArray(req.flags) ? req.flags : []),
    ...(Array.isArray(req.variables) ? req.variables : []),
  ];
}

function absentTokens(option) {
  if (!option || typeof option !== "object") return [];
  const req = option.requereix_absent
    || option.requisitos_ausentes
    || option.requisitos_absentes
    || option.requereix_no
    || option.requiere_no
    || option.requires_absent
    || option.absent;
  return reqTokens(req);
}

function positiveReqOk(option, state) {
  return reqTokens(option?.requereix || option?.requisitos || option?.requires).every(token => tokenPresent(token, state));
}

function absentReqOk(option, state) {
  return absentTokens(option).every(token => !tokenPresent(token, state));
}

function optionVisible(option, state) {
  return guidedState.optionVisible(option, state);
}

function visibleOptionsAfterState(node, state) {
  return optionsOf(node).filter(option => optionVisible(option, state));
}

function setTokens(targetSet, tokens) {
  for (const token of tokens || []) {
    if (token !== undefined && token !== null && String(token).trim()) targetSet.add(String(token));
  }
}

function removeTokens(targetSet, tokens) {
  for (const token of tokens || []) targetSet.delete(String(token));
}

function applyChanges(state, changes = {}) {
  const next = cloneState(state);
  return guidedState.applyChanges(next, changes, { min: next.pressio_min, max: next.pressio_max });
}

function conditionsOk(rule, state) {
  return guidedState.conditionMatches(rule?.si || rule?.if || [], state) &&
    guidedState.requirementsToTokens(rule?.si_no || rule?.unless || []).every((token) => !guidedState.tokenPresent(token, state));
}

function conditionalTarget(option, state) {
  const ordered = option?.resolucio_ordenada || option?.resolucion_ordenada || [];
  if (!Array.isArray(ordered) || !ordered.length) return "";
  const sorted = ordered.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const found = sorted.find(rule => conditionsOk(rule, state));
  return found?.hacia || found?.node_seguent || found?.target || found?.to || found?.destino || optionTarget(option);
}

function stateSignature(id, state) {
  const inv = [...state.inventari_actual].sort().join(",");
  const pistas = [...state.pistes_descobertes].sort().join(",");
  const flags = Object.entries(state.flags).sort().map(([k, v]) => `${k}:${v}`).join(",");
  const vars = Object.entries(state.variables).sort().map(([k, v]) => `${k}:${v}`).join(",");
  return `${id}|i=${inv}|p=${pistas}|f=${flags}|v=${vars}|pressure=${Number(state.pressio)}`;
}

function initialGuidedState(world) {
  const guided = guidedModule(world);
  const initial = guided?.estat_inicial_guiat || {};
  return {
    inventari_actual: [...(initial.inventari_inicial || initial.inventario_inicial || [])],
    pistes_descobertes: [...(initial.pistes_descobertes || initial.pistas_descubiertas || [])],
    flags: { ...(initial.flags || {}) },
    variables: { ...(initial.variables || {}) },
    pressio: Number(initial.pressio_inicial ?? 0),
    pressio_min: Number(guided?.pressio_min ?? 0),
    pressio_max: Number(guided?.pressio_max ?? 10),
  };
}

function simularWorldV1(filePath, sourceWorld, options = {}) {
  const guided = adaptWorldV1(sourceWorld).guided_short_module;
  const { records } = enumerateReachableStates(sourceWorld, guided, { maxDepth: options.maxDepth || 20 });
  const issues = [];
  const nodes = guided.nodes || [];
  const declaredOptions = new Set(nodes.flatMap((node) => optionsOf(node).map((option) => String(option.id || ""))).filter(Boolean));
  const visibleOptionIds = new Set();
  const seenNodes = new Set();
  const finalIds = new Set();
  const deadEnds = new Set();
  const oneOptionNodes = new Set();

  for (const record of records) {
    const node = record.node;
    seenNodes.add(node.id);
    if (node.es_final) {
      finalIds.add(node.id);
      continue;
    }
    const visible = (node.opcions || []).filter((option) => guidedState.optionVisible(option, record.state));
    visible.forEach((option) => visibleOptionIds.add(String(option.id || "")));
    if (!visible.length) deadEnds.add(node.id);
    if (visible.length === 1) oneOptionNodes.add(node.id);
  }

  const unreachable = nodes.map((node) => String(node.id || "")).filter((id) => id && !seenNodes.has(id));
  const inaccessibleOptions = [...declaredOptions].filter((id) => !visibleOptionIds.has(id));
  if (oneOptionNodes.size) {
    issues.push(makeIssue("error", "opcion_unica_por_estado", "Este nodo puede quedar con una sola opcion visible despues de aplicar el estado real.", [...oneOptionNodes].join(", ")));
  }
  if (deadEnds.size) {
    issues.push(makeIssue("error", "callejones_sin_final", `${deadEnds.size} nodos no finales no tienen salida visible por estado.`, [...deadEnds].join(", ")));
  }
  if (unreachable.length) {
    issues.push(makeIssue("warning", "nodos_no_alcanzados", `${unreachable.length} nodos no se alcanzan con la semantica del runtime.`, unreachable.join(", ")));
  }
  if (inaccessibleOptions.length) {
    issues.push(makeIssue("error", "opciones_inaccesibles", `${inaccessibleOptions.length} opciones declaradas no aparecen en ningun estado legal del runtime.`, inaccessibleOptions.join(", ")));
  }

  const split = splitIssues(issues);
  return {
    file: filePath,
    ...split,
    metrics: {
      nodes: nodes.length,
      reachable: seenNodes.size,
      unreachable: unreachable.length,
      finalNodes: nodes.filter((node) => node.es_final).length,
      finalsReached: finalIds.size,
      deadEnds: deadEnds.size,
      stateSnapshots: records.length,
      declaredOptions: declaredOptions.size,
      visibleOptions: visibleOptionIds.size,
      inaccessibleOptions: inaccessibleOptions.length,
      maxDepth: options.maxDepth || 20,
    },
  };
}

function simularRutas(filePath, options = {}) {
  let loaded;
  try {
    loaded = loadWorld(filePath);
  } catch (error) {
    return {
      file: filePath,
      errors: [makeIssue("error", "json_invalido", error.message)],
      warnings: [],
      metrics: {},
    };
  }

  if (isWorldV1(loaded.sourceWorld)) {
    return simularWorldV1(filePath, loaded.sourceWorld, options);
  }

  const maxDepth = options.maxDepth || 20;
  const { world, sourceWorld } = loaded;
  const guided = guidedModule(world);
  const nodes = guidedNodes(world);
  const byId = new Map(nodes.map((node) => [nodeId(node), node]));
  const first = String(guided?.estat_inicial_guiat?.node_inicial || (nodes[0] ? nodeId(nodes[0]) : ""));
  const issues = [];

  if (!first) {
    issues.push(makeIssue("error", "sin_inicio", "No hay nodo inicial."));
    const split = splitIssues(issues);
    return { file: filePath, ...split, metrics: {} };
  }

  const initialState = initialGuidedState(world);
  const queue = [{ id: first, depth: 0, state: initialState }];
  const seenStates = new Set([stateSignature(first, initialState)]);
  const seenNodes = new Set([first]);
  const finalsReached = new Set();
  const deadEnds = new Set();
  const declaredOptions = new Set(nodes.flatMap((node) => optionsOf(node).map((option) => String(option.id || ""))).filter(Boolean));
  const visibleOptionIds = new Set();

  while (queue.length) {
    const current = queue.shift();
    const node = byId.get(current.id);
    if (!node) continue;
    if (isFinalNode(node)) {
      finalsReached.add(current.id);
      continue;
    }

    const nodeOptions = visibleOptionsAfterState(node, current.state);
    nodeOptions.forEach((option) => visibleOptionIds.add(String(option.id || "")));
    if (nodeOptions.length === 1) {
      issues.push(makeIssue("error", "opcion_unica_por_estado", "Este nodo puede quedar con una sola opcion visible despues de aplicar inventario, pistas y flags.", current.id));
    }
    if (!nodeOptions.length) {
      deadEnds.add(current.id);
      continue;
    }
    if (current.depth >= maxDepth) continue;

    for (const option of nodeOptions) {
      const target = conditionalTarget(option, current.state);
      const targetList = target ? [target] : optionResolvedTargets(option);
      const nextState = applyChanges(current.state, option?.canvis_estat || option?.changes || {});

      if (!targetList.length && optionEndsGame(option)) {
        finalsReached.add(`${current.id}::trigger_final`);
      }

      for (const target of targetList) {
        if (!byId.has(target)) continue;
        seenNodes.add(target);
        const signature = stateSignature(target, nextState);
        if (!seenStates.has(signature)) {
          seenStates.add(signature);
          queue.push({ id: target, depth: current.depth + 1, state: nextState });
        }
      }
    }
  }

  const unreachable = nodes.map(nodeId).filter((id) => id && !seenNodes.has(id));
  const finalNodes = nodes.filter(isFinalNode).map(nodeId);

  if (unreachable.length) {
    issues.push(makeIssue("warning", "nodos_no_alcanzados", `${unreachable.length} nodos no se alcanzan en BFS con estado basico.`, unreachable.slice(0, 8).join(", ")));
  }
  if (deadEnds.size) {
    issues.push(makeIssue("error", "callejones_sin_final", `${deadEnds.size} nodos no finales no tienen salida visible por estado.`, [...deadEnds].slice(0, 8).join(", ")));
  }
  if (finalNodes.length && finalsReached.size === 0) {
    issues.push(makeIssue("error", "finales_no_alcanzados", "Hay finales definidos, pero ninguno se alcanza en BFS con estado basico."));
  }

  const inaccessibleOptions = [...declaredOptions].filter((id) => !visibleOptionIds.has(id));
  if (inaccessibleOptions.length) {
    const severity = isWorldV1(sourceWorld) ? "error" : "warning";
    issues.push(makeIssue(severity, "opciones_inaccesibles", `${inaccessibleOptions.length} opciones declaradas no aparecen en ningun estado legal del runtime.`, inaccessibleOptions.join(", ")));
  }

  const split = splitIssues(issues);
  return {
    file: filePath,
    ...split,
    metrics: {
      nodes: nodes.length,
      reachable: seenNodes.size,
      unreachable: unreachable.length,
      finalNodes: finalNodes.length,
      finalsReached: finalsReached.size,
      deadEnds: deadEnds.size,
      stateSnapshots: seenStates.size,
      declaredOptions: declaredOptions.size,
      visibleOptions: visibleOptionIds.size,
      inaccessibleOptions: inaccessibleOptions.length,
      maxDepth,
    },
  };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Uso: node scripts/qa/simular_rutas.js <mundo.json> [...]");
    process.exit(2);
  }
  let exitCode = 0;
  for (const file of files) {
    const result = simularRutas(file);
    printResult(`Rutas: ${file}`, result);
    console.log("Metricas:", JSON.stringify(result.metrics, null, 2));
    if (result.errors.length) exitCode = 1;
  }
  process.exit(exitCode);
}

module.exports = { simularRutas };
