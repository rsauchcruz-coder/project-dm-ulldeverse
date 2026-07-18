"use strict";

const {
  collectVisibleStrings,
  countPressioDelta,
  guidedNodes,
  isFinalNode,
  loadWorld,
  optionText,
  optionsOf,
  words,
  worldGenre,
} = require("./lib/world_utils");

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
  return sorted[index];
}

function medirMundo(filePath) {
  const { world } = loadWorld(filePath);
  const nodes = guidedNodes(world);
  const finals = nodes.filter(isFinalNode);
  const visible = nodes.flatMap(collectVisibleStrings).map((entry) => entry.text);
  const fieldWordCounts = visible.map((text) => words(text).length);
  const textBaseLengths = nodes.map((node) => String(node.text_base || node.text || "").length).filter(Boolean);
  const optionTexts = nodes.flatMap((node) => optionsOf(node).map(optionText)).filter(Boolean);
  const dialogueNodes = nodes.filter((node) => /[«»]|"[^"]{3,}"|\b(dice|susurra|grita|pregunta|responde)\b/i.test(collectVisibleStrings(node).map((entry) => entry.text).join("\n"))).length;
  const pressio = countPressioDelta(nodes);

  return {
    file: filePath,
    genre: worldGenre(world),
    nodes: nodes.length,
    finals: finals.length,
    nonFinals: nodes.length - finals.length,
    options: optionTexts.length,
    visibleFields: visible.length,
    visibleWords: words(visible.join("\n")).length,
    wordsPerVisibleField: {
      median: median(fieldWordCounts),
      p90: percentile(fieldWordCounts, 0.9),
    },
    textBaseChars: {
      avg: textBaseLengths.length ? Math.round(textBaseLengths.reduce((a, b) => a + b, 0) / textBaseLengths.length) : 0,
      median: median(textBaseLengths),
      p90: percentile(textBaseLengths, 0.9),
      over700: textBaseLengths.filter((length) => length > 700).length,
    },
    dialogueNodes,
    dialogueNodeRatio: nodes.length ? Number((dialogueNodes / nodes.length).toFixed(2)) : 0,
    pressioDelta: pressio,
  };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Uso: node scripts/qa/medir_mundos.js <mundo.json> [...]");
    process.exit(2);
  }
  const results = files.map(medirMundo);
  console.log(JSON.stringify(results, null, 2));
}

module.exports = { medirMundo };
