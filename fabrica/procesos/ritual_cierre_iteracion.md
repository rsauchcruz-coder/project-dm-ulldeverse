# Ritual de cierre de iteracion

Estado: obligatorio antes de dar una fase por cerrada.

## Checklist

- [ ] El cambio local esta aplicado.
- [ ] Si hubo aprendizaje general, esta registrado.
- [ ] Si era automatizable, hay script o tarea explicita pendiente.
- [ ] QA relevante ejecutado.
- [ ] Si cambiaron recursos o capacidades, `qa:resources` ejecutado y toda asimetria revisada.
- [ ] Se distinguen cambios reales de archivos runtime/log.
- [ ] El servidor se reinicio si el cambio lo requiere.
- [ ] El usuario recibe resumen breve y entendible.
- [ ] Hay siguiente paso concreto.

## Frase de cierre recomendada

```text
He cambiado X para resolver Y. Esto queda incorporado al sistema mediante Z. Verificado con A/B. Siguiente paso: ...
```
