import type { NextFunction, Request, RequestHandler, Response } from "express";
import helmet from "helmet";

/**
 * Diretivas base da Content-Security-Policy usadas em todos os ambientes.
 * As assets locais são referenciadas por caminhos relativos (/admin/...), por
 * isso `'self'` funciona tanto em HTTP quanto em HTTPS.
 */
const baseDirectives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
  scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
  imgSrc: ["'self'", "data:"],
  fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  frameAncestors: ["'none'"],
} as const;

/**
 * Perfis pré-compilados:
 *
 * - `secureHelmet`: usado quando a requisição chega por HTTPS (direto ou via
 *   reverse proxy). Mantém `upgrade-insecure-requests` e HSTS.
 * - `insecureHelmet`: usado quando a requisição chega por HTTP. Omite
 *   `upgrade-insecure-requests` (caso contrário o navegador tentaria buscar os
 *   CSS/JS em HTTPS e falharia com ERR_SSL_PROTOCOL_ERROR) e não envia HSTS
 *   (que só faz sentido sobre HTTPS).
 *
 * O restante das proteções (CSP, nosniff, frameguard, etc.) permanece ativo
 * nos dois perfis.
 */
const secureHelmet: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      ...baseDirectives,
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
});

const insecureHelmet: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      ...baseDirectives,
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: false,
});

/**
 * Detecta se a requisição é HTTPS.
 *
 * `req.secure` é confiável quando `trust proxy` está configurado (produção
 * atrás de Apache/Nginx). A leitura direta de `X-Forwarded-Proto` serve como
 * reforço para o cenário de reverse proxy e não prejudica o acesso HTTP
 * direto.
 */
export function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  const value = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  if (typeof value === "string" && value.length > 0) {
    return value.split(",")[0].trim().toLowerCase() === "https";
  }

  return false;
}

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  const middleware = isHttpsRequest(req) ? secureHelmet : insecureHelmet;
  middleware(req, res, next);
}
