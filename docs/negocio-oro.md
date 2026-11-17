# Documentación del Negocio - Joyería Invictus

## 1. Introducción

Este documento describe el negocio de la joyería, enfocado en la gestión de inventario de oro y contabilidad de ventas. El sistema está diseñado para manejar dos tipos de ley de oro: Italiano y Nacional (Colombiano).

## 2. Tipos de Oro por Ley

### Oro Italiano (Ley 18)
- **Pureza:** 75% oro puro (18 quilates)
- **Densidad:** ~15.5 g/cm³
- **Características:** Más resistente, ideal para joyería fina
- **Uso común:** Anillos, cadenas, aretes, pulseras
- **Mercado:** Premium, mayor valor comercial

### Oro Nacional Colombiano (Ley 14-22)
- **Pureza:** Variable entre 58.3% y 91.6% (14-22 quilates)
- **Densidad:** Variable según la ley específica
- **Características:** Tradición artesanal, diseño único
- **Uso común:** Joyería artesanal, piezas tradicionales
- **Mercado:** Local, turístico, cultural

### Importancia de la Ley
- La ley determina el valor del oro
- Afecta el precio de venta
- Requiere registro separado en inventario
- Impacta en la contabilidad y tributación

## 3. Flujo Diario de Operaciones

### 3.1. Apertura del Día

1. **Apertura de Caja Fuerte**
   - Se abre la caja fuerte con las bandejas de oro
   - Cada bandeja contiene piezas de oro de diferentes tipos

2. **Pesaje de Apertura**
   - Cada bandeja se pesa completa
   - El peso total incluye:
     - Peso de la bandeja (variable por humedad)
     - Peso del oro contenido
   - Se registra la cantidad de piezas por bandeja
   - Se compara con el pesaje de cierre del día anterior

3. **Validación del Pesaje**
   - Diferencia entre pesaje de apertura y cierre anterior
   - Margen de error aceptable: ±0.5g (factor humedad)
   - Si la diferencia excede el margen, se genera alerta

### 3.2. Durante el Día - Ventas

1. **Proceso de Venta**
   - Se selecciona la bandeja correspondiente
   - Se descuenta el peso del oro vendido
   - Se registra el método de pago
   - Se genera el movimiento de inventario

2. **Descuento de Peso**
   - El peso del oro vendido se descuenta del peso registrado en la bandeja
   - El peso de la bandeja vacía permanece constante
   - Solo el peso del oro se modifica

3. **Registro de Venta**
   - Peso del oro vendido
   - Tipo de oro (Italiano o Nacional)
   - Método de pago
   - Hora de la venta
   - Operario responsable

### 3.3. Cierre del Día

1. **Pesaje de Cierre**
   - Se pesan todas las bandejas nuevamente
   - Se compara el peso con el resultado esperado después de las ventas
   - Margen de error: ±0.5g por factor humedad

2. **Validación**
   - Peso esperado = Peso apertura - Ventas del día
   - Peso real = Pesaje de cierre
   - Diferencia = |Peso real - Peso esperado|
   - Si diferencia > 0.5g → Alerta de discrepancia

3. **Conciliación**
   - Verificar que todas las ventas estén registradas
   - Confirmar que los pesos coincidan dentro del margen
   - Generar reporte diario

## 4. Componentes del Sistema

### 4.1. Bandejas
- **Identificador único:** Código o nombre de la bandeja
- **Peso base:** Peso de la bandeja vacía (variable por humedad)
- **Peso del oro:** Peso acumulado de las piezas de oro
- **Cantidad de piezas:** Número de piezas contenidas
- **Tipo de oro:** Italiano o Nacional
- **Estado:** Activa, Inactiva, En mantenimiento

### 4.2. Pesajes
- **Tipo:** Apertura o Cierre
- **Fecha y hora:** Timestamp del pesaje
- **Bandeja asociada:** Referencia a la bandeja pesada
- **Peso total:** Peso registrado en la balanza
- **Peso bandeja:** Peso estimado de la bandeja
- **Peso oro:** Peso de las piezas de oro
- **Cantidad piezas:** Conteo manual de piezas
- **Operario:** Persona que realizó el pesaje

### 4.3. Ventas
- **Identificador único:** Número de venta
- **Fecha y hora:** Timestamp de la venta
- **Bandeja origen:** Bandeja de la cual se descuenta
- **Peso oro vendido:** Peso exacto del oro vendido
- **Tipo de oro:** Italiano o Nacional
- **Método de pago:** Efectivo, transferencia, tarjeta, crédito, mixto
- **Monto:** Valor de la venta
- **Operario:** Vendedor responsable

### 4.4. Movimientos de Inventario
- **Tipo:** Entrada, Salida, Ajuste, Transferencia
- **Bandeja afectada:** Referencia a la bandeja
- **Peso anterior:** Peso antes del movimiento
- **Peso nuevo:** Peso después del movimiento
- **Diferencia:** Cambio en el peso
- **Motivo:** Razón del movimiento
- **Referencia:** Venta asociada o ajuste manual
- **Timestamp:** Fecha y hora del movimiento

### 4.5. Pagos
- **Métodos disponibles:**
  - Efectivo
  - Transferencia bancaria
  - Tarjeta de crédito/débito
  - Crédito local
  - Mixto (combinación de métodos)
- **Registro por venta:**
  - Método principal
  - Monto por método
  - Estado del pago (pendiente, confirmado, rechazado)

### 4.6. Conciliación Diaria
- **Totales por método de pago:**
  - Suma de efectivo
  - Suma de transferencias
  - Suma de tarjetas
  - Suma de créditos
- **Monto compuesto del día:** Total general de todas las ventas
- **Discrepancias:** Diferencias entre peso esperado y real
- **Reporte de cierre:** Documento resumen del día

## 5. Reglas de Negocio

### 5.1. Pesajes
1. Sin pesaje de apertura, no se permite pesaje de cierre
2. El pesaje de cierre debe compararse con el peso esperado post-ventas
3. Margen de error máximo: ±0.5g por bandeja
4. Las discrepancias deben justificarse y registrarse
5. Cada pesaje se compara con el pesaje anterior del mismo tipo

### 5.2. Ventas
1. No se puede vender más peso del disponible en la bandeja
2. Cada venta debe asociarse a una bandeja específica
3. El descuento de peso es inmediato
4. Se requiere confirmación del peso vendido
5. Las ventas generan eventos simultáneos:
   - Descontar peso de bandeja
   - Registrar movimiento de inventario
   - Generar log de auditoría

### 5.3. Contabilidad
1. Todas las ventas deben tener método de pago registrado
2. Los pagos mixtos se desglosan por método
3. La conciliación diaria es obligatoria
4. Las discrepancias deben resolverse antes del cierre
5. El monto compuesto incluye todas las formas de pago

### 5.4. Auditoría
1. Todo movimiento debe registrarse en logs
2. Los logs incluyen: quién, qué, cuándo, dónde
3. Retención de logs en Redis: 30 días
4. Archivado histórico en PostgreSQL: Indefinido
5. Acceso a logs requiere permisos de administrador

## 6. Consideraciones Técnicas

### 6.1. Precisión de Cálculos
- Los pesos se almacenan en centigramos (enteros) para evitar errores de precisión decimal
- 1 gramo = 100 centigramos
- El margen de error de 0.5g = 50 centigramos

### 6.2. Concurrencia
- Las ventas simultáneas a la misma bandeja requieren transacciones con locking
- PostgreSQL proporciona transacciones ACID
- Implementar locking optimista o pesimista según necesidad

### 6.3. Logs y Caché
- Redis para logs en tiempo real y caché de consultas frecuentes
- Política de expiración en Redis para evitar acumulación
- Archivado periódico a PostgreSQL para logs históricos

### 6.4. Seguridad
- Autenticación y autorización para acceso al sistema
- Middleware de logging obligatorio para todas las operaciones
- Validaciones de integridad en cada transacción

## 7. Glosario

- **Ley de oro:** Porcentaje de pureza del oro (18k = 75%, 14k = 58.3%)
- **Bandeja:** Contenedor físico que almacena piezas de oro
- **Pesaje:** Medición del peso de una bandeja en un momento dado
- **Margen de error:** Tolerancia aceptable en diferencias de peso (±0.5g)
- **Conciliación:** Proceso de verificar que los registros coincidan con la realidad
- **Monto compuesto:** Total acumulado de ventas del día por todos los métodos de pago
- **Movimiento de inventario:** Cualquier cambio en el peso o cantidad de una bandeja
