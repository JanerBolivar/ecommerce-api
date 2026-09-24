// Este módulo define el router de healthcheck.
// NOTA: la anotación #swagger.summary debe vivir DENTRO del callback
// inline para que swagger-autogen la asocie a la operación.

import { Router } from 'express';
import { health } from '../controllers/healthController.js';

const router = Router();

// #swagger.tags = ['Health']
router.get('/', (req, res, next) => {
    /*  #swagger.summary = 'Healthcheck: ping a PostgreSQL y Redis' */
    /*  #swagger.responses[200] = { description: 'Todos los servicios operativos' } */
    /*  #swagger.responses[503] = { description: 'Algún servicio caído' } */
    return health(req, res, next);
});

export default router;
