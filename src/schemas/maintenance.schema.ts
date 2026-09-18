import { z } from "zod";
import { env } from "../config/env";
import { zonedDateTimeToUtc } from "../utils/dates";

export const TITLE_MAX = 150;
export const MESSAGE_MAX = 5000;

const booleanish = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0", "on", "off"])])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1" || value === "on";
  });

function isValidIso(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function resolveInstant(
  isoCandidates: unknown[],
  dateCandidate: unknown,
  timeCandidate: unknown,
  fieldLabel: string
): Date {
  const iso = firstDefined(...isoCandidates.map((v) => (typeof v === "string" ? v : undefined)));
  if (iso !== undefined) {
    if (!isValidIso(iso)) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `${fieldLabel}: data/hora inválida.`,
          path: [fieldLabel],
        },
      ]);
    }
    return new Date(iso);
  }

  const date = typeof dateCandidate === "string" ? dateCandidate : undefined;
  const time = typeof timeCandidate === "string" ? timeCandidate : undefined;

  if (!date) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel}: data é obrigatória.`,
        path: [fieldLabel],
      },
    ]);
  }

  const normalizedTime = time && time.length > 0 ? time : "00:00";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel}: data deve estar no formato YYYY-MM-DD.`,
        path: [fieldLabel],
      },
    ]);
  }
  if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel}: hora deve estar no formato HH:mm.`,
        path: [fieldLabel],
      },
    ]);
  }

  return zonedDateTimeToUtc(date, normalizedTime, env.appTimezone);
}

export interface MaintenanceInput {
  title: string;
  message: string;
  active: boolean;
  startAt: Date;
  endAt: Date;
}

const baseObject = z
  .object({
    title: z.string().optional(),
    titulo: z.string().optional(),
    message: z.string().optional(),
    mensagem: z.string().optional(),
    active: z.unknown().optional(),
    ativo: z.unknown().optional(),
    enabled: z.unknown().optional(),
    startAt: z.string().optional(),
    inicio: z.string().optional(),
    start: z.string().optional(),
    endAt: z.string().optional(),
    fim: z.string().optional(),
    end: z.string().optional(),
    startDate: z.string().optional(),
    startTime: z.string().optional(),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
  })
  .passthrough();

export const createMaintenanceSchema = baseObject
  .superRefine((raw, ctx) => {
    const title = firstDefined(raw.title, raw.titulo);
    if (!title || !String(title).trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Título é obrigatório.", path: ["title"] });
    } else if (String(title).trim().length > TITLE_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Título deve ter no máximo ${TITLE_MAX} caracteres.`,
        path: ["title"],
      });
    }

    const message = firstDefined(raw.message, raw.mensagem);
    if (!message || !String(message).trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mensagem é obrigatória.", path: ["message"] });
    } else if (String(message).length > MESSAGE_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Mensagem deve ter no máximo ${MESSAGE_MAX} caracteres.`,
        path: ["message"],
      });
    }

    try {
      const startAt = resolveInstant(
        [raw.startAt, raw.inicio, raw.start],
        raw.startDate,
        raw.startTime,
        "startAt"
      );
      const endAt = resolveInstant(
        [raw.endAt, raw.fim, raw.end],
        raw.endDate,
        raw.endTime,
        "endAt"
      );
      if (endAt.getTime() <= startAt.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A data final deve ser maior que a data inicial.",
          path: ["endAt"],
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) ctx.addIssue(issue);
      } else {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Datas inválidas.", path: ["startAt"] });
      }
    }
  })
  .transform<MaintenanceInput>((raw, ctx) => {
    const activeRaw = firstDefined(raw.active, raw.ativo, raw.enabled);
    let active = true;
    if (activeRaw !== undefined) {
      const parsed = booleanish.safeParse(activeRaw);
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Campo active inválido.", path: ["active"] });
      } else {
        active = parsed.data;
      }
    }

    const startAt = resolveInstant(
      [raw.startAt, raw.inicio, raw.start],
      raw.startDate,
      raw.startTime,
      "startAt"
    );
    const endAt = resolveInstant(
      [raw.endAt, raw.fim, raw.end],
      raw.endDate,
      raw.endTime,
      "endAt"
    );

    return {
      title: String(firstDefined(raw.title, raw.titulo)).trim(),
      message: String(firstDefined(raw.message, raw.mensagem)),
      active,
      startAt,
      endAt,
    };
  });

export const updateMaintenanceSchema = baseObject
  .superRefine((raw, ctx) => {
    const provided = [
      raw.title,
      raw.titulo,
      raw.message,
      raw.mensagem,
      raw.active,
      raw.ativo,
      raw.enabled,
      raw.startAt,
      raw.inicio,
      raw.start,
      raw.startDate,
      raw.endAt,
      raw.fim,
      raw.end,
      raw.endDate,
    ];
    if (provided.every((value) => value === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe ao menos um campo para atualização.",
        path: ["body"],
      });
    }

    const title = firstDefined(raw.title, raw.titulo);
    if (title !== undefined) {
      if (!String(title).trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Título não pode ser vazio.", path: ["title"] });
      } else if (String(title).trim().length > TITLE_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Título deve ter no máximo ${TITLE_MAX} caracteres.`,
          path: ["title"],
        });
      }
    }

    const message = firstDefined(raw.message, raw.mensagem);
    if (message !== undefined && String(message).length > MESSAGE_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Mensagem deve ter no máximo ${MESSAGE_MAX} caracteres.`,
        path: ["message"],
      });
    }
  })
  .transform<Partial<MaintenanceInput>>((raw, ctx) => {
    const result: Partial<MaintenanceInput> = {};

    const title = firstDefined(raw.title, raw.titulo);
    if (title !== undefined) result.title = String(title).trim();

    const message = firstDefined(raw.message, raw.mensagem);
    if (message !== undefined) result.message = String(message);

    const activeRaw = firstDefined(raw.active, raw.ativo, raw.enabled);
    if (activeRaw !== undefined) {
      const parsed = booleanish.safeParse(activeRaw);
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Campo active inválido.", path: ["active"] });
      } else {
        result.active = parsed.data;
      }
    }

    const hasStart =
      firstDefined(raw.startAt, raw.inicio, raw.start) !== undefined || raw.startDate !== undefined;
    const hasEnd =
      firstDefined(raw.endAt, raw.fim, raw.end) !== undefined || raw.endDate !== undefined;

    if (hasStart) {
      result.startAt = resolveInstant(
        [raw.startAt, raw.inicio, raw.start],
        raw.startDate,
        raw.startTime,
        "startAt"
      );
    }
    if (hasEnd) {
      result.endAt = resolveInstant(
        [raw.endAt, raw.fim, raw.end],
        raw.endDate,
        raw.endTime,
        "endAt"
      );
    }

    if (result.startAt && result.endAt && result.endAt.getTime() <= result.startAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data final deve ser maior que a data inicial.",
        path: ["endAt"],
      });
    }

    return result;
  });

export const changeStatusSchema = z.object({
  active: booleanish,
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
