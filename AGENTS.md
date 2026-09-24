# AGENTS.md

Contexto obligatorio para OpenCode (u otro agente) al trabajar en este repositorio.

## Comandos exactos

```bash
docker compose up -d          # PostgreSQL 16 + Redis 7 (infra; la app corre fuera de Docker)
cp .env.example .env          # una vez; env.js falla al arrancar si falta alguna variable REQUIRED
npm install
npm run dev                   # nodemon src/server.js
npm run start                 # node src/server.js
npm run swagger               # regenera ./swagger.json (gitignored) desde anotaciones #swagger.*
npm run seed                  # seeders idempotentes (también con SEED_ON_BOOT=true al arrancar)
```

No hay scripts de lint, typecheck, test ni formatter. Verificación mínima: `node --check <archivo>` y arrancar + `GET /api/health`.

## Reglas de arquitectura (MVC estricto)

- **Nada de lógica de base de datos en los controllers**: acceso a tablas solo en `models/` (Sequelize) o, si es transaccional, invocando modelos desde el controller con `sequelize.transaction`. Un controller no escribe SQL crudo ni `sequelize.query` de negocio disperso fuera de ese patrón.
- **Nada de lógica de negocio en las rutas**: `routes/` solo declara middlewares (`validate`, `requireAuth`, `requireRole`) y **delega** al controller. No se calcula, no se consulta BD, no se responde con status ad-hoc en el archivo de rutas.
- Capas reales bajo `src/`: `routes/` → `controllers/` → `models/` + `middlewares/` + `schemas/` (Zod) + `config/` + `utils/`.
- `src/app.js` = instancia Express (middlewares, CORS, /docs, montaje `/api`). `src/server.js` = bootstrap (authenticate → sync → Redis → seed opcional → listen). Fail-fast: si BD/Redis no están, el proceso sale con código 1.

## Reglas de sintaxis

- **ES Modules obligatorio**: `"type": "module"`, siempre `import`/`export`. **Prohibido `require()`** y `module.exports` en el código de la app.
- Node 22, Express 5, sin TypeScript.

## Seguridad

- **JWT solo en cookies `HttpOnly`** (`accessToken` ~15m, `refreshToken` ~7d en Redis `refreshToken:{userId}`). **Nunca** devolver tokens en el payload JSON ni usar header `Authorization`.
- Refresh y logout: invalidan cookie **y** clave Redis. Passwords hasheados con bcryptjs.
- Mutaciones admin: `requireAuth` + `requireRole(['admin'])`. `app.set('trust proxy', 1)` ya está (Cloudflare).
- Caché Redis de productos (`products:all`, TTL 1h): **toda mutación debe `del` esa clave**.
- Pedidos: transacción + `lock: t.LOCK.UPDATE` + `product.decrement` atómico. El precio se lee de BD, nunca del body.

## Validación de datos

- **Toda petición POST/PUT/PATCH** debe validarse con un schema **Zod** inyectado como middleware en la ruta: `validate(schema)`.
- Schemas en `src/schemas/*.schemas.js`. No validar a mano dentro del controller.

## Documentación de endpoints (obligatorio)

- Cualquier endpoint nuevo lleva bloque `swagger-autogen` documentando al menos **body** (si aplica) y **tags**, dentro del callback inline de la ruta.
- Trampas reales de este repo:
  - Generador en modo **OpenAPI 3.0** (`npm run swagger` → `swagger.json`). El body va en `requestBody.content["application/json"].schema`, **no** en `parameters[]`.
  - `#swagger.*` solo se asocia si está **dentro** de `router.*(…, (req, res, next) => { /* #swagger... */ return controller(req, res, next); })`.
  - En `schema:` del body usar **valores ejemplo planos** (`name: "Laptop"`), no JSON Schema anidado.
  - Recurso nuevo: montar en `routes/index.js` **y** añadir entrada en `ROUTE_MOUNTS` de `swagger.js`.
  - `// #swagger.summary` fuera del callback no se captura.
  - UI: `GET /docs` (Scalar); spec: `GET /swagger.json`.

## Manejo de errores

- Todo error debe llegar al middleware global `errorHandler` con **`next(error)`** (o `throw` en Express 5) para mantener el formato:
  ```json
  { "status": "error", "message": "..." }
  ```
- Errores de negocio: `ApiError.*` (`src/utils/ApiError.js`). No inventar respuestas 4xx/5xx sueltas en controllers sin pasar por `errorHandler`.
- Errores no controlados: `logger.error` con stack → `server.err.log` + 500 genérico al cliente.

## Convenciones que un agente suele romper

- **Comentarios en español, tercera persona, explicando el por qué** ("Esta función verifica...").
- **Nunca `console.*` en `src/`**: `import { logger } from '../utils/logger.js'` → `logger.info/error` (Winston: consola + `server.log` + `server.err.log`). Morgan ya escribe por `logger.info`.
- No crear `.md` de documentación salvo que se pida (README/AGENTS son excepciones ya existentes o explícitas).

## Infra y entorno

- `.env` requerido (ver `.env.example`): PORT, POSTGRES_*, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN. `env.js` lanza si falta alguna.
- Credenciales seed: `admin@example.com / Admin123!`, `client@example.com / Client123!`.
- Health: `GET /api/health` → 200/503. Redis caído → `GET /api/products` puede devolver 500.
- `swagger.json`, `*.log`, `.env` en `.gitignore`. `opencode.json`: `permission.edit/bash: allow`.

## Flujo típico de cambio en un endpoint

1. Schema Zod en `src/schemas/`.
2. Controller: try/catch → `next(err)` o `ApiError`. Sin SQL suelto ni respuestas inconsistentes.
3. Ruta: anotaciones `#swagger.*` **dentro del callback inline** + `validate()` + auth/rol; solo delegación al controller.
4. Recurso nuevo: `routes/index.js` + `ROUTE_MOUNTS` en `swagger.js`.
5. `npm run swagger` y smoke test (login → cookie → mutación).
