"use strict";

const { validarSchema } = require("./validar_schema");
const { lintNarrativo } = require("./lint_narrativo");
const { auditarPresion } = require("./auditar_presion");
const { simularRutas } = require("./simular_rutas");
const { medirMundo } = require("./medir_mundos");

function combineResults(file, sections) {
  const errors = sections.flatMap((section) => section.result.errors.map((issue) => ({ ...issue, section: section.name })));
  const warnings = sections.flatMap((section) => section.result.warnings.map((issue) => ({ ...issue, section: section.name })));
  return {
    file,
    verdict: errors.length ? "NO_APTO" : warnings.length ? "APTO_CON_AVISOS" : "APTO",
    errors,
    warnings,
    metrics: Object.fromEntries(sections.map((section) => [section.name, section.result.metrics || {}])),
    measurement: medirMundo(file),
  };
}

function qaWorld(file) {
  const sections = [
    { name: "schema", result: validarSchema(file) },
    { name: "narrativa", result: lintNarrativo(file) },
    { name: "presion", result: auditarPresion(file) },
    { name: "rutas", result: simularRutas(file) },
  ];
  return combineResults(file, sections);
}

function printQa(result) {
  console.log(`\n# QA ${result.file}`);
  console.log(`Veredicto: ${result.verdict}`);
  console.log(`Errores: ${result.errors.length} | Avisos: ${result.warnings.length}`);
  console.log("Metricas:", JSON.stringify(result.measurement, null, 2));

  for (const issue of result.errors) {
    const where = issue.where ? ` [${issue.where}]` : "";
    console.log(`- ERROR ${issue.section}/${issue.code}${where}: ${issue.message}`);
  }
  for (const issue of result.warnings) {
    const where = issue.where ? ` [${issue.where}]` : "";
    console.log(`- AVISO ${issue.section}/${issue.code}${where}: ${issue.message}`);
  }
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Uso: node scripts/qa/qa_world.js <mundo.json> [...]");
    process.exit(2);
  }
  let exitCode = 0;
  for (const file of files) {
    const result = qaWorld(file);
    printQa(result);
    if (result.verdict === "NO_APTO") exitCode = 1;
  }
  process.exit(exitCode);
}

module.exports = { qaWorld };

