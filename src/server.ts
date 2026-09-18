import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { prisma, disconnectDatabase } from "./config/database";

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Conexão com o banco de dados estabelecida.");
  } catch (error) {
    logger.error({ err: error }, "Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`maintenance-api ouvindo em http://localhost:${env.port}`);
    logger.info(`Painel administrativo: http://localhost:${env.port}/admin/login`);
    logger.info(`API pública: http://localhost:${env.port}/api/maintenance`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Recebido ${signal}. Encerrando...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void bootstrap();
