import { z } from "zod";
import { authConfig } from "../config/auth";

// Aceita também domínios locais (ex.: admin@localhost), usados no seed inicial.
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email é obrigatório.")
    .max(254, "Email é muito longo.")
    .regex(EMAIL_REGEX, "Email inválido."),
  password: z.string().min(1, "Senha é obrigatória."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória."),
    newPassword: z
      .string()
      .min(
        authConfig.minPasswordLength,
        `A nova senha deve ter no mínimo ${authConfig.minPasswordLength} caracteres.`
      )
      .max(128, "A nova senha é muito longa."),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação não corresponde à nova senha.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha deve ser diferente da senha atual.",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
