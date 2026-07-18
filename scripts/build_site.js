"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DIST_DIR = path.join(ROOT, "dist");
const STATIC_INDEX = path.join(PUBLIC_DIR, "index-static.html");

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });
fs.cpSync(PUBLIC_DIR, DIST_DIR, { recursive: true });
fs.copyFileSync(STATIC_INDEX, path.join(DIST_DIR, "index.html"));
fs.rmSync(path.join(DIST_DIR, "index-static.html"), { force: true });

for (const relative of [
  "index.html",
  "static-demo-runtime.js",
  "demo-world.json",
  "media/aventura_el_testigo_de_ulldecona_001/manifest.json",
]) {
  if (!fs.existsSync(path.join(DIST_DIR, relative))) {
    throw new Error(`Falta el artefacto público requerido: ${relative}`);
  }
}

console.log("# Build público estático: APTO");
console.log(`Salida: ${DIST_DIR}`);
