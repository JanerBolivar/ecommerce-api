# Ecommerce API - Taller de Despliegue CI/CD

API RESTful de comercio electrónico pensada como **caso de estudio** para aprender despliegues modernos con **Nixpacks** y **Dokploy** (taller de CI/CD). El código fuente es una aplicación Node.js lista para construir e instalar con el orquestador; no incluye Dockerfile de producción propio.

## Arquitectura (MVC adaptado a APIs)

El proyecto sigue el patrón **MVC (Modelo-Vista-Controlador)** adaptado a una API sin vistas HTML:

| Capa | Carpeta | Responsabilidad |
|------|---------|-----------------|
| **Modelo** | `src/models/` | Definición de entidades y relaciones (Sequelize) |
| **Controlador** | `src/controllers/` | Lógica de negocio de cada recurso |
| **Rutas** | `src/routes/` | Declaración de endpoints y montaje de middlewares |
| **Middleware** | `src/middlewares/` | Auth, roles, validación y manejo global de errores |
| **Utilidades** | `src/utils/` | JWT, cookies, `ApiError`, logger (Winston) |

Complementos: `src/schemas/` (validaciones Zod), `src/config/` (entorno, PostgreSQL, Redis), `src/seeders/` (datos iniciales).

- `src/app.js`: instancia de Express (middlewares, CORS, documentación, `/api`).
- `src/server.js`: arranque del proceso (conexión a BD/Redis, seed opcional, `listen`).

## Stack tecnológico

| Tecnología | Uso principal |
|------------|----------------|
| **Node.js 22** (ES Modules) | Runtime y módulos `import`/`export` |
| **Express 5** | Framework HTTP / enrutado |
| **PostgreSQL + Sequelize** | Base de datos relacional y ORM |
| **Redis** | Caché de productos y Refresh Tokens |
| **Zod** | Validación de bodies (POST/PUT) |
| **Bcryptjs + JWT** | Hash de contraseñas y sesiones |
| **Swagger Autogen + Scalar UI** | Spec OpenAPI 3 e interfaz en `/docs` |
| **Winston + Morgan** | Logs en consola y archivos |

## Características principales

- Autenticación estricta por **cookies HttpOnly** (Access Token + Refresh Token en Redis); los tokens **no** van en el JSON de respuesta.
- Roles de usuario: **`admin`** (CRUD productos/categorías) y **`client`** (pedidos).
- Caché de listado de productos en Redis (TTL 1 hora) con invalidación en cada mutación.
- Pedidos con **transacción** y bloqueo de filas para descontar stock de forma atómica.
- Validación Zod en el borde de la API y errores con formato uniforme `{ "status": "error", "message": "..." }`.
- Healthcheck `GET /api/health` (PostgreSQL + Redis) y documentación interactiva en `/docs`.

## Variables de entorno

Copia `.env.example` a `.env` antes de arrancar (`env.js` falla si faltan las obligatorias).

| Variable | Obligatoria | Descripción |
|----------|:-----------:|-------------|
| `PORT` | ✅ | Puerto HTTP de la API (ej. `3000`) |
| `NODE_ENV` | | `development` / `production` (afecta cookies y logs) |
| `POSTGRES_USER` | ✅ | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | ✅ | Contraseña de PostgreSQL |
| `POSTGRES_DB` | ✅ | Nombre de la base de datos |
| `POSTGRES_HOST` | | Host de PostgreSQL (defecto `localhost`) |
| `POSTGRES_PORT` | | Puerto de PostgreSQL (defecto `5432`) |
| `REDIS_URL` | ✅ | URL de Redis, ej. `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | ✅ | Secreto del Access Token (corta vida) |
| `JWT_REFRESH_SECRET` | ✅ | Secreto del Refresh Token (**distinto** del access) |
| `JWT_ACCESS_EXPIRES_IN` | | Expiración access (defecto `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | | Expiración refresh (defecto `7d`) |
| `COOKIE_SECURE` | | `true` solo con HTTPS en producción |
| `COOKIE_SAME_SITE` | | `strict` \| `lax` \| `none` |
| `CORS_ORIGIN` | ✅ | Orígenes permitidos, separados por coma |
| `SEED_ON_BOOT` | | `true` = insertar datos demo si la BD está vacía |

> En Dokploy, estas mismas variables se configuran en la UI de la aplicación (Environment), apuntando a Postgres/Redis gestionados por la plataforma o por un compose externo.

## Nota sobre el despliegue (importante)

- La aplicación **no** está dockerizada en su código fuente para producción: **Dokploy** construye e instala el servicio con **Nixpacks** (detecta Node.js, ejecuta `npm install` y el script de inicio).
- El archivo `docker-compose.yml` de este repositorio es **exclusivamente** para levantar **PostgreSQL y Redis en desarrollo local**. No define la app en contenedores de producción.
- En el taller, la BD/Redis de runtime se proveen como servicios (variables de entorno + endpoints externos), no mediante ese compose de la raíz.

## Ejecución local

Requisitos: Node.js 22+, npm, Docker (solo para las bases de datos).

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env

# 3. Infraestructura local (PostgreSQL + Redis)
docker compose up -d

# 4. Arranque en desarrollo (nodemon)
npm run dev

# 5. (Opcional) Regenerar la spec OpenAPI
npm run swagger
```

| Recurso | URL |
|---------|-----|
| API | `http://localhost:3000/api/...` |
| Documentación (Scalar) | `http://localhost:3000/docs` |
| Spec OpenAPI | `http://localhost:3000/swagger.json` |
| Healthcheck | `http://localhost:3000/api/health` |

### Usuarios de prueba (seed)

| Rol | Email | Password |
|-----|-------|----------|
| admin | `admin@example.com` | `Admin123!` |
| client | `client@example.com` | `Client123!` |

Login: `POST /api/auth/login` → setea cookies HttpOnly; usarlas en el resto de peticiones autenticadas (no header `Authorization`).

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con recarga (nodemon) |
| `npm run start` | Servidor en modo producción (`node src/server.js`) |
| `npm run swagger` | Regenera `swagger.json` desde las anotaciones |
| `npm run seed` | Ejecuta los seeders idempotentes |
