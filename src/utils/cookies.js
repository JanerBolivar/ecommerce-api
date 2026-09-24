// Este módulo centraliza la generación y limpieza de cookies HttpOnly
// donde viajan Access y Refresh Tokens. Centralizarlas garantiza que todas
// las opciones (secure, sameSite, path) sean consistentes entre login,
// refresh y logout, y facilita endurecer la configuración en un solo lugar.

import { env } from '../config/env.js';

// Nombres canónicos de las cookies (coinciden con requireAuth.ACCESS_COOKIE).
export const ACCESS_COOKIE = 'accessToken';
export const REFRESH_COOKIE = 'refreshToken';

// Opciones comunes: HttpOnly impide que JavaScript del navegador lea la
// cookie (mitiga XSS); Secure solo la envía por HTTPS; SameSite mitiga CSRF.
const BASE_OPTIONS = {
  httpOnly: true,
  secure: env.cookies.secure,
  sameSite: env.cookies.sameSite,
  path: '/', // Accesible desde cualquier endpoint de la API.
};

/**
 * Esta función calcula el tiempo de vida en milisegundos de un JWT a partir
 * de su string de expiración (ej. "15m", "7d"), para pasarlo como maxAge
 * de la cookie y que expiren a la vez (cookie y token se invalidan juntos).
 */
function expiresInToMs(expiresInString) {
  const unit = expiresInString.slice(-1);
  const value = parseInt(expiresInString.slice(0, -1), 10);
  const multipliers = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 24 * 3600 * 1000 };
  return value * (multipliers[unit] || 1000);
}

/**
 * Esta función emite ambas cookies (Access y Refresh) en la respuesta.
 * El Access Token vive poco (15m) y el Refresh más (7d); el maxAge de cada
 * cookie se calcula desde la variable de entorno correspondiente para que
 * el navegador no mantenga cookies "huérfanas" con tokens ya vencidos.
 */
export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...BASE_OPTIONS,
    maxAge: expiresInToMs(env.jwt.accessExpiresIn),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...BASE_OPTIONS,
    maxAge: expiresInToMs(env.jwt.refreshExpiresIn),
  });
}

/**
 * Esta función limpia ambas cookies en el logout. Deben pasarse las MISMAS
 * opciones (path, httpOnly, sameSite) con las que se crearon: el navegador
 * solo borra cookies si coincide el "scope".
 */
export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...BASE_OPTIONS });
  res.clearCookie(REFRESH_COOKIE, { ...BASE_OPTIONS });
}
