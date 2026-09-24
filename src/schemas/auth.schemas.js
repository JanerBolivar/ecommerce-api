// Este módulo agrupa todos los esquemas Zod de validación de AUTH.
// Centralizarlos permite reutilizarlos en rutas, tests y documentación
// sin acoplar la validación a los controladores.

import { z } from 'zod';

// Esquema de login: exige email con formato válido y password mínimo 6 chars.
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Esquema de registro opcional (si se añade POST /api/auth/register).
export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
