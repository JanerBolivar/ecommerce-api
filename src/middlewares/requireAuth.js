// Este módulo define el middleware de autenticación. Verifica la presencia
// y validez del Access Token viajando en la cookie HttpOnly "accessToken".
// Al decodificar el token, inyecta el payload en req.user para que los
// controladores y requireRole puedan conocer al usuario autenticado sin
// volver a consultar la base de datos.

import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

// Nombre canónico de la cookie donde se guarda el Access Token.
export const ACCESS_COOKIE = 'accessToken';

/**
 * Esta función verifica el Access Token de las cookies.
 * - Si no existe la cookie → 401 "Autenticación requerida".
 * - Si el token expiró o la firma es inválida → 401 "Token inválido o expirado".
 * - Si es válido → inyecta { userId, role } en req.user y continúa.
 *
 * Nota: la expiración se confirma aquí de forma explícita (payload.exp)
 * además de la verificación de firma, para mensajes de error claros.
 */
export function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE];

    if (!token) {
      return next(ApiError.unauthorized('Autenticación requerida: falta el Access Token'));
    }

    const payload = verifyAccessToken(token);

    // Se adjunta el payload al request: queda disponible en toda la cadena.
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    // Cualquier error de jwt.verify (TokenExpiredError, JsonWebTokenError...)
    // se traduce a un 401 uniforme para no filtrar detalles de la firma.
    return next(ApiError.unauthorized('Token inválido o expirado'));
  }
}
