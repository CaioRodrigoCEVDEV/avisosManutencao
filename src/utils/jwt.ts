import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { authConfig } from "../config/auth";

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
}

export function signAuthToken(payload: { sub: string; email: string }): string {
  const options: SignOptions = {
    expiresIn: authConfig.jwtExpiresIn as SignOptions["expiresIn"],
    issuer: "maintenance-api",
  };
  return jwt.sign(payload, authConfig.jwtSecret, options);
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret, {
      issuer: "maintenance-api",
    });
    if (typeof decoded === "string") return null;
    if (!decoded.sub || typeof decoded.sub !== "string") return null;
    return decoded as AuthTokenPayload;
  } catch {
    return null;
  }
}
