# World schema v1 canonico

Estado: canonico para mundos nuevos.

Este contrato no obliga a migrar mundos antiguos. Los mundos heredados pueden seguir usando adaptadores. Los mundos nuevos deben nacer con este contrato o justificar una excepcion.

## Objetivo

Evitar que cada mundo invente su propio dialecto.

El mundo debe separar con claridad:

- material visible para el jugador;
- estructura jugable;
- estado mecanico;
- metadatos de QA;
- notas editoriales no visibles.

## Idioma

### Texto visible

Castellano natural.

Prohibido en texto visible:

- catalan accidental;
- mojibake;
- tokens como `flag_`, `inv_`, `node_`;
- lenguaje de motor;
- explicaciones tipo "esta opcion requiere";
- frases genericas de cierre.

### Campos tecnicos

Para mundos nuevos se usara un castellano tecnico controlado, con estos nombres canonicos:

- `id`
- `titulo`
- `genero`
- `introduccion_jugable`
- `contrato_voz`
- `jugador`
- `premisa`
- `estado_inicial`
- `sistema_presion`
- `recursos`
- `pistas`
- `pnj`
- `nodos`
- `finales`
- `qa`

No se deben crear alias nuevos. Si el motor necesita nombres antiguos, se resolvera mediante adaptador.

## Estructura minima

```json
{
  "schema_version": "world_v1",
  "id": "string",
  "titulo": "string",
  "genero": "Terror | Ciencia | Aventura | Thriller | ...",
  "contrato_voz": {},
  "jugador": {},
  "premisa": {},
  "estado_inicial": {},
  "sistema_presion": {},
  "recursos": [],
  "pistas": [],
  "pnj": [],
  "nodos": [],
  "finales": [],
  "qa": {}
}
```

## Jugador

Campos obligatorios:

- `nombre`
- `rol`
- `motivacion`
- `limitacion`

Regla: la limitacion debe afectar decisiones reales. Si no cambia nada, se elimina.

## Introduccion jugable

Los mundos nuevos de fabrica deben abrir con una introduccion jugable antes del
primer nodo. No es una ficha ni un prologo intercambiable: permite al jugador
entender desde el primer gesto donde y cuando esta, quien encarna, que ha roto
la normalidad y por que las personas presentes importan.

La extension responde a la firma de experiencia: una experiencia directa puede
ser breve, pero no puede omitir contexto. La accion inicial sucede *despues* de
esta orientacion; no la sustituye.

El bloque `qa.apertura_contextual` la hace verificable:

```json
{
  "obligatoria": true,
  "min_caracteres": 850,
  "anclas": {
    "lugar_y_epoca": ["lugar", "epoca"],
    "papel_del_jugador": ["nombre", "rol"],
    "detonante": ["hecho que rompe la normalidad"],
    "relacion_inicial": ["persona o vinculo relevante"]
  }
}
```

Cada grupo de anclas debe aparecer de forma natural en la introduccion. El
lint bloquea una apertura ausente, demasiado corta o que no contenga alguno de
sus grupos declarados. Las plantillas y fixtures heredados quedan fuera hasta
que se sometan a una ronda de fabrica.

## Premisa

Campos obligatorios:

- `promesa_jugable`: que espera vivir el jugador.
- `conflicto_central`: que fuerza se opone.
- `pregunta_dramatica`: que debe resolver la partida.
- `objeto_o_lugar_dominante`: ancla fisica del mundo.

## Estado inicial

Campos obligatorios:

- `ubicacion`
- `situacion_visible`
- `inventario`
- `pistas_descubiertas`
- `variables`
- `flags`

Regla: todo lo que aparece como opcion inicial debe existir en `situacion_visible` o estar claramente inferido.

Cuando el mundo activa `qa.presentacion_expediente`, declara tambien
`titulo_hoja_inicial`.

## Sistema de presion

Obligatorio si el genero depende de tension, persecucion, horror, supervivencia o cuenta atras.

Campos:

- `nombre_visible`: como se percibe en ficcion.
- `variable`: nombre interno.
- `rango`: minimo y maximo.
- `sube_por`: acciones que la aumentan.
- `baja_por`: acciones que la alivian.
- `efectos_por_umbral`: cambios visibles.

Regla: la presion nunca debe explicarse como numero al jugador.

## Recursos, pistas y personajes

Cada recurso debe declarar:

Para mundos nuevos creados desde `economia_causal_recursos_v1`; los corpus
anteriores se auditan en modo `report` y no se migran de oficio.

- `id`: token mecanico estable;
- `nombre_visible`: nombre natural que aparece en inventario;
- `tipo`;
- `funcion`;
- `custodia_inicial`: `jugador`, `escena`, `fuera_de_escena` o `pnj:<id>`;
- `terminos_visibles`: nombres y aliases con los que la prosa puede usarlo.

Las pistas y PNJ deben usar tambien `nombre_visible`. La interfaz nunca debe fabricar el nombre limpiando
`inv_`, guiones o subrayados: el adaptador conserva el token para el estado y
entrega `nombre_visible` al panel.

Cada pista controlada declara tambien `terminos_visibles`: las formulaciones
concretas con las que la prosa afirma esa deduccion. Un nodo puede declarar
`pistas_escena` cuando la evidencia esta fisicamente delante del jugador pero
todavia no se ha convertido en pista descubierta.

Los mundos nativos nuevos declaran `qa.realidad_controlada` segun
`realidad_controlada_v1.md`. Su cobertura es completa para recursos, pistas y
PNJ, y explicita para las pocas rutas, amenazas, estados de personaje y
entidades propias que pueden generar contradicciones. El QA recorre rutas
reales y distingue el estado previo de escena/opcion del estado posterior de
consecuencia/residuo. `qa.presentaciones_pnj` y `qa.verdades_controladas`
siguen admitidos como compatibilidad de corpus anteriores.

Cuando `contrato_voz.rutas` declare `pnj_central`, esa asignacion es autoridad
sobre una inferencia estadistica: el QA de voz evalua a la persona que la
arquitectura ha comprometido como central, no a quien acumule mas menciones por
una reconvergencia o una correccion de presentacion.

## Nodo

Cada nodo debe tener:

- `id`
- `ubicacion`
- `fase`
- `situacion_visible`
- `detalle_actual`
- `presion_visible`
- `nucleo_escenico`
- `objeto_conflicto`
- `pnj_en_tension`
- `continuidad_desde_decision_anterior`
- `opciones`

`situacion_visible` responde: donde estoy, quien/que esta presente, que acaba de quedar claro.

`detalle_actual` responde: que detalle fisico o sensorial hace que esta escena tenga cuerpo.

`presion_visible` responde: que puede empeorar si actuo mal o tardo.

`nucleo_escenico` responde: que choque concreto sostiene la escena, no que informacion se entrega.

`objeto_conflicto` responde: que cosa fisica concentra la decision.

`pnj_en_tension` responde: que personaje quiere algo, teme algo, oculta algo o presiona al jugador.

`continuidad_desde_decision_anterior` responde: que gesto, coste o residuo del turno anterior sigue pesando aqui.

Campos opcionales de disponibilidad material:

- `recursos_escena`: recursos presentes que no pertenecen al jugador;
- `recursos_pnj`: mapa de PNJ a recursos que siguen bajo su control.
- `pistas_escena`: ids de pistas cuya evidencia esta presente, sin conceder aun
  la deduccion al jugador.
- `ubicacion_corta`: nombre compacto para la ruta de movil.
- `focos_consulta`: hasta tres consultas semanticas de escena; no son acciones.

Reglas de escena viva:

- Un nodo no final no debe ser solo un estado del grafo narrado.
- Cada nodo debe contener al menos un cambio fisico observable o una reaccion humana significativa.
- En mundos con PNJ, la mayoria de nodos no finales deben incluir voz directa, gesto personalizado o reaccion social.
- La presion debe estar encarnada en objeto, cuerpo, tiempo, espacio o voz.
- Si el texto podria resumirse como "se comprueba una pista y aparece la siguiente opcion", la escena no esta lista.

Reglas de continuidad textual:

- La primera escena no debe repetir la intro jugable. Si la intro presenta lugar, amenaza y ancla fisica, el nodo inicial debe avanzar un matiz nuevo o apoyarse en paneles.
- Un nodo no debe contener texto condicional visible del tipo "si sigue encendido", "si no lo activo" o "o, si...". Si el estado importa, debe resolverse con una variante de nodo, un campo condicionado o una opcion filtrada.
- Si la consecuencia de una opcion cambia la ubicacion, debe narrar el traslado minimo antes de mostrar la nueva situacion.
- La metafora debe acompanar a la accion, no sustituirla. En finales y peligros, primero se entiende que pasa; despues puede llegar el tono.
- El texto principal no debe resumir el menu de opciones. Debe mostrar situacion, presion y cuerpos; las opciones ya explican que puede intentar el jugador.

### Variantes ordenadas de escena o final

Un nodo o un final puede declarar `variantes_ordenadas` para cambiar texto visible
segun el estado sin duplicar el grafo:

```json
{
  "variantes_ordenadas": [
    {
      "id": "cerco_alto",
      "orden": 10,
      "requisitos": ["flag_ruta_aelia"],
      "requisitos_ausentes": [],
      "presion_min": 4,
      "sobrescribe": {
        "situacion_visible": "Los hombres de Celer cierran el portico.",
        "texto_base": "Texto especifico de esta situacion."
      }
    }
  ]
}
```

Se aplica la primera variante cuyo estado cumpla, por `orden` ascendente. Puede
sobrescribir `ubicacion`, `situacion_visible`, `texto_base` o `texto_final`,
`presion_visible`, `personajes_visibles` y `entorno_visible`. No puede cambiar
opciones, destinos ni cambios de estado: una variante textual reacciona al grafo,
no lo reescribe.

## Opcion

Cada opcion debe tener:

- `id`
- `texto`
- `postura_jugador`
- `destino`
- `requisitos`
- `requisitos_ausentes`
- `consecuencia`
- `residuo`
- `cambios_estado`

Cuando el mundo activa `qa.presentacion_expediente`, declara tambien
`titulo_hoja_destino`.

Si usa un recurso que no exige en inventario, debe declarar
`fuentes_recursos` como mapa de id a `escena` o `pnj:<id>`. Esta declaracion no
transfiere ni consume el objeto; solo explica por que la accion es posible.

Reglas:

- Cada nodo jugable no final debe tener entre 2 y 4 opciones visibles tras aplicar estado.
- El objetivo preferente son 3 opciones. 4 opciones son aceptables en decisiones ricas. 2 opciones solo si la ficcion estrecha de verdad la escena.
- Una sola opcion visible no debe ser un turno jugable normal: se fusiona con la escena anterior, se convierte en puente autoavanzable o se rediseña con otra decision real.
- La comprobacion de 2-4 opciones debe hacerse despues de aplicar estado, no solo contando las opciones declaradas en el JSON.
- Un nodo de convergencia debe ser jugable tanto para la ruta con pista/recurso como para la ruta sin pista/recurso, salvo que una de ellas termine en final o puente automatico.
- Si los requisitos no se cumplen, la opcion no debe mostrarse salvo que sea deliberadamente una accion fallida interesante y este marcada como tal.
- Si una opcion solo tiene sentido cuando falta un objeto, pista o flag, debe declarar esa ausencia en `requisitos_ausentes`. En mundos guiados legacy se admite el alias `requereix_absent`.
- El texto debe ser una accion fisica o social concreta.
- El texto debe implicar una postura dentro del conflicto, no solo una operacion utilitaria.
- La consecuencia debe resolver primero la accion elegida antes de abrir la siguiente escena.
- La consecuencia debe dejar residuo fisico, social, informativo o mecanico.
- Una consecuencia que solo confirma informacion queda rechazada salvo que tambien cambie relacion, espacio, coste o recurso.
- El destino debe ser compatible con la accion y el estado. Una opcion no puede saltar a cabina, cuarto, sistema, herramienta o PNJ si el acceso todavia no se ha abierto; debe ir al bloqueo, usar resolucion condicional o exigir el requisito.
- No puede ofrecerse una opcion basada en un pacto, objeto, PNJ o informacion que el jugador no tenga.
- No deben aparecer a la vez dos opciones mutuamente excluyentes por estado, por ejemplo "conservar el clip" y "cerrar sin clip".
- Si el texto de una opcion menciona un recurso concreto, la opcion debe exigirlo, obtenerlo en esa misma accion o declarar una resolucion fallida deliberada.
- Si hay una ruta con recurso y otra sin recurso, deben tener costes distintos. El recurso debe cambiar ruido, presion, acceso, relacion, informacion, daño, consumo, tiempo o final.
- No se acepta una consecuencia comodin que convierta objetos diferentes en equivalentes.
- `presion_min` y `presion_max` filtran la opcion antes de mostrarla.
- `requisitos_alternativos` es una lista de grupos: basta con cumplir un grupo completo. No se combina con `requisitos`; debe usarse uno u otro para evitar dos interpretaciones.

## Cambios de estado

Campos permitidos:

- `inventario_agregar`
- `inventario_quitar`
- `pistas_agregar`
- `flags_set`
- `variables_set`
- `presion_delta`

No crear nombres equivalentes. No mezclar idiomas en campos nuevos.

## Final

Cada final debe tener:

- `id`
- `titulo`
- `tipo`
- `condiciones`
- `texto_final`
- `estado_resultante`

Cuando el mundo activa `qa.presentacion_expediente`, el final declara tambien
`ubicacion_corta` y `focos_consulta`.

Reglas:

- El final debe ser una escena, no un resumen administrativo.
- Debe responder a decisiones previas.
- Debe cerrar lo suficiente para sentirse deliberado, aunque sea derrota.
- Si rutas materialmente distintas comparten final, usar `variantes_ordenadas`
  para nombrar con precision recursos, custodia, danos o pruebas conservadas.
- Una variante final no puede inventar un objeto o estado que el jugador no haya
  llevado hasta el cierre.
- Cada final debe declarar `qa.perfil_desenlace` con listas de `beneficios` y
  `costes`, y una `postura`. El perfil describe el resultado; no sustituye la
  escena ni obliga a ordenar todos los finales en una sola escala.

## Metadatos de agencia para preflight

El bloque `qa` puede declarar un perfil de agencia. Estos datos pertenecen a
autoria y validacion: no se muestran al jugador y el compilador puede retirarlos
del runtime.

La firma de experiencia no se deduce del genero ni se duplica manualmente en el
mundo: su autoridad es la semilla 1.2 confirmada. Arquitecto y Narrador la usan
durante produccion y el Validador compara ambos archivos mediante
`qa:experience`. Si el mundo necesita conservar una referencia, puede registrar
la ruta de la semilla en su informe de puerta, sin crear otro perfil divergente.

Campos:

- `perfil_agencia`: perfil de exigencia aprobado para el mundo.
- `duracion_objetivo`: objeto con `min` y `max` de decisiones.
- `rutas_principales`: rutas con `id`, `entrada`, `postura`,
  `coste_irreversible` y `memoria_exigida`.
- `nodos_climax`: nodos donde se comparan los perfiles finales de decision.
- `recursos_clave`: recursos cuyo uso diferencial es bloqueante.
- `estados_clave`: flags o variables que deben consultarse posteriormente.
- `preparaciones_clave`: pistas o estados cuya capacidad posterior es
  obligatoria y debe poder cobrarse desde cada estado que los genera.
- `derrotas_tempranas`: final, ventana de turno, causa, aviso y proteccion.
- `artefacto_central` o `artefactos_centrales`: recursos excluidos del recuento
  de objetos opcionales, aunque siguen obligados a tener funcion real.
- `excepciones_justificadas`: desviaciones aprobadas por el Director.
- `verdades_controladas`: hechos pequenos pero importantes que el texto no puede
  afirmar fuera del estado que los respalda. Cada hecho declara `id`,
  `categoria`, `terminos_visibles`, `requisitos`, `requisitos_ausentes` y, si
  afirma presencia corporal, `pnj_presente`. Una verdad de ruta puede limitar
  tambien `nodos_permitidos`.
- `realidad_controlada`: contrato obligatorio de los mundos nativos nuevos.
  Declara version, cobertura, catalogo finito, entidades presentables y hechos
  de personaje, ruta o amenaza ligados al estado alcanzable.
- `presentacion_expediente`: puerta opcional de compatibilidad y obligatoria en
  mundos nuevos. Activa los metadatos semanticos de hoja, foco y localizacion
  compacta definidos en `presentacion_expediente_v1.md`.
- `promesas_causales`: entre tres y siete decisiones o preparaciones centrales,
  con origen, token, horizonte, cobro minimo y politica de sustitucion tardia.
- `estados_sensibles_final`: estados que un final no puede recibir presentes y
  ausentes con la misma variante y perfil.
- `variables_relacionales`: variables de PNJ divididas en bandas alcanzables,
  cada una con al menos un cobro diferencial.
- `recursos_valor_marginal`: recursos cuya equivalencia frente a una alternativa
  debe bloquear; los recursos no declarados se auditan solo como candidatos.
- `excepciones_persistencia_causal`: excepciones estrechas con `code`, campos de
  alcance y `motivo` obligatorio.

Ejemplo:

```json
{
  "qa": {
    "perfil_agencia": "aventura_corta_reactiva",
    "duracion_objetivo": { "min": 7, "max": 10 },
    "rutas_principales": [
      {
        "id": "ruta_social",
        "entrada": "opcion_proteger_testigo",
        "postura": "proteger",
        "coste_irreversible": "flag_senador_alertado",
        "memoria_exigida": "flag_testigo_protegido"
      }
    ],
    "nodos_climax": ["nodo_puerta"],
    "recursos_clave": ["inv_sello"],
    "estados_clave": ["flag_testigo_protegido"],
    "derrotas_tempranas": [
      {
        "final": "final_captura",
        "turno_min": 3,
        "turno_max": 5,
        "causa": "exposicion publica",
        "aviso_previo": "nodo_escoltas",
        "proteccion": "flag_testigo_protegido"
      }
    ]
  }
}
```

Antes de Narracion, el esqueleto debe pasar el perfil declarado mediante
`npm.cmd run qa:agency -- <archivo>`, su economia mediante
`npm.cmd run qa:resources:gate -- <archivo>` y sus promesas mediante
`npm.cmd run qa:causal:gate -- <archivo>`.

Tras la narracion y antes de aceptar el mundo, ejecutar tambien:

```text
npm.cmd run qa:experience -- <semilla-1.2.json> <mundo.json>
```

Sus bandas de densidad son avisos editoriales durante calibracion. La revision
de objetos, deducciones, decisiones y severidad es obligatoria para el Director.

## Metadatos de presentacion expediente

Los mundos que declaren `qa.presentacion_expediente.obligatoria: true` deben
incluir, sin cambiar la logica del grafo:

- `estado_inicial.titulo_hoja_inicial`;
- `titulo_hoja_destino` en cada opcion jugable;
- `ubicacion_corta` y `focos_consulta` en nodos y finales.

Los focos son consulta semantica, no acciones ni fuentes de estado. Pueden
tener guardas de disponibilidad y referencias a PNJ, recursos o pistas, pero
nunca conceden conocimiento nuevo. El contrato completo es
`presentacion_expediente_v1.md`.

La forma completa de estos metadatos esta definida en
`persistencia_causal_decisiones_v1.md`.

## QA obligatorio

Antes de aceptar un mundo nuevo:

```text
npm.cmd run qa:world -- <archivo>
```

Si el mundo nace como `world_v1`, antes de narrarlo o publicarlo debe demostrar
paridad entre preflight y runtime:

```text
npm.cmd run qa:world-v1:runtime -- <archivo>
npm.cmd run qa:causal:gate -- <archivo>
```

Y al menos un smoke de experiencia si el mundo esta integrado en el motor:

```text
npm.cmd run qa:guided:smoke
```

## Puertas de rechazo automatico

Un mundo nuevo queda `NO APTO` si:

- tiene opciones imposibles visibles;
- tiene opciones que mencionan recursos ausentes;
- tiene recursos importantes sin uso diferencial;
- contiene una opcion mecanicamente dominada por otra co-visible;
- prepara un estado que solo puede cobrarse en una ruta incompatible;
- usa un recurso sin inventario o fuente de custodia declarada;
- tiene finales genericos;
- tiene texto visible con tokens;
- tiene mojibake;
- usa dialectos de schema nuevos sin adaptador;
- no se entiende la escena inicial;
- no hay ruta jugable hasta al menos un final;
- el genero exige presion y la presion no se mueve.
- la escena inicial parece una ficha de estado y no una escena viva;
- la mayoria de consecuencias no dejan residuo;
- los PNJ aparecen como etiquetas de panel pero no actuan en la ficcion.
