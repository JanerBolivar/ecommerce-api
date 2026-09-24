// Este módulo define OrderItem: la tabla pivote entre Order y Product
// (relación muchos-a-muchos con atributos propios). Guarda quantity y
// unitPrice para congelar el precio unitario del momento de la compra.

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'La cantidad debe ser al menos 1' },
      },
    },
    // Precio congelado al crear el item; no cambia si el producto cambia de precio.
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'order_items',
    timestamps: true,
  }
);
