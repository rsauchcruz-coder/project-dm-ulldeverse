# Contrato de realidad controlada v1

Fecha: 2026-07-15

Estado: `CANON DE FABRICA`. Puerta obligatoria para mundos nativos nuevos.

## Proposito

Un mundo corto maneja pocos objetos, personajes, deducciones, rutas y amenazas.
Esos elementos no pueden depender de que el Narrador recuerde todas sus
combinaciones. Este contrato convierte su realidad visible en un libro finito
que el QA contrasta contra cada estado alcanzable.

No intenta controlar cada sustantivo ni demostrar que una frase es buena.
Controla aquello cuya aparicion, ausencia o estado puede crear una contradiccion
jugable.

## Unidad de verdad

El QA distingue tres momentos:

```text
escena y opcion -> estado antes de elegir
consecuencia y residuo -> estado despues de elegir
escena de destino -> nuevo estado alcanzable
```

Por tanto, una consecuencia puede afirmar que una alianza acaba de nacer si la
misma accion activa su flag. Una opcion no puede ofrecer una salida ya abierta
si ese estado todavia no existe.

## Contrato minimo

Todo mundo nativo nuevo declara `qa.realidad_controlada`:

```json
{
  "version": 1,
  "obligatoria": true,
  "cobertura": {
    "recursos": "todos",
    "deducciones": "todas",
    "personajes": "todos"
  },
  "catalogo": {
    "rutas": ["salida_baja"],
    "amenazas": ["incendio_activo"],
    "estados_personaje": ["mara_rescatada"]
  },
  "entidades": [],
  "hechos": []
}
```

### Cobertura derivada

- `recursos: todos`: cada recurso del mundo necesita `id`, `nombre_visible` o
  aliases, custodia y terminos visibles. Su mencion se contrasta con inventario,
  escena o custodia de PNJ.
- `deducciones: todas`: cada pista necesita terminos visibles. Una afirmacion
  exige pista descubierta o evidencia declarada en la escena.
- `personajes: todos`: cada PNJ necesita una presentacion diegetica declarada.

No se repiten listas de ids que ya existen en `recursos`, `pistas` y `pnj`.

### Catalogo explicito

Rutas, amenazas y estados sensibles de personaje no tienen un catalogo natural
unico en el schema. El Arquitecto declara solo los pocos que pueden generar
contradicciones visibles. Cada id catalogado debe tener al menos un hecho
controlado; catalogarlo sin proteger ninguna frase bloquea el mundo.

### Entidades presentables

`entidades` cubre:

- todos los PNJ;
- lugares propios importantes;
- grupos, instituciones o sistemas que una opcion pueda tratar como conocidos.

Cada entrada declara `id`, `tipo`, `inicio` o `nodos`, y `anclas`. Las entidades
no PNJ declaran tambien `nombre_visible` y `terminos_visibles`. El QA recorre
historias reales y bloquea una mencion anterior a su presentacion.

No hace falta catalogar palabras comunes como puerta, calle o escalera. Si un
lugar, grupo o sistema tiene identidad propia y condiciona una decision, si.

### Hechos controlados

Cada hecho declara:

- `id` unico;
- `categoria`: `personaje`, `ruta` o `amenaza`;
- `sujeto`: id incluido en el catalogo correspondiente;
- `terminos_visibles`: frases concretas que afirman ese hecho;
- al menos una guarda comprobable: `requisitos`, `requisitos_ausentes`,
  `pnj_presente` o `nodos_permitidos`.

El control se aplica a escena, opcion visible, consecuencia y residuo. No se
aceptan hechos sin guarda porque no protegen ninguna diferencia real.
Tampoco se acepta un hecho sin testigo visible alcanzable: inventar un termino
que nunca aparece en partida no demuestra cobertura.

## Reparto de responsabilidades

- Arquitecto: define catalogo, presentaciones y guardas antes de narrar.
- Narrador: escribe dentro de esa realidad; no inventa aliases sensibles sin
  incorporarlos al contrato.
- Validador: ejecuta recorridos completos y trata cualquier hueco de cobertura
  como bloqueo, no como aviso editorial.
- Compilador: corrige contrato o variantes; nunca silencia el control borrando
  un termino visible que el jugador necesita.

## Compatibilidad

`qa.presentaciones_pnj` y `qa.verdades_controladas` siguen siendo legibles para
corpus anteriores. No bastan para declarar completo un mundo nativo nuevo: su
puerta es `qa.realidad_controlada` con cobertura obligatoria.

## Puerta

La implementacion vive en `scripts/qa/lint_narrativo.js`, se ejecuta mediante
`qa:world` y su regresion forma parte de `qa:factory`.

Un mundo queda `NO APTO` si:

- un recurso o deduccion carece de terminos auditables;
- un PNJ no tiene contrato de presentacion;
- una entidad importante aparece antes de presentarse;
- una ruta, amenaza o estado sensible esta catalogado sin hechos;
- un hecho controlado no tiene ningun testigo visible alcanzable;
- una frase visible contradice sus requisitos, presencia o nodos permitidos.
