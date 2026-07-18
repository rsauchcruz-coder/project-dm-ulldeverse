"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DIST_DIR = path.join(ROOT, "dist");
const CLIENT_DIR = path.join(DIST_DIR, "client");
const SERVER_DIR = path.join(DIST_DIR, "server");
const STATIC_INDEX = path.join(PUBLIC_DIR, "index-static.html");
const WORKER_SOURCE = path.join(ROOT, "site", "worker.mjs");
const HOSTING_SOURCE = path.join(ROOT, ".openai", "hosting.json");

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(CLIENT_DIR, { recursive: true });
fs.mkdirSync(SERVER_DIR, { recursive: true });
fs.mkdirSync(path.join(DIST_DIR, ".openai"), { recursive: true });
fs.cpSync(PUBLIC_DIR, CLIENT_DIR, { recursive: true });
fs.copyFileSync(STATIC_INDEX, path.join(CLIENT_DIR, "index.html"));
fs.rmSync(path.join(CLIENT_DIR, "index-static.html"), { force: true });
fs.copyFileSync(WORKER_SOURCE, path.join(SERVER_DIR, "index.js"));
fs.copyFileSync(HOSTING_SOURCE, path.join(DIST_DIR, ".openai", "hosting.json"));

for (const relative of [
  "client/index.html",
  "client/static-demo-runtime.js",
  "client/demo-world.json",
  "client/media/aventura_el_testigo_de_ulldecona_001/manifest.json",
  "server/index.js",
  ".openai/hosting.json",
]) {
  if (!fs.existsSync(path.join(DIST_DIR, relative))) {
    throw new Error(`Falta el artefacto público requerido: ${relative}`);
  }
}

console.log("# Build público estático: APTO");
console.log(`Salida: ${DIST_DIR}`);
