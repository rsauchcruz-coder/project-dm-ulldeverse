# Contrato de semilla de mundo v1.2

Estado: canon de entrada creativa para mundos nuevos.

## Propósito

La semilla convierte la intención del usuario en una premisa distintiva sin diseñar la arquitectura. Es la entrada del Generador al Arquitecto y no sustituye `world_schema_v1_canonico.md`.

## Reglas

- La semilla puede proponer situación, foco, fricción e imágenes físicas, pero no contiene trama completa, escenas, grafo, soluciones ni finales.
- Solo `obligatorio` compromete la presencia de un aporte.
- `preferencia` permite reinterpretación coherente.
- Los límites de contenido son vinculantes.
- Lo no especificado queda bajo autoridad de la fábrica; no necesita enumerarse campo por campo.
- Los ejes expresan orientación creativa, no valores del runtime.
- `experiencia_jugable` expresa una obligacion de diseno, no una mecanica de
  runtime ni una plantilla de genero.
- Una semilla genérica no es apta aunque todos sus campos estén completos.
- La promesa debe depender del núcleo distintivo y expresar acciones o decisiones imaginables.
- La salida machine-readable debe validar contra el schema de su version:
  `semilla_mundo_v1_2.schema.json` para semillas nuevas y el schema 1.1 para
  legado sin adaptar.
- La validación se ejecuta con `npm.cmd run qa:seed:schema -- <semilla.json>` antes de la puerta del Director.

## Campos

- `tipo_documento`: constante `semilla_mundo`.
- `version`: constante `1.2` para semillas nuevas. Las semillas 1.1 conservan
  validacion propia y solo se adaptan con una firma de experiencia explicita.
- `origen`: quién produjo y confirmó la semilla.
- `familia_experiencia`: uno o más géneros libres y subgéneros opcionales.
- `nucleo_distintivo`: fantasía del jugador, situación, foco, fricción, tensión temática y motivos materiales.
- `promesa_jugable`: acción y sensación buscadas, sin cerrar la trama.
- `papel_jugador`: papel o limitación solo cuando fueron expresados.
- `orientacion.ejes`: máximo tres orientaciones relevantes.
- `experiencia_jugable`: traduccion interna de las preferencias humanas sobre
  prioridades, ritmo, densidad, objetos, deducciones, decisiones y gravedad del
  error. Se rige por `experiencia_jugable_semilla_v1.md`.
- `aportaciones_personales`: elementos aportados, separados individualmente por obligatoriedad.
- `limites_contenido`: contenido prohibido, fuera de plano o moderado.
- `libertad_creativa`: cuánto puede reinterpretar la fábrica las preferencias.
- `notas_para_codex`: ambigüedades, tensiones o transformaciones de referencias; nunca instrucciones de trama.

## Relación con el mundo final

Codex convierte la semilla en una propuesta del Generador que deberá incluir título provisional, género, promesa, jugador, conflicto central, materia dominante, firma de experiencia y riesgos de incoherencia. El Arquitecto decide después estructura, estados, presión, recursos y finales, pero debe justificar como objetos, deducciones y decisiones materializan la firma y superar `qa:agency` antes de Narración.

## Puerta humana de aceptación

Antes de aceptar una semilla, comprobar:

- no serviría igual cambiando solo el sustantivo central;
- permite imaginar qué hará el jugador;
- contiene una fricción propia del concepto;
- ofrece entre tres y cinco motivos materiales;
- conserva abiertas la verdad, la solución y los finales.
- la firma de experiencia describe como se jugara sin fijar trama ni finales;
- las dos o tres prioridades pueden entrar en conflicto real.
