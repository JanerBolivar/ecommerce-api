// Este módulo es el punto de entrada real del proceso Node.js.
// Responsabilidades: conectar PostgreSQL y Redis, ejecutar seeders
// opcionales y levantar el servidor HTTP. Si la infraestructura no está
// disponible, el proceso FALLA de forma explícita (fail-fast) en lugar de
// arrancar "a medias" y devolver errores 500 en cada request.
//
// Todos los mensajes usan el logger de Winston (consola + server.log/err.log)
// en lugar de console.*, para mantener un formato de log consistente.

import app from './app.js';
import { env } from './config/env.js';
import { sequelize } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { runSeeders } from './seeders/seed.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  // 1. Verificar conexión a PostgreSQL (lanza si no conecta).
  await sequelize.authenticate();
  logger.info('[DB] PostgreSQL conectado.');

  // 2. Sincronizar esquema. synchronize es cómodo en desarrollo/demo;
  // en producción real se preferirían migraciones (umzug/sequelize-cli).
  // alter: true actualiza columnas existentes sin borrar datos.
  await sequelize.sync({ alter: true });
  logger.info('[DB] Esquema sincronizado.');

  // 3. Conectar a Redis (caché + Refresh Tokens).
  await connectRedis();

  // 4. Seeders opcionales: solo si SEED_ON_BOOT=true y la BD está vacía.
  if (env.seedOnBoot) {
    await runSeeders();
  }

  // 5. Levantar el servidor HTTP en el puerto configurado.
  app.listen(env.port, () => {
    logger.info(`[Server] API escuchando en http://localhost:${env.port}`);
    logger.info(`[Docs]  Documentación en http://localhost:${env.port}/docs`);
    logger.info(`[Health] Healthcheck en http://localhost:${env.port}/api/health`);
  });
}

// Captura de errores de arranque: se loguea como error (va a server.err.log)
// y se sale con código 1 para que el orquestador (systemd, Docker, Nixpacks)
// sepa que falló.
bootstrap().catch((err) => {
  logger.error('[Server] Error fatal al arrancar:', err);
  process.exit(1);
});
