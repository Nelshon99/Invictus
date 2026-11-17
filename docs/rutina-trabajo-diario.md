# 📋 Rutina de Trabajo Diario - Invictus

## 🚀 Inicio de Sesión

### 1. Arrancar la aplicación

```powershell
# Terminal 1 - Backend
cd D:\Aprendiendo\inventario-contabilidad-invictus\backend
npm run dev

# Terminal 2 - Frontend
cd D:\Aprendiendo\inventario-contabilidad-invictus\frontend
npm run dev
```

### 2. Abrir los módulos en el navegador

| Módulo | URL | Descripción |
|--------|-----|-------------|
| Dashboard | http://localhost:5173/dashboard | Resumen del día |
| Bandejas | http://localhost:5173/bandejas | Gestión de bandejas de oro |
| Pesajes | http://localhost:5173/pesajes | Registro de pesajes |
| Ventas | http://localhost:5173/ventas | Registro de ventas |
| Cuentas | http://localhost:5173/cuentas | Cuentas bancarias |
| Conciliación | http://localhost:5173/conciliacion | Conciliación diaria |

---

## 📝 Flujo de Trabajo Diario

### Paso 1: Verificar bandejas al inicio del día
- Ir a **Bandejas** → Revisar que todas las bandejas estén con estado "Activa"
- Si hay bandejas inactivas que se necesitan, activarlas con el botón "Activar"
- Verificar pesos iniciales de cada bandeja

### Paso 2: Registrar pesaje de apertura
- Ir a **Pesajes** → Seleccionar bandeja
- Registrar el peso de apertura del día
- Confirmar que el peso está dentro de la tolerancia

### Paso 3: Registrar ventas durante el día
- Ir a **Ventas** → Registrar cada venta de oro
- Seleccionar bandeja, peso de oro, tipo de oro y monto
- Guardar la venta

### Paso 4: Registrar pesaje de cierre
- Ir a **Pesajes** → Seleccionar bandeja
- Registrar el peso de cierre del día
- El sistema validará que el peso coincida con las ventas del día

### Paso 5: Conciliación diaria
- Ir a **Conciliacion** → Revisar el resumen del día
- Verificar que las ventas coincidan con los pesajes
- Cerrar la conciliación si todo está correcto

---

## 🧪 Guía de Prueba de Módulos

### Prueba de Bandejas
1. **Crear bandeja**: Click en "+ Nueva Bandeja", llenar formulario, guardar
2. **Editar bandeja**: Click en "Editar" en una bandeja existente
3. **Desactivar bandeja**: Click en "Desactivar" → la bandeja pasa a estado "Inactiva"
4. **Activar bandeja**: Click en "Activar" en una bandeja inactiva
5. **Eliminar bandeja**: Solo aparece en bandejas INACTIVAS → Click en "Eliminar"
6. **Filtrar por tipo**: Usar el filtro "Italiano" / "Nacional"

### Prueba de Pesajes
1. **Registrar apertura**: Seleccionar bandeja, ingresar peso, guardar
2. **Registrar cierre**: Seleccionar bandeja, ingresar peso, guardar
3. **Validar tolerancia**: Verificar que el sistema detecte diferencias mayores a 50cg

### Prueba de Ventas
1. **Crear venta**: Seleccionar bandeja, peso, tipo de oro, monto, guardar
2. **Ver ventas del día**: Revisar la tabla de ventas
3. **Verificar cuentas**: Asegurar que las cuentas bancarias estén disponibles

### Prueba de Conciliación
1. **Ver resumen**: Revisar totales del día
2. **Validar**: Verificar que ventas = pesajes
3. **Cerrar**: Si todo coincide, cerrar la conciliación

### Prueba de Cuentas Bancarias
1. **Ver cuentas**: Revisar las cuentas activas
2. **Crear cuenta**: Agregar nueva cuenta bancaria si es necesario
3. **Desactivar cuenta**: Si una cuenta ya no se usa

---

## ⚠️ Notas Importantes

- **Eliminar bandeja**: Primero debes desactivar la bandeja antes de poder eliminarla
- **Bandejas activas**: No se pueden eliminar directamente para proteger los datos
- **Pesajes**: El sistema valida automáticamente la tolerancia de peso (50cg)
- **Conciliación**: Solo se puede cerrar si las ventas coinciden con los pesajes
