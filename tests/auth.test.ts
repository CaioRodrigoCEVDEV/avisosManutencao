import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  app,
  prisma,
  request,
  seedAdmin,
  TEST_ADMIN,
} from "./helpers/test-context";

describe("Autenticação administrativa", () => {
  beforeAll(async () => {
    await seedAdmin();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("realiza login válido e define cookie HttpOnly", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
      .expect(200);

    expect(response.body.message).toBe("Login realizado com sucesso.");
    expect(response.body.user.email).toBe(TEST_ADMIN.email);
    expect(response.body.user).not.toHaveProperty("passwordHash");

    const cookies = response.headers["set-cookie"] as unknown as string[];
    expect(cookies).toBeDefined();
    const authCookie = cookies.find((cookie) => cookie.startsWith("maintenance_auth="));
    expect(authCookie).toBeDefined();
    expect(authCookie).toContain("HttpOnly");
  });

  it("rejeita login inválido com mensagem genérica", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: "senha-errada" })
      .expect(401);

    expect(response.body.error).toBe("UNAUTHORIZED");
    expect(response.body.message).toBe("Email ou senha inválidos.");
  });

  it("bloqueia acesso sem autenticação", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);
    expect(response.body.error).toBe("UNAUTHORIZED");
  });

  it("retorna o usuário autenticado em /me", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
      .expect(200);

    const response = await agent.get("/api/auth/me").expect(200);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user.email).toBe(TEST_ADMIN.email);
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("realiza logout e invalida a sessão", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
      .expect(200);

    await agent.post("/api/auth/logout").expect(200);
    await agent.get("/api/auth/me").expect(401);
  });

  it("rejeita troca de senha com senha atual incorreta", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
      .expect(200);

    await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: "senha-errada",
        newPassword: "NovaSenha123",
        confirmPassword: "NovaSenha123",
      })
      .expect(400);
  });

  it("troca a senha e permite login com a nova", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
      .expect(200);

    await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: TEST_ADMIN.password,
        newPassword: "NovaSenha123",
        confirmPassword: "NovaSenha123",
      })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_ADMIN.email, password: "NovaSenha123" })
      .expect(200);

    // Restaura a senha original para os demais arquivos de teste.
    await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: "NovaSenha123",
        newPassword: TEST_ADMIN.password,
        confirmPassword: TEST_ADMIN.password,
      })
      .expect(200);
  });
});
