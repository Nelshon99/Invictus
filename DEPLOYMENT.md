# Guía de Despliegue — Invictus en Supabase + Koyeb + Vercel

Esta guía explica cómo desplegar el sistema de inventario Invictus en plataformas gratuitas.

## Arquitectura del despliegue

| Componente | Plataforma | URL |
|---|---|---|
| **Base de datos PostgreSQL** | [Supabase](https://supabase.com) (gratis 500 MB) | `db.XX.supabase.co` |
| **Redis (caché)** | [Upstash](https://upstash.com) (gratis 10,000 comandos/día) | `XX.upstash.io` |
| **Backend (API)** | [Koyeb](https://koyeb.com) (gratis, siempre encendido) | `invictus-backend-XX.koyeb.app` |
| **Frontend (UI)** | [Vercel](https://vercel.com) (gratis, CDN global) | `invictus-frontend.vercel.app` |

---

## Esquemas de base de datos

El proyecto usa **dos schemas de Prisma** para soportar desarrollo local y producción:

| Entorno | Schema | Base de datos | Archivo |
|---|---|---|---|
| **Desarrollo** | `schema.dev.prisma` | SQLite (local) | `backend/prisma/dev.db` |
| **Producción** | `schema.prisma` | PostgreSQL (Supabase) | URL de conexión |

Los scripts de `package.json` usan el schema automáticamente:
- `npm run prisma:generate` → genera el cliente con SQLite (desarrollo)
- `npm run prisma:migrate` → migra la BD de SQLite (desarrollo)
- `npm run prisma:deploy` → migra la BD de PostgreSQL (producción)
- `npm run deploy` → genera y migra PostgreSQL (producción)

---

## Paso 1: Crear base de datos en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un nuevo proyecto:
   - **Name**: `Invictus`
   - **Database Password**: Elige una contraseña segura (guárdala)
   - **Region**: Elige la más cercana (ej. `South America (Buenos Aires)`)
3. Una vez creado, ve a **Project Settings → Database**
4. Copia la **Connection string** (Direct mode), se ve así:
   ```
   postgresql://postgres.[project-ref]:YOUR_PASSWORD@db.[project-ref].supabase.co:5432/postgres
   ```

---

## Paso 2: Crear Redis en Upstash

1. Ve a [https://upstash.com](https://upstash.com) y crea una cuenta gratuita
2. Click en **Create Database**:
   - **Name**: `invictus-redis`
   - **Region**: Elige la más cercana a Koyeb (ej. `Falkenstein, DE` o `Frankfurt`)
3. Una vez creado, ve a la pestaña **CLI URL** y copia la URL:
   ```
   redis://default:YOUR_PASSWORD@XX.upstash.io:6379
   ```

---

## Paso 3: Desplegar el Backend en Koyeb

### Opción A: Desde GitHub (recomendado)

1. Ve a [https://app.koyeb.com](https://app.koyeb.com) y crea una cuenta
2. Conecta tu repositorio de GitHub (`Nelshon99/Invictus`)
3. Crea un nuevo servicio:
   - **Name**: `invictus-backend`
   - **Git provider**: GitHub
   - **Repository**: `Nelshon99/Invictus`
   - **Branch**: `main`
   - **Build command**: `cd backend && npm ci && npm run build && npm run deploy`
   - **Run command**: `cd backend && npm start`
   - **Dockerfile**: No (usar build presets)

### Variables de entorno en Koyeb

En la sección **Environment variables** del servicio, agrega:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DATABASE_URL` | `(tu URL de Supabase del paso 1)` |
| `REDIS_URL` | `(tu URL de Upstash del paso 2)` |
| `JWT_SECRET` | `(genera una clave aleatoria, ej. con `openssl rand -base64 32`))` |
| `JWT_EXPIRES_IN` | `24h` |
| `LOG_LEVEL` | `info` |
| `WEIGHING_TOLERANCE_CG` | `50` |

### Exponer el servicio

- En **Instances → Ingress**, activa **Publicly exposed**
- Puerto: `8080`
- Koyeb te asignará una URL como `invictus-backend-XX.koyeb.app`

---

## Paso 4: Desplegar el Frontend en Vercel

### Opción A: Desde GitHub (recomendado)

1. Ve a [https://vercel.com](https://vercel.com) y crea una cuenta
2. Click en **Add New → Project**
3. Importa `Nelshon99/Invictus` desde GitHub
4. Configura el proyecto:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Variables de entorno en Vercel

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://invictus-backend-XX.koyeb.app` (sin `/api/v1`) |

El frontend ya incluye `vercel.json` que reescribe `/api/v1/*` automáticamente. Solo necesitas configurar la variable `VITE_API_URL` con la URL de tu backend en Koyeb.

---

## Paso 5: Migrar la base de datos

Después de desplegar el backend en Koyeb, ejecuta las migraciones:

```bash
# En tu máquina local, apunta a la BD de Supabase
cd backend
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

O desde el panel de Koyeb, ejecuta un **command instance** una vez:

```bash
cd backend && npx prisma migrate deploy
```

---

## Resumen de URLs después del despliegue

| Servicio | URL de ejemplo |
|---|---|
| **Frontend (UI)** | `https://invictus-frontend.vercel.app` |
| **Backend (API)** | `https://invictus-backend-XX.koyeb.app/api/v1` |
| **Supabase (BD)** | Panel en `https://supabase.com/dashboard` |
| **Upstash (Redis)** | Panel en `https://console.upstash.com` |

---

## Costos estimados

| Servicio | Plan | Costo mensual |
|---|---|---|
| Supabase | Free | $0 (500 MB BD) |
| Upstash | Free | $0 (10,000 comandos/día) |
| Koyeb | Free | $0 (0.1 CPU, 512 MB RAM) |
| Vercel | Hobby | $0 (CDN ilimitado) |
| **Total** | | **$0/mes** |

---

## Solución de problemas

### El backend no se conecta a Supabase
- Verifica que la IP de Koyeb esté en la lista blanca de Supabase (Project Settings → Database → Network)
- Usa la conexión string **Direct** (no Pooler) en `DATABASE_URL`

### Redis no se conecta
- Verifica que la URL de Upstash incluya el usuario `default` y la contraseña
- Formato correcto: `redis://default:PASSWORD@host:6379`

### El frontend no puede conectar con el backend
- Verifica que `VITE_API_URL` en Vercel apunte a la URL correcta de Koyeb
- Si usas `vercel.json` rewrites, asegúrate de que el backend tenga CORS habilitado
