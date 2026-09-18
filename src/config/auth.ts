import { env } from "./env";

export const authConfig = {
  jwtSecret: env.jwtSecret,
  jwtExpiresIn: env.jwtExpiresIn,
  cookieName: env.cookieName,
  cookieOptions: {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  },
  bcryptRounds: 12,
  minPasswordLength: 8,
} as const;
