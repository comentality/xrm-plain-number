export interface FormatSpec {
  /** Text between digit groups. Empty string means no grouping. */
  separator: string;
  /** Digit group sizes from the least significant group outward, e.g. [3] or [3, 2]. */
  groupSizes: number[];
}

/**
 * Formats an integer with the given group separator. Only the digits are
 * grouped; the sign is kept as a leading minus. Non-integers are truncated
 * toward zero because the bound column is a whole number anyway.
 */
export function formatWholeNumber(value: number | null | undefined, spec: FormatSpec): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const truncated = Math.trunc(value);
  const negative = truncated < 0;
  const digits = Math.abs(truncated).toString();
  const sep = spec.separator ?? "";
  const sizes = spec.groupSizes.filter((n) => Number.isInteger(n) && n > 0);
  if (sep === "" || sizes.length === 0) return (negative ? "-" : "") + digits;

  const groups: string[] = [];
  let rest = digits;
  let i = 0;
  while (rest.length > 0) {
    const size = sizes[Math.min(i, sizes.length - 1)];
    if (rest.length <= size) {
      groups.unshift(rest);
      break;
    }
    groups.unshift(rest.slice(-size));
    rest = rest.slice(0, -size);
    i++;
  }
  return (negative ? "-" : "") + groups.join(sep);
}
