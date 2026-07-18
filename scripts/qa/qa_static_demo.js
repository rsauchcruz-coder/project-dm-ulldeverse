"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "../..");
const canonicalPath = path.join(ROOT, "worlds", "Aventura", "aventura_el_testigo_de_ulldecona.json");
const publicPath = path.join(ROOT, "public", "demo-world.json");
const htmlPath = path.join(ROOT, "public", "index-static.html");
const runtimePath = path.join(ROOT, "public", "static-demo-runtime.js");
const hostingPath = path.join(ROOT, ".openai", "hosting.json");
const workerPath = path.join(ROOT, "site", "worker.mjs");

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

const worker = fs.readFileSync(workerPath, "utf8");
assert(worker.includes("env.ASSETS.fetch"), "el Worker público no utiliza el binding estático ASSETS");
assert(worker.includes("export default"), "el Worker público no exporta un manejador modular");

async function verifyWorker() {
  const moduleUrl = `${pathToFileURL(workerPath).href}?qa=${Date.now()}`;
  const handler = (await import(moduleUrl)).default;
  const assets = {
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      const relative = pathname === "/" || pathname === "/index.html"
        ? "index-static.html"
        : decodeURIComponent(pathname.replace(/^\/+/, ""));
      const absolute = path.resolve(ROOT, "public", relative);
      const publicRoot = path.resolve(ROOT, "public") + path.sep;
      if (!absolute.startsWith(publicRoot) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(fs.readFileSync(absolute), { status: 200 });
    },
  };

  const rootResponse = await handler.fetch(new Request("https://demo.invalid/"), { ASSETS: assets });
  assert.strictEqual(rootResponse.status, 200, "el Worker no sirve la portada");
  assert((await rootResponse.text()).includes("El testigo de Ulldecona"), "la portada del Worker no es la demo");
  assert.strictEqual(rootResponse.headers.get("x-content-type-options"), "nosniff");

  const fallbackResponse = await handler.fetch(new Request("https://demo.invalid/ruta-sin-extension"), { ASSETS: assets });
  assert.strictEqual(fallbackResponse.status, 200, "el Worker no resuelve la ruta de fallback");
}

verifyWorker()
  .then(() => {
    console.log("# Demo pública estática: APTA");
    console.log(`Mundo sincronizado: ${canonicalWorld.id}`);
    console.log("Adaptador, Worker, orden de carga y configuración de alojamiento: correctos.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
