"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const guidedState = require("../../lib/guided_state");
const { adaptWorldV1, isWorldV1 } = require("../../lib/world_v1_adapter");
const { preflightAgencia } = require("./preflight_agencia");

const ROOT = path.resolve(__dirname, "../..");
const JANO_FILE = path.join(ROOT, "fabrica/drafts/2026-07-10_jano_world_v1_1_esqueleto.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function initialState(guided) {
  const source = guided.estat_inicial_guiat || {};
  return {
    pressio: Number(source.pressio_inicial ?? 0),
    pressio_min: Number(guided.pressio_min ?? 0),
    pressio_max: Number(guided.pressio_max ?? 10),
    inventari_actual: clone(source.inventari_inicial || []),
    pistes_descobertes: clone(source.pistes_descobertes || []),
    recursos_actius: clone(source.recursos_actius || []),
    pnj_implicats: clone(source.pnj_implicats || []),
    variables: clone(source.variables || {}),
    flags: clone(source.flags || {}),
  };
}

function visibleOptions(node, state) {
  return (node.opcions || []).filter((option) => guidedState.optionVisible(option, state));
}

function enumerateRuntime(guided) {
  const nodes = new Map(guided.nodes.map((node) => [node.id, node]));
  const metrics = {
    paths: 0,
    minTurns: Infinity,
    maxTurns: 0,
    finalIds: new Set(),
    finalFamilies: new Set(),
    deadEnds: [],
    overfullMenus: [],
  };

  function walk(nodeId, state, turns, history) {
    if (turns > 20) throw new Error(`Posible ciclo tras ${history.join(" -> ")}`);
    const node = nodes.get(nodeId);
    assert(node, `Destino inexistente en runtime: ${nodeId}`);
    if (node.es_final) {
      metrics.paths += 1;
      metrics.minTurns = Math.min(metrics.minTurns, turns);
      metrics.maxTurns = Math.max(metrics.maxTurns, turns);
      metrics.finalIds.add(node.id);
      if (node.estado_resultante?.familia) metrics.finalFamilies.add(node.estado_resultante.familia);
      return;
    }

    const options = visibleOptions(node, state);
    if (!options.length) metrics.deadEnds.push({ node: node.id, history });
    if (options.length > 4) metrics.overfullMenus.push({ node: node.id, count: options.length, history });
    for (const option of options) {
      assert(option.node_seguent, `Opcion sin destino: ${node.id}/${option.id}`);
      const nextState = clone(state);
      guidedState.applyChanges(nextState, option.canvis_estat || {}, {
        min: guided.pressio_min,
        max: guided.pressio_max,
      });
      walk(option.node_seguent, nextState, turns + 1, [...history, option.id]);
    }
  }

  walk(guided.estat_inicial_guiat.node_inicial, initialState(guided), 0, []);
  return metrics;
}

function verifyRuntimeParity(filePath) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const canonical = JSON.parse(sourceText);
  const before = JSON.stringify(canonical);
  assert(isWorldV1(canonical), `${filePath} debe declarar schema_version world_v1.`);

  const adapted = adaptWorldV1(canonical);
  assert.strictEqual(JSON.stringify(canonical), before, "El adaptador no debe mutar el mundo fuente.");
  assert(adapted.world_full && adapted.runtime_module && adapted.guided_short_module, "Faltan bloques legacy adaptados.");
  assert.strictEqual(adapted.source_schema_version, "world_v1");

  const guided = adapted.guided_short_module;
  const expectedNodeCount = (canonical.nodos || []).length + (canonical.finales || []).length;
  assert.strictEqual(guided.nodes.length, expectedNodeCount, "El adaptador debe conservar todos los nodos y finales.");
  assert.strictEqual(
    guided.estat_inicial_guiat.pressio_inicial,
    Number(canonical.estado_inicial?.presion ?? canonical.sistema_presion?.rango?.min ?? 0),
    "El adaptador debe conservar la presion inicial, incluido el valor cero."
  );

  for (const resource of canonical.recursos || []) {
    assert(resource.nombre_visible, `El recurso ${resource.id} no declara nombre_visible.`);
    assert.strictEqual(guided.recursos_visibles[resource.id], resource.nombre_visible);
  }
  for (const clue of canonical.pistas || []) {
    assert(clue.nombre_visible, `La pista ${clue.id} no declara nombre_visible.`);
    assert.strictEqual(guided.pistes_visibles[clue.id], clue.nombre_visible);
  }
  for (const character of canonical.pnj || []) {
    assert(character.nombre_visible, `El PNJ ${character.id} no declara nombre_visible.`);
    assert.strictEqual(guided.personatges_visibles[character.id], character.nombre_visible);
  }

  const metrics = enumerateRuntime(guided);
  const preflight = preflightAgencia(filePath);
  assert.notStrictEqual(preflight.verdict, "NO_APTO_PARA_NARRAR", "El runtime no puede aprobar una arquitectura rechazada por preflight.");
  assert.strictEqual(metrics.deadEnds.length, 0, "No puede haber callejones sin salida en runtime.");
  assert.strictEqual(metrics.overfullMenus.length, 0, "No puede haber mas de cuatro opciones visibles.");
  assert.strictEqual(metrics.paths, preflight.metrics.completedPaths, "Preflight y runtime deben contar las mismas rutas.");

  const expectedFinalIds = Object.keys(preflight.metrics.finalDistribution || {}).sort();
  assert.deepStrictEqual([...metrics.finalIds].sort(), expectedFinalIds, "Preflight y runtime deben alcanzar los mismos finales.");
  const distributions = Object.values(preflight.metrics.finalDistribution || {});
  const expectedMin = Math.min(...distributions.map((entry) => entry.minTurn));
  const expectedMax = Math.max(...distributions.map((entry) => entry.maxTurn));
  assert.strictEqual(metrics.minTurns, expectedMin, "Preflight y runtime discrepan en la duracion minima.");
  assert.strictEqual(metrics.maxTurns, expectedMax, "Preflight y runtime discrepan en la duracion maxima.");

  return { canonical, adapted, guided, metrics, preflight };
}

function testAdapterAndRuntime() {
  const { canonical, guided, metrics } = verifyRuntimeParity(JANO_FILE);
  assert.strictEqual(guided.nodes.length, 30, "Deben compilarse 18 escenas y 12 finales.");
  assert.strictEqual(guided.estat_inicial_guiat.pressio_inicial, 0, "La presion inicial cero no puede convertirse en dos.");
  assert.strictEqual(guided.recursos_visibles.inv_lampara_aceite, "Lámpara de aceite");
  assert.strictEqual(guided.pistes_visibles.pista_sello_jano_incompleto, "El sello de Jano está incompleto: falta la mitad derecha");
  assert.strictEqual(guided.nodes[0].opcions.length, 3);

  const byId = new Map(guided.nodes.map((node) => [node.id, node]));
  const termas = byId.get("n04_termas_cerradas");
  const highPressureAelia = {
    ...initialState(guided),
    pressio: 4,
    flags: { flag_ruta_aelia: true, flag_rastro_cera_preparado: true },
    inventari_actual: ["inv_media_tablilla_izquierda", "inv_astilla_cera_negra"],
  };
  assert.deepStrictEqual(
    visibleOptions(termas, highPressureAelia).map((option) => option.id),
    ["o27_aelia_forzar", "o28_aelia_cerco"],
    "El cerco de presion alta debe sustituir las entradas discretas por fuerza o derrota."
  );

  const lowPressureAelia = { ...highPressureAelia, pressio: 3 };
  const lowIds = visibleOptions(termas, lowPressureAelia).map((option) => option.id);
  assert(lowIds.includes("o25_aelia_cera") && lowIds.includes("o27b_aelia_entrada_baja"));
  assert(!lowIds.includes("o28_aelia_cerco"));

  const sealOption = byId.get("n08_aelia_climax").opcions.find((option) => option.id === "o60_aelia_sellar");
  assert(guidedState.optionVisible(sealOption, {
    ...initialState(guided),
    flags: { flag_advertencia_completa: true },
  }), "Una alternativa satisfecha debe habilitar la opcion.");

  const accuseOption = byId.get("n08_aelia_climax").opcions.find((option) => option.id === "o61_aelia_acusar_celer");
  assert(!guidedState.optionVisible(accuseOption, {
    ...initialState(guided),
    flags: { flag_advertencia_completa: true, flag_aelia_desconfia: true },
  }), "Un requisito ausente debe poder bloquear una opcion.");

  assert(!guidedState.tokenPresent("presion>=5", { ...initialState(guided), pressio: 4 }));
  assert(guidedState.tokenPresent("presion>=5", { ...initialState(guided), pressio: 5 }));

  const debtState = {
    ...initialState(guided),
    pressio: 5,
    inventari_actual: ["inv_anillo_celer"],
    flags: { flag_deuda_celer_peligrosa: true },
  };
  const breakRing = byId.get("n05_conducto_crisis").opcions.find((option) => option.id === "o48_celer_romper_anillo");
  guidedState.applyChanges(debtState, breakRing.canvis_estat, { min: 0, max: 10 });
  assert.strictEqual(debtState.flags.flag_deuda_celer_peligrosa, false, "El runtime debe conservar flags false.");
  assert.strictEqual(debtState.flags.flag_sin_deuda_celer, true);
  assert(!debtState.inventari_actual.includes("inv_anillo_celer"));

  const variantWorld = clone(canonical);
  variantWorld.nodos[0].variantes_ordenadas = [
    {
      id: "bajo_cerco",
      orden: 10,
      requisitos: ["flag_ruta_aelia"],
      presion_min: 4,
      sobrescribe: { situacion_visible: "Los hombres de Celer cierran el portico." },
    },
    {
      id: "sin_cerco",
      orden: 20,
      presion_max: 3,
      sobrescribe: { situacion_visible: "El portico sigue libre." },
    },
  ];
  const variantNode = adaptWorldV1(variantWorld).guided_short_module.nodes[0];
  const resolvedHigh = guidedState.resolveNodeVariant(variantNode, {
    ...initialState(guided),
    pressio: 5,
    flags: { flag_ruta_aelia: true },
  });
  const resolvedLow = guidedState.resolveNodeVariant(variantNode, { ...initialState(guided), pressio: 2 });
  assert.strictEqual(resolvedHigh.__variant_id, "bajo_cerco");
  assert.strictEqual(resolvedHigh.situacio_visible, "Los hombres de Celer cierran el portico.");
  assert.strictEqual(resolvedLow.__variant_id, "sin_cerco");
  assert.strictEqual(resolvedLow.situacio_visible, "El portico sigue libre.");
  assert.strictEqual(resolvedHigh.opcions.length, variantNode.opcions.length, "Una variante textual no puede reescribir el grafo.");

  variantWorld.finales[0].variantes_ordenadas = [
    {
      id: "final_con_prueba",
      orden: 10,
      requisitos: ["flag_prueba_final"],
      sobrescribe: {
        situacion_visible: "La prueba llega al final.",
        texto_final: "El cierre conserva la prueba concreta.",
      },
    },
  ];
  const adaptedWithFinalVariant = adaptWorldV1(variantWorld).guided_short_module;
  const variantFinal = adaptedWithFinalVariant.nodes.find((node) => node.id === variantWorld.finales[0].id);
  const resolvedFinal = guidedState.resolveNodeVariant(variantFinal, {
    ...initialState(guided),
    flags: { flag_prueba_final: true },
  });
  assert.strictEqual(resolvedFinal.__variant_id, "final_con_prueba");
  assert.strictEqual(resolvedFinal.situacio_visible, "La prueba llega al final.");
  assert.strictEqual(resolvedFinal.text_base, "El cierre conserva la prueba concreta.");
  assert.deepStrictEqual(resolvedFinal.opcions, [], "Una variante final no puede crear opciones nuevas.");

  const presentationWorld = clone(canonical);
  presentationWorld.estado_inicial.titulo_hoja_inicial = "Prólogo";
  presentationWorld.nodos[0].ubicacion_corta = "Foro";
  presentationWorld.nodos[0].focos_consulta = [{ id: "foco_arco", etiqueta: "Arco", tipo: "entorno", descripcion: "La salida sigue abierta." }];
  presentationWorld.nodos[0].opciones[0].titulo_hoja_destino = "La entrada";
  const presentationGuided = adaptWorldV1(presentationWorld).guided_short_module;
  assert.strictEqual(presentationGuided.estat_inicial_guiat.titulo_hoja_inicial, "Prólogo");
  assert.strictEqual(presentationGuided.nodes[0].ubicacion_corta, "Foro");
  assert.strictEqual(presentationGuided.nodes[0].focos_consulta[0].id, "foco_arco");
  assert.strictEqual(presentationGuided.nodes[0].opcions[0].titulo_hoja_destino, "La entrada");

  assert.strictEqual(metrics.paths, 1202, "El runtime adaptado debe conservar las 1.202 secuencias del preflight.");
  assert.strictEqual(metrics.finalIds.size, 12, "Los doce finales deben ser alcanzables.");
  assert.deepStrictEqual([...metrics.finalFamilies].sort(), ["contencion", "fracaso", "poder", "revelacion"]);
  assert.strictEqual(metrics.maxTurns, 8, "Las rutas completas deben terminar en ocho decisiones.");

  return metrics;
}

if (require.main === module) {
  try {
    const files = process.argv.slice(2);
    const results = files.length
      ? files.map((file) => verifyRuntimeParity(path.resolve(ROOT, file)))
      : [{ metrics: testAdapterAndRuntime() }];
    for (let index = 0; index < results.length; index += 1) {
      const metrics = results[index].metrics;
      console.log("# QA world_v1 runtime");
      if (files[index]) console.log(`Mundo: ${files[index]}`);
      console.log("Adaptador: APTO");
      console.log(`Rutas ejecutadas: ${metrics.paths}`);
      console.log(`Finales alcanzables: ${metrics.finalIds.size}`);
      console.log(`Duracion: ${metrics.minTurns}-${metrics.maxTurns} decisiones`);
    }
    process.exit(0);
  } catch (error) {
    console.error("# QA world_v1 runtime");
    console.error(`NO APTO: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { enumerateRuntime, testAdapterAndRuntime, verifyRuntimeParity };
