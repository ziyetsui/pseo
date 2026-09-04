/** Explicit bracket tokens only: quoted JSON arrays and prose brackets are not variables. */
export function placeholderTokens(text: string): string[] {
  return [...new Set(text.match(/\[[A-Z][A-Z0-9 _/-]*\]/g) ?? [])];
}

export function placeholderParts(text: string, tokens = placeholderTokens(text)) {
  const unique = [...new Set(tokens.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!unique.length) return [{ text, token: null }];
  const escaped = unique.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return text.split(new RegExp(`(${escaped.join("|")})`, "g"))
    .map(part => ({ text: part, token: unique.includes(part) ? part : null }));
}

/** Fill once, preserving surrounding bytes; escape values inside valid JSON string templates. */
export function filledPlaceholderParts(text: string, tokens: string[], values: Record<string, string>) {
  let json = false;
  try { JSON.parse(text); json = true; } catch { /* Prose and unstructured instructions stay verbatim. */ }
  return placeholderParts(text, tokens).map(part => {
    const value = part.token ? values[part.token] : undefined;
    return { ...part, text: value ? (json ? JSON.stringify(value).slice(1, -1) : value) : part.text };
  });
}
