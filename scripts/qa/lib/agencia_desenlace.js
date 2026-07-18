"use strict";

const STOP = new Set("a al ante bajo con contra de del desde el en entre hacia hasta la las lo los para por que se sin sobre su sus tras un una y ya o".split(" "));

function rawTokens(text) { return (String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z]{4,}/g) || []).filter((word) => !STOP.has(word)); }
function tokens(text) { return [...new Set(rawTokens(text))]; }
function pairs(text) { const words = rawTokens(text); return new Set(words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`)); }
function actionRoots(words) {
  const patterns = [["met", /^met(?:e|en|er|io|ia|idos?)$/], ["apoy", /^apoy/], ["levant", /^levant/], ["cruz", /^cruz/], ["sal", /^(?:sale|salen|salir|salio|salia|salga|salieron)$/], ["sost", /^sost(?:iene|ienen|ener|uvo|enia)/], ["rescat", /^rescat/], ["cerr", /^(?:cierra|cierran|cerrar|cerro|cerraron)$/], ["entreg", /^entreg/], ["evac", /^evac/]];
  return new Set(patterns.filter(([, pattern]) => words.some((word) => pattern.test(word))).map(([root]) => root));
}
function byId(world) { return new Map([...(world.nodos || []), ...(world.finales || [])].map((node) => [node.id, node])); }
function destinations(option) { return [...new Set([option.destino, ...(option.resolucion_ordenada || []).map((entry) => entry.hacia || entry.destino)].filter(Boolean))]; }
function finals(index, id, limit = 20, seen = new Set()) {
  if (!id || limit < 0 || seen.has(id)) return [];
  const node = index.get(id); if (!node) return [];
  if (node.texto_final !== undefined || node.es_final) return [node];
  const next = new Set(seen); next.add(id);
  return (node.opciones || []).flatMap((option) => destinations(option).flatMap((target) => finals(index, target, limit - 1, next)));
}
function profile(node) {
  const value = node?.qa?.perfil_desenlace;
  return value && Array.isArray(value.beneficios) && Array.isArray(value.costes) ? { beneficios: new Set(value.beneficios), costes: new Set(value.costes), postura: String(value.postura || "") } : null;
}
function includes(left, right) { return [...right].every((item) => left.has(item)); }
function dominates(a, b) { return a && b && (!a.postura || !b.postura || a.postura === b.postura) && includes(a.beneficios, b.beneficios) && includes(b.costes, a.costes) && (a.beneficios.size > b.beneficios.size || a.costes.size < b.costes.size); }

function analyzeWorld(world, { horizon = 10 } = {}) {
  const index = byId(world); const findings = [];
  const cache = new Map();
  function terminal(id, remaining = horizon, trail = new Set()) {
    const key = `${id}:${remaining}`;
    if (cache.has(key)) return cache.get(key);
    if (!id || remaining < 0 || trail.has(id)) return [];
    const node = index.get(id); if (!node) return [];
    if (node.texto_final !== undefined || node.es_final) return [node];
    const nextTrail = new Set(trail); nextTrail.add(id);
    const result = [...new Map((node.opciones || []).flatMap((option) => destinations(option).flatMap((target) => terminal(target, remaining - 1, nextTrail))).map((finalNode) => [finalNode.id, finalNode])).values()];
    cache.set(key, result); return result;
  }
  for (const node of world.nodos || []) {
    const options = node.opciones || [];
    for (const option of options) {
      const optionFinals = destinations(option).flatMap((id) => terminal(id));
      for (const finalNode of destinations(option).map((id) => index.get(id)).filter((candidate) => candidate && (candidate.texto_final !== undefined || candidate.es_final))) {
        const finalText = finalNode.texto_final || finalNode.texto_base;
        const consequenceTokens = tokens(option.consecuencia); const finalTokens = tokens(finalText);
        const shared = consequenceTokens.filter((word) => finalTokens.includes(word));
        const consequenceActs = actionRoots(consequenceTokens); const finalActs = actionRoots(finalTokens);
        const actos = [...consequenceActs].filter((root) => finalActs.has(root));
        const secuencias = [...pairs(option.consecuencia)].filter((sequence) => pairs(finalText).has(sequence));
        const reiterado = actos.length >= 2 && shared.length >= 5 && secuencias.length >= 2;
        if (shared.length >= 3) findings.push({ severity: reiterado ? "blocker" : "warning", code: reiterado ? "FINAL_REITERADO" : "FRONTERA_FINAL_A_REVISAR", node: node.id, option: option.id, final: finalNode.id, shared, secuencias });
      }
      const riskCost = option.qa?.riesgo_cobrable;
      if (riskCost && optionFinals.some(profile) && optionFinals.every((finalNode) => !profile(finalNode).costes.has(riskCost))) findings.push({ severity: "blocker", code: "RIESGO_SIN_COBRO", node: node.id, option: option.id });
    }
    for (let left = 0; left < options.length; left += 1) for (let right = left + 1; right < options.length; right += 1) {
      const a = destinations(options[left]).flatMap((id) => terminal(id)); const b = destinations(options[right]).flatMap((id) => terminal(id));
      if (!a.length || !b.length || [...a, ...b].some((finalNode) => !profile(finalNode))) continue;
      const aDominated = a.every((finalNode) => b.some((other) => dominates(profile(other), profile(finalNode))));
      const bDominated = b.every((finalNode) => a.some((other) => dominates(profile(other), profile(finalNode))));
      if (aDominated || bDominated) findings.push({ severity: "blocker", code: "DESENLACE_DOMINADO", node: node.id, dominated: aDominated ? options[left].id : options[right].id, dominant: aDominated ? options[right].id : options[left] });
    }
  }
  return { schema: "agencia_desenlace_report_v1", findings, summary: { blockers: findings.filter((item) => item.severity === "blocker").length, warnings: findings.filter((item) => item.severity === "warning").length } };
}
function assertRuntimeScene(scene, expected, label = "runtime") {
  const actions = scene.accions_ui || [];
  if (expected.final ? (!scene.is_final_real || actions.length) : (scene.is_final_real || actions.length < 2 || actions.length > 4)) throw new Error(`${label}: ${expected.final ? "FINAL_SIN_CIERRE_RUNTIME" : "FINAL_FALSO_RUNTIME"} (nodo=${scene.qa_node_id || "sin_id"}, final=${Boolean(scene.is_final_real)}, trigger=${String(scene.trigger_final)}, acciones=${actions.length})`);
  if (expected.nodo && scene.qa_node_id !== expected.nodo) throw new Error(`${label}: RUTA_SMOKE_DESINCRONIZADA`);
}
module.exports = { analyzeWorld, assertRuntimeScene };
