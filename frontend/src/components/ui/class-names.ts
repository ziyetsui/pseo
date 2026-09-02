/**
 * Joins class name fragments, dropping the falsy ones. Local to `components/ui`
 * so no runtime dependency is added for what is three lines of string work.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");
}
