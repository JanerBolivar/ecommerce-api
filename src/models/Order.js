// Este módulo define el modelo Order: representa la cabecera de una compra.
// El "total" se calcula al momento de crear la orden y se congela en la fila
// (no se recalcula) para que cambios futuros de precio no alteren el histórico.

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      // Estados iniciales del ciclo de vida del pedido.
      type: DataTypes.ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'orders',
    timestamps: true,
  }
);
