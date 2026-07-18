# Checklist de aceptacion de mundo

Basado en `analisis_cambio_rumbo/11_criterios_aceptacion_mundos.md`.

Todo fallo general detectado durante una partida debe registrarse mediante `fabrica/procesos/protocolo_incidente_aprendizaje.md` y, si es posible, convertirse en QA automático.

## Continuidad

- [ ] `qa.realidad_controlada` cubre todos los recursos, deducciones y PNJ, y cataloga las pocas rutas, amenazas y estados de personaje que pueden contradecirse.
- [ ] Cada ruta, amenaza o estado sensible catalogado tiene al menos una verdad visible con guarda comprobable.
- [ ] Lugares propios, grupos y sistemas importantes se presentan antes de que una escena u opcion los trate como conocidos.
- [ ] No aparecen PNJ no presentados como conocidos.
- [ ] No aparecen objetos no obtenidos como usables.
- [ ] Todo termino visible de un recurso controlado esta cubierto, en cada estado alcanzable, por inventario, recurso de escena o custodia declarada de un PNJ.
- [ ] Toda deduccion formulada como hecho esta descubierta o tiene evidencia declarada en la escena, en cada estado alcanzable.
- [ ] Todo hecho sensible sobre presencia, estado de un PNJ o disponibilidad de una ruta tiene una verdad controlada y no aparece en una variante incompatible.
- [ ] No hay opciones imposibles por ubicacion, inventario o estado.
- [ ] Ninguna opcion salta a una estancia, sistema o herramienta que siga cerrada o no disponible; si depende de acceso, usa destino condicional o nodo de bloqueo.
- [ ] La ubicacion cambia con puente narrativo.
- [ ] Las consecuencias previas se respetan.
- [ ] No hay frases visibles que digan "si sigue", "si no lo hizo" o variantes equivalentes cuando el estado ya deberia estar resuelto.
- [ ] Si una accion cambia de estancia, la consecuencia incluye el gesto o puente que explica el traslado.
- [ ] Cada nodo no final conserva algun peso de la decision anterior: gesto, coste, objeto movido, relacion alterada o informacion nueva.
- [ ] La consecuencia resuelve la accion elegida y la escena siguiente aporta un descubrimiento, reaccion o presion nueva; no vuelve a narrar el mismo resultado.

## Escena viva

- [ ] Cada turno ensamblado permite situar protagonista, PNJ presentes, peligro y salida antes del menu; el misterio no oculta esas anclas.
- [ ] Un termino tecnico llega tras su imagen comun y un PNJ no se nombra en la consecuencia anterior a su entrada diegetica.
- [ ] Todo riesgo letal muestra una cadena causal legible: que cede, que golpea y por que no hay rescate inmediato.
- [ ] Ningun parrafo explica el menu de opciones; la escena muestra situacion y las opciones deciden.
- [ ] La escena inicial no parece una ficha de estado.
- [ ] Cada nodo no final tiene un objeto, lugar o cuerpo que concentra el conflicto.
- [ ] Cada nodo no final tiene presion encarnada en objeto, tiempo, voz, cuerpo o espacio.
- [ ] En mundos con PNJ, la mayoria de nodos no finales incluyen voz directa, gesto personalizado o reaccion social.
- [ ] Los PNJ importantes quieren algo concreto y pueden complicar la escena.
- [ ] Las frases cortas estan sostenidas por materia concreta antes o despues.

## Idioma

- [ ] Texto visible en castellano correcto.
- [ ] Sin catalan accidental.
- [ ] Sin mojibake.
- [ ] Sin `?` dentro de palabras por perdida de acentos o `ñ`.
- [ ] Sin tokens, flags o campos de motor en narrativa visible.

## Acciones

- [ ] Si una opcion menciona un objeto, ese objeto se posee, se gana en esa accion o la opcion no aparece.
- [ ] Cada recurso opcional tiene al menos un uso posterior diferencial.
- [ ] Cada promesa causal central conserva una diferencia observable despues de la primera reconvergencia.
- [ ] Ninguna preparacion clave se regala mas tarde con la misma capacidad y sin coste equivalente.
- [ ] Los recursos clave conservan valor marginal frente a las alternativas genericas co-visibles.
- [ ] Cada recurso declara custodia inicial y terminos visibles.
- [ ] Todo uso sin inventario declara si el objeto procede de la escena o de un PNJ.
- [ ] Ninguna opcion co-visible exige mas recursos o presion para producir el mismo estado que otra.
- [ ] Cada menu de climax se ha revisado con sus opciones realmente co-visibles; ninguna conserva todos los beneficios de otra sin asumir un coste propio.
- [ ] Toda preparacion mecanica puede cobrarse desde el estado concreto que la genera, no solo desde otra ruta.
- [ ] La amplitud desigual entre objetos esta compensada por profundidad, coste, informacion, seguridad o relacion.
- [ ] Un recurso diferencial cambia coste, ruido, presion, acceso, informacion, relacion o final.
- [ ] No hay consecuencias comodin que hagan equivalente tener o no tener el recurso.
- [ ] Cada nodo jugable no final muestra entre 2 y 4 opciones.
- [ ] La mayoria de nodos jugables muestran 3 o 4 opciones; los nodos de 2 opciones estan justificados por ficcion estrecha.
- [ ] No hay turnos normales con una sola opcion visible tras aplicar inventario, pistas o flags.
- [ ] Los nodos de convergencia se han probado con y sin la pista/recurso principal que desbloquea opciones.
- [ ] Cada opcion sale de la escena.
- [ ] Cada opcion tiene accion concreta.
- [ ] Cada opcion relevante muestra coste, riesgo o intencion.
- [ ] Cada opcion muestra accion y peligro visible; no revela una ausencia de recurso, estado oculto o desenlace para orientar la eleccion.
- [ ] Cada opcion implica postura del jugador dentro del conflicto, no solo operacion utilitaria.
- [ ] No hay categorias genericas como texto principal.

## Estado y presion

- [ ] Inventario, entorno, personajes, deducciones y peligros sostienen informacion estable para no sobrecargar el texto principal.
- [ ] El protagonista aparece siempre en Personajes con su rol visible.
- [ ] Todo personaje relevante presentado por nombre permanece consultable en Personajes aunque este muerto, ausente o fuera de escena.
- [ ] El texto de escena nombra solo el recurso presente, poseido o depositado en ese estado; las alternativas incompatibles se resuelven mediante variantes.
- [ ] La presion/amenaza se mueve si el genero lo exige.
- [ ] La presion se percibe en la ficcion.
- [ ] Las decisiones arriesgadas dejan residuo.
- [ ] El mundo conserva la firma de experiencia confirmada en su semilla 1.2.
- [ ] Los objetos cumplen su funcion declarada: condicionar, salvar/destruir,
      abrir/cerrar rutas, conceder influencia o revelar comprometiendo.
- [ ] Las deducciones conceden la capacidad declarada y no son explicacion
      enciclopedica sin efecto jugable.
- [ ] La naturaleza de las decisiones y la severidad real de los errores
      coinciden con lo prometido al usuario.
- [ ] `qa:experience` se ha ejecutado y sus avisos de ritmo han sido leidos.
- [ ] Cada consecuencia relevante deja residuo fisico, social, informativo o mecanico.
- [ ] No hay consecuencias que solo confirmen informacion sin cambiar nada mas.
- [ ] Los alivios tienen coste o rareza.

## Finales

- [ ] Cada final tiene texto propio.
- [ ] No hay final generico.
- [ ] El final responde a decisiones previas.
- [ ] El estado mecanico no contradice la escena final.
- [ ] Si un final recibe inventarios, custodias o danos distintos, usa variantes y nombra solo el estado que realmente llega a ese cierre.
- [ ] Los estados declarados en `qa.estados_sensibles_final` cambian variante, perfil o han sido cobrados de forma verificable antes del cierre.
- [ ] Las variantes materiales de final pueden declarar perfil propio de beneficios, costes y postura.
- [ ] La consecuencia terminal cambia la posicion inmediata y deja al final una deuda material por resolver; no cuenta dos veces la misma salida, sacrificio o revelacion.

## QA narrativo

- [ ] Toda correccion de un incidente calibrado tiene testigo, linea base y
  regresion focal por id o comportamiento responsable.
- [ ] Si cambia la agencia, se comparan tanto el total de recorridos como la
  distribucion de finales; cualquier traslado esta justificado por la ficcion.
- [ ] La arquitectura ha pasado `qa:counterfactual` en modo `report`.
- [ ] La arquitectura nueva ha pasado `qa:resources:gate`.
- [ ] La arquitectura nueva ha pasado `qa:causal:gate` y los avisos inferidos han sido clasificados.
- [ ] La prosa compilada ha pasado `qa:knowledge` y `qa:lexical` en modo
  `report`.
- [ ] La prosa compilada ha pasado `qa:semantic` y el informe enfrenta los
  fragmentos en vez de adjudicar calidad por puntuacion.
- [ ] La prosa compilada ha pasado `qa:puesta-escena`; sus avisos se han leido
  sobre el turno ensamblado y las escenas de riesgo tienen lectura ciega humana.
- [ ] Los avisos se han clasificado como defecto, continuidad legitima o motivo
  deliberado; no se han corregido por frecuencia de forma automatica.
- [ ] Las repeticiones exactas consecutivas y las opciones que reaparecen sin
  progreso tienen decision explicita del Director.
- [ ] Mejorar voz directa no reduce gesto, iniciativa o cambio relacional salvo
  decision dramatica documentada.

## UI y partida

- [ ] Jugable en smartphone.
- [ ] Si el mundo activa expediente audiovisual, tiene hoja inicial, titulos de
  hoja por opcion, localizaciones cortas y hasta tres focos de consulta por
  escena o final.
- [ ] Los titulos de hoja son visibles, no tecnicos, no adelantan informacion y
  no se repiten en una misma ruta jugable.
- [ ] Los focos solo amplian informacion ya visible, respetan estado y presencia
  de sus referencias y nunca sustituyen una decision.
- [ ] El jugador entiende donde esta.
- [ ] El jugador entiende con que/quien puede interactuar.
- [ ] El texto principal no repite informacion estable que ya vive en entorno, inventario, deducciones u objetivo.
- [ ] Las metaforas no sustituyen la accion fisica que decide victoria, derrota o peligro.
- [ ] El historial se siente como cuaderno/novela, no log tecnico.
- [ ] Se han leido de principio a fin historiales renderizados representativos, incluido cada final o estado material distinto de la ruta vertical.
- [ ] Existe al menos un smoke de experiencia guiada si el mundo esta integrado en motor.
- [ ] El smoke comprueba que no aparecen opciones imposibles por estado.
- [ ] El smoke comprueba que la escena renderizada tiene contexto, no solo apunte de estado.

## Veredicto

- [ ] `APTO`
- [ ] `APTO CON AVISOS`
- [ ] `NO APTO`
