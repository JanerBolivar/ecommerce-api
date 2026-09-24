// Este módulo exporta un middleware genérico de validación con Zod.
// El patrón "validate(schema)" permite inyectar el esquema correcto en cada
// ruta desde su definición, manteniendo la validación fuera de los
// controladores (responsabilidad única: el controller solo ejecuta negocio).

import { ApiError } from '../utils/ApiError.js';

/**
 * Esta factory devuelve un middleware que valida req.body contra el esquema
 * Zod proporcionado. Si la validación falla, lanza un ApiError 400 con todos
 * los detalles de los campos inválidos; si pasa, continúa al siguiente
 * middleware/controlador con el body ya transformado (parse) por Zod.
 *
 * Uso en rutas: router.post('/', validate(loginSchema), controller.login)
 *
 * @param {import('zod').ZodType} schema - Esquema Zod del body esperado.
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Se formatean los errores de Zod en una lista legible:
      // "email: Email inválido; password: Requerido"
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');

      // ApiError 401/400 es capturado por el errorHandler global.
      return next(ApiError.badRequest(details));
    }

    // Se reemplaza el body con la versión parseada/transformada por Zod
    // (ej. coercion de tipos, valores por defecto aplicados).
    req.body = result.data;
    next();
  };
}
