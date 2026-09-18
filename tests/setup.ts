const testDatabaseUrl =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "Defina TEST_DATABASE_URL (ou DATABASE_URL) apontando para um PostgreSQL de testes."
  );
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-secret-key-with-at-least-32-characters";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.COOKIE_NAME = process.env.COOKIE_NAME || "maintenance_auth";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
process.env.APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";
