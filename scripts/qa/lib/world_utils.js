"use strict";

const fs = require("fs");
const path = require("path");
const { adaptWorldV1, isWorldV1 } = require("../../../lib/world_v1_adapter");

const TECHNICAL_VISIBLE_KEYS = new Set([
  "id",
  "node_id",
  "block_id",
  "graph_blueprint_id",
  "world_id",
  "version_guided",
  "fase",
  "tipo_node",
  "type",
  "tipus",
  "es_final",
  "is_final",
  "final",
  "node_seguent",
  "next",
  "target",
  "to",
  "destino",
  "requereix",
  "requereix_absent",
  "requereix_no",
  "requires",
  "requires_absent",
  "requisitos",
  "requisitos_ausentes",
  "requisitos_absentes",
  "requiere_no",
  "canvis_estat",
  "changes",
  "flags",
  "flag",
  "activa_si",
  "set_estado_si",
  "inventari_afegir",
  "inventario_agregar",
  "pressio_delta",
]);

function resolvePath(filePath) {
  return path.resolve(process.cwd(), filePath);
}

function loadWorld(filePath) {
  const abs = resolvePath(filePath);
  const raw = fs.readFileSync(abs, "utf8");
  const sourceWorld = JSON.parse(raw);
  const world = isWorldV1(sourceWorld) ? adaptWorldV1(sourceWorld) : sourceWorld;
  return { abs, raw, sourceWorld, world };
}

function guidedModule(world) {
  return world.guided_short_module || world.guided || world.runtime_module || {};
}

function guidedNodes(world) {
  const guided = guidedModule(world);
  if (Array.isArray(guided.nodes)) return guided.nodes;
  if (Array.isArray(guided.nodos)) return guided.nodos;
  if (Array.isArray(world.nodes)) return world.nodes;
  return [];
}

function nodeId(node) {
  return String(node?.id || node?.node_id || node?.key || "");
}

function isFinalNode(node) {
  const id = nodeId(node);
  const kind = String(node?.type || node?.tipus || node?.tipo_node || node?.node_type || "");
  return Boolean(
    node?.is_final ||
      node?.es_final ||
      node?.final ||
      /^f\d+/i.test(id) ||
      /(^|_)final(_|$)/i.test(id) ||
      /\b(final|resolucion|resolucio)\b/i.test(kind)
  );
}

function optionsOf(node) {
  const options = node?.opcions || node?.options || node?.accions || node?.acciones || [];
  return Array.isArray(options) ? options : [];
}

function optionText(option) {
  if (typeof option === "string") return option;
  return String(
    option?.text ||
      option?.label ||
      option?.titol ||
      option?.title ||
      option?.descripcio ||
      option?.descripcion ||
      option?.frase ||
      ""
  );
}

function optionTarget(option) {
  if (!option || typeof option !== "object") return "";
  return String(
    option.node_seguent ||
      option.next ||
      option.next_node ||
      option.next_node_id ||
      option.target ||
      option.to ||
      option.destino ||
      option.node_destino ||
      option.seguent ||
      ""
  );
}

function targetFromValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function orderedResolutionTargets(option) {
  if (!option || typeof option !== "object") return [];
  const ordered = option.resolucio_ordenada || option.resolucion_ordenada || [];
  if (!Array.isArray(ordered)) return [];
  return ordered.map((entry) => targetFromValue(entry?.hacia || entry?.node_seguent || entry?.target || entry?.to || entry?.destino)).filter(Boolean);
}

function fallbackTargets(option) {
  if (!option || typeof option !== "object") return [];
  const fallback = option.fallback_si_requisit_falla || option.fallback_si_requisito_falla || option.fallback || {};
  const target = targetFromValue(fallback.hacia || fallback.target || fallback.to || fallback.destino || fallback.node_seguent);
  return target ? [target] : [];
}

function optionResolvedTargets(option) {
  if (!option || typeof option !== "object") return [];
  const changes = option.canvis_estat || option.changes || {};
  const targets = [
    optionTarget(option),
    targetFromValue(option.trigger_final),
    targetFromValue(option.trigger_finalitzacio),
    targetFromValue(changes.trigger_final),
    targetFromValue(changes.trigger_finalitzacio),
    targetFromValue(changes.final_escollit),
    targetFromValue(changes.final),
    targetFromValue(changes.finale),
    ...orderedResolutionTargets(option),
    ...fallbackTargets(option),
  ].filter(Boolean);
  return [...new Set(targets)];
}

function optionEndsGame(option) {
  if (!option || typeof option !== "object") return false;
  if (option.trigger_final || option.trigger_finalitzacio) return true;
  const changes = option.canvis_estat || option.changes || {};
  if (changes.trigger_final || changes.trigger_finalitzacio) return true;
  if (changes.final_escollit || changes.final || changes.finale) return true;
  return false;
}

function walk(value, visitor, parentKey = "") {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visitor, parentKey));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      visitor(key, item, parentKey);
      walk(item, visitor, key);
    });
  }
}

function collectVisibleStrings(value) {
  const out = [];
  walk(value, (key, item) => {
    if (typeof item !== "string") return;
    if (TECHNICAL_VISIBLE_KEYS.has(key)) return;
    if (/^(flag|flags|token|tokens|require|requires|requereix|estado|estat|state)$/i.test(key)) return;
    out.push({ key, text: item });
  });
  return out;
}

function normalizeText(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function words(text) {
  return String(text).match(/[\p{L}\p{N}_'-]+/gu) || [];
}

function countPressioDelta(world) {
  const hist = {};
  let total = 0;
  let nonZero = 0;
  walk(world, (key, item) => {
    if (key !== "pressio_delta") return;
    total += 1;
    const numeric = Number(item) || 0;
    if (numeric !== 0) nonZero += 1;
    const bucket = String(item);
    hist[bucket] = (hist[bucket] || 0) + 1;
  });
  return { total, nonZero, hist };
}

function worldGenre(world) {
  return String(
    world?.world_full?.genere ||
      world?.world_full?.genero ||
      world?.runtime_module?.genere ||
      world?.runtime_module?.genero ||
      world?.world_full?.genre ||
      ""
  );
}

function genreNeedsPressure(world) {
  return /\b(terror|thriller|supervivencia|horror|suspense)\b/i.test(worldGenre(world));
}

function makeIssue(severity, code, message, where = "") {
  return { severity, code, message, where };
}

function splitIssues(issues) {
  return {
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
}

function printResult(title, result) {
  const errors = result.errors || [];
  const warnings = result.warnings || [];
  console.log(`\n== ${title} ==`);
  console.log(`Errores: ${errors.length} | Avisos: ${warnings.length}`);
  for (const issue of [...errors, ...warnings]) {
    const marker = issue.severity === "error" ? "ERROR" : "AVISO";
    const where = issue.where ? ` [${issue.where}]` : "";
    console.log(`- ${marker} ${issue.code}${where}: ${issue.message}`);
  }
}

module.exports = {
  collectVisibleStrings,
  countPressioDelta,
  genreNeedsPressure,
  guidedModule,
  guidedNodes,
  isFinalNode,
  loadWorld,
  makeIssue,
  nodeId,
  normalizeText,
  optionTarget,
  optionResolvedTargets,
  optionEndsGame,
  optionText,
  optionsOf,
  printResult,
  resolvePath,
  splitIssues,
  walk,
  words,
  worldGenre,
};
