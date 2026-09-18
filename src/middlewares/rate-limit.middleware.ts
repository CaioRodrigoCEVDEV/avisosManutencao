import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * Rate limit específico para o login: 5 tentativas por IP a cada 15 minutos.
 * Em ambiente de teste o limite é relaxado para não interferir na suíte.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    });
  },
});

/**
 * Rate limit geral e leve para a API pública, apenas para conter abusos.
 */
export const publicApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  // Limite generoso: a API pública é consumida com frequência.
  max: env.isTest ? 100000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      message: "Muitas requisições. Tente novamente mais tarde.",
    });
  },
});
