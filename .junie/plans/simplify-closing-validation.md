---
sessionId: session-261116-213355-6b34
---

# Análisis & Propuesta

### Problema Actual

La validación de pesajes (apertura y cierre) usa dos enfoques diferentes:

**Apertura**: Compara con el último pesaje (cierre del día anterior) usando `getLastWeighing()`.
**Cierre**: Calcula el peso esperado como `apertura - ventas` usando `getExpectedClosingGoldWeight()`.

Problemas:
1. **Cierre no considera traslados**: Si se trasladan piezas de/hacia la bandeja durante el día, el cálculo no refleja el peso real esperado.
2. **Cálculos innecesarios**: La bandeja ya mantiene `goldWeightCg`, `trayWeightCg` y `pieceCount` actualizados en tiempo real por cada operación (ventas, traslados, adición de piezas).
3. **Inconsistencia**: Apertura compara con un pesaje, cierre compara con un cálculo. Ambos deberían comparar con los datos de la bandeja en BD.

### Propuesta: Usar los datos de la bandeja (`tray.goldWeightCg`, `tray.trayWeightCg`, `tray.pieceCount`) como referencia para ambos pesajes

En lugar de calcular pesos esperados, se leerán directamente los datos actuales de la bandeja desde la base de datos y se compararán con los valores medidos en la balanza.

### Evidencia: Los datos de la bandeja se actualizan en todas las operaciones

| Operación | Archivo | Línea | Qué actualiza |
|---|---|---|---|
| **Venta** | `SaleService.ts` | 109-114 | `tray.goldWeightCg - goldWeightCg` (resta lo vendido) |
| **Traslado (origen)** | `TransferService.ts` | 82-92 | `sourceTray.goldWeightCg - gramsCg` (resta lo trasladado) |
| **Traslado (destino)** | `TransferService.ts` | 108-118 | `destTray.goldWeightCg + gramsCg` (suma lo recibido) |
| **Pesaje** | `WeighingService.ts` | 328-336 | `tray.goldWeightCg`, `pieceCount`, `trayWeightCg` (actualiza con el pesaje) |

### Flujo propuesto

**Para Apertura**:
1. Leer `tray.goldWeightCg` actual (que refleja el cierre del día anterior)
2. Comparar el peso medido en balanza (`goldWeightCg` calculado) con `tray.goldWeightCg`
3. Si la diferencia excede ±0.50g, generar advertencia

**Para Cierre**:
1. Leer `tray.goldWeightCg` actual (que refleja apertura menos ventas y traslados del día)
2. Comparar el peso medido en balanza (`goldWeightCg` calculado) con `tray.goldWeightCg`
3. Si la diferencia excede ±0.50g, generar advertencia

### Beneficios
- **Simplicidad**: Una consulta a `tray.findUnique()` en lugar de consultar pesajes + ventas.
- **Precisión**: Incluye automáticamente ventas, traslados y cualquier otra operación que modifique el peso.
- **Consistencia**: Ambos tipos de pesaje usan el mismo enfoque de validación.
- **Menos consultas**: Elimina `getLastWeighing()` y `getExpectedClosingGoldWeight()`.

### Cambios Requeridos

#### Backend (`WeighingService.ts`)
1. **Eliminar `getExpectedClosingGoldWeight()`**: Ya no se necesita calcular `apertura - ventas`.
2. **Eliminar `getLastWeighing()` para validación**: Reemplazar por lectura directa de `tray.goldWeightCg`.
3. **Actualizar `validateWeighing()`**: 
   - Para ambos tipos (OPENING y CLOSING), leer `tray.goldWeightCg` y compararlo con el peso medido.
   - Aplicar tolerancia de ±0.50g en ambos casos.
4. **Actualizar `validateClosingWeighing()`**: Usar `tray.goldWeightCg` en lugar del cálculo.
5. **Actualizar `createWeighing()` dentro de la transacción**: Usar `tray.goldWeightCg` como referencia para `previousGoldWeightCg` y calcular la diferencia.

#### Frontend (`Pesajes.tsx`)
- Cambiar `validation.expectedGoldWeightCg` a `validation.currentGoldWeightCg`.
- Actualizar textos: "Peso esperado al cierre" → "Peso actual en bandeja".
- Mostrar la comparación con los datos de la bandeja para ambos tipos de pesaje.


# Delivery Steps

### ✓ Step 1: Reemplazar `getExpectedClosingGoldWeight` y `getLastWeighing` con lectura directa de bandeja
Eliminar las funciones de cálculo y reemplazar por una función que lea los datos actuales de la bandeja.
- Eliminar `getExpectedClosingGoldWeight()` y su lógica de `apertura - ventas`.
- Crear `getCurrentTrayData(trayId)` que devuelva `tray.goldWeightCg`, `tray.trayWeightCg`, y `tray.pieceCount`.
- Actualizar `validateClosingWeighing()` para usar `tray.goldWeightCg`.

### ✓ Step 2: Actualizar `validateWeighing()` para usar datos de bandeja en ambos tipos
Cambiar la validación para comparar el peso medido con `tray.goldWeightCg` en ambos tipos de pesaje.
- En el bloque de OPENING, reemplazar `getLastWeighing()` con `tray.goldWeightCg` como referencia.
- En el bloque de CLOSING, reemplazar `getExpectedClosingGoldWeight()` con `tray.goldWeightCg`.
- Unificar la lógica de comparación con tolerancia para ambos tipos.
- Actualizar los mensajes de advertencia para referenciar "Peso actual en bandeja".

### ✓ Step 3: Actualizar `createWeighing()` dentro de la transacción
Cambiar la creación del pesaje para usar `tray.goldWeightCg` como referencia.
- Reemplazar `lastWeighing` con `tray.goldWeightCg` para calcular `previousGoldWeightCg`.
- Calcular la diferencia y tolerancia basada en `tray.goldWeightCg`.
- Actualizar el `InventoryMovement` y `AuditLog` para reflejar el nuevo enfoque.

### ✓ Step 4: Actualizar frontend para reflejar el nuevo enfoque
Ajustar la UI de `Pesajes.tsx` para mostrar el peso actual de la bandeja como referencia.
- Cambiar `validation.expectedGoldWeightCg` a `validation.currentGoldWeightCg`.
- Actualizar textos: "Peso esperado al cierre" → "Peso actual en bandeja".
- Mostrar la comparación con los datos de la bandeja para ambos tipos de pesaje.