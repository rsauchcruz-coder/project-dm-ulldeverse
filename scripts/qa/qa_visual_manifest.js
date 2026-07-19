"use strict";

const fs = require("fs");
const path = require("path");
const {
  PUBLIC_MEDIA_ROOT,
  calculateSourceSignature,
  loadInventory,
  loadStyleContract,
  loadVisualSource,
  loadWorldFromSource,
  readJson,
  resolveEntity,
  resolveNode,
} = require("../../lib/visual_manifest");

const INTERNAL_RUNTIME_FIELDS = new Set(["provider", "prompt_file", "approved_file", "legacy_source", "notes", "signature_fields", "source_signature", "historial"]);
const ASSET_FIELDS = ["scene_asset", "character_asset", "prop_asset"];

function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, out));
  return out;
}

function hasInternalField(value) {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, item]) => INTERNAL_RUNTIME_FIELDS.has(key) || hasInternalField(item));
}

function environmentFocusId(value) {
  return `entorno_${String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;
}

function hasFoco(node, focoId) {
  if ((node?.focos_consulta || []).some((foco) => (typeof foco === "string" ? foco : foco?.id) === focoId)) return true;
  if ((node?.focos_consulta_extra || []).some((foco) => (typeof foco === "string" ? foco : foco?.id) === focoId)) return true;
  return (node?.entorno_visible || []).some((item) => environmentFocusId(typeof item === "string" ? item : item?.etiqueta || item?.nombre || item?.item) === focoId);
}

function main(worldId) {
  if (!worldId) throw new Error("Uso: qa_visual_manifest.js <world_id>");
  const errors = [];
  const { source } = loadVisualSource(worldId);
  const { world } = loadWorldFromSource(source);
  const { inventory } = loadInventory(source);
  const { style } = loadStyleContract(source);
  const publicDir = path.join(PUBLIC_MEDIA_ROOT, worldId);
  const runtimeFile = path.join(publicDir, "manifest.json");
  const runtime = fs.existsSync(runtimeFile) ? readJson(runtimeFile) : null;
  const fail = (message) => errors.push(message);

  if (source.world_id !== worldId || world.id !== worldId || inventory.world_id !== worldId) fail("world_id distinto entre manifest, inventario y mundo.");
  if (!runtime) fail("No existe el manifest de runtime compilado.");
  else if (runtime.world_id !== worldId || runtime.schema_version !== "visual_manifest_v1") fail("El manifest runtime no declara el mundo o schema correctos.");

  const assetIds = new Set();
  const inventoryIds = new Set((inventory.assets || []).map((asset) => asset.asset_id));
  for (const asset of source.assets || []) {
    if (!asset.asset_id || assetIds.has(asset.asset_id)) fail(`asset_id duplicado o vacio: ${asset.asset_id || "(vacio)"}.`);
    assetIds.add(asset.asset_id);
    if (!inventoryIds.has(asset.asset_id)) fail(`Asset sin inventario: ${asset.asset_id}.`);
    for (const nodeId of asset.source_nodes || []) if (!resolveNode(world, nodeId)) fail(`Nodo inexistente en ${asset.asset_id}: ${nodeId}.`);
    for (const entityId of asset.source_entities || []) if (!resolveEntity(world, entityId)) fail(`Entidad inexistente en ${asset.asset_id}: ${entityId}.`);
    if (asset.status === "approved") {
      const target = path.resolve(publicDir, asset.public_file || "");
      if (!asset.approved_file) fail(`Asset aprobado sin approved_file: ${asset.asset_id}.`);
      if (!asset.public_file || !target.startsWith(`${path.resolve(publicDir)}${path.sep}`)) fail(`Asset publicado fuera de su directorio: ${asset.asset_id}.`);
      else if (!fs.existsSync(target)) fail(`Falta archivo publicado: ${asset.public_file}.`);
      if (!asset.alt || !String(asset.alt).trim()) fail(`Falta alt en ${asset.asset_id}.`);
      const signature = calculateSourceSignature(asset, world, style);
      if (asset.source_signature && asset.source_signature !== signature.source_signature) fail(`Asset stale: ${asset.asset_id}.`);
    }
  }

  for (const [nodeId, binding] of Object.entries(source.bindings?.nodes || {})) {
    if (!resolveNode(world, nodeId)) fail(`Binding de nodo inexistente: ${nodeId}.`);
    for (const field of ASSET_FIELDS) if (binding[field] && !assetIds.has(binding[field])) fail(`Binding a asset inexistente: ${binding[field]}.`);
  }
  for (const [entityId, binding] of Object.entries(source.bindings?.entities || {})) {
    if (!resolveEntity(world, entityId)) fail(`Binding de entidad inexistente: ${entityId}.`);
    for (const field of ASSET_FIELDS) if (binding[field] && !assetIds.has(binding[field])) fail(`Binding a asset inexistente: ${binding[field]}.`);
  }
  for (const [nodeId, hotspots] of Object.entries(source.hotspots || {})) {
    const node = resolveNode(world, nodeId);
    if (!node) { fail(`Hotspots para nodo inexistente: ${nodeId}.`); continue; }
    for (const [focoId, point] of Object.entries(hotspots || {})) {
      if (!hasFoco(node, focoId)) fail(`Hotspot sin foco existente: ${nodeId}/${focoId}.`);
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) fail(`Hotspot fuera de rango: ${nodeId}/${focoId}.`);
    }
  }

  if (runtime) {
    if (hasInternalField(runtime)) fail("El manifest runtime filtra campos internos.");
    if (collectStrings(runtime).some((text) => /data:image\/|base64,/i.test(text))) fail("El manifest runtime contiene Data URI o Base64.");
    for (const [assetId, asset] of Object.entries(runtime.assets || {})) {
      if (!assetIds.has(assetId)) fail(`Runtime publica asset inexistente: ${assetId}.`);
      if (!asset.alt || !asset.src) fail(`Runtime sin alt o src: ${assetId}.`);
    }
    for (const [nodeId, binding] of Object.entries(runtime.bindings?.nodes || {})) {
      for (const variant of binding.scene_variants || []) {
        if (!assetIds.has(variant.scene_asset)) fail(`Variante runtime inexistente en ${nodeId}: ${variant.scene_asset}.`);
      }
    }
  }

  const index = fs.readFileSync(path.resolve(__dirname, "../../public/index.html"), "utf8");
  if (/prototip_v22_assets\.js/i.test(index)) fail("public/index.html sigue cargando el bundle Base64 heredado.");
  const client = fs.readFileSync(path.resolve(__dirname, "../../public/prototip_v22.js"), "utf8");
  if (/PROTO_ASSETS/.test(client)) fail("El cliente sigue usando window.PROTO_ASSETS.");
  if (/\b(calabozo|cisterna|ramon|albert|cadena|sello)\b/i.test(client)) fail("El cliente conserva resolucion visual por coincidencias textuales.");

  console.log("# QA visual manifest");
  if (errors.length) {
    errors.forEach((error) => console.error(`NO APTO: ${error}`));
    process.exitCode = 1;
  } else console.log(`APTO: ${assetIds.size} assets fuente, ${Object.keys(runtime?.assets || {}).length} publicados.`);
}

try { main(process.argv[2]); } catch (error) { console.error(`# QA visual manifest\nNO APTO: ${error.message}`); process.exitCode = 1; }
