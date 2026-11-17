# Inventario Contabilidad Invictus

Sistema de gestión de inventario y contabilidad para joyería Invictus, especializado en el manejo de oro Italiano (Ley 18) y oro Nacional Colombiano.

## 📋 Descripción

Este sistema permite gestionar:
- **Inventario de bandejas** con pesajes de apertura y cierre
- **Ventas** con descuento automático de peso en bandejas
- **Contabilidad** con múltiples métodos de pago y conciliación diaria
- **Auditoría** con logs en tiempo real y trazabilidad completa

## 🏗️ Arquitectura

```
inventario-contabilidad-invictus/
├── backend/          # API REST con Node.js, Express, TypeScript
├── frontend/         # UI con React, TypeScript, Vite, TailwindCSS
├── docs/            # Documentación del negocio y técnica
└── package.json     # Monorepo con workspaces
```

### Tecnologías

- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Base de datos:** PostgreSQL (datos transaccionales)
- **Caché y Logs:** Redis (logs en tiempo real y caché)
- **Frontend:** React, TypeScript, Vite, TailwindCSS, React Query

## 🚀 Inicio Rápido

### Requisitos
- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6.0

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd inventario-contabilidad-invictus

# Instalar dependencias
npm install

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar .env con tus credenciales de PostgreSQL y Redis

# Ejecar migraciones de base de datos
cd backend
npx prisma migrate dev
npx prisma generate

# Iniciar en modo desarrollo
npm run dev
```

## 📖 Documentación

- [Documentación del Negocio](docs/negocio-oro.md) - Flujo de operaciones, reglas de negocio, glosario
- [API Documentation](backend/docs/api.md) - Endpoints y schemas

## 🔄 Flujo de Operaciones

1. **Apertura:** Pesaje de bandejas al iniciar el día
2. **Ventas:** Descuento de peso en bandejas durante el día
3. **Cierre:** Validación de pesos con margen de error ±0.5g
4. **Conciliación:** Reporte diario por método de pago

## 📦 Módulos

### Inventario
- Gestión de bandejas
- Pesajes de apertura y cierre
- Movimientos de inventario
- Validación de pesos

### Contabilidad
- Registro de ventas
- Múltiples métodos de pago
- Conciliación diaria
- Reportes financieros

### Logs
- Auditoría en tiempo real
- Trazabilidad completa
- Archivado histórico

## 🧪 Tests

```bash
# Ejecutar todos los tests
npm test

# Tests del backend
npm run test:backend

# Tests del frontend
npm run test:frontend
```

## 📝 Licencia

Propietario - Joyería Invictus
