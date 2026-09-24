// Este módulo centraliza la carga de variables de entorno mediante dotenv.
// Se encarga de validar que las variables críticas existan al arrancar,
// fallando temprano (fail-fast) en lugar de descubrir un error en producción.

import dotenv from 'dotenv';

// Carga las variables del archivo .env en process.env (no pisa existentes).
dotenv.config();

// Lista de variables obligatorias para que la aplicación funcione.
// Si falta alguna, se lanza un error explicando exactamente cuál.
const REQUIRED = [
  'PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGIN',
];

/**
 * Esta función verifica que todas las variables obligatorias estén presentes
 * y devuelve un objeto de configuración tipado/listo para consumir.
 * Se ejecuta una sola vez al importar el módulo para garantizar consistencia.
 */
function loadEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
        'Copia .env.example a .env y complétalo.'
    );
  }

  return Object.freeze({
    // Puerto HTTP de la aplicación.
    port: Number(process.env.PORT),
    // Entorno de ejecución: development | production | test.
    nodeEnv: process.env.NODE_ENV || 'development',
    // Indica si estamos en producción (para cookies secure, etc.).
    isProd: process.env.NODE_ENV === 'production',

    // Conexión a PostgreSQL leída desde las mismas variables del docker-compose.
    db: {
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
    },

    // URL de conexión al servidor Redis.
    redisUrl: process.env.REDIS_URL,

    // Secretos y tiempos de vida de los JWT. Los secretos del Access y del
    // Refresh Token son distintos para limitar el impacto de una fuga.
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // Configuración de cookies HttpOnly donde viajan los tokens.
    cookies: {
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE || 'strict',
    },

    // Orígenes permitidos por CORS, separados por coma en la variable.
    corsOrigins: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()),

    // Controla si los seeders se ejecutan automáticamente al arrancar.
    seedOnBoot: process.env.SEED_ON_BOOT === 'true',
  });
}

// Se exporta una única instancia ya validada (patrón singleton de config).
export const env = loadEnv();
