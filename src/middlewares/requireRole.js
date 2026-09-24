// Este módulo define el middleware de autorización por roles (RBAC).
// Debe usarse SIEMPRE después de requireAuth, ya que depende de req.user
// que dicho middleware inyecta. Separa "quién eres" (auth) de "qué puedes
// hacer" (authz), siguiendo el principio de responsabilidad única.

import { ApiError } from '../utils/ApiError.js';

/**
 * Esta factory devuelve un middleware que verifica que el rol del usuario
 * autenticado esté incluido en la lista de roles permitidos.
 *
 * Ejemplo de uso en una ruta:
 *   router.post('/', requireAuth, requireRole(['admin']), controller.create)
 *
 * Si req.user no existe (requireAuth no corrió), responde 401;
 * si el rol no está permitido, responde 403.
 *
 * @param {string[]} roles - Array de roles autorizados (ej. ['admin']).
 */
export function requireRole(roles) {
  return (req, _res, next) => {
    // Guardia defensiva: si no hay usuario en el request, la cadena de
    // middlewares se montó mal (requireAuth faltó o no corrió).
    if (!req.user) {
      return next(ApiError.unauthorized('Autenticación requerida'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Acceso denegado: requiere rol ${roles.join(' o ')}`)
      );
    }

    next();
  };
}
