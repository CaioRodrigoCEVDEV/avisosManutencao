import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { AppError } from "./errors";

export function parseOrThrow<Output>(
  schema: ZodType<Output, ZodTypeDef, unknown>,
  data: unknown
): Output {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = formatZodError(result.error);
    throw AppError.badRequest("Os dados enviados são inválidos.", details);
  }
  return result.data;
}

export function formatZodError(error: ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));
}
