# Contrato de puesta en escena jugable v1

Estado: `CALIBRACION EN REPORT`.

## Proposito

Garantizar que una persona que juega sin conocer el mundo entiende la pelicula
minima de cada turno antes de elegir. No reduce el misterio: separa lo que debe
ser legible de lo que puede permanecer inquietantemente abierto.

El Arquitecto decide que ocurre. El Director de puesta en escena decide que ve
y comprende el jugador. El Narrador decide como se escribe. El Director
audiovisual representa solo los hechos ya autorizados.

## Unidad de trabajo

La unidad no es una frase ni un campo JSON aislado. Es el turno renderizado:

```text
opcion elegida -> consecuencia -> situacion de destino -> texto de destino -> menu
```

Se revisa la secuencia y el orden real de recepcion, no la suma de datos que el
autor conoce del nodo.

## Escaleta obligatoria por escena

Antes de narrar, cada escena debe poder responder en una frase a estas cuatro
preguntas:

1. Donde esta la protagonista y que tiene delante.
2. Quien esta fisicamente con ella y donde se encuentra.
3. Que peligro, bloqueo o cambio material debe entenderse antes del menu.
4. Que pregunta puede quedar abierta sin impedir una decision informada.

La escaleta no se muestra al jugador ni altera el grafo. Es la orden de
revelacion que protege la prosa.

## Reglas de direccion

- Primero imagen comun, despues nombre tecnico. Una puerta metalica puede pasar
  a llamarse hoja cortafuegos una vez presentada; una plataforma arrancada puede
  explicar despues sus anclajes.
- Una escena introduce una novedad critica dominante. Puede contener atmosfera,
  relacion y decision, pero no obliga a comprender varios mecanismos nuevos a
  la vez.
- La ambiguedad sirve para identidad, intencion o fenomeno sobrenatural. No
  sirve para ocultar quien esta presente, que objeto cae, que salida se cierra o
  que riesgo toma una opcion.
- La primera aparicion de un PNJ contiene nombre, funcion y posicion. Su nombre
  no aparece en una consecuencia anterior a esa entrada diegetica.
- Una muerte o herida de riesgo fisico muestra la cadena causal: que cede o
  golpea, donde impacta la protagonista y por que no puede resolverse de
  inmediato. La intensidad puede ser adulta; la causalidad no puede ser opaca.
- Consecuencia y destino forman una sola progresion. La consecuencia resuelve
  el gesto anterior; el destino orienta y abre la nueva situacion, sin tres
  arranques de crisis consecutivos.

## Responsabilidades

### Director de puesta en escena

- Entrega escaleta visible por nodo y una lectura de riesgo por opcion.
- Marca vocabulario tecnico que necesita anclaje comun.
- Declara el momento exacto de entrada de cada PNJ relevante.
- Señala escenas que requieren lectura ciega humana: primeros riesgos letales,
  cambios espaciales, aparicion de entidad y finales fisicos.
- No altera flags, requisitos, recursos, rutas ni desenlaces.

### Narrador

- Escribe desde la escaleta aprobada y conserva sus prioridades de revelacion.
- Puede cambiar palabras, ritmo y tono; no puede ocultar la imagen causal que
  hace justa una decision.

### Validador

- Ejecuta `qa:puesta-escena` sobre el turno ensamblado.
- Trata PNJ anticipado como defecto objetivo; trata saturacion tecnica,
  orientacion y referentes ambiguos como revision humana hasta calibracion.
- Lee al menos un turno por entrada de PNJ, riesgo letal y final material desde
  el punto de vista de una persona no especialista.

## Control y limites

`qa:puesta-escena` informa, no reescribe. Su primera version detecta:

- PNJ nombrado en consecuencia o situacion visible antes de estar presentado en
  la ruta;
- termino tecnico sin una imagen comun de apoyo en el mismo turno;
- acumulacion de tecnicismos en un turno ensamblado;
- longitud ensamblada que contradice la firma directa.

No intenta decidir automaticamente si una metafora es buena o si un pronombre
es elegante. Esos casos se muestran en la lectura ciega con la escena concreta.
Solo se elevara un aviso a bloqueo despues de fixtures, correccion demostrada y
calibracion humana.
