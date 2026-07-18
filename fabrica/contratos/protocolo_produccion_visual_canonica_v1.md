# Protocolo de producción visual canónica v1

Fecha: 2026-07-17  
Estado: **vigente para la siguiente iteración de Ulldecona; plantilla para mundos futuros**  
Autoridad: dirección humana + `world.json` aprobado  
Complementa: `visual_style_contract_v1.md`, `visual_manifest_v1.md` y `presentacion_expediente_v1.md`

## 1. Decisión de producto

La unidad visual normal de Project DM es una **placa ambiental**:

- representa una localización y su estado material;
- no muestra personajes reconocibles;
- puede incluir figurantes anónimos o una multitud no identificable cuando la
  presencia colectiva sea un obligatorio del nodo (por ejemplo, una audiencia
  pública); no sustituyen fichas de personaje ni aportan hechos individuales;
- muestra solo pistas, recursos, accesos, amenazas y cambios físicos ya
  autorizados;
- sirve a uno o varios nodos cuando la geografía y el estado visible coinciden;
- se presenta en 16:9, pensado para la interfaz móvil de expediente.

Los personajes se representan mediante **fichas de personaje** independientes.
Los objetos causales se representan mediante **fichas de prop** cuando su forma,
desgaste o lectura recurrente aportan valor real.

Una escena compuesta con personajes es excepcional: requiere una decisión
humana explícita y no forma parte del paquete base.

## 2. Qué significa “100 % canónico”

Un asset es 100 % canónico cuando cumple todas las restricciones aplicables de
su paquete canónico:

1. procede de fuentes identificadas;
2. muestra todos los obligatorios visuales;
3. no muestra ningún prohibido;
4. respeta estado, guardas, topología y continuidad aprobadas;
5. no adelanta conocimiento ni convierte una sospecha en hecho;
6. cumple formato y lectura móvil;
7. supera QA técnico y aprobación humana.

No significa que el JSON determine cada píxel. Los rasgos que el mundo no fija
se declaran una única vez en la biblia visual del mundo y pasan a ser parte del
canon visual aprobado.

## 3. Jerarquía de autoridad

Cuando hay conflicto, manda este orden:

1. `worlds/<género>/<world_id>.json` aprobado;
2. decisión humana registrada en el paquete visual del mundo;
3. biblia visual del mundo;
4. paquete canónico del asset;
5. referencia visual aprobada del mismo asset;
6. contrato de estilo;
7. manifest, log, prompt compilado y archivos heredados.

Los prompts nunca crean canon. Los aliases, textos de interfaz, imágenes
heredadas y conversaciones no registradas tampoco.

## 4. Roles de fábrica

### Director humano

- decide identidad, estilo, nombres públicos y excepciones de cobertura;
- confirma o rechaza referencias y assets;
- valida la lectura móvil final.

### Arquitecto Visual

Es un rol de fábrica, equivalente al Arquitecto de grafo. Puede ejecutarlo un
agente dedicado o Codex bajo ese rol.

- lee el mundo ya validado;
- produce el censo de personajes, props, localizaciones y variantes;
- agrupa nodos en familias visuales honestas;
- redacta la biblia visual y paquetes canónicos estructurados;
- no genera ni publica imágenes;
- declara cualquier vacío de canon para decisión humana.

### Productor Visual

- ejecuta únicamente paquetes `canon_locked`;
- genera o edita assets;
- no interpreta ni amplía el mundo;
- registra cada intento y su fuente.

### Validador Visual

- ejecuta QA estructural y de formato;
- contrasta el resultado con obligatorios, prohibidos y referencias;
- propone `approved`, `needs_revision` o `rejected`;
- no cambia canon ni publica.

### Compilador Codex

- ingesta, convierte y optimiza archivos;
- actualiza manifest y firmas tras aprobación;
- compila runtime y verifica interfaz;
- no decide dirección artística ni acepta assets por intuición.

## 5. Fuentes mínimas por mundo

Para evitar documentos duplicados, cada mundo visual mantiene solo:

```text
world.json                         fuente narrativa y causal
visual_bible_v1.json               decisiones visuales no inferibles del mundo
visual_plan_v1.json                assets, coberturas, estados y bindings
generation_log.jsonl               historial automático de intentos y decisiones
public/media/<world_id>/manifest.json  salida compilada
```

Los prompts, checklists, hojas de contacto y reportes se compilan desde esos
datos. No son fuentes independientes que haya que mantener manualmente.

La transición desde los actuales `visual_inventory_v1.json` y
`visual_manifest_source_v1.json` requerirá adaptador; no se migra ningún mundo
por renombrado masivo.

## 6. Paquete canónico de un asset

Antes de generar o aceptar un asset, el Arquitecto Visual declara:

```text
asset_id y tipo
función de experiencia
fuentes: nodos, finales, entidades y estados
obligatorios visibles
permitidos neutros
prohibidos
geometría o composición bloqueada
formato de interfaz
referencias aprobadas
dependencias
guardas de variante
hash del paquete
```

Reglas adicionales:

- una placa ambiental declara `people_policy: none` por defecto, o
  `people_policy: anonymous_crowd` cuando el paquete canónico justifica
  figurantes no reconocibles;
- una ficha de personaje separa identidad persistente de estado temporal;
- una ficha de prop fija forma, material, escala, rotura y desgaste;
- una variante reutiliza su base y solo cambia la diferencia física autorizada;
- si dos nodos difieren solo en texto, no necesitan dos imágenes.

## 7. Ciclo obligatorio

```text
Mundo validado
-> censo automático
-> decisión humana de vacíos
-> paquete canon_locked
-> generación o ingreso de referencia
-> QA técnico y visual
-> aprobación humana
-> ingestión y optimización
-> compilación de manifest
-> prueba móvil
```

### Límite de intentos

Cada paquete `canon_locked` tiene:

1. un intento base;
2. una corrección concreta;
3. si falla de nuevo, pasa a `needs_spec_revision`.

Una especificación corregida abre una ronda nueva. No se hacen cadenas de
“una prueba más” sin cambiar la causa del fallo.

## 8. Estados

```text
candidate_reference
director_confirmed
canon_draft
canon_locked
generated
needs_revision
needs_spec_revision
approved
rejected
stale
deprecated
```

Solo `approved` se publica. `director_confirmed` permite conservar una imagen
aportada por el Director como referencia, pero no la publica ni la convierte en
asset canónico hasta pasar ingestión y QA.

## 9. Ingestión y publicación

Ningún archivo se copia directamente a `public/media` como paso de producción.

La ingestión debe:

1. detectar formato real por bytes;
2. convertir a WebP real;
3. normalizar dimensiones y peso;
4. calcular hash;
5. registrar origen, revisión y licencia/uso cuando proceda;
6. comprobar relación de aspecto;
7. enlazarlo al paquete canónico;
8. moverlo a estado aprobable;
9. compilar el manifest público solo después de aprobación.

Objetivos iniciales:

- placas ambientales: 16:9, WebP, 100–220 KiB orientativos;
- personajes: 4:5 o 3:4, WebP, 50–130 KiB orientativos;
- props: 1:1 o 4:5, WebP, 50–130 KiB orientativos.

## 10. QA mínimo

El QA automático bloquea:

- asset aprobado sin archivo;
- extensión distinta al formato real;
- hash o firma ausentes;
- binding roto;
- personaje o prop sin entidad válida;
- asset fuera de `public/media/<world_id>/`;
- variante sin base o con guardas inválidas;
- dimensión, relación o peso fuera del perfil;
- asset que contiene datos internos en runtime;
- placa ambiental con política de personas no declarada o distinta de `none`
  y `anonymous_crowd`;
- manifest y plan de producción divergentes.

La revisión visual humana confirma:

- obligatorios y prohibidos;
- fidelidad material e histórica;
- ausencia de spoilers;
- continuidad de personas, objetos y geografía;
- legibilidad móvil;
- ausencia de texto, UI, marcas o detalles no autorizados.

## 11. Referencias fotográficas de personas

Fotos aportadas para crear un personaje:

- se guardan como `reference`, no como asset público;
- no se publican ni se reutilizan para otro personaje;
- solo fijan identidad visual del personaje indicado;
- el retrato derivado sigue necesitando paquete canónico, QA y aprobación;
- si el Director retira la referencia, deja de usarse en rondas futuras.

Esto se aplicará a Eudald cuando se reciban sus tres fotos.

## 12. Aplicación inmediata a Ulldecona

### Personajes

El Director confirma como referencias visuales válidas las seis fichas actuales:

- Ramon;
- Albert;
- Sibila;
- Bernat;
- Miquel;
- Fray Pere.

Su estado inicial será `director_confirmed`. La siguiente fase decidirá el
nombre público definitivo, convertirá sus archivos a WebP real y los integrará
con ids y manifest. No se regeneran por criterio artístico sin una nueva orden
del Director.

### Props aportados el 2026-07-17

| Asset propuesto | Veredicto de protocolo | Condición canónica antes de publicar |
| --- | --- | --- |
| Fragmento del sello | candidato válido | El relieve no puede leerse como una acusación, nombre o sello completo. |
| Eslabón/cadena | candidato válido | El eslabón nuevo debe conservar contraste material con el hierro antiguo, sin convertirlo en joya. |
| Cuerda de apeo | referencia insuficiente | Debe hacer visibles nudos o marcas de medida; el cordón rojo por sí solo no demuestra la función canónica. |
| Tablilla provisional | candidato válido | Las marcas no pueden leerse como información futura ni como texto generado determinante. |

No se integran todavía: quedan en `candidate_reference` hasta que se ejecute
la fase de ingestión.

### Localizaciones y variantes

Se producirán después de cerrar:

1. nombres públicos canónicos;
2. biblia visual de Ulldecona;
3. plan de cobertura de 16–25 assets;
4. paquete `canon_locked` por familia ambiental;
5. soporte runtime de `location`, variantes y hotspots por manifest.

No se generará una localización sin topología, obligatorios y prohibidos
explícitos. No se generará una variante si no hay diferencia física visible.

## 13. Definition of Done

Un mundo visual está listo cuando:

- su plan cubre todos los nodos y finales visualmente relevantes;
- las excepciones de fallback están declaradas;
- todos los personajes consultables tienen ficha aprobada;
- los props esenciales tienen ficha o representación ambiental aprobada;
- las placas no muestran personajes reconocibles;
- las variantes representan solo cambios físicos legales;
- todos los archivos pasan ingestión y QA;
- el manifest se compila sin edición manual;
- la interfaz móvil resuelve assets, variantes y hotspots por id;
- un mundo sin imágenes sigue jugable;
- añadir el siguiente mundo no obliga a modificar el cliente.
