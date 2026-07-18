# Economia causal de recursos v1

Estado: canon obligatorio para mundos nuevos.

Origen: aprendizaje de `La luz de Moura`, cerrado como corpus y no como mundo a
seguir corrigiendo.

## Proposito

Un objeto no es bueno porque aparezca dos veces. Es bueno cuando su posesion,
uso, consumo o cesion cambia de forma comprensible lo que el jugador puede
hacer despues.

Este contrato valida la arquitectura. No se entrega al Narrador como prompt
largo.

## Cinco reglas

1. **Ninguna opcion dominada**
   Si dos opciones visibles conservan el mismo destino y efecto, la que exige
   mas recursos o aumenta mas la presion debe aportar otra capacidad futura.

2. **Toda preparacion se puede cobrar**
   Un flag, pista clave o capacidad creada debe habilitar al menos una
   continuacion alcanzable desde ese estado real. No basta con que exista un
   lector del token en otra ruta incompatible.

3. **Custodia explicita**
   El mundo distingue objeto controlado por el jugador, presente en escena, en
   manos de un PNJ o fuera de escena. La prosa no puede usar un objeto sin
   requisito o fuente declarada.

4. **Balance por compensacion, no por igualdad**
   Los objetos no necesitan el mismo numero de usos o finales. Cada diferencia
   de amplitud debe compensarse con profundidad, menor coste, informacion,
   seguridad, relacion o una oportunidad exclusiva.

5. **La matriz organiza el trabajo, no el grafo**
   `MATRIX-01` compara la calidad de las tramas por rondas. No obliga a que
   tengan los mismos nodos, fases, menus ni ritmo topologico.

## Metadatos canonicos

Cada recurso nuevo declara:

- `custodia_inicial`: `jugador`, `escena`, `fuera_de_escena` o `pnj:<id>`;
- `terminos_visibles`: aliases que permiten reconocer usos narrados sin mirar
  tokens internos.

Un nodo puede declarar:

- `recursos_escena`: ids disponibles fisicamente sin pertenecer al jugador;
- `recursos_pnj`: mapa de PNJ a ids que siguen bajo su control.

Una opcion que usa un objeto sin exigirlo en inventario declara:

```json
{
  "fuentes_recursos": {
    "inv_silbato": "pnj:orduna"
  }
}
```

`fuentes_recursos` explica disponibilidad; no entrega el objeto ni sustituye un
cambio de inventario. Si la accion transfiere, consume o abandona el objeto,
debe escribir tambien el cambio material correspondiente.

`qa.preparaciones_clave` puede declarar pistas o estados cuya recompensa
mecanica es obligatoria. Los flags mecanicos se consideran preparacion por
defecto; una pista no declarada puede tener valor informativo solo en el panel.

## Puerta automatica

```bash
npm.cmd run qa:resources -- <world_v1.json>
npm.cmd run qa:resources:gate -- <world_v1.json>
npm.cmd run qa:resources:test
```

El modo `report` sirve para corpus heredados. El modo `gate` es obligatorio
para mundos nuevos antes de Narracion.

Bloqueos demostrables:

- `OPCION_DOMINADA_MECANICAMENTE`;
- `PREPARACION_INCOBRABLE`;
- `CUSTODIA_INICIAL_INCONSISTENTE`;
- `CUSTODIA_AMBIGUA_EN_ACCION`;
- `CUSTODIA_NO_DECLARADA` en modo `gate`.

`FLEXIBILIDAD_DESIGUAL_DE_RECURSOS` es siempre aviso para el Director. Una
asimetria puede ser intencional y no se corrige automaticamente.

## Excepciones

Solo el Director puede aceptar una desviacion mediante
`qa.excepciones_justificadas`, indicando `codigo`, `elementos` y `motivo`.
La excepcion convierte el bloqueo en aviso visible; nunca lo oculta.

## Salida del Arquitecto

Antes de narrar, cada mundo conserva una matriz breve con:

| Recurso | Custodia | Uso principal | Uso alternativo | Coste | Capacidad cobrable | Familias posibles |
| --- | --- | --- | --- | --- | --- | --- |

La tabla se aprueba por relaciones causales, no por simetria numerica.
