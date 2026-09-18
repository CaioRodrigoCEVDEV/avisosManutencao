import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type TestAgent from "supertest/lib/agent";
import {
  app,
  clearMaintenance,
  DAY,
  HOUR,
  isoRelativeToNow,
  loginAgent,
  prisma,
  request,
  seedAdmin,
} from "./helpers/test-context";

const EMPTY_PUBLIC = {
  ativo: false,
  inicio: null,
  fim: null,
  titulo: null,
  mensagem: null,
};

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Manutenção programada",
    message: "O sistema ficará indisponível durante este período.",
    startAt: isoRelativeToNow(-HOUR),
    endAt: isoRelativeToNow(HOUR),
    active: true,
    ...overrides,
  };
}

describe("CRUD e API pública de manutenções", () => {
  let agent: TestAgent;

  beforeAll(async () => {
    await seedAdmin();
    agent = await loginAgent();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await clearMaintenance();
  });

  it("exige autenticação nos endpoints administrativos", async () => {
    await request(app).get("/api/admin/maintenance").expect(401);
    await request(app).post("/api/admin/maintenance").send(baseBody()).expect(401);
  });

  it("cria uma manutenção", async () => {
    const response = await agent.post("/api/admin/maintenance").send(baseBody()).expect(201);

    expect(response.body.id).toBeTruthy();
    expect(response.body.title).toBe("Manutenção programada");
    expect(response.body.active).toBe(true);
    expect(response.body.status).toBe("ongoing");
  });

  it("valida que a data final deve ser maior que a inicial", async () => {
    const response = await agent
      .post("/api/admin/maintenance")
      .send(
        baseBody({
          startAt: isoRelativeToNow(HOUR),
          endAt: isoRelativeToNow(-HOUR),
        })
      )
      .expect(400);

    expect(response.body.error).toBe("VALIDATION_ERROR");
  });

  it("impede conflito entre manutenções ativas sobrepostas", async () => {
    await agent.post("/api/admin/maintenance").send(baseBody()).expect(201);

    const response = await agent
      .post("/api/admin/maintenance")
      .send({
        ...baseBody(),
        startAt: isoRelativeToNow(0),
        endAt: isoRelativeToNow(2 * HOUR),
      })
      .expect(409);

    expect(response.body.error).toBe("MAINTENANCE_CONFLICT");
  });

  it("retorna contrato vazio quando não há manutenção", async () => {
    const response = await request(app).get("/api/maintenance").expect(200);
    expect(response.body).toEqual(EMPTY_PUBLIC);
  });

  it("retorna a manutenção ativa no momento", async () => {
    await agent.post("/api/admin/maintenance").send(baseBody()).expect(201);

    const response = await request(app).get("/api/maintenance").expect(200);
    expect(response.body).toEqual({
      ativo: true,
      inicio: expect.any(String),
      fim: expect.any(String),
      titulo: "Manutenção programada",
      mensagem: "O sistema ficará indisponível durante este período.",
    });
    expect(Object.keys(response.body).sort()).toEqual([
      "ativo",
      "fim",
      "inicio",
      "mensagem",
      "titulo",
    ]);
    expect(response.body).not.toHaveProperty("id");
    expect(response.body).not.toHaveProperty("createdAt");
    expect(response.body).not.toHaveProperty("updatedAt");
  });

  it("não retorna manutenção futura como atual", async () => {
    await agent
      .post("/api/admin/maintenance")
      .send(baseBody({ startAt: isoRelativeToNow(DAY), endAt: isoRelativeToNow(DAY + HOUR) }))
      .expect(201);

    const response = await request(app).get("/api/maintenance").expect(200);
    expect(response.body).toEqual(EMPTY_PUBLIC);
  });

  it("não retorna manutenção encerrada como atual", async () => {
    await agent
      .post("/api/admin/maintenance")
      .send(baseBody({ startAt: isoRelativeToNow(-DAY - HOUR), endAt: isoRelativeToNow(-DAY) }))
      .expect(201);

    const response = await request(app).get("/api/maintenance").expect(200);
    expect(response.body).toEqual(EMPTY_PUBLIC);
  });

  it("não retorna manutenção inativa", async () => {
    await agent.post("/api/admin/maintenance").send(baseBody({ active: false })).expect(201);

    const response = await request(app).get("/api/maintenance").expect(200);
    expect(response.body).toEqual(EMPTY_PUBLIC);
  });

  it("retorna a próxima manutenção em /api/maintenance/next", async () => {
    await agent
      .post("/api/admin/maintenance")
      .send(baseBody({ startAt: isoRelativeToNow(DAY), endAt: isoRelativeToNow(DAY + HOUR), title: "Futura" }))
      .expect(201);

    const response = await request(app).get("/api/maintenance/next").expect(200);
    expect(response.body.ativo).toBe(false);
    expect(response.body.titulo).toBe("Futura");
    expect(response.body.inicio).toEqual(expect.any(String));
  });

  it("retorna uma manutenção por ID mesmo fora da janela", async () => {
    const created = await agent
      .post("/api/admin/maintenance")
      .send(
        baseBody({
          title: "Futura por ID",
          startAt: isoRelativeToNow(DAY),
          endAt: isoRelativeToNow(DAY + HOUR),
        })
      )
      .expect(201);

    const response = await request(app)
      .get(`/api/maintenance/${created.body.id}`)
      .expect(200);

    expect(response.body.titulo).toBe("Futura por ID");
    expect(response.body.inicio).toEqual(expect.any(String));
    expect(response.body.ativo).toBe(false);
    expect(Object.keys(response.body).sort()).toEqual([
      "ativo",
      "fim",
      "inicio",
      "mensagem",
      "titulo",
    ]);
  });

  it("retorna manutenção inativa por ID", async () => {
    const created = await agent
      .post("/api/admin/maintenance")
      .send(baseBody({ active: false, title: "Inativa por ID" }))
      .expect(201);

    const response = await request(app)
      .get(`/api/maintenance/${created.body.id}`)
      .expect(200);

    expect(response.body.titulo).toBe("Inativa por ID");
    expect(response.body.ativo).toBe(false);
  });

  it("retorna 404 para ID inexistente na rota pública", async () => {
    const response = await request(app)
      .get("/api/maintenance/id-inexistente")
      .expect(404);
    expect(response.body.error).toBe("NOT_FOUND");
  });

  it("edita uma manutenção", async () => {
    const created = await agent.post("/api/admin/maintenance").send(baseBody()).expect(201);

    const response = await agent
      .put(`/api/admin/maintenance/${created.body.id}`)
      .send({ title: "Título atualizado", message: "Nova mensagem" })
      .expect(200);

    expect(response.body.title).toBe("Título atualizado");
    expect(response.body.message).toBe("Nova mensagem");
  });

  it("ativa e desativa uma manutenção", async () => {
    const created = await agent.post("/api/admin/maintenance").send(baseBody()).expect(201);

    await agent
      .patch(`/api/admin/maintenance/${created.body.id}/status`)
      .send({ active: false })
      .expect(200);

    const publicResponse = await request(app).get("/api/maintenance").expect(200);
    expect(publicResponse.body).toEqual(EMPTY_PUBLIC);

    const list = await agent
      .get("/api/admin/maintenance?filter=inactive")
      .expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it("exclui uma manutenção", async () => {
    const created = await agent.post("/api/admin/maintenance").send(baseBody()).expect(201);

    await agent.delete(`/api/admin/maintenance/${created.body.id}`).expect(200);
    await agent.get(`/api/admin/maintenance/${created.body.id}`).expect(404);
  });

  it("retorna 404 para manutenção inexistente", async () => {
    const response = await agent.get("/api/admin/maintenance/inexistente").expect(404);
    expect(response.body.error).toBe("NOT_FOUND");
  });

  it("preserva quebras de linha na mensagem", async () => {
    const message = "Linha 1\n\nLinha 2\n• Item A\n• Item B";
    await agent.post("/api/admin/maintenance").send(baseBody({ message })).expect(201);

    const response = await request(app).get("/api/maintenance").expect(200);
    expect(response.body.mensagem).toBe(message);
  });
});
