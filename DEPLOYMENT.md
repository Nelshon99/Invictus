# Guía de Despliegue — Invictus

Esta guía explica cómo desplegar el sistema de inventario Invictus en producción.

## Estado actual del código

El código está **preparado para producción** con las siguientes características:

- **Dos schemas de Prisma**: SQLite para desarrollo local, PostgreSQL para producción
- **Redis opcional**: El backend funciona con o sin caché
- **Frontend servido por el backend**: En producción, el backend sirve los archivos estáticos del frontend
- **Variables de entorno**: Todas configurables vía `.env`

## Esquemas de base de datos

| Entorno | Schema | Base de datos | Archivo |
|---|---|---|---|
| **Desarrollo** | `schema.dev.prisma` | SQLite (local) | `backend/prisma/dev.db` |
| **Producción** | `schema.prisma` | PostgreSQL | URL de conexión |

Scripts de `package.json`:
- `npm run prisma:generate` → genera el cliente con SQLite (desarrollo)
- `npm run prisma:migrate` → migra la BD de SQLite (desarrollo)
- `npm run prisma:deploy` → migra la BD de PostgreSQL (producción)
- `npm run deploy` → genera y migra PostgreSQL (producción)

---

## Plataformas recomendadas

El proyecto requiere una plataforma que **instale todas las dependencias** (incluyendo `devDependencies` como TypeScript y `@types/*`) durante el build.

### ✅ Plataformas compatibles

| Plataforma | Backend | PostgreSQL | Redis | Notas |
|---|---|---|---|---|
| **Railway** | ✅ | ✅ | ✅ | Instala todas las dependencias. $5 crédito gratis/mes. Requiere tarjeta. |
| **Fly.io** | ✅ | ✅ | ❌ | $5 crédito gratis. Requiere tarjeta. |
| **VPS (DigitalOcean, Hetzner)** | ✅ | ✅ | ✅ | Control total. ~$5-10/mes. |

### ❌ Plataformas no compatibles

| Plataforma | Problema |
|---|---|
| **Render** | No instala `devDependencies` en producción. TypeScript necesita `@types/*` para compilar. |

---

## Despliegue en Railway (recomendado)

Railway es la opción más simple porque instala todas las dependencias automáticamente.

### Paso 1: Crear base de datos en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un proyecto: **Name**: `Invictus`, elige región cercana
3. Ve a **Project Settings → Database**
4. Copia la **Connection string** (Direct mode):
   ```
   postgresql://postgres.[ref]:PASSWORD@db.[ref].supabase.co:5432/postgres
   ```

### Paso 2: Crear Redis en Upstash (opcional)

1. Ve a [https://upstash.com](https://upstash.com) y crea una cuenta
2. Crea una base de datos Redis
3. Copia la **CLI URL**:
   ```
   redis://default:PASSWORD@host.upstash.io:6379
   ```

### Paso 3: Desplegar en Railway

1. Ve a [https://railway.app](https://railway.app) y crea una cuenta
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona `Nelshon99/Invictus`
4. Railway detectará automáticamente Node.js
5. Configura las variables de entorno:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DATABASE_URL` | `(tu URL de Supabase)` |
| `REDIS_URL` | `(tu URL de Upstash, opcional)` |
| `JWT_SECRET` | `(clave aleatoria, ej. `openssl rand -base64 32`)` |
| `JWT_EXPIRES_IN` | `24h` |
| `LOG_LEVEL` | `info` |
| `WEIGHING_TOLERANCE_CG` | `50` |

6. Configura el build:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build && npm run deploy`
   - **Start Command**: `npm start`

### Paso 4: Desplegar el Frontend en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. **Add New → Project** → Importa `Nelshon99/Invictus`
3. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Variable de entorno:
   - `VITE_API_URL`: `https://tu-servicio.railway.app`

---

## Despliegue en VPS

Para un VPS (DigitalOcean, Hetzner, etc.):

```bash
# Clonar el repositorio
git clone git@github.com:Nelshon99/Invictus.git
cd Invictus

# Instalar dependencias
cd backend && npm install
cd ../frontend && npm install && npm run build
cd ..

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# Generar Prisma y migrar BD
cd backend && npm run deploy

# Iniciar con PM2 (ejemplo)
npm install -g pm2
pm2 start npm --name "invictus-backend" -- start
pm2 save
pm2 startup
```

---

## Variables de entorno requeridas

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | URL de PostgreSQL (Supabase, Neon, etc.) |
| `JWT_SECRET` | ✅ | Clave secreta para tokens JWT |
| `PORT` | ✅ | Puerto del servidor (8080 en producción) |
| `NODE_ENV` | ✅ | `production` |
| `REDIS_URL` | ❌ | URL de Redis (Upstash). Opcional, el backend funciona sin caché. |
| `REDIS_HOST` | ❌ | Host de Redis (alternativa a REDIS_URL) |
| `REDIS_PORT` | ❌ | Puerto de Redis (alternativa a REDIS_URL) |
| `JWT_EXPIRES_IN` | ❌ | Duración del token JWT (default: `24h`) |
| `LOG_LEVEL` | ❌ | Nivel de logs (default: `info`) |
| `WEIGHING_TOLERANCE_CG` | ❌ | Tolerancia de pesaje en centigramos (default: `50` = ±0.50g) |

---

## Costos estimados

| Servicio | Plan | Costo mensual |
|---|---|---|
| Supabase | Free | $0 (500 MB BD) |
| Upstash | Free | $0 (10,000 comandos/día) |
| Railway | Free tier | $5 crédito gratis/mes |
| Vercel | Hobby | $0 (CDN ilimitado) |
| **Total** | | **$0-5/mes** |

---

## Solución de problemas

### El backend no se conecta a Supabase
- Verifica que la conexión string use el modo **Direct** (no Pooler)
- En Supabase, verifica que no haya restricciones de IP

### Redis no se conecta
- El backend funciona sin Redis. Si no configuras Redis, simplemente omite `REDIS_URL`
- Formato correcto: `redis://default:PASSWORD@host:6379`

### El frontend no puede conectar con el backend
- Verifica que `VITE_API_URL` en Vercel apunte a la URL correcta del backend
- El backend tiene CORS habilitado por defecto
