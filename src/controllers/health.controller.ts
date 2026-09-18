import type { Request, Response } from "express";

export const healthController = {
  check(_req: Request, res: Response): void {
    res.status(200).json({
      status: "ok",
      service: "maintenance-api",
      timestamp: new Date().toISOString(),
    });
  },
};
