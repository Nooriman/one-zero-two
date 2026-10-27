/** Reduce typed text to a plain currency string: digits, one dot, max 2 decimals. */
export function cleanAmount(input: string) {
  const [whole, ...rest] = input.replace(/[^\d.]/g, "").split(".");
  const intPart = whole.replace(/^0+(?=\d)/, "").slice(0, 10);
  if (rest.length === 0) return intPart;
  return `${intPart || "0"}.${rest.join("").slice(0, 2)}`;
}
