"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const WORLD = "worlds/Aventura/aventura_el_testigo_de_ulldecona.json";
const SEED = "fabrica/semillas/el_testigo_de_ulldecona_semilla_v1_2.json";
const WORLD_ID = "aventura_el_testigo_de_ulldecona_001";

const checks = [
  ["World schema and narrative", ["scripts/qa/qa_world.js", WORLD]],
  ["Agency and reachable endings", ["scripts/qa/preflight_agencia.js", "--profile=aventura_corta_reactiva", WORLD]],
  ["Resource economy", ["scripts/qa/qa_economia_recursos.js", "--mode=gate", WORLD]],
  ["Causal persistence", ["scripts/qa/qa_persistencia_causal.js", "--mode=gate", WORLD]],
  ["Runtime adapter", ["scripts/qa/test_world_v1_runtime.js", WORLD]],
  ["Experience signature", ["scripts/qa/qa_experiencia_mundo.js", SEED, WORLD]],
  ["Mobile layout", ["scripts/qa/qa_mobile_final_layout.js"]],
  ["Visual manifest", ["scripts/qa/qa_visual_manifest.js", WORLD_ID]],
  ["Visual coverage", ["scripts/qa/qa_visual_coverage.js", WORLD_ID]],
  ["HTTP guided routes", ["scripts/qa/smoke_world_http.js", WORLD]],
];

for (const [label, args] of checks) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, LOG_PROMPTS_COMPLETS: "false" },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\nSubmission QA stopped at: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log("\n=== PROJECT DM SUBMISSION: ALL CHECKS PASSED ===");
