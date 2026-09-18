import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  const name = process.env.ADMIN_NAME || "Administrador";
  const email = (process.env.ADMIN_EMAIL || "admin@localhost").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";

  if (!email) {
    throw new Error("ADMIN_EMAIL não definido.");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    console.log(`[seed] Usuário administrador já existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      active: true,
    },
  });

  console.log(`[seed] Usuário administrador criado: ${email}`);
  console.log("[seed] Altere a senha inicial antes de colocar em produção.");
}

main()
  .catch((error) => {
    console.error("[seed] Falha ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
