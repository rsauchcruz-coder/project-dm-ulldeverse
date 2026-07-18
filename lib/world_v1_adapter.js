"use strict";

const SCHEMA_VERSION = "world_v1";

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function humanizeId(value) {
  const text = String(value || "")
    .replace(/^(inv|pista|flag)_/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function visibleName(item) {
  if (!item || typeof item !== "object") return humanizeId(item);
  return String(firstDefined(item.nombre_visible, item.nombre, item.nom, item.titulo, item.id, ""));
}

function isWorldV1(world) {
  return Boolean(world && typeof world === "object" && world.schema_version === SCHEMA_VERSION);
}

function mapRequirements(value) {
  if (Array.isArray(value)) return value.slice();
  if (!value || typeof value !== "object") return value ? [String(value)] : [];
  return {
    inventari: arr(firstDefined(value.inventari, value.inventario, value.inventory)),
    pista: arr(firstDefined(value.pista, value.pistas, value.pistes, value.clues)),
    flag: arr(firstDefined(value.flag, value.flags)),
    variables: firstDefined(value.variables, []),
  };
}

function mapChanges(changes = {}) {
  const output = {};
  const mappings = [
    ["pressio_delta", firstDefined(changes.presion_delta, changes.pressio_delta, changes.pressure_delta)],
    ["ubicacio_nova", firstDefined(changes.ubicacion_nueva, changes.ubicacio_nova, changes.location_new)],
    ["inventari_afegir", firstDefined(changes.inventario_agregar, changes.inventari_afegir, changes.inventory_add)],
    ["inventari_treure", firstDefined(changes.inventario_quitar, changes.inventari_treure, changes.inventory_remove)],
    ["pistes_afegir", firstDefined(changes.pistas_agregar, changes.pistes_afegir, changes.clues_add)],
    ["recursos_activar", firstDefined(changes.recursos_activar, changes.resources_activate)],
    ["pnj_implicats_afegir", firstDefined(changes.pnj_implicados_agregar, changes.pnj_implicats_afegir, changes.npcs_add)],
    ["flags_set", firstDefined(changes.flags_set, changes.flags_establecer)],
    ["variables_set", firstDefined(changes.variables_set, changes.variables_establecer)],
    ["set_estado", firstDefined(changes.establecer_estado, changes.set_estado)],
    ["set_estado_si", firstDefined(changes.establecer_estado_si, changes.set_estado_si)],
    ["activa_si", firstDefined(changes.activar_si, changes.activa_si)],
  ];
  for (const [key, value] of mappings) if (value !== undefined) output[key] = value;
  return output;
}

function mapResolution(rule = {}) {
  return {
    ...rule,
    si: firstDefined(rule.si, rule.requisitos, []),
    si_no: firstDefined(rule.si_no, rule.requisitos_ausentes, []),
    hacia: firstDefined(rule.hacia, rule.destino, rule.node_seguent, ""),
    canvis_estat: mapChanges(firstDefined(rule.cambios_estado, rule.canvis_estat, {})),
  };
}

function mapOption(option = {}) {
  const alternatives = firstDefined(option.requisitos_alternativos, option.requereix_alternatiu);
  const output = {
    id: option.id,
    text: firstDefined(option.texto, option.text, ""),
    tipus: firstDefined(option.tipo, option.tipus, "decision"),
    node_seguent: firstDefined(option.destino, option.node_seguent, ""),
    requereix: mapRequirements(firstDefined(option.requisitos, option.requereix, [])),
    requereix_absent: mapRequirements(firstDefined(option.requisitos_ausentes, option.requereix_absent, [])),
    consequencia_base: firstDefined(option.consecuencia, option.consequencia_base, ""),
    canvis_estat: mapChanges(firstDefined(option.cambios_estado, option.canvis_estat, {})),
    postura_jugador: option.postura_jugador,
    residuo: option.residuo,
    titulo_hoja_destino: option.titulo_hoja_destino,
  };
  if (alternatives !== undefined) {
    output.requisitos_alternativos = arr(alternatives).map((alternative) =>
      Array.isArray(alternative) ? alternative.slice() : {
        ...alternative,
        requisitos: mapRequirements(firstDefined(alternative.requisitos, alternative.requereix, alternative)),
        requisitos_ausentes: mapRequirements(firstDefined(alternative.requisitos_ausentes, alternative.requereix_absent, [])),
      }
    );
  }
  const pressureMin = firstDefined(option.presion_min, option.pressio_min, option.pressure_min);
  const pressureMax = firstDefined(option.presion_max, option.pressio_max, option.pressure_max);
  if (pressureMin !== undefined) output.pressio_min = pressureMin;
  if (pressureMax !== undefined) output.pressio_max = pressureMax;
  if (option.trigger_final !== undefined) output.trigger_final = option.trigger_final;
  const ordered = firstDefined(option.resolucion_ordenada, option.resolucio_ordenada);
  if (Array.isArray(ordered)) output.resolucio_ordenada = ordered.map(mapResolution);
  const failed = firstDefined(option.si_requisito_no_cumplido, option.si_requisit_no_complert);
  if (failed) {
    output.si_requisit_no_complert = {
      ...failed,
      consequencia_base: firstDefined(failed.consecuencia, failed.consequencia_base, ""),
      node_seguent: firstDefined(failed.destino, failed.node_seguent, ""),
      canvis_estat: mapChanges(firstDefined(failed.cambios_estado, failed.canvis_estat, {})),
    };
  }
  return output;
}

function mapVariant(variant = {}, index = 0) {
  const source = firstDefined(variant.sobrescribe, variant.sobrescriu, variant.campos, variant);
  const output = {
    id: variant.id || `variant_${index + 1}`,
    orden: firstDefined(variant.orden, variant.order, index),
    requereix: mapRequirements(firstDefined(variant.requisitos, variant.requereix, [])),
    requereix_absent: mapRequirements(firstDefined(variant.requisitos_ausentes, variant.requereix_absent, [])),
    sobrescriu: {},
  };
  const mappings = [
    ["ubicacio", firstDefined(source.ubicacion, source.ubicacio)],
    ["situacio_visible", firstDefined(source.situacion_visible, source.situacio_visible)],
    ["text_base", firstDefined(source.texto_base, source.text_base, source.texto_final)],
    ["pressio_visible", firstDefined(source.presion_visible, source.pressio_visible)],
    ["personatges_visibles", firstDefined(source.personajes_visibles, source.personatges_visibles)],
    ["entorn_visible", firstDefined(source.entorno_visible, source.entorn_visible)],
  ];
  for (const [key, value] of mappings) if (value !== undefined) output.sobrescriu[key] = value;
  const pressureMin = firstDefined(variant.presion_min, variant.pressio_min, variant.pressure_min);
  const pressureMax = firstDefined(variant.presion_max, variant.pressio_max, variant.pressure_max);
  if (pressureMin !== undefined) output.pressio_min = pressureMin;
  if (pressureMax !== undefined) output.pressio_max = pressureMax;
  return output;
}

function mapVisibleList(value) {
  return arr(value).map((item) => visibleName(item)).filter(Boolean);
}

function mapNode(node = {}, world) {
  const initial = world.estado_inicial || {};
  const location = firstDefined(node.ubicacion, node.ubicacio, initial.ubicacion, "");
  const situation = firstDefined(node.situacion_visible, node.situacio_visible, node.resumen_estructural, "");
  const text = firstDefined(node.texto_base, node.text_base, node.detalle_actual, "");
  const variants = firstDefined(node.variantes_ordenadas, node.variants_ordenades);
  const output = {
    id: node.id,
    fase: node.fase || "escena",
    ubicacio: location,
    tipo_node: firstDefined(node.tipo, node.tipo_node, "decision"),
    es_final: false,
    situacio_visible: situation,
    text_base: text,
    pressio_visible: firstDefined(node.presion_visible, node.pressio_visible, ""),
    personatges_visibles: mapVisibleList(firstDefined(node.personajes_visibles, node.personatges_visibles, node.pnj_en_tension, [])),
    entorn_visible: mapVisibleList(firstDefined(node.entorno_visible, node.entorn_visible, node.objeto_conflicto, [])),
    ubicacion_corta: node.ubicacion_corta,
    focos_consulta: arr(node.focos_consulta),
    opcions: arr(firstDefined(node.opciones, node.opcions, [])).map(mapOption),
    resumen_estructural: node.resumen_estructural,
  };
  if (Array.isArray(variants)) output.variants_ordenades = variants.map(mapVariant);
  return output;
}

function mapFinal(finalNode = {}, world) {
  const initial = world.estado_inicial || {};
  const variants = firstDefined(finalNode.variantes_ordenadas, finalNode.variants_ordenades);
  const output = {
    id: finalNode.id,
    fase: "final",
    ubicacio: firstDefined(finalNode.ubicacion, finalNode.ubicacio, initial.ubicacion, "Resolucion"),
    tipo_node: finalNode.tipo || "final",
    tipus: finalNode.tipo || "final",
    es_final: true,
    situacio_visible: firstDefined(finalNode.situacion_visible, finalNode.titulo, "Final"),
    text_base: firstDefined(finalNode.texto_final, finalNode.text_base, ""),
    pressio_visible: firstDefined(finalNode.presion_visible, "Lo decidido ya pesa en el lugar."),
    personatges_visibles: mapVisibleList(finalNode.personajes_visibles || []),
    entorn_visible: mapVisibleList(finalNode.entorno_visible || []),
    ubicacion_corta: finalNode.ubicacion_corta,
    focos_consulta: arr(finalNode.focos_consulta),
    opcions: [],
    estado_resultante: finalNode.estado_resultante || {},
    condiciones: finalNode.condiciones || {},
  };
  if (Array.isArray(variants)) output.variants_ordenades = variants.map(mapVariant);
  return output;
}

function labelsById(items) {
  return Object.fromEntries(arr(items)
    .filter((item) => item && typeof item === "object" && item.id)
    .map((item) => [item.id, visibleName(item)]));
}

function premiseText(world) {
  const premise = world.premisa || {};
  return [premise.promesa_jugable, premise.conflicto_central].filter(Boolean).join(" ");
}

function playerLegacy(world) {
  const player = world.jugador || {};
  return {
    nom: player.nombre || "",
    rol: player.rol || "",
    motivacio: player.motivacion || "",
    limitacio: player.limitacion || "",
  };
}

function pnjLegacy(world) {
  return arr(world.pnj).map((character) => ({
    nom: visibleName(character),
    paper_visible: character.papel_visible || character.rol_visible || "",
  }));
}

function adaptWorldV1(world) {
  if (!isWorldV1(world)) throw new Error("El adaptador solo acepta schema_version world_v1.");
  const initial = world.estado_inicial || {};
  const pressure = world.sistema_presion || {};
  const range = pressure.rango || {};
  const duration = world.qa?.duracion_objetivo || {};
  const objective = world.premisa?.pregunta_dramatica || world.premisa?.promesa_jugable || "";
  const nodes = arr(world.nodos).map((node) => mapNode(node, world));
  const finals = arr(world.finales).map((node) => mapFinal(node, world));
  const characters = pnjLegacy(world);

  return {
    world_full: {
      id: world.id,
      titol: world.titulo,
      titulo: world.titulo,
      genere: world.genero,
      genero: world.genero,
      idioma: "Castellano",
      premissa: premiseText(world),
      objectiu_central: objective,
      contrato_voz: world.contrato_voz || {},
      pnj: characters,
    },
    runtime_module: {
      id: world.id,
      genere: world.genero,
      intro_jugable: world.introduccion_jugable || "",
      objectiu: objective,
      jugador: playerLegacy(world),
      estat_inicial: {
        ubicacio: initial.ubicacion || "",
        inventari_inicial: arr(initial.inventario),
      },
      pnj_clau: characters,
    },
    guided_short_module: {
      id: world.id,
      world_id: world.id,
      version_guided: "world_v1_adapter",
      llengua_visible: "Castellano",
      durada_objectiu: Number(duration.max ?? duration.min ?? 8),
      pressio_min: Number(range.min ?? 0),
      pressio_max: Number(range.max ?? 10),
      pressio_nom_visible: pressure.nombre_visible || "",
      recursos_visibles: labelsById(world.recursos),
      pistes_visibles: labelsById(world.pistas),
      personatges_visibles: labelsById(world.pnj),
      estat_inicial_guiat: {
        node_inicial: initial.nodo_inicial || nodes[0]?.id || "",
        inventari_inicial: arr(initial.inventario),
        pressio_inicial: Number(initial.presion ?? range.min ?? 0),
        pistes_descobertes: arr(initial.pistas_descubiertas),
        recursos_actius: arr(initial.recursos_activos),
        pnj_implicats: arr(initial.pnj_implicados),
        variables: { ...(initial.variables || {}) },
        flags: { ...(initial.flags || {}) },
        titulo_hoja_inicial: initial.titulo_hoja_inicial || "",
      },
      nodes: [...nodes, ...finals],
    },
    graph_blueprint: null,
    source_schema_version: SCHEMA_VERSION,
    qa: world.qa || {},
  };
}

module.exports = {
  SCHEMA_VERSION,
  adaptWorldV1,
  humanizeId,
  isWorldV1,
  visibleName,
};
