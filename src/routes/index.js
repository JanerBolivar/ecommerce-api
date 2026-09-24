// Este módulo es el "routers index": centraliza el montaje de todos los
// routers bajo prefijos de nivel superior (/api/...). Añadir un nuevo
// recurso implica solo una línea aquí, manteniendo app.js limpio.

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import orderRoutes from './order.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

// Montaje de rutas por dominio. El prefijo /api se aplica una sola vez
// aquí para no repetirlo en cada archivo de rutas.
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/health', healthRoutes);

export default router;
