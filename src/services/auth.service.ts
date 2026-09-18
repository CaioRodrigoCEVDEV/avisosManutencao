import type { AdminUser } from "@prisma/client";
import { adminRepository } from "../repositories/admin.repository";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAuthToken } from "../utils/jwt";
import { AppError } from "../utils/errors";
import type { ChangePasswordInput } from "../schemas/auth.schema";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

function toSessionUser(user: AdminUser): SessionUser {
  return { id: user.id, name: user.name, email: user.email };
}

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: SessionUser }> {
    const user = await adminRepository.findByEmail(email);

    // Mensagem genérica: não revelar se o email existe.
    if (!user) {
      throw AppError.unauthorized("Email ou senha inválidos.");
    }
    if (!user.active) {
      throw AppError.unauthorized("Email ou senha inválidos.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized("Email ou senha inválidos.");
    }

    const token = signAuthToken({ sub: user.id, email: user.email });
    return { token, user: toSessionUser(user) };
  },

  async getMe(userId: string): Promise<SessionUser> {
    const user = await adminRepository.findById(userId);
    if (!user || !user.active) {
      throw AppError.unauthorized();
    }
    return toSessionUser(user);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await adminRepository.findById(userId);
    if (!user || !user.active) {
      throw AppError.unauthorized();
    }

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw AppError.badRequest("A senha atual está incorreta.");
    }

    const newHash = await hashPassword(input.newPassword);
    await adminRepository.updatePassword(user.id, newHash);
  },
};
