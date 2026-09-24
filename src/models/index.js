// Este módulo centraliza las asociaciones entre modelos y exporta la
// instancia de sequelize re-exportada. Importar "models/index.js" desde
// cualquier punto garantiza que todas las relaciones estén registradas
// antes de usarlas (evita el clásico "association is not defined").

import { sequelize } from '../config/database.js';
import { User } from './User.js';
import { Category } from './Category.js';
import { Product } from './Product.js';
import { Order } from './Order.js';
import { OrderItem } from './OrderItem.js';

// --- Asociaciones ---

// Un usuario puede tener muchos pedidos; un pedido pertenece a un usuario.
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Una categoría contiene muchos productos; un producto pertenece a una categoría.
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Un pedido contiene muchos OrderItem; cada OrderItem apunta a un pedido.
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Relación muchos-a-muchos Order <-> Product a través de OrderItem.
Order.belongsToMany(Product, { through: OrderItem, foreignKey: 'orderId', as: 'products' });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: 'productId', as: 'orders' });

export { sequelize, User, Category, Product, Order, OrderItem };
