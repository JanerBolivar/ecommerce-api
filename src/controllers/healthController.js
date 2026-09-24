// Este controlador implementa el endpoint de healthcheck (/api/health).
// Realiza un ping real (no simulado) a PostgreSQL y Redis; si AMBOS
// responden devuelve 200 OK, si alguno falla devuelve 503 Service
// Unavailable. Los orquestadores (Docker, Nixpacks, uptime monitors)
// usan este endpoint para decidir si la instancia está sana.

import { pingDatabase } from '../config/database.js';
import { pingRedis } from '../config/redis.js';

/**
 * Esta función verifica la salud de los dependencias críticas.
 * Se ejecutan los pings en paralelo (Promise.allSettled) para no
 * encadenar latencias; cada servicio se evalúa de forma independiente
 * y se responde con el código HTTP correspondiente al resultado global.
 */
export async function health(_req, res) {
  const [dbResult, redisResult] = await Promise.allSettled([
    pingDatabase(),
    pingRedis(),
  ]);

  const dbOk = dbResult.status === 'fulfilled';
  const redisOk = redisResult.status === 'fulfilled' && redisResult.value === true;

  const payload = {
    status: dbOk && redisOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      postgres: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
    },
  };

  // 200 si todo sano; 503 si algún servicio dependiente está caído.
  const httpStatus = dbOk && redisOk ? 200 : 503;
  res.status(httpStatus).json(payload);
}
