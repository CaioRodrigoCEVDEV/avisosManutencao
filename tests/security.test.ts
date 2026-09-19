import { afterAll, describe, expect, it } from "vitest";
import { app, prisma, request } from "./helpers/test-context";

describe("Cabeçalhos de segurança por protocolo", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("em HTTP não envia upgrade-insecure-requests nem HSTS", async () => {
    const response = await request(app).get("/admin/login").expect(200);

    const csp = response.headers["content-security-policy"] || "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(response.headers["strict-transport-security"]).toBeUndefined();
  });

  it("em HTTPS (via X-Forwarded-Proto) mantém upgrade-insecure-requests e HSTS", async () => {
    const response = await request(app)
      .get("/admin/login")
      .set("X-Forwarded-Proto", "https")
      .expect(200);

    const csp = response.headers["content-security-policy"] || "";
    expect(csp).toContain("upgrade-insecure-requests");
    expect(response.headers["strict-transport-security"]).toBeDefined();
  });

  it("serve os assets locais (CSS e JS) sem redirecionar para HTTPS", async () => {
    const css = await request(app).get("/admin/css/admin.css").expect(200);
    expect(css.headers["content-type"]).toContain("text/css");
    expect(css.headers.location).toBeUndefined();

    const js = await request(app).get("/admin/js/auth.js").expect(200);
    expect(js.headers["content-type"]).toMatch(/javascript/);
    expect(js.headers.location).toBeUndefined();
  });
});
