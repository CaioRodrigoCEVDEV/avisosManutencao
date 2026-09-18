/**
 * Utilitários de data e timezone.
 *
 * Regra do projeto: no banco e em memória sempre usamos instantes (Date/UTC).
 * A conversão para o fuso de exibição (America/Sao_Paulo por padrão) acontece
 * apenas nas bordas: entrada do painel e saída das APIs.
 */

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = partsCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  partsCache.set(timeZone, formatter);
  return formatter;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Offset (em minutos) do fuso em relação ao UTC no instante informado.
 * local = utc + offset  =>  offset = local - utc.
 */
function getOffsetMinutes(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

export function formatIsoWithOffset(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  const offset = getOffsetMinutes(date, timeZone);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const offsetHours = pad(Math.floor(abs / 60));
  const offsetMinutes = pad(abs % 60);

  return (
    `${parts.year}-${pad(parts.month)}-${pad(parts.day)}` +
    `T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}` +
    `${sign}${offsetHours}:${offsetMinutes}`
  );
}

export function formatDisplay(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return (
    `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ` +
    `${pad(parts.hour)}:${pad(parts.minute)}`
  );
}

/**
 * Converte data (YYYY-MM-DD) + hora (HH:mm) interpretadas no fuso informado
 * para o instante UTC correspondente. Lida com horário de verão refinando o
 * offset uma segunda vez.
 */
export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstOffset = getOffsetMinutes(new Date(utcGuess), timeZone);
  let timestamp = utcGuess - firstOffset * 60000;

  const secondOffset = getOffsetMinutes(new Date(timestamp), timeZone);
  timestamp = utcGuess - secondOffset * 60000;

  return new Date(timestamp);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
