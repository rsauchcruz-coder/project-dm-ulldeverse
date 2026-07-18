"use strict";

const {
  collectVisibleStrings,
  countPressioDelta,
  genreNeedsPressure,
  guidedNodes,
  loadWorld,
  makeIssue,
  splitIssues,
  printResult,
  worldGenre,
} = require("./lib/world_utils");

function auditarPresion(filePath) {
  let loaded;
  try {
    loaded = loadWorld(filePath);
  } catch (error) {
    return {
      file: filePath,
      errors: [makeIssue("error", "json_invalido", error.message)],
      warnings: [],
      metrics: {},
    };
  }

  const { world } = loaded;
  const issues = [];
  const nodes = guidedNodes(world);
  const pressure = countPressioDelta(nodes);
  const needsPressure = genreNeedsPressure(world);
  const visiblePressureMentions = nodes
    .flatMap(collectVisibleStrings)
    .filter(({ key, text }) => /pressio|presion|presión|tension|tensión|amenaza|peligro|miedo|panico|pánico/i.test(`${key} ${text}`)).length;

  if (needsPressure && pressure.total === 0) {
    issues.push(makeIssue("error", "presion_congelada", "El genero exige presion/tension, pero no hay ningun pressio_delta."));
  } else if (needsPressure && pressure.nonZero === 0) {
    issues.push(makeIssue("error", "presion_sin_movimiento", "Hay pressio_delta, pero ninguno mueve realmente la presion."));
  }

  if (needsPressure && visiblePressureMentions === 0) {
    issues.push(makeIssue("warning", "presion_poco_visible", "No se detectan huellas visibles de presion/tension en nodos."));
  }

  if (!needsPressure && pressure.total === 0) {
    issues.push(makeIssue("warning", "sin_presion", "No hay pressio_delta; puede ser correcto si el genero no depende de tension mecanica."));
  }

  const split = splitIssues(issues);
  return {
    file: filePath,
    ...split,
    metrics: {
      genre: worldGenre(world),
      needsPressure,
      pressio_delta_total: pressure.total,
      pressio_delta_non_zero: pressure.nonZero,
      pressio_delta_hist: pressure.hist,
      visiblePressureMentions,
    },
  };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Uso: node scripts/qa/auditar_presion.js <mundo.json> [...]");
    process.exit(2);
  }
  let exitCode = 0;
  for (const file of files) {
    const result = auditarPresion(file);
    printResult(`Presion: ${file}`, result);
    if (result.errors.length) exitCode = 1;
  }
  process.exit(exitCode);
}

module.exports = { auditarPresion };
