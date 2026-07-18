# Preflight de agencia

Estado: canon operativo inicial.

Fecha: 2026-07-10

## Proposito

Impedir que una arquitectura con muchas combinaciones pero pocas consecuencias
llegue a Narracion y partida humana como si ofreciera rutas reales.

El preflight se ejecuta sobre el esqueleto estructural del mundo, antes de la
prosa final. No evalua estilo literario.

Diseno razonado:

- `../drafts/2026-07-10_diseno_preflight_agencia.md`

## Lugar en la fabrica

```text
Semilla
-> Arquitectura
-> Esqueleto world_v1
-> Preflight de agencia
-> Narracion
-> Compilacion
-> QA completo
-> Partida humana
```

El Validador actua antes del Narrador y despues del Compilador. No se crea un
agente nuevo.

## Perfil inicial

`aventura_corta_reactiva` exige como minimo:

- 2 rutas principales;
- al menos 2 familias de desenlace; superar 4 genera aviso de inflacion;
- al menos 2 recursos opcionales con uso diferencial;
- presion consultada en 2 crisis;
- una derrota o fracaso entre turnos 3 y 5;
- no mas de 2 nodos obligatorios consecutivos despues de separar rutas;
- mas de un menu de climax, o una ruta que termine o tenga climax propio.

Estos umbrales pertenecen al perfil. No son reglas universales para todos los
generos.

## Bloqueos

- Ruta declarada sin memoria causal posterior.
- Menos de 2 familias de desenlace.
- Menu final completo universal para todas las rutas.
- Corredor obligatorio largo que borra recorridos.
- Recurso clave sin efecto diferencial.
- Recurso equivalente a una alternativa gratuita o intercambiable.
- Presion modificada pero no consultada.
- Derrota temprana ausente cuando el perfil la exige.
- Estado clave escrito y nunca leido.
- Finales inaccesibles, destinos rotos o estados sin salida.
- Promesa causal declarada que no conserva ningun cobro mecanico o final.
- Sustitucion tardia gratuita de una preparacion declarada como exclusiva o con coste.
- Estado sensible de final que desaparece sin cobro previo ni justificacion.

## Matriz causal previa a Narracion

- [ ] Hay entre tres y siete promesas centrales, no una promesa por flag.
- [ ] Cada promesa declara origen, token, horizonte y cobro minimo.
- [ ] Cada promesa tiene un historial con ella y otro sin ella.
- [ ] Las relaciones por bandas compran estilos distintos, no solo mas opciones.
- [ ] Los avisos inferidos de valor marginal han sido clasificados por Direccion.

## Comandos

Preflight generico:

```bash
npm.cmd run qa:agency -- --profile=aventura_corta_reactiva <mundo.json>
```

Linea base de Jano:

```bash
npm.cmd run qa:agency:jano
```

Regresion del detector:

```bash
npm.cmd run qa:agency:test
```

`qa:agency:jano` debe devolver `NO_APTO_PARA_NARRAR` hasta que la arquitectura
causal se redisene. Ese resultado es correcto y no contradice que `qa:world`
pueda considerar Jano una alfa integra y jugable.
