// Este script inserta datos iniciales (semillas) SOLO si las tablas están
// vacías, lo que lo hace idempotente: se puede ejecutar varias veces sin
// duplicar registros. Se invoca opcionalmente al arrancar la app cuando
// SEED_ON_BOOT=true, o manualmente con `npm run seed`.

import '../config/env.js';
import { sequelize, User, Category, Product } from '../models/index.js';
import { logger } from '../utils/logger.js';

// Datos de categorías de ejemplo.
const CATEGORIES = [
  { name: 'Electrónica', description: 'Dispositivos y gadgets tecnológicos' },
  { name: 'Ropa', description: 'Prendas de vestir y accesorios de moda' },
  { name: 'Hogar', description: 'Artículos para el hogar y decoración' },
];

// Productos de ejemplo repartidos entre las 3 categorías (10 en total).
const PRODUCTS = [
  { name: 'Auriculares Bluetooth', description: 'Auriculares inalámbricos con cancelación de ruido', price: 59.99, stock: 50, categoryIndex: 0 },
  { name: 'Smartwatch Deportivo', description: 'Reloj inteligente con GPS y monitor de ritmo', price: 129.99, stock: 30, categoryIndex: 0 },
  { name: 'Altavoz Inteligente', description: 'Altavoz con asistente de voz integrado', price: 49.99, stock: 40, categoryIndex: 0 },
  { name: 'Cámara de Seguridad WiFi', description: 'Cámara HD con visión nocturna', price: 39.99, stock: 25, categoryIndex: 0 },
  { name: 'Camiseta Básica Algodón', description: 'Camiseta unisex 100% algodón', price: 14.99, stock: 100, categoryIndex: 1 },
  { name: 'Jeans Clásicos', description: 'Pantalón vaquero corte recto', price: 45.0, stock: 60, categoryIndex: 1 },
  { name: 'Zapatillas Urbanas', description: 'Calzado casual para uso diario', price: 69.99, stock: 35, categoryIndex: 1 },
  { name: 'Lámpara de Mesa LED', description: 'Lámpara regulable con 3 temperaturas de color', price: 24.99, stock: 45, categoryIndex: 2 },
  { name: 'Set de Sábanas', description: 'Juego de sábanas king size 400 hilos', price: 54.99, stock: 20, categoryIndex: 2 },
  { name: 'Cafetera Espresso', description: 'Cafetera italiana con vaporizador de leche', price: 89.99, stock: 15, categoryIndex: 2 },
];

/**
 * Esta función verifica si la base de datos ya contiene usuarios.
 * Se usa como guardia: si hay datos, los seeders no se ejecutan de nuevo.
 */
async function isDatabaseEmpty() {
  const userCount = await User.count();
  return userCount === 0;
}

/**
 * Esta función inserta el conjunto inicial de datos si la BD está vacía:
 * 2 usuarios (admin + client), 3 categorías y 10 productos.
 * Se ejecuta dentro de una transacción para que o todo se inserte o nada.
 */
export async function runSeeders() {
  await sequelize.authenticate();

  if (!(await isDatabaseEmpty())) {
    logger.info('[Seed] La base de datos ya contiene datos. Seeders omitidos.');
    return;
  }

  logger.info('[Seed] Base de datos vacía. Insertando datos iniciales...');

  await sequelize.transaction(async (t) => {
    // Usuario administrador: puede gestionar productos y categorías.
    await User.create(
      { name: 'Admin', email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
      { transaction: t }
    );

    // Usuario cliente: puede crear y ver sus propios pedidos.
    await User.create(
      { name: 'Cliente Demo', email: 'client@example.com', password: 'Client123!', role: 'client' },
      { transaction: t }
    );

    // Se crean las categorías y se guardan en un array para mapear sus IDs.
    const createdCategories = await Promise.all(
      CATEGORIES.map((c) => Category.create(c, { transaction: t }))
    );

    // Se crean los productos asociados a cada categoría por índice.
    await Promise.all(
      PRODUCTS.map((p) =>
        Product.create(
          {
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.stock,
            categoryId: createdCategories[p.categoryIndex].id,
          },
          { transaction: t }
        )
      )
    );
  });

  logger.info('[Seed] Datos iniciales insertados correctamente.');
  logger.info('[Seed] Admin: admin@example.com / Admin123!');
  logger.info('[Seed] Client: client@example.com / Client123!');
}

// Si el archivo se ejecuta directamente (`npm run seed`), corre los seeders
// y cierra la conexión. Si se importa como módulo, solo exporta la función.
const isDirectRun = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isDirectRun) {
  runSeeders()
    .then(() => sequelize.close())
    .catch((err) => {
      logger.error(`[Seed] Error: ${err.message}`, { stack: err.stack });
      process.exit(1);
    });
}
