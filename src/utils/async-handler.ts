import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Encapsula handlers assíncronos para que rejeições sejam encaminhadas
 * ao middleware global de erro (Express 4 não faz isso automaticamente).
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
