// Este módulo configura el cliente de Redis. Redis se usa para dos cosas:
// 1. Caché de listados públicos (productos) con TTL para reducir carga a BD.
// 2. Almacenar Refresh Tokens por usuario (clave refreshToken:{userId}) para
//    poder revocarlos en el logout o si se detecta un robo de sesión.

import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// El cliente se crea con lazyConnect para que la conexión sea explícita:
// el proceso no intenta conectarse hasta llamar a connectRedis().
export const redisClient = createClient({
  url: env.redisUrl,
});

// Redis v4+ emite errores asincrónicos en "error" sin manejador;
// registrarlos evita que el proceso muera por un error no capturado.
redisClient.on('error', (err) => {
  logger.error(`[Redis] Error de conexión: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('[Redis] Conectando...');
});

redisClient.on('ready', () => {
  logger.info('[Redis] Conectado y listo.');
});

/**
 * Esta función establece la conexión con Redis de forma idempotente:
 * si ya está conectada, no hace nada. Se invoca al arrancar el servidor
 * y en el healthcheck como respaldo.
 */
export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

/**
 * Esta función verifica que Redis responda con un PING.
 * Devuelve true si el servidor está operativo; cualquier fallo se captura
 * y se traduce en false para que el healthcheck pueda devolver HTTP 503.
 */
export async function pingRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
