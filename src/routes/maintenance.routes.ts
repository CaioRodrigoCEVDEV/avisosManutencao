import { Router } from "express";
import { maintenanceController } from "../controllers/maintenance.controller";
import { publicApiRateLimiter } from "../middlewares/rate-limit.middleware";
import { asyncHandler } from "../utils/async-handler";

export const publicMaintenanceRouter = Router();

publicMaintenanceRouter.get(
  "/",
  publicApiRateLimiter,
  asyncHandler(maintenanceController.publicCurrent)
);
publicMaintenanceRouter.get(
  "/next",
  publicApiRateLimiter,
  asyncHandler(maintenanceController.publicNext)
);
// Deve vir depois de "/next" para não capturar "next" como :id.
publicMaintenanceRouter.get(
  "/:id",
  publicApiRateLimiter,
  asyncHandler(maintenanceController.publicById)
);
