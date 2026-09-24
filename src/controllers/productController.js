// Este controlador implementa el CRUD de productos con caché en Redis.
// El listado público (GET) es el endpoint más consultado, por lo que se
// cachea 1 hora; CUALQUIER mutación (create/update/delete) invalida la
// caché para que la siguiente lectura regenere los datos frescos.
// Patrón cache-aside (lazy): la app escribe en caché al leer si no existe.

import { Product, Category } from '../models/index.js';
import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

// Clave única del caché de listado de productos y su TTL en segundos (1 hora).
const PRODUCT_CACHE_KEY = 'products:all';
const PRODUCT_CACHE_TTL = 3600;

/**
 * Esta función invalida (elimina) la caché de productos.
 * Se invoca en create, update y delete: al borrar la clave, la siguiente
 * petición GET vuelve a consultar Postgres y repuebla la caché con datos
 * actualizados (evita servir datos obsoletos tras una mutación).
 */
async function invalidateProductCache() {
  await redisClient.del(PRODUCT_CACHE_KEY);
}

/**
 * Esta función lista todos los productos con su categoría incluida.
 * Primero intenta leer de Redis; si hay hit, responde sin tocar la BD.
 * Si es miss, consulta Sequelize, serializa a JSON simple y guarda en
 * Redis con TTL para las siguientes 1 hora de peticiones.
 */
export async function getAll(_req, res, next) {
  try {
    // 1. Intento de caché (cache-aside).
    const cached = await redisClient.get(PRODUCT_CACHE_KEY);
    if (cached) {
      // Se marca el header para que el cliente/CDN sepa que vino de caché.
      res.set('X-Cache', 'HIT');
      return res.status(200).json(JSON.parse(cached));
    }

    // 2. Miss: consulta a Postgres con la categoría asociada (eager loading
    //    evita el problema N+1 de consultar la categoría por cada producto).
    const products = await Product.findAll({
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']],
    });

    const payload = { status: 'success', data: products };

    // 3. Se repuebla la caché con TTL de 1 hora.
    await redisClient.setEx(PRODUCT_CACHE_KEY, PRODUCT_CACHE_TTL, JSON.stringify(payload));

    res.set('X-Cache', 'MISS');
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función obtiene un producto por su ID.
 * No se cachea individualmente: es una consulta puntual barata y evitaría
 * gestionar múltiples claves; solo el listado masivo justifica caché aquí.
 */
export async function getById(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    });

    if (!product) {
      throw ApiError.notFound('Producto no encontrado');
    }

    res.status(200).json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función crea un producto (solo admin, protegido en la ruta).
 * Después de persistir, invalida la caché para que el listado se refresque.
 */
export async function create(req, res, next) {
  try {
    // Se verifica que la categoría exista antes de crear (integridad amigable).
    const category = await Category.findByPk(req.body.categoryId);
    if (!category) {
      throw ApiError.badRequest('La categoría indicada no existe');
    }

    const product = await Product.create(req.body);
    await invalidateProductCache();

    res.status(201).json({
      status: 'success',
      message: 'Producto creado correctamente',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función actualiza un producto por ID (solo admin).
 * Usa findByPk + set + save (en lugar de update) para disparar validaciones
 * del modelo de forma controlada y manejar 404 si no existe.
 */
export async function update(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      throw ApiError.notFound('Producto no encontrado');
    }

    // Si se cambia de categoría, se valida que la nueva exista.
    if (req.body.categoryId) {
      const category = await Category.findByPk(req.body.categoryId);
      if (!category) {
        throw ApiError.badRequest('La categoría indicada no existe');
      }
    }

    // assign+save aplica solo los campos enviados (actualización parcial).
    Object.assign(product, req.body);
    await product.save();

    await invalidateProductCache();

    res.status(200).json({
      status: 'success',
      message: 'Producto actualizado correctamente',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función elimina un producto por ID (solo admin) y limpia la caché.
 */
export async function remove(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      throw ApiError.notFound('Producto no encontrado');
    }

    await product.destroy();
    await invalidateProductCache();

    res.status(200).json({
      status: 'success',
      message: 'Producto eliminado correctamente',
    });
  } catch (err) {
    next(err);
  }
}
