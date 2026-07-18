"use strict";

const fs = require("fs");
const path = require("path");

const PROFILES = {
  base: {
    minRoutes: 1,
    maxRoutes: 4,
    maxCommonCorridor: 4,
    minDifferentialResources: 0,
    minPressureReadNodes: 0,
    minFinalFamilies: 1,
    maxFinalFamilies: 8,
    requireEarlyDefeat: false,
    earlyDefeatMin: 3,
    earlyDefeatMax: 5,
    requireClimaxVariation: false,
  },
  aventura_corta_reactiva: {
    minRoutes: 2,
    maxRoutes: 3,
    maxCommonCorridor: 2,
    minDifferentialResources: 2,
    minPressureReadNodes: 2,
    minFinalFamilies: 2,
    maxFinalFamilies: 4,
    requireEarlyDefeat: true,
    earlyDefeatMin: 3,
    earlyDefeatMax: 5,
    requireClimaxVariation: true,
  },
};

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function issue(severity, code, message, where = "") {
  return { severity, code, message, where };
}

function loadWorld(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  return { abs, world: JSON.parse(fs.readFileSync(abs, "utf8")) };
}

function guidedModule(world) {
  return world.guided_short_module || world.guided || world.runtime_module || world;
}

function nodesOf(world) {
  const guided = guidedModule(world);
  const development = arr(guided.nodes).length
    ? guided.nodes
    : arr(guided.nodos).length
      ? guided.nodos
      : arr(world.nodes).length
        ? world.nodes
        : arr(world.nodos);
  const knownIds = new Set(development.map(nodeId));
  const canonicalFinals = arr(world.finales).filter((final) => !knownIds.has(nodeId(final)));
  return [...development, ...canonicalFinals];
}

function nodeId(node) {
  return String(node?.id || node?.node_id || node?.key || "");
}

function optionsOf(node) {
  const options = node?.opcions || node?.opciones || node?.options || node?.acciones || node?.accions || [];
  return arr(options);
}

function optionId(option, index = 0) {
  return String(option?.id || option?.option_id || option?.key || `opcion_${index + 1}`);
}

function optionText(option) {
  return String(option?.text || option?.texto || option?.label || option?.titulo || option?.titol || "");
}

function isFinalNode(node) {
  const id = nodeId(node);
  const kind = String(node?.tipo_node || node?.type || node?.tipo || node?.tipus || node?.node_type || "");
  return Boolean(
    node?.es_final ||
      node?.is_final ||
      node?.final ||
      /^f\d+/i.test(id) ||
      /^(final|resolucion|resolucio)(_|$)/i.test(kind)
  );
}

function isDefeatNode(node) {
  const ref = [
    nodeId(node),
    node?.tipo_node,
    node?.type,
    node?.tipo,
    node?.tipus,
    node?.titulo,
    node?.titol,
  ].filter(Boolean).join(" ");
  return /derrota|fracaso|fracas|captur|muerte|muert|perdid|fallo|fallida|game.?over/i.test(ref);
}

function changesOf(option) {
  return option?.canvis_estat || option?.cambios_estado || option?.changes || {};
}

function directTarget(option) {
  return String(
    option?.node_seguent ||
      option?.destino ||
      option?.target ||
      option?.to ||
      option?.next ||
      option?.next_node ||
      ""
  );
}

function orderedRules(option) {
  const rules = option?.resolucio_ordenada || option?.resolucion_ordenada || option?.resoluciones_ordenadas || [];
  return arr(rules).slice().sort((a, b) => Number(a?.orden || 0) - Number(b?.orden || 0));
}

function targetOfRule(rule) {
  return String(rule?.hacia || rule?.node_seguent || rule?.destino || rule?.target || rule?.to || "");
}

function allTargets(option) {
  return uniq([directTarget(option), ...orderedRules(option).map(targetOfRule)]);
}

function reqTokens(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value || typeof value !== "object") return [];
  return uniq([
    ...arr(value.inventari),
    ...arr(value.inventario),
    ...arr(value.pista),
    ...arr(value.pistas),
    ...arr(value.flag),
    ...arr(value.flags),
    ...arr(value.variables),
    ...arr(value.todos),
    ...arr(value.presentes),
  ]);
}

function positiveRequirements(value) {
  return reqTokens(value?.requereix || value?.requisitos || value?.requires || value?.si || value?.if || []);
}

function absentRequirements(value) {
  return reqTokens(
    value?.requereix_absent ||
      value?.requisitos_ausentes ||
      value?.requires_absent ||
      value?.si_no ||
      value?.unless ||
      value?.ausentes ||
      []
  );
}

function cloneState(state) {
  return {
    inventory: new Set(state?.inventory || []),
    clues: new Set(state?.clues || []),
    flags: { ...(state?.flags || {}) },
    variables: { ...(state?.variables || {}) },
    pressure: Number(state?.pressure || 0),
  };
}

function stateValue(key, state) {
  if (/^(pressio|presion|presión)$/i.test(key)) return state.pressure;
  if (Object.prototype.hasOwnProperty.call(state.variables, key)) return state.variables[key];
  if (Object.prototype.hasOwnProperty.call(state.flags, key)) return state.flags[key];
  return undefined;
}

function tokenPresent(token, state) {
  const raw = String(token || "").trim();
  if (!raw) return true;
  const comparison = raw.match(/^([A-Za-z0-9_]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparison) {
    const [, key, operator, expectedRaw] = comparison;
    const actual = stateValue(key, state);
    const expectedNumber = Number(expectedRaw);
    const actualNumber = Number(actual);
    const numeric = Number.isFinite(expectedNumber) && Number.isFinite(actualNumber);
    const left = numeric ? actualNumber : String(actual ?? "");
    const right = numeric ? expectedNumber : String(expectedRaw).trim();
    if (operator === "==") return left === right;
    if (operator === "!=") return left !== right;
    if (operator === ">=") return left >= right;
    if (operator === "<=") return left <= right;
    if (operator === ">") return left > right;
    if (operator === "<") return left < right;
  }
  if (raw.startsWith("inv_")) return state.inventory.has(raw);
  if (raw.startsWith("pista_")) return state.clues.has(raw);
  if (raw.startsWith("flag_")) {
    return state.flags[raw] !== undefined && state.flags[raw] !== false && state.flags[raw] !== null;
  }
  return Boolean(state.flags[raw]) || state.inventory.has(raw) || state.clues.has(raw) || Boolean(state.variables[raw]);
}

function pressureBoundsOk(value, state) {
  const min = value?.presion_min ?? value?.pressio_min ?? value?.pressure_min;
  const max = value?.presion_max ?? value?.pressio_max ?? value?.pressure_max;
  if (min !== undefined && state.pressure < Number(min)) return false;
  if (max !== undefined && state.pressure > Number(max)) return false;
  return true;
}

function conditionMatches(value, state) {
  if (!value || typeof value !== "object") return true;
  return positiveRequirements(value).every((token) => tokenPresent(token, state)) &&
    absentRequirements(value).every((token) => !tokenPresent(token, state)) &&
    pressureBoundsOk(value, state);
}

function optionVisible(option, state) {
  if (!absentRequirements(option).every((token) => !tokenPresent(token, state))) return false;
  if (!pressureBoundsOk(option, state)) return false;
  const alternatives = option?.requisitos_alternativos || option?.requereix_alternatiu || option?.alternative_requirements;
  if (!arr(alternatives).length) {
    return positiveRequirements(option).every((token) => tokenPresent(token, state));
  }
  return alternatives.some((alt) => {
    if (Array.isArray(alt)) return alt.every((token) => tokenPresent(token, state));
    return conditionMatches(alt, state);
  });
}

function pressureRange(world) {
  const range = world?.sistema_presion?.rango || world?.sistema_pressio?.rang || {};
  if (Array.isArray(range) && range.length >= 2) return { min: Number(range[0]), max: Number(range[1]) };
  return {
    min: Number(range?.min ?? range?.minimo ?? 0),
    max: Number(range?.max ?? range?.maximo ?? 10),
  };
}

function applyChanges(state, option, world) {
  const next = cloneState(state);
  const changes = changesOf(option);
  const range = pressureRange(world);
  const delta = Number(changes.pressio_delta ?? changes.presion_delta ?? changes.pressure_delta ?? 0) || 0;
  next.pressure = Math.max(range.min, Math.min(range.max, next.pressure + delta));

  for (const token of arr(changes.inventari_treure || changes.inventario_quitar || changes.inventory_remove)) {
    next.inventory.delete(String(token));
  }
  for (const token of arr(changes.inventari_afegir || changes.inventario_agregar || changes.inventory_add)) {
    next.inventory.add(String(token));
  }
  for (const token of arr(changes.pistes_afegir || changes.pistas_agregar || changes.clues_add)) {
    next.clues.add(String(token));
  }

  const flagsSet = changes.flags_set || changes.flags_establecer || {};
  if (Array.isArray(flagsSet)) {
    for (const flag of flagsSet) next.flags[String(flag)] = true;
  } else if (flagsSet && typeof flagsSet === "object") {
    Object.assign(next.flags, flagsSet);
  }

  Object.assign(next.variables, changes.variables_set || changes.variables_establecer || {});
  Object.assign(next.variables, changes.set_estado || {});
  return next;
}

function resolveTarget(option, state) {
  for (const rule of orderedRules(option)) {
    if (conditionMatches(rule, state)) return targetOfRule(rule);
  }
  return directTarget(option);
}

function initialState(world, nodes) {
  const guided = guidedModule(world);
  const legacy = guided?.estat_inicial_guiat || {};
  const canonical = world?.estado_inicial || guided?.estado_inicial || {};
  const variables = { ...(canonical.variables || {}), ...(legacy.variables || {}) };
  const pressure = Number(
    legacy.pressio_inicial ??
      canonical.presion_inicial ??
      canonical.presion ??
      variables.pressio ??
      variables.presion ??
      0
  );
  return {
    nodeId: String(
      legacy.node_inicial ||
        canonical.nodo_inicial ||
        canonical.node_inicial ||
        nodeId(nodes[0])
    ),
    state: {
      inventory: new Set([
        ...arr(canonical.inventario),
        ...arr(canonical.inventario_inicial),
        ...arr(legacy.inventari_inicial),
        ...arr(legacy.inventario_inicial),
      ].map(String)),
      clues: new Set([
        ...arr(canonical.pistas_descubiertas),
        ...arr(legacy.pistes_descobertes),
        ...arr(legacy.pistas_descubiertas),
      ].map(String)),
      flags: { ...(canonical.flags || {}), ...(legacy.flags || {}) },
      variables,
      pressure: Number.isFinite(pressure) ? pressure : 0,
    },
  };
}

function stateSignature(state) {
  const inventory = [...state.inventory].sort().join(",");
  const clues = [...state.clues].sort().join(",");
  const flags = Object.entries(state.flags).sort().map(([key, value]) => `${key}:${value}`).join(",");
  const variables = Object.entries(state.variables).sort().map(([key, value]) => `${key}:${value}`).join(",");
  return `i=${inventory}|c=${clues}|f=${flags}|v=${variables}|pressure=${state.pressure}`;
}

function agencyConfig(world, profileOverride) {
  const qa = world?.qa || world?.world_full?.qa || {};
  const config = qa.agencia || qa.agency || qa;
  const profileName = profileOverride || config.perfil_agencia || config.profile || "base";
  return {
    ...config,
    profileName,
    profile: PROFILES[profileName] || PROFILES.base,
  };
}

function routeDefinitions(config, initialNode, initialOptions) {
  const declared = arr(config.rutas_principales || config.main_routes);
  if (declared.length) {
    return declared.map((route, index) => ({
      id: String(route.id || `ruta_${index + 1}`),
      entry: String(route.entrada || route.entry || ""),
      memory: String(route.memoria_exigida || route.required_memory || ""),
      declared: true,
    }));
  }
  return initialOptions.map((option, index) => ({
    id: `ruta_${index + 1}_${optionId(option, index)}`,
    entry: optionId(option, index),
    memory: "",
    declared: false,
    source: nodeId(initialNode),
  }));
}

function routeForOption(routes, option, currentRoute) {
  if (currentRoute) return currentRoute;
  const id = optionId(option);
  return routes.find((route) => route.entry === id)?.id || "";
}

function simulate(world, options = {}) {
  const nodes = nodesOf(world);
  const byId = new Map(nodes.map((node) => [nodeId(node), node]));
  const initial = initialState(world, nodes);
  const initialNode = byId.get(initial.nodeId) || nodes[0];
  const initialOptions = optionsOf(initialNode).filter((option) => optionVisible(option, initial.state)).slice(0, 4);
  const routes = routeDefinitions(options.config, initialNode, initialOptions);
  const maxDepth = Number(options.maxDepth || Math.max(20, Number(options.config?.duracion_objetivo?.max || 0) + 5));
  const maxBranches = Number(options.maxBranches || 100000);
  const stack = [{
    id: nodeId(initialNode),
    state: initial.state,
    depth: 0,
    route: "",
    choices: [],
    nodePath: [nodeId(initialNode)],
    seen: new Set([`${nodeId(initialNode)}|${stateSignature(initial.state)}`]),
  }];
  const finals = [];
  const deadEnds = [];
  const missingTargets = [];
  const oneOptionStates = [];
  const tooManyOptionStates = [];
  const statesAtNode = new Map();
  const observedAdjacency = new Map(nodes.map((node) => [nodeId(node), new Set()]));
  let expandedBranches = 0;
  let truncated = false;

  while (stack.length) {
    const current = stack.pop();
    const node = byId.get(current.id);
    if (!node) {
      missingTargets.push(current.id);
      continue;
    }

    if (!statesAtNode.has(current.id)) statesAtNode.set(current.id, []);
    statesAtNode.get(current.id).push({
      state: cloneState(current.state),
      depth: current.depth,
      route: current.route,
      choices: current.choices.slice(),
      nodePath: current.nodePath.slice(),
    });

    if (isFinalNode(node)) {
      finals.push({ ...current, node });
      continue;
    }
    if (current.depth >= maxDepth) continue;

    const eligible = optionsOf(node).filter((option) => optionVisible(option, current.state));
    if (eligible.length > 4) tooManyOptionStates.push({ node: current.id, count: eligible.length, state: stateSignature(current.state) });
    const visible = eligible.slice(0, 4);
    if (visible.length === 1) oneOptionStates.push({ node: current.id, state: stateSignature(current.state) });
    if (!visible.length) {
      deadEnds.push({ node: current.id, state: stateSignature(current.state) });
      continue;
    }

    for (let index = 0; index < visible.length; index += 1) {
      if (expandedBranches >= maxBranches) {
        truncated = true;
        break;
      }
      const option = visible[index];
      const target = resolveTarget(option, current.state);
      const nextState = applyChanges(current.state, option, world);
      const nextRoute = routeForOption(routes, option, current.route);
      expandedBranches += 1;
      if (!target || !byId.has(target)) {
        missingTargets.push(target || `${current.id}/${optionId(option, index)}`);
        continue;
      }
      observedAdjacency.get(current.id).add(target);
      const signature = `${target}|${stateSignature(nextState)}`;
      if (current.seen.has(signature)) continue;
      const nextSeen = new Set(current.seen);
      nextSeen.add(signature);
      stack.push({
        id: target,
        state: nextState,
        depth: current.depth + 1,
        route: nextRoute,
        choices: [...current.choices, optionId(option, index)],
        nodePath: [...current.nodePath, target],
        seen: nextSeen,
      });
    }
    if (truncated) break;
  }

  return {
    nodes,
    byId,
    initial,
    routes,
    finals,
    deadEnds,
    missingTargets: uniq(missingTargets),
    oneOptionStates,
    tooManyOptionStates,
    statesAtNode,
    observedAdjacency,
    expandedBranches,
    truncated,
    maxDepth,
  };
}

function buildGraph(nodes) {
  const ids = new Set(nodes.map(nodeId));
  const adjacency = new Map(nodes.map((node) => [nodeId(node), new Set()]));
  const predecessors = new Map(nodes.map((node) => [nodeId(node), new Set()]));
  for (const node of nodes) {
    const from = nodeId(node);
    for (const option of optionsOf(node)) {
      for (const target of allTargets(option)) {
        if (!ids.has(target)) continue;
        adjacency.get(from).add(target);
        predecessors.get(target).add(from);
      }
    }
  }
  return { adjacency, predecessors };
}

function graphFromAdjacency(adjacency) {
  const predecessors = new Map([...adjacency.keys()].map((id) => [id, new Set()]));
  for (const [from, targets] of adjacency.entries()) {
    for (const target of targets) {
      if (!predecessors.has(target)) predecessors.set(target, new Set());
      predecessors.get(target).add(from);
    }
  }
  return { adjacency, predecessors };
}

function reachableFrom(start, adjacency) {
  const seen = new Set();
  const stack = start ? [start] : [];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adjacency.get(id) || []) stack.push(next);
  }
  return seen;
}

function canReach(from, to, adjacency, cache) {
  const key = `${from}->${to}`;
  if (cache.has(key)) return cache.get(key);
  const result = reachableFrom(from, adjacency).has(to);
  cache.set(key, result);
  return result;
}

function dominators(nodes, start, graph) {
  const reachable = reachableFrom(start, graph.adjacency);
  const all = new Set(reachable);
  const dom = new Map();
  for (const id of reachable) dom.set(id, id === start ? new Set([start]) : new Set(all));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of reachable) {
      if (id === start) continue;
      const preds = [...(graph.predecessors.get(id) || [])].filter((pred) => reachable.has(pred));
      let intersection = preds.length ? new Set(dom.get(preds[0])) : new Set();
      for (const pred of preds.slice(1)) {
        intersection = new Set([...intersection].filter((item) => dom.get(pred).has(item)));
      }
      intersection.add(id);
      const previous = [...dom.get(id)].sort().join("|");
      const next = [...intersection].sort().join("|");
      if (previous !== next) {
        dom.set(id, intersection);
        changed = true;
      }
    }
  }
  return { dom, reachable };
}

function longestCommonCorridor(commonIds, graph) {
  const common = new Set(commonIds);
  const memo = new Map();
  function visit(id, visiting = new Set()) {
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) return [id];
    const nextVisiting = new Set(visiting);
    nextVisiting.add(id);
    const candidates = [...(graph.adjacency.get(id) || [])].filter((next) => common.has(next));
    let best = [id];
    for (const next of candidates) {
      const path = [id, ...visit(next, nextVisiting)];
      if (path.length > best.length) best = path;
    }
    memo.set(id, best);
    return best;
  }
  let best = [];
  for (const id of common) {
    const candidate = visit(id);
    if (candidate.length > best.length) best = candidate;
  }
  return best;
}

function tokensReadByValue(value) {
  return uniq([...positiveRequirements(value), ...absentRequirements(value)]);
}

function stateTokenKey(token) {
  const comparison = String(token || "").match(/^([A-Za-z0-9_]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  return comparison ? comparison[1] : String(token || "");
}

function tokensReadByOption(option) {
  const alternatives = option?.requisitos_alternativos || option?.requereix_alternatiu || option?.alternative_requirements;
  const alternativeTokens = arr(alternatives).flatMap((alternative) =>
    Array.isArray(alternative) ? alternative : tokensReadByValue(alternative)
  );
  return uniq([...tokensReadByValue(option), ...alternativeTokens]);
}

function pressureConditionPresent(value) {
  if (!value || typeof value !== "object") return false;
  if (["presion_min", "presion_max", "pressio_min", "pressio_max", "pressure_min", "pressure_max"]
    .some((key) => value[key] !== undefined)) return true;
  return tokensReadByValue(value).some((token) => /^(pressio|presion|nivel_presion)\b/i.test(token));
}

function staticStateAnalysis(nodes, graph) {
  const writes = [];
  const reads = [];
  const pressureReadNodes = new Set();
  let pressureWrites = 0;

  for (const node of nodes) {
    const source = nodeId(node);
    for (let index = 0; index < optionsOf(node).length; index += 1) {
      const option = optionsOf(node)[index];
      const id = optionId(option, index);
      const targets = allTargets(option);
      const changes = changesOf(option);
      for (const token of tokensReadByOption(option)) reads.push({ token: stateTokenKey(token), node: source, option: id, kind: "requisito" });
      if (pressureConditionPresent(option)) pressureReadNodes.add(source);
      for (const rule of orderedRules(option)) {
        for (const token of tokensReadByValue(rule)) reads.push({ token: stateTokenKey(token), node: source, option: id, kind: "resolucion" });
        if (pressureConditionPresent(rule)) pressureReadNodes.add(source);
      }

      const addWrite = (token, kind) => {
        for (const target of targets.length ? targets : [""]) {
          writes.push({ token: String(token), kind, source, target, option: id, finalTransition: targets.some((t) => isFinalNode(nodes.find((n) => nodeId(n) === t))) });
        }
      };
      for (const token of arr(changes.inventari_afegir || changes.inventario_agregar || changes.inventory_add)) addWrite(token, "inventario");
      for (const token of arr(changes.pistes_afegir || changes.pistas_agregar || changes.clues_add)) addWrite(token, "pista");
      const flags = changes.flags_set || changes.flags_establecer || {};
      for (const token of Array.isArray(flags) ? flags : Object.keys(flags || {})) addWrite(token, "flag");
      for (const token of Object.keys(changes.variables_set || changes.variables_establecer || changes.set_estado || {})) addWrite(token, "variable");
      for (const token of arr(changes.inventari_treure || changes.inventario_quitar || changes.inventory_remove)) {
        reads.push({ token: String(token), node: source, option: id, kind: "consumo" });
      }
      const delta = Number(changes.pressio_delta ?? changes.presion_delta ?? changes.pressure_delta ?? 0) || 0;
      if (delta !== 0) pressureWrites += 1;
    }

    const variants = [
      ...arr(node.variantes),
      ...arr(node.variantes_estado),
      ...arr(node.variantes_ordenadas),
      ...arr(node.variantes_por_presion),
    ];
    for (const variant of variants) {
      for (const token of tokensReadByValue(variant)) reads.push({ token: stateTokenKey(token), node: source, option: "variante", kind: "variante" });
      if (pressureConditionPresent(variant) || variant?.nivel !== undefined) pressureReadNodes.add(source);
    }
  }

  const cache = new Map();
  const liveWrites = new Set();
  for (let index = 0; index < writes.length; index += 1) {
    const write = writes[index];
    if (write.finalTransition || !write.target) continue;
    if (reads.some((read) => read.token === write.token && canReach(write.target, read.node, graph.adjacency, cache))) {
      liveWrites.add(index);
    }
  }
  const liveTokens = uniq(writes.filter((write, index) => liveWrites.has(index)).map((write) => write.token));
  const deadWrites = writes.filter((write, index) => !write.finalTransition && !liveWrites.has(index));
  const writtenBeforeFinal = uniq(writes.filter((write) => !write.finalTransition).map((write) => write.token));
  const deadTokens = writtenBeforeFinal.filter((token) => !liveTokens.includes(token));
  const mechanicalTokens = writtenBeforeFinal.filter((token) => !token.startsWith("pista_"));
  const deadMechanicalTokens = deadTokens.filter((token) => !token.startsWith("pista_"));
  const panelOnlyClues = deadTokens.filter((token) => token.startsWith("pista_"));

  return {
    writes,
    reads,
    deadWrites,
    deadTokens,
    mechanicalTokens,
    deadMechanicalTokens,
    panelOnlyClues,
    liveTokens,
    pressureReadNodes,
    pressureWrites,
  };
}

function climaxNodes(config, nodes) {
  const declared = uniq(config.nodos_climax || config.climax_nodes || []);
  if (declared.length) return declared;
  const finals = new Set(nodes.filter(isFinalNode).map(nodeId));
  return nodes
    .filter((node) => !isFinalNode(node) && optionsOf(node).some((option) => allTargets(option).some((target) => finals.has(target))))
    .map(nodeId);
}

function analyzeClimax(simulation, climaxIds) {
  const entries = [];
  const routeMenus = new Map();
  const optionTargets = new Map();
  for (const id of climaxIds) {
    const node = simulation.byId.get(id);
    for (const snapshot of simulation.statesAtNode.get(id) || []) {
      const visible = optionsOf(node).filter((option) => optionVisible(option, snapshot.state)).slice(0, 4);
      const menu = visible.map((option, index) => optionId(option, index)).sort().join("|");
      const profile = visible
        .map((option, index) => `${optionId(option, index)}->${resolveTarget(option, snapshot.state)}`)
        .sort()
        .join("|");
      entries.push({ id, route: snapshot.route || "sin_ruta", menu, profile, depth: snapshot.depth });
      const route = snapshot.route || "sin_ruta";
      if (!routeMenus.has(route)) routeMenus.set(route, new Set());
      routeMenus.get(route).add(menu);
      for (let index = 0; index < visible.length; index += 1) {
        const option = visible[index];
        const optionKey = `${id}/${optionId(option, index)}`;
        if (!optionTargets.has(optionKey)) optionTargets.set(optionKey, new Set());
        optionTargets.get(optionKey).add(resolveTarget(option, snapshot.state));
      }
    }
  }

  const routeSets = [...routeMenus.values()];
  const universalMenus = routeSets.length
    ? [...routeSets[0]].filter((menu) => routeSets.every((set) => set.has(menu)))
    : [];
  const stateSensitiveOptions = [...optionTargets.entries()]
    .filter(([, targets]) => targets.size > 1)
    .map(([key, targets]) => ({ option: key, targets: [...targets] }));
  const allFinalsPassClimax = simulation.finals.length > 0 && simulation.finals.every((record) => climaxIds.some((id) => record.nodePath.includes(id)));

  return {
    entries,
    routeMenus,
    universalMenus,
    uniqueMenus: uniq(entries.map((entry) => entry.menu)),
    uniqueProfiles: uniq(entries.map((entry) => entry.profile)),
    stateSensitiveOptions,
    allFinalsPassClimax,
  };
}

function requirementTokensOfOption(option) {
  return tokensReadByOption(option).map(stateTokenKey);
}

function effectiveChangesSignature(option, staticState) {
  const changes = changesOf(option);
  const live = new Set(staticState.liveTokens);
  const flags = changes.flags_set || changes.flags_establecer || {};
  const relevantFlags = (Array.isArray(flags) ? flags : Object.keys(flags || {})).filter((token) => live.has(String(token)));
  const relevantVariables = Object.keys(changes.variables_set || changes.variables_establecer || changes.set_estado || {})
    .filter((token) => live.has(String(token)));
  const pressureEffective = staticState.pressureReadNodes.size > 0;
  return JSON.stringify({
    add: arr(changes.inventari_afegir || changes.inventario_agregar || changes.inventory_add).sort(),
    remove: arr(changes.inventari_treure || changes.inventario_quitar || changes.inventory_remove).sort(),
    clues: arr(changes.pistes_afegir || changes.pistas_agregar || changes.clues_add).filter((token) => live.has(String(token))).sort(),
    flags: relevantFlags.sort(),
    variables: relevantVariables.sort(),
    pressure: pressureEffective ? Number(changes.pressio_delta ?? changes.presion_delta ?? changes.pressure_delta ?? 0) || 0 : 0,
  });
}

function analyzeResources(world, nodes, staticState, initial, config) {
  const resources = new Set([...initial.state.inventory]);
  for (const write of staticState.writes) if (write.kind === "inventario") resources.add(write.token);
  const finalIds = new Set(nodes.filter(isFinalNode).map(nodeId));
  const details = [];
  const equivalentPairs = [];
  const declaredCentral = uniq([
    ...arr(config?.artefactos_centrales),
    ...arr(config?.central_artifacts),
    ...(config?.artefacto_central ? [config.artefacto_central] : []),
  ]);
  const totalOptions = nodes.reduce((sum, node) => sum + optionsOf(node).length, 0);
  const inferredCentral = [...initial.state.inventory].filter((resource) => {
    const uses = nodes.reduce((sum, node) => sum + optionsOf(node)
      .filter((option) => requirementTokensOfOption(option).includes(resource)).length, 0);
    return uses >= Math.max(3, Math.floor(totalOptions * 0.4));
  });
  const centralResources = uniq(declaredCentral.length ? declaredCentral : inferredCentral);

  for (const resource of resources) {
    const uses = [];
    let differential = false;
    for (const node of nodes) {
      const options = optionsOf(node);
      for (let index = 0; index < options.length; index += 1) {
        const option = options[index];
        if (!requirementTokensOfOption(option).includes(resource)) continue;
        const siblings = options.filter((candidate) => !requirementTokensOfOption(candidate).includes(resource));
        const targets = allTargets(option);
        const consumed = arr(changesOf(option).inventari_treure || changesOf(option).inventario_quitar || []).includes(resource);
        const liveChange = effectiveChangesSignature(option, staticState) !== JSON.stringify({ add: [], remove: [], clues: [], flags: [], variables: [], pressure: 0 });
        const uniqueTarget = targets.some((target) => !siblings.some((candidate) => allTargets(candidate).includes(target)));
        const reachesFinal = targets.some((target) => finalIds.has(target));
        const hasRealAlternative = siblings.length > 0;
        const useDifferential = consumed || reachesFinal || (hasRealAlternative && (uniqueTarget || liveChange));
        if (useDifferential) differential = true;
        uses.push({ node: nodeId(node), option: optionId(option, index), differential: useDifferential });

        for (let siblingIndex = 0; siblingIndex < siblings.length; siblingIndex += 1) {
          const sibling = siblings[siblingIndex];
          if (centralResources.includes(resource)) continue;
          if (allTargets(option).sort().join("|") !== allTargets(sibling).sort().join("|")) continue;
          if (effectiveChangesSignature(option, staticState) !== effectiveChangesSignature(sibling, staticState)) continue;
          equivalentPairs.push({
            resource,
            node: nodeId(node),
            withResource: optionId(option, index),
            alternative: optionId(sibling, options.indexOf(sibling)),
          });
        }
      }
    }
    details.push({ resource, uses, differential });
  }

  const pairMap = new Map();
  for (const pair of equivalentPairs) {
    const optionPair = [pair.withResource, pair.alternative].sort().join("|");
    const key = `${pair.node}|${optionPair}`;
    if (!pairMap.has(key)) pairMap.set(key, pair);
  }
  const differentialResources = details.filter((detail) => detail.differential).map((detail) => detail.resource);
  return {
    details,
    centralResources,
    differentialResources,
    differentialOptionalResources: differentialResources.filter((resource) => !centralResources.includes(resource)),
    unusedResources: details.filter((detail) => detail.uses.length === 0).map((detail) => detail.resource),
    equivalentPairs: [...pairMap.values()],
  };
}

function finalDistribution(simulation) {
  const distribution = {};
  for (const record of simulation.finals) {
    const id = nodeId(record.node);
    if (!distribution[id]) distribution[id] = { paths: 0, minTurn: Infinity, maxTurn: 0, routes: new Set() };
    const entry = distribution[id];
    entry.paths += 1;
    entry.minTurn = Math.min(entry.minTurn, record.depth);
    entry.maxTurn = Math.max(entry.maxTurn, record.depth);
    if (record.route) entry.routes.add(record.route);
  }
  return Object.fromEntries(Object.entries(distribution).map(([id, entry]) => [id, {
    paths: entry.paths,
    minTurn: entry.minTurn,
    maxTurn: entry.maxTurn,
    routes: [...entry.routes],
  }]));
}

function finalFamily(node) {
  return String(
    node?.familia_final ||
      node?.estado_resultante?.familia ||
      node?.resulting_state?.family ||
      node?.tipo ||
      node?.tipo_node ||
      node?.type ||
      nodeId(node)
  );
}

function finalFamilyDistribution(simulation) {
  const distribution = {};
  for (const record of simulation.finals) {
    const family = finalFamily(record.node);
    if (!distribution[family]) distribution[family] = { paths: 0, finals: new Set() };
    distribution[family].paths += 1;
    distribution[family].finals.add(nodeId(record.node));
  }
  return Object.fromEntries(Object.entries(distribution).map(([family, entry]) => [family, {
    paths: entry.paths,
    finals: [...entry.finals],
  }]));
}

function countByNode(entries) {
  const counts = {};
  for (const entry of entries) counts[entry.node] = (counts[entry.node] || 0) + 1;
  return counts;
}

function preflightAgencia(filePath, options = {}) {
  let loaded;
  try {
    loaded = loadWorld(filePath);
  } catch (error) {
    return {
      file: filePath,
      profile: options.profile || "base",
      verdict: "NO_APTO_PARA_NARRAR",
      errors: [issue("error", "json_invalido", error.message)],
      warnings: [],
      metrics: {},
    };
  }

  const { world } = loaded;
  const config = agencyConfig(world, options.profile);
  const simulation = simulate(world, { config, maxDepth: options.maxDepth, maxBranches: options.maxBranches });
  const graph = buildGraph(simulation.nodes);
  const observedGraph = graphFromAdjacency(simulation.observedAdjacency);
  const domResult = dominators(simulation.nodes, simulation.initial.nodeId, observedGraph);
  const reachableFinalIds = uniq(simulation.finals.map((record) => nodeId(record.node)));
  const commonDominators = [...domResult.reachable].filter((id) =>
    id !== simulation.initial.nodeId &&
    !isFinalNode(simulation.byId.get(id)) &&
    reachableFinalIds.length > 0 &&
    reachableFinalIds.every((finalId) => domResult.dom.get(finalId)?.has(id))
  );
  const commonCorridor = longestCommonCorridor(commonDominators, observedGraph);
  const staticState = staticStateAnalysis(simulation.nodes, graph);
  const climaxIds = climaxNodes(config, simulation.nodes);
  const climax = analyzeClimax(simulation, climaxIds);
  const resources = analyzeResources(world, simulation.nodes, staticState, simulation.initial, config);
  const distribution = finalDistribution(simulation);
  const familyDistribution = finalFamilyDistribution(simulation);
  const errors = [];
  const warnings = [];

  if (!arr(config.rutas_principales || config.main_routes).length) {
    warnings.push(issue("warning", "rutas_inferidas", "No hay rutas principales declaradas en qa; se infieren desde las opciones iniciales."));
  }
  if (simulation.routes.length < config.profile.minRoutes) {
    errors.push(issue("error", "rutas_insuficientes", `El perfil exige al menos ${config.profile.minRoutes} rutas y se detectan ${simulation.routes.length}.`));
  } else if (simulation.routes.length > config.profile.maxRoutes) {
    warnings.push(issue("warning", "rutas_excesivas", `Se detectan ${simulation.routes.length} rutas; el perfil recomienda como maximo ${config.profile.maxRoutes}.`));
  }

  for (const route of simulation.routes.filter((item) => item.declared && item.memory)) {
    const written = staticState.writes.some((write) => write.token === route.memory);
    const read = staticState.reads.some((entry) => entry.token === route.memory);
    if (!written || !read) {
      errors.push(issue("error", "memoria_ruta_ausente", `La ruta ${route.id} exige memoria ${route.memory}, pero no se escribe y consulta de forma completa.`, route.id));
    }
  }

  if (simulation.deadEnds.length) {
    errors.push(issue("error", "callejones", `${simulation.deadEnds.length} estados alcanzables quedan sin opciones.`));
  }
  if (simulation.missingTargets.length) {
    errors.push(issue("error", "destinos_invalidos", `Hay destinos vacios o inexistentes: ${simulation.missingTargets.slice(0, 8).join(", ")}.`));
  }
  if (simulation.oneOptionStates.length) {
    errors.push(issue("error", "turnos_falsos", `${simulation.oneOptionStates.length} estados dejan una sola opcion visible.`));
  }
  if (simulation.tooManyOptionStates.length) {
    errors.push(issue("error", "demasiadas_opciones_visibles", `${simulation.tooManyOptionStates.length} estados dejan mas de cuatro opciones visibles.`));
  }
  if (!simulation.finals.length) {
    errors.push(issue("error", "sin_final_alcanzable", "No se alcanza ningun final durante la simulacion."));
  }
  const reachedNodes = new Set(simulation.statesAtNode.keys());
  const unreachableNodes = simulation.nodes.map(nodeId).filter((id) => !reachedNodes.has(id));
  if (unreachableNodes.length) {
    errors.push(issue("error", "nodos_inaccesibles", `${unreachableNodes.length} nodos definidos no son alcanzables: ${unreachableNodes.slice(0, 8).join(", ")}.`));
  }
  if (simulation.truncated) {
    warnings.push(issue("warning", "simulacion_truncada", `La simulacion alcanzo el limite de ${options.maxBranches || 100000} transiciones.`));
  }

  if (commonCorridor.length > config.profile.maxCommonCorridor) {
    errors.push(issue(
      "error",
      "corredor_obligatorio_largo",
      `Hay ${commonCorridor.length} nodos obligatorios consecutivos despues de la apertura de rutas: ${commonCorridor.join(" -> ")}.`
    ));
  }

  if (config.profile.requireClimaxVariation && climax.universalMenus.length && climax.allFinalsPassClimax) {
    errors.push(issue(
      "error",
      "menu_climax_universal",
      `Todas las rutas pueden llegar al mismo menu completo de climax (${climax.universalMenus[0].split("|").length} opciones) y todos los finales pasan por el mismo climax.`
    ));
  }

  if (staticState.pressureWrites > 0 && staticState.pressureReadNodes.size < config.profile.minPressureReadNodes) {
    errors.push(issue(
      "error",
      "presion_no_operativa",
      `La presion cambia en ${staticState.pressureWrites} opciones, pero solo se consulta en ${staticState.pressureReadNodes.size} nodos; el perfil exige ${config.profile.minPressureReadNodes}.`
    ));
  }

  const initialVariables = simulation.initial.state.variables;
  if ((initialVariables.presion !== undefined || initialVariables.pressio !== undefined) && staticState.pressureWrites > 0) {
    warnings.push(issue(
      "warning",
      "presion_duplicada",
      "El estado inicial guarda presion como variable y como mecanica separada; pueden divergir durante la partida."
    ));
  }

  const defeatRecords = simulation.finals.filter((record) => isDefeatNode(record.node));
  const earlyDefeats = defeatRecords.filter((record) =>
    record.depth >= config.profile.earlyDefeatMin && record.depth <= config.profile.earlyDefeatMax
  );
  if (config.profile.requireEarlyDefeat && !earlyDefeats.length) {
    const earliest = defeatRecords.length ? Math.min(...defeatRecords.map((record) => record.depth)) : null;
    errors.push(issue(
      "error",
      "derrota_temprana_ausente",
      earliest === null
        ? `No existe ninguna derrota alcanzable; el perfil exige una entre turnos ${config.profile.earlyDefeatMin} y ${config.profile.earlyDefeatMax}.`
        : `La primera derrota llega en el turno ${earliest}; el perfil exige una entre turnos ${config.profile.earlyDefeatMin} y ${config.profile.earlyDefeatMax}.`
    ));
  }

  const familyCount = Object.keys(familyDistribution).length;
  if (familyCount < config.profile.minFinalFamilies) {
    errors.push(issue(
      "error",
      "familias_final_insuficientes",
      `Solo hay ${familyCount} familias de desenlace; el perfil exige al menos ${config.profile.minFinalFamilies}.`
    ));
  } else if (familyCount > config.profile.maxFinalFamilies) {
    warnings.push(issue(
      "warning",
      "familias_final_excesivas",
      `Hay ${familyCount} familias de desenlace; el perfil recomienda no superar ${config.profile.maxFinalFamilies}.`
    ));
  }

  if (resources.differentialOptionalResources.length < config.profile.minDifferentialResources) {
    errors.push(issue(
      "error",
      "recursos_diferenciales_insuficientes",
      `Solo ${resources.differentialOptionalResources.length} recursos opcionales demuestran uso estructural diferencial; el perfil exige ${config.profile.minDifferentialResources}.`
    ));
  }

  const configuredResources = new Set(arr(config.recursos_clave || config.key_resources).map(String));
  const configuredStates = new Set(arr(config.estados_clave || config.key_states).map(String));
  for (const resource of configuredResources) {
    const detail = resources.details.find((item) => item.resource === resource);
    if (!detail || !detail.differential) {
      errors.push(issue("error", "recurso_clave_sin_efecto", `El recurso clave ${resource} no demuestra uso diferencial.`, resource));
    }
  }
  for (const token of configuredStates) {
    if (staticState.deadTokens.includes(token)) {
      errors.push(issue("error", "estado_clave_muerto", `El estado clave ${token} se escribe pero no se consulta despues.`, token));
    }
  }

  if (resources.equivalentPairs.length) {
    const examples = resources.equivalentPairs.slice(0, 4)
      .map((entry) => `${entry.node}: ${entry.withResource} ~ ${entry.alternative}`)
      .join("; ");
    errors.push(issue(
      "error",
      "recurso_equivalente_a_alternativa",
      `${resources.equivalentPairs.length} usos con recurso son estructuralmente equivalentes a otra opcion sin ese recurso. ${examples}`
    ));
  }

  if (staticState.deadMechanicalTokens.length) {
    warnings.push(issue(
      "warning",
      "estados_muertos",
      `${staticState.deadMechanicalTokens.length} recursos, flags o variables mecanicas se escriben antes de terminar y no se consultan despues: ${staticState.deadMechanicalTokens.slice(0, 12).join(", ")}${staticState.deadMechanicalTokens.length > 12 ? "..." : ""}.`
    ));
  }
  if (resources.unusedResources.length) {
    warnings.push(issue(
      "warning",
      "recursos_sin_uso",
      `Recursos obtenidos pero nunca exigidos ni consumidos: ${resources.unusedResources.join(", ")}.`
    ));
  }

  const verdict = errors.length ? "NO_APTO_PARA_NARRAR" : warnings.length ? "APTO_CON_RIESGO" : "APTO_ESTRUCTURAL";
  return {
    file: filePath,
    profile: config.profileName,
    verdict,
    errors,
    warnings,
    metrics: {
      nodes: simulation.nodes.length,
      nonFinalNodes: simulation.nodes.filter((node) => !isFinalNode(node)).length,
      finalNodes: simulation.nodes.filter(isFinalNode).length,
      routes: simulation.routes.map((route) => ({ id: route.id, entry: route.entry, declared: route.declared })),
      completedPaths: simulation.finals.length,
      expandedBranches: simulation.expandedBranches,
      finalDistribution: distribution,
      finalFamilyDistribution: familyDistribution,
      commonDominators,
      commonCorridor,
      commonCorridorLength: commonCorridor.length,
      climaxNodes: climaxIds,
      climaxMenus: climax.uniqueMenus,
      climaxProfiles: climax.uniqueProfiles,
      universalClimaxMenus: climax.universalMenus,
      stateSensitiveClimaxOptions: climax.stateSensitiveOptions,
      pressureWrites: staticState.pressureWrites,
      pressureReadNodes: [...staticState.pressureReadNodes],
      writtenStateTokens: staticState.mechanicalTokens.length,
      deadStateTokens: staticState.deadTokens,
      deadMechanicalStateTokens: staticState.deadMechanicalTokens,
      panelOnlyClues: staticState.panelOnlyClues,
      centralResources: resources.centralResources,
      differentialResources: resources.differentialResources,
      differentialOptionalResources: resources.differentialOptionalResources,
      resourceEquivalences: resources.equivalentPairs,
      defeatPaths: defeatRecords.length,
      earlyDefeatPaths: earlyDefeats.length,
      earliestDefeatTurn: defeatRecords.length ? Math.min(...defeatRecords.map((record) => record.depth)) : null,
      simulationTruncated: simulation.truncated,
      unreachableNodes,
      oneOptionStateNodes: countByNode(simulation.oneOptionStates),
      tooManyOptionStateNodes: countByNode(simulation.tooManyOptionStates),
    },
  };
}

function printResult(result) {
  console.log(`\n# Preflight de agencia: ${result.file}`);
  console.log(`Perfil: ${result.profile}`);
  console.log(`Veredicto: ${result.verdict}`);
  console.log(`Bloqueos: ${result.errors.length} | Avisos: ${result.warnings.length}`);
  for (const entry of result.errors) {
    const where = entry.where ? ` [${entry.where}]` : "";
    console.log(`- BLOQUEO ${entry.code}${where}: ${entry.message}`);
  }
  for (const entry of result.warnings) {
    const where = entry.where ? ` [${entry.where}]` : "";
    console.log(`- AVISO ${entry.code}${where}: ${entry.message}`);
  }
  console.log("Metricas:", JSON.stringify(result.metrics, null, 2));
}

function parseArgs(argv) {
  const options = {};
  const files = [];
  for (const arg of argv) {
    if (arg.startsWith("--profile=")) options.profile = arg.slice("--profile=".length);
    else if (arg.startsWith("--max-depth=")) options.maxDepth = Number(arg.slice("--max-depth=".length));
    else if (arg.startsWith("--max-branches=")) options.maxBranches = Number(arg.slice("--max-branches=".length));
    else files.push(arg);
  }
  return { files, options };
}

if (require.main === module) {
  const { files, options } = parseArgs(process.argv.slice(2));
  if (!files.length) {
    console.error("Uso: node scripts/qa/preflight_agencia.js [--profile=aventura_corta_reactiva] <mundo.json> [...]");
    process.exit(2);
  }
  let exitCode = 0;
  for (const file of files) {
    const result = preflightAgencia(file, options);
    printResult(result);
    if (result.verdict === "NO_APTO_PARA_NARRAR") exitCode = 1;
  }
  process.exit(exitCode);
}

module.exports = {
  PROFILES,
  preflightAgencia,
  printResult,
};
