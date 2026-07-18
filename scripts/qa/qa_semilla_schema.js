"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SCHEMAS = {
  "1.1": path.join(ROOT, "fabrica/contratos/semilla_mundo_v1.schema.json"),
  "1.2": path.join(ROOT, "fabrica/contratos/semilla_mundo_v1_2.schema.json")
};

function loadSchemaForVersion(version) {
  const schemaPath = SCHEMAS[String(version || "")];
  if (!schemaPath) throw new Error(`Version de semilla no soportada: ${version || "ausente"}.`);
  return { schemaPath, schema: JSON.parse(fs.readFileSync(schemaPath, "utf8")) };
}

function typeMatches(value, expected) {
  if (expected === "null") return value === null;
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === expected;
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) throw new Error(`Referencia no soportada: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((current, part) => current && current[part], rootSchema);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateValue(value, schema, rootSchema, location, errors) {
  if (schema.$ref) {
    const target = resolveRef(rootSchema, schema.$ref);
    if (!target) throw new Error(`Referencia inexistente: ${schema.$ref}`);
    validateValue(value, target, rootSchema, location, errors);
    return;
  }

  if (schema.const !== undefined && !sameValue(value, schema.const)) {
    errors.push(`${location}: debe ser ${JSON.stringify(schema.const)}.`);
  }
  if (schema.enum && !schema.enum.some((candidate) => sameValue(value, candidate))) {
    errors.push(`${location}: valor fuera del enum permitido.`);
  }

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((expected) => typeMatches(value, expected))) {
      errors.push(`${location}: tipo invalido; se esperaba ${allowed.join(" o ")}.`);
      return;
    }
  }

  if (typeof value === "string") {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) {
      errors.push(`${location}: longitud ${length}, minimo ${schema.minLength}.`);
    }
    if (schema.maxLength !== undefined && length > schema.maxLength) {
      errors.push(`${location}: longitud ${length}, maximo ${schema.maxLength}.`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${location}: contiene ${value.length} elementos, minimo ${schema.minItems}.`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${location}: contiene ${value.length} elementos, maximo ${schema.maxItems}.`);
    }
    if (schema.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) errors.push(`${location}: contiene elementos duplicados.`);
    }
    if (schema.items) {
      value.forEach((item, index) => validateValue(item, schema.items, rootSchema, `${location}[${index}]`, errors));
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties || {};
    for (const required of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, required)) {
        errors.push(`${location}.${required}: propiedad obligatoria ausente.`);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          errors.push(`${location}.${key}: propiedad no permitida.`);
        }
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateValue(value[key], childSchema, rootSchema, `${location}.${key}`, errors);
      }
    }
  }
}

function validateSeed(seed, schema) {
  const errors = [];
  validateValue(seed, schema, schema, "$", errors);
  return errors;
}

function main() {
  const files = process.argv.slice(2);
  if (files.length !== 1) {
    console.error("Uso: node scripts/qa/qa_semilla_schema.js <semilla.json>");
    process.exit(2);
  }

  const file = path.resolve(process.cwd(), files[0]);
  const seed = JSON.parse(fs.readFileSync(file, "utf8"));
  const { schemaPath, schema } = loadSchemaForVersion(seed.version);
  const errors = validateSeed(seed, schema);

  console.log(`# Schema de semilla: ${files[0]}`);
  if (!errors.length) {
    console.log(`APTO: cumple ${path.basename(schemaPath)}.`);
    return;
  }
  for (const error of errors) console.log(`BLOQUEO SEED-SCHEMA ${error}`);
  process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`# Schema de semilla\nNO ANALIZABLE: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { loadSchemaForVersion, validateSeed };
