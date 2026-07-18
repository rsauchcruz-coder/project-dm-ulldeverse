# Controles de agencia y desenlace v1

Estado: implementado en modo `report` y en calibracion antes de activarlo como
`gate`; aplicado ya a la reapertura arquitectonica de `El secadero`.

## Proposito

Evitar tres fallos que un grafo valido puede ocultar:

1. una opcion co-visible que es objetivamente peor que otra;
2. una consecuencia que ya cuenta el final y lo deja sin funcion;
3. un nodo jugable que el runtime presenta como final.

Estos controles son validacion. No se incorporan al prompt del narrador ni se
convierten en lenguaje visible para el jugador.

## Regla de despliegue

La primera implementacion funciona en modo `report` sobre los corpus existentes.
Despues de calibrar falsos positivos con Ulldecona, Jano y Secadero, se activa
como `gate` para cualquier mundo nuevo o mundo reabierto. No se migra ningun
mundo cerrado solo para rellenar metadatos.

## Control 1: dominancia de desenlace

### Pregunta

Entre dos opciones que aparecen juntas, puede una conservar todos los beneficios
de la otra y evitar todos sus costes? Si es asi, la peor no es una decision: es
contenido de completista o una derrota voluntaria mal situada.

### Metadato minimo

Cada final de un mundo nuevo declara, fuera del texto visible:

```json
{
  "qa": {
    "perfil_desenlace": {
      "beneficios": ["leo_a_salvo", "mara_a_salvo", "prueba_publica"],
      "costes": ["elena_atrapada"],
      "postura": "sacrificio"
    }
  }
}
```

- `beneficios`: hechos que el jugador razonable puede querer preservar.
- `costes`: perdidas, renuncias o riesgos ya cobrados por el final.
- `postura`: etiqueta no ordenable para conservar finales diferentes que no deben
  compararse solo como puntuacion, por ejemplo `huida`, `verdad`, `sacrificio` o
  `custodia`.

El perfil pertenece al final, no a la prosa ni al inventario. Una variante final
que cambie el resultado material declara su propio perfil en `qa`.

Cuando una opcion reclama un riesgo concreto que debe sobrevivir hasta el
cierre, puede declarar `qa.riesgo_cobrable` con el id del coste esperado. Asi el
analizador no confunde cada aumento intermedio de presion con una deuda final.

### Algoritmo

Para cada par de opciones co-visibles, el analizador enumera los finales
alcanzables en el horizonte declarado. Una familia A domina una familia B si:

- los beneficios de A contienen todos los de B;
- los costes de A son subconjunto de los de B;
- al menos una de las dos relaciones es estricta;
- la comparacion no esta excluida por una postura declarada como incompatible.

Resultados:

- `DESENLACE_DOMINADO`: bloqueo cuando una opcion solo abre resultados dominados.
- `RIESGO_SIN_COBRO`: bloqueo cuando una opcion declara presion, consumo o
  exposicion y el resultado no conserva ningun coste correspondiente.
- `DILEMA_NO_ORDENABLE`: apto informado cuando las posturas son incompatibles y
  ambas tienen precio real.

### Aplicacion a Secadero

Recoger el registro conduce a `mara_a_salvo + prueba_publica`; dejarlo solo a
`mara_a_salvo`. La presion adicional no llega al perfil final como coste. Es
`DESENLACE_DOMINADO`, no una diferencia de ruta suficiente.

## Control 2: frontera accion-final

### Pregunta

Cuando una opcion llega a un final, la consecuencia cuenta el cambio inmediato
y el final muestra su alcance? O ambos cuentan la misma evacuacion, gesto o
revelacion?

### Metadato minimo

No requiere ampliar el schema. Usa datos ya existentes:

- `opcion.consecuencia`;
- destino efectivo de la opcion, incluidas resoluciones ordenadas;
- `texto_final` o `texto_base` del final y su variante aplicable.

### Algoritmo

El analizador compara consecuencia y final en todas las transiciones terminales.
Extrae actores, objetos, verbos de resolucion y frases con alta coincidencia. Un
aviso solo aparece si coinciden al menos dos anclas materiales y un acto central
(por ejemplo, Elena, porton, hermanos y cruzar/salir).

Resultados:

- `FINAL_REITERADO`: bloqueo si la consecuencia resuelve y describe la misma
  accion irreversible que el final, sin material nuevo suficiente.
- `FRONTERA_FINAL_A_REVISAR`: aviso si hay solape tematico plausible que necesita
  lectura humana.
- `FRONTERA_FINAL_APTA`: control positivo cuando la consecuencia deja una deuda,
  posicion o peligro y el final la cobra.

El control nunca reescribe texto: muestra ambos fragmentos enfrentados.

### Aplicacion a Secadero

`o65_sostener_con_inhalador` cuenta que los hermanos alcanzan el exterior y el
final vuelve a contar que los dos cruzan. Debe bloquear la entrega.

## Control 3: final real de runtime

### Pregunta

Puede el servidor o la interfaz marcar como final una escena que aun ofrece
acciones ejecutables?

### Metadato minimo

Cada mundo nuevo declara rutas de humo representativas en `qa`:

```json
{
  "qa": {
    "rutas_smoke_runtime": [
      {
        "id": "corredor_no_final",
        "acciones": ["o02", "o08", "o13"],
        "espera": { "nodo": "n08", "final": false }
      },
      {
        "id": "rescate_porton",
        "acciones": ["o02", "o08", "o13", "o28"],
        "espera": { "final": true, "perfil": "rescate" }
      }
    ]
  }
}
```

El servidor expone solo para QA el identificador tecnico de nodo resuelto, sin
mostrarlo en la interfaz de jugador. Las acciones siguen usando ids en el
smoke, nunca texto narrativo fragil.

### Algoritmo

El smoke inicia el mundo por HTTP, ejecuta cada ruta y afirma:

- si `final: false`, `is_final_real` es falso y hay entre dos y cuatro acciones;
- si `final: true`, `is_final_real` es verdadero y no hay acciones;
- el nodo tecnico resuelto coincide con el esperado;
- el destino del adaptador y la respuesta HTTP coinciden;
- ninguna accion imposible aparece tras aplicar estado.

Resultados:

- `FINAL_FALSO_RUNTIME`: bloqueo de release.
- `FINAL_SIN_CIERRE_RUNTIME`: bloqueo de release.
- `RUTA_SMOKE_DESINCRONIZADA`: bloqueo de QA; la ruta o el mundo cambiaron sin
  actualizar su prueba.

## Orden de implementacion

1. Crear fixtures negativos de los tres casos de Secadero y tests que fallen.
2. Implementar los tres analizadores en modo `report`.
3. Ejecutarlos sobre Ulldecona, Jano y Moura; clasificar avisos.
4. Ajustar el contrato solo si la calibracion descubre un metadato insuficiente.
5. Activar `gate` para Secadero y para mundos nuevos.
6. Reabrir la arquitectura de Secadero desde la camara de Mara y narrar solo el
   tramo que pase las puertas.

## Limite deliberado

Estos controles no deciden que final es "mejor" artisticamente. Detectan cuando
el propio mundo promete una opcion que conserva todos los resultados valiosos de
otra sin asumir su precio. La tension, la voz y la legitimidad moral siguen
requiriendo lectura humana.
