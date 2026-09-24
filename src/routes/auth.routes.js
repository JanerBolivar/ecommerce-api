// Este módulo agrupa las RUTAS de autenticación. Separa el "dónde se
// monta" (app.use('/api/auth', authRoutes)) de la lógica (controller),
// siguiendo el patrón MVC estricto.
//
// NOTA (Documentación): swagger-autogen solo asocia anotaciones de
// operación (#swagger.parameters, #swagger.summary, #swagger.responses)
// cuando viven DENTRO de un callback inline en la ruta. Los comentarios
// `// #swagger.*` previos a router.* NO se capturan con handlers externos,
// de ahí que cada handler se envuelva en un arrow function fino.

import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../schemas/auth.schemas.js';

const router = Router();

/**
 * POST /api/auth/login
 * Valida el body con Zod (loginSchema) y delega en el controlador.
 */
// #swagger.tags = ['Auth']
router.post('/login', validate(loginSchema), (req, res, next) => {
    /*  #swagger.summary = 'Iniciar sesión y emitir cookies HttpOnly' */
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Credenciales del usuario. Validadas con loginSchema (Zod): email con formato válido, password mínimo 6 caracteres.',
            required: true,
            schema: {
                email: "admin@example.com",
                password: "Admin123!"
            }
    } */
    /*  #swagger.responses[200] = { description: 'Autenticación exitosa: fija cookies HttpOnly accessToken (15m) y refreshToken (7d)' } */
    /*  #swagger.responses[400] = { description: 'Body inválido según loginSchema (Zod)' } */
    /*  #swagger.responses[401] = { description: 'Credenciales inválidas' } */
    return authController.login(req, res, next);
});

/**
 * POST /api/auth/refresh
 * Renueva el Access Token desde la cookie refreshToken (sin body).
 */
// #swagger.tags = ['Auth']
router.post('/refresh', (req, res, next) => {
    /*  #swagger.summary = 'Renovar Access Token a partir del Refresh Token en cookie' */
    /*  #swagger.parameters['refreshToken'] = {
            in: 'cookie',
            description: 'Token de refresco en cookie HttpOnly. Debe coincidir con refreshToken:{userId} en Redis.',
            type: 'string',
            required: true
    } */
    /*  #swagger.responses[200] = { description: 'Access Token renovado en cookie accessToken' } */
    /*  #swagger.responses[401] = { description: 'Refresh Token ausente, inválido, expirado o revocado' } */
    return authController.refresh(req, res, next);
});

/**
 * POST /api/auth/logout
 * Revoca el Refresh Token en Redis y limpia cookies (sin body).
 */
// #swagger.tags = ['Auth']
router.post('/logout', (req, res, next) => {
    /*  #swagger.summary = 'Cerrar sesión: revoca Refresh Token en Redis y limpia cookies' */
    /*  #swagger.parameters['refreshToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly del Refresh Token a revocar en Redis.',
            type: 'string',
            required: false
    } */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly del Access Token (opcional: ayuda a localizar la sesión si el refresh ya no es válido).',
            type: 'string',
            required: false
    } */
    /*  #swagger.responses[200] = { description: 'Sesión cerrada: cookies limpiadas y Refresh Token revocado' } */
    return authController.logout(req, res, next);
});

export default router;
