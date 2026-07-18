"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeWorld } = require("./lib/causal_persistence");

const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith("--mode="));
const mode = modeArg ? modeArg.slice("--mode=".length) : "report";
const files = args.filter((arg) => !arg.startsWith("--mode="));
if (!files.length) {
  console.error("Uso: node scripts/qa/qa_persistencia_causal.js [--mode=report|gate] <world_v1.json> [...]");
  process.exit(2);
}

let exitCode = 0;
for (const file of files) {
  try {
    const world = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
    const report = analyzeWorld(world, { mode });
    console.log(`\n# Persistencia causal: ${file}`);
    console.log(`Modo: ${mode} | Estados: ${report.summary.states} | Promesas: ${report.summary.promises} | Bloqueos: ${report.summary.blockers} | Avisos: ${report.summary.warnings}`);
    for (const entry of report.findings) {
      const where = entry.promise || entry.node || entry.final || entry.variable || "mundo";
      console.log(`- ${entry.severity.toUpperCase()} ${entry.code} [${where}] ${entry.message}`);
    }
    if (mode === "gate" && report.summary.blockers) exitCode = 1;
  } catch (error) {
    console.error(`\n# Persistencia causal: ${file}\nNO ANALIZABLE: ${error.message}`);
    exitCode = 1;
  }
}
process.exit(exitCode);
