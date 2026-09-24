// Este módulo define el modelo Product: el corazón del catálogo.
// price se almacena como DECIMAL(10,2) en lugar de FLOAT para evitar
// errores de redondeo típicos de los punto flotante en dinero.

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'El precio no puede ser negativo' },
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'El stock no puede ser negativo' },
      },
    },
    // Llave foránea hacia Category: mantiene la integridad referencial
    // en la base de datos y no solo en la aplicación.
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
  },
  {
    tableName: 'products',
    timestamps: true,
    // Índice compuesto para búsquedas frecuentes por categoría y nombre.
    indexes: [{ fields: ['categoryId'] }],
  }
);
