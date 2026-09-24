// Este módulo configura y exporta la instancia de Sequelize conectada a
// PostgreSQL. La conexión se crea una sola vez y se reutiliza en todos los
// modelos para evitar abrir pools de conexiones innecesarios.

import { Sequelize } from 'sequelize';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Sequelize gestiona un pool de conexiones internamente; configurarlo aquí
// permite ajustar tiempos de espera sin tocar cada modelo.
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  username: env.db.user,
  password: env.db.password,
  // Log de SQL solo en desarrollo, redirigido al logger de Winston
  // (consola + server.log) en lugar de console.log nativo.
  logging: env.isProd ? false : (msg) => logger.debug(msg),
  pool: {
    max: 10, // Máximo de conexiones simultáneas en el pool.
    min: 0,
    acquire: 30000, // ms máximos para obtener una conexión del pool.
    idle: 10000, // ms que una conexión puede estar inactiva antes de liberarse.
  },
});

/**
 * Esta función verifica la conexión a PostgreSQL con un ping simple.
 * Se utiliza en el endpoint /api/health para reportar el estado del servicio
 * sin ejecutar consultas costosas.
 */
export async function pingDatabase() {
  await sequelize.authenticate();
}
