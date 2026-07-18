"use strict";

const {
  collectVisibleStrings,
  guidedNodes,
  loadWorld,
  makeIssue,
  nodeId,
  normalizeText,
  optionText,
  optionsOf,
  splitIssues,
  printResult,
} = require("./lib/world_utils");
const guidedState = require("../../lib/guided_state");
const { adaptWorldV1, isWorldV1 } = require("../../lib/world_v1_adapter");
const { enumerateReachableStates, visibleOptions } = require("./lib/counterfactual_agency");

const GENERIC_ACTION = /^(explorar|investigar|avanzar|examinar|mirar|hablar|usar|ir|entrar|salir)\.?$/i;
const GENERIC_START = /^(explorar|investigar|avanzar|examinar|mirar|hablar|usar|ir)\b/i;
const EXTRA_CATALAN = /\b(antipanic)\b/i;
const STATE_AMBIGUITY = /\b(si sigue|si continua|si aun|si a[uú]n|si no la|si no lo|si no ha|si no se|o, si|o si|si (?:el|la|los|las|ramon) [^.]{0,100}\b(?:ha sido entregad[oa]|conserva|lleva|tiene|guarda)\b|con (?:la|el|un|una) [^.]{1,120}\.\s*sin (?:ella|el|ello|eso|ese|esa))\b/i;
const OVER_METAPHOR = /\b(el presente la espera|imagen que ya no pertenece al presente|la tienda parece escuchar|escuchar por los fluorescentes)\b/i;
const MOTOR_LANGUAGE = /\b(flag_|inv_|node_|pressio_delta|canvis_estat|trigger_finalitzacio|runtime_module|guided_short_module|recurso desbloqueado|estado mecanico|estado_mecanico)\b/i;
const MOJIBAKE = /Ã.|Â.|�|[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\?(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ:;,.])/;
const POSSIBLE_CATALAN = /\b(amb|aixo|això|aquesta|aquest|dins|fora|cap a|llengua|estat|clau|rebedor|tancat|cuina|rebost|següent|seguent)\b/i;
const ORTHO_VISIBLE = /\bsenala\b/i;
const MENU_SUMMARY = /\b(puede elegir|puede escoger|tiene que elegir|debe elegir|que clase de|qué clase de|una opcion|una opción|otra opcion|otra opción|(?:puede|debe) (?:entregar|ocultar|conservar|usar|llevar|pedir|exigir|huir|volver)\b[^.]{0,160}(?:,\s*|\s+o\s+)(?:entregar|ocultar|conservar|usar|llevar|pedir|exigir|huir|volver))\b/i;
const RESOURCE_ALTERNATIVE_SUMMARY = /\b(?:la|el) [^.]{1,50}\s+o\s+(?:la|el) [^.]{1,50}\s+permit(?:e|en)\b/i;
const GENERIC_RESOURCE_RESOLUTION = /\b(bronce,\s*madera|madera\s*o\s*simple|simple borde|lo que tenga a mano|con cualquier cosa)\b/i;
const HIDDEN_ABSENCE_TELEGRAPH = /\bsin\s+(?:una?\s+)?(?:dosis|reserva(?:\s+de\s+[\p{L}]+)?|inhalador|cartucho|carga|munici[oó]n|llave|herramienta|prueba)\b/iu;
const HIDDEN_STATE_TELEGRAPH = /\baunque\s+[^.]{0,80}\b(?:ya\s+)?no\s+(?:pueda|tenga|quede|conserve)\b/iu;
const RESOURCE_MENTIONS = [
  { token: "inv_sello_roto_tabulario", pattern: /\bsello roto\b/i },
  { token: "inv_llave_bronce_servicio", pattern: /\bllave de bronce\b|\bllave de servicio\b/i },
  { token: "inv_anillo_celer", pattern: /\banillo de celer\b/i },
  { token: "inv_astilla_cera_negra", pattern: /\bastilla de cera negra\b/i },
];

function array(value) {
  return Array.isArray(value) ? value : [];
}

function optionReq(option) {
  return array(option?.requereix || option?.requisitos || option?.requires);
}

function optionAbsentReq(option) {
  return array(option?.requereix_absent || option?.requisitos_ausentes || option?.requires_absent);
}

function optionGained(option) {
  return array(option?.canvis_estat?.inventari_afegir || option?.canvis_estat?.inventario_agregar || option?.changes?.inventario_agregar);
}

function optionFullText(option) {
  return `${optionText(option)} ${option?.consequencia_base || option?.consecuencia || ""}`;
}

function normalizedTerms(resource) {
  return [...new Set([
    resource?.nombre_visible,
    ...(array(resource?.terminos_visibles)),
  ].map(normalizeText).filter((term) => term.length >= 4))];
}

function mentionsTerm(text, term) {
  return normalizeText(text).includes(normalizeText(term));
}

function nodeResources(node) {
  const found = new Set(array(node?.recursos_escena));
  for (const value of Object.values(node?.recursos_pnj || {})) array(value).forEach((id) => found.add(id));
  for (const value of Object.values(node?.pnj || {})) array(value).forEach((id) => found.add(id));
  return found;
}

function visibleNodeTexts(node) {
  const fields = ["situacio_visible", "situacion_visible", "detalle_actual", "texto_base", "text_base", "presion_visible"];
  const allFields = [...fields, "texto_final"];
  const values = allFields.flatMap((field) => typeof node?.[field] === "string" ? [{ field, text: node[field] }] : []);
  return values.concat(array(node?.entorn_visible || node?.entorno_visible).filter((value) => typeof value === "string").map((text) => ({ field: "entorno_visible", text })));
}

function visibleRecordTexts(node, state) {
  const resolved = guidedState.resolveNodeVariant(node, state);
  const optionEntries = visibleOptions(resolved, state).flatMap((option) => {
    const postState = JSON.parse(JSON.stringify(state));
    guidedState.applyChanges(postState, option.canvis_estat || {}, {
      min: postState.pressio_min,
      max: postState.pressio_max,
    });
    return [
      { field: `opciones/${option.id || "opcion"}/texto`, text: option.text || option.texto || "", state },
      { field: `opciones/${option.id || "opcion"}/consecuencia`, text: option.consequencia_base || option.consecuencia || "", state: postState },
      { field: `opciones/${option.id || "opcion"}/residuo`, text: option.residuo || "", state: postState },
    ];
  });
  return [...visibleNodeTexts(resolved).map((entry) => ({ ...entry, state })), ...optionEntries]
    .filter((entry) => typeof entry.text === "string" && entry.text.trim());
}

function presentationText(node) {
  return [
    ...visibleNodeTexts(node).map((entry) => entry.text),
    ...array(node?.personajes_visibles || node?.personatges_visibles),
    ...array(node?.opciones || node?.opcions || node?.options || node?.acciones || node?.accions).flatMap((option) => [optionText(option), option?.consecuencia || option?.consequencia_base || ""]),
  ].filter((text) => typeof text === "string").join(" ");
}

function characterTerms(character) {
  const visible = String(character?.nombre_visible || "").trim();
  const firstName = visible.split(/\s+/)[0] || "";
  return [...new Set([visible, firstName, ...array(character?.terminos_visibles)])]
    .map(normalizeText)
    .filter((term) => term.length >= 3);
}

function resourceVisibleInState(resource, node, sourceNode, state) {
  return guidedState.tokenPresent(resource.id, state) || nodeResources(node).has(resource.id) || nodeResources(sourceNode).has(resource.id);
}

function stateHasTokens(state, required, absent) {
  return array(required).every((token) => guidedState.tokenPresent(token, state)) &&
    array(absent).every((token) => !guidedState.tokenPresent(token, state));
}

function sceneClues(node) {
  return new Set([
    ...array(node?.pistas_escena),
    ...array(node?.pistas_visibles),
  ].map(String));
}

function characterIsVisible(sourceWorld, node, characterId) {
  if (!characterId || characterId === "jugador") return true;
  const character = array(sourceWorld?.pnj).find((item) => String(item?.id) === String(characterId));
  if (!character) return false;
  const names = [character?.nombre_visible, ...(array(character?.terminos_visibles))]
    .map(normalizeText)
    .filter(Boolean);
  const listed = array(node?.personajes_visibles || node?.personatges_visibles).map(normalizeText);
  return names.some((name) => listed.some((value) => value.includes(name) || name.includes(value)));
}

function truthTerms(truth) {
  return [...new Set(array(truth?.terminos_visibles || truth?.terms).map(normalizeText).filter((term) => term.length >= 4))];
}

function controlledReality(sourceWorld) {
  return sourceWorld?.qa?.realidad_controlada || null;
}

function controlledFacts(sourceWorld) {
  const realityFacts = array(controlledReality(sourceWorld)?.hechos);
  const legacyFacts = array(sourceWorld?.qa?.verdades_controladas?.hechos || sourceWorld?.qa?.verdades_controladas);
  return [...realityFacts, ...legacyFacts];
}

function catalogIds(reality, category) {
  return array(reality?.catalogo?.[category]).map((entry) => String(entry?.id || entry || "")).filter(Boolean);
}

function lintControlledRealityContract(sourceWorld) {
  const reality = controlledReality(sourceWorld);
  if (!reality) return [];
  const issues = [];
  const where = "qa/realidad_controlada";
  if (Number(reality.version) !== 1) {
    issues.push(makeIssue("error", "realidad_controlada_version_invalida", "El libro de realidad controlada debe declarar version 1.", `${where}/version`));
  }
  if (reality.obligatoria !== true) {
    issues.push(makeIssue("error", "realidad_controlada_no_obligatoria", "El libro existe pero no esta activado como puerta obligatoria.", `${where}/obligatoria`));
  }

  const coverage = reality.cobertura || {};
  for (const [field, expected] of [["recursos", "todos"], ["deducciones", "todas"], ["personajes", "todos"]]) {
    if (coverage[field] !== expected) {
      issues.push(makeIssue("error", "realidad_controlada_cobertura_incompleta", `La cobertura de ${field} debe ser '${expected}'.`, `${where}/cobertura/${field}`));
    }
  }

  for (const resource of array(sourceWorld?.recursos)) {
    if (!resource?.id || !normalizedTerms(resource).length) {
      issues.push(makeIssue("error", "recurso_fuera_libro_realidad", "Todo recurso necesita id y terminos visibles auditables.", `recursos/${resource?.id || "sin_id"}`));
    }
  }
  for (const clue of array(sourceWorld?.pistas)) {
    if (!clue?.id || !normalizedTerms(clue).length) {
      issues.push(makeIssue("error", "deduccion_fuera_libro_realidad", "Toda deduccion necesita id y terminos visibles auditables.", `pistas/${clue?.id || "sin_id"}`));
    }
  }

  const facts = array(reality.hechos);
  const factIds = new Set();
  const validCategories = new Set(["personaje", "ruta", "amenaza"]);
  for (const fact of facts) {
    const id = String(fact?.id || "");
    if (!id || factIds.has(id)) {
      issues.push(makeIssue("error", "hecho_controlado_id_invalido", `Cada hecho necesita un id unico; recibido '${id || "vacio"}'.`, `${where}/hechos`));
    }
    factIds.add(id);
    if (!validCategories.has(String(fact?.categoria || "")) || !fact?.sujeto) {
      issues.push(makeIssue("error", "hecho_controlado_sin_clasificar", `${id || "Un hecho"} necesita categoria y sujeto controlado.`, `${where}/hechos/${id || "sin_id"}`));
    }
    const guarded = array(fact?.requisitos).length || array(fact?.requisitos_ausentes).length || fact?.pnj_presente || array(fact?.nodos_permitidos).length;
    if (!guarded) {
      issues.push(makeIssue("error", "hecho_controlado_sin_guarda", `${id || "Un hecho"} no declara ningun estado, presencia o lugar que pueda comprobarse.`, `${where}/hechos/${id || "sin_id"}`));
    }
  }

  const groups = [
    { catalog: "rutas", category: "ruta" },
    { catalog: "amenazas", category: "amenaza" },
    { catalog: "estados_personaje", category: "personaje" },
  ];
  const catalogByCategory = new Map(groups.map((group) => [group.category, new Set(catalogIds(reality, group.catalog))]));
  for (const fact of facts) {
    const catalog = catalogByCategory.get(String(fact?.categoria || ""));
    if (catalog && fact?.sujeto && !catalog.has(String(fact.sujeto))) {
      issues.push(makeIssue("error", "hecho_controlado_fuera_catalogo", `${fact.id || "Un hecho"} protege '${fact.sujeto}', que no figura en el catalogo de realidad.`, `${where}/hechos/${fact.id || "sin_id"}`));
    }
  }
  for (const group of groups) {
    const ids = catalogIds(reality, group.catalog);
    const unique = new Set(ids);
    if (ids.length !== unique.size) {
      issues.push(makeIssue("error", "catalogo_realidad_duplicado", `El catalogo ${group.catalog} contiene ids duplicados.`, `${where}/catalogo/${group.catalog}`));
    }
    for (const id of unique) {
      if (!facts.some((fact) => fact?.categoria === group.category && String(fact?.sujeto || "") === id)) {
        issues.push(makeIssue("error", "realidad_controlada_sin_hecho", `${group.catalog}/${id} esta catalogado, pero ninguna verdad visible lo protege.`, `${where}/catalogo/${group.catalog}/${id}`));
      }
    }
  }
  return issues;
}

function lintVisibleClues(sourceWorld, records, sourceById) {
  const issues = [];
  const seen = new Set();
  for (const clue of array(sourceWorld?.pistas)) {
    const terms = normalizedTerms(clue);
    if (!terms.length) {
      issues.push(makeIssue("error", "pista_sin_terminos_visibles", `La pista ${clue.id} necesita terminos_visibles para poder auditar su aparicion.`, `pistas/${clue.id}`));
      continue;
    }
    for (const record of records) {
      const sourceNode = sourceById.get(String(record.node.id)) || {};
      const sourceResolved = guidedState.resolveNodeVariant(sourceNode, record.state);
      const available = guidedState.tokenPresent(clue.id, record.state) || sceneClues(sourceResolved).has(String(clue.id));
      if (available) continue;
      for (const { field, text } of visibleNodeTexts(sourceResolved)) {
        const term = terms.find((candidate) => mentionsTerm(text, candidate));
        if (!term) continue;
        const key = `${record.node.id}|${record.node.__variant_id || "base"}|${clue.id}|${field}`;
        if (seen.has(key)) continue;
        seen.add(key);
        issues.push(makeIssue("error", "pista_visible_sin_fuente", `La escena afirma '${term}' sin pista descubierta ni evidencia declarada en la escena.`, `${record.node.id}/${field}`));
      }
    }
  }
  return issues;
}

function lintControlledTruths(sourceWorld, records, sourceById) {
  const issues = [];
  const seen = new Set();
  const truths = controlledFacts(sourceWorld);
  const strictTruthIds = new Set(array(controlledReality(sourceWorld)?.hechos).map((truth) => String(truth?.id || "")).filter(Boolean));
  const matchedTruthIds = new Set();
  for (const truth of truths) {
    const terms = truthTerms(truth);
    if (!truth?.id || !terms.length) {
      issues.push(makeIssue("error", "verdad_controlada_incompleta", "Cada verdad controlada necesita id y terminos_visibles.", "qa/verdades_controladas"));
      continue;
    }
    for (const record of records) {
      const sourceNode = sourceById.get(String(record.node.id)) || {};
      const sourceResolved = guidedState.resolveNodeVariant(sourceNode, record.state);
      const visibleCharacter = !truth.pnj_presente || characterIsVisible(sourceWorld, sourceResolved, truth.pnj_presente);
      const allowedNodes = array(truth.nodos_permitidos).map(String);
      const validLocation = !allowedNodes.length || allowedNodes.includes(String(record.node.id));
      for (const { field, text, state } of visibleRecordTexts(record.node, record.state)) {
        const term = terms.find((candidate) => mentionsTerm(text, candidate));
        if (!term) continue;
        matchedTruthIds.add(String(truth.id));
        const validState = stateHasTokens(state || record.state, truth.requisitos, truth.requisitos_ausentes);
        if (validState && visibleCharacter && validLocation) continue;
        const key = `${record.node.id}|${record.node.__variant_id || "base"}|${truth.id}|${field}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const reason = !validState
          ? "el estado alcanzable no cumple sus requisitos"
          : !visibleCharacter
            ? `${truth.pnj_presente} no esta declarado como personaje visible`
            : `la ruta solo esta declarada para ${allowedNodes.join(", ")}`;
        issues.push(makeIssue("error", "verdad_visible_contradicha", `La escena afirma '${term}', pero ${reason}.`, `${record.node.id}/${field}`));
      }
    }
  }
  for (const truth of truths) {
    if (strictTruthIds.has(String(truth?.id || "")) && !matchedTruthIds.has(String(truth.id))) {
      issues.push(makeIssue("error", "hecho_controlado_sin_testigo_visible", `${truth.id} no coincide con ninguna escena, opcion, consecuencia o residuo alcanzable.`, `qa/realidad_controlada/hechos/${truth.id}`));
    }
  }
  return issues;
}

function lintVisibleResources(sourceWorld) {
  if (!isWorldV1(sourceWorld)) return [];
  const guided = adaptWorldV1(sourceWorld).guided_short_module;
  const records = enumerateReachableStates(sourceWorld, guided).records;
  const sourceNodes = [...array(sourceWorld.nodos), ...array(sourceWorld.finales)];
  const sourceById = new Map(sourceNodes.map((node) => [String(node.id), node]));
  const externalTerms = array(sourceWorld?.qa?.terminos_visibles_ajenos).map(normalizeText);
  const seen = new Set();
  const issues = [];
  for (const record of records) {
    const node = guidedState.resolveNodeVariant(record.node, record.state);
    const sourceNode = sourceById.get(String(node.id)) || {};
    const sourceResolved = guidedState.resolveNodeVariant(sourceNode, record.state);
    for (const { field, text } of visibleNodeTexts(sourceResolved)) {
      const normalized = normalizeText(text);
      for (const resource of array(sourceWorld.recursos)) {
        const term = normalizedTerms(resource).find((candidate) => !externalTerms.some((external) => normalized.includes(external)) && mentionsTerm(normalized, candidate));
        if (!term || resourceVisibleInState(resource, node, sourceResolved, record.state)) continue;
        const key = `${node.id}|${node.__variant_id || "base"}|${resource.id}|${field}`;
        if (seen.has(key)) continue;
        seen.add(key);
        issues.push(makeIssue("error", "recurso_visible_sin_custodia", `La escena nombra '${term}' sin que ${resource.id} este en inventario ni declarado en la escena.`, `${node.id}/${field}`));
      }
    }
  }
  return issues.concat(
    lintVisibleClues(sourceWorld, records, sourceById),
    lintControlledTruths(sourceWorld, records, sourceById)
  );
}

function lintEntityPresentations(sourceWorld) {
  const reality = controlledReality(sourceWorld);
  const genericDeclarations = array(reality?.entidades);
  const declarations = genericDeclarations.length
    ? genericDeclarations
    : array(sourceWorld?.qa?.presentaciones_pnj).map((entry) => ({ ...entry, id: entry.pnj, tipo: "personaje" }));
  if (!reality && !declarations.length) return [];
  const issues = [];
  const characters = new Map(array(sourceWorld?.pnj).map((character) => [String(character?.id || ""), character]));
  const sourceNodes = [...array(sourceWorld?.nodos), ...array(sourceWorld?.finales)];
  const nodesById = new Map(sourceNodes.map((node) => [String(node?.id || ""), node]));
  const sourceNodeByOption = new Map(sourceNodes.flatMap((node) => array(node?.opciones || node?.opcions || node?.options || node?.acciones || node?.accions).map((option) => [String(option?.id || ""), String(node?.id || "")] )));
  const declaredEntities = new Map();

  const entityIds = new Set();
  for (const declaration of declarations) {
    const entityId = String(declaration?.id || declaration?.pnj || "");
    if (entityId && entityIds.has(entityId)) {
      issues.push(makeIssue("error", "presentacion_entidad_duplicada", `${entityId} tiene mas de un contrato de presentacion.`, "qa/realidad_controlada/entidades"));
      continue;
    }
    entityIds.add(entityId);
    const isCharacter = String(declaration?.tipo || "personaje") === "personaje";
    const character = isCharacter ? characters.get(entityId) : null;
    if (!entityId || (isCharacter && !character)) {
      issues.push(makeIssue("error", "presentacion_entidad_desconocida", `La presentacion declara una entidad inexistente o sin id '${entityId}'.`, "qa/realidad_controlada/entidades"));
      continue;
    }
    const anchors = array(declaration?.anclas).map(normalizeText).filter(Boolean);
    if (!anchors.length) {
      issues.push(makeIssue("error", "presentacion_entidad_sin_anclas", `${entityId} necesita anclas que prueben su presentacion visible.`, `qa/realidad_controlada/entidades/${entityId}`));
      continue;
    }
    const presentationNodes = array(declaration?.nodos).map(String).filter(Boolean);
    if (!declaration?.inicio && !presentationNodes.length) {
      issues.push(makeIssue("error", "presentacion_entidad_sin_origen", `${entityId} debe presentarse en la introduccion o en al menos un nodo.`, `qa/realidad_controlada/entidades/${entityId}`));
      continue;
    }
    const places = declaration?.inicio
      ? [{ id: "introduccion_jugable", text: String(sourceWorld?.introduccion_jugable || "") }]
      : presentationNodes.map((id) => ({ id, text: presentationText(nodesById.get(id) || {}) }));
    for (const place of places) {
      if (!place.text) {
        issues.push(makeIssue("error", "presentacion_entidad_nodo_inexistente", `${entityId} declara una presentacion sin texto en '${place.id}'.`, `qa/realidad_controlada/entidades/${entityId}`));
        continue;
      }
      const normalized = normalizeText(place.text);
      if (!anchors.every((anchor) => normalized.includes(anchor))) {
        issues.push(makeIssue("error", "presentacion_entidad_ancla_ausente", `La presentacion de ${entityId} en '${place.id}' no contiene todas sus anclas.`, `qa/realidad_controlada/entidades/${entityId}`));
      }
    }
    const terms = isCharacter
      ? characterTerms(character)
      : [...new Set([declaration?.nombre_visible, ...array(declaration?.terminos_visibles)].map(normalizeText).filter((term) => term.length >= 3))];
    if (!terms.length) {
      issues.push(makeIssue("error", "presentacion_entidad_sin_terminos", `${entityId} no tiene nombre o terminos visibles auditables.`, `qa/realidad_controlada/entidades/${entityId}`));
    }
    declaredEntities.set(entityId, { declaration, presentationNodes, terms, visibleName: character?.nombre_visible || declaration?.nombre_visible || entityId });
  }

  if (reality?.cobertura?.personajes === "todos") for (const character of characters.values()) {
    if (!declaredEntities.has(String(character.id))) {
      issues.push(makeIssue("error", "pnj_sin_contrato_presentacion", `${character.id} no declara como y donde se presenta al jugador.`, `pnj/${character.id}`));
    }
  }
  if (issues.length) return issues;

  const guided = adaptWorldV1(sourceWorld).guided_short_module;
  const { records } = enumerateReachableStates(sourceWorld, guided);
  const seen = new Set();
  for (const record of records) {
    const rawNode = nodesById.get(String(record.node.id)) || {};
    const text = normalizeText(visibleRecordTexts(record.node, record.state).map((entry) => entry.text).join(" "));
    const traversedNodes = new Set([
      String(record.node.id),
      ...array(record.history).map((optionId) => sourceNodeByOption.get(String(optionId))).filter(Boolean),
    ]);
    for (const [entityId, entry] of declaredEntities.entries()) {
      if (!entry.terms.some((term) => text.includes(term))) continue;
      const introduced = Boolean(entry.declaration?.inicio) || entry.presentationNodes.some((nodeId) => traversedNodes.has(nodeId));
      if (introduced) continue;
      const key = `${record.node.id}|${entityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const code = entry.declaration?.tipo === "personaje" ? "pnj_mencionado_sin_presentacion" : "entidad_mencionada_sin_presentacion";
      issues.push(makeIssue("error", code, `${entry.visibleName} aparece antes de una presentacion visible en esta ruta.`, `${record.node.id}/presentacion_entidad`));
    }
  }
  return issues;
}

function lintContextualOpening(sourceWorld, runtimeIntro) {
  const contract = sourceWorld?.qa?.apertura_contextual;
  if (!contract?.obligatoria) return [];
  const issues = [];
  const where = "introduccion_jugable";
  const intro = typeof runtimeIntro === "string" ? runtimeIntro.trim() : "";
  if (!intro) {
    issues.push(makeIssue("error", "intro_contextual_ausente", "El mundo exige una introduccion contextual antes de la primera decision.", where));
    return issues;
  }
  const minimum = Number(contract.min_caracteres || 0);
  if (minimum > 0 && intro.length < minimum) {
    issues.push(makeIssue("error", "intro_contextual_insuficiente", `La introduccion tiene ${intro.length} caracteres y el contrato exige ${minimum}.`, where));
  }
  const anchors = contract.anclas;
  if (!anchors || typeof anchors !== "object" || !Object.keys(anchors).length) {
    issues.push(makeIssue("error", "intro_contextual_sin_anclas", "La apertura contextual requiere anclas declaradas para poder comprobar su contenido.", "qa/apertura_contextual/anclas"));
    return issues;
  }
  const normalizedIntro = normalizeText(intro);
  for (const [group, values] of Object.entries(anchors)) {
    const terms = array(values).map(normalizeText).filter(Boolean);
    if (!terms.length) {
      issues.push(makeIssue("error", "intro_contextual_ancla_vacia", `El grupo '${group}' no declara terminos comprobables.`, `qa/apertura_contextual/anclas/${group}`));
      continue;
    }
    if (!terms.some((term) => normalizedIntro.includes(term))) {
      issues.push(makeIssue("error", "intro_contextual_ancla_ausente", `La introduccion no materializa el ancla '${group}'.`, `introduccion_jugable/${group}`));
    }
  }
  return issues;
}

function sheetTitleValid(value) {
  const title = String(value || "").trim();
  const words = title ? title.split(/\s+/) : [];
  const technical = /\b(?:node|nodo|opcion|opción|decision|decisión|siguiente|escena|continuar)\b|\b[no]\d+\b/i;
  return Boolean(title) && words.length >= 1 && words.length <= 4 && !technical.test(title) && !MOJIBAKE.test(title) && !POSSIBLE_CATALAN.test(normalizeText(title));
}

function sourceOptionsById(sourceWorld) {
  return new Map([...array(sourceWorld?.nodos), ...array(sourceWorld?.finales)]
    .flatMap((node) => array(node?.opciones || []).map((option) => [String(option?.id || ""), option]))
    .filter(([id]) => id));
}

function focusReference(sourceWorld, focus) {
  const value = String(focus?.referencia || "");
  const match = /^(pnj|recurso|pista):(.+)$/.exec(value);
  if (!match) return null;
  const [, kind, id] = match;
  const collection = kind === "pnj" ? sourceWorld?.pnj : kind === "recurso" ? sourceWorld?.recursos : sourceWorld?.pistas;
  return { kind, id, item: array(collection).find((entry) => String(entry?.id || "") === id) };
}

function focusLabelVisible(focus, node) {
  const label = normalizeText(focus?.etiqueta || "");
  if (!label) return false;
  return visibleNodeTexts(node).some((entry) => mentionsTerm(entry.text, label)) ||
    array(node?.entorno_visible).some((entry) => mentionsTerm(entry, label)) ||
    array(node?.personajes_visibles).some((entry) => mentionsTerm(entry, label));
}

function lintExpedientPresentation(sourceWorld) {
  const contract = sourceWorld?.qa?.presentacion_expediente;
  if (!contract?.obligatoria) return [];
  const issues = [];
  const where = "qa/presentacion_expediente";
  if (Number(contract.version) !== 1) issues.push(makeIssue("error", "presentacion_expediente_version_invalida", "La presentacion de expediente debe declarar version 1.", `${where}/version`));
  const initialTitle = sourceWorld?.estado_inicial?.titulo_hoja_inicial;
  if (!sheetTitleValid(initialTitle)) issues.push(makeIssue("error", "titulo_hoja_inicial_invalido", "La hoja inicial necesita un titulo visible de una a cuatro palabras, sin jerga tecnica ni catalan accidental.", "estado_inicial/titulo_hoja_inicial"));

  const sourceNodes = [...array(sourceWorld?.nodos), ...array(sourceWorld?.finales)];
  const optionsById = sourceOptionsById(sourceWorld);
  for (const node of sourceNodes) {
    const nodeIdValue = String(node?.id || "sin_id");
    const shortLocation = String(node?.ubicacion_corta || "").trim();
    if (!shortLocation || shortLocation.split(/\s+/).length > 3) issues.push(makeIssue("error", "ubicacion_corta_invalida", "Cada escena y final necesita una ubicacion_corta de una a tres palabras.", `${nodeIdValue}/ubicacion_corta`));
    const focuses = node?.focos_consulta;
    if (!Array.isArray(focuses) || focuses.length > 3) {
      issues.push(makeIssue("error", "focos_consulta_invalidos", "Cada escena y final necesita focos_consulta con entre cero y tres elementos.", `${nodeIdValue}/focos_consulta`));
    } else {
      const ids = new Set(); const labels = new Set();
      for (const focus of focuses) {
        const focusId = String(focus?.id || ""); const label = String(focus?.etiqueta || "").trim();
        const hasReference = typeof focus?.referencia === "string" && focus.referencia.trim();
        const hasDescription = typeof focus?.descripcion === "string" && focus.descripcion.trim();
        if (!focusId || ids.has(focusId) || !label || labels.has(normalizeText(label)) || !String(focus?.tipo || "").trim() || (hasReference === Boolean(hasDescription))) {
          issues.push(makeIssue("error", "foco_consulta_mal_formado", "Cada foco necesita id y etiqueta unicos, tipo y exactamente referencia o descripcion.", `${nodeIdValue}/focos_consulta/${focusId || "sin_id"}`));
        }
        ids.add(focusId); labels.add(normalizeText(label));
        if (focus?.cambios_estado || focus?.cambios || focus?.changes) issues.push(makeIssue("error", "foco_consulta_altera_estado", "Un foco es consulta y no puede declarar cambios de estado.", `${nodeIdValue}/focos_consulta/${focusId || "sin_id"}`));
        if (hasReference && !focusReference(sourceWorld, focus)?.item) issues.push(makeIssue("error", "foco_consulta_referencia_invalida", "La referencia del foco debe ser pnj:<id>, recurso:<id> o pista:<id> existente.", `${nodeIdValue}/focos_consulta/${focusId || "sin_id"}`));
        if (hasDescription && !focusLabelVisible(focus, node)) issues.push(makeIssue("error", "foco_consulta_sin_ancla_visible", "La descripcion de un foco debe ampliar algo ya visible en la escena.", `${nodeIdValue}/focos_consulta/${focusId || "sin_id"}`));
      }
    }
    for (const option of array(node?.opciones)) if (!sheetTitleValid(option?.titulo_hoja_destino)) {
      issues.push(makeIssue("error", "titulo_hoja_destino_invalido", "Toda opcion necesita un titulo de hoja visible de una a cuatro palabras, sin jerga tecnica ni catalan accidental.", `${nodeIdValue}/opciones/${option?.id || "sin_id"}/titulo_hoja_destino`));
    }
  }
  const guided = adaptWorldV1(sourceWorld).guided_short_module;
  const { records } = enumerateReachableStates(sourceWorld, guided);
  const seen = new Set();
  for (const record of records) {
    const rawNode = sourceNodes.find((node) => String(node?.id || "") === String(record.node?.id || ""));
    if (!rawNode) continue;
    const resolved = guidedState.resolveNodeVariant(rawNode, record.state);
    const historyTitles = array(record.history).map((id) => optionsById.get(String(id))?.titulo_hoja_destino).filter(Boolean).map(normalizeText);
    if (new Set(historyTitles).size !== historyTitles.length) {
      const key = `${rawNode.id}|${historyTitles.join("|")}`;
      if (!seen.has(key)) { seen.add(key); issues.push(makeIssue("error", "titulo_hoja_repetido_en_ruta", "Una ruta alcanzable repite un titulo de hoja; el expediente deja de distinguir su recorrido.", `${rawNode.id}/titulo_hoja_destino`)); }
    }
    const visibleFocuses = array(resolved?.focos_consulta).filter((focus) => stateHasTokens(record.state, focus?.requisitos, focus?.requisitos_ausentes));
    for (const focus of visibleFocuses) {
      const reference = focusReference(sourceWorld, focus);
      if (!reference?.item) continue;
      const key = `${rawNode.id}|${focus.id}|${record.history.join(",")}`;
      let valid = true;
      if (reference.kind === "pnj") valid = characterIsVisible(sourceWorld, resolved, reference.id);
      if (reference.kind === "recurso") valid = resourceVisibleInState(reference.item, record.node, resolved, record.state);
      if (reference.kind === "pista") valid = guidedState.tokenPresent(reference.id, record.state) || sceneClues(resolved).has(reference.id);
      if (!valid && !seen.has(key)) {
        seen.add(key);
        issues.push(makeIssue("error", "foco_consulta_incompatible_con_estado", `El foco '${focus.etiqueta}' aparece aunque su referencia no es visible ni conocida en este estado.`, `${rawNode.id}/focos_consulta/${focus.id}`));
      }
    }
    const visibleTitles = visibleOptions(record.node, record.state).map((option) => optionsById.get(String(option.id))?.titulo_hoja_destino).filter(Boolean).map(normalizeText);
    if (new Set(visibleTitles).size !== visibleTitles.length) {
      const key = `${rawNode.id}|titulos_co_visibles|${visibleTitles.join("|")}`;
      if (!seen.has(key)) { seen.add(key); issues.push(makeIssue("error", "titulo_hoja_duplicado_co_visible", "Dos opciones co-visibles abren hojas con el mismo titulo.", `${rawNode.id}/opciones`)); }
    }
  }
  return issues;
}

function lintNarrativo(filePath) {
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
  let visibleTextCount = 0;
  let optionCount = 0;

  const runtimeIntro = world?.runtime_module?.intro_jugable;
  issues.push(...lintContextualOpening(loaded.sourceWorld, runtimeIntro));
  if (typeof runtimeIntro === "string" && runtimeIntro.trim()) {
    visibleTextCount += 1;
    if (MOJIBAKE.test(runtimeIntro)) {
      issues.push(makeIssue("error", "mojibake_visible", "Texto visible con caracteres rotos o mal codificados.", "runtime_module/intro_jugable"));
    }
    if (MOTOR_LANGUAGE.test(runtimeIntro)) {
      issues.push(makeIssue("error", "lenguaje_motor_visible", "Texto visible contiene lenguaje de motor.", "runtime_module/intro_jugable"));
    }
    if (POSSIBLE_CATALAN.test(normalizeText(runtimeIntro)) || EXTRA_CATALAN.test(normalizeText(runtimeIntro))) {
      issues.push(makeIssue("warning", "posible_catalan_visible", "Posible catalan o herencia catalana en texto visible.", "runtime_module/intro_jugable"));
    }
    if (STATE_AMBIGUITY.test(normalizeText(runtimeIntro))) {
      issues.push(makeIssue("warning", "estado_ambiguo_visible", "Frase visible delega un estado al lector; el mundo deberia resolver la variante.", "runtime_module/intro_jugable"));
    }
    if (ORTHO_VISIBLE.test(runtimeIntro)) {
      issues.push(makeIssue("warning", "ortografia_visible", "Posible falta ortografica visible: revisar acentos basicos como 'señala'.", "runtime_module/intro_jugable"));
    }
    if (OVER_METAPHOR.test(normalizeText(runtimeIntro))) {
      issues.push(makeIssue("warning", "metafora_opaca", "Metafora detectada que puede tapar la accion fisica.", "runtime_module/intro_jugable"));
    }
  }

  for (const node of nodes) {
    const id = nodeId(node);
    const visible = collectVisibleStrings(node);
    visibleTextCount += visible.length;

    for (const { key, text } of visible) {
      if (MOJIBAKE.test(text)) {
        issues.push(makeIssue("error", "mojibake_visible", "Texto visible con caracteres rotos o mal codificados.", `${id}/${key}`));
      }
      if (MOTOR_LANGUAGE.test(text)) {
        issues.push(makeIssue("error", "lenguaje_motor_visible", "Texto visible contiene lenguaje de motor.", `${id}/${key}`));
      }
      if (POSSIBLE_CATALAN.test(normalizeText(text)) || EXTRA_CATALAN.test(normalizeText(text))) {
        issues.push(makeIssue("warning", "posible_catalan_visible", "Posible catalan o herencia catalana en texto visible.", `${id}/${key}`));
      }
      if (STATE_AMBIGUITY.test(normalizeText(text))) {
        issues.push(makeIssue("warning", "estado_ambiguo_visible", "Frase visible delega un estado al lector; el mundo deberia resolver la variante.", `${id}/${key}`));
      }
      if (MENU_SUMMARY.test(text)) {
        issues.push(makeIssue("warning", "texto_resume_menu", "Texto visible parece resumir el menu de opciones en vez de mostrar la escena.", `${id}/${key}`));
      }
      if (RESOURCE_ALTERNATIVE_SUMMARY.test(text)) {
        issues.push(makeIssue("warning", "recursos_alternativos_visibles", "Texto visible enumera recursos alternativos; debe narrar solo el recurso presente o depositado en este estado.", `${id}/${key}`));
      }
      if (GENERIC_RESOURCE_RESOLUTION.test(text)) {
        issues.push(makeIssue("error", "resolucion_recurso_comodin", "Consecuencia comodin: hace equivalente tener o no tener un recurso concreto.", `${id}/${key}`));
      }
      if (ORTHO_VISIBLE.test(text)) {
        issues.push(makeIssue("warning", "ortografia_visible", "Posible falta ortografica visible: revisar acentos basicos como 'señala'.", `${id}/${key}`));
      }
      if (OVER_METAPHOR.test(normalizeText(text))) {
        issues.push(makeIssue("warning", "metafora_opaca", "Metafora detectada que puede tapar la accion fisica.", `${id}/${key}`));
      }
    }

    for (const option of optionsOf(node)) {
      optionCount += 1;
      const text = optionText(option).trim();
      if (!text) {
        issues.push(makeIssue("error", "opcion_sin_texto", "Opcion sin texto visible.", `${id}/${option.id || "opcion"}`));
        continue;
      }
      if (MOJIBAKE.test(text)) {
        issues.push(makeIssue("error", "mojibake_opcion", "Opcion con caracteres rotos o mal codificados.", `${id}/${option.id || "opcion"}`));
      }
      if (GENERIC_ACTION.test(text)) {
        issues.push(makeIssue("error", "opcion_generica", "Opcion demasiado generica como accion principal.", `${id}/${option.id || "opcion"}`));
      } else if (GENERIC_START.test(text) && text.split(/\s+/).length < 5) {
        issues.push(makeIssue("warning", "opcion_poco_concreta", "Opcion empieza generica y tiene poca concrecion.", `${id}/${option.id || "opcion"}`));
      }
      if (MOTOR_LANGUAGE.test(text)) {
        issues.push(makeIssue("error", "lenguaje_motor_en_opcion", "Opcion contiene lenguaje de motor.", `${id}/${option.id || "opcion"}`));
      }
      const req = optionReq(option);
      const absentReq = optionAbsentReq(option);
      const gained = optionGained(option);
      if (absentReq.length && (HIDDEN_ABSENCE_TELEGRAPH.test(text) || HIDDEN_STATE_TELEGRAPH.test(text))) {
        issues.push(makeIssue("warning", "opcion_delata_ausencia_recurso", "La opcion revela que falta una reserva, objeto o prueba. Debe mostrar la accion y el peligro visible, no el estado oculto.", `${id}/${option.id || "opcion"}`));
      }
      for (const resource of RESOURCE_MENTIONS) {
        if (resource.pattern.test(text) && !req.includes(resource.token) && !gained.includes(resource.token)) {
          issues.push(makeIssue("error", "opcion_recurso_sin_requisito", `La opcion menciona un recurso que no exige ni obtiene: ${resource.token}.`, `${id}/${option.id || "opcion"}`));
        }
      }
      if (GENERIC_RESOURCE_RESOLUTION.test(optionFullText(option))) {
        issues.push(makeIssue("error", "resolucion_recurso_comodin", "Opcion o consecuencia usa una resolucion comodin que diluye los recursos.", `${id}/${option.id || "opcion"}`));
      }
    }
  }

  const gainedKnownResources = new Map();
  const usedKnownResources = new Set();
  for (const node of nodes) {
    const id = nodeId(node);
    for (const option of optionsOf(node)) {
      for (const token of optionReq(option)) {
        if (RESOURCE_MENTIONS.some(resource => resource.token === token)) usedKnownResources.add(token);
      }
      for (const token of optionGained(option)) {
        if (RESOURCE_MENTIONS.some(resource => resource.token === token) && !gainedKnownResources.has(token)) {
          gainedKnownResources.set(token, `${id}/${option.id || "opcion"}`);
        }
      }
    }
  }
  for (const [token, where] of gainedKnownResources.entries()) {
    if (!usedKnownResources.has(token)) {
      issues.push(makeIssue("warning", "recurso_sin_uso_diferencial_detectado", `Recurso conocido ganado pero no usado como requisito posterior: ${token}.`, where));
    }
  }

  issues.push(...lintControlledRealityContract(loaded.sourceWorld));
  issues.push(...lintExpedientPresentation(loaded.sourceWorld));
  issues.push(...lintVisibleResources(loaded.sourceWorld));
  issues.push(...lintEntityPresentations(loaded.sourceWorld));

  const split = splitIssues(issues);
  return {
    file: filePath,
    ...split,
    metrics: {
      nodes: nodes.length,
      visibleTextCount,
      optionCount,
    },
  };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Uso: node scripts/qa/lint_narrativo.js <mundo.json> [...]");
    process.exit(2);
  }
  let exitCode = 0;
  for (const file of files) {
    const result = lintNarrativo(file);
    printResult(`Narrativa: ${file}`, result);
    if (result.errors.length) exitCode = 1;
  }
  process.exit(exitCode);
}

module.exports = { lintNarrativo };
