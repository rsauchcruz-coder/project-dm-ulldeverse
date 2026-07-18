"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");
const canonicalPath = path.join(ROOT, "worlds", "Aventura", "aventura_el_testigo_de_ulldecona.json");
const publicPath = path.join(ROOT, "public", "demo-world.json");
const htmlPath = path.join(ROOT, "public", "index-static.html");
const runtimePath = path.join(ROOT, "public", "static-demo-runtime.js");
const hostingPath = path.join(ROOT, ".openai", "hosting.json");

const canonicalWorld = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
const publicWorld = JSON.parse(fs.readFileSync(publicPath, "utf8"));
assert.deepStrictEqual(publicWorld, canonicalWorld, "public/demo-world.json no coincide con el mundo canónico");

const html = fs.readFileSync(htmlPath, "utf8");
const flagIndex = html.indexOf("__PROJECT_DM_STATIC_DEMO__");
const runtimeIndex = html.indexOf("/static-demo-runtime.js");
const clientIndex = html.indexOf("/prototip_v22.js");
assert(flagIndex >= 0, "index-static.html no activa la demo estática");
assert(runtimeIndex > flagIndex, "el adaptador estático debe cargarse después de la bandera");
assert(clientIndex > runtimeIndex, "el adaptador estático debe cargarse antes del cliente jugable");

const runtime = fs.readFileSync(runtimePath, "utf8");
new vm.Script(runtime, { filename: runtimePath });
for (const endpoint of ["/mundos", "/iniciar", "/accio", "/guardar", "/cargar", "/cuaderno"]) {
  assert(runtime.includes(`"${endpoint}"`), `el adaptador estático no declara ${endpoint}`);
}

const hosting = JSON.parse(fs.readFileSync(hostingPath, "utf8"));
assert(/^appgprj_[a-z0-9]+$/.test(hosting.project_id || ""), "hosting.json no contiene un project_id válido");

console.log("# Demo pública estática: APTA");
console.log(`Mundo sincronizado: ${canonicalWorld.id}`);
console.log("Adaptador, orden de carga y configuración de alojamiento: correctos.");
