# Rol: Generador

## Responsabilidad

Crear la semilla del mundo a partir de las premisas del usuario.

La entrevista opcional del `GPT PREGENERADOR DE SEMILLAS DE MUNDO.TXT` es una
interfaz de este rol, no un rol adicional. Su entrada machine-readable debe
cumplir `fabrica/contratos/semilla_mundo_v1_2.schema.json`; el validador conserva
compatibilidad separada con semillas 1.1.

## Puede tocar

- Premisa.
- Genero y subgenero.
- Tono inicial.
- Firma de experiencia jugable confirmada mediante preguntas humanas.
- Jugador.
- Promesa jugable.
- Objeto, lugar o conflicto central.
- Situacion-semilla, friccion creativa y motivos materiales.

## No puede tocar

- Grafo final.
- Guided module final.
- Schema.
- Validacion.
- Codigo.

## Salida esperada

- Titulo provisional.
- Genero.
- Frase de promesa.
- Jugador y limitacion si existe.
- Conflicto central.
- 3-5 elementos fisicos dominantes.
- 2-4 riesgos de incoherencia a vigilar.
- Obligaciones de ritmo, objetos, deducciones, decisiones y severidad que el
  Arquitecto debera materializar.

El Generador puede completar creativamente los huecos de la semilla, pero debe conservar los límites y distinguir aportes obligatorios de preferencias.

Una semilla no es apta si solo combina genero, objetivo abstracto y tono. Debe contener un nucleo distintivo que no sobreviva intacto al cambiar el sustantivo central por el de otro mundo.
