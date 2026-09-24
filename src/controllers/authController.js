// Este controlador implementa el ciclo de vida de autenticación:
// login, refresh y logout. Los tokens NO viajan en el body de la respuesta
// (buena práctica: el JSON no queda en cachés del cliente ni en logs de
// proxies); se emiten exclusivamente como cookies HttpOnly.

import { User } from '../models/index.js';
import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} from '../utils/cookies.js';

// Clave de Redis para el Refresh Token: formato refreshToken:{userId}
// Permite buscar/borrar el token de un usuario específico y revocar
// todas las sesiones de ese usuario si fuera necesario (anti-robo).
const refreshKey = (userId) => `refreshToken:${userId}`;

/**
 * Esta función autentica a un usuario con email/password.
 * 1. Busca el usuario y compara el hash con bcrypt.
 * 2. Genera Access Token (15m) y Refresh Token (7d).
 * 3. Guarda el Refresh Token en Redis con TTL igual a su expiración,
 *    para que caduque solo aunque nadie haga logout.
 * 4. Devuelve ambos tokens únicamente en cookies HttpOnly.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Se busca por email: si no existe, se responde el MISMO mensaje que
    // si la contraseña es incorrecta, para no revelar qué emails están
    // registrados (prevención de enumeración de usuarios).
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      throw ApiError.unauthorized('Credenciales inválidas');
    }

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id });

    // Se calcula el TTL en segundos para que Redis elimine la clave
    // automáticamente al expirar el Refresh Token (sin cron jobs).
    const refreshTtlSeconds = 7 * 24 * 60 * 60; // 7 días (coincide con JWT_REFRESH_EXPIRES_IN)

    // Se almacena SOLO el token más reciente por usuario: un nuevo login
    // sobreescribe el anterior, limitando el número de sesiones activas.
    await redisClient.setEx(refreshKey(user.id), refreshTtlSeconds, refreshToken);

    setAuthCookies(res, accessToken, refreshToken);

    // El body solo confirma el login y devuelve datos no sensibles del perfil.
    res.status(200).json({
      status: 'success',
      message: 'Autenticación exitosa',
      data: { user: user.toSafeJSON() },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función renueva el Access Token a partir del Refresh Token guardado
 * en la cookie. Flujo:
 * 1. Lee la cookie refresh y verifica su firma.
 * 2. Compara el token de la cookie con el de Redis (si no coinciden,
 *    el token fue revocado o robado → 401).
 * 3. Emite un nuevo Access Token en su cookie (el refresh se mantiene,
 *    o se rota si se desea; aquí se mantiene por simplicidad).
 */
export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw ApiError.unauthorized('Refresh Token no encontrado');
    }

    // Verifica firma y expiración del Refresh Token con su secreto propio.
    const payload = verifyRefreshToken(token);

    // Verificación contra Redis: la fuente de verdad de la revocación.
    const storedToken = await redisClient.get(refreshKey(payload.userId));
    if (!storedToken || storedToken !== token) {
      throw ApiError.unauthorized('Refresh Token inválido o revocado');
    }

    // Se recupera el usuario para reconstruir el payload con su rol actual
    // (si el rol cambió desde el login, el nuevo Access Token lo refleja).
    const user = await User.findByPk(payload.userId);
    if (!user) {
      throw ApiError.unauthorized('Usuario no encontrado');
    }

    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
    setAuthCookies(res, newAccessToken, token); // El refresh se re-emite igual.

    res.status(200).json({
      status: 'success',
      message: 'Access Token renovado',
    });
  } catch (err) {
    // Errores de jwt.verify se traducen a 401 uniforme.
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Refresh Token inválido o expirado'));
    }
    next(err);
  }
}

/**
 * Esta función cierra la sesión del usuario:
 * 1. Elimina el Refresh Token de Redis (revoca la sesión en el servidor,
 *    no basta con borrar la cookie del navegador).
 * 2. Limpia ambas cookies HttpOnly del cliente.
 * Incluso si un atacante copió el refresh token, ya no servirá tras el logout.
 */
export async function logout(req, res, next) {
  try {
    // Se lee el usuario del Access Token si existe (aunque esté expirado
    // no importa: también se limpian cookies igualmente).
    const refreshCookie = req.cookies?.[REFRESH_COOKIE];

    if (refreshCookie) {
      try {
        const payload = verifyRefreshToken(refreshCookie);
        await redisClient.del(refreshKey(payload.userId));
      } catch {
        // Si el refresh ya era inválido, se ignora y solo se limpian cookies.
      }
    }

    // Alternativa: si el Access Token aún es válido, usar req.user.userId
    // (garantiza revocar aunque la cookie refresh estuviera corrupta).
    if (req.user?.userId) {
      await redisClient.del(refreshKey(req.user.userId));
    }

    clearAuthCookies(res);

    res.status(200).json({
      status: 'success',
      message: 'Sesión cerrada correctamente',
    });
  } catch (err) {
    next(err);
  }
}
