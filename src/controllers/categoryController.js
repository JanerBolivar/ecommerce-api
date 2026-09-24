// Este controlador implementa el CRUD de categorías.
// El listado es público; la creación está reservada al rol admin.
// A diferencia de productos, aquí NO se aplica caché: el volumen de datos
// es bajo y el listado cambia con poca frecuencia, por lo que el beneficio
// no justifica la complejidad de invalidación.

import { Category, Product } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Esta función lista todas las categorías ordenadas por nombre.
 */
export async function getAll(_req, res, next) {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.status(200).json({ status: 'success', data: categories });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función obtiene una categoría por ID, incluyendo su conteo de
 * productos asociados (atributo _count vía sequelize) o sus productos.
 */
export async function getById(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'price'] }],
    });

    if (!category) {
      throw ApiError.notFound('Categoría no encontrada');
    }

    res.status(200).json({ status: 'success', data: category });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función crea una categoría (solo admin).
 * Si el nombre ya existe, Sequelize lanza unique constraint → errorHandler
 * responde 409 automáticamente.
 */
export async function create(req, res, next) {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Categoría creada correctamente',
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función actualiza una categoría por ID (solo admin).
 */
export async function update(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      throw ApiError.notFound('Categoría no encontrada');
    }

    Object.assign(category, req.body);
    await category.save();

    res.status(200).json({
      status: 'success',
      message: 'Categoría actualizada correctamente',
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Esta función elimina una categoría por ID. Antes de borrar, verifica que
 * no tenga productos asociados: si los tiene, responde 409 en lugar de
 * dejar productos huérfanos o depender de ON DELETE CASCADE silencioso.
 */
export async function remove(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      throw ApiError.notFound('Categoría no encontrada');
    }

    const productCount = await Product.count({ where: { categoryId: category.id } });
    if (productCount > 0) {
      throw ApiError.conflict(
        `No se puede eliminar: la categoría tiene ${productCount} producto(s) asociado(s)`
      );
    }

    await category.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Categoría eliminada correctamente',
    });
  } catch (err) {
    next(err);
  }
}
