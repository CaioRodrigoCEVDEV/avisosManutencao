import type { CookieOptions, Request, Response } from "express";
import { authConfig } from "../config/auth";
import { authService } from "../services/auth.service";
import { parseOrThrow } from "../utils/validate";
import { changePasswordSchema, loginSchema } from "../schemas/auth.schema";
import { isHttpsRequest } from "../middlewares/security.middleware";

/**
 * O flag `Secure` do cookie segue o protocolo real da requisição:
 * HTTPS (direto ou via reverse proxy) -> Secure; HTTP -> sem Secure.
 * Assim o login funciona em testes HTTP sem perder a proteção em produção
 * atrás de Apache/Nginx.
 */
function cookieOptions(req: Request): CookieOptions {
  return {
    ...authConfig.cookieOptions,
    secure: isHttpsRequest(req),
  };
}

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = parseOrThrow(loginSchema, req.body);
    const { token, user } = await authService.login(email, password);

    res.cookie(authConfig.cookieName, token, cookieOptions(req));
    res.status(200).json({
      message: "Login realizado com sucesso.",
      user,
    });
  },

  logout(req: Request, res: Response): void {
    res.clearCookie(authConfig.cookieName, {
      ...cookieOptions(req),
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
