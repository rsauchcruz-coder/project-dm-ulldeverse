"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_MEDIA_ROOT = path.join(ROOT, "public", "media");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = sortValue(value[key]);
      return out;
    }, {});
  }
  return value;
}

function stableStringify(value, space = 2) {
  return JSON.stringify(sortValue(value), null, space);
}

function mediaSourcePath(worldId, root = ROOT) {
  return path.join(root, "fabrica", "media", worldId, "visual_manifest_source_v1.json");
}

function loadVisualSource(worldId, root = ROOT) {
  const file = mediaSourcePath(worldId, root);
  const source = readJson(file);
  return { file, source, directory: path.dirname(file) };
}

function loadWorldFromSource(source, root = ROOT) {
  if (!source.source_world) throw new Error("El manifest visual no declara source_world.");
  const worldPath = path.resolve(root, source.source_world);
  return { file: worldPath, world: readJson(worldPath) };
}

function loadInventory(source, root = ROOT) {
  if (!source.inventory) throw new Error("El manifest visual no declara inventory.");
  const file = path.resolve(root, "fabrica", "media", source.world_id, source.inventory);
  return { file, inventory: readJson(file) };
}

function loadStyleContract(source, root = ROOT) {
  if (!source.style_contract) throw new Error("El manifest visual no declara style_contract.");
  const file = path.resolve(root, "fabrica", "media", source.world_id, source.style_contract);
  return { file, style: readJson(file) };
}

function nodesForWorld(world) {
  return [
    ...(Array.isArray(world.nodos) ? world.nodos : []),
    ...(Array.isArray(world.finales) ? world.finales : []),
  ];
}

function resolveNode(world, nodeId) {
  return nodesForWorld(world).find((node) => node.id === nodeId) || null;
}

function resolveEntity(world, entityId) {
  if (entityId === "jugador") return world.jugador || null;
  const [kind, id] = String(entityId || "").split(":", 2);
  const collection = { pnj: world.pnj, recurso: world.recursos, pista: world.pistas }[kind];
  return Array.isArray(collection) ? collection.find((entry) => entry.id === id) || null : null;
}

function pathValue(context, field) {
  const aliases = { visual_style_contract: "style", world: "world" };
  return String(field).split(".").reduce((value, rawKey) => {
    if (value == null) return undefined;
    const key = aliases[rawKey] || rawKey;
    return value[key];
  }, context);
}

function signatureContext(asset, world, style) {
  const node = (asset.source_nodes || []).map((id) => resolveNode(world, id)).find(Boolean) || null;
  const entity = (asset.source_entities || []).map((id) => resolveEntity(world, id)).find(Boolean) || null;
  return {
    visual_style_contract: style,
    style,
    visual_continuity: style.continuity || {},
    world,
    node,
    entidad: entity,
    entity,
  };
}

function calculateSourceSignature(asset, world, style) {
  const context = signatureContext(asset, world, style);
  const fields = (asset.signature_fields || []).reduce((out, field) => {
    out[field] = pathValue(context, field);
    return out;
  }, {});
  const serialized = stableStringify(fields, 0);
  return {
    source_signature: `sha256:${crypto.createHash("sha256").update(serialized).digest("hex")}`,
    signature_fields: fields,
  };
}

function runtimeAsset(asset, worldId) {
  return {
    alt: asset.alt,
    src: `/media/${worldId}/${asset.public_file}`,
    type: asset.type,
  };
}

function approvedAssetIds(source) {
  return new Set((source.assets || []).filter((asset) => asset.status === "approved").map((asset) => asset.asset_id));
}

function filterBindings(bindings, approved, assets = []) {
  const out = { entities: {}, nodes: {} };
  for (const [nodeId, binding] of Object.entries(bindings?.nodes || {})) {
    if (!approved.has(binding.scene_asset)) continue;
    const sceneVariants = assets
      .filter((asset) => asset.type === "scene_variant"
        && asset.status === "approved"
        && approved.has(asset.asset_id)
        && asset.variant_of === binding.scene_asset
        && (asset.source_nodes || []).includes(nodeId))
      .map((asset) => ({ scene_asset: asset.asset_id, guard: asset.variant_guard || {} }));
    out.nodes[nodeId] = { scene_asset: binding.scene_asset };
    if (sceneVariants.length) out.nodes[nodeId].scene_variants = sceneVariants;
  }
  for (const [entityId, binding] of Object.entries(bindings?.entities || {})) {
    const filtered = {};
    if (approved.has(binding.character_asset)) filtered.character_asset = binding.character_asset;
    if (approved.has(binding.prop_asset)) filtered.prop_asset = binding.prop_asset;
    if (Object.keys(filtered).length) out.entities[entityId] = filtered;
  }
  return out;
}

function compileRuntimeManifest(source, publicDir) {
  const approved = approvedAssetIds(source);
  const assets = {};
  for (const asset of source.assets || []) {
    if (asset.status !== "approved") continue;
    const target = path.resolve(publicDir, asset.public_file || "");
    if (!asset.public_file || !target.startsWith(`${path.resolve(publicDir)}${path.sep}`) || !fs.existsSync(target)) {
      throw new Error(`Asset aprobado no publicable: ${asset.asset_id}`);
    }
    assets[asset.asset_id] = runtimeAsset(asset, source.world_id);
  }
  const runtime = {
    schema_version: "visual_manifest_v1",
    world_id: source.world_id,
    manifest_version: source.manifest_version,
    assets,
    bindings: filterBindings(source.bindings, approved, source.assets || []),
  };
  if (source.hotspots && Object.keys(source.hotspots).length) runtime.hotspots = source.hotspots;
  return sortValue(runtime);
}

module.exports = {
  ROOT,
  PUBLIC_MEDIA_ROOT,
  approvedAssetIds,
  calculateSourceSignature,
  compileRuntimeManifest,
  filterBindings,
  loadInventory,
  loadStyleContract,
  loadVisualSource,
  loadWorldFromSource,
  mediaSourcePath,
  nodesForWorld,
  readJson,
  resolveEntity,
  resolveNode,
  sortValue,
  stableStringify,
};
