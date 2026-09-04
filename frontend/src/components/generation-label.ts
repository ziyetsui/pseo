import type { Prompt } from "@/lib/catalog/types";

export function generationLabel(kind: Prompt["kind"] | undefined): string {
  if (kind === "image") return "Generate image";
  if (kind === "video") return "Generate video";
  return "Generate";
}
