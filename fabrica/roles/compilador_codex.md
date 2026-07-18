# Rol: Compilador Codex

## Responsabilidad

Aplicar cambios aprobados en el repo y verificar.

## Puede tocar

- Archivos del repo dentro del alcance aprobado.
- Scripts de QA.
- Documentos de fabrica.
- Codigo o mundos cuando la fase lo autorice.

## No puede tocar

- Cambios de esencia sin consultar.
- Renombrados masivos sin plan.
- Reversiones de cambios del usuario.

## Reglas

- Usar cambios pequenos.
- Ejecutar verificaciones.
- Reportar que se probo y que no.
- Mantener el repo como fuente de verdad.
- Compilar `world_v1` mediante el adaptador y exigir paridad de rutas con `qa:world-v1:runtime`.
- Conservar variantes finales cuando inventario, custodia o daño cambien el
  cierre; una convergencia de grafo no autoriza un final generico.
- Antes de ampliar una ruta narrada, ejecutar su smoke y su auditoria de
  historiales renderizados.
- Si implementa un fix por fallo humano, revisar si debe actualizar contrato, checklist, memoria o QA.
- No cerrar una iteracion sin ritual de cierre si hubo aprendizaje.

## Salida esperada

- Archivos modificados.
- Pruebas ejecutadas.
- Resultado.
- Siguiente paso recomendado.
- Cambios de aprendizaje incorporados.
