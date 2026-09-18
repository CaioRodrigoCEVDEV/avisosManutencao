import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { loginRateLimiter } from "../middlewares/rate-limit.middleware";
import { asyncHandler } from "../utils/async-handler";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, asyncHandler(authController.login));
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
authRouter.post("/change-password", requireAuth, asyncHandler(authController.changePassword));
