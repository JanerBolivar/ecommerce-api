// Este controlador implementa la lógica de negocio de PEDIDOS, la parte
// más crítica del e-commerce: descuento de stock transaccional. Toda la
// operación (validar stock, descontar, crear Order y OrderItems) ocurre
// dentro de UNA transacción de Sequelize: si algo falla a mitad de camino,
// todo se revierte (ROLLBACK) y no queda stock descontado sin pedido.

import { Order, OrderItem, Product } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Esta función crea un pedido para el usuario autenticado.
 *
 * Flujo transaccional:
 * 1. Se inicia una transacción.
 * 2. Se leen TODOS los productos referenciados con bloqueo (lock) para
 *    impedir que otra request paralela pase el stock a negativo (race condition).
 * 3. Se valida stock suficiente para cada item.
 * 4. Se descuenta el stock de cada producto.
 * 5. Se crea la Order con el total calculado (precio actual × cantidad).
 * 6. Se crean los OrderItem con unitPrice congelado.
 * 7. COMMIT. Si cualquier paso falla → ROLLBACK automático.
 *
 * El precio NUNCA se toma del cliente: se lee de la BD dentro de la
 * transacción para evitar manipulación del total.
 */
export async function createOrder(req, res, next) {
  // req.user lo inyectó requireAuth: contiene userId y role.
  const { userId } = req.user;
  const { items } = req.body;

  try {
    const order = await sequelize.transaction(async (t) => {
      // Se extraen los IDs únicos de productos del payload.
      const productIds = [...new Set(items.map((i) => i.productId))];

      // lock: t.LOCK.UPDATE fuerza bloqueo pesado (SELECT ... FOR UPDATE)
      // sobre las filas de productos: serializa accesos concurrentes al stock.
      const products = await Product.findAll({
        where: { id: productIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validación de existencia y stock para CADA item.
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          // Lanzar dentro de la transacción provoca ROLLBACK automático.
          throw ApiError.notFound(`Producto con id ${item.productId} no encontrado`);
        }
        if (product.stock < item.quantity) {
          throw ApiError.badRequest(
            `Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}`
          );
        }
      }

      // Se calcula el total sumando precio×cantidad con los precios REALES de BD.
      let total = 0;
      for (const item of items) {
        const product = productMap.get(item.productId);
        total += Number(product.price) * item.quantity;
      }

      // Se crea la cabecera del pedido dentro de la transacción.
      const orderInstance = await Order.create(
        { userId, total: total.toFixed(2), status: 'pending' },
        { transaction: t }
      );

      // Se descuenta stock y se crean los ítems en paralelo por producto.
      await Promise.all(
        items.map(async (item) => {
          const product = productMap.get(item.productId);

          // Decremento atómico en BD: más seguro que leer-modificar-escribir.
          await product.decrement('stock', { by: item.quantity, transaction: t });

          await OrderItem.create(
            {
              orderId: orderInstance.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.price, // Precio congelado al comprar.
            },
            { transaction: t }
          );
        })
      );

      return orderInstance;
    });

    // Se recarga el pedido con sus items para la respuesta.
    const fullOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    res.status(201).json({
      status: 'success',
      message: 'Pedido creado correctamente',
      data: fullOrder,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función lista SOLO los pedidos del usuario autenticado.
 * El filtro where: { userId } proviene del Access Token, nunca del body:
 * así un usuario jamás puede consultar pedidos ajenos manipulando parámetros.
 */
export async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.userId },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ status: 'success', data: orders });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función obtiene un pedido específico por ID.
 * Verifica que pertenezca al usuario autenticado (o que sea admin),
 * aplicando autorización a nivel de recurso (no solo de rol global).
 */
export async function getOrderById(req, res, next) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!order) {
      throw ApiError.notFound('Pedido no encontrado');
    }

    // Un client solo puede ver SU pedido; un admin ve cualquiera.
    if (order.userId !== req.user.userId && req.user.role !== 'admin') {
      throw ApiError.forbidden('No tiene permiso para ver este pedido');
    }

    res.status(200).json({ status: 'success', data: order });
  } catch (err) {
    next(err);
  }
}
