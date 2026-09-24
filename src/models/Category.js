// Este módulo define el modelo Category: agrupa productos en categorías
// comerciales (ej. Electrónica, Ropa). Es una entidad padre de Product.

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true, // Evita categorías duplicadas con el mismo nombre.
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true, // Es opcional: muchas categorías no requieren descripción.
    },
  },
  {
    tableName: 'categories',
    timestamps: true,
  }
);
