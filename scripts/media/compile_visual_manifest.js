"use strict";

const fs = require("fs");
const path = require("path");
const {
  PUBLIC_MEDIA_ROOT,
  compileRuntimeManifest,
  loadInventory,
  loadVisualSource,
  loadWorldFromSource,
  stableStringify,
} = require("../../lib/visual_manifest");

function compileVisualManifest(worldId) {
  if (!worldId) throw new Error("Uso: compile_visual_manifest.js <world_id>");
  const { source } = loadVisualSource(worldId);
  const { world } = loadWorldFromSource(source);
  const { inventory } = loadInventory(source);
  if (source.world_id !== worldId || world.id !== worldId || inventory.world_id !== worldId) {
    throw new Error("world_id no coincide entre manifest, mundo e inventario.");
  }
  const publicDir = path.join(PUBLIC_MEDIA_ROOT, worldId);
  const runtime = compileRuntimeManifest(source, publicDir);
  fs.mkdirSync(publicDir, { recursive: true });
  const output = path.join(publicDir, "manifest.json");
  fs.writeFileSync(output, `${stableStringify(runtime)}\n`, "utf8");
  const planned = (source.assets || []).filter((asset) => asset.status !== "approved").map((asset) => asset.asset_id);
  console.log(`# Manifest visual compilado: ${path.relative(process.cwd(), output)}`);
  console.log(`Assets publicados: ${Object.keys(runtime.assets).length}`);
  if (planned.length) console.log(`No publicados: ${planned.join(", ")}`);
  return runtime;
}

if (require.main === module) {
  try { compileVisualManifest(process.argv[2]); } catch (error) { console.error(`# Manifest visual: NO COMPILADO: ${error.message}`); process.exit(1); }
}

module.exports = { compileVisualManifest };
