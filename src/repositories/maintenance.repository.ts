import type { MaintenanceMessage, Prisma } from "@prisma/client";
import { prisma } from "../config/database";

export type MaintenanceFilter =
  | "all"
  | "active"
  | "inactive"
  | "scheduled"
  | "ongoing"
  | "finished";

export interface MaintenanceWriteData {
  title: string;
  message: string;
  active: boolean;
  startAt: Date;
  endAt: Date;
}

function buildFilterWhere(filter: MaintenanceFilter, now: Date): Prisma.MaintenanceMessageWhereInput {
  switch (filter) {
    case "active":
      return { active: true };
    case "inactive":
      return { active: false };
    case "scheduled":
      return { active: true, startAt: { gt: now } };
    case "ongoing":
      return { active: true, startAt: { lte: now }, endAt: { gte: now } };
    case "finished":
      return { active: true, endAt: { lt: now } };
    case "all":
    default:
      return {};
  }
}

export const maintenanceRepository = {
  findMany(filter: MaintenanceFilter = "all", now = new Date()): Promise<MaintenanceMessage[]> {
    return prisma.maintenanceMessage.findMany({
      where: buildFilterWhere(filter, now),
      orderBy: { startAt: "desc" },
    });
  },

  findById(id: string): Promise<MaintenanceMessage | null> {
    return prisma.maintenanceMessage.findUnique({ where: { id } });
  },

  count(): Promise<number> {
    return prisma.maintenanceMessage.count();
  },

  create(data: MaintenanceWriteData): Promise<MaintenanceMessage> {
    return prisma.maintenanceMessage.create({ data });
  },

  update(id: string, data: Partial<MaintenanceWriteData>): Promise<MaintenanceMessage> {
    return prisma.maintenanceMessage.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.maintenanceMessage.delete({ where: { id } });
  },

  /**
   * Manutenção habilitada cobrindo o instante atual.
   * Consulta otimizada: usa o índice composto (active, start_at, end_at)
   * e seleciona apenas os campos do contrato público.
   */
  findActiveNow(now = new Date()) {
    return prisma.maintenanceMessage.findFirst({
      where: {
        active: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      orderBy: { startAt: "desc" },
      select: { startAt: true, endAt: true, title: true, message: true },
    });
  },

  /**
   * Próxima manutenção habilitada que ainda não começou.
   */
  findNext(now = new Date()) {
    return prisma.maintenanceMessage.findFirst({
      where: {
        active: true,
        startAt: { gt: now },
      },
      orderBy: { startAt: "asc" },
      select: { startAt: true, endAt: true, title: true, message: true },
    });
  },

  findConflict(
    startAt: Date,
    endAt: Date,
    excludeId?: string
  ): Promise<{ id: string; title: string; startAt: Date; endAt: Date } | null> {
    return prisma.maintenanceMessage.findFirst({
      where: {
        active: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, title: true, startAt: true, endAt: true },
    });
  },
};
