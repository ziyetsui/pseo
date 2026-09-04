/** Weight CTA: passive reading reminder and explicit generation intent are separate. */
export const BO_URL = "https://bo.video/home";
export const GATE = {
  depth: 0.45,
  dwellMs: 1200,
  minSeconds: 30,
  quietAfterDismissDays: 7,
  quietAfterClickDays: 90,
} as const;

const SESSION_KEY = "prompt-library:sign-in-gate:shown";
const INTENT_KEY = "prompt-library:sign-in-gate:intent-shown";
const QUIET_KEY = "prompt-library:sign-in-gate:quiet-until";
const DAY = 86_400_000;
// Storage-denied browsers still remember dismissals for this document's lifetime.
const memory = new Map<string, string>();
function read(store: "local" | "session", key: string): string | null {
  try { return (store === "local" ? window.localStorage : window.sessionStorage).getItem(key) ?? memory.get(key) ?? null; }
  catch { return memory.get(key) ?? null; }
}
function write(store: "local" | "session", key: string, value: string): void {
  memory.set(key, value);
  try { (store === "local" ? window.localStorage : window.sessionStorage).setItem(key, value); }
  catch { /* The in-memory decision prevents repeated prompts if storage is blocked. */ }
}
export const shownThisSession = () => read("session", SESSION_KEY) === "1";
export const quietUntil = () => Number(read("local", QUIET_KEY) ?? 0) || 0;
export const canShowIntent = () => read("session", INTENT_KEY) !== "1" && Date.now() >= quietUntil();
export function markShown() { write("session", SESSION_KEY, "1"); }
export function markIntentShown() { write("session", INTENT_KEY, "1"); markShown(); }
export function markQuiet(days: number) { write("local", QUIET_KEY, String(Date.now() + days * DAY)); }
export const promptWords = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

export type GateInput = {
  passed: number; total: number; secondsOnSurface: number;
  shown: boolean; quietUntil: number; now: number;
  engaged: boolean; busy: boolean; hidden: boolean;
};
export type GateVerdict = "open" | "wait" | "no";
export function verdict(input: GateInput): GateVerdict {
  if (input.shown || input.now < input.quietUntil || input.hidden || input.busy || !input.engaged) return "no";
  if (input.total <= 0 || input.passed / input.total < GATE.depth) return "no";
  return input.secondsOnSurface < GATE.minSeconds ? "wait" : "open";
}
