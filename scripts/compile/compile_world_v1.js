"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const WORLDS_ROOT = path.join(ROOT, "worlds");

function resolveWorkspacePath(file) {
  return path.resolve(ROOT, file);
}

function compileWorldV1(sourceFile, targetFile, expectedId = null) {
  const source = resolveWorkspacePath(sourceFile);
  const target = resolveWorkspacePath(targetFile);
  const relativeTarget = path.relative(WORLDS_ROOT, target);

  if (!sourceFile || !targetFile) {
    throw new Error("Uso: compile_world_v1.js <canon.json> <worlds/...json> [id_publico]");
  }
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    throw new Error("El destino compilado debe quedar dentro de worlds/.");
  }

  const world = JSON.parse(fs.readFileSync(source, "utf8"));
  if (world.schema_version !== "world_v1") throw new Error("El canon debe usar schema_version world_v1.");
  if (!world.id || !world.titulo || !world.genero) throw new Error("Faltan id, titulo o genero.");
  if (expectedId && world.id !== expectedId) throw new Error(`El id publico debe ser ${expectedId}.`);
  if (!Array.isArray(world.nodos) || !world.nodos.length) throw new Error("El mundo no contiene escenas.");
  if (!Array.isArray(world.finales) || !world.finales.length) throw new Error("El mundo no contiene finales.");

  const output = `${JSON.stringify(world, null, 2)}\n`;
  if (/Pendiente de Narrador|TODO_NARRATIVO/i.test(output)) throw new Error("El canon conserva prosa pendiente.");

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, "utf8");

  return {
    id: world.id,
    title: world.titulo,
    source: path.relative(ROOT, source),
    target: path.relative(ROOT, target),
    bytes: Buffer.byteLength(output),
    sha256: crypto.createHash("sha256").update(output).digest("hex"),
  };
}

if (require.main === module) {
  try {
    const [source, target, expectedId] = process.argv.slice(2);
    const result = compileWorldV1(source, target, expectedId);
    console.log(`# Compilacion world_v1: ${result.title}`);
    console.log(`Origen: ${result.source}`);
    console.log(`Destino: ${result.target}`);
    console.log(`Bytes: ${result.bytes}`);
    console.log(`SHA-256: ${result.sha256}`);
  } catch (error) {
    console.error("# Compilacion world_v1");
    console.error(`NO COMPILADO: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { compileWorldV1, ROOT, WORLDS_ROOT };
