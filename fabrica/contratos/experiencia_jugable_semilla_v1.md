# Contrato de experiencia jugable desde semilla v1

Estado: canon de interpretacion para semillas 1.2 y mundos futuros.

## Proposito

Convertir deseos expresados en lenguaje normal en una firma de experiencia que
obligue a Arquitecto y Narrador. El genero ambienta; la firma decide como se
lee, para que sirven objetos y deducciones, que clase de decisiones dominan y
como se paga un error.

No existen perfiles cerrados por genero. Dos thrillers, dos aventuras o dos
mundos de Terror pueden declarar firmas distintas.

## Interfaz humana

El Pregenerador no pregunta por campos tecnicos. Integra durante su entrevista
estas decisiones, adaptadas al mundo que esta naciendo:

1. Que actividad quiere que domine: sobrevivir, proteger, descubrir, demostrar,
   escapar, perseguir, negociar, explorar o decidir lealtades.
2. Si prefiere leer y valorar, alternar calma y estallidos, actuar con
   informacion incompleta o vivir sin descanso.
3. Que deberia significar encontrar algo importante: comprender, salvarse,
   abrir y cerrar caminos, obtener influencia o revelar algo comprometiendose.
4. Que debe aportar una deduccion: verdad, lectura del peligro, confrontacion,
   ruta o cambio relacional.
5. Que error acepta pagar: desgaste, perdida relevante, consecuencia
   irreversible o muerte.
6. Que victoria le resultaria satisfactoria. Esta respuesta confirma las dos o
   tres prioridades, no crea un final obligatorio.

Las preguntas pueden combinarse y no se repiten si el usuario ya dio la
respuesta espontaneamente. La entrevista completa conserva entre cinco y siete
preguntas mas confirmacion.

## Firma interna

`experiencia_jugable` contiene:

- `resumen_usuario`: una frase comprensible que el usuario confirma;
- `prioridades`: dos o tres verbos dominantes;
- `ritmo`: `pausado`, `variable`, `urgente` u `opresivo`;
- `densidad`: `directa`, `equilibrada` o `intensa`;
- `funcion_objetos`: efecto dominante de los pocos objetos valiosos;
- `funcion_deducciones`: capacidad que concede comprender algo;
- `naturaleza_decisiones`: coste dominante de elegir;
- `severidad_error`: techo de consecuencia aceptado;
- `horizonte_consecuencias`: distancia habitual entre decision y cobro.

La combinacion completa es el perfil. Los nombres de ejemplo son referencias de
calibracion, no enums ni plantillas de trama.

## Obligaciones de fabrica

### Arquitecto

- Diseña objetos, deducciones y decisiones segun la firma antes de escribir
  prosa.
- Demuestra que las dos prioridades pueden competir entre si.
- No convierte `letal` en azar: toda muerte exige peligro previo legible y una
  decision o limitacion causal.
- Hace que el horizonte declarado se cobre en menus, capacidades, posicion,
  personas o desenlaces; un flag sin lectura no cuenta.

### Narrador

- Usa la densidad como presupuesto editorial, no como cuota mecanica.
- Conserva en texto principal solo lo necesario para sentir, comprender la
  situacion y decidir.
- No explica la firma ni sus variables al jugador.
- Una experiencia directa puede ser rica; elimina rodeos, no materia ni voz.

### Director y Validador

- Comparan la experiencia renderizada con la firma, no con el genero.
- Rechazan un objeto que solo colorea texto cuando deberia salvar, condicionar,
  comprometer o conceder influencia.
- Rechazan una deduccion enciclopedica si fue declarada como lectura operativa
  del peligro.
- Tratan los presupuestos de texto como aviso hasta disponer de mas calibracion
  humana.

## Presupuestos editoriales iniciales

Son rangos orientativos por fragmento visible, no limites de schema:

| Densidad | Escena principal | Consecuencia | Opcion |
| --- | ---: | ---: | ---: |
| directa | 250-600 caracteres | 120-300 | 35-95 |
| equilibrada | 450-850 | 180-450 | 45-120 |
| intensa | 750-1250 | 250-650 | 60-160 |

Una escena puede salir del rango por necesidad dramatica. La desviacion se
revisa cuando se vuelve patron y contradice la experiencia confirmada.

## Firmas de calibracion

### Investigacion densa y moral

- prioridades: descubrir, demostrar, proteger;
- ritmo pausado o variable; densidad intensa;
- objetos que condicionan capacidades o revelan comprometiendo;
- deducciones que reconstruyen verdad;
- decisiones de coste moral y social;
- cobro cercano o diferido.

Referencia: `El testigo de Ulldecona`.

### Supervivencia visceral

- prioridades: sobrevivir, proteger;
- ritmo urgente u opresivo; densidad directa;
- objetos que salvan o destruyen;
- deducciones que leen el peligro;
- decisiones de riesgo fisico inmediato;
- error irreversible o letal y cobro inmediato o cercano.

Referencia de intencion: `El secadero`. No implica reconstruir el piloto.

### Thriller deductivo

- descubrir y demostrar;
- ritmo variable; densidad equilibrada o intensa;
- pruebas que comprometen y deducciones que habilitan confrontacion.

### Thriller de persecucion

- escapar, perseguir o proteger;
- ritmo urgente; densidad directa;
- objetos que abren o cierran rutas y decisiones de posicion.

### Drama relacional tenso

- negociar y decidir lealtades;
- ritmo pausado o variable;
- objetos con influencia y deducciones que alteran relaciones.

### Exploracion contemplativa con riesgo

- explorar y descubrir;
- ritmo pausado; densidad equilibrada;
- objetos que condicionan capacidades y decisiones de renuncia.

## Relacion con la ficha visible

La antigua `Fitxa d'experiencia dels mons` puede usar en el futuro una version
traducida y pequena de esta firma para orientar al jugador. No es la misma capa:
la firma interna gobierna produccion; la ficha visible comunica expectativas.

