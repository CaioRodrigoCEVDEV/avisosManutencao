import { Router } from "express";
import { maintenanceController } from "../controllers/maintenance.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const adminRouter = Router();

adminRouter.use(requireAuth);

adminRouter.get("/dashboard", asyncHandler(maintenanceController.dashboard));

adminRouter.get("/maintenance", asyncHandler(maintenanceController.list));
adminRouter.post("/maintenance", asyncHandler(maintenanceController.create));
adminRouter.get("/maintenance/:id", asyncHandler(maintenanceController.getById));
adminRouter.put("/maintenance/:id", asyncHandler(maintenanceController.update));
adminRouter.patch("/maintenance/:id/status", asyncHandler(maintenanceController.changeStatus));
adminRouter.patch("/maintenance/:id", asyncHandler(maintenanceController.update));
adminRouter.delete("/maintenance/:id", asyncHandler(maintenanceController.remove));
