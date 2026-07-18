"use strict";

const {
  guidedNodes,
  isFinalNode,
  loadWorld,
  makeIssue,
  nodeId,
  optionEndsGame,
  optionResolvedTargets,
  optionsOf,
  splitIssues,
  printResult,
} = require("./lib/world_utils");

function reqTokens(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value || typeof value !== "object") return [];
  return [
    ...(Array.isArray(value.inventari) ? value.inventari : []),
    ...(Array.isArray(value.inventario) ? value.inventario : []),
    ...(Array.isArray(value.pista) ? value.pista : []),
    ...(Array.isArray(value.pistas) ? value.pistas : []),
    ...(Array.isArray(value.flag) ? value.flag : []),
    ...(Array.isArray(value.flags) ? value.flags : []),
    ...(Array.isArray(value.variables) ? value.variables : []),
  ].filter(Boolean).map(String);
}

function absentTokens(option) {
  if (!option || typeof option !== "object") return [];
  return reqTokens(
    option.requereix_absent ||
      option.requisitos_ausentes ||
      option.requisitos_absentes ||
      option.requereix_no ||
      option.requiere_no ||
      option.requires_absent ||
      option.absent
  );
}

function optionTextNeedsAbsence(text) {
  return /\b(sin prueba|sin clip|sin llave|sin mascarilla|sin linterna|aunque no|aunque el .* no|no tenga|no tiene|no este guardado|no esté guardado)\b/i.test(String(text || ""));
}

function validarSchema(filePath) {
  const issues = [];
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

  const { sourceWorld, world } = loaded;
  const usesCanonicalWorldV1 = sourceWorld?.schema_version === "world_v1";
  const nodes = guidedNodes(world);

  if (!world.world_full) {
    issues.push(makeIssue("error", "sin_world_full", "Falta bloque world_full."));
  }
  if (!world.runtime_module && !world.guided_short_module) {
    issues.push(makeIssue("warning", "sin_runtime_module", "No se detecta runtime_module ni guided_short_module."));
  }
  if (!nodes.length) {
    issues.push(makeIssue("error", "sin_nodos_guiados", "No hay nodos guided jugables."));
  }

  const ids = new Map();
  for (const node of nodes) {
    const id = nodeId(node);
    if (!id) {
      issues.push(makeIssue("error", "nodo_sin_id", "Hay un nodo sin id."));
      continue;
    }
    if (ids.has(id)) {
      issues.push(makeIssue("error", "id_duplicado", `El id de nodo se repite: ${id}.`, id));
    }
    ids.set(id, node);
  }

  for (const node of nodes) {
    const id = nodeId(node);
    const options = optionsOf(node);
    const finalNode = isFinalNode(node);
    if (!isFinalNode(node) && options.length < 2) {
      issues.push(makeIssue("error", "nodo_no_final_opciones_insuficientes", "Nodo no final debe declarar entre 2 y 4 opciones.", id));
    }
    if (!usesCanonicalWorldV1 && !isFinalNode(node) && options.length > 4) {
      issues.push(makeIssue("error", "nodo_no_final_demasiadas_opciones", "Nodo no final declara mas de 4 opciones; divide la escena o filtra por estado.", id));
    }

    for (const option of options) {
      if (finalNode) continue;
      if (optionTextNeedsAbsence(option?.text) && absentTokens(option).length === 0) {
        issues.push(makeIssue("warning", "opcion_negativa_sin_requisito_absente", "La opcion parece depender de la ausencia de un recurso/estado, pero no declara requereix_absent.", `${id}/${option.id || "opcion"}`));
      }
      const targets = optionResolvedTargets(option);
      if (!targets.length && !optionEndsGame(option)) {
        issues.push(makeIssue("warning", "opcion_sin_destino", "Opcion sin destino explicito.", `${id}/${option.id || "opcion"}`));
      }
      for (const target of targets) {
        if (!ids.has(target)) {
          issues.push(makeIssue("error", "destino_inexistente", `La opcion apunta a un nodo inexistente: ${target}.`, `${id}/${option.id || "opcion"}`));
        }
      }
    }
  }

  const finals = nodes.filter(isFinalNode);
  if (!finals.length) {
    issues.push(makeIssue("error", "sin_finales", "No se detectan nodos finales."));
  }

  const split = splitIssues(issues);
  return {
    file: filePath,
    ...split,
    metrics: {
      nodes: nodes.length,
      finals: finals.length,
      options: nodes.reduce((sum, node) => sum + optionsOf(node).length, 0),
    },
  };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Uso: node scripts/qa/validar_schema.js <mundo.json> [...]");
    process.exit(2);
  }
  let exitCode = 0;
  for (const file of files) {
    const result = validarSchema(file);
    printResult(`Schema: ${file}`, result);
    if (result.errors.length) exitCode = 1;
  }
  process.exit(exitCode);
}

module.exports = { validarSchema };
