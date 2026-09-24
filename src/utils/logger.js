// Este módulo define el servicio de logging centralizado de la aplicación
// basado en Winston. Sustituye al console global para garantizar:
// - Consola con colores legibles en desarrollo.
// - Archivo físico server.log con TODOS los logs de nivel info+ (auditoría
//   de peticiones HTTP, arranque, seeders...).
// - Archivo físico server.err.log SOLO con errores (stack traces), para
//   separar la señal de error del ruido operativo en producción.
//
// Se exporta una única instancia (singleton): todos los módulos comparten
// el mismo logger y, por tanto, los mismos transports y formatos.

import winston from 'winston';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Raíz del proyecto (src/utils → subir dos niveles).
const ROOT = path.join(__dirname, '..', '..');

// Formato de consola: colores por nivel + mensaje simple + timestamp ISO.
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ssZ' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${level} ${timestamp}: ${message}`;
  })
);

// Formato de archivo: JSON con timestamp ISO para machine-readable logs
// (facilita greps, ingests a ELK/Loki y depuración posterior).
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ssZ' }),
  winston.format.errors({ stack: true }), // Incluye stack en err.message si es Error.
  winston.format.json()
);

/**
 * Esta función crea y exporta el logger de Winston con 3 transports:
 * 1. Console  → nivel debug+ con color (desarrollo e inspección en vivo).
 * 2. server.log     → nivel info+  (todas las peticiones y eventos).
 * 3. server.err.log → nivel error  (únicamente fallos y stacks).
 */
export const logger = winston.createLogger({
  // Nivel mínimo global: en producción solo info+; en dev se permite debug.
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Métodos de excepción/captura para no perder stacks.
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(ROOT, 'server.err.log') }),
  ],
  transports: [
    // 1) Consola con colores y formato simple.
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // 2) Archivo general: todo lo que sea info o superior.
    //    Aquí caen las líneas de Morgan (peticiones HTTP) y el arranque.
    new winston.transports.File({
      filename: path.join(ROOT, 'server.log'),
      level: 'info',
      format: fileFormat,
      tailable: true, // Rotación simple: server.log siempre es el actual.
      maxsize: 5 * 1024 * 1024, // 5 MB antes de rotar (opcional, winston lo maneja).
    }),

    // 3) Archivo de errores: SOLO nivel error (y por encima: warn no entra).
    //    Stack traces de errorHandler y fallos fatales de bootstrap.
    new winston.transports.File({
      filename: path.join(ROOT, 'server.err.log'),
      level: 'error',
      format: fileFormat,
      tailable: true,
    }),
  ],
});

// Nota: winston omite logs cuyo nivel sea inferior al configurado en
// `level` global. Con 'info' en producción, los debug() no se escriben.
logger.info('[Logger] Sistema de logs inicializado (consola + server.log + server.err.log)');

export default logger;
