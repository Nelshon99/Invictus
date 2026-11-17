---
sessionId: session-261116-191151-23sd
---

# Requirements

### Overview
Agregar soporte para bandejas de compras a proveedores que no participen en el pesaje diario pero sí en ventas y traslados, con datos adicionales del proveedor.

### User Stories
- Como operador, quiero crear una bandeja de tipo "Proveedor" con datos del proveedor para registrar oro comprado sin tener que pesarla en el ciclo diario.
- Como operador, quiero vender directamente desde una bandeja de proveedor sin necesidad de apertura/cierre.
- Como operador, quiero trasladar oro de una bandeja de proveedor a otra bandeja de la misma ley.
- Como administrador, quiero filtrar las bandejas por tipo (Exhibido vs Proveedor) en el módulo de Bandejas.

### Functional Requirements
1. **Nuevo tipo de bandeja**: `PROVEEDOR` (compras a proveedores) vs `EXHIBIDO` (producción, las actuales).
2. **Campos adicionales para PROVEEDOR**: nombre del proveedor, teléfono, precio de compra, fecha de compra, notas.
3. **Exclusión de Pesajes**: Las bandejas PROVEEDOR no aparecen en el módulo de Pesajes.
4. **Inclusión en Ventas y Traslados**: Las bandejas PROVEEDOR activas funcionan normal en Ventas y Traslados.
5. **Filtro por tipo**: En el módulo de Bandejas, agregar un filtro para ver solo EXHIBIDO, solo PROVEEDOR, o ambas.
6. **Validación de traslados**: La validación de ley (Nacional↔Nacional, Italiano↔Italiano) se mantiene.

### Out of Scope
- Módulo separado de compras con modelo independiente.
- Historial de compras con reportes separados.

# Technical Design

### Current Implementation
- **Modelo Tray** (`schema.prisma`): Campos code, name, goldType, trayWeightCg, goldWeightCg, pieceCount, status. Sin distinción de tipo.
- **Pesajes.tsx**: Filtra bandejas por `status === 'ACTIVE'`. Todas las activas requieren pesaje.
- **Ventas.tsx**: Filtra bandejas por `status === 'ACTIVE'`.
- **Traslados.tsx**: Filtra bandejas por `status === 'ACTIVE'`.
- **Bandejas.tsx**: Formulario de creación/edición con campos básicos. Toggle para mostrar inactivas.

### Key Decisions
- **Un solo modelo Tray**: En lugar de crear un modelo separado, se extiende Tray con `trayType` y campos opcionales. Esto evita duplicar lógica de ventas y traslados.
- **Campos opcionales**: Los campos del proveedor son nullable para no afectar las bandejas EXHIBIDO existentes.
- **Filtro en Pesajes**: Se agrega `trayType !== 'PROVEEDOR'` al filtro existente de `status === 'ACTIVE'`.

### Proposed Changes

**Backend:**
- `schema.prisma`: Agregar a Tray los campos `trayType` (default EXHIBIDO), `supplierName`, `supplierPhone`, `purchasePrice`, `purchaseDate`, `purchaseNotes`.
- `TrayService.ts`: Aceptar los campos nuevos en createTray y updateTray.
- `TrayController.ts`: Actualizar DTOs para los campos nuevos.

**Frontend:**
- `Bandejas.tsx`: Agregar selector de `trayType` en el formulario. Cuando sea PROVEEDOR, mostrar campos del proveedor. Agregar filtro por tipo en la vista.
- `Pesajes.tsx`: Agregar filtro `trayType !== 'PROVEEDOR'` además de `status === 'ACTIVE'`.
- `Ventas.tsx`: Sin cambios necesarios (ya filtra por ACTIVE).
- `Traslados.tsx`: Sin cambios necesarios (ya filtra por ACTIVE).
- `api.ts`: Actualizar tipos para incluir los campos nuevos.

### Data Model
```prisma
model Tray {
  // ... campos existentes ...
  trayType        String           @default("EXHIBIDO")  // EXHIBIDO or PROVEEDOR
  supplierName    String?
  supplierPhone   String?
  purchasePrice   Float?
  purchaseDate    DateTime?
  purchaseNotes   String?
}
```

### File Structure
- Modified: `backend/prisma/schema.prisma`
- Modified: `backend/src/services/TrayService.ts`
- Modified: `backend/src/modules/inventory/TrayController.ts`
- Modified: `frontend/src/pages/Bandejas.tsx`
- Modified: `frontend/src/pages/Pesajes.tsx`
- Modified: `frontend/src/services/api.ts`

# Delivery Steps

### ✓ Step 1: Extender modelo Tray con trayType y campos de proveedor
Agregar los nuevos campos al schema de Prisma y actualizar el backend para aceptarlos.
- Agregar `trayType` (default EXHIBIDO), `supplierName`, `supplierPhone`, `purchasePrice`, `purchaseDate`, `purchaseNotes` al modelo Tray en `schema.prisma`.
- Ejecutar migración de base de datos.
- Actualizar `TrayService.ts` para aceptar los campos nuevos en createTray y updateTray.
- Actualizar `TrayController.ts` con los DTOs actualizados.
- Verificar compilación del backend.

### ✓ Step 2: Actualizar formulario de Bandejas con campos condicionales y filtro por tipo
El formulario de creación/edición de bandejas muestra campos del proveedor solo cuando trayType es PROVEEDOR.
- Agregar selector de `trayType` (EXHIBIDO/PROVEEDOR) en el formulario de `Bandejas.tsx`.
- Mostrar campos condicionales (proveedor, teléfono, precio, fecha, notas) solo si trayType === 'PROVEEDOR'.
- Agregar filtro por tipo de bandeja en la vista (EXHIBIDO, PROVEEDOR, TODAS).
- Actualizar la interfaz Tray en `api.ts` con los campos nuevos.
- Verificar compilación del frontend.

### ✓ Step 3: Excluir bandejas PROVEEDOR del módulo de Pesajes
Las bandejas de tipo PROVEEDOR no aparecen en el módulo de Pesajes.
- Agregar filtro `trayType !== 'PROVEEDOR'` en `Pesajes.tsx` junto al filtro existente de `status === 'ACTIVE'`.
- Actualizar la interfaz Tray en `Pesajes.tsx` para incluir `trayType`.
- Verificar que las bandejas PROVEEDOR no aparezcan en Pesajes pero sí en Ventas y Traslados.
- Verificar compilación del frontend.