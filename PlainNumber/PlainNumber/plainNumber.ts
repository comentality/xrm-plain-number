/** Whole number to text with no digit grouping. Null and NaN become "". */
export function toText(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return Math.trunc(value).toString();
}

/**
 * Text typed by a user to a whole number. Keeps the digits and a leading
 * minus, drops everything else (spaces, separators, letters). Empty or
 * digitless text is null. Returns undefined when nothing usable is left but
 * something was typed, so the caller can revert instead of clearing.
 */
export function parseText(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const negative = trimmed.startsWith("-");
  const digits = trimmed.replace(/\D/g, "");
  if (digits === "") return undefined;
  const n = Number.parseInt(digits, 10);
  return negative ? -n : n;
}
