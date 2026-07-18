# Contrato de calidad narrativa verificable v1

Fecha: 2026-07-11

Estado: `CANON DE DISENO`. Controles implementados y calibrados en modo
`report`; prueba de correccion de Fase 1 pendiente.

## Proposito

Este contrato define que debe demostrar una trama antes de considerarse
narrativamente terminada. No prescribe como escribir prosa y no debe copiarse
entero dentro del prompt del Narrador.

La capa creativa sigue siendo corta. Este documento pertenece a la capa de
validacion estricta.

## Unidad de analisis

El control trabaja con historiales renderizados y estado real, no con frases
aisladas.

Unidad minima:

```text
estado antes de elegir
-> opciones co-visibles
-> opcion elegida
-> consecuencia
-> escena siguiente resuelta por estado
-> menus y finales futuros
```

Una opcion no se compara con otra si nunca pueden aparecer juntas en el mismo
estado jugable.

## 1. Agencia contrafactual

### Pregunta

> Si el jugador elige A en lugar de B, que diferencia real permanece?

### Horizontes

- `H0`: consecuencia inmediata.
- `H1`: escena y menu siguientes.
- `H2`: dos decisiones despues.
- `H3`: tres decisiones despues o final, lo que llegue primero.

### Firma de comportamiento

Para cada opcion co-visible se registran:

- destino inmediato;
- inventario ganado, perdido, entregado o danado;
- pistas y conocimiento adquiridos;
- relaciones, custodias y posiciones persistentes;
- flags que, al volver a consultarse, cambian una resolucion observable;
- presion solo si vuelve a consultarse despues de la eleccion;
- menus alcanzables en `H1`, `H2` y `H3`;
- familias de final y variantes materiales alcanzables;
- ausencia o presencia de derrotas nuevas.

Un flag escrito pero nunca leido no demuestra agencia. Tampoco la demuestra un
flag que se lee de forma sintactica pero es intercambiable con otro para
resolver la misma variante, el mismo menu y los mismos finales. Un punto de
presion anadido despues del ultimo nodo que consulta presion tampoco.

La vida de estado es observacional, no nominal: dos tokens con nombres
distintos no cuentan como diferencia si sustituir uno por otro no cambia lo que
el jugador ve, puede hacer o puede alcanzar. La prioridad real de variantes se
resuelve antes de atribuir valor a un flag; una variante enmascarada por otra
anterior no conserva agencia.

### Clasificacion

`CONVERGENCIA_LEGITIMA`

- Las opciones comparten nodo posterior, pero conservan alguna diferencia
  util en `H1-H3` o en una variante final coherente.

`EQUIVALENCIA_SUAVE`

- Cambia la escena siguiente, pero menus, capacidades y desenlaces vuelven a
  ser iguales antes de `H3`.

`ELECCION_FALSA`

- Las opciones prometen posturas distintas, pero sus firmas relevantes son
  equivalentes y no dejan diferencia material, social o informativa.

`CONTRADICCION_CAUSAL`

- Dos acciones distintas comparten una variante posterior que solo puede ser
  cierta para una de ellas.

### Veredicto

- `ELECCION_FALSA` y `CONTRADICCION_CAUSAL`: bloqueo.
- `EQUIVALENCIA_SUAVE`: aviso; bloqueo si ocurre en climax, recurso central o
  dos veces seguidas.
- `CONVERGENCIA_LEGITIMA`: apta.

El analizador debe mostrar la firma comparada. No basta con afirmar que dos
opciones "se parecen".

## 2. Continuidad semantica

### Responsabilidad de cada fragmento

- La opcion declara la accion y postura.
- La consecuencia resuelve lo que acaba de hacer el jugador.
- La escena siguiente muestra reaccion, descubrimiento, coste o nueva presion.

### Fallos

`REPETICION`

- Consecuencia y escena siguiente vuelven a contar el mismo hecho sin avance.

`REINICIO`

- La escena siguiente presenta como pendiente una accion ya resuelta.

`CONTRADICCION`

- Cambian ocultacion, posesion, posicion, conocimiento, lesion, custodia o
  actitud sin causa.

`RESUMEN_DE_ESTADO`

- La escena enumera lo que el jugador ya sabe en vez de dramatizar el cambio.

### Evidencia

El reporte enfrenta:

```text
opcion
consecuencia
situacion siguiente
primer parrafo siguiente
estado material antes y despues
```

Las heuristicas pueden proponer candidatos mediante solape, actores, verbos,
objetos y negaciones. El Director confirma los casos puramente semanticos. No se
autoriza reescritura automatica.

Implementacion calibrada:

- `ACCION_REINICIADA` exige que la frase pendiente repita el nucleo operativo
  de una opcion que la consecuencia ya resolvio;
- `CONTRADICCION_MATERIAL` exige un testigo de estado antes y despues;
- `RESUMEN_SIN_AVANCE` y `CONTINUIDAD_PARA_REVISION` son avisos humanos;
- cada candidato muestra los fragmentos enfrentados y el cambio material;
- una obligacion futura distinta no cuenta como reinicio;
- ningun caso puramente semantico activa correccion automatica.

## 3. Frontera de conocimiento

Una opcion solo puede usar informacion que el protagonista:

- ha visto u oido;
- ha recibido de un personaje;
- ha inferido de forma directa y comprensible;
- puede reconocer por su oficio o contexto declarado.

Se consideran fugas:

- nombrar un destino no presentado;
- atribuir funcion a un sello, llave, pista o mecanismo no comprendido;
- anticipar un plan futuro como si ya fuera decision presente;
- tratar una sospecha como hecho;
- nombrar a un personaje no presentado como conocido.

La opcion debe describir la accion inmediata. La consecuencia puede revelar su
resultado.

Veredicto:

- entidad o funcion no presentada: bloqueo;
- inferencia posible pero mal apoyada: aviso para lectura humana.

La frontera se calcula desde la experiencia renderizada, no desde el JSON de
autor. Premisa, conflicto central, funcion interna de recursos, fichas completas
de PNJ y nodos futuros no cuentan como conocimiento del protagonista.

El panel de Personajes forma parte de esa memoria renderizada. Debe incluir
siempre al protagonista y conservar a todo personaje relevante ya presentado por
nombre, aunque este muerto, ausente o fuera de la escena actual. Su descripcion
solo puede mostrar el papel ya conocido, no la ficha oculta completa.

Un texto base tampoco puede enumerar estados materiales incompatibles. Si una
escena cambia segun la prueba entregada, conservada o perdida, la variante debe
nombrar unicamente el recurso que realmente ha llegado a ese estado. La formula
"X o Y permiten" no sustituye la resolucion del inventario y la custodia.

Si dos caminos convergen en el mismo estado mecanico pero solo uno ha presentado
una entidad, conservan memorias distintas para este control. La memoria puede
compactarse a entidades y terminos que opciones futuras realmente consultan;
no necesita guardar toda la prosa literal.

Un sustantivo que aparece exclusivamente como resultado de la propia accion no
es una entidad oculta. Por ejemplo, exigir un acta publica puede crearla si la
escena ya presenta escribiente, registro y testigos.

Automatizacion:

- ausencia demostrable de una entidad catalogada: bloqueo potencial;
- funcion o plan detectado solo por heuristica: aviso;
- dos indicios independientes pueden elevarse a bloqueo;
- inferencia fisica directa y conocimiento por oficio declarado: aptos;
- entidades ambiguas importantes pueden declararse bajo
  `qa.frontera_conocimiento` sin alterar el runtime.

## 4. Equilibrio de voz entre tramas

El objetivo no es igualar cifras, sino detectar abandono editorial.

Por trama se informa:

- presencia del PNJ central por escena;
- turnos con voz directa;
- turnos con gesto o reaccion individual;
- acciones iniciadas por el PNJ;
- escenas donde el PNJ solo es mencionado a distancia;
- longitud media y dispersion por turno;
- numero de decisiones donde la relacion cambia de verdad.

Comparacion:

- cada trama se compara con su contrato de voz;
- tambien se compara con la mediana de las tramas homologas;
- una diferencia deliberada debe justificarse por genero, rol o situacion;
- una trama social con poca voz directa exige revision.

No existe una cuota universal de dialogo. La metrica abre una pregunta, no
decide calidad literaria por si sola.

La comparacion usa historiales completos alcanzables. Separa:

- dialogo visible por recorrido;
- habla o accion verbal del PNJ;
- gesto, reaccion e iniciativa;
- presencia y mencion a distancia;
- cambio relacional.

Un mundo puede declarar una excepcion bajo `qa.voz.rutas`, con justificacion y
compensacion dramatica. Declarar silencio no autoriza ausencia del personaje.

Veredicto inicial hasta calibracion:

- desviacion moderada: aviso;
- trama social claramente por debajo y sin justificacion: revision obligatoria;
- ausencia prolongada del PNJ que define la ruta: bloqueo editorial.

Implementacion calibrada:

- `PNJ_CENTRAL_AUSENTE`: bloqueo local en `report`;
- `DESEQUILIBRIO_DE_VOZ`: aviso consolidado por ruta;
- `VOZ_EQUILIBRADA` y `VOZ_JUSTIFICADA`: controles aptos;
- una ruta no es comparable con menos de tres unidades o menos de tres rutas
  homologas;
- el `gate` global permanece desactivado.

## 5. Concentracion lexica

El control registra por trama y por ventanas de dos turnos:

- frecuencia por mil palabras;
- repeticion de sustantivos de apoyo;
- repeticion de actor, objeto y gesto;
- diferencias frente a las otras tramas;
- sinonimos que no corrigen una repeticion de significado.

Una palabra material repetida puede ser motivo del mundo y estar justificada.
Se marca cuando:

- domina una ventana corta;
- sustituye referentes mas claros;
- coincide con repeticion semantica;
- una ruta la usa varias veces mas que las homologas sin motivo dramatico.

El resultado es aviso editorial, nunca sustitucion automatica por sinonimos.

Implementacion calibrada:

- un parrafo o una opcion repetidos literalmente en el turno inmediato se
  registran como bloqueo en modo `report`;
- una formulacion casi identica, una reiteracion entre consecuencia y destino o
  una muletilla en tres nodos generan aviso;
- la comparacion entre tramas deduplica escenas y exige cinco apariciones en
  tres unidades antes de informar concentracion;
- nombres propios, objeto dominante y artefactos centrales se tratan como
  vocabulario tematico;
- un mundo puede declarar motivos adicionales en
  `qa.lexico.terminos_tematicos`;
- ninguna metrica lexica activa por si sola una correccion o el modo `gate`.

## 6. Paquete de revision

Cada aviso debe ser pequeno y accionable:

```text
codigo:
ruta:
nodo y estado:
opciones o fragmentos:
horizonte afectado:
firma comparada:
por que se sospecha:
que debe decidir el Director:
```

No se acepta un reporte con cientos de avisos sin priorizar. Orden:

1. contradiccion causal;
2. eleccion falsa;
3. fuga de conocimiento;
4. repeticion o reinicio;
5. desequilibrio de voz;
6. concentracion lexica.

## 7. Casos canonicos de calibracion

### Debe detectar

- Celer `o76_celer_ocultar` / `o78_celer_tomar_en_secreto`:
  co-visibles, mismo inventario, mismo flag relevante, mismo destino y presion
  ya inerte.
- Tito `o68_tito_testigos` / `o70_tito_formar_guardia`:
  escenas distintas, pero mismo menu posterior en el estado de custodia y sin
  diferencia conservada en los finales disponibles.
- Celer tras ocultar la pieza:
  consecuencia y variante siguiente reiteran sospecha, bolsas y registro; la
  variante sirve mal para la negativa abierta.
- Inicio de Celer:
  la opcion anticipa llegar a una puerta antes de establecer destino o funcion
  del sello.

### No debe detectar como eleccion falsa

- Aelia `o54_aelia_leer_completa` /
  `o54b_aelia_descifrar_en_losa`: las condiciones relevantes son alternativas
  y no forman un menu competitivo equivalente en el mismo estado.

### Debe informar, no bloquear automaticamente

- Celer presenta menos voz directa que Aelia y Tito.
- `bolsa` y `escolta` tienen concentracion relativa alta en Celer.

## 8. Relacion con otros contratos

- `contrato_creativo_corto.md` gobierna la creacion.
- `puesta_en_escena_jugable_v1.md` gobierna el orden de revelacion del turno
  renderizado y la lectura ciega de riesgos, cuerpos y espacios.
- `deriva_compacta.md` gobierna la aspiracion literaria.
- Este contrato gobierna la evidencia de validacion narrativa.
- `world_schema_v1_canonico.md` gobierna estado y estructura.
- `checklists/aceptacion_mundo.md` reunira las puertas una vez calibradas.

En caso de conflicto, una observacion humana reproducible puede abrir incidente
y cambiar este contrato. No puede ignorarse solo porque la metrica apruebe.

## 9. Limites

Este contrato no intenta:

- demostrar matematicamente que una prosa es buena;
- imponer el mismo ritmo a todos los generos;
- convertir cada convergencia en bifurcacion permanente;
- eliminar finales compartidos con variantes reales;
- sustituir lectura humana;
- reparar mundos automaticamente;
- aumentar el prompt creativo con todas estas reglas.

## Puerta de implementacion

Antes de activar este contrato como bloqueo general:

- crear fixtures minimos;
- reproducir los casos de Jano;
- medir falsos positivos;
- acordar umbrales de aviso;
- validar una muestra corregida;
- integrar el resultado en `qa:factory`.
