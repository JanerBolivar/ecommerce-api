// Este módulo define una excepción personalizada con forma de error de API.
// Usar un tipo de error con "status" permite que el manejador global de
// errores distingua errores de negocio (404, 403...) de errores reales (500)
// sin tener que inspeccionar mensajes de texto.

export class ApiError extends Error {
  /**
   * Esta función construye un error de API con código HTTP y mensaje.
   * @param {number} status - Código HTTP (400, 401, 403, 404, 409, 500...).
   * @param {string} message - Mensaje legible que se expone al cliente.
   */
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Captura la pila de llamadas para depuración en logs del servidor.
    Error.captureStackTrace?.(this, ApiError);
  }

  // Métodos fábrica para los errores más comunes: mantienen el código
  // conciso en controladores y unifican mensajes consistentes.

  static badRequest(message = 'Solicitud inválida') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'No autorizado') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Acceso denegado') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflicto con el recurso actual') {
    return new ApiError(409, message);
  }

  static internal(message = 'Error interno del servidor') {
    return new ApiError(500, message);
  }
}
