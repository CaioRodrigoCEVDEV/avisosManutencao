import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import { hashPassword } from "../../src/utils/password";

export const app = createApp();

export const TEST_ADMIN = {
  name: "Admin Teste",
  email: "admin@test.local",
  password: "SenhaForte123",
};

export async function clearMaintenance(): Promise<void> {
  await prisma.maintenanceMessage.deleteMany();
}

export async function resetDatabase(): Promise<void> {
  await prisma.maintenanceMessage.deleteMany();
  await prisma.adminUser.deleteMany();
}

export async function seedAdmin(): Promise<void> {
  await prisma.adminUser.deleteMany({ where: { email: TEST_ADMIN.email } });
  const passwordHash = await hashPassword(TEST_ADMIN.password);
  await prisma.adminUser.create({
    data: {
      name: TEST_ADMIN.name,
      email: TEST_ADMIN.email,
      passwordHash,
      active: true,
    },
  });
}

export async function loginAgent(): Promise<TestAgent> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
    .expect(200);
  return agent;
}

export { prisma, request };

export function isoRelativeToNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
