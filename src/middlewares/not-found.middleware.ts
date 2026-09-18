import type { Request, Response } from "express";

export function notFound(req: Request, res: Response): void {
  if (req.path.startsWith("/api")) {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Recurso não encontrado.",
    });
    return;
  }

  res.status(404).send("Página não encontrada.");
}
