# Persistencia causal de decisiones v1

Estado: contrato normativo para mundos `world_v1`.

## Proposito

Una decision no queda validada porque escriba un flag, entregue un objeto o
abra un destino distinto. La diferencia debe seguir siendo observable y
cobrable cuando las rutas reconvergen.

Este contrato se aplica a las pocas promesas centrales de cada mundo. No debe
convertir cada detalle de estado en una promesa ni multiplicar variantes sin
valor jugable.

## Reglas

1. Una preparacion clave no puede regalarse mas tarde con la misma capacidad y
   sin un coste equivalente.
2. Mencionar un flag en una frase no es cobrarlo. El cobro cambia menu, coste,
   presion futura, acceso, custodia, informacion, relacion o desenlace.
3. Una accion generica no puede reproducir todas las capacidades de una prueba,
   herramienta o preparacion especial.
4. Un delta de presion es mecanico solo si existe un lector posterior desde su
   postestado. La consecuencia o el final pueden cobrarlo de forma visible.
5. Toda opcion declarada necesita al menos un estado legal del runtime.
6. Un final que recibe estados sensibles distintos debe diferenciarlos mediante
   variante efectiva, perfil, coste cobrado antes o justificacion declarada.
7. Una variante temprana no puede tapar siempre una memoria clave de ruta,
   relacion, prueba o presion.
8. La respuesta a una alerta causal sigue este orden: enriquecer el cobro,
   diferenciar el coste, reubicar la recompensa, justificar la reconvergencia y,
   solo al final, eliminar contenido.

## Declaracion minima

El Arquitecto declara entre tres y siete promesas centrales:

```json
{
  "qa": {
    "promesas_causales": [
      {
        "id": "ayuda_exterior_operativa",
        "origenes": ["o11_alertar_bomberos"],
        "contrafactuales": ["o12_seguir_plano_aire"],
        "token": "flag_ayuda_alertada",
        "tipo": "ayuda",
        "horizonte_max": 8,
        "cobro_minimo": ["menu", "coste", "perfil_final"],
        "sustitucion_tardia": "solo_con_coste",
        "estado_sensible_final": true
      }
    ],
    "estados_sensibles_final": [
      "flag_ayuda_alertada"
    ]
  }
}
```

`contrafactuales` es opcional, pero recomendado cuando el origen no comparte
menu con una alternativa clara. Permite comparar la promesa con la decision
humana correcta y no con cualquier rama accidental.

Cobros validos:

- `menu`: aparece o desaparece una capacidad concreta;
- `coste`: cambia presion, consumo, daño, custodia o renuncia;
- `acceso`: cambia un destino o paso posible;
- `informacion`: crea una deduccion o autoridad de prueba exclusiva;
- `relacion`: abre cooperacion, distancia util o una respuesta distinta;
- `variante_final`: cambia materialmente la escena final;
- `perfil_final`: cambia beneficios, costes o postura del desenlace.

`texto` por si solo nunca satisface el cobro minimo.

## Relaciones

Las variables relacionales se declaran por bandas alcanzables:

```json
{
  "variable": "confianza_albert",
  "bandas": [
    { "id": "baja", "max": -1 },
    { "id": "neutra", "min": 0, "max": 0 },
    { "id": "alta", "min": 1 }
  ],
  "cobros_minimos_por_banda": 1
}
```

Una banda no es mejor por ofrecer mas botones. Debe producir un estilo propio:
cooperacion, distancia, control, autoridad, informacion o coste distinto.

## Matriz obligatoria del Arquitecto

| Decision o preparacion | Estado creado | Coste inmediato | Primer cobro | Cobro tardio | Sin ella | Memoria final |
| --- | --- | --- | --- | --- | --- | --- |

La matriz se entrega antes de Narracion y debe enlazar cada fila con una entrada
de `qa.promesas_causales`.

## QA

Codigos principales:

- `PROMESA_NEUTRALIZADA`: la preparacion declarada no conserva ningun cobro
  material dentro de su horizonte;
- `SUSTITUCION_TARDIA_GRATUITA`: una ruta posterior entrega la misma capacidad
  sin el coste exigido;
- `FINAL_IGNORA_ESTADO_SENSIBLE`: el mismo final y perfil reciben presente y
  ausente un estado declarado sensible;
- `FINAL_SIN_PERFIL_DESENLACE`: un mundo con persistencia causal activa deja un
  final sin beneficios, costes y postura declarados;
- `VARIANTE_SOMBREADA_CLAVE`: una variante anterior tapa la memoria causal;
- `DELTA_PRESION_SIN_LECTOR_POSTERIOR`: la presion cambia y no vuelve a ser
  consultada;
- `RECURSO_SIN_VALOR_MARGINAL`: usar el recurso no mejora materialmente la
  alternativa contrafactual;
- `BANDA_RELACIONAL_SIN_COBRO`: una banda alcanzable no cambia menu, variante o
  perfil de forma diferencial;
- `OPCION_INALCANZABLE`: ninguna partida legal del runtime puede mostrarla.

```bash
npm.cmd run qa:causal -- <world_v1.json>
npm.cmd run qa:causal:gate -- <world_v1.json>
npm.cmd run qa:causal:test
```

`report` muestra bloqueos demostrables y candidatos editoriales. `gate` falla
solo por promesas o estados sensibles declarados y por contradicciones
demostrables; los candidatos inferidos permanecen como avisos.
