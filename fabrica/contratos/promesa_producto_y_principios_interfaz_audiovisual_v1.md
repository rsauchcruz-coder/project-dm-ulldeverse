# Promesa de producto y principios de interfaz audiovisual v1

Fecha: 2026-07-14  
Estado: **contrato normativo de direccion de producto e interfaz**

## 1. Proposito

Este documento fija la identidad de Project DM antes de construir nuevos prototipos audiovisuales o modificar la interfaz principal.

No define todavia un `media_schema_v1`, un estilo grafico definitivo ni una topologia unica de pantallas. Define que debe prometer el producto y que condiciones debe respetar cualquier forma futura de representarlo.

Autoridad relacionada:

- `analisis_cambio_rumbo/09_vision_producto.md`
- `analisis_cambio_rumbo/09_vision_producto.md`
- `analisis_cambio_rumbo/10_principios_jugables.md`
- `docs/ARCHITECTURE.md`

## 2. Promesa de producto al jugador

**Project DM crea aventuras narrativas cortas e intensas en mundos que recuerdan lo que el jugador ha visto, decidido, conseguido y perdido. Cada partida debe hacerle sentir parte de la historia, conducirle a un final coherente y dejarle la sensacion de que otra decision podria haberle llevado a una aventura distinta.**

La frase guia de experiencia es:

> Quiero volver a jugar otra partida para ver donde me lleva.

La repeticion no debe nacer de coleccionar finales por obligacion, sino de la curiosidad por explorar consecuencias, rutas y posibilidades que el mundo ya contenia.

## 3. Promesa de la fabrica

**La fabrica de Project DM transforma unas premisas personales en mundos narrativos jugables, coherentes y validados, con calidad suficiente para ser jugados sin una cadena constante de microcorrecciones.**

La personalizacion pertenece principalmente a la promesa de la fabrica. La experiencia del jugador se sostiene sobre la coherencia, la participacion, las consecuencias y la rejugabilidad.

## 4. Identidad del producto

Project DM es:

- una fabrica de aventuras narrativas a la carta;
- un motor de partidas solitarias, cortas, intensas y rejugables;
- una experiencia accesible sin conocimientos de rol de mesa;
- un producto `smartphone-first`;
- una estructura fuerte capaz de producir sensacion de libertad sin improvisar su arquitectura critica durante la partida;
- un sistema donde cada genero y cada mundo pueden tener voz, ritmo y presentacion propios.

Project DM no es:

- un chat con texto bonito pero sin continuidad;
- una novela lineal disfrazada de juego;
- una sucesion de viñetas decorativas;
- un generador masivo de mundos mediocres;
- una mesa de rol tradicional;
- un sistema que enseñe al jugador las tripas del motor;
- una experiencia donde ganar sea obligatorio;
- un producto que sacrifique su esencia para parecer mas moderno o comercial.

## 5. Jerarquia de la experiencia

Toda decision de interfaz debe respetar este orden:

1. **Comprension:** el jugador entiende donde esta, que ha ocurrido y que puede hacer.
2. **Jugabilidad:** las acciones ofrecidas son ejecutables, distintas y tienen sentido en el contexto.
3. **Coherencia:** el mundo recuerda inventario, conocimiento, relaciones, daños, decisiones y ausencias.
4. **Consecuencia:** las decisiones dejan una diferencia observable durante la ruta o en el desenlace.
5. **Emocion:** la presentacion refuerza tension, curiosidad, perdida, alivio, miedo o satisfaccion.
6. **Memoria y rejugabilidad:** el final deja residuo y deseo de explorar otro camino.
7. **Ornamento:** belleza, animacion y espectacularidad solo entran despues de lo anterior.

Ningun recurso audiovisual puede compensar un fallo en los niveles anteriores.

## 6. Principios no negociables de interfaz audiovisual

### 6.1. El mundo manda

El texto, el estado del mundo, las decisiones y sus consecuencias son la columna vertebral. Imagen, voz, musica, sonido y animacion representan informacion autorizada por el mundo; no crean hechos nuevos.

### 6.2. El audiovisual debe cumplir una funcion

Cada recurso debe justificar al menos una de estas mejoras:

- comprender mejor la escena;
- localizar personajes, objetos o salidas;
- reforzar atmosfera o emocion;
- hacer visible una consecuencia;
- ayudar a recordar una persona, lugar, pista o decision.

Si solo decora, no tiene prioridad.

### 6.3. Consultar no es actuar

Mirar un personaje, abrir una nota, revisar un objeto o escuchar una frase puede aportar contexto, pero no debe confundirse con una accion que cambie el mundo.

La interfaz debe distinguir con claridad:

- informacion consultable;
- acciones ejecutables;
- consecuencias ya ocurridas.

### 6.4. Nada aparece sin presentacion

Una imagen, retrato, frase, icono, sonido o animacion no puede introducir un personaje, objeto, lugar, amenaza o informacion que el jugador no haya visto, obtenido o pueda inferir legitimamente.

### 6.5. La maquinaria permanece oculta

Presion, flags, estados internos, rutas, condiciones de final y otras variables del motor no se muestran como lenguaje principal.

Deben expresarse mediante elementos del mundo: heridas, respiracion, luz, ruido, gestos, cierres, objetos, notas, cambios de conducta o alteraciones visibles del entorno.

### 6.6. Smartphone primero

Toda funcion esencial debe ser legible y jugable en una pantalla movil.

- ningun elemento critico depende de hover ni de pantalla grande;
- el texto y los botones deben poder escanearse sin fatiga;
- la informacion persistente debe ser compacta;
- los paneles deben ayudar sin ocupar permanentemente la escena;
- las transiciones no pueden ralentizar la toma de decisiones.

### 6.7. El texto conserva autonomia

Una escena debe seguir siendo comprensible y jugable si su imagen, audio o animacion no cargan.

El audiovisual puede enriquecer la experiencia, pero no puede ser el unico portador de informacion necesaria para decidir.

### 6.8. Cada mundo puede tener su propia gramatica

No se obliga a todos los mundos a usar las mismas viñetas, encuadres, paleta, ritmo, disposicion de personajes o densidad visual.

La interfaz comun debe preservar accesibilidad y claridad, pero la direccion visual puede variar segun genero, epoca, tono y contrato de voz.

### 6.9. Movimiento con medida

Las transiciones pueden sugerir cambio de pagina, escena, tiempo o tension, pero deben ser breves, opcionales cuando corresponda y compatibles con `prefers-reduced-motion`.

No se permite que una animacion o efecto oculte informacion, bloquee una accion o obligue a esperar para releer.

### 6.10. El audiovisual refleja causalidad

Cuando una decision cambie de forma material un personaje, lugar, objeto, relacion o situacion, la representacion puede y debe reflejar ese cambio cuando aporte valor.

No es obligatorio generar una variante visual por cada flag. Solo se representan diferencias relevantes, persistentes y comprensibles para el jugador.

## 7. Gramatica minima de escena

Una escena audiovisual de Project DM puede contener:

1. narracion o descripcion principal;
2. imagen contextual opcional;
3. lugar actual;
4. personajes y elementos presentes;
5. informacion consultable;
6. acciones ejecutables;
7. consecuencia inmediata;
8. acceso compacto a inventario, notas o recuerdos cuando sean relevantes.

Esta gramatica no obliga a mostrar todos los elementos a la vez ni a usar una unica composicion. Sirve para evitar que la imagen sustituya la escena o que la interfaz mezcle informacion y accion.

## 8. Lo que no debe hacerse todavia

Hasta que exista evidencia obtenida con prototipos aislados:

- no sustituir `public/index.html` por una interfaz de comic o visual novel;
- no crear un `media_schema_v1` completo;
- no generar bibliotecas masivas de imagen, voz, musica o efectos;
- no definir un estilo visual global irreversible;
- no imponer una topologia identica a todos los mundos;
- no usar audiovisual para tapar problemas narrativos, causales o de agencia;
- no acoplar la creacion de mundos a un proveedor audiovisual concreto.

## 9. Criterio de exito de una iteracion

Una iteracion audiovisual es valida solo si mejora de forma observable al menos uno de estos aspectos sin degradar los demas:

- comprension de la escena;
- claridad de las acciones;
- emocion;
- sensacion de presencia;
- recuerdo de personajes, lugares, pistas o consecuencias;
- deseo de repetir;
- accesibilidad o comodidad en smartphone.

La cantidad de imagenes, voces, animaciones o efectos no es una medida de avance.

## 10. Regla de validacion

Todo nuevo prototipo debe:

1. estar aislado de la interfaz principal y del runtime canonico;
2. usar una escena o ruta real de un mundo ya validado;
3. declarar la hipotesis concreta que pretende probar;
4. compararse con la presentacion textual equivalente;
5. registrar que mejora, que empeora y que ruido añade;
6. poder descartarse sin migracion destructiva.

## 11. Siguiente paso autorizado

Con este contrato aprobado, el siguiente paso audiovisual permitido es diseñar un unico corte vertical sobre una ruta controlada que pruebe la gramatica minima de escena.

El prototipo no debe intentar demostrar el producto audiovisual completo. Debe responder una pregunta concreta de interfaz y producir evidencia antes de cualquier integracion real.
