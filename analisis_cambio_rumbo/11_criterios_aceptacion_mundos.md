# Criterios de aceptacion de mundos

Un mundo solo debe entrar como aceptado si cumple estos criterios. Cargar sin error no basta.

## Veredicto posible

- `APTO`: puede jugarse y representa el nivel del proyecto.
- `APTO CON AVISOS`: puede jugarse, pero tiene mejoras no bloqueantes.
- `NO APTO`: no debe jugarse salvo para depurar.

## 1. Criterios duros de continuidad

Un mundo es `NO APTO` si:

- ofrece usar un objeto que el jugador no tiene;
- nombra un personaje no presentado como si ya fuera conocido;
- permite una opcion imposible segun ubicacion, inventario o estado;
- cambia la ubicacion sin puente narrativo;
- olvida una consecuencia importante tomada antes;
- contradice un estado visible de personaje, objeto o lugar;
- presenta una salida o ruta que no existe en el grafo.

## 2. Criterios duros de idioma

Un mundo es `NO APTO` si:

- aparecen palabras accidentales en catalan u otro idioma en texto visible;
- hay errores ortograficos frecuentes;
- hay mojibake o caracteres rotos;
- se mezclan nombres de campos o tokens en la narrativa visible;
- el texto visible usa lenguaje de motor: `flag`, `recurso`, `estado`, `nodo`, `trigger`, `pressio_delta`.

Excepcion: otro idioma puede aparecer si forma parte diegetica clara del mundo.

## 3. Criterios de accion

Cada opcion debe:

- salir de algo presentado en la escena;
- tener verbo de accion;
- tener objeto, persona, lugar o intencion concreta;
- poder ejecutarse con el estado actual;
- indicar riesgo o coste cuando sea importante.

No son aceptables como opcion principal:

- "explorar";
- "investigar";
- "avanzar";
- "usar recurso";
- "tomar decision";
- "hacer un intento";
- cualquier categoria sin cuerpo.

Pueden usarse solo si van concretadas:

- "Explorar el pasillo siguiendo las marcas de barro."
- "Investigar la silla que alguien acaba de arrastrar."

## 4. Criterios de mundo fisico

Cada nodo no final debe tener:

- ubicacion clara;
- objeto, persona, rastro o amenaza concreta;
- cambio perceptible respecto al nodo anterior;
- al menos una cosa con la que interactuar;
- presion sensorial o social si el genero lo exige.

El jugador debe saber:

- donde esta;
- que tiene cerca;
- que puede intentar;
- que parece peligroso;
- que acaba de cambiar.

## 5. Criterios de presion y estado

Si el mundo usa tension, amenaza, deterioro o persecucion, debe existir movimiento de estado.

Para mundos de terror, supervivencia o thriller:

- presion congelada = `NO APTO`;
- presion solo numerica = aviso fuerte;
- presion debe verse en escena;
- decisiones ruidosas, lentas, violentas o arriesgadas deben tener coste;
- alivios deben ser raros o costosos.

La presion no tiene por que ser visible como barra. Debe ser medible por el motor y sensible en la ficcion.

## 6. Criterios de inventario y pistas

Inventario:

- solo muestra objetos poseidos;
- cada objeto importante tiene funcion potencial;
- usar un objeto debe consumirlo, cambiarlo o dejar residuo cuando proceda;
- no se ofrecen objetos ausentes.

Pistas:

- deben estar sembradas antes de ser necesarias;
- no deben aparecer como checklist frio si se puede evitar;
- pueden mostrarse como notas, recuerdos o descubrimientos;
- una pista critica debe tener al menos una oportunidad clara de obtenerse.

## 7. Criterios de finales

Cada final debe:

- tener texto propio;
- tener titulo no generico;
- responder a decisiones previas;
- mostrar residuo fisico o humano;
- no contradecir presion, inventario o flags;
- sentirse consecuencia, no resumen administrativo.

Un mundo es `NO APTO` si aparece:

- "Final";
- "La partida termina segun las decisiones acumuladas";
- "El desenlace queda cerrado";
- cualquier cierre equivalente sin escena concreta.

## 8. Criterios de duracion

Objetivo general:

- partida ideal de unos 10 minutos.

Aceptable:

- partidas muy cortas si el jugador muere o fracasa de forma coherente;
- partidas mas largas si el mundo lo justifica.

No aceptable:

- alargar por relleno;
- rutas que terminan antes de entender el conflicto salvo muerte/fracaso deliberado;
- mundos que exigen relectura por confusion, no por densidad atmosferica.

## 9. Criterios de rejugabilidad

El mundo debe provocar:

- ganas de probar otra ruta;
- diferencia real entre decisiones;
- finales o consecuencias diferentes;
- sensacion de que habia mas mundo del visto.

Casa Mare Llucia se considerara arreglada cuando se puedan jugar al menos seis finales distintos sin detectar pegas graves de continuidad, accion, idioma o estado.

## 10. Criterios de fabrica

Un mundo generado por la fabrica debe incluir:

- premisa;
- genero;
- contrato de voz;
- jugador;
- limitacion del jugador si existe;
- PNJ con agenda si existen;
- recursos incompatibles;
- presion o estado central si el genero lo exige;
- grafo;
- guided module;
- finales;
- reporte QA.

No se acepta mundo sin reporte.

## 11. Criterios de interfaz

Al probarlo en UI:

- debe ser jugable en smartphone;
- acciones naturales deben ser visibles antes que categorias;
- ubicacion, interactuables e inventario deben estar claros;
- la informacion de motor debe estar oculta;
- el historial debe sentirse como cuaderno o novela, no como log tecnico.

## 12. Pruebas minimas antes de aceptar

Cada mundo debe pasar:

1. Validacion JSON/schema.
2. Validacion de grafo.
3. Auditoria de idioma.
4. Auditoria de opciones imposibles.
5. Auditoria de presion/estado.
6. Simulacion de rutas.
7. Revision de finales.
8. Partida manual rapida.
9. Partida manual buscando romper continuidad.
10. Informe final.

## 13. Umbral de calidad profesional

Un mundo es profesional si:

- no obliga al usuario a auditarlo quince veces;
- no produce pegas graves en dos partidas seguidas;
- mantiene continuidad;
- permite perder o ganar de forma coherente;
- tiene voz adecuada al genero;
- se puede recomendar sin pedir disculpas.

## 14. Criterio de aprobacion final

El Director solo puede declarar `APTO` si:

- QA automatica no tiene fallos duros;
- los avisos estan justificados o corregidos;
- una partida manual confirma que se entiende y se juega;
- el mundo respeta la esencia del proyecto;
- el usuario no detecta fallos de continuidad evidentes en una prueba corta.

