import type { CookieOptions, Request, Response } from "express";
import { authConfig } from "../config/auth";
import { env } from "../config/env";
import { authService } from "../services/auth.service";
import { parseOrThrow } from "../utils/validate";
import { changePasswordSchema, loginSchema } from "../schemas/auth.schema";

function cookieOptions(): CookieOptions {
  return {
    ...authConfig.cookieOptions,
    secure: env.isProduction,
  };
}

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = parseOrThrow(loginSchema, req.body);
    const { token, user } = await authService.login(email, password);

    res.cookie(authConfig.cookieName, token, cookieOptions());
    res.status(200).json({
      message: "Login realizado com sucesso.",
      user,
    });
  },

  logout(_req: Request, res: Response): void {
    res.clearCookie(authConfig.cookieName, {
      ...cookieOptions(),
      maxAge: undefined,
    });
    res.status(200).json({ message: "Logout realizado com sucesso." });
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json({ authenticated: true, user });
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    const input = parseOrThrow(changePasswordSchema, req.body);
    await authService.changePassword(req.user!.id, input);
    res.status(200).json({ message: "Senha alterada com sucesso." });
  },
};
