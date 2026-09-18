import type { AdminUser } from "@prisma/client";
import { prisma } from "../config/database";

export const adminRepository = {
  findByEmail(email: string): Promise<AdminUser | null> {
    return prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id: string): Promise<AdminUser | null> {
    return prisma.adminUser.findUnique({ where: { id } });
  },

  updatePassword(id: string, passwordHash: string): Promise<AdminUser> {
    return prisma.adminUser.update({
      where: { id },
      data: { passwordHash },
    });
  },
};
