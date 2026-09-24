// Este módulo encapsula la creación y verificación de JSON Web Tokens.
// Separarlo en utils permite reutilizar la misma lógica (secretos, tiempos,
// payloads) desde login, refresh y middlewares sin duplicar código.

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Esta función genera un Access Token firmado con el secreto corto.
 * El payload contiene solo los datos mínimos necesarios para autorizar
 * (id y role): no se mete información sensible porque el JWT viaja en
 * cookies y cualquier cliente puede leer su payload (aunque no falsificarlo).
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

/**
 * Esta función genera un Refresh Token firmado con un secreto distinto.
 * Su única misión es poder emitir nuevos Access Tokens en /auth/refresh;
 * por eso el payload es mínimo (solo userId).
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

/**
 * Esta función verifica y decodifica un Access Token.
 * Lanza una excepción si la firma expiró o es inválida; el middleware
 * requireAuth se encarga de traducirla a una respuesta 401.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/**
 * Esta función verifica y decodifica un Refresh Token usando su secreto
 * propio. Es deliberadamente separada de verifyAccessToken para que un
 * Access Token jamás sea aceptado donde se espera un Refresh Token y viceversa.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}
