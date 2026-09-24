// Este módulo agrupa las RUTAS de pedidos.
// POST / solo rol "client"; GET /my-orders del usuario autenticado.
//
// NOTA (Documentación): swagger-autogen solo asocia anotaciones de
// operación cuando viven DENTRO de un callback inline en la ruta.

import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { validate } from '../middlewares/validate.js';
import { createOrderSchema } from '../schemas/order.schemas.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// Todas las rutas de pedidos exigen estar autenticado (cookie accessToken).
router.use(requireAuth);

// #swagger.tags = ['Orders']
// #swagger.security = [{ "cookieAuth": [] }]
router.post('/', requireRole(['client']), validate(createOrderSchema), (req, res, next) => {
    /*  #swagger.summary = 'Crear pedido (solo rol client): descuenta stock transaccionalmente' */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT (requireAuth).',
            type: 'string',
            required: true
    } */
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Items del pedido. Validado con createOrderSchema (Zod): items array min 1 / max 50; cada item { productId: integer, quantity: integer >= 1 }. El precio SIEMPRE se toma de la BD, nunca del cliente.',
            required: true,
            schema: {
                items: [
                    { productId: 1, quantity: 2 },
                    { productId: 5, quantity: 1 }
                ]
            }
    } */
    /*  #swagger.responses[201] = { description: 'Pedido creado: Order + OrderItems y stock descontado en transacción' } */
    /*  #swagger.responses[400] = { description: 'Body inválido (Zod) o stock insuficiente' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'Requiere rol client' } */
    return orderController.createOrder(req, res, next);
});

// #swagger.tags = ['Orders']
// #swagger.security = [{ "cookieAuth": [] }]
router.get('/my-orders', (req, res, next) => {
    /*  #swagger.summary = 'Listar mis pedidos (los del usuario autenticado)' */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT. El userId del token filtra los pedidos.',
            type: 'string',
            required: true
    } */
    /*  #swagger.responses[200] = { description: 'Listado de pedidos del usuario con sus OrderItems' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    return orderController.getMyOrders(req, res, next);
});

// Se monta DESPUÉS de /my-orders para que Express no interprete
// "my-orders" como un :id.
// #swagger.tags = ['Orders']
// #swagger.security = [{ "cookieAuth": [] }]
router.get('/:id', (req, res, next) => {
    /*  #swagger.summary = 'Obtener un pedido por ID (propietario o admin)' */
    /*  #swagger.parameters['id'] = {
            in: 'path',
            description: 'ID único del pedido a consultar',
            type: 'integer',
            required: true
    } */
    /*  #swagger.parameters['accessToken'] = {
            in: 'cookie',
            description: 'Cookie HttpOnly con el Access Token JWT (requireAuth).',
            type: 'string',
            required: true
    } */
    /*  #swagger.responses[200] = { description: 'Pedido encontrado (dueño o admin)' } */
    /*  #swagger.responses[401] = { description: 'No autenticado' } */
    /*  #swagger.responses[403] = { description: 'No es dueño del pedido ni admin' } */
    /*  #swagger.responses[404] = { description: 'Pedido no encontrado' } */
    return orderController.getOrderById(req, res, next);
});

export default router;
