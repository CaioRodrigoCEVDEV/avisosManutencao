export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = "Os dados enviados são inválidos.", details?: unknown) {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Autenticação necessária.") {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Acesso negado.") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Recurso não encontrado.") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message = "Já existe uma manutenção ativa neste período.") {
    return new AppError(409, "MAINTENANCE_CONFLICT", message);
  }

  static tooManyRequests(message = "Muitas tentativas. Tente novamente mais tarde.") {
    return new AppError(429, "TOO_MANY_REQUESTS", message);
  }

  static internal(message = "Ocorreu um erro interno.") {
    return new AppError(500, "INTERNAL_SERVER_ERROR", message);
  }
}
