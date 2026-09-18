import type { Request, Response } from "express";
import { maintenanceService } from "../services/maintenance.service";
import { parseOrThrow } from "../utils/validate";
import {
  changeStatusSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
} from "../schemas/maintenance.schema";
import type { MaintenanceFilter } from "../repositories/maintenance.repository";

const VALID_FILTERS: MaintenanceFilter[] = [
  "all",
  "active",
  "inactive",
  "scheduled",
  "ongoing",
  "finished",
];

function resolveFilter(value: unknown): MaintenanceFilter {
  if (typeof value === "string" && VALID_FILTERS.includes(value as MaintenanceFilter)) {
    return value as MaintenanceFilter;
  }
  return "all";
}

export const maintenanceController = {
  async list(req: Request, res: Response): Promise<void> {
    const items = await maintenanceService.list(resolveFilter(req.query.filter));
    res.status(200).json({ items, total: items.length });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const item = await maintenanceService.getById(req.params.id);
    res.status(200).json(item);
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = parseOrThrow(createMaintenanceSchema, req.body);
    const created = await maintenanceService.create(input);
    res.status(201).json(created);
  },

  async update(req: Request, res: Response): Promise<void> {
    const input = parseOrThrow(updateMaintenanceSchema, req.body);
    const updated = await maintenanceService.update(req.params.id, input);
    res.status(200).json(updated);
  },

  async changeStatus(req: Request, res: Response): Promise<void> {
    const { active } = parseOrThrow(changeStatusSchema, req.body);
    const updated = await maintenanceService.changeStatus(req.params.id, active);
    res.status(200).json(updated);
  },

  async remove(req: Request, res: Response): Promise<void> {
    await maintenanceService.remove(req.params.id);
    res.status(200).json({ message: "Manutenção excluída com sucesso." });
  },

  async publicCurrent(_req: Request, res: Response): Promise<void> {
    const data = await maintenanceService.getPublicCurrent();
    res.set("Cache-Control", "no-store");
    res.status(200).json(data);
  },

  async publicNext(_req: Request, res: Response): Promise<void> {
    const data = await maintenanceService.getPublicNext();
    res.set("Cache-Control", "no-store");
    res.status(200).json(data);
  },

  async publicById(req: Request, res: Response): Promise<void> {
    const data = await maintenanceService.getPublicById(req.params.id);
    res.set("Cache-Control", "no-store");
    res.status(200).json(data);
  },

  async dashboard(_req: Request, res: Response): Promise<void> {
    const data = await maintenanceService.dashboard();
    res.status(200).json(data);
  },
};
