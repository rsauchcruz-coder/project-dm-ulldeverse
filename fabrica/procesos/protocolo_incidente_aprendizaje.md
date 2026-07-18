# Protocolo de incidente y aprendizaje

Estado: obligatorio para fallos o mejoras con valor general.

## Cuando se activa

Se activa si aparece cualquiera de estos casos:

- opcion imposible;
- objeto ausente o decorativo;
- texto roto, catalan accidental o lenguaje de motor;
- salto espacial sin puente;
- bucle o repeticion;
- final sin escena;
- paneles desaprovechados;
- sensacion clara de IA;
- mejora que deberia beneficiar a mundos futuros.

## Flujo

1. **Capturar**
   - conservar frase, ruta, accion o captura si aporta contexto;
   - no reinterpretar antes de entender.

2. **Clasificar**
   - mundo;
   - motor;
   - UI;
   - contrato;
   - QA;
   - proceso.

3. **Corregir localmente**
   - arreglar el mundo o codigo afectado si procede;
   - no mezclar con refactors ajenos.

4. **Generalizar**
   - formular la regla que habria evitado el fallo;
   - decidir si es creativa, estructural, tecnica o de validacion.

5. **Ubicar**
   - contrato creativo si afecta a escritura;
   - checklist si requiere revision humana;
   - QA si es detectable;
   - memoria si cambia la fabrica.

6. **Verificar**
   - ejecutar QA relevante;
   - si no hay QA posible, explicar la revision manual requerida.

7. **Cerrar**
   - resumir cambio;
   - decir pruebas ejecutadas;
   - dejar siguiente paso.

## Regla de oro

No se debe cerrar un incidente con "arreglado" si no se ha respondido:

> Que evita que vuelva a pasar?
