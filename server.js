const express = require("express");  
const fs = require("fs");  
const path = require("path");  
const dm = require("./jocgroq16.js");  
const app = express();  
const PORT = process.env.PORT || 3000;  
const ROOT = __dirname;  
const PUBLIC_DIR = path.join(ROOT, "public");  
const INDEX_ROOT = path.join(ROOT, "index.html");  
const INDEX_PUBLIC = path.join(PUBLIC_DIR, "index.html");  
const SAVE_DIR = path.join(ROOT, "saves_web");  
const AUTOSAVE_FILE = path.join(SAVE_DIR, "autosave_server.json");  
const MANUALSAVE_FILE = path.join(SAVE_DIR, "manual_server.json");  
const MEJORAS_TEXT_FILE = path.join(SAVE_DIR, "millores_text.json");  
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });  
app.use(express.json({ limit: "10mb" }));  
app.use(express.urlencoded({ extended: true }));  
if (fs.existsSync(PUBLIC_DIR)) app.use(express.static(PUBLIC_DIR));  
let partidaActual = null;  
let uiRutaDM = [];  
let uiAccionsDM = [];  
let uiTransicionsDM = [];  
let mejorasTextoDM = [];  
function netejarTextDM(valor) {  
  return String(valor || "")  
    .replace(/\\n/g, "\n")  
    .replace(/\r\n/g, "\n")  
    .replace(/\n{3,}/g, "\n\n")  
    .trim();  
}  
function netejarItemDM(valor) {  
  return netejarTextDM(valor)  
    .replace(/^\s*[·\-–—•]+\s*/g, "")  
    .replace(/^\s*\d+\.\s*/g, "")  
    .replace(/\s+/g, " ")  
    .trim();  
}  

function normalizarClaveMejoraDM(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
function cargarMejorasTextoDM() {
  const fuentes = [MEJORAS_TEXT_FILE];
  const merged = [];
  const seen = new Set();
  for (const file of fuentes) {
    try {
      if (!fs.existsSync(file)) continue;
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      const arr = Array.isArray(raw?.mejoras) ? raw.mejoras : (Array.isArray(raw) ? raw : []);
      for (const m of arr) {
        const original = netejarTextDM(m?.original || "");
        const nuevo = netejarTextDM(m?.nuevo || m?.nou || m?.replace || "");
        if (!original || !nuevo) continue;
        const tipo = String(m?.tipo || m?.tipus || "otro").trim() || "otro";
        const key = normalizarClaveMejoraDM(original + "|" + tipo);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({ original, nuevo, tipo, createdAt: m?.createdAt || null });
      }
    } catch (e) {}
  }
  mejorasTextoDM = merged;
  return mejorasTextoDM;
}
function guardarMejorasTextoDM() {
  try {
    if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
    fs.writeFileSync(MEJORAS_TEXT_FILE, JSON.stringify({ exportedAt: new Date().toISOString(), mejoras: mejorasTextoDM }, null, 2), "utf8");
  } catch (e) {
    console.error("[MEJORAS_TEXT_SAVE_ERROR]", e?.message || e);
  }
}
function registrarMejoraTextoDM(payload = {}) {
  const original = netejarTextDM(payload.original || "");
  const nuevo = netejarTextDM(payload.nuevo || payload.nou || "");
  const tipo = String(payload.tipo || "otro").trim() || "otro";
  if (!original || !nuevo) throw new Error("Faltan texto original o texto nuevo.");
  const key = normalizarClaveMejoraDM(original + "|" + tipo);
  const idx = mejorasTextoDM.findIndex(m => normalizarClaveMejoraDM((m.original || "") + "|" + (m.tipo || "otro")) === key);
  const item = { original, nuevo, tipo, createdAt: new Date().toISOString() };
  if (idx >= 0) mejorasTextoDM[idx] = { ...mejorasTextoDM[idx], ...item };
  else mejorasTextoDM.push(item);
  guardarMejorasTextoDM();
  return item;
}
function exportMejorasTextoPayloadDM() {
  return { exportedAt: new Date().toISOString(), count: mejorasTextoDM.length, mejoras: mejorasTextoDM };
}
function aplicarMejorasUsuarioDM(text) {
  let out = String(text || "");
  const ordenadas = (mejorasTextoDM || []).slice().sort((a,b) => String(b.original || "").length - String(a.original || "").length);
  for (const m of ordenadas) {
    if (!m?.original || !m?.nuevo) continue;
    if (out.includes(m.original)) out = out.split(m.original).join(m.nuevo);
  }
  return out;
}
function limpiarMetaLenguajeDM(text) {
  let t = String(text || "");
  const cambios = [
    [/\bSe ha detectado una deducción relevante:\s*/gi, ""],
    [/\bdejar que la escena termine(?: tal como ha quedado)?\b/gi, "Esperar"],
    [/\bhacer el último intento físico que todavía le queda a mano\b/gi, "Forzar lo que tienes delante"],
    [/\bhacer un intento físico\b/gi, "Forzar lo que tienes delante"],
    [/\bhacer.*?intento\b/gi, "Forzar lo que tienes delante"],
    [/\bLa pista de ([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'’-]+) no suena limpia ni cómoda\.?/g, "No encaja."],
    [/\bQueda solo el detalle final:?\s*/gi, ""],
    [/\bLa escena avanza bajo presión\b/gi, "El peligro se acerca"]
  ];
  for (const [re, rep] of cambios) t = t.replace(re, rep);
  return t;
}
function limpiarEspaciosNarrativosDM(text) {
  return String(text || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\.{4,}/g, "...")
    .replace(/(^|[^.])\.\s*\.(?!\.)/g, "$1.")
    .trim();
}
function acentuarCastellanoVisibleDM(text) {
  let t = String(text || "");
  const cambios = [
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
  for (const [re, rep] of cambios) t = t.replace(re, rep);
  return t;
}
function fieldTypePerRenderDM(tipo, context = {}) {
  if (context?.fieldType) return context.fieldType;
  if (tipo === "situacio") return "situacio_visible";
  if (tipo === "pressio") return "pressio_visible";
  if (tipo === "accion") return "opcions.text";
  return "text_base";
}
function aplicarCriterioTextoDM(text, context = {}, tipo = "narrativa") {
  return String(text || "");
}
function renderNarratiuDM(text, context = {}, tipo = "narrativa") {
  let t = String(text || "");
  t = aplicarMejorasUsuarioDM(t);
  t = aplicarCriterioTextoDM(t, context, tipo);
  t = limpiarMetaLenguajeDM(t);
  return acentuarCastellanoVisibleDM(limpiarEspaciosNarrativosDM(t));
}
function normalitzarAccioVisibleDM(valor, context = {}) {
  let t = netejarItemDM(valor);
  if (!t) return "";
  t = aplicarMejorasUsuarioDM(t);
  t = aplicarCriterioTextoDM(t, { ...context, fieldType: "opcions.text" }, "accion");
  t = limpiarMetaLenguajeDM(t);
  return netejarItemDM(acentuarCastellanoVisibleDM(limpiarEspaciosNarrativosDM(t)));
}
function interpretarMotorTextoDM(text, contexto = {}) {
  const original = String(text || "");
  const n = normalitzarPerComparar(original);
  const problemas = [];
  const intenta = [];
  let tipo = "Otro";
  let tipo_sugerido = "otro";
  if (/escena|resultado|turno|opcion|opción|sistema/.test(n)) { tipo = "Palabra de juego"; tipo_sugerido = "palabra_de_juego"; problemas.push("Usa lenguaje de sistema en lugar de lenguaje del mundo."); }
  else if (/pista de/i.test(original)) { tipo = "Falta contexto"; tipo_sugerido = "falta_contexto"; problemas.push("Puede estar usando un nombre o una etiqueta sin haberla presentado con claridad."); }
  else if (/intento|hacer algo|último intento|ultimo intento|probar a/.test(n)) { tipo = "Acción poco clara"; tipo_sugerido = "accion_poco_clara"; problemas.push("La acción no dice qué objeto se toca ni qué gesto físico ocurre."); }
  else if (/pista|indica|parece|suena|deducci|significa/.test(n)) { tipo = "Inferencia / interpretación"; tipo_sugerido = "explica_demasiado"; intenta.push("Convertir una señal en información útil para el jugador."); }
  else if (/situacion|algo|detalle|comod|cosa/.test(n)) { tipo = "Muy genérico"; tipo_sugerido = "muy_generico"; problemas.push("Usa palabras abstractas o poco físicas."); }
  if (/situacion|algo|detalle|comod/.test(n) && !problemas.includes("Usa palabras abstractas o poco físicas.")) problemas.push("Usa palabras abstractas o poco físicas.");
  if (!intenta.length) intenta.push("Mostrar una consecuencia, una lectura o una posibilidad de la escena.");
  if (!problemas.length) problemas.push("No se detecta un problema claro; puede ser una mejora de estilo.");
  return { tipo, tipo_sugerido, intenta, problemas, sugerencia: renderNarratiuDM(original, contexto) };
}
function arrayNetDM(valor) {  
  if (!Array.isArray(valor)) return [];  
  const vistos = new Set();  
  const out = [];  
  for (const item of valor) {  
    const t = netejarItemDM(item);  
    if (!t) continue;  
    const k = t.toLowerCase();  
    if (!vistos.has(k)) {  
      vistos.add(k);  
      out.push(t);  
    }  
  }  
  return out;  
}  
function normalitzarPerComparar(text) {  
  return String(text || "")  
    .toLowerCase()  
    .normalize("NFD")  
    .replace(/[\u0300-\u036f]/g, "")  
    .replace(/[_-]+/g, " ")  
    .replace(/\s+/g, " ")  
    .trim();  
}  
function humanitzarTokenDM(text) {  
  let t = String(text || "").trim();  
  if (!t) return "";  
  const direct = {
    inv_clip_desfase: "Clip de camara con desfase",
    inv_linterna: "Linterna de emergencia",
    inv_llave_magnetica: "Llave magnetica",
    inv_llave_servicio: "Llave de servicio",
    inv_billete_manana: "Billete de manana",
    inv_linterna_emergencia: "Linterna de emergencia",
    inv_tarjeta_cabina: "Tarjeta de cabina",
    inv_clau_rebost: "Llave de la despensa",
    inv_mascareta: "Mascarilla agricola"
  };
  if (direct[t]) return acentuarCastellanoVisibleDM(direct[t]);
  if (/^[a-z0-9_\-]+$/i.test(t)) t = t.replace(/[_-]+/g, " ");  
  t = t.replace(/^inv\s+/i, "").replace(/^pista\s+/i, "");
  t = t.replace(/\s+/g, " ").trim();  
  return acentuarCastellanoVisibleDM(t.charAt(0).toUpperCase() + t.slice(1));  
}  
function humanitzarTokenMonDM(text, partida = partidaInternaActualDM()) {
  const token = String(text || "").trim();
  const guided = partida?.mon?.guided_short_module || {};
  const maps = [guided.recursos_visibles, guided.pistes_visibles, guided.personatges_visibles];
  const label = maps.find(map => map && Object.prototype.hasOwnProperty.call(map, token))?.[token];
  if (typeof label === "string" && label.trim()) return acentuarCastellanoVisibleDM(label.trim());
  if (label && typeof label === "object") {
    const visible = label.nombre_visible || label.nombre || label.titulo || label.text;
    if (visible) return acentuarCastellanoVisibleDM(String(visible).trim());
  }
  return humanitzarTokenDM(token);
}
function resumCurto(text, max = 110) {  
  const t = netejarItemDM(text || "");  
  if (t.length <= max) return t;  
  return t.slice(0, max).replace(/\s+\S*$/, "").trim() + "…";  
}  
function safeSendIndex(res) {  
  if (fs.existsSync(INDEX_PUBLIC)) return res.sendFile(INDEX_PUBLIC);  
  if (fs.existsSync(INDEX_ROOT)) return res.sendFile(INDEX_ROOT);  
  return res.status(404).send("No se ha encontrado index.html ni en la raíz ni en /public.");  
}  
function partidaInternaActualDM() {  
  try { if (dm && dm.obtenirPartidaWeb) return dm.obtenirPartidaWeb(); } catch (e) {}  
  return partidaActual || null;  
}  
function nodeActualGuiatDM(partida) {
  const id = partida?.estat?.currentNodeId;
  const nodes = (Array.isArray(partida?.mon?.guided_short_module?.nodes) && partida.mon.guided_short_module.nodes.length) ? partida.mon.guided_short_module.nodes : (Array.isArray(partida?.mon?.nodes) ? partida.mon.nodes : []);
  return nodes.find(n => n.id === id) || null;
}  
function readMetaSafe(file) {  
  try {  
    if (!fs.existsSync(file)) return null;  
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));  
    return raw.meta || null;  
  } catch (e) {  
    return null;  
  }  
}  
function actualitzarRutaVisualDM(escena) {  
  const ubic = netejarItemDM(escena?.ubicacio || "");  
  if (!ubic) return { ruta_reciente: uiRutaDM.slice(-6) };  
  if (!uiRutaDM.length) {  
    uiRutaDM.push(ubic);  
    return { ruta_reciente: uiRutaDM.slice(-6) };  
  }  
  const anterior = uiRutaDM[uiRutaDM.length - 1];  
  if (anterior !== ubic) {  
    uiRutaDM.push(ubic);  
    uiRutaDM = uiRutaDM.slice(-10);  
    uiTransicionsDM.push({ origen: anterior, desti: ubic, text: `${anterior} → ${ubic}` });  
    uiTransicionsDM = uiTransicionsDM.slice(-8);  
  }  
  return { ruta_reciente: uiRutaDM.slice(-6) };  
}  
function inferirUsoInventario(item) {  
  const t = normalitzarPerComparar(item);  
  if (/sello|segell/.test(t)) return "Prueba o legitimidad";  
  if (/tablilla|fragmento/.test(t)) return "Prueba, lectura o mecanismo";
  if (/papiro|registro|acta|documento|document/.test(t)) return "Acceso, cobertura o prueba";  
  if (/llave|clau/.test(t)) return "Abrir o desbloquear";  
  if (/anillo/.test(t)) return "Autoridad prestada o prueba de deuda";
  if (/oro|aguila|águila|moneda/.test(t)) return "Soborno, intercambio o cobertura";  
  if (/linterna|lampara|lámpara|candil|vela|antorcha/.test(t)) return "Iluminar, señalar o proteger";
  if (/clip|camara|cámara|grabacion|grabaci/.test(t)) return "Prueba verificable";  
  if (/magnetica|magnética|tarjeta/.test(t)) return "Abrir o bloquear accesos";  
  if (/billete|ticket|perforad/.test(t)) return "Prueba temporal";
  if (/servicio/.test(t)) return "Abrir sistemas del tren";
  if (/mascarilla|filtro/.test(t)) return "Proteccion limitada";  
  if (/aceite|cera|frasco|ampolla/.test(t)) return "Manipulación o recurso situacional";  
  return "Recurso útil según la escena";  
}  
function flattenWorldEntries(mon) {  
  const wf = mon?.world_full || {};  
  const rt = mon?.runtime_module || {};  
  const pnj = [];  
  (Array.isArray(wf.pnj) ? wf.pnj : []).forEach(p => {  
    if (typeof p === "string") pnj.push({ nom: p, paper_visible: "", estat_inicial: "", vol_o_protegeix: "" });  
    else pnj.push({  
      nom: p.nom || "",  
      paper_visible: p.paper_visible || "",  
      estat_inicial: p.estat_inicial || "",  
      vol_o_protegeix: p.vol_o_protegeix || ""  
    });  
  });  
  (Array.isArray(rt.pnj_clau) ? rt.pnj_clau : []).forEach(p => {  
    if (typeof p === "string") pnj.push({ nom: p, paper_visible: "", estat_inicial: "", vol_o_protegeix: "" });  
    else pnj.push({  
      nom: p.nom || p.nombre || "",  
      paper_visible: p.paper_visible || p.rol || "",  
      estat_inicial: p.estat_inicial || "",  
      vol_o_protegeix: p.vol_o_protegeix || ""  
    });  
  });  
  const pistas = [];  
  (Array.isArray(wf.pistes) ? wf.pistes : []).forEach(p => {  
    if (typeof p === "string") pistas.push({ key: p, text: p });  
    else pistas.push({  
      key: [p.tipus, p.contingut, p.com_es_pot_descobrir].filter(Boolean).join(" "),  
      text: p.contingut || p.com_es_pot_descobrir || p.tipus || ""  
    });  
  });  
  (Array.isArray(rt.pistes) ? rt.pistes : []).forEach(p => pistas.push({ key: typeof p === "string" ? p : JSON.stringify(p), text: typeof p === "string" ? p : JSON.stringify(p) }));  
  return { pnj, pistas };  
}  
const STOP_TOKENS_PNJ = new Set(["del","de","la","el","los","las","y","the","of","du","da"]);  
function tokensNombre(text) {  
  return normalitzarPerComparar(text).split(" ").filter(x => x && x.length >= 4 && !STOP_TOKENS_PNJ.has(x));  
}  
function esPersonajeMenor(text) {  
  const t = normalitzarPerComparar(text);  
  return /(escribas? menores?|senador de paso|guardia de paso|esclavo del brasero|sirviente|sirvientes?|criado|criados?|multitud|grupo de|pueblo|gentio|gentío|soldados?|dos soldados?|tres soldados?|guardias?|guardia$|pretorianos?|lictor(?:es)?|escolta|monjes? de paso|acólitos?|seguidores?|esclavos?)/.test(t);  
}  

function esDescriptorMovimentNoPersonatgeDM(raw) {
  const t = normalitzarPerComparar(raw);
  if (!t) return true;
  const iniciSoroll = /^(pasos?|passes?|ruido|soroll|sonido|eco|voz|veus|canto|cant|respiracion|respiració|olor|rastro|rastre|movimiento|moviment)\s+(de|del|d'|d’|a|en)\b/.test(t);
  const contextMoviment = /\b(arriba|abajo|dalt|baix|alrededor|voltants|fuera|fora|dentro|dins)\b/.test(t)
    && /^(pasos?|ruido|soroll|sonido|eco|movimiento|moviment)/.test(t);
  return iniciSoroll || contextMoviment;
}

function recortarNombreBasePersonaje(raw) {  
  let t = humanitzarTokenDM(raw);  
  if (!t) return "";  
  t = t.replace(/\s+[—–-]\s+.*$/, "").replace(/\s*:\s+.*$/, "").trim();  
  return t;  
}  
function canonizarPersonaje(rawName, pools) {  
  const intents = [humanitzarTokenDM(rawName), recortarNombreBasePersonaje(rawName)].filter(Boolean);  
  for (const raw of intents) {  
    const norm = normalitzarPerComparar(raw);  
    if (!norm || esPersonajeMenor(norm)) continue;  
    let hit = (pools.pnj || []).find(p => normalitzarPerComparar(p.nom) === norm);  
    if (hit) return humanitzarTokenDM(hit.nom);  
    hit = (pools.pnj || []).find(p => {  
      const full = normalitzarPerComparar(p.nom);  
      return full.includes(norm) || norm.includes(full);  
    });  
    if (hit) return humanitzarTokenDM(hit.nom);  
    const toks = tokensNombre(raw);  
    if (!toks.length) continue;  
    const matches = [];  
    for (const p of pools.pnj || []) {  
      const ptoks = tokensNombre(p.nom || "");  
      const shared = toks.filter(t => ptoks.includes(t));  
      if (shared.length) matches.push({ nom: p.nom, shared: shared.length, total: ptoks.length });  
    }  
    matches.sort((a,b) => b.shared - a.shared || a.total - b.total);  
    if (matches.length === 1) return humanitzarTokenDM(matches[0].nom);  
    if (matches.length > 1 && matches[0].shared > matches[1].shared) return humanitzarTokenDM(matches[0].nom);  
  }  
  return null;  
}  
function teTextSospitosPersonatge(text) {  
  const t = normalitzarPerComparar(text);  
  return /(culpable|asesin|traidor|traidora|traicion|traicio|conjura|complot|fraude|falsific|ocult|esconde|amaga|secret|manipul|corrupt|enemigo|antagonista|villan|villano|villana|lider de la conjura|cap de la conjura|responsable real)/.test(t);  
}  
function resumRolVisibleSegur(hit) {  
  const preferent = netejarItemDM(hit?.descripcio_quadern || hit?.descripcion_cuaderno || "");  
  if (preferent && !teTextSospitosPersonatge(preferent)) return resumCurto(preferent.split(/[.;:]/)[0], 96);  
  const raw = netejarItemDM(hit?.paper_visible || hit?.rol || "");  
  if (!raw || teTextSospitosPersonatge(raw)) return "";  
  const tall = raw.split(/[.;:]/)[0].trim();  
  if (!tall || teTextSospitosPersonatge(tall)) return "";  
  return resumCurto(tall, 96);  
}  
function personatgesCanonicsVisiblesEscena(partida, escena) {  
  const pools = flattenWorldEntries(partida?.mon || {});  
  const vistos = new Set();  
  const out = [];  
  for (const item of arrayNetDM(escena?.personatges_visibles || [])) {
    if (esDescriptorMovimentNoPersonatgeDM(item)) continue;  
    const canon = canonizarPersonaje(item, pools) || recortarNombreBasePersonaje(item) || humanitzarTokenDM(item);  
    if (!canon) continue;  
    const key = normalitzarPerComparar(canon);  
    if (!key || vistos.has(key)) continue;  
    vistos.add(key);  
    out.push(canon);  
  }  
  return out;  
}  
function teIdentitatPrincipal(canon, partida) {  
  const nom = humanitzarTokenDM(canon);  
  if (!nom) return false;  
  if (esPersonajeMenor(nom)) return false;  
  const runtimeClau = Array.isArray(partida?.mon?.runtime_module?.pnj_clau) ? partida.mon.runtime_module.pnj_clau : [];  
  const norm = normalitzarPerComparar(nom);  
  const esClau = runtimeClau.some(p => {  
    const base = typeof p === "string" ? p : (p?.nom || p?.nombre || "");  
    return normalitzarPerComparar(base) === norm;  
  });  
  if (esClau) return true;  
  if (/^(guardia|soldado|lictor|sirviente|criado|esclavo|monje|escolta)$/i.test(nom)) return false;  
  const teNomPropi = nom.split(" ").length >= 2 || /^[A-ZÀ-Ý][a-zà-ÿ'’-]+$/u.test(nom);  
  return teNomPropi;  
}  
function descripcionPersonajeSegura(nombreCanonico, partida, escena) {  
  const pools = flattenWorldEntries(partida?.mon || {});  
  const canon = canonizarPersonaje(nombreCanonico, pools) || recortarNombreBasePersonaje(nombreCanonico) || humanitzarTokenDM(nombreCanonico);  
  const hit = (pools.pnj || []).find(p => normalitzarPerComparar(p.nom) === normalitzarPerComparar(canon));  
  const human = humanitzarTokenDM(canon);  
  const jugador = partida?.mon?.runtime_module?.jugador || {};
  const nombreJugador = humanitzarTokenDM(jugador.nom || jugador.nombre || "");
  if (nombreJugador && normalitzarPerComparar(nombreJugador) === normalitzarPerComparar(human)) {
    const rol = humanitzarTokenDM(jugador.rol || "protagonista de la historia");
    return `${human} — ${rol}`;
  }
  const visiblesAra = new Set(personatgesCanonicsVisiblesEscena(partida, escena).map(x => normalitzarPerComparar(x)));  
  const esVisibleAra = visiblesAra.has(normalitzarPerComparar(human));  
  if (!hit) return esVisibleAra ? `${human} — personaje visible en la escena actual.` : `${human} — figura ya identificada, pero su papel todavía no está claro.`;  
  const resumSegur = resumRolVisibleSegur(hit);  
  if (resumSegur) return `${human} — ${resumSegur}`;  
  if (esVisibleAra) return `${human} — personaje visible en la escena actual.`;  
  return `${human} — figura ya identificada, pero su papel completo todavía no está claro.`;  
}  
function esPersonatgeImportantPerQuadern(nombreCanonico, partida, escena) {  
  const pools = flattenWorldEntries(partida?.mon || {});  
  const canon = canonizarPersonaje(nombreCanonico, pools) || recortarNombreBasePersonaje(nombreCanonico) || humanitzarTokenDM(nombreCanonico);  
  if (!canon) return false;  
  const norm = normalitzarPerComparar(canon);  
  if (!norm || esPersonajeMenor(norm)) return false;  
  const visiblesAra = new Set(personatgesCanonicsVisiblesEscena(partida, escena).map(x => normalitzarPerComparar(x)));  
  if (visiblesAra.has(norm)) return teIdentitatPrincipal(canon, partida);  
  const persistits = new Set(arrayNetDM(partida?.estat?.variables?._ui_personajes || []).map(x => normalitzarPerComparar(x)));  
  if (persistits.has(norm)) return teIdentitatPrincipal(canon, partida);  
  const implicat = arrayNetDM(partida?.estat?.pnj_implicats || []).some(x => normalitzarPerComparar(x) === norm);  
  return implicat && teIdentitatPrincipal(canon, partida);  
}  
function claveCanonicaPersonaje(nombre) {  
  return normalitzarPerComparar(  
    recortarNombreBasePersonaje(nombre)  
  );  
}  
function dedupePersonajesFinal(lista) {  
  const seen = new Map();  
  for (const item of lista) {  
    const key = claveCanonicaPersonaje(item);  
    if (!seen.has(key)) {  
      seen.set(key, item);  
    }  
  }  
  return Array.from(seen.values());  
}  
function idEntidadVisualDM(nombre, partida) {
  const world = partida?.mon?.world_full || partida?.mon || {};
  const normal = normalitzarPerComparar(recortarNombreBasePersonaje(nombre) || nombre);
  if (!normal) return null;
  const jugador = world.jugador || partida?.mon?.runtime_module?.jugador || {};
  if (normal === normalitzarPerComparar(jugador.nombre || jugador.nom || "")) return "jugador";
  const person = (world.pnj || []).find(item => normal === normalitzarPerComparar(item.nombre_visible || item.nombre || item.nom || ""));
  return person?.id ? `pnj:${person.id}` : null;
}
function idRecursoVisualDM(token, partida) {
  const world = partida?.mon?.world_full || partida?.mon || {};
  const resource = (world.recursos || []).find(item => item.id === token);
  return resource?.id ? `recurso:${resource.id}` : null;
}
function obtenerPersonajesDescubiertos(partida, escena) {  
  const estat = partida?.estat || {};  
  const variables = estat.variables || (estat.variables = {});  
  const pools = flattenWorldEntries(partida?.mon || {});  
  const jugador = partida?.mon?.runtime_module?.jugador || {};
  const rawDossier = [jugador.nom || jugador.nombre || ""];
  if (Array.isArray(variables._ui_personajes)) rawDossier.push(...variables._ui_personajes);
  rawDossier.push(...arrayNetDM(estat.pnj_implicats || []));
  const dossier = [];  
  const seen = new Set();  
  for (const item of rawDossier) {  
    const canon = canonizarPersonaje(item, pools) || recortarNombreBasePersonaje(item) || humanitzarTokenDM(item);  
    if (!canon) continue;  
    const key = normalitzarPerComparar(canon);  
    if (!key || seen.has(key)) continue;  
    seen.add(key);  
    dossier.push(canon);  
  }  
  const visiblesCanonics = personatgesCanonicsVisiblesEscena(partida, escena);  
  for (const canon of visiblesCanonics) {  
    if (!teIdentitatPrincipal(canon, partida)) continue;  
    const key = normalitzarPerComparar(canon);  
    if (!key || seen.has(key)) continue;  
    seen.add(key);  
    dossier.push(canon);  
  }  
  variables._ui_personajes = dossier;  
  return dossier;  
}  
function overlapScore(a, b) {  
  const aa = normalitzarPerComparar(a).split(" ").filter(x => x.length > 2);  
  const bb = normalitzarPerComparar(b).split(" ").filter(x => x.length > 2);  
  const setB = new Set(bb);  
  return aa.filter(x => setB.has(x)).length;  
}  
function descripcionDeduccion(item, partida) {  
  const human = humanitzarTokenMonDM(item, partida)
    .replace(/^Pista\s+/i, "")
    .replace(/^Flag\s+/i, "")
    .replace(/^Se ha detectado una deducción relevante:\s*/i, "")
    .trim();  
  if (!human) return "";  
  if (/[.!?]$/.test(human) && human.split(" ").length > 4) return human;  
  const pools = flattenWorldEntries(partida?.mon || {});  
  const norm = normalitzarPerComparar(human);  
  let hit = null; let best = 0;  
  for (const p of pools.pistas || []) {  
    const score = overlapScore(norm, p.key || "");  
    if (score > best) { best = score; hit = p; }  
  }  
  if (hit && best >= 2 && hit.text) return resumCurto(hit.text, 118);  
  if (/pontifice|pontífice/.test(norm) && /conjura|complot|fraude/.test(norm)) return "El pontífice no parece conocer toda la conjura; ese vacío puede abrir una vía útil.";  
  if (/prefecto/.test(norm) && /relato|version|versión|control/.test(norm)) return "El prefecto intenta controlar el relato; una prueba sólida puede romper ese equilibrio.";  
  if (/testamento|sello|segell/.test(norm)) return "La legitimidad depende de una prueba o documento que todavía no está asegurado del todo.";  
  return resumCurto(/[.!?]$/.test(human) ? human : `${human}.`, 118);  
}  
function esInteractuableBasura(text) {  
  const t = normalitzarPerComparar(text);  
  return /^(marmol|mármol|suelo|pared|piedra|luz|aire|ruido|eco|gente|patricios|multitud)$/.test(t);  
}  
function descripcionInteractuable(item) {  
  const human = humanitzarTokenDM(item);  
  const t = normalitzarPerComparar(human);  
  if (/monitor|camara|cámara|terminal|pantalla/.test(t)) return `${human} - comprobar imagen, desfase o prueba.`;  
  if (/panel|mapa|linea|l[ií]nea/.test(t)) return `${human} - contrastar ruta, destino o anuncio.`;
  if (/cabina|lector|microfono|micr[oó]fono|megafonia|megafon[ií]a|altavoz/.test(t)) return `${human} - controlar comunicacion o acceso.`;
  if (/billete|validadora|ticket/.test(t)) return `${human} - comprobar fecha, origen o prueba.`;
  if (/tirador|freno|emergencia/.test(t)) return `${human} - detener, reunir o bloquear con coste.`;
  if (/interfono|altavoz/.test(t)) return `${human} - hablar o cortar un canal peligroso.`;  
  if (/surtidor|cristal blindado|persiana|mostrador/.test(t)) return `${human} - referencia fisica para orientarse o contrastar.`;  
  if (/lector magnetico|lector magnético|puerta magnetica|puerta magnética|barra/.test(t)) return `${human} - acceso o cierre con una sola oportunidad.`;  
  if (/cuadro electrico|cuadro eléctrico|interruptor|alarma/.test(t)) return `${human} - cambiar sistemas de la tienda.`;  
  if (/papiro|registro|acta|archivo|tablilla|diario|libro/.test(t)) return `${human} — justificar acceso o revisar una prueba.`;  
  if (/cofre|caja|armario|arca/.test(t)) return `${human} — ocultar, guardar o recuperar algo útil.`;  
  if (/puerta|acceso|portal|paso|escalera|trampilla|conducto|reja|compuerta|hornacina|losa|hendidura/.test(t)) return `${human} — ruta o mecanismo con posible coste.`;
  if (/columna|lateral|muro|rincon|rincón|sombra/.test(t)) return `${human} — cobertura o maniobra discreta.`;  
  if (/altar/.test(t)) return `${human} — foco ritual o punto sensible.`;  
  if (/brasero/.test(t)) return `${human} — humo, calor o distracción visible.`;  
  if (/ampolla|frasco/.test(t)) return `${human} — recurso portátil de uso puntual.`;  
  if (/aceite/.test(t)) return `${human} — combustible o recurso inflamable.`;  
  if (/guardia|pretorian|monje/.test(t)) return `${human} — bloqueo o reacción inmediata.`;  
  if (/mesa ceremonial|mesa ritual/.test(t)) return `${human} — superficie relevante para el rito o una prueba.`;  
  return "";  
}  
function seleccionarInteractuablesEscena(escena, node) {  
  const visibles = arrayNetDM(escena?.entorn_visible || []).map(humanitzarTokenDM);  
  const inventarioActual = new Set(arrayNetDM(escena?.inventari_actual || []).map(x => normalitzarPerComparar(humanitzarTokenDM(x))));  
  const opcions = Array.isArray(node?.opcions) ? node.opcions : [];  
  const candidates = [];  
  for (const item of visibles) {  
    const norm = normalitzarPerComparar(item);  
    if (!norm || inventarioActual.has(norm) || esInteractuableBasura(item)) continue;  
    let relevante = false;  
    for (const op of opcions) {  
      const tx = normalitzarPerComparar(op?.text || "");  
      if (tx.includes(norm) || norm.split(" ").some(w => w.length > 3 && tx.includes(w))) { relevante = true; break; }  
    }  
    if (/(puerta|acceso|portal|paso|escalera|trampilla|conducto|reja|compuerta|hornacina|losa|hendidura|cofre|caja|armario|archivo|registro|papiro|tablilla|altar|brasero|ampolla|aceite|columna|lateral|guardia|pretorian|monje|mesa ceremonial|mesa ritual)/.test(norm)) relevante = true;
    if (/(monitor|camara|cámara|terminal|pantalla|interfono|altavoz|surtidor|cristal blindado|persiana|mostrador|lector magnetico|lector magnético|puerta magnetica|puerta magnética|barra|cuadro electrico|cuadro eléctrico|interruptor|alarma)/.test(norm)) relevante = true;  
    if (/(panel|mapa|linea|l[ií]nea|cabina|lector|microfono|micr[oó]fono|megafonia|megafon[ií]a|billete|validadora|tirador|freno|emergencia|anden|and[eé]n)/.test(norm)) relevante = true;  
    if (!relevante) continue;  
    candidates.push(item);  
  }  
  const out = []; const seen = new Set();  
  for (const item of candidates) {  
    const k = normalitzarPerComparar(item);  
    if (seen.has(k)) continue;  
    const desc = descripcionInteractuable(item);  
    if (!desc) continue;  
    seen.add(k);  
    out.push(desc);  
    if (out.length >= 3) break;  
  }  
  return out;  
}  
function resumObjectiuAccioDM(text, extended = false) {  
  const original = netejarItemDM(text);  
  const t = original.toLowerCase();  
  const rules = [  
    [/(registro|rito|sellos|sello|tablilla|archivo|acta|papiro|actas)/, "registro"],  
    [/(prefecto|escriba|senador|guardia|pretoriana|pretoriano|escolta)/, "autoridad"],  
    [/(puerta|llave|cerrojo|bisagra|columna|paso|escalinata|entrada)/, "acceso"],  
    [/(brasero|cera|aceite|ampolla|fuego|humo)/, "objeto"],  
    [/(hablar|convencer|preguntar|razonar|negociar|aceptar)/, "interlocutor"],  
    [/(mirar|leer|examinar|observar|deducir|inspeccionar)/, "detalle"],  
    [/(forzar|arrancar|arrebatar|confrontar|sacar)/, "maniobra"],  
    [/(escuchar|esperar|ocultarse|rodear|timing|posición|posicion)/, "apertura"],  
  ];  
  for (const [re, label] of rules) if (re.test(t)) return label;  
  const stop = new Set(["la","el","los","las","un","una","unos","unas","de","del","y","o","a","al","con","para","por","que","se","su","sus","lo","le","les","antes","despues","después","mientras","justo","donde","hacia","contra","sobre","bajo","entre","sin","ya","más","mas","como","cómo","tu","tus"]);  
  const words = original.replace(/[.,;:!?()]/g, " ").split(/\s+/).filter(Boolean);  
  const candidats = [];  
  for (let i = 1; i < words.length; i++) {  
    const low = words[i].toLowerCase();  
    if (stop.has(low) || /^\d+$/.test(low)) continue;  
    candidats.push(low);  
  }  
  if (!candidats.length) return "";  
  return candidats.slice(0, extended ? 3 : 2).join(" ");  
}  
function humanitzarTipusAccioDM(tipus, text) {  
  const mapa = { investigacio: "Observar", investigación: "Observar", recurs: "Recurso", recurso: "Recurso", risc: "Arriesgar", riesgo: "Arriesgar", tecnica: "Maniobra", técnica: "Maniobra" };  
  const clau = String(tipus || "").toLowerCase().trim();  
  if (mapa[clau]) return mapa[clau];  
  const first = netejarItemDM(text).split(/\s+/).find(Boolean) || "";  
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "Acción";  
}  
function construirEtiquetaAccioDM(opcio, text, index, extended = false) {  
  const verb = humanitzarTipusAccioDM(opcio?.tipus || opcio?.tipo || opcio?.kind || "", text);  
  const objectiu = resumObjectiuAccioDM(opcio?.text || text || "", extended);  
  if (objectiu) return `${verb} ${objectiu}`;  
  return `${verb || "Acción"} ${index + 1}`.trim();  
}  
function requisitsOpcioDM(opcio) {  
  const r = opcio?.requereix || {};  
  return { inventari: Array.isArray(r.inventari) ? r.inventari : [], pista: Array.isArray(r.pista) ? r.pista : [], flag: Array.isArray(r.flag) ? r.flag : [] };  
}  
function estatPreparacioOpcioDM(opcio, estat) {  
  const req = requisitsOpcioDM(opcio);  
  const inv = new Set(Array.isArray(estat?.inventari_actual) ? estat.inventari_actual : []);  
  const pistes = new Set(Array.isArray(estat?.pistes_descobertes) ? estat.pistes_descobertes : []);  
  const flags = estat?.flags || {};  
  const teInv = req.inventari.every(x => inv.has(x));  
  const tePista = req.pista.every(x => pistes.has(x));  
  const teFlag = req.flag.every(x => flags[x] === true || (flags[x] !== undefined && flags[x] !== false && flags[x] !== null));  
  const preparat = teInv && tePista && teFlag;  
  let avis = "";  
  if (!preparat) avis = opcio?.si_requisit_no_complert ? "Puede salir mal" : "No preparado";  
  return { preparat, avis, requisits: req };  
}  

function inferirTipusAccioDM(text) {
  const t = normalitzarPerComparar(text);
  if (/examinar|observar|inspeccionar|mirar|escuchar|oir|analizar|leer|estudiar/.test(t)) return "investigacio";
  if (/usar|utilizar|emplear|activar|encender|apagar|aplicar|coger|recoger|tomar|abrir con|grabar|herramienta|linterna|grabadora|llave|arma|recurso/.test(t)) return "recurs";
  if (/forzar|arriesgar|romper|golpear|empujar|huir|atravesar|exponerse|enfrentarse/.test(t)) return "risc";
  return "tecnica";
}

function construirAccionsUIDM(escena) {
  const partida = partidaInternaActualDM();
  const node = nodeActualGuiatDM(partida);
  const estat = partida?.estat || {};
  const raw = Array.isArray(escena?.accions_disponibles) ? escena.accions_disponibles : [];
  const accions = raw.map(item => {
    if (typeof item === "string") {
      const rawText = netejarItemDM(item);
      return { text: rawText, original_text: rawText, accio_original: rawText, tipus: inferirTipusAccioDM(item) };
    }
    const rawText = netejarItemDM(item?.text || item?.label || "");
    const originalText = netejarItemDM(item?.original_text || item?.accio_original || rawText);
    return { text: rawText, original_text: originalText, accio_original: originalText, tipus: item?.tipus || item?.tipo || item?.kind || "" };
  }).filter(x => x.text)
    .filter(x => !/tu acción produce|no es una oportunidad gratuita|la teva acció|consecuencia concreta/i.test(x.text))
    .slice(0, 4);
  const opcions = Array.isArray(node?.opcions) ? node.opcions : [];
  const out = [];
  const vistosText = new Set();
  for (let i = 0; i < accions.length; i++) {
    const base = accions[i];
    const text = base.text;
    const keyText = text.toLowerCase();
    if (vistosText.has(keyText)) continue;
    vistosText.add(keyText);
    const opcio = opcions.find(op => {
      const opText = netejarItemDM(op?.text || "");
      return opText === text || normalitzarPerComparar(opText) === normalitzarPerComparar(text);
    }) || null;
    const preparacio = estatPreparacioOpcioDM(opcio, estat);
    const tipus = base.tipus || opcio?.tipus || inferirTipusAccioDM(text);
    out.push({ text, original_text: base.original_text || text, accio_original: base.accio_original || base.original_text || text, tipus, preparat: preparacio.preparat, avis: preparacio.avis, requisits: preparacio.requisits, label: construirEtiquetaAccioDM({ ...(opcio || {}), tipus, text }, text, i), detall_label: construirEtiquetaAccioDM({ ...(opcio || {}), tipus, text }, text, i, true) });
  }
  const vistosLabel = new Map();
  return out.map((accio, index) => {
    const base = netejarItemDM(accio.label) || `Acción ${index + 1}`;
    let final = base;
    let lower = final.toLowerCase();
    if (vistosLabel.has(lower)) {
      const ampla = netejarItemDM(accio.detall_label);
      if (ampla && ampla.toLowerCase() !== lower) { final = ampla; lower = final.toLowerCase(); }
      let num = 2;
      while (vistosLabel.has(lower)) { final = `${base} (${num})`; lower = final.toLowerCase(); num += 1; }
    }
    vistosLabel.set(lower, true);
    return { text: accio.text, original_text: accio.original_text || accio.text, accio_original: accio.accio_original || accio.original_text || accio.text, tipus: accio.tipus, label: final, preparat: accio.preparat, avis: accio.avis, requisits: accio.requisits };
  });
}
  
function construirInfoAssistidaDM(escena) {  
  const partida = partidaInternaActualDM();  
  const estat = partida?.estat || {};  
  const node = nodeActualGuiatDM(partida);  
  const inventariRaw = arrayNetDM(escena?.inventari_actual || []);  
  const inventari = inventariRaw.map(item => humanitzarTokenMonDM(item, partida));
  const conocimientoRaw = arrayNetDM((escena?.informacio_coneguda || estat?.informacio_coneguda || []).concat(estat?.pistes_descobertes || []));  
  const pressioText = netejarItemDM(escena?.pressio_visible || "");  
  const inventario = inventariRaw.map(item => ({ id: idRecursoVisualDM(item, partida), item: humanitzarTokenMonDM(item, partida), uso: inferirUsoInventario(humanitzarTokenMonDM(item, partida)) }));
  const personajes = dedupePersonajesFinal(obtenerPersonajesDescubiertos(partida, escena).filter(x => esPersonatgeImportantPerQuadern(x, partida, escena))).map(x => ({ id: idEntidadVisualDM(x, partida), item: descripcionPersonajeSegura(x, partida, escena) })).slice(0,8);
  const deducciones = conocimientoRaw.slice(0, 10).map(x => descripcionDeduccion(x, partida)).filter(Boolean);  
  const interactuable = seleccionarInteractuablesEscena(escena, node);  
  const objetivoBase = [];  
  const mon = partida?.mon || {};  
  const runtime = mon.runtime_module || {};  
  const wf = mon.world_full || {};  
  if (runtime.objectiu) objetivoBase.push(netejarTextDM(runtime.objectiu));  
  if (wf.objectiu_central && normalitzarPerComparar(wf.objectiu_central) !== normalitzarPerComparar(runtime.objectiu || "")) objetivoBase.push(netejarTextDM(wf.objectiu_central));  
  return { inventario, personajes, deducciones, objetivo: objetivoBase.slice(0, 2), interactuable, peligros: pressioText ? [pressioText] : [] };  
}  
function construirCuadernoDM() {  
  const partida = partidaInternaActualDM();  
  if (!partida) return { error: "No hay partida activa" };  
  const escena = partida?.ultimaEscena || {};  
  const info = construirInfoAssistidaDM(escena);  
  return { ok: true, titulo: "Cuaderno", ruta_reciente: uiRutaDM.slice(-8), acciones_recientes: uiAccionsDM.slice(-6), peligros: info.peligros, guardados: { manual: readMetaSafe(MANUALSAVE_FILE), auto: readMetaSafe(AUTOSAVE_FILE) } };  
}  
function respostaEscena(escena) {  
  escena = escena || {};  
  escena.narrativa_visible = renderNarratiuDM(netejarTextDM(escena.narrativa_visible || ""), { escena, partida: partidaInternaActualDM() }, "narrativa");  
  const partida = partidaInternaActualDM();  
  const estat = partida?.estat || {};  
  const node = nodeActualGuiatDM(partida);  
  let accionsDisponibles = (Array.isArray(escena.accions_disponibles) && escena.accions_disponibles.length) ? escena.accions_disponibles : (Array.isArray(node?.opcions) ? node.opcions.map(op => ({ text: op?.text, tipus: op?.tipus || inferirTipusAccioDM(op?.text || "") })).filter(op => op.text) : []);
  accionsDisponibles = accionsDisponibles.filter(a => {
    const tx = typeof a === "string" ? a : (a?.text || a?.label || "");
    return tx && !/tu acción produce|no es una oportunidad gratuita|la teva acció|consecuencia concreta/i.test(tx);
  }).slice(0,4);
  accionsDisponibles = accionsDisponibles.map(a => {
    if (typeof a === "string") {
      const originalExec = netejarItemDM(a);
      const textNormalitzat = normalitzarAccioVisibleDM(originalExec, { escena, partida });
      return { text: textNormalitzat, original_text: originalExec, accio_original: originalExec, tipus: inferirTipusAccioDM(originalExec) };
    }
    const originalExec = netejarItemDM(a?.text || a?.label || "");
    const textNormalitzat = normalitzarAccioVisibleDM(originalExec, { escena, partida });
    return { ...a, text: textNormalitzat, original_text: originalExec, accio_original: originalExec };
  }).filter(a => {
    const tx = typeof a === "string" ? a : (a?.text || a?.label || "");
    return !!tx;
  }).slice(0,4);
  escena.accions_disponibles = accionsDisponibles;  
  const info = construirInfoAssistidaDM(escena);  
  const moviment = actualitzarRutaVisualDM(escena);  
  const situacio = renderNarratiuDM(netejarTextDM(escena.situacio || ""), { escena, partida }, "situacio");  
  const triggerFinal = Boolean(escena.trigger_finalitzacio);  
  const senseContinuacio = !accionsDisponibles.length && /^final\b/i.test(situacio);  
  const isFinalReal = triggerFinal || senseContinuacio;  
  const finalRaw = estat?.variables?.final || estat?.flags?.final || "";  
  const finalAttitude = estat?.variables?.actitud || "";  
  const finalTitle = finalRaw ? `Final: ${netejarTextDM(finalRaw)}` : (isFinalReal ? (/^final\b/i.test(situacio) ? situacio : "Final") : "");
  const worldId = partida?.mon?.world_full?.id || partida?.mon?.runtime_module?.id || estat?.worldId || "";
  const nodeId = String(node?.id || estat?.currentNodeId || "");
  return { text: escena.narrativa_visible, world_id: worldId, node_id: nodeId, ubicacio: netejarItemDM(escena.ubicacio), ruta_reciente: moviment.ruta_reciente, situacio, inventari: arrayNetDM(escena.inventari_actual || []).map(item => humanitzarTokenMonDM(item, partida)), accions: Array.isArray(accionsDisponibles) ? accionsDisponibles : [], accions_ui: construirAccionsUIDM({ ...escena, accions_disponibles: accionsDisponibles }), pressio: renderNarratiuDM(netejarTextDM(escena.pressio_visible || ""), { escena, partida }, "pressio"), visual_state: { flags: { ...(estat.flags || {}) }, presion: Number(estat.pressio ?? estat.presion ?? 0) || 0 }, paneles: info, is_final_real: isFinalReal, final_title: finalTitle, final_attitude: finalAttitude ? `Última postura: ${netejarTextDM(finalAttitude)}` : "", trigger_final: triggerFinal, qa_node_id: process.env.QA_RUNTIME_IDS === "1" ? nodeId : undefined, current_slot_manual: readMetaSafe(MANUALSAVE_FILE), current_slot_auto: readMetaSafe(AUTOSAVE_FILE) };
}  
function salvarServidor(slot = "auto") {  
  const partida = partidaInternaActualDM();  
  if (!partida) throw new Error("No hay partida activa para guardar");  
  const meta = { slot, savedAt: new Date().toISOString(), worldId: partida?.estat?.worldId || partida?.mon?.world_full?.id || "desconocido", ubicacio: partida?.ultimaEscena?.ubicacio || partida?.estat?.ubicacio || "", torns: partida?.estat?.torns || 0, mode: partida?.estat?.mode || "", genere: partida?.estat?.genere || "" };  
  const payload = { meta, partida };  
  const file = slot === "manual" ? MANUALSAVE_FILE : AUTOSAVE_FILE;  
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");  
  return meta;  
}  
function carregarDelServidor(slotPreferit = "auto") {  
  const file = slotPreferit === "manual" ? MANUALSAVE_FILE : AUTOSAVE_FILE;  
  if (!fs.existsSync(file)) throw new Error(slotPreferit === "manual" ? "No existe guardado manual en el servidor" : "No existe autoguardado de emergencia en el servidor");  
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));  
  const resultat = dm.carregarPartidaWeb(raw.partida || raw);  
  if (resultat?.error) throw new Error(resultat.error);  
  partidaActual = dm.obtenirPartidaWeb ? dm.obtenirPartidaWeb() : (raw.partida || raw);  
  return { meta: raw.meta || null, escena: respostaEscena(resultat.escena || resultat.partida?.ultimaEscena || partidaActual?.ultimaEscena || {}), source: path.basename(file) };  
}  
function autoSaveServerSafe() { try { salvarServidor("auto"); } catch (e) {} }  
cargarMejorasTextoDM();  
app.get("/", (req, res) => safeSendIndex(res));  
app.get("/health", (req, res) => res.json({ ok: true, missatge: "Servidor DM activo" }));  
app.get('/slots', (req, res) => { try { return res.json({ ok: true, manual: readMetaSafe(MANUALSAVE_FILE), auto: readMetaSafe(AUTOSAVE_FILE) }); } catch (e) { return res.json({ error: "No se han podido leer los guardados.", detalle: e?.message || String(e) }); } });  
app.get("/mundos", (req, res) => {  
  try {  
    const mundos = (dm.obtenirLlistaMons ? dm.obtenirLlistaMons() : []).map(mon => {  
      const wf = mon?.world_full || {};  
      const rt = mon?.runtime_module || {};  
      const id = rt.id || wf.id || "";  
      const genero = wf.genero || wf.genere || rt.genero || rt.genere || "";  
      const titulo = wf.titulo || wf.titol || wf.title || id;  
      const subgenero = wf.subgenero || wf.subgenere || wf.subgenre || "";  
      const descripcion = wf.premisa || wf.premissa || rt.resumen_maestro || rt.resum_mestre || "";  
      const guided = !!(mon?.guided_short_module && Array.isArray(mon.guided_short_module.nodes) && mon.guided_short_module.nodes.length);  
      return { id, titulo, genero, subgenero, descripcion, guided };  
    }).filter(mon => mon.id && mon.genero);  
    mundos.sort((a, b) => String(a.genero).localeCompare(String(b.genero), "es") || String(a.titulo).localeCompare(String(b.titulo), "es"));  
    return res.json({ ok: true, mundos });  
  } catch (e) {  
    return res.json({ error: "No se ha podido cargar la biblioteca de mundos.", detalle: e?.message || String(e) });  
  }  
});  
app.post("/iniciar", async (req, res) => {  
  try {  
    uiRutaDM = []; uiAccionsDM = []; uiTransicionsDM = [];  
    const { genere, mode, forcarMonId } = req.body || {};  
    if (!genere || !mode) return res.json({ error: "Faltan datos para iniciar la partida" });  
    if (dm.forcarMonPerId && forcarMonId) dm.forcarMonPerId(forcarMonId);  
    const resultat = await dm.iniciarPartidaWeb(genere, mode);  
    if (resultat?.error) return res.json({ error: resultat.error });  
    partidaActual = dm.obtenirPartidaWeb ? dm.obtenirPartidaWeb() : resultat.partida;  
    const resposta = respostaEscena(resultat.escena || resultat);  
    if (partidaActual?.mon?.world_full) {  
      resposta.idMonActual = partidaActual.mon.world_full.id;  
      resposta.titolMonActual = partidaActual.mon.world_full.titol || partidaActual.mon.world_full.id;  
    }  
    autoSaveServerSafe();  
    return res.json(resposta);  
  } catch (e) {  
    console.error("[ERROR /iniciar]", e);  
    return res.json({ error: "Error iniciando la partida en el servidor.", detalle: e?.message || String(e) });  
  }  
});  
app.post("/accio", async (req, res) => {  
  try {  
    const { accio } = req.body || {};  
    if (!accio) return res.json({ error: "Acción vacía" });  
    if (!dm.obtenirPartidaWeb || !dm.obtenirPartidaWeb()) return res.json({ error: "No hay partida activa" });  
    const textAccio = netejarItemDM(accio);  
    if (["resumen", "resum", "cuaderno", "quadern"].includes(textAccio.toLowerCase())) return res.json({ cuaderno: construirCuadernoDM() });  
    const resultat = await dm.ferAccioWeb(textAccio);  
    if (resultat?.error) return res.json({ error: resultat.error });  
    partidaActual = dm.obtenirPartidaWeb ? dm.obtenirPartidaWeb() : partidaActual;  
    uiAccionsDM.push(textAccio.slice(0, 160)); uiAccionsDM = uiAccionsDM.slice(-8);  
    autoSaveServerSafe();  
    return res.json(respostaEscena(resultat.escena || resultat));  
  } catch (e) {  
    console.error("[ERROR /accio]", e);  
    return res.json({ error: "Error ejecutando la acción en el servidor.", detalle: e?.message || String(e) });  
  }  
});  
app.post("/mejorar-texto", (req, res) => { try { const item = registrarMejoraTextoDM(req.body || {}); return res.json({ ok: true, item, count: mejorasTextoDM.length }); } catch (e) { return res.json({ error: "No se ha podido guardar la mejora de texto.", detalle: e?.message || String(e) }); } });  
app.post("/analizar-texto", (req, res) => { try { return res.json({ ok: true, analisis: interpretarMotorTextoDM(req.body?.texto || "", req.body?.contexto || {}) }); } catch (e) { return res.json({ error: "No se ha podido analizar el texto.", detalle: e?.message || String(e) }); } });  
app.get("/exportar-mejoras", (req, res) => { try { const payload = exportMejorasTextoPayloadDM(); res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename="millores_text_${new Date().toISOString().slice(0,10)}.json"`); return res.send(JSON.stringify(payload, null, 2)); } catch (e) { return res.status(500).json({ error: "No se han podido exportar las mejoras.", detalle: e?.message || String(e) }); } });  
app.get("/mejoras-texto", (req, res) => { try { return res.json(exportMejorasTextoPayloadDM()); } catch (e) { return res.json({ error: "No se han podido leer las mejoras.", detalle: e?.message || String(e) }); } });  
app.post("/cuaderno", (req, res) => { try { return res.json(construirCuadernoDM()); } catch (e) { return res.json({ error: "Error abriendo el cuaderno.", detalle: e?.message || String(e) }); } });  
app.post("/guardar", (req, res) => { try { const slot = String(req.body?.slot || req.body?.tipus || "manual").toLowerCase() === "auto" ? "auto" : "manual"; const meta = salvarServidor(slot); return res.json({ ok: true, slot, meta }); } catch (e) { return res.json({ error: "No se ha podido guardar la partida.", detalle: e?.message || String(e) }); } });  
app.post("/cargar", (req, res) => { try { const prefer = String(req.body?.prefer || req.body?.slot || "manual").toLowerCase() === "auto" ? "auto" : "manual"; const resultat = carregarDelServidor(prefer); return res.json({ ok: true, source: resultat.source, meta: resultat.meta, ...resultat.escena }); } catch (e) { return res.json({ error: "No se ha podido cargar la partida del servidor.", detalle: e?.message || String(e) }); } });  
app.get("/guardados", (req, res) => { try { return res.json({ ok: true, guardados: [{ file: path.basename(MANUALSAVE_FILE), meta: readMetaSafe(MANUALSAVE_FILE) }, { file: path.basename(AUTOSAVE_FILE), meta: readMetaSafe(AUTOSAVE_FILE) }].filter(x => x.meta) }); } catch (e) { return res.json({ error: "No se ha podido listar los guardados.", detalle: e?.message || String(e) }); } });  
app.listen(PORT, () => { console.log(`[Servidor DM] Escuchando en http://localhost:${PORT}`); });
