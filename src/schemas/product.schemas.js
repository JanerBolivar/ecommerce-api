// Este módulo agrupa los esquemas Zod de validación para PRODUCTS.
// price y stock se manejan como números (coerce) para aceptar también
// strings numéricos provenientes de formularios, validando luego el rango.

import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  stock: z.coerce.number().int('El stock debe ser entero').min(0, 'El stock no puede ser negativo'),
  categoryId: z.coerce.number().int('categoryId debe ser un entero'),
});

// En PUT se permite actualización parcial: todos los campos opcionales,
// pero al menos uno debe estar presente (refine).
export const updateProductSchema = createProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar' }
);
