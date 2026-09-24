// Este middleware es el manejador global de errores de la aplicación.
// Express lo reconoce automáticamente por recibir 4 parámetros (err, req, res, next)
// y debe registrarse COMO ÚLTIMO middleware. Toda excepción lanzada en una
// ruta (incluidas promesas rechazadas en Express 5) termina aquí, garantizando
// que el cliente siempre reciba la estructura JSON: { status: "error", message }.
//
// Los errores inesperados se registran con logger.error → server.err.log
// (stack trace persistente) además de la consola.

import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Esta función captura cualquier error, lo clasifica y responde con el
 * código HTTP correspondiente. Los errores de negocio (ApiError) muestran
 * su mensaje; los errores inesperados devuelven un mensaje genérico para
 * no filtrar detalles internos al cliente (buena práctica de seguridad),
 * mientras que el stack completo sí se registra en server.err.log.
 */
export function errorHandler(err, req, res, _next) {
  // Si es un ApiError (error controlado), se respeta su status y mensaje.
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      status: 'error',
      message: err.message,
    });
  }

  // Errores de Sequelize de violación de unicidad (ej. email duplicado).
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      status: 'error',
      message: 'El recurso ya existe (valor duplicado)',
    });
  }

  // Errores de validación de Sequelize (aunque usamos Zod como primera línea).
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      status: 'error',
      message: err.errors?.[0]?.message || 'Validación fallida',
    });
  }

  // Errores de sintaxis JSON malformado en el body.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 'error',
      message: 'JSON inválido en el cuerpo de la solicitud',
    });
  }

  // Error inesperado: se loguea el stack completo en server.err.log (y consola)
  // pasando el objeto Error completo (winston captura err.stack con format.errors).
  logger.error(`[Error] ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  // ...y se responde con un mensaje genérico (no se filtra el stack al cliente).
  // En desarrollo se incluye el mensaje real para facilitar la depuración.
  const message = env.isProd ? 'Error interno del servidor' : err.message || 'Error interno del servidor';

  return res.status(500).json({
    status: 'error',
    message,
  });
}

/**
 * Esta función maneja rutas inexistentes (404). Se registra después de todas
 * las rutas y antes del errorHandler para que cualquier URL no definida
 * responda con la misma estructura JSON estandarizada.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}
