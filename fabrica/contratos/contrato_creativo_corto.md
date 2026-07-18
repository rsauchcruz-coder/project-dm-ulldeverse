# Contrato creativo corto

Estado: canon para crear mundos y escenas nuevas.

Este contrato es deliberadamente corto. No sustituye al QA ni a las checklists; evita que el acto creativo se convierta en burocracia.

## Brujula

Escribe escenas vivas, no informes del grafo.

## Cinco reglas

1. **Materia antes que explicacion**
   La escena debe poder tocarse: mano, puerta, agua, cera, voz, metal, ropa, luz, barro, humo.

2. **Continuidad visible**
   Cada escena debe cargar una consecuencia concreta de la decision anterior: objeto movido, deuda, herida, testigo, ruido, pista o puerta abierta.

3. **Objetos con funcion**
   Si un objeto aparece como recurso, debe cambiar algo real: acceso, coste, ruido, presion, relacion, informacion, dano, tiempo o final. Su uso debe dejar una capacidad cobrable, no solo otro flag.

4. **Personas con deseo**
   Los PNJ no son etiquetas de panel. Quieren algo, temen algo, esconden algo o presionan al jugador.

5. **Decisiones con coste**
   Cada opcion buena debe hacer que el jugador renuncie a algo: tiempo, sigilo, confianza, prueba, seguridad, autoridad o inocencia.

6. **Antes de la accion, orientacion**
   La introduccion jugable sitúa lugar y epoca, protagonista y papel, detonante
   y vinculos iniciales. La firma decide cuanto tarda en hacerlo; nunca permite
   empezar en mitad de una crisis que el jugador todavia no entiende.

## Prohibido mientras se escribe

- Explicar el menu de opciones dentro del texto.
- Resolver variantes con "si tiene", "si ha venido", "si no...".
- Usar objetos ausentes como si existieran.
- Nombrar un recurso controlado en una escena compartida si no esta en inventario, en la escena o bajo custodia declarada de un PNJ.
- Nombrar a un PNJ como si el jugador ya lo conociera cuando la ruta no ha
  mostrado antes su entrada diegetica; una ficha o un panel no cuentan como presentacion.
- Afirmar como cierto que un personaje esta presente o a salvo, que una deduccion esta probada o que una ruta sigue abierta si el estado de esa partida no lo sostiene.
- Inventar durante la prosa una ruta, amenaza, estado sensible o entidad propia que no figure en el libro `qa.realidad_controlada` aprobado por Arquitectura.
- Escribir consecuencias que funcionen igual con o sin recurso.
- Delatar en una opcion que falta una dosis, reserva, llave o prueba; la opcion muestra la accion y el peligro presente, no el estado oculto ni su desenlace.
- Contar en la consecuencia terminal la escena final completa: la consecuencia cambia la posicion y el final cobra lo que queda pendiente.
- Usar un objeto sin saber si lo controla el jugador, la escena o un PNJ.
- Tapar falta de continuidad con prosa bonita.

## Uso correcto

El generador y el narrador leen este contrato.

Tambien leen la firma confirmada de
`fabrica/contratos/experiencia_jugable_semilla_v1.md`. Este contrato garantiza
calidad comun; la firma decide que significan en ese mundo objeto, deduccion,
decision, error, ritmo y densidad.

El validador y el director usan ademas:

- `fabrica/checklists/aceptacion_mundo.md`
- `fabrica/contratos/world_schema_v1_canonico.md`
- `fabrica/contratos/realidad_controlada_v1.md`
- `scripts/qa/`
