"use strict";

const path = require("path");
const {
  PUBLIC_MEDIA_ROOT,
  calculateSourceSignature,
  loadStyleContract,
  loadVisualSource,
  loadWorldFromSource,
  readJson,
} = require("../../lib/visual_manifest");
const fs = require("fs");

function grouped(items, property) {
  return items.reduce((out, item) => {
    const key = item[property] || "sin_valor";
    (out[key] ||= []).push(item.asset_id || item);
    return out;
  }, {});
}

function main(worldId) {
  if (!worldId) throw new Error("Uso: qa_visual_coverage.js <world_id> [--json]");
  const { source } = loadVisualSource(worldId);
  const { world } = loadWorldFromSource(source);
  const { style } = loadStyleContract(source);
  const publicFile = path.join(PUBLIC_MEDIA_ROOT, worldId, "manifest.json");
  const runtime = fs.existsSync(publicFile) ? readJson(publicFile) : { assets: {}, bindings: { nodes: {}, entities: {} } };
  const approved = new Set(Object.keys(runtime.assets || {}));
  const sourceAssets = source.assets || [];
  const stale = sourceAssets.filter((asset) => asset.source_signature && calculateSourceSignature(asset, world, style).source_signature !== asset.source_signature).map((asset) => asset.asset_id);
  const broken = [];
  for (const [nodeId, binding] of Object.entries(source.bindings?.nodes || {})) if (binding.scene_asset && !sourceAssets.some((asset) => asset.asset_id === binding.scene_asset)) broken.push(`nodo:${nodeId}`);
  for (const [entityId, binding] of Object.entries(source.bindings?.entities || {})) for (const id of [binding.character_asset, binding.prop_asset].filter(Boolean)) if (!sourceAssets.some((asset) => asset.asset_id === id)) broken.push(`entidad:${entityId}`);
  const used = new Set();
  Object.values(source.bindings?.nodes || {}).forEach((binding) => binding.scene_asset && used.add(binding.scene_asset));
  Object.values(source.bindings?.entities || {}).forEach((binding) => [binding.character_asset, binding.prop_asset].filter(Boolean).forEach((id) => used.add(id)));
  const result = {
    world_id: worldId,
    assets_por_estado: grouped(sourceAssets, "status"),
    nodos_con_escena_aprobada: Object.entries(source.bindings?.nodes || {}).filter(([, binding]) => approved.has(binding.scene_asset)).map(([id]) => id),
    nodos_con_escena_planificada: Object.entries(source.bindings?.nodes || {}).filter(([, binding]) => !approved.has(binding.scene_asset)).map(([id]) => id),
    personajes_con_asset_aprobado: Object.entries(source.bindings?.entities || {}).filter(([, binding]) => approved.has(binding.character_asset)).map(([id]) => id),
    props_con_asset_aprobado: Object.entries(source.bindings?.entities || {}).filter(([, binding]) => approved.has(binding.prop_asset)).map(([id]) => id),
    bindings_rotos: broken,
    assets_stale: stale,
    assets_no_usados: sourceAssets.filter((asset) => !used.has(asset.asset_id)).map((asset) => asset.asset_id),
  };
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else {
    console.log("# Cobertura visual");
    Object.entries(result).filter(([key]) => key !== "world_id").forEach(([key, value]) => console.log(`${key}: ${Array.isArray(value) ? (value.join(", ") || "ninguno") : JSON.stringify(value)}`));
  }
}

try { main(process.argv[2]); } catch (error) { console.error(`# Cobertura visual\nNO APTO: ${error.message}`); process.exitCode = 1; }
