"use strict";

const fs = require("fs");
const path = require("path");
const { loadSchemaForVersion, validateSeed } = require("./qa_semilla_schema");

const RANGES = {
  directa: { escena: [250, 600], consecuencia: [120, 300], opcion: [35, 95] },
  equilibrada: { escena: [450, 850], consecuencia: [180, 450], opcion: [45, 120] },
  intensa: { escena: [750, 1250], consecuencia: [250, 650], opcion: [60, 160] }
};

const OBLIGATIONS = {
  funcion_objetos: {
    condicionar_capacidades: "Los objetos deben cambiar que puede sostener, hacer o proteger el jugador.",
    salvar_o_destruir: "Los objetos deben poder preservar o arruinar supervivencia, rescate o salida.",
    abrir_o_cerrar_rutas: "Los objetos deben alterar recorridos disponibles, no solo colorear una escena.",
    conceder_influencia: "Los objetos deben cambiar autoridad, deuda o poder sobre otras personas.",
    revelar_y_comprometer: "Los objetos deben aportar verdad a cambio de exposicion, custodia o coste."
  },
  funcion_deducciones: {
    reconstruir_verdad: "Las deducciones deben separar sospecha, prueba y responsabilidad.",
    leer_peligro: "Las deducciones deben cambiar como se evita o afronta un peligro presente.",
    habilitar_confrontacion: "Las deducciones deben permitir una acusacion, defensa o confrontacion nueva.",
    descubrir_ruta: "Las deducciones deben abrir o descartar recorridos materiales.",
    alterar_relaciones: "Las deducciones deben cambiar confianza, lealtad o disposicion de un personaje."
  },
  naturaleza_decisiones: {
    coste_moral_social: "Las decisiones deben cobrar verdad, autoridad, proteccion o responsabilidad.",
    riesgo_fisico_inmediato: "Las decisiones deben modificar cuerpo, tiempo, salida o personas ahora.",
    posicion_persecucion: "Las decisiones deben cambiar distancia, acceso, ventaja o cerco.",
    lealtad_confianza: "Las decisiones deben comprometer relaciones y futuras colaboraciones.",
    exploracion_renuncia: "Las decisiones deben intercambiar descubrimiento por tiempo, seguridad o regreso."
  }
};

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function analyzeExperience(seed, world) {
  if (seed?.version !== "1.2") throw new Error("qa:experience requiere una semilla 1.2 confirmada.");
  const { schema } = loadSchemaForVersion(seed.version);
  const schemaErrors = validateSeed(seed, schema);
  if (schemaErrors.length) throw new Error(`Semilla no valida: ${schemaErrors[0]}`);

  const nodes = Array.isArray(world?.nodos) ? world.nodos : [];
  const options = nodes.flatMap((node) => Array.isArray(node.opciones) ? node.opciones : []);
  const metrics = {
    escena: average(nodes.map((node) => String(node.texto_base || "").length).filter(Boolean)),
    consecuencia: average(options.map((option) => String(option.consecuencia || "").length).filter(Boolean)),
    opcion: average(options.map((option) => String(option.texto || "").length).filter(Boolean))
  };
  const experience = seed.experiencia_jugable;
  const ranges = RANGES[experience.densidad];
  const findings = [];
  for (const [field, value] of Object.entries(metrics)) {
    const [min, max] = ranges[field];
    if (value < min || value > max) {
      findings.push({
        code: `RITMO_${field.toUpperCase()}_DESALINEADO`,
        field,
        value,
        expected: [min, max]
      });
    }
  }

  return {
    signature: experience,
    metrics,
    ranges,
    findings,
    humanReview: [
      OBLIGATIONS.funcion_objetos[experience.funcion_objetos],
      OBLIGATIONS.funcion_deducciones[experience.funcion_deducciones],
      OBLIGATIONS.naturaleza_decisiones[experience.naturaleza_decisiones],
      `El error puede llegar a ${experience.severidad_error} y suele cobrarse en horizonte ${experience.horizonte_consecuencias}.`
    ]
  };
}

function main() {
  const [seedArg, worldArg] = process.argv.slice(2);
  if (!seedArg || !worldArg) {
    console.error("Uso: node scripts/qa/qa_experiencia_mundo.js <semilla-1.2.json> <mundo.json>");
    process.exit(2);
  }
  const seed = JSON.parse(fs.readFileSync(path.resolve(seedArg), "utf8"));
  const world = JSON.parse(fs.readFileSync(path.resolve(worldArg), "utf8"));
  const result = analyzeExperience(seed, world);

  console.log(`# Experiencia jugable: ${world.titulo || world.id || worldArg}`);
  console.log(`Prioridades: ${result.signature.prioridades.join(" + ")} | Ritmo: ${result.signature.ritmo} | Densidad: ${result.signature.densidad}`);
  console.log(`Medias visibles: escena ${result.metrics.escena}, consecuencia ${result.metrics.consecuencia}, opcion ${result.metrics.opcion} caracteres.`);
  if (!result.findings.length) console.log("Ritmo editorial: dentro de la banda orientativa.");
  for (const finding of result.findings) {
    console.log(`AVISO ${finding.code}: media ${finding.value}; banda orientativa ${finding.expected[0]}-${finding.expected[1]}.`);
  }
  console.log("Revision humana obligatoria:");
  for (const item of result.humanReview) console.log(`- ${item}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`# Experiencia jugable\nNO ANALIZABLE: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { RANGES, analyzeExperience };

