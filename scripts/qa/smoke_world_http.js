"use strict";
// Smoke generico: cada mundo declara qa.rutas_smoke_runtime con ids de accion y nodo esperado.
const assert = require("assert"); const fs = require("fs"); const path = require("path"); const { spawn } = require("child_process"); const { assertRuntimeScene } = require("./lib/agencia_desenlace");
const ROOT = path.resolve(__dirname, "../.."); const file = process.argv[2];
if (!file) { console.error("Uso: node scripts/qa/smoke_world_http.js <world_v1.json>"); process.exit(2); }
const world = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8")); const routes = world.qa?.rutas_smoke_runtime || [];
if (!routes.length) { console.error("RUTA_SMOKE_DESINCRONIZADA: faltan qa.rutas_smoke_runtime."); process.exit(1); }
const options = new Map((world.nodos || []).flatMap((node) => (node.opciones || []).map((option) => [option.id, option]))); const port = 3198;
const runtimeFiles = ["Dades/historial_mons.json", "Dades/logs_motor.jsonl", "Dades/mon_seleccionat.json", "Dades/runtime_actual.json", "saves_web/autosave_server.json"];
function snapshotRuntime() { return runtimeFiles.map((relative) => { const target = path.join(ROOT, relative); return { target, existed: fs.existsSync(target), content: fs.existsSync(target) ? fs.readFileSync(target) : null }; }); }
function restoreRuntime(snapshot) { for (const item of snapshot) { if (item.existed) fs.writeFileSync(item.target, item.content); else if (fs.existsSync(item.target)) fs.unlinkSync(item.target); } }
const request = async (pathname, body) => { const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); assert(response.ok, `${pathname}: HTTP ${response.status}`); return response.json(); };
async function stop(child) { if (child.exitCode !== null) return; await new Promise((resolve) => { const timer = setTimeout(resolve, 2500); child.once("exit", () => { clearTimeout(timer); resolve(); }); child.kill(); }); }
async function run() {
  const snapshot = snapshotRuntime();
  const child = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port), QA_RUNTIME_IDS: "1" }, stdio: "ignore", windowsHide: true });
  try {
    for (let retry = 0; retry < 40; retry += 1) { try { await fetch(`http://127.0.0.1:${port}/health`); break; } catch (_) { await new Promise((resolve) => setTimeout(resolve, 150)); } }
    for (const route of routes) {
      let scene = await request("/iniciar", { genere: world.genero, mode: "CURT GUIAT", forcarMonId: world.id });
      const intro = String(world.introduccion_jugable || "").trim();
      if (intro) {
        const anchor = intro.replace(/\s+/g, " ").split(" ").slice(0, 6).join(" ");
        assert(String(scene.text || "").includes(anchor), `${route.id}: la introduccion jugable no llega a la respuesta inicial.`);
      }
      for (let index = 0; index < route.acciones.length; index += 1) { const option = options.get(route.acciones[index]); assert(option, `${route.id}: no existe ${route.acciones[index]}`); scene = await request("/accio", { accio: option.texto }); }
      try { assertRuntimeScene(scene, route.espera, route.id); }
      catch (error) { throw new Error(`${error.message}; visibles=${(scene.accions_ui || []).map((action) => action.original_text || action.text).join(" | ")}`); }
    }
  } finally { await stop(child); restoreRuntime(snapshot); }
}
run().then(() => console.log(`# Smoke HTTP: APTO (${routes.length} rutas)`)).catch((error) => { console.error(`# Smoke HTTP: NO APTO: ${error.message}`); process.exitCode = 1; });
