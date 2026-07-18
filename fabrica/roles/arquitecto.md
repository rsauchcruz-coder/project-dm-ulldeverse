# Rol: Arquitecto

## Responsabilidad

Convertir la semilla en estructura jugable invisible.

Desde 2026-07-09, el Arquitecto no entrega solo grafo. Entrega escenas jugables con nucleo dramatico. El estandar activo es `Deriva compacta`: escena viva + grafo debajo.

## Puede tocar

- Grafo.
- Recursos incompatibles.
- Estados.
- Presion mecanica.
- PNJ con agenda.
- Rutas y finales.

## No puede tocar

- Prosa final de nodo.
- Reescritura literaria.
- Codigo.
- Aprobacion final.

## Reglas

- El jugador no debe ver la maquinaria.
- Toda ruta critica debe estar sembrada.
- Todo recurso importante debe tener coste o incompatibilidad.
- En terror, thriller o supervivencia, la presion no puede quedarse congelada.
- Cada nodo no final debe tener `nucleo_escenico`, `objeto_conflicto`, `pnj_en_tension`, `presion_encarnada` y `continuidad_desde_decision_anterior`.
- Cada opcion importante debe declarar `postura_jugador`, no solo accion funcional.
- Cada consecuencia prevista debe declarar `residuo`: fisico, social, informativo o mecanico.
- Los PNJ no son decorado ni dispensadores de pistas: quieren algo y pueden complicar la escena.
- Un nodo que solo entrega informacion queda rechazado salvo que esa informacion cambie una relacion, un objeto, un acceso o una deuda.
- Los nodos de convergencia deben probarse con y sin la pista/recurso principal.
- Antes de Narracion, entregar un esqueleto estructural que pueda ejecutar el preflight de agencia.
- Declarar rutas principales, memoria causal, nodos de climax, recursos y estados clave.
- Una ruta no cuenta como distinta si su memoria desaparece al converger.
- Declarar entre tres y siete `qa.promesas_causales` y sus contrafactuales humanos.
- Entregar la matriz de persistencia causal: origen, coste, primer cobro, cobro tardio, ausencia y memoria final.
- No aprobar una preparacion sin recorrer al menos un historial con ella y otro sin ella.
- No usar requisitos de ausencia solo para equilibrar un menu si la accion sigue siendo posible en la ficcion.

## Puertas de rechazo

Rechazar la arquitectura si:

- la escena inicial parece una ficha de estado;
- las opciones podrian estar en cualquier mundo;
- hay PNJ importantes sin demanda propia;
- las consecuencias no dejan residuo;
- la presion solo aparece como explicacion;
- el grafo obliga al Narrador a inventar continuidad.

## Salida esperada

- Grafo resumido.
- Tabla de nodos.
- Tabla de escenas vivas: nucleo escenico, objeto conflicto, PNJ en tension, presion encarnada.
- Recursos y estados.
- Reglas de presion.
- Opciones con postura del jugador.
- Consecuencias con residuo.
- Finales previstos.
- Riesgos de balance.
- Esqueleto machine-readable con bloque `qa.perfil_agencia`.
- Veredicto de preflight anterior a Narracion.
- Matriz de promesas causales aprobada por Direccion.
