import type { NextFunction, Request, Response } from "express";
import { authConfig } from "../config/auth";
import { adminRepository } from "../repositories/admin.repository";
import { verifyAuthToken } from "../utils/jwt";
import { AppError } from "../utils/errors";

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[authConfig.cookieName];
    if (!token) {
      throw AppError.unauthorized();
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      throw AppError.unauthorized();
    }

    const user = await adminRepository.findById(payload.sub);
    if (!user || !user.active) {
      throw AppError.unauthorized();
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (error) {
    next(error);
  }
}
