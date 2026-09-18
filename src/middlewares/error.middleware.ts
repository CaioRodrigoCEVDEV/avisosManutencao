import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { formatZodError } from "../utils/validate";
import { logger } from "../utils/logger";

interface ErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let body: ErrorBody = {
    error: "INTERNAL_SERVER_ERROR",
    message: "Ocorreu um erro interno.",
  };

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    body = { error: error.code, message: error.message };
    if (error.details !== undefined) body.details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    body = {
      error: "VALIDATION_ERROR",
      message: "Os dados enviados são inválidos.",
      details: formatZodError(error),
    };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      body = { error: "CONFLICT", message: "Registro já existente." };
    } else if (error.code === "P2025") {
      statusCode = 404;
      body = { error: "NOT_FOUND", message: "Recurso não encontrado." };
    } else {
      statusCode = 400;
      body = { error: "DATABASE_ERROR", message: "Não foi possível processar a operação." };
    }
  }

  const logPayload = {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    err: error instanceof Error ? error.message : String(error),
  };

  if (statusCode >= 500) {
    logger.error(logPayload);
  } else {
    logger.warn(logPayload);
  }

  if (!env.isProduction && !(error instanceof AppError) && error instanceof Error) {
    body.details = error.stack;
  }

  res.status(statusCode).json(body);
}
