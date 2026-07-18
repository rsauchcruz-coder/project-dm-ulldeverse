# Metadatos de presentacion expediente v1

Fecha: 2026-07-15

Estado: contrato de fabrica para mundos nuevos y para cualquier mundo que se
prepare para la interfaz de expediente audiovisual.

## Proposito

El mundo declara solo informacion semantica que una interfaz no puede deducir
sin degradar la partida: como se llama cada hoja del recorrido, que tres cosas
merecen consulta en una escena y como resumir una localizacion en movil.

Estos metadatos no contienen CSS, colores, coordenadas, assets, orden de
pantalla ni logica jugable. El motor puede ignorarlos sin cambiar requisitos,
estados, rutas, presion ni finales.

## Activacion y compatibilidad

El mundo que adopta el contrato declara:

```json
{
  "qa": {
    "presentacion_expediente": {
      "version": 1,
      "obligatoria": true
    }
  }
}
```

Los mundos anteriores sin este bloque siguen siendo compatibles mediante
valores de reserva del cliente. Los mundos nuevos de fabrica deben activarlo.

## Hoja inicial y hojas de decision

`estado_inicial.titulo_hoja_inicial` es obligatorio. Tiene entre una y cuatro
palabras y nombra el primer folio: normalmente `Prólogo`.

Toda opcion jugable declara `titulo_hoja_destino`. Nombra el folio que abre la
decision, no el nodo tecnico ni solo el lugar de llegada.

```json
{
  "titulo_hoja_destino": "La huida"
}
```

Reglas:

- texto visible en la lengua del mundo; en los mundos actuales, castellano;
- entre una y cuatro palabras y sin ids, numeros de nodo ni terminos tecnicos;
- distinto de las otras opciones co-visibles del mismo nodo;
- valido para cualquier resolucion legal de esa opcion;
- no revela una persona, objeto o resultado que el jugador aun no conoce;
- no se repite dentro de una misma ruta alcanzable de hojas.

La consecuencia existente se muestra al inicio del folio nuevo. No se duplica
ni se mueve en el JSON.

## Localizacion compacta

Todo nodo y final puede declarar `ubicacion_corta`, de una a tres palabras.
Se utiliza en la ruta horizontal de movil. Si falta, el cliente puede derivarla
de `ubicacion`, pero los mundos que activan el contrato deben declararla.

## Focos de consulta

Todo nodo y final declara `focos_consulta`: una lista de cero a tres focos.
Un foco es consulta, nunca una accion: no concede pista, recurso, relacion ni
cambio de estado.

```json
{
  "id": "foco_cadena",
  "etiqueta": "Cadena reparada",
  "tipo": "objeto",
  "referencia": "recurso:inv_eslabon_repuesto",
  "requisitos": [],
  "requisitos_ausentes": []
}
```

Cada foco declara `id`, `etiqueta`, `tipo` y exactamente una de estas fuentes:

- `referencia`: `pnj:<id>`, `recurso:<id>` o `pista:<id>`, con id existente;
- `descripcion`: dato local ya visible en esa escena.

Tipos estables: `personaje`, `objeto`, `pista`, `entorno`, `salida`,
`documento` y `peligro`.

`requisitos` y `requisitos_ausentes` son opcionales y usan la misma gramatica
de estado que una opcion. Sirven para que un foco no aparezca cuando su entidad
no existe, no es visible o no ha sido conocida en esa partida.

Reglas:

- el foco debe describir algo ya visible en el estado actual; no puede adelantar
  una deduccion o presentar una entidad nueva;
- las etiquetas son unicas dentro de cada escena;
- un foco con `referencia` debe pasar sus guardas y la entidad debe ser
  compatible con la escena; un PNJ debe estar presente;
- el texto de `descripcion` no puede sustituir una opcion ni dar informacion
  nueva que exija `pistas_agregar`;
- no se listan elementos decorativos ni se duplica sistematicamente
  `entorno_visible`.

## Validacion

El lint narrativo activa `qa:presentacion_expediente` cuando el bloque es
obligatorio. Bloquea campos ausentes, titulos tecnicos, repeticiones de ruta,
focos mal formados, referencias rotas, focos imposibles por estado y focos que
presenten un PNJ fuera de escena.

La interfaz decide la posicion exacta de los focos sobre la imagen. Esa
informacion visual no pertenece al mundo.
