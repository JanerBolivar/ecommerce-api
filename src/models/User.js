// Este módulo define el modelo User: representa a los usuarios autenticables
// de la tienda. El password NUNCA se guarda en texto plano: se hashea con
// bcrypt antes de persistir mediante hooks de Sequelize.

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El nombre no puede estar vacío' },
      },
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true, // Genera un índice UNIQUE: garantiza emails no duplicados.
      validate: {
        isEmail: { msg: 'El email debe tener un formato válido' },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      // Nunca exponer el hash en las respuestas JSON por defecto.
      get() {
        return this.getDataValue('password');
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'client'),
      allowNull: false,
      defaultValue: 'client', // Por seguridad, el rol por defecto es el menos privilegiado.
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    // El hook beforeCreate hashea la contraseña solo cuando se crea el usuario.
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      // beforeUpdate cubre los casos donde el admin resetea una contraseña.
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

/**
 * Esta función compara la contraseña en texto plano ingresada por el usuario
 * con el hash almacenado. Devuelve true/false sin lanzar excepciones para
 * que el controlador de login decida qué respuesta devolver.
 */
User.prototype.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Esta función elimina el hash del password del objeto devuelto,
 * para que jamás viaje en cookies, logs ni respuestas HTTP.
 */
User.prototype.toSafeJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};
