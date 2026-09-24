// Este módulo construye y configura la instancia de Express (la "app").
// Separar app.js de server.js permite testear la app sin abrir un puerto
// (útil en CI/CD) y deja en server.js únicamente el arranque del proceso
// (conexión a BD/Redis y listen).

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { apiReference } from '@scalar/express-api-reference';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Confía en el primer proxy inverso (Cloudflare, nginx, etc.).
// Sin esto, req.ip y el esquema de las cookies secure (https) se reportarían
// mal detrás del proxy, rompiendo CORS/cookies en producción.
app.set('trust proxy', 1);

// --- Middlewares globales de primer nivel ---

// Parsea JSON bodies con un límite de 100kb (evita abusos de payload).
app.use(express.json({ limit: '100kb' }));

// Parsea las cookies HttpOnly enviadas por el navegador en req.cookies.
app.use(cookieParser());

// --- Logging HTTP (Morgan → Winston) ---
// Token personalizado: captura la IP REAL del cliente detrás de Cloudflare.
// Prioridad: cf-connecting-ip (header nativo de Cloudflare) → x-forwarded-for
// (cadena de proxies) → req.ip (derivado de trust proxy como último recurso).
morgan.token('client-ip', (req) => {
  return (
    req.headers['cf-connecting-ip'] ||
    // x-forwarded-for puede traer "cliente, proxy1, proxy2": nos quedamos con el primero.
    (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) ||
    req.ip ||
    '-'
  );
});

// Formato personalizado: IP - MÉTODO URL STATUS - TIEMPOS ms
// Ejemplo: 198.51.100.14 - GET /api/products 200 - 45ms
// Usa :response-time[ms] de Morgan para el tiempo total de respuesta.
const morganFormat =
  ':client-ip - :method :url :status - :response-time[ms]ms';

// Se registra ANTES de las rutas para cronometrar toda la cadena de middlewares.
// El callback custom redirige cada línea a logger.info → consola + server.log.
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        // Morgan añade un \n final; se recorta para no duplicar líneas en file transports.
        logger.info(message.trim());
      },
    },
  })
);

// Configuración de CORS:
// - credentials: true permite que el navegador envíe/reciba cookies
//   (necesario para el flujo de auth por cookies HttpOnly).
// - origin se resuelve desde CORS_ORIGIN (lista) + el propio host de la API
//   para que Scalar UI (/docs) funcione aunque esté en el mismo dominio.
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Requests sin origin (curl, Postman, server-to-server) se permiten.
      if (!origin) return callback(null, true);

      // Orígenes explícitos de la variable de entorno.
      const allowed = env.corsOrigins;

      // Se añade dinámicamente el origen de la propia API (ej. para Scalar).
      const selfOrigins = [
        `http://localhost:${env.port}`,
        `https://localhost:${env.port}`,
      ];

      if (allowed.includes(origin) || selfOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Origen no permitido → se bloquea con un error claro de CORS.
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
  })
);

// Sirve el swagger.json generado en la raíz del proyecto para que
// Scalar (y cualquier otro cliente OpenAPI) pueda leer la especificación.
app.get('/swagger.json', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'swagger.json'));
});

// --- Documentación interactiva (Scalar UI sirve swagger.json) ---
app.use(
  '/docs',
  apiReference({
    // Ruta al archivo OpenAPI generado por `npm run swagger`.
    spec: { url: '/swagger.json' },
    theme: 'purple',
  })
);

// --- Montaje de rutas de la API ---
app.use('/api', apiRoutes);

// Handler de rutas inexistentes (404) con estructura JSON consistente.
app.use(notFoundHandler);

// Handler global de errores: SIEMPRE el último middleware registrado.
app.use(errorHandler);

export default app;
