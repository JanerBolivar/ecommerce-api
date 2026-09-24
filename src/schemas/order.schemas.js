// Esquema Zod para la creación de pedidos.
// Recibe un array de items: cada uno referencia un productId y una cantidad.
// El precio NO se envía desde el cliente: se toma siempre del producto en
// la base de datos dentro de la transacción, evitando que un cliente
// manipule el precio unitario (vulnerabilidad clásica de APIs de e-commerce).

import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int('productId debe ser un entero'),
        quantity: z.coerce.number().int('quantity debe ser entero').min(1, 'La cantidad mínima es 1'),
      })
    )
    .min(1, 'El pedido debe contener al menos un producto')
    .max(50, 'El pedido no puede superar 50 líneas de producto'),
});
