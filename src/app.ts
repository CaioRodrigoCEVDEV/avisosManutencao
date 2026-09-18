import path from "path";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./routes/auth.routes";
import { adminRouter } from "./routes/admin.routes";
import { publicMaintenanceRouter } from "./routes/maintenance.routes";
import { notFound } from "./middlewares/not-found.middleware";
import { errorHandler } from "./middlewares/error.middleware";

const publicDir = path.resolve(process.cwd(), "public");
const adminDir = path.join(publicDir, "admin");

function allowedOrigins(): string[] {
  return env.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function buildCorsOptions(): CorsOptions {
  const origins = allowedOrigins();
  return {
    origin(origin, callback) {
      // Requisições sem Origin (curl, server-to-server) são permitidas.
      if (!origin) return callback(null, true);
      if (origins.includes("*") || origins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

export function createApp(): Application {
  const app = express();

  if (env.isProduction) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(cors(buildCorsOptions()));
  app.use(cookieParser());
  app.use(express.json({ limit: "200kb" }));
  app.use(express.urlencoded({ extended: false, limit: "200kb" }));

  app.use(
    pinoHttp({
      logger,
      autoLogging: !env.isTest,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    })
  );

  app.use("/admin", express.static(adminDir, { index: false, redirect: false }));
  app.use("/assets", express.static(path.join(publicDir, "assets"), { index: false, redirect: false }));

  app.use("/health", healthRouter);
  app.use("/api/maintenance", publicMaintenanceRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);

  const sendPage = (file: string) => (_req: Request, res: Response) => {
    res.sendFile(path.join(adminDir, file));
  };

  app.get("/", (_req: Request, res: Response) => res.redirect("/admin/login"));
  app.get("/admin", sendPage("index.html"));
  app.get("/admin/", sendPage("index.html"));
  app.get("/admin/login", sendPage("login.html"));
  app.get("/admin/maintenance", sendPage("maintenance.html"));
  app.get("/admin/maintenance/new", sendPage("maintenance-form.html"));
  app.get("/admin/maintenance/:id/edit", sendPage("maintenance-form.html"));
  app.get("/admin/settings", sendPage("settings.html"));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
