# Manifest audiovisual v1

Fecha: 2026-07-16  
Estado: **contrato de fabrica y runtime para assets visuales**

## 1. Proposito

`visual_manifest_v1` desacopla el `world.json`, la produccion audiovisual y la interfaz.

Su objetivo es que:

- el mundo siga siendo la unica fuente narrativa y causal;
- los assets se resuelvan mediante ids estables;
- la interfaz no deduzca imagenes buscando palabras en textos visibles;
- un proveedor de imagen pueda sustituirse sin migrar mundos;
- una imagen pueda regenerarse sin rehacer el resto;
- un mundo sin assets siga siendo jugable;
- la fabrica pueda detectar assets ausentes, rotos o desactualizados.

## 2. Dos manifests, dos responsabilidades

### 2.1. Manifest de produccion

Ruta recomendada:

```text
fabrica/media/<world_id>/visual_manifest_source_v1.json
```

Es interno. Registra:

- procedencia narrativa;
- prompts;
- proveedor usado;
- revisiones;
- estado editorial;
- notas de continuidad;
- firmas semanticas;
- archivo aprobado;
- relaciones con nodos y entidades.

No se publica completo con el producto.

### 2.2. Manifest de runtime

Ruta recomendada:

```text
public/media/<world_id>/manifest.json
```

Es compilado, pequeno y consumible por el cliente. Contiene solo:

- `world_id`;
- version del manifest;
- assets publicados;
- rutas publicas;
- texto alternativo;
- bindings por nodo o entidad;
- variantes y guardas visuales cuando proceda;
- hotspots opcionales de presentacion.

No contiene prompts, proveedor, notas internas ni historial editorial.

## 3. Principios no negociables

1. El manifest no cambia requisitos, opciones, destinos, presion, variables ni finales.
2. Un asset no puede introducir informacion que el jugador no conoce o no puede inferir.
3. La interfaz siempre conserva fallback textual.
4. Los bindings se realizan por ids estables, no por coincidencias de texto.
5. La falta de imagen no es un error de partida.
6. Los prompts y metadatos internos permanecen fuera de `public/`.
7. El runtime no depende del proveedor que genero la imagen.
8. Las coordenadas no pertenecen a `world_v1`; pueden pertenecer al manifest compilado porque son presentacion.

## 4. Tipos de asset

Tipos iniciales:

- `scene`: composicion contextual asociada a uno o varios nodos;
- `location`: fondo o identidad persistente de una localizacion;
- `character`: retrato, busto o figura de un personaje;
- `prop`: objeto, documento, pista o evidencia;
- `final`: imagen de desenlace o familia de desenlaces;
- `overlay`: capa atmosferica o causal reutilizable;
- `reference`: referencia interna de estilo, no publicable por defecto.

No se debe crear un tipo nuevo si uno existente cubre la funcion.

## 5. Estados editoriales

Todo asset del manifest de produccion usa uno de estos estados:

```text
planned
prompt_ready
generated
needs_revision
approved
rejected
stale
deprecated
migration_pending
```

Solo `approved` puede entrar en el manifest de runtime.

`migration_pending` identifica assets heredados que existen pero todavia deben extraerse, nombrarse, verificar su origen o aprobarse bajo el nuevo contrato.

## 6. Estructura del manifest de produccion

```json
{
  "schema_version": "visual_manifest_source_v1",
  "world_id": "string",
  "source_world": "worlds/...json",
  "style_contract": "visual_style_contract_v1.json",
  "manifest_version": 1,
  "assets": [],
  "bindings": {
    "nodes": {},
    "entities": {}
  }
}
```

### 6.1. Asset de produccion

Campos base:

```json
{
  "asset_id": "scene_calabozo_apertura",
  "type": "scene",
  "status": "approved",
  "revision": 2,
  "function": "orientacion_y_presion",
  "source_nodes": ["n01_calabozo_decision"],
  "source_entities": ["pnj:albert", "recurso:inv_eslabon_repuesto"],
  "prompt_file": "prompts/scenes/scene_calabozo_apertura.md",
  "approved_file": "scenes/calabozo_apertura.webp",
  "public_file": "scenes/calabozo_apertura.webp",
  "provider": "chatgpt_manual",
  "style_version": 1,
  "source_signature": "sha256:...",
  "alt": "...",
  "notes": "..."
}
```

Campos `provider`, `notes`, `prompt_file` y `approved_file` son internos y no pasan necesariamente al runtime.

## 7. Identificadores

Formato recomendado:

```text
scene_<lugar_o_funcion>_<estado>
loc_<lugar>
char_<personaje>
prop_<objeto>
final_<familia_o_resultado>
overlay_<cambio>
```

Reglas:

- minusculas ASCII;
- `snake_case`;
- sin nombres de proveedor;
- sin numeros de revision en el id;
- un id conserva significado aunque cambie el archivo;
- un cambio de contenido menor aumenta `revision`, no crea otro id;
- un cambio semantico real crea otro asset.

## 8. Bindings

### 8.1. Por nodo

```json
{
  "bindings": {
    "nodes": {
      "n01_calabozo_decision": {
        "scene_asset": "scene_calabozo_apertura"
      }
    }
  }
}
```

### 8.2. Por entidad

```json
{
  "bindings": {
    "entities": {
      "pnj:albert": {
        "character_asset": "char_albert"
      },
      "recurso:inv_eslabon_repuesto": {
        "prop_asset": "prop_cadena_reparada"
      }
    }
  }
}
```

Entidades previstas:

- `jugador`;
- `pnj:<id>`;
- `recurso:<id>`;
- `pista:<id>`;
- `lugar:<id_visual>`.

Los ids visuales de lugar pertenecen al paquete audiovisual y se relacionan con nodos o ubicaciones declaradas; no se inyectan en el mundo por defecto.

## 9. Firmas semanticas y caducidad

Cada asset debe tener una `source_signature` calculada a partir de los campos que afectan su representacion.

La firma de una escena puede incluir:

- version del contrato visual;
- `node.id`;
- `ubicacion`;
- `situacion_visible`;
- `detalle_actual`;
- `presion_visible`;
- `objeto_conflicto`;
- `personajes_visibles`;
- `entorno_visible`;
- `focos_consulta`;
- variantes visuales autorizadas;
- fichas visuales de entidades usadas.

No debe incluir por defecto todo `texto_base`, opciones, destinos ni campos ajenos a la imagen.

Si la firma cambia:

- el archivo no se borra;
- el asset pasa a `stale`;
- se informa de los campos modificados;
- la revision humana decide si sigue siendo valido o debe regenerarse.

Un cambio narrativo no visual no debe invalidar imagenes.

## 10. Variantes

No se genera una variante por cada flag.

Una variante visual solo procede si el cambio es:

- visible;
- persistente o narrativamente relevante;
- comprensible para el jugador;
- autorizado por el estado;
- suficientemente distinto para justificar otro archivo.

Ejemplo de runtime:

```json
{
  "asset_id": "scene_corral_tenso",
  "variants": [
    {
      "asset_id": "scene_corral_guardia_dividido",
      "requirements": ["flag_guardia_duda_sello"]
    }
  ]
}
```

El compilador reutiliza la misma gramatica de requisitos que el runtime cuando sea posible. Si no puede evaluar una guarda con seguridad, utiliza el asset base.

## 11. Hotspots

Los focos semanticos proceden de `focos_consulta`.

La posicion visual puede declararse en el manifest de runtime:

```json
{
  "hotspots": {
    "foco_cadena_reparada": {
      "x": 0.68,
      "y": 0.72
    }
  }
}
```

Reglas:

- coordenadas normalizadas entre 0 y 1;
- no cambian estado;
- no conceden recursos ni pistas;
- un hotspot solo puede apuntar a un foco visible y legal;
- si falta posicion, la interfaz puede mostrar el foco fuera de la imagen;
- la ausencia de hotspot no elimina la consulta estable.

## 12. Estructura de archivos publicados

```text
public/media/<world_id>/
  manifest.json
  scenes/
  locations/
  characters/
  props/
  finals/
  overlays/
```

Reglas:

- no usar Base64 en JavaScript para assets finales;
- nombres de archivo estables y legibles;
- formato preferente inicial: WebP;
- la interfaz debe permitir otros formatos declarados por el manifest;
- cada archivo debe poder cachearse por separado;
- no publicar prompts ni originales de trabajo.

## 13. Manifest de runtime minimo

```json
{
  "schema_version": "visual_manifest_v1",
  "world_id": "aventura_el_testigo_de_ulldecona_001",
  "manifest_version": 1,
  "assets": {
    "scene_calabozo_apertura": {
      "type": "scene",
      "src": "/media/aventura_el_testigo_de_ulldecona_001/scenes/calabozo_apertura.webp",
      "alt": "Albert encadenado en el calabozo mientras registran el castillo"
    }
  },
  "bindings": {
    "nodes": {
      "n01_calabozo_decision": {
        "scene_asset": "scene_calabozo_apertura"
      }
    },
    "entities": {}
  }
}
```

## 14. Resolucion del cliente

Orden recomendado:

1. cargar manifest por `world_id`;
2. resolver el node actual por id;
3. evaluar variante legal;
4. cargar asset;
5. si falla, mostrar placeholder o layout sin imagen;
6. mantener narracion, paneles y decisiones intactos.

El cliente no debe:

- buscar `calabozo`, `cisterna` u otras palabras dentro de `ubicacion`;
- deducir personajes por nombre visible;
- limpiar ids para fabricar rutas;
- depender de `window.PROTO_ASSETS`;
- bloquear la partida esperando una imagen.

## 15. Compilacion

Comando objetivo:

```text
npm run media:compile -- <world_id>
```

El compilador:

- lee el manifest de produccion;
- valida que los assets `approved` existen;
- excluye internos, rechazados, caducados y pendientes;
- genera el manifest de runtime;
- conserva rutas relativas seguras;
- no copia prompts ni notas internas.

## 16. QA

Comandos objetivo:

```text
npm run media:qa -- <world_id>
npm run media:coverage -- <world_id>
```

`media:qa` debe bloquear:

- JSON invalido;
- ids duplicados;
- bindings a nodos o entidades inexistentes;
- assets `approved` sin archivo;
- rutas fuera de `public/media/<world_id>/`;
- archivo Base64 en el bundle audiovisual final;
- hotspot sin foco legal;
- runtime manifest con campos internos;
- ausencia de `alt` en assets publicables.

`media:coverage` empieza en modo informe y muestra:

- localizaciones cubiertas;
- personajes cubiertos;
- props cubiertos;
- nodos con escena propia;
- nodos que reutilizan escena;
- finales cubiertos;
- assets pendientes o `stale`.

La cobertura no se convierte en gate hasta calibracion humana.

## 17. Compatibilidad

- Mundos sin manifest: modo textual normal.
- Manifest ausente: no error fatal.
- Asset ausente: fallback y aviso de desarrollo.
- Manifest de version desconocida: ignorar de forma segura.
- Mundos heredados: pueden adoptar el sistema sin migrar su schema.

## 18. Criterio de exito del piloto

El piloto de Ulldecona queda validado cuando:

1. los seis assets heredados salen de Base64 y se registran;
2. la interfaz deja de reconocer `calabozo`, `cisterna`, Ramon, Albert, cadena y sello mediante texto;
3. se incorpora una tercera localizacion y Sibila modificando solo assets y manifests;
4. no se toca el JavaScript para esa incorporacion;
5. un mundo sin media continua funcionando;
6. el QA detecta archivos rotos y bindings invalidos;
7. prompts y metadatos internos no llegan a `public/`.
