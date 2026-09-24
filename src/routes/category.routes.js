// Este módulo agrupa las RUTAS de categorías.
// GET es público; las mutaciones exigen rol admin.
//
// NOTA (Documentación): swagger-autogen solo asocia anotaciones de
// operación cuando viven DENTRO de un callback inline en la ruta.

import { Router } from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { validate } from '../middlewares/validate.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schemas.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// #swagger.tags = ['Categories']
router.get('/', (req, res, next) => {
    /*  #swagger.summary = 'Listar categorías (público)' */
    /*  #swagger.responses[200] = { description: 'Listado de categorías ordenado por nombre' } */
    return categoryController.getAll(req, res, next);
});

// #swagger.tags = ['Categories']
router.get('/:id', (req, res, next) => {
    /*  #swagger.summary = 'Obtener categoría por ID con sus productos' */
    /*  #swagger.parameters['id'] = {
            in: 'path',
            description: 'ID único de la categoría a consultar',
            type: 'integer',
            required: true
    } */
    /*  #swagger.responses[200] = { description: 'Categoría encontrada con array de productos' } */
    /*  #swagger.responses[404] = { description: 'Categoría no encontrada' } */
    return categoryController.getById(req, res, next);
});

// #swagger.tags = ['Categories']
// #swagger.security = [{ "cookieAuth": [] }]
router.post('/', requireAuth, requireRole(['admin']), validate(createCategorySchema), (req, res, next) => {
    /*  #swagger.summary = 'Crear categoría (solo admin)' */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT (requireAuth).',
            type: 'string',
            required: true
    } */
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Datos de la categoría. Validados con createCategorySchema (Zod): name 2-100 unique, description opcional max 2000.',
            required: true,
            schema: {
                name: "Deportes",
                description: "Artículos deportivos y fitness"
            }
    } */
    /*  #swagger.responses[201] = { description: 'Categoría creada' } */
    /*  #swagger.responses[400] = { description: 'Body inválido (Zod)' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'Requiere rol admin' } */
    /*  #swagger.responses[409] = { description: 'Ya existe una categoría con ese nombre' } */
    return categoryController.create(req, res, next);
});

// #swagger.tags = ['Categories']
// #swagger.security = [{ "cookieAuth": [] }]
router.put('/:id', requireAuth, requireRole(['admin']), validate(updateCategorySchema), (req, res, next) => {
    /*  #swagger.summary = 'Actualizar categoría (solo admin, actualización parcial)' */
    /*  #swagger.parameters['id'] = {
            in: 'path',
            description: 'ID único de la categoría a actualizar',
            type: 'integer',
            required: true
    } */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT (requireAuth).',
            type: 'string',
            required: true
    } */
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Campos a actualizar (createCategorySchema.partial): envíe solo los que cambian; al menos uno requerido.',
            required: true,
            schema: {
                name: "Deportes y Aventura",
                description: "Equipamiento al aire libre"
            }
    } */
    /*  #swagger.responses[200] = { description: 'Categoría actualizada' } */
    /*  #swagger.responses[400] = { description: 'Body vacío o inválido (Zod)' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'Requiere rol admin' } */
    /*  #swagger.responses[404] = { description: 'Categoría no encontrada' } */
    return categoryController.update(req, res, next);
});

// #swagger.tags = ['Categories']
// #swagger.security = [{ "cookieAuth": [] }]
router.delete('/:id', requireAuth, requireRole(['admin']), (req, res, next) => {
    /*  #swagger.summary = 'Eliminar categoría (solo admin; 409 si tiene productos)' */
    /*  #swagger.parameters['id'] = {
            in: 'path',
            description: 'ID único de la categoría a eliminar',
            type: 'integer',
            required: true
    } */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT (requireAuth).',
            type: 'string',
            required: true
    } */
    /*  #swagger.responses[200] = { description: 'Categoría eliminada' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'Requiere rol admin' } */
    /*  #swagger.responses[404] = { description: 'Categoría no encontrada' } */
    /*  #swagger.responses[409] = { description: 'La categoría tiene productos asociados' } */
    return categoryController.remove(req, res, next);
});

export default router;
