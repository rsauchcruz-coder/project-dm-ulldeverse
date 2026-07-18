"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeWorld } = require("./lib/resource_economy");

function parseArgs(argv) {
  const options = { mode: "report", json: "", all: false };
  const files = [];
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) options.mode = arg.slice("--mode=".length);
    else if (arg.startsWith("--json=")) options.json = arg.slice("--json=".length);
    else if (arg === "--all") options.all = true;
    else files.push(arg);
  }
  return { options, files };
}

function printReport(report, file, all) {
  const visible = all ? report.findings : report.findings.filter((entry) => entry.severity !== "apto");
  console.log(`\n# Economia causal de recursos: ${file}`);
  console.log(`Modo: ${report.mode} | Estados: ${report.summary.reachable_states} | Bloqueos: ${report.summary.blockers} | Avisos: ${report.summary.warnings}`);
  if (!visible.length) console.log("- Sin bloqueos ni avisos.");
  for (const finding of visible) {
    const where = finding.option || finding.node || finding.resource || "mundo";
    console.log(`- ${finding.severity.toUpperCase()} ${finding.code} [${where}]`);
    console.log(`  ${finding.evidence}`);
    if (finding.justified) console.log(`  Excepcion del Director: ${finding.justification}`);
  }
}

function main() {
  const { options, files } = parseArgs(process.argv.slice(2));
  if (!files.length) {
    console.error("Uso: node scripts/qa/qa_economia_recursos.js [--mode=report|gate] [--all] <world_v1.json>");
    process.exit(2);
  }
  const reports = files.map((file) => {
    const world = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
    const report = analyzeWorld(world, options);
    printReport(report, file, options.all);
    return { file, report };
  });
  if (options.json) {
    const payload = reports.length === 1 ? reports[0].report : reports;
    fs.writeFileSync(path.resolve(process.cwd(), options.json), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  if (options.mode === "gate" && reports.some((entry) => entry.report.summary.blockers > 0)) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error("# Economia causal de recursos");
  console.error(`NO ANALIZABLE: ${error.message}`);
  process.exit(1);
}
