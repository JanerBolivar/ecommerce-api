// Este script genera el archivo swagger.json automáticamente usando
// swagger-autogen en modo **OpenAPI 3.0**. En OpenAPI 3 el cuerpo de la
// petición NO va en `parameters[]` (eso es Swagger 2.0): se documenta en
// `requestBody.content["application/json"].schema`, que es lo que Scalar/UI
// interpretan para enviar JSON correctamente.
//
// Escanea CADA archivo de rutas por separado y fusiona los paths con el
// prefijo de montaje de routes/index.js (/auth, /products, ...).
//
// Uso: npm run swagger  →  genera ./swagger.json  →  servido en /docs por Scalar.

import swaggerAutogen from 'swagger-autogen';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Documento base OpenAPI 3.0. NOTA: host/basePath/schemes de Swagger 2.0
// se reemplazan por `servers`. securityDefinitions → components.securitySchemes.
const baseDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Ecommerce API',
    description:
      'API RESTful de e-commerce como caso de estudio de buenas prácticas: ' +
      'MVC estricto, JWT con cookies HttpOnly, Redis (caché + Refresh Tokens), ' +
      'Sequelize + PostgreSQL, validación Zod y documentación interactiva.',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor local (desarrollo)',
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'Access Token JWT emitido en cookie HttpOnly por POST /auth/login',
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Login, refresh y logout de sesiones' },
    { name: 'Products', description: 'CRUD de productos (caché Redis)' },
    { name: 'Categories', description: 'CRUD de categorías' },
    { name: 'Orders', description: 'Creación y consulta de pedidos' },
    { name: 'Health', description: 'Healthcheck de infraestructura' },
  ],
};

// Mapa de archivos de rutas → prefijo de montaje + tag OpenAPI.
const ROUTE_MOUNTS = [
  { file: 'auth.routes.js', prefix: '/auth', tag: 'Auth' },
  { file: 'product.routes.js', prefix: '/products', tag: 'Products' },
  { file: 'category.routes.js', prefix: '/categories', tag: 'Categories' },
  { file: 'order.routes.js', prefix: '/orders', tag: 'Orders' },
  { file: 'health.routes.js', prefix: '/health', tag: 'Health' },
];

// Verbos HTTP válidos en OpenAPI. Otras claves del path (parameters de
// nivel path, x-*) NO deben recibir "tags".
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

// Instancia de swagger-autogen ya configurada en modo OpenAPI 3.
// La primera llamada con un objeto de opciones devuelve el generador curado;
// sin `openapi`, la librería fuerza Swagger 2.0 y body iría en parameters.
const generate = swaggerAutogen({ openapi: '3.0.0', disableWarnings: true });

/**
 * Esta función invoca swagger-autogen sobre un único archivo de rutas
 * generando un JSON temporal, y devuelve sus paths ya parseados.
 */
async function generatePathsForFile(routesFile, tempFile) {
  const doc = JSON.parse(JSON.stringify(baseDoc));
  await generate(tempFile, [routesFile], doc);

  const raw = await fs.readFile(tempFile, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.paths || {};
}

/**
 * Esta función normaliza un parámetro no-body al formato OpenAPI 3:
 * - Asegura `schema.type` (OpenAPI 3 no usa `type` de nivel superior).
 * - Corrige path params llamados `id` a `integer` (swagger-autogen puede
 *   dejarlos como string al convertir desde Swagger 2.0).
 */
function normalizeParam(param) {
  if (!param || typeof param !== 'object') return param;
  const p = { ...param };
  const loc = String(p.in || '').toLowerCase();

  // Migrar type de nivel superior a schema (si aún quedara).
  if (p.type && !p.schema) {
    p.schema = { type: p.type };
    delete p.type;
  }

  if (p.schema) {
    p.schema = { ...p.schema };
    // Path :id → integer (coincide con el type: 'integer' de las anotaciones).
    if (loc === 'path' && p.name === 'id') {
      p.schema.type = 'integer';
    }
    // Heredar type legacy si schema no lo define.
    if (param.type && !p.schema.type) {
      p.schema.type = param.type;
    }
  }

  return p;
}

/**
 * Esta función asegura que toda operación con body documentado termine con
 * `requestBody` OpenAPI 3 (y NO con un parámetro `in: "body"` en
 * `parameters`). Si swagger-autogen aún dejó un body en parameters (p.ej.
 * anotación legada `#swagger.parameters['body']`), se migra aquí:
 *   parameters[in=body]  →  requestBody.content["application/json"].schema
 * El resto de parámetros (path, query, cookie, header) se conservan.
 */
function ensureRequestBody(operation) {
  if (!operation || typeof operation !== 'object') return operation;

  let params = Array.isArray(operation.parameters) ? operation.parameters : [];
  const bodyIdx = params.findIndex((p) => p && String(p.in).toLowerCase() === 'body');

  // Si ya existe requestBody formal, solo se purgan restos de body en parameters.
  if (operation.requestBody) {
    if (bodyIdx !== -1) {
      const bodyParam = params[bodyIdx];
      // Completa content si el requestBody existe pero viene incompleto.
      if (!operation.requestBody.content && bodyParam.schema) {
        operation.requestBody.content = {
          'application/json': { schema: bodyParam.schema },
        };
      }
      params = params.filter((_, i) => i !== bodyIdx);
      if (params.length > 0) {
        operation.parameters = params.map(normalizeParam);
      } else {
        delete operation.parameters;
      }
    } else if (params.length > 0) {
      // Normaliza path/query/cookie al formato OpenAPI 3.
      operation.parameters = params.map(normalizeParam);
    }
    return operation;
  }

  // No hay requestBody: migrar el body de parameters si existe.
  if (bodyIdx !== -1) {
    const bodyParam = params[bodyIdx];
    const schema =
      bodyParam.schema ||
      (bodyParam.type
        ? { type: bodyParam.type }
        : { type: 'object' });

    operation.requestBody = {
      description: bodyParam.description || 'Cuerpo de la petición (JSON)',
      required: bodyParam.required !== false,
      content: {
        'application/json': { schema },
      },
    };

    const rest = params.filter((_, i) => i !== bodyIdx);
    if (rest.length > 0) {
      operation.parameters = rest.map(normalizeParam);
    } else {
      delete operation.parameters;
    }
  } else if (params.length > 0) {
    operation.parameters = params.map(normalizeParam);
  }

  return operation;
}

/**
 * Esta función agrega el prefijo de montaje, inyecta el tag y normaliza
 * el requestBody OpenAPI 3 en cada verbo HTTP de la operación.
 */
function prefixPaths(paths, prefix, tag) {
  const result = {};

  for (const [key, value] of Object.entries(paths)) {
    const pathItem = { ...value };
    const full = key === '/' ? prefix : `${prefix}${key}`;

    for (const method of HTTP_METHODS) {
      if (pathItem[method] && typeof pathItem[method] === 'object') {
        let operation = { ...pathItem[method] };

        const existingTags = Array.isArray(operation.tags) ? operation.tags : [];
        if (!existingTags.includes(tag)) {
          operation.tags = [...existingTags, tag];
        }

        // Garantiza JSON body en requestBody (OpenAPI 3), nunca en parameters.
        operation = ensureRequestBody(operation);

        pathItem[method] = operation;
      }
    }

    result[full] = pathItem;
  }

  return result;
}

/**
 * Esta función orquesta la generación completa y escribe swagger.json.
 */
async function main() {
  const tempDir = path.join(__dirname, '.swagger-tmp');
  await fs.mkdir(tempDir, { recursive: true });

  const finalDoc = JSON.parse(JSON.stringify(baseDoc));
  finalDoc.paths = {};

  for (const { file, prefix, tag } of ROUTE_MOUNTS) {
    const routesPath = path.join(__dirname, 'src', 'routes', file);
    const tempFile = path.join(tempDir, file.replace('.js', '.json'));

    const paths = await generatePathsForFile(routesPath, tempFile);
    const prefixed = prefixPaths(paths, prefix, tag);

    Object.assign(finalDoc.paths, prefixed);
    console.log(`[Swagger] + ${prefix} ← ${file} (tag: ${tag}, ${Object.keys(prefixed).length} paths)`);
  }

  // Limpieza final global: ninguna operación debe conservar body en parameters.
  for (const [p, pathItem] of Object.entries(finalDoc.paths)) {
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) {
        pathItem[method] = ensureRequestBody(pathItem[method]);
        // Debug en consola para auditar el resultado.
        const op = pathItem[method];
        const hasBodyParam = Array.isArray(op.parameters) && op.parameters.some((x) => x.in === 'body');
        const hasRB = !!op.requestBody;
        if (hasBodyParam || (['post', 'put', 'patch'].includes(method) && !hasRB && op.parameters)) {
          // Solo alerta si algo quedó raro (post/put/patch sin requestBody
          // pero con parameters, o body colgado en parameters).
          if (hasBodyParam) console.warn(`[Swagger] WARN body en parameters: ${method} ${p}`);
        }
      }
    }
  }

  const outputFile = path.join(__dirname, 'swagger.json');
  await fs.writeFile(outputFile, JSON.stringify(finalDoc, null, 2), 'utf8');
  await fs.rm(tempDir, { recursive: true, force: true });

  console.log(`[Swagger] Documentación OpenAPI 3 generada en: ${outputFile}`);
}

main().catch((err) => {
  console.error('[Swagger] Error generando la documentación:', err);
  process.exit(1);
});
