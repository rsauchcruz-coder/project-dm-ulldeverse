const readline = require("readline");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const guidedState = require("./lib/guided_state");
const { adaptWorldV1, isWorldV1 } = require("./lib/world_v1_adapter");

// =====================================================================
// Project DM narrative engine
//
// Principis:
// - El món NO és un scene_graph rígid.
// - El JSON aporta world_full + runtime_module + dm_oracles.
// - El DM continua sent creatiu, però amb oracles per evitar bucles.
// - El codi controla estat, pistes, inventari, pressió, torns i ritme.
// - Intro local sense gastar tokens.
// - Compatible amb Aventura i amb l'antiga etiqueta Medieval.
// =====================================================================

// =====================================================================
// 1. CONFIGURACIÓ
// =====================================================================
// =====================================================================
// 1.a. CONFIGURACIÓ MULTI-MODEL I MULTI-CLAU
// =====================================================================
// Objectiu:
// - Mode CURT GUIAT: 100% local si el món té guided_short_module.
// - Mode LLIURE normal: model base Groq per defecte.
// - Clímax/final/decisions fortes: model de qualitat, preferentment Gemini si hi ha clau.
// - Fallbacks: Groq base, Gemini suport, OpenRouter i torn local d'emergència.
// - Reparació de JSON: Groq petit/barat si està disponible.
//
// Render:
// - Pots definir les claus com variables d'entorn:
//   GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY
// - També es poden definir múltiples claus separades per comes:
//   GROQ_API_KEYS, GEMINI_API_KEYS, OPENROUTER_API_KEYS
// =====================================================================
let CONFIG = {};
try { CONFIG = require("./config.js") || {}; } catch (e) {}

function normalitzarArrayClaus(...valors) {
  const out = [];
  for (const v of valors) {
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const x of v) if (x && String(x).trim()) out.push(String(x).trim());
    } else if (typeof v === "string") {
      v.split(",").map(x => x.trim()).filter(Boolean).forEach(x => out.push(x));
    }
  }
  return [...new Set(out)];
}

const GROQ_API_KEYS = normalitzarArrayClaus(
  process.env.GROQ_API_KEYS,
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_RESERVA,
  CONFIG.GROQ_API_KEYS,
  CONFIG.GROQ_API_KEY,
  CONFIG.GROQ_API_KEY_RESERVA
);

const GEMINI_API_KEYS = normalitzarArrayClaus(
  process.env.GEMINI_API_KEYS,
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_RESERVA,
  CONFIG.GEMINI_API_KEYS,
  CONFIG.GEMINI_API_KEY,
  CONFIG.GEMINI_API_KEY_RESERVA
);

const OPENROUTER_API_KEYS = normalitzarArrayClaus(
  process.env.OPENROUTER_API_KEYS,
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_API_KEY_RESERVA,
  CONFIG.OPENROUTER_API_KEYS,
  CONFIG.OPENROUTER_API_KEY,
  CONFIG.OPENROUTER_API_KEY_RESERVA
);

const MODEL_PROVIDERS_AVAILABLE =
  GROQ_API_KEYS.length > 0 ||
  GEMINI_API_KEYS.length > 0 ||
  OPENROUTER_API_KEYS.length > 0;

if (!MODEL_PROVIDERS_AVAILABLE) {
  console.log("[Project DM] Sin API configurada: el modo Corto guiado seguirá disponible íntegramente en local.");
}

const groqClients = GROQ_API_KEYS.map(apiKey => new Groq({ apiKey }));

const MODEL_GROQ_BASE = process.env.GROQ_MODEL_BASE || process.env.GROQ_MODEL || CONFIG.GROQ_MODEL_BASE || "llama-3.3-70b-versatile";
const MODEL_GROQ_CHEAP = process.env.GROQ_MODEL_CHEAP || CONFIG.GROQ_MODEL_CHEAP || "llama-3.1-8b-instant";
const MODEL_GEMINI_QUALITY = process.env.GEMINI_MODEL_QUALITY || CONFIG.GEMINI_MODEL_QUALITY || "gemini-3.5-flash";
const MODEL_GEMINI_SUPPORT = process.env.GEMINI_MODEL_SUPPORT || CONFIG.GEMINI_MODEL_SUPPORT || "gemini-2.5-flash";
const MODEL_OPENROUTER_FREE = process.env.OPENROUTER_MODEL_FREE || CONFIG.OPENROUTER_MODEL_FREE || "openrouter/free";

// Compatibilitat amb logs antics.
const MODEL_DM = MODEL_GROQ_BASE;

const USE_GEMINI25_SECONDARY = String(process.env.USE_GEMINI25_SECONDARY || CONFIG.USE_GEMINI25_SECONDARY || "false") === "true";
const PREFER_GEMINI_FOR_CLIMAX = String(process.env.PREFER_GEMINI_FOR_CLIMAX || CONFIG.PREFER_GEMINI_FOR_CLIMAX || "true") === "true";

const MAX_TOKENS_TORN = parseInt(process.env.MAX_TOKENS_TORN || CONFIG.MAX_TOKENS_TORN || "650", 10);
const MAX_TOKENS_FINAL = parseInt(process.env.MAX_TOKENS_FINAL || CONFIG.MAX_TOKENS_FINAL || "950", 10);
// Router estable: Groq lleva el peso normal; Gemini queda para excelencia puntual.
const MAX_MODEL_ROUTES_PER_TURN = parseInt(process.env.MAX_MODEL_ROUTES_PER_TURN || CONFIG.MAX_MODEL_ROUTES_PER_TURN || "2", 10);
const MAX_JSON_REPAIR_PER_TURN = parseInt(process.env.MAX_JSON_REPAIR_PER_TURN || CONFIG.MAX_JSON_REPAIR_PER_TURN || "1", 10);
const ENABLE_LOCAL_CLEAR_RESOLUTION = String(process.env.ENABLE_LOCAL_CLEAR_RESOLUTION || CONFIG.ENABLE_LOCAL_CLEAR_RESOLUTION || "true") === "true";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const preguntar = (text) => new Promise(resolve => rl.question(text, resolve));

// 1.b. RUTES DEL PROJECTE
// =====================================================================
// IMPORTANT PER A LA MIGRACIÓ AL NÚVOL:
// - Tots els fitxers de dades variables es guarden dins de ./Dades
// - Els mons jugables es llegeixen exclusivament des de ./worlds
// - Evitem rutes relatives fràgils com ../ o lectures de tota la carpeta arrel
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "Dades");
const WORLDS_DIR = path.join(ROOT_DIR, "worlds");

function assegurarCarpetaDades() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function dataFile(nom) {
  assegurarCarpetaDades();
  return path.join(DATA_DIR, nom);
}



// =====================================================================
// 1.c. LOGS DEL MOTOR
// =====================================================================
// Els logs es guarden en format JSON Lines dins de ./Dades/logs_motor.jsonl.
// Cada línia és un esdeveniment independent: facilita depurar partides,
// errors de model, JSON invàlid, fallbacks i evolució de l'estat.
const LOGS_MOTOR_FILE = "logs_motor.jsonl";
const LOG_PROMPTS_COMPLETS = String(process.env.LOG_PROMPTS_COMPLETS || CONFIG.LOG_PROMPTS_COMPLETS || "false") === "true";
const LOG_MAX_TEXT = parseInt(process.env.LOG_MAX_TEXT || CONFIG.LOG_MAX_TEXT || "12000", 10);

function prepararPerLog(valor, profunditat = 0) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor === "string") return valor.length > LOG_MAX_TEXT ? valor.slice(0, LOG_MAX_TEXT) + "…[truncat]" : valor;
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  if (Array.isArray(valor)) return valor.slice(0, 30).map(v => prepararPerLog(v, profunditat + 1));
  if (typeof valor === "object") {
    if (profunditat > 4) return "[objecte truncat]";
    const out = {};
    for (const [k, v] of Object.entries(valor)) {
      const kl = String(k).toLowerCase();
      if (kl.includes("api_key") || kl.includes("apikey") || kl === "authorization" || kl.includes("token")) out[k] = "[redactat]";
      else out[k] = prepararPerLog(v, profunditat + 1);
    }
    return out;
  }
  return String(valor);
}

function logEvent(tipus, dades = {}) {
  try {
    const entrada = { timestamp: new Date().toISOString(), tipus, dades: prepararPerLog(dades) };
    fs.appendFileSync(dataFile(LOGS_MOTOR_FILE), JSON.stringify(entrada) + "\n", "utf8");
  } catch (e) {
    // El log mai no ha de trencar una partida.
    console.error("[LOG ERROR]", e?.message || e);
  }
}

function resumEstatPerLog(estat) {
  return {
    worldId: estat?.worldId,
    genere: estat?.genere,
    mode: estat?.mode,
    guided: !!estat?.guided,
    node: estat?.currentNodeId,
    torns: estat?.torns,
    limitTorns: estat?.limitTorns,
    pressio: estat?.pressio,
    pistesRestants: estat?.pistesRestants,
    ubicacio: estat?.ubicacio,
    inventari: estat?.inventari_actual || [],
    pistesDescobertes: estat?.pistes_descobertes || [],
    recursosActius: estat?.recursos_actius || [],
    flags: estat?.flags || {},
    variables: estat?.variables || {},
    accionsRecents: estat?.accionsRecents || []
  };
}
// =====================================================================
// 2. PROMPT DM AMB ORACLES
// =====================================================================
const PROMPT_DM_ORACLES = String.raw`
Eres el DM de ROL MASTER. Diriges un MUNDO VIVO, no una aventura preescrita.

ACCIÓN DEL JUGADOR:
- Resuelve primero la ACCION_LITERAL_OBLIGATORIA. No la sustituyas por otra.
- La primera frase de narrativa_visible debe mostrar una consecuencia directa de esa acción.
- Si el jugador inspecciona un objeto, revela algo de ese objeto o haz que provoque una consecuencia clara.
- Si la acción incluye una intención completa, resuélvela completa en el mismo turno. No la dividas artificialmente en desplazamiento + inspección posterior.
- Ejemplos: "examino el cadáver buscando pistas" debe incluir el examen y una pista/consecuencia; "subo a planta 12 y busco pruebas" debe incluir el desplazamiento y la búsqueda si no hay un bloqueo explícito.
- No obligues al jugador a repetir una intención evidente. Si hay un obstáculo, descríbelo y aplica coste, ruta alternativa o consecuencia.

IDIOMA:
- Escribe siempre en castellano natural, claro y funcional.
- No mezcles catalán en la narrativa visible.
- Los nombres técnicos del JSON no se traducen.

RITMO Y ANTI-BUCLE:
- Cada turno debe generar progreso material: información nueva, riesgo nuevo, cambio de ubicación, PNJ que actúa, recurso ganado/perdido, presión visible o acercamiento al clímax.
- No repitas el mismo descubrimiento, acción, ubicación o descripción sin consecuencia.
- Si el jugador repite un objeto o acción, conviértelo en coste, ruta, pista parcial o cambio visible.
- En modo CURT GUIAT, a partir del turno 3 empuja hacia recurso, PNJ clave, ruta, puerta/panel o clímax.

ACCIONES DISPONIBLES Y MODO LIBRE DURO:
- Modo CURT GUIAT: devuelve entre 2 y 4 acciones concretas en "accions_disponibles".
- Modo LLIURE: devuelve siempre "accions_disponibles": []. No generes botones rígidos.
- Modo LLIURE: devuelve siempre "vias_abiertas": []. No des sugerencias automáticas visibles al final de cada turno.
- Las salidas, accesos, obstáculos y elementos accionables deben aparecer dentro de "entorn_visible", no como solución explícita.
- No digas cuál es la mejor jugada. No escribas instrucciones óptimas como "usa X sobre Y" si el jugador no lo ha deducido o preguntado.
- Si el jugador pide "pista" o "ayuda", la pista puede ofrecer 2-3 lecturas parciales, pero nunca debe dejar claro cuál es buena y cuál es mala.
- Las pistas pueden ser útiles, incompletas, interesadas, parcialmente falsas o peligrosas.
- Cada decisión importante debe tener coste: tiempo, energía, exposición, pérdida de recurso, cierre de ruta, aumento de la mecánica central o acercamiento al clímax.
- Si el jugador repite intentos equivalentes para resolver el mismo objetivo, aumenta el coste y fuerza consecuencias. No permitas probar infinitamente fax, antena, terminal, azotea o equivalentes.
- Si las fuerzas activas persiguen al jugador o el mundo tiene reloj interno, deben avanzar de forma visible. Con presión alta, deben interrumpir al jugador, bloquear rutas o forzar clímax.

LONGITUD:
- narrativa_visible: 90-150 palabras.
- situacio: 1 frase clara.
- pressio_visible: 1 frase clara.
- accions_disponibles: entre 2 y 4 acciones; cada text máximo 16 palabras; cada acción debe incluir tipus.
- vias_abiertas: en modo LLIURE debe ser siempre []; las orientaciones solo aparecen si el jugador pide pista.

CLÍMAX:
- Si FLAGS.climax=true, presenta un dilema irreversible coherente. Todavía no cierres.
- Si FLAGS.final=true, escribe una escena final completa y pon trigger_finalitzacio=true.

Devuelve EXCLUSIVAMENTE JSON válido:
{
 "narrativa_visible":"string",
 "ubicacio":"string",
 "situacio":"string",
 "personatges_visibles":["string"],
 "inventari_actual":["string"],
 "pistes_restants":0,
 "entorn_visible":["string"],
 "accions_disponibles":[{"text":"string","tipus":"investigacio | recurs | risc | tecnica"}],
 "vias_abiertas":["string"],
 "informacio_nova":["string"],
 "informacio_coneguda":["string"],
 "pressio_visible":"string",
 "estat_mecanica":"string",
 "accio_resultat":"exit_complet | exit_parcial | fracas | investigacio_neutral",
 "impacte_mecanica_central":0,
 "consumeix_tick":true,
 "trigger_finalitzacio":false
}
`;
// =====================================================================
// 3. UTILIDADES
// =====================================================================
function esperar(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function truncar(s, max = 220) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
function pickDeterministic(arr, count, seed) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const clean = arr.filter(Boolean).map(x => String(x));
  if (!clean.length) return [];
  const out = [];
  for (let i = 0; i < Math.min(count, clean.length); i++) {
    const idx = Math.abs((seed * 31 + i * 17)) % clean.length;
    const val = clean[idx];
    if (!out.includes(val)) out.push(val);
  }
  return out;
}
function seedFromText(text) {
  return String(text || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

function normalitzarGenere(opcio) {
  const x = String(opcio || "").trim().toLowerCase();
  if (x === "1" || x.includes("cien") || x.includes("cièn")) return "Ciencia";
  if (x === "2" || x.includes("aventura") || x.includes("medieval") || x.includes("fantasia")) return "Aventura";
  if (x === "3" || x.includes("terror")) return "Terror";
  if (x === "4" || x.includes("thriller")) return "Thriller";
  if (x === "5" || x.includes("prototipo") || x.includes("prototip")) return "Prototipo";
  return null;
}
function normalitzarMode(opcio) {
  const x = String(opcio || "").trim().toLowerCase();
  if (x === "a" || x.includes("guiada") || x.includes("curt")) return "CURT GUIAT";
  if (x === "b" || x.includes("lliure") || x.includes("llarg")) return "LLIURE";
  return null;
}
function normalitzarGenereMon(g) {
  const x = String(g || "").trim().toLowerCase();
  if (x === "medieval" || x === "fantasia" || x === "aventura") return "Aventura";
  if (x.includes("cien") || x.includes("cièn")) return "Ciencia";
  if (x.includes("terror")) return "Terror";
  if (x.includes("thriller")) return "Thriller";
  if (x.includes("prototipo") || x.includes("prototip")) return "Prototipo";
  return g || "";
}
function etiquetaPressio(v) {
  if (v <= 3) return "La presión todavía es controlable, pero ya hay signos visibles de deterioro.";
  if (v <= 6) return "La situación se tensa: los caminos, los recursos o las alianzas empiezan a fallar.";
  if (v <= 9) return "El margen se agota y cada decisión puede exigir un precio irreversible.";
  return "Ha llegado el punto de no retorno.";
}

function mecanicaPerGenere(genere) {
  const g = normalitzarGenereMon(genere);
  if (g === "Thriller") return { nom: "Captura institucional / corrupción moral", puja: "pactos sucios, canales corruptos, exposición manipulada, violencia injustificada o demora", baixa: "pruebas verificables, alianzas limpias, transparencia o exposición documentada" };
  if (g === "Ciencia") return { nom: "Degradación de la estabilidad de la realidad", puja: "paradojas, sobrecarga, tecnología experimental, anomalías o manipulación causal", baixa: "contención técnica, purgas controladas, aislamiento de sistemas o corrección de datos" };
  if (g === "Aventura") return { nom: "Deuda mágica", puja: "uso de magia, ruptura de pactos, reliquias forzadas o favores sobrenaturales", baixa: "cumplir pactos, pagar costes voluntarios, restituir equilibrios o renunciar a poder" };
  if (g === "Terror") return { nom: "Erosión del juicio", puja: "exposición al horror, aislamiento, negación, rituales o percepciones imposibles", baixa: "anclajes reales, confianza, descanso con riesgo o aceptación de una verdad dolorosa" };
  return { nom: "Presión central", puja: "errores, demora, exposición o uso imprudente de recursos", baixa: "acciones prudentes con coste, pruebas útiles o contención" };
}

function etiquetaMecanica(v, estat = {}, mon = null) {
  v = clamp(parseInt(v || 0, 10), 0, 10);
  const wf = mon?.world_full || {};
  const pi = wf.pressio_interna || {};
  const base = pi.nom ? { nom: pi.nom } : mecanicaPerGenere(estat.genere || wf.genere);
  let efecte;
  if (pi.nom) {
    if (v <= 3) efecte = pi.efectes_0_3 || "todavía es controlable, pero ya deja rastros visibles.";
    else if (v <= 6) efecte = pi.efectes_4_6 || "empieza a cerrar rutas, contaminar alianzas y consumir recursos.";
    else if (v <= 9) efecte = pi.efectes_7_9 || "presiona directamente al jugador: cada acción exige un precio.";
    else efecte = pi.efectes_10 || "ha llegado al punto de no retorno.";
  } else {
    if (v <= 3) efecte = "todavía es controlable, pero ya deja rastros visibles.";
    else if (v <= 6) efecte = "empieza a cerrar rutas, contaminar alianzas y consumir recursos.";
    else if (v <= 9) efecte = "presiona directamente al jugador: cada acción exige un precio.";
    else efecte = "ha llegado al punto de no retorno.";
  }
  return `${base.nom}: ${v}/10. ${efecte}`;
}

function objectiuRepetit(accio, estat) {
  const obj = objectiuAccio(accio);
  if (!obj) return false;
  return (estat.accionsRecents || []).slice(-6).filter(a => objectiuAccio(a) === obj).length >= 2;
}

function impacteFinalModeLliure(json, estat, accio) {
  let impacte = parseInt(json.impacte_mecanica_central || 0, 10);
  if (estat.mode === "LLIURE") {
    if (json.accio_resultat === "exit_complet") impacte = Math.min(impacte, 0);
    else if (json.accio_resultat === "exit_parcial") impacte = Math.max(impacte, 1);
    else if (json.accio_resultat === "fracas") impacte = Math.max(impacte, 2);
    else impacte = Math.max(impacte, 1);
    if (objectiuRepetit(accio, estat)) impacte = Math.max(impacte, 2);
    if ((estat.pressio || 0) >= 7) impacte = Math.max(impacte, 1);
  }
  return clamp(impacte, -2, 3);
}

function fusionarInformacio(estat, nova) {
  estat.informacio_coneguda = Array.isArray(estat.informacio_coneguda) ? estat.informacio_coneguda : [];
  for (const item of (Array.isArray(nova) ? nova : [])) {
    const txt = String(item || "").trim();
    if (txt && !estat.informacio_coneguda.some(x => normalitzarPerComparar(x) === normalitzarPerComparar(txt))) estat.informacio_coneguda.push(txt);
  }
  estat.informacio_coneguda = estat.informacio_coneguda.slice(-12);
}

function catalaText(s) {
  return String(s || "")
    .replace(/\bentras\b/gi, "entres")
    .replace(/\bllaves\b/gi, "claus")
    .replace(/\bllave\b/gi, "clau")
    .replace(/\bcuidados\b/gi, "cautelós")
    .replace(/\bcuidadoso\b/gi, "cautelós")
    .replace(/\bal home\b/gi, "a l'home")
    .replace(/\bprohibitss\b/gi, "prohibits")
    .replace(/\briskar\b/gi, "arriscar")
    .replace(/\bpor complet\b/gi, "per complet")
    .replace(/\bpara sempre\b/gi, "per sempre")
    .replace(/\ben busca de\b/gi, "a la recerca de")
    .replace(/\bdintre del\b/gi, "dins del")
    .replace(/\bdintre de\b/gi, "dins de")
    .replace(/\bvibrando\b/gi, "vibrant")
    .replace(/\bmosta\b/gi, "mostra")
    .replace(/\bAl inspeccionar\b/g, "En inspeccionar")
    .replace(/\bal inspeccionar\b/g, "en inspeccionar");
}
function sanejar(obj) {
  // Experiencia jugable fijada en castellano: no traducimos ni convertimos textos automáticamente.
  return obj;
}

function netejarNarrativa(t) {
  t = catalaText(t);
  t = t.replace(/^La ubicació actual és.*$/gmi, "").trim();
  t = t.replace(/^La situació és.*$/gmi, "").trim();
  return t.replace(/\n{3,}/g, "\n\n");
}

function netejarJSON(text) {
  let t = String(text || "").trim();
  t = t.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const ini = t.indexOf("{");
  const fi = t.lastIndexOf("}");
  if (ini !== -1 && fi !== -1 && fi > ini) t = t.slice(ini, fi + 1);
  return t;
}
function parseJSONSegur(text) {
  try { return JSON.parse(netejarJSON(text)); }
  catch (e) {
    fs.writeFileSync(dataFile("ultim_json_invalid.txt"), String(text || ""), "utf8");
    throw new Error("JSON inválido. Se ha guardado en ultim_json_invalid.txt");
  }
}
function esRateLimitDiari(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return msg.includes("tokens per day") || msg.includes("tpd") || msg.includes("rate_limit_exceeded");
}
function esErrorTemporal(error) {
  if (esRateLimitDiari(error)) return false;
  const msg = String(error?.message || error || "").toLowerCase();
  const status = error?.status || error?.statusCode;
  if ([401, 403, 404].includes(status)) return false;
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  return msg.includes("try again") || msg.includes("temporarily") || msg.includes("overloaded") || msg.includes("too many requests");
}
async function ambReintents(fn, etiqueta, max = 3) {
  for (let i = 1; i <= max; i++) {
    try { return await fn(); }
    catch (e) {
      if (!esErrorTemporal(e) || i === max) throw e;
      const ms = Math.min(3000 * i, 10000);
      console.log(`\n[Sistema] ${etiqueta} ha fallat temporalment. Reintent ${i}/${max} en ${Math.round(ms / 1000)} segons...\n`);
      await esperar(ms);
    }
  }
}
function esErrorCanviClau(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  const status = error?.status || error?.statusCode;
  if ([401, 403, 429, 500, 502, 503, 504].includes(status)) return true;
  return msg.includes("quota") || msg.includes("rate") || msg.includes("limit") ||
    msg.includes("overloaded") || msg.includes("temporarily") || msg.includes("too many requests");
}

async function provarAmbClaus(llista, etiqueta, fn) {
  let ultimError = null;
  for (let i = 0; i < llista.length; i++) {
    try {
      return await fn(llista[i], i);
    } catch (e) {
      ultimError = e;
      if (!esErrorCanviClau(e) || i === llista.length - 1) break;
      console.log(`\n[Sistema] ${etiqueta}: la clau ${i + 1} ha fallat o està limitada. Pruebo clave de reserva...\n`);
    }
  }
  throw ultimError || new Error(`${etiqueta}: no hi ha claus disponibles`);
}

function parseJSONAmbRaw(text) {
  try { return parseJSONSegur(text); }
  catch (e) { e.rawContent = String(text || ""); throw e; }
}

async function cridarGroqJSONModel(model, messages, etiqueta, maxTokens) {
  if (!groqClients.length) throw new Error("No hay claves Groq configuradas");
  return provarAmbClaus(groqClients, etiqueta, async (client, idx) => {
    const resposta = await ambReintents(() => client.chat.completions.create({
      model,
      messages,
      temperature: 0.62,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" }
    }), `${etiqueta}/groq-key-${idx + 1}`);
    const contingut = resposta.choices?.[0]?.message?.content || "{}";
    return parseJSONAmbRaw(contingut);
  });
}

async function cridarGeminiJSONModel(model, messages, etiqueta, maxTokens) {
  if (!GEMINI_API_KEYS.length) throw new Error("No hay claves Gemini configuradas");
  const system = messages.find(m => m.role === "system")?.content || "";
  const userText = messages.filter(m => m.role !== "system").map(m => m.content).join("\n");
  return provarAmbClaus(GEMINI_API_KEYS, etiqueta, async (apiKey, idx) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await ambReintents(() => fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.58,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json"
        }
      })
    }), `${etiqueta}/gemini-key-${idx + 1}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 500)}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const contingut = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "{}";
    return parseJSONAmbRaw(contingut);
  });
}

async function cridarOpenRouterJSONModel(model, messages, etiqueta, maxTokens) {
  if (!OPENROUTER_API_KEYS.length) throw new Error("No hay claves OpenRouter configuradas");
  return provarAmbClaus(OPENROUTER_API_KEYS, etiqueta, async (apiKey, idx) => {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Title": "ULLDE:VERSE / Project DM"
    };
    if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    const res = await ambReintents(() => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, temperature: 0.55, max_tokens: maxTokens })
    }), `${etiqueta}/openrouter-key-${idx + 1}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`OpenRouter HTTP ${res.status}: ${txt.slice(0, 500)}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const contingut = data?.choices?.[0]?.message?.content || "{}";
    return parseJSONAmbRaw(contingut);
  });
}

async function cridarModelJSON(ruta, messages, etiqueta, maxTokens) {
  if (ruta.provider === "gemini") return cridarGeminiJSONModel(ruta.model, messages, etiqueta, maxTokens);
  if (ruta.provider === "groq") return cridarGroqJSONModel(ruta.model, messages, etiqueta, maxTokens);
  if (ruta.provider === "openrouter") return cridarOpenRouterJSONModel(ruta.model, messages, etiqueta, maxTokens);
  throw new Error("Proveedor no reconocido: " + ruta.provider);
}

// Compatibilitat amb crides antigues.
async function cridarGroqJSON(messages, etiqueta, maxTokens) {
  return cridarGroqJSONModel(MODEL_GROQ_BASE, messages, etiqueta, maxTokens);
}

// =====================================================================
// 4. CARREGADOR DE MONS JSON
// =====================================================================
function buscarFitxersJSON(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git"].includes(entry.name)) out.push(...buscarFitxersJSON(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      out.push(full);
    }
  }
  return out;
}
function esFitxerSistema(filePath) {
  const n = path.basename(filePath).toLowerCase();
  return [
    "config.json", "package.json", "package-lock.json",
    "historial_mons.json", "mon_seleccionat.json", "runtime_actual.json",
    "ultim_json_invalid.txt"
  ].includes(n);
}
function extreureMons(data, filePath) {
  const mons = [];
  const add = (obj) => {
    if (!obj || typeof obj !== "object") return;
    const runtimeObj = isWorldV1(obj) ? adaptWorldV1(obj) : obj;
    if (runtimeObj.world_full && runtimeObj.runtime_module) {
      const guidedShort = runtimeObj.guided_short_module || {};
      const topNodes = Array.isArray(runtimeObj.nodes) ? runtimeObj.nodes : [];
      mons.push({ filePath, world_full: runtimeObj.world_full, runtime_module: runtimeObj.runtime_module, dm_oracles: runtimeObj.dm_oracles || {}, guided_short_module: { ...(guidedShort || {}), nodes: Array.isArray(guidedShort.nodes) && guidedShort.nodes.length ? guidedShort.nodes : topNodes }, guided: runtimeObj.guided || null, nodes: topNodes, graph_blueprint: runtimeObj.graph_blueprint || null, source_schema_version: runtimeObj.source_schema_version || null, qa: runtimeObj.qa || null });
    }
  };
  if (Array.isArray(data)) data.forEach(add); else add(data);
  return mons;
}
function carregarMons() {
  const fitxersWorlds = buscarFitxersJSON(WORLDS_DIR);
  // En mode núvol/web només carreguem mons des de ./worlds per evitar duplicats i fitxers de sistema.
  const candidats = [...fitxersWorlds];
  const vistos = new Set();
  const fitxers = candidats
    .map(f => path.normalize(f))
    .filter(f => !vistos.has(f) && vistos.add(f))
    .filter(f => !esFitxerSistema(f));

  const mons = [];
  for (const f of fitxers) {
    try { mons.push(...extreureMons(JSON.parse(fs.readFileSync(f, "utf8")), f)); }
    catch (e) {
      logEvent("WORLD_LOAD_ERROR", { filePath: f, error: e?.message || String(e) });
    }
  }
  return mons;
}
function llegirCampMultillengua(obj, claus) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of claus) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim()) return v;
  }
  return "";
}
function genereDelMon(mon) {
  return normalitzarGenereMon(
    llegirCampMultillengua(mon?.world_full, ["genere", "genero", "genre", "categoria", "category"]) ||
    llegirCampMultillengua(mon?.runtime_module, ["genere", "genero", "genre", "categoria", "category"]) ||
    mon?.genre || mon?.category || mon?.metadata?.genre || ""
  );
}
function idDelMon(mon) { return mon?.runtime_module?.id || mon?.world_full?.id || path.basename(mon.filePath); }
function idiomaDelMon(mon) {
  const raw = mon?.world_full?.idioma || mon?.runtime_module?.idioma || mon?.world_full?.jugador?.idioma || "";
  const x = String(raw || "").toLowerCase();
  if (x.includes("cast") || x.includes("spanish") || x.includes("españ") || x.includes("espany")) return "Castellano";
  return "Castellano";
}
function carregarHistorial() {
  try {
    const principal = dataFile("historial_mons.json");
    if (fs.existsSync(principal)) return JSON.parse(fs.readFileSync(principal, "utf8"));

    // Compatibilitat temporal: si abans es creava a la carpeta arrel, el llegim una vegada.
    // Les noves escriptures ja aniran sempre a ./Dades/historial_mons.json.
    const antic = path.join(ROOT_DIR, "historial_mons.json");
    if (fs.existsSync(antic)) return JSON.parse(fs.readFileSync(antic, "utf8"));
  } catch (e) {}
  return [];
}
function guardarHistorial(genere, mon) {
  const h = Array.isArray(carregarHistorial()) ? carregarHistorial() : [];
  h.push({ data: new Date().toISOString(), genere, id: idDelMon(mon), filePath: mon.filePath });
  fs.writeFileSync(dataFile("historial_mons.json"), JSON.stringify(h, null, 2), "utf8");
}
function triarMon(mons, genere) {
  const disponibles = mons.filter(m => genereDelMon(m) === genere);
  if (!disponibles.length) return null;
  const ultims = carregarHistorial().filter(x => x.genere === genere).slice(-10).map(x => x.id);
  let candidats = disponibles.filter(m => !ultims.includes(idDelMon(m)));
  if (!candidats.length) candidats = disponibles;
  return candidats[Math.floor(Math.random() * candidats.length)];
}

// =====================================================================
// 5. COMPACTACIÓ DE CONTEXT + ORACLES
// =====================================================================
function faseRitme(estat) {
  const t = estat.torns;
  if (estat.climaxActivat) return "CLIMAX_ACTIU";
  if (estat.mode === "CURT GUIAT") {
    if (t <= 1) return "INICI_SORTIDA_O_PRIMERA_DESCOBERTA";
    if (t <= 3) return "EXPLORACIO_PNJ_RECURS_O_PISTA";
    if (t <= 5) return "PERILL_DECISIO_AMB_COST";
    return "PRECLIMAX";
  }
  if (t <= 3) return "EXPLORACIO";
  if (t <= 8) return "COMPLICACIO";
  if (t <= 12) return "PRECLIMAX";
  return "CLIMAX_PROPER";
}
function compactarWorldFull(worldFull) {
  if (!worldFull) return {};
  const loc = worldFull.localitzacions || worldFull.localizaciones || {};
  const climax = worldFull.climax || {};
  return {
    id: worldFull.id,
    genere: llegirCampMultillengua(worldFull, ["genere", "genero", "genre"]),
    subgenere: truncar(llegirCampMultillengua(worldFull, ["subgenere", "subgenero", "subgenre"]), 100),
    premissa: truncar(llegirCampMultillengua(worldFull, ["premissa", "premisa"]), 220),
    objectiu_central: truncar(llegirCampMultillengua(worldFull, ["objectiu_central", "objetivo_central"]), 180),
    conflicte_inicial: truncar(llegirCampMultillengua(worldFull, ["conflicte_inicial", "conflicto_inicial"]), 180),
    localitzacions: {
      inici: loc.inici?.nom || loc.inici || loc.inicio?.nom || loc.inicio,
      exploracio: loc.exploracio?.nom || loc.exploracio || loc.exploracion?.nom || loc.exploracion,
      perill: loc.perill?.nom || loc.perill || loc.peligro?.nom || loc.peligro,
      climax: loc.climax?.nom || loc.climax
    },
    rutes: worldFull.rutes || worldFull.rutas || {},
    climax: truncar(climax.dilema || climax || "", 220)
  };
}
function compactarRuntime(runtime) {
  const ei = runtime?.estat_inicial || runtime?.estado_inicial || {};
  if (!runtime) return {};
  return {
    id: runtime.id,
    resum_mestre: truncar(llegirCampMultillengua(runtime, ["resum_mestre", "resumen_maestro"]), 380),
    jugador: truncar(runtime.jugador, 170),
    objectiu: truncar(llegirCampMultillengua(runtime, ["objectiu", "objetivo"]), 170),
    estat_inicial: {
      ubicacio: ei.ubicacio || ei.ubicacion,
      situacio: truncar(llegirCampMultillengua(ei, ["situacio", "situacion"]), 160),
      inventari_inicial: (ei.inventari_inicial || ei.inventario_inicial || []).slice(0, 3),
      entorn_visible: (ei.entorn_visible || ei.entorno_visible || []).slice(0, 4),
      pressio_visible: truncar(llegirCampMultillengua(ei, ["pressio_visible", "presion_visible"]), 130)
    },
    pnj_clau: (runtime.pnj_clau || runtime.pnj_clave || []).map(x => truncar(x, 150)).slice(0, 2),
    forces_actives: (runtime.forces_actives || runtime.fuerzas_activas || []).map(x => truncar(x, 140)).slice(0, 2),
    recursos: (runtime.recursos || []).map(x => truncar(x, 140)).slice(0, 3),
    pistes: (runtime.pistes || runtime.pistas || []).map(x => truncar(x, 130)).slice(0, 2),
    regles_dm: ["Resol literalment l'acció del jugador abans d'introduir conseqüències.", "No repeteixis una acció recent al menú; obre una ruta, cost o decisió nova."],
    climax: truncar(runtime.climax, 220),
    finals: runtime.finals || runtime.finales || {}
  };
}
// =====================================================================
// 6. INTRO LOCAL, VALIDACIÓ I RENDER
// =====================================================================
function generarIntroduccioLocal(mon, estat) {
  const runtime = mon.runtime_module || {};
  const worldFull = mon.world_full || {};
  const ei = runtime.estat_inicial || {};

  const titol = (worldFull.id || runtime.id || "Món")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  const introJugable = typeof runtime.intro_jugable === "string" ? runtime.intro_jugable.trim() : "";
  const intro = introJugable || [
    worldFull.premissa || runtime.resum_mestre || "",
    "",
    runtime.jugador || "",
    "",
    ei.situacio || worldFull.conflicte_inicial || "",
    "",
    `Si quieres sobrevivir y cambiar el curso de esta historia, tendrás que actuar antes de que la presión del mundo te cierre todas las salidas.`
  ].join("\n");

  const json = {
    narrativa_visible: `=== ${titol} ===\n\n${intro}`,
    ubicacio: ei.ubicacio || estat.ubicacio || "Ubicació inicial",
    situacio: ei.situacio || worldFull.conflicte_inicial || "La primera amenaza ya está presente.",
    personatges_visibles: Array.isArray(ei.personatges_visibles) ? ei.personatges_visibles.slice(0, 3) : [],
    inventari_actual: Array.isArray(ei.inventari_inicial) ? ei.inventari_inicial.slice() : [],
    pistes_restants: estat.pistesRestants,
    entorn_visible: Array.isArray(ei.entorn_visible) ? ei.entorn_visible.slice(0, 4) : [],
    accions_disponibles: [],
    pressio_visible: ei.pressio_visible || etiquetaMecanica(estat.pressio, estat, mon),
    estat_mecanica: etiquetaMecanica(estat.pressio, estat, mon),
    informacio_nova: [],
    informacio_coneguda: estat.informacio_coneguda || [],
    accio_resultat: "investigacio_neutral",
    impacte_mecanica_central: 0,
    consumeix_tick: false,
    trigger_finalitzacio: false
  };

  return validarTorn(json, estat);
}
function treureNumeracioAccio(text) {
  return String(text || "")
    .replace(/^\s*[-–—•]*\s*\d+\s*[.):-]\s*/, "")
    .replace(/^\s*[-–—•]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalitzarPerComparar(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}
function esAccioGenerica(text) {
  const t = normalitzarPerComparar(text);
  if (!t) return true;
  const prohibits = ["element mes urgent", "element urgent", "recurs mes util", "ruta d'avanc", "sortida immediata", "amenaca que s'acosta", "interactuar amb l'entorn", "explorar la zona", "analitzar la situacio", "prendre una decisio", "fita concreta"];
  return prohibits.some(p => t.includes(normalitzarPerComparar(p)));
}
function senseDuplicats(arr) {
  const vistos = new Set();
  const out = [];
  for (const item of arr) {
    const net = treureNumeracioAccio(item);
    const clau = normalitzarPerComparar(net);
    if (net && !vistos.has(clau)) { vistos.add(clau); out.push(net); }
  }
  return out;
}
function retallarEtiqueta(text, tipus = "objecte") {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  if (tipus === "pnj") t = t.split(/,|;|\sobservant\s|\smirant\s|\sdes de\s/i)[0].trim();
  const max = tipus === "pnj" ? 48 : 96;
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, "").trim() : t;
}
function minInicial(text) { const t = String(text || "").trim(); return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
function articleDefinit(text, tipus = "objecte") {
  let t = retallarEtiqueta(text, tipus);
  if (!t) return tipus === "pnj" ? "la persona que tens al davant" : "allò que tens més a prop";
  const tl = t.toLowerCase();
  const arts = ["el ", "la ", "l’", "l'", "els ", "les ", "un ", "una ", "uns ", "unes "];
  if (arts.some(a => tl.startsWith(a))) return t;
  if (/^senyora\b/i.test(t)) return "la " + minInicial(t);
  if (/^senyor\b/i.test(t)) return "el " + minInicial(t);
  if (tipus === "pnj" && /^[A-ZÀ-Ý][a-zà-ÿ]+\s+[A-ZÀ-Ý][a-zà-ÿ]+/.test(t)) return t;
  t = minInicial(t);
  const low = t.toLowerCase();
  if (/^(dos|tres|quatre|cinc|sis|set|vuit|nou|deu|onze|dotze)\b/i.test(low)) return "els " + t;
  if (/^dues\b/i.test(low)) return "les " + t;
  if (/^(ascensor|altar|armari|arxiu|ordinador|entrada|ombra|escala|habitació|habitacio|eina|alarma|urna)\b/i.test(low)) return "l’" + t;
  if (/^(porta|clau|carta|finestra|llanterna|taula|cadira|capsa|caixa|maleta|pantalla|consola|comporta)\b/i.test(low)) return "la " + t;
  if (/^(clauer|passadís|passadis|monitor|botó|boto|ganivet|mapa|paper|quadern|mecanisme|panell|rastre|pont|llindar|bassal)\b/i.test(low)) return "el " + t;
  if (/^[aeiouàèéíïòóúüh]/i.test(low)) return "l’" + t;
  return "el " + t;
}
function objectiuAccio(text) {
  const t = normalitzarPerComparar(text);
  if (t.includes("paraigua")) return "paraigues";
  if (t.includes("ascensor")) return "ascensor";
  if (t.includes("bassal") || t.includes("reflex")) return "bassal_reflex";
  if (t.includes("camera") || t.includes("càmera")) return "camera";
  if (t.includes("mori") || t.includes("senyora")) return "mori";
  if (t.includes("clauer") || t.includes("clau")) return "clauer";
  if (t.includes("porta")) return "porta";
  if (t.includes("panell")) return "panell";
  if (t.includes("setè") || t.includes("sete")) return "sete_pis";
  return normalitzarPerComparar(treureNumeracioAccio(text)).split(" ").slice(0, 3).join("_");
}
function esMateixaAccioRecent(accio, estat) {
  const obj = objectiuAccio(accio);
  return (estat.accionsRecents || []).slice(-3).some(a => objectiuAccio(a) === obj && obj);
}
function deduplicarPerObjectiu(accions) {
  const vistos = new Set();
  const out = [];
  for (const a of accions) {
    const obj = objectiuAccio(a);
    if (vistos.has(obj)) continue;
    vistos.add(obj);
    out.push(a);
  }
  return out;
}
function estaPresentAra(accio, json) {
  const obj = objectiuAccio(accio);
  if (!obj) return true;
  const base = [json.ubicacio, json.situacio, json.narrativa_visible, json.pressio_visible]
    .concat(json.entorn_visible || [], json.personatges_visibles || [], json.inventari_actual || [])
    .join(" ");
  const t = normalitzarPerComparar(base);
  if (obj === "paraigues") return t.includes("paraigua");
  if (obj === "ascensor") return t.includes("ascensor");
  if (obj === "bassal_reflex") return t.includes("bassal") || t.includes("reflex");
  if (obj === "camera") return t.includes("camera") || t.includes("càmera");
  if (obj === "mori") return t.includes("mori") || t.includes("senyora");
  if (obj === "clauer") return t.includes("clauer") || t.includes("clau");
  if (obj === "porta") return t.includes("porta");
  if (obj === "panell") return t.includes("panell");
  if (obj === "sete_pis") return t.includes("sete") || t.includes("setè");
  return true;
}

function articleDefinitCast(text) {
  let t = retallarEtiqueta(text, "objecte");
  if (!t) return "lo más cercano";
  const tl = t.toLowerCase();
  if (/^(el|la|los|las|un|una|unos|unas)\s/.test(tl)) return t;
  return "el " + minInicial(t);
}

function articleNeutre(text) { return articleDefinit(text, "objecte"); }
function accionsDeReservaPerGenere(genere, ubicacio) {
  const g = normalitzarPerComparar(genere);
  const lloc = ubicacio || "el lugar donde estás";
  if (g.includes("terror")) return [
    `Escuchar qué se mueve en ${articleDefinitCast(lloc)}`,
    "Apartarte hacia la sombra más cercana",
    "Abrir con cuidado el paso más próximo",
    "Iluminar el rincón donde algo ha cambiado"
  ];
  if (g.includes("thriller")) return [
    "Revisar el rastro más reciente",
    "Forzar el paso lateral antes de que lo bloqueen",
    "Ocultarte y observar quién llega",
    "Llamar al único contacto fiable"
  ];
  if (g.includes("ciencia") || g.includes("cien")) return [
    "Comprobar los indicadores que aún parpadean",
    "Desconectar manualmente el panel más inestable",
    "Recuperar el módulo suelto del suelo",
    "Avanzar hacia el sector menos dañado"
  ];
  return [
    `Examinar las marcas visibles en ${articleDefinitCast(lloc)}`,
    "Apartar los obstáculos del paso",
    "Tirar con cuidado del mecanismo oculto",
    "Cruzar el umbral más cercano"
  ];
}

function construirAccionsContextuals(json, estat) {
  const entorn = Array.isArray(json.entorn_visible) ? json.entorn_visible.map(treureNumeracioAccio).filter(Boolean) : [];
  const pnj = Array.isArray(json.personatges_visibles) ? json.personatges_visibles.map(treureNumeracioAccio).filter(Boolean) : [];
  const inv = Array.isArray(json.inventari_actual) ? json.inventari_actual.map(treureNumeracioAccio).filter(Boolean) : [];
  const accions = [];
  if (entorn[0]) accions.push(`Inspeccionar ${articleDefinitCast(entorn[0])}`);
  if (pnj[0]) accions.push(`Hablar con ${pnj[0]} sin acercarte demasiado`);
  if (entorn[1]) accions.push(`Avanzar hacia ${articleDefinitCast(entorn[1])}`);
  if (inv[0]) accions.push(`Usar ${articleDefinitCast(inv[0])}`);
  if (entorn[2]) accions.push(`Examinar ${articleDefinitCast(entorn[2])} sin demorarte`);
  if (entorn[3]) accions.push(`Arriesgarte con ${articleDefinitCast(entorn[3])}`);
  return accions.concat(accionsDeReservaPerGenere(estat.genere, json.ubicacio || estat.ubicacio || ""));
}


function inferirTipusAccio(text) {
  const t = normalitzarPerComparar(text);
  if (/examinar|observar|inspeccionar|mirar|escuchar|oir|analizar|leer|estudiar/.test(t)) return "investigacio";
  if (/usar|utilizar|emplear|activar|encender|apagar|aplicar|coger|recoger|tomar|abrir con|grabar|herramienta|linterna|grabadora|llave|arma|recurso/.test(t)) return "recurs";
  if (/forzar|arriesgar|correr|saltar|romper|golpear|empujar|huir|entrar a la fuerza|atravesar|exponerse|enfrentarse/.test(t)) return "risc";
  return "tecnica";
}

function normalitzarAccions(json, estat) {
  const minim = estat.mode === "CURT GUIAT" ? 2 : 0;
  let arr = Array.isArray(json.accions_disponibles) ? json.accions_disponibles : [];
  arr = arr
    .map(a => typeof a === "string" ? a : (a?.text || a?.label || ""))
    .map(treureNumeracioAccio)
    .filter(Boolean)
    .filter(a => !/tu acción produce|no es una oportunidad gratuita|la teva acció|consecuencia concreta/i.test(a))
    .filter(a => !esAccioGenerica(a))
    .filter(a => !esMateixaAccioRecent(a, estat))
    .filter(a => estaPresentAra(a, json));

  const candidates = construirAccionsContextuals(json, estat)
    .map(treureNumeracioAccio)
    .filter(Boolean)
    .filter(a => !/tu acción produce|no es una oportunidad gratuita|la teva acció|consecuencia concreta/i.test(a))
    .filter(a => !esAccioGenerica(a))
    .filter(a => !esMateixaAccioRecent(a, estat))
    .filter(a => estaPresentAra(a, json));

  arr = deduplicarPerObjectiu(senseDuplicats(arr.concat(candidates)));

  const extra = [
    "Examinar la salida más cercana sin tocarla todavía",
    "Usar el recurso más útil del inventario",
    "Forzar una ruta antes de que el peligro avance",
    "Moverse con cuidado hacia el punto menos expuesto"
  ];
  let guard = 0;
  while (arr.length < minim && guard < 8) {
    arr = deduplicarPerObjectiu(senseDuplicats(arr.concat(extra)));
    guard++;
  }

  return arr.slice(0, 4).map(a => ({
    text: a,
    tipus: inferirTipusAccio(a)
  }));
}


function netejarViaOberta(text) {
  return String(text || "").replace(/^\s*[-–—•]*\s*\d+\s*[.):-]\s*/, "").replace(/\s+/g, " ").trim();
}
function esViaGenerica(text) {
  const t = normalitzarPerComparar(text);
  if (!t) return true;
  const prohibits = ["explorar la zona", "analizar la situacion", "analitzar la situacio", "buscar una salida", "buscar una sortida", "tomar una decision", "prendre una decisio", "interactuar con el entorno", "interactuar amb l'entorn"];
  return prohibits.some(p => t.includes(normalitzarPerComparar(p)));
}
function construirViesObertesLocals(json, estat) {
  const idiomaCast = estat?.idioma === "Castellano";
  const entorn = Array.isArray(json.entorn_visible) ? json.entorn_visible.map(netejarViaOberta).filter(Boolean) : [];
  const pnj = Array.isArray(json.personatges_visibles) ? json.personatges_visibles.map(netejarViaOberta).filter(Boolean) : [];
  const inv = Array.isArray(json.inventari_actual) ? json.inventari_actual.map(netejarViaOberta).filter(Boolean) : [];
  const out = [];
  if (entorn[0]) out.push(idiomaCast ? `Examinar ${entorn[0]} buscando una pista concreta.` : `Examinar ${entorn[0]} buscant una pista concreta.`);
  if (pnj[0]) out.push(idiomaCast ? `Hablar con ${pnj[0]} y contrastar su versión.` : `Parlar amb ${pnj[0]} i contrastar la seva versió.`);
  if (entorn[1]) out.push(idiomaCast ? `Actuar sobre ${entorn[1]} antes de que empeore.` : `Actuar sobre ${entorn[1]} abans que empitjori.`);
  if (inv[0]) out.push(idiomaCast ? `Usar ${inv[0]} para abrir una vía nueva.` : `Fer servir ${inv[0]} per obrir una via nova.`);
  if (!out.length) {
    out.push(idiomaCast ? "Buscar una pista física vinculada al objetivo inmediato." : "Buscar una pista física vinculada a l'objectiu immediat.");
    out.push(idiomaCast ? "Moverse hacia la localización que reduzca la presión." : "Moure's cap a la localització que redueixi la pressió.");
    out.push(idiomaCast ? "Contactar con un PNJ capaz de cambiar la ruta." : "Contactar amb un PNJ capaç de canviar la ruta.");
  }
  return senseDuplicats(out).filter(v => !esViaGenerica(v)).slice(0, 3);
}
function normalitzarViesObertes(json, estat) {
  let arr = Array.isArray(json.vias_abiertas) ? json.vias_abiertas : [];
  if (!arr.length && Array.isArray(json.vies_obertes)) arr = json.vies_obertes;
  if (!arr.length && Array.isArray(json.vias_obertas)) arr = json.vias_obertas;
  arr = arr.map(netejarViaOberta).filter(Boolean).filter(v => !esViaGenerica(v));
  arr = senseDuplicats(arr).slice(0, 3);
  if (estat.mode === "LLIURE" && arr.length < 2) {
    arr = senseDuplicats(arr.concat(construirViesObertesLocals(json, estat))).slice(0, 3);
  }
  return arr;
}

function textSegonsIdioma(s, estat) {
  // Experiencia jugable en castellano: preservar texto recibido, sin catalaText().
  return String(s || "");
}

function sanejarSegonsIdioma(obj, estat) {
  // El motor y el prompt ya fuerzan castellano; no aplicar saneado catalán automático.
  return obj || {};
}

function validarTorn(json, estat) {
  json = sanejarSegonsIdioma(json || {}, estat);

  json.narrativa_visible = estat.idioma === "Castellano"
    ? String(json.narrativa_visible || "La situación cambia de forma perceptible.").replace(/\n{3,}/g, "\n\n")
    : netejarNarrativa(json.narrativa_visible || "La situación cambia de forma perceptible.");
  json.ubicacio = textSegonsIdioma(json.ubicacio || estat.ubicacio || "Ubicación desconocida", estat);
  json.situacio = textSegonsIdioma(json.situacio || "Debes decidir cómo continuar.", estat);
  json.personatges_visibles = Array.isArray(json.personatges_visibles) ? json.personatges_visibles.map(x => textSegonsIdioma(x, estat)) : [];
  json.inventari_actual = Array.isArray(json.inventari_actual) ? json.inventari_actual.map(x => textSegonsIdioma(x, estat)) : estat.inventari_actual;
  json.entorn_visible = Array.isArray(json.entorn_visible) ? json.entorn_visible.map(x => textSegonsIdioma(x, estat)).slice(0, 4) : [];
  json.pistes_restants = estat.pistesRestants;
  json.pressio_visible = textSegonsIdioma(json.pressio_visible || etiquetaPressio(estat.pressio), estat);
  json.estat_mecanica = json.pressio_visible;
  json.informacio_nova = Array.isArray(json.informacio_nova) ? json.informacio_nova.map(x => textSegonsIdioma(x, estat)).slice(0, 3) : [];
  json.informacio_coneguda = Array.isArray(estat.informacio_coneguda) ? estat.informacio_coneguda.slice(-12) : [];
  json.accio_resultat = ["exit_complet", "exit_parcial", "fracas", "investigacio_neutral"].includes(json.accio_resultat) ? json.accio_resultat : "investigacio_neutral";
  json.impacte_mecanica_central = clamp(parseInt(json.impacte_mecanica_central || 0, 10), -1, 1);
  json.consumeix_tick = Boolean(json.consumeix_tick);
  json.trigger_finalitzacio = Boolean(json.trigger_finalitzacio);
  json.vias_abiertas = normalitzarViesObertes(json, estat);
  if (estat.mode === "LLIURE") {
    json.accions_disponibles = [];
    json.vias_abiertas = [];
  } else {
    json.accions_disponibles = normalitzarAccions(json, estat);
    json.vias_abiertas = [];
  }
  return json;
}
function generarPistaLocal(mon, estat, jsonActual) {
  const idiomaCast = estat?.idioma === "Castellano";
  const r = mon.runtime_module || {};
  const w = mon.world_full || {};
  const o = mon.dm_oracles || {};
  const pr = Array.isArray(r.pistes) ? r.pistes : [];
  const pw = Array.isArray(w.pistes) ? w.pistes : [];
  const rumors = Array.isArray(o.rumores_o_informacion_parcial) ? o.rumores_o_informacion_parcial : [];
  const descob = Array.isArray(o.descubrimientos_posibles) ? o.descubrimientos_posibles : [];
  const obst = Array.isArray(o.obstaculos_dinamicos) ? o.obstaculos_dinamicos : [];
  const pool = [];
  pr.forEach(x => pool.push(String(x)));
  pw.forEach(x => pool.push(typeof x === "string" ? x : (x.contingut || x.com_es_pot_descobrir || JSON.stringify(x))));
  rumors.forEach(x => pool.push(String(x)));
  descob.forEach(x => pool.push(String(x)));
  obst.forEach(x => pool.push(String(x)));
  (jsonActual.entorn_visible || []).forEach(x => pool.push(idiomaCast ? `El elemento visible "${x}" puede ser útil o una pérdida de tiempo según el coste.` : `L'element visible "${x}" pot ser útil o una pèrdua de temps segons el cost.`));
  (estat.informacio_coneguda || []).forEach(x => pool.push(String(x)));
  const seed = seedFromText(estat.worldId || "") + (estat.pistesRestants || 0) + (estat.pressio || 0);
  const base = pool.length ? pool : [
    idiomaCast ? "Una ruta obvia puede estar vigilada; una ruta secundaria puede costar tiempo." : "Una ruta òbvia pot estar vigilada; una ruta secundària pot costar temps.",
    idiomaCast ? "Un recurso puede resolver una parte del problema y empeorar otra." : "Un recurs pot resoldre una part del problema i empitjorar-ne una altra.",
    idiomaCast ? "La información parcial no confirma el éxito; solo reduce la incertidumbre." : "La informació parcial no confirma l'èxit; només redueix la incertesa."
  ];
  const triades = pickDeterministic(base, 3, seed);
  const intro = idiomaCast ? "La pista no señala una solución segura; abre lecturas posibles y también riesgos." : "La pista no assenyala una solució segura; obre lectures possibles i també riscos.";
  const cos = triades.map((x, i) => `${i + 1}. ${truncar(x, 180)}`).join("\n");
  const advert = idiomaCast ? "Alguna de estas lecturas puede ser parcial, interesada o mala si la situación ha cambiado." : "Alguna d'aquestes lectures pot ser parcial, interessada o dolenta si la situació ha canviat.";
  return validarTorn({
    narrativa_visible: `${intro}
${cos}
${advert}`,
    ubicacio: jsonActual.ubicacio || estat.ubicacio,
    situacio: idiomaCast ? "Has obtenido orientación, no certeza." : "Has obtingut orientació, no certesa.",
    personatges_visibles: jsonActual.personatges_visibles || [],
    inventari_actual: jsonActual.inventari_actual || estat.inventari_actual,
    pistes_restants: estat.pistesRestants,
    entorn_visible: jsonActual.entorn_visible || [],
    accions_disponibles: [],
    vias_abiertas: [],
    informacio_nova: [],
    informacio_coneguda: estat.informacio_coneguda || [],
    pressio_visible: etiquetaMecanica(estat.pressio, estat, mon),
    estat_mecanica: etiquetaMecanica(estat.pressio, estat, mon),
    accio_resultat: "investigacio_neutral",
    impacte_mecanica_central: 0,
    consumeix_tick: false,
    trigger_finalitzacio: false
  }, estat);
}

function interpretarAccio(input, accions) {
  const t = String(input || "").trim();
  if (/^\d+$/.test(t)) {
    const i = parseInt(t, 10) - 1;
    if (accions && accions[i]) {
      const a = accions[i];
      return typeof a === "string" ? a.replace(/^\s*\d+\.\s*/, "") : (a.text || a.label || "");
    }
  }
  return t;
}

function esPista(input) {
  const t = String(input || "").trim().toLowerCase();
  return t === "pista" || t === "ajuda";
}
function render(json) {
  console.log("\n-------------------------------------------------------");
  console.log(json.narrativa_visible);
  console.log("-------------------------------------------------------\n");
  console.log("---");
  console.log(`📍 UBICACIÓN: ${json.ubicacio}`);
  console.log(`\n🧭 SITUACIÓN:\n${json.situacio}`);
  console.log(`\n👥 PERSONAJES:\n- ${(json.personatges_visibles.length ? json.personatges_visibles : ["Ningún personaje relevante visible."]).join("\n- ")}`);
  console.log(`\n🎒 INVENTARIO:\n${json.inventari_actual.length ? json.inventari_actual.join(", ") : "Vacío"}`);
  console.log(`\n🧩 PISTAS:\nRestants: ${json.pistes_restants}`);
  console.log(`\n👁️ ENTORNO:\n- ${(json.entorn_visible.length ? json.entorn_visible : ["Ningún elemento destacable."]).join("\n- ")}`);
  console.log(`\n🚪 ACCIONES DISPONIBLES:\n- ${json.accions_disponibles.join("\n- ")}`);
  if (Array.isArray(json.vias_abiertas) && json.vias_abiertas.length) {
    console.log(`\n🧭 VIES OBERTES:\n- ${json.vias_abiertas.join("\n- ")}`);
  }
  console.log(`\n🔥 PRESIÓN VISIBLE:\n${json.pressio_visible}`);
  console.log("---\n");
}
function actualitzarResum(resum, accio, json) {
  const entrada = `T${json.ubicacio}: ${accio} => ${json.situacio}. Inv: ${json.inventari_actual.join(", ") || "buit"}.`;
  return (resum + "\n" + entrada).split("\n").filter(Boolean).slice(-5).join("\n").slice(-1300);
}

// =====================================================================
// 7. PROMPT DE TORN I CRIDA DM
// =====================================================================
function construirPrompt(mon, estat, resum, accio, flags, ultimaSituacio) {
  const context = construirContext(mon, estat, accio);
  const recents = (estat.accionsRecents || []).slice(-4).join(" | ") || "cap";
  const ordreCurt = estat.mode === "CURT GUIAT" && estat.torns >= 3
    ? "Mode curt: avança cap a recurs, PNJ clau, ruta, porta/panell o clímax."
    : "Mantén tensió i progrés sense precipitar el final.";
  const ordreLliureAssistit = estat.mode === "LLIURE"
    ? "Mode lliure dur: resol la intenció completa del jugador; no donis suggeriments automàtics; deixa vias_abiertas=[]; posa sortides i elements accionables a entorn_visible; cada intent important ha de tenir cost; si es repeteix el mateix objectiu, augmenta el cost; a pressió 7+ força persecució, bloqueig, dilema o clímax; retorna informacio_nova només per dades objectives descobertes i persistents."
    : "";
  return `MÓN:${JSON.stringify(context)}
` +
    `IDIOMA_DE_RESPOSTA:${estat.idioma || idiomaDelMon(mon)}
` +
    `ESTAT:mode=${estat.mode};genere=${estat.genere};torn=${estat.torns}/${estat.limitTorns};pressio=${estat.pressio}/10(no mostrar);pistes=${estat.pistesRestants};ubicacio=${truncar(estat.ubicacio || "inici", 100)};inventari=${estat.inventari_actual.slice(0,4).join(",") || "buit"};fase=${faseRitme(estat)}
` +
    `ORDRE_LLIURE_ASSISTIT:${ordreLliureAssistit}
` +
    `ULTIMA:${truncar(ultimaSituacio || "cap", 220)}
` +
    `RESUM:${truncar(resum || "cap", 650)}
` +
    `INFORMACIO_CONEGUDA:${truncar((estat.informacio_coneguda || []).join(" | "), 500)}
` +
    `ACCIONS_RECENTS:${truncar(recents, 320)}
` +
    `ACCIO_LITERAL_OBLIGATORIA:${accio}
` +
    `FLAGS:climax=${!!flags.climax};final=${!!flags.final}
` +
    `ORDRE:${ordreCurt} Primera frase: conseqüència directa de l'acció literal. No ofereixis com a opció la mateixa acció ni el mateix objecte immediatament.`;
}

function generarTornLocalEmergencia(mon, estat, accio, flags, ultimaSituacio) {
  const runtime = mon.runtime_module || {};
  const world = mon.world_full || {};
  const climax = runtime.climax || world.climax?.dilema || "El conflicto central exige una decisión con coste.";
  const escena = estat.escenaActual || {};
  const pnjVisibles = escena.personatges_visibles || [];
  const entornVisible = escena.entorn_visible || [];
  const accioNorm = normalitzarPerComparar(accio);
  if (flags.final) {
    return validarTorn({
      narrativa_visible: `La presión llega al límite. ${truncar(climax, 220)} Ya no queda margen para ensayar otra vía: el entorno impone una resolución y cada recurso pendiente se convierte en consecuencia.`,
      ubicacio: estat.ubicacio || "Zona de clímax",
      situacio: "La situación alcanza el punto de no retorno.",
      personatges_visibles: pnjVisibles,
      inventari_actual: estat.inventari_actual || [],
      pistes_restants: estat.pistesRestants,
      entorn_visible: entornVisible,
      accions_disponibles: [],
      vias_abiertas: [],
      informacio_nova: [],
      informacio_coneguda: estat.informacio_coneguda || [],
      pressio_visible: etiquetaMecanica(estat.pressio, estat, mon),
      estat_mecanica: etiquetaMecanica(estat.pressio, estat, mon),
      accio_resultat: "fracas",
      impacte_mecanica_central: 0,
      consumeix_tick: true,
      trigger_finalitzacio: true
    }, estat);
  }
  const pnjMencionat = pnjVisibles.find(p => accioNorm.includes(normalitzarPerComparar(p)));
  let narrativa;
  if (pnjMencionat && (accioNorm.includes("hablar") || accioNorm.includes("preguntar"))) {
    narrativa = `Te diriges a ${pnjMencionat}. La respuesta llega fragmentada, bajo presión: no confirma una salida segura, pero sí revela una tensión útil en la escena. La conversación consume tiempo y obliga a decidir si insistir, retirarte o convertir esa duda en ventaja antes de que el peligro avance.`;
  } else {
    narrativa = `Actúas de inmediato: ${truncar(accio, 120)}. El movimiento no queda sin respuesta; algo en el entorno cambia, una posibilidad se estrecha y otra queda expuesta. La escena avanza bajo presión, sin regalar una solución evidente, y te obliga a decidir el siguiente paso con menos margen que antes.`;
  }
  return validarTorn({
    narrativa_visible: narrativa,
    ubicacio: estat.ubicacio || escena.ubicacio || "Ubicación actual",
    situacio: "La situación avanza con un coste claro.",
    personatges_visibles: pnjVisibles,
    inventari_actual: estat.inventari_actual || [],
    pistes_restants: estat.pistesRestants,
    entorn_visible: entornVisible,
    accions_disponibles: [],
    vias_abiertas: [],
    informacio_nova: [],
    informacio_coneguda: estat.informacio_coneguda || [],
    pressio_visible: etiquetaMecanica(Math.min(10, (estat.pressio || 0) + 1), estat, mon),
    estat_mecanica: etiquetaMecanica(estat.pressio || 0, estat, mon),
    accio_resultat: "exit_parcial",
    impacte_mecanica_central: 1,
    consumeix_tick: true,
    trigger_finalitzacio: false
  }, estat);
}


function semblaAccioDecisiva(accio, estat, flags) {
  if (flags?.final || flags?.climax || estat?.climaxActivat) return true;
  if ((estat?.pressio || 0) >= 8) return true;
  if ((estat?.torns || 0) >= Math.max(1, (estat?.limitTorns || 8) - 2)) return true;
  const t = normalitzarPerComparar(accio);
  const verbs = [
    "sacrifico", "sacrificar", "destrueixo", "destruir", "activo", "activar",
    "traeixo", "trair", "confesso", "confessar", "revelo", "revelar",
    "renuncio", "renunciar", "entrego", "entregar", "allibero", "alliberar",
    "mato", "matar", "tanco", "tancar", "accepto", "acceptar", "nego", "negar",
    "transmito", "borrar", "borro", "desactivo", "desactivar", "disparo", "disparar",
    "sacrifico", "sacrificar", "rendir", "rendirse", "confieso", "revelar"
  ];
  return verbs.some(v => t.includes(v));
}

function esTornSecundari(estat, accio) {
  if (!USE_GEMINI25_SECONDARY) return false;
  if (estat.mode !== "LLIURE") return false;
  if ((estat.pressio || 0) > 3) return false;
  if ((estat.torns || 0) < 2) return false;
  const t = normalitzarPerComparar(accio);
  return t.includes("mirar") || t.includes("observar") || t.includes("examinar") || t.includes("escoltar") || t.includes("escuchar");
}

function construirRutesModel(estat, flags, accio) {
  const rutesFinalQualitat = [];
  if (PREFER_GEMINI_FOR_CLIMAX && GEMINI_API_KEYS.length) {
    rutesFinalQualitat.push({ provider: "gemini", model: MODEL_GEMINI_QUALITY, rol: "qualitat-gemini" });
  }
  if (GROQ_API_KEYS.length) {
    rutesFinalQualitat.push({ provider: "groq", model: MODEL_GROQ_BASE, rol: "fallback-groq-base" });
  }
  if (GEMINI_API_KEYS.length) {
    rutesFinalQualitat.push({ provider: "gemini", model: MODEL_GEMINI_SUPPORT, rol: "fallback-gemini-suport" });
  }
  if (OPENROUTER_API_KEYS.length) {
    rutesFinalQualitat.push({ provider: "openrouter", model: MODEL_OPENROUTER_FREE, rol: "emergencia-openrouter" });
  }

  if (flags?.final) return rutesFinalQualitat.map(r => ({ ...r, rol: `final-${r.rol}` }));
  if (flags?.climax || semblaAccioDecisiva(accio, estat, flags)) return rutesFinalQualitat.map(r => ({ ...r, rol: `climax-${r.rol}` }));

  if (esTornSecundari(estat, accio)) {
    const r = [];
    if (GEMINI_API_KEYS.length) r.push({ provider: "gemini", model: MODEL_GEMINI_SUPPORT, rol: "torn-secundari-gemini-suport" });
    if (GROQ_API_KEYS.length) r.push({ provider: "groq", model: MODEL_GROQ_BASE, rol: "torn-secundari-groq-base" });
    if (OPENROUTER_API_KEYS.length) r.push({ provider: "openrouter", model: MODEL_OPENROUTER_FREE, rol: "torn-secundari-openrouter" });
    return r;
  }

  const normal = [];
  if (GROQ_API_KEYS.length) normal.push({ provider: "groq", model: MODEL_GROQ_BASE, rol: "torn-normal-groq-base" });
  if (GEMINI_API_KEYS.length) normal.push({ provider: "gemini", model: MODEL_GEMINI_SUPPORT, rol: "torn-normal-gemini-suport" });
  if (OPENROUTER_API_KEYS.length) normal.push({ provider: "openrouter", model: MODEL_OPENROUTER_FREE, rol: "torn-normal-openrouter" });
  return normal;
}

async function repararJSONAmbGroqPetit(rawContent, estat, etiqueta, maxTokens) {
  if (!rawContent || !groqClients.length) throw new Error("No hi ha contingut brut o Groq barat disponible per reparar JSON");
  const promptReparacio = `Repara aquesta resposta perquè sigui EXCLUSIVAMENT JSON vàlid i compleixi l'esquema del torn del Project DM, inclòs vias_abiertas si existeix. No afegeixis explicacions. Mantén el contingut narratiu si és possible.\n\nRESPOSTA_BRUTA:\n${rawContent}`;
  const messages = [
    { role: "system", content: PROMPT_DM_ORACLES },
    { role: "user", content: promptReparacio }
  ];
  const reparat = await cridarGroqJSONModel(MODEL_GROQ_CHEAP, messages, etiqueta || "reparacio-json-groq-cheap", Math.min(maxTokens || MAX_TOKENS_TORN, 520));
  return validarTorn(reparat, estat);
}

async function obtenirTorn(mon, estat, resum, accio, flags, ultimaSituacio) {
  const maxTokens = flags.final ? MAX_TOKENS_FINAL : MAX_TOKENS_TORN;
  const promptUsuari = construirPrompt(mon, estat, resum, accio, flags, ultimaSituacio);
  const messages = [
    { role: "system", content: PROMPT_DM_ORACLES },
    { role: "user", content: promptUsuari }
  ];
  logEvent("TURN_REQUEST_BUILT", {
    accio,
    flags,
    estat: resumEstatPerLog(estat),
    prompt: LOG_PROMPTS_COMPLETS ? promptUsuari : truncar(promptUsuari, 900)
  });
  const rutes = construirRutesModel(estat, flags, accio);
  const maxRutes = Math.max(1, Math.min(MAX_MODEL_ROUTES_PER_TURN, rutes.length));
  let ultimError = null;
  let intentsRuta = 0;
  let reparacionsJSON = 0;
  for (const ruta of rutes) {
    if (intentsRuta >= maxRutes) {
      logEvent("IA_ROUTE_HARD_STOP", { accio, flags, maxRutes, totalRutes: rutes.length, estat: resumEstatPerLog(estat) });
      break;
    }
    intentsRuta++;
    try {
      logEvent("IA_REQUEST", {
        ruta: ruta.rol,
        provider: ruta.provider,
        model: ruta.model,
        maxTokens,
        accio,
        flags,
        estat: resumEstatPerLog(estat),
        prompt: LOG_PROMPTS_COMPLETS ? promptUsuari : truncar(promptUsuari, 900)
      });
      const json = await cridarModelJSON(ruta, messages, `DM-${ruta.rol}`, maxTokens);
      logEvent("IA_RESPONSE", { ruta: ruta.rol, provider: ruta.provider, model: ruta.model, resposta: json });
      return validarTorn(json, estat);
    } catch (e) {
      ultimError = e;
      logEvent("IA_ERROR", {
        ruta: ruta.rol,
        provider: ruta.provider,
        model: ruta.model,
        error: e?.message || String(e),
        status: e?.status || e?.statusCode,
        teRawContent: !!e?.rawContent
      });
      const msg = String(e?.message || e || "").toLowerCase();
      if ((msg.includes("json") || msg.includes("valid document")) && e.rawContent && reparacionsJSON < MAX_JSON_REPAIR_PER_TURN) {
        reparacionsJSON++;
        try {
          console.log("\n[Sistema] JSON inválido. Intento reparación con Groq pequeño antes de caer en emergencia local...\n");
          logEvent("JSON_REPAIR_ATTEMPT", { ruta: ruta.rol, rawContent: e.rawContent });
          const reparat = await repararJSONAmbGroqPetit(e.rawContent, estat, "reparacio-json-groq-cheap", maxTokens);
          logEvent("JSON_REPAIR_OK", { ruta: ruta.rol, resposta: reparat });
          return reparat;
        } catch (re) {
          ultimError = re;
          logEvent("JSON_REPAIR_ERROR", { ruta: ruta.rol, error: re?.message || String(re) });
        }
      }
      console.log(`\n[Sistema] Ruta ${ruta.rol} (${ruta.provider}/${ruta.model}) no disponible o insuficient. Pruebo alternativa...\n`);
    }
  }
  const msgFinal = String(ultimError?.message || ultimError || "").toLowerCase();
  console.log("\n[Sistema] Ninguna ruta de IA ha podido completar el turno. Se aplica resolución local robusta para no romper la partida.\n");
  logEvent("EMERGENCY_TURN", { accio, flags, motiu: msgFinal, estat: resumEstatPerLog(estat) });
  return generarTornLocalEmergencia(mon, estat, accio, flags, ultimaSituacio);
}


// =====================================================================
// 6.b MOTOR LOCAL PER AL MODE CURT GUIAT PRECOMPUTAT
// =====================================================================
function guidedModule(mon) {
  const gsm = (mon && mon.guided_short_module) ? mon.guided_short_module : {};
  if (Array.isArray(gsm.nodes) && gsm.nodes.length) return gsm;
  const topNodes = Array.isArray(mon?.nodes) ? mon.nodes : [];
  if (topNodes.length) return { ...(gsm || {}), enabled: true, nodes: topNodes, durada_objectiu: gsm.durada_objectiu || 14, estat_inicial_guiat: gsm.estat_inicial_guiat || { node_inicial: topNodes[0]?.id || "node_01", inventari_inicial: [], pressio_inicial: 2, pistes_descobertes: [], recursos_actius: [], pnj_implicats: [], variables: {}, flags: {} } };
  return gsm;
}
function teGuidedShort(mon) {
  const gsm = guidedModule(mon);
  return !!(gsm && Array.isArray(gsm.nodes) && gsm.nodes.length > 0);
}
function nodeGuided(mon, nodeId) {
  const nodes = guidedModule(mon)?.nodes || [];
  return nodes.find(n => n.id === nodeId) || null;
}
function indexNodeGuided(mon, nodeId) {
  const nodes = guidedModule(mon)?.nodes || [];
  return nodes.findIndex(n => n.id === nodeId);
}
function seguentNodeLineal(mon, nodeId) {
  const nodes = guidedModule(mon)?.nodes || [];
  const i = indexNodeGuided(mon, nodeId);
  return i >= 0 && i + 1 < nodes.length ? nodes[i + 1].id : null;
}
function continuationEdgesGuided(mon) {
  const bp = mon?.graph_blueprint || {};
  const fromBp = Array.isArray(bp.continuation_edges) ? bp.continuation_edges : [];
  const fromRoot = Array.isArray(mon?.continuation_edges) ? mon.continuation_edges : [];
  return fromBp.length ? fromBp : fromRoot;
}
function seguentContinuacioGuided(mon, nodeId) {
  const edges = continuationEdgesGuided(mon).filter(e => e && e.from === nodeId && e.to);
  if (!edges.length) return null;
  // Si hay varias, prioriza la continuación normal y deja la alternativa como último recurso.
  edges.sort((a, b) => {
    const aa = String(a.tipo || '').includes('alternativa') ? 1 : 0;
    const bb = String(b.tipo || '').includes('alternativa') ? 1 : 0;
    return aa - bb;
  });
  return edges[0].to;
}
function normalitzarReqArray(x) { return Array.isArray(x) ? x : []; }
function estatTeTokenGuided(token, estat) {
  return guidedState.tokenPresent(token, estat);
}
function condicionsGuidedCompleixen(condicions, estat) {
  return normalitzarReqArray(condicions).every(c => estatTeTokenGuided(c, estat));
}
function compleixRequisits(opcio, estat) {
  return guidedState.optionVisible(opcio, estat);
}
function canvisVacíos(ubicacioActual) {
  return {
    pressio_delta: 0,
    ubicacio_nova: ubicacioActual || "La ubicación se mantiene.",
    inventari_afegir: [],
    inventari_treure: [],
    pistes_afegir: [],
    recursos_activar: [],
    pnj_implicats_afegir: [],
    flags_set: {},
    variables_set: {}
  };
}
function aplicarCanvisGuided(estat, canvis) {
  canvis = canvis || canvisVacíos(estat.ubicacio);
  guidedState.applyChanges(estat, canvis, {
    min: estat.pressio_min ?? 0,
    max: estat.pressio_max ?? 10
  });
}
function estatGuidedInicial(mon, genere, mode) {
  const gsm = mon.guided_short_module || {};
  const eg = gsm.estat_inicial_guiat || {};
  const vars = Object.assign({}, eg.variables || {});
  const flags = Object.assign({}, eg.flags || {});
  return {
    genere,
    mode,
    idioma: idiomaDelMon(mon),
    worldId: idDelMon(mon),
    limitTorns: parseInt(gsm.durada_objectiu || 8, 10),
    torns: 0,
    pressio: parseInt(eg.pressio_inicial ?? vars.pressio ?? 2, 10),
    pressio_min: parseInt(gsm.pressio_min ?? 0, 10),
    pressio_max: parseInt(gsm.pressio_max ?? 10, 10),
    pistesRestants: 1,
    ubicacio: "",
    inventari_actual: Array.isArray(eg.inventari_inicial) ? eg.inventari_inicial.slice() : [],
    pistes_descobertes: Array.isArray(eg.pistes_descobertes) ? eg.pistes_descobertes.slice() : [],
    recursos_actius: Array.isArray(eg.recursos_actius) ? eg.recursos_actius.slice() : [],
    pnj_implicats: Array.isArray(eg.pnj_implicats) ? eg.pnj_implicats.slice() : [],
    variables: vars,
    flags,
    guided: true,
    currentNodeId: eg.node_inicial || "node_01",
    accionsRecents: [],
    escenaActual: {}
  };
}
function castellanizarTextoGuiado(valor) {
  // PATCH DM 2026-07-02: text estable, sense traduccio massiva destructiva.
  let s = String(valor || "");
  s = s
    .replace(/Ã¡/g, "á").replace(/Ã©/g, "é").replace(/Ã­/g, "í").replace(/Ã³/g, "ó").replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ").replace(/Ã‘/g, "Ñ")
    .replace(/Â«/g, "«").replace(/Â»/g, "»").replace(/Â¿/g, "¿").replace(/Â¡/g, "¡")
    .replace(/â€”/g, "—").replace(/â€“/g, "–").replace(/â€¦/g, "...");

  const fixes = [
    [/\bcdonde\b/gi, "donde"],
    [/\bpesoo+\b/gi, "peso"],
    [/\bpesaado\b/gi, "pesado"],
    [/\bpesaadoo+\b/gi, "pesado"],
    [/\binstantee+\b/gi, "instante"],
    [/\brecursoo+\b/gi, "recurso"],
    [/\barmarioo+\b/gi, "armario"],
    [/\bconductoo+\b/gi, "conducto"],
    [/\bpasilloo+\b/gi, "pasillo"],
    [/\bsotanoo+\b/gi, "sótano"],
    [/\bpuertaa+\b/gi, "puerta"],
    [/\bventanaa+\b/gi, "ventana"],
    [/\bhabitacionn+\b/gi, "habitación"]
  ];

  for (const [re, to] of fixes) s = s.replace(re, to);
  s = s
    .replace(/\brebost\b/gi, "despensa")
    .replace(/\bclau\b/gi, "llave")
    .replace(/\brebedor\b/gi, "recibidor")
    .replace(/\bcuina\b/gi, "cocina");

  s = s.replace(/([aeiouáéíóúàèìòù])\1{2,}/gi, "$1$1");

  const acentosVisibles = [
    [/\bmanana\b/gi, "mañana"], [/\bsenala\b/gi, "señala"], [/\bsenalar\b/gi, "señalar"],
    [/\bcamara\b/gi, "cámara"], [/\bcamaras\b/gi, "cámaras"], [/\blinea\b/gi, "línea"],
    [/\blineas\b/gi, "líneas"], [/\bvagon\b/gi, "vagón"], [/\btunel\b/gi, "túnel"],
    [/\banden\b/gi, "andén"], [/\bmegafonia\b/gi, "megafonía"], [/\bmicrofono\b/gi, "micrófono"],
    [/\bproxima\b/gi, "próxima"], [/\bproximo\b/gi, "próximo"], [/\bultima\b/gi, "última"],
    [/\bultimo\b/gi, "último"], [/\butil\b/gi, "útil"], [/\butiles\b/gi, "útiles"],
    [/\bubicacion\b/gi, "ubicación"], [/\bsituacion\b/gi, "situación"], [/\binformacion\b/gi, "información"],
    [/\baccion\b/gi, "acción"], [/\bacciones\b/gi, "acciones"], [/\bopcion\b/gi, "opción"],
    [/\bopciones\b/gi, "opciones"], [/\bpresion\b/gi, "presión"], [/\btension\b/gi, "tensión"],
    [/\bdecision\b/gi, "decisión"], [/\bdecisiones\b/gi, "decisiones"], [/\bhabitacion\b/gi, "habitación"],
    [/\bdespues\b/gi, "después"], [/\btodavia\b/gi, "todavía"], [/\bpequena\b/gi, "pequeña"],
    [/\bpequeno\b/gi, "pequeño"], [/\bano\b/gi, "año"], [/\banos\b/gi, "años"],
    [/\bperforacion\b/gi, "perforación"], [/\bestacion\b/gi, "estación"], [/\bestaciones\b/gi, "estaciones"],
    [/\belectronico\b/gi, "electrónico"], [/\belectronica\b/gi, "electrónica"], [/\bcinturon\b/gi, "cinturón"],
    [/\baun\b/gi, "aún"], [/\btambien\b/gi, "también"], [/\bdesconexion\b/gi, "desconexión"],
    [/\bya esta\b/gi, "ya está"], [/\bno esta\b/gi, "no está"], [/\besta en\b/gi, "está en"],
    [/\besta bajo\b/gi, "está bajo"], [/\besta junto\b/gi, "está junto"], [/\besta dentro\b/gi, "está dentro"],
    [/\besta fuera\b/gi, "está fuera"], [/\besta delante\b/gi, "está delante"], [/\besta detras\b/gi, "está detrás"],
    [/\besta cerrad([ao])\b/gi, "está cerrad$1"], [/\besta abiert([ao])\b/gi, "está abiert$1"],
    [/\besta apagad([ao])\b/gi, "está apagad$1"], [/\besta encendid([ao])\b/gi, "está encendid$1"]
  ];
  for (const [re, to] of acentosVisibles) s = s.replace(re, to);

  return s
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function castellanizarArrayGuiado(arr) { return Array.isArray(arr) ? arr.map(x => castellanizarTextoGuiado(x)) : []; }

function esTextOpcioSistemaGuided(text) {
  const t = normalitzarPerComparar(castellanizarTextoGuiado(text || ""));
  return /(ultimo intento|dejar que .*escena termine|escena termine|detalle final|no queda ninguna accion util|cuando ya no hay sitio|mirar que ha quedado abierto|mirar que queda vivo|opcion final|ultima reaccion)/i.test(t);
}
function etiquetaContinuacioGuided(nextNode) {
  const ref = normalitzarPerComparar([nextNode?.id, nextNode?.ubicacio, nextNode?.situacio_visible].filter(Boolean).join(" "));
  if (ref.includes("lucas")) return "Avanzar hacia el dormitorio donde respira Lucas.";
  if (nextNode?.ubicacio) return `Continuar hacia ${castellanizarTextoGuiado(nextNode.ubicacio)}.`;
  return "Continuar.";
}
function opcioContinuacioGuided(mon, node) {
  const nextId = seguentContinuacioGuided(mon, node?.id);
  if (!nextId) return null;
  const nextNode = nodeGuided(mon, nextId);
  return {
    id: `${node?.id || "node"}__continuacion_auto`,
    text: etiquetaContinuacioGuided(nextNode),
    tipus: "tecnica",
    requereix: { inventari: [], pista: [], flag: [] },
    consequencia_base: "",
    canvis_estat: canvisVacíos(node?.ubicacio || ""),
    node_seguent: null,
    trigger_final: true,
    __continuacio_auto: true
  };
}
function resoldreVariantNodeGuided(node, estat) {
  return guidedState.resolveNodeVariant(node, estat);
}
function opcionsVisiblesGuided(mon, node, estat = null) {
  const rawOps = node?.opcions || [];
  const ops = (estat ? rawOps.filter(o => compleixRequisits(o, estat)) : rawOps).slice(0, 4);
  const continuacio = opcioContinuacioGuided(mon, node);
  if (continuacio && (!ops.length || ops.every(o => o?.trigger_final || esTextOpcioSistemaGuided(o?.text)))) return [continuacio];
  return ops;
}
function esNodePontContinuacioGuided(mon, node) {
  const ops = (node?.opcions || []).slice(0, 4);
  return !!seguentContinuacioGuided(mon, node?.id) &&
    (!ops.length || ops.every(o => o?.trigger_final || esTextOpcioSistemaGuided(o?.text)));
}
function opcionsGuided(mon, node, estat = null) {
  if (estat) return opcionsVisiblesGuided(mon, node, estat).map((o, i) => `${i + 1}. ${castellanizarTextoGuiado(o.text || `Opcion ${i + 1}`)}`);
  return opcionsVisiblesGuided(mon, node).map((o, i) => `${i + 1}. ${castellanizarTextoGuiado(o.text || `Opción ${i + 1}`)}`);
}
function afegirFragmentNarrativaGuided(fragments, text) {
  const net = castellanizarTextoGuiado(text || "");
  if (!net) return;
  const norm = normalitzarPerComparar(net);
  if (fragments.some(fragment => {
    const prev = normalitzarPerComparar(fragment);
    return prev.includes(norm) || norm.includes(prev);
  })) return;
  fragments.push(net);
}
function narrativaNodeGuided(node, prefixNarrativa) {
  const fragments = [];
  afegirFragmentNarrativaGuided(fragments, prefixNarrativa);
  afegirFragmentNarrativaGuided(fragments, node?.situacio_visible);
  afegirFragmentNarrativaGuided(fragments, node?.text_base || "La escena guiada no tiene texto base.");
  return fragments.join("\n\n");
}
function escenaDesDeNodeGuided(mon, estat, node, prefixNarrativa) {
  node = node || nodeGuided(mon, estat.currentNodeId);
  node = resoldreVariantNodeGuided(node, estat);
  const narrativa = narrativaNodeGuided(node, prefixNarrativa);
  return { narrativa_visible: castellanizarTextoGuiado(narrativa), ubicacio: castellanizarTextoGuiado(node?.ubicacio || estat.ubicacio || "Ubicación guiada"), situacio: castellanizarTextoGuiado(node?.situacio_visible || "Debes elegir una opción."), personatges_visibles: castellanizarArrayGuiado(Array.isArray(node?.personatges_visibles) ? node.personatges_visibles : []), inventari_actual: castellanizarArrayGuiado(estat.inventari_actual || []), pistes_restants: estat.pistesRestants || 0, entorn_visible: castellanizarArrayGuiado(Array.isArray(node?.entorn_visible) ? node.entorn_visible : []), accions_disponibles: opcionsGuided(mon, node, estat), pressio_visible: castellanizarTextoGuiado(node?.pressio_visible || etiquetaPressio(estat.pressio ?? 2)), estat_mecanica: etiquetaPressio(estat.pressio ?? 2), accio_resultat: "investigacio_neutral", impacte_mecanica_central: 0, consumeix_tick: false, trigger_finalitzacio: false };
}
function escenaDesDeNodeSaltantPontGuided(mon, estat, node, prefixNarrativa) {
  if (node && esNodePontContinuacioGuided(mon, node)) {
    const continuacio = seguentContinuacioGuided(mon, node.id);
    const nextNode = nodeGuided(mon, continuacio);
    if (nextNode) {
      estat.currentNodeId = continuacio;
      logEvent("GUIDED_AUTO_BRIDGE", { from: node.id, to: continuacio, estat: resumEstatPerLog(estat) });
      const prefix = [prefixNarrativa, node.text_base].filter(Boolean).join("\n\n");
      return escenaDesDeNodeGuided(mon, estat, nextNode, prefix);
    }
  }
  return escenaDesDeNodeGuided(mon, estat, node, prefixNarrativa);
}
function introInicialGuided(mon, node) {
  const runtime = mon.runtime_module || {};
  const intro = typeof runtime.intro_jugable === "string" ? runtime.intro_jugable.trim() : "";
  const nodeText = typeof node?.text_base === "string" ? node.text_base.trim() : "";
  if (!intro) return "";
  if (nodeText && normalitzarPerComparar(intro).includes(normalitzarPerComparar(nodeText))) return "";
  return intro;
}
function paraulesAccioGuided(text) {
  const stop = new Set(["con", "sin", "para", "por", "que", "una", "uno", "los", "las", "del", "desde", "hacia", "antes", "despues"]);
  return normalitzarPerComparar(castellanizarTextoGuiado(text))
    .replace(/ï¿½|\uFFFD/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w));
}
function accionsSemblantsGuided(inputWords, optionWords) {
  if (!inputWords.length || !optionWords.length) return false;
  const optionSet = new Set(optionWords);
  const shared = inputWords.filter(w => optionSet.has(w)).length;
  const ratio = shared / Math.min(inputWords.length, optionWords.length);
  return shared >= 4 && ratio >= 0.55;
}
function generarIntroduccioGuided(mon, estat) {
  const nodeBase = nodeGuided(mon, estat.currentNodeId) || (mon.guided_short_module?.nodes || [])[0];
  const node = resoldreVariantNodeGuided(nodeBase, estat);
  if (node) {
    estat.currentNodeId = node.id;
    estat.ubicacio = node.ubicacio || estat.ubicacio;
  }
  return escenaDesDeNodeGuided(mon, estat, node, introInicialGuided(mon, node));
}
function seleccionarOpcioGuided(input, node, mon, estat = null) {
  const t = String(input || "").trim();
  const ops = opcionsVisiblesGuided(mon, node, estat);
  if (/^\d+$/.test(t)) {
    const idx = parseInt(t, 10) - 1;
    if (ops[idx]) return { opcio: ops[idx], index: idx, fallback: false };
  }
  const norm = normalitzarPerComparar(castellanizarTextoGuiado(t));
  const found = ops.findIndex(o => {
    const opNorm = normalitzarPerComparar(castellanizarTextoGuiado(o.text));
    return opNorm.includes(norm) || norm.includes(opNorm);
  });
  if (found >= 0) return { opcio: ops[found], index: found, fallback: false };
  const inputWords = paraulesAccioGuided(t);
  const fuzzy = ops.findIndex(o => accionsSemblantsGuided(inputWords, paraulesAccioGuided(o.text)));
  if (fuzzy >= 0) return { opcio: ops[fuzzy], index: fuzzy, fallback: false };
  return { opcio: null, index: -1, fallback: true };
}
function fallbackGuided(mon, estat, node, accio) {
  const fb = node?.fallback_si_accio_lliure || {};
  const nextId = seguentNodeLineal(mon, node?.id || estat.currentNodeId);
  aplicarCanvisGuided(estat, { pressio_delta: fb.pressio_delta || 1, ubicacio_nova: node?.ubicacio || estat.ubicacio });
  estat.torns += 1;
  if (nextId) estat.currentNodeId = nextId;
  const nextNode = nodeGuided(mon, estat.currentNodeId);
  return escenaDesDeNodeSaltantPontGuided(mon, estat, nextNode, fb.consequencia_generica || "La acción libre altera la situación y te obliga a avanzar con más riesgo.");
}
function valorVariableFinal(estat, key) {
  if (key === "pressio") return estat.pressio;
  if (estat.variables && estat.variables[key] !== undefined) return estat.variables[key];
  if (estat.flags && typeof estat.flags[key] === "number") return estat.flags[key];
  return null;
}
function compleixCondicionsFinal(cond, estat) {
  cond = cond || {};
  const flags = estat.flags || {};
  const allTrue = (cond.flags_true || []).every(f => flags[f] === true);
  const allFalse = (cond.flags_false || []).every(f => flags[f] === false || flags[f] === undefined || flags[f] === null);
  const anyTrue = !Array.isArray(cond.flags_any_true) || cond.flags_any_true.length === 0 || cond.flags_any_true.some(f => flags[f] === true);
  const eq = Object.entries(cond.flags_equals || {}).every(([k, v]) => flags[k] === v);
  const anyEqObj = cond.flags_any_equals || {};
  const anyEq = Object.keys(anyEqObj).length === 0 || Object.entries(anyEqObj).some(([k, vals]) => Array.isArray(vals) ? vals.includes(flags[k]) : flags[k] === vals);
  if (!(allTrue && allFalse && anyTrue && eq && anyEq)) return false;
  const checks = [
    ["pressio_max", "pressio", "max"], ["pressio_min", "pressio", "min"],
    ["oxigen_min", "oxigen", "min"], ["oxigen_max", "oxigen", "max"],
    ["estabilitat_min", "estabilitat_quantica", "min"], ["estabilitat_max", "estabilitat_quantica", "max"]
  ];
  for (const [field, key, type] of checks) {
    if (cond[field] === null || cond[field] === undefined) continue;
    const val = valorVariableFinal(estat, key);
    if (val === null || val === undefined) continue;
    if (type === "max" && val > cond[field]) return false;
    if (type === "min" && val < cond[field]) return false;
  }
  return true;
}
function determinarFinalGuided(mon, estat) {
  const cf = mon.guided_short_module?.criteris_de_final || {};
  const ordre = ["victoria", "victoria_parcial", "derrota"];
  for (const k of ordre) {
    if (cf[k] && compleixCondicionsFinal(cf[k].condicions, estat)) return { tipus: k, descripcio: cf[k].descripcio || "Final alcanzado." };
  }
  const f = estat.flags?.final_escollit;
  if (f && cf[f]) return { tipus: f, descripcio: cf[f].descripcio || "Final alcanzado." };
  if (estat.pressio >= 10 && cf.derrota) return { tipus: "derrota", descripcio: cf.derrota.descripcio || "La presión alcanza el punto de no retorno." };
  return null;
}
function esNodeFinalGuided(node) {
  if (node?.es_final === true) return true;
  const id = String(node?.id || "").toLowerCase();
  const type = normalitzarPerComparar([node?.fase, node?.tipus, node?.tipo_node].filter(Boolean).join(" "));
  return /^f\d/.test(id) || /\b(final|resolucion|resolucio)\b/.test(type);
}
function finalSceneFromNodeGuided(mon, estat, node, consequencia) {
  node = resoldreVariantNodeGuided(node, estat);
  const narrativa = [consequencia, node?.text_base].filter(x => x && String(x).trim()).join("\n\n");
  return {
    narrativa_visible: castellanizarTextoGuiado(narrativa || "La ultima consecuencia deja la escena sin una salida limpia."),
    ubicacio: castellanizarTextoGuiado(node?.ubicacio || estat.ubicacio || "Resolución"),
    situacio: castellanizarTextoGuiado(node?.situacio_visible || node?.ubicacio || "Final"),
    personatges_visibles: castellanizarArrayGuiado(Array.isArray(node?.personatges_visibles) ? node.personatges_visibles : []),
    inventari_actual: castellanizarArrayGuiado(estat.inventari_actual || []),
    pistes_restants: estat.pistesRestants || 0,
    entorn_visible: castellanizarArrayGuiado(Array.isArray(node?.entorn_visible) ? node.entorn_visible : []),
    accions_disponibles: [],
    pressio_visible: castellanizarTextoGuiado(node?.pressio_visible || "Lo decidido ya pesa en el lugar."),
    estat_mecanica: etiquetaPressio(estat.pressio || 0),
    accio_resultat: "exit_parcial",
    impacte_mecanica_central: 0,
    consumeix_tick: true,
    trigger_finalitzacio: true
  };
}
function finalSceneGuided(mon, estat, consequencia) {
  const f = determinarFinalGuided(mon, estat);
  if (!f) {
    return { narrativa_visible: castellanizarTextoGuiado(consequencia || "La ultima decision deja el lugar sin margen para seguir."), ubicacio: castellanizarTextoGuiado(estat.ubicacio || "Resolución"), situacio: "Resolucion", personatges_visibles: [], inventari_actual: castellanizarArrayGuiado(estat.inventari_actual || []), pistes_restants: estat.pistesRestants || 0, entorn_visible: [], accions_disponibles: [], pressio_visible: "Lo que queda ya no admite otra maniobra.", estat_mecanica: etiquetaPressio(estat.pressio || 0), accio_resultat: "exit_parcial", impacte_mecanica_central: 0, consumeix_tick: true, trigger_finalitzacio: true };
  }
  const desc = f.descripcio || "";
  const situacio = f.tipus && f.tipus !== "final" ? `Final: ${castellanizarTextoGuiado(f.tipus)}` : "Resolucion";
  return { narrativa_visible: castellanizarTextoGuiado([consequencia, desc].filter(Boolean).join("\n\n") || "La ultima consecuencia deja el lugar sin una salida limpia."), ubicacio: castellanizarTextoGuiado(estat.ubicacio || "Resolución"), situacio, personatges_visibles: [], inventari_actual: castellanizarArrayGuiado(estat.inventari_actual || []), pistes_restants: estat.pistesRestants || 0, entorn_visible: [], accions_disponibles: [], pressio_visible: "Lo decidido ya pesa en el lugar.", estat_mecanica: etiquetaPressio(estat.pressio || 0), accio_resultat: "exit_parcial", impacte_mecanica_central: 0, consumeix_tick: true, trigger_finalitzacio: true };
}
function resoldreSortidaCondicionalGuided(op, estat) {
  const llista = op?.resolucio_ordenada || op?.resolucion_ordenada || [];
  if (!Array.isArray(llista) || !llista.length) return null;
  const ordenada = llista.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
  for (const regla of ordenada) {
    const siOk = condicionsGuidedCompleixen(regla.si || [], estat);
    const siNoOk = normalitzarReqArray(regla.si_no).every(c => !estatTeTokenGuided(c, estat));
    if (siOk && siNoOk) return regla;
  }
  return null;
}
function destiSortidaCondicionalGuided(regla) {
  return regla?.hacia || regla?.node_seguent || regla?.destino || regla?.target || regla?.to || "";
}
function ferAccioGuidedLocal(mon, estat, entrada) {
  const node = nodeGuided(mon, estat.currentNodeId);
  logEvent("GUIDED_ACTION_INPUT", { entrada, nodeId: estat.currentNodeId, estat: resumEstatPerLog(estat) });
  if (!node) return finalSceneGuided(mon, estat, "No se encuentra el nodo guiado actual.");
  const sel = seleccionarOpcioGuided(entrada, node, mon, estat);
  if (sel.fallback) {
    logEvent("GUIDED_FALLBACK", { entrada, nodeId: node?.id, estat: resumEstatPerLog(estat) });
    return fallbackGuided(mon, estat, node, entrada);
  }
  const op = sel.opcio;
  const ok = compleixRequisits(op, estat);
  logEvent("GUIDED_OPTION_SELECTED", { nodeId: node?.id, index: sel.index, text: op?.text, requisitsOK: ok });
  const reglaCondicional = ok ? resoldreSortidaCondicionalGuided(op, estat) : null;
  const paquet = ok ? { consequencia_base: op.consequencia_base, canvis_estat: op.canvis_estat, node_seguent: destiSortidaCondicionalGuided(reglaCondicional) || op.node_seguent } : (op.si_requisit_no_complert || {});
  aplicarCanvisGuided(estat, paquet.canvis_estat || canvisVacíos(estat.ubicacio));
  logEvent("GUIDED_STATE_CHANGED", { canvis: paquet.canvis_estat || canvisVacíos(estat.ubicacio), estat: resumEstatPerLog(estat) });
  estat.torns += 1;
  const trigger = Boolean(op.trigger_final || paquet.trigger_final || paquet.trigger_finalitzacio || reglaCondicional?.trigger_final || reglaCondicional?.trigger_finalitzacio);
  const nextId = paquet.node_seguent ?? op.node_seguent ?? paquet.canvis_estat?.ubicacio_nova ?? op.canvis_estat?.ubicacio_nova;
  const finalNode = nextId ? nodeGuided(mon, nextId) : null;
  const continuacio = trigger ? seguentContinuacioGuided(mon, node.id) : null;
  if (trigger && continuacio) {
    estat.currentNodeId = continuacio;
    const nextNode = nodeGuided(mon, estat.currentNodeId);
    logEvent("GUIDED_CONTINUATION_EDGE", { from: node.id, to: continuacio, estat: resumEstatPerLog(estat) });
    return escenaDesDeNodeGuided(mon, estat, nextNode, paquet.consequencia_base || op.consequencia_base || "");
  }
  if (trigger && finalNode && esNodeFinalGuided(finalNode) && !seguentContinuacioGuided(mon, finalNode.id)) {
    estat.currentNodeId = finalNode.id;
    return finalSceneFromNodeGuided(mon, estat, finalNode, paquet.consequencia_base || op.consequencia_base || "");
  }
  if (trigger) return finalSceneGuided(mon, estat, paquet.consequencia_base || op.consequencia_base || "La decisión final queda tomada.");
  estat.currentNodeId = nextId ?? node.id;
  const nextNode = nodeGuided(mon, estat.currentNodeId);
  if (nextNode && esNodeFinalGuided(nextNode) && !seguentContinuacioGuided(mon, nextNode.id)) return finalSceneFromNodeGuided(mon, estat, nextNode, paquet.consequencia_base || op.consequencia_base || "");
  return escenaDesDeNodeSaltantPontGuided(mon, estat, nextNode, paquet.consequencia_base || op.consequencia_base || "La acción cambia la situación.");
}

// =====================================================================
// 7.a RESOLUCIÓN LOCAL CLARA, ANTI-BUCLE Y FALLBACK ROBUSTO
// =====================================================================
function textoVisibleEscena(estat, extra = []) {
  const escena = estat.escenaActual || {};
  return [
    estat.ubicacio,
    escena.ubicacio,
    escena.situacio,
    ...(Array.isArray(escena.entorn_visible) ? escena.entorn_visible : []),
    ...(Array.isArray(escena.personatges_visibles) ? escena.personatges_visibles : []),
    ...(Array.isArray(estat.inventari_actual) ? estat.inventari_actual : []),
    ...(Array.isArray(estat.informacio_coneguda) ? estat.informacio_coneguda : []),
    ...extra
  ].filter(Boolean).join(" ");
}

function accioClaramentSuicida(accio, estat) {
  const t = normalitzarPerComparar(accio);
  const context = normalitzarPerComparar(textoVisibleEscena(estat));
  const violencia = /(atacar|matar|disparar|apuñalar|apunyalar|degollar|agredir|desenvainar|desenfundar|cargar contra|romper a golpes)/i.test(t);
  const autoritat = /(guardia|pretorian|soldado|centurion|centurión|policia|policía|militar|lictor|prefecto|senado|templo|altar|multitud)/i.test(t + " " + context);
  const rendicio = /(me rindo|rendir|rendirse|me entrego|no hago nada|espero sin actuar|callo y espero)/i.test(t);
  return (violencia && autoritat) || (rendicio && (estat.pressio || 0) >= 7);
}

function accioClimaxEvident(mon, estat, accio) {
  const t = normalitzarPerComparar(accio);
  const context = normalitzarPerComparar(textoVisibleEscena(estat, [
    JSON.stringify(mon.runtime_module || {}),
    JSON.stringify((mon.world_full || {}).climax || {})
  ]));
  const sello = /(sello|segell|áureo|aureo|augusto)/i.test(t) && /(pontifice|pontífice|altar|testamento|libacion|libación|sacrificio)/i.test(t + " " + context);
  const libro = /(libro de guardia|tabulario|soborno|sobornos|registro|pruebas)/i.test(t) && /(senado|drusila|pontifice|pontífice|altar|tribuna)/i.test(t + " " + context);
  const confesion = /(confieso|confesar|revelo|revelar|denuncio|denunciar|expongo|exponer)/i.test(t) && /(fraude|traicion|traición|conjura|falsificacion|falsificación|testamento)/i.test(t + " " + context);
  return sello || libro || confesion;
}

function resolucionLocalJSON(mon, estat, accio, tipo, opts = {}) {
  const escena = estat.escenaActual || {};
  const idiomaCast = estat && estat.idioma === "Castellano";
  const ubic = estat.ubicacio || escena.ubicacio || (idiomaCast ? "Ubicación actual" : "Ubicació actual");
  const entorn = Array.isArray(escena.entorn_visible) ? escena.entorn_visible.slice(0, 4) : [];
  const pnj = Array.isArray(escena.personatges_visibles) ? escena.personatges_visibles.slice(0, 4) : [];
  const inv = Array.isArray(estat.inventari_actual) ? estat.inventari_actual.slice() : [];
  let narrativa = "";
  let situacio = "";
  let resultado = "exit_parcial";
  let impacte = 1;
  let finalitza = false;

  if (tipo === "repeticio") {
    narrativa = "Insistes sobre el mismo objetivo: " + truncar(accio, 120) + ". Esta vez no aparece información nueva; la insistencia consume tiempo y deja una señal que las fuerzas activas pueden aprovechar. El entorno no permanece quieto: una ruta se estrecha, una vigilancia se ajusta o una oportunidad empieza a cerrarse.";
    situacio = "La repetición tiene coste y no aporta una solución nueva.";
    resultado = "exit_parcial";
    impacte = 2;
  } else if (tipo === "suicida") {
    narrativa = "La acción es demasiado frontal para la situación actual: " + truncar(accio, 120) + ". No se resuelve como una oportunidad heroica, sino como una ruptura del margen táctico. La autoridad presente reacciona, el espacio se cierra y tu iniciativa queda dañada antes de que puedas controlar las consecuencias.";
    situacio = "La acción provoca una reacción inmediata y peligrosa.";
    resultado = "fracas";
    impacte = 2;
    finalitza = (estat.pressio || 0) >= 8;
  } else if (tipo === "climax_evident") {
    narrativa = "Tu acción encaja de forma directa con el núcleo del conflicto: " + truncar(accio, 140) + ". No hace falta buscar una interpretación alternativa; el mundo reconoce el gesto como una intervención decisiva. Las miradas se concentran, el rito o la autoridad se detienen por un instante y la situación entra en una fase irreversible.";
    situacio = "Has activado una vía decisiva del clímax.";
    resultado = "exit_complet";
    impacte = 0;
    estat.climaxActivat = true;
  } else if (tipo === "final_local") {
    const climax = (mon.runtime_module && mon.runtime_module.climax) || ((mon.world_full || {}).climax || {}).dilema || "El conflicto central exige una decisión con coste.";
    narrativa = "La presión acumulada alcanza el límite. " + truncar(climax, 240) + " Ya no queda espacio para una comprobación más: las fuerzas activas imponen una resolución y cada recurso pendiente se convierte en consecuencia.";
    situacio = "La partida entra en resolución local por presión máxima.";
    resultado = "fracas";
    impacte = 0;
    finalitza = true;
  } else {
    narrativa = "La situación se resuelve localmente porque la relación entre acción, entorno y coste es clara: " + truncar(accio, 120) + ". El mundo avanza sin esperar una nueva interpretación de la IA.";
    situacio = "La situación avanza de forma controlada.";
  }

  return validarTorn({
    narrativa_visible: narrativa,
    ubicacio: ubic,
    situacio,
    personatges_visibles: pnj,
    inventari_actual: inv,
    pistes_restants: estat.pistesRestants,
    entorn_visible: entorn,
    accions_disponibles: [],
    vias_abiertas: [],
    informacio_nova: opts.informacio_nova || [],
    informacio_coneguda: estat.informacio_coneguda || [],
    pressio_visible: etiquetaMecanica(Math.min(10, (estat.pressio || 0) + Math.max(0, impacte)), estat, mon),
    estat_mecanica: etiquetaMecanica(Math.min(10, (estat.pressio || 0) + Math.max(0, impacte)), estat, mon),
    accio_resultat: resultado,
    impacte_mecanica_central: impacte,
    consumeix_tick: true,
    trigger_finalitzacio: finalitza
  }, estat);
}

function intentarResolucioLocalClara(mon, estat, accio, flags = {}, ultimaEscena = null) {
  if (!ENABLE_LOCAL_CLEAR_RESOLUTION) return null;
  if (!estat || estat.mode !== "LLIURE") return null;
  if (flags.final || (estat.pressio || 0) >= 10) return resolucionLocalJSON(mon, estat, accio, "final_local");
  if (objectiuRepetit(accio, estat)) return resolucionLocalJSON(mon, estat, accio, "repeticio");
  if (accioClaramentSuicida(accio, estat)) return resolucionLocalJSON(mon, estat, accio, "suicida");
  if ((flags.climax || estat.climaxActivat || (estat.pressio || 0) >= 7) && accioClimaxEvident(mon, estat, accio)) {
    return resolucionLocalJSON(mon, estat, accio, "climax_evident", { informacio_nova: ["La acción ha activado una vía decisiva del conflicto central."] });
  }
  return null;
}

function finalitzarTornWebLocal(mon, estat, resum, textAccio, json) {
  json.consumeix_tick = json.consumeix_tick !== false;
  if (json.consumeix_tick) {
    estat.torns += 1;
    estat.pressio = clamp((estat.pressio || 0) + (parseInt(json.impacte_mecanica_central || 0, 10) || 0), 0, 10);
  }
  fusionarInformacio(estat, json.informacio_nova || []);
  json.informacio_coneguda = estat.informacio_coneguda || [];
  json.pressio_visible = etiquetaMecanica(estat.pressio, estat, mon);
  json.estat_mecanica = json.pressio_visible;
  estat.ubicacio = json.ubicacio;
  estat.inventari_actual = json.inventari_actual || estat.inventari_actual;
  estat.escenaActual = {
    ubicacio: json.ubicacio,
    situacio: json.situacio,
    entorn_visible: json.entorn_visible || [],
    personatges_visibles: json.personatges_visibles || []
  };
  const resumNou = actualitzarResum(resum, textAccio, json);
  estatPartidaWeb = { mon, estat, resum: resumNou, ultimaSituacio: json.situacio, ultimaEscena: json };
  logEvent("LOCAL_CLEAR_RESOLUTION", { accio: textAccio, estat: resumEstatPerLog(estat), escena: json });
  return json;
}

// =====================================================================
// ESTAT GLOBAL WEB
// =====================================================================

// =====================================================================
// 7.b FUNCIONS WEB (sense readline)
// =====================================================================

// Estat global de la partida web activa.
// De moment és un prototip d'una sola partida activa al servidor.
let estatPartidaWeb = null;
let monForcatIdWeb = null;

function iniciarPartidaWeb(genere, mode) {
  logEvent("WEB_START_REQUEST", { genere, mode });
  const mons = carregarMons();

  if (!mons.length) {
    return { error: "No hi ha mons disponibles" };
  }

  let monRaw = null;

  if (monForcatIdWeb) {
    const idDemanat = String(monForcatIdWeb);
    monRaw = mons.find(m =>
      idDelMon(m) === idDemanat ||
      m?.world_full?.id === idDemanat ||
      m?.runtime_module?.id === idDemanat
    );
    monForcatIdWeb = null;

    if (!monRaw) {
      return { error: `No s'ha trobat el món sol·licitat: ${idDemanat}` };
    }

    const genereReal = genereDelMon(monRaw);
    if (genereReal && genereReal !== genere) genere = genereReal;
  } else {
    monRaw = triarMon(mons, genere);
  }

  if (!monRaw) {
    return { error: `No hay mundos del género ${genere}` };
  }

  const mon = teGuidedShort(monRaw) ? monRaw : sanejar(monRaw);
  logEvent("PARTIDA_INICI", { canal: "web", genere, mode, worldId: idDelMon(mon), guidedShort: teGuidedShort(mon) });
  const runtime = mon.runtime_module || {};
  const estatInicial = runtime.estat_inicial || {};

  const estat = {
    genere,
    mode,
    idioma: idiomaDelMon(mon),
    worldId: idDelMon(mon),
    limitTorns: mode === "CURT GUIAT" ? 8 : 14,
    torns: 0,
    pressio: 2,
    pistesRestants: mode === "CURT GUIAT" ? 1 : 6,
    ubicacio: estatInicial.ubicacio || "",
    inventari_actual: Array.isArray(estatInicial.inventari_inicial)
      ? estatInicial.inventari_inicial.slice()
      : [],
    climaxActivat: false,
    informacio_coneguda: [],
    accionsRecents: [],
    escenaActual: ""
  };

  if (mode === "CURT GUIAT" && teGuidedShort(mon)) {
    const estatGuiat = estatGuidedInicial(mon, genere, mode);
    guardarHistorial(genere, mon);
    fs.writeFileSync(dataFile("mon_seleccionat.json"), JSON.stringify(mon, null, 2), "utf8");
    fs.writeFileSync(dataFile("runtime_actual.json"), JSON.stringify(runtime, null, 2), "utf8");
    const introGuiada = generarIntroduccioGuided(mon, estatGuiat);
    estatGuiat.ubicacio = introGuiada.ubicacio;
    estatGuiat.escenaActual = {
      ubicacio: introGuiada.ubicacio,
      situacio: introGuiada.situacio,
      entorn_visible: introGuiada.entorn_visible || [],
      personatges_visibles: introGuiada.personatges_visibles || []
    };
    estatPartidaWeb = {
      mon,
      estat: estatGuiat,
      resum: actualitzarResum("", "Inici guiat", introGuiada),
      ultimaSituacio: introGuiada.situacio,
      ultimaEscena: introGuiada
    };
    logEvent("PARTIDA_READY", { canal: "web", estat: resumEstatPerLog(estatGuiat), escena: introGuiada });
    return { estat: estatGuiat, escena: introGuiada };
  }

  guardarHistorial(genere, mon);

  fs.writeFileSync(dataFile("mon_seleccionat.json"), JSON.stringify(mon, null, 2), "utf8");
  fs.writeFileSync(dataFile("runtime_actual.json"), JSON.stringify(runtime, null, 2), "utf8");

  const intro = generarIntroduccioLocal(mon, estat);

  estat.ubicacio = intro.ubicacio;
  estat.inventari_actual = intro.inventari_actual || estat.inventari_actual;
  estat.escenaActual = {
    ubicacio: intro.ubicacio,
    situacio: intro.situacio,
    entorn_visible: intro.entorn_visible || [],
    personatges_visibles: intro.personatges_visibles || []
  };

  // Guardem l'estat intern complet per poder continuar torns i guardar/carregar.
  estatPartidaWeb = {
    mon,
    estat,
    resum: actualitzarResum("", "Inici", intro),
    ultimaSituacio: intro.situacio,
    ultimaEscena: intro
  };

  return {
    estat,
    escena: intro
  };
}

async function ferAccioWeb(accio) {

  if (!estatPartidaWeb) {
    return { error: "No hay partida activa" };
  }

  // === CORRECCIÓ: RECUPERAR VARIABLES DE L'ESTAT GLOBAL ===
  const mon = estatPartidaWeb.mon;
  const estat = estatPartidaWeb.estat;
  let resum = estatPartidaWeb.resum;
  let ultimaSituacio = estatPartidaWeb.ultimaSituacio;
  
  // === CORRECCIÓ: DEFINIR textAccio ===
  const textAccio = String(accio || "").trim();

  // Ara ja es pot executar correctament:
  logEvent("ACCIO_JUGADOR", { canal: "web", entradaOriginal: accio, accio: textAccio, estat: resumEstatPerLog(estat) });

  const demanaPista = esPista(textAccio);
  if (demanaPista && estat.mode === "LLIURE") {
    if ((estat.pistesRestants || 0) <= 0) {
      return { error: "No te quedan pistas disponibles." };
    }
    estat.pistesRestants = Math.max(0, (estat.pistesRestants || 0) - 1);
    const baseEscena = estatPartidaWeb.ultimaEscena || {
      ubicacio: estat.ubicacio,
      situacio: ultimaSituacio,
      entorn_visible: estat.escenaActual?.entorn_visible || [],
      personatges_visibles: estat.escenaActual?.personatges_visibles || [],
      inventari_actual: estat.inventari_actual || []
    };
    const pistaJson = generarPistaLocal(mon, estat, baseEscena);
    pistaJson.pistes_restants = estat.pistesRestants;
    estatPartidaWeb = {
      mon,
      estat,
      resum: actualitzarResum(resum, "Pista", pistaJson),
      ultimaSituacio: pistaJson.situacio,
      ultimaEscena: pistaJson
    };
    logEvent("PISTA_LOCAL", { canal: "web", estat: resumEstatPerLog(estat), escena: pistaJson });
    return pistaJson;
  }

  if (estat.guided && estat.mode === "CURT GUIAT" && teGuidedShort(mon)) {
    estat.accionsRecents = (estat.accionsRecents || []).concat([textAccio]).slice(-6);
    
    // He canviat 'accio' per 'textAccio' aquí per mantenir el format net
    const jsonGuiat = ferAccioGuidedLocal(mon, estat, textAccio); 
    
    estat.ubicacio = jsonGuiat.ubicacio;
    estat.inventari_actual = jsonGuiat.inventari_actual || estat.inventari_actual;
    estat.escenaActual = {
      ubicacio: jsonGuiat.ubicacio,
      situacio: jsonGuiat.situacio,
      entorn_visible: jsonGuiat.entorn_visible || [],
      personatges_visibles: jsonGuiat.personatges_visibles || []
    };
    const resumNou = actualitzarResum(resum, textAccio, jsonGuiat);
    estatPartidaWeb = {
      mon,
      estat,
      resum: resumNou,
      ultimaSituacio: jsonGuiat.situacio,
      ultimaEscena: jsonGuiat
    };
    logEvent("ESTAT_POST_TORN", { canal: "web", tipus: "guiat", accio: textAccio, estat: resumEstatPerLog(estat), escena: jsonGuiat });
    return jsonGuiat;
  }

  estat.accionsRecents = (estat.accionsRecents || []).concat([textAccio]).slice(-6);
  const jsonLocalClar = intentarResolucioLocalClara(mon, estat, textAccio, { pista: false, climax: estat.climaxActivat, final: false }, estatPartidaWeb.ultimaEscena);
  if (jsonLocalClar) {
    return finalitzarTornWebLocal(mon, estat, resum, textAccio, jsonLocalClar);
  }
  let climax = false;
  const llindarClimax = Math.max(1, estat.limitTorns - 2);

  if (!estat.climaxActivat && (estat.torns >= llindarClimax || (estat.pressio || 0) >= 7)) {
    estat.climaxActivat = true;
    climax = true;
  }

  let json;
  try {
    json = await obtenirTorn(
      mon,
      estat,
      resum,
      textAccio,
      {
        pista: false,
        climax,
        final: false
      },
      ultimaSituacio
    );
  } catch (e) {
    console.error("[ERROR ferAccioWeb]", e);
    logEvent("WEB_TURN_ERROR", { accio: textAccio, error: e?.message || String(e), estat: resumEstatPerLog(estat) });
    json = generarTornLocalEmergencia(mon, estat, textAccio, { pista: false, climax: false, final: false }, ultimaSituacio);
  }

  json.consumeix_tick = true;

  if (estat.mode === "CURT GUIAT" && json.impacte_mecanica_central <= 0) {
    json.impacte_mecanica_central = 1;
  }

  if (estat.mode === "LLIURE") {
    json.impacte_mecanica_central = impacteFinalModeLliure(json, estat, textAccio);
  }

  json.pistes_restants = estat.pistesRestants;

  if (json.consumeix_tick) {
    estat.torns += 1;
    estat.pressio = clamp(estat.pressio + json.impacte_mecanica_central, 0, 10);
  }

  fusionarInformacio(estat, json.informacio_nova || []);
  json.informacio_coneguda = estat.informacio_coneguda || [];
  json.pressio_visible = etiquetaMecanica(estat.pressio, estat, mon);
  json.estat_mecanica = json.pressio_visible;

  if (estat.pressio >= 10 && !json.trigger_finalitzacio) {
    try {
      json = await obtenirTorn(
        mon,
        estat,
        resum,
        textAccio,
        {
          pista: false,
          climax: false,
          final: true
        },
        ultimaSituacio
      );
    } catch (e) {
      json = generarTornLocalEmergencia(mon, estat, textAccio, { pista: false, climax: false, final: true }, ultimaSituacio);
    }
    json.informacio_coneguda = estat.informacio_coneguda || [];
    json.pressio_visible = etiquetaMecanica(estat.pressio, estat, mon);
    json.estat_mecanica = json.pressio_visible;
  }

  estat.ubicacio = json.ubicacio;
  estat.inventari_actual = json.inventari_actual || estat.inventari_actual;
  estat.escenaActual = {
    ubicacio: json.ubicacio,
    situacio: json.situacio,
    entorn_visible: json.entorn_visible || [],
    personatges_visibles: json.personatges_visibles || []
  };

  resum = actualitzarResum(resum, textAccio, json);
  ultimaSituacio = json.situacio;

  estatPartidaWeb = {
    mon,
    estat,
    resum,
    ultimaSituacio,
    ultimaEscena: json
  };

  return json;
}

function obtenirPartidaWeb() {
  return estatPartidaWeb;
}

function carregarPartidaWeb(partida) {
  logEvent("LOAD_GAME_REQUEST", { teMon: !!partida?.mon, teEstat: !!partida?.estat, teEscena: !!partida?.ultimaEscena });
  if (!partida || !partida.mon || !partida.estat || !partida.ultimaEscena) {
    return { error: "El archivo de partida no tiene una estructura válida." };
  }

  estatPartidaWeb = partida;

  return {
    partida: estatPartidaWeb,
    escena: estatPartidaWeb.ultimaEscena
  };
}

// =====================================================================
// 7.c FUNCIONS AUXILIARS WEB PER AL SERVIDOR
// =====================================================================
function obtenirLlistaMons() {
  return carregarMons();
}

function forcarMonPerId(id) {
  monForcatIdWeb = String(id || "").trim() || null;
  return !!monForcatIdWeb;
}

// =====================================================================
// 8. MOTOR PRINCIPAL
// =====================================================================
async function iniciarJoc() {
  logEvent("CLI_START", { script: "narrative_engine.js" });
  console.log("\n=======================================================");
  console.log("   PROJECT DM - NARRATIVE ENGINE");
  console.log("=======================================================\n");
  console.log(`[Sistema] Router DM: Groq base=${MODEL_GROQ_BASE} | Groq barat=${MODEL_GROQ_CHEAP} | Gemini qualitat=${MODEL_GEMINI_QUALITY} | Gemini suport=${MODEL_GEMINI_SUPPORT} | OpenRouter=${MODEL_OPENROUTER_FREE}`);
  console.log(`[Sistema] Max tokens de SORTIDA torn: ${MAX_TOKENS_TORN} | final: ${MAX_TOKENS_FINAL}`);
  console.log(`[Sistema] Nota: el consum real també inclou tokens d'entrada del prompt i del context.\n`);

  const mons = carregarMons();
  if (!mons.length) {
    console.log("No he encontrado ningún mundo JSON con { world_full, runtime_module }.");
    console.log("Ponlos en ./worlds/aventura, ./worlds/thriller, ./worlds/terror o ./worlds/ciencia.");
    rl.close(); return;
  }

  const comptatge = mons.reduce((a, m) => {
    const g = genereDelMon(m) || "Sense gènere";
    a[g] = (a[g] || 0) + 1;
    return a;
  }, {});
  console.log("Mundos cargados:");
  Object.entries(comptatge).forEach(([g, n]) => console.log(`- ${g}: ${n}`));

  console.log("\nElige el GÉNERO:");
  console.log("1. Ciencia");
  console.log("2. Aventura (antes Medieval)");
  console.log("3. Terror");
  console.log("4. Thriller");

  let genere = null;
  while (!genere) {
    genere = normalitzarGenere(await preguntar("\nOpción (1-4) > "));
    if (!genere) console.log("Opción no reconeguda.");
  }

  const monRaw = triarMon(mons, genere);
  if (!monRaw) {
    console.log(`\nNo hay mundos del género ${genere}.`);
    rl.close(); return;
  }

  console.log("\nElige el MODO DE JUEGO:");
  console.log("A. Guiada - opciones cerradas, ritmo rápido");
  console.log("B. Libre - acción abierta, ritmo amplio");

  let mode = null;
  while (!mode) {
    mode = normalitzarMode(await preguntar("\nOpción (A/B) > "));
    if (!mode) console.log("Opción no reconeguda.");
  }

  const mon = teGuidedShort(monRaw) ? monRaw : sanejar(monRaw);
  const runtime = mon.runtime_module || {};
  const worldFull = mon.world_full || {};
  const estatInicial = runtime.estat_inicial || {};
  const worldId = idDelMon(mon);

  guardarHistorial(genere, mon);
  fs.writeFileSync(dataFile("mon_seleccionat.json"), JSON.stringify(mon, null, 2), "utf8");
  fs.writeFileSync(dataFile("runtime_actual.json"), JSON.stringify(runtime, null, 2), "utf8");

  const estat = {
    genere,
    mode,
    idioma: idiomaDelMon(mon),
    worldId,
    limitTorns: mode === "CURT GUIAT" ? 8 : 14,
    torns: 0,
    pressio: 2,
    pistesRestants: mode === "CURT GUIAT" ? 1 : 6,
    ubicacio: estatInicial.ubicacio || "",
    inventari_actual: Array.isArray(estatInicial.inventari_inicial) ? estatInicial.inventari_inicial.slice() : [],
    climaxActivat: false,
    informacio_coneguda: [],
    accionsRecents: [],
    escenaActual: {}
  };

  console.log(`\n[Sistema] Mundo seleccionado: ${worldId}`);
  if (worldFull.subgenere) console.log(`[Sistema] Subgénero: ${worldFull.subgenere}`);

  if (mode === "CURT GUIAT" && teGuidedShort(mon)) {
    console.log(`[Sistema] guided_short_module: detectat. Mode curt guiat executat 100% en local, sense crides al model.`);
    const estatGuiat = estatGuidedInicial(mon, genere, mode);
    let json = generarIntroduccioGuided(mon, estatGuiat);
    render(json);

    while (!json.trigger_finalitzacio) {
      const entrada = await preguntar("¿Qué haces? (1, 2, 3, 4) > ");
      const textEntrada = String(entrada || "").trim();
      logEvent("ACCIO_JUGADOR", { canal: "cli", entradaOriginal: entrada, accio: textEntrada, estat: resumEstatPerLog(estatGuiat) });
      if (["sortir", "exit", "quit", "q"].includes(textEntrada.toLowerCase())) {
  console.log("\n[Sistema] Partida interrumpida.\n");
  break;
}
      json = ferAccioGuidedLocal(mon, estatGuiat, textEntrada);
      render(json);
      if (json.trigger_finalitzacio) {
      console.log("\n=======================================================");
console.log("                   [FIN DE LA PARTIDA]");
console.log("=======================================================\n");
        break;
      }
    }
    rl.close();
    return;
  }
  console.log(`[Sistema] dm_oracles: ${mon.dm_oracles && Object.keys(mon.dm_oracles).length ? "detectats" : "no detectats / compatibilitat antiga"}`);
  console.log("[Sistema] Introducción local + DM vivo con oráculos activado...\n");

  try {
    let resum = "";
    let ultimaSituacio = "";

    let json = generarIntroduccioLocal(mon, estat);
    render(json);
    estat.ubicacio = json.ubicacio;
    estat.inventari_actual = json.inventari_actual;
    estat.escenaActual = { ubicacio: json.ubicacio, situacio: json.situacio, entorn_visible: json.entorn_visible, personatges_visibles: json.personatges_visibles };
    ultimaSituacio = json.situacio;
    resum = actualitzarResum(resum, "Inici", json);

    while (!json.trigger_finalitzacio) {
      const entrada = await preguntar("¿Qué haces? (1, 2, 3, 4 o 'pista') > ");
      const textEntrada = String(entrada || "").trim();
      logEvent("ACCIO_JUGADOR", { canal: "cli", entradaOriginal: entrada, accio: textEntrada, estat: resumEstatPerLog(estat) });
      if (["sortir", "exit", "quit", "q"].includes(textEntrada.toLowerCase())) {
        console.log("\n[Sistema] Partida interrumpida.\n");
        break;
      }

      const pista = esPista(textEntrada);
      if (pista && estat.pistesRestants <= 0) {
        console.log("\n[Sistema] No te quedan pistas disponibles.\n");
        continue;
      }
      if (pista) {
        estat.pistesRestants = Math.max(0, estat.pistesRestants - 1);
        json = generarPistaLocal(mon, estat, json);
        logEvent("PISTA_LOCAL", { canal: "cli", estat: resumEstatPerLog(estat), escena: json });
        json.pistes_restants = estat.pistesRestants;
        render(json);
        estat.escenaActual = { ubicacio: json.ubicacio, situacio: json.situacio, entorn_visible: json.entorn_visible, personatges_visibles: json.personatges_visibles };
        ultimaSituacio = json.situacio;
        resum = actualitzarResum(resum, "Pista", json);
        continue;
      }

      const accio = interpretarAccio(textEntrada, json.accions_disponibles);
      estat.accionsRecents = (estat.accionsRecents || []).concat([accio]).slice(-6);
      let climax = false;
      const llindarClimax = Math.max(1, estat.limitTorns - 2);
      if (!pista && !estat.climaxActivat && estat.torns >= llindarClimax) {
        estat.climaxActivat = true;
        climax = true;
      }

      json = await obtenirTorn(mon, estat, resum, accio, { pista, climax, final: false }, ultimaSituacio);

      if (pista) {
        estat.pistesRestants = Math.max(0, estat.pistesRestants - 1);
        json.pistes_restants = estat.pistesRestants;
        json.consumeix_tick = false;
        json.impacte_mecanica_central = 0;
      } else {
        json.consumeix_tick = true;
        if (estat.mode === "CURT GUIAT" && json.impacte_mecanica_central <= 0) json.impacte_mecanica_central = 1;
        json.pistes_restants = estat.pistesRestants;
      }

      if (json.consumeix_tick && !pista) {
        estat.torns += 1;
        estat.pressio = clamp(estat.pressio + json.impacte_mecanica_central, 0, 10);
      }

      if (estat.pressio >= 10 && !json.trigger_finalitzacio) {
        json = await obtenirTorn(mon, estat, resum, accio, { pista: false, climax: false, final: true }, ultimaSituacio);
      }

      render(json);
      estat.ubicacio = json.ubicacio;
      estat.inventari_actual = json.inventari_actual;
      estat.escenaActual = { ubicacio: json.ubicacio, situacio: json.situacio, entorn_visible: json.entorn_visible, personatges_visibles: json.personatges_visibles };
      ultimaSituacio = json.situacio;
      resum = actualitzarResum(resum, accio, json);

      if (json.trigger_finalitzacio) {
        console.log("\n=======================================================");
        console.log("                   [FIN DE LA PARTIDA]");
        console.log("=======================================================\n");
        break;
      }
    }
  } catch (e) {
    console.log("\n[ERROR DEL SISTEMA]");
    if (esRateLimitDiari(e)) {
      console.log("Has alcanzado el límite diario de tokens del modelo utilizado.");
      console.log("Pots esperar el reinici de quota o provar amb MAX_TOKENS_TORN més baix / un altre GROQ_MODEL.");
    }
    console.log(e.message || e);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  iniciarJoc();
}

// Exportació per a ús web (server.js)
module.exports = {
  iniciarJoc,
  iniciarPartidaWeb,
  ferAccioWeb,
  obtenirPartidaWeb,
  carregarPartidaWeb,
  obtenirLlistaMons,
  forcarMonPerId,
  teGuidedShort
};
