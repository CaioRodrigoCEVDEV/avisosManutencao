import { afterAll, describe, expect, it } from "vitest";
import { app, request, prisma } from "./helpers/test-context";

describe("GET /health", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retorna status ok sem autenticação", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("maintenance-api");
    expect(typeof response.body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });
});
