// Este módulo agrupa las RUTAS de productos.
// - GET es público (sin auth) y cacheado en Redis.
// - POST/PUT/DELETE exigen requireAuth + requireRole(['admin']).
//
// NOTA (Documentación): swagger-autogen solo asocia anotaciones de
// operación cuando viven DENTRO de un callback inline en la ruta.

import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { validate } from '../middlewares/validate.js';
import { createProductSchema, updateProductSchema } from '../schemas/product.schemas.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// #swagger.tags = ['Products']
router.get('/', (req, res, next) => {
    /*  #swagger.summary = 'Listar todos los productos (público, cacheado 1h en Redis)' */
    /*  #swagger.responses[200] = { description: 'Listado de productos con categoría. Header X-Cache: HIT|MISS' } */
    return productController.getAll(req, res, next);
});

// #swagger.tags = ['Products']
router.get('/:id', (req, res, next) => {
    /*  #swagger.summary = 'Obtener un producto por ID' */
    /*  #swagger.parameters['id'] = {
            in: 'path',
            description: 'ID único del producto a consultar',
            type: 'integer',
            required: true
    } */
    /*  #swagger.responses[200] = { description: 'Producto encontrado con su categoría' } */
    /*  #swagger.responses[404] = { description: 'Producto no encontrado' } */
    return productController.getById(req, res, next);
});

// #swagger.tags = ['Products']
// #swagger.security = [{ "cookieAuth": [] }]
router.post('/', requireAuth, requireRole(['admin']), validate(createProductSchema), (req, res, next) => {
    /*  #swagger.summary = 'Crear producto (solo admin)' */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT (requireAuth).',
            type: 'string',
            required: true
    } */
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Datos del producto. Validados con createProductSchema (Zod): name 2-150, description opcional, price number >= 0, stock integer >= 0, categoryId integer.',
            required: true,
            schema: {
                name: "Laptop Gamer",
                description: "Portátil de alto rendimiento",
                price: 1500.50,
                stock: 20,
                categoryId: 1
            }
    } */
    /*  #swagger.responses[201] = { description: 'Producto creado e invalida caché de listado' } */
    /*  #swagger.responses[400] = { description: 'Body inválido (Zod) o categoryId inexistente' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'Requiere rol admin' } */
    return productController.create(req, res, next);
});

// #swagger.tags = ['Products']
// #swagger.security = [{ "cookieAuth": [] }]
router.put('/:id', requireAuth, requireRole(['admin']), validate(updateProductSchema), (req, res, next) => {
    /*  #swagger.summary = 'Actualizar producto (solo admin, actualización parcial)' */
    /*  #swagger.parameters['id'] = {
            in: 'path',
            description: 'ID único del producto a actualizar',
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
            description: 'Campos a actualizar (createProductSchema.partial): envíe solo los que cambian; al menos uno requerido.',
            required: true,
            schema: {
                price: 1499.99,
                stock: 15
            }
    } */
    /*  #swagger.responses[200] = { description: 'Producto actualizado e invalida caché' } */
    /*  #swagger.responses[400] = { description: 'Body vacío o inválido (Zod)' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'Requiere rol admin' } */
    /*  #swagger.responses[404] = { description: 'Producto no encontrado' } */
    return productController.update(req, res, next);
});

// #swagger.tags = ['Products']
// #swagger.security = [{ "cookieAuth": [] }]
router.delete('/:id', requireAuth, requireRole(['admin']), (req, res, next) => {
    /*  #swagger.summary = 'Eliminar producto (solo admin)' */
    /*  #swagger.parameters['id'] = {
            in: 'path',
            description: 'ID único del producto a eliminar',
            type: 'integer',
            required: true
    } */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT (requireAuth).',
            type: 'string',
            required: true
    } */
    /*  #swagger.responses[200] = { description: 'Producto eliminado e invalida caché' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'Requiere rol admin' } */
    /*  #swagger.responses[404] = { description: 'Producto no encontrado' } */
    return productController.remove(req, res, next);
});

export default router;
