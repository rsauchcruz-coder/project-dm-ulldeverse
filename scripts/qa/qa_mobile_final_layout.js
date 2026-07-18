"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(ROOT, "public/index.html"), "utf8");
const css = [
  "public/prototip_v22.css",
  "public/prototip_ui.css",
  "public/prototipo-dossier-premium.css",
].map((file) => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");

function main() {
  assert(
    html.includes("width=device-width,initial-scale=1,viewport-fit=cover"),
    "Falta un viewport móvil compatible con áreas seguras."
  );
  assert(
    /html,\s*body\s*\{[^}]*overflow-y:\s*auto/s.test(css),
    "La página activa no permite desplazamiento vertical explícito."
  );
  assert(
    /#gameScreen\s*\{[^}]*min-height:\s*100dvh[^}]*overflow:\s*visible/s.test(css),
    "La pantalla de juego puede recortar el expediente en móvil."
  );
  assert(
    /body\[data-ui="dossier-premium"\]\s+\.paper\s*\{[^}]*overflow:\s*visible/s.test(css),
    "El papel del expediente puede recortar la narración o el final."
  );
  assert(
    html.indexOf('id="finalCard"') > html.indexOf('id="decisionCard"'),
    "El desenlace debe aparecer después de la decisión dentro del expediente."
  );
  assert(
    /\.side-drawer\s*\{[^}]*overflow-y:\s*auto/s.test(css),
    "El expediente lateral no puede desplazarse en pantallas pequeñas."
  );
  assert(
    /\.sheet\s*\{[^}]*max-height:\s*88vh[^}]*overflow:\s*auto/s.test(css),
    "Las hojas de consulta pueden quedar fuera de la pantalla."
  );

  console.log("# QA móvil ULLDE:VERSE");
  console.log("Viewport, scroll, expediente, desenlace y paneles: APTOS");
}

try {
  main();
} catch (error) {
  console.error("# QA móvil ULLDE:VERSE");
  console.error(`NO APTO: ${error.message}`);
  process.exit(1);
}
