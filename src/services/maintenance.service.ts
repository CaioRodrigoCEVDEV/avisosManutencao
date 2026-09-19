import type { MaintenanceMessage } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { formatIsoWithOffset } from "../utils/dates";
import {
  maintenanceRepository,
  type MaintenanceFilter,
  type MaintenanceWriteData,
} from "../repositories/maintenance.repository";

export type MaintenanceStatus = "scheduled" | "ongoing" | "finished" | "inactive";

export interface PublicMaintenance {
  id: string | null;
  ativo: boolean;
  inicio: string | null;
  fim: string | null;
  titulo: string | null;
  mensagem: string | null;
}

export interface AdminMaintenance {
  id: string;
  title: string;
  message: string;
  active: boolean;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  status: MaintenanceStatus;
}

const EMPTY_PUBLIC: PublicMaintenance = {
  id: null,
  ativo: false,
  inicio: null,
  fim: null,
  titulo: null,
  mensagem: null,
};

export function computeStatus(record: Pick<MaintenanceMessage, "active" | "startAt" | "endAt">, now = new Date()): MaintenanceStatus {
  if (!record.active) return "inactive";
  if (now < record.startAt) return "scheduled";
  if (now > record.endAt) return "finished";
  return "ongoing";
}

function toAdmin(record: MaintenanceMessage, now = new Date()): AdminMaintenance {
  return {
    id: record.id,
    title: record.title,
    message: record.message,
    active: record.active,
    startAt: record.startAt.toISOString(),
    endAt: record.endAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    status: computeStatus(record, now),
  };
}

function toPublic(
  record: { id: string; startAt: Date; endAt: Date; title: string; message: string } | null,
  options: { forceInactive?: boolean } = {}
): PublicMaintenance {
  if (!record) return { ...EMPTY_PUBLIC };
  return {
    id: record.id,
    // Em /api/maintenance/next o contrato retorna ativo=false, pois a
    // próxima manutenção, por definição, ainda não começou.
    ativo: options.forceInactive ? false : true,
    inicio: formatIsoWithOffset(record.startAt, env.appTimezone),
    fim: formatIsoWithOffset(record.endAt, env.appTimezone),
    titulo: record.title,
    mensagem: record.message,
  };
}

/**
 * Consulta pública por ID. Retorna a manutenção independentemente da janela
 * de início/fim (e do flag active). O campo `ativo` reflete o estado real
 * calculado no momento da consulta.
 */
function toPublicById(record: MaintenanceMessage): PublicMaintenance {
  const now = new Date();
  return {
    id: record.id,
    ativo: record.active && record.startAt <= now && record.endAt >= now,
    inicio: formatIsoWithOffset(record.startAt, env.appTimezone),
    fim: formatIsoWithOffset(record.endAt, env.appTimezone),
    titulo: record.title,
    mensagem: record.message,
  };
}

async function assertNoConflict(startAt: Date, endAt: Date, excludeId?: string): Promise<void> {
  if (endAt.getTime() <= startAt.getTime()) {
    throw AppError.badRequest("A data final deve ser maior que a data inicial.");
  }
  const conflict = await maintenanceRepository.findConflict(startAt, endAt, excludeId);
  if (conflict) {
    throw AppError.conflict();
  }
}

export const maintenanceService = {
  async list(filter: MaintenanceFilter): Promise<AdminMaintenance[]> {
    const now = new Date();
    const records = await maintenanceRepository.findMany(filter, now);
    return records.map((record) => toAdmin(record, now));
  },

  async getById(id: string): Promise<AdminMaintenance> {
    const record = await maintenanceRepository.findById(id);
    if (!record) throw AppError.notFound("Manutenção não encontrada.");
    return toAdmin(record);
  },

  async create(data: MaintenanceWriteData): Promise<AdminMaintenance> {
    await assertNoConflict(data.startAt, data.endAt);
    const created = await maintenanceRepository.create(data);
    return toAdmin(created);
  },

  async update(id: string, data: Partial<MaintenanceWriteData>): Promise<AdminMaintenance> {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) throw AppError.notFound("Manutenção não encontrada.");

    const merged: MaintenanceWriteData = {
      title: data.title ?? existing.title,
      message: data.message ?? existing.message,
      active: data.active ?? existing.active,
      startAt: data.startAt ?? existing.startAt,
      endAt: data.endAt ?? existing.endAt,
    };

    await assertNoConflict(merged.startAt, merged.endAt, id);

    const updated = await maintenanceRepository.update(id, merged);
    return toAdmin(updated);
  },

  async changeStatus(id: string, active: boolean): Promise<AdminMaintenance> {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) throw AppError.notFound("Manutenção não encontrada.");

    if (active) {
      await assertNoConflict(existing.startAt, existing.endAt, id);
    }

    const updated = await maintenanceRepository.update(id, { active });
    return toAdmin(updated);
  },

  async remove(id: string): Promise<void> {
    const existing = await maintenanceRepository.findById(id);
    if (!existing) throw AppError.notFound("Manutenção não encontrada.");
    await maintenanceRepository.delete(id);
  },

  async getPublicCurrent(): Promise<PublicMaintenance> {
    const record = await maintenanceRepository.findActiveNow();
    return toPublic(record);
  },

  async getPublicNext(): Promise<PublicMaintenance> {
    const record = await maintenanceRepository.findNext();
    return toPublic(record, { forceInactive: true });
  },

  async getPublicById(id: string): Promise<PublicMaintenance> {
    const record = await maintenanceRepository.findById(id);
    if (!record) throw AppError.notFound("Manutenção não encontrada.");
    return toPublicById(record);
  },

  async dashboard(): Promise<{
    current: AdminMaintenance | null;
    next: AdminMaintenance | null;
    total: number;
    recent: AdminMaintenance[];
  }> {
    const now = new Date();
    const records = await maintenanceRepository.findMany("all", now);
    const adminRecords = records.map((record) => toAdmin(record, now));

    const current =
      adminRecords.find((record) => record.status === "ongoing") ?? null;
    const next =
      [...adminRecords]
        .filter((record) => record.status === "scheduled")
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ??
      null;

    return {
      current,
      next,
      total: adminRecords.length,
      recent: adminRecords.slice(0, 10),
    };
  },
};
