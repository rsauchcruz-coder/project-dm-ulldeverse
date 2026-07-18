# Contrato de estilo visual v1

Fecha: 2026-07-16  
Estado: **contrato de fabrica para produccion audiovisual**

## 1. Proposito

`visual_style_contract_v1` define la identidad visual persistente de un mundo sin acoplarla a un proveedor, modelo, interfaz o formato de generacion concreto.

El contrato permite regenerar, sustituir o ampliar assets manteniendo continuidad de epoca, arquitectura, personajes, objetos, luz, encuadre y tono.

No modifica `world_v1`, no contiene logica jugable y no es consumido directamente por el motor narrativo.

## 2. Autoridad

La informacion narrativa y causal procede siempre del `world.json`.

El contrato visual puede interpretar esa informacion como direccion artistica, pero no puede:

- introducir personajes, objetos, lugares o hechos nuevos;
- adelantar pistas, identidades o consecuencias;
- convertir una sospecha en hecho visible;
- contradecir inventario, heridas, relaciones, ubicaciones o estado;
- sustituir una decision jugable por una explicacion visual.

La imagen representa el mundo; no lo reescribe.

## 3. Independencia de proveedor

El contrato no debe contener:

- nombres de modelos de ChatGPT, Gemini u otros proveedores;
- parametros propietarios de una API;
- limites de cuenta o plan;
- instrucciones de descarga o publicacion;
- rutas de runtime;
- coordenadas de interfaz;
- CSS o maquetacion.

Los datos del proveedor usado se registran en el manifest de produccion y en el historial de generacion, nunca en la identidad visual canonica.

## 4. Estructura minima

Cada contrato declara:

```json
{
  "schema_version": "visual_style_contract_v1",
  "world_id": "string",
  "version": 1,
  "status": "draft | approved | deprecated",
  "source_world": "worlds/...json",
  "language_visible": "Castellano",
  "direction": {},
  "continuity": {},
  "composition": {},
  "forbidden": [],
  "validation": {}
}
```

## 5. Bloque `direction`

Describe la direccion general del mundo:

- `medium`: tratamiento visual general;
- `period`: epoca y marco material;
- `genre_tone`: atmosfera derivada del genero y del contrato de voz;
- `material_language`: materiales y texturas dominantes;
- `lighting`: fuentes de luz plausibles;
- `palette_language`: descripcion semantica de la paleta, sin colores de interfaz;
- `detail_level`: grado de realismo y densidad;
- `camera_language`: distancia, altura y dinamica de encuadre.

## 6. Bloque `continuity`

Fija reglas persistentes:

- los personajes usan referencias aprobadas cuando existan;
- edad aparente, constitucion, vestuario base, heridas y accesorios no cambian sin causa del mundo;
- un objeto conserva forma, material, desgaste y escala;
- una localizacion conserva arquitectura, accesos y elementos estructurales;
- los cambios causales visibles se documentan como variantes, no como reinterpretaciones libres.

El contrato puede definir categorias de referencia, pero las fichas concretas de PNJ, objetos y lugares pertenecen al paquete audiovisual del mundo.

## 7. Bloque `composition`

Debe priorizar la experiencia `smartphone-first`:

- lectura clara en formato vertical o recorte movil;
- siluetas y objetos importantes distinguibles a pequeno tamano;
- espacio util para focos de consulta cuando corresponda;
- ausencia de texto generado dentro de la imagen;
- ausencia de informacion esencial situada solo en un borde recortable;
- encuadres que no confundan elementos consultables con acciones.

La imagen puede reservar zonas limpias para interfaz, pero las coordenadas definitivas pertenecen al manifest de runtime o al cliente.

## 8. Bloque `forbidden`

Incluye prohibiciones generales y especificas del mundo:

- anacronismos;
- esteticas incompatibles;
- personajes no presentes;
- pistas futuras;
- texto incrustado;
- marcas de agua;
- UI falsa;
- elementos que parezcan pulsables sin funcion;
- violencia o deterioros no autorizados por el estado.

## 9. Versionado

Una revision editorial menor que no cambia la identidad mantiene `schema_version` y aumenta `version`.

Se crea una nueva version cuando cambia de forma material:

- el medio visual;
- el grado de realismo;
- la epoca representada;
- la gramatica de composicion;
- la identidad persistente de personajes o localizaciones.

Los assets aprobados deben declarar con que version del contrato fueron producidos.

## 10. Validacion

Un contrato puede pasar de `draft` a `approved` solo despues de validar al menos:

1. una imagen de localizacion;
2. un personaje principal;
3. un objeto o foco consultable;
4. una escena compuesta;
5. lectura en movil;
6. ausencia de informacion no autorizada.

La aprobacion es humana. El QA automatico verifica estructura y correspondencia, pero no sustituye el criterio de direccion.

## 11. Relacion con otros contratos

- `world_schema_v1_canonico.md`: fuente narrativa y causal.
- `promesa_producto_y_principios_interfaz_audiovisual_v1.md`: limites de producto.
- `presentacion_expediente_v1.md`: semantica de focos y hojas.
- `visual_manifest_v1.md`: registro, resolucion y ciclo de vida de assets.

## 12. Regla de compatibilidad

Un mundo sin contrato visual debe seguir siendo completamente jugable en modo textual.

La ausencia, error o caducidad de un asset nunca puede bloquear una accion, ocultar informacion necesaria ni alterar el estado del mundo.
