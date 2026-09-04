/**
 * Fallo de transporte: el fetch no llegó a completarse (sin conexión, DNS,
 * timeout, servidor inaccesible). Nunca representa una respuesta HTTP real
 * — si el servidor respondió (aunque sea con un status de error), no es
 * esto, es un ApiError.
 */
export class NetworkError extends Error {
  constructor(message = "No se pudo conectar con el servidor", options?: ErrorOptions) {
    super(message, options);
    this.name = "NetworkError";
  }
}

/**
 * El servidor respondió, pero con un status HTTP de error. `status` permite
 * a quien la capture decidir el tratamiento (p. ej. 401 en un refresh =
 * sesión inválida; otros estados pueden tratarse distinto en el futuro).
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message = `Error de la API (status ${status})`, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
  }
}
